'use strict';

// Preserve text at physical display resolution. H.264 yuv420p requires even
// dimensions, so at most the last pixel row/column is cropped, never upscaled.
function recordingSize(width, height) {
  if (![width, height].every(Number.isInteger) || width < 2 || height < 2 || width * height > 64000000) {
    throw Error('Unsupported physical screen dimensions');
  }
  return {width: Math.floor(width / 2) * 2, height: Math.floor(height / 2) * 2};
}
const FPS = 5;
const JPEG_QUALITY = 92;
function encoderArgs(output) {
  return ['-hide_banner','-loglevel','error','-nostdin','-n','-f','image2pipe','-framerate',String(FPS),'-i','pipe:0','-an','-vf','fps=10','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output];
}
module.exports = {recordingSize, encoderArgs, FPS, JPEG_QUALITY};
