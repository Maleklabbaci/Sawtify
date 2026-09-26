#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — ÉCONOMIE UNITAIRE MENSUELLE (où part réellement l'argent ?)
 * ============================================================================
 *  S'appuie sur les coûts unitaires vérifiés par scripts/cout-tts.mjs :
 *    - 1 clip payant de 60 s (3.8 Flash TTS) : 3,79 DZD
 *    - 1 clip gratuit de 45 s (cap essai)     : 2,81 DZD
 *    - 50 points de bienvenue = 2 clips de 20 pts (cap 45 s) = 5,62 DZD
 *
 *  Usage :
 *    node scripts/economie-plateforme.mjs
 *    SIGNUPS_PER_DAY=1000 node scripts/economie-plateforme.mjs
 * ============================================================================
 */

const N = (k, d) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && process.env[k] !== undefined && process.env[k] !== "" ? v : d;
};

// ── Coûts unitaires (DZD) ────────────────────────────────────────────────────
const USD_TO_DZD = N("USD_TO_DZD", 260);
const COST_CLIP_60S = 3.79;      // 3.8 Flash TTS, 1 min, prompt + audio + retries
const COST_CLIP_45S = COST_CLIP_60S * (45 / 60); // ≈ 2,84 (cap essai gratuit)
const WELCOME_POINTS = 50;
const POINTS_PER_CLIP = 20;
const FREE_CLIPS_PER_SIGNUP = Math.floor(WELCOME_POINTS / POINTS_PER_CLIP); // 2

// ── Hypothèses de trafic (surchargeables) ────────────────────────────────────
const H = {
  signupsPerDay: N("SIGNUPS_PER_DAY", 100),
  activationRate: N("ACTIVATION_RATE", 0.35),      // % qui génèrent au moins 1 audio
  freeBurnRate: N("FREE_BURN_RATE", 1.0),          // % des activés qui brûlent leurs 50 pts
  conversionRate: N("CONVERSION_RATE", 0.02),      // % des inscrits qui paient
  avgPackDZD: N("AVG_PACK_DZD", 1000),             // panier moyen (pack Pro = 1000 DZD / 220 pts)
  // Bonus palier : +30 pts toutes les 10 générations → remise réelle de 15%
  milestoneDiscount: 30 / (10 * POINTS_PER_CLIP),
  fixedMonthlyUSD: N("FIXED_MONTHLY_USD", 32),     // Render + Supabase Pro
  daysPerMonth: 30,
};

// ── Packs (src/data/voices.ts) ───────────────────────────────────────────────
const PACKS = {
  pack_starter: { points: 100, priceDZD: 500 },
  pack_pro: { points: 220, priceDZD: 1000 },
  pack_studio: { points: 600, priceDZD: 2500 },
  pack_business: { points: 1350, priceDZD: 5000 },
};

const usd = (dzd) => `$${(dzd / USD_TO_DZD).toFixed(2)}`;
const fmt = (v, d = 0) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

function model(overrides = {}) {
  const h = { ...H, ...overrides };
  const monthsSignups = h.signupsPerDay * h.daysPerMonth;

  // ── COGS côté GRATUIT (aucun revenu en face) ──
  const activatedUsers = monthsSignups * h.activationRate;
  const clipsGratuits = activatedUsers * FREE_CLIPS_PER_SIGNUP * h.freeBurnRate;
  const cogsGratuit = clipsGratuits * COST_CLIP_45S;

  // ── COGS côté PAYANT ──
  const payingUsers = monthsSignups * h.conversionRate;
  const revendeursPoints = h.avgPackDZD; // DZD encaissés par client payant
  // points réellement livrés = points achetés × (1 + bonus palier)
  const pointsDelivres = (h.avgPackDZD / 1000) * PACKS.pack_pro.points * (1 + h.milestoneDiscount);
  const clipsPayants = pointsDelivres / POINTS_PER_CLIP;
  const revenue = payingUsers * revendeursPoints;
  const cogsPayant = payingUsers * clipsPayants * COST_CLIP_60S;

  const cogsTotal = cogsGratuit + cogsPayant;
  const fixedDZD = h.fixedMonthlyUSD * USD_TO_DZD;
  const margeBrute = revenue - cogsTotal;
  const net = margeBrute - fixedDZD;

  return {
    ...h, monthsSignups, activatedUsers, clipsGratuits, cogsGratuit,
    payingUsers, clipsPayants, pointsDelivres, revenue, cogsPayant,
    cogsTotal, fixedDZD, margeBrute, net,
    cogsParInscrit: cogsGratuit / monthsSignups,
    partGratuit: (cogsGratuit / cogsTotal) * 100,
    // Combien de clients payants pour couvrir UNIQUEMENT le coût du gratuit ?
    clientsPourCouvrirGratuit: cogsGratuit / (revendeursPoints - clipsPayants * COST_CLIP_60S),
    tauxAcquisitionClient: payingUsers / h.daysPerMonth,
  };
}

// ── Rendu ────────────────────────────────────────────────────────────────────
const lines = [];
const p = (s = "") => lines.push(s);
const L = "═".repeat(96);

const base = model();

p(L);
p("  SAWTIFY — OÙ PART RÉELLEMENT L'ARGENT CHAQUE MOIS ?");
p(L);
p(`  Hypothèses : ${H.signupsPerDay} inscriptions/jour · ${(H.activationRate * 100).toFixed(0)}% activés · ${(H.conversionRate * 100).toFixed(1)}% convertis en payant · panier moyen ${fmt(H.avgPackDZD)} DZD`);
p(`  Coûts unitaires : clip payant 60 s = ${COST_CLIP_60S.toFixed(2)} DZD | clip gratuit 45 s = ${COST_CLIP_45S.toFixed(2)} DZD | 1 USD = ${USD_TO_DZD} DZD`);
p("");
p("  ── 1. LE CÔTÉ GRATUIT (ton vrai centre de coût) " + "─".repeat(50));
p(`     ${fmt(base.monthsSignups)} inscriptions/mois × ${(H.activationRate * 100).toFixed(0)}% activés = ${fmt(base.activatedUsers)} utilisateurs qui génèrent`);
p(`     ${fmt(base.activatedUsers)} × ${FREE_CLIPS_PER_SIGNUP} clips (50 pts de bienvenue) = ${fmt(base.clipsGratuits)} clips gratuits/mois`);
p(`     ${fmt(base.clipsGratuits)} × ${COST_CLIP_45S.toFixed(2)} DZD = ${fmt(base.cogsGratuit)} DZD/mois   (${usd(base.cogsGratuit)})`);
p(`     → ${base.partGratuit.toFixed(0)}% du COGS VARIABLE (hors infra) et ${((base.cogsGratuit / (base.cogsTotal + base.fixedDZD)) * 100).toFixed(0)}% du COGS TOTAL`);
p(`     → coût moyen par inscription : ${base.cogsParInscrit.toFixed(2)} DZD`);
p("");
p("  ── 2. LE CÔTÉ PAYANT (marge ≈ 95%) " + "─".repeat(47));
p(`     ${fmt(base.payingUsers)} clients payants/mois (soit ${fmt(base.tauxAcquisitionClient, 1)}/jour)`);
p(`     Revenu encaissé                            : ${fmt(base.revenue)} DZD`);
p(`     Points réellement livrés (bonus palier +15%) : ${fmt(base.pointsDelivres)} pts → ${fmt(base.clipsPayants)} clips`);
p(`     COGS payant                                 : ${fmt(base.cogsPayant)} DZD   (${usd(base.cogsPayant)})`);
p("");
p("  ── 3. RÉSULTAT " + "─".repeat(72));
p(`     Coût gratuit   : ${fmt(base.cogsGratuit).padStart(9)} DZD`);
p(`     Coût payant    : ${fmt(base.cogsPayant).padStart(9)} DZD`);
p(`     Infra fixe     : ${fmt(base.fixedDZD).padStart(9)} DZD   (${H.fixedMonthlyUSD}$ Render + Supabase)`);
p(`     ─────────────────────────────`);
p(`     COGS TOTAL     : ${fmt(base.cogsTotal + base.fixedDZD).padStart(9)} DZD`);
p(`     Revenu         : ${fmt(base.revenue).padStart(9)} DZD`);
p(`     MARGE NETTE    : ${fmt(base.net).padStart(9)} DZD   (${usd(base.net)})  → ${base.revenue > 0 ? ((base.net / base.revenue) * 100).toFixed(0) : "—"}%`);
p("");
p("  ── 4. LE SEUIL QUI COMPTE " + "─".repeat(62));
p(`     Chaque client payant rapporte ${fmt(H.avgPackDZD - base.clipsPayants * COST_CLIP_60S)} DZD de marge brute.`);
p(`     Il t'en faut ${fmt(Math.ceil(base.clientsPourCouvrirGratuit))} /mois pour couvrir UNIQUEMENT le coût des comptes gratuits.`);
p(`     Soit ${fmt(base.clientsPourCouvrirGratuit / H.daysPerMonth, 1)} client(s) payant(s) par jour.`);
p("");

// ── Sensibilité : volume d'inscriptions ──
p(L);
p("  SENSIBILITÉ 1 — ET SI TU FAIS 10× PLUS D'INSCRIPTIONS ?");
p(L);
p("  Inscriptions/jour   Coût gratuit/mois     Clients payants requis   Marge nette (à 2% de conversion)");
p("  " + "-".repeat(92));
for (const s of [10, 50, 100, 250, 500, 1000, 5000]) {
  const m = model({ signupsPerDay: s });
  p(`  ${fmt(s).padStart(16)}   ${fmt(m.cogsGratuit).padStart(16)} DZD   ${fmt(Math.ceil(m.clientsPourCouvrirGratuit)).padStart(22)}   ${fmt(m.net).padStart(28)} DZD`);
}
p("");
p("  ▸ LE POINT CLÉ : le coût gratuit est PARFAITEMENT LINÉAIRE. Il ne devient");
p("    dangereux que si ton taux de conversion ne suit pas le volume.");
p("");

// ── Sensibilité : taux d'activation ──
p(L);
p("  SENSIBILITÉ 2 — CE QUE TU CROIS PAYER vs CE QUE TU PAIES VRAIMENT");
p(L);
p("  Taux d'activation   Coût gratuit/mois    Écart vs 100%");
p("  " + "-".repeat(60));
for (const a of [1.0, 0.6, 0.35, 0.15]) {
  const m = model({ activationRate: a });
  p(`  ${((a * 100).toFixed(0) + "%").padStart(17)}   ${fmt(m.cogsGratuit).padStart(16)} DZD   ${fmt(((a - 1) * 100)).padStart(12)}%`);
}
p("");
p("  ▸ La plupart des inscrits ne génèrent JAMAIS rien : ils créent un compte,");
p("    touchent 50 points et disparaissent. Ton vrai coût est donc souvent 3×");
p("    plus bas que le pire cas — mais il est impossible à prévoir sans mesurer.");
p("");

// ── Le vrai risque ──
p(L);
p("  ⚠  SENSIBILITÉ 3 — LE FARMING (le seul scénario non borné)");
p(L);
p("  Ton bonus de 50 points est crédité par le TRIGGER SQL à la création du compte.");
p("  La limite « 1 bonus par IP » n'est appliquée QUE si le client appelle");
p("  POST /api/auth/claim-welcome-bonus (voir App.tsx, à la 1re connexion).");
p("");
p("  Un script qui : crée un compte via l'API Auth de Supabase → n'appelle JAMAIS");
p("  claim-welcome-bonus → utilise /api/v1/tts/generate directement avec le token,");
p("  conserve 50 points SANS AUCUNE VÉRIFICATION D'IP. En boucle :");
p("");
p("  Comptes farmés/jour   Coût/jour        Coût/mois       Ce que ça te rapporte");
p("  " + "-".repeat(88));
for (const n of [100, 500, 2000, 10000]) {
  const c = n * 2 * COST_CLIP_45S;
  p(`  ${fmt(n).padStart(20)}   ${fmt(c).padStart(12)} DZD   ${fmt(c * 30).padStart(12)} DZD      0 DZD`);
}
p("");
p("  ▸ 2 000 comptes farmés/jour = " + fmt(2000 * 2 * COST_CLIP_45S * 30) + " DZD/mois (" + usd(2000 * 2 * COST_CLIP_45S * 30) + ") de sortie de cash,");
p("    sans un seul utilisateur réel. C'est ÇA le risque non borné.");
p("");

// ── Levier ──
p(L);
p("  LEVIER : BASCULER LES COMPTES GRATUITS SUR gemini-3.8-flash-lite-tts");
p(L);
p(`  Coût clip gratuit 45 s : 3.8 Flash TTS ${COST_CLIP_45S.toFixed(2)} DZD  →  Flash-Lite ${(COST_CLIP_45S * (6 / 9)).toFixed(2)} DZD  (−33%)`);
const lite = model();
const cogsLite = lite.clipsGratuits * COST_CLIP_45S * (6 / 9);
p(`  Économie mensuelle sur les comptes gratuits : ${fmt(lite.cogsGratuit - cogsLite)} DZD  (${fmt(((1 - 6 / 9) * 100))}% de moins)`);
p("  Les utilisateurs payants gardent la qualité studio — ils ne verront pas la différence de coût sur leur facture.");
p("");

console.log(lines.join("\n"));
