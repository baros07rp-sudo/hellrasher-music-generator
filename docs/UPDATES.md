# Aktualizace z GitHub Releases

Aplikace kontroluje stabilní vydání repozitáře baros07rp-sudo/hellrasher-music-generator. Kontrolu po spuštění lze vypnout; nic se nestahuje ani neinstaluje samo.

1. Otevřete **Aktualizace** a **Zkontrolovat aktualizace**.
2. **Stáhnout aktualizaci** ověří digest SHA-256 z GitHub Releases a SHA-256 každého souboru manifestu.
3. **Restartovat a aktualizovat** uloží projekt a po ukončení aplikace nahradí její soubory. Při běžící tvorbě je restart zablokovaný.

ZIP mění pouze aplikační soubory v resources/. Neobsahuje váhy a databáze. Spouštěč Electronu se ověřuje připnutým SHA-256 a zůstává stejný. Pomocník běží v Node režimu stávajícího Electronu. Nevyžaduje změnu zásad PowerShellu. Před nahrazením zálohuje dotčené soubory; při chybě je obnoví. Záznam je v uživatelské složce Updates/apply.log.

Nedostupný GitHub nebo dosud nevydaná aktualizace se nevydávají za potvrzení aktuálnosti. Tvorba zůstává místní.

## Příprava vydání

- Zvyšte aplikační verzi v electron/version.cjs a package.json (appVersion).
- Sestavte a otestujte aplikaci podle DEVELOPMENT.md.
- `pnpm package:update` vytvoří aktualizační ZIP a manifest.
- `node scripts/github-release.mjs` publikuje ZIP k odpovídajícímu tagu. Používá přihlášení z Git Credential Manageru; token se neukládá do kódu ani balíčku.

ZIP je aktualizace existující instalace. První instalační runtime, CUDA, FFmpeg a váhy se do něj nepřibalují. Změna Electron spouštěče vyžaduje nový ověřený instalační postup.

Zdroje: [GitHub Releases API](https://docs.github.com/en/rest/releases/releases), [Electron ASAR jako soubor](https://www.electronjs.org/docs/latest/tutorial/asar-archives#treating-an-asar-archive-as-a-normal-file).
