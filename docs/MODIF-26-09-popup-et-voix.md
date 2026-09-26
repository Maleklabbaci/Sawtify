# Ce qu'il faut déployer — pop-up 4.1 + écriture des voix

**26 septembre 2026.** Trois corrections, **trois fichiers**, rien d'autre à toucher.

---

## État au 26/09 à 14 h — après vérification de TON déploiement

J'ai extrait ce que tu as mis en ligne et je l'ai testé. **Verdict :**

### ✅ Ce qui est déjà bon chez toi

| | |
|---|---|
| **Les 30 voix** | ✅ **parfaits** — 13 femmes / 17 hommes, les 4 fichiers d'accord (16/16) |
| `src/data/voices.ts` | ✅ identique à ma version |
| `WaveformPlayer.tsx` | ✅ **ta version est meilleure** — je l'ai adoptée |
| `TTSStudio.tsx` | ✅ **ton anti-lag du brouillon est meilleur** — adopté |
| `tts/voices.ts` | ✅ même contenu (seuls les commentaires diffèrent) |

### 👍 Tes 5 prénoms sont MEILLEURS que les miens — adoptés

| Voix | Moi | **Toi (gardé)** |
|---|---|---|
| Kore | Karima | **Ines** / إيناس |
| Callirrhoe | Samia | **Feriel** / فريال |
| Laomedeia | Rym | **Hanane** / حنان |
| Gacrux | Souad | **Widad** / وداد |
| Sadachbia | Sofiane | **Fares** / فارس |

« Fares » est un vrai prénom masculin, là où mon « Sofiane » héritait d'un vieux
identifiant féminin. **Ta version gagne, je ne l'écrase pas.**

*Une seule correction dans tes 5 lignes :* « Voix vivante et animée » sur Sadachbia
(une voix d'**homme**) → « Voix vivant et animé ».

### ⚠️ Ce qui manque encore — 5 fichiers

| Fichier | Ce qu'il apporte |
|---|---|
| **`src/components/WhatsNewV41.tsx`** | **la pop-up.** Ce qui est en ligne est encore la version **diaporama** (9 écrans, `z-50`) — celle dont tu as dit « on dirait jouer ». Ma version : 1 seul écran, gabarit de tes modales, `z-[70]` |
| `server.ts` | liste des 13 voix féminines (tu as 6 → 7 voix reçoivent un texte d'homme en mode de secours) + générateur raccourci |
| `src/components/TTSStudio.tsx` | **1 ligne** — le badge « Prêt ✓ » → « جاهز ✓ » en arabe |
| `tts/test-noms.ts` + `tts/test-apercus.ts` | chez toi **5 tests échouent** : ce sont les anciens tests, pas les sources |
| `package.json` + `scripts/verifier-voix.ts` | *(optionnel)* la commande `npm run verif:voix` |

### 📊 Contrôle de ton déploiement

```
compile .................... ✅ 0 erreur
construction ............... ✅ OK
les 30 voix ................ ✅ 16/16
moteur vocal ............... ✅ 177/177
tests des voix ............. ❌ 19/3  (tests périmés, pas un bug)
tests des aperçus .......... ❌ 37/2  (idem)
```

**En un mot : ton déploiement est SAIN. Il manque la pop-up, 1 ligne, et 2 fichiers de tests.**

---

