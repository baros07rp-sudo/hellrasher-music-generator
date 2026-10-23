$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$buildPath = Join-Path $taskRoot 'tools/engine-build'
$outputPath = Join-Path $taskRoot 'resources/backend'
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
Copy-Item -LiteralPath (Join-Path $buildPath 'mm-server.exe') -Destination $outputPath
Get-ChildItem -LiteralPath $buildPath -Recurse -Filter '*.dll' | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $outputPath -Force }
foreach ($dll in @('cublas64_13.dll','cublasLt64_13.dll','cudart64_13.dll')) { Copy-Item -LiteralPath (Join-Path $taskRoot "tools/cuda/bin/x64/$dll") -Destination $outputPath -Force }
Get-ChildItem -LiteralPath (Join-Path $taskRoot 'tools/msvc/VC/Tools/MSVC') -Recurse -Filter '*.dll' | Where-Object { $_.DirectoryName -match 'bin\\Hostx64\\x64$' -and $_.Name -match '^(msvcp140(?:_[12]|_atomic_wait|_codecvt_ids)?|vcruntime140(?:_1|_threads)?|vcomp140|concrt140)\.dll$' } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $outputPath -Force }
if (-not (Test-Path -LiteralPath (Join-Path $outputPath 'vcomp140.dll'))) { Copy-Item -LiteralPath (Join-Path $env:SystemRoot 'System32/vcomp140.dll') -Destination $outputPath }
$revision = & git -C (Join-Path $taskRoot 'vendor/minimaxmusic.cpp') rev-parse HEAD
@{engine='minimaxmusic.cpp';revision=$revision;cuda='13.0.2';architecture='sm_120a';policy='EVICT_STRICT';extension='POST /tokenize';built=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'build.json') -Encoding utf8
& git -C (Join-Path $taskRoot 'vendor/minimaxmusic.cpp') diff -- tools/mm-server.cpp | Set-Content -LiteralPath (Join-Path $taskRoot 'scripts/engine-tokenize.patch') -Encoding utf8
Get-ChildItem -LiteralPath $outputPath | Select-Object Name,Length
