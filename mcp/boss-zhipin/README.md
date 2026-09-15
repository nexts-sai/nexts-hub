# BOSS 直聘 MCP

这是一个独立的本地 stdio MCP，通过 Nexts Chrome 插件的 Chrome Control bridge 操作用户已经登录的 BOSS 直聘招聘页面。

## 工具

实现了上游当前 `server.py` 注册的全部 17 个工具：

- 搜索与查看：`boss_login`、`boss_search_candidates`、`boss_multi_search`、`boss_view_candidate`、`boss_view_by_index`、`boss_view_by_expect_id`
- 候选人沟通：`boss_greet_by_index`、`boss_send_greeting`
- 本地数据库：`boss_query_db`、`boss_update_candidate`、`boss_clear_dedup`、`boss_pipeline_status`
- 筛选与输出：`boss_evaluate_candidate`、`boss_filter_and_score`、`boss_export_report`
- 调试维护：`boss_debug_page`、`boss_reload`

服务不会绕过登录或安全验证。候选人数据库、截图、搜索配置和报告仅保存在桌面本机，不会上传到 Nexts 账号服务。两个候选人沟通工具都要求 `confirm=true`，工作流应只在用户明确确认后设置该参数。

## 本地运行

需要先安装并启动仓库中的 Nexts Chrome 插件及其 native bridge，然后让 MCP 进程获得相同的 bridge token：

```powershell
$env:NEXTS_CREDENTIAL_BRIDGETOKEN = "<bridge-token>"
node server.mjs
```

MCP 使用换行分隔的 JSON-RPC 2.0，通过标准输入和标准输出通信。运行测试：

```powershell
npm test
```

## 搜索配置和数据目录

默认数据目录是 `%LOCALAPPDATA%\Nexts\boss-zhipin-mcp`，可通过 `BOSS_ZHIPIN_DATA_DIR` 修改。服务从数据目录下的 `search_profile.yaml` 读取岗位、关键词、筛选和评分配置，也可通过 `BOSS_ZHIPIN_PROFILE_PATH` 指定其他 YAML 文件。

支持的 YAML 结构与上游 `search_profile.example.yaml` 一致，包括 `job`、`company`、`requirements`、`filter`、`keywords` 和 `scoring`。
