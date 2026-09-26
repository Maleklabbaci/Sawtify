# Tous les bugs — la liste honnête

**26 septembre 2026.** Tu as demandé : « dis-moi quels problèmes, quels bugs, et est-ce que
`server.ts` est toujours performant en darija ? »

Voici la réponse, sans rien cacher — **y compris mes propres erreurs**.

---

## ① D'ABORD TA QUESTION : la darija, oui — et c'est mesuré

J'ai écrit une commande qui répond à ça en 3 secondes, et qu'on peut relancer n'importe quand :

```bash
npm run diag:darija
```

Ce qu'elle vérifie, et ce qu'elle a répondu :

| Contrôle | Résultat |
|---|---|
| Le découpage ne coupe aucune phrase en deux | ✅ 518 caractères → 1 morceau propre |
| Les balises survivent au découpage | ✅ aller-retour identique **au caractère près** |
| Le texte darija arrive intact à Google | ✅ oui, en 3.8 **et** en 3.1 |
| Aucune instruction écrite dans le texte (elle serait **lue**) | ✅ |
| **La darija est annoncée au moteur** | ✅ `in Algerian Darija, natural and human…` |
| Un texte **français** ne reçoit **pas** cette consigne | ✅ (on ne force pas l'accent) |
| Un texte **mixte** arabe + français la reçoit | ✅ |
| Une balise inexistante est signalée **et retirée** | ✅ |
| Les 30 prénoms trouvent leur voix (**aucun sur Puck**) | ✅ 30 prénoms → 30 voix distinctes |
| Coût du découpage | ✅ **0,27 ms** (l'appel réseau prend 1 à 5 s) |

**Verdict : la darija fonctionne.** Rien n'est cassé dans le chemin vocal.

---

## ② LES BUGS — les miens, et les autres

### Ceux que **j'ai introduits** (mes erreurs, assumées)

| # | Le bug | Réparé |
|---|---|---|
| 1 | **La pop-up 4.1 ressemblait à un jeu** : diaporama de 5 écrans, pastilles de progression, halos animés, fond flouté | ✅ `b5f57e5` |
| 2 | Elle était posée à `z-[200]`, donc **au-dessus de tout** — un message « solde insuffisant » pouvait passer inaperçu derrière | ✅ `b5f57e5` |
| 3 | **17 fautes d'accord** dans les descriptions des voix : « Voix décontracté », « Voix clair », « Voix enjoué », « Voix mûr »… (« voix » est féminin) | ✅ `b5f57e5` |
| 4 | Trois libellés arabes qui se lisaient mal (`صوت متنفس`, `صوت عالِم`, `صوت معلوماتي`) | ✅ `b5f57e5` |

### Ceux qui **existaient avant** et qui auraient touché tes utilisateurs

| # | Le bug | Trouvé | Réparé |
|---|---|---|---|
| 5 | **La darija n'était plus annoncée au moteur** → lue comme de l'arabe standard, la langue des journaux télévisés | audit du 26/09 | ✅ `4c33c3a` |
| 6 | **La vitesse écrasait le ton** : « `[calm]` + vitesse rapide » n'envoyait que la vitesse, le calme disparaissait | audit du 26/09 | ✅ `4c33c3a` |
| 7 | **Le caractère de la voix avait disparu** (l'ex-`Speaker:` du prompt) → le moteur ne savait plus comment jouer | audit du 26/09 | ✅ `ffa006d` |
| 8 | **5 des 9 effets du menu ne faisaient rien** (l'app parlait encore la langue de l'ancien modèle) | 26/09 | ✅ `6044c9f` |
| 9 | Une balise de pause pouvait être **coupée en deux** sur les textes longs | audit | ✅ `ce40cbb` |
| 10 | `gemini-3.10` (un futur modèle) aurait été classé en mode ancien | audit | ✅ `dec45d0` |
| 11 | Le prompt 3.1 annonçait des balises que le code ne produit jamais | audit | ✅ `dec45d0` |

**En clair :** sur les 11 bugs, **4 viennent de mon travail de cette semaine** (surtout la pop-up et
les fautes d'accord — deux choses que tu as vues tout de suite). Les 7 autres dormaient dans le
code depuis la migration vers le nouveau moteur, et **c'est l'audit qui les a sortis** — pas
l'inverse.

⚠️ **La nuance honnête :** les bugs n°5 à 11 sont des bugs **de la version en ligne**. Ils ont
existé sur ton site entre la migration vers le nouveau moteur et la correction. Je ne peux pas
savoir si ton site tournait pendant cette fenêtre — **toi seul le sais**. Ce qui est sûr, c'est
que les corrections sont maintenant dans ton `main`.

---

## ③ CE QUI EST DÉJÀ EN LIGNE — vérifié

J'ai comparé ta production (`main`) avec ma version. **Presque tout y est déjà** :

| Fichier | État en ligne |
|---|---|
| `tts/engine.ts` (darija + caractère) | ✅ **déjà à jour** |
| `server.ts` (VOICE_DELIVERY) | ✅ **déjà à jour** |
| `tts/vocalTags.ts`, `tts/voiceNames.ts`, `tts/selftest.ts` | ✅ déjà à jour |
| `src/data/voices.ts`, `src/components/TTSStudio.tsx` | ✅ déjà à jour |

Autrement dit : **la correction de la darija et celle du caractère de la voix sont déjà dans ton
code de production.** Il ne reste que deux fichiers à envoyer.

---

## ④ LES 2 FICHIERS À ENVOYER

| Fichier | Ce qu'il corrige |
|---|---|
| `src/components/WhatsNewV41.tsx` | la pop-up (bug 1 et 2) |
| `src/data/voicesV41.ts` | l'écriture des voix (bug 3 et 4) |

Le détail complet est dans `docs/MODIF-26-09-popup-et-voix.md`.

*(Optionnel : `package.json` + `scripts/diagnostic-darija.ts` pour avoir la commande
`npm run diag:darija` chez toi. Rien d'obligatoire, ça n'affecte pas le site.)*

---

## ⑤ CE QUI RESTE OUVERT — la liste exacte

| # | Sujet | Pourquoi ce n'est pas fait |
|---|---|---|
| 1 | **Les 30 aperçus audio** | il faut **ta clé API** (~3 dinars). Sans eux, on ne peut pas écouter les voix |
| 2 | **Le genre des 21 nouvelles voix** | Google **ne le publie pas**. Seule ton oreille peut trancher |
| 3 | **Le filtre Hommes / Femmes** ne montre que 5 H et 4 F sur 30 | parce que le genre des 21 autres est inconnu (conséquence du n°2) |
| 4 | **Les 4 voix régionales** | chantier jamais commencé |
| 5 | **`AUDIO_L16` ou `audio/l16` ?** | les **deux pages de Google se contredisent**. Impossible de trancher sans clé API |
| 6 | **Les 3 réglages SlickPay** dans Render | je n'ai pas accès à ton tableau de bord Render |
| 7 | **Les e-mails Supabase** | envoyés par Supabase, pas par Sawtify |
| 8 | **`RechargeModal.tsx`** | meuble oublié, utilisé par personne |
| 9 | **Une autre session travaille sur le même dépôt** | il existe une branche `arena/01a0d1f6-sawtify` avec d'autres modifications. Si tu déploies les deux, elles peuvent entrer en conflit |

---

## ⑥ MA LIMITE, dite clairement

**Je ne peux pas écouter ce que produit le moteur vocal.** Je n'ai pas de clé API. Tout ce que
j'affirme sur le son, je le déduis de **ce qui part réellement à Google** — et ça, je le vérifie au
caractère près.

C'est exactement pour ça que `npm run apercus:voix` est la prochaine étape : **c'est toi qui dois
écouter.**

---

## ⑦ L'état actuel, mesuré à l'instant

```
diag:darija ......... LA DARIJA FONCTIONNE (6/6)
moteur vocal ........ 177 / 177
noms des voix ....... 22 / 22
aperçus audio ....... 39 / 39
documentation ....... 65 / 65
balises officielles . catalogue complet
───────────────────────────────────────────
contrôle de syntaxe . 0 erreur
qualité du code ..... 0 erreur
compilation ......... OK
```

**Zéro bug connu ouvert dans le chemin vocal.**
