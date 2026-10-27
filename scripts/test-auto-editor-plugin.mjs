import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve('plugins/plugins/auto-editor');
test('Auto-Editor is an independent skill plugin with complete local resources', () => {
  const manifest = JSON.parse(readFileSync(join(root,'.nexts-plugin/plugin.json')));
  assert.equal(manifest.name,'auto-editor');
  assert.equal(manifest.version,'0.1.0');
  assert.equal(manifest.mcpServers,undefined);
  for(const file of ['LICENSE','README.md','UPSTREAM.json',manifest.interface.logo,'skills/auto-editor/SKILL.md','skills/auto-editor/references/cli.md']) assert.ok(existsSync(join(root,file)),file);
  const registry=JSON.parse(readFileSync('plugins/.agents/plugins/marketplace.json'));
  assert.equal(registry.plugins.filter(p=>p.name==='auto-editor').length,1);
  const recipes=readFileSync(join(root,'skills/auto-editor/references/cli.md'),'utf8');
  assert.match(recipes,/--when-active nil --when-inactive cut --preview/);
  assert.match(recipes,/--when-active nil --when-inactive speed:4 --preview/);
  assert.match(recipes,/--keep "30sec,45sec"/);
});

test('real CLI: silence is removed, pauses are shortened, original is preserved', {skip: !process.env.AUTO_EDITOR_TEST_BINARY}, () => {
  const binary=resolve(process.env.AUTO_EDITOR_TEST_BINARY);
  mkdirSync('.tmp',{recursive:true});
  const work=mkdtempSync(resolve('.tmp/auto-editor-test-'));
  const input=join(work,'source with spaces.wav');
  // 8 seconds: silence 0-1, tone 1-3, silence 3-5, tone 5-7, silence 7-8.
  const rate=48000, seconds=8, pcm=Buffer.alloc(rate*seconds*2);
  for(let i=0;i<rate*seconds;i++) {
    const t=i/rate, active=(t>=1&&t<3)||(t>=5&&t<7);
    pcm.writeInt16LE(active?Math.round(12000*Math.sin(2*Math.PI*440*t)):0,i*2);
  }
  const header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);
  header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
  header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  writeFileSync(input,Buffer.concat([header,pcm]));
  const digest=()=>createHash('sha256').update(readFileSync(input)).digest('hex');
  const before=digest();
  const run=args=>{
    const result=spawnSync(binary,args,{encoding:'utf8',timeout:60000,windowsHide:true});
    assert.equal(result.status,0,`${result.error??''}\n${result.stderr}\n${result.stdout}`);
    return result.stdout;
  };
  const common=[input,'--edit','audio:threshold=0.04,stream=all','--margin','0.2s','--smooth','0.2s,0.1s','--when-active','nil'];
  function duration(file) {
    const b=readFileSync(file);
    let bytesPerSecond, dataBytes;
    for(let p=12;p+8<=b.length;) {
      const tag=b.toString('ascii',p,p+4), size=b.readUInt32LE(p+4);
      if(tag==='fmt ') bytesPerSecond=b.readUInt32LE(p+16);
      if(tag==='data') dataBytes=size;
      p+=8+size+(size%2);
    }
    assert.ok(bytesPerSecond>0&&dataBytes>0);
    return dataBytes/bytesPerSecond;
  }
  const durations={};
  for(const [mode,action] of [['cut','cut'],['pause','speed:4']]) {
    const output=join(work,`${mode}.wav`);
    run([...common,'--when-inactive',action,'--preview','-o',output]);
    assert.ok(!existsSync(output),'preview must not render');
    run([...common,'--when-inactive',action,'--no-open','-o',output]);
    durations[mode]=duration(output);
    run(['info',output,'--json']);
  }
  assert.equal(digest(),before);
  assert.ok(durations.cut>4.5&&durations.cut<5.1,JSON.stringify(durations));
  assert.ok(durations.pause>durations.cut&&durations.pause<6,JSON.stringify(durations));
  console.log(JSON.stringify({runtime:run(['--version']).trim(),inputSeconds:seconds,...durations,work}));
});
