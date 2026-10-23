# Hellrasher Music Generator

Česká desktopová aplikace pro místní tvorbu písniček na Windows. Modely **ACE-Step XL SFT**, **YuE2**, **MiniMax-Music3** a hudební režie Qwen3.

## Ovládání

- Model vyberete přímo nad zadáním; nabídka ukazuje jeho charakter a skutečný stav instalace.
- **Ze zadání** připraví text i hudbu. **Vlastní text** zachová vložené verše. Styl, hlas, struktura a délka se připravují automaticky; podrobnosti lze upravit.
- Písničky lze přehrát, přejmenovat, označit hvězdičkou, exportovat nebo použít jejich zadání v novém projektu.
- Knihovna nabízí hledání, filtrování podle modelu, řazení a hromadný výběr. Smazané skladby putují do **Koše**, odkud je lze obnovit. Trvalé smazání uvolní audio a replay; text projektu zůstává zachovaný.
- **AI modely** spravují celé sady i jednotlivé soubory, přerušená stažení a odinstalaci. Vlastní neznámé soubory se nemažou.
- **Aktualizace** kontrolují GitHub Releases, ověřují SHA-256 a nabídnou restart. Knihovna, váhy a spouštěč Electronu zůstávají zachované.

## Stažení a požadavky

[GitHub Releases](https://github.com/baros07rp-sudo/hellrasher-music-generator/releases) obsahují **aktualizační ZIP pro existující instalaci**. Není to samostatný první instalátor: neobsahuje Electron, NVIDIA runtime, FFmpeg ani váhy. První instalace a vývoj viz [vývojový postup](docs/DEVELOPMENT.md).

Ověřená sestava: Windows 11 x64, RTX 5060 Ti 16 GB, 32 GB RAM. Nativní enginy jsou připravené pro Blackwell `sm_120a`; jiné GPU potřebují odpovídající sestavení. Modely se stahují ze samostatných repozitářů s připnutými SHA-256.

**YuE2 má CC BY-NC 4.0 pro nekomerční použití.** Podmínky externích komponent jsou v [LICENSES.md](LICENSES.md) a původních přiložených licencích.

## Kvalita a místní provoz

Hudba a text vznikají místně. Při kontrole aktualizací se na GitHub neposílají hudební prompty ani písničky. Žánr, melodie, emoce a česká výslovnost závisejí na modelu a konkrétní kompozici; BF16 ani WAV24 nezaručují bezchybné výsledky.

[Modely](docs/MODELS.md) · [Aktualizace](docs/UPDATES.md) · [Vývoj a testy](docs/DEVELOPMENT.md)

Osobní knihovny, audio, váhy, místní měření, zálohy a přihlašovací údaje nejsou součástí repozitáře.
