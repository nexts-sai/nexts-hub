import { readFile, writeFile, mkdir, rename, stat, open } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { NextsProvider, backendConfig, validateRequest } from './nexts.mjs';

const exec = promisify(execFile);
const TICKS = 254016000000;
const cli = () => process.env.FILMCRAFT_CLI || (process.platform === 'win32' ? 'C:/Program Files/FilmCraft/filmcraft-cli.exe' : 'filmcraft-cli');
const json = async p => JSON.parse(await readFile(p, 'utf8'));
function defaultOutputDir(planPath) {
  // The agent's production.json lives in the current Nexts workspace. Keep
  // editable output beside it so the Files panel's temporary workspace can
  // display and manage the complete production as one folder.
  return join(dirname(resolve(planPath)), 'output');
}
async function save(p, value) {
  const tmp = `${p}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
  await rename(tmp, p);
}
export async function fc(args) {
  const { stdout } = await exec(cli(), args, { windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 900000 });
  return stdout.trim() ? JSON.parse(stdout) : null;
}
function jobPath(root, id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)) throw new Error('Invalid job ID');
  return join(resolve(root), 'jobs', `${id}.json`);
}
async function withLock(path, run) {
  const lock = await open(`${path}.lock`, 'wx').catch(() => { throw new Error('Job is locked; inspect the existing process before recovery'); });
  try { return await run(); } finally { await lock.close(); const { unlink } = await import('node:fs/promises'); await unlink(`${path}.lock`); }
}
async function finishAsset(root, id, job, provider, path) {
  if (job.status === 'complete') return job;
  if (job.receipt?.status !== 'ready') return job;
  const ext = { image: 'png', video: 'mp4', speech: 'mp3' }[job.kind];
  const target = join(resolve(root), 'assets', `${id}.${ext}`);
  await mkdir(dirname(target), { recursive: true });
  const bytes = await provider.download(job.receipt.asset);
  if (!bytes.length) throw new Error('Empty asset');
  await writeFile(`${target}.tmp`, bytes);
  await rename(`${target}.tmp`, target);
  job.status = 'complete'; job.path = target;
  job.sha256 = createHash('sha256').update(bytes).digest('hex');
  delete job.receipt.asset; // avoid duplicating potentially large base64 media
  await save(path, job);
  return job;
}
export async function generate(root, id, request, provider) {
  validateRequest(request);
  const path = jobPath(root, id);
  await mkdir(dirname(path), { recursive: true });
  const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
  return withLock(path, async () => {
    let old;
    try { old = await json(path); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (old) {
      if (old.fingerprint !== fingerprint) throw new Error('Job ID already belongs to a different request');
      return finishAsset(root, id, old, provider, path);
    }
    const job = { version: 1, kind: request.kind, fingerprint, status: 'submitting', createdAt: new Date().toISOString() };
    await save(path, job); // persistent barrier before a potentially billable POST
    try {
      job.receipt = await provider.submit(request);
      job.status = job.receipt.status;
    } catch {
      job.status = 'unknown';
      await save(path, job);
      throw new Error(`Submission outcome unknown; inspect job ${id}. No automatic resubmission.`);
    }
    await save(path, job);
    return finishAsset(root, id, job, provider, path);
  });
}
export async function poll(root, id, provider) {
  const path = jobPath(root, id);
  return withLock(path, async () => {
    const job = await json(path);
    if (job.status === 'complete' || job.status === 'failed') return job;
    if (job.receipt?.status === 'ready') return finishAsset(root, id, job, provider, path);
    if (!job.receipt?.taskId) throw new Error('No task ID: reconcile this submission with the backend; do not submit again');
    job.receipt = await provider.poll(job.receipt.taskId);
    job.status = job.receipt.status;
    await save(path, job);
    return finishAsset(root, id, job, provider, path);
  });
}
export function validatePlan(p) {
  if (p.schemaVersion !== 1 || !p.name || !Number.isInteger(p.fps) || p.fps < 1 || p.fps > 60) throw new Error('Invalid production version, name or integer fps');
  for (const n of [p.width, p.height]) if (!Number.isInteger(n) || n < 64 || n > 7680 || n % 2) throw new Error('Dimensions must be even integers, 64–7680');
  if (!Array.isArray(p.shots) || !p.shots.length) throw new Error('At least one shot required');
  const ids = new Set(); let total = 0;
  for (const s of p.shots) {
    if (!s.id || ids.has(s.id) || !Number.isInteger(s.frames) || s.frames <= 0 || !(s.video || s.image)) throw new Error('Each shot requires a unique ID, positive frames and local visual asset');
    ids.add(s.id); total += s.frames;
  }
  if (!Array.isArray(p.captions)) throw new Error('Captions array required');
  let end = 0;
  for (const c of p.captions) {
    if (!Number.isInteger(c.startFrame) || !Number.isInteger(c.endFrame) || c.startFrame < end || c.endFrame <= c.startFrame || c.endFrame > total || typeof c.text !== 'string' || !c.text.trim()) throw new Error('Captions must be ordered, nonoverlapping, nonempty and within the sequence');
    end = c.endFrame;
  }
  if (p.captions.length && p.captionsReviewed !== true) throw new Error('Caption timings need review before export');
  if (p.captionFont !== undefined && (typeof p.captionFont !== 'string' || !p.captionFont.trim())) throw new Error('captionFont must be a nonempty font family');
  return total;
}
export function srt(p) {
  const time = f => {
    const ms = Math.round(f * 1000 / p.fps);
    return `${String(Math.floor(ms / 3600000)).padStart(2,'0')}:${String(Math.floor(ms / 60000) % 60).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')},${String(ms % 1000).padStart(3,'0')}`;
  };
  return p.captions.map((c, i) => `${i + 1}\n${time(c.startFrame)} --> ${time(c.endFrame)}\n${c.text.replace(/\r/g,'').trim()}\n`).join('\n');
}
export async function loadPlan(path) {
  const p = await json(path); validatePlan(p);
  for (const s of p.shots) for (const key of ['image','video','voice']) if (s[key]) {
    s[key] = resolve(dirname(resolve(path)), s[key]);
    if (!(await stat(s[key])).isFile()) throw new Error(`Missing ${key} for ${s.id}`);
  }
  return p;
}
export async function assemble(planPath, outputDir) {
  const p = await loadPlan(planPath), total = validatePlan(p), out = resolve(outputDir || defaultOutputDir(planPath));
  // Probe first: refuse short video or truncated narration before creating a project.
  for (const s of p.shots) {
    for (const kind of ['video','voice']) if (s[kind]) {
      const info = await fc(['probe',s[kind]]);
      const seconds = info.durationSeconds ?? (typeof info.duration === 'number' ? info.duration / TICKS : undefined);
      if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Cannot determine ${kind} duration for ${s.id}`);
      if (kind === 'video' && seconds + 1 / p.fps < s.frames / p.fps) throw new Error(`Video too short: ${s.id}`);
      if (kind === 'voice' && seconds > s.frames / p.fps + 1 / p.fps) throw new Error(`Narration exceeds shot: ${s.id}`);
    }
  }
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out); // exclusive output directory, no overwrite of existing work
  const project = join(out,'project.fcproj');
  await fc(['--save-as',project,'exec','file.newSequence',JSON.stringify({name:p.name,width:p.width,height:p.height,fps:p.fps,video:1,audio:1})]);
  const run = (id,params) => fc(['--project',project,'--save','exec',id,JSON.stringify(params)]);
  let frame = 0;
  for (const shot of p.shots) {
    const imported = await run('file.import',{paths:[shot.video || shot.image]});
    await run('timeline.place',{item:imported.items[0],track:'V1',frame,insert:false,duration:Math.round(shot.frames * TICKS / p.fps),video:true,audio:false});
    if (shot.voice) {
      const voice = await run('file.import',{paths:[shot.voice]});
      await run('timeline.place',{item:voice.items[0],track:'A1',frame,insert:false,video:false,audio:true});
    }
    frame += shot.frames;
  }
  // Imported stills may be larger than the sequence; FilmCraft places them at
  // 100% pixel scale by default, which silently crops the intended composition.
  const placed = await fc(['--project',project,'inspect','sequence']);
  const visualClips = placed.video.flatMap(track => track.items.map(item => item.clip));
  await run('clip.fitToFrame',{clips:visualClips});
  const captionsPath = join(out,'captions.srt');
  await writeFile(captionsPath,srt(p),'utf8');
  if(p.captions.length) {
    await run('captions.import',{path:captionsPath,name:'Narration'});
    // FilmCraft's default fallback lacks some Chinese glyphs on Windows.
    const font = p.captionFont || (process.platform === 'win32' && p.captions.some(c => /\p{Script=Han}/u.test(c.text)) ? 'Microsoft YaHei' : undefined);
    if (font) await run('captions.setStyle',{track:'C1',font});
  }
  const sequence = await fc(['--project',project,'inspect','sequence']);
  await save(join(out,'sequence.json'),sequence);
  if (Math.abs(sequence.durationFrames - total) > 1) throw new Error('FilmCraft sequence duration mismatch');
  const final = join(out,'final.mp4');
  const result = await fc(['--project',project,'export',final,'--format','h264','--settings',JSON.stringify({burnCaptions:true})]);
  if (!(await stat(final)).size) throw new Error('Export produced empty video');
  const probe = await fc(['probe',final]);
  if (probe.video?.width !== p.width || probe.video?.height !== p.height || Math.abs(probe.duration / TICKS - total / p.fps) > 2 / p.fps) throw new Error('Export dimensions/duration mismatch');
  if (p.shots.some(s => s.voice) && !probe.audio_streams?.length) throw new Error('Export lost narration audio');
  await save(join(out,'export.json'),result);
  await save(join(out,'probe.json'),probe);
  const previews = [];
  for (const f of [...new Set([0,Math.floor(total/2),total-1,...p.captions.map(c => Math.floor((c.startFrame+c.endFrame-1)/2))])]) {
    const preview = join(out,`frame-${f}.png`);
    await fc(['--project',project,'render','--seconds',String(f / p.fps),'--out',preview]);
    previews.push(preview);
  }
  const report = {status:'needs-review',project,video:final,captions:captionsPath,previews,expectedFrames:total,captionTimingReviewed:p.captionsReviewed,checks:['FilmCraft export succeeded without offline allowance','Sequence duration matched'],remaining:['Inspect preview frames and transitions','Listen to exported narration and verify caption sync']};
  await save(join(out,'qa.json'),report);
  return report;
}
async function main([command,...args]) {
  if(command === 'doctor') {
    const {stdout} = await exec(cli(),['--version'],{windowsHide:true});
    return {filmcraft:stdout.trim(),backendConfigured:!!process.env.NEXTS_ACCOUNT_API_BASE_URL,sessionSupplied:!!process.env.NEXTS_ACCESS_TOKEN};
  }
  if(command === 'validate') { const p = await loadPlan(args[0]); return {valid:true,frames:validatePlan(p)}; }
  if(command === 'assemble') return assemble(args[0],args[1]);
  if(command === 'generate') return generate(args[0],args[1],await json(args[2]),new NextsProvider(backendConfig()));
  if(command === 'poll') return poll(args[0],args[1],new NextsProvider(backendConfig()));
  throw new Error('Commands: doctor | validate PLAN | assemble PLAN [NEW_OUTPUT] | generate DIR JOB REQUEST | poll DIR JOB');
}
if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{ console.error(e.message); process.exitCode=1; });
}
