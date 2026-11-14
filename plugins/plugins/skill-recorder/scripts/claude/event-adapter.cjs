'use strict';
// Windows native callback -> the original Claude semantic processor contract.
// No click, typing, scroll or drag consolidation is implemented here.
const special = {13:'\r',9:'\t',27:'\x1b',8:'\x7f',45:'\uf727',46:'\uf728',
  38:'\uf700',40:'\uf701',37:'\uf702',39:'\uf703',36:'\uf729',35:'\uf72b',33:'\uf72c',34:'\uf72d'};
for (let vk=112;vk<=123;vk++) special[vk]=String.fromCharCode(0xf704+vk-112);
const kinds=new Set(['leftMouseDown','leftMouseUp','rightMouseDown','rightMouseUp','scrollWheel','key']);
function convert(raw, monitor, displayId, tMs, includeText=false) {
  if (!kinds.has(raw.kind) || !Number.isFinite(tMs)) return null;
  const event={type:raw.kind==='key'?'keyDown':raw.kind,tMs,displayId,keyConvention:'win32',
    ctrl:!!raw.ctrl,shift:!!raw.shift,opt:!!raw.alt,win:!!raw.win,altGr:!!raw.altGr};
  if (raw.kind !== 'key') {
    const x=raw.physX,y=raw.physY;
    if (!Number.isFinite(x)||!Number.isFinite(y)||x<monitor.x||y<monitor.y||x>=monitor.x+monitor.width||y>=monitor.y+monitor.height) return null;
    Object.assign(event,{x,y,relX:x-monitor.x,relY:y-monitor.y,scrollDX:raw.scrollDx??0,scrollDY:raw.scrollDy??0});
  } else {
    if (raw.cleartext!==true || typeof raw.chars!=='string') return {...event,secureInput:true};
    const chars=special[raw.vk] ?? (raw.ctrl && raw.chars.length===1 && raw.chars.charCodeAt(0)<32 ? raw.charsIgnoringModifiers??raw.chars : raw.chars);
    const chord=(raw.ctrl||raw.alt||raw.win)&&!raw.altGr&&!(raw.ctrl&&raw.alt&&!raw.win);
    if (!includeText && !chord && !special[raw.vk]) return {...event,secureInput:true};
    event.chars=chars;
  }
  return event;
}
function toStep(action,index,startedAt,app='') {
  const kind={type:'set_value',chord:'key',appSwitch:'manual',note:'manual'}[action.kind]??action.kind;
  return {id:`claude_${index}`,at:Math.round(startedAt+action.tStart),title:action.text.slice(0,240),
    action:kind==='click'&&action.text.startsWith('right-')?'right_click':kind,
    locator:{channel:'visual',app,window_title:'',url:'',frame_url:'',control:{id:'',name:'',role:'',class_name:'',test_id:''},ancestors:[]},
    parameter:kind==='set_value'?`input_${index}`:'',expected:null,enabled:true};
}
module.exports={convert,toStep};
