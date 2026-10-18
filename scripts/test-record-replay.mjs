import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { FlowEngine } from '../plugins/plugins/record-replay/scripts/engine.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'nexts-flow-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const calls = [];
  const spawnImpl = (command, args, options) => {
    const child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { child.emit('close', null); return true; };
    let data = '';
    child.stdin.on('data', chunk => { data += chunk.toString(); });
    calls.push({ child, command, args, options, request: () => JSON.parse(data.split('\n')[0]) });
    return child;
  };
  const engine = new FlowEngine({ root, python: 'python-test', spawnImpl });
  await engine.init();
  await mkdir(join(root, 'workflows', 'demo'));
  await writeFile(join(root, 'workflows', 'demo', 'workflow.json'), '{}');
  await writeFile(join(root, 'workflows', 'demo', '.nexts-ready.json'), '{}');
  return { engine, calls, root };
}

test('rejects traversal, unsupported URLs and unexpected CLI arguments before spawn', async t => {
  const { engine, calls } = await fixture(t);
  for (const args of [{ recording_id: '../escape', url: 'https://example.com' }, { recording_id: 'safe', url: 'file:///etc/passwd' }, { recording_id: 'safe', url: 'https://a:b@example.com' }, { recording_id: 'safe', url: 'https://example.com', extra: '--until-cmd malicious' }]) {
    await assert.rejects(engine.call('flow_record', args));
  }
  assert.equal(calls.length, 0);
});

test('record stop flushes stdin; prevents concurrent operations; passes private inputs over stdin', async t => {
  const { engine, calls } = await fixture(t);
  const job = await engine.call('flow_record', { recording_id: 'demo', url: 'https://example.com', param_fields: ['note'], secret_fields: ['token'] });
  assert.equal(calls[0].options.shell, false);
  await assert.rejects(stat(calls[0].request().out), { code: 'ENOENT' });
  assert.equal(calls[0].request().url, 'https://example.com/');
  assert(!calls[0].args.includes('https://example.com/'));
  await assert.rejects(engine.call('flow_record', { recording_id: 'other', url: 'https://example.com' }), /active/);
  const finished = engine.active.finished;
  assert.equal((await engine.call('flow_stop_recording', { job_id: job.job_id })).state, 'stopping');
  await mkdir(job.artifact_path);
  await writeFile(join(job.artifact_path, 'meta.json'), '{}');
  await writeFile(join(job.artifact_path, 'events.jsonl'), '');
  calls[0].child.emit('close', 0);
  assert.equal((await finished).state, 'completed');
});

test('partial workflows and recordings cannot be compiled or replayed', async t => {
  const { engine, root, calls } = await fixture(t);
  await rm(join(root, 'workflows', 'demo', '.nexts-ready.json'));
  await assert.rejects(engine.call('flow_replay', { workflow_id: 'demo', url: 'https://example.com', request_id: 'partial' }), /ENOENT/);
  await mkdir(join(root, 'recordings', 'partial'));
  await writeFile(join(root, 'recordings', 'partial', 'meta.json'), '{}');
  await writeFile(join(root, 'recordings', 'partial', 'events.jsonl'), '');
  await assert.rejects(engine.call('flow_compile', { recording_id: 'partial', workflow_id: 'partial' }), /ENOENT/);
  assert.equal(calls.length, 0);
});

test('a lost process is reported interrupted and replay is never restarted', async t => {
  const { engine, root, calls } = await fixture(t);
  const args = { workflow_id: 'demo', url: 'https://example.com', request_id: 'interrupted' };
  const job = await engine.call('flow_replay', args);
  const recovered = new FlowEngine({ root, spawnImpl: () => assert.fail('must not restart') });
  assert.equal((await recovered.call('flow_replay', args)).state, 'interrupted');
  const finished = engine.active.finished;
  calls[0].child.emit('close', 1);
  await finished;
  assert.equal((await engine.readJob(job.job_id)).outcome, 'RECONCILIATION_REQUIRED');
});

test('replay deduplicates active and finished requests, rejects changed inputs, never verifies exit zero alone', async t => {
  const { engine, calls, root } = await fixture(t);
  const args = { workflow_id: 'demo', url: 'https://example.com', request_id: 'request-1', params: { note: 'a secret value' } };
  const job = await engine.call('flow_replay', args);
  assert.equal((await engine.call('flow_replay', args)).job_id, job.job_id);
  await assert.rejects(engine.call('flow_replay', { ...args, params: { note: 'different' } }), /different/);
  assert(!calls[0].request().argv.includes('a secret value'));
  await mkdir(join(root, 'jobs', job.job_id, 'run'));
  await writeFile(job.report_path, JSON.stringify({ outcome: 'COMPLETED', transaction_outcome: 'COMPLETED_UNVERIFIED' }));
  const finished = engine.active.finished;
  calls[0].child.emit('close', 0);
  assert.equal((await finished).verified, false);
  const result = await engine.call('flow_replay', args);
  assert.equal(result.outcome, 'COMPLETED_UNVERIFIED');
  assert.equal(calls.length, 1);
  const recovered = new FlowEngine({ root, spawnImpl: () => assert.fail('must not replay') });
  assert.equal((await recovered.call('flow_replay', args)).job_id, job.job_id);
});

test('missing report and cancellation require reconciliation', async t => {
  const { engine, calls } = await fixture(t);
  const job = await engine.call('flow_replay', { workflow_id: 'demo', url: 'https://example.com', request_id: 'cancelled' });
  const finished = engine.active.finished;
  await engine.call('flow_cancel', { job_id: job.job_id });
  assert.equal((await finished).outcome, 'RECONCILIATION_REQUIRED');
  assert.equal((await engine.readJob(job.job_id)).verified, false);
  assert.equal(calls.length, 1);
});

test('exports invoke official emitters in separate output directories', async t => {
  const { engine, calls } = await fixture(t);
  for (const format of ['skill', 'mcp']) {
    const result = await engine.call('flow_export', { workflow_id: 'demo', format });
    assert.equal(calls.at(-1).request().argv[0], `emit-${format}`);
    assert(result.artifact_path.includes('exports'));
    const finished = engine.active.finished;
    calls.at(-1).child.emit('close', 0);
    await finished;
  }
});

test('real MCP SDK connects, discovers tools, rejects malformed calls and diagnoses missing Python', async t => {
  const root = await mkdtemp(join(tmpdir(), 'nexts-flow-mcp-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('plugins/plugins/record-replay/scripts/server.mjs')], env: { ...process.env, NEXTS_RECORD_REPLAY_DATA: root, NEXTS_RECORD_REPLAY_PYTHON: join(root, 'missing-python') }, stderr: 'pipe' });
  const client = new Client({ name: 'record-replay-test', version: '1' });
  t.after(() => client.close());
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 9);
  const invalid = await client.callTool({ name: 'flow_record', arguments: { recording_id: '../escape', url: 'https://example.com' } });
  assert.equal(invalid.isError, true);
  const status = JSON.parse((await client.callTool({ name: 'flow_status', arguments: {} })).content[0].text);
  assert.equal(status.available, false);
  assert.match(await readFile(status.log_path.replace('engine.log', 'job.json'), 'utf8'), /ENOENT/);
});
