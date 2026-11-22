param([string] $Version)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$source = Join-Path $root 'extension'
$manifest = Get-Content (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json
if ($Version -and $Version -ne $manifest.version) { throw 'Tag and manifest versions differ.' }
Get-ChildItem -LiteralPath $source -Filter '*.js' | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE) { throw "Invalid JavaScript in $($_.Name)." }
}
$output = Join-Path $root 'dist'
New-Item -ItemType Directory -Path $output -Force | Out-Null
Compress-Archive -Path (Join-Path $source '*') -DestinationPath (Join-Path $output "media-playback-speed-$($manifest.version).zip") -Force
