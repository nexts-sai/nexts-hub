'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const readline = require('node:readline');
const {readJson, atomic, powershell, nativeArgs, checkEncoder} = require('./io.cjs');
const {ENGINE, normalize, processEvents, selectFrames} = require('./events.cjs');
const {recordingSize, encoderArgs} = require('./video-profile.cjs');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const emit = (kind, data = {}) => process.stdout.write(JSON.stringify({kind, ...data}) + '\n');
async function deadline(promise, ms, expired) {
  let timeout;
  try { return await Promise.race([promise, new Promise((resolve, reject) => {
    timeout = setTimeout(() => { try { resolve(expired()); } catch (error) { reject(error); } }, ms);
  })]); } finally { clearTimeout(timeout); }
}

// Both the portable CLI and the optional Nexts host use this request/control
// protocol. Dependency injection is only an in-process test seam, never JSON.
async function record(request, dependencies = {}) {
  const folder = path.resolve(request.folder), monitor = request.monitor;
  if (!fs.statSync(folder).isDirectory() || !monitor || ![monitor.x, monitor.y].every(Number.isInteger)) throw Error('Invalid recording directory or monitor');
  const {width, height} = recordingSize(monitor.width, monitor.height);
  for (const name of ['screen.mp4', 'capture.json', 'native-control.json']) if (fs.existsSync(path.join(folder, name))) throw Error('Use a new recording directory; existing evidence must not be overwritten.');
  const output = dependencies.emit || emit;
  const ffmpeg = request.ffmpeg || 'ffmpeg';
  checkEncoder(ffmpeg);
  const startedAt = Date.now(), events = [], frames = [], frameTimes = [], warnings = [];
  let native, encoder, fatal, accepting = false, nativeReady = false, ready = false, stopping = false;
  let frameCount = 0, encodedFrames = 0, segment = 0, captureSince = startedAt, sequence = 0, action = 'run';
  let needsReady = true, readinessFrames = 0;
  let lastHeartbeat = startedAt, nativeHeartbeat = 0, retainedBytes = 0, spacing = 500, lastRetained = -Infinity;
  let nativeExit, encoderExit, signalStop = false;
  const fail = error => { if (!fatal) fatal = error instanceof Error ? error : Error(String(error)); };
  const nativeControl = command => atomic(folder, 'native-control.json', {action: command, sequence: sequence++, heartbeat: Date.now()});
  const onSignal = () => { signalStop = true; };
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
  const remember = (child, name) => new Promise(resolve => {
    child.once('error', error => { fail(Error(`${name}: ${error.message}`)); resolve({code: -1}); });
    child.once('close', (code, signal) => resolve({code, signal}));
  });
  const becomeReady = () => {
    if (needsReady && accepting && nativeReady && encodedFrames > readinessFrames) {
      ready = true; needsReady = false; output('ready', {engine: ENGINE, width, height});
    }
  };
  try {
    const encoderLog = fs.openSync(path.join(folder, 'encoder.log'), 'wx');
    try { encoder = spawn(ffmpeg, encoderArgs(path.join(folder, 'screen.mp4')), {windowsHide: true, stdio: ['pipe', 'pipe', encoderLog]}); }
    finally { fs.closeSync(encoderLog); }
    encoderExit = remember(encoder, 'Video encoder');
    encoder.stdin.on('error', fail);
    const progress = readline.createInterface({input: encoder.stdout});
    progress.on('line', line => {
      if (/^frame=\d+$/.test(line)) { encodedFrames = Number(line.slice(6)); becomeReady(); }
    });
    encoderExit.then(result => { if (!stopping) fail(Error(`Video encoder exited before Stop (${result.code}). Inspect encoder.log.`)); });

    nativeControl('run');
    const nativeRequest = path.join(folder, 'native-request.json');
    atomic(folder, 'native-request.json', {folder, monitor, excludedWindowTitles: request.excludedWindowTitles || []});
    native = dependencies.startNative ? dependencies.startNative(nativeRequest) : spawn(powershell(), nativeArgs('-Request', nativeRequest), {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    nativeExit = remember(native, 'Windows capture');
    let nativeError = '';
    native.stderr.on('data', chunk => { nativeError = (nativeError + chunk.toString()).slice(-16000); });
    nativeExit.then(result => { if (!stopping) fail(Error(nativeError.trim() || `Windows capture exited before Stop (${result.code}).`)); });
    const lines = readline.createInterface({input: native.stdout});
    lines.on('line', line => {
      if (fatal || stopping) return;
      try {
        const value = JSON.parse(line.replace(/^\uFEFF/, ''));
        if (value.kind === 'native-ready') { nativeReady = true; becomeReady(); }
        if (value.kind === 'resumed' && action === 'run') {
          accepting = true; captureSince = Date.now(); readinessFrames = encodedFrames; needsReady = true;
        }
        if (value.kind === 'paused') output('paused');
        if (value.kind === 'input' && accepting && value.input?.at >= captureSince) {
          const event = normalize(value.input, monitor);
          if (event) { events.push({...event, segment}); if (events.length >= 20000) fail(Error('Input limit reached; recording stopped with evidence retained.')); }
        }
        if (value.kind !== 'frame' || !accepting || value.at < captureSince) return;
        if (!Number.isSafeInteger(value.at) || value.width !== width || value.height !== height || typeof value.jpeg !== 'string' || value.jpeg.length > 48 * 1024 * 1024) throw Error('Invalid screen sample from Windows capture');
        const jpeg = Buffer.from(value.jpeg, 'base64');
        if (jpeg.length < 4 || jpeg[0] !== 255 || jpeg[1] !== 216 || jpeg[2] !== 255) throw Error('Screen capture did not return a JPEG');
        if (!encoder.stdin.write(jpeg)) { lines.pause(); encoder.stdin.once('drain', () => { if (!stopping) lines.resume(); }); }
        // One observed 5fps sample becomes two 10fps video frames. Keep real
        // wall times so pause gaps and slower capture remain seekable.
        const at = Math.max(value.at, (frameTimes.at(-1) || 0) + 1);
        frameTimes.push(at, at + 100); frameCount++;
        if (value.at - lastRetained >= spacing) {
          frames.push({at: value.at, jpeg}); retainedBytes += jpeg.length; lastRetained = value.at;
          if (frames.length > 240 || retainedBytes > 64 * 1024 * 1024) {
            const retained = frames.filter((_, i) => i % 2 === 0); frames.splice(0, frames.length, ...retained);
            retainedBytes = frames.reduce((sum, f) => sum + f.jpeg.length, 0); spacing *= 2;
          }
        }
        output('progress', {events: events.length, frames: frameTimes.length});
      } catch (error) { fail(error); }
    });
    const duration = Number.isFinite(request.maxDurationMs) ? Math.min(600000, Math.max(1000, request.maxDurationMs)) : 600000;
    let lastSequence;
    while (!fatal && !signalStop && Date.now() - startedAt < duration) {
      let control;
      try { control = readJson(path.join(folder, 'nexts-control.json')); }
      catch (error) { if (!['ENOENT', 'EBUSY', 'EACCES'].includes(error.code) && !(error instanceof SyntaxError)) throw error; }
      if (Number.isFinite(control?.heartbeat) && control.heartbeat <= Date.now() + 1000) lastHeartbeat = Math.max(lastHeartbeat, control.heartbeat);
      if (Date.now() - lastHeartbeat > 15000) { warnings.push('Recorder controller disconnected; the local recording was finalized.'); break; }
      if (control && control.sequence !== lastSequence) {
        lastSequence = control.sequence;
        if (control.action === 'stop') break;
        if (control.action === 'pause' && action !== 'pause') {
          accepting = false; action = 'pause'; segment++; nativeControl(action); output('paused');
        }
        if (control.action === 'resume' && action === 'pause') { action = 'run'; captureSince = Date.now(); nativeControl(action); }
      }
      if (Date.now() - nativeHeartbeat > 1000) { nativeControl(action); nativeHeartbeat = Date.now(); }
      if (!ready && Date.now() - startedAt > 35000) throw Error('Windows capture did not produce an encoded frame within 35 seconds.');
      await sleep(50);
    }
    stopping = true; accepting = false; output('saving'); nativeControl('stop');
    // Drain the pipe even when encoding previously applied backpressure.
    lines.resume();
    const nativeResult = await deadline(nativeExit, 5000, () => { native.kill(); return {code: -1}; });
    if (nativeResult.code !== 0 && !fatal) fail(Error(nativeError.trim() || 'Windows capture did not stop cleanly.'));
    encoder.stdin.end();
    const outcome = await deadline(encoderExit, 20000, () => { throw Error('Video finalization timed out.'); });
    if (outcome.code !== 0) throw fatal || Error('Video encoder failed; inspect encoder.log.');
    if (!frameCount || !encodedFrames) throw fatal || Error('Recording has no frames.');
    if (fatal) warnings.push(fatal.message.slice(0, 3500));
    if (!events.length) warnings.push('No input events were observed. Review the video; remote or elevated windows may restrict input capture.');
    if (encodedFrames !== frameTimes.length) throw Error(`Video/timestamp mismatch: encoded ${encodedFrames}, observed ${frameTimes.length}. Evidence remains in the recording directory.`);
    const {actions, steps} = processEvents(events, startedAt);
    const images = selectFrames(frames, steps).map((frame, index) => {
      const file = `evidence-${String(index).padStart(3, '0')}.jpg`;
      fs.writeFileSync(path.join(folder, file), frame.jpeg, {flag: 'wx'});
      const near = steps.reduce((best, step) => Math.abs(step.at - frame.at) < Math.abs((best?.at ?? Infinity) - frame.at) ? step : best, null);
      return {file, at: frame.at, step_id: near?.id || '', kind: 'frame', crop: null, size: frame.jpeg.length};
    });
    atomic(folder, 'events.json', {engine: ENGINE, version: 1, startedAt, events});
    atomic(folder, 'trajectory.json', {engine: ENGINE, version: 1, startedAt, durationMs: Date.now() - startedAt, actions, frames: images});
    atomic(folder, 'nexts-evidence.json', {engine: ENGINE, version: 1, actions, frames: images, raw_events: events.length, warnings});
    atomic(folder, 'nexts-steps.json', steps);
    atomic(folder, 'capture.json', {version: 1, fps: 10, width, height, bounds: [monitor.x, monitor.y, monitor.width, monitor.height], frame_times: frameTimes, observations: [], warnings});
    for (const step of steps) output('step', {step});
    if (fatal) throw fatal; // Preserve usable evidence, but never report a failed capture as successful.
    output('complete', {engine: ENGINE, events: events.length, steps: steps.length, frames: frameTimes.length, images: images.length});
    return {folder, events: events.length, steps: steps.length, frames: frameTimes.length, images: images.length};
  } finally {
    stopping = true; accepting = false;
    process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal);
    for (const child of [native, encoder]) if (child && child.exitCode === null && !child.killed) child.kill();
    await Promise.allSettled([nativeExit, encoderExit]);
  }
}

function reportError(error, folder) {
  const message = error?.message || String(error);
  // The host consumes stdout events and writes stderr to nexts-capture.log.
  // Mirror the error to both channels so an empty log cannot hide this failure.
  emit('error', {message}); process.stderr.write(`${message}\n`);
  if (folder) try { atomic(folder, 'recording-error.json', {at: new Date().toISOString(), message}); } catch { /* Keep the original error. */ }
}
if (require.main === module) {
  let request;
  Promise.resolve().then(() => {
    const index = process.argv.indexOf('--request');
    if (index < 0 || !process.argv[index + 1]) throw Error('A --request file is required. Use record.ps1 for standalone recording.');
    request = readJson(process.argv[index + 1]); return record(request);
  }).catch(error => { reportError(error, request?.folder); process.exitCode = 1; });
}
module.exports = {record, reportError};
