# Pop-ups et dialogues Sawtify — règles d’interface

Les vraies fenêtres de dialogue de la plateforme doivent utiliser le socle partagé `src/components/ui/ModalShell.tsx`. Il centralise le portail vers `document.body`, le calque au-dessus de la navigation, le voile assombri et flouté, le verrouillage du défilement, le focus clavier, la fermeture avec Échap et le clic extérieur, ainsi que les marges de zone sûre sur mobile. Les panneaux et le voile partagent une entrée discrète; les animations sont désactivées si l’utilisateur préfère réduire les mouvements.

## Utilisation

- Utiliser `ModalShell` pour toute vraie boîte de dialogue; ne pas recréer un overlay `fixed` avec un z-index propre au composant.
- Relier chaque dialogue à un titre avec `ariaLabelledBy` et `ModalTitle`, ou fournir un `ariaLabel` lorsque le titre est représenté autrement. Associer la description avec `ariaDescribedBy` et `ModalDescription` lorsqu’elle apporte un contexte utile.
- Choisir une taille (`sm`, `md`, `lg`, `xl`, `wide` ou `full`) et ne personnaliser que les besoins propres au contenu via `panelClassName`.
- Pour un formulaire dense sur téléphone, utiliser `placement="sheet"` : le panneau s’aligne en bas, respecte les zones sûres et retrouve une présentation centrée sur écran plus large.
- Utiliser `ConfirmDialog` pour les confirmations destructives. Les confirmations natives du navigateur (`window.confirm`) ne doivent pas être réintroduites.
- Fournir des libellés explicites et localisés aux boutons qui ne montrent qu’une icône.

## Dialogues harmonisés

Le socle partagé est utilisé par les modales de recharge et de croissance, les nouveautés et astuces du studio, le signalement, le dialogue WhatsApp d’administration, le paiement Pricing, les réglages du Studio, les formulaires Agent et leurs confirmations destructives.

## Menus, sélecteurs et notifications

- Les popovers Balises / Voix / Région du Studio utilisent `saw-popover-backdrop` et `saw-pop-fix` dans `src/index.css` : même voile flouté, surfaces verre, ombre, rayons et animation, sur ordinateur comme sur mobile.
- Le tiroir de navigation de la landing conserve sa palette sombre, mais partage désormais le principe de voile flouté et respecte la typographie arabe lorsqu’elle est sélectionnée.
- Un toast ou une notification de statut n’est pas un dialogue : il reste compact, lisible et non bloquant, sans flouter toute la page ni verrouiller le scroll. Conserver `role="status"` / `aria-live` quand c’est pertinent.
- Les parcours plein écran (connexion/inscription, onboarding et page d’appel intégrée) restent des écrans à part entière; ils ne doivent pas être enfermés dans une boîte de dialogue.
