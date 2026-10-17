// Nexts owns routing, vendor credentials and quota. This adapter owns no account state.
import { readFile } from 'node:fs/promises';

export function backendConfig(env = process.env) {
  if (!env.NEXTS_ACCOUNT_API_BASE_URL || !env.NEXTS_ACCESS_TOKEN) {
    throw new Error('Nexts session bridge required: NEXTS_ACCOUNT_API_BASE_URL and NEXTS_ACCESS_TOKEN must be supplied by the caller; do not copy provider keys.');
  }
  const base = new URL(env.NEXTS_ACCOUNT_API_BASE_URL.replace(/\/+$/, '') + '/');
  if (base.username || base.password || base.search || base.hash ||
      !(base.protocol === 'https:' || (base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) {
    throw new Error('Backend must use HTTPS or localhost HTTP, without URL credentials/query.');
  }
  return { base, token: env.NEXTS_ACCESS_TOKEN, deviceId: env.NEXTS_DEVICE_ID };
}

export function validateRequest(r) {
  if (!['image', 'video', 'speech'].includes(r.kind)) throw new Error('Unknown generation kind');
  if (typeof (r.kind === 'speech' ? r.text : r.prompt) !== 'string' || !(r.kind === 'speech' ? r.text : r.prompt).trim()) throw new Error('Generation text required');
  return r;
}

function unpack(x) { return x?.data && !Array.isArray(x.data) ? x.data : x; }
export function videoReceipt(raw, knownTaskId) {
  const x = unpack(raw);
  const status = String(x.status ?? x.state ?? x.task_status ?? '').toLowerCase();
  if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) return { status: 'failed' };
  const taskId = x.task_id ?? x.id ?? raw.task_id ?? raw.id ?? knownTaskId;
  const candidate = x.video_url ?? x.output?.video_url ?? x.result?.video_url ?? x.output?.url ?? x.result?.url ?? x.url;
  // Generic URLs must have video extensions. Never accept a cover/thumbnail URL.
  const explicit = x.video_url ?? x.output?.video_url ?? x.result?.video_url;
  const url = typeof candidate === 'string' && (explicit || /\.(mp4|webm|mov)(?:[?#]|$)/i.test(candidate)) ? candidate : null;
  if (url && (!status || ['completed', 'succeeded', 'success', 'done'].includes(status))) return { status: 'ready', taskId, asset: { url } };
  if (taskId) return { status: 'pending', taskId: String(taskId) };
  throw new Error('Video response has no usable task ID or video asset');
}

export class NextsProvider {
  constructor(config, fetchImpl = fetch) { this.config = config; this.fetch = fetchImpl; }
  async request(path, body) {
    const r = await this.fetch(new URL(path, this.config.base), {
      method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { Authorization: `Bearer ${this.config.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify({ ...body, ...(this.config.deviceId ? { deviceId: this.config.deviceId } : {}) }) } : {}),
      signal: AbortSignal.timeout(900000),
    });
    if (!r.ok) throw new Error(`Nexts HTTP ${r.status}; inspect the existing request before retrying`);
    return r;
  }
  async submit(r) {
    validateRequest(r);
    if (r.kind === 'speech') {
      const voices = await (await this.request('audio/voices')).json();
      if (voices.selection?.ttsModel !== 'elevenlabs-tts') throw new Error('Select ElevenLabs on the Nexts backend Voice page before generating narration');
      const response = await this.request('audio/speech', { model: 'auto', input: r.text, language: r.language ?? 'zh', format: 'mp3' });
      if (!(response.headers.get('content-type') ?? '').match(/audio|octet-stream/)) throw new Error('Speech response was not audio');
      return { status: 'ready', asset: { base64: Buffer.from(await response.arrayBuffer()).toString('base64'), mime: 'audio/mpeg' } };
    }
    const body = { model: 'auto', prompt: r.prompt };
    if (r.kind === 'image' && r.size) body.size = r.size;
    if (r.kind === 'video' && r.referenceImage) {
      const bytes = await readFile(r.referenceImage);
      if (bytes.length > 20 * 1024 * 1024) throw new Error('Reference exceeds 20 MiB');
      const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : null;
      if (!mime) throw new Error('Reference must be PNG or JPEG');
      body.image = `data:${mime};base64,${bytes.toString('base64')}`;
    }
    const raw = await (await this.request(r.kind === 'image' ? 'images/generations' : 'video/generations', body)).json();
    if (r.kind === 'video') return videoReceipt(raw);
    const item = raw.data?.[0] ?? raw.data?.data?.[0];
    if (item?.b64_json) return { status: 'ready', asset: { base64: item.b64_json, mime: 'image/png' } };
    if (item?.url) return { status: 'ready', asset: { url: item.url } };
    throw new Error('Image response did not contain an asset');
  }
  async poll(taskId) {
    const receipt = videoReceipt(await (await this.request(`video/generations/${encodeURIComponent(taskId)}`)).json(), taskId);
    return { ...receipt, taskId: receipt.taskId ?? taskId };
  }
  async download(asset) {
    if (asset.base64) return Buffer.from(asset.base64, 'base64');
    const u = new URL(asset.url);
    if (u.protocol !== 'https:' || u.username || u.password) throw new Error('Asset URL must use HTTPS without credentials');
    // No backend Authorization header crosses the CDN boundary.
    const r = await this.fetch(u, { redirect: 'error', signal: AbortSignal.timeout(300000) });
    if (!r.ok) throw new Error(`Asset download HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
}
