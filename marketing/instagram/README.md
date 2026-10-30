# Carrousels Instagram — Sawtify

Générateur de carrousels Instagram (1080 × 1350, format 4:5) au style Sawtify :
mascotte détourée, violet `#7C2DC8` / crème `#FAF6EE`, icônes vectorielles,
boutons dégradés. Textes en **darija**, mise en page RTL complète.

## Démarrage

```bash
cd marketing/instagram
pip3 install --break-system-packages pillow arabic-reshaper python-bidi
python3 prepare_logo.py         # une fois : détoure assets/sawtify-logo-source.jpg
python3 generate_premium.py     # les 5 carrousels de la série premium
python3 overview.py             # planche d'aperçu de toute la série
```

Cibler un carrousel / quelques slides :

```bash
python3 generate_premium.py --only 4
python3 generate_premium.py --only 7 --slides 1,5
```

## La série

| # | Carrousel | Dossier | Angle |
|---|-----------|---------|-------|
| 3 | 3 erreurs qui tuent ta pub | `slides/03-3-erreurs-pub/` | erreurs → corrigé → chiffres → avant/après → CTA |
| 4 | Une pub en 5 minutes | `slides/04-faire-une-pub-en-5-min/` | process 3 étapes → usages → packs → CTA |
| 5 | Preuves clients | `slides/05-preuves-clients/` | chiffres → témoignages → avant/après → packs |
| 6 | 5 idées de vidéos en darija | `slides/06-5-idees-videos-darija/` | liste d'idées → production → stats → CTA |
| 7 | Choisir la bonne voix | `slides/07-choisir-la-bonne-voix/` | darija vs فصحى → 4 natures → 3 conseils → CTA |

Chaque dossier contient `01.png … 06.png` (à importer dans l'ordre sur Instagram)
et `contact-sheet.png`. Les **légendes Instagram** sont dans `generate_premium.py`,
clé `caption` de chaque carrousel.

Deux autres séries existent aussi :
`generate_carousels.py` (version sombre, 1 carrousel FR) et
`generate_ar_carousel.py` (version crème simple, 100 % darija).

## Formats (feed + story)

Chaque carrousel est décliné en trois formats :

| Dossier | Format | Usage |
|---|---|---|
| `slides/<slug>/01.png…` | 1080×1350 (4:5) | feed — occupe le plus de place |
| `slides/<slug>/square/` | 1080×1080 (1:1) | feed carré / reposts |
| `slides/<slug>/story/` | 1080×1920 (9:16) | story & reel, slide posée sur un fond de marque |

```bash
python3 export_formats.py                        # carré + story pour toute la série
python3 export_formats.py --only 5 --formats story
python3 export_formats.py --only 3 --slides 1,6
```

Le carré réutilise les mêmes gabarits : le design est dessiné sur le canevas de
référence 1080×1350 puis mis à l'échelle pour remplir le canevas cible
(constante `DESIGN_H` dans `generate_premium.py`).

## Structure du code

| Fichier | Rôle |
|---|---|
| `sawtify_ig.py` | moteur : fonds, dégradés, halos, thèmes clair/sombre, texte arabe (`ar_para`) |
| `premium.py` | kit premium : 22 icônes vectorielles, tuiles, boutons, cartes, badges, lockup logo |
| `generate_premium.py` | les contenus + les types de slides (`cover`, `errors`, `features`, `steps`, `grid`, `list`, `stats`, `compare`, `quotes`, `pricing`, `cta`) |
| `prepare_logo.py` | détourage du logo mascotte |
| `export_formats.py` | déclinaisons 1:1 et 9:16 |
| `overview.py` | planche d'aperçu |
| `fonts/` | Space Grotesk (latin) + IBM Plex Sans Arabic (darija) |

`**mot**` met un mot en couleur d'accent (orange sur fond violet, violet sur fond clair).

> Note polices : IBM Plex Sans Arabic couvre toutes les formes de présentation arabes
> (contrairement à Cairo, qui laissait des carrés). Garder cette police pour la darija.
