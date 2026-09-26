#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — VÉRIFICATION D'EXHAUSTIVITÉ DES BALISES <...>
 * ============================================================================
 *  Compare le catalogue Sawtify (tts/vocalTags.ts) à la liste OFFICIELLE
 *  de Google, recopiée mot pour mot depuis la documentation
 *  « Vocal bursts and non-speech sounds » (mise à jour du 24/09/2026).
 *
 *  But : garantir qu'AUCUNE balise officielle ne manque à l'appel.
 *
 *  USAGE :  npx tsx scripts/verifier-balises.ts
 *  Sortie : code 0 si le catalogue est complet, code 1 sinon.
 * ============================================================================
 */

import { VOCAL_TAGS, allAcceptedTagStrings, tagsByCategory } from "../tts/vocalTags";

/**
 * LISTE OFFICIELLE GOOGLE — transcription littérale du tableau de la doc.
 * Chaque entrée = une ligne du tableau (les « / » sont des variantes).
 * NE JAMAIS modifier cette liste sans re-vérifier la source :
 * https://ai.google.dev/gemini-api/docs/generate-content/speech-generation
 */
const OFFICIEL: { tags: string[]; ligne: number }[] = [
  { ligne: 1, tags: ["<argh>", "<breath>", "<heavy breath>", "<exhales>"] },
  { ligne: 2, tags: ["<cackle>", "<cheer>", "<chuckle>", "<chuckles>", "<cough>"] },
  { ligne: 3, tags: ["<cry>", "<gasp>", "<giggle>", "<groan>"] },
  { ligne: 4, tags: ["<growl>", "<grunt>", "<grr>", "<hiss>"] },
  { ligne: 5, tags: ["<laugh>", "<laughter>", "<moan>", "<pant>", "<pff>", "<phew>"] },
  { ligne: 6, tags: ["<scream>", "<shout>", "<shriek>", "<sigh>", "<sighs>"] },
  { ligne: 7, tags: ["<sneeze>", "<snicker>", "<snort>", "<sob>"] },
  { ligne: 8, tags: ["<throat-clearing>", "<tsk>", "<whimper>", "<whispers>", "<whispering>"] },
  { ligne: 9, tags: ["<yawn>", "<short pause>", "<long pause>"] },
];

/** Balises mentionnées HORS tableau dans la doc (exemples de code, migration). */
const MENTIONNEES_AILLEURS = ["<laugh>", "<sigh>", "<cough>", "<breath>", "<short pause>", "<throat-clearing>"];

const ligne = "═".repeat(84);
const sousLigne = "─".repeat(84);

const officielles = OFFICIEL.flatMap((l) => l.tags.map((t) => ({ tag: t, ligne: l.ligne })));
const acceptees = new Set(allAcceptedTagStrings().map((t) => t.toLowerCase()));
const catalogue = new Map(VOCAL_TAGS.flatMap((v) => [[v.tag, v] as const, ...(v.aliases || []).map((a) => [a, v] as const)]));

console.log(`\n${ligne}`);
console.log(`  VÉRIFICATION : toutes les balises <...> officielles sont-elles intégrées ?`);
console.log(`${ligne}`);
console.log(`  Source       : doc Google du 24/09/2026 (« Vocal bursts and non-speech sounds »)`);
console.log(`  Balises officielles  : ${officielles.length}`);
console.log(`  Écritures acceptées  : ${acceptees.size}`);
console.log(`  Sons (canoniques)    : ${VOCAL_TAGS.length}`);
console.log(`${sousLigne}\n`);

// ── 1. La vérification principale : une balise officielle manque-t-elle ? ──
const manquantes: string[] = [];
const ok: string[] = [];

for (const { tag, ligne: l } of officielles) {
  if (acceptees.has(tag.toLowerCase())) ok.push(tag);
  else manquantes.push(`${tag}  (ligne ${l} du tableau Google)`);
}

console.log("1) PRÉSENCE DE CHAQUE BALISE OFFICIELLE\n");
for (const l of OFFICIEL) {
  const etats = l.tags.map((t) => (acceptees.has(t.toLowerCase()) ? `✓ ${t}` : `✗ ${t}`));
  console.log(`   ${etats.join("   ")}`);
}

// ── 2. Détail des variantes (les « / » de la doc) ──
console.log(`\n${sousLigne}`);
console.log("2) VARIANTES OFFICIELLES (« <x> / <y> » dans la doc)\n");
const paires: [string, string][] = [
  ["<laugh>", "<laughter>"], ["<chuckle>", "<chuckles>"],
  ["<sigh>", "<sighs>"], ["<whispers>", "<whispering>"], ["<pff>", "<phew>"],
];
for (const [a, b] of paires) {
  const va = acceptees.has(a), vb = acceptees.has(b);
  console.log(`   ${va ? "✓" : "✗"} ${a.padEnd(16)} ${vb ? "✓" : "✗"} ${b}`);
}

// ── 3. Classement par catégorie ──
console.log(`\n${sousLigne}`);
console.log("3) CATALOGUE PAR CATÉGORIE\n");
const cats = tagsByCategory();
for (const [cat, tags] of Object.entries(cats)) {
  console.log(`   ${cat.toUpperCase()} (${tags.length})`);
  console.log(`      ${tags.map((t) => t.tag).join(" ")}\n`);
}

// ── 4. Balises hors tableau (exemples dans la doc) ──
console.log(`${sousLigne}`);
console.log("4) BALISES CITÉES HORS TABLEAU (exemples de code / guide de migration)\n");
for (const t of MENTIONNEES_AILLEURS) {
  console.log(`   ${acceptees.has(t.toLowerCase()) ? "✓" : "✗"} ${t}`);
}

// ── 5. Bruitages explicitement déconseillés (doivent être ABSENTS) ──
console.log(`\n${sousLigne}`);
console.log("5) BRUITAGES NON HUMAINS (doc : « Avoid non-vocal sound-effect tags »)\n");
console.log("   Ces sons sont volontairement ABSENTS du catalogue et automatiquement");
console.log("   retirés s'ils apparaissent dans un transcript :");
console.log("   applause · thuds · bang · door · glass · bell · music · siren…\n");

// ── 6. Verdict ──
console.log(`${ligne}`);
if (manquantes.length === 0) {
  console.log(`  ✅ CATALOGUE COMPLET — les ${officielles.length} balises officielles sont intégrées.`);
  console.log(`     ${VOCAL_TAGS.length} sons canoniques + ${acceptees.size - VOCAL_TAGS.length} variantes = ${acceptees.size} écritures acceptées.`);
} else {
  console.log(`  ❌ ${manquantes.length} BALISE(S) MANQUANTE(S) :`);
  for (const m of manquantes) console.log(`     • ${m}`);
}
console.log(`${ligne}\n`);

process.exit(manquantes.length === 0 ? 0 : 1);
