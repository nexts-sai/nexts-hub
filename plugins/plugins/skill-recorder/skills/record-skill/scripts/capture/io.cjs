'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function atomic(folder, name, value) {
  const target = path.join(folder, name), temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value));
  fs.renameSync(temp, target);
}
function powershell() {
  if (process.platform !== 'win32') throw Error('Recording requires Windows. This Skill currently supports Windows desktop capture.');
  const exe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  if (!fs.existsSync(exe)) throw Error('Windows PowerShell 5.1 is unavailable.');
  return exe;
}
function nativeArgs(...args) { return ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'native.ps1'), ...args]; }
function monitors() {
  const result = spawnSync(powershell(), nativeArgs('-ListMonitors'), {windowsHide: true, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024});
  if (result.error || result.status !== 0) throw Error(`Windows capture initialization failed: ${result.error?.message || result.stderr || result.stdout}`);
  return JSON.parse(result.stdout.trim()).sort((a, b) => Number(b.primary) - Number(a.primary));
}
function checkEncoder(ffmpeg) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-encoders'], {windowsHide: true, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024});
  if (result.error || result.status !== 0) throw Error('FFmpeg is unavailable. Install FFmpeg or pass -Ffmpeg <path-to-ffmpeg.exe>.');
  if (!/\blibx264\b/.test(result.stdout)) throw Error('This FFmpeg build has no libx264 encoder. Select a build with H.264 encoding.');
}
module.exports = {readJson, atomic, powershell, nativeArgs, monitors, checkEncoder};
