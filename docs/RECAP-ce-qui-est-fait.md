# Ce qui vient d'être fait — et ce qu'il te reste à faire

**Date :** 26 septembre 2026 · **Commit :** `0d76b86`

---

## En une minute

Deux gros chantiers viennent d'être terminés :

1. **Les aperçus audio des 30 voix** — tu vas pouvoir écouter les 30 voix et valider
   lesquelles sont des voix d'homme et lesquelles sont des voix de femme.
2. **La documentation développeur** — elle était fausse par endroits (elle ne parlait que de
   9 voix, ne mentionnait ni les balises ni l'arabe, et omettait des codes d'erreur).
   Elle est maintenant exacte, vérifiée automatiquement, et utile.

Tout est en **backend**, comme demandé. Aucun fichier d'interface n'a été touché.

---

## 1. Les aperçus audio des 30 voix

### Le principe, en une image

Avant : chaque fois qu'un utilisateur cliquait sur ▶︎ pour écouter une voix, le serveur
**appelait Google en direct**. Ça coûtait de l'argent à chaque clic, ça prenait 2 secondes,
et deux écoutes de la « même » voix pouvaient sonner légèrement différemment.

Maintenant : la voix est enregistrée **une seule fois** dans un fichier. Ensuite, elle est servie
instantanément, gratuitement, et toujours à l'identique.

### Ce que ça coûte

**Environ 3 dinars, une seule fois.** Et seulement si tu relances. Le script détecte les voix
déjà générées et les saute.

### La commande à lancer

```bash
npm run apercus:voix
```

Puis tu ouvres **`/audition-voix.html`** dans ton navigateur et tu écoutes.

### Ce que tu vas faire sur cette page

Les 30 voix, une ligne chacune. Tu cliques ▶︎, tu écoutes, tu cliques **Homme** ou **Femme**.

- La page **enchaîne automatiquement** les voix.
- Elle **sauvegarde ta progression** dans le navigateur (tu peux t'arrêter et reprendre).
- Quand c'est fini, tu cliques **📋 Copier le résultat** et tu me le colles dans la conversation.

**3 minutes suffisent.** Ensuite je mets à jour les genres partout en une seule fois.

### Pourquoi c'est toi qui dois le faire

Google **ne dit nulle part** si ses voix sont masculines ou féminines. Pour les 9 voix
historiques de Sawtify, on le sait déjà (tes utilisateurs les connaissent). Pour les 21 autres,
personne ne peut le deviner depuis la documentation — il faut les écouter.
À partir de maintenant, le code écrit `à confirmer` partout, il ne ment jamais.

### Une sécurité importante

Le manifeste garde l'**empreinte du texte d'audition**. Si un jour tu modifies ce texte, le
serveur **refuse** tous les aperçus et le dit au démarrage. Comme ça, un utilisateur ne peut
jamais entendre l'audio d'une autre voix que celle qu'il a choisie.

---

## 2. La documentation développeur

### Ce qui n'allait pas

| Problème | Conséquence pour un développeur |
|---|---|
| Seulement 9 voix citées | Il ignorait que 21 voix existaient |
| Les balises de sons absentes | Il ne pouvait pas utiliser de rires, soupirs, pauses |
| L'arabe jamais mentionné comme écriture possible | Il écrivait tout en anglais sans savoir qu'il pouvait écrire en arabe |
| `GET /tts` (aide) et `GET /usage` absents | Il ne trouvait pas comment vérifier sa consommation |
| Code `201` oublié dans le tableau des erreurs | Il croyait que ça avait échoué |
| `mp3_url` non documenté | Il ne savait pas qu'une version MP3 légère existait |
| « URL signée valable 7 jours » | Faux : c'est une URL non signée à expiration. Corrigé. |

### Ce qui est maintenant dedans

- **Les 30 voix**, avec prénom français, prénom arabe, identifiant technique et ancien identifiant.
- **Les 40 balises de sons**, classées par famille (rire, émotions fortes, tristesse, respiration,
  voix, silences), avec **les écritures françaises ET arabes** pour chacune.
  ⇒ **197 écritures au total**, toutes vérifiées.
- **Toutes les routes** réellement exposées, y compris les trois nouvelles.
- **Le tableau des erreurs complet** : 201, 400, 401, 402, 403, 405, 410, 429, 500, 503.
- **Les vraies limites** : 5 000 caractères, solde > 1 000 points, 20 générations/jour,
  découpage à 800 caractères, URL média 7 jours.
- **Trois exemples complets** : cURL, JavaScript et Python — avec des balises en darija dedans.
- **Une page HTML** avec recherche de voix, filtrable, et le tableau des balises déplié.

### La garantie anti-erreur

Un script compare maintenant **la documentation au code**, et échoue dès que les deux
divergent :

```bash
npm run verif:doc
# → DOCUMENTATION : 35 vérifications réussies, 0 échouées sur 35
```

Par exemple, il vérifie que chaque paramètre documenté est **réellement lu** par le serveur,
que chaque en-tête existe vraiment, et que chaque route annoncée est bien déclarée.
⇒ **La documentation ne peut plus mentir sans que ça se voie.**

---

## 3. Toutes les vérifications d'un coup

| Commande | Résultat | Ce qu'elle prouve |
|---|---|---|
| `npm run test:tts` | **89 / 89** | le moteur vocal fonctionne dans les deux modes |
| `npm run test:voix` | **22 / 22** | les 90 écritures d'un nom de voix tombent sur la bonne voix |
| `npm run verif:balises` | **40 / 40** | les 40 balises officielles Google sont intégrées |
| `npm run test:apercus` | **43 / 43** | aucun aperçu ne peut être lu à voix haute par erreur |
| `npm run verif:doc` | **35 / 35** | la documentation correspond au code |

**Total : 229 vérifications, 0 échec.**

---

## 4. Ce qu'il te reste à faire — dans l'ordre

### ① Lancer la génération des aperçus

```bash
npm run apercus:voix
```

Il te faut `GEMINI_API_KEY` dans ton fichier `.env` (tu l'as déjà puisque le Studio fonctionne).
**Coût : environ 3 dinars.** Durée : 1 à 2 minutes.

> Tu peux d'abord tester sans rien payer :
> ```bash
> npx tsx scripts/generer-apercus-voix.ts --simule
> ```
> Ça fabrique 30 fichiers muets pour vérifier que tout se passe bien.

### ② Écouter et valider les 21 voix

Ouvre `http://localhost:3000/audition-voix.html`, écoute, clique Homme ou Femme,
puis **Copie le résultat** et colle-le-moi ici.

### ③ Mettre les aperçus en ligne (recommandé)

```bash
npx tsx scripts/generer-apercus-voix.ts --upload
```

Les fichiers partent sur Supabase Storage et le serveur se contente de renvoyer l'adresse.
C'est Supabase qui sert l'audio, pas ton serveur Node.

---

## 5. Une décision qui t'appartient

La page Developer côté interface (celle que voient tes utilisateurs développeurs) contient
des **exemples de code périmés** — elle parle des anciennes voix et de l'ancienne syntaxe
`[excited]` entre crochets.

C'est du **frontend**, et tu m'as demandé de ne rien y toucher. Donc je n'y touche pas.
Dis-moi si je dois les mettre à jour.

---

## Fichiers créés ou modifiés

| Fichier | Rôle |
|---|---|
| `tts/voicePreviews.ts` | script d'audition + les 30 textes d'aperçu + manifeste |
| `tts/test-apercus.ts` | 43 vérifications sur les aperçus |
| `scripts/generer-apercus-voix.ts` | génère les WAV, le manifeste et la page d'audition |
| `scripts/verifier-doc-api.ts` | 35 vérifications documentation ↔ code |
| `docs/developer-api-beta.md` | documentation développeur (réécrite) |
| `public/docs/developer-api-beta.html` | documentation développeur (page web) |
| `public/llms.txt` | section Developer API ajoutée |
| `docs/apercus-audio.md` | tout le détail technique des aperçus |
| `server.ts` | aperçus figés + 2 nouvelles routes + service des fichiers |
| `package.json` | 3 nouvelles commandes |
| `.gitignore` | les WAV ne partent pas dans Git |
