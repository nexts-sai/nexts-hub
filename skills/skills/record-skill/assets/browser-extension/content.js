(() => {
  if (globalThis.__nextsRecorderListening) return;
  globalThis.__nextsRecorderListening = true;
  let recording = false;
  const describedInputs = new WeakSet();
  const status = () => chrome.runtime.sendMessage({ type: 'recorder-status' }).then(s => { recording = Boolean(s?.recording); }).catch(() => { recording = false; });
  status(); setInterval(status, 1000);
  function capture(event) {
    if (!recording || !event.isTrusted) return;
    const api = globalThis.NextsRecorderDOM;
    const target = event.composedPath().find(n => n instanceof Element);
    const semantic = target?.closest('button, a, input, textarea, select, [contenteditable], [role], [tabindex]');
    const el = semantic || target;
    if (!el || ['BODY', 'HTML'].includes(el.tagName) || api.secret(el)) return;
    const editing = event.type !== 'click';
    if (editing && ['checkbox', 'radio'].includes(el.type)) return;
    if (editing && !api.editable(el)) return;
    if (!editing && api.editable(el) && !['checkbox', 'radio'].includes(el.type)) return;
    // Native capture owns the keystrokes. DOM contributes a target description
    // once per editing visit, without reading or merging field contents.
    if (editing && describedInputs.has(el)) return;
    if (editing) describedInputs.add(el);
    const control = api.selector(el);
    const action = !semantic || el.type === 'file' ? 'manual' : editing ? 'set_value' : el.type === 'checkbox' ? 'toggle' : 'click';
    const step = { id: crypto.randomUUID(), at: Date.now(), title: `${editing ? 'Fill' : 'Click'} ${control.name || control.id || control.role}`, action,
      locator: { channel: 'dom', app: '', window_title: '', url: location.origin + location.pathname, frame_url: location.origin + location.pathname, control, ancestors: api.ancestors(el) },
      parameter: action === 'set_value' ? `input_${crypto.randomUUID().slice(0, 8)}` : '', expected: null, enabled: true };
    // Never read or send the field value, clipboard, cookies or page HTML.
    chrome.runtime.sendMessage({ type: 'recorder-event', step }).catch(() => {});
  }
  document.addEventListener('click', capture, true);
  document.addEventListener('input', capture, true);
  document.addEventListener('change', capture, true);
  document.addEventListener('focusout', event => { const target=event.composedPath().find(n=>n instanceof Element); if(target)describedInputs.delete(target); }, true);
})();
