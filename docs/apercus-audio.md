# Les 30 aperçus audio — comment ça marche

> **⚠️ RÈGLE ABSOLUE — 100 % DARIJA ALGÉRIENNE (26/09/2026).**
> Tous les textes d'aperçu sont écrits en **darija parlée**. Aucune tournure
> d'arabe classique : « يعطيكم الصحة » (pas « شكراً »), « آخر تقنية » (pas
> « أحدث تقنية »), « تشد اللي يسمعك » (pas « تجذب السامع »), « للحكاية »
> (pas « للسرد »), « البلاصة » (pas « المكان »).
> `npm run test:apercus` **refuse** tout texte qui repart en arabe classique.
>
> **En une phrase :** un script génère **un fichier audio par voix** (30 fichiers), une fois pour
> toutes, et le serveur les sert **sans jamais rappeler Google**. Tu écoutes, tu valides les
> genres, c'est fini.

---

## 1. Pourquoi des aperçus figés ?

Avant, quand un utilisateur cliquait sur ▶︎ pour écouter une voix, le serveur appelait Google
**à chaque fois**. Trois conséquences :

| Problème | Conséquence |
|---|---|
| Un appel Google par écoute | ça coûte de l'argent à chaque clic |
| ~2 secondes d'attente | l'utilisateur croit que c'est cassé |
| Chaque appel peut sonner un peu différemment | impossible de comparer deux voix |

Maintenant : la voix est générée **une seule fois**, rangée dans un fichier, et servie
instantanément. Coût : **quelques centimes, une fois pour toutes.**

---

## 2. Deux scripts différents (ne pas confondre)

| | **Script d'audition** | **Texte d'aperçu** |
|---|---|---|
| Où | `tts/voicePreviews.ts` → `AUDITION_SCRIPT` | `tts/voicePreviews.ts` → `VOICE_PREVIEW_TEXTS` |
| Contenu | **Le même texte pour les 30 voix** | **Un texte différent par voix** |
| Durée | ~12 secondes | ~8 secondes |
| Sert à | **comparer** les voix et valider le genre | la vitrine : montrer le caractère d'une voix |
| Utilisé par | le générateur + la page d'audition | l'API `/preview` quand l'aperçu n'existe pas encore |

Le script d'audition est **neutre volontairement** : il ne prononce aucun prénom, aucune
phrase « masculine » ou « féminine » qui influencerait ton jugement. Tu écoutes la voix, pas le texte.

Il contient aussi des balises de sons (`<short pause>`, `<breath>`, `<chuckle>`) pour que tu
entendes comment la voix gère une respiration et un petit rire.

---

## ⚡ NOUVEAU (26/09/2026) : les aperçus se génèrent TOUT SEULS

Plus besoin de terminal ni de commande : **au démarrage du serveur**, les
aperçus manquants sont fabriqués un par un **en tâche de fond** (le site répond
normalement pendant ce temps), puis enregistrés définitivement. Le coût
(≈ 3 DZD pour les 30) n'est payé **qu'une seule fois**.

```
[Aperçus] 27 aperçu(x) manquant(s) → génération en tâche de fond…
[Aperçus ✓] Kore (Ines) — 1/27
…
[Aperçus] Préchauffage terminé : 27 généré(s), 0 échec(s).
```

Trois conditions (déjà en place si le reste fonctionne) :

1. `GEMINI_API_KEY` présente sur le serveur ;
2. stockage Supabase accessible ;
3. un bucket **PUBLIC** nommé **`voice-previews`** dans Supabase Storage.

Si le bucket manque, le serveur s'arrête après **un seul** essai et l'écrit
clairement — il ne gaspille pas 30 générations.

Pour désactiver : variable d'environnement **`TTS_WARM_PREVIEWS=0`**.

### Bonus : une seule génération par voix, quelle que soit l'écriture

Les aperçus sont désormais enregistrés sous une clé **canonique**
(`studio_<voix>`). Avant, « Amin », « voice_amin », le slug et le prénom arabe
créaient **4 entrées différentes** → 4 générations payées pour le même son.
Maintenant : une seule, servie à tout le monde.

## 3. La commande

```bash
# 1. Générer les 30 aperçus (une seule fois)
npm run apercus:voix

# 2. Écouter et valider les genres
#    → ouvre http://localhost:3000/audition-voix.html

# 3. Vérifier que tout est cohérent
npm run test:apercus
```

### Options utiles

| Option | Effet |
|---|---|
| `--voix=Puck,Kore` | ne générer que certaines voix (répétable : `--voix=Puck --voix=Kore`) |
| `--force` | régénère tout, même ce qui existe déjà |
| `--upload` | envoie les WAV + le manifeste sur **Supabase Storage** |
| `--simule` | fabrique de faux fichiers muets : teste toute la chaîne **sans appeler Google et sans payer** |
| `--modele=gemini-3.8-flash-lite-tts` | utiliser le modèle moins cher |
| `--delai=800` | attendre 800 ms entre deux appels (si Google limite ton débit) |

**Reprise automatique :** si tu relances la commande, les voix déjà générées sont **sautées**.
Tu ne paies jamais deux fois le même aperçu.

---

## 4. Le manifeste — le cerveau de l'affaire

`tts/preview-manifest.json` est écrit par le générateur. Il contient, pour chaque voix :

```json
{
  "voiceId": "Kore",
  "nameFr": "Ines",
  "nameAr": "كريم",
  "file": "kore.wav",
  "url": "https://…/storage/v1/object/public/voice-previews/kore.wav",
  "durationSeconds": 11.4,
  "bytes": 547234,
  "generatedAt": "2026-09-26T…",
  "model": "gemini-3.8-flash-tts",
  "gender": "unknown"
}
```

Il porte aussi **l'empreinte du script d'audition** (`scriptHash`).

### Le garde-fou

Si tu modifies le texte du script d'audition, l'empreinte change. Le serveur **refuse alors tout
le manifeste** et le dit au démarrage :

```
[Aperçus] manifeste ignoré : Script d'audition modifié depuis la génération
          (manifeste 91826acf9b71 ≠ attendu 3f21c0d9a445)
```

Autrement dit : **un aperçu périmé ne sera jamais servi** à la place d'une autre voix. C'est
volontaire — un utilisateur ne doit jamais entendre une voix qui n'est pas celle qu'il a choisie.

---

## 5. Le genre (homme / femme) — 21 voix à valider

Google **ne publie pas** le genre de ses 30 voix. Pour les 9 voix historiques de Sawtify, on le
sait depuis le terrain. Pour les 21 autres, c'est écrit `unknown` partout dans le code, et
**aucune interface ne prétend le contraire**.

La page `audition-voix.html` sert exactement à ça :

1. tu cliques ▶︎ → tu écoutes,
2. tu cliques **Homme** ou **Femme**,
3. quand les 30 sont faites, tu cliques **📋 Copier le résultat**,
4. tu colles le résultat dans la conversation : les genres sont mis à jour **partout**
   (interface, API, documentation) en une seule fois.

Elle enchaîne les voix automatiquement et sauvegarde ta progression dans le navigateur.
**3 minutes suffisent.**

Ensuite, la seule ligne à changer pour chaque voix est dans `tts/voiceNames.ts` :

```ts
gender: "male",     // au lieu de "unknown"
aConfirmer: false,  // le prénom est maintenant confirmé
```

---

## 6. Ce que le serveur fait avec tout ça

### `GET /api/v1/tts/preview?voice_id=…`

Ordre de recherche (du moins cher au plus cher) :

1. **manifeste** → fichier figé, réponse instantanée, **0 appel Google** → `source: "manifest"`
2. cache mémoire → `source: "memory"`
3. Supabase Storage → `source: "storage"`
4. **seulement si rien n'existe** → appel Google (une fois), puis mise en cache → `source: "gemini"`

La réponse contient maintenant `voice_name` (le nom technique résolu) et `source`, donc tu peux
voir d'où vient l'audio sans deviner.

### `GET /api/v1/tts/voices`

La liste complète, prête à consommer :

```bash
curl "https://ton-domaine/api/v1/tts/voices?lang=ar&avec_apercu=1"
```

```json
{
  "model": "gemini-3.8-flash-tts",
  "lang": "ar",
  "count": 30,
  "total": 30,
  "gender_valides": 0,
  "voices": [
    {
      "id": "Puck", "name_fr": "Amine", "name_ar": "أمين", "slug": "amine",
      "legacy_id": "voice_amin", "caractere": "مرح وحماسي",
      "gender": "male", "a_confirmer": false,
      "preview_url": "https://…/puck.wav", "preview_seconds": 10.8
    }
  ]
}
```

### `GET /api/v1/tts/preview-manifest`

Le manifeste tel quel, plus la liste des voix encore à valider à l'oreille.
Utile pour vérifier depuis un navigateur que le déploiement a bien pris le manifeste.

---

## 7. Où sont rangés les fichiers

| Environnement | Ce que fait le serveur |
|---|---|
| **Développement** (`npm run dev`) | lit `storage/voice-previews/*.wav` directement sur le disque |
| **Production sans `--upload`** | les sert aussi depuis `storage/` via `/storage/voice-previews/…` |
| **Production avec `--upload`** (recommandé) | renvoie l'URL **Supabase** : c'est Supabase qui sert l'audio, ton serveur Node respire |

Les fichiers WAV **ne sont pas dans Git** (voir `.gitignore`) : ce sont des artefacts lourds.
Le manifeste, lui, **est versionné** — c'est lui qui indique au serveur à quelle adresse trouver
chaque aperçu.

---

## 8. Vérifications automatiques

`npm run test:apercus` → **43 vérifications**, dont les plus importantes :

- ✅ **aucune balise inconnue** dans les 30 textes d'aperçu → rien ne sera jamais lu à voix haute ;
- ✅ **les 30 noms de fichiers sont distincts** → aucun aperçu n'écrase un autre ;
- ✅ **le script d'audition est neutre** → aucun prénom genré ne fausse l'écoute ;
- ✅ **un manifeste périmé est refusé** → jamais d'aperçu qui ne correspond pas ;
- ✅ **les WAV existent vraiment sur le disque** (si le manifeste est présent).

---

## Récapitulatif — 3 commandes

```bash
npm run apercus:voix     # génère (une fois)
npm run test:apercus     # vérifie (43 tests)
npm run dev              # puis ouvre /audition-voix.html
```
