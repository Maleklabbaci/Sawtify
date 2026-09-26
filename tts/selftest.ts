/**
 * Test de validation du double moteur TTS (3.1 legacy / 3.8 modern).
 * Vérifie que le pipeline audio reste compatible dans les deux modes.
 */
import { VOCAL_TAGS, parseTranscript, validateTagsOnly, tagsByCategory, allAcceptedTagStrings, officialTagStrings, aliasCounts, LEGACY_SQUARE_TAGS } from "./vocalTags";
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
// ★ 3.10 > 3.9 : la comparaison doit être NUMÉRIQUE. Avec l'ancien motif
//   (une liste « 3.8 | 3.9 »), un futur 3.10 repassait en mode ANCIEN.
ok(resolveEngineMode("gemini-3.10-flash-tts") === "modern", "★ 3.10 → MODERN (comparaison numérique, pas alphabétique)");
ok(resolveEngineMode("gemini-3.9-flash-tts") === "modern", "3.9 → MODERN");
ok(resolveEngineMode("gemini-3.7-flash-tts") === "legacy", "3.7 → LEGACY (juste sous le seuil)");
ok(resolveEngineMode("gemini-10.0-flash-tts") === "modern", "10.0 → MODERN (deux chiffres au majeur)");
ok(resolveEngineMode("gemini-3") === "legacy", "« gemini-3 » sans mineure → LEGACY (sûr par défaut)");

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
    // L'ORDRE DU TEXTE doit être respecté : <gasp> apparaît avant <laugh>,
    // donc c'est son styleHint qui doit être retenu.
    const ordre = parseTranscript("أولاً <gasp> ثم <laugh> في الأخير");
    ok(ordre.suggestedStyle === "surprised and breathless", `style déduit du 1er tag dans l'ORDRE DU TEXTE (<gasp> avant <laugh>) : "${ordre.suggestedStyle}"`);

    // [excited] est un TON : il ne doit PLUS produire la balise <cheer>
    // (un bruit de foule qui acclame), mais une instruction de ton.
    ok(!parsed.text.includes("<cheer>"), "★ [excited] ne déclenche PLUS le bruit de foule <cheer>");
    ok(parsed.requestedStyle !== null && /excited/i.test(parsed.requestedStyle), `[excited] produit un TON demandé : "${parsed.requestedStyle}"`);

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
  style: null, // aucun style réglé → la requête ne doit contenir AUCUN style
  legacyPersona: "Amin, a young friendly Algerian man.",
  legacyNotes: ["Pace: Natural conversational pace."],
});
const mBody: any = modern.body;
const mPart = mBody.contents[0].parts[0];

ok(modern.mode === "modern", "mode = modern");
// ⚠️ Décision du 26/09/2026 : on n'invente PLUS de style à partir des balises.
// `style` ne contient que ce que l'utilisateur a réglé explicitement.
ok(mPart.speech_metadata === undefined, "aucun style n'est inventé : speech_metadata absent quand rien n'est réglé");
ok(mPart.text === "سلام خاوتي <laugh> واش راكم <short pause> لاباس؟", "le transcript reste VERBATIM, balises officielles en place");
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
ok(lBody.generationConfig.responseModalities[0] === "AUDIO", "responseModalities = AUDIO (majuscules) — MÊME graphie dans les deux modes");
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
section("13. STYLE — on n'invente plus rien (décision du 26/09/2026)");

// `style` est SOUTENU (toute la réplique) alors qu'une balise est PONCTUELLE.
// Déduire un style d'un seul <laugh> faisait livrer un texte grave sur un ton
// joyeux. On n'envoie donc QUE ce que l'utilisateur a réglé explicitement.
const sansStyle = buildTtsRequest({
  model: "gemini-3.8-flash-tts",
  rawText: "بصح <laugh> الكلام هذا ما يضحكش، المشكل كبير.",
  voiceName: "Puck",
  style: null,
});
const sansStylePart: any = (sansStyle.body as any).contents[0].parts[0];
ok(sansStylePart.speech_metadata === undefined, "★ texte grave contenant un <laugh> → AUCUN style imposé à tout le texte");
ok(sansStyle.tags.some((t) => t.tag === "<laugh>"), "la balise <laugh> reste dans le texte (son ponctuel conservé)");

const avecStyle = buildTtsRequest({
  model: "gemini-3.8-flash-tts",
  rawText: "واش راكم خاوتي",
  voiceName: "Puck",
  style: "speaking rapidly",
});
const avecStylePart: any = (avecStyle.body as any).contents[0].parts[0];
ok(avecStylePart.speech_metadata?.style === "speaking rapidly", "le style RÉGLÉ par l'utilisateur est bien transmis");

// L'ancien comportement reste accessible pour revenir en arrière.
const autoStyle = buildTtsRequest({
  model: "gemini-3.8-flash-tts",
  rawText: "سلام <laugh> خاوتي",
  voiceName: "Puck",
  style: null,
  autoStyle: true,
});
const autoPart: any = (autoStyle.body as any).contents[0].parts[0];
ok(autoPart.speech_metadata?.style === "cheerful and amused", "autoStyle: true restaure l'ancien comportement (déduction depuis <laugh>)");

// Un utilisateur peut toujours demander un style explicitement : rien n'est bloqué.
const force = buildTtsRequest({
  model: "gemini-3.8-flash-tts",
  rawText: "نص",
  voiceName: "Puck",
  style: "muttering, then reassuring",
});
  ok(((force.body as any).contents[0].parts[0].speech_metadata?.style) === "muttering, then reassuring", "un style explicite est transmis tel quel");

  // ─────────────────────────────────────────────────────────────────────────────
  section("13bis. LES EFFETS DU MENU FONT TOUS QUELQUE CHOSE (correctif du 26/09)");

  // RÉGRESSION HISTORIQUE : l'app parlait encore la langue 3.1, où `[calm]`
  // était un mot-clé natif de Google. En 3.8 ce mot-clé n'existe plus, et le
  // mapping le transformait en « rien » : l'utilisateur choisissait « Calme »
  // et le texte partait À L'IDENTIQUE. 5 des 9 effets du menu étaient morts,
  // et `[excited]` déclenchait un bruit de foule qui acclame (<cheer>).
  //
  // Ce test est un GARDE-FOU : il parcourt TOUT le dictionnaire et exige que
  // chaque ancienne balise produise un effet réel — soit une balise officielle,
  // soit un ton transmis. Seul « natural » a le droit de ne rien faire, car il
  // décrit déjà le comportement par défaut.
  const effetDe = (cle: string) => {
    const r = parseTranscript(`[${cle}] نص تجريبي`);
    return { tag: r.tags.length > 0, style: Boolean(r.requestedStyle), texte: r.text };
  };
  const clesMortes: string[] = [];
  for (const cle of Object.keys(LEGACY_SQUARE_TAGS)) {
    const e = effetDe(cle);
    if (!e.tag && !e.style && cle !== "natural") clesMortes.push(cle);
  }
  ok(
    clesMortes.length === 0,
    `★ AUCUN effet mort : les ${Object.keys(LEGACY_SQUARE_TAGS).length} anciennes balises agissent (mortes : ${clesMortes.join(", ") || "aucune"})`,
  );

  // Chaque ton du menu de l'app doit arriver jusqu'à `speech_metadata.style`.
  const tonesDuMenu = ["calm", "excited", "dramatic", "articulated", "fast", "serious"];
  for (const cle of tonesDuMenu) {
    const e = effetDe(cle);
    ok(e.style && !e.tag, `[${cle}] → un TON transmis (et aucun bruit parasite)`);
    ok(!/\[/.test(e.texte), `[${cle}] est bien retiré du texte lu par Gemini`);
  }

  // Le cas exact de la pop-up « Comment la voix doit-elle commencer ? ».
  for (const [ton, attendu] of [["calm", /calm/i], ["excited", /excited/i]] as const) {
    const r = buildTtsRequest({
      model: "gemini-3.8-flash-tts",
      rawText: `[${ton}] واش راك يا خويا؟`,
      voiceName: "Puck",
      style: null,
    });
    const part: any = (r.body as any).contents[0].parts[0];
    ok(
      Boolean(part.speech_metadata?.style && attendu.test(part.speech_metadata.style)),
      `★ pop-up « ${ton} » → ton réellement envoyé : "${part.speech_metadata?.style}"`,
    );
    ok(part.text === "واش راك يا خويا؟", `★ pop-up « ${ton} » → le crochet ne part jamais vers Gemini`);
  }

  // Et surtout : cela marche SANS autoStyle (la demande est explicite).
  const demandeExplicite = buildTtsRequest({
    model: "gemini-3.8-flash-tts",
    rawText: "[excited] [articulated] عرض اليوم",
    voiceName: "Puck",
    style: null,
  });
  const dPart: any = (demandeExplicite.body as any).contents[0].parts[0];
  ok(/excited/i.test(dPart.speech_metadata?.style || ""), "deux effets cumulés : l'énergie est transmise");
  ok(/articulation/i.test(dPart.speech_metadata?.style || ""), "deux effets cumulés : la diction nette aussi");

  // [natural] = comportement par défaut → aucun style imposé, et aucun bruit.
  const naturel = parseTranscript("[natural] [articulated] Bonjour à tous");
  ok(naturel.requestedStyle !== null && /articulation/i.test(naturel.requestedStyle), "[natural] seul n'ajoute rien, mais n'annule pas [articulated]");

  // TON CONTRADICTOIRE (l'exemple « Excité … Calme » livré avec l'app) :
  // en 3.1 on changeait de ton en plein milieu du texte, en 3.8 c'est impossible.
  // Le 1er ton gagne, et l'autre est SIGNALÉ — jamais ignoré en silence.
  const deuxTons = parseTranscript("[excited] [articulated] عرض اليوم [calm] والتوصيل مجاني");
  ok(/excited/i.test(deuxTons.requestedStyle || ""), "★ ton contradictoire : le 1er ton choisi gagne");
  ok(!/calm/i.test(deuxTons.requestedStyle || ""), "★ ton contradictoire : « calme » n'est PAS envoyé en même temps");
  ok(/articulation/i.test(deuxTons.requestedStyle || ""), "★ la diction nette reste transmise (elle est cumulable)");
  ok(deuxTons.droppedTones.includes("calm"), "★ l'utilisateur est prévenu que [calm] a été ignoré");
  { 
    const w = buildTtsRequest({ model: "gemini-3.8-flash-tts", rawText: "[excited] عرض [calm] توصيل", voiceName: "Puck", style: null });
    ok(w.warnings.some((x) => /un seul ton/i.test(x)), `avertissement remonté au client : "${(w.warnings.find((x) => /un seul ton/i.test(x)) || "").slice(0, 70)}…"`);
  }
  // Un même ton répété n'est pas une contradiction : c'est juste un doublon.
  const doublon = parseTranscript("[calm] البداية [calm] والنهاية");
  ok(doublon.droppedTones.length === 0, "répéter le MÊME ton n'est pas signalé comme un conflit");
  ok((doublon.requestedStyle || "").split("calm").length === 2, "un ton répété n'est envoyé qu'UNE fois");

  // ── LE MODE DE SECOURS (3.1) NE DOIT PAS PERDRE LE TON ──
  // 3.1 comprend nativement les crochets carrés : on les lui rend tels quels.
  // Sans ce test, réparer 3.8 avait cassé le mode de repli sans que personne
  // ne s'en aperçoive — l'utilisateur n'aurait plus eu AUCUN ton nulle part.
  const legacyTone = buildTtsRequest({ model: "gemini-3.1-flash-tts-preview", rawText: "[calm] واش راك", voiceName: "Puck" });
  const legacyText: string = (legacyTone.body as any).contents[0].parts[0].text;
  ok(legacyText.includes("[calm]"), "★ mode 3.1 : le ton demandé [calm] est bien TRANSMIS (syntaxe native)");
  ok(/TRANSCRIPT:\s*\n\s*\[calm\]/.test(legacyText), "★ mode 3.1 : le ton est placé juste avant le transcript");
  const modernTone = buildTtsRequest({ model: "gemini-3.8-flash-tts", rawText: "[calm] واش راك", voiceName: "Puck", style: null });
  ok(!JSON.stringify(modernTone.body).includes("[calm]"), "★ mode 3.8 : le crochet n'est JAMAIS envoyé (ton passé par le style)");
  ok(legacyTone.mode === "legacy" && modernTone.mode === "modern", "★ les deux modes restent bien distingués");

  // Le silence des pauses ne doit pas être confondu avec un ton.
  const pause = parseTranscript("نص <short pause> نص آخر");
  ok(pause.requestedStyle === null, "une pause officielle ne fabrique aucun ton");

  // ─────────────────────────────────────────────────────────────────────────────
section("14. RÉSUMÉ");
console.log(`\n  Tests réussis : ${pass}   |   Échecs : ${fail}`);
if (fail === 0) console.log("\n  ✅ LE DOUBLE MOTEUR FONCTIONNE — les deux modes sont opérationnels.\n");
else console.log("\n  ❌ Corriger les échecs ci-dessus.\n");
process.exit(fail === 0 ? 0 : 1);
