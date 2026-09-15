# BOSS 直聘 MCP

这是一个独立的本地 stdio MCP，通过 Nexts Chrome 插件的 Chrome Control bridge 操作用户已经登录的 BOSS 直聘招聘页面。

## 工具

- `open_recruiter`：创建受控 Chrome 会话并打开招聘候选人页面。
- `check_status`：检查登录和安全验证状态。
- `search_candidates`：按关键词搜索当前可见的候选人卡片。
- `open_candidate`：打开一张候选人卡片供用户审核。

服务不会绕过登录或安全验证，也不会自动发送招呼或消息。返回的候选人文本会隐藏明确出现的年龄和性别值，并且只在本机 MCP 与 Chrome bridge 之间传递。

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
