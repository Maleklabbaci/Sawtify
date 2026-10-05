# Connecteur MCP Sawtify

URL du connecteur : `https://sawtify.space/mcp` (OAuth 2.1 + PKCE, inscription dynamique).

## Fichiers
- `mcp/mcp.ts` : endpoint `/mcp` + outils `lister_voix`, `generer_voix`, `voir_credits`, `historique_generations`
- `mcp/oauth.ts` : métadonnées, `/oauth/register`, `/oauth/authorize`, `/oauth/approve`, `/oauth/token`
- `functions/mcp.ts`, `functions/oauth/[[path]].ts`, `functions/.well-known/[[path]].ts` : proxy Cloudflare -> Render
- `server.ts` : appel `registerMcp(...)` juste après `express.json`

## Variables d'environnement (Render)
- `SUPABASE_ANON_KEY` : **obligatoire** (page de connexion OAuth)
- `MCP_OAUTH_SECRET` : recommandé (chaîne aléatoire 32+ caractères) ; sinon dérivé de `SUPABASE_JWT_SECRET`
- `PUBLIC_BASE_URL` : optionnel (défaut = `PUBLIC_MEDIA_URL`, soit `https://sawtify.space`)

## Test
1. Claude : Paramètres > Connecteurs > Ajouter un connecteur personnalisé > `https://sawtify.space/mcp`
2. ChatGPT : mode développeur > nouveau connecteur MCP > même URL
3. Claude Code / Gemini CLI : même URL avec l'en-tête `Authorization: Bearer swt_beta_...` (clé API existante)
4. Test : « Écris un script pub de 20 s en darija et génère la voix avec Sawtify. »

## Limites connues
- Instance Render unique : l'usage unique des codes OAuth est en mémoire (redémarrage = réinitialisé, sans impact réel : code valable 5 min + PKCE).
- Le lien audio est valable 7 jours.
- Pour la soumission aux répertoires : politique de confidentialité, page de doc et compte de test à préparer.
