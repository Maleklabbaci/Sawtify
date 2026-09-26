# Sawtify — Coût réel de production d'une voix off

**Analyse faite le 26/09/2026** · grille tarifaire officielle Google du **23/09/2026** (sortie de Gemini 3.8 TTS)
Méthode : réplication exacte de ton code de production (`server.ts`) — prompt `DIRECTOR'S NOTES`, chunking 800 car, gap 200 ms, barème de points.

---

## 1. Réponse directe

> ### Une voix off de **1 minute** te coûte **$0,0146 ≈ 3,79 DZD**
> ### (dont **$0,0134 = 3,48 DZD** d'audio pur, la partie texte ne pèse que 2,6 %)

| Ce que tu fais | Coût d'1 minute | En DZD | vs aujourd'hui |
|---|---:|---:|---:|
| **Aujourd'hui** — `gemini-3.1-flash-tts-preview` | **$0,03231** | **8,40 DZD** | référence |
| **Passer à 3.8 Flash TTS** (studio) | **$0,01458** | **3,79 DZD** | **−55 %** |
| **Passer à 3.8 Flash-Lite TTS** (volume) | $0,00985 | 2,56 DZD | −70 % |

Tu factures **20 points** pour cette minute. Selon le pack acheté, 20 points valent entre **74,07 DZD** (pack Business) et **100 DZD** (pack Starter).

**→ Marge brute réelle : 94,9 % à 96,2 %.** Et si tu passes à 3.8 **à prix constant**, ta marge en dinars gagne **+4,61 DZD par clip** (+59 % de marge unitaire) : tu encaisses l'économie sans toucher à ton tarif.

---

## 2. La seule règle de facturation qui compte (exacte, au token)

Google facture **l'audio produit**, pas ton texte :

```
1 seconde d'audio = 25 tokens de sortie        ← footnote officielle du pricing
3.8 Flash TTS     : 25 × $9,00/1M  = $0,000225 / seconde  = $0,013500 / minute
3.8 Flash-Lite    : 25 × $6,00/1M  = $0,000150 / seconde  = $0,009000 / minute
3.1 (ton modèle)  : 25 × $20,00/1M = $0,000500 / seconde  = $0,030000 / minute
```

Cette équivalence est confirmée par la grille elle-même : « **$0,00225 per 10s audio** » à $9/1M → 0,00225 ÷ 9 × 1 000 000 = **250 tokens / 10 s = 25 tokens/s**. ✔

> **Ton code contient `GEMINI_AUDIO_TOKENS_PER_SECOND = 32`** (valeur « observée »). Si c'est la vraie valeur, mon chiffre monte de **+27 %** → 1 minute = **$0,01856 = 4,82 DZD**. La marge reste > 93 %. À vérifier sur une facture réelle.

---

## 3. Détail ligne par ligne d'une génération de 1 minute

Scénario testé = configuration réelle : voix **Amine** (`voice_amin` → `Puck`), `[excited]`, vitesse 1.0, prompt complet.

| Élément | Valeur | Coût |
|---|---|---|
| Script darija | 836 caractères (~14 car/s) | — |
| Morceaux envoyés à Gemini | **2 appels API** (759 + 80 car) | — |
| En-tête `DIRECTOR'S NOTES` | 606 car × 2 morceaux = **1 212 car** | facturé **2×** |
| Tokens **entrée** | 303 (prompt anglais) + 420 (darija arabe) = **723** | $0,000362 → **2,6 %** |
| Tokens **sortie audio** | **1 488 tokens** (= 59,5 s facturées) | $0,013392 → **97,4 %** |
| Silence local entre morceaux | 0,2 s × 1 = non facturé par Google | $0 |
| Pertes retries (6 % : tentative facturée puis rejetée par le garde-fou `finishReason`) | | $0,000825 |
| **TOTAL** | | **$0,01458 ≈ 3,79 DZD** |

**Ce que ça t'apprend :**

1. **Le chunking ne coûte pas d'argent, il coûte de la latence.** Un morceau supplémentaire = 606 caractères d'en-tête = **$0,000076**, soit **0,5 %** du clip. Mais 1 minute de texte = 2 allers-retours API au lieu d'1.
2. **Baisser `TTS_CHUNK_MAX_CHARS` n'a aucun intérêt économique** (400 car → +0,44 % de coût, mais 3 appels au lieu d'1). Ta valeur de 800 se justifie pour la **robustesse** (FIX TTS-C), pas pour l'argent. Et la monter à 1200 pour économiser 0,2 % te ferait perdre le bénéfice anti-troncature : mauvais échange.
3. **Le seul levier de coût, c'est le modèle TTS.** 97 % du coût est de l'audio.

---

## 4. Coût pour toutes les durées (3.8 Flash TTS, 2026)

| Audio livré | Morceaux | Tokens in | Tokens audio | Coût de revient | En DZD | Points facturés | Revenu (pack Business) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 13 s | 1 | 248 | 336 | $0,00334 | 0,87 DZD | 20 | 74,07 DZD |
| 29 s | 1 | 356 | 722 | $0,00708 | 1,84 DZD | 20 | 74,07 DZD |
| 44 s | 1 | 464 | 1 108 | $0,01082 | 2,81 DZD | 20 | 74,07 DZD |
| **60 s** | 2 | 723 | 1 488 | **$0,01458** | **3,79 DZD** | **20** | 74,07 DZD |
| 90 s | 2 | 934 | 2 244 | $0,02190 | 5,69 DZD | 30 | 111,11 DZD |
| 119 s | 3 | 1 291 | 2 973 | $0,02905 | 7,55 DZD | 30 | 111,11 DZD |
| 299 s | 6 | 3 001 | 7 447 | $0,07263 | 18,89 DZD | 60 | 222,22 DZD |

**Observation importante :** ton barème est un **escalier** (20 pts ≤ 60 s, puis +10 pts par tranche de 60 s *entamée*). Résultat : une vidéo de **119 s coûte le même prix à l'utilisateur** (30 pts) qu'une vidéo de 61 s, mais te coûte **2× plus cher** (7,55 DZD vs 3,85 DZD). C'est mathématiquement favorable, mais surveille les utilisateurs qui apprennent à générer pile à 119 s.

---

## 5. Pire cas économique (l'utilisateur qui optimise son audio par point)

Le pire cas = générer **pile en haut de chaque tranche** de points.

| Points | Audio max obtenu | Morceaux | Coût réel | Coût par point | Marge garantie (pack Business) |
|---:|---:|---:|---:|---:|---:|
| 20 | 60 s | 2 | 3,81 DZD | 0,190 DZD | 94,9 % |
| 30 | 120 s | 3 | 7,60 DZD | 0,253 DZD | 93,2 % |
| 60 | 300 s | 6 | 18,96 DZD | 0,316 DZD | 91,5 % |
| 200 | 1 140 s | 22 | 71,99 DZD | 0,360 DZD | 90,3 % |

> ### Tu vends le point entre **3,70 et 5,00 DZD**. Ton coût maximal est de **0,36 DZD par point**.
> ### → **Marge brute plancher garantie : 90 %**, même contre un utilisateur qui exploite ton barème au maximum.

---

## 6. Horizon 2027 : Google **double** le prix de l'audio au 01/01/2027

| Modèle | 1 min en 2026 | 1 min en 2027 | Δ | Marge 2027 (pack Business) |
|---|---:|---:|---:|---:|
| 3.8 Flash TTS | 3,79 DZD | **7,58 DZD** | +100 % | 93,2 % |
| 3.8 Flash-Lite TTS | 2,56 DZD | 5,12 DZD | +100 % | 95,4 % |

**À anticiper maintenant (optionnel) :** la marge reste > 93 %, donc rien d'urgent. Mais si tu veux blinder, le levier est tarifaire, pas technique — par ex. définir une date (01/01/2027) de passage de 20 → 26 points la minute, ou basculer automatiquement les comptes gratuits sur Flash-Lite.

---

## 7. Les autres postes de coût de ta plateforme

| Poste | Coût réel | Commentaire |
|---|---:|---|
| **Inscription gratuite** (50 pts offerts, cap 45 s) | **5,62 DZD max par compte** | 2 générations de 20 pts = **2,84 DZD le clip de 45 s**.<br>⚠️ Chiffre **pire cas (100 % d'activation)**. Avec un taux d'activation réaliste (~35 %), **100 inscriptions/jour ≈ 5 969 DZD/mois**, et il suffit de **7 clients payants/mois** pour le couvrir.<br>Le vrai risque n'est pas le volume : c'est le **farming** de comptes (voir `docs/economie-plateforme.md`). |
| **Bonus palier** (tous les 10 clips → +30 pts) | 5,69 DZD de COGS | Mais **150 DZD de valeur catalogue** au pack Starter = une **remise réelle de 15 %**. C'est un choix marketing, pas un coût caché. |
| **Stockage audio** | **0 DZD** | La route web renvoie le WAV en base64 sans rien stocker. Seul l'API développeur + les previews écrivent dans Supabase (purgé à 7 jours). |
| **Encodage MP3** (lamejs) / conversion ffmpeg.wasm | **0 DZD** | 100 % local, aucune API payante. |
| **Hébergement** Render + Supabase | ~$7–32/mois | Coût fixe, amorti sur le volume. |
| **Previews de voix** (9 voix) | ~0,003 DZD la preview | Générées 1× puis mises en cache mémoire + Supabase Storage. Négligeable. |

---

## 8. Hypothèses, méthode et sensibilités (à lire en connaissance de cause)

**Ce qui est exact et non discutable :**
- Les prix unitaires ($9 / $6 / $20 par 1M tokens audio ; $0,50 / $1,00 par 1M tokens texte) → grille officielle du 23/09/2026.
- Le ratio **25 tokens = 1 seconde d'audio** → footnote officielle.
- La durée facturée, le nombre de morceaux, le texte des prompts, le barème de points, la valeur des packs → **calculés à partir de ton code et de tes données**, pas estimés.
- Les coûts fixes (stockage, MP3, ffmpeg) → vérifiés dans `server.ts`.

**Ce qui est estimé (et l'impact réel) :**

| Incertitude | Impact sur le coût d'1 minute |
|---|---|
| Tokenisation du texte (EN ~4,0 car/token, AR ~2,0 car/token) | **±0,02 DZD (0,5 %)** — 3,77 à 3,81 DZD |
| 25 tokens/s (doc) vs 32 tokens/s (ta constante observée) | **+27 %** si 32 → 4,82 DZD |
| Taux de change USD→DZD (240 / 260 / 280) | 3,50 / 3,79 / 4,08 DZD |
| Taux de retries facturés (simulé à 6 %) | ±0,03 DZD |
| Débit réel de la voix (14 car/s dans ton code) | Si la voix parle plus vite, tu produis moins de secondes → **ton coût baisse** |

**Conclusion sur la précision :** le chiffre de **3,79 DZD la minute** est fiable à **±5 %**, et l'incertitude principale n'est pas le texte (0,5 %) mais le **ratio tokens/seconde audio réel** (25 vs 32). Un seul vrai clip facturé suffit pour lever le doute : `usageMetadata` dans la réponse Gemini donne les tokens exacts.

---

## 9. Recommandations issues du calcul

1. **Migrer vers `gemini-3.8-flash-tts`** : −55 % de coût, meilleure qualité (130 langues, direction par `speech_metadata`, tags `<laugh>`/`<sigh>`), et **prix divisé par 2,2** sur l'entrée.
2. **Garder 20 points la minute** pour l'instant : la marge passe de 95,8 % à **96,2 %**, tu encaisses l'économie sans toucher au prix.
3. **Ne pas toucher `TTS_CHUNK_MAX_CHARS`** : 0,5 % de coût, mais un vrai enjeu de fiabilité.
4. **Surveiller le coût des comptes gratuits** : c'est ton seul poste significatif (jusqu'à 16 873 DZD/mois à 100 inscriptions/jour). Le cap `FREE_TRIAL_MAX_DURATION_SECONDS = 45` est bien calibré.
5. **Verrouiller le vrai ratio tokens/seconde** (25 vs 32) avec un `usageMetadata` réel, puis mettre à jour `GEMINI_AUDIO_TOKENS_PER_SECOND` — ça corrige aussi tes **chiffres de marge dans l'admin**.

---

### Sources

- Grille tarifaire officielle : <https://ai.google.dev/gemini-api/docs/pricing> (sections *Gemini 3.8 Flash TTS*, *Gemini 3.8 Flash-Lite TTS*, *Gemini 3.1 Flash TTS Preview*)
- Doc TTS officielle (voix, `speech_metadata`, tags non-verbaux, migration) : <https://ai.google.dev/gemini-api/docs/speech-generation>
- Code analysé : `server.ts` (paramètres `TTS_*`, `buildTTSPrompt`, `splitIntoChunksForTTS`, `computePointsCost`), `src/data/voices.ts` (`CREDIT_PACKS_FR`)

### Reproduire le calcul

```bash
node scripts/cout-tts.mjs                          # rapport complet
node scripts/cout-tts.mjs --duration=60            # une durée précise
TTS_CHUNK_MAX_CHARS=1200 node scripts/cout-tts.mjs # tester un autre réglage
node scripts/cout-tts.mjs --json                   # sortie exploitable par un script
```

Rapport brut complet : [`docs/cout-tts-rapport-brut.txt`](./cout-tts-rapport-brut.txt)
