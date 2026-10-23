$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$buildPath = Join-Path $taskRoot 'tools/yue-build'
$outputPath = Join-Path $taskRoot 'resources/yue'
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
Copy-Item -LiteralPath (Join-Path $buildPath 'yue-server.exe') -Destination $outputPath -Force
$ggmlRevision = & git -C (Join-Path $taskRoot 'vendor/yue2.cpp/ggml') rev-parse HEAD
$aceGgmlRevision = & git -C (Join-Path $taskRoot 'vendor/acestep.cpp/ggml') rev-parse HEAD
if ($ggmlRevision -ne $aceGgmlRevision) { throw 'GGML ABI revisions differ; cannot share the established runtime.' }
# Reuse the established DLL build of the identical GGML revision.
Get-ChildItem -LiteralPath (Join-Path $taskRoot 'resources/ace') -Filter 'ggml*.dll' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $outputPath -Force }
Copy-Item -LiteralPath (Join-Path $taskRoot 'vendor/yue2.cpp/LICENSE') -Destination (Join-Path $outputPath 'LICENSE-engine.txt') -Force
$revision = & git -C (Join-Path $taskRoot 'vendor/yue2.cpp') rev-parse HEAD
@{engine='yue2.cpp';revision=$revision;ggml=$ggmlRevision;ggmlRuntime='shared established ACE build, identical source revision';cuda='13.0.2';architecture='sm_120a';policy='release models between stages and jobs';built=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'build.json') -Encoding utf8
Get-ChildItem -LiteralPath $outputPath | Select-Object Name,Length
