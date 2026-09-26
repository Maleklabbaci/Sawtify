import { resolveVoiceName, voiceNameEntry, listVoices, voiceNameStats } from "./voiceNames";
let pass = 0, fail = 0;
const ok = (c: boolean, l: string) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const s = voiceNameStats();
console.log(`\n  ${s.total} voix | ${s.prenomsConfirmes} prénoms confirmés | ${s.prenomsAConfirmer} à vérifier | ${s.ecrituresAcceptees} écritures\n`);
console.log("  " + "─".repeat(76));
console.log("  ★ LE TEST CRITIQUE : les anciens identifiants Sawtify\n");
ok(resolveVoiceName("voice_amin") === "Puck",    "voice_amin  → Puck      (identifiant historique)");
ok(resolveVoiceName("voice_yasmin") === "Zephyr", "voice_yasmin → Zephyr");
ok(resolveVoiceName("voice_maryam") === "Sulafat","voice_maryam → Sulafat");
ok(resolveVoiceName("voice_nour") === "Achernar", "voice_nour  → Achernar");
ok(resolveVoiceName("voice_bilal") === "Algenib", "voice_bilal → Algenib");
ok(resolveVoiceName("voice_layla") === "Leda",    "voice_layla → Leda");
ok(resolveVoiceName("voice_faycal") === "Orus",   "voice_faycal → Orus");
ok(resolveVoiceName("voice_khalid") === "Charon", "voice_khalid → Charon");
ok(resolveVoiceName("voice_rashid") === "Fenrir", "voice_rashid → Fenrir");

console.log("\n  " + "─".repeat(76));
console.log("  Prénoms, arabe, slugs, noms techniques\n");
ok(resolveVoiceName("Amine") === "Puck", "« Amine » → Puck");
ok(resolveVoiceName("أمين") === "Puck", "« أمين » → Puck");
ok(resolveVoiceName("amine") === "Puck", "« amine » → Puck");
ok(resolveVoiceName("AMINE") === "Puck", "« AMINE » → Puck");
ok(resolveVoiceName("Puck") === "Puck", "« Puck » → Puck");
ok(resolveVoiceName("Karima") === "Kore", "« Karima » → Kore");
ok(resolveVoiceName("كريمة") === "Kore", "« كريمة » → Kore");
ok(resolveVoiceName("ياسين") === "Pulcherrima", "« ياسين » → Pulcherrima");
ok(resolveVoiceName("سفيان") === "Sadachbia", "« سفيان » → Sadachbia");
ok(resolveVoiceName("Mourad") === "Sadaltager", "« Mourad » → Sadaltager");
ok(resolveVoiceName("inconnu") === null, "« inconnu » → null (rejeté proprement)");
ok(resolveVoiceName("") === null, "chaîne vide → null");
ok(resolveVoiceName("voice_abc123xyz") === "voice_abc123xyz", "voix sur mesure → laissée passer");
ok(voiceNameEntry("أمين")?.fr === "Amine", "fiche complète depuis l'arabe");

console.log("\n  " + "─".repeat(76));
console.log("  Les 30 voix\n");
const fr = listVoices("fr"), ar = listVoices("ar");
console.log("  " + "Technique".padEnd(15) + "FR".padEnd(11) + "AR".padEnd(11) + "Caractère");
console.log("  " + "─".repeat(78));
for (const v of fr) {
  const a = ar.find((x) => x.id === v.id)!;
  console.log(`  ${v.id.padEnd(15)}${v.name.padEnd(11)}${a.name.padEnd(11)}${v.caractere}${v.a_confirmer ? "  ⚠️" : ""}`);
}
console.log(`\n  ★ ${pass} réussis / ${fail} échecs\n`);
process.exit(fail === 0 ? 0 : 1);
