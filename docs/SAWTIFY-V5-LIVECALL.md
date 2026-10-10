# Sawtify v5 — appels vocaux réels

Cette livraison raccorde l’appel client au modèle vocal en direct et conserve les secrets côté serveur.

## Parcours

1. `/api/agent/sawtify/init` vérifie la boutique, la configuration et le portefeuille, puis fournit un jeton Live à usage unique.
2. `/start` démarre le chronomètre serveur, puis le navigateur ouvre le flux audio bidirectionnel.
3. Les réponses d’outil vérifient les données actuelles. Une commande ou une demande n’est enregistrée comme action confirmée qu’après un récapitulatif et un accord explicite; elle est finalisée à `/end`.
4. `/end` débite une seule fois la durée serveur et finalise les actions en attente. Le tableau de bord du commerçant actualise les demandes et affiche une notification intégrée.

La durée, les secondes restantes et le solde ne sont pas renvoyés à l’interface client. Les langues d’appel proposées sont la darija algérienne, le français et l’anglais; la langue choisie ne change pas pendant l’appel. Le modèle par défaut est `gemini-3.8-live`; la clé API n’est utilisée que par le serveur Render.

## Mise en service manuelle

1. Dans le SQL Editor du projet Supabase, appliquer le script complet `supabase/agent_sawtify_pricing.sql`. Il contient le schéma de facturation existant ainsi que les tables et fonctions de session vocale.
2. Vérifier que `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `GEMINI_API_KEY` sont configurées dans l’environnement serveur Render. Ne jamais ajouter `GEMINI_API_KEY` à une variable `VITE_*`, au navigateur ou au dépôt.
3. Construire et déployer le serveur depuis l’environnement Render habituel. Aucun déploiement ni push GitHub n’a été effectué pour cette archive.

Aucun canal e-mail/SMS externe n’étant configuré, la notification commerçant de cette version est intégrée au tableau de bord (mise à jour périodique pendant qu’il est ouvert; les demandes restent visibles au prochain chargement).

## Vérifications locales

- `npm run lint`
- `npm run build`
- Analyse syntaxique PostgreSQL du script de migration
