#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — COMPARATEUR D'ÉCOUTE : Gemini 3.1 (actuel) vs Gemini 3.8 (nouveau)
 * ============================================================================
 *  Génère LE MÊME TEXTE DARIJA avec les DEUX modèles, sauvegarde 2 fichiers
 *  WAV, et affiche le coût de chacun. Tu écoutes, tu compares, tu décides.
 *
 *  USAGE :
 *      npx tsx scripts/comparer-3.1-vs-3.8.ts
 *      npx tsx scripts/comparer-3.1-vs-3.8.ts --texte="واش راكم خاوتي <laugh> لاباس؟"
 *      npx tsx scripts/comparer-3.1-vs-3.8.ts --voix=Charon --sortie=./mes-tests
 *
 *  ⚠️ Sans argument --texte, un texte de démonstration darija est utilisé
 *     (tiré des scripts de la plateforme Sawtify).
 * ============================================================================
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { buildTtsRequest, SAMPLE_RATE, type EngineMode } from "../tts/engine";
import { VOCAL_TAGS } from "../tts/vocalTags";

// ── Configuration ───────────────────────────────────────────────────────────
const envFile = (() => {
  try { return readFileSync(".env", "utf8"); } catch { return ""; }
})();
const fromEnvFile = (key: string) =>
  envFile.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";

const API_KEY = process.env.GEMINI_API_KEY || fromEnvFile("GEMINI_API_KEY");

const MODELS: { label: string; model: string; mode: EngineMode }[] = [
  { label: "3.1 (ce que tu utilises aujourd'hui)", model: "gemini-3.1-flash-tts-preview", mode: "legacy" },
  { label: "3.8 (le nouveau)", model: "gemini-3.8-flash-tts", mode: "modern" },
];

/** Texte de démonstration : darija + plusieurs sons non-verbaux. */
const TEXTE_DEMO = `سلام عليكم خاوتي، واش راكم لاباس؟ <laugh> اليوم راني حاب نوريكم حاجة <short pause> راح تعجبكم بزاف. <sigh> بصراحة، تعبت وناس بزاف ما عرفوش يشرحو الفكرة، بصح اليوم <breath> غادي نقولها ليكم بكل بساطة. <chuckle> راهي منصة صوتيفي، تحول النص لصوت بشري طبيعي. <exhales> جربوها، وأنا متأكد بلي غادي تعجبكم.`;

const arg = (nom: string) =>
  process.argv.find((a) => a.startsWith(`--${nom}=`))?.split("=").slice(1).join("=");

const TEXTE = arg("texte") || TEXTE_DEMO;
const VOIX = arg("voix") || "Puck";
const DOSSIER = arg("sortie") || "./comparaison-tts";

// ── Coûts officiels (USD / 1M tokens, grille du 23/09/2026) ─────────────────
const PRIX: Record<string, { in: number; out: number }> = {
  "gemini-3.1-flash-tts-preview": { in: 1.0, out: 20.0 },
  "gemini-3.8-flash-tts": { in: 0.5, out: 9.0 },
  "gemini-3.8-flash-lite-tts": { in: 0.5, out: 6.0 },
};
const TOKENS_AUDIO_PAR_SECONDE = 25;
const USD_TO_DZD = 260;

// ── Appel API ───────────────────────────────────────────────────────────────
async function generer(model: string, body: unknown): Promise<{ pcm: Buffer; usage: any } | { erreur: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || JSON.stringify(json).slice(0, 300);
      return { erreur: `HTTP ${res.status} — ${msg}` };
    }
    const parts: Buffer[] = [];
    for (const p of json?.candidates?.[0]?.content?.parts || []) {
      if (p?.inlineData?.data) parts.push(Buffer.from(p.inlineData.data, "base64"));
    }
    if (parts.length === 0) {
      const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      return { erreur: txt ? `Le modèle a renvoyé du TEXTE : "${String(txt).slice(0, 120)}"` : "Aucun audio dans la réponse" };
    }
    let buf = Buffer.concat(parts);
    // Retire l'en-tête WAV s'il existe (3.8 peut en ajouter un)
    const hasRiff = buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE";
    if (hasRiff) {
      let off = 12;
      while (off + 8 <= buf.length) {
        const id = buf.toString("ascii", off, off + 4);
        const size = buf.readUInt32LE(off + 4);
        if (id === "data") { buf = buf.subarray(off + 8, Math.min(off + 8 + size, buf.length)); break; }
        off += 8 + size + (size % 2);
      }
    }
    return { pcm: buf, usage: json?.usageMetadata ?? null };
  } catch (err: any) {
    return { erreur: err?.name === "AbortError" ? "Délai dépassé (60 s)" : String(err?.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

function pcmVersWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ── Programme ───────────────────────────────────────────────────────────────
async function main() {
  const ligne = "═".repeat(78);
  console.log(`\n${ligne}\n  COMPARAISON ÉCOUTE : Gemini 3.1 (actuel)  vs  Gemini 3.8 (nouveau)\n${ligne}`);

  if (!API_KEY) {
    console.error(`
✗ GEMINI_API_KEY introuvable.

Ajoute-la dans ton fichier .env à la racine du projet :
    GEMINI_API_KEY=ta_cle_ici

Ou lance directement :
    GEMINI_API_KEY=ta_cle npx tsx scripts/comparer-3.1-vs-3.8.ts
`);
    process.exit(1);
  }

  console.log(`\n  Voix        : ${VOIX}`);
  console.log(`  Texte       : ${TEXTE.length} caractères`);
  console.log(`  Sons inclus : ${(TEXTE.match(/<[a-zA-Z][a-zA-Z _-]*>/g) || []).join(" ")}`);
  console.log(`  Catalogue   : ${VOCAL_TAGS.length} sons humains disponibles en 3.8\n`);

  mkdirSync(DOSSIER, { recursive: true });
  const resultats: any[] = [];

  for (const { label, model, mode } of MODELS) {
    console.log(`${"─".repeat(78)}\n  → ${label}  [${model}]\n${"─".repeat(78)}`);

    const built = buildTtsRequest({
      model,
      rawText: TEXTE,
      voiceName: VOIX,
      style: null,
      legacyPersona: "Amin, a young friendly Algerian man. Casual, upbeat, talking like a friend.",
      legacyNotes: ["Pace: Natural conversational pace."],
      output: "pcm",
    });

    // Ce qui sera VRAIMENT envoyé à Google (transcript seulement, pas les notes)
    console.log(`  Mode du moteur     : ${built.mode}`);
    console.log(`  Sons conservés     : ${built.tags.length ? built.tags.map((t) => t.tag).join(" ") : "(aucun)"}`);
    console.log(`  Style (à part)     : ${built.mode === "modern" ? (built.body as any).contents[0].parts[0].speech_metadata?.style ?? "(aucun)" : "— (écrit dans le texte)"}`);
    if (built.warnings.length) {
      console.log(`  Avertissements     :`);
      for (const w of built.warnings) console.log(`      • ${w}`);
    }
    console.log(`  Transcript envoyé  : "${built.finalTranscript.slice(0, 110)}${built.finalTranscript.length > 110 ? "…" : ""}"`);

    const t0 = Date.now();
    const r = await generer(model, built.body);
    const ms = Date.now() - t0;

    if ("erreur" in r) {
      console.log(`  ❌ ÉCHEC : ${r.erreur}\n`);
      resultats.push({ label, model, echec: r.erreur, ms });
      continue;
    }

    const duree = r.pcm.length / (SAMPLE_RATE * 2);
    const nom = `${DOSSIER}/${mode}-${model.replace(/[^a-z0-9.-]/gi, "_")}.wav`;
    writeFileSync(nom, pcmVersWav(r.pcm));

    const prix = PRIX[model];
    const tokensIn = r.usage?.promptTokenCount ?? Math.ceil(built.finalTranscript.length / 2.5);
    const tokensOut = r.usage?.candidatesTokenCount ?? Math.ceil(duree * TOKENS_AUDIO_PAR_SECONDE);
    const coutUSD = (tokensIn / 1e6) * prix.in + (tokensOut / 1e6) * prix.out;
    const coutParMin = duree > 0 ? (coutUSD / duree) * 60 : 0;

    console.log(`  ✅ Généré en ${(ms / 1000).toFixed(1)} s`);
    console.log(`  Durée audio        : ${duree.toFixed(1)} s`);
    console.log(`  Tokens réels       : ${tokensIn} entrée / ${tokensOut} sortie`);
    console.log(`  Coût réel          : $${coutUSD.toFixed(5)}  =  ${(coutUSD * USD_TO_DZD).toFixed(3)} DZD`);
    console.log(`  Projection /minute : ${(coutParMin * USD_TO_DZD).toFixed(2)} DZD`);
    console.log(`  Fichier            : ${nom}\n`);

    resultats.push({ label, model, duree, ms, tokensIn, tokensOut, coutUSD, coutParMin, nom });
  }

  // ── Synthèse ──
  console.log(`${ligne}\n  RÉSULTAT\n${ligne}`);
  const ok = resultats.filter((r) => !r.echec);
  for (const r of resultats) {
    if (r.echec) console.log(`\n  ❌ ${r.label}\n     ${r.echec}`);
    else console.log(`\n  ✅ ${r.label}\n     ${r.duree.toFixed(1)} s d'audio en ${(r.ms / 1000).toFixed(1)} s  |  ${(r.coutParMin * USD_TO_DZD).toFixed(2)} DZD la minute  |  ${r.nom}`);
  }

  if (ok.length === 2) {
    const [a, b] = ok;
    const gain = ((a.coutParMin - b.coutParMin) / a.coutParMin) * 100;
    console.log(`\n${"─".repeat(78)}`);
    console.log(`  € Économie en passant au 3.8 : ${gain.toFixed(0)}%`);
    console.log(`  € Sur 1 000 minutes générées  : ${(((a.coutParMin - b.coutParMin) * 1000) * USD_TO_DZD).toFixed(0)} DZD économisés`);
    console.log(`${"─".repeat(78)}`);
  }

  console.log(`
  👉 MAINTENANT ÉCOUTE LES 2 FICHIERS dans ${DOSSIER}/
     • Le 3.1 va lire certaines balises à voix haute ou les ignorer
       (il ne connaît que 6 sons distincts sur ${VOCAL_TAGS.length})
     • Le 3.8 devrait produire les ${VOCAL_TAGS.length} sons correctement
     • Compare aussi la NATURALITÉ de la darija entre les deux

  Puis, pour activer le 3.8 sur ta plateforme, ajoute UNE ligne dans .env :
       GEMINI_TTS_MODEL=gemini-3.8-flash-tts
  (et remets l'ancienne valeur pour revenir en arrière à tout moment)
`);
}

main().catch((err) => { console.error("Erreur inattendue :", err); process.exit(1); });
