const object = (properties = {}, required = []) => ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });
const tabId = { type: "integer", minimum: 1, description: "可选；不传时使用 boss_login 创建的当前标签页。" };
const confirm = { type: "boolean", const: true, description: "必须在用户明确确认发送后设为 true。" };

export const tools = [
  tool("boss_login", "打开 BOSS 直聘招聘者页面并检查登录或安全验证状态。", "bossLogin"),
  tool("boss_search_candidates", "单关键词搜索候选人，滚动加载、跨调用去重并保存到本地数据库。", "bossSearchCandidates", object({ keyword: { type: "string", minLength: 1, maxLength: 120 }, city: { type: "string" }, experience: { type: "string" }, salary: { type: "string" }, count: { type: "integer", minimum: 1, maximum: 300, default: 30 }, tabId }, ["keyword"])),
  tool("boss_multi_search", "批量轮询关键词、跨关键词去重，并可自动查看候选人获取分享链接。", "bossMultiSearch", object({ keywords: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 50 }, city: { type: "string" }, experience: { type: "string" }, count_per_keyword: { type: "integer", minimum: 1, maximum: 300, default: 50 }, auto_view: { type: "boolean", default: true }, tabId })),
  tool("boss_clear_dedup", "按候选人 ID、状态或日期清除本地去重记录；不传筛选条件时清空。", "bossClearDedup", object({ expect_ids: { type: "array", items: { type: "string" } }, status: { type: "string" }, before_date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } })),
  tool("boss_view_candidate", "通过 BOSS 个人页面 URL 查看候选人文本并保存截图。", "bossViewCandidate", object({ profile_url: { type: "string", format: "uri" }, tabId }, ["profile_url"])),
  tool("boss_view_by_index", "按搜索结果索引打开简历、保存截图，并尝试解析分享二维码。", "bossViewByIndex", object({ index: { type: "integer", minimum: 0, maximum: 299 }, tabId }, ["index"])),
  tool("boss_view_by_expect_id", "按 expectId 在当前搜索结果中定位并查看候选人。", "bossViewByExpectId", object({ expect_id: { type: "string", minLength: 1 }, tabId }, ["expect_id"])),
  tool("boss_greet_by_index", "按搜索结果索引向候选人发起沟通；属于外部写操作，必须明确确认。", "bossGreetByIndex", object({ index: { type: "integer", minimum: 0, maximum: 299 }, message: { type: "string", maxLength: 1000 }, confirm, tabId }, ["index", "confirm"])),
  tool("boss_evaluate_candidate", "使用岗位配置和关键词规则评估候选人匹配度。", "bossEvaluateCandidate", object({ resume: { type: "object" }, job_requirements: { type: "string", maxLength: 20000 } }, ["resume"])),
  tool("boss_send_greeting", "通过候选人 URL 发起沟通或发送消息；必须明确确认。", "bossSendGreeting", object({ profile_url: { type: "string", format: "uri" }, message: { type: "string", maxLength: 1000 }, confirm, tabId }, ["profile_url", "confirm"])),
  tool("boss_query_db", "查询本地候选人数据库，可按状态、分享链接、关键词和日期过滤。", "bossQueryDb", object({ status: { type: "string" }, has_share_url: { type: "boolean" }, keyword: { type: "string" }, date_from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, limit: { type: "integer", minimum: 1, maximum: 10000, default: 50 } })),
  tool("boss_update_candidate", "更新候选人的状态、评分、备注或分享链接。", "bossUpdateCandidate", object({ expect_id: { type: "string", minLength: 1 }, status: { type: "string", enum: ["new", "viewed", "shortlisted", "greeted", "rejected", "legacy"] }, score: { type: "integer", minimum: 0, maximum: 100 }, notes: { type: "string", maxLength: 10000 }, share_url: { type: "string", format: "uri" } }, ["expect_id"])),
  tool("boss_pipeline_status", "查看本地招聘流水线统计和恢复建议。", "bossPipelineStatus"),
  tool("boss_filter_and_score", "按配置进行年龄、薪资和状态筛选，并综合评分、标记 Top N。", "bossFilterAndScore", object({ top_n: { type: "integer", minimum: 1, maximum: 500, default: 20 } })),
  tool("boss_export_report", "将 shortlisted 候选人导出为 Markdown 报告。", "bossExportReport", object({ top_n: { type: "integer", minimum: 1, maximum: 500, default: 10 }, include_detail: { type: "boolean", default: true } })),
  tool("boss_debug_page", "扫描当前 BOSS 页面表单、iframe 和顶层 DOM 结构。", "bossDebugPage", object({ tabId })),
  tool("boss_reload", "重新加载本地候选人数据库和搜索配置。", "bossReload"),
];

function tool(name, description, handler, inputSchema = object()) { return { name, description, handler, inputSchema }; }
