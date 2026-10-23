@echo off
setlocal
cd /d "%~dp0.."
call "tools\msvc\setup_x64.bat"
set "CUDA_PATH=%CD%\tools\cuda"
set "CUDACXX=%CUDA_PATH%\bin\nvcc.exe"
set "PYTHONPATH=%CD%\tools\python"
set "PATH=%CD%\tools\python\cmake\data\bin;%CD%\tools\python\bin;%CUDA_PATH%\bin;%CUDA_PATH%\bin\x64;%PATH%"
cmake -S vendor/minimaxmusic.cpp -B tools/engine-build -G Ninja -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=120a-real -DCMAKE_BUILD_TYPE=Release -DCMAKE_TRY_COMPILE_CONFIGURATION=Release -DCMAKE_POLICY_DEFAULT_CMP0141=NEW -DCMAKE_MSVC_DEBUG_INFORMATION_FORMAT=Embedded -DCUDAToolkit_ROOT="%CUDA_PATH%" -DGGML_NATIVE=OFF -DBUILD_SHARED_LIBS=ON
if errorlevel 1 exit /b 1
cmake --build tools/engine-build --target mm-server -j 6
if errorlevel 1 exit /b 1
exit /b 0
