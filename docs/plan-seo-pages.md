# Chantier « être trouvé sur Google » — 6 pages publiques

**Date :** 3 octobre 2026 · **Branche :** `arena/01a0ffca-sawtify`
**Décision de départ :** *« des pages simples comme faire une voix off pour TikTok, voix pour les pubs,
voix pour l'école, une version en arabe/darija — que les gens me trouvent tout seuls, gratuitement. »*

---

## 1. Ce qui a été ajouté (6 pages)

Ce sont de **vraies pages HTML**, pas des écrans de l'application : elles s'affichent même si le
JavaScript est lent, et Google (comme Bing ou les assistants IA) les lit sans difficulté.

| Adresse | Pour qui | Ce que la personne tape sur Google |
|---|---|---|
| `/voix-off-darija` | tout le monde | « voix off darija », « texte en voix darija » |
| `/sawt-darija` | **en arabe** | « تحويل النص إلى صوت بالدارجة », « تعليق صوتي بالدارجة » |
| `/voix-off-tiktok` | créateurs TikTok | « voix off tiktok darija », « faire une voix pour mes vidéos » |
| `/voix-off-publicite` | commerces, agences | « voix off publicité », « spot radio darija » |
| `/voix-off-formation` | professeurs, formateurs | « voix pour cours », « vocaliser un cours » |
| `/voix-off-ecommerce` | boutiques en ligne | « voix off produit », « vidéo produit darija » |

Chaque adresse marche **avec et sans `.html`** : `/voix-off-tiktok` et `/voix-off-tiktok.html`
affichent exactement la même page (l'adresse sans `.html` est celle déclarée à Google).

Chaque page contient : un titre et une description uniques, un texte d'exemple **darija prêt à
copier** dans le studio, les explications de balises, une liste de questions fréquentes (celles que
les gens tapent vraiment), et un bouton vers l'inscription.

Fichiers concernés :

- `public/voix-off-darija.html`, `public/sawt-darija.html`, `public/voix-off-tiktok.html`,
  `public/voix-off-publicite.html`, `public/voix-off-formation.html`, `public/voix-off-ecommerce.html`
- `public/pages/pages.css` — le style commun aux 6 pages (modifier ici = changer les 6 d'un coup)
- `public/sitemap.xml` — la liste officielle des pages, envoyée à Google
- `public/llms.txt` — la même liste, pour les assistants IA (ChatGPT, Claude, Perplexity)
- `server.ts` — sert les adresses propres et garde une **liste blanche** (aucun autre fichier n'est exposé)
- `src/components/LandingPage.tsx` — 5 liens ajoutés **dans le pied de page du site** (c'est ainsi
  que Google découvre les nouvelles pages)
- `scripts/verifier-pages-seo.mjs` — le contrôle automatique (voir §4)

---

## 2. Comment tu sauras d'où viennent les visiteurs

**Tous les boutons de ces pages** pointent vers le site avec une étiquette lisible :

```
/?utm_source=seo&utm_medium=organic&utm_campaign=voix-off-tiktok
```

Concrètement : dans ton **tableau Admin → Rapport d'acquisition**, chaque page apparaîtra comme sa
propre ligne (« voix-off-tiktok », « sawt-darija »…). Tu verras donc, sans rien faire de plus :

- combien de visiteurs chaque page t'amène,
- combien ouvrent l'inscription,
- combien créent un compte **après** être passés par cette page.

C'est exactement la question « j'ai plus d'utilisateurs, je sais pas pourquoi » : la réponse sera
écrite noir sur blanc par page.

*(Rappel du même jour : l'affichage de cette donnée dans l'admin est un chantier séparé, pas encore
fait. Aujourd'hui, la donnée est bien **collectée** ; elle s'affiche dans la partie « Campagnes » du
tableau de bord.)*

---

## 3. Cinq décisions que j'ai prises — dis-moi si tu veux changer

0. **Les deux orthographes de la langue sont couvertes** : « darija » et « dardja » (et « derdja »,
   « darja »). Ce n'est pas un détail : Google traite ces écritures comme des recherches
   distinctes. La page principale explique aussi la différence, dans une question dédiée.

1. **Aucun prix en dinars n'est écrit sur ces pages.** Seule la règle stable est donnée : « 20 points
   la voix off jusqu'à 60 s », et un lien vers `/pricing`. Raison : le jour où tu changes un pack,
   ces 6 pages deviendraient fausses et **menteuses pour Google** — il faudrait les corriger une par
   une. Les prix vivent à un seul endroit.
2. **Aucune preuve sociale inventée.** Pas de « +5 000 utilisateurs », pas de faux témoignages, pas
   de faux logos. C'est volontaire : un faux chiffre qui se retrouve démenti coûte plus cher que pas
   de chiffre du tout. Le jour où tu veux afficher le vrai nombre d'utilisateurs, donne-le-moi.
3. **Aucun numéro de téléphone.** Je n'en connais pas de vrai, je n'en ai donc mis aucun.
4. **J'ai écrit « darija / accents », jamais « voix régionale ».** Les voix régionales (Alger, Oran,
   Constantine) ne sont **pas encore développées** — ce chantier est listé comme non commencé. Les
   pages ne doivent pas promettre ce qui n'existe pas.
5. **Les textes d'exemple en darija sont écrits par moi.** Relis-les : c'est ta langue, et c'est le
   genre de détail qu'un client remarque tout de suite. Dis-moi ce qui sonne faux, je corrige.

---

## 4. Vérification : `npm run verif:pages`

J'ai écrit un contrôle automatique, dans le même esprit que `verif:doc` :

```bash
npm run verif:pages
```

**Résultat actuel : 177 vérifications, 0 échec.** Il vérifie, pour les 6 pages :

- le fichier existe et contient assez de texte (une page vide est ignorée par Google) ;
- le titre et la description existent et sont **uniques** (deux pages identiques se font concurrence) ;
- l'adresse canonique est déclarée (sinon Google choisit lui-même l'adresse) ;
- le couple **français ↔ arabe** est déclaré dans les deux sens (`hreflang`) ;
- les données structurées (JSON-LD) sont un **JSON valide** — une virgule en trop les rendait muettes ;
- **chaque lien interne mène quelque part** (une faute de frappe dans un lien = découverte impossible) ;
- `sitemap.xml` liste bien les 6 pages, et `robots.txt` n'en bloque aucune ;
- `server.ts` sert bien chaque page.
- les **variantes d'orthographe** (« darija », « dardja », « derdja », « darja ») sont couvertes :
  ce sont des recherches différentes pour Google, et les gens tapent l'une ou l'autre.

### Ce qui a été testé en vrai, dans cet environnement

| Test | Résultat |
|---|---|
| `npm install` puis `npm run build` (compilation complète) | ✅ passe |
| Les 6 pages + `.html` + `/pages/pages.css` + sitemap + robots + llms.txt (serveur de dev) | ✅ 200 |
| La même chose en **mode production** (`node dist/server.cjs`, comme sur Render) | ✅ 200 |
| Google Analytics **sans** la variable `GA4_MEASUREMENT_ID` | ✅ 0 balise ajoutée (rien ne change) |
| Google Analytics **avec** `GA4_MEASUREMENT_ID` | ✅ balise ajoutée sur les 6 pages **et** sur le site React |
| Cache : pages publiques 5 min / site React jamais mis en cache | ✅ conforme |
| Une adresse inconnue (`/page-qui-nexiste-pas`) | ✅ renvoie le site normal, pas d'erreur |

---

## 5. Ce que toi tu dois faire (3 étapes, ~15 minutes)

### ① Redéployer sur Render — obligatoire
Rien de neuf à configurer : les pages sont livrées avec le site. Un déploiement normal suffit
(le code est déjà poussé sur la branche). Sans ce redéploiement, **les pages n'existent pas en ligne**.

### ② Google Search Console — la partie qui compte
1. Va sur **search.google.com/search-console** et connecte-toi avec le compte Google de Sawtify.
2. Ajoute une propriété de type **Préfixe d'URL** : `https://sawtify.space`
3. Valide la propriété (Google propose une balise HTML ; envoie-la-moi et je l'ajoute).
4. Dans le menu de gauche : **Sitemaps** → saisis `sitemap.xml` → **Envoyer**.
5. Compte **1 à 4 semaines** avant de voir du trafic. C'est normal : Google doit d'abord lire,
   comprendre, puis classer. Le jour 1, il n'y a rien. **Ne conclus pas trop vite.**

### ③ Facultatif — mesure fine (Google Analytics 4)
1. Crée une propriété GA4 et récupère son identifiant (il ressemble à `G-XXXXXXXXXX`).
2. Sur **Render → ton service → Environment**, ajoute une variable :
   `GA4_MEASUREMENT_ID` = `G-XXXXXXXXXX`
3. Redéploie. À partir de là, **chaque page du site** (y compris l'application) est mesurée.
   Si tu ne la mets pas, il ne se passe rien de spécial : les pages fonctionnent exactement pareil.

### Ensuite, ce qui se passe tout seul
- Google découvre les pages par le `sitemap.xml` **et** par les liens du pied de page du site.
- Les gens cliquent, arrivent avec l'étiquette `utm_source=seo`, et tu les vois dans l'admin.
- Tu n'as plus rien à payer : une page qui marche travaille 24h/24.

---

## 6. Ajouter une 7ᵉ page plus tard (5 endroits)

Dis-le-moi et je le fais, mais pour information, une nouvelle page doit être déclarée à 5 endroits —
sinon elle existe sans être trouvée :

1. le fichier `public/ma-nouvelle-page.html` ;
2. `public/sitemap.xml` (la liste pour Google) ;
3. `public/llms.txt` (la liste pour les assistants IA) ;
4. `server.ts` → la liste `SEO_PAGES` (sinon l'adresse propre ne répond pas) ;
5. `scripts/verifier-pages-seo.mjs` → la liste `PAGES` (sinon elle n'est pas vérifiée).

Puis `npm run verif:pages` doit repasser à 0 échec.

---

## 7. Idées pour la suite (par ordre de rendement)

1. **Pages par ville** : « voix off à Oran », « voix off à Constantine », « voix off à Sétif » —
   les gens cherchent ce qu'ils connaissent, et la concurrence y est presque nulle.
2. **Pages métier** : « voix off pour clinique », « pour agence immobilière », « pour restaurant ».
3. **Un blog** : 1 article par semaine qui répond à une question réelle
   (« combien coûte une voix off en Algérie ? », « comment faire une pub TikTok qui vend ? »).
   C'est ce qui amène le plus de visiteurs sur le long terme, mais c'est un travail régulier.
4. **Les données structurées déjà en place** (questions fréquentes) donnent parfois à Sawtify un
   affichage enrichi dans Google — à surveiller dans Search Console, onglet « Améliorations ».

---

## 8. Trois choses trouvées en passant (et dites honnêtement)

### ① `npm run lint` échoue — et ce n'est PAS à cause de ces pages
La vérification des **types** TypeScript n'avait jamais pu être lancée (elle échouait pour une raison
de certificat réseau dans l'environnement précédent). Ici, elle tourne. Résultat : **8 erreurs, toutes
préexistantes**, aucune dans le code de ce chantier :

| Fichier | Erreur | Nombre |
|---|---|---|
| `src/components/LandingPage.tsx` | la clé React `key` n'est pas déclarée dans le type du composant maison `AnimatedSection` | 4 |
| `src/components/LandingPage.tsx` | la clé React `key` n'est pas déclarée dans le type des éléments de la FAQ | 1 |
| `src/components/TTSStudio.tsx` | `.nodeType` / `.nodeValue` lus sur un type `unknown` | 2 |
| `tts/voices.ts` | importe depuis `'../types'` — **ce chemin n'existe pas** (le bon est `src/types`) | 1 |

*(Chiffre vérifié en relançant `npx tsc --noEmit` après ce chantier : 8 erreurs, exactement les
mêmes qu'avant.)*

**Aucune n'empêche le site de fonctionner** : la compilation (`npm run build`) passe, et le serveur
tourne (le fichier `tts/voices.ts` utilise `Voice` et `CreditPack` uniquement comme **types**, donc
cet import disparaît à la compilation). Ce sont des erreurs de **contrôle**, pas de fonctionnement.
Elles méritent d'être corrigées un jour, pour que `npm run lint` redevienne un vrai signal d'alerte.

### ② Six commandes de `package.json` pointent vers des fichiers absents
`npm run verif:doc`, `verif:balises`, `verif:voix`, `analyser:genre`, `diag:darija` et
`apercus:voix` appellent des fichiers qui **ne sont pas dans le dépôt**
(`scripts/verifier-doc-api.ts`, `scripts/verifier-balises.ts`, `scripts/generer-apercus-voix.ts`,
`scripts/verifier-voix.ts`, `scripts/analyser-genre-voix.ts`, `scripts/diagnostic-darija.ts`).
Le document `docs/RECAP-ce-qui-est-fait.md` décrit ces tests comme s'ils tournaient : **ce n'est pas
le cas ici**. Soit ces fichiers existent sur ta machine et n'ont jamais été poussés, soit ils ont
disparu. À vérifier avant de se fier à ces résultats.

### ③ Il n'y avait pas de `.gitignore` — corrigé
Sans ce fichier, un simple `git add .` aurait pu envoyer **`node_modules/` (des dizaines de milliers
de fichiers)** sur GitHub, et `dist/`. Je l'ai créé : il ignore `node_modules/`, `dist/`, les
fichiers `.env` (secrets), et les aperçus audio générés en local.

---

## Résumé en une phrase

**Six pages publiques, en français et en arabe, écrites pour être trouvées sur Google, reliées au
site et à la mesure d'audience — 177 contrôles automatiques, 0 échec, compilées et testées en dev
comme en production.** Il te reste 3 gestes : redéployer, envoyer le sitemap dans Search Console,
et (si tu veux) coller un identifiant Google Analytics dans Render.
