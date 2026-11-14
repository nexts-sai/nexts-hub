'use strict';
const {app,screen,nativeImage}=require('electron');
const {loadSource}=require('./source-loader.cjs');
app.whenReady().then(()=>{
  const source=loadSource(process.argv[2],{nativeImage});
  const native=source.native;
  const displays=screen.getAllDisplays().map(d=>({name:d.label||String(d.id),...screen.dipToScreenRect(null,d.bounds),primary:d.id===screen.getPrimaryDisplay().id}));
  console.log(JSON.stringify({engine:'claude-watch-recorder',electron:process.versions.electron,displays,
    apis:['watchRecorderStart','watchRecorderStop','watchRecorderSubscribe','watchRecorderNowT'].every(k=>typeof native[k]==='function'),
    processors:typeof source.events.o==='function'&&typeof source.trajectory.buildTrajectory==='function',
    frontmostFields:Object.keys(native.getFrontmostAppInfo()??{})}));
  app.exit(0);
}).catch(error=>{console.error(error.stack);app.exit(1);});
