param([string]$ClaudeResources)
$ErrorActionPreference = 'Stop'
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'SkillRecorder/runtime/claude-5.11492.5-electron-45.3.2'
$electronRoot = Join-Path $runtimeRoot 'electron'
$sourceRoot = Join-Path $runtimeRoot 'source'
if (-not $ClaudeResources) {
  $installed = Get-AppxPackage -Name '*Claude*' | Where-Object { $_.Version -eq '5.11492.5.0' } | Select-Object -First 1
  if (-not $installed) { throw 'Claude 5.11492.5 is required for this local artifact import. Pass -ClaudeResources for an explicit installation.' }
  $ClaudeResources = Join-Path $installed.InstallLocation 'app/resources'
}
$binding = Join-Path $ClaudeResources 'app.asar.unpacked/node_modules/@ant/claude-native/claude-native-binding.node'
$signature = Get-AuthenticodeSignature -LiteralPath $binding
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Anthropic') { throw 'The selected native binding must have a valid Anthropic publisher signature.' }
& node (Join-Path $PSScriptRoot 'claude/prepare-runtime.cjs') $ClaudeResources $sourceRoot
if ($LASTEXITCODE -ne 0) { throw 'Claude artifact verification failed.' }
if (-not (Test-Path -LiteralPath (Join-Path $electronRoot 'electron.exe'))) {
  $archivePath = Join-Path $runtimeRoot 'electron-v45.3.2-win32-x64.zip'
  if (-not (Test-Path -LiteralPath $archivePath)) {
    Invoke-WebRequest -Uri 'https://github.com/electron/electron/releases/download/v45.3.2/electron-v45.3.2-win32-x64.zip' -OutFile $archivePath
  }
  if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'cd1ab0d49c2f76838c0c9ff75afefb4d9d85ca59036691932bf35be8eceba98b') { throw 'Electron archive checksum mismatch.' }
  Expand-Archive -LiteralPath $archivePath -DestinationPath $electronRoot
}
$runtimeManifest = @{ version=1; engine='claude-watch-recorder'; sourceVersion='5.11492.5'; electronVersion='45.3.2';
  executable=(Join-Path $electronRoot 'electron.exe'); source=$sourceRoot;
  executableSha256=(Get-FileHash -LiteralPath (Join-Path $electronRoot 'electron.exe') -Algorithm SHA256).Hash.ToLowerInvariant() }
$runtimeManifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeRoot 'runtime.json') -Encoding utf8
Write-Output "Recorder runtime ready: $runtimeRoot"
