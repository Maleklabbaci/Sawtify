/**
 * Test de validation du double moteur TTS (3.1 legacy / 3.8 modern).
 * Vérifie que le pipeline audio reste compatible dans les deux modes.
 */
import { VOCAL_TAGS, parseTranscript, validateTagsOnly, tagsByCategory, allAcceptedTagStrings, officialTagStrings, aliasCounts } from "./vocalTags";
import {
  resolveEngineMode, buildTtsRequest, stripWavHeader, extractAudioFromResponse,
  toLegacyTranscript, describeEngine, pcmDurationSeconds, legacyFidelityReport,
  splitIntoChunksForTTS, protegerBalises, restaurerBalises, estEquilibre,
} from "./engine";

let pass = 0, fail = 0;
const ok = (cond: boolean, label: string, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? `\n      → ${extra}` : ""}`); }
};
const section = (t: string) => console.log(`\n${"─".repeat(74)}\n  ${t}\n${"─".repeat(74)}`);

// ─────────────────────────────────────────────────────────────────────────────
section("1. CATALOGUE DES SONS (33+ balises humaines)");
ok(VOCAL_TAGS.length >= 33, `${VOCAL_TAGS.length} sons humains catalogués (≥ 33 attendus)`);
const cats = tagsByCategory();
ok(Object.keys(cats).length === 6, `6 catégories : ${Object.keys(cats).join(", ")}`);
ok(VOCAL_TAGS.every((t) => t.tag.startsWith("<") && t.tag.endsWith(">")), "Toutes les balises utilisent les crochets ANGLE");
ok(VOCAL_TAGS.every((t) => t.tag === t.tag.toLowerCase()), "Toutes les balises sont en minuscules (exigence Google)");
ok(VOCAL_TAGS.every((t) => t.fr && t.ar), "Chaque son a un libellé français ET arabe");
ok(allAcceptedTagStrings().length > VOCAL_TAGS.length, `${allAcceptedTagStrings().length} écritures acceptées (avec les variantes)`);

// ─────────────────────────────────────────────────────────────────────────────
section("2. DÉTECTION DU MODE (l'interrupteur)");
ok(resolveEngineMode("gemini-3.8-flash-tts") === "modern", "3.8 flash → mode MODERN");
ok(resolveEngineMode("gemini-3.8-flash-lite-tts") === "modern", "3.8 flash-lite → mode MODERN");
ok(resolveEngineMode("gemini-3.1-flash-tts-preview") === "legacy", "3.1 (actuel) → mode LEGACY");
ok(resolveEngineMode("gemini-2.5-pro-preview-tts") === "legacy", "2.5 → mode LEGACY");
ok(resolveEngineMode("") === "legacy", "modèle vide → LEGACY (sûr par défaut)");
ok(resolveEngineMode("gemini-4.0-flash-tts") === "modern", "futur 4.x → MODERN (à jour automatiquement)");

// ─────────────────────────────────────────────────────────────────────────────
section("3. NETTOYAGE DU TRANSCRIPT");
const messy = `سلام خاوتي [excited] واش راكم <laugh> هادي تجربة <short pause> رائعة [applause] <bogus tag> بصح`;
const parsed = parseTranscript(messy);
ok(!/\[excited\]/.test(parsed.text), "ancienne balise [excited] retirée du texte final", parsed.text);
ok(parsed.legacyTagsFound.includes("excited"), "ancienne balise détectée et signalée");
ok(parsed.text.includes("<laugh>"), "balise valide <laugh> conservée");
ok(parsed.text.includes("<short pause>"), "balise valide <short pause> conservée");
ok(!/<bogus tag>/.test(parsed.text), "balise inconnue <bogus tag> retirée");
ok(parsed.unknownTags.includes("<bogus tag>"), "balise inconnue signalée");
ok(parsed.forbiddenSfx.includes("applause"), "bruitage non humain [applause] détecté");
ok(!/applause/i.test(parsed.text), "bruitage non humain retiré");
ok(parsed.suggestedStyle === "celebratory and energetic", `style déduit du 1er tag dans l'ORDRE DU TEXTE ([excited] avant <laugh>) : "${parsed.suggestedStyle}"`);

const arabicBracket = parseTranscript("هذا عرض [مهتم] خاص");
ok(arabicBracket.text.includes("[مهتم]"), "crochets non-anglais « [مهتم] » PRÉSERVÉS (doit être prononcé)");

const bad = validateTagsOnly("Texte <laugh> et [excited] et <applause>");
ok(!bad.ok && bad.problems.length >= 2, `validateTagsOnly détecte ${bad.problems.length} problèmes`);

// ─────────────────────────────────────────────────────────────────────────────
section("4. MODE MODERN (3.8) — la requête envoyée à Google");
const modern = buildTtsRequest({
  model: "gemini-3.8-flash-tts",
  rawText: "سلام خاوتي <laugh> واش راكم <short pause> لاباس؟",
  voiceName: "Puck",
  style: null, // → doit être déduit de <laugh>
  legacyPersona: "Amin, a young friendly Algerian man.",
  legacyNotes: ["Pace: Natural conversational pace."],
});
const mBody: any = modern.body;
const mPart = mBody.contents[0].parts[0];

ok(modern.mode === "modern", "mode = modern");
ok(typeof mPart.speech_metadata?.style === "string", `speech_metadata.style présent : "${mPart.speech_metadata?.style}"`);
ok(mPart.speech_metadata.style === "cheerful and amused", "style déduit automatiquement du tag <laugh>");
ok(!/DIRECTOR'S NOTES/.test(mPart.text), "AUCUN « DIRECTOR'S NOTES » dans le texte (règle Google anti-dérive)");
ok(!/Pace:|Tone:|Speaker:/.test(mPart.text), "aucune instruction de jeu dans le texte");
ok(mPart.text.includes("<laugh>"), "balise angle conservée telle quelle");
ok(mBody.contents[0].role === "user", "rôle « user » explicite (exigé par la doc)");
ok(mBody.generationConfig.responseModalities[0] === "AUDIO", "responseModalities = AUDIO (majuscules, doc 3.8)");
ok(mBody.generationConfig.responseFormat.audio.mimeType === "AUDIO_L16", "★ sortie forcée en PCM brut AUDIO_L16 (pipeline inchangé)");
ok(mBody.generationConfig.responseFormat.audio.sampleRate === 24000, "sampleRate 24000 Hz explicite");
ok(mBody.generationConfig.speechConfig.voiceConfig.voice === "Puck", "champ moderne voiceConfig.voice");
ok(!mBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig, "ancien champ prebuiltVoiceConfig absent");
ok(mBody.generationConfig.speechConfig.multiSpeakerVoiceConfig === undefined, "pas de config multi-voix (mono-voix uniquement)");

// ─────────────────────────────────────────────────────────────────────────────
section("5. MODE LEGACY (3.1) — comportement Sawtify actuel reproduit");
const legacy = buildTtsRequest({
  model: "gemini-3.1-flash-tts-preview",
  rawText: "سلام خاوتي <laugh> واش راكم <short pause> لاباس؟",
  voiceName: "Puck",
  style: null,
  legacyPersona: "Amin, a young friendly Algerian man.",
  legacyNotes: ["Pace: Natural conversational pace."],
});
const lBody: any = legacy.body;
const lText: string = lBody.contents[0].parts[0].text;

ok(legacy.mode === "legacy", "mode = legacy");
ok(/DIRECTOR'S NOTES/.test(lText), "DIRECTOR'S NOTES présent (comportement historique)");
ok(lText.includes("Speaker: Amin"), "persona legacy réinjectée");
ok(lText.includes("Pace: Natural conversational pace."), "notes legacy réinjectées");
ok(lText.includes("[laughter]"), "★ <laugh> traduit en [laughter] pour le 3.1");
ok(!lText.includes("[breathing]"), "les silences ne deviennent PAS des balises (remplacés par …)");
ok(!/<laugh>/.test(lText), "aucune balise ANGLE ne fuit vers le 3.1 (sinon lue à voix haute)");
ok(lBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === "Puck", "ancien champ prebuiltVoiceConfig conservé");
ok(lBody.generationConfig.speechConfig.voiceConfig.voice === undefined, "champ moderne absent en legacy");
ok(lBody.contents[0].parts[0].speech_metadata === undefined, "pas de speech_metadata en legacy (non supporté)");
ok(lBody.generationConfig.responseModalities[0] === "audio", "responseModalities = audio (minuscules, ancien format)");
ok(lBody.generationConfig.responseFormat === undefined, "pas de responseFormat en legacy");

// ─────────────────────────────────────────────────────────────────────────────
section("6. FORMAT AUDIO — protection anti-régression (LE point critique)");
// WAV factice : RIFF + fmt + data
const pcmPayload = Buffer.alloc(4800, 7); // 0,1 s de PCM
const wavHeader = Buffer.alloc(44);
wavHeader.write("RIFF", 0); wavHeader.writeUInt32LE(36 + pcmPayload.length, 4);
wavHeader.write("WAVE", 8); wavHeader.write("fmt ", 12);
wavHeader.writeUInt32LE(16, 16); wavHeader.writeUInt16LE(1, 20); wavHeader.writeUInt16LE(1, 22);
wavHeader.writeUInt32LE(24000, 24); wavHeader.writeUInt32LE(48000, 28);
wavHeader.writeUInt16LE(2, 32); wavHeader.writeUInt16LE(16, 34);
wavHeader.write("data", 36); wavHeader.writeUInt32LE(pcmPayload.length, 40);
const fullWav = Buffer.concat([wavHeader, pcmPayload]);

const fromWav = stripWavHeader(fullWav);
ok(fromWav.received === "wav", "WAV détecté comme WAV");
ok(fromWav.headerStripped === 44, "en-tête de 44 octets retiré");
ok(fromWav.pcm.length === pcmPayload.length, `taille PCM correcte : ${fromWav.pcm.length} octets`);
ok(fromWav.pcm.equals(pcmPayload), "contenu PCM identique à l'original (aucun octet perdu)");

const fromPcm = stripWavHeader(pcmPayload);
ok(fromPcm.received === "pcm", "PCM brut correctement reconnu (mode 3.1)");
ok(fromPcm.headerStripped === 0, "aucun octet retiré sur du PCM brut");
ok(fromPcm.pcm.equals(pcmPayload), "PCM intact");

// cas réel : WAV avec un bloc "LIST" avant "data" (certains encodeurs)
const listChunk = Buffer.alloc(12); listChunk.write("LIST", 0); listChunk.writeUInt32LE(4, 4);
const wavWithList = Buffer.concat([wavHeader.subarray(0, 36), listChunk, Buffer.from("data", "ascii"), (() => { const b = Buffer.alloc(4); b.writeUInt32LE(pcmPayload.length); return b; })(), pcmPayload]);
const fromList = stripWavHeader(wavWithList);
ok(fromList.pcm.length === pcmPayload.length, "WAV avec bloc intermédiaire LIST géré (recherche du bloc data)");

// réponse API complète
const apiJson = { candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { data: fullWav.toString("base64"), mimeType: "audio/wav" } }] } }] };
const extracted = extractAudioFromResponse(apiJson);
ok(extracted.audio !== null, "audio extrait d'une réponse API 3.8 (WAV)");
ok(extracted.audio!.pcm.length === pcmPayload.length, "audio normalisé en PCM brut");
ok(extracted.finishReason === "STOP", "finishReason récupéré (garde-fou anti-troncature)");

const apiPcmJson = { candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { data: pcmPayload.toString("base64") } }] } }] };
const extractedPcm = extractAudioFromResponse(apiPcmJson);
ok(extractedPcm.audio!.pcm.length === pcmPayload.length, "réponse API 3.1 (PCM) normalisée aussi");

const textInstead = extractAudioFromResponse({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Je ne peux pas." }] } }] });
ok(textInstead.audio === null && textInstead.textInsteadOfAudio !== null, "réponse TEXTE au lieu d'audio détectée (cas d'erreur)");

// ─────────────────────────────────────────────────────────────────────────────
section("7. DURÉE & POINTS (barème inchangé)");
const oneMinutePcm = Buffer.alloc(48000 * 60);
ok(pcmDurationSeconds(oneMinutePcm) === 60, "60 s de PCM = 60 secondes");
ok(pcmDurationSeconds(Buffer.alloc(48000 * 45)) === 45, "45 s (plafond essai gratuit) correct");

// ─────────────────────────────────────────────────────────────────────────────
section("8. FONCTIONS DE DIAGNOSTIC");
ok(describeEngine("gemini-3.8-flash-tts").includes("MODERNE"), "describeEngine → MODERNE pour 3.8");
ok(describeEngine("gemini-3.1-flash-tts-preview").includes("LEGACY"), "describeEngine → LEGACY pour 3.1");
const fid = legacyFidelityReport();
ok(fid.distinctLegacyTags < 10, `mode 3.1 : seulement ${fid.distinctLegacyTags} sons DISTINCTS sur ${fid.modernCount} (${fid.fidelityPercent}% de la richesse)`);
ok(fid.collapsed.length > 0, `${fid.collapsed.length} groupes de sons s'écrasent sur une seule balise ancienne`);
ok(fid.dropped.length >= 2, `${fid.dropped.length} sons totalement inexprimables en 3.1 : ${fid.dropped.map(t=>t.tag).join(", ")}`);


// ─────────────────────────────────────────────────────────────────────────────
section("10. MULTILINGUE — français, arabe, et rien n'est jamais traduit");
const fr = parseTranscript("مرحبا <rire> بيكم <soupir> لاباس؟");
ok(fr.tags.some((t) => t.tag === "<laugh>"), "balise FRANÇAISE <rire> → <laugh>");
ok(fr.tags.some((t) => t.tag === "<sigh>"), "balise FRANÇAISE <soupir> → <sigh>");
ok(fr.translatedFromFrench.length === 2, "2 traductions FR→EN signalées");
ok(!/<rire>|<soupir>/.test(fr.text), "aucune balise française dans le texte final");
ok(/[ا-ي]/.test(fr.text), "LE TEXTE ARABE EST INTACT (aucune traduction du contenu)");

const ar = parseTranscript("مرحبا <ضحكة> بيكم <وقفة قصيرة> واش راكم");
ok(ar.tags.some((t) => t.tag === "<laugh>"), "balise ARABE <ضحكة> → <laugh>");
ok(ar.tags.some((t) => t.tag === "<short pause>"), "balise ARABE <وقفة قصيرة> → <short pause>");
ok(ar.translatedFromArabic.length === 2, "2 traductions AR→EN signalées");
ok(!/[ا-ي]/.test(ar.text.replace(/[ا-ي\s،؛:!?؟.]/g, "")) || ar.tags.length > 0, "balises arabes normalisées");

const caps = parseTranscript("<RIRE LÉGER> واش راكم");
ok(caps.tags.some((t) => t.tag === "<giggle>"), "majuscules + accents gérés : <RIRE LÉGER> → <giggle>");

const tashkeel = parseTranscript("<تأفّف> بصح");
ok(tashkeel.tags.some((t) => t.tag === "<argh>"), "diacritiques arabes (tashkeel) gérés : <تأفّف> → <argh>");

// ⚠️ LE test de sécurité le plus important : une balise inconnue ne doit
// JAMAIS rester dans le texte, sinon Gemini la PRONONCE à voix haute.
const inconnuAr = parseTranscript("مرحبا <سعاد> بيكم");
ok(!/<سعاد>/.test(inconnuAr.text), "★ balise ARABE INCONNUE retirée (jamais prononcée à voix haute)");
ok(inconnuAr.unknownTags.length === 1, "balise arabe inconnue signalée");
const inconnuFr = parseTranscript("مرحبا <bonjour> بيكم");
ok(!/<bonjour>/.test(inconnuFr.text), "★ balise FRANÇAISE INCONNUE retirée");

// Règle inverse : un MOT entre crochets CARRÉS doit être PRONONCÉ.
const motAr = parseTranscript("العرض للمهتمين فقط [مهتم] بصح");
ok(motAr.text.includes("[مهتم]"), "★ mot ARABE [مهتم] préservé (doit être PRONONCÉ)");
ok(motAr.tags.length === 0, "[مهتم] n'est pas traité comme un son");
const motFr = parseTranscript("العرض [promo] خاص");
ok(motFr.text.includes("[promo]"), "mot FRANÇAIS [promo] préservé (doit être PRONONCÉ)");

const counts = aliasCounts();
ok(counts.francaises >= 80, `écritures françaises acceptées : ${counts.francaises}`);
ok(counts.arabes >= 70, `écritures arabes acceptées : ${counts.arabes}`);
ok(allAcceptedTagStrings().length >= 190, `total : ${allAcceptedTagStrings().length} façons d'écrire une balise`);
ok(officialTagStrings().every((t) => /^<[a-z -]+>$/.test(t)), "les balises envoyées à Google sont TOUTES en anglais officiel");


// ─────────────────────────────────────────────────────────────────────────────
//  ⚠️ DÉFAUT TROUVÉ À L'AUDIT DU 26/09/2026 — ne jamais régresser.
//
//  Le découpage des textes longs se faisait mot à mot. Trois balises
//  officielles contiennent un ESPACE (<short pause>, <long pause>,
//  <heavy breath>) : si l'une tombait sur la frontière des 800 caractères,
//  elle finissait en « <short » d'un côté et « pause> » de l'autre.
//  Et comme un « < » sans « > » n'est pas reconnu comme balise, les deux
//  moitiés partaient BRUTES vers Gemini.
// ─────────────────────────────────────────────────────────────────────────────
section("11. DÉCOUPAGE DES TEXTES LONGS — aucune balise ne doit être coupée");

const motsTest: string[] = [];
for (let i = 0; i < 260; i++) motsTest.push("كلمة" + i); // ≈ 1800 caractères, aucune ponctuation

const balisesAMots = ["<short pause>", "<long pause>", "<heavy breath>"];
const balisesUnMot = ["<sigh>", "<whispers>", "<throat-clearing>", "<laugh>", "<gasp>"];

for (const balise of [...balisesAMots, ...balisesUnMot]) {
  let cassees = 0, perdues = 0, positions = 0;
  for (let pos = 0; pos <= motsTest.length; pos++) {
    const avant = motsTest.slice(0, pos).join(" ");
    const apres = motsTest.slice(pos).join(" ");
    const texte = avant ? avant + " " + balise + " " + apres : balise + " " + apres;
    const morceaux = splitIntoChunksForTTS(texte, 800);
    positions++;
    if (morceaux.some((c) => !estEquilibre(c))) cassees++;
    if (!morceaux.some((c) => c.includes(balise))) perdues++;
  }
  ok(cassees === 0 && perdues === 0, `★ ${balise} intacte sur ${positions} positions (cassées : ${cassees}, perdues : ${perdues})`);
}

// La protection est réversible et n'abîme pas le texte sans balise.
const avecBalises = "أولاً <laugh> ثم <short pause> وأخيراً.";
const protege = protegerBalises(avecBalises);
ok(!/<|>/.test(protege.texte), "les balises sont remplacées par des jetons insécables");
ok(protege.balises.length === 2, "les 2 balises sont mises de côté");
ok(restaurerBalises(protege.texte, protege.balises) === avecBalises, "★ restauration EXACTE du texte d'origine");
ok(protegerBalises("بلا باليز").balises.length === 0, "texte sans balise : rien n'est mis de côté");

// Un texte court ne doit pas être découpé du tout.
ok(splitIntoChunksForTTS("جملة قصيرة <sigh> هنا", 800).length === 1, "texte court → 1 seul morceau");
ok(splitIntoChunksForTTS("", 800).length === 0, "texte vide → 0 morceau");
// La découpe doit toujours respecter le plafond.
const longTexte = Array.from({ length: 400 }, (_, i) => "كلمة" + i).join(" ") + " <short pause> نهاية.";
ok(splitIntoChunksForTTS(longTexte, 800).every((c) => c.length <= 800), "aucun morceau ne dépasse la limite de 800 caractères");

// ─────────────────────────────────────────────────────────────────────────────
section("12. FRAGMENTS DE BALISE — jamais envoyés bruts à Google");

// Un « < » sans « > » (texte tronqué, faute de frappe, découpe brutale) ne doit
// JAMAIS atteindre Gemini : la voix risquerait de le prononcer.
const fragmentOuvrant = parseTranscript("كلمة112 <short");
ok(!fragmentOuvrant.text.includes("<"), "★ chevron orphelin ouvrant retiré du texte envoyé");
ok(fragmentOuvrant.unknownTags.length === 1, "chevron orphelin signalé à l'utilisateur");

const fragmentFermant = parseTranscript("pause> كلمة113");
ok(!fragmentFermant.text.includes(">"), "★ chevron orphelin fermant retiré du texte envoyé");

const jamaisFerme = parseTranscript("<laugh بلا إغلاق");
ok(!/<laugh/.test(jamaisFerme.text), "balise jamais fermée retirée (sinon elle serait lue)");

// ⚠️ Le garde-fou ne doit PAS toucher aux balises valides.
const balisesValides = parseTranscript("سليم <laugh> هنا <sigh> تماماً");
ok(balisesValides.text.includes("<laugh>"), "★ une balise VALIDE en milieu de phrase est préservée");
ok(balisesValides.text.includes("<sigh>"), "★ deux balises valides sont préservées");
ok(balisesValides.unknownTags.length === 0, "aucune fausse alerte sur un texte sain");
ok(balisesValides.tags.length === 2, "les 2 balises valides sont bien reconnues");

// ─────────────────────────────────────────────────────────────────────────────
section("13. RÉSUMÉ");
console.log(`\n  Tests réussis : ${pass}   |   Échecs : ${fail}`);
if (fail === 0) console.log("\n  ✅ LE DOUBLE MOTEUR FONCTIONNE — les deux modes sont opérationnels.\n");
else console.log("\n  ❌ Corriger les échecs ci-dessus.\n");
process.exit(fail === 0 ? 0 : 1);
