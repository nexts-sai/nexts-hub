import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const helper = fileURLToPath(new URL('../plugins/plugins/filmcraft/skills/filmcraft-multicam/scripts/transcript-offset.mjs', import.meta.url));
function run(rows) {
  const dir = mkdtempSync(join(tmpdir(), 'filmcraft-sync-'));
  try {
    const input = join(dir, 'utterances.json');
    writeFileSync(input, JSON.stringify(rows));
    const result = spawnSync(process.execPath, [helper, input, '--reference', 'recorder', '--fps', '25'], { encoding: 'utf8' });
    return { status: result.status, error: result.stderr, data: result.status === 0 ? JSON.parse(result.stdout) : null };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
function fixture(offset = 2500, drift = 0, count = 24) {
  let seed = 17;
  const rows = [];
  for (let i = 0; i < count; i++) {
    let text = '';
    for (let j = 0; j < 40; j++) {
      seed = (seed * 16807) % 2147483647;
      text += String.fromCharCode(97 + seed % 26);
    }
    const start = 10000 + i * 10000;
    rows.push({ file: 'recorder', start, text });
    rows.push({ file: 'camera', start: start - offset - i * drift, text });
  }
  return rows;
}
test('offset signs and common placement origin preserve synchronization', () => {
  for (const offset of [2500, -3700]) {
    const result = run(fixture(offset));
    assert.equal(result.status, 0, result.error);
    assert.equal(result.data.offsets.camera.confident, true);
    assert.equal(result.data.offsets.camera.offsetSeconds, offset / 1000);
    const positions = Object.fromEntries(result.data.placement.items.map(x => [x.file, x.fromSeconds]));
    assert.equal(positions.camera - positions.recorder, offset / 1000);
    assert.equal(Math.min(...Object.values(positions)), 0);
  }
});
test('early/late drift prevents automatic camera placement', () => {
  const result = run(fixture(2500, 30));
  assert.equal(result.status, 0, result.error);
  assert.equal(result.data.offsets.camera.confident, false);
  assert.ok(result.data.offsets.camera.issues.includes('early_late_drift'));
  assert.ok(!result.data.placement.items.some(x => x.file === 'camera'));
});
test('sparse and unrelated matches remain unconfident', () => {
  assert.equal(run(fixture(2500, 0, 4)).data.offsets.camera.confident, false);
  const rows = fixture().map(x => x.file === 'camera' ? { ...x, text: '完全没有对应内容的独立讲话片段' } : x);
  const result = run(rows);
  assert.equal(result.data.offsets.camera.confident, false);
  assert.ok(!result.data.placement.items.some(x => x.file === 'camera'));
});
test('invalid or missing source timestamps fail closed', () => {
  for (const patch of [{ start: undefined }, { start: -1 }, { start: '1000' }, { text: 123 }, { end: 0 }]) {
    const rows = fixture(); rows[0] = { ...rows[0], ...patch };
    const result = run(rows);
    assert.notEqual(result.status, 0);
    assert.match(result.error, /Invalid utterance/);
  }
});
