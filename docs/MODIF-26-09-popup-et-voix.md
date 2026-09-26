# Ce qu'il faut déployer — pop-up 4.1 + écriture des voix

**26 septembre 2026.** Trois corrections, **trois fichiers**, rien d'autre à toucher.

---

## Les 3 fichiers

| Fichier | Ce qui change |
|---|---|
| `src/components/WhatsNewV41.tsx` | **réécrit** — la pop-up d'accueil, dans le style des autres modales |
| `src/data/voicesV41.ts` | **modifié** — les descriptions des 21 nouvelles voix |
| `src/components/TTSStudio.tsx` | **1 ligne** — le mot « Prêt ✓ » de la barre de résultat |

Aucun autre fichier n'est concerné. Ni le serveur, ni la base de données, ni le paiement,
ni le moteur vocal.

---

## ① La pop-up — `WhatsNewV41.tsx`

### Ce qui n'allait pas

Elle avait été construite comme un **diaporama animé** : 5 écrans, pastilles de progression, gros
chiffres en dégradé, halos qui bougent, fond flouté (14 px). Résultat : on aurait dit un jeu, pas
Sawtify.

Elle était en plus posée à l'étage `z-[200]` — **au-dessus de tout**, y compris des messages
importants du studio (« solde insuffisant », « ajoute des points »), qui pouvaient donc passer
inaperçus.

### Ce qui a changé

| | Avant | Après |
|---|---|---|
| Forme | 5 écrans à faire défiler | **une seule carte**, 4 lignes courtes |
| Style | feuille de style maison (`snwt-`), halos, dégradés, flou | **le gabarit de la plateforme**, Tailwind uniquement |
| Police | forcée par la pop-up | celle de la plateforme (`html[lang]`), automatique |
| Étage | `z-[200]` — au-dessus de tout | **`z-[70]`** — en dessous de toutes les autres couches |
| Fermeture | bouton + fond | bouton + fond **+ touche Échap** |

Elle reprend maintenant **exactement** le gabarit de la modale « Comment la voix doit-elle
commencer ? » du studio :

```
fixed inset-0 z-[70] … bg-slate-950/60 backdrop-blur-sm
w-full max-w-sm rounded-3xl border border-purple-200 bg-white p-6 shadow-2xl
kicker : text-xs font-black uppercase tracking-[.14em] text-purple-600
titre  : text-base font-extrabold text-slate-900
texte  : text-xs leading-5 text-slate-500
```

### Les 4 nouveautés annoncées

1. 30 voix au lieu de 9 — dont 21 nouvelles
2. 35 sons d'émotion, écrits de 197 façons
3. Prononciation de la darija entièrement retravaillée
4. Écoute n'importe quelle voix gratuitement avant de choisir

Deux boutons en bas : **« Commencer à créer »** (violet) et **« Ajouter des points »**.

> ⚠️ La clé de mémorisation n'a pas changé (`sawtify_whats_new_seen`). Les visiteurs qui ont déjà
> fermé la 4.1 **ne la reverront pas**. Pour la remontrer à tout le monde, il suffit de changer
> `WHATS_NEW_VERSION` en haut du fichier (par exemple `'4.2'`) : le simple changement de cette
> ligne relance la pop-up chez tout le monde.

---

## ② La barre de résultat — `TTSStudio.tsx` (1 ligne)

Dans la barre qui apparaît **après une génération**, le badge vert affichait « Prêt ✓ » — écrit en
français **en dur**. Résultat : il restait en français même quand l'interface du studio est en
arabe, au milieu d'un écran entièrement traduit.

C'était le **seul** texte français non traduit de tout `TTSStudio.tsx` (vérifié par balayage
automatique de tous les textes affichés). Il dit maintenant :

| Langue | Avant | Après |
|---|---|---|
| Français | Prêt ✓ | Prêt ✓ |
| Arabe | Prêt ✓ ❌ | **جاهز ✓** ✅ |

Une seule ligne change, et rien d'autre dans ce fichier.

---

## ③ L'écriture des voix — `voicesV41.ts`

La ligne affichée sous chaque voix est construite comme ça :

```
Darja algérienne • Voix {{ descripteur }}
```

Or **« voix » est féminin en français** — et les 21 descripteurs étaient au **masculin**. Ça se
lisait dès la première ouverture de la liste :

| Avant ❌ | Après ✅ |
|---|---|
| Voix **léger et aérien** | Voix **légère et aérienne** |
| Voix **décontracté** (×3) | Voix **décontractée** |
| Voix **éclatant** | Voix **éclatante** |
| Voix **soufflé et aéré** | Voix **soufflée et aérée** |
| Voix **clair** (×2) | Voix **claire** |
| Voix **informatif** | Voix **informative** |
| Voix **enjoué** | Voix **enjouée** |
| Voix **égal et posé** | Voix **égale et posée** |
| Voix **mûr** | Voix **mûre** |
| Voix **direct et assuré** | Voix **directe et assurée** |
| Voix **amical** | Voix **amicale** |
| Voix **doux et délicat** | Voix **douce et délicate** |
| Voix **vivant** | Voix **vivante** |
| Voix **savant et érudit** | Voix **savante et érudite** |

Trois libellés **arabes** se lisaient mal eux aussi :

| Avant | Après | Pourquoi |
|---|---|---|
| `صوت متنفس` | `صوت نفَسي وخفيف` | « متنفس » décrit une pièce aérée, pas une voix |
| `صوت عالِم` | `صوت مثقّف ورصين` | « عالِم » est un titre (savant), pas un timbre |
| `صوت معلوماتي` | `صوت إخباري` | « معلوماتي » est un calque ; l'arabe dit « إخباري » |

Une consigne a été ajoutée en tête du fichier pour que l'accord ne soit pas reperdu :
**tout descripteur décrit « Voix », donc au féminin.**

---

## Comment déployer

1. Remplacer les **3 fichiers** dans le dépôt, aux mêmes chemins.
2. Envoyer sur la branche qui sert la production.
3. Render reconstruit le site (~1 à 2 minutes). C'est tout.

Aucune migration de base de données, aucune variable d'environnement, aucun redémarrage de
serveur à prévoir.

---

## Vérifié

```
contrôle de syntaxe TypeScript ...... 0 erreur
qualité du code ..................... 0 erreur
compilation du site ................. OK en 6,3 s
moteur vocal ........................ 177 / 177
noms des voix ....................... 22 / 22
aperçus audio ....................... 39 / 39
documentation ....................... 65 / 65
────────────────────────────────────────────────
TOTAL ............................... 303 vérifications, 0 échec
```
