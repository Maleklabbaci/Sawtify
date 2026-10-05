# Connecteur MCP Sawtify

URL du connecteur : `https://sawtify.space/mcp` (OAuth 2.1 + PKCE, inscription dynamique).

## Fichiers
- `mcp/mcp.ts` : endpoint `/mcp` + outils `lister_voix`, `generer_voix`, `voir_credits`, `historique_generations`
- `mcp/oauth.ts` : métadonnées, `/oauth/register`, `/oauth/authorize`, `/oauth/approve`, `/oauth/token`
- `functions/_middleware.ts` + `public/_routes.json` : proxy Cloudflare -> Render pour `/mcp`, `/oauth/*`, `/.well-known/oauth-*` (un seul fichier, sans dossier caché)
- `server.ts` : appel `registerMcp(...)` juste après `express.json` ; log de démarrage `[MCP] Connecteur actif`
- `src/components/DeveloperPage.tsx` : section « Connecteur IA (MCP) » (URL à copier, étapes Claude/ChatGPT, commande Claude Code)

## Variables d'environnement (Render)
- `MCP_OAUTH_SECRET` : **obligatoire**, chaîne aléatoire de 32 caractères minimum. Sans elle, le connecteur est désactivé (message `[MCP] Connecteur DÉSACTIVÉ` dans les logs).
- `VITE_SUPABASE_ANON_KEY` (ou `SUPABASE_ANON_KEY`) : déjà présente, sert à la page de connexion OAuth
- `SUPABASE_JWT_SECRET` : **pas nécessaire** pour le connecteur
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

## Vérification rapide après déploiement
- `https://sawtify.space/.well-known/oauth-protected-resource` doit afficher du JSON
- `https://sawtify.space/.well-known/oauth-authorization-server` doit afficher du JSON avec `registration_endpoint`
- `https://sawtify.space/mcp` ouvert dans un navigateur affiche « Méthode non autorisée » : c'est normal (le connecteur utilise POST)

## Admin : origine des générations
- Exécuter une fois `supabase/mcp_generation_channel.sql` (Supabase > SQL Editor) : ajoute la colonne `generation_channel`.
- Chaque génération MCP est marquée `mcp_claude`, `mcp_chatgpt`, `mcp_apikey` (clé API) ou `mcp_other`, d'après le nom du client OAuth. L'audio est aussi rattaché à la génération (écoute possible dans l'admin).
- Avant le SQL, l'admin continue de fonctionner (repli automatique), sans l'origine MCP.
- Les connexions faites avant cette version n'ont pas de nom de client : déconnecter puis reconnecter le connecteur une fois pour obtenir « MCP · Claude ».

## Page Développeur
- Onglet « Connecteur IA (MCP) » : ouvert à tous.
- Onglet « API par clé » : réservé aux comptes de plus de 1 000 points (écran verrouillé avec progression sinon).

## Page de connexion OAuth
`mcp/authorizePage.ts` : même design que le login de la plateforme (connexion e-mail, Google, création de compte, mot de passe oublié, FR/AR). La session est partagée avec sawtify.space : un utilisateur déjà connecté arrive directement sur l'écran « Autoriser ».
