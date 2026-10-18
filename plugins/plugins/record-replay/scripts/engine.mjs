import { spawn, execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
export function validId(value) {
  if (typeof value !== 'string' || !idPattern.test(value)) throw new Error('Invalid ID: use 1–80 letters, digits, hyphens or underscores.');
  return value;
}
export function webUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('An HTTP(S) URL without embedded credentials is required.');
  return url.href;
}
const schema = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const str = { type: 'string', minLength: 1, maxLength: 8192 };
const id = { ...str, pattern: idPattern.source, maxLength: 80 };
const fields = { type: 'array', maxItems: 50, items: { ...str, maxLength: 100 } };
export const toolDefinitions = [
  ['flow_status', 'Check installed local Python/Flow runtime. Does not install anything.', schema()],
  ['flow_list', 'List local recordings and compiled workflow IDs.', schema()],
  ['flow_record', 'Start a real headed browser recording. The USER demonstrates the task. Poll the job; call flow_stop_recording to flush and finish.', schema({ recording_id: id, url: str, param_fields: fields, secret_fields: fields }, ['recording_id', 'url'])],
  ['flow_stop_recording', 'Finish a recording gracefully; poll until completed before compiling.', schema({ job_id: id }, ['job_id'])],
  ['flow_compile', 'Compile a completed recording with the official Flow compiler into a new workflow ID.', schema({ recording_id: id, workflow_id: id }, ['recording_id', 'workflow_id'])],
  ['flow_replay', 'Rehearse a compiled workflow in a real browser. Can modify the target app. Requires user-authorized scope. request_id is durable deduplication, never automatically retry an uncertain run. Exit zero is NOT verified success.', schema({ workflow_id: id, url: str, request_id: id, params: { type: 'object', maxProperties: 50, additionalProperties: { type: 'string', maxLength: 16384 } } }, ['workflow_id', 'url', 'request_id'])],
  ['flow_job', 'Poll executor status and evidence-qualified outcome. Logs and report paths stay local; no raw screenshots or report bodies returned.', schema({ job_id: id }, ['job_id'])],
  ['flow_cancel', 'Stop an executor process tree. Cancellation is not rollback; partial external effects may need reconciliation.', schema({ job_id: id }, ['job_id'])],
  ['flow_export', 'Use official emit-skill or emit-mcp to export a self-contained workflow locally. Does not publish, install or enable the exported artifact.', schema({ workflow_id: id, format: { type: 'string', enum: ['skill', 'mcp'] } }, ['workflow_id', 'format'])],
].map(([name, description, inputSchema]) => ({ name, description, inputSchema, annotations: { readOnlyHint: ['flow_status', 'flow_list', 'flow_job'].includes(name), destructiveHint: name === 'flow_replay', openWorldHint: ['flow_record', 'flow_replay'].includes(name) } }));

// Strict validation also applies when the engine is called outside MCP.
function validate(value, spec) {
  if (spec.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
    for (const key of spec.required ?? []) if (!(key in value)) throw new Error(`Missing ${key}`);
    if (Object.keys(value).length > (spec.maxProperties ?? 100)) throw new Error('Too many properties');
    for (const [key, item] of Object.entries(value)) {
      const child = spec.properties?.[key] ?? spec.additionalProperties;
      if (!child) throw new Error(`Unexpected argument: ${key}`);
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid property');
      validate(item, child);
    }
  } else if (spec.type === 'array') {
    if (!Array.isArray(value) || value.length > spec.maxItems) throw new Error('Invalid field list');
    value.forEach(item => validate(item, spec.items));
  } else if (spec.type === 'string') {
    if (typeof value !== 'string' || value.includes('\0') || value.length < (spec.minLength ?? 0) || value.length > spec.maxLength || (spec.pattern && !new RegExp(spec.pattern).test(value)) || (spec.enum && !spec.enum.includes(value))) throw new Error('Invalid string argument');
  }
}

export class FlowEngine {
  constructor({ root = process.env.NEXTS_RECORD_REPLAY_DATA || join(process.env.LOCALAPPDATA || join(homedir(), '.local', 'share'), 'Nexts', 'record-replay'), python = process.env.NEXTS_RECORD_REPLAY_PYTHON || 'python', spawnImpl = spawn } = {}) {
    this.root = resolve(root);
    this.python = python;
    this.spawn = spawnImpl;
    this.active = null;
  }
  async init() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    for (const kind of ['recordings', 'workflows', 'jobs', 'requests', 'exports']) {
      const path = join(this.root, kind);
      await fs.mkdir(path, { recursive: true, mode: 0o700 });
      if ((await fs.lstat(path)).isSymbolicLink()) throw new Error('Data directories must not be symlinks');
    }
  }
  async path(kind, value, mustExist = false) {
    const path = join(this.root, kind, validId(value));
    try {
      if ((await fs.lstat(path)).isSymbolicLink()) throw new Error('Symlink artifacts are not supported');
    } catch (error) { if (error.code !== 'ENOENT' || mustExist) throw error; }
    return path;
  }
  async readJob(jobId) {
    const path = await this.path('jobs', jobId, true);
    const job = JSON.parse(await fs.readFile(join(path, 'job.json'), 'utf8'));
    if (['running', 'stopping'].includes(job.state) && this.active?.job.job_id !== jobId) {
      job.state = 'interrupted';
      job.outcome = 'RECONCILIATION_REQUIRED';
    }
    return job;
  }
  async save(job) {
    const directory = join(this.root, 'jobs', job.job_id);
    await fs.writeFile(join(directory, 'job.tmp'), JSON.stringify(job, null, 2), { mode: 0o600 });
    await fs.rename(join(directory, 'job.tmp'), join(directory, 'job.json'));
  }
  async start(operation, payload, details = {}, jobId = randomUUID()) {
    if (this.active) throw new Error('A Flow operation is already active. Finish or cancel it first.');
    const directory = await this.path('jobs', jobId);
    await fs.mkdir(directory, { mode: 0o700 });
    const job = { job_id: jobId, operation, state: 'running', started_at: new Date().toISOString(), ...details, log_path: join(directory, 'engine.log') };
    const slot = { job, child: null, finished: null };
    this.active = slot;
    try {
      await this.save(job);
      const child = this.spawn(this.python, ['-u', join(here, 'flow_bridge.py')], { cwd: this.root, windowsHide: true, detached: process.platform !== 'win32', shell: false, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONUTF8: '1', OPENADAPT_FLOW_NO_AUTO_INSTALL: '1' } });
      slot.child = child;
      let log = '';
      const append = chunk => { log = (log + chunk.toString()).slice(-131072); };
      child.stdout.on('data', append);
      child.stderr.on('data', append);
      child.stdin.on('error', () => {});
      let spawnError;
      child.on('error', error => { spawnError = error.message; });
      slot.finished = new Promise(resolveDone => child.once('close', async code => {
        clearTimeout(slot.timer);
        try {
          job.exit_code = code;
          job.state = job.state === 'cancelling' ? 'cancelled' : code === 0 ? 'completed' : 'failed';
          job.finished_at = new Date().toISOString();
          if (spawnError) job.error = spawnError;
          if (code !== 0) job.hint = 'See the local engine.log. Check Python 3.10–3.12, openadapt-flow[browser]==2.0.0 and Chromium; do not automatically retry external writes.';
          if (operation === 'replay') {
            job.outcome = 'RECONCILIATION_REQUIRED';
            try {
              const report = JSON.parse(await fs.readFile(job.report_path, 'utf8'));
              const outcomes = ['VERIFIED', 'COMPLETED_UNVERIFIED', 'RECONCILIATION_REQUIRED', 'HALTED_BEFORE_EFFECT', 'REJECTED_POLICY', 'CANCELED', 'FAILED_PLATFORM'];
              if (outcomes.includes(report.transaction_outcome)) job.outcome = report.transaction_outcome;
              job.verified = job.state === 'completed' && report.outcome === 'VERIFIED' && report.transaction_outcome === 'VERIFIED';
            } catch { job.verified = false; }
          }
          if (job.state === 'cancelled') { job.outcome = 'RECONCILIATION_REQUIRED'; job.verified = false; }
          if (job.state === 'completed' && ['record', 'compile'].includes(operation)) {
            const required = operation === 'record' ? ['meta.json', 'events.jsonl'] : ['workflow.json'];
            for (const file of required) await fs.access(join(job.artifact_path, file));
            await fs.writeFile(join(job.artifact_path, '.nexts-ready.json'), JSON.stringify({ job_id: jobId }), { mode: 0o600 });
          }
          await fs.writeFile(job.log_path, log, { mode: 0o600 });
          await this.save(job);
        } catch (error) {
          job.state = 'failed';
          job.error = `Cannot finalize artifact: ${error.message}`;
          await fs.writeFile(job.log_path, log, { mode: 0o600 }).catch(() => {});
          await this.save(job).catch(() => {});
        }
        finally { this.active = null; resolveDone({ ...job }); }
      }));
      child.stdin.write(JSON.stringify({ operation, ...payload }) + '\n');
      if (operation !== 'record') child.stdin.end();
      slot.timer = setTimeout(() => { void this.cancel(jobId).catch(error => console.error(error.message)); }, operation === 'status' ? 15000 : 30 * 60 * 1000);
      slot.timer.unref();
      return { ...job };
    } catch (error) { this.active = null; throw error; }
  }
  async cancel(jobId) {
    if (this.active?.job.job_id !== jobId) return this.readJob(jobId);
    const { child, job } = this.active;
    job.state = 'cancelling';
    if (process.platform === 'win32' && child.pid) {
      await new Promise((done, reject) => execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, error => error && this.active?.job === job ? reject(error) : done()));
    } else if (child.pid) process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
    return { ...job, outcome: 'RECONCILIATION_REQUIRED' };
  }
  async call(name, args = {}) {
    const tool = toolDefinitions.find(tool => tool.name === name);
    if (!tool) throw new Error('Unknown tool');
    validate(args, tool.inputSchema);
    await this.init();
    if (name === 'flow_job') return this.readJob(args.job_id);
    if (name === 'flow_cancel') return this.cancel(args.job_id);
    if (name === 'flow_list') {
      const list = async kind => (await fs.readdir(join(this.root, kind), { withFileTypes: true })).filter(e => e.isDirectory() && idPattern.test(e.name)).map(e => e.name);
      const details = async (kind, value) => {
        const directory = await this.path(kind, value, true);
        try {
          await fs.access(join(directory, '.nexts-ready.json'));
          const artifact = JSON.parse(await fs.readFile(join(directory, kind === 'workflows' ? 'workflow.json' : 'meta.json'), 'utf8'));
          return { id: value, ready: true, parameters: Object.keys(artifact.params ?? {}), secret_parameters: artifact.secret_params ?? [] };
        } catch { return { id: value, ready: false }; }
      };
      const recordings = await list('recordings');
      const workflows = await list('workflows');
      return { recordings, workflows, recording_details: await Promise.all(recordings.map(value => details('recordings', value))), workflow_details: await Promise.all(workflows.map(value => details('workflows', value))), data_root: this.root };
    }
    if (name === 'flow_stop_recording') {
      const slot = this.active;
      if (!slot || slot.job.job_id !== args.job_id || slot.job.operation !== 'record') throw new Error('No matching active recording');
      slot.job.state = 'stopping';
      slot.child.stdin.end('stop\n');
      return { ...slot.job };
    }
    if (name === 'flow_status') {
      await this.start('status', {});
      const job = await this.active.finished;
      return { ...job, available: job.state === 'completed', expected_flow_version: '2.0.0', python: this.python, data_root: this.root };
    }
    // All process launch paths below share one slot; the MCP server serializes calls.
    if (this.active && name !== 'flow_replay') throw new Error('A Flow operation is already active. Finish or cancel it first.');
    if (name === 'flow_record') {
      const url = webUrl(args.url);
      const out = await this.path('recordings', args.recording_id);
      try { await fs.lstat(out); throw new Error('Recording ID already exists'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      // Flow refuses even an empty existing recording directory.
      const reservation = await fs.open(`${out}.reserved`, 'wx', 0o600);
      await reservation.close();
      return this.start('record', { url, out, param_fields: args.param_fields ?? [], secret_fields: args.secret_fields ?? [] }, { recording_id: args.recording_id, artifact_path: out });
    }
    if (name === 'flow_compile') {
      const input = await this.path('recordings', args.recording_id, true);
      await fs.access(join(input, '.nexts-ready.json'));
      await fs.access(join(input, 'meta.json'));
      await fs.access(join(input, 'events.jsonl'));
      const out = await this.path('workflows', args.workflow_id);
      await fs.mkdir(out, { mode: 0o700 });
      return this.start('compile', { argv: ['compile', input, '--out', out, '--name', args.workflow_id] }, { workflow_id: args.workflow_id, artifact_path: out });
    }
    const bundle = await this.path('workflows', args.workflow_id, true);
    await fs.access(join(bundle, '.nexts-ready.json'));
    await fs.access(join(bundle, 'workflow.json'));
    if (name === 'flow_replay') {
      const url = webUrl(args.url);
      const params = args.params ?? {};
      const fingerprint = createHash('sha256').update(JSON.stringify([args.workflow_id, url, Object.entries(params).sort()])).digest('hex');
      const requestPath = await this.path('requests', args.request_id);
      try {
        const previous = JSON.parse(await fs.readFile(requestPath, 'utf8'));
        if (previous.fingerprint !== fingerprint) throw new Error('request_id already used with different inputs');
        return this.readJob(previous.job_id);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (this.active) throw new Error('A Flow operation is already active. Finish or cancel it first.');
      let handle;
      try { handle = await fs.open(requestPath, 'wx', 0o600); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const previous = JSON.parse(await fs.readFile(requestPath, 'utf8'));
        if (previous.fingerprint !== fingerprint) throw new Error('request_id already used with different inputs');
        return this.readJob(previous.job_id);
      }
      const jobId = randomUUID();
      await handle.writeFile(JSON.stringify({ fingerprint, job_id: jobId }));
      await handle.close();
      // Reserve the request before launching. A crash never authorizes replay.
      const runPath = join(this.root, 'jobs', jobId, 'run');
      const paramsPath = join(this.root, 'requests', `${args.request_id}.params.json`);
      await fs.writeFile(paramsPath, JSON.stringify(params), { flag: 'wx', mode: 0o600 });
      return this.start('replay', { argv: ['replay', bundle, '--backend', 'web', '--url', url, '--headed', '--params-file', paramsPath, '--run-dir', runPath] }, { workflow_id: args.workflow_id, request_id: args.request_id, report_path: join(runPath, 'report.json'), verified: false }, jobId);
    }
    const out = await this.path('exports', randomUUID());
    await fs.mkdir(out, { mode: 0o700 });
    return this.start('export', { argv: [`emit-${args.format}`, bundle, '--out', args.format === 'mcp' ? join(out, 'server.py') : out] }, { format: args.format, artifact_path: out });
  }
}
