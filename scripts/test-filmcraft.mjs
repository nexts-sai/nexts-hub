import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate, poll, validatePlan, srt } from '../plugins/plugins/filmcraft/scripts/studio.mjs';
import { NextsProvider, backendConfig, videoReceipt } from '../plugins/plugins/filmcraft/scripts/nexts.mjs';

const temp = () => mkdtemp(join(tmpdir(),'nexts-filmcraft-test-'));
test('ElevenLabs requirement refuses a different backend voice before billable submission',async()=>{
  const methods=[];
  const provider=new NextsProvider({base:new URL('https://backend.test/api/v1/'),token:'secret'},async(url,init)=>{methods.push(init.method);return Response.json({selection:{ttsModel:'other-tts'}});});
  await assert.rejects(provider.submit({kind:'speech',text:'Hello'}),/Select ElevenLabs/);
  assert.deepEqual(methods,['GET']);
});
test('Auto routing and ElevenLabs use backend auth; CDN receives no token',async()=>{
  const calls=[];
  const provider = new NextsProvider({base:new URL('https://backend.test/api/v1/'),token:'secret'},async(url,init)=>{
    calls.push({url:String(url),init});
    if(String(url).endsWith('images/generations')) return Response.json({data:[{url:'https://cdn.test/image.png'}]});
    if(String(url).endsWith('audio/voices')) return Response.json({selection:{ttsModel:'elevenlabs-tts'}});
    if(String(url).endsWith('audio/speech')) return new Response('ID3',{headers:{'content-type':'audio/mpeg'}});
    return new Response('image');
  });
  const image=await provider.submit({kind:'image',prompt:'Cup'});
  await provider.download(image.asset);
  await provider.submit({kind:'speech',text:'Hello',language:'en'});
  assert.equal(JSON.parse(calls[0].init.body).model,'auto');
  assert.equal(calls[0].init.headers.Authorization,'Bearer secret');
  assert.equal(calls[1].init.headers,undefined);
  assert.ok(calls[2].url.endsWith('audio/voices'));
  assert.equal(JSON.parse(calls[3].init.body).model,'auto');
});
test('video poll recognizes failure, does not mistake cover image for video',()=>{
  assert.equal(videoReceipt({id:'task',status:'failed',video_url:'https://cdn/x.mp4'}).status,'failed');
  assert.deepEqual(videoReceipt({data:{id:'task',status:'completed',cover_image_url:'https://cdn/cover.png'}}),{status:'pending',taskId:'task'});
  assert.equal(videoReceipt({data:{id:'task',status:'completed',video_url:'https://cdn/movie'}}).status,'ready');
  assert.deepEqual(videoReceipt({status:'processing'},'known-task'),{status:'pending',taskId:'known-task'});
});
test('uncertain submission and restart cannot create a second paid POST',async()=>{
  const root=await temp(); let posts=0;
  const provider={submit:async()=>{posts++;throw Error('network');}};
  await assert.rejects(generate(root,'one',{kind:'video',prompt:'Cup'},provider),/unknown/);
  const result=await generate(root,'one',{kind:'video',prompt:'Cup'},provider);
  assert.equal(result.status,'unknown'); assert.equal(posts,1);
  await assert.rejects(generate(root,'one',{kind:'video',prompt:'Different'},provider),/different request/);
});
test('download retry and complete job reuse never submit again',async()=>{
  const root=await temp();let posts=0,downloads=0;
  const provider={submit:async()=>{posts++;return {status:'ready',asset:{url:'https://cdn/movie.mp4'}};},download:async()=>{if(++downloads===1)throw Error('temporary');return Buffer.from('movie');}};
  await assert.rejects(generate(root,'one',{kind:'video',prompt:'Cup'},provider),/temporary/);
  const result=await generate(root,'one',{kind:'video',prompt:'Cup'},provider);
  assert.equal(result.status,'complete');assert.equal(posts,1);
  assert.equal((await generate(root,'one',{kind:'video',prompt:'Cup'},provider)).path,result.path);
  assert.equal(downloads,2);
  assert.equal(await readFile(result.path,'utf8'),'movie');
});
test('asynchronous video poll resumes saved task',async()=>{
  const root=await temp(); let posts=0;
  const provider={submit:async()=>{posts++;return {status:'pending',taskId:'upstream-1'};},poll:async id=>{assert.equal(id,'upstream-1');return {status:'ready',asset:{base64:'bW92aWU='}};},download:async a=>Buffer.from(a.base64,'base64')};
  await generate(root,'one',{kind:'video',prompt:'Cup'},provider);
  assert.equal((await poll(root,'one',provider)).status,'complete');assert.equal(posts,1);
});
test('validation rejects caption overlap, unreviewed timing and missing visuals',()=>{
  const p={schemaVersion:1,name:'test',width:640,height:360,fps:24,shots:[{id:'a',frames:48,image:'a.png'}],captionsReviewed:true,captions:[{startFrame:0,endFrame:24,text:'Hello'},{startFrame:24,endFrame:48,text:'World'}]};
  assert.equal(validatePlan(p),48);assert.match(srt(p),/00:00:01,000 --> 00:00:02,000/);
  assert.throws(()=>validatePlan({...p,captionsReviewed:false}),/review/);
  assert.throws(()=>validatePlan({...p,captions:[...p.captions,{startFrame:30,endFrame:40,text:'bad'}]}),/nonoverlapping/);
  assert.throws(()=>validatePlan({...p,shots:[{id:'a',frames:48}]}),/visual/);
});
test('backend credential URL must be trusted transport and credentials are not inferred',()=>{
  assert.throws(()=>backendConfig({}),/session bridge/);
  assert.throws(()=>backendConfig({NEXTS_ACCESS_TOKEN:'x',NEXTS_ACCOUNT_API_BASE_URL:'http://example.com/api/v1'}),/HTTPS/);
  assert.throws(()=>backendConfig({NEXTS_ACCESS_TOKEN:'x',NEXTS_ACCOUNT_API_BASE_URL:'https://user:password@example.com'}),/HTTPS/);
});
