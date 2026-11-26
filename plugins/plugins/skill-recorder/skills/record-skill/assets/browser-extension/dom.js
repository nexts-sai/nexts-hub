/* DOM evidence enrichment. This extension records; it never executes actions. */
(() => {
  if (globalThis.NextsRecorderDOM) return;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const editable = el => ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
  const secret = el => el.matches('input[type="password"], [autocomplete="current-password"], [autocomplete="new-password"], [autocomplete="one-time-code"], [autocomplete^="cc-"]');
  const role = el => el.getAttribute('role') || ({ BUTTON: 'button', A: 'link', SELECT: 'combobox', TEXTAREA: 'textbox', FORM: 'form', DIALOG: 'dialog', TR: 'row' }[el.tagName]) || (el.tagName === 'INPUT' ? ['checkbox', 'radio'].includes(el.type) ? el.type : 'textbox' : el.tagName.toLowerCase());
  const name = el => clean(el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => el.ownerDocument.getElementById(id)?.textContent || '').join(' ') || [...(el.labels || [])].map(l => l.textContent).join(' ') || el.getAttribute('title') || (editable(el) ? el.getAttribute('placeholder') : el.querySelector('input, textarea, select, [contenteditable]') ? '' : el.textContent));
  const selector = el => ({ id: /\d{5,}|^(:r|radix-|react-)/.test(el.id) ? '' : el.id || '', name: name(el), role: role(el), class_name: '', test_id: el.getAttribute('data-testid') || '' });
  const parent = el => el.parentElement || el.getRootNode()?.host || null;
  const ancestors = el => {
    const out = []; let p = parent(el);
    for (let i = 0; p && i < 12 && out.length < 4; i++, p = parent(p)) {
      if (p === document.body || p === document.documentElement) break;
      if (p.id || p.getAttribute('data-testid') || ['form', 'dialog', 'row'].includes(role(p))) out.push(selector(p));
    }
    return out;
  };
  globalThis.NextsRecorderDOM = { selector, ancestors, secret, editable };
})();
