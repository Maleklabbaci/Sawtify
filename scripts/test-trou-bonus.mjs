#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — TEST : le cadeau de bienvenue peut-il être pris sans l'app ?
 * ============================================================================
 *  Ce script reproduit EXACTEMENT ce que ferait un programme automatisé :
 *  il crée un compte DIRECTEMENT auprès de Supabase, SANS passer par l'app,
 *  et SANS jamais appeler la vérification d'adresse IP.
 *
 *  Puis il lit le solde du compte créé :
 *    → 50 points  = le cadeau est pris sans passer par l'app  (trou ouvert)
 *    →  0 point   = le cadeau est bien protégé                (trou fermé)
 *
 *  USAGE (à lancer depuis la racine du projet) :
 *
 *    SUPABASE_URL="https://jjpcvevdztletxgmmzqr.supabase.co" \
 *    SUPABASE_ANON_KEY="eyJ..." \
 *    node scripts/test-trou-bonus.mjs --email=moi+test1@gmail.com
 *
 *  ⚠ La clé SUPABASE_ANON_KEY est la clé PUBLIQUE : celle qui est déjà
 *    téléchargée dans le navigateur de chaque visiteur de ton site.
 *    Tu la trouves dans Supabase > Project Settings > API > anon public.
 *
 *  ⚠ Ce script crée un VRAI compte dans ta base. Supprime-le après le test :
 *    Supabase > Authentication > Users > sélectionne l'email > Delete user.
 * ============================================================================
 */

import { readFileSync } from "node:fs";

let createClient;
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch {
  console.error(`
✗ Le module @supabase/supabase-js n'est pas installé.

Lance d'abord :
  npm install

puis relance le test.
`);
  process.exit(1);
}

// ── Lecture des identifiants ────────────────────────────────────────────────
function fromDotEnv(key) {
  for (const f of [".env", ".env.local"]) {
    try {
      const txt = readFileSync(f, "utf8");
      const m = txt.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  return null;
}

const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || fromDotEnv("VITE_SUPABASE_URL");
const KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || fromDotEnv("VITE_SUPABASE_ANON_KEY");

const emailArg = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1];
const passwordArg = process.argv.find((a) => a.startsWith("--password="))?.split("=")[1];

if (!URL_ || !KEY) {
  console.error(`
✗ Identifiants manquants.

Relance avec :
  SUPABASE_URL="https://TON-PROJET.supabase.co" \\
  SUPABASE_ANON_KEY="eyJ..." \\
  node scripts/test-trou-bonus.mjs --email=moi+test1@gmail.com
`);
  process.exit(1);
}
if (!emailArg) {
  console.error(`\n✗ Ajoute une adresse email de test : --email=moi+test1@gmail.com\n`);
  process.exit(1);
}

const password = passwordArg || `TestTrou!${Date.now()}`;
const supabase = createClient(URL_, KEY, { auth: { persistSession: false } });
const L = "─".repeat(78);

console.log(`
${L}
  TEST — Le cadeau de bienvenue est-il prenable sans passer par l'app ?
${L}
  Adresse de test : ${emailArg}
  Projet          : ${URL_}
${L}
`);

// ── 1. Créer le compte DIRECTEMENT, sans l'app ──────────────────────────────
console.log("1) Création du compte directement auprès de Supabase (sans l'app)...");
const { data: signup, error: signupError } = await supabase.auth.signUp({
  email: emailArg,
  password,
  options: {
    data: {
      full_name: "TEST TROU BONUS (a supprimer)",
      first_name: "TEST",
      last_name: "TROU",
    },
  },
});

if (signupError) {
  console.error(`   ✗ Échec : ${signupError.message}`);
  console.error(`     (si l'erreur parle de "rate limit", attends un peu et réessaie)`);
  process.exit(1);
}

const hasSessionImmediately = Boolean(signup.session);
console.log(`   ✓ Compte créé : ${signup.user?.id ?? "(id masqué)"}`);
console.log(
  `   → Session obtenue immédiatement : ${hasSessionImmediately ? "OUI" : "NON"}\n` +
    (hasSessionImmediately
      ? `     ⚠️ La confirmation par email est DÉSACTIVÉE dans ton projet Supabase :\n` +
        `        un programme peut donc se connecter tout seul, instantanément, en boucle.`
      : `     ℹ️ La confirmation par email est ACTIVÉE : le programme doit d'abord\n` +
        `        ouvrir la boîte mail pour activer le compte (faisable en automatique,\n` +
        `        avec des adresses jetables, mais c'est une étape de plus).`)
);

// ── 2. Se connecter (sauf si déjà connecté) ────────────────────────────────
let session = signup.session;
if (!session) {
  console.log("2) Connexion (recherche d'une session sans passer par l'app)...");
  const { data: login, error: loginError } = await supabase.auth.signInWithPassword({
    email: emailArg,
    password,
  });
  if (loginError) {
    console.log(`   ✗ Impossible de se connecter : ${loginError.message}`);
    console.log(`
${L}
  RÉSULTAT : le compte existe, mais il faut confirmer l'email avant de
  pouvoir l'utiliser.

  → Le trou est PLUS DIFFICILE à exploiter, mais il existe toujours :
    un attaquant qui confirme l'email (adresses jetables, automatisable)
    s'en sortira. Le cadeau reste versé à la création du compte.

  → Vérifie le solde toi-même : Supabase > Table Editor > profiles
    cherche l'email ${emailArg} et regarde la colonne credits_balance.
        • 50 = le cadeau a été versé SANS passer par l'app → trou ouvert
        •  0 = le cadeau n'a pas été versé                  → trou fermé

  → Puis supprime ce compte de test : Supabase > Authentication > Users.
${L}
`);
    process.exit(0);
  }
  session = login.session;
  console.log("   ✓ Session obtenue sans jamais passer par l'app\n");
}

// ── 3. Lire le solde (c'est le résultat du test) ───────────────────────────
console.log("3) Lecture du solde du compte...");
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("credits_balance, total_generated_audios")
  .eq("id", signup.user?.id)
  .maybeSingle();

console.log(`\n${L}`);
console.log("  RÉSULTAT");
console.log(L);

if (profileError || !profile) {
  console.log(`  Solde illisible depuis l'extérieur (${profileError?.message || "aucune donnée"}).`);
  console.log(`
  Ce n'est pas concluant — vérifie à la main :
  Supabase > Table Editor > profiles > cherche ${emailArg}
      • credits_balance = 50  → le cadeau est versé SANS passer par l'app
      • credits_balance =  0  → le cadeau est bien protégé
`);
} else if (profile.credits_balance >= 50) {
  console.log(`  credits_balance = ${profile.credits_balance}`);
  console.log(`
  🔴 TROU CONFIRMÉ.

  Ce compte a été créé SANS passer par ton app, SANS jamais déclencher la
  vérification d'adresse IP — et il a quand même reçu les 50 points.

  Un programme peut répéter ça en boucle et générer des voix off gratuites
  sans limite. C'est le seul scénario où ton coût n'est pas plafonné.

  CORRECTIF : les nouveaux comptes doivent démarrer à 0, et les 50 points
  doivent être versés par le serveur, au moment où l'adresse IP est vérifiée.
  → Voir docs/EXPLICATION-SIMPLE.md section 5 et docs/economie-plateforme.md section 4
`);
} else {
  console.log(`  credits_balance = ${profile.credits_balance}`);
  console.log(`
  🟢 Aucun trou détecté sur ce chemin.

  Le compte créé sans passer par l'app a reçu 0 point. Le cadeau est donc
  correctement conditionné à la vérification de l'adresse IP.

  → Vérifie quand même le cas "session obtenue immédiatement" ci-dessus :
    si c'était OUI et que le solde est 0, ta protection est complète.
`);
}

console.log(`${L}
  ⚠️  PENSE À SUPPRIMER CE COMPTE DE TEST :
      Supabase > Authentication > Users > ${emailArg} > Delete user
${L}
`);
