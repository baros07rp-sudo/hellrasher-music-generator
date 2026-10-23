# Vývoj a testy

React, TypeScript, Vite a Electron s izolovaným preloadem a pevným seznamem IPC akcí. SQLite ukládá projekty, historii a metadata; audio a replay jsou samostatné soubory. Nativní enginy naslouchají pouze na loopbacku.

```sh
corepack enable
corepack pnpm@10.18.3 install --frozen-lockfile
corepack pnpm@10.18.3 test
corepack pnpm@10.18.3 build
```

Testy nevyžadují modely ani GPU. Ověřují koš, obnovu, migraci, bezpečné trvalé mazání, známé modelové soubory, backendové protokoly a aktualizace. Windows test spouští skutečný aktualizační helper nad dočasnou instalací.

Kontrola audia má testy skutečného dekódování, ticha, přebuzení, českých slov, nezávislých seedů, zachování audia při zrušení a obnovy přerušené kontroly. Test FFmpeg se bez připraveného runtime přeskočí. Automatické testy nepotvrzují hudební vkus ani kvalitu zpěvu.

`node scripts/create-usability-session.mjs` vytvoří oddělený profil pro UI se syntetickým sekundovým audiem a malými záměrně neúplnými soubory modelů. Nastavte HMG_DATA_PATH na vypsanou složku. Tento profil není zkouškou hudební inference.

## Nativní runtime a první balíček

Připnuté revize a hashe jsou v resources/*/build.json a manifestech. Enginy připravte v vendor/, MSVC/CUDA/CMake v tools/. SDK, váhy ani runtime binárky nejsou součástí repozitáře. Build a staging popisují scripts/build-*.cmd a scripts/stage-*.ps1. Pro jinou GPU architekturu upravte CUDA target. FFmpeg a NVIDIA DLL připravte odděleně s původními licencemi.

`node scripts/stage-quality.mjs` stáhne oficiální Windows CPU runtime Whisper.cpp v1.9.2, ověří SHA-256 archivu a připraví pouze CLI a potřebné GGML/Whisper DLL s licencí. Váhy se do balíčku nepřidávají; aplikace je spravuje odděleně ve složce models/Whisper.

```sh
corepack pnpm@10.18.3 build
corepack pnpm@10.18.3 exec electron-builder --win --x64 --dir --publish never --config.electronDist=node_modules/electron/dist
```

preserve-electron.cjs zachovává ověřený originální spouštěč a kontroluje připnutý uninstaller. Aplikační verze je oddělená od verze stávajícího instalačního runtime. Aktualizační ZIP mění aplikační zdroje.

Osobní knihovny, audio, modely, měření a zálohy se nikdy necommitují. .gitignore odděluje také SDK a neveřejné místní vývojové zprávy.
