param([string]$Request, [switch]$ListMonitors, [switch]$SelfTest)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
try {
    Add-Type -Path (Join-Path $PSScriptRoot 'native.cs') -ReferencedAssemblies System.Drawing,System.Windows.Forms,System.Web.Extensions
    if ($ListMonitors) { [Nexts.Recording.Collector]::ListMonitors(); exit 0 }
    if ($SelfTest) { [Nexts.Recording.Collector]::SelfTest(); exit 0 }
    if (-not $Request) { throw 'A recording request file is required.' }
    [Nexts.Recording.Collector]::Run([IO.File]::ReadAllText($Request))
    exit 0
} catch {
    [Console]::Error.WriteLine($_.Exception.ToString())
    exit 1
}
