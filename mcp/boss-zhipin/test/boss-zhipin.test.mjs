import assert from "node:assert/strict";
import test from "node:test";

import { createBossZhipinService, redactSensitiveCandidateFields } from "../boss-zhipin.mjs";
import { createMcpHandler } from "../server.mjs";

test("redacts explicit age and gender values", () => {
  assert.equal(redactSensitiveCandidateFields("张三｜男｜28岁\n性别：男性 年龄: 28"), "张三｜[性别已隐藏]｜[年龄已隐藏]\n性别：[已隐藏] 年龄：[已隐藏]");
});

test("checkStatus stops for login", async () => {
  const service = createBossZhipinService({ rpc: async () => ({ url: "https://www.zhipin.com/web/user/?ka=header-login", title: "登录", text: "手机号登录" }) });
  const result = await service.checkStatus({ tabId: 7 });
  assert.equal(result.status, "user_action_required");
  assert.equal(result.loginRequired, true);
});

test("searchCandidates composes Chrome bridge calls and returns redacted cards", async () => {
  const calls = [];
  const rpc = async (method, params) => {
    calls.push([method, params]);
    if (method === "page.readText") return { url: "https://www.zhipin.com/web/boss/recommend", title: "牛人推荐", text: "推荐牛人" };
    if (method === "dom.query") return { elements: [{ text: "李雷｜男｜30岁\n前端工程师" }, { text: "韩梅梅｜女｜产品经理" }] };
    return { ok: true };
  };
  const result = await createBossZhipinService({ rpc }).searchCandidates({ tabId: 9, keyword: "React", limit: 2 });
  assert.equal(result.count, 2);
  assert.match(result.candidates[0].summary, /年龄已隐藏/);
  assert.doesNotMatch(result.candidates[0].summary, /30岁|｜男｜/);
  assert.deepEqual(calls.map(([method]) => method), ["page.readText", "page.waitForSelector", "dom.type", "computer.key", "page.waitForSelector", "dom.query"]);
});

test("MCP handler lists and calls tools", async () => {
  const handle = createMcpHandler({ checkStatus: async ({ tabId }) => ({ status: "ready", tabId }) });
  const listed = await handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(listed.result.tools.length, 4);
  const called = await handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "check_status", arguments: { tabId: 3 } } });
  assert.deepEqual(called.result.structuredContent, { status: "ready", tabId: 3 });
});
