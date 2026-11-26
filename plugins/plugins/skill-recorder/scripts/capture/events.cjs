'use strict';

const ENGINE = 'nexts-windows-recorder';
const clip = (value, length = 240) => typeof value === 'string' ? value.slice(0, length) : '';
const specialKeys = new Set(['Enter', 'Tab', 'Escape', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'Left', 'Right', 'Up', 'Down', ...Array.from({length: 12}, (_, i) => `F${i + 1}`)]);

// Whitelist the collector protocol. Ordinary key identities and field values
// never enter the retained events, even if an incompatible collector sends them.
function normalize(raw, monitor) {
  if (!Number.isSafeInteger(raw?.at) || raw.at <= 0) return null;
  const event = {at: raw.at, app: clip(raw.app, 120), windowTitle: clip(raw.windowTitle)};
  if (raw.type === 'key') {
    const key = clip(raw.key, 40);
    event.type = 'key';
    event.key = specialKeys.has(key) || /^(?:(?:Ctrl|Alt|Shift|Win)\+)+(?:[A-Z0-9]|F(?:[1-9]|1[0-2])|Enter|Tab|Escape|Left|Right|Up|Down|Home|End|Delete|Backspace|PageUp|PageDown|Insert)$/.test(key) ? key : 'text';
    return event;
  }
  if (!['leftMouseDown', 'leftMouseUp', 'rightMouseDown', 'rightMouseUp', 'scroll'].includes(raw.type)) return null;
  if (![raw.x, raw.y].every(Number.isInteger) || raw.x < monitor.x || raw.y < monitor.y || raw.x >= monitor.x + monitor.width || raw.y >= monitor.y + monitor.height) return null;
  return {...event, type: raw.type, x: raw.x - monitor.x, y: raw.y - monitor.y,
    ...(raw.type === 'scroll' ? {dx: Number.isFinite(raw.dx) ? raw.dx : 0, dy: Number.isFinite(raw.dy) ? raw.dy : 0} : {})};
}

function processEvents(events, startedAt) {
  const actions = [];
  let down = null;
  const append = (kind, event, text, extra = {}) => actions.push({kind, at: event.at, tStart: event.at - startedAt, tEnd: event.at - startedAt,
    app: event.app, windowTitle: event.windowTitle, text, ...extra});
  for (const event of events) {
    // A pause boundary cannot turn two unrelated presses into a drag/double click.
    if (event.type === 'boundary') { down = null; continue; }
    const previous = actions.at(-1);
    const sameContext = previous?.app === event.app && previous?.windowTitle === event.windowTitle && previous?.segment === event.segment;
    if (event.type.endsWith('MouseDown')) { down = event; continue; }
    if (event.type.endsWith('MouseUp')) {
      if (!down || down.type.replace('Down', 'Up') !== event.type || down.segment !== event.segment) { down = null; continue; }
      const distance = Math.hypot(event.x - down.x, event.y - down.y);
      const kind = distance > 5 ? 'drag' : event.type === 'rightMouseUp' ? 'right_click' : 'click';
      if (kind === 'click' && previous?.kind === 'click' && sameContext && event.at - previous.at <= 500 && Math.hypot(event.x - previous.x, event.y - previous.y) <= 5) {
        previous.kind = 'double_click'; previous.text = `Double-click at (${event.x}, ${event.y})`; previous.tEnd = event.at - startedAt;
      } else {
        append(kind, down, kind === 'drag' ? `Drag from (${down.x}, ${down.y}) to (${event.x}, ${event.y})` : `${kind === 'right_click' ? 'Right-click' : 'Click'} at (${event.x}, ${event.y})`,
          {x: down.x, y: down.y, endX: event.x, endY: event.y, tEnd: event.at - startedAt, segment: event.segment});
      }
      down = null;
    } else if (event.type === 'scroll') {
      if (previous?.kind === 'scroll' && sameContext && event.at - startedAt - previous.tEnd < 500) {
        previous.dx += event.dx; previous.dy += event.dy; previous.tEnd = event.at - startedAt;
      } else append('scroll', event, 'Scroll', {x: event.x, y: event.y, dx: event.dx, dy: event.dy, segment: event.segment});
    } else if (event.type === 'key') {
      if (event.key === 'text' && previous?.kind === 'set_value' && sameContext && event.at - startedAt - previous.tEnd < 1500) previous.tEnd = event.at - startedAt;
      else append(event.key === 'text' ? 'set_value' : 'key', event, event.key === 'text' ? 'Enter text (value omitted)' : `Press ${event.key}`, {segment: event.segment});
    }
  }
  const steps = actions.map((action, index) => ({id: `recorded_${index}`, at: action.at, title: action.text, action: action.kind,
    locator: {channel: 'visual', app: action.app, window_title: action.windowTitle, url: '', frame_url: '',
      control: {id: '', name: '', role: '', class_name: '', test_id: ''}, ancestors: []},
    parameter: action.kind === 'set_value' ? `input_${index}` : '', expected: null, enabled: true}));
  return {actions: actions.map((action, i) => ({...action, id: steps[i].id})), steps};
}

function selectFrames(frames, steps, limit = 12, maxBytes = 12 * 1024 * 1024) {
  if (!frames.length) return [];
  const targets = steps.length ? steps.map(s => s.at) : [frames[0].at, frames[Math.floor(frames.length / 2)].at, frames.at(-1).at];
  const count = Math.min(limit, targets.length), selected = new Set();
  let bytes = 0;
  for (let i = 0; i < count; i++) {
    const target = targets[count === 1 ? 0 : Math.round(i * (targets.length - 1) / (count - 1))];
    const frame = frames.reduce((best, next) => Math.abs(next.at - target) < Math.abs(best.at - target) ? next : best);
    if (!selected.has(frame) && bytes + frame.jpeg.length <= maxBytes) { selected.add(frame); bytes += frame.jpeg.length; }
  }
  return [...selected].sort((a, b) => a.at - b.at);
}
module.exports = {ENGINE, normalize, processEvents, selectFrames};
