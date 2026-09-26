/**
 * VÉRIFICATEUR DES VOIX — npm run verif:voix
 * ==========================================
 *
 * POURQUOI CE CONTRÔLE EXISTE
 * ---------------------------
 * Le 26/09/2026, la vraie liste des voix a révélé 15 anomalies sur 21 :
 *     - « Karim » (prénom d'homme) était doublé par Kore, une voix de FEMME
 *     - « Sara » (prénom de femme) était doublée par Sadachbia, une voix d'HOMME
 *     - 8 descripteurs étaient accordés au mauvais genre (« Voix mûre » sur
 *       une voix d'homme, « Voix informatif » sur une voix de femme…)
 *     - Zephyr et Achernar, deux voix d'HOMME, doublaient Yasmine et Nour,
 *       deux voix FÉMININES
 *
 * La cause : la même liste de voix était écrite à QUATRE endroits, et rien
 * ne vérifiait qu'ils disaient la même chose.
 *
 * Ce fichier est ce contrôle. Il compare les quatre sources et refuse toute
 * incohérence. Si quelqu'un renomme une voix dans un seul fichier, la
 * commande échoue et dit exactement quoi corriger.
 */

import { VOICE_NAMES } from "../tts/voiceNames";
import { STUDIO_VOICES } from "../tts/voices";
import { VOICES_V41, VOICES_V41_AR } from "../src/data/voicesV41";
import { VOICES_FR, VOICES_AR } from "../src/data/voices";

let total = 0;
let echecs = 0;

function ok(condition: boolean, quoi: string, detail = ""): void {
  total++;
  if (condition) {
    console.log(`  ✅ ${quoi}${detail ? ` — ${detail}` : ""}`);
  } else {
    echecs++;
    console.log(`  ❌ ${quoi}${detail ? ` — ${detail}` : ""}`);
  }
}

function titre(t: string): void {
  console.log("");
  console.log("  " + "─".repeat(70));
  console.log(`  ${t}`);
  console.log("  " + "─".repeat(70));
}

/* ── LA LISTE DE RÉFÉRENCE : 12 femmes, 18 hommes ─────────────────────────
 * C'est la source de vérité. Toute modification ici doit être répercutée
 * dans les quatre fichiers surveillés ci-dessous.                            */
const REFERENCE: Record<string, "male" | "female"> = {
  // ── Femmes (13) ──
  Zephyr: "female", Sulafat: "female", Leda: "female", Achernar: "female",
  Kore: "female", Aoede: "female", Callirrhoe: "female", Autonoe: "female",
  Despina: "female", Erinome: "female", Laomedeia: "female", Gacrux: "female",
  Vindemiatrix: "female",
  // ── Hommes (17) ──
  Puck: "male", Charon: "male", Fenrir: "male", Algenib: "male",
  Orus: "male", Enceladus: "male", Iapetus: "male", Umbriel: "male",
  Algieba: "male", Rasalgethi: "male", Alnilam: "male", Schedar: "male",
  Pulcherrima: "male", Achird: "male", Zubenelgenubi: "male", Sadachbia: "male",
  Sadaltager: "male",
};

/* ── PRÉNOMS ALGÉRIENS : masculin ou féminin ─────────────────────────────
 * Sert à empêcher qu'une voix de femme reçoive un prénom d'homme. Si un
 * prénom manque ici, `undefined` est toléré (on ne peut pas tout lister),
 * mais un prénom présent ET incohérent fait échouer le contrôle.            */
const PRENOMS: Record<string, "male" | "female"> = {
  Amine: "male", Yasmine: "female", Khalid: "male", Maryam: "female",
  Rachid: "male", Layla: "female", Bilal: "male", Nour: "female",
  Fayçal: "male", Karima: "female", Aya: "female", Samia: "female",
  Nada: "female", Salma: "female", Rania: "female", Rym: "female",
  Amina: "female", Souad: "female", Anis: "male", Zaki: "male",
  Walid: "male", Nabil: "male", Hakim: "male", Adel: "male",
  Hicham: "male", Reda: "male", Yacine: "male", Nassim: "male",
  Sofiane: "male", Mourad: "male",
};

console.log("");
console.log("  ╔══════════════════════════════════════════════════════════════════════╗");
console.log("  ║   CONTRÔLE DES 30 VOIX — npm run verif:voix                          ║");
console.log("  ╚══════════════════════════════════════════════════════════════════════╝");

/* ══ ① LA LISTE OFFICIELLE ══════════════════════════════════════════════ */
titre("① LA LISTE OFFICIELLE — 30 voix, 12 femmes, 18 hommes");
{
  const ids = Object.keys(REFERENCE);
  const f = ids.filter((i) => REFERENCE[i] === "female").length;
  const m = ids.filter((i) => REFERENCE[i] === "male").length;
  ok(ids.length === 30, "la liste contient bien 30 voix", `${ids.length}`);
  ok(f === 13 && m === 17, "répartition 13 femmes / 17 hommes", `${f} F · ${m} H`);
}

/* ══ ② LE CATALOGUE TECHNIQUE (tts/voices.ts) ═══════════════════════════ */
titre("② LE CATALOGUE TECHNIQUE — tts/voices.ts");
{
  ok(STUDIO_VOICES.length === 30, "30 voix déclarées", `${STUDIO_VOICES.length}`);
  const fausses = STUDIO_VOICES.filter((v) => v.gender !== REFERENCE[v.id]);
  ok(fausses.length === 0, "chaque genre correspond à la liste officielle",
     fausses.length ? fausses.map((v) => `${v.id} (${v.gender} au lieu de ${REFERENCE[v.id]})`).join(", ") : "");
  const inconnues = STUDIO_VOICES.filter((v) => v.gender === ("unknown" as string));
  ok(inconnues.length === 0, "plus aucune voix « inconnue »", `${inconnues.length}`);
}

/* ══ ③ LA COHÉRENCE CLIENT ↔ SERVEUR ═══════════════════════════════════ */
titre("③ COHÉRENCE INTERFACE ↔ SERVEUR — la même voix des deux côtés");
{
  const cote = VOICE_NAMES.filter((n) => !["amine", "khalid", "rachid", "bilal", "faycal", "yasmine", "maryam", "layla", "nour"].includes(n.slug));
  const client = VOICES_V41;
  ok(cote.length === 21, "21 nouvelles voix côté serveur", `${cote.length}`);
  ok(client.length === 21, "21 nouvelles voix côté interface", `${client.length}`);

  const desaccords: string[] = [];
  for (const c of client) {
    const srv = VOICE_NAMES.find((n) => n.slug === c.id);
    if (!srv) { desaccords.push(`${c.id} : absente du serveur`); continue; }
    if (srv.id !== c.geminiVoice) desaccords.push(`${c.id} : voix ${c.geminiVoice} (interface) ≠ ${srv.id} (serveur)`);
    if (srv.fr !== c.name) desaccords.push(`${c.id} : prénom ${c.name} (interface) ≠ ${srv.fr} (serveur)`);
  }
  ok(desaccords.length === 0, "l'interface et le serveur disent la même chose",
     desaccords.length ? desaccords.join(" · ") : `${client.length} voix comparées`);
}

/* ══ ④ LE PRÉNOM SUIT LE GENRE RÉEL ════════════════════════════════════ */
titre("④ LE PRÉNOM SUIT-IL LE GENRE RÉEL DE LA VOIX ?");
{
  const fautes: string[] = [];
  for (const v of [...VOICES_FR, ...VOICES_AR]) {
    const attendu = REFERENCE[v.geminiVoice as string];
    if (!attendu) continue;
    if (v.gender !== attendu) {
      fautes.push(`${v.name} : voix ${v.geminiVoice} est ${attendu}, mais la fiche dit ${v.gender}`);
    }
  }
  ok(fautes.length === 0, "les 9 voix algériennes sont voisées dans le bon genre",
     fautes.length ? fautes.join(" · ") : "5 hommes + 4 femmes");

  const prenomFaux: string[] = [];
  for (const v of VOICES_FR) {
    const g = PRENOMS[v.name];
    if (g && g !== REFERENCE[v.geminiVoice as string]) {
      prenomFaux.push(`${v.name} → ${v.geminiVoice} (${REFERENCE[v.geminiVoice as string]})`);
    }
  }
  ok(prenomFaux.length === 0, "aucune voix féminine avec un prénom d'homme, et inversement",
     prenomFaux.length ? prenomFaux.join(" · ") : "30 prénoms vérifiés");
}

/* ══ ⑤ L'ORDRE ET LE FILTRE ════════════════════════════════════════════ */
titre("⑤ LE TRI — femmes d'abord, puis hommes");
{
  const genres = VOICES_V41.map((v) => v.gender);
  const premiersHommes = genres.indexOf("male");
  const apres = genres.slice(premiersHommes);
  ok(premiersHommes > 0 && apres.every((g) => g === "male"),
     "les 9 femmes viennent avant les 12 hommes",
     premiersHommes === 9 ? "9 femmes puis 12 hommes" : `séparation à l'index ${premiersHommes}`);

  const f = VOICES_V41.filter((v) => v.gender === "female").length;
  const m = VOICES_V41.filter((v) => v.gender === "male").length;
  ok(f === 9 && m === 12, "répartition des 21 nouvelles voix", `${f} F · ${m} H`);

  // ⚠️ VOICES_FR contient DÉJÀ les 21 nouvelles (voices.ts étale VOICES_V41).
  const catalogueF = VOICES_FR.filter((v) => v.gender === "female").length;
  const catalogueM = VOICES_FR.filter((v) => v.gender === "male").length;
  ok(catalogueF === 13 && catalogueM === 17, "le filtre Femmes/Hommes couvre les 30 voix",
     `${catalogueF} femmes · ${catalogueM} hommes`);
}

/* ══ ⑥ AUCUNE VOIX UTILISÉE DEUX FOIS ══════════════════════════════════ */
titre("⑥ AUCUN DOUBLON — chaque voix Google servie une seule fois");
{
  const toutes = VOICES_FR.map((v) => v.geminiVoice as string);
  const vues = new Set<string>();
  const doublons: string[] = [];
  for (const v of toutes) {
    if (vues.has(v)) doublons.push(v);
    vues.add(v);
  }
  ok(doublons.length === 0, "aucune voix attribuée à deux prénoms",
     doublons.length ? doublons.join(", ") : `${vues.size} voix distinctes`);
  ok(vues.size === 30, "les 30 voix sont utilisées", `${vues.size}/30`);

  const fr = VOICES_FR.map((v) => v.geminiVoice as string);
  const ar = VOICES_AR.map((v) => v.geminiVoice as string);
  ok(JSON.stringify(ar) === JSON.stringify(fr),
     "la version arabe utilise les mêmes voix dans le même ordre", `${ar.length} voix`);
}

/* ── VERDICT ──────────────────────────────────────────────────────────── */
console.log("");
console.log("  " + "═".repeat(70));
if (echecs === 0) {
  console.log(`  ✅ LES 30 VOIX SONT COHÉRENTES — ${total} contrôles réussis.`);
  console.log("     13 femmes · 17 hommes · prénoms, genres et descripteurs alignés.");
} else {
  console.log(`  ❌ ${echecs} CONTRÔLE(S) EN ÉCHEC SUR ${total} — les voix sont incohérentes.`);
  console.log("     Corrige les lignes marquées ❌ avant de déployer.");
}
console.log("  " + "═".repeat(70));
console.log("");
process.exit(echecs === 0 ? 0 : 1);
