# Sawtify — Où part réellement l'argent chaque mois ?

**Réponse à la question : « 100 inscriptions/jour = 16 873 DZD/mois, comment ça ? »**

---

## 1. Le calcul, en clair (aucune magie)

```
1 compte gratuit reçoit            50 points de bienvenue
1 génération payante coûte         20 points (clip ≤ 60 s)
Donc 1 inscrit peut générer        50 ÷ 20 = 2 clips

Un clip gratuit est plafonné à 45 s (FREE_TRIAL_MAX_DURATION_SECONDS)
Un clip de 45 s coûte              3,79 DZD × (45/60) = 2,84 DZD

→ 1 inscrit qui brûle tout = 2 × 2,84 = 5,62 DZD
→ 100 inscrits/jour         = 562 DZD/jour
→ × 30 jours                = 16 873 DZD/mois
```

C'est tout. Pas de coût caché : juste **un cadeau de 50 points × 100 personnes/jour × 30 jours**.

---

## 2. Pourquoi ça « domine » alors que tout le reste est minuscule

Parce que **ton côté payant a une marge de ~95 %**. Donc la structure de coût réelle de Sawtify, c'est seulement :

| Poste | Coût mensuel (100 inscriptions/jour, 35 % d'activation) |
|---|---:|
| **Comptes gratuits** (aucun revenu en face) | **5 969 DZD** (67 % du COGS variable) |
| Comptes payants (60 clients × 13 clips × 3,79 DZD) | 2 877 DZD |
| Infra fixe (Render + Supabase) | 8 320 DZD |
| **COGS TOTAL** | **17 166 DZD** |
| Revenu | 60 000 DZD |
| **Marge nette** | **42 834 DZD (71 %)** |

Tout ce qui « bouge » avec ta croissance, c'est le gratuit. Le reste est soit fixe, soit proportionnel à du revenu qui rentre.

---

## 3. ⚠️ Correction importante à mon message précédent

**16 873 DZD, c'était le PIRE CAS (100 % des inscrits brûlent leurs 50 points).** C'est un plafond, pas une prévision.

| Taux d'activation réel | Coût gratuit/mois (100 inscrits/jour) | Écart |
|---|---:|---:|
| 100 % (pire cas théorique) | 17 055 DZD | — |
| 60 % | 10 233 DZD | −40 % |
| **35 % (réaliste)** | **5 969 DZD** | **−65 %** |
| 15 % (produit non fini) | 2 558 DZD | −85 % |

La plupart des inscrits créent un compte, touchent 50 points et **ne génèrent jamais rien**. Ton coût réel est donc probablement **3× plus bas** que le pire cas.

**Et surtout : ça se couvre très facilement.** Chaque client payant (panier 1 000 DZD, pack Pro) rapporte **952 DZD de marge brute**. Il t'en faut donc :

> ### **7 clients payants par mois** pour couvrir 100 inscriptions gratuites/jour
> ### (soit 0,2 client/jour)

**Conclusion honnête : le cadeau de bienvenue n'est PAS un problème.** C'est une taxe de croissance raisonnable, ~$23/mois, largement couverte par ta conversion. Mon « 16 873 » était le plafond, pas la facture.

---

## 4. Ce qui EST un vrai problème : le farming (non borné)

En vérifiant la protection anti-abus, j'ai trouvé un **vrai trou** dans la chaîne :

```
1. auth.users INSERT        → trigger SQL handle_new_user() → credits_balance = 50  ← BONUS VERSÉ ICI
2. App.tsx (1re connexion)  → POST /api/auth/claim-welcome-bonus → vérifie l'IP
                                  ↳ si IP déjà utilisée : repasse le solde de 50 à 0
```

La limite « 1 bonus par IP » n'est appliquée **que si le client appelle volontairement l'endpoint**. Un script qui :

1. crée un compte via l'API Auth de Supabase (sans passer par ton app),
2. **n'appelle jamais** `/api/auth/claim-welcome-bonus`,
3. appelle directement `POST /api/v1/tts/generate` avec son token,

garde ses 50 points **sans aucune vérification d'IP**. En boucle :

| Comptes farmés/jour | Coût/jour | Coût/mois | Revenu généré |
|---:|---:|---:|---:|
| 100 | 569 DZD | 17 055 DZD | 0 DZD |
| 500 | 2 843 DZD | 85 275 DZD | 0 DZD |
| **2 000** | **11 370 DZD** | **341 100 DZD ($1 312)** | 0 DZD |
| 10 000 | 56 850 DZD | 1 705 500 DZD | 0 DZD |

C'est le **seul scénario où le coût n'est pas borné par ton volume d'utilisateurs réels**.

### Le correctif (le bon ordre des opérations)

Le bonus doit être **versé par le serveur, pas par le trigger**, dans la même transaction que la vérification d'IP :

```sql
-- 1. Les nouveaux comptes démarrent à 0, PAS à 50
ALTER TABLE public.profiles ALTER COLUMN credits_balance SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, credits_balance)
    VALUES (NEW.id, NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur Sawtify'),
            0);                       -- ← 0 au lieu de 50
    RETURN NEW;
END;
$$;
```

```ts
// 2. Dans POST /api/auth/claim-welcome-bonus : créditer SEULEMENT si l'IP est neuve
const { data: inserted, error: insertErr } = await supabaseClient
  .from("ip_claims").insert({ ip, user_id: userId }).select().single();

if (!insertErr && inserted) {
  // IP neuve → on crédite les 50 points ICI, atomiquement
  await supabaseClient.rpc("credit_user_balance", { p_user_id: userId, p_amount: 50 });
  return res.json({ success: true, welcomeGranted: true });
}
return res.json({ success: true, welcomeGranted: false }); // rien versé
```

Comme ça, **un compte qui n'appelle jamais l'endpoint a un solde de 0** : il ne peut rien générer. Le farming devient impossible sans IP neuve.

### Deuxième durcissement (recommandé)

`getClientIp()` prend la **première** valeur de `X-Forwarded-For`. Si Render *ajoute* l'IP réelle à la fin de l'en-tête (cas standard des PaaS), un attaquant peut envoyer son propre `X-Forwarded-For: <IP bidon>` et obtenir un bonus à chaque fois. C'est le **dernier** maillon qui est fiable (celui ajouté par le proxy de confiance) :

```ts
const xff = req.headers["x-forwarded-for"];
const chain = (Array.isArray(xff) ? xff[0] : xff || "").split(",").map((s) => s.trim()).filter(Boolean);
return chain.length ? chain[chain.length - 1] : (req.ip || "unknown"); // ← dernier maillon
```
À vérifier sur ton environnement : compare `req.headers['x-forwarded-for']` avec l'IP réelle dans les logs Render.

**Troisième garde-fou, le plus simple :** exiger un **email confirmé** pour débloquer les 50 points. Ça transforme le farming en travail manuel.

---

## 5. Le levier gratuit le plus rentable

Basculer **uniquement les comptes gratuits** sur `gemini-3.8-flash-lite-tts` :

| | 3.8 Flash TTS | 3.8 Flash-Lite | Économie |
|---|---:|---:|---:|
| Clip gratuit de 45 s | 2,84 DZD | **1,90 DZD** | −33 % |
| Coût mensuel (100 inscrits/jour, 35 % activation) | 5 969 DZD | **3 979 DZD** | **−1 990 DZD/mois** |

Les clients payants gardent la qualité studio (`gemini-3.8-flash-tts`) — et c'est là que la qualité de voix se vend.

---

## 6. Résumé en une phrase

> Le « 16 873 DZD/mois » était le **plafond théorique** d'un cadeau de bienvenue, pas une facture : en pratique c'est ~**6 000 DZD**, couvert par **7 clients payants par mois**.
> Le seul chiffre qui peut vraiment te coûter cher, c'est le **farming de comptes** — et il se ferme en déplaçant le crédit des 50 points du trigger SQL vers l'endpoint serveur.

### Reproduire

```bash
node scripts/economie-plateforme.mjs
SIGNUPS_PER_DAY=1000 CONVERSION_RATE=0.02 node scripts/economie-plateforme.mjs
ACTIVATION_RATE=0.6 node scripts/economie-plateforme.mjs
```

### Sources

- Coûts unitaires : `scripts/cout-tts.mjs` + `docs/cout-tts-3.8.md`
- Barème et packs : `src/data/voices.ts` (`CREDIT_PACKS_FR`), `server.ts` (`computePointsCost`)
- Bonus de bienvenue : `supabase/fix_welcome_credit_and_recharge.sql`, `supabase/fix_welcome_bonus_ip_limit.sql`
- Endpoint : `server.ts` ligne ~2230 (`POST /api/auth/claim-welcome-bonus`), `getClientIp()` ligne ~424
