# Audit — ce que le backend envoie vraiment à Gemini

**Date :** 26 septembre 2026 · **Périmètre :** le JSON envoyé au modèle de voix, comparé à la
documentation officielle Google.

---

## Avertissement

Les deux PDF que tu avais joints (`gemini-3.8-flash-tts.md.pdf` et `speech-generation.md.pdf`)
**ne sont jamais arrivés dans l'espace de travail** — j'ai cherché partout, il n'y a aucun PDF.
Je n'ai donc pas pu les ouvrir.

À la place, j'ai comparé le code aux **pages officielles Google dont ces PDF sont les impressions** :

- `ai.google.dev/gemini-api/docs/generate-content/speech-generation` (mise à jour du 24/09/2026)
- `ai.google.dev/gemini-api/docs/speech-generation` (variante Interactions API)

Si tes PDF contiennent autre chose que ces pages, dis-le-moi et je compare à nouveau.

---

## 1. La requête réellement envoyée (mode 3.8, celui qui tourne)

Texte : `واش راكم خاوتي <ضحكة> راني هنا <وقفة قصيرة> بكل سرور.` · Voix : Amine · Vitesse : rapide

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "... واش راكم خاوتي <laugh> راني هنا <short pause> بكل سرور.",
          "speech_metadata": { "style": "speaking rapidly" }
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "responseFormat": {
      "audio": { "mimeType": "AUDIO_L16", "sampleRate": 24000 }
    },
    "speechConfig": {
      "voiceConfig": { "voice": "Puck" }
    }
  }
}
```

**Ce qui est envoyé au modèle, c'est ce `text` — rien d'autre.** Le texte parlé reste en darija,
les balises arabes (`<ضحكة>`, `<وقفة قصيرة>`) sont devenues les balises anglaises officielles
(`<laugh>`, `<short pause>`), et les instructions de jeu partent **à part**, dans
`speech_metadata.style`.

### Ce texte est-il prononcé tel quel ?

Non. Les balises sont des **instructions**, pas des mots : Google les interprète et ne les lit pas.
C'est exactement pour ça que tout le nettoyage existe : une balise qui arriverait mal formée
**serait**, elle, lue à voix haute.

---

## 2. Comparaison ligne par ligne avec la documentation

### La requête

| Ce que dit la doc Google | Ce que fait Sawtify | |
|---|---|---|
| `contents[].role = "user"` | identique | ✅ |
| `contents[].parts[].text` = transcript **verbatim** | identique | ✅ |
| `parts[].speech_metadata.style` = jeu **soutenu** | identique | ✅ |
| `generationConfig.responseModalities = ["AUDIO"]` | identique | ✅ |
| `generationConfig.speechConfig.voiceConfig.voice` | identique (le **nouveau** champ, pas l'ancien) | ✅ |
| `generationConfig.responseFormat.audio.mimeType` + `sampleRate` | identique, forcé à `AUDIO_L16` / 24000 | ✅ |

### Les 5 points du guide de migration

| # | Ce que demande Google pour passer à 3.8 | Sawtify |
|---|---|---|
| 1 | **Sortir le style du texte** vers `speech_metadata.style` | ✅ fait |
| 2 | **Remplacer les blocs « Director's Notes »** (1re cause de dérive de voix) | ✅ aucune note de personnage n'est envoyée en 3.8 |
| 3 | Un `part` par locuteur pour le dialogue | ➖ multi-voix désactivé (ton choix) |
| 4 | **Balises en crochets angle**, sons humains seulement | ✅ 35 sons, bruits non humains retirés |
| 5 | **Le mode unary renvoie du WAV**, plus du PCM brut | ✅ double protection (voir §3) |

### Le catalogue des sons

| Ce que dit la doc | Sawtify |
|---|---|
| 35 sons recommandés | ✅ les 35 |
| Variantes `<laughter>`, `<chuckles>`, `<sighs>`, `<phew>`, `<whispering>` | ✅ les 5 acceptées |
| « Éviter les effets non vocaux (applaudissements, chocs) » | ✅ retirés automatiquement, et signalés |
| Les pauses s'écrivent `<short pause>` / `<long pause>` | ✅ |
| Les MAJUSCULES appuient un mot | ✅ transmis tel quel |
| Ne pas écrire d'instruction du genre « garde la même voix » | ✅ aucune n'est envoyée |

### Deux points où Sawtify s'écarte (volontairement ou non)

| Sujet | Doc Google | Sawtify | Verdict |
|---|---|---|---|
| Backchannels `\|oh hmm\|` | pour le dialogue à 2 voix | non utilisés | ➖ hors périmètre |
| **Style automatique** | « Synthétise d'abord **sans style** : la plupart des requêtes n'en ont pas besoin. » | ✅ **corrigé le 26/09** : plus aucun style inventé, voir §5 | ✅ **conforme** |

---

## 3. La protection anti-régression WAV — correcte

La doc prévient : en 3.8, une requête normale renvoie un **WAV complet** (en-tête RIFF de
44 octets), alors que le pipeline Sawtify attend du **PCM brut**.

Sawtify se protège **deux fois** :

1. il **demande** explicitement `AUDIO_L16` (donc du PCM brut) ;
2. s'il reçoit quand même un WAV, `stripWavHeader()` retire l'en-tête en parcourant les blocs
   RIFF — pas juste en sautant 44 octets.

Sans ça : un craquement en début de piste, une durée faussée, et **des points facturés trop haut**.

Vérifié : ✅

---

## 4. Les deux défauts trouvés — corrigés

### ❌ Défaut 1 — une balise pouvait être coupée en deux et **partir brute** vers Gemini

**C'est le défaut sérieux.** Le découpage des textes longs (au-delà de 800 caractères) se faisait
mot à mot. Or **trois balises officielles contiennent un espace** :

`<short pause>` · `<long pause>` · `<heavy breath>`

Quand l'une d'elles tombait sur la frontière des 800 caractères :

```
morceau 1 se terminait par :  "…كلمة111 كلمة112 <short"
morceau 2 commençait par   :  "pause> كلمة113…"
```

Et voici le vrai problème : **le garde-fou ne voyait rien**. Un `<` sans `>` n'est pas reconnu
comme une balise, donc `unknownTags` restait vide et les deux moitiés partaient telles quelles.
Gemini pouvait prononcer « inférieur à shorts, pause supérieur à ».

Résultat du balayage (chaque balise placée à **chacune des 261 positions** d'un texte long) :

| Avant | Après |
|---|---|
| ❌ `<short pause>`, `<long pause>`, `<heavy breath>` cassées sur 2 positions chacune | ✅ **0 casse sur 261 positions, pour les 6 balises testées** |

**Correctif :** chaque balise est remplacée par un jeton **sans espace, sans ponctuation et sans
chiffre** avant le découpage, puis remise en place après. Le découpage ne peut plus, par
construction, toucher l'intérieur d'une balise. Les morceaux déséquilibrés sont en plus jetés.

### ❌ Défaut 2 — un fragment de balise pouvait quand même atteindre Gemini

Défense en profondeur : même sans découpage, un utilisateur peut taper `<laugh` sans fermer, ou
un texte peut être tronqué. Le `<` orphelin partait brut.

**Correctif :** `parseTranscript()` compte maintenant les chevrons qui **restent** une fois toutes
les balises bien formées retirées, les supprime, et le signale :

```
"كلمة112 <short"      →  envoyé : "كلمة112 short"     · signalé : fragment de balise sans paire (1)
"pause> كلمة113"      →  envoyé : "pause كلمة113"     · signalé : fragment de balise sans paire (1)
"سليم <laugh> هنا"    →  envoyé : "سليم <laugh> هنا" · signalé : —   ← balise VALIDE préservée
```

Le premier jet de ce correctif avait lui-même un bug (il supprimait **aussi** les balises
valides) — attrapé par les tests avant toute livraison.

### Le découpeur est maintenant dans le module testé

`splitIntoChunksForTTS()` vivait dans `server.ts`, donc **non testable**. Il est déplacé dans
`tts/engine.ts` et couvert par **23 nouvelles vérifications**. C'est ce qui a permis de trouver
le défaut 1 : un code qu'on ne peut pas tester est un code qui casse en silence.

---

## 5. Le style automatique — corrigé le 26 septembre 2026

> ✅ **Décision prise : option A.** Sawtify n'invente plus aucun style. `style` ne contient
> désormais que ce que l'utilisateur a réglé lui-même (sa vitesse, sa hauteur).
> Interrupteur de retour en arrière : `TTS_AUTO_STYLE=1`.

### Ce qui n'allait pas

Aujourd'hui, en 3.8, si tu ne règles aucun style, Sawtify en **invente un** à partir de la
première balise « porteuse d'émotion » du texte. Exemples :

| Ton texte | Style appliqué à **tout** le texte |
|---|---|
| `… <ضحكة> …` | `cheerful and amused` |
| `… <صرخة> …` | `terrified or exhilarated, screaming` |
| `… <تنهد> …` | `weary` |

**Pourquoi c'est un problème :** Google dit explicitement que `style` est **soutenu** (ça dure tout
le tour) alors qu'une balise est **ponctuelle** (ça arrive à un instant précis). Si tu écris :

> `بصح <ضحكة> الكلام هذا ما يضحكش، المشكل كبير.`

Tout le texte risque d'être livré sur un ton joyeux — alors que la balise ne visait qu'un seul mot.

Et la doc va plus loin : *« Synthétise d'abord **sans style** : la plupart des requêtes n'en ont
pas besoin. »* Aujourd'hui Sawtify en met un presque toujours.

**Ce qui a été fait :** `style` ne contient plus que les réglages explicites. Vérifié par 5 tests :

```
✓ ★ texte grave contenant un <laugh> → AUCUN style imposé à tout le texte
✓ la balise <laugh> reste dans le texte (son ponctuel conservé)
✓ le style RÉGLÉ par l'utilisateur est bien transmis
✓ autoStyle: true restaure l'ancien comportement
✓ un style explicite est transmis tel quel
```

> ⚠️ À ne pas confondre avec les **styles automatiques par voix et par région** dont on a parlé
> (chantier 6–7, pas encore commencé). Ça, c'est un autre mécanisme. Celui-ci existe **déjà** en
> production.

### Autres remarques, par ordre d'importance

| # | Constat | Gravité | Recommandation |
|---|---|---|---|
| 1 | ~~La clé API voyage dans l'URL~~ | ✅ **corrigé** | La clé part maintenant dans l'en-tête `x-goog-api-key` (la méthode de la doc). Avec un **repli automatique** sur l'ancienne méthode si Google refuse l'en-tête : ce changement ne peut pas casser la production. |
| 2 | `responseModalities` s'écrit `["audio"]` (minuscules) en mode 3.1 et `["AUDIO"]` en 3.8 | faible | Incohérence, pas un bug : l'ancien mode fonctionne depuis toujours. À uniformiser. |
| 3 | La reconnaissance des modèles `^gemini-(3\.[89]\|[4-9]\.\d+)` classerait `gemini-3.10` en mode **legacy** | faible, futur | Aucun impact aujourd'hui. À corriger avant la sortie d'un 3.10. |
| 4 | Les notes du mode 3.1 annoncent `[calm]` et `[very fast]`, deux balises que le code ne produit jamais | cosmétique | Texte du prompt à nettoyer. |
| 5 | Les « Director's Notes » existent toujours en mode 3.1 | normal | C'est le comportement historique, conservé exprès pour pouvoir revenir en arrière. Google déconseille ces blocs **en 3.8 seulement**. |

---

## 6. Trouvé le 26/09 au soir — la langue n'était plus dite au modèle

Ce défaut ne vient pas de la documentation : il vient de **notre propre passage à la 3.8**.

### Ce qui se passait

L'ancien prompt du mode 3.1 contenait ces deux lignes :

```
Language: Algerian Darija (Arabic script).
Natural, human delivery, like a real person talking.
```

En migrant vers la 3.8, le long bloc « DIRECTOR'S NOTES » a été retiré — **à raison** : la
documentation de migration le désigne comme la première cause de dérive de la voix, et la 3.8 lit
le texte **mot pour mot**. On ne peut donc plus y glisser la moindre instruction.

Mais la consigne de **langue** est partie avec le reste. Et elle, elle manquait.

### Pourquoi c'est grave pour l'algérien

Un texte en lettres arabes se lit par défaut en **arabe standard** — la langue des journaux
télévisés. « واش راك يا خويا » sortait donc comme un présentateur qui lit les informations, pas
comme un Algérien qui parle à son voisin.

Et ce n'est pas une question de réglage fin, parce que **la darija n'a pas d'orthographe
officielle** : il n'existe aucun moyen pour le modèle de la reconnaître tout seul. Sans qu'on le
lui dise, il ne peut pas savoir. C'était donc **la** cause principale du défaut de prononciation
sur les textes algériens.

### La preuve

Requête construite pour un texte en darija, avant correction — il n'y a **rien** qui parle de
langue :

```json
{
  "contents": [{ "role": "user", "parts": [ { "text": "واش راك يا خويا؟ …" } ] }],
  "generationConfig": { "responseModalities": ["AUDIO"], "responseFormat": …, "speechConfig": … }
}
```

Et la fonction ne signalait **aucun avertissement** : `warnings` était vide. Le silence total.

### Le correctif

On ne pouvait pas remettre l'instruction dans le texte : la voix l'aurait **lue à voix haute**.
Le seul canal prévu pour ce qui vaut « sur tout le tour de parole » est `speech_metadata.style`.
La requête contient maintenant :

```json
{
  "contents": [{ "role": "user", "parts": [ {
    "text": "واش راك يا خويا؟ …",
    "speech_metadata": { "style": "in Algerian Darija, natural and human, like a real person talking" }
  } ] }]
}
```

Trois règles tenues :

| Règle | Pourquoi |
|---|---|
| **Courte** (10 mots) | la doc prévient : plus le texte d'ambiance est long, plus la voix dérive |
| **Seulement si le texte contient de l'arabe** | un texte français n'a aucune raison d'être prononcé en darija |
| **En premier, avant les réglages** | la langue est l'information la plus structurante |

### Le second défaut, réparé dans le même geste

En inspectant cet endroit du code, on a trouvé que la composition du style était un `||` :

```ts
const effectiveStyle = styleExplicite || styleDemande || styleDeduit;
```

Autrement dit, **la vitesse écrasait le ton**. Demander « [calm] » *et* une vitesse rapide
n'envoyait que `speaking rapidly` — le calme disparaissait, sans le moindre avertissement. Repéré
en testant « [calm] + vitesse rapide » : un seul style sortait, le calme n'y était pas.

Les quatre sources s'**additionnent** maintenant dans un ordre défini :

```
in Algerian Darija, natural and human, like a real person talking,
calm and composed from the very first word, soft and soothing throughout, speaking rapidly
 └────────────── ① la langue ──────────────┘  └──── ② le ton demandé ────┘  └─ ③ la vitesse ─┘
```

(④ le style déduit des balises reste éteint par défaut, comme décidé le 26/09.)

### Couverture

**13 nouveaux tests** (§13ter du test interne) verrouillent les deux défauts :

- un texte en darija reçoit bien la consigne ;
- un texte **sans** arabe n'en reçoit **aucune** — vérifié jusqu'au mot « Darija » absent ;
- un texte mixte darija + français la reçoit quand même ;
- le mode 3.1 garde la sienne **dans le prompt**, comme avant, et **aucun** `speech_metadata`
  (le mode 3.1 ne le supporte pas) ;
- le ton demandé **n'est plus écrasé** par la vitesse, la vitesse est toujours envoyée, et les
  trois survivent ensemble.

---

## 7. Verdict

**Le JSON envoyé à Gemini est correct** : il correspond exactement à la forme officielle, champ
par champ, et respecte les 5 points du guide de migration. Rien n'est envoyé en trop, rien ne
manque.

**Mais il y avait trois vrais défauts.** Les deux premiers, sur le même thème : faire en sorte
qu'un fragment de balise ne puisse **jamais** partir brut vers le modèle (le premier était
sérieux : une balise de pause coupée en deux sur les textes longs). Le troisième, trouvé le soir
du 26/09, était le plus visible à l'oreille : **la darija n'était plus annoncée au modèle**, qui la
lisait donc comme de l'arabe standard — et au passage, la vitesse écrasait le ton demandé.

Les trois sont corrigés et couverts par des tests de régression.

```
moteur TTS            169 / 169   (112 au moment de cet audit, +57 depuis)
noms des voix          22 / 22
balises officielles    40 / 40
aperçus audio          39 / 39
documentation          65 / 65
─────────────────────────────────
TOTAL                 335 vérifications, 0 échec
```

**Et le seul écart qui restait avec la doc — le style automatique — a été corrigé le même jour :
Sawtify n'invente plus rien.** La requête envoyée à Gemini est maintenant conforme à la
documentation officielle sur **tous** les points vérifiés.
