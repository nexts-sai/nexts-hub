'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {app,screen,desktopCapturer,nativeImage}=require('electron');
const {loadSource}=require('./source-loader.cjs');
const {convert,toStep}=require('./event-adapter.cjs');
const {recordingSize,encoderArgs,FPS,JPEG_QUALITY}=require('./video-profile.cjs');
const emit=(kind,data={})=>process.stdout.write(JSON.stringify({kind,...data})+'\n');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const log=(...args)=>process.stderr.write(args.map(String).join(' ')+'\n');
const atomic=(folder,name,value)=>{
  const temporary=path.join(folder,`${name}.tmp`);
  fs.writeFileSync(temporary,JSON.stringify(value)); fs.renameSync(temporary,path.join(folder,name));
};
let source,encoder,finished=false,stopping=false,paused=false,loop,stopPromise,commandChain=Promise.resolve(),captureEpoch=0;
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.on('window-all-closed',()=>{});
const hardExit=()=>{try{source?.native.watchRecorderStop();}catch{} try{encoder?.kill();}catch{} app.exit(1);};
process.on('uncaughtException',error=>{emit('error',{message:error.message});hardExit();});
process.on('unhandledRejection',error=>{emit('error',{message:String(error)});hardExit();});

async function main(){
  const requestIndex=process.argv.indexOf('--request');
  if(requestIndex<0)throw Error('A host-issued --request file is required');
  const request=JSON.parse(fs.readFileSync(process.argv[requestIndex+1],'utf8').replace(/^\uFEFF/,''));
  const folder=path.resolve(request.folder),monitor=request.monitor;
  if(!fs.statSync(folder).isDirectory()||!monitor||![monitor.x,monitor.y,monitor.width,monitor.height].every(Number.isInteger)||monitor.width<=0||monitor.height<=0)throw Error('Invalid recorder directory or monitor');
  const userData=path.join(folder,'engine-cache');fs.mkdirSync(userData,{recursive:true});app.setPath('userData',userData);
  await app.whenReady();
  source=loadSource(request.source,{nativeImage},log);
  const display=screen.getAllDisplays().find(d=>{
    const b=screen.dipToScreenRect(null,d.bounds);
    return b.x===monitor.x&&b.y===monitor.y&&b.width===monitor.width&&b.height===monitor.height;
  });
  if(!display)throw Error('Selected monitor is disconnected or its scaling changed');
  // Native display IDs are not Electron IDs, even for the same physical screen.
  const nativeDisplay=(await source.native.cuListDisplays()).find(d=>d.originX===monitor.x&&d.originY===monitor.y&&d.width===monitor.width&&d.height===monitor.height);
  if(!nativeDisplay)throw Error('Selected monitor is unavailable to the native recorder');
  const {width,height}=recordingSize(monitor.width,monitor.height);
  const startedAt=Date.now(),events=[],frames=[],apps=[],frameTimes=[],raw=[];
  let origin=0,segmentBase=0,framesWritten=0,frameSpacing=500,lastEvidence=-Infinity,context=null,windowTitle='',sampleError=null;
  const excluded=new Set(request.excludedWindowTitles??[]);
  let windowsByHandle=new Map();
  const refreshWindows=async()=>{
    try{windowsByHandle=new Map((await source.native.cuListOpenWindows()).map(w=>[String(w.hwnd),w]));}catch{windowsByHandle.clear();}
  };
  const activeWindow=()=>{try{return windowsByHandle.get(String(source.native.getActiveWindowHandle()));}catch{return null;}};
  const elapsed=()=>Date.now()-startedAt;
  const foreground=()=>{try{return source.native.getFrontmostAppInfo();}catch{return null;}};
  const appendApp=t=>{
    context=foreground();
    if(context?.appName && apps.at(-1)?.name!==context.appName)apps.push({tMs:t,name:context.appName,bundleId:context.bundleId??''});
  };
  const remote=source.native.cuIsRemoteSession?.()===true;
  // Native capture runs locally in the user's session. Unlike Claude's account
  // controller, this host does not reject a remote-session flag before trying.
  source.native.watchRecorderSubscribe(event=>{
    if(stopping||paused||event.kind==='probe')return;
    appendApp(elapsed());
    const active=activeWindow();
    if(excluded.has(active?.title??windowTitle))return;
    if(event.kind==='key'){
      // Keyboard belongs to the foreground application's display, not the cursor.
      try{if(!active||source.native.cuDisplayForPid(active.pid)!==nativeDisplay.displayId)return;}catch{return;}
    }
    const t=Math.max(0,segmentBase+event.tMs-origin);
    const value=convert(event,monitor,display.id,t,request.includeText===true);
    if(!value)return;
    events.push(value);
    // Persist only the normalized/redacted event, never a raw cleartext callback.
    raw.push(value);
    if(events.length>=20000){sampleError=Error('Input limit reached; recording stopped with evidence retained');void stop();}
    if(events.length%4===0)emit('progress',{events:events.length,frames:framesWritten*(10/FPS)});
  });
  const encoderLog=fs.openSync(path.join(folder,'encoder.log'),'w');
  encoder=spawn(request.ffmpeg,encoderArgs(path.join(folder,'screen.mp4')),{windowsHide:true,stdio:['pipe','ignore',encoderLog]});
  fs.closeSync(encoderLog);
  let encoderError;
  encoder.on('error',error=>{encoderError=error;});
  const encoderExit=new Promise(resolve=>encoder.once('exit',(code,signal)=>resolve({code,signal})));
  encoder.stdin.on('error',error=>{encoderError=error;});
  async function sample(){
    const epoch=captureEpoch;
    const t=elapsed();appendApp(t);
    await refreshWindows();windowTitle=activeWindow()?.title??'';
    const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width,height},fetchWindowIcons:false});
    // A pending screenshot must not cross a pause/stop boundary.
    if(paused||stopping||epoch!==captureEpoch)return;
    const selected=sources.find(s=>s.display_id===String(display.id));
    if(!selected||selected.thumbnail.isEmpty())throw Error('Selected screen returned no image');
    const size=selected.thumbnail.getSize();
    if(size.width<width||size.height<height)throw Error('Screen capture returned a reduced-resolution image');
    const image=selected.thumbnail.crop({x:0,y:0,width,height});
    const jpeg=image.toJPEG(JPEG_QUALITY);
    if(encoderError)throw encoderError;
    if(!encoder.stdin.write(jpeg))await Promise.race([once(encoder.stdin,'drain'),sleep(5000).then(()=>{throw Error('Video writer stalled');})]);
    for(let i=0;i<10/FPS;i++)frameTimes.push(startedAt+t+i*100);
    framesWritten++;
    if(t-lastEvidence>=frameSpacing){
      frames.push({kind:'frame',tMs:t,encoded:jpeg,width,height,displayWidth:monitor.width,displayHeight:monitor.height,displayId:display.id,frontmost:context?.appName??null});
      lastEvidence=t;
      if(frames.length>=360||frames.reduce((bytes,f)=>bytes+f.encoded.length,0)>128*1024*1024){const retained=frames.filter((_,i)=>i%2===0);frames.splice(0,frames.length,...retained);frameSpacing*=2;}
    }
    emit('progress',{events:events.length,frames:framesWritten*(10/FPS)});
  }
  function startNative(){
    captureEpoch++;
    source.native.watchRecorderStart();
    origin=source.native.watchRecorderNowT();segmentBase=elapsed();paused=false;
  }
  async function stop(){
    if(stopPromise)return stopPromise;
    stopping=true;captureEpoch++;
    stopPromise=(async()=>{
      source.native.watchRecorderStop();
      emit('saving');
      await loop;
      encoder.stdin.end();
      const outcome=await Promise.race([encoderExit,sleep(20000).then(()=>{throw Error('Video finalization timed out');})]);
      if(outcome.code!==0)throw encoderError??Error('Video encoder failed; inspect encoder.log');
      if(!frames.length)throw Error('Recording has no frames');
      const recording={startedAt,durationMs:elapsed(),events,frames,apps};
      const actions=source.events.o(recording);
      const steps=actions.map((action,index)=>toStep(action,index,startedAt,source.events.r(apps,action.tStart)??''));
      const trajectory=await source.trajectory.buildTrajectory(recording);
      const blocks=source.blocks.buildTrajectoryContentBlocks(trajectory,{purpose:'skill',computerUseEnabled:true});
      const evidenceFrames=[];let bytes=0;
      for(const item of trajectory.items){
        if(item.kind==='text')continue;
        if(bytes+item.image.length>12*1024*1024)break;
        const name=`evidence-${String(evidenceFrames.length).padStart(3,'0')}.jpg`;
        fs.writeFileSync(path.join(folder,name),item.image);bytes+=item.image.length;
        const near=steps.reduce((best,step)=>Math.abs(step.at-startedAt-item.tMs)<Math.abs((best?.at??Infinity)-startedAt-item.tMs)?step:best,null);
        evidenceFrames.push({file:name,at:Math.round(startedAt+item.tMs),step_id:near?.id??'',kind:item.kind==='crop'?'crop':'frame',crop:item.region??null,size:item.image.length});
      }
      const warnings=[];
      // A video-only demonstration can still explain intent when protected or
      // remote input yields no actions. Never fabricate input events or steps.
      if(!steps.length&&!evidenceFrames.length){
        for(const index of [...new Set([0,Math.floor((frames.length-1)/2),frames.length-1])]){
          const frame=frames[index];if(!frame||bytes+frame.encoded.length>12*1024*1024)continue;
          const name=`evidence-${String(evidenceFrames.length).padStart(3,'0')}.jpg`;
          fs.writeFileSync(path.join(folder,name),frame.encoded);bytes+=frame.encoded.length;
          evidenceFrames.push({file:name,at:Math.round(startedAt+frame.tMs),step_id:'',kind:'frame',crop:null,size:frame.encoded.length});
        }
      }
      if(remote)warnings.push('Windows reports a remote session. Native callback counts reflect only the input actually observed.');
      if(!events.length)warnings.push('No input events were observed. Review the video and check remote/elevated application compatibility.');
      if(sampleError)warnings.push(sampleError.message);
      const actionEvidence=actions.map((a,i)=>({...a,id:steps[i].id,at:steps[i].at}));
      atomic(folder,'claude-events.json',{engine:'claude-watch-recorder',startedAt,events:raw,apps});
      atomic(folder,'claude-trajectory.json',{...trajectory,items:trajectory.items.map(item=>item.kind==='text'?item:{...item,image:undefined}),contentText:blocks.filter(b=>b.type==='text').map(b=>b.text)});
      atomic(folder,'nexts-evidence.json',{version:1,engine:'claude-watch-recorder',sourceVersion:'5.11492.5',actions:actionEvidence,frames:evidenceFrames,raw_events:events.length,warnings,stats:trajectory.stats});
      atomic(folder,'nexts-steps.json',steps);
      atomic(folder,'capture.json',{version:1,fps:10,width,height,bounds:[monitor.x,monitor.y,monitor.width,monitor.height],frame_times:frameTimes,observations:[],warnings});
      for(const step of steps)emit('step',{step});
      emit('complete',{events:events.length,steps:steps.length,frames:frameTimes.length,images:evidenceFrames.length,engine:'claude-watch-recorder'});
      finished=true;app.exit(0);
    })();
    return stopPromise;
  }
  let controlSequence=-1,lastHeartbeat=Date.now();
  const controlTimer=setInterval(()=>{
    let control;try{control=JSON.parse(fs.readFileSync(path.join(folder,'nexts-control.json'),'utf8').replace(/^\uFEFF/,''));}catch{}
    if(Number.isFinite(control?.heartbeat)&&control.heartbeat<=Date.now()+1000)lastHeartbeat=Math.max(lastHeartbeat,control.heartbeat);
    if(Date.now()-lastHeartbeat>15000){clearInterval(controlTimer);void stop();return;}
    if(!control)return;
    if(control.sequence===controlSequence)return;
    controlSequence=control.sequence;
    const action=control.action;
    commandChain=commandChain.then(async()=>{
      if(stopping)return;
      if(action==='stop')return stop();
      if(action==='pause'&&!paused){paused=true;captureEpoch++;source.native.watchRecorderStop();emit('paused');}
      if(action==='resume'&&paused){startNative();emit('ready');}
    });
  },150);
  process.on('SIGTERM',()=>{void stop();});
  process.on('exit',()=>{if(!finished){try{source.native.watchRecorderStop();}catch{} try{encoder?.kill();}catch{}}});
  // Ready means hooks and the first encoded screen sample both succeeded.
  await refreshWindows();startNative();await sample();emit('ready',{engine:'claude-watch-recorder',width,height,remoteSession:remote});
  loop=(async()=>{
    while(!stopping){
      await sleep(1000/FPS);
      if(stopping)break;
      if(elapsed()>=Math.min(600000,request.maxDurationMs??600000)){void stop();break;}
      if(paused)continue;
      try{await sample();}catch(error){sampleError=error;void stop();break;}
    }
  })();
}
main().catch(error=>{emit('error',{message:error.message});hardExit();});
