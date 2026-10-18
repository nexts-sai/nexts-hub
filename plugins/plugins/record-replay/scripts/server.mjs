#!/usr/bin/env node
import { FlowEngine, toolDefinitions } from './engine.mjs';

const engine = new FlowEngine();
const protocols = new Set(['2024-11-05', '2025-03-26', '2025-06-18']);
const send = value => process.stdout.write(JSON.stringify(value) + '\n');
let pending = '';
let queue = Promise.resolve();

async function dispatch(message) {
  const { id, method, params } = message;
  if (id === undefined) return; // MCP notifications have no response.
  const reply = result => send({ jsonrpc: '2.0', id, result });
  if (method === 'initialize') return reply({ protocolVersion: protocols.has(params?.protocolVersion) ? params.protocolVersion : '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'record-replay', version: '0.1.0' }, instructions: 'Local OpenAdapt Flow adapter. Read the record-replay Skill. Users demonstrate recordings. Replay may write to apps; use user-authorized scope. Poll jobs. Never equate COMPLETED_UNVERIFIED or exit 0 with a verified save; never automatically retry uncertain effects.' });
  if (method === 'ping') return reply({});
  if (method === 'tools/list') return reply({ tools: toolDefinitions });
  if (method === 'tools/call') {
    try {
      const result = await engine.call(params?.name, params?.arguments ?? {});
      return reply({ content: [{ type: 'text', text: JSON.stringify(result) }] });
    } catch (error) {
      return reply({ isError: true, content: [{ type: 'text', text: error.message }] });
    }
  }
  send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  pending += chunk;
  if (pending.length > 1024 * 1024) { process.stdin.destroy(); void shutdown(); return; }
  let newline;
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline);
    pending = pending.slice(newline + 1);
    if (!line.trim()) continue;
    queue = queue.then(async () => {
      let message;
      try { message = JSON.parse(line); }
      catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
      if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
        send({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } }); return;
      }
      await dispatch(message);
    }).catch(error => console.error(error.message));
  }
});
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await queue;
  if (engine.active) {
    const slot = engine.active;
    if (slot.job.operation === 'record') slot.child.stdin.end('stop\n');
    else await engine.cancel(slot.job.job_id).catch(error => console.error(error.message));
    const timeout = setTimeout(() => { void engine.cancel(slot.job.job_id).catch(() => {}); }, 5000);
    await slot.finished;
    clearTimeout(timeout);
  }
  process.exit(0);
}
process.stdin.on('end', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
