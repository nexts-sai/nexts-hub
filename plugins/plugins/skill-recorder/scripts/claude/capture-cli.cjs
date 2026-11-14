'use strict';
// Standalone host for Codex/local diagnostics; the production controls are Nexts UI.
const fs=require('node:fs'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const runtime=JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA,'SkillRecorder/runtime/claude-5.11492.5-electron-45.3.2/runtime.json'),'utf8').replace(/^\uFEFF/,''));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
if(createHash('sha256').update(fs.readFileSync(runtime.executable)).digest('hex')!==runtime.executableSha256)throw Error('Runtime executable checksum mismatch');
const probe=spawnSync(runtime.executable,[path.join(__dirname,'diagnose.cjs'),runtime.source],{env,windowsHide:true,encoding:'utf8',timeout:20000});
if(probe.status!==0)throw Error(probe.stderr||'Recorder runtime unavailable');
const diagnostic=JSON.parse(probe.stdout.trim());
const displays=[...diagnostic.displays].sort((a,b)=>Number(b.primary)-Number(a.primary));
if(process.argv.includes('--list')){console.log(JSON.stringify(displays,null,2));process.exit(0);}
const index=Number(arg('--monitor')??0),seconds=Number(arg('--seconds')??60);
if(!Number.isInteger(index)||!displays[index]||!Number.isFinite(seconds)||seconds<5||seconds>600)throw Error('Select a listed monitor and duration from 5 to 600 seconds');
const folder=path.resolve(arg('--output')??'');
if(!arg('--output')||fs.existsSync(folder))throw Error('Use a new --output directory');
const ffmpeg=arg('--ffmpeg')??'ffmpeg';
if(spawnSync(ffmpeg,['-version'],{windowsHide:true,stdio:'ignore'}).status!==0)throw Error('FFmpeg is required on PATH or pass --ffmpeg');
fs.mkdirSync(folder,{recursive:true});
const display=displays[index];
const request={folder,source:runtime.source,monitor:display,ffmpeg,includeText:false,maxDurationMs:seconds*1000};
fs.writeFileSync(path.join(folder,'nexts-request.json'),JSON.stringify(request));
let sequence=0,action='run',last='';
const control=()=>{const tmp=path.join(folder,'nexts-control.json.tmp');fs.writeFileSync(tmp,JSON.stringify({sequence,action,heartbeat:Date.now()}));fs.renameSync(tmp,path.join(folder,'nexts-control.json'));};
control();
const child=spawn(runtime.executable,[path.join(__dirname,'record.cjs'),'--request',path.join(folder,'nexts-request.json')],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
const timer=setInterval(()=>{
  try{const next=JSON.parse(fs.readFileSync(path.join(folder,'command.json'),'utf8').replace(/^\uFEFF/,''));if(['pause','resume','stop'].includes(next.action)&&JSON.stringify(next)!==last){last=JSON.stringify(next);action=next.action;sequence++;}}catch{}
  control();
},500);
process.on('SIGINT',()=>{action='stop';sequence++;control();});
child.on('error',error=>{clearInterval(timer);console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{clearInterval(timer);console.log(JSON.stringify({folder,exitCode:code}));process.exitCode=code??1;});
