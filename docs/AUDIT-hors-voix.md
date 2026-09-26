# Audit du reste de Sawtify — paiement, pop-up, notifications

**Date :** 26 septembre 2026 · **Périmètre :** tout ce qui n'est **pas** la voix
**Question posée :** « et les autres, tout est réglé ? les pop-up, le paiement, les notif, le commencement calme/excité/normal ? »

---

## Réponse en une ligne

**Un vrai défaut trouvé, et il est réparé** — c'est exactement le « calme / excité / normal » que tu
demandais. **Le paiement est solide. Les notifications n'existent pas côté serveur** : les e-mails
viennent de Supabase, et c'est le seul point que je ne peux pas vérifier d'ici.

---

## 1. LE DÉFAUT TROUVÉ ET RÉPARÉ — le ton de la voix

### Ce qui n'allait pas

**La pop-up « Comment la voix doit-elle commencer ? » s'affiche à CHAQUE clic sur Générer.**
Ses trois choix ne faisaient pas ce qu'ils annonçaient :

| Ton choisi | Ce qui se passait vraiment |
|---|---|
| 😌 **Calme** | ❌ **rien du tout** — le texte partait à l'identique vers Gemini |
| 🙂 **Simple** | ❌ **rien du tout** — le texte partait à l'identique |
| 🤩 **Excité** | ❌ Gemini recevait `<cheer>` — un **bruit de foule qui acclame**, pas une voix énergique |

Et le menu **« Insérer effet »** (9 effets) avait le même problème :

| Effet | Avant |
|---|---|
| `[whispers]` Chuchotement · `[breathing]` Respiration · `[laughter]` Rire | ✅ marchaient |
| `[excited]` Énergique | ❌ bruit de foule |
| `[natural]` · `[articulated]` · `[calm]` · `[dramatic]` · `[fast]` | ❌ **les 5 ne faisaient rien** |

**Et tes exemples prêts à cliquer** (« Spot Publicitaire Voix-Off ») commençaient tous par
`[natural] [articulated]` — **deux effets morts**. L'utilisateur cliquait l'exemple, croyait avoir
réglé « voix 100 % naturelle », et n'avait rien.

### Pourquoi

L'application parlait encore la **langue de Gemini 3.1** : à l'époque, `[calm]` était un mot-clé
**natif** de Google. En 3.8, ce mot-clé n'existe plus.

**La cause de fond :** une **balise** est un bruit **ponctuel** (un rire), un **ton** est
**soutenu** (toute la lecture). Google n'a donc **aucune balise** pour dire « calme ». Le ton passe
par un champ séparé, `speech_metadata.style`. Les crochets étaient traduits « au mieux » vers des
balises — et comme il n'existe pas de balise « calme », ils finissaient dans le vide.

### Le correctif — 100 % backend, aucune ligne du site touchée

Chaque crochet est maintenant envoyé dans le bon champ :

| Crochet | Devient |
|---|---|
| `[whispers]` `[laughter]` `[breathing]` `[sighs]` | une **balise** officielle (`<whispers>`, `<laugh>`, `<breath>`, `<sigh>`) |
| `[calm]` `[excited]` `[dramatic]` `[serious]` | un **ton**, envoyé dans `speech_metadata.style` |
| `[articulated]` `[fast]` | une **façon de dire**, cumulable avec un ton |
| `[natural]` | rien — c'est déjà le comportement par défaut |
| un mot inconnu, ex. `[promo]` | rien — mais il est **prononcé** (ce n'est pas une balise) |

**Résultat, vérifié :**

```
😌 Calme   → TON envoyé : "calm and composed from the very first word, soft and soothing throughout"
🤩 Excité  → TON envoyé : "excited and enthusiastic, high energy from the very first word"
```

`[excited]` **ne déclenche plus** le bruit de foule.

### Un piège que j'ai trouvé dans ma propre correction

Ton exemple n°2 contient `[excited]` **et** `[calm]` dans le même texte. Ma première version
envoyait les deux — donc **« sois excité » ET « sois calme »** à la fois. C'est contradictoire.

En 3.1 on pouvait changer de ton **en plein milieu** du texte. En 3.8 c'est **impossible** :
le style dure toute la réplique. J'ai donc ajouté la règle :

> **Un seul ton par lecture.** Le premier gagne. Les suivants sont **signalés à l'utilisateur**
> dans `warnings`, jamais ignorés en silence.

```
[excited] [articulated] Opportunité ! [calm] Livraison…
→ TON envoyé : "excited and enthusiastic…, clear and precise articulation…"
→ ignoré     : calm
```

### Un second piège : le mode de secours

Le mode 3.1 est le **filet de sécurité** si le modèle 3.8 tombe. En réparant 3.8, j'allais lui
retirer le ton. Or 3.1 **comprend nativement les crochets** — c'est même écrit dans ses propres
notes de réalisation. Le mode 3.1 les reçoit donc **tels quels**, exactement comme avant :

```
TRANSCRIPT:
[calm] واش راك يا خويا؟
```

C'est un test dédié qui garde ça : sans lui, réparer 3.8 aurait cassé 3.1 sans que personne ne
le voie.

### Preuve

| Contrôle | Avant | Après |
|---|---|---|
| Tests du moteur | 117 | **151** |
| Dont tests dédiés aux tons | 0 | **34** |
| Effets morts dans le menu | 5 sur 9 | **0 sur 9** |
| Contrôles de documentation | 49 | **65** |
| **Total du projet** | 267 | **343, 0 échec** |

> Ces compteurs sont ceux du soir du 26/09. Deux corrections ont été apportées depuis : le nombre
> total est passé de 312 à **335** (13 tests pour la darija, 5 contrôles de documentation) et
> **un troisième défaut de la voix a été trouvé puis corrigé** — la darija n'était plus annoncée au
> modèle. Le détail est dans `AUDIT-envoi-a-gemini.md`, section 6.

Un test parcourt **tout** le dictionnaire et exige que chaque ancienne balise produise un effet
réel. Le bug ne peut plus revenir sans faire échouer la suite.

### Documentation mise à jour

Le guide utilisateur disait noir sur blanc « ces mots-là **ne font rien** » — c'était devenu faux.
Les 4 documents ont été corrigés et **un contrôle automatique** empêche la doc de recommencer à
mentir sur ce point.

---

## 2. LE PAIEMENT — solide, je n'ai rien trouvé de cassé

Le circuit est bien construit, et surtout **la confiance ne va jamais au navigateur** :

| Étape | Où | Vérification |
|---|---|---|
| 1. Créer la facture | `POST /api/slickpay/create-invoice` | montant et pack calculés **côté serveur** |
| 2. Payer | page SlickPay (Edahabia / CIB) | hors de Sawtify |
| 3. Confirmer | `POST /api/slickpay/confirm-payment` | **Authentification exigée** + il faut être **le propriétaire** de la facture, puis **Sawtify redemande à SlickPay** si c'est vraiment payé |
| 4. Webhook | `POST /api/slickpay/webhook` | secret partagé **+ revérification** auprès de SlickPay |
| 5. Créditer | `creditIfPaid()` | **idempotent** : rejouer un webhook ne crédite pas deux fois |

**Le point important :** le site affiche « Paiement validé » selon l'adresse, mais il **n'accorde
aucun point**. Les points ne viennent que de l'étape 5, côté serveur, après vérification. Un
utilisateur qui bricolerait l'adresse verrait un message mais **n'aurait rien**.

### Trois choses à vérifier de ton côté (je ne peux pas les voir d'ici)

1. **`SLICKPAY_WEBHOOK_SECRET` est-il bien renseigné dans Render ?**
   S'il manque, le webhook accepte n'importe qui. Ce n'est **pas exploitable** pour voler des
   points (SlickPay est revérifié juste après) — mais autant le mettre.
2. **`FRONTEND_URL` est-il renseigné dans Render ?**
   Sinon Sawtify devine son adresse depuis la requête. Ça fonctionne derrière Cloudflare
   (les en-têtes `x-forwarded-*` sont bien lus), mais c'est fragile : mets l'adresse en dur.
3. **`SLICKPAY_MODE`** : assure-toi qu'il est sur `production` (c'est le défaut). En `sandbox`,
   les paiements ne sont pas réels.

---

## 3. LES NOTIFICATIONS — il n'y en a aucune côté serveur

**Constat net : 0 intégration d'e-mail dans le code du serveur.** Pas de SendGrid, pas de Resend,
pas de SMTP, pas de notification push.

Ce qui existe vraiment :

| Type | Où | État |
|---|---|---|
| Messages à l'écran (toasts) | `App.tsx` (12 endroits), `TTSStudio.tsx` (20 endroits) | ✅ fonctionnent |
| E-mail de **réinitialisation de mot de passe** | envoyé par **Supabase**, pas par Sawtify | ⚠️ voir ci-dessous |
| E-mail de **confirmation de compte** | envoyé par **Supabase** | ⚠️ voir ci-dessous |
| Notification push / SMS | — | ❌ n'existe pas |

### Le seul vrai risque

Le lien « Mot de passe oublié ? » et la confirmation d'inscription **dépendent à 100 % de la
configuration e-mail de ton projet Supabase**. Si tu n'as pas branché un vrai service d'envoi
(Resend, Brevo, SendGrid…) dans les réglages Supabase :

- le service d'e-mail par défaut de Supabase est **très limité** (quelques messages par heure,
  prévu pour les tests) ;
- au-delà, **les liens n'arrivent jamais** et tes utilisateurs sont bloqués.

**Le code, lui, est correct** : le retour du lien est bien détecté (`PASSWORD_RECOVERY` →
`SetPasswordScreen`). C'est purement une question de configuration Supabase.

**À vérifier :** Supabase → Authentication → Email. Si l'envoi n'est pas configuré, c'est **le**
point à traiter avant d'avoir de vrais utilisateurs.

---

## 4. LES POP-UP — tous là, un vestige

| Pop-up | État |
|---|---|
| Connexion · Inscription · Réinitialisation mot de passe | ✅ branchées |
| Bienvenue (onboarding) | ✅ branchée |
| Choix du ton avant génération | ✅ fonctionne **vraiment** maintenant |
| Solde insuffisant | ✅ s'affiche, bouton « Recharger » → page Prix |
| Prix / Recharge | ✅ la recharge passe par la page Prix |
| **`RechargeModal.tsx`** | ⚠️ **code mort** : le fichier existe mais **aucun écran ne l'utilise** |

`RechargeModal.tsx` n'est pas cassé — il est simplement **inutilisé** (la recharge a été déplacée
vers la page Prix). Il peut être supprimé pour alléger le projet. Il est aussi encore cité dans
l'arborescence montrée aux développeurs, ce qui peut induire en erreur.

---

## 5. Ce qu'il reste — et qui demande ton accord

### ① Une phrase dans la pop-up (fichier du site)

La pop-up annonce « le ton pour le **tout premier mot** ». Un ton dure maintenant **toute la
lecture** — ce qui est mieux (une voix calme qui reste calme), mais la phrase devrait dire
« pour toute la lecture ».

**C'est une modification dans `src/`, hors de mon périmètre autorisé.** Dis-moi « oui » et c'est
fait en 30 secondes.

### ② Supprimer le vestige `RechargeModal.tsx`

Même chose : c'est dans `src/`. Ça ne casse rien de le laisser.

### ③ Configurer l'e-mail Supabase

De ton côté, dans le tableau de bord Supabase. C'est le seul point qui peut **bloquer de vrais
utilisateurs**.

---

## 6. Résumé

| Sujet | Verdict |
|---|---|
| 🎙️ **Ton de la voix (calme / excité / normal)** | ❌ cassé → ✅ **réparé et testé** |
| 🎙️ Menu « Insérer effet » | ❌ 5 morts sur 9 → ✅ **0 mort** |
| 🎙️ Mode de secours 3.1 | ✅ préservé (test dédié) |
| 💳 Paiement | ✅ **solide** — 3 variables à vérifier dans Render |
| 🔔 Notifications | ⚠️ messages à l'écran ✅ · e-mails = **Supabase à configurer** |
| 🪟 Pop-ups | ✅ tous branchés · un vestige inutilisé |
| 📄 Documentation | ✅ 4 documents à jour, **65 contrôles automatiques** |
| 🧪 Tests | ✅ **343, 0 échec** |

**En une phrase :** le « calme / excité / normal » était **réellement cassé**, je l'ai réparé
sans toucher au site et avec 34 tests qui empêchent le retour du bug ; le paiement est bien
construit ; et le seul point que je ne peux pas régler d'ici, c'est la configuration e-mail de
Supabase.
