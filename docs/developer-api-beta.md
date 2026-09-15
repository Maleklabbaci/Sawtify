# Sawtify Developer API — Beta

La Developer API permet d’intégrer la synthèse vocale Sawtify dans un chatbot, une boîte vocale, un CRM, une application mobile ou un automatisme de réponse. Elle renvoie par défaut un fichier **WAV PCM mono 24 kHz**, format directement compatible avec la plupart des lecteurs, bots et systèmes téléphoniques.

## Conditions Beta

L’accès développeur nécessite un solde disponible de **plus de 1 000 points**. Chaque génération API utilise le même débit que le Studio. Les previews des voix déjà uploadées restent gratuites et ne passent pas par cette API payante.

Les clés doivent être créées depuis une session Sawtify authentifiée. La clé brute n’est affichée qu’une seule fois. Ne la mettez jamais dans le frontend public, Git, une extension navigateur ou un message de chatbot.

## Étape 1 — Créer une clé

```bash
curl -X POST https://sawtify.space/api/v1/developer/keys \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mon chatbot Beta"}'
```

Réponse :

```json
{
  "beta": true,
  "api_key": "swt_beta_...",
  "warning": "Copiez cette clé maintenant. Elle ne sera plus affichée."
}
```

## Étape 2 — Générer un fichier vocal

La réponse par défaut est directement `audio/wav`.

```bash
curl -X POST https://sawtify.space/api/v1/developer/tts \
  -H "X-Sawtify-API-Key: swt_beta_xxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "text":"Bonjour, votre message a bien été reçu.",
    "voice_id":"voice_amin",
    "speed":1,
    "pitch":1
  }' \
  --output reply.wav
```

Headers utiles :

| Header | Signification |
|---|---|
| `X-Sawtify-Format` | `wav` |
| `X-Sawtify-Duration` | Durée en secondes |
| `X-Sawtify-Points` | Points débités |
| `X-Sawtify-Milestone-Bonus` | `30` lorsqu’un bonus de dixième génération est accordé |
| `X-Sawtify-Remaining-Balance` | Solde restant |

## Réponse JSON pour un chatbot

Utilisez `format: "json"` si votre plateforme ne sait pas recevoir directement un fichier binaire.

```bash
curl -X POST https://sawtify.space/api/v1/developer/tts \
  -H "X-Sawtify-API-Key: swt_beta_xxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"text":"Votre commande est confirmée.","voice_id":"voice_yasmin","format":"json"}'
```

La réponse contient `audio_base64`, `mime_type: audio/wav`, `sample_rate: 24000`, la durée et le coût. Elle contient également `media_url` et `audio_url` : une URL HTTPS signée, valable 7 jours, que tu peux coller dans le champ **Media URL** de n8n, Viasocket, un chatbot ou une boîte vocale. Pour un serveur vocal, tu peux aussi décoder la base64 vers un buffer WAV.

```json
{
  "media_url": "https://.../audio-generations/.../signed-url",
  "audio_url": "https://.../audio-generations/.../signed-url",
  "media_type": "audio/wav",
  "mime_type": "audio/wav",
  "format": "wav",
  "sample_rate": 24000
}
```

Le format audio est **WAV PCM mono 24 kHz**, accepté par la majorité des outils d’automatisation. Avec `format: "wav"`, l’URL est aussi disponible dans l’en-tête `X-Sawtify-Media-URL`.

## Exemple JavaScript serveur

```js
const response = await fetch('https://sawtify.space/api/v1/developer/tts', {
  method: 'POST',
  headers: {
    'X-Sawtify-API-Key': process.env.SAWTIFY_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Bonjour, nous avons bien reçu votre message.',
    voice_id: 'voice_amin',
    format: 'json'
  })
});

if (!response.ok) throw new Error(await response.text());
const result = await response.json();
const audioBuffer = Buffer.from(result.audio_base64, 'base64');
// Envoyer audioBuffer à ton chatbot, ton serveur vocal ou ton stockage.
```

## Exemple Python

```python
import os, base64, requests

response = requests.post(
    "https://sawtify.space/api/v1/developer/tts",
    headers={
        "X-Sawtify-API-Key": os.environ["SAWTIFY_API_KEY"],
        "Content-Type": "application/json",
    },
    json={"text": "Bonjour, votre appel est important pour nous.", "voice_id": "voice_khalid", "format": "json"},
)
response.raise_for_status()
data = response.json()
with open("reply.wav", "wb") as audio:
    audio.write(base64.b64decode(data["audio_base64"]))
```

## Voix disponibles

`voice_amin`, `voice_yasmin`, `voice_khalid`, `voice_maryam`, `voice_rashid`, `voice_layla`, `voice_bilal`, `voice_nour`, `voice_faycal`.

## Quotas et erreurs

Le texte est limité à **5 000 caractères**. Le quota quotidien de génération est contrôlé côté serveur. Les réponses importantes sont :

| HTTP | Signification |
|---:|---|
| `400` | Paramètres invalides ou texte trop long |
| `401` | Clé absente, invalide ou révoquée |
| `403` | Solde inférieur ou égal à 1 000 points |
| `402` | Solde insuffisant pour la génération |
| `429` | Quota ou limite de requêtes atteinte |
| `503` | Gemini temporairement indisponible; aucun débit si aucun audio valide n’est produit |

## Gestion des clés

```bash
curl https://sawtify.space/api/v1/developer/keys \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN"

curl -X DELETE https://sawtify.space/api/v1/developer/keys/KEY_ID \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN"
```

## Règles de production recommandées

Conserver la clé uniquement dans une variable serveur. Ajouter une file d’attente dans ton chatbot si plusieurs messages arrivent en même temps. Mettre en cache les réponses identiques si le texte est strictement identique. Ne jamais appeler l’endpoint pour écouter une voix : les extraits uploadés du catalogue sont gratuits et doivent être lus directement depuis leur URL audio.
