# FilmCraft MCP

Windows 默认启用的本地 stdio MCP，桥接到 FilmCraft 桌面程序的 `127.0.0.1:9876` 控制端口。

## 使用前提

- 已安装 FilmCraft，CLI 路径为 `C:\Program Files\FilmCraft\filmcraft-cli.exe`。
- 启动 FilmCraft 桌面程序时传入 `--control 9876`，或设置 `FILMCRAFT_CONTROL_PORT=9876`。
- 如果安装路径或控制端口不同，需要调整 `mcp.json` 中的 `command` 或 `args`。

`enabled_by_default: true` 声明 Hub 中该服务默认启用，不负责安装或启动 FilmCraft 桌面程序。此目录只提供启动配置，不打包第三方程序。

协议文档：https://github.com/storytold/filmcraft/blob/main/docs/control-protocol.md
