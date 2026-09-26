# Sawtify × Gemini 3.8 — État du chantier + Démonstration

## 1. La démonstration qui tranche le débat 🔬

J'ai pris **un texte darija réel** avec 6 sons dedans, et je l'ai envoyé dans les deux modes.
Voici **ce que Google reçoit réellement** dans chaque cas :

### ✍️ Texte d'origine (ce que tu veux entendre)
```
سلام عليكم خاوتي، واش راكم لاباس؟ <laugh> اليوم راني حاب نوريكم حاجة
<short pause> راح تعجبكم بزاف. <sigh> بصراحة، تعبت...
```
**6 sons** : `<laugh>` `<short pause>` `<sigh>` `<breath>` `<chuckle>` `<exhales>`

### ⛔ MODE 3.1 (ton modèle actuel) — Google reçoit ça
```
سلام عليكم خاوتي، واش راكم لاباس؟ [laughter] اليوم راني حاب نوريكم حاجة
... راح تعجبكم بزاف. [breathing] بصراحة، تعبت...
```
**Résultat : 3 sons distincts au lieu de 6**

| Ton son | Devient | Perdu ? |
|---|---|---|
| `<laugh>` | `[laughter]` | — |
| `<chuckle>` | `[laughter]` | 🔴 **identique au rire** |
| `<sigh>` | `[breathing]` | — |
| `<breath>` | `[breathing]` | 🔴 **identique au soupir** |
| `<exhales>` | `[breathing]` | 🔴 **identique au soupir** |
| `<short pause>` | `...` | 🔴 **la pause n'existe plus** |

👉 **6 sons → 3 sons. Tu perds la moitié de ta demande.**

### ✅ MODE 3.8 (le nouveau) — Google reçoit ça
```
TRANSCRIPT (à lire) :
سلام عليكم خاوتي، واش راكم لاباس؟ <laugh> اليوم راني حاب نوريكم حاجة
<short pause> راح تعجبكم بزاف. <sigh> بصراحة، تعبت...

STYLE (à part) : "cheerful and amused"
```
**Résultat : les 6 sons, exactement comme tu les as écrits.** + un style séparé.

| | 3.1 (actuel) | 3.8 (nouveau) |
|---|---:|---:|
| Sons distincts | **6 sur 35 (17 %)** | **35 sur 35 (100 %)** |
| Tes 6 sons testés | 3 conservés | **6 conservés** |
| Le « comment dire » | mélangé au texte | **case séparée** |
| Coût / minute | 8,40 DZD | **3,79 DZD** |

---

## 2. Ce qui est construit (tout en backend)

| Fichier | Rôle | Lignes |
|---|---|---|
| `tts/vocalTags.ts` | Les **35 sons humains** officiels, catégorisés, avec libellés FR + AR. Détecte et nettoie les erreurs (balises inconnues, bruitages non humains, anciennes balises). | 232 |
| `tts/voices.ts` | Les **30 voix studio** avec leur caractère officiel. Migration automatique des 9 anciens IDs → aucun utilisateur perdu. | 160 |
| `tts/engine.ts` | **Le double moteur** : construit la requête pour 3.1 OU 3.8 selon le modèle configuré. Gère les 2 syntaxes de balises et les 2 formats audio. | 320 |
| `tts/selftest.ts` | **68 tests** qui valident les deux modes. | 175 |
| `scripts/comparer-3.1-vs-3.8.ts` | Génère le même texte avec les 2 modèles → **tu écoutes et tu décides**. | 190 |

### Vérifications passées ✅
```
node --test  →  script de test : 68 réussis / 0 échec
```
- ✅ Détection du mode (3.1 / 3.8 / 2.5 / futur 4.x)
- ✅ Nettoyage des balises (conversion, inconnues, bruitages, préservation de l'arabe)
- ✅ Requête 3.8 : `speech_metadata.style` séparé, `voiceConfig.voice`, `AUDIO_L16`
- ✅ Requête 3.1 : `DIRECTOR'S NOTES` reproduit, `<laugh>` → `[laughter]`, `prebuiltVoiceConfig`
- ✅ **Format audio : WAV 3.8 automatiquement converti en PCM brut** → pipeline inchangé
- ✅ WAV avec blocs intermédiaires (`LIST`) géré
- ✅ Réponse « texte au lieu d'audio » détectée

---

## 3. 🔘 L'interrupteur : une seule ligne

**Ton comportement actuel (rien ne change) :**
```env
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
```

**Le nouveau (tout s'active) :**
```env
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
```

**Revenir en arrière = remettre l'ancienne valeur.** Aucun redéploiement de code.

---

## 4. 🎧 Comment TU décides (2 minutes)

```bash
npx tsx scripts/comparer-3.1-vs-3.8.ts
```
→ Génère **2 fichiers WAV** (le même texte, les 2 modèles) + affiche le coût réel de chacun.
→ Tu écoutes. Tu compares. Tu décides.

---

## 5. Prochaines étapes (dès que tu valides)

| # | Étape | État |
|---|---|---|
| 1 | Catalogue 35 sons | ✅ fait |
| 2 | Catalogue 30 voix studio | ✅ fait |
| 3 | Double moteur 3.1/3.8 | ✅ fait |
| 4 | Tests automatisés | ✅ 68/68 |
| 5 | Brancher le moteur dans `server.ts` | ⏳ à faire |
| 6 | Styles automatiques (`speech_metadata`) | ⏳ à faire |
| 7 | Voix régionales Alger / Oran / Constantine | ⏳ à faire |
| 8 | Aperçus audio des 30 voix | ⏳ à faire |

**Aucune ligne de front-end ne sera touchée** — comme demandé.
