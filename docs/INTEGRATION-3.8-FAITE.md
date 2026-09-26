# ✅ Intégration Gemini 3.8 TTS — FAITE

**Date : 26/09/2026** · Tout en backend, **aucune ligne de front-end touchée.**

---

## 1. La séparation que tu voulais (et qui est respectée)

Ton serveur utilise **2 modèles Gemini différents**. J'ai touché **UN SEUL** :

| | Ce que ça fait | Ligne | État |
|---|---|---|---|
| 🎙️ | **Générateur de VOIX** (text-to-speech) | `server.ts` L203 | ✅ **PASSÉ EN 3.8** |
| 📝 | **Générateur de SCRIPT + CORRECTEUR** | `server.ts` L1095 | 🔒 **INTACT — `gemini-3.1-flash-lite`** |

```
Ligne 203  : const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";      ← MODIFIÉ
Ligne 1095 : const GEMINI_TEXT_MODEL = "gemini-3.1-flash-lite";                            ← INTOUCHÉ
```

---

## 2. Ce que ça t'apporte concrètement

| | Avant (3.1) | Maintenant (3.8) |
|---|---:|---:|
| **Sons humains disponibles** | 6 distincts | **35** |
| **Crochets des balises** | `[excited]` (carrés) | `<laugh>` (angle, conforme Google) |
| **Le « comment dire »** | mélangé au texte | **case séparée** (`speech_metadata.style`) |
| **Voix disponibles** | 12 | **30 studio** (+ voix sur mesure à venir) |
| **Bruitages interdits** | passaient | **détectés et retirés automatiquement** |
| **Coût / minute** | 8,40 DZD | **3,79 DZD (−55 %)** |

---

## 3. Ce qui a été codé

| Fichier | Rôle |
|---|---|
| `tts/vocalTags.ts` | **35 sons humains** officiels, catégorisés, libellés FR + AR. Nettoie les balises inconnues, les bruitages non humains, et convertit les anciennes balises. |
| `tts/voices.ts` | **30 voix studio** + migration automatique des 9 anciens identifiants (aucun utilisateur perdu). |
| `tts/engine.ts` | **Le moteur** : construit la bonne requête pour 3.1 OU 3.8 selon le modèle. Gère les 2 syntaxes et les 2 formats audio. |
| `tts/selftest.ts` | **68 tests** de validation des deux modes. |
| `scripts/comparer-3.1-vs-3.8.ts` | Génère le même texte avec les 2 modèles → tu écoutes et tu compares. |

### Modifications dans `server.ts` (179 lignes)

1. **Import du moteur** (haut du fichier) + commentaire d'avertissement sur les 2 modèles à ne pas confondre.
2. **`TTS_MODEL`** → 3.8 par défaut, + déduction automatique du mode (`TTS_ENGINE_MODE`).
3. **Diagnostic au démarrage** : affiche quel mode est actif et ce qu'il implique.
4. **`callGeminiTTSNonStreaming`** → l'en-tête WAV du 3.8 est retiré automatiquement (sinon : craquement + durée faussée + points sur-facturés).
5. **`synthesizeWithRetry`** → la requête est construite par le moteur au lieu de l'être à la main.
6. **`GEMINI_VOICE_MAP`** → étendu aux 30 voix studio (les entrées historiques sont **prioritaires**, donc rendu identique pour les anciennes voix).
7. **Route principale TTS** + **API développeur** → les balises sont désormais analysées par le moteur (les 2 syntaxes marchent).
8. **`buildEmotionPromptInstruction`** → gère les 2 syntaxes de balises.

---

## 4. Vérifications passées ✅

```
Syntaxe de server.ts ................ ✅ valide
68 tests du moteur .................. ✅ 68 réussis / 0 échec
Mode 3.8 : requête correcte ......... ✅ style séparé, voiceConfig.voice, AUDIO_L16
Mode 3.1 : requête correcte ......... ✅ DIRECTOR'S NOTES, prebuiltVoiceConfig, PCM
WAV 3.8 → PCM brut .................. ✅ en-tête retiré, zéro octet perdu
WAV avec blocs intermédiaires ....... ✅ géré (recherche du bloc « data »)
Modèle texte touché ? ............... ✅ NON — toujours gemini-3.1-flash-lite
```

### 🐛 2 bugs attrapés pendant l'intégration

1. **Erreur de démarrage (crash du serveur)** — mon diagnostic appelait `TTS_MODEL` avant sa déclaration → erreur « Temporal Dead Zone ». Déplacé au bon endroit. **Le serveur aurait refusé de démarrer.**
2. **Ordre des balises** — les balises carrées étaient traitées avant les balises angle, ce qui faussait l'ordre et donc le style déduit. Corrigé en une seule passe.

---

## 5. 🔘 L'interrupteur

**Le 3.8 est maintenant actif par défaut.** Pour changer, **une seule ligne** dans `.env` :

```env
# Le nouveau (actif par défaut — 35 sons, style séparé, 30 voix)
GEMINI_TTS_MODEL=gemini-3.8-flash-tts

# L'ancien (comportement 100% identique à avant)
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview

# Intermédiaire (moins cher, 101 langues) — pour les comptes gratuits par exemple
GEMINI_TTS_MODEL=gemini-3.8-flash-lite-tts
```

> 💡 **Conseil de prudence** : si tu veux déployer sans aucun risque, mets d'abord
> `GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview` dans ton `.env`, vérifie que
> tout tourne (rien ne doit changer), puis retire la ligne pour activer 3.8.

---

## 6. 🎧 Tester avec tes oreilles

```bash
npx tsx scripts/comparer-3.1-vs-3.8.ts
```
→ Génère **2 fichiers WAV** (même texte, 2 modèles) + le coût réel de chacun.

---

## 7. Prochaines étapes

| # | Étape | État |
|---|---|---|
| 1 | Catalogue des 35 sons | ✅ fait |
| 2 | Catalogue des 30 voix studio | ✅ fait |
| 3 | Double moteur 3.1 / 3.8 | ✅ fait |
| 4 | 68 tests automatisés | ✅ fait |
| 5 | **Branchement dans `server.ts`** | ✅ **fait** |
| 6 | Styles automatiques complets (par voix + région) | ⏳ à faire |
| 7 | Voix régionales Alger / Oran / Constantine | ⏳ à faire |
| 8 | Aperçus audio des 30 voix | ⏳ à faire |

**Aucune ligne de front-end n'a été touchée.** Le front-end continue d'envoyer
les mêmes requêtes : tout se passe côté serveur.
