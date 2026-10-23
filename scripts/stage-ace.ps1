$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$buildPath = Join-Path $taskRoot 'tools/ace-build'
$outputPath = Join-Path $taskRoot 'resources/ace'
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
Copy-Item -LiteralPath (Join-Path $buildPath 'ace-server.exe') -Destination $outputPath -Force
Get-ChildItem -LiteralPath $buildPath -Recurse -Filter '*.dll' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $outputPath -Force }
$revision = & git -C (Join-Path $taskRoot 'vendor/acestep.cpp') rev-parse HEAD
@{engine='acestep.cpp';revision=$revision;cuda='13.0.2';architecture='sm_120a';policy='release models between jobs';built=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'build.json') -Encoding utf8
Get-ChildItem -LiteralPath $outputPath | Select-Object Name,Length
