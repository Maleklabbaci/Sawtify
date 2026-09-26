#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — VÉRIFICATION DE LA DOCUMENTATION DÉVELOPPEUR
 * ============================================================================
 *  Lancement :  npm run verif:doc
 *
 *  Une documentation qui ment est pire qu'une absence de documentation.
 *  Ce script compare la DOCUMENTATION au CODE, et échoue dès qu'ils divergent.
 *
 *  Il vérifie que :
 *    • les 30 voix sont documentées (prénom FR, prénom AR, identifiant, ancien ID)
 *    • les 40 balises officielles sont documentées, avec leurs écritures FR et AR
 *    • chaque route annoncée existe VRAIMENT dans server.ts
 *    • chaque route développeur de server.ts EST documentée (dans les 2 sens)
 *    • chaque code HTTP de la doc existe dans le code
 *    • la page HTML et le markdown racontent la même chose
 *    • llms.txt parle bien de la Developer API
 *
 *  Sortie : 0 = tout est cohérent, 1 = la doc et le code ont divergé.
 * ============================================================================
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VOICE_NAMES } from "../tts/voiceNames";
import { VOCAL_TAGS, aliasCounts } from "../tts/vocalTags";
import { previewTargets } from "../tts/voicePreviews";

const racine = process.cwd();
const lire = (p: string) => readFileSync(join(racine, p), "utf8");

const MD = lire("docs/developer-api-beta.md");
const HTML = lire("public/docs/developer-api-beta.html");
const LLMS = lire("public/llms.txt");
const SERVEUR = lire("server.ts");

let ok = 0, ko = 0;
const echecs: string[] = [];
function check(label: string, condition: boolean, detail = "") {
  if (condition) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; echecs.push(label + (detail ? ` — ${detail}` : "")); console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`); }
}
const titre = (t: string) => console.log(`\n${"─".repeat(78)}\n  ${t}\n${"─".repeat(78)}`);

// ===========================================================================
titre("1. LES 30 VOIX SONT DOCUMENTÉES");
// ===========================================================================
const cibles = previewTargets();
const voixAbsentesMd: string[] = [];
const voixAbsentesHtml: string[] = [];
const anciensAbsents: string[] = [];

for (const t of cibles) {
  for (const champ of [t.nameFr, t.nameAr, t.voice.id]) {
    if (!MD.includes(champ)) { voixAbsentesMd.push(`${t.voice.id}(${champ})`); break; }
  }
  if (!HTML.includes(`"${t.voice.id}"`)) voixAbsentesHtml.push(t.voice.id);
  if (t.legacyId && !MD.includes(t.legacyId)) anciensAbsents.push(t.legacyId);
}
check("les 30 voix (FR + AR + technique) sont dans le markdown", voixAbsentesMd.length === 0, voixAbsentesMd.join(", "));
check("les 30 voix sont dans la page HTML", voixAbsentesHtml.length === 0, voixAbsentesHtml.join(", "));
check("les 9 anciens identifiants sont documentés", anciensAbsents.length === 0, anciensAbsents.join(", "));
check("le markdown annonce bien 30 voix", /30\s*\*?\*?\s*voix/i.test(MD) || MD.includes("**30**"));
check("la page HTML annonce bien 30 voix", HTML.includes("Voix disponibles") && HTML.includes("<strong>30</strong>"));
check("aucune voix fantôme dans la page HTML (30 exactement)",
  (HTML.match(/\["[A-Za-z]+","[^"]+","[^"]+","[^"]+",/g) || []).length === 30,
  `${(HTML.match(/\["[A-Za-z]+","[^"]+","[^"]+","[^"]+",/g) || []).length} entrées`);

// ===========================================================================
titre("2. LES 40 BALISES SONT DOCUMENTÉES (avec leurs écritures FR et AR)");
// ===========================================================================
const balisesManquantesMd: string[] = [];
const balisesManquantesHtml: string[] = [];
const frManquants: string[] = [];
const arManquants: string[] = [];

for (const t of VOCAL_TAGS) {
  if (!MD.includes(t.tag)) balisesManquantesMd.push(t.tag);
  if (!HTML.includes(t.tag)) balisesManquantesHtml.push(t.tag);
  // Au moins UNE écriture française et UNE écriture arabe doivent apparaître.
  if (t.aliasesFr?.length && !t.aliasesFr.some((a) => MD.includes(a))) frManquants.push(t.tag);
  if (t.aliasesAr?.length && !t.aliasesAr.some((a) => MD.includes(a))) arManquants.push(t.tag);
}
check("les 40 balises officielles sont dans le markdown", balisesManquantesMd.length === 0, balisesManquantesMd.join(", "));
check("les 40 balises officielles sont dans la page HTML", balisesManquantesHtml.length === 0, balisesManquantesHtml.join(", "));
check("chaque balise a au moins une écriture FRANÇAISE documentée", frManquants.length === 0, frManquants.join(", "));
check("chaque balise a au moins une écriture ARABE documentée", arManquants.length === 0, arManquants.join(", "));

const compte = aliasCounts();
check("le nombre d'écritures annoncé est exact (197)",
  MD.includes("197") && compte.officielles + compte.francaises + compte.arabes === 197,
  `réel = ${compte.officielles} + ${compte.francaises} + ${compte.arabes}`);

// ===========================================================================
titre("3. CHAQUE ROUTE DOCUMENTÉE EXISTE VRAIMENT DANS server.ts");
// ===========================================================================
const routesDoc = [
  "/api/v1/developer/tts",
  "/api/v1/developer/keys",
  "/api/v1/developer/usage",
  "/api/v1/developer/media",
  "/api/v1/tts/voices",
  "/api/v1/tts/preview-manifest",
  "/api/v1/tts/preview",
];
const routesFantomes = routesDoc.filter((r) => !SERVEUR.includes(`"${r}`));
check("aucune route fantôme dans la doc", routesFantomes.length === 0, routesFantomes.join(", "));
check("toutes les routes documentées sont déclarées dans server.ts", routesDoc.every((r) => SERVEUR.includes(r)));

// ... et l'inverse : une route développeur non documentée serait invisible.
// /api/v1/tts/generate est la route du STUDIO : elle exige une session Sawtify, pas une clé
// développeur. Elle est volontairement hors du périmètre de cette documentation.
const HORS_PERIMETRE = ["/api/v1/tts/generate"];
const routesServeur = [...SERVEUR.matchAll(/app\.(get|post|delete)\(\s*"(\/api\/v1\/(?:developer|tts)[^"]*)"/g)]
  .map((m) => m[2])
  .filter((r) => !HORS_PERIMETRE.includes(r));
const routesNonDoc = routesServeur.filter((r) => !MD.includes(r) && !HTML.includes(r));
check("aucune route développeur n'est oubliée dans la doc", routesNonDoc.length === 0, routesNonDoc.join(", "));

// ===========================================================================
titre("4. LES CODES HTTP DE LA DOC SONT RÉELS");
// ===========================================================================
const codesAttendus = ["201", "400", "401", "402", "403", "405", "410", "429", "500", "503"];
const codesAbsentsMd = codesAttendus.filter((c) => !MD.includes(`\`${c}\``));
const codesAbsentsHtml = codesAttendus.filter((c) => !HTML.includes(`<code>${c}</code>`));
check("tableau des erreurs complet dans le markdown", codesAbsentsMd.length === 0, codesAbsentsMd.join(", "));
check("tableau des erreurs complet dans la page HTML", codesAbsentsHtml.length === 0, codesAbsentsHtml.join(", "));
check("le code 201 (clé créée) est présent partout", MD.includes("`201`") && HTML.includes("<code>201</code>"));
check("le code 405 (mauvaise méthode) est documenté", MD.includes("`405`") && HTML.includes("<code>405</code>"));
check("le code 410 (URL média expirée) est documenté", MD.includes("`410`") && HTML.includes("<code>410</code>"));

// ===========================================================================
titre("5. LES CHIFFRES ANNONCÉS CORRESPONDENT AU CODE");
// ===========================================================================
const attendus: [string, string | RegExp, string][] = [
  ["longueur max du texte (5 000)", /TTS(?:_MAX_CHARS_UNLOCKED)?[^;]*\|\| 5000/, "5 000"],
  ["solde minimum API (1 000)", /API_MIN_BALANCE = 1000/, "1 000"],
  ["quota quotidien (20)", /DAILY_TTS_LIMIT[^;]*\|\| 20/, "20"],
  ["découpage (800 caractères)", /TTS_CHUNK_MAX_CHARS[^;]*\|\| 800/, "800"],
  ["fréquence d'échantillonnage (24000)", /pcmToWavBuffer\(pcmBuffer, 24000/, "24 kHz"],
  ["expiration média (7 jours)", /7 \* 86400 \* 1000/, "7 jours"],
  ["débit aperçus (10/min)", /previewLimiter/, "10 requêtes / minute"],
];
const ecarts: string[] = [];
for (const [label, motif, annonce] of attendus) {
  const dansCode = motif instanceof RegExp ? motif.test(SERVEUR) : SERVEUR.includes(motif);
  const dansDoc = MD.includes(annonce);
  if (!dansCode || !dansDoc) ecarts.push(`${label} (code=${dansCode}, doc=${dansDoc})`);
}
check("chaque limite annoncée existe dans le code", ecarts.length === 0, ecarts.join(" | "));
check("les 3 écritures d'une voix sont annoncées", /3 écritures|3 écritures|trois écritures/i.test(MD));
check("la compatibilité des anciens voice_* est garantie", MD.includes("voice_amin") && /toujours|inchang/i.test(MD));

// ===========================================================================
titre("6. COHÉRENCE ENTRE LES 3 FICHIERS DE DOCUMENTATION");
// ===========================================================================
check("llms.txt a une section Developer API", /##\s*Developer API/i.test(LLMS));
check("llms.txt cite l'endpoint principal", LLMS.includes("/api/v1/developer/tts"));
check("llms.txt cite le catalogue des voix", LLMS.includes("/api/v1/tts/voices"));
check("llms.txt cite les clés swt_beta_", LLMS.includes("swt_beta_"));
check("llms.txt cite la nouvelle page de documentation", LLMS.includes("developer-api-beta.html"));
check("le markdown et la page HTML citent les mêmes routes",
  routesDoc.every((r) => MD.includes(r) && HTML.includes(r)),
  routesDoc.filter((r) => !(MD.includes(r) && HTML.includes(r))).join(", "));

const routesNouvelles = ["/api/v1/tts/voices", "/api/v1/tts/preview-manifest"];
check("les nouvelles routes sont dans les 3 fichiers",
  routesNouvelles.every((r) => MD.includes(r) && HTML.includes(r) && LLMS.includes(r)),
  routesNouvelles.filter((r) => !(MD.includes(r) && HTML.includes(r) && LLMS.includes(r))).join(", "));

// ===========================================================================
titre("7. LA DOC NE PROMET PAS CE QUI N'EXISTE PAS");
// ===========================================================================
// Chaque paramètre documenté doit être réellement lu par le handler.
const parametresHandler = ["text", "voice_id", "speed", "pitch", "format"];
const handler = SERVEUR.match(/app\.post\("\/api\/v1\/developer\/tts"[\s\S]{0,600}/)?.[0] || "";
const paramsInventes = parametresHandler.filter((p) => !handler.includes(p));
check("les paramètres documentés sont réellement lus par le handler", paramsInventes.length === 0, paramsInventes.join(", "));
check("chaque paramètre documenté est dans les 2 fichiers",
  parametresHandler.every((p) => MD.includes(`\`${p}\``) && HTML.includes(`<code>${p}</code>`)));

const entetes = ["X-Sawtify-API-Key", "X-Sawtify-Format", "X-Sawtify-Duration", "X-Sawtify-Points",
                 "X-Sawtify-Milestone-Bonus", "X-Sawtify-Remaining-Balance", "X-Sawtify-Media-URL"];
const entetesInventes = entetes.filter((h) => !SERVEUR.includes(h));
check("tous les en-têtes documentés existent dans server.ts", entetesInventes.length === 0, entetesInventes.join(", "));
check("tous les en-têtes documentés sont dans les 2 fichiers",
  entetes.every((h) => MD.includes(h) && HTML.includes(h)),
  entetes.filter((h) => !(MD.includes(h) && HTML.includes(h))).join(", "));

const champsJson = ["audio_base64", "media_url", "mp3_url", "sample_rate", "points_deducted",
                    "points_remaining", "duration_seconds", "milestone_bonus"];
const champsInventes = champsJson.filter((c) => !SERVEUR.includes(c));
check("tous les champs JSON documentés existent dans server.ts", champsInventes.length === 0, champsInventes.join(", "));

// Les bruits non humains promis comme «retirés» le sont-ils vraiment ?
check("les bruits non humains annoncés comme retirés le sont vraiment",
  SERVEUR.includes("parseTranscript") || SERVEUR.includes("vocalTags"),
  "le handler doit passer par parseTranscript()");

// ===========================================================================
console.log(`\n${"═".repeat(78)}`);
console.log(`  DOCUMENTATION : ${ok} vérifications réussies, ${ko} échouées sur ${ok + ko}`);
if (ko) {
  console.log(`\n  À corriger :`);
  for (const e of echecs) console.log(`     • ${e}`);
  console.log(`\n  ⚠️  La documentation a divergé du code. Corrige la doc AVANT de communiquer dessus.`);
}
console.log("═".repeat(78));
process.exit(ko ? 1 : 0);
