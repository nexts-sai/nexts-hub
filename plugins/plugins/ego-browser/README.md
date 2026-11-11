# ego Browser for Nexts

通过 ego lite 的 ego-browser CLI 在独立任务空间中执行网页导航、表单填写、截图、数据提取和网页测试，并复用用户的登录状态。

## 安装与使用

从 Nexts 插件市场安装 ego-browser，然后从 [ego lite 官网](https://lite.ego.app/) 安装浏览器并完成首次引导，确保 ego-browser 命令可用。插件包含技能和辅助资料，浏览器应用需单独安装。

在 Nexts 中请求“使用 ego-browser 帮我浏览网页并提取信息”。技能通过宿主 shell 执行 CLI，不依赖 Codex 专用工具或 MCP 服务。Bash 使用 heredoc；Windows PowerShell 使用技能中提供的 here-string 示例。

安装说明见 [references/install.md](skills/ego-browser/references/install.md)。随包的 install.sh 仅支持 macOS；Windows 请使用官网提供的适用安装方式。网站登录和首次引导由用户完成。用户接管任务空间后，代理需等待明确的继续指令。

## 来源与适配

- 原项目：[ego / ego lite](https://lite.ego.app/)。保留 ego 作者/品牌归属。
- 来源：本机 Codex 已安装的 ego-browser 技能快照，版本 1.2.3，上游标注日期 2026-06-25。
- 保留原技能主体、安装脚本以及 GitHub、Google、X 的 learnings 辅助资料。
- Nexts 适配：增加 .nexts-plugin/plugin.json、市场注册及中文展示信息；将 Bash 工具限定改为宿主 shell，补充 PowerShell 调用示例；遵循用户的浏览器选择和 Nexts 工具优先级。
- 原快照未附带作者个人姓名或 LICENSE 文件，因此不虚构个人署名或开源许可证，也不将来源内容重新署名为 Nexts。

## 验证

在 Hub 根目录执行 npm run sync、npm run validate 和 node scripts/package-plugins.mjs --plugin ego-browser。

这些命令验证目录、注册表和分发包。浏览器端运行验证需要已安装并完成引导的 ego lite；本插件收录不代表已经验证所有浏览器操作。
