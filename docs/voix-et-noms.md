# 🎙️ Les voix et leurs noms

Réponses aux 2 questions : **« la voix passe-t-elle en anglais ? »** et **« tu as nommé quoi les voix ? »**

---

## 1. ❌ NON — la voix ne passe JAMAIS en anglais

### La confusion à lever

Il y a **deux choses séparées** dans une génération :

| | Quoi | Langue |
|---|---|---|
| **CASE 1** | Ce que la voix **PRONONCE** | 🇩🇿 **Ta langue (darija, arabe, français)** |
| **CASE 2** | Les **BALISES** (instructions) | 🇬🇧 Anglais (imposé par Google) |

### La preuve, avec ton texte

```
CE QUE L'UTILISATEUR ÉCRIT :
   مرحبا <ضحكة> واش راكم خاوتي <soupir> لاباس؟ [مهتم]

CE QUE GOOGLE REÇOIT — CASE 1 « QUOI LIRE » :
   مرحبا <laugh> واش راكم خاوتي <sigh> لاباس؟ [مهتم]

CE QUE GOOGLE REÇOIT — CASE 2 « COMMENT DIRE » :
   style : cheerful and amused
```

**Vérification automatique :**
```
Mots à prononcer ............... 6
Dont en ARABE .................. 6 / 6   ✅
Dont en anglais ................ 0       ✅
```

### Pourquoi les balises sont en anglais

1. **Google l'exige.** La doc : *« If your transcript is not in English, for best results we recommend that you still use English audio tags. »*
2. **Une balise n'est PAS un mot.** `<laugh>` n'est jamais prononcé — c'est un ordre donné au moteur. Comme les touches d'un piano : tu appuies sur « do », le piano joue une note, il ne dit pas « do ».
3. **C'est pour ça que je traduis automatiquement.** L'utilisateur écrit `<ضحكة>` dans sa langue → Google reçoit `<laugh>` → **le rire sort en darija**.

> **En clair :** la voix parle darija, rigole en darija, soupire en darija.
> Rien ne devient anglais. Seul le nom technique de l'instruction l'est.

---

## 2. 🏷️ Les noms des voix

### ⚠️ D'abord une contrainte : Google IMPOSE ses noms

Les voix s'appellent techniquement `Puck`, `Charon`, `Kore`, `Sadachbia`… **On ne peut PAS les renommer** : l'API refuse toute autre écriture.

**Mais** le nom affiché à tes utilisateurs, lui, est **100 % libre**. D'où une couche de traduction :

```
Ce que tes utilisateurs voient        Ce que Google reçoit
──────────────────────────────        ─────────────────────
      « Amine »            ────►            "Puck"
      « أمين »              ────►            "Puck"
      « Yasmine »          ────►            "Zephyr"
      « Karim »            ────►            "Kore"
```

### Les 30 voix, avec leurs prénoms

**Les 9 prénoms historiques sont INCHANGÉS** (tes utilisateurs les connaissent déjà).

| # | Technique | Prénom FR | Prénom AR | Caractère | |
|---|---|---|---|---|---|
| 1 | `Puck` | **Amine** | أمين | Voix enjouée et dynamique | ✅ |
| 2 | `Charon` | **Khalid** | خالد | Voix informative et posée | ✅ |
| 3 | `Fenrir` | **Rachid** | رشيد | Voix énergique et survoltée | ✅ |
| 4 | `Algenib` | **Bilal** | بلال | Voix grave et rocailleuse | ✅ |
| 5 | `Orus` | **Fayçal** | فيصل | Voix ferme et assurée | ✅ |
| 6 | `Zephyr` | **Yasmine** | ياسمين | Voix éclatante et souriante | ✅ |
| 7 | `Sulafat` | **Maryam** | مريم | Voix chaleureuse et douce | ✅ |
| 8 | `Leda` | **Layla** | ليلى | Voix juvénile et vive | ✅ |
| 9 | `Achernar` | **Nour** | نور | Voix douce et apaisante | ✅ |
| 10 | `Kore` | **Karim** | كريم | Voix ferme et autoritaire | ⚠️ |
| 11 | `Aoede` | **Aya** | آية | Voix légère et aérienne | ⚠️ |
| 12 | `Callirrhoe` | **Sami** | سامي | Voix décontractée et cool | ⚠️ |
| 13 | `Autonoe` | **Nada** | ندى | Voix éclatante et joyeuse | ⚠️ |
| 14 | `Enceladus` | **Anis** | أنيس | Voix soufflée et intime | ⚠️ |
| 15 | `Iapetus` | **Zaki** | زكي | Voix claire et nette | ⚠️ |
| 16 | `Umbriel` | **Walid** | وليد | Voix décontractée et simple | ⚠️ |
| 17 | `Algieba` | **Nabil** | نبيل | Voix lisse et fluide | ⚠️ |
| 18 | `Despina` | **Salma** | سلمى | Voix lisse et douce | ⚠️ |
| 19 | `Erinome` | **Rania** | رانيا | Voix claire et précise | ⚠️ |
| 20 | `Rasalgethi` | **Hakim** | حكيم | Voix informative et érudite | ⚠️ |
| 21 | `Laomedeia` | **Riad** | رياض | Voix enjouée et vive | ⚠️ |
| 22 | `Alnilam` | **Adel** | عادل | Voix ferme et stable | ⚠️ |
| 23 | `Schedar` | **Nassim** | نسيم | Voix égale et posée | ⚠️ |
| 24 | `Gacrux` | **Omar** | عمر | Voix mûre et expérimentée | ⚠️ |
| 25 | `Pulcherrima` | **Yacine** | ياسين | Voix directe et assurée | ⚠️ |
| 26 | `Achird` | **Hicham** | هشام | Voix amicale et proche | ⚠️ |
| 27 | `Zubenelgenubi` | **Reda** | رضا | Voix décontractée et naturelle | ⚠️ |
| 28 | `Vindemiatrix` | **Amina** | أمينة | Voix douce et délicate | ⚠️ |
| 29 | `Sadachbia` | **Sara** | سارة | Voix vivante et animée | ⚠️ |
| 30 | `Sadaltager` | **Mourad** | مراد | Voix savante et pédagogue | ⚠️ |

### ⚠️ Pourquoi 21 prénoms sont marqués « à vérifier »

**Google ne publie PAS le genre de ses voix studio.** La doc donne seulement un caractère (« Bright », « Gravelly », « Warm »…).

Les 9 premiers sont sûrs (vérifiés en production chez toi). Les 21 autres sont des **propositions cohérentes avec le caractère**, mais **à confirmer à l'oreille** quand tu généreras les aperçus audio.

**Si un prénom ne colle pas** (voix masculine avec un prénom féminin), il se change **à UN SEUL endroit** : `tts/voiceNames.ts`. C'est réglé partout (interface, API, historique).

### 90 écritures acceptées

| Écriture | Exemple | Fonctionne ? |
|---|---|---|
| Prénom français | `Amine` | ✅ |
| Prénom arabe | `أمين` | ✅ |
| Slug | `amine` | ✅ |
| Majuscules | `AMINE` | ✅ |
| Espaces en trop | `"  Amine  "` | ✅ |
| Nom technique | `Puck` | ✅ |
| **Ancien identifiant Sawtify** | `voice_amin` | ✅ |
| Nouvelle voix en français | `Karim` | ✅ |
| Nouvelle voix en arabe | `كريم` | ✅ |
| Voix sur mesure (à venir) | `voice_xyz` | ✅ |
| Voix inexistante | `inconnu` | 🛡️ repli sûr → `Amine` |

---

## 3. 🐛 2 bugs attrapés pendant ce travail

### Bug 1 — Les anciens identifiants partaient à Google tels quels 🔴

Les identifiants historiques (`voice_amin`, `voice_yasmin`…) commencent par `voice_`, **exactement comme les voix sur mesure de Google**. Sans précaution, le code les laissait passer tels quels → **Google les aurait rejetés** → tous les utilisateurs existants, l'historique et les clés API cassés.

**Corrigé** : les anciens identifiants sont traités **en priorité absolue**, avant les voix sur mesure. Les 9 sont testés individuellement. ✅

### Bug 2 — Accords français incohérents

« Voix **mûre** et expérimentée » avec le prénom **Omar** (masculin), etc. Les 30 descriptions ont été réécrites pour s'accorder avec « voix » (féminin), ce qui reste **neutre sur le genre de la personne**. ✅

---

## 4. ✅ Tests

```bash
npm run test:tts      # 89 tests — moteur + multilingue
npm run test:voix     # 22 tests — résolution des noms
npm run verif:balises # 40 balises officielles
npm run demo:langues  # montre ce qui part à Google, en direct
```

```
89 / 89  moteur TTS
22 / 22  noms des voix
40 / 40  balises officielles
```

---

## 5. Prochaine étape

Il reste à **vérifier les 21 prénoms à l'oreille**. Pour ça, il faut générer un aperçu audio de chaque voix — c'est la prochaine étape logique :

**→ Aperçus audio des 30 voix** (backend + stockage), qui te permettra en même temps de valider les prénoms et de les afficher côté interface.
