# Lokální modely

| Model | Výchozí profil | Charakter |
|---|---|---|
| ACE-Step 1.5 XL SFT | XL SFT, hudební LM 4B, embedding a VAE BF16; 50 kroků, guidance 7, shift 1, WAV24/48 kHz | Výchozí profil na ověřené 16GB sestavě. Explicitní jazyk cs, vlastní slova odděleně od captionu. |
| YuE2 3B | BF16, VAE F32; cot=full, 32 kroků, semantic CFG 1, WAV24/48 kHz | Plán melodie a akordů. CC BY-NC 4.0; česká výslovnost může být méně přesná. |
| MiniMax-Music3 | Na 16GB GPU LM/RVQ/DiT Q8, kondicionér a vokodér F32; 30 kroků, LM CFG 1,5, DiT CFG 1,7 | Další charakter kompozice. BF16 LM/RVQ se automaticky volí až s dostatkem paměti. |
| Qwen3 8B | Q5_K_M, samostatný llama.cpp proces | Návrh textu a hudební režie. Před inferencí hudby uvolní GPU. |
| Whisper small | whisper.cpp v1.9.2, CPU, 4 vlákna; model 488 MB | Orientační porovnání zazpívaných slov s textem. Nepoužívá text písně jako nápovědu. |

ACE dostává stručný caption a samostatná metadata. YuE2 vlastní stylový popis. MiniMax Structured Caption s Global Metadata, Vocal Details a Arrangement. Parametry enginů se nezaměňují.

Automatická délka vychází z řádků, slabik, tempa a struktury. YuE2 dostává instrumentální rezervu; explicitní délka zůstává zachovaná. Dosažení časového limitu YuE2 vyvolá upozornění na možný chybějící konec nebo slova.

Správce odstraňuje pouze soubory z manifestů a jejich .part stažení. Spravované procesy nejprve uvolní. Vlastní GGUF mimo vybranou složku se nemaže. Hotová audio zůstávají přehratelná i po odinstalaci modelu.

Připnuté zdroje a hashe: resources/ace/manifest.json, resources/yue/manifest.json, resources/models/upstream.json, resources/planner/manifest.json.

## Porovnání a kontrola výsledků

Jednoduchá tvorba nabízí jednu, dvě nebo tři nezávislé kompozice. Výchozí jsou dvě, s přibližně dvojnásobnou dobou tvorby. Každá má vlastní uložený hudební i syntetizační seed. Všechny výsledky zůstávají v knihovně.

Po uložení audia se kontroluje celé dekódování, neplatné vzorky, přesah digitálního rozsahu, opakované ploché špičky, dlouhá tichá místa a dosažené generovací limity. Běžná normalizace na 0 dBFS sama o sobě není přebuzení. Tichá místa a zkreslení mohou být záměrná; upozornění vyžadují poslech.

U vokální tvorby je výchozí lokální kontrola slov. Při prvním použití stáhne připnutý Whisper model s ověřením SHA-256. Lze ji vypnout u zadání a model odinstalovat ve správci. CPU kontrola přidává čas, nevyužívá cloud ani paměť GPU. Technická kontrola funguje i bez Whisperu.

Přepis zpěvu může chybovat. Zobrazená shoda slov není měřítko výslovnosti ani emocí. Rozpoznávač nedostává očekávané verše jako nápovědu. Opakované halucinace a pouhé popisy zvuků se označují jako nespolehlivé a nepoužijí se pro výběr kompozice.

Porovnání pracuje pouze s jednou dokončenou skupinou. Upřednostňuje méně konkrétních upozornění; orientační chybu přepisu zohlední jen při dostupných srovnatelných kontrolách. Při shodných výsledcích neurčí favorita. Hudební žánr, melodie a emoce zůstávají nehodnocené. Zrušení kontroly ponechá hotové audio uložené; přerušenou kontrolu lze spustit znovu.

Whisper runtime a model: resources/quality/manifest.json. V instalaci je runtime pod resources/planner/quality, aby aktualizaci přijala i verze 1.1.0. [Whisper.cpp](https://github.com/ggml-org/whisper.cpp), [model](https://huggingface.co/ggerganov/whisper.cpp).

Zdroje: [ACE XL SFT](https://huggingface.co/ACE-Step/acestep-v15-xl-sft), [ACE inference](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INFERENCE.md), [YuE2](https://github.com/tidesea/yue), [yue2.cpp](https://github.com/ServeurpersoCom/yue2.cpp), [MiniMax](https://github.com/MiniMax-AI/MiniMax-Music3), [Qwen3](https://huggingface.co/Qwen/Qwen3-8B).
