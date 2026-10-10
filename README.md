# Sawtify

## Présentation

Sawtify est une plateforme algérienne de synthèse vocale (Text-to-Speech) nouvelle génération, pensée pour transformer instantanément du texte en voix naturelle et expressive. Conçue pour répondre aux besoins du marché local, elle propose un système de paiement à l'usage (Pay-as-you-go) intégrant les moyens de paiement algériens CIB et Edahabia.

## Pourquoi Sawtify

- **Rapidité** : génération de voix quasi instantanée, sans configuration complexe.
- **Qualité naturelle** : des voix expressives, proches d'une élocution humaine, adaptées à différents contextes d'usage.
- **Accessibilité locale** : paiement simple et sécurisé via CIB et Edahabia, sans besoin de carte internationale.
- **Simplicité d'utilisation** : une interface claire, pensée pour être utilisée sans compétence technique.

## À qui s'adresse Sawtify

- Créateurs de contenu et influenceurs souhaitant produire des voix off rapidement.
- Entreprises et agences ayant besoin de contenus audio pour leurs publicités ou réseaux sociaux.
- Enseignants et formateurs souhaitant vocaliser des supports pédagogiques.
- Toute personne ou structure ayant besoin de convertir du texte en voix, sans matériel ni compétence en enregistrement audio.

## Fonctionnement

1. L'utilisateur crée un compte sur la plateforme.
2. Il saisit ou colle le texte à transformer en voix.
3. Il choisit la voix souhaitée.
4. La génération se fait en quelques secondes.
5. L'audio est disponible en écoute et en téléchargement.

Le système fonctionne sur un modèle de crédits : chaque utilisateur dispose d'un solde qu'il peut recharger selon ses besoins, sans abonnement obligatoire.

## Accès temporaire à Agent IA

Pendant le développement, l'accès à l'espace Agent et à ses API est protégé par un code vérifié par le serveur. Configure `AGENT_ACCESS_CODE` et un `AGENT_ACCESS_SECRET` aléatoire d'au moins 32 caractères dans les variables d'environnement **du serveur uniquement**. Ne place pas ces valeurs dans Supabase, dans une variable `VITE_*`, ni dans le dépôt. Si `AGENT_ACCESS_SECRET` est absent, le serveur utilise `SUPABASE_SERVICE_ROLE_KEY`, mais un secret dédié est préférable.

Le jeton de session expire après 12 heures. Le portail informatif `/agent-ai` reste public. Pour retirer le code partagé plus tard, configure `AGENT_ACCESS_GATE_ENABLED=false` côté serveur. Le schéma de paiement Agent est fourni dans `supabase/agent_sawtify_pricing.sql` et doit être appliqué séparément dans Supabase.

## Contact

Pour toute question, démonstration ou partenariat concernant Sawtify, n'hésitez pas à nous contacter directement.
