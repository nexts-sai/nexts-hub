'use strict';
function recordingSize(width, height) {
  if (![width, height].every(Number.isInteger) || width < 2 || height < 2 || width * height > 64000000) throw Error('Unsupported physical screen dimensions');
  return {width: Math.floor(width / 2) * 2, height: Math.floor(height / 2) * 2};
}
const FPS = 5;
function encoderArgs(output) {
  return ['-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-f', 'image2pipe', '-c:v', 'mjpeg', '-probesize', '32', '-analyzeduration', '0', '-framerate', String(FPS),
    '-i', 'pipe:0', '-an', '-vf', 'fps=10', '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-progress', 'pipe:1', output];
}
module.exports = {recordingSize, encoderArgs, FPS};
