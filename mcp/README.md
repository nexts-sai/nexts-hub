# NEXTS MCP catalog

The MCP category contains launch definitions. Application connector source and tooling are maintained in a separate project.

## Distribution types

1. `official_npm`: an npm MCP package published by the official product/vendor. NEXTS stores its package specifier and runs it directly with `npx`.
2. `community_npm`: an npm MCP package published by an independent community maintainer. NEXTS stores its package specifier and identifies it as third-party.
3. `nexts_hub`: an adapter maintained by NEXTS. Its runtime is distributed as a versioned ZIP package. Desktop clients download those packages and never clone this repository.
4. `remote_mcp`: an HTTPS Streamable HTTP MCP endpoint. The client connects to the endpoint and does not install a local npm package.
5. `local_stdio`: an existing MCP command such as a native CLI, `uvx`, or `python`. Store its `command`, `args`, and `env` directly. The user's desktop launches it using standard MCP stdio; no NEXTS wrapper or ZIP package is required. The executable and any dependencies must already be available on that desktop.

Catalog entries require `id`, `display_name`, `description`, `summary`, `publisher`,
`distribution_type`, `auth_types`, `version`, and `transport`. For `local_stdio`,
use `transport: "stdio"`, a nonempty `command`, an argument array, and `url: null`.
Use `configuration_fields` to collect environment values such as API keys or token
file paths without putting credentials in the catalog. The Craft entries are examples.
Like `nexts-canvas`, they are declarative MCP definitions; Canvas uses an npm
launcher while the Craft entries use separately installed native executables.

## Layout

```text
mcp/
+-- templates/basic-mcp/       manifest template
+-- <published-id>/mcp.json    optional curated Hub launch definition
`-- .agents/mcp/marketplace.json
```

Generated `.tgz` files and temporary build output are ignored. Publish them as GitHub Release assets rather than committing binaries.

## Security and ownership

- Credentials and OAuth tokens are never committed to this repository.
- Account-service owns catalog state, OAuth coordination, visibility, recommendations, and the versioned launch definition.
- The desktop owns installed state and encrypted local credentials.
- Official/community packages remain owned by their original publishers; NEXTS must not silently repackage them.
