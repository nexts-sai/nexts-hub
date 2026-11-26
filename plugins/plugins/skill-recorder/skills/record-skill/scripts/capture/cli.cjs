'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawn} = require('node:child_process');
const {monitors, checkEncoder, readJson, atomic} = require('./io.cjs');
const {ENGINE} = require('./events.cjs');
const {reportError} = require('./record.cjs');
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };

async function main() {
  const displays = monitors();
  if (process.argv.includes('--list')) { console.log(JSON.stringify(displays, null, 2)); return; }
  const ffmpeg = arg('--ffmpeg') || 'ffmpeg';
  checkEncoder(ffmpeg);
  if (process.argv.includes('--diagnose')) {
    console.log(JSON.stringify({engine: ENGINE, node: process.versions.node, ffmpeg, displays, dependenciesReady: true})); return;
  }
  const monitor = Number(arg('--monitor') || 0), seconds = Number(arg('--seconds') || 60);
  if (!Number.isInteger(monitor) || !displays[monitor]) throw Error('Select a monitor returned by -ListMonitors.');
  if (!Number.isFinite(seconds) || seconds < 5 || seconds > 600) throw Error('Recording duration must be between 5 and 600 seconds.');
  const defaultRoot = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'SkillRecorder/recordings');
  const folder = path.resolve(arg('--output') || path.join(defaultRoot, `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`));
  if (fs.existsSync(folder)) throw Error('Use a new output directory; existing recordings are never overwritten.');
  fs.mkdirSync(folder, {recursive: true});
  atomic(folder, 'nexts-request.json', {folder, monitor: displays[monitor], ffmpeg, maxDurationMs: seconds * 1000});
  let sequence = 0, action = 'run', previous = '', controlError;
  const control = () => atomic(folder, 'nexts-control.json', {sequence, action, heartbeat: Date.now()});
  control();
  console.log(JSON.stringify({kind: 'starting', folder, monitor: displays[monitor], seconds}));
  const child = spawn(process.execPath, [path.join(__dirname, 'record.cjs'), '--request', path.join(folder, 'nexts-request.json')], {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  const log = fs.createWriteStream(path.join(folder, 'nexts-capture.log'), {flags: 'wx'});
  child.stdout.pipe(process.stdout);
  child.stderr.on('data', chunk => { log.write(chunk); process.stderr.write(chunk); });
  log.on('error', error => { controlError = error; action = 'stop'; sequence++; });
  const stop = () => { action = 'stop'; sequence++; try { control(); } catch (error) { controlError = error; } };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  const timer = setInterval(() => {
    try {
      const next = readJson(path.join(folder, 'command.json')), serialized = JSON.stringify(next);
      if (serialized !== previous && ['pause', 'resume', 'stop'].includes(next.action)) { previous = serialized; action = next.action; sequence++; }
    } catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) controlError = error; }
    try { control(); } catch (error) { controlError = error; }
  }, 500);
  try {
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    if (controlError) throw controlError;
    console.log(JSON.stringify({kind: 'finished', folder, exitCode: code}));
    process.exitCode = code === 0 ? 0 : 1;
  } finally { clearInterval(timer); process.off('SIGINT', stop); process.off('SIGTERM', stop); log.end(); }
}
main().catch(error => { reportError(error); process.exitCode = 1; });
