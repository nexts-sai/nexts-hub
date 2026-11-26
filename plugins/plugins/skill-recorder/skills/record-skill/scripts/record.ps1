param([string]$Output, [int]$Monitor=0, [int]$Seconds=60, [string]$Ffmpeg, [switch]$ListMonitors, [switch]$Diagnose)
$ErrorActionPreference='Stop'
$cli=Join-Path $PSScriptRoot 'capture/cli.cjs'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 18 or newer is required on PATH to run this independent Skill.' }
if($ListMonitors){ & node $cli --list; exit $LASTEXITCODE }
$recorderArgs=@('--monitor', $Monitor, '--seconds', $Seconds)
if($Output){$recorderArgs+=@('--output', $Output)}
if($Ffmpeg){$recorderArgs+=@('--ffmpeg', $Ffmpeg)}
if($Diagnose){$recorderArgs+='--diagnose'}
& node $cli @recorderArgs
exit $LASTEXITCODE
