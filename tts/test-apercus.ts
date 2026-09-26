/**
 * ============================================================================
 *  SAWTIFY — TESTS DES APERÇUS AUDIO (30 voix)
 * ============================================================================
 *  Lancement :  npx tsx tts/test-apercus.ts
 *            ou npm run test:apercus
 *
 *  Ce que ces tests garantissent :
 *   • les 30 voix ont un aperçu prévu, un prénom FR, un prénom AR, un slug
 *   • les 30 noms de fichiers sont uniques (aucun aperçu n'écrase un autre)
 *   • AUCUN texte d'aperçu ne contient une balise inconnue — sinon Google
 *     la LIRAIT À VOIX HAUTE devant l'utilisateur
 *   • le script d'audition est identique pour les 30 voix (comparaison juste)
 *   • le manifeste d'un aperçu n'est servi que s'il correspond au script
 * ============================================================================
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  AUDITION_SCRIPT, AUDITION_SCRIPT_HASH, AUDITION_SCRIPT_VERSION,
  VOICE_PREVIEW_TEXTS, previewTargets, previewFileName,
  emptyManifest, validateManifest, voicesNeedingGenderValidation,
  type VoicePreviewManifest,
} from "./voicePreviews";
import { parseTranscript } from "./vocalTags";

let ok = 0, ko = 0;
const echecs: string[] = [];
function check(label: string, condition: boolean, detail = "") {
  if (condition) { ok++; console.log(`  ✅ ${label}`); }
  else { ko++; echecs.push(label + (detail ? ` — ${detail}` : "")); console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`); }
}
const section = (t: string) => console.log(`\n${"─".repeat(78)}\n  ${t}\n${"─".repeat(78)}`);

// ===========================================================================
section("1. SCRIPT D'AUDITION — identique pour les 30 voix");
// ===========================================================================
check("script non vide", AUDITION_SCRIPT.length > 200, `${AUDITION_SCRIPT.length} caractères`);
check("empreinte sur 12 caractères hexadécimaux", /^[0-9a-f]{12}$/.test(AUDITION_SCRIPT_HASH), AUDITION_SCRIPT_HASH);
check("version numérotée ≥ 1", AUDITION_SCRIPT_VERSION >= 1, `v${AUDITION_SCRIPT_VERSION}`);
check("le script contient des balises de sons", /<[^<>]+>/.test(AUDITION_SCRIPT));

const scriptParse = parseTranscript(AUDITION_SCRIPT);
check("aucune balise inconnue dans le script d'audition", scriptParse.unknownTags.length === 0, scriptParse.unknownTags.join(", "));
check("aucun effet sonore interdit dans le script", scriptParse.forbiddenSfx.length === 0, scriptParse.forbiddenSfx.join(", "));
check("le script d'audition contient du texte parlé réel", scriptParse.text.replace(/[^\u0600-\u06FF]/g, "").length > 80);
check("aucun prénom genré prononcé (jugement neutre)", !/أمين|خالد|رشيد|بلال|فيصل|ياسمين|مريم|ليلى|نور/.test(AUDITION_SCRIPT));

// ===========================================================================
section("2. LES 30 VOIX — cibles d'aperçu");
// ===========================================================================
const targets = previewTargets();
check("30 voix ciblées", targets.length === 30, `${targets.length}`);
check("aucun prénom français vide", targets.every((t) => t.nameFr && t.nameFr.length > 1));
check("aucun prénom arabe vide", targets.every((t) => t.nameAr && /[\u0600-\u06FF]/.test(t.nameAr)));
check("aucun slug vide", targets.every((t) => t.slug && t.slug.length > 1));
check("prénoms français tous uniques", new Set(targets.map((t) => t.nameFr)).size === 30);
check("prénoms arabes tous uniques", new Set(targets.map((t) => t.nameAr)).size === 30);
check("identifiants techniques tous uniques", new Set(targets.map((t) => t.voice.id)).size === 30);

const fichiers = targets.map((t) => previewFileName(t.voice.id));
check("30 noms de fichiers distincts (aucun écrasement)", new Set(fichiers).size === 30);
check("noms de fichiers sûrs (URL et système)", fichiers.every((f) => /^[a-z0-9-]+\.wav$/.test(f)), fichiers.filter((f) => !/^[a-z0-9-]+\.wav$/.test(f)).join(", "));

// Les 9 voix des personas Sawtify portent un identifiant historique — pas
// forcément les 9 premières du catalogue, qui suit l'ordre de Google.
// Depuis le 26/09/2026 : la liste de référence confirme que Zephyr (Yasmine)
// et Achernar (Nour) sont bien des voix de FEMME ; Pulcherrima et Schedar,
// elles, sont des voix d'HOMME du catalogue général, sans identifiant.
const VOIX_PERSONAS = ["Puck", "Charon", "Fenrir", "Algenib", "Orus", "Zephyr", "Sulafat", "Leda", "Achernar"];
const avecLegacy = targets.filter((t) => Boolean(t.legacyId)).map((t) => t.voice.id).sort();
check("les 9 voix des personas gardent leur identifiant Sawtify",
  avecLegacy.join(",") === [...VOIX_PERSONAS].sort().join(","), avecLegacy.join(", "));
check("les 21 autres voix n'ont aucun identifiant historique",
  targets.filter((t) => !t.legacyId).length === 21,
  `${targets.filter((t) => !t.legacyId).length}`);

// ===========================================================================
section("3. TEXTES D'APERÇU — un par voix, tous propres");
// ===========================================================================
const textes = Object.entries(VOICE_PREVIEW_TEXTS);
check("30 textes d'aperçu", textes.length === 30, `${textes.length}`);
check("chaque voix a son texte", targets.every((t) => Boolean(VOICE_PREVIEW_TEXTS[t.voice.id])),
  targets.filter((t) => !VOICE_PREVIEW_TEXTS[t.voice.id]).map((t) => t.voice.id).join(", "));
check("aucun texte orphelin (clé inconnue)", targets.every((t) => t.voice.id in VOICE_PREVIEW_TEXTS),
  textes.filter(([k]) => !targets.some((t) => t.voice.id === k)).map(([k]) => k).join(", "));

const problemes: string[] = [];
const interdits: string[] = [];
const pasArabic: string[] = [];
for (const [voix, texte] of textes) {
  const p = parseTranscript(texte);
  if (p.unknownTags.length) problemes.push(`${voix}: ${p.unknownTags.join("/")}`);
  if (p.forbiddenSfx.length) interdits.push(`${voix}: ${p.forbiddenSfx.join("/")}`);
  // Le texte doit être majoritairement arabe : c'est la langue de l'aperçu.
  const arabe = (p.text.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabe < 20) pasArabic.push(`${voix} (${arabe} lettres arabes)`);
}
check("AUCUNE balise inconnue dans les 30 textes (rien ne sera lu à voix haute)", problemes.length === 0, problemes.join(" | "));
check("aucun effet sonore interdit dans les 30 textes", interdits.length === 0, interdits.join(" | "));
check("les 30 textes sont bien en arabe/darija", pasArabic.length === 0, pasArabic.join(" | "));

const longueurs = textes.map(([, t]) => t.length);
check("textes courts (aperçu < 15 s)", longueurs.every((l) => l < 400), `max ${Math.max(...longueurs)} caractères`);
check("aucun texte dupliqué entre deux voix", new Set(textes.map(([, t]) => t)).size === 30);

// ===========================================================================
section("4. MANIFESTE — cohérence et invalidation automatique");
// ===========================================================================
const vide = emptyManifest("test");
check("manifeste vide → refusé", validateManifest(vide).ok === false);
check("manifeste null → refusé", validateManifest(null).ok === false);
check("manifeste vide porte l'empreinte du script", vide.scriptHash === AUDITION_SCRIPT_HASH);
check("manifeste vide compte 0 voix", vide.count === 0);

const faux: VoicePreviewManifest = {
  ...vide,
  version: 1,
  count: 30,
  voices: targets.map((t) => ({
    voiceId: t.voice.id, legacyId: t.legacyId, nameFr: t.nameFr, nameAr: t.nameAr,
    file: previewFileName(t.voice.id), durationSeconds: 10, bytes: 480000,
    generatedAt: new Date().toISOString(), model: "gemini-3.8-flash-tts", gender: "unknown" as const,
  })),
};
const vFaux = validateManifest(faux);
check("manifeste complet accepté", vFaux.ok, vFaux.raisons.join(" ; "));
check("aucun avertissement sur un manifeste complet", vFaux.avertissements.length === 0, vFaux.avertissements.join(" ; "));

const perime: VoicePreviewManifest = { ...faux, scriptHash: "000000000000" };
check("manifeste avec script différent → refusé (jamais d'aperçu périmé)", validateManifest(perime).ok === false);

const incomplet: VoicePreviewManifest = { ...faux, voices: faux.voices.slice(0, 25), count: 25 };
const vIncomplet = validateManifest(incomplet);
check("manifeste incomplet accepté mais signalé", vIncomplet.ok && vIncomplet.avertissements.length > 0, vIncomplet.avertissements.join(" ; "));

// ===========================================================================
section("5. VALIDATION À L'OREILLE — 21 genres à confirmer");
// ===========================================================================
const aValider = voicesNeedingGenderValidation(null);
check("plus aucune voix à valider : le genre des 30 est connu", aValider.length === 0, `${aValider.length} restante(s)`);
check("les 9 voix des personas ne sont pas à valider", !VOIX_PERSONAS.some((id) => aValider.includes(id)));
const manifestValide: VoicePreviewManifest = {
  ...faux,
  voices: faux.voices.map((v) => (v.voiceId === "Kore" ? { ...v, gender: "male" as const } : v)),
};
check("une voix validée sort de la liste", !voicesNeedingGenderValidation(manifestValide).includes("Kore"));
check("aucune voix à valider même avec un manifeste partiel", voicesNeedingGenderValidation(manifestValide).length === 0);

// ===========================================================================
section("6. MANIFESTE RÉEL S'IL EXISTE (généré par npm run apercus:voix)");
// ===========================================================================
const chemin = join(process.cwd(), "tts", "preview-manifest.json");
if (existsSync(chemin)) {
  const reel = JSON.parse(readFileSync(chemin, "utf8")) as VoicePreviewManifest;
  const v = validateManifest(reel);
  check("manifeste réel valide", v.ok, v.raisons.join(" ; "));
  check("manifeste réel correspond au script actuel", reel.scriptHash === AUDITION_SCRIPT_HASH);
  check("compteur du manifeste cohérent", reel.count === reel.voices.length, `count=${reel.count}, entrées=${reel.voices.length}`);
  check("FICHIERS WAV réellement présents sur le disque",
    reel.voices.every((x) => existsSync(join(process.cwd(), "storage", "voice-previews", x.file))),
    reel.voices.filter((x) => !existsSync(join(process.cwd(), "storage", "voice-previews", x.file))).map((x) => x.file).join(", "));
} else {
  console.log("  ℹ️  Pas encore de manifeste réel (normal avant la 1re génération).");
  console.log("      → npm run apercus:voix");
}

// ===========================================================================
console.log(`\n${"═".repeat(78)}`);
console.log(`  RÉSULTAT : ${ok} réussis, ${ko} échoués sur ${ok + ko} vérifications`);
if (ko) {
  console.log(`\n  Échecs :`);
  for (const e of echecs) console.log(`     • ${e}`);
}
console.log("═".repeat(78));
process.exit(ko ? 1 : 0);
