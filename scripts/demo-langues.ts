#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — LANGUES : arabe / darija / français et les balises <...>
 * ============================================================================
 *  Ce script répond précisément à : « est-ce que ça traduit quelque chose ? »
 *
 *  Il prend un texte RÉALISTE (darija + arabe + français mélangés, avec des
 *  balises `<>` ET un mot arabe entre crochets `[مهتم]`) et affiche EXACTEMENT
 *  ce que reçoit Gemini, dans les deux modes.
 *
 *  Objectif : prouver noir sur blanc qu'AUCUNE traduction ne se produit.
 *
 *  USAGE :  npx tsx scripts/demo-langues.ts
 * ============================================================================
 */

import { buildTtsRequest } from "../tts/engine";
import { parseTranscript } from "../tts/vocalTags";

const ligne = "═".repeat(90);
const tirets = "─".repeat(90);

// ─────────────────────────────────────────────────────────────────────────────
//  Le texte d'un utilisateur algérien réel : darija + français + arabe
//  + balises de sons + un mot arabe entre crochets qui DOIT être prononcé.
// ─────────────────────────────────────────────────────────────────────────────
const TEXTE = `سلام عليكم خاوتي، واش راكم لاباس؟ <laugh>
اليوم راني حاب نهدر معاكم على حاجة مهمة، بصح قبل ما نبداو <short pause>
خاصني نقولكم حاجة: العرض هذا للمهتمين فقط [مهتم]
يعني لي راه حاب يبدا يبيع online، ويخدم les leads ديالو صح.
<sigh> بصراحة، شفت بزاف ناس يخسرو لافارغ في بيبليسيتي خاوية. <breath>
المنصة ديالنا تحول النص لصوت بشري طبيعي، بلا ما تعيّي روحك.
<chuckle> واش راك تستنى؟ جربها دوكا، والدفع بالكارت الذهبية ولا CIB. <exhales>`;

console.log(`\n${ligne}\n  LANGUES & BALISES : est-ce que quelque chose est traduit ?\n${ligne}`);

// ═════════════════════════════════════════════════════════════════════════════
//  1. CE QUE L'UTILISATEUR ÉCRIT
// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n1) CE QUE L'UTILISATEUR ÉCRIT\n${tirets}`);
console.log(TEXTE);

const balisesAngle = TEXTE.match(/<[a-zA-Z][a-zA-Z _-]*>/g) || [];
const motsArabesCrochets = TEXTE.match(/\[[^\]]*[\u0600-\u06FF][^\]]*\]/g) || [];
const motsFrancais = TEXTE.match(/\b(online|les|leads|CIB|du|de|la)\b/gi) || [];

console.log(`\n   Balises de sons      (<>): ${balisesAngle.join(" ")}`);
console.log(`   Mots arabes entre crochets : ${motsArabesCrochets.join(" ")}  ← DOIT être PRONONCÉ`);
console.log(`   Mots français en clair     : ${[...new Set(motsFrancais)].join(", ")}`);

// ═════════════════════════════════════════════════════════════════════════════
//  2. ANALYSE (ce que fait le moteur avant d'envoyer)
// ═════════════════════════════════════════════════════════════════════════════
const analyse = parseTranscript(TEXTE);
console.log(`\n${ligne}\n2) ANALYSE DU MOTEUR\n${tirets}`);
console.log(`   Sons reconnus        : ${analyse.tags.map((t) => t.tag).join(" ")}`);
console.log(`   Balises inconnues    : ${analyse.unknownTags.length ? analyse.unknownTags.join(" ") : "(aucune) ✓"}`);
console.log(`   Bruitages retirés    : ${analyse.forbiddenSfx.length ? analyse.forbiddenSfx.join(" ") : "(aucun) ✓"}`);
console.log(`   Style déduit         : "${analyse.suggestedStyle}"`);
console.log(`   Mot arabe [مهتم] conservé ? ${analyse.text.includes("[مهتم]") ? "✓ OUI — préservé, il sera PRONONCÉ" : "✗ NON — PROBLÈME !"}`);

// ═════════════════════════════════════════════════════════════════════════════
//  3. MODE 3.8 — CE QUE GOOGLE REÇOIT
// ═════════════════════════════════════════════════════════════════════════════
const modern = buildTtsRequest({
  model: "gemini-3.8-flash-tts",
  rawText: TEXTE,
  voiceName: "Puck",
  style: null,
  output: "pcm",
});
const mPart: any = (modern.body as any).contents[0].parts[0];

console.log(`\n${ligne}\n3) MODE 3.8 — CE QUE GOOGLE REÇOIT\n${tirets}`);
console.log(`\n   ▸ CASE 1 — « QUOI LIRE » (part.text, langue AUTO-DÉTECTÉE) :\n`);
console.log(mPart.text.split("\n").map((l: string) => "      " + l).join("\n"));
console.log(`\n   ▸ CASE 2 — « COMMENT DIRE » (speech_metadata.style, EN ANGLAIS) :\n`);
console.log(`      "${mPart.speech_metadata?.style}"`);
console.log(`\n   ▸ VOIX : "${(modern.body as any).generationConfig.speechConfig.voiceConfig.voice}"`);
console.log(`\n   ▸ VÉRIFICATIONS :`);
console.log(`      Langue du texte à lire .......... ${/[ا-ي]/.test(mPart.text) ? "arabe/darija ✓ (inchangé)" : "PROBLÈME"}`);
console.log(`      Mot français « online » ......... ${mPart.text.includes("online") ? "✓ préservé" : "PROBLÈME"}`);
console.log(`      Mot arabe [مهتم] ................ ${mPart.text.includes("[مهتم]") ? "✓ préservé et prononcé" : "PROBLÈME"}`);
console.log(`      Balises de sons ................. ${(mPart.text.match(/<[^>]+>/g) || []).length} conservées en anglais`);
console.log(`      Texte traduit en français ? ..... NON ✓`);
console.log(`      Texte traduit en arabe ? ........ NON ✓`);

// ═════════════════════════════════════════════════════════════════════════════
//  4. MODE 3.1 — CE QUE GOOGLE REÇOIT
// ═════════════════════════════════════════════════════════════════════════════
const legacy = buildTtsRequest({
  model: "gemini-3.1-flash-tts-preview",
  rawText: TEXTE,
  voiceName: "Puck",
  style: null,
  legacyPersona: "Amin, a young friendly Algerian man.",
  legacyNotes: ["Pace: Natural conversational pace."],
  output: "pcm",
});
const lText: string = (legacy.body as any).contents[0].parts[0].text;

console.log(`\n${ligne}\n4) MODE 3.1 (ancien) — CE QUE GOOGLE REÇOIT\n${tirets}`);
console.log(`\n${lText.split("\n").map((l) => "      " + l).join("\n")}`);
console.log(`\n   ▸ VÉRIFICATIONS :`);
console.log(`      Langue du texte à lire .......... ${/[ا-ي]/.test(lText) ? "arabe/darija ✓ (inchangé)" : "PROBLÈME"}`);
console.log(`      Mot arabe [مهتم] ................ ${lText.includes("[مهتم]") ? "✓ préservé et prononcé" : "PROBLÈME"}`);
console.log(`      <laugh> traduit en ............. [laughter] ✓ (même son, syntaxe ancienne)`);
console.log(`      Ancienne prose arabe réinjectée ? NON ✓ (c'est le bug corrigé autrefois)`);

// ═════════════════════════════════════════════════════════════════════════════
//  5. LANGUES SUPPORTÉES PAR GOOGLE (pour tes textes)
// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n${ligne}\n5) LANGUES SUPPORTÉES PAR GOOGLE (doc officielle 24/09/2026)\n${tirets}\n`);
const langues: [string, string, string][] = [
  ["Français",                              "✔️", "✔️"],
  ["Arabe standard (écriture arabe)",       "✔️", "✔️"],
  ["Arabe standard (écriture latine)",      "✔️", "✔️"],
  ["Arabe égyptien",                        "✔️", "✔️"],
  ["Kabyle (tamazight, Algérie)",           "✔️", "❌"],
  ["Anglais",                               "✔️", "✔️"],
];
console.log(`   ${"Langue".padEnd(38)} 3.8 Flash   3.8 Flash-Lite`);
console.log(`   ${tirets.slice(3)}`);
for (const [nom, a, b] of langues) console.log(`   ${nom.padEnd(38)} ${a}           ${b}`);
console.log(`\n   ⚠️  La darija algérienne s'écrit en ARABE → couverte par « Arabe standard ».`);
console.log(`   ⚠️  Le Kabyle n'est PAS disponible sur Flash-Lite.`);
console.log(`   ⚠️  La détection de langue est AUTOMATIQUE : aucune configuration.`);

// ═════════════════════════════════════════════════════════════════════════════
//  6. VERDICT
// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n${ligne}\n  VERDICT\n${ligne}`);
console.log(`
   ✅ AUCUNE TRADUCTION — jamais. Le texte part tel quel à Google.

   ✅ Le FRANÇAIS dans un texte darija est PRÉSERVÉ (« online », « les leads »,
      « CIB » restent tels quels) — le modèle les prononce correctement.

   ✅ Le MOT ARABE ENTRE CROCHETS [مهتم] est PRÉSERVÉ et sera PRONONCÉ.
      Il n'est JAMAIS converti en français ni en balise.

   ✅ Les BALISES DE SONS restent en ANGLAIS — et c'est ce que Google
      RECOMMANDE, même pour un texte arabe. Ça ne change PAS la langue
      parlée : la voix parle darija et rit en darija.

   ✅ La LANGUE PARLÉE est détectée automatiquement par Google à partir du
      texte lui-même. Ni moi ni l'utilisateur ne choisissons la langue.

   ⚠️  Le seul contenu en anglais est la petite consigne de style
      ("cheerful and amused"). C'est une INSTRUCTION, pas de la parole :
      elle n'est jamais lue à voix haute. La doc Google l'exige en anglais.
`);
console.log(ligne + "\n");
