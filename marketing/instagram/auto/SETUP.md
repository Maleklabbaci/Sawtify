# Publication 100 % automatique — installation

Objectif : après ~40 min d'installation, **30 carrousels partent seuls** aux
dates et heures du plan, sans que tu ouvres Instagram une seule fois.

Flux : `Google Drive → Cloudinary (URL publique) → API Instagram`.
Le job tourne sur GitHub Actions (gratuit), 2 fois par heure, et ne publie que
le jour J à l'heure prévue, fuseau Africa/Algiers.

---

## 0. Ce qu'il faut avant de commencer

- Ton compte Instagram est **professionnel** (Business ou Créateur) et relié à
  une **Page Facebook**. (Metricool a pu se connecter, donc c'est déjà le cas.)
- Un compte GitHub (le dépôt), un compte Google, un compte Cloudinary (gratuit).

---

## 1. Rendre le dossier Drive lisible (2 min)

Drive → dossier du plan → clic droit → **Partager** → Accès général :
**Toute personne disposant du lien** → Lecteur. Sans ça, le script ne peut pas
lire les images.

## 2. Clé API Google (5 min, gratuit)

1. `console.cloud.google.com` → créer un projet « Sawtify ».
2. **API et services → Bibliothèque** → activer **Google Drive API**.
3. **Identifiants → Créer → Clé API**. Copie-la : ce sera `GOOGLE_API_KEY`.
   (Pas besoin de restreindre pour un usage privé, mais tu peux limiter la clé
   à la seule Drive API.)

## 3. Cloudinary (5 min, gratuit, sans carte)

1. `cloudinary.com` → inscription → le **Dashboard** affiche :
   - **Cloud name** → `CLOUDINARY_CLOUD`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

Ça sert uniquement à héberger les JPEG le temps que Meta les télécharge.

## 4. Application Meta + jeton (15 min, la partie la plus technique)

1. `developers.facebook.com` → **Mes applications → Créer une application**
   → type **Business**.
2. Dans l'app : **Ajouter un produit → Instagram → API Instagram avec
   connexion Facebook** (ou « Instagram Graph API »).
3. Ouvre **Graph API Explorer** (`developers.facebook.com/tools/explorer`) :
   - sélectionne ton app,
   - **Add permissions** : `instagram_basic`, `instagram_content_publish`,
     `pages_show_list`, `pages_read_engagement`,
   - **Generate Access Token** → autorise.
4. Récupère l'ID du compte Instagram :
   ```
   GET /me/accounts                                   → id de la Page
   GET /{page-id}?fields=instagram_business_account   → id du compte IG
   ```
   Cet id est `IG_USER_ID`.
5. Transforme le jeton court en **jeton longue durée (~60 jours)** :
   ```
   GET https://graph.facebook.com/v21.0/oauth/access_token
       ?grant_type=fb_exchange_token
       &client_id={APP_ID}
       &client_secret={APP_SECRET}
       &fb_exchange_token={TOKEN_COURT}
   ```
   Le `access_token` retourné est `IG_ACCESS_TOKEN`.

> Publier sur **ton propre compte** avec **ton propre app** ne nécessite pas de
> revue d'app (App Review). Tu restes en mode développement.

## 5. Secrets GitHub (3 min)

Dépôt → **Settings → Secrets and variables → Actions → New repository secret**.
Crée les 6 :

| Nom | Valeur |
|---|---|
| `GOOGLE_API_KEY` | étape 2 |
| `CLOUDINARY_CLOUD` | étape 3 |
| `CLOUDINARY_API_KEY` | étape 3 |
| `CLOUDINARY_API_SECRET` | étape 3 |
| `IG_USER_ID` | étape 4.4 |
| `IG_ACCESS_TOKEN` | étape 4.5 |

## 6. Tester sans rien publier (5 min)

Onglet **Actions → « Instagram — publication automatique » → Run workflow** :

1. `day = J01`, `dry_run = true` → vérifie dans le log : 4 slides trouvées,
   aucun conteneur créé.
2. Relance avec `dry_run = false` → le carrousel part réellement sur ton compte.
3. Regarde le post : 4 slides dans l'ordre, légende complète, arabe correct.

Si J01 est bon, il n'y a plus rien à faire : J02 → J30 partiront seuls.

## 7. Suivi

- `auto/state/published.json` liste les jours publiés. Un job relancé ne
  republie jamais deux fois.
- Si le job rate son créneau (GitHub en retard), il rattrape dans les **6 h**
  qui suivent.
- Tu peux publier un jour à la main : `Run workflow` avec `day = J07`.

## 8. Le seul entretien : le jeton expire

Le jeton longue durée vit **~60 jours**. Le plan tient 30 jours, donc c'est
bon pour ce mois. Pour le mois suivant : refais l'étape 4.5 et remplace le
secret `IG_ACCESS_TOKEN`. Mets un rappel au 25 décembre.

---

## En local (si tu préfères sans GitHub Actions)

```bash
cd marketing/instagram/auto
export GOOGLE_API_KEY=...  CLOUDINARY_CLOUD=...  CLOUDINARY_API_KEY=...
export CLOUDINARY_API_SECRET=...  IG_USER_ID=...  IG_ACCESS_TOKEN=...

python3 auto_publish.py --dry-run            # simulation
python3 auto_publish.py                      # publie si c'est l'heure
python3 auto_publish.py --day J05 --force     # force un jour
```

Nécessite `pip install pillow` pour la conversion PNG → JPEG (facultatif).

---

## Ce qui peut échouer, et pourquoi

| Symptôme | Cause | Solution |
|---|---|---|
| `Aucune slide trouvée` | dossier Drive non public | refaire l'étape 1 |
| `HTTP 400 … image_url` | Cloudinary mal configuré | vérifier les 3 secrets Cloudinary |
| `HTTP 403 / OAuth` | jeton expiré ou permission manquante | refaire l'étape 4 |
| `attendu N slides, trouvé M` | dossier Drive incomplet | vérifier le dossier en question |
| Rien ne part | créneau déjà dépassé de +6 h | `Run workflow` avec `day = Jxx` |
| Post publié mais moche | — | supprimer, corriger le visuel, relancer ce jour |
