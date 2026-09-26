# Sawtify Developer API — Beta

> **Dernière mise à jour :** 26 septembre 2026 · **Version API :** `v1` · **Modèle vocal :** Gemini 3.8 Flash TTS

La Developer API transforme un texte en fichier vocal **prêt à diffuser** : chatbot, boîte vocale,
standard téléphonique, CRM, automatisation n8n/Make, application mobile.

| | |
|---|---|
| **Adresse** | `https://sawtify.space/api/v1/developer` |
| **Sortie par défaut** | `audio/wav` · PCM mono · 24 000 Hz |
| **Voix disponibles** | **30** |
| **Langues** | Arabe (darija), français, anglais + 100 langues — **détection automatique** |
| **Longueur max** | 5 000 caractères par appel |
| **Accès** | solde du compte **> 1 000 points** |

---

## Sommaire

1. [Démarrer en 3 étapes](#1-démarrer-en-3-étapes)
2. [Les 30 voix](#2-les-30-voix)
3. [Les balises de sons et d'émotions](#3-les-balises-de-sons-et-démotions)
4. [Générer un fichier vocal](#4-générer-un-fichier-vocal)
5. [Les autres endpoints](#5-les-autres-endpoints)
6. [Limites et erreurs](#6-limites-et-erreurs)
7. [Sécurité — à lire absolument](#7-sécurité--à-lire-absolument)
8. [Ce qui a changé](#8-ce-qui-a-changé)

---

## 1. Démarrer en 3 étapes

### Étape 1 — Vérifier l'accès

Ton compte Sawtify doit avoir un solde **strictement supérieur à 1 000 points**. En dessous,
la création de clé est refusée avec un code `403`.

### Étape 2 — Créer une clé

Depuis une session Sawtify authentifiée (côté serveur, **jamais** dans un navigateur) :

```bash
curl -X POST https://sawtify.space/api/v1/developer/keys \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mon chatbot"}'
```

**Réponse `201 Created`** — la clé brute n'apparaît **qu'une seule fois** :

```json
{
  "beta": true,
  "warning": "Copiez cette clé maintenant. Elle ne sera plus affichée.",
  "api_key": "swt_beta_xxxxxxxxxxxxxxxxxxxxxxxx",
  "key": {
    "id": "8f1c…",
    "name": "Mon chatbot",
    "key_prefix": "swt_beta_xxxxxxxx",
    "created_at": "2026-09-26T09:12:44.512Z"
  }
}
```

Sawtify ne stocke jamais la clé en clair : seule son empreinte SHA-256 est conservée.
**Si tu la perds, elle est irrécupérable** — il faut en créer une nouvelle et révoquer l'ancienne.

### Étape 3 — Appeler l'API

```bash
curl -X POST https://sawtify.space/api/v1/developer/tts \
  -H "X-Sawtify-API-Key: swt_beta_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"text":"Bonjour, votre commande est confirmée."}' \
  --output reponse.wav
```

C'est tout. `reponse.wav` est un fichier audio valide.

---

## 2. Les 30 voix

Chaque voix a **3 écritures acceptées** : le prénom français, le prénom arabe, ou l'identifiant
technique Google. Les 9 identifiants historiques (`voice_amin`…) **continuent de fonctionner** —
aucune intégration existante n'est cassée.

| # | Prénom (FR) | الاسم (AR) | Identifiant API | Ancien ID | Genre |
|---:|---|---|---|---|---|
| 1 | Amine | أمين | `Puck` | `voice_amin` | homme |
| 2 | Khalid | خالد | `Charon` | `voice_khalid` | homme |
| 3 | Rachid | رشيد | `Fenrir` | `voice_rashid` | homme |
| 4 | Bilal | بلال | `Algenib` | `voice_bilal` | homme |
| 5 | Fayçal | فيصل | `Orus` | `voice_faycal` | homme |
| 6 | Yasmine | ياسمين | `Zephyr` | `voice_yasmin` | femme |
| 7 | Maryam | مريم | `Sulafat` | `voice_maryam` | femme |
| 8 | Layla | ليلى | `Leda` | `voice_layla` | femme |
| 9 | Nour | نور | `Achernar` | `voice_nour` | femme |
| 10 | Ines | إيناس | `Kore` | — | femme |
| 11 | Aya | آية | `Aoede` | — | femme |
| 12 | Feriel | فريال | `Callirrhoe` | — | femme |
| 13 | Nada | ندى | `Autonoe` | — | femme |
| 14 | Salma | سلمى | `Despina` | — | femme |
| 15 | Rania | رانيا | `Erinome` | — | femme |
| 16 | Hanane | حنان | `Laomedeia` | — | femme |
| 17 | Amina | أمينة | `Vindemiatrix` | — | femme |
| 18 | Widad | وداد | `Gacrux` | — | femme |
| 19 | Anis | أنيس | `Enceladus` | — | homme |
| 20 | Zaki | زكي | `Iapetus` | — | homme |
| 21 | Walid | وليد | `Umbriel` | — | homme |
| 22 | Nabil | نبيل | `Algieba` | — | homme |
| 23 | Hakim | حكيم | `Rasalgethi` | — | homme |
| 24 | Adel | عادل | `Alnilam` | — | homme |
| 25 | Hicham | هشام | `Achird` | — | homme |
| 26 | Reda | رضا | `Zubenelgenubi` | — | homme |
| 27 | Yacine | ياسين | `Pulcherrima` | — | homme |
| 28 | Nassim | نسيم | `Schedar` | — | homme |
| 29 | Fares | فارس | `Sadachbia` | — | homme |
| 30 | Mourad | مراد | `Sadaltager` | — | homme |
**Les 30 genres sont désormais connus** (13 femmes, 17 hommes) et chaque `voice_name`
correspond à la bonne voix. La colonne « Ancien ID » rappelle l'identifiant historique : il
reste accepté pour toujours et ne s'arrête jamais de fonctionner.

### Comment choisir une voix ?

```bash
# Toute la liste, en arabe, avec l'URL de l'aperçu audio de chaque voix
curl "https://sawtify.space/api/v1/tts/voices?lang=ar"
```

Réponse :

```json
{
  "model": "gemini-3.8-flash-tts",
  "lang": "ar",
  "count": 30,
  "total": 30,
  "voices": [
    {
      "id": "Puck",
      "name_fr": "Amine",
      "name_ar": "أمين",
      "slug": "amine",
      "legacy_id": "voice_amin",
      "caractere": "مرح وحماسي",
      "gender": "male",
      "a_confirmer": false,
      "preview_url": "https://…/puck.wav",
      "preview_seconds": 10.8
    }
  ]
}
```

**Écoute avant d'intégrer.** `preview_url` est un fichier audio figé : le lire ne consomme
**aucun point** et ne déclenche aucun appel de synthèse.

> ⚠️ Une écriture inconnue (faute de frappe, ancien identifiant jamais publié…) ne provoque pas
> d'erreur : la voix **Amine** est utilisée par défaut. Vérifie tes identifiants avec
> `/api/v1/tts/voices` plutôt que de les deviner.

---

## 3. Les balises de sons et d'émotions

Une balise entre **chevrons** (`<laugh>`) demande un **son non-parlé** ou une **expression** :
rire, soupir, respiration, cri, pause, chuchotement…

```json
{ "text": "واش راكم خاوتي <laugh> راني هنا <sigh> بكل سرور." }
```

**40 balises officielles** sont acceptées. Elles peuvent s'écrire en **anglais** (forme officielle),
en **français** ou en **arabe** — **197 écritures au total**. Elles sont automatiquement
traduites vers la forme officielle avant l'envoi. Google ne les prononce jamais.

### Rire et joie

| Officiel | Français | Arabe |
|---|---|---|
| `<laugh>` | `<rire>` `<rires>` `<fou rire>` | `<ضحكة>` `<ضحك>` `<قهقهة خفيفة>` |
| `<giggle>` | `<gloussement>` `<rire leger>` `<petit rire>` | `<ضحكة خفيفة>` `<ضحكة صغيرة>` |
| `<chuckle>` | `<rire etouffe>` `<ricanement doux>` | `<ضحكة مكتومة>` `<ضحكة خفيفة مكتومة>` |
| `<cackle>` | `<rire aigu>` `<rire franc>` `<rire sonore>` | `<قهقهة>` `<ضحك بصوت عالي>` |
| `<snicker>` | `<ricanement>` `<rire moqueur>` | `<سخرية>` `<ضحكة ساخرة>` |
| `<cheer>` | `<acclamation>` `<hourra>` `<bravo>` | `<هتاف>` `<تصفيق فرح>` `<فرحة>` |

### Émotions fortes

| Officiel | Français | Arabe |
|---|---|---|
| `<gasp>` | `<surprise>` `<souffle coupe>` `<stupeur>` | `<شهقة>` `<مفاجأة>` `<شهقة مفاجأة>` |
| `<scream>` | `<cri>` `<hurlement>` | `<صرخة>` `<صراخ>` |
| `<shout>` | `<exclamation>` `<cri fort>` | `<صياح>` `<نظرة قوية>` |
| `<shriek>` | `<cri perçant>` `<cri aigu>` | `<صرخة حادة>` |
| `<grr>` | `<grognement>` `<enerve>` `<agace>` | `<تذمر>` `<غضب خفيف>` |
| `<growl>` | `<grondement>` `<menace>` | `<هدير>` `<دمدمة غاضبة>` |
| `<argh>` | `<exasperation>` `<ras le bol>` `<zut>` | `<تأفف>` `<يا حسراه>` `<طفح الكيل>` |
| `<tsk>` | `<claquement de langue>` `<desapprobation>` | `<لثغة>` `<استنكار>` `<لثغة استنكار>` |
| `<pff>` | `<soupir blase>` `<soulagement>` | `<تنفس الصعداء>` `<ارتياح>` |
| `<snort>` | `<reniflement>` `<derision>` | `<استنشاق ساخر>` |

### Tristesse

| Officiel | Français | Arabe |
|---|---|---|
| `<cry>` | `<pleurs>` `<pleurer>` `<sanglots>` | `<بكاء>` `<عياط>` |
| `<sob>` | `<sanglot>` `<sangloter>` | `<نشيج>` `<بكاء مكتوم>` |
| `<whimper>` | `<gemissement>` `<plainte faible>` | `<أنين>` `<أنين خفيف>` |
| `<moan>` | `<plainte>` `<ronchonnement>` | `<توجع>` |
| `<groan>` | `<rale>` `<plainte grave>` | `<تأوه>` `<تعب>` |

### Respiration

| Officiel | Français | Arabe |
|---|---|---|
| `<breath>` | `<respiration>` `<souffle>` | `<نفس>` `<تنفس>` |
| `<heavy breath>` | `<respiration lourde>` `<souffle lourd>` | `<نفس ثقيل>` `<تنفس عميق>` |
| `<exhales>` | `<expiration>` `<souffler>` `<soupir long>` | `<زفير>` `<إخراج النفس>` |
| `<pant>` | `<haletement>` `<essouffle>` | `<لهاث>` `<لهثة>` |
| `<sigh>` | `<soupir>` `<soupirs>` `<soupirer>` | `<تنهد>` `<تنهيدة>` `<زفرة>` |
| `<yawn>` | `<baillement>` `<baille>` | `<تثاؤب>` `<تعب ونعاس>` |
| `<sneeze>` | `<eternuement>` `<atchoum>` | `<عطسة>` `<عطس>` |
| `<cough>` | `<toux>` `<tousser>` | `<كحة>` `<سعال>` `<كح>` |
| `<throat-clearing>` | `<raclement de gorge>` `<toux legere>` | `<تنحنح>` `<تجهيز الصوت>` |

### Voix

| Officiel | Français | Arabe |
|---|---|---|
| `<whispers>` | `<chuchotement>` `<chuchoter>` `<murmure>` | `<همس>` `<همس خفيف>` |
| `<hiss>` | `<sifflement>` `<chut>` `<chuut>` | `<خشخشة>` `<صوت السكون>` |
| `<grunt>` | `<grommellement>` `<marmonner>` | `<دمدمة>` `<كلام غير واضح>` |

### Silences

| Officiel | Français | Arabe |
|---|---|---|
| `<short pause>` | `<pause courte>` `<petite pause>` `<courte pause>` | `<وقفة قصيرة>` `<سكتة قصيرة>` |
| `<long pause>` | `<pause longue>` `<grande pause>` | `<وقفة طويلة>` `<سكتة طويلة>` |

### Trois points à retenir

1. **Les accents ne comptent pas** : `<rire léger>`, `<RIRE LÉGER>` et `<rire leger>`,
   c'est la même balise. Idem pour la vocalisation arabe (`<ضَحْكة>` = `<ضحكة>`).
2. **Les balises inversées sont acceptées** : `>laugh<` est comprise comme `<laugh>`.
3. **La langue parlée ne change jamais.** Écrire une balise en anglais dans un texte arabe
   ne fait pas passer le texte en anglais : seule la balise est traduite, jamais le contenu.

### Ce qui n'est pas accepté

Les **bruits non humains** (`<applause>`, `<music>`, `<bang>`, `<door>`, `<bell>`, `<siren>`…)
sont refusés et **retirés automatiquement** : ils seraient lus tels quels.

### L'ancienne syntaxe à crochets `[like_this]`

Elle reste supportée pour les clients existants, mais elle **ne se comporte pas comme les chevrons** :
un crochet ne décrit pas un son, il décrit un **TON** (une couleur qui dure toute la lecture).

| Crochet | Devient |
|---|---|
| `[whispers]` · `[laughter]` · `[breathing]` | une **balise** officielle (`<whispers>`, `<laugh>`, `<breath>`) |
| `[calm]` · `[excited]` · `[dramatic]` · `[serious]` | un **ton**, transmis dans `speech_metadata.style` |
| `[articulated]` · `[fast]` | une **façon de dire**, cumulable avec un ton |
| `[natural]` | rien : c'est déjà le comportement par défaut |
| un mot inconnu, ex. `[promo]` | rien non plus — mais il est **prononcé** (ce n'est pas une balise) |

> ⚠️ **Un seul ton par lecture.** `[calm]` puis `[dramatic]` dans le même texte : seul le premier
> est appliqué. Le second est signalé dans `warnings` — impossible de changer de ton en plein
> milieu d'une réplique, car `speech_metadata.style` dure tout le tour.
>
> Conséquence directe : `[excited]` **ne produit plus** la balise `<cheer>`, qui déclenchait un bruit
> de foule au lieu d'une voix énergique (corrigé le 26/09/2026).

**La syntaxe à chevrons reste recommandée** : elle est plus riche (35 sons contre 11 écritures) et
conforme à la documentation Google.

---

## 4. Générer un fichier vocal

<span class="method">POST</span> `/api/v1/developer/tts`

### Paramètres du corps (JSON)

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `text` | string | — | **Obligatoire.** Texte à vocaliser, 5 000 caractères maximum. Les balises sont analysées et traduites. |
| `voice_id` | string | `voice_amin` | La voix. Accepte le prénom FR, le prénom AR, le slug, l'identifiant technique ou l'ancien `voice_*`. |
| `speed` | number | `1` | Vitesse. `0.8` = plus lent, `1.2` = plus rapide. |
| `pitch` | number | `1` | Hauteur de la voix. |
| `format` | string | `"wav"` | `"wav"` → fichier binaire direct · `"json"` → JSON + Base64. |

### En-têtes

| En-tête | Valeur |
|---|---|
| `X-Sawtify-API-Key` | `swt_beta_…` — ta clé |
| `Content-Type` | `application/json` |

L'en-tête `Authorization: Bearer swt_beta_…` fonctionne aussi.

### Réponse `format: "wav"` (défaut)

Le corps est **le fichier audio lui-même** (`audio/wav`), prêt à être sauvegardé ou rediffusé.

| En-tête de réponse | Signification |
|---|---|
| `X-Sawtify-Format` | `wav` |
| `X-Sawtify-Media-URL` | URL HTTPS valable 7 jours |
| `X-Sawtify-Duration` | Durée en secondes |
| `X-Sawtify-Points` | Points débités |
| `X-Sawtify-Milestone-Bonus` | `30` quand un bonus de dixième génération est accordé, sinon `0` |
| `X-Sawtify-Remaining-Balance` | Solde restant |

### Réponse `format: "json"`

```json
{
  "success": true,
  "beta": true,
  "format": "wav",
  "mime_type": "audio/wav",
  "sample_rate": 24000,
  "duration_seconds": 3.4,
  "points_deducted": 20,
  "points_remaining": 1480,
  "remaining_balance": 1480,
  "milestone_bonus": 0,
  "daily_gemini_calls": 4,
  "media_url": "https://sawtify.space/api/v1/developer/media/…/1712345678901.wav",
  "audio_url": "https://sawtify.space/api/v1/developer/media/…/1712345678901.wav",
  "wav_url": "https://sawtify.space/api/v1/developer/media/…/1712345678901.wav",
  "mp3_url": "https://sawtify.space/api/v1/developer/media/…/1712345678901.mp3",
  "mp3_mime_type": "audio/mpeg",
  "media_url_expires_in_seconds": 604800,
  "audio_base64": "UklGR…"
}
```

- `audio_base64` → le WAV complet, à décoder.
- `media_url` / `audio_url` / `wav_url` → la même chose, servie par HTTPS.
- `mp3_url` → **version MP3**, plus légère : c'est le format à préférer pour WhatsApp,
  Discord ou un widget web.
- `media_url_expires_in_seconds: 604800` → **les URL expirent après 7 jours**. Télécharge le
  fichier si tu dois le conserver plus longtemps.

### Exemples complets

#### cURL — fichier WAV direct

```bash
curl -X POST https://sawtify.space/api/v1/developer/tts \
  -H "X-Sawtify-API-Key: swt_beta_xxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour <short pause> votre commande est confirmée.",
    "voice_id": "Amine"
  }' \
  --output reponse.wav
```

#### JavaScript (Node 18+) — avec balises en darija

```js
const response = await fetch('https://sawtify.space/api/v1/developer/tts', {
  method: 'POST',
  headers: {
    'X-Sawtify-API-Key': process.env.SAWTIFY_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'واش راكم خاوتي <laugh> راني هنا <sigh> بكل سرور.',
    voice_id: 'Amine',      // ou 'أمين', ou 'voice_amin' — les trois marchent
    format: 'json'
  })
});

if (!response.ok) throw new Error(await response.text());
const data = await response.json();

// Deux façons d'utiliser l'audio :
const audio = Buffer.from(data.audio_base64, 'base64');   // en mémoire
// ou bien : récupérer l'URL distante (idéal pour WhatsApp / un lecteur web)
console.log(data.mp3_url || data.media_url);
```

#### Python

```python
import os, base64, requests

r = requests.post(
    "https://sawtify.space/api/v1/developer/tts",
    headers={
        "X-Sawtify-API-Key": os.environ["SAWTIFY_API_KEY"],
        "Content-Type": "application/json",
    },
    json={
        "text": "Bonjour <rires> votre appel est important pour nous.",
        "voice_id": "Khalid",
        "format": "json",
    },
    timeout=120,
)
r.raise_for_status()
data = r.json()

with open("reponse.wav", "wb") as f:
    f.write(base64.b64decode(data["audio_base64"]))

print("Points débités :", data["points_deducted"], "| Reste :", data["remaining_balance"])
```

---

## 5. Les autres endpoints

### Clés API

| Méthode | Chemin | Authentification | Rôle |
|---|---|---|---|
| `POST` | `/api/v1/developer/keys` | `Bearer` (session Sawtify) | Créer une clé → **201** |
| `GET` | `/api/v1/developer/keys` | `Bearer` (session Sawtify) | Lister tes clés (20 dernières) |
| `DELETE` | `/api/v1/developer/keys/:id` | `Bearer` (session Sawtify) | Révoquer une clé |

La révocation est **immédiate** : la clé passe à `active = false` et tout appel avec elle renvoie `401`.

```bash
# Lister
curl https://sawtify.space/api/v1/developer/keys \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN"

# Révoquer
curl -X DELETE https://sawtify.space/api/v1/developer/keys/8f1c… \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN"
```

### Statistiques d'usage

`GET /api/v1/developer/usage` — sur les **30 derniers jours**.

```json
{
  "period_days": 30,
  "api_calls": 128,
  "characters": 24180,
  "estimated_minutes": 28.8,
  "active_keys": 2,
  "keys": [ { "id": "…", "name": "Mon chatbot", "key_prefix": "swt_beta_…", "active": true, "last_used_at": "…" } ],
  "daily": { "2026-09-24": 41, "2026-09-25": 52, "2026-09-26": 35 }
}
```

### Catalogue des voix

`GET /api/v1/tts/voices` — les 30 voix avec prénoms FR/AR, caractère et URL d'aperçu.

| Paramètre | Effet |
|---|---|
| `lang=ar` | caractères en arabe (défaut : `fr`) |
| `avec_apercu=1` | ne garder que les voix dont l'aperçu audio est prêt |

### Aperçu audio d'une voix (gratuit)

`GET /api/v1/tts/preview?voice_id=Amine`

| Champ de la réponse | Signification |
|---|---|
| `audio_url` | fichier audio de démonstration |
| `voice_name` | nom technique résolu (`Puck`, `Kore`…) |
| `display_name` | prénom affiché (`Amine`) |
| `source` | d'où vient l'audio : `manifest` (fichier figé), `memory`, `storage` ou `gemini` (généré à l'instant) |

**Ne l'utilise pas pour écouter une voix.** Les aperçus figés (`source: "manifest"`) sont déjà
servis par `preview_url` dans `/voices` : c'est plus rapide et ça ne touche pas l'API payante.

### Fichiers média

`GET /api/v1/developer/media/:userId/:keyId/:fileName`

Sert le WAV ou le MP3 d'une génération passée, y compris à un service tiers (WhatsApp, Discord,
un lecteur web…) qui ne peut pas envoyer ta clé API. Aucune authentification n'est requise,
mais :

- l'URL est **imprévisible** (identifiants + horodatage en millisecondes) ;
- elle **expire après 7 jours** → ensuite la réponse est `410 Gone` ;
- le nom de fichier doit être un `.wav` ou un `.mp3` généré par Sawtify, sinon `404`.

```bash
curl -o ancien-message.mp3 \
  "https://sawtify.space/api/v1/developer/media/8f1c…/d92a…/1712345678901.mp3"
```

### Manifeste des aperçus

`GET /api/v1/tts/preview-manifest` — le détail technique des 30 aperçus générés (fichiers, durées,
dates, empreinte du script) plus `a_valider_a_loreille`, la liste des voix dont le genre reste
à confirmer. Renvoie `404` si aucun aperçu n'a encore été généré.

### Où en sont les aperçus

`GET /api/v1/tts/preview-status` — l'avancement de la fabrication des 30 aperçus de voix.
Les aperçus manquants sont fabriqués **automatiquement** par le serveur, en tâche de fond, au
démarrage (texte **100 % darija**, consigne « lis exactement ce qui est écrit ») : il n'y a donc
aucune commande à lancer. Réponse :

```json
{ "prets": 12, "total": 30, "restant": 18, "en_cours": true, "script_version": 2 }
```

`voix_manquantes` liste les voix pas encore prêtes. Aucune donnée sensible.

### Mauvaise méthode

`GET /api/v1/developer/tts` renvoie **`405 Method Not Allowed`** avec un message d'aide :

```json
{ "error": "Méthode incorrecte. Utilisez POST avec un body JSON contenant text, voice_id et format." }
```

---

## 6. Limites et erreurs

### Limites en vigueur

| Limite | Valeur |
|---|---|
| Longueur du texte | **5 000 caractères** par appel |
| Solde minimum pour accéder à l'API | **> 1 000 points** |
| Générations par jour | **20** (quota quotidien du compte) |
| Débit maximal (aperçus) | **10 requêtes / minute** par utilisateur |
| Durée de vie des URL média | **7 jours** |
| Tentatives automatiques par morceau | **3** |
| Découpage interne du texte | tous les **800 caractères**, en respectant les phrases |

Les textes longs sont découpés automatiquement **entre les phrases**, puis recollés : la voix et
le style restent identiques du début à la fin. Tu n'as rien à faire.

### Tableau des erreurs

| HTTP | Signification | Que faire |
|---:|---|---|
| `201` | Clé créée | Stocke la clé immédiatement : elle ne sera plus affichée |
| `400` | Paramètres invalides, `text` vide, texte trop long ou `format` inconnu | Corrige le corps de la requête |
| `401` | Clé absente, invalide ou révoquée | Vérifie `X-Sawtify-API-Key` ; recrée une clé si besoin |
| `402` | Solde insuffisant pour **cette** génération | Recharge des points — **aucun point n'est débité** |
| `403` | Solde ≤ 1 000 points (accès Beta fermé) | Recharge le compte au-delà de 1 000 points |
| `405` | Mauvaise méthode HTTP sur `/developer/tts` | Utilise `POST` |
| `410` | URL média expirée (plus de 7 jours) | Régénère, ou télécharge les fichiers plus tôt |
| `429` | Quota quotidien ou limite de requêtes atteint | Ralentis, ajoute une file d'attente |
| `500` | Erreur interne côté Sawtify | Réessaie ; si ça persiste, contacte le support |
| `503` | Service vocal temporairement indisponible, ou base de données inaccessible | Réessaie dans quelques secondes — **aucun audio invalide n'est débité** |

**Règle d'or :** un point n'est débité **que** lorsqu'un audio valide et complet a été produit.
Un échec ne coûte rien.

---

## 7. Sécurité — à lire absolument

| ✅ À faire | ❌ À ne jamais faire |
|---|---|
| Garder la clé dans une variable d'environnement **serveur** | La mettre dans du React, du HTML ou du JavaScript navigateur |
| Une clé **par** application ou par client | Partager une clé unique entre plusieurs projets |
| Révoquer immédiatement une clé qui a fuité | Attendre « de voir » |
| Appeler l'API depuis ton backend | Exposer l'API directement à un utilisateur final |
| Mettre en cache les réponses pour un texte identique | Rappeler l'API pour le même texte |

Sawtify ne conserve que l'**empreinte SHA-256** de chaque clé : même en cas de fuite de la base de
données, aucune clé n'est lisible. En contrepartie, **une clé perdue est définitivement perdue**.

### Recommandations de production

1. **File d'attente** : si dix messages arrivent en même temps, mets-les en file plutôt que
   d'envoyer dix requêtes simultanées.
2. **Cache applicatif** : `clé = hash(texte + voix + vitesse + hauteur)`. Un même texte ne doit
   pas être payé deux fois.
3. **Réessaie intelligemment** : sur `503`, attends 2 s puis 4 s, pas plus de 3 tentatives.
4. **Enregistre le `media_url`**, pas l'audio, si tu es pressé — mais **télécharge l'audio**
   si tu dois le garder plus de 7 jours.
5. **Préfère les aperçus figés** pour l'écoute des voix : ils sont gratuits et instantanés.

---

## 8. Ce qui a changé

### Ajouts (aucune rupture)

| Nouveauté | Détail |
|---|---|
| **30 voix** au lieu de 9 | Tableau complet au [§2](#2-les-30-voix) |
| **3 écritures par voix** | Prénom FR, prénom AR, identifiant technique — plus l'ancien `voice_*` |
| **35 sons, 197 écritures** | En anglais, français ou arabe → [§3](#3-les-balises-de-sons-et-démotions) |
| **`mp3_url`** | Version MP3, plus légère, pratique pour WhatsApp et les widgets web |
| **`/api/v1/tts/voices`** | Catalogue complet avec URL d'aperçu |
| **`/api/v1/tts/preview-manifest`** | Détail technique des aperçus générés |
| **`/api/v1/tts/preview-status`** | Avancement de la fabrication des 30 aperçus |
| **`/api/v1/developer/usage`** | Statistiques sur 30 jours, par jour |
| **Champ `source`** sur `/preview` | Indique si l'audio vient d'un fichier figé ou d'une génération |

### Garanties de compatibilité

- Les **9 `voice_*` historiques** fonctionnent toujours, à l'identique.
- L'ancienne syntaxe à **crochets** est toujours comprise, et **agit vraiment** : les tons
  (`[calm]`, `[excited]`, `[dramatic]`…) passent par `speech_metadata.style` (ils ne faisaient
  rien avant le 26/09/2026). Un seul ton par lecture — le premier gagne.
- La sortie reste **WAV PCM mono 24 kHz**.
- L'ancien identifiant jamais résolu retombait déjà sur Amine : ce comportement est conservé.

### Documentation parente

| Sujet | Fichier |
|---|---|
| Balises, langues et accents, en détail | `docs/langues-et-balises.md` |
| Les 30 voix et leurs prénoms | `docs/voix-et-noms.md` |
| Aperçus audio et page d'audition | `docs/apercus-audio.md` |
| Intégration Gemini 3.8 (côté serveur) | `docs/INTEGRATION-3.8-FAITE.md` |

---

<p align="center"><sub>Sawtify Developer API Beta · <a href="mailto:SAWTIFYSPACE@GMAIL.COM">SAWTIFYSPACE@GMAIL.COM</a></sub></p>
