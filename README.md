# Sawtify

Plateforme Text-to-Speech ultra-rapide Pay-as-you-go avec paiement CIB & Edahabia pour l'Algérie.

## Architecture

- **Frontend** : Vite + React + Tailwind (SPA dans `src/`).
- **Backend** : Express dans `server.ts`.
- **Bases de données / Auth** : Supabase.
- **IA** : Google Gemini (TTS + text generation).
- **Paiement** : SlickPay.

## Variables d'environnement

Copie `.env.example` en `.env.local` et remplis les valeurs.

### Côté serveur (Render / Cloudflare Functions)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Clé API Google Gemini |
| `SUPABASE_URL` | URL projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role (secrète) |
| `SLICKPAY_API_KEY` | Clé API SlickPay (secrète) |
| `SLICKPAY_SANDBOX_KEY` | Clé sandbox SlickPay |
| `SLICKPAY_BASE_URL` | URL de base API SlickPay |
| `FRONTEND_URL` | URL du frontend (ex: Cloudflare Pages) |
| `NODE_ENV` | `production` en prod |
| `PORT` | Port d'écoute (Render fournit automatiquement) |

### Côté frontend (build Vite)

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du backend. Laisser vide si le backend sert aussi le frontend. |
| `VITE_SUPABASE_URL` | URL Supabase publique |
| `VITE_SUPABASE_ANON_KEY` | Clé anon Supabase |

## Déploiement

### Render (backend)

1. Créer un Web Service.
2. Build command : `npm install && npm run build`
3. Start command : `npm start`
4. Ajouter les variables d'environnement serveur dans le dashboard.

### Cloudflare Pages (frontend)

1. Build command : `npm install && npx vite build`
2. Output directory : `dist`
3. Ajouter les variables `VITE_*` dans Settings > Variables (elles sont injectées au build).
4. Pointer `VITE_API_URL` vers l'URL Render.

## Migrations Supabase

Appliquer dans l'ordre :

1. `supabase/schema.sql`
2. `supabase/fix_credits_security.sql`
3. `supabase/fix_welcome_credit_and_recharge.sql`
4. `supabase/fix_feedback_storage_atomic.sql`
5. `supabase/fix_deploy_and_security.sql`

## Commandes utiles

```bash
npm install
npm run dev       # dev local
npm run build     # build production
npm run lint      # vérification TypeScript
npm start         # démarrer le serveur de production
```
