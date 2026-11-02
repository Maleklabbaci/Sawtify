---
version: beta
name: Sawtify Instagram — pilote iOS premium J01
description: >-
  Direction visuelle premium inspirée de la sobriété produit iOS, pour un
  carrousel Instagram statique J01 en 1080×1350. La palette Sawtify reste
  strictement inchangée. Grandes zones calmes, typographie maîtrisée, cartes
  arrondies, ombres douces et pictogrammes dessinés sur mesure. Le rendu est
  un JPG social, pas une interface web ou un carrousel interactif.

colors:
  canvas: "#F2F1ED"
  ink: "#111113"
  muted: "#605A6E"
  violet: "#6D27EA"
  violet-soft: "#D3C3FF"
  orange: "#FD6029"

typography:
  display-dz:
    fontFamily: "Amiri Bold"
    fontSize: 96px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: 0
  display-fr:
    fontFamily: "Space Grotesk Bold"
    fontSize: 80px
    fontWeight: 700
    lineHeight: 1.10
    letterSpacing: 0
  utility:
    fontFamily: "Space Grotesk Medium"
    fontSize: 19px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 0.02em
  badge-dz:
    fontFamily: "Amiri Bold"
    fontSize: 23px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: 0
  badge-fr:
    fontFamily: "Space Grotesk Bold"
    fontSize: 19px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: 0

rounded:
  card: 28px
  photo: 28px
  chip: 9999px
  kicker: 9999px
  highlight: 0px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  canvas-margin: 72px
  footer-top: 1238px

components:
  canvas:
    backgroundColor: "{colors.canvas}"
    width: 1080px
    height: 1350px
    safeMargin: 72px
  headline:
    color: "{colors.ink}"
    typography: "{typography.display-dz} / {typography.display-fr}"
    maxWidth: 936px
  kicker:
    backgroundColor: "{colors.violet-soft}"
    dotColor: "{colors.orange}"
    radius: "{rounded.kicker}"
  title-highlight:
    backgroundColor: "{colors.violet-soft}"
    textColor: "{colors.ink}"
    underlineColor: "{colors.orange}"
  product-card:
    radius: "{rounded.card}"
    shadow: "soft, offset 9px, blur 13px"
  chip:
    radius: "{rounded.chip}"
    shadow: "one soft shadow per chip"
    minHeight: 50px
---

## Philosophie visuelle — « iOS premium, palette Sawtify »

Le J01 adopte une esthétique calme, nette et premium inspirée des principes
visuels d'iOS : hiérarchie immédiate, grands espaces libres, surfaces douces,
coins généreusement arrondis et ombres discrètes. C'est une direction graphique
pour des images sociales statiques — pas une reproduction d'écran Apple, pas une
interface d'application et pas un composant de carrousel web.

La palette de marque ne bouge pas : crème, encre, gris violet, violet Sawtify,
lavande et orange. Les photographies gardent leur rendu naturel ou sont passées
en duotone crème/encre selon le sujet; aucune couleur supplémentaire n'est
introduite dans les formes et composants graphiques.

Chaque slide porte une idée. Une grande phrase, un module visuel et quelques
pastilles suffisent. Les cartes arrondies structurent le récit sans former une
grille répétitive. Le ton reste éditorial et conçu à la main : alignements
contrôlés, respirations régulières, pictogrammes vectoriels spécifiques et
aucune décoration générique.

Le français se lit de gauche à droite; le texte arabe et ses éléments de
composition sont miroités de droite à gauche. Le copy, les chiffres et les
pastilles restent ceux de `programme.py` : seul le traitement visuel de ce
pilote J01 change.

## Périmètre

**Test autonome de J01 uniquement.** Le script écrit dans
`slides/pilote-J01/{dz,fr}/` et ne modifie pas les exports approuvés
`slides/jour-J01..J30/`, le texte de production ou les autres journées.
Il produit dix JPG statiques, cinq par langue, en 1080×1350 px, plus une planche
de contrôle. Aucun déploiement au-delà de J01 sans validation explicite.

## Palette

| Token | Hex | Usage |
|---|---|---|
| `colors.canvas` | `#F2F1ED` | Fond principal, surface claire et contre-forme. |
| `colors.ink` | `#111113` | Titres, texte principal et carte sonore sombre. |
| `colors.muted` | `#605A6E` | Pieds de page et filets. |
| `colors.violet` | `#6D27EA` | Wordmark, pastille principale, onde et médaillon. |
| `colors.violet-soft` | `#D3C3FF` | Kicker, surlignage, surfaces et accents clairs. |
| `colors.orange` | `#FD6029` | Repère du kicker, soulignement et détail d'icône. |

Les formes utilisent exclusivement ces six couleurs. Les ombres sont de l'encre
avec une faible opacité; elles ne créent pas une nouvelle teinte de marque.

## Typographie

| Rôle | Police locale | Taille | Règle |
|---|---|---:|---|
| Titre dz | Amiri Bold | 96 px | Taille fixe sur les cinq images arabes. |
| Titre fr | Space Grotesk Bold | 80 px | Taille fixe sur les cinq images françaises. |
| Kicker dz | Amiri Bold | 27 px | Capsule de contexte, alignée à droite. |
| Kicker fr | Space Grotesk Medium | 19 px | Capsule de contexte, alignée à gauche. |
| Pastille dz | Amiri Bold | 23 px | Ajustement seulement si plusieurs pastilles doivent tenir. |
| Pastille fr | Space Grotesk Bold | 19 px | Ajustement seulement si plusieurs pastilles doivent tenir. |
| Micro-repères | Space Grotesk Medium | 17–23 px | Wordmark, domaine et pagination. |

Les valeurs s'appliquent au canevas fixe, jamais à un viewport. L'arabe est
façonné par le moteur local dans `typekit.py`. Aucun emoji, aucune police distante
et aucune graisse simulée.

## Grille et composition

- Canevas 1080×1350 px; marges latérales de 72 px; largeur utile de 936 px.
- Wordmark en haut; kicker en capsule lavande; titre sur une grille verticale
  cohérente; filet de pied à y=1238 px.
- Les mots marqués reçoivent un aplat lavande et un fin soulignement orange.
- Les cartes produit et photographies ont des coins d'environ 28 px et une
  ombre douce. Les pastilles sont en capsules, avec une seule ombre par carte.
- La lecture arabe inverse les positions des composants et des pastilles; les
  blocs de texte restent propres à leur sens de lecture.
- Le vide fait partie du dessin. Ne pas réduire la taille de titre pour remplir
  une zone ni ajouter d'éléments sans fonction narrative.

## Séquence J01

1. **Problème — vidéo muette.** Photo couleur du téléphone tenu en main; pictogramme
   de son coupé posé sur l'écran; titre et pastilles au premier plan.
2. **Solution — voix sans micro.** Micro en duotone barré par un trait orange,
   associé à une carte lavande, une onde et le repère « 30 s ».
3. **Comment faire.** Trois cartes reliées : texte, onde/voix, téléchargement.
   La photo du carnet et les pictogrammes expliquent le flux sans numérotation.
4. **Prix.** Carte sombre, cinq groupes d'ondes et pastille tarifaire existante.
5. **Inscription.** Carte lavande, mascotte locale Sawtify et pastilles de CTA,
   placées sur le côté libre de la composition.

Les deux langues conservent ce récit, mais inversent les côtés où le sens de
lecture l'exige. Les photos restent des photos; les pictogrammes sont des formes
vectorielles sobres, sans emoji.

## Cartes, pastilles et profondeur

`rounded_card()` dessine une surface opaque puis une ombre unique, diffuse et
légèrement décalée. Chaque pastille est une seule carte avec son propre fond et
sa propre ombre; ne pas lui superposer une deuxième ombre ou une capsule
supplémentaire. Les kickers n'ont pas d'ombre. Les photos ont une bordure lavande
fine, mais aucune bordure décorative répétée autour des pictogrammes.

Les ombres ne doivent pas devenir un glow. Pas de dégradé, de transparence
colorée, de texture artificielle ou d'empilement d'ombres. Le panneau noir de la
slide 4 est le seul grand panneau sombre; il est équilibré par les surfaces
crème et lavande des autres images.

## Do's and Don'ts

- **Faire :** conserver mot pour mot le copy de `programme.py`.
- **Faire :** garder la palette Sawtify, les marges, les tailles de titre et la
  grille de pied constantes.
- **Faire :** ouvrir la planche et vérifier les JPG en pleine résolution après
  chaque changement du rendu.
- **Faire :** vérifier le sens de lecture arabe, les limites des titres et la
  séparation des pastilles avant toute livraison.
- **Ne pas faire :** transformer les JPG en interface web ou en carousel HTML.
- **Ne pas faire :** utiliser emoji, collage, glow, dégradé ou couleur hors palette.
- **Ne pas faire :** déplacer ces compositions sur J02–J30 sans approbation.
- **Ne pas faire :** remplacer la mascotte par un monogramme ou une tuile « S ».

## Vérification et itération

1. Compiler `pilote_J01.py`, rendre les dix JPG et contrôler le contact sheet.
2. Ouvrir les diapositives en taille réelle dans les deux langues; vérifier
   l'arabe, les recadrages, les ombres et l'absence de collisions.
3. Après chaque correction, rerendre puis rouvrir les images corrigées.
4. Laisser les exports de production intacts; le pilote reste dans son dossier
   distinct jusqu'à validation.

## Limites connues

- Ce test ne couvre que J01 et ne constitue pas une nouvelle direction validée
  pour le reste du mois.
- La photo du téléphone et celle du carnet ont une résolution modeste; garder
  leur recadrage mesuré.
- Les JPG du pilote ne sont pas encore livrés dans Google Drive. Les exportations
  de production y restent distinctes; la livraison du pilote attend validation.

## Périmètre technique

Le rendu est fabriqué en local avec Pillow, puis exporté en JPG 4:5. Le script
utilise les données et le texte de `programme.py`, les fontes locales de `typekit.py`,
les pictogrammes de `lettre.py` et les médias locaux de `photos/` et `assets/`.
Le viewer statique de `slides/index.html` ne sert qu'à parcourir les JPG existants;
il ne constitue pas le livrable graphique.
