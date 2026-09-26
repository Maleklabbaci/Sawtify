# Sawtify × Gemini 3.8 TTS — Analyse avant développement

*Base : documentation officielle TTS de Google (pages `speech-generation` + `generate-content/speech-generation`, mises à jour le 24/09/2026).*

> ⚠️ **Note** : tes 2 PDF ne sont pas arrivés dans mon espace de travail (dossier d'upload vide). J'ai donc travaillé directement sur la **source officielle Google** dont tes PDF sont issus. Si tes PDF contiennent des pages différentes, renvoie-les et je réajuste.

---

## 🚨 PARTIE 1 — Les 5 choses qui CASSENT ton code actuel

Ton `server.ts` est construit pour l'ancien modèle (`gemini-3.1-flash-tts-preview`). Le passage à 3.8 **n'est pas un simple changement de nom de modèle**. Voici les 5 ruptures :

### ① Ton prompt « DIRECTOR'S NOTES » est devenu un ANTI-PATTERN ← **le plus grave**

La doc dit noir sur blanc, dans le **guide de migration** :

> *« Replace multi-paragraph `Audio Profile` or `Director's Notes` blocks with a custom voice created in Voice design »*
>
> *« Long-form `Audio Profile` paragraphs and multi-bullet `Director's Notes` carried over from earlier models are the **most common cause of voice drift**. »*

Ton `buildTTSPrompt()` s'appelle littéralement `DIRECTOR'S NOTES` et envoie :
```
DIRECTOR'S NOTES
Speaker: Amin, a young friendly Algerian man...
Language: Algerian Darija (Arabic script)...
Pace: Natural conversational pace.
Tone: Start excited and high-energy...
```

**En 3.8, ça provoque exactement ce que tu veux éviter : la dérive de la voix.** Le nouveau modèle s'ancre sur la référence audio du `voice` d'abord, pas sur du texte descriptif.

Le remplacement officiel : `speech_metadata.style` (un champ séparé, pas du texte lu).

### ② Tes balises d'émotion utilisent les MAUVAIS crochets

| | Ton code actuel | Gemini 3.8 |
|---|---|---|
| Syntaxe | `[excited]`, `[whispers]` | `<laugh>`, `<sigh>`, `<short pause>` |
| Crochets | **carrés** `[ ]` | **angle** `< >` |

La doc : *« **Use angle brackets for inline vocal tags**: Use angle brackets (`<laugh>`, `<sigh>`, `<cough>`, `<breath>`, `<short pause>`) … Avoid non-vocal sound-effect tags (such as applause or thuds). »*

👉 **Et attention à ta demande « plus de sons autres que la parole »** : Google autorise **uniquement les sons HUMAINS** (rire, soupir, toux, respiration…). **Pas** d'applaudissements, pas de bruitages, pas de sons d'objets. C'est une limite du modèle, pas un choix.

### ③ Le format audio change : WAV au lieu de PCM brut

| | 3.1 (ton code) | 3.8 |
|---|---|---|
| Requête normale | PCM brut **sans en-tête** | **WAV complet** avec en-tête RIFF |

Ton code fait `pcmToWavBuffer()` à la main. Avec 3.8, ça **ajouterait un 2ᵉ en-tête WAV** → fichier corrompu, ou à l'inverse un WAV lu comme du PCM. **Bug garanti si on ne touche à rien.**

Solution : soit on accepte le WAV natif, soit on demande explicitement `AUDIO_L16` pour garder le PCM brut comme avant.

### ④ Les noms de champs changent

| | Ancien | Nouveau (3.8) |
|---|---|---|
| Voix | `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` | `speechConfig.voiceConfig.voice` |
| Style | *(dans le texte)* | `parts[].speech_metadata.style` |
| Dialogue | *(dans le texte)* | `speechConfig.multiSpeakerVoiceConfig` + `speech_metadata.speaker` |

### ⑤ Ton chunking de 800 caractères devient contre-productif pour la précision

La doc insiste : *« Split long agent responses into shorter turns »* et *« extra prompt text increases drift »*.
Avec 3.8, **chaque morceau repart de zéro sur le style**. Couper à 800 caractères = jusqu'à 7 « redémarrages » de voix sur un long texte.

→ À revoir : monter le seuil **car la raison du chunking a changé** (avant : couper le coût et éviter la troncature ; maintenant : ne pas casser la continuité de jeu).

---

## ✅ PARTIE 2 — Les 33 sons humains disponibles (ta demande « plus de sons »)

Liste officielle complète des balises `<...>` :

| | | | |
|---|---|---|---|
| `<argh>` | `<breath>` | `<heavy breath>` | `<exhales>` |
| `<cackle>` | `<cheer>` | `<chuckle>` / `<chuckles>` | `<cough>` |
| `<cry>` | `<gasp>` | `<giggle>` | `<groan>` |
| `<growl>` | `<grunt>` | `<grr>` | `<hiss>` |
| `<laugh>` / `<laughter>` | `<moan>` | `<pant>` | `<pff>` / `<phew>` |
| `<scream>` | `<shout>` | `<shriek>` | `<sigh>` / `<sighs>` |
| `<sneeze>` | `<snicker>` | `<snort>` | `<sob>` |
| `<throat-clearing>` | `<tsk>` | `<whimper>` | `<whispers>` / `<whispering>` |
| `<yawn>` | `<short pause>` | `<long pause>` | |

**Aujourd'hui tu en utilises 9** (et avec les mauvais crochets). **On passe à 33.** 🎯

### Les 2 autres armes de précision que tu n'utilises pas

**1. L'emphase par MAJUSCULES** — la doc : *« Capitalize specific words in the transcript to place natural vocal stress »*
```
هذا أمر مهم جداً!  →  هذا أمر VERY مهم جداً!
```

**2. Les disfluences naturelles** — *« write the text as a real spoken transcript—including natural conversational disfluencies and hesitations »*
```
"واش راكم خاوتي، آآآ... كيفاش نقولها ليكم، يعني هكاك"
```
👉 **C'est LE levier n°1 de naturel pour la darija.** Personne ne parle en texte propre.

---

## 🎙️ PARTIE 3 — Plus de voix : tu en as 9, tu peux en avoir des centaines

### A. 30 voix studio (les valeurs sûres)

Zephyr *(Bright)* · Puck *(Upbeat)* · Charon *(Informative)* · Kore *(Firm)* · Fenrir *(Excitable)* · Leda *(Youthful)* · Orus *(Firm)* · Aoede *(Breezy)* · Callirrhoe *(Easy-going)* · Autonoe *(Bright)* · Enceladus *(Breathy)* · Iapetus *(Clear)* · Umbriel *(Easy-going)* · Algieba *(Smooth)* · Despina *(Smooth)* · Erinome *(Clear)* · Algenib *(Gravelly)* · Rasalgethi *(Informative)* · Laomedeia *(Upbeat)* · Achernar *(Soft)* · Alnilam *(Firm)* · Schedar *(Even)* · Gacrux *(Mature)* · Pulcherrima *(Forward)* · Achird *(Friendly)* · Zubenelgenubi *(Casual)* · Vindemiatrix *(Gentle)* · Sadachbia *(Lively)* · Sadaltager *(Knowledgeable)* · Sulafat *(Warm)*

### B. Bibliothèque étendue — « des centaines de voix »

Accessible par un appel : `GET /v1beta/voices`

Filtres disponibles : `language_code` · `region_code` · `accent` · `gender` · `pitch` · `persona` · `contexts` · `search` · `page_size` (max 1000)

👉 **Tu peux automatiquement importer toutes les voix arabes / françaises** et les proposer à tes utilisateurs.

### C. 🎨 Design de voix (le plus gros levier pour la darija)

**Créer une voix sur mesure à partir d'une description en texte.** Exemple pour toi :
> *« Homme algérien de 30 ans, accent d'Alger, chaleureux et direct, comme s'il parlait à un ami dans un café. »*

→ Google renvoie un identifiant permanent (`voice_...`) + un aperçu audio.
**Ça règle exactement le problème de « pas assez local » que tu as avec les voix génériques.**

### D. 🧬 Réplication de voix (clonage)

Cloner une voix à partir d'un échantillon audio + consentement.
⚠️ **Limites importantes** : `200 voix maximum par projet` · `durée de vie 1 an` · stateless = 7 jours.

### E. 🇩🇿 Point important pour le marché algérien

Google supporte officiellement :
- **Arabe standard (écriture arabe)** ✅ 3.8 Flash + Flash-Lite
- **Arabe égyptien** ✅ les deux
- **Kabyle** ✅ **uniquement sur 3.8 Flash** (❌ pas sur Flash-Lite) ← langue amazighe d'Algérie !

⚠️ **Le Flash-Lite ne supporte PAS** le finnois, l'islandais, l'igbo, le swahili, le suédois, le thaï, le slovène, le somali, le tadjik, le tigrinya, l'ouïghour… Fais attention si on l'utilise pour les comptes gratuits.

---

## 🔔 PARTIE 4 — Les capacités que tu n'exploites pas du tout

| Fonction | Ce que ça donne | Intérêt pour Sawtify |
|---|---|---|
| **`speech_metadata.style`** | Style soutenu sur tout un passage | Remplace ton « Director's Notes » — plus précis, zéro dérive |
| **Dialogue 2 voix** | 2 voix qui discutent, un seul appel | **Podcast publicitaire** — produit vendable plus cher |
| **Backchannels `\|oh hmm\|`** | Réactions du 2ᵉ interlocuteur **par-dessus** la voix active | Réalisme radio/TV, très impressionnant |
| **Emphase MAJUSCULES** | Accent naturel sur un mot précis | Precision publicitaire |
| **`<short pause>` / `<long pause>`** | Silence exact à un endroit précis | Timing, respiration |
| **Formats de sortie** | WAV natif · PCM L16 · **μ-law / A-law téléphonie 8 kHz** | Nouveau marché : serveurs vocaux téléphoniques |
| **Streaming** | Audio joué en direct pendant la génération | Latence perçue ÷ 3 |

---

## ❓ PARTIE 5 — Mes questions

*(en cours de réponse — voir la conversation)*
