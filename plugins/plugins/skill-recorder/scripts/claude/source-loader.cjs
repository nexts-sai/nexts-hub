'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { SOURCES } = require('./prepare-runtime.cjs');

// Execute only the pinned processing modules, with explicit host imports.
// The multi-megabyte Claude desktop host, telemetry, accounts and cloud APIs
// are never loaded. Electron supplies the same nativeImage implementation.
function loadSource(root, electron, log = () => {}) {
  const bytes = Object.fromEntries(Object.keys(SOURCES).map(name => {
    const data = fs.readFileSync(path.join(root, name));
    const actual = crypto.createHash('sha256').update(data).digest('hex');
    if (actual !== SOURCES[name][1]) throw Error('Recorder dependency changed: ' + name);
    return [name, data];
  }));
  const modules = new Map();
  const names = {
    './index.chunk-JjhKrwN-.js':'events.cjs', './index.chunk-D36Ayknc.js':'trajectory.cjs',
    './index.chunk-CuZHq74K.js':'prompts.cjs', './index.chunk-DRJf_lDJ.js':'blocks.cjs',
  };
  const host = {eCt:'win32', iDt:{warn:log, info:log, debug:log}};
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const exports = {}; modules.set(name, exports);
    const context = {exports, module:{exports}, Buffer, setImmediate, require(specifier) {
      if (specifier === 'electron') return electron;
      if (specifier === './index.chunk-DL8fZzVo.js') return host;
      if (specifier === './index.chunk-B2zFLoEJ.js') return {};
      if (names[specifier]) return load(names[specifier]);
      throw Error('Unexpected recorder dependency: ' + specifier);
    }};
    vm.runInNewContext(bytes[name].toString('utf8'), context, {filename:name, timeout:5000});
    return exports;
  }
  return {native:require(path.join(root, 'binding.node')), events:load('events.cjs'),
    trajectory:load('trajectory.cjs'), blocks:load('blocks.cjs')};
}
module.exports = {loadSource};
