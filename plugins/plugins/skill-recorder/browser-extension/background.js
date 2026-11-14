let current = null;
let recording = false;
let polling = false;
let captureError = null;
const normalize = text => { const u = new URL(text); return u.origin + u.pathname; };
const restore = chrome.storage.session.get('pair').then(data => { current = data.pair || null; });
async function call(path, body) {
  if (!current) throw new Error('Pair with Nexts first');
  const response = await fetch(current.url + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${current.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Nexts connection: ${response.status}`);
  return response.json();
}
async function poll() {
  await restore;
  if (!current || polling) return;
  polling = true;
  try {
    const state = await call('/state'); recording = Boolean(state.recording) && !captureError;
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await call('/state', { active_paired: Boolean(active && current.tabs.includes(active.id)), capture_error: captureError });
    captureError = null;
  } catch { recording = false; } finally { polling = false; }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    await restore;
    if (message.type === 'pair' && !sender.tab) {
      const url = new URL(message.url);
      if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || !/^[0-9a-f-]{36}$/.test(message.token)) throw new Error('Use the local connection URL and token shown in Nexts');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !/^https?:/.test(tab.url || '')) throw new Error('Open the target website first');
      const same = current?.token === message.token;
      current = { url: url.origin, token: message.token, tabs: [...new Set([...(same ? current.tabs : []), tab.id])] };
      await call('/state'); await chrome.storage.session.set({ pair: current });
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['dom.js', 'content.js'] });
      await poll(); return { ok: true, count: current.tabs.length };
    }
    if (message.type === 'disconnect' && !sender.tab) { current = null; recording = false; captureError = null; await chrome.storage.session.remove('pair'); return { ok: true }; }
    if (!current || !sender.tab || !current.tabs.includes(sender.tab.id)) return { recording: false };
    if (message.type === 'recorder-status') { void poll(); return { recording }; }
    if (message.type === 'recorder-event' && recording) {
      const step = message.step;
      step.locator.url = normalize(sender.tab.url); step.locator.frame_url = normalize(sender.url);
      try { await call('/events', step); return { ok: true }; }
      catch (error) { recording = false; captureError = 'A browser event could not be saved. Review the missing step before resuming capture.'; throw error; }
    }
    return { recording: false };
  })().then(reply).catch(e => reply({ error: e.message }));
  return true;
});
chrome.tabs.onCreated.addListener(tab => { if (current && current.tabs.includes(tab.openerTabId)) { current.tabs.push(tab.id); void chrome.storage.session.set({ pair: current }); } });
chrome.tabs.onRemoved.addListener(id => { if (current) { current.tabs = current.tabs.filter(t => t !== id); void chrome.storage.session.set({ pair: current }); } });
setInterval(poll, 500);
