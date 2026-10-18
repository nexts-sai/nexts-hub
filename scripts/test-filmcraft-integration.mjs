// Opt in: FILMCRAFT_INTEGRATION=1 node --test scripts/test-filmcraft-integration.mjs
// Requires FilmCraft CLI and FFmpeg. No network requests or paid generation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assemble } from '../plugins/plugins/filmcraft/scripts/studio.mjs';
const exec = promisify(execFile);

test('real FilmCraft: image + video, narration, subtitle track and final H.264 export', {skip:process.env.FILMCRAFT_INTEGRATION !== '1',timeout:180000}, async()=>{
  const root=await mkdtemp(join(tmpdir(),'nexts-filmcraft-integration-'));
  const ffmpeg=async args=>exec('ffmpeg',['-hide_banner','-loglevel','error',...args],{windowsHide:true,timeout:30000});
  await ffmpeg(['-f','lavfi','-i','testsrc2=size=640x360:rate=24','-t','2','-c:v','libx264','-pix_fmt','yuv420p',join(root,'video.mp4')]);
  await ffmpeg(['-f','lavfi','-i','color=c=blue:s=1280x720','-frames:v','1',join(root,'image.png')]);
  await ffmpeg(['-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1.8',join(root,'voice.wav')]);
  const plan={schemaVersion:1,name:'Two shot integration',width:640,height:360,fps:24,captionsReviewed:true,shots:[{id:'image',frames:48,image:'image.png',voice:'voice.wav'},{id:'video',frames:48,video:'video.mp4',voice:'voice.wav'}],captions:[{startFrame:0,endFrame:48,text:'First shot'},{startFrame:48,endFrame:96,text:'Second shot'}]};
  const planPath=join(root,'production.json');await writeFile(planPath,JSON.stringify(plan));
  const result=await assemble(planPath);
  assert.equal(result.video, join(root,'output','final.mp4'));
  const seq=JSON.parse(await readFile(join(root,'output/sequence.json'),'utf8'));
  assert.equal(seq.video[0].items.length,2);
  assert.equal(seq.video[0].items[0].effects.find(e=>e.effect==='motion').params.scale.value,'Float(50.0)');
  assert.equal(seq.audio[0].items.length,2);
  assert.equal(seq.video[0].items[1].startFrame,48);
  assert.equal(seq.durationFrames,96);
  assert.ok((await stat(result.video)).size>0);
  for(const preview of result.previews)assert.ok((await stat(preview)).size>0);
  await assert.rejects(assemble(planPath),/EEXIST/);
  plan.shots[1].frames=120;await writeFile(planPath,JSON.stringify(plan));
  await assert.rejects(assemble(planPath,join(root,'too-short')),/too short/);
  console.log(`FilmCraft integration artifacts: ${root}`);
});
