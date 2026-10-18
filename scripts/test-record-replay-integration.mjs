// Opt in with NEXTS_RECORD_REPLAY_TEST_PYTHON pointing to a prepared Python 3.12 env.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline';
import { FlowEngine } from '../plugins/plugins/record-replay/scripts/engine.mjs';

test('real Flow browser fixture -> plugin compile -> parameterized replay -> official Skill/MCP exports', { skip: !process.env.NEXTS_RECORD_REPLAY_TEST_PYTHON, timeout: 300000 }, async t => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(resolve('.tmp/record-replay-e2e-'));
  const python = process.env.NEXTS_RECORD_REPLAY_TEST_PYTHON;
  const engine = new FlowEngine({ root, python });
  await engine.init();
  const fixture = spawn(python, ['-u', resolve('scripts/fixtures/record-replay-demo.py'), join(root, 'recordings', 'demo')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  fixture.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (engine.active) await engine.cancel(engine.active.job.job_id);
    fixture.stdin.end('\n');
  });
  const url = await new Promise((yes, no) => {
    const lines = createInterface({ input: fixture.stdout });
    lines.on('line', line => { try { yes(JSON.parse(line).url); } catch {} });
    fixture.on('error', no);
    fixture.on('exit', code => no(new Error(`Fixture exited ${code}: ${stderr}`)));
  });
  assert.match(url, /^http:\/\//);
  await writeFile(join(root, 'recordings', 'demo', '.nexts-ready.json'), JSON.stringify({ fixture: true }));
  const run = async (tool, args) => {
    const started = await engine.call(tool, args);
    const result = engine.active ? await engine.active.finished : started;
    assert.equal(result.state, 'completed', JSON.stringify(result) + '\n' + await readFile(result.log_path, 'utf8'));
    return result;
  };
  // Exercise the plugin's real recorder start/stop path too; no user data.
  const recording = await engine.call('flow_record', { recording_id: 'empty-stop-check', url });
  const recordingDone = engine.active.finished;
  await new Promise(done => setTimeout(done, 3000));
  if (!engine.active) assert.fail(await readFile(recording.log_path, 'utf8'));
  await engine.call('flow_stop_recording', { job_id: recording.job_id });
  const recorded = await recordingDone;
  assert.equal(recorded.state, 'completed', await readFile(recorded.log_path, 'utf8'));
  await run('flow_compile', { recording_id: 'demo', workflow_id: 'demo' });
  const replay = await run('flow_replay', { workflow_id: 'demo', url, request_id: 'fixture-replay', params: { note: 'Synthetic parameter override' } });
  assert.equal(replay.verified, false);
  assert.equal(replay.outcome, 'COMPLETED_UNVERIFIED');
  const report = JSON.parse(await readFile(replay.report_path, 'utf8'));
  assert.equal(report.transaction_outcome, 'COMPLETED_UNVERIFIED');
  for (const format of ['skill', 'mcp']) await run('flow_export', { workflow_id: 'demo', format });
  t.diagnostic(`Real browser evidence retained locally: ${root}`);
});
