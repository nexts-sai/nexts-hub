import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createBossZhipinService } from "../boss-zhipin.mjs";
import { createChromeBridgeClient, resolveChromeBridgeToken } from "../bridge-client.mjs";
import { CandidateStore } from "../candidate-store.mjs";
import { evaluateCandidate, exportReport, filterAndScore } from "../pipeline.mjs";
import { loadProfile } from "../profile.mjs";
import { createMcpHandler } from "../server.mjs";

test("candidate database persists, queries, updates, and clears records", () => {
  const directory = mkdtempSync(join(tmpdir(), "boss-store-"));
  try {
    const path = join(directory, "candidates.json");
    const store = new CandidateStore(path);
    assert.equal(store.add({ expectId: "e1", name: "张三", salary: "20-25K" }, "产品经理"), true);
    store.save();
    assert.equal(new CandidateStore(path).query({ keyword: "产品经理" })[0].name, "张三");
    assert.equal(store.update("e1", { status: "shortlisted", score: 88 }), true);
    assert.equal(store.stats().by_status.shortlisted, 1);
    assert.equal(store.remove({ expectIds: ["e1"] }), 1);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).candidates.e1, undefined);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("loads the supported search-profile YAML structure", () => {
  const directory = mkdtempSync(join(tmpdir(), "boss-profile-"));
  const path = join(directory, "profile.yaml");
  const previous = process.env.BOSS_ZHIPIN_PROFILE_PATH;
  try {
    writeFileSync(path, "job:\n  title: \"前端工程师\"\n  city: 上海\nkeywords:\n  - React\n  - TypeScript\nfilter:\n  max_age: 40\n", "utf8");
    process.env.BOSS_ZHIPIN_PROFILE_PATH = path;
    const profile = loadProfile();
    assert.equal(profile.job.title, "前端工程师");
    assert.deepEqual(profile.keywords, ["React", "TypeScript"]);
    assert.equal(profile.filter.max_age, 40);
  } finally {
    if (previous === undefined) delete process.env.BOSS_ZHIPIN_PROFILE_PATH; else process.env.BOSS_ZHIPIN_PROFILE_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("evaluation, filtering, scoring, and Markdown reporting work locally", () => {
  const records = new Map([
    ["e1", { expectId: "e1", name: "李雷", age: "30岁", salary: "20-25K", experience: "5年", education: "硕士", jobStatus: "离职", skills: ["RAG"], fullText: "AI 大模型 教育 0-1 产品经理", status: "new", share_url: "https://zpurl.cn/a" }],
    ["e2", { expectId: "e2", name: "韩梅梅", age: "48岁", salary: "50K", status: "new", share_url: "" }],
  ]);
  const store = {
    query: ({ status } = {}) => [...records.values()].filter((record) => !status || record.status === status).map((record) => structuredClone(record)),
    update: (id, fields) => { Object.assign(records.get(id), fields); return true; },
    stats: () => ({ total: records.size }),
  };
  const profile = { job: { title: "AI 产品经理", city: "北京", salary: "20-30K" }, company: {}, requirements: { must_have: ["产品经理"], nice_to_have: ["RAG"] }, filter: { max_age: 35, max_salary_k: 40, exclude_status: ["暂不考虑"] }, scoring: { domain_keywords: ["教育"], tech_keywords: ["大模型", "rag"], bonus_keywords: ["0-1"] } };
  assert.ok(evaluateCandidate(records.get("e1"), "AI 产品经理", profile).score >= 70);
  const ranked = filterAndScore(store, profile, 10);
  assert.equal(ranked[0].filtered_out.age, 1);
  assert.equal(ranked[1].expectId, "e1");
  assert.match(exportReport(store, profile, 10, true), /李雷/);
});

test("search scrolls, deduplicates, and stores extracted candidates", async () => {
  const calls = [];
  const records = new Map();
  const store = {
    has: (id) => records.has(id),
    add: (candidate) => { if (records.has(candidate.expectId)) return false; records.set(candidate.expectId, candidate); return true; },
    save: () => undefined,
    stats: () => ({ total: records.size, by_status: {}, without_share_url: records.size }),
  };
  const rpc = async (method, params) => {
    calls.push(method);
    if (method === "page.readText") return { url: "https://www.zhipin.com/web/boss/recommend", title: "牛人推荐", text: "推荐牛人" };
    if (method === "dom.query") return { elements: [{ text: "候选人" }] };
    if (method === "page.executeJavaScript") return { value: [{ index: 0, expectId: "e1", name: "李雷", age: "30岁", skills: [], fullText: "前端工程师" }] };
    return { ok: true };
  };
  const service = createBossZhipinService({ rpc, store, profile: { keywords: ["React"], job: {} }, tabId: 8 });
  const first = await service.bossSearchCandidates({ keyword: "React", count: 1 });
  const second = await service.bossSearchCandidates({ keyword: "React", count: 1 });
  assert.equal(first[0].new, 1);
  assert.equal(second[0].duplicates, 1);
  assert.ok(calls.includes("page.waitForSelector"));
});

test("greeting tools require explicit confirmation before browser mutation", async () => {
  let calls = 0;
  const service = createBossZhipinService({ rpc: async () => { calls += 1; return {}; }, store: {}, profile: {}, tabId: 2 });
  await assert.rejects(() => service.bossSendGreeting({ profile_url: "https://www.zhipin.com/geek/abc" }), /confirm=true/);
  assert.equal(calls, 0);
});

test("Chrome bridge token is loaded from the Nexts plugin handshake file", async () => {
  const directory = mkdtempSync(join(tmpdir(), "boss-bridge-"));
  const envPath = join(directory, ".browser-agent-bridge.env");
  const previousNexts = process.env.NEXTS_CREDENTIAL_BRIDGETOKEN;
  const previousBridge = process.env.BROWSER_AGENT_BRIDGE_TOKEN;
  try {
    delete process.env.NEXTS_CREDENTIAL_BRIDGETOKEN;
    delete process.env.BROWSER_AGENT_BRIDGE_TOKEN;
    writeFileSync(envPath, "BROWSER_AGENT_BRIDGE_TOKEN=plugin-token\n", "utf8");
    assert.equal(resolveChromeBridgeToken({ bridgeEnvPath: envPath }), "plugin-token");

    let authorization;
    const rpc = createChromeBridgeClient({
      bridgeEnvPath: envPath,
      fetcher: async (_url, init) => {
        authorization = init.headers.authorization;
        return new Response(JSON.stringify({ result: { ok: true } }), { status: 200 });
      },
    });
    assert.deepEqual(await rpc("health"), { ok: true });
    assert.equal(authorization, "Bearer plugin-token");
  } finally {
    if (previousNexts === undefined) delete process.env.NEXTS_CREDENTIAL_BRIDGETOKEN; else process.env.NEXTS_CREDENTIAL_BRIDGETOKEN = previousNexts;
    if (previousBridge === undefined) delete process.env.BROWSER_AGENT_BRIDGE_TOKEN; else process.env.BROWSER_AGENT_BRIDGE_TOKEN = previousBridge;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("MCP exposes all 17 tools registered by the current upstream server", async () => {
  const handle = createMcpHandler({ bossPipelineStatus: async () => ({ total: 0 }) });
  const listed = await handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(listed.result.tools.length, 17);
  assert.ok(listed.result.tools.some((tool) => tool.name === "boss_view_candidate"));
  const called = await handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "boss_pipeline_status", arguments: {} } });
  assert.deepEqual(called.result.structuredContent, { total: 0 });
});
