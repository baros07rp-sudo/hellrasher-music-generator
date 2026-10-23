# Licence a původ komponent

Veřejný repozitář obsahuje aplikační zdroje a aktualizační balíček pro existující instalace. Modelové váhy, FFmpeg a NVIDIA runtime DLL nejsou součástí veřejného aktualizačního balíčku. Následující soupis je technická evidence z přiložených zdrojů; otevřené redistribuční podmínky nejsou označeny jako právně vyřešené.

## MiniMax-Music3

Originální úplný text včetně Exhibit A/AUP: `resources/legal/MiniMax-Music3-LICENSE.txt`.

Zdroj: https://huggingface.co/MiniMaxAI/MiniMax-Music3/blob/main/LICENSE . Ověřeno z aktuálně staženého originálu. Licence se vztahuje i na GGUF váhy. Modely jsou z `Serveurperso/MiniMax-Music3-GGUF`, revize `d4f7a6402a4ca10c8b3ca2f648c8a46c103558bc`; soubor `resources/models/upstream.json` obsahuje jména, velikosti a SHA-256.

Podmínky zahrnují uchování oznámení, dodržení zákonů, práv třetích stran a AUP. Komerční produkty musí viditelně uvádět **MiniMax-Music3**, což rozhraní obsahuje. Nad souhrnný roční příjem 20 milionů USD ze souvisejících produktů/služeb je požadována předchozí písemná autorizace MiniMax. Zpřístupnění generátoru třetím osobám vyžaduje přiměřená technická a organizační ochranná opatření před zahájením i za provozu, testování a periodické revize. Pouhé upozornění či zaškrtnutí licence není důkazem splnění těchto povinností. Modelové váhy se stahují odděleně; veřejný aktualizační ZIP je neobsahuje.

Model odvozuje části od Qwen3-8B (Apache-2.0), stable-audio-tools (MIT) a descript-audio-codec (MIT); odkazy a oznámení obsahuje původní modelová licence. Oficiální caption rewriter byl prostudován jako dokumentace. Jeho knihovna tisíce šablon nebyla zkopírována do produktu; aplikace používá vlastní compiler a samostatný lokální jazykový plánovač.

## minimaxmusic.cpp a GGML

`minimaxmusic.cpp`: MIT, copyright upstream, originál `resources/legal/minimaxmusic.cpp-LICENSE.txt`. Zdroj: https://github.com/ServeurpersoCom/minimaxmusic.cpp . Revize a lokální patch jsou zaznamenány v `resources/backend/build.json` a `scripts/engine-tokenize.patch`.

GGML: MIT, původní text se přikládá v právních zdrojích. Inference dále obsahuje vendored cpp-httplib, yyjson a MP3 kodek; původní licenční texty se přebírají ze zdrojového stromu. Jejich úplná dostupnost se kontroluje při stagingu balíčku.

## NVIDIA CUDA

Přibalené runtime DLL: cuBLAS, cuBLASLt a CUDA runtime 13; Windows NVIDIA ovladač se nepřibaluje ani nemění. Originální NVIDIA CUDA EULA v `resources/legal/NVIDIA-CUDA-EULA.txt`. SDK pro sestavení je staženo z oficiálního NVIDIA redistribučního manifestu a každá stažená komponenta má ověřený SHA-256. Vývojové překladače nejsou součástí instalátoru. Pro veřejnou distribuci je potřeba ověřit konkrétní seznam redistribuovatelných součástí a související oznámení EULA.

## FFmpeg

Přiložený samostatný FFmpeg/ffprobe 9.0.2 essentials build od gyan.dev používá GPLv3 (obsahuje `--enable-gpl --enable-version3`). Originál GPLv3: `resources/legal/FFmpeg-GPL-3.0.txt`. Program je volán jako oddělený proces.

Zdroj vydání: https://www.gyan.dev/ffmpeg/builds/ . Zdroj FFmpeg: https://git.ffmpeg.org/ffmpeg.git . Pro veřejnou distribuci musí distributor zajistit odpovídající úplné zdrojové kódy konkrétního sestavení a přibalených GPL knihoven nebo jinou GPL přípustnou formu splnění povinností. Pouhý tento odkaz nenahrazuje povinnost poskytnout odpovídající zdroj. Veřejný aktualizační ZIP proto FFmpeg neobsahuje.

## Desktopové knihovny

Electron (MIT plus Chromium/Node third party notices), React a React DOM (MIT), lucide-react (ISC), fflate (MIT), Vite (MIT), TypeScript (Apache-2.0), electron-builder (MIT), Node.js a SQLite (jejich přiložená oznámení / SQLite public domain). Originální licence nainstalovaných balíčků se přikládají do `resources/legal/dependencies/`. Electron distribuce obsahuje `LICENSE.electron.txt` a `LICENSES.chromium.html`.

Ikona Hellrasher byla převzata z uživatelova existujícího lokálního projektu Hellrasher Music Studio. V tomto úkolu nebyla z původního projektu odstraněna ani změněna. Nové obecné ikony poskytuje lucide-react. Systémové fonty Windows se nepřibalují.

## Vývojové nástroje

Přenosné MSVC a Windows SDK slouží pouze k lokálnímu sestavení a mají vlastní podmínky Microsoft. Stažený pomocný `portable-msvc.py` není produkční runtime. Nástroje, SDK, modely a zdrojový vendor strom jsou v `.gitignore`; reprodukce vyžaduje jejich přípravu dle README.

## Lokální plánovač Qwen3 a llama.cpp

Qwen/Qwen3-8B-GGUF, Apache-2.0: připnutá revize a SHA-256 jsou v resources/planner/manifest.json, úplná licence v resources/legal/PromptPlanner-Qwen3-LICENSE.txt. Váhy se stahují odděleně. llama.cpp b11798 (MIT): původní licence resources/legal/llama.cpp-LICENSE.txt; přibalený LLVM OpenMP má vlastní LICENSE-LLVM-OpenMP. Archive SHA-256 CPU a Vulkan vydání jsou zaznamenány v manifestu. Externí ACE-Step API zůstává volitelné. Nově je přibalen také nativní acestep.cpp (MIT) a jeho vlastní GGML (MIT), v resources/legal/acestep.cpp-LICENSE.txt a ACE-GGML-LICENSE.txt. Modelové váhy ACE-Step XL SFT a 4B LM (MIT) se stahují odděleně podle resources/ace/manifest.json; licence v resources/legal/ACE-Step-MIT.txt. Qwen3 Embedding má Apache-2.0 (přiložená Qwen3-Apache-2.0.txt). CUDA runtime se sdílí s MiniMax backendem.


## YuE2

yue2.cpp (MIT), přesná revize a původ DLL v resources/yue/build.json; úplná licence resources/yue/LICENSE-engine.txt. Model YuE2 3B a VAE mají CC BY-NC 4.0: resources/yue/LICENSE-model.txt. Váhy se stahují zvlášť dle připnutého manifestu. Program u výběru modelu uvádí nekomerční omezení.
