import { CandidateStore } from "./candidate-store.mjs";
import { loadProfile } from "./profile.mjs";
import { evaluateCandidate, exportReport, filterAndScore } from "./pipeline.mjs";

const recruiterUrl = "https://www.zhipin.com/web/boss/recommend";
const frameSelector = "#searchContent iframe";
const searchInputSelector = "input.search-input";
const candidateSelector = "li.geek-info-card";
const candidateLinkSelector = `${candidateSelector} a[data-contact]`;

export function createBossZhipinService(options) {
  const rpc = options?.rpc;
  if (typeof rpc !== "function") throw new Error("rpc is required");
  let store = options.store ?? new CandidateStore();
  let profile = options.profile ?? loadProfile();
  let activeTabId = options.tabId;

  const service = {
    async bossLogin() {
      if (!activeTabId) {
        const session = await rpc("session.start", { name: "BOSS 直聘", url: recruiterUrl, active: true, color: "cyan" });
        activeTabId = extractTabId(session);
      }
      return { tabId: activeTabId, ...(await inspectStatus(rpc, activeTabId)) };
    },

    async bossSearchCandidates(input = {}) {
      const tabId = resolveTab(input.tabId);
      const keyword = requiredString(input.keyword, "keyword", 120);
      const count = boundedInteger(input.count ?? 30, "count", 1, 300);
      await requireReady(rpc, tabId);
      await ensureRecruiterPage(rpc, tabId);
      await rpc("page.waitForSelector", { tabId, selector: searchInputSelector, visible: true, timeoutMs: 30_000, frameSelector });
      await rpc("dom.type", { tabId, selector: searchInputSelector, text: keyword, replace: true, frameSelector });
      await rpc("computer.key", { tabId, key: "Enter" });
      await rpc("page.waitForSelector", { tabId, selector: candidateSelector, visible: true, timeoutMs: 30_000, frameSelector });
      await loadCandidateCards(rpc, tabId, count);
      const candidates = await extractCandidateCards(rpc, tabId, count);
      const fresh = [];
      for (const candidate of candidates) if (candidate.expectId && store.add(candidate, keyword)) fresh.push(candidate);
      if (fresh.length) store.save();
      return [{ _stats: true, total_fetched: candidates.length, new: fresh.length, duplicates: candidates.length - fresh.length, cumulative_seen: store.stats().total }, ...fresh];
    },

    async bossMultiSearch(input = {}) {
      const keywords = stringArray(input.keywords ?? profile.keywords, "keywords", 50);
      const count = boundedInteger(input.count_per_keyword ?? input.countPerKeyword ?? 50, "count_per_keyword", 1, 300);
      const autoView = booleanValue(input.auto_view ?? input.autoView ?? true, "auto_view");
      const initialTotal = store.stats().total;
      const perKeyword = [];
      const candidates = [];
      for (let order = 0; order < keywords.length; order += 1) {
        const result = await service.bossSearchCandidates({ tabId: input.tabId, keyword: keywords[order], city: input.city ?? profile.job?.city ?? "", experience: input.experience ?? profile.job?.experience ?? "", count });
        const stats = result[0];
        const fresh = result.slice(1);
        let viewed = 0; let viewFailed = 0;
        if (autoView) for (const candidate of fresh) {
          try { const view = await service.bossViewByIndex({ tabId: input.tabId, index: candidate.index }); if (view.share_url) candidate.share_url = view.share_url; viewed += 1; }
          catch { viewFailed += 1; }
        }
        perKeyword.push({ _keyword_stats: true, keyword: keywords[order], order: order + 1, fetched: stats.total_fetched, new: stats.new, duplicates: stats.duplicates, ...(autoView ? { viewed, view_failed: viewFailed } : {}) });
        candidates.push(...fresh.map((candidate) => ({ ...candidate, _source_keyword: keywords[order] })));
      }
      const currentTotal = store.stats().total;
      return [{ _stats: true, _multi_search: true, keywords_count: keywords.length, total_new: candidates.length, total_fetched: sum(perKeyword, "fetched"), total_duplicates: sum(perKeyword, "duplicates"), cumulative_seen: currentTotal, new_this_session: currentTotal - initialTotal, ...(autoView ? { total_viewed: sum(perKeyword, "viewed"), total_view_failed: sum(perKeyword, "view_failed") } : {}) }, ...perKeyword, ...candidates];
    },

    async bossClearDedup(input = {}) {
      const removed = store.remove({ expectIds: optionalStringArray(input.expect_ids ?? input.expectIds, "expect_ids"), status: optionalString(input.status, "status", 40), beforeDate: optionalDate(input.before_date ?? input.beforeDate, "before_date") });
      return { status: "success", cleared: removed, remaining: store.stats().total, message: `已清除 ${removed} 条记录` };
    },

    async bossViewCandidate(input = {}) {
      const tabId = resolveTab(input.tabId);
      const profileUrl = safeBossUrl(input.profile_url ?? input.profileUrl, "profile_url");
      await rpc("page.navigate", { tabId, url: profileUrl, wait: true, timeoutMs: 30_000 });
      const page = await rpc("page.readText", { tabId });
      const screenshot = await saveScreenshot(rpc, tabId, `candidate-${Date.now()}.png`);
      return { profile_url: profileUrl, full_text: stringValue(page.text).slice(0, 12_000), screenshot };
    },

    async bossViewByIndex(input = {}) {
      const tabId = resolveTab(input.tabId);
      const index = boundedInteger(input.index, "index", 0, 299);
      await requireReady(rpc, tabId);
      await cleanupDialogs(rpc, tabId);
      const visible = await extractCandidateCards(rpc, tabId, 300);
      if (index >= visible.length) throw new Error(`索引 ${index} 超出范围`);
      await rpc("dom.click", { tabId, selector: candidateLinkSelector, index, frameSelector });
      await rpc("page.waitForSelector", { tabId, selector: "div.boss-dialog__body, div.dialog-wrap.active", visible: true, timeoutMs: 20_000 });
      const ids = await readDialogIds(rpc, tabId);
      const screenshots = await captureResumeScreenshots(rpc, tabId, index);
      const share = await extractShare(rpc, tabId, index);
      const detail = await rpc("page.readText", { tabId });
      await cleanupDialogs(rpc, tabId);
      const expectId = ids.expectId || visible[index]?.expectId;
      if (expectId && store.has(expectId)) store.update(expectId, { status: "viewed", ...(share.share_url ? { share_url: share.share_url } : {}) });
      return { screenshots, ids: { ...ids, expectId }, share_url: share.share_url, share_card: share.share_card, pages: screenshots.length, detail_text: stringValue(detail.text).slice(0, 12_000) };
    },

    async bossViewByExpectId(input = {}) {
      const expectId = requiredString(input.expect_id ?? input.expectId, "expect_id", 200);
      const visible = await extractCandidateCards(rpc, resolveTab(input.tabId), 300);
      const index = visible.findIndex((candidate) => candidate.expectId === expectId);
      if (index < 0) return { error: `候选人 ${expectId} 不在当前搜索页面上`, visible_count: visible.length };
      return service.bossViewByIndex({ tabId: input.tabId, index });
    },

    async bossGreetByIndex(input = {}) {
      requireConfirmation(input.confirm);
      const tabId = resolveTab(input.tabId);
      const index = boundedInteger(input.index, "index", 0, 299);
      const candidates = await extractCandidateCards(rpc, tabId, 300);
      if (index >= candidates.length) throw new Error(`索引 ${index} 超出范围`);
      await cleanupDialogs(rpc, tabId);
      await rpc("dom.click", { tabId, selector: candidateLinkSelector, index, frameSelector });
      await rpc("page.waitForSelector", { tabId, selector: "button.btn-getcontact, .btn-getcontact", visible: true, timeoutMs: 20_000 });
      const ids = await readDialogIds(rpc, tabId);
      await rpc("dom.click", { tabId, selector: "button.btn-getcontact, .btn-getcontact", index: 0 });
      await sendOptionalMessage(rpc, tabId, optionalString(input.message, "message", 1000));
      const expectId = ids.expectId || candidates[index]?.expectId;
      if (expectId && store.has(expectId)) store.update(expectId, { status: "greeted" });
      return { status: "success", message: "已发送招呼，候选人已进入沟通列表", ids: { ...ids, expectId } };
    },

    async bossEvaluateCandidate(input = {}) {
      if (!input.resume || typeof input.resume !== "object" || Array.isArray(input.resume)) throw new Error("resume must be an object");
      return evaluateCandidate(input.resume, optionalString(input.job_requirements ?? input.jobRequirements, "job_requirements", 20_000) ?? "", profile);
    },

    async bossSendGreeting(input = {}) {
      requireConfirmation(input.confirm);
      const tabId = resolveTab(input.tabId);
      const profileUrl = safeBossUrl(input.profile_url ?? input.profileUrl, "profile_url");
      await rpc("page.navigate", { tabId, url: profileUrl, wait: true, timeoutMs: 30_000 });
      await clickTextButton(rpc, tabId, ["打招呼", "沟通", "联系Ta"]);
      await sendOptionalMessage(rpc, tabId, optionalString(input.message, "message", 1000));
      return { status: "success", message: "已向候选人发送招呼或消息" };
    },

    async bossQueryDb(input = {}) { return store.query({ status: optionalString(input.status, "status", 40), hasShareUrl: optionalBoolean(input.has_share_url ?? input.hasShareUrl, "has_share_url"), keyword: optionalString(input.keyword, "keyword", 120), dateFrom: optionalDate(input.date_from ?? input.dateFrom, "date_from"), limit: boundedInteger(input.limit ?? 50, "limit", 1, 10_000) }); },

    async bossUpdateCandidate(input = {}) {
      const expectId = requiredString(input.expect_id ?? input.expectId, "expect_id", 200); const fields = {};
      if (input.status !== undefined && input.status !== "") fields.status = enumValue(input.status, ["new", "viewed", "shortlisted", "greeted", "rejected", "legacy"], "status");
      if (input.score !== undefined && input.score !== null) fields.score = boundedInteger(input.score, "score", 0, 100);
      if (input.notes) fields.notes = requiredString(input.notes, "notes", 10_000);
      if (input.share_url ?? input.shareUrl) fields.share_url = safeShareUrl(input.share_url ?? input.shareUrl);
      if (!Object.keys(fields).length) return { status: "error", message: "没有需要更新的字段" };
      return store.update(expectId, fields) ? { status: "success", expect_id: expectId, updated: fields } : { status: "error", message: `未找到候选人 ${expectId}` };
    },

    async bossPipelineStatus() {
      const stats = store.stats(); const suggestions = [];
      if (stats.by_status.legacy) suggestions.push(`有 ${stats.by_status.legacy} 个 legacy 记录，可清除后重新搜索`);
      const withoutUrl = stats.without_share_url - (stats.by_status.legacy ?? 0);
      if (withoutUrl > 0) suggestions.push(`有 ${withoutUrl} 个候选人没有 share_url，需要查看候选人获取链接`);
      return { ...stats, suggestions };
    },

    async bossFilterAndScore(input = {}) { return filterAndScore(store, profile, boundedInteger(input.top_n ?? input.topN ?? 20, "top_n", 1, 500)); },
    async bossExportReport(input = {}) { return exportReport(store, profile, boundedInteger(input.top_n ?? input.topN ?? 10, "top_n", 1, 500), booleanValue(input.include_detail ?? input.includeDetail ?? true, "include_detail")); },

    async bossDebugPage(input = {}) {
      const tabId = resolveTab(input.tabId); const page = await rpc("page.readText", { tabId });
      const structure = await evalPage(rpc, tabId, `(() => { const forms=[...document.querySelectorAll('input,textarea,select,[contenteditable="true"]')].slice(0,20).map(el=>({tag:el.tagName,type:el.type||'',placeholder:el.placeholder||'',class:String(el.className||'').slice(0,80),id:el.id||'',name:el.name||'',visible:!!el.offsetParent})); const iframes=[...document.querySelectorAll('iframe')].slice(0,5).map(el=>({src:el.src||'',id:el.id||'',class:String(el.className||'').slice(0,80)})); const topLevel=[...(document.body?.children||[])].slice(0,15).map(el=>({tag:el.tagName,id:el.id||'',class:String(el.className||'').slice(0,100),childCount:el.children.length,text:String(el.innerText||'').slice(0,150),rect:{w:el.offsetWidth,h:el.offsetHeight}})); return {forms,iframes,topLevel}; })()`);
      return { url: page.url ?? "", title: page.title ?? "", structure };
    },

    async bossReload() { store = store.reload ? store.reload() : store; profile = loadProfile(); return { status: "success", message: "已重新加载候选人数据库和搜索配置", profile }; },
  };

  function resolveTab(value) { if (value !== undefined) activeTabId = boundedInteger(value, "tabId", 1, Number.MAX_SAFE_INTEGER); if (!activeTabId) throw new Error("请先调用 boss_login，或提供 tabId"); return activeTabId; }
  return service;
}

async function inspectStatus(rpc, tabId) {
  const page = await rpc("page.readText", { tabId }); const url = stringValue(page.url); const title = stringValue(page.title); const text = stringValue(page.text);
  const loginRequired = /(?:\/login|passport)/i.test(url) || /扫码登录|手机号登录|密码登录|登录后继续/.test(text);
  const verificationRequired = /安全验证|人机验证|滑块验证|完成验证|验证码/.test(`${title}\n${text}`);
  const ready = !loginRequired && !verificationRequired && /zhipin\.com/i.test(url);
  return { status: ready ? "success" : "user_action_required", url, title, loginRequired, verificationRequired, message: ready ? "已登录，招聘页面可用" : loginRequired ? "请在 Chrome 中登录 BOSS 直聘" : verificationRequired ? "请在 Chrome 中完成安全验证" : "请确认已打开 BOSS 直聘" };
}
async function requireReady(rpc, tabId) { const status = await inspectStatus(rpc, tabId); if (status.status !== "success") throw new Error(status.message); }
async function ensureRecruiterPage(rpc, tabId) { const page = await rpc("page.readText", { tabId }); if (!stringValue(page.url).includes("/web/boss/recommend")) await rpc("page.navigate", { tabId, url: recruiterUrl, wait: true, timeoutMs: 30_000 }); }

async function loadCandidateCards(rpc, tabId, count) {
  let loaded = -1; const rounds = Math.min(Math.ceil(count / 14) + 2, 25);
  for (let round = 0; round < rounds; round += 1) { const query = await rpc("dom.query", { tabId, selector: candidateSelector, limit: Math.min(count, 300), frameSelector }); const current = extractElements(query).length; if (current >= count || current === loaded) break; loaded = current; await rpc("dom.scroll", { tabId, y: 4000, mode: "scrollBy", behavior: "auto", frameSelector }); }
}

async function extractCandidateCards(rpc, tabId, limit) {
  try {
    const value = await evalPage(rpc, tabId, `(() => { const frame=document.querySelector(${JSON.stringify(frameSelector)}); const doc=frame?.contentDocument||document; return [...doc.querySelectorAll(${JSON.stringify(candidateSelector)})].slice(0,${limit}).map((card,index)=>{ const text=card.innerText||''; const lines=text.split('\\n').map(v=>v.trim()).filter(Boolean); const link=card.querySelector('a[data-contact]'); const find=(test)=>lines.find(test)||''; const tags=[...card.querySelectorAll('.rcd-tags span,.tag-item,[class*="tag"]')].map(el=>(el.innerText||'').trim()).filter(v=>v&&v.length<20).slice(0,8); const section=(name,offset=1)=>{const i=lines.indexOf(name);return i>=0?(lines[i+offset]||''):''}; return {index,name:lines[0]||'未知',age:find(v=>/\\d+\\s*岁/.test(v)),experience:find(v=>/\\d+.*年/.test(v)),education:find(v=>/本科|硕士|博士|大专|高中/.test(v)),salary:find(v=>/\\d+.*[Kk]|面议|薪/.test(v)),jobStatus:find(v=>/离职|在职|到岗|考虑/.test(v)),skills:tags,expectCity:section('期望城市')||section('期望'),company:section('职位'),title:section('职位',2),school:section('院校'),major:section('院校',2),expectId:link?.getAttribute('data-expect')||'',lid:link?.getAttribute('data-lid')||'',jid:link?.getAttribute('data-jid')||'',fullText:text.slice(0,2000)}; }); })()`);
    if (Array.isArray(value)) return value;
  } catch { /* fall through */ }
  const query = await rpc("dom.query", { tabId, selector: candidateSelector, limit, frameSelector });
  return extractElements(query).slice(0, limit).map((element, index) => ({ index, name: stringValue(element.text ?? element.textContent).split(/\r?\n/).find(Boolean) ?? "未知", expectId: stringValue(element.attributes?.["data-expect"]), fullText: stringValue(element.text ?? element.textContent).slice(0, 2000), skills: [] }));
}

async function readDialogIds(rpc, tabId) { return await evalPage(rpc, tabId, `(() => { const el=document.querySelector('[data-geekid]'); return el?{geekId:el.getAttribute('data-geekid')||'',encryptUserId:el.getAttribute('data-encryptuserid')||'',expectId:el.getAttribute('data-expectid')||'',jid:el.getAttribute('data-jid')||''}:{} })()`).catch(() => ({})); }
async function captureResumeScreenshots(rpc, tabId, index) {
  const info = await evalPage(rpc, tabId, `(() => { const frame=document.querySelector("iframe[src*='c-resume']");const doc=frame?.contentDocument;const root=doc?.documentElement;return root?{scrollHeight:root.scrollHeight,clientHeight:root.clientHeight}:null })()`).catch(() => null);
  const pages = Math.max(1, Math.min(5, Math.ceil((Number(info?.scrollHeight) || 1) / (Number(info?.clientHeight) || 1))));
  const screenshots = [];
  for (let page = 0; page < pages; page += 1) {
    if (page > 0) await rpc("dom.scroll", { tabId, y: Number(info?.clientHeight) || 800, mode: "scrollBy", behavior: "auto", frameSelector: "iframe[src*='c-resume']" }).catch(() => undefined);
    const path = await saveScreenshot(rpc, tabId, `resume-${index}-p${page}.png`);
    if (path) screenshots.push(path);
  }
  if (pages > 1) await rpc("dom.scroll", { tabId, y: 0, mode: "scrollTo", behavior: "auto", frameSelector: "iframe[src*='c-resume']" }).catch(() => undefined);
  return screenshots;
}
async function extractShare(rpc, tabId, index) {
  const result = await evalPage(rpc, tabId, `(async()=>{ const frame=document.querySelector("iframe[src*='c-resume']");const doc=frame?.contentDocument;const canvas=doc?.querySelector('canvas');if(canvas){const rect=canvas.getBoundingClientRect();canvas.dispatchEvent(new MouseEvent('click',{clientX:rect.width*.938,clientY:rect.height*.095,bubbles:true}));await new Promise(r=>setTimeout(r,500));}const item=[...document.querySelectorAll('.c-pay-4-another .item,.nav-list .item')].find(el=>(el.innerText||'').includes('转发至其他'));if(item){item.click();await new Promise(r=>setTimeout(r,1000));}const src=document.querySelector('img.share-image')?.src||'';let url='';if(src&&globalThis.BarcodeDetector){try{const blob=await(await fetch(src)).blob();const bitmap=await createImageBitmap(blob);const codes=await new BarcodeDetector({formats:['qr_code']}).detect(bitmap);url=codes[0]?.rawValue||'';}catch{}}return{src,url};})()` ).catch(() => ({}));
  const src = stringValue(result?.src); let shareCard = "";
  if (src.startsWith("data:image/")) { const saved = await rpc("native.saveDataUrl", { dataUrl: src, filename: `share-${index}.png` }).catch(() => ({})); shareCard = stringValue(saved.path ?? saved.filePath ?? saved); }
  return { share_url: safeOptionalShareUrl(result?.url), share_card: shareCard };
}
async function saveScreenshot(rpc, tabId, filename) { const shot = await rpc("page.screenshot", { tabId, format: "png" }); const dataUrl = stringValue(shot.dataUrl ?? shot); if (!dataUrl) return ""; const saved = await rpc("native.saveDataUrl", { dataUrl, filename }); return stringValue(saved.path ?? saved.filePath ?? saved); }
async function cleanupDialogs(rpc, tabId) { await evalPage(rpc, tabId, `(()=>{document.querySelectorAll('div.dialog-wrap,.boss-layer__wrapper,.boss-popup__wrapper').forEach(el=>el.remove());return true})()`).catch(() => undefined); }
async function clickTextButton(rpc, tabId, labels) { const clicked = await evalPage(rpc, tabId, `(()=>{const labels=${JSON.stringify(labels)};const el=[...document.querySelectorAll('button,.btn-greet,.btn-chat,.btn-getcontact')].find(node=>labels.some(label=>(node.innerText||'').includes(label)));if(!el)return false;el.click();return true})()`); if (!clicked) throw new Error("未找到打招呼或沟通按钮"); }
async function sendOptionalMessage(rpc, tabId, message) { if (!message) return; await rpc("dom.type", { tabId, selector: "textarea, .chat-input, [contenteditable='true']", text: message, replace: true }); await clickTextButton(rpc, tabId, ["发送"]); }
async function evalPage(rpc, tabId, script) { const result = await rpc("page.executeJavaScript", { tabId, script, world: "MAIN", bypassCSP: false }); return result?.value ?? result?.result ?? result; }

function extractTabId(session) { const tabId = [session?.tabId, session?.tab?.id, session?.tab?.tabId, session?.tabs?.[0]?.id, session?.tabs?.[0]?.tabId].find(Number.isInteger); if (!tabId) throw new Error("Chrome bridge did not return a managed tab id"); return tabId; }
function extractElements(query) { return Array.isArray(query) ? query : Array.isArray(query?.elements) ? query.elements : Array.isArray(query?.matches) ? query.matches : []; }
function sum(values, key) { return values.reduce((total, value) => total + (Number(value[key]) || 0), 0); }
function stringValue(value) { return typeof value === "string" ? value : ""; }
function requiredString(value, name, max) { const result = optionalString(value, name, max); if (!result) throw new Error(`${name} is required`); return result; }
function optionalString(value, name, max) { if (value === undefined || value === null || value === "") return undefined; if (typeof value !== "string") throw new Error(`${name} must be a string`); const result = value.trim(); if (!result || result.length > max) throw new Error(`${name} must contain 1-${max} characters`); return result; }
function stringArray(value, name, max) { if (!Array.isArray(value) || !value.length || value.length > max) throw new Error(`${name} must be a non-empty array with at most ${max} items`); return value.map((item, index) => requiredString(item, `${name}[${index}]`, 120)); }
function optionalStringArray(value, name) { return value === undefined || value === null ? undefined : stringArray(value, name, 1000); }
function boundedInteger(value, name, min, max) { if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}`); return value; }
function booleanValue(value, name) { if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`); return value; }
function optionalBoolean(value, name) { return value === undefined || value === null ? undefined : booleanValue(value, name); }
function optionalDate(value, name) { const result = optionalString(value, name, 10); if (result && !/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${name} must use YYYY-MM-DD`); return result; }
function enumValue(value, allowed, name) { if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`); return value; }
function requireConfirmation(value) { if (value !== true) throw new Error("This tool contacts a candidate. Set confirm=true only after the user explicitly approves sending the greeting/message."); }
function safeBossUrl(value, name) { const raw = requiredString(value, name, 2000); const url = new URL(raw); if (url.protocol !== "https:" || !(url.hostname === "zhipin.com" || url.hostname.endsWith(".zhipin.com") || url.hostname === "zpurl.cn" || url.hostname.endsWith(".zpurl.cn"))) throw new Error(`${name} must be an HTTPS BOSS Zhipin URL`); return url.href; }
function safeShareUrl(value) { const url = safeOptionalShareUrl(value); if (!url) throw new Error("share_url must be an HTTPS BOSS Zhipin URL"); return url; }
function safeOptionalShareUrl(value) { if (!value) return ""; try { return safeBossUrl(value, "share_url"); } catch { return ""; } }
