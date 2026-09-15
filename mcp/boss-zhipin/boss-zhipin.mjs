const recruiterUrl = "https://www.zhipin.com/web/boss/recommend";
const frameSelector = "#searchContent iframe";
const searchInputSelector = "input.search-input";
const candidateSelector = "li.geek-info-card";

export function createBossZhipinService({ rpc }) {
  if (typeof rpc !== "function") throw new Error("rpc is required");

  return {
    async openRecruiter(input = {}) {
      const sessionName = optionalString(input.sessionName, "sessionName", 80) ?? "BOSS 直聘招聘工作流";
      const session = await rpc("session.start", { name: sessionName, url: recruiterUrl, active: true, color: "cyan" });
      const tabId = extractTabId(session);
      const status = await inspectStatus(rpc, tabId);
      return { sessionId: session.sessionId ?? session.id, tabId, ...status };
    },

    async checkStatus(input = {}) {
      const tabId = positiveInteger(input.tabId, "tabId");
      return { tabId, ...(await inspectStatus(rpc, tabId)) };
    },

    async searchCandidates(input = {}) {
      const tabId = positiveInteger(input.tabId, "tabId");
      const keyword = requiredString(input.keyword, "keyword", 120);
      const limit = boundedInteger(input.limit ?? 20, "limit", 1, 50);
      const status = await inspectStatus(rpc, tabId);
      if (status.status !== "ready") return { tabId, keyword, count: 0, candidates: [], ...status };

      if (!status.url.includes("/web/boss/recommend")) {
        await rpc("page.navigate", { tabId, url: recruiterUrl, wait: true, timeoutMs: 30_000 });
      }
      await rpc("page.waitForSelector", { tabId, selector: searchInputSelector, visible: true, timeoutMs: 30_000, frameSelector });
      await rpc("dom.type", { tabId, selector: searchInputSelector, text: keyword, replace: true, frameSelector });
      await rpc("computer.key", { tabId, key: "Enter" });
      await rpc("page.waitForSelector", { tabId, selector: candidateSelector, visible: true, timeoutMs: 30_000, frameSelector });
      const query = await rpc("dom.query", { tabId, selector: candidateSelector, limit, frameSelector });
      const elements = extractElements(query).slice(0, limit);
      const candidates = elements.map((element, index) => {
        const summary = redactSensitiveCandidateFields(normalizeText(element.text ?? element.textContent ?? element.innerText ?? ""));
        return { index, name: firstCandidateLine(summary), summary };
      });
      return { status: "ready", tabId, keyword, count: candidates.length, candidates, message: `已找到 ${candidates.length} 位可见候选人。` };
    },

    async openCandidate(input = {}) {
      const tabId = positiveInteger(input.tabId, "tabId");
      const index = boundedInteger(input.index, "index", 0, Number.MAX_SAFE_INTEGER);
      const status = await inspectStatus(rpc, tabId);
      if (status.status !== "ready") return { tabId, index, ...status };

      const clicked = await rpc("dom.click", { tabId, selector: candidateSelector, index, frameSelector });
      const popup = clicked?.whatChanged?.newPopups?.[0];
      const detailTabId = Number.isInteger(popup?.tabId) ? popup.tabId : tabId;
      await rpc("page.waitForLoad", { tabId: detailTabId, timeoutMs: 30_000 }).catch(() => undefined);
      const page = await rpc("page.readText", { tabId: detailTabId });
      return {
        status: "ready",
        tabId: detailTabId,
        sourceTabId: tabId,
        index,
        url: stringValue(page.url),
        title: stringValue(page.title),
        detailText: redactSensitiveCandidateFields(normalizeText(page.text)).slice(0, 12_000),
        message: "候选人详情已打开；未发送招呼或消息。",
      };
    },
  };
}

async function inspectStatus(rpc, tabId) {
  const page = await rpc("page.readText", { tabId });
  const url = stringValue(page.url);
  const title = stringValue(page.title);
  const text = normalizeText(page.text);
  const loginRequired = /(?:\/login|passport)/i.test(url) || /扫码登录|手机号登录|密码登录|登录后继续/.test(text);
  const verificationRequired = /安全验证|人机验证|滑块验证|完成验证|验证码/.test(`${title}\n${text}`);
  const ready = !loginRequired && !verificationRequired && /zhipin\.com/i.test(url);
  return {
    status: ready ? "ready" : "user_action_required",
    url,
    title,
    loginRequired,
    verificationRequired,
    message: ready
      ? "BOSS 直聘招聘页面已就绪。"
      : loginRequired
        ? "请在 Chrome 中登录 BOSS 直聘，然后再次检查状态。"
        : verificationRequired
          ? "请在 Chrome 中完成安全验证，然后再次检查状态。"
          : "请确认 Chrome 已打开 BOSS 直聘招聘页面。",
  };
}

export function redactSensitiveCandidateFields(value) {
  return String(value ?? "")
    .replace(/(?:年龄|年齡)\s*[:：]?\s*\d{1,3}\s*岁?/gi, "年龄：[已隐藏]")
    .replace(/\d{1,3}\s*岁/g, "[年龄已隐藏]")
    .replace(/(?:性别|性別)\s*[:：]?\s*(?:男性|女性|男|女)/gi, "性别：[已隐藏]")
    .replace(/(^|[\s|｜·,，])(?:男|女)(?=$|[\s|｜·,，])/g, "$1[性别已隐藏]");
}

function extractTabId(session) {
  const candidates = [session?.tabId, session?.tab?.id, session?.tab?.tabId, session?.tabs?.[0]?.id, session?.tabs?.[0]?.tabId];
  const tabId = candidates.find(Number.isInteger);
  if (!tabId || tabId < 1) throw new Error("Chrome bridge did not return a managed tab id");
  return tabId;
}

function extractElements(query) {
  if (Array.isArray(query)) return query;
  if (Array.isArray(query?.elements)) return query.elements;
  if (Array.isArray(query?.matches)) return query.matches;
  return [];
}

function firstCandidateLine(value) {
  return value.split(/\n|\||｜/).map((part) => part.trim()).find(Boolean)?.slice(0, 120) ?? "候选人";
}

function normalizeText(value) {
  return stringValue(value).replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function requiredString(value, name, maxLength) {
  const result = optionalString(value, name, maxLength);
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function optionalString(value, name, maxLength) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  const result = value.trim();
  if (!result || result.length > maxLength) throw new Error(`${name} must contain 1-${maxLength} characters`);
  return result;
}

function positiveInteger(value, name) {
  return boundedInteger(value, name, 1, Number.MAX_SAFE_INTEGER);
}

function boundedInteger(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  return value;
}
