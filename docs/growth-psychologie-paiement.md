# Croissance & psychologie du paiement

Cinq mécaniques pour faire passer l'utilisateur de « je teste gratuitement » à « je paie », puis à « je repaie ».
Tout ce qui touche aux points est **décidé et crédité par le serveur** ; le front ne fait qu'afficher.

| # | Mécanique | Levier psychologique | Où c'est visible |
|---|-----------|----------------------|------------------|
| 1 | Offre de première recharge : 500 DZD → **150 points au lieu de 100** | Foot-in-the-door (1re carte enregistrée = les paiements suivants deviennent faciles) | Pop-up à la 1re fin de solde + carte du pack 500 DZD |
| 2 | Price framing : « ≈ 90 DZD par voix-off » sous chaque pack | Ancrage (10× moins cher qu'un comédien) | Page Tarifs (FR + AR) |
| 3 | Parrainage : l'ami teste 3 voix (la 3e après une recharge) → **50 points pour l'expéditeur du lien uniquement** | Boucle virale : on ne récompense que celui qui partage | Bouton cadeau du header, carte Tarifs, lien `?ref=CODE` |
| 4 | Flash 5 min : pack 1 000 DZD **+50 % de points** — **disparaît dès le 1er paiement validé** | Aversion à la perte + FOMO | Pop-up à 0 point + bannière Tarifs |
| 5 | Cashback : **+20 % sur la prochaine recharge, 7 jours** | Rétention (le crédit « attend » l'utilisateur) | Notification juste après un paiement |

## Fichiers

- `src/config/growth.ts` — **le seul endroit à modifier** pour changer un pourcentage, une durée ou un pack ciblé (partagé serveur + front).
- `src/data/growthCopy.ts` — tous les textes FR + AR.
- `supabase/growth_engine.sql` — tables `user_growth`, `referrals` et les 3 fonctions atomiques (`credit_user_balance_with_promo`, `claim_referral`, `award_referral_if_ready`).
- `server.ts` — `creditIfPaid` (bonus appliqué au crédit), routes `GET /api/growth/status`, `POST /api/growth/first-offer/start`, `POST /api/referral/claim`, récompense de parrainage après la 3e génération.
- `src/hooks/useGrowth.ts`, `src/services/growth.ts`, `src/components/growth/*` — front.

## Mise en production (obligatoire)

1. Exécuter `supabase/growth_engine.sql` dans le **SQL Editor de Supabase** (idempotent, peut être rejoué).
2. Déployer le serveur puis le front.

Sans l'étape 1, rien ne casse : les routes growth répondent `enabled:false`, aucune promo n'est affichée ni créditée, seul le price framing reste visible.

## Règles anti-abus (côté SQL)

- L'offre de première recharge n'est accordée qu'**une fois** : la 2e facture ouverte pour le même compte ne reçoit pas de bonus (vérifié à l'instant du crédit, pas à la création de facture).
- Le chrono de l'offre est posé par le serveur (impossible de le rallonger en changeant l'heure du téléphone).
- Cashback : consommé à la recharge suivante puis reposé ; jamais cumulé avec l'offre de première recharge.
- Parrainage : pas d'auto-parrainage, pas de cycle A↔B, un seul parrain par filleul, compte de moins de 3 jours et sans historique, plafond de 20 filleuls récompensés par parrain.
- **Seul le parrain (expéditeur du lien) reçoit les 50 points** ; le filleul n'en reçoit aucun. Aucun point de départ n'est versé au filleul : ses 50 points de bienvenue ne paient que 2 voix, la 3e génération suppose donc une recharge payante — la récompense tombe donc quand l'ami paie réellement (« il paie et lance la 3e génération »).
- Le pop-up / la bannière de l'offre flash **ne s'affiche plus jamais dès que le premier paiement est validé** (`hasPaid` côté serveur + fermeture immédiate côté front) : l'offre ne concerne que les comptes qui n'ont jamais payé.

## Points d'attention business

- Le cashback est **reposé après chaque recharge payée** : c'est voulu (volant de rétention) mais c'est un coût de marge permanent (+20 % de points sur chaque recharge suivante en moins de 7 jours). Si la marge est serrée, passer `CASHBACK.percent` à 10 ou ne le reposer qu'une fois.
- Les offres de première recharge (150 / 330 points) diffèrent du catalogue (100 / 220) : la marge sur cette 1re recharge est plus faible ; elle est compensée par la valeur à vie du client qui a enregistré sa carte.
- Le pack 5 000 DZD est présenté « **+35 % de points** » (et non « -35 % de prix ») car le prix par voix-off calculé est 74 DZD contre 100 DZD au pack d'entrée : ~26 % moins cher, pas 35 %.
- Le parrainage n'est pas branché sur l'API développeur (`/api/v1/developer/tts`) : seules les générations faites depuis le studio comptent.
- Le parrainage ne rémunère que le partage (50 pts à l'envoyeur) : le filleul, lui, doit payer sa 3e voix. C'est un choix assumé — la viralité récompense l'apporteur d'affaires, pas le compte invité (qui bénéficie du bonus de bienvenue comme tout le monde).
