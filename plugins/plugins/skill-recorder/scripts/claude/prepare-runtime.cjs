// Local import of an explicitly selected, version-pinned installed artifact.
// No Claude application, account service or private host module is executed.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const VERSION = '5.11492.5';
const SOURCES = {
  'events.cjs': ['.vite/build/index.chunk-JjhKrwN-.js', '5726b454ffcb81816fa8d2662b5413bbdbbcf544bfbf94fa2c3e11f881ba4530'],
  'trajectory.cjs': ['.vite/build/index.chunk-D36Ayknc.js', '9963fd81de7b4e9892f9afec41abd064ba509d0ea92230715ff73213225c087d'],
  'blocks.cjs': ['.vite/build/index.chunk-DRJf_lDJ.js', '7eb394fec3b05dacafceeead6705b6f08286868630e7ae1a43cb6065c35c7110'],
  'prompts.cjs': ['.vite/build/index.chunk-CuZHq74K.js', 'da8f78d25db9a6b71f0f77b0af08afe92dee8c808df0be7a04f7299c89477504'],
  'binding.node': ['node_modules/@ant/claude-native/claude-native-binding.node', '78e2394bfee18fec8b69b4c8247dc95e7d725ffcbecdf33d3064ea0f902f7db5'],
};
function archiveReader(resources) {
  const archive = path.join(resources, 'app.asar');
  const fd = fs.openSync(archive, 'r');
  const prefix = Buffer.alloc(16); fs.readSync(fd, prefix, 0, 16, 0);
  const headerSize = prefix.readUInt32LE(4), jsonSize = prefix.readUInt32LE(12);
  if (jsonSize > 64 * 1024 * 1024 || jsonSize + 8 > headerSize) throw Error('Invalid ASAR header');
  const json = Buffer.alloc(jsonSize); fs.readSync(fd, json, 0, jsonSize, 16);
  const header = JSON.parse(json.toString('utf8'));
  return { close: () => fs.closeSync(fd), read(name) {
    let entry = header;
    for (const segment of name.split('/')) entry = entry.files?.[segment];
    if (!entry || entry.link || !Number.isSafeInteger(entry.size)) throw Error('Missing archive member: ' + name);
    if (entry.unpacked) return fs.readFileSync(path.join(resources, 'app.asar.unpacked', name));
    const offset = Number(entry.offset) + 8 + headerSize;
    if (!Number.isSafeInteger(offset) || entry.size > 20 * 1024 * 1024) throw Error('Invalid archive member');
    const bytes = Buffer.alloc(entry.size);
    if (fs.readSync(fd, bytes, 0, bytes.length, offset) !== bytes.length) throw Error('Truncated archive member');
    return bytes;
  }};
}
function prepare(resources, destination) {
  const reader = archiveReader(resources);
  try {
    const metadata = JSON.parse(reader.read('package.json'));
    if (metadata.version !== VERSION) throw Error(`Supported Claude artifact: ${VERSION}; found ${metadata.version}. Review the new artifact before upgrading.`);
    const files = {};
    // Validate the complete selected set before writing any executable file.
    const material = Object.entries(SOURCES).map(([name, [source, expected]]) => {
      const bytes = reader.read(source);
      if (sha(bytes) !== expected) throw Error('Selected artifact hash mismatch: ' + source);
      files[name] = expected; return [name, bytes];
    });
    fs.mkdirSync(destination, { recursive: true });
    for (const [name, bytes] of material) fs.writeFileSync(path.join(destination, name), bytes);
    fs.writeFileSync(path.join(destination, 'source.json'), JSON.stringify({version:VERSION, platform:'win32-x64', files,
      nativeSourceAvailable:false, asarDeclaredNativeHash:'f1ad7242d9871aa8176b93a851d07a6cefa7771afc91a96f1333e069cae736c2',
      nativeHashBasis:'Observed signed installed bytes; original ASAR mismatch retained.'}, null, 2));
    return { version:VERSION, files:Object.keys(files).length };
  } finally { reader.close(); }
}
module.exports = { prepare, SOURCES, VERSION };
if (require.main === module) {
  try { console.log(JSON.stringify(prepare(process.argv[2], process.argv[3]))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
