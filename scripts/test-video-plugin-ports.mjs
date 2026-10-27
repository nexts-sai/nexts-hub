import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invocation, pluginVersion } from '../plugins/plugins/hyperframes/skills/hyperframes/scripts/plugin-cli.mjs';

const hub = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(hub, 'plugins/plugins');
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    assert.ok(!lstatSync(p).isSymbolicLink(), `unresolved symlink: ${p}`);
    return lstatSync(p).isDirectory() ? files(p) : [p];
  });
}
for (const [id, version, skills] of [['chatcut','1.10.21',18],['remotion','4.0.534',12],['hyperframes','0.8.207',7]]) {
  test(`${id}: registered, licensed, complete portable resources`, () => {
    const folder = join(root,id);
    const manifest = readJson(join(folder,'.nexts-plugin/plugin.json'));
    assert.equal(manifest.name,id);
    assert.equal(manifest.version,version);
    const registry = readJson(join(hub,'plugins/.agents/plugins/marketplace.json'));
    assert.equal(registry.plugins.filter(p=>p.name===id).length,1);
    assert.equal(registry.plugins.find(p=>p.name===id).policy.installation,'AVAILABLE');
    for (const p of ['LICENSE','NOTICE.nexts.md','UPSTREAM.json',manifest.skills,manifest.interface.logo,manifest.interface.composerIcon]) {
      assert.ok(existsSync(join(folder,p)), `${id}: missing ${p}`);
    }
    const inventory = files(folder);
    for (const source of readJson(join(folder,'UPSTREAM.json')).files) {
      if (id === 'chatcut' && source.path.startsWith('skills/chatcut-plugin-basics/scripts/')) continue;
      assert.ok(existsSync(join(folder,source.path)), `${id}: missing source resource ${source.path}`);
    }
    const skillFiles = readdirSync(join(folder,'skills')).filter(name=>existsSync(join(folder,'skills',name,'SKILL.md')));
    assert.equal(skillFiles.length,skills);
    for(const p of inventory) {
      assert.doesNotMatch(p, /[/\\](?:\.git|node_modules|\.env|config\.toml|\.mcp-auth)(?:[/\\]|$)/);
      if(!p.endsWith('.md')) continue;
      const text = readFileSync(p,'utf8');
      assert.doesNotMatch(text, /codex mcp (?:add|login|get)/, p);
      // Validate concrete relative Markdown references; skip remote links and recipe placeholders.
      for(const m of text.matchAll(/\]\((\.[^\s)]+)\)/g)) {
        const link = m[1].split('#')[0];
        if (!link || /[<>{}*]/.test(link)) continue;
        assert.ok(existsSync(resolve(dirname(p),decodeURIComponent(link))), `${p}: broken link ${link}`);
      }
    }
  });
}
test('ChatCut uses a pinned OAuth stdio bridge, without bundled credentials', () => {
  const config = readJson(join(root,'chatcut/.mcp.json'));
  const server = config.mcpServers.chatcut;
  assert.equal(server.transport,'stdio');
  assert.equal(server.command,'npx');
  assert.ok(server.args.includes('mcp-remote@0.15.2'));
  assert.equal(server.args[server.args.indexOf('--resource')+1], 'https://api.chatcut.io/api/external-mcp/mcp');
  assert.equal(server.args[server.args.indexOf('--transport')+1],'http-only');
  assert.deepEqual(server.env,{});
  assert.doesNotMatch(JSON.stringify(config), /Bearer |access_token|refresh_token|api_key/i);
  assert.ok(!existsSync(join(root,'chatcut/skills/chatcut-plugin-basics/scripts')));
});
test('HyperFrames detects the Nexts manifest and pins launcher dependencies', () => {
  assert.equal(pluginVersion(), '0.8.207');
  const cmd = invocation(['render'], {platform:'linux',env:{}});
  assert.deepEqual(cmd.args,['--yes','hyperframes@0.8.207','render']);
  assert.equal(cmd.env.HYPERFRAMES_SKIP_SKILLS,'1');
  assert.equal(cmd.env.HYPERFRAMES_PLUGIN_VERSION,'0.8.207');
  assert.throws(()=>invocation(['skills','update']),/plugin manager/);
  const win = invocation(['render'],{platform:'win32',node:'C:\\Node\\node.exe',env:{},pathExists:()=>true});
  assert.equal(win.command,'C:\\Node\\node.exe');
  assert.ok(win.args[0].endsWith('npx-cli.js'));
});
