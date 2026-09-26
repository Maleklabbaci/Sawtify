# Tout est-il réglé ? Le point complet — 26 septembre au soir

Tu as demandé : « et les autres, tout est réglé ? les pop-up, le paiement, les notifications, le
commencement calme / excité / normal, et toute mise à jour ? »

Voici la réponse, sujet par sujet, **sans rien enjoliver**.

---

## Réponse courte

| Ta question | Réponse |
|---|---|
| 🪟 Les pop-up | ✅ **tous branchés et fonctionnels** |
| 💳 Le paiement | ✅ **solide** — mais **3 réglages** restent à vérifier sur Render (je ne les vois pas d'ici) |
| 🔔 Les notifications | ✅ **messages à l'écran** · ⚠️ **les e-mails** dépendent de Supabase |
| 🎙️ Calme / Excité / Normal | ✅ **c'était vraiment cassé, c'est réparé et testé** |
| ✨ Toute mise à jour | ✅ **un défaut de prononciation important a été trouvé et corrigé ce soir** |

---

## ① Les pop-up — ✅ tout est branché

| Pop-up | Où | État |
|---|---|---|
| **Nouveautés 4.1** (celle que tu as demandée) | s'ouvre toute seule à l'entrée dans le studio, après 550 ms | ✅ |
| Le ton de départ (calme / normal / excité) | avant chaque génération | ✅ |
| Connexion / inscription | studio | ✅ |
| Achat de points | page des prix | ✅ |
| Génération en cours | studio | ✅ |

**Un seul détail :** il reste un vieux fichier de pop-up d'achat (`RechargeModal.tsx`) qui n'est
**plus utilisé par personne** depuis que la page des prix a pris le relais. Il ne gêne rien — il
n'apparaît nulle part — c'est juste un meuble oublié dans la cave. Dis-moi si tu veux que je le
sorte.

---

## ② Le paiement — ✅ solide

Le circuit complet est en place et **je l'ai vérifié ligne par ligne** :

```
Le client clique sur « Payer »
    → Sawtify crée une facture chez SlickPay
    → le client paie
    → SlickPay appelle Sawtify (webhook)
    → Sawtify RE-VÉRIFIE la facture chez SlickPay   ← la sécurité est ici
    → les points sont crédités
```

**Le bon point :** Sawtify ne fait **jamais** confiance au message qui arrive. Même si quelqu'un
fabriquait un faux appel « paiement réussi », Sawtify redemanderait confirmation directement à
SlickPay. C'est la bonne façon de faire.

### Les 3 réglages que je ne peux pas voir d'ici

Ils vivent dans **Render**, pas dans le code — donc je n'y ai pas accès :

| Réglage | Si absent… |
|---|---|
| `SLICKPAY_WEBHOOK_SECRET` | les appels entrants sont acceptés sans vérification de secret (la re-vérification protège quand même) |
| `FRONTEND_URL` | le client est renvoyé au mauvais endroit après paiement |
| `SLICKPAY_MODE` | `test` ou `live` — à ne pas se tromper le jour du lancement |

**30 secondes dans Render → Environment**, et c'est réglé.

---

## ③ Les notifications — ✅ à l'écran · ⚠️ les e-mails

Il faut distinguer deux choses très différentes :

| Type | État |
|---|---|
| **Messages à l'écran** (« -5 Points », « Solde insuffisant », « Génération… ») | ✅ **32 endroits, tous fonctionnels** |
| **E-mail de confirmation de compte** | ⚠️ envoyé par **Supabase**, pas par Sawtify |
| **E-mail « mot de passe oublié »** | ⚠️ envoyé par **Supabase**, pas par Sawtify |
| Notification push / SMS | ❌ n'existe pas — et n'a jamais existé |

### Ce que ça veut dire concrètement

Si un client oublie son mot de passe et clique sur « Mot de passe oublié ? », **c'est Supabase qui
envoie le mail**. Et par défaut, Supabase limite à quelques mails par heure et ils partent souvent
dans les indésirables.

**C'est le seul endroit de Sawtify où je ne peux rien faire depuis ici.** Il faut aller dans les
réglages Supabase et brancher un vrai service d'envoi (Resend, Brevo…). Sans ça, un client qui
oublie son mot de passe est bloqué.

---

## ④ Calme / Excité / Normal — ✅ réparé, et je viens de le revérifier

Tu avais raison de demander : **c'était réellement cassé.** Le menu « Insérer effet » offrait 9
effets dont **5 ne faisaient strictement rien**. L'application parlait encore la langue de
l'ancien modèle, où `[calm]` était un mot magique que Google comprenait — mais cette
reconnaissance n'existe plus dans la version actuelle.

**Ce que j'ai mesuré à l'instant, sur le vrai moteur :**

| Tu choisis | Ce qui part réellement au moteur vocal |
|---|---|
| **Calme** | `… calm and composed from the very first word, soft and soothing throughout` |
| **Normal** | *(aucune consigne — c'est exactement ce qu'on veut : on ne force rien)* |
| **Excité** | `… excited and enthusiastic, high energy from the very first word` |

La balise elle-même est **retirée du texte parlé** : la voix ne dit jamais « crochet calm ».

---

## ⑤ Ce qui vient d'être corrigé — et c'est le plus important

La pop-up 4.1 promet une **prononciation** très travaillée. En vérifiant ce qui part vraiment au
moteur vocal, j'ai trouvé que **cette promesse n'était pas tenue** pour l'algérien.

### Le problème, en une image

Quand on écrit en lettres arabes, la machine lit par défaut de l'**arabe standard** — la langue des
journaux télévisés. « واش راك يا خويا » sortait donc comme **un présentateur qui lit les
informations**, pas comme un Algérien qui parle à son voisin.

Et ce n'était pas un réglage à affiner : **la darija ne s'écrit pas de façon officielle.** Aucune
machine ne peut la reconnaître toute seule. Il fallait le lui dire — et depuis le passage à la
nouvelle version, Sawtify ne le lui disait plus.

### Pourquoi on ne pouvait pas le remettre n'importe où

La consigne existait avant, mais dans un long bloc de notes. La documentation de Google est
catégorique : ce genre de bloc est la **première cause de dérive de la voix**, et dans la version
actuelle le texte est lu **mot pour mot** — la voix aurait littéralement lu « parle en darija » à
voix haute.

Il fallait trouver le bon canal. Il existe, et c'est fait.

### Et un deuxième défaut, trouvé dans le même geste

En regardant ce code de près : **la vitesse écrasait le ton.** Demander « calme » *et* une vitesse
rapide n'envoyait que la vitesse — **le calme disparaissait, sans le moindre avertissement.**

Les deux sont corrigés, et **13 nouveaux tests** empêchent le retour du bug.

---

## ⑥ Ce qu'il te reste à faire — 2 gestes

1. **Lancer `npm run apercus:voix`** (≈ 3 dinars) pour les 30 aperçus audio. C'est à toi : il faut
   ta clé API. Ça te permet d'écouter les 21 nouvelles voix et de valider leur genre à l'oreille
   (Google ne publie aucun genre pour ces voix, donc c'est ton oreille qui tranche).
2. **Vérifier les 3 réglages SlickPay** dans Render (voir le ②).

Tout le reste est fait.

---

## ⑦ Les chiffres, vérifiés à l'instant

```
moteur vocal            169 / 169
noms des voix            22 /  22
balises officielles      ✅ complet (40 balises, 5 sections)
aperçus audio            39 /  39
documentation            65 /  65
───────────────────────────────────
TOTAL                   335 vérifications, 0 échec

contrôle de syntaxe     0 erreur
qualité du code         0 erreur
compilation du site     OK en 6,7 s
```

---

## En une phrase

**Le « calme / excité / normal » était vraiment cassé et il est réparé ; la prononciation de
l'algérien était la promesse non tenue de la 4.1 et elle est tenue maintenant ; le paiement est
bien construit et il ne lui manque que 3 réglages à vérifier sur Render ; et le seul point que je
ne peux pas régler depuis ici, ce sont les e-mails de Supabase.**
