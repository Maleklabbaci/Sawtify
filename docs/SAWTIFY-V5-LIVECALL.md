# Sawtify v5 — appels vocaux réels

Cette livraison raccorde l’appel client au modèle vocal en direct et conserve les secrets côté serveur.

## Parcours

1. `/api/agent/sawtify/init` vérifie la boutique, la configuration et le portefeuille, puis fournit un jeton Live à usage unique.
2. `/start` démarre le chronomètre serveur, puis le navigateur ouvre le flux audio bidirectionnel.
3. Les réponses d’outil vérifient les données actuelles. Une commande ou une demande n’est enregistrée comme action confirmée qu’après un récapitulatif et un accord explicite; elle est finalisée à `/end`.
4. `/end` débite une seule fois la durée serveur et finalise les actions en attente. Le tableau de bord du commerçant actualise les demandes et affiche une notification intégrée.

La durée, les secondes restantes et le solde ne sont pas renvoyés à l’interface client. Les langues d’appel proposées sont la darija algérienne, le français et l’anglais; la langue choisie ne change pas pendant l’appel. Le modèle par défaut est `gemini-3.8-live`; la clé API n’est utilisée que par le serveur Render.

## Voix de l’Agent

Par défaut, Live génère la réponse en texte (et conserve ses appels d’outil), puis le serveur la fait parler par le moteur TTS de Sawtify. La voix enregistrée dans la boutique (`agentVoiceId`) est donc utilisée pendant l’appel. La darija reçoit un registre algérien explicite; le français et l’anglais ont également leur propre consigne de prononciation. L’introduction artificielle « … » du TTS général est désactivée pour les réponses conversationnelles.

Les réponses parlées sont limitées à 700 caractères, à 4 000 caractères synthétisés par appel, et protégées par une limite de 18 requêtes vocales par minute et les plafonds Gemini de l’utilisateur. En cas d’échec du TTS, le transcript reste visible et aucun audio synthétique de remplacement n’est inventé. Pour revenir à la voix audio native de Gemini Live, régler `AGENT_LIVE_OUTPUT_MODE=gemini_live` côté serveur; `AGENT_LIVE_VOICE` ne s’applique qu’à ce mode. `AGENT_LIVE_OUTPUT_MODE=sawtify_tts` est la valeur par défaut.

## Mise en service manuelle

1. Dans le SQL Editor du projet Supabase, appliquer le script complet `supabase/agent_sawtify_pricing.sql`. Il contient le schéma de facturation existant ainsi que les tables et fonctions de session vocale.
2. Vérifier que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont configurées dans l’environnement serveur Render. Pour Gemini, utiliser `GEMINI_API_KEY_FREE` (projet gratuit) et `GEMINI_API_KEY_PAID` (projet facturé); `GEMINI_API_KEY` reste accepté comme clé de secours historique. Ne jamais placer une clé dans une variable `VITE_*`, le navigateur, le dépôt ou la conversation. Voir `docs/gemini-api-keys.md`.
3. Construire et déployer le serveur depuis l’environnement Render habituel. Aucun déploiement ni push GitHub n’a été effectué pour cette archive.

Aucun canal e-mail/SMS externe n’étant configuré, la notification commerçant de cette version est intégrée au tableau de bord (mise à jour périodique pendant qu’il est ouvert; les demandes restent visibles au prochain chargement).

## Vérifications locales

- `npm run lint`
- `npm run build`
- Analyse syntaxique PostgreSQL du script de migration
