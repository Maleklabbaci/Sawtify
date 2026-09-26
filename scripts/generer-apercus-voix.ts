#!/usr/bin/env node
/**
 * ============================================================================
 *  SAWTIFY — GÉNÉRATEUR D'APERÇUS AUDIO POUR LES 30 VOIX
 * ============================================================================
 *  Génère un aperçu audio pour CHAQUE voix studio, avec un script darija
 *  IDENTIQUE (audition équitable), puis :
 *    • écrit les fichiers WAV dans ./storage/voice-previews/
 *    • écrit le manifeste tts/preview-manifest.json
 *    • met à jour public/audition-voix.html (page d'écoute)
 *    • (optionnel) upload les WAV + le manifeste dans Supabase Storage
 *
 *  USAGE :
 *    npx tsx scripts/generer-apercus-voix.ts
 *    npx tsx scripts/generer-apercus-voix.ts --voix=Puck,Kore
 *    npx tsx scripts/generer-apercus-voix.ts --upload
 *    npx tsx scripts/generer-apercus-voix.ts --force        (régénère tout)
 *    npx tsx scripts/generer-apercus-voix.ts --modele=gemini-3.8-flash-tts
 *
 *  ⚠️ Sans `--force`, une voix dont l'aperçu existe déjà ET dont le script
 *     n'a pas changé est SAUTÉE : tu ne paies donc pas deux fois.
 * ============================================================================
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  AUDITION_SCRIPT, AUDITION_SCRIPT_HASH, AUDITION_SCRIPT_VERSION,
  previewTargets, previewFileName, validateManifest,
  type VoicePreviewEntry, type VoicePreviewManifest,
} from "../tts/voicePreviews";
import { buildTtsRequest, extractAudioFromResponse } from "../tts/engine";

// ── Configuration ───────────────────────────────────────────────────────────
const envFile = (() => { try { return readFileSync(".env", "utf8"); } catch { return ""; } })();
const fromEnvFile = (k: string) =>
  envFile.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";

const API_KEY = process.env.GEMINI_API_KEY || fromEnvFile("GEMINI_API_KEY");
const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const args = (n: string) =>
  process.argv.filter((a) => a.startsWith(`--${n}=`)).map((a) => a.split("=").slice(1).join("="));
const flag = (n: string) => process.argv.includes(`--${n}`);

const MODEL = arg("modele") || process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
const OUT_DIR = arg("dossier") || join(process.cwd(), "storage", "voice-previews");
const MANIFEST_PATH = join(process.cwd(), "tts", "preview-manifest.json");
const AUDITION_PAGE = join(process.cwd(), "public", "audition-voix.html");
const UPLOAD = flag("upload");
const FORCE = flag("force");
const only = args("voix").flatMap((v) => v.split(",")).map((s) => s.trim()).filter(Boolean);
const SIMULE = flag("simule"); // fabrique de faux aperçus : teste toute la chaîne SANS appeler Google
const DELAY_MS = Number(arg("delai")) || 350; // temporisation entre appels (quotas)

const SUPABASE_URL = process.env.SUPABASE_URL || fromEnvFile("SUPABASE_URL");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fromEnvFile("SUPABASE_SERVICE_ROLE_KEY");
const BUCKET = "voice-previews";

const L = "═".repeat(84);
const l = "─".repeat(84);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Appel Gemini ────────────────────────────────────────────────────────────
async function generatePreview(voiceId: string): Promise<{ pcm: Buffer } | { erreur: string }> {
  if (SIMULE) {
    // 1,6 s de silence — sert uniquement à valider la chaîne (WAV, manifeste, page).
    await sleep(20);
    return { pcm: Buffer.alloc(Math.round(1.6 * 48000)) };
  }
  const built = buildTtsRequest({
    model: MODEL,
    rawText: AUDITION_SCRIPT,
    voiceName: voiceId,
    style: null,           // le script contient déjà ses balises de sons
    output: "pcm",
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(built.body),
      signal: ctrl.signal,
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || JSON.stringify(json).slice(0, 250);
      return { erreur: `HTTP ${res.status} — ${msg}` };
    }
    const ex = extractAudioFromResponse(json);
    if (!ex.audio) {
      return { erreur: ex.textInsteadOfAudio ? `texte au lieu d'audio : "${ex.textInsteadOfAudio}"` : "aucun audio" };
    }
    if (ex.finishReason && ex.finishReason !== "STOP") {
      return { erreur: `audio incomplet (finishReason=${ex.finishReason})` };
    }
    return { pcm: ex.audio.pcm };
  } catch (err: any) {
    if (err?.name === "AbortError") return { erreur: "délai dépassé (90 s)" };
    const code = err?.cause?.code || err?.code || "";
    if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return { erreur: `pas d'accès à generativelanguage.googleapis.com (${code}) — vérifie ta connexion internet ou ton réseau d'entreprise` };
    }
    if (String(code).includes("CERT") || String(err?.cause?.message).includes("certificate")) {
      return { erreur: `certificat TLS refusé (${code}) — réseau avec proxy/antivirus : relance depuis une autre connexion` };
    }
    return { erreur: `${err?.cause?.message || err?.message || err}${code ? ` (${code})` : ""}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Ajoute l'en-tête RIFF à du PCM brut. */
function pcmToWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22); h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Upload vers Supabase Storage (optionnel). */
async function upload(file: string, body: Buffer, contentType: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${file}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn(`   ⚠️  upload ${file} échoué : ${res.status} ${t.slice(0, 120)}`);
      return null;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file}`;
  } catch (err: any) {
    console.warn(`   ⚠️  upload ${file} échoué : ${err?.message || err}`);
    return null;
  }
}

// ── Programme ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${L}\n  GÉNÉRATION DES APERÇUS AUDIO — 30 VOIX STUDIO GEMINI 3.8\n${L}`);
  console.log(`  Modèle              : ${MODEL}`);
  console.log(`  Script d'audition   : version ${AUDITION_SCRIPT_VERSION}, empreinte ${AUDITION_SCRIPT_HASH}`);
  console.log(`  Longueur du script  : ${AUDITION_SCRIPT.length} caractères`);
  console.log(`  Dossier de sortie   : ${OUT_DIR}`);
  console.log(`  Upload Supabase     : ${UPLOAD ? (SUPABASE_URL ? "oui" : "demandé mais identifiants manquants") : "non (--upload pour activer)"}`);
  console.log(`  Manifeste           : ${MANIFEST_PATH}`);
  if (SIMULE) console.log(`\n  ⚠️  MODE SIMULATION : aucun appel à Google, les fichiers générés sont muets.`);
  console.log("");

  if (!API_KEY && !SIMULE) {
    console.error(`✗ GEMINI_API_KEY introuvable.

Ajoute-la dans .env à la racine :
    GEMINI_API_KEY=ta_cle

Ou lance :
    GEMINI_API_KEY=ta_cle npx tsx scripts/generer-apercus-voix.ts
`);
    process.exit(1);
  }

  // Manifeste existant → reprise sans regénérer ce qui est déjà bon
  let previous: VoicePreviewManifest | null = null;
  if (existsSync(MANIFEST_PATH) && !FORCE) {
    try {
      previous = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
      const v = validateManifest(previous);
      if (v.raisons.length) {
        console.log(`  ℹ️  Manifeste existant écarté : ${v.raisons.join(" ; ")}\n`);
        previous = null;
      } else {
        console.log(`  ℹ️  Reprise : ${previous!.voices.length} aperçu(s) déjà générés.\n`);
      }
    } catch {
      previous = null;
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let targets = previewTargets();
  if (only?.length) {
    targets = targets.filter((t) =>
      only.some((o) => [t.voice.id, t.nameFr, t.nameAr, t.slug, t.legacyId].filter(Boolean)
        .some((v) => String(v).toLowerCase() === o.toLowerCase()))
    );
    console.log(`  Filtre --voix : ${targets.length} voix sélectionnée(s)\n`);
  }

  const entries: VoicePreviewEntry[] = [];
  const echecs: { voice: string; raison: string }[] = [];
  let generes = 0, sautes = 0, facture = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const file = previewFileName(t.voice.id);
    const path = join(OUT_DIR, file);
    const prefix = `[${String(i + 1).padStart(2, "0")}/${targets.length}]`;

    // Déjà généré et script inchangé → on réutilise (aucun coût)
    const prev = previous?.voices.find((v) => v.voiceId === t.voice.id);
    if (!FORCE && prev && existsSync(path)) {
      const size = statSync(path).size;
      const url = UPLOAD ? await upload(file, readFileSync(path), "audio/wav") : prev.url;
      entries.push({ ...prev, file, url: url ?? prev.url, bytes: size });
      sautes++;
      console.log(`  ${prefix} ${t.voice.id.padEnd(15)} ⏭  déjà généré (${prev.durationSeconds.toFixed(1)}s)`);
      continue;
    }

    process.stdout.write(`  ${prefix} ${t.voice.id.padEnd(15)} ${t.nameFr.padEnd(10)} génération…`);
    const r = await generatePreview(t.voice.id);

    if (SIMULE) process.stdout.write("\r  " + prefix + " " + t.voice.id.padEnd(15) + " " + t.nameFr.padEnd(10) + " simulation…   ");

    if ("erreur" in r) {
      echecs.push({ voice: t.voice.id, raison: r.erreur });
      console.log(` ❌ ${r.erreur}`);
      await sleep(DELAY_MS);
      continue;
    }

    const wav = pcmToWav(r.pcm);
    writeFileSync(path, wav);
    const durationSeconds = +(r.pcm.length / 48000).toFixed(2);
    const url = UPLOAD ? await upload(file, wav, "audio/wav") : undefined;

    entries.push({
      voiceId: t.voice.id,
      legacyId: t.legacyId,
      nameFr: t.nameFr,
      nameAr: t.nameAr,
      file,
      url: url ?? undefined,
      durationSeconds,
      bytes: wav.length,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      gender: t.voice.gender, // "unknown" tant que non validé à l'oreille
    });

    generes++;
    facture += AUDITION_SCRIPT.length;
    console.log(` ✅ ${durationSeconds.toFixed(1)}s  (${(wav.length / 1024).toFixed(0)} Ko)`);

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  // ── Manifeste (fusion avec les entrées précédentes non régénérées) ──
  const merged = new Map<string, VoicePreviewEntry>();
  for (const v of previous?.voices || []) merged.set(v.voiceId, v);
  for (const v of entries) merged.set(v.voiceId, v);
  const all = [...merged.values()].sort(
    (a, b) => previewTargets().findIndex((t) => t.voice.id === a.voiceId) - previewTargets().findIndex((t) => t.voice.id === b.voiceId)
  );

  const manifest: VoicePreviewManifest = {
    version: AUDITION_SCRIPT_VERSION,
    scriptHash: AUDITION_SCRIPT_HASH,
    model: MODEL,
    generatedAt: new Date().toISOString(),
    count: all.length,
    voices: all,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  if (UPLOAD) await upload("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)), "application/json");

  // ── Page d'audition ──
  mkdirSync(dirname(AUDITION_PAGE), { recursive: true });
  writeFileSync(AUDITION_PAGE, buildAuditionPage(manifest));

  // ── Rapport ──
  const dureeTotale = all.reduce((s, v) => s + v.durationSeconds, 0);
  const coutEstime = (dureeTotale * 25 / 1e6) * 9.0; // 25 tokens/s à $9/1M (3.8 Flash TTS)
  console.log(`\n${L}\n  RAPPORT\n${L}`);
  console.log(`  Aperçus générés : ${generes}`);
  console.log(`  Aperçus sautés  : ${sautes} (déjà présents, aucun coût)`);
  console.log(`  Échecs          : ${echecs.length}`);
  if (echecs.length) {
    console.log(`\n  Détail des échecs :`);
    for (const e of echecs) console.log(`     • ${e.voice} : ${e.raison}`);
  }
  console.log(`\n  Total au catalogue : ${all.length} / ${previewTargets().length} voix`);
  console.log(`  Durée audio totale : ${dureeTotale.toFixed(1)} s`);
  console.log(`  Coût estimé        : $${coutEstime.toFixed(4)}  (${(coutEstime * 260).toFixed(2)} DZD)`);
  console.log(`  Caractères générés : ${facture}`);
  console.log(`\n  📄 Manifeste : ${MANIFEST_PATH}`);
  console.log(`  🎧 Audition  : ${AUDITION_PAGE}`);
  console.log(`  🔊 Fichiers  : ${OUT_DIR}/`);

  if (SIMULE) console.log(`\n  🧪 Simulation terminée : la chaîne complète fonctionne. Relance SANS --simule pour de vrais aperçus.`);
  if (all.length === previewTargets().length) {
    console.log(`
${l}
  ✅ LES 30 APERÇUS SONT GÉNÉRÉS

  👉 ÉCOUTE MAINTENANT : ouvre public/audition-voix.html dans ton navigateur
     (ou lance le serveur et va sur /audition-voix.html)

     La page joue les 30 voix et te laisse marquer HOMME / FEMME pour chacune.
     Elle te sort ensuite le code à coller dans tts/voiceNames.ts.

  Les 21 voix marquées « à vérifier » se valident en ~3 minutes d'écoute.
${l}
`);
  } else {
    console.log(`\n  ⚠️  ${previewTargets().length - all.length} voix manquante(s). Relance le script pour compléter.\n`);
  }

  process.exit(echecs.length > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PAGE D'AUDITION — écouter les 30 voix et valider les genres
// ─────────────────────────────────────────────────────────────────────────────
function buildAuditionPage(m: VoicePreviewManifest): string {
  // On liste TOUJOURS les 30 voix, même celles qui n'ont pas encore d'aperçu :
  // lancer le script avec un filtre ne doit pas produire une page incomplète.
  const index = new Map(m.voices.map((v) => [v.voiceId, v]));
  const data = previewTargets().map((t) => {
    const v = index.get(t.voice.id);
    return {
      voiceId: t.voice.id,
      legacyId: t.legacyId ?? null,
      nameFr: t.nameFr,
      nameAr: t.nameAr,
      file: v?.file ?? previewFileName(t.voice.id),
      url: v?.url ?? null,
      duration: v?.durationSeconds ?? 0,
      gender: v?.gender ?? "unknown",
      aConfirmer: (v?.gender ?? "unknown") === "unknown",
      /** false = pas encore d'aperçu généré pour cette voix. */
      dispo: Boolean(v),
    };
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Audition des 30 voix · Sawtify</title>
<style>
:root{--purple:#7c3aed;--ink:#172033;--muted:#64748b;--line:#e8eaf0;--green:#059669;--red:#dc2626}
*{box-sizing:border-box}
body{margin:0;background:#f8fafc;color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6}
.top{height:64px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:20}
.brand{font-weight:900;display:flex;align-items:center;gap:10px}
.logo{width:32px;height:32px;border-radius:9px;background:var(--purple);color:#fff;display:grid;place-items:center;font-size:15px}
.wrap{max-width:1080px;margin:0 auto;padding:28px 20px 120px}
h1{font-size:26px;letter-spacing:-.02em;margin:0 0 6px}
.sub{color:var(--muted);font-size:14px;margin:0 0 22px}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:14px 28px;display:flex;align-items:center;gap:16px;justify-content:space-between;z-index:30;box-shadow:0 -6px 24px #0f172a12;flex-wrap:wrap}
.prog{font-size:14px;font-weight:800}
.prog small{display:block;color:var(--muted);font-weight:600;font-size:11px}
button{font:inherit;font-weight:800;border-radius:11px;border:1px solid var(--line);background:#fff;padding:9px 15px;cursor:pointer;color:var(--ink);transition:.15s}
button:hover{border-color:var(--purple);color:var(--purple)}
button.primary{background:var(--purple);color:#fff;border-color:var(--purple)}
button.primary:hover{background:#6d28d9;color:#fff}
button.h{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
button.f{background:#fdf2f8;border-color:#fbcfe8;color:#9d174d}
button.sel{outline:3px solid var(--purple);outline-offset:1px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;font-size:14px}
th{text-align:left;background:#f8fafc;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:11px 14px;border-bottom:1px solid var(--line)}
td{padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:middle}
tr:last-child td{border-bottom:0}
tr.done td{background:#fafdfb}
.ar{direction:rtl;font-size:16px}
.tag{display:inline-block;font-size:10px;font-weight:900;padding:2px 7px;border-radius:99px;text-transform:uppercase;letter-spacing:.05em}
.tag.todo{background:#fef3c7;color:#92400e}
.tag.ok{background:#d1fae5;color:#065f46}
.tech{font:12px ui-monospace,Menlo,monospace;color:var(--muted)}
audio{width:210px;height:34px}
.play{background:#f5f3ff;border-color:#ddd6fe;color:#5b21b6;padding:6px 12px;font-size:13px}
pre{background:#101321;color:#e2e8f0;padding:16px;border-radius:14px;overflow:auto;font-size:12px;max-height:280px}
.note{background:#f1edff;border:1px solid #ddd6fe;border-radius:14px;padding:14px;color:#4c1d95;font-size:13.5px;margin:18px 0}
.ok-box{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
@media(max-width:760px){.hide-sm{display:none}audio{width:150px}.wrap{padding:18px 12px 160px}}
</style>
</head>
<body>
<header class="top">
  <span class="brand"><span class="logo">♪</span> Sawtify · Audition des voix</span>
  <button onclick="exportAll()">📋 Copier le résultat</button>
</header>

<div class="wrap">
  <h1>Les 30 voix studio — écoute et valide</h1>
  <p class="sub">Écoute chaque voix, puis marque <b>Homme</b> ou <b>Femme</b>. Google ne publie pas le genre de ses voix : c'est ton oreille qui tranche. Généré le ${new Date(m.generatedAt).toLocaleString("fr-FR")} avec <code>${m.model}</code>.</p>

  <div class="note" id="note">
    <b>Ce que tu dois faire :</b> clique ▶︎ sur chaque ligne, écoute, puis clique <b>Homme</b> ou <b>Femme</b>.
    Quand c'est fini, clique <b>📋 Copier le résultat</b> en haut, et colle-le moi dans la conversation.
  </div>

  <table>
    <thead><tr><th style="width:38px"></th><th>Prénom</th><th class="hide-sm">Arabe</th><th class="hide-sm">Technique</th><th>Écoute</th><th>Genre</th><th class="hide-sm">État</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
</div>

<div class="bar">
  <div class="prog"><span id="count">0</span> / ${data.length} voix validées<small>Ton résultat est sauvegardé dans ce navigateur</small></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="resetAll()">↺ Réinitialiser</button>
    <button class="primary" onclick="exportAll()">📋 Copier le résultat</button>
  </div>
</div>

<script>
const VOICES = ${JSON.stringify(data, null, 2)};
const KEY = 'sawtify-audition-v1';
let state = JSON.parse(localStorage.getItem(KEY) || '{}');

function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }

function render(){
  const tb = document.getElementById('rows');
  tb.innerHTML = VOICES.map(v => {
    const g = state[v.voiceId] || null;
    return \`<tr class="\${g?'done':''}">
      <td><button class="play" onclick="play('\${v.voiceId}')" \${v.dispo?'':'disabled title="Aperçu non généré"'}>▶︎</button></td>
      <td><b>\${v.nameFr}</b>\${v.aConfirmer?'':' <span class="tech">✓</span>'}</td>
      <td class="hide-sm ar">\${v.nameAr}</td>
      <td class="hide-sm tech">\${v.voiceId}</td>
      <td><audio id="a-\${v.voiceId}" controls preload="none" \${v.dispo?'':'disabled'} src="\${v.url || '/storage/voice-previews/' + v.file}"></audio></td>
      <td style="white-space:nowrap">
        <button class="h \${g==='male'?'sel':''}" onclick="setG('\${v.voiceId}','male')">Homme</button>
        <button class="f \${g==='female'?'sel':''}" onclick="setG('\${v.voiceId}','female')">Femme</button>
      </td>
      <td class="hide-sm">\${g?'<span class="tag ok">validé</span>':(v.dispo?'<span class="tag todo">à écouter</span>':'<span class="tag todo">pas d\'aperçu</span>')}</td>
    </tr>\`;
  }).join('');
  const n = Object.keys(state).length;
  const dispo = VOICES.filter(v => v.dispo).length;
  document.getElementById('count').textContent = n;
  document.getElementById('count').nextElementSibling.textContent = \`/ \${dispo} voix avec aperçu\`;
  if (n === dispo && dispo > 0) {
    document.getElementById('note').className = 'note ok-box';
    document.getElementById('note').innerHTML = '<b>✅ Les 30 voix sont validées !</b> Clique <b>📋 Copier le résultat</b> en haut et colle-le dans la conversation : je mets à jour les prénoms et les genres partout (interface, API, documentation).';
  }
}

function play(id){
  const v = VOICES.find(x => x.voiceId === id);
  if (!v || !v.dispo) return;
  const a = document.getElementById('a-' + id);
  document.querySelectorAll('audio').forEach(x => { if (x !== a) x.pause(); });
  a.currentTime = 0; a.play();
  a.onended = () => {
    const restants = VOICES.slice(VOICES.findIndex(x => x.voiceId === id) + 1).filter(x => x.dispo && !state[x.voiceId]);
    const next = restants[0] || VOICES.slice(VOICES.findIndex(x => x.voiceId === id) + 1).find(x => x.dispo);
    if (next) { const n = document.getElementById('a-' + next.voiceId); n.scrollIntoView({block:'center', behavior:'smooth'}); n.play(); }
  };
}

function setG(id, g){ state[id] = g; save(); render(); }
function resetAll(){ if (confirm('Effacer toutes tes validations ?')) { state = {}; save(); render(); } }

function exportAll(){
  const sansApercu = VOICES.filter(v => !v.dispo).map(v => v.voiceId);
  const manquants = VOICES.filter(v => v.dispo && !state[v.voiceId]).map(v => v.voiceId);
  const lignes = VOICES.map(v => \`  { id: "\${v.voiceId}", gender: "\${state[v.voiceId] || 'unknown'}" }, // \${v.nameFr}\`);
  const code = \`// Résultat de l'audition — \${new Date().toISOString()}
// \${Object.keys(state).length}/\${VOICES.filter(v=>v.dispo).length} voix validées
// Voix sans aperçu : \${sansApercu.length ? sansApercu.join(', ') : 'aucune'}
// À coller dans tts/voiceNames.ts (remplacer le champ gender correspondant)
export const GENDER_RESULTS = [
\${lignes.join('\\n')}
];\`;
  navigator.clipboard.writeText(code).then(
    () => alert('✅ Copié !\\n\\nColle-le dans la conversation.\\n' + (manquants.length ? \`\\n⚠️ \${manquants.length} voix pas encore écoutées.\` : (sansApercu.length ? \`\\n⚠️ \${sansApercu.length} voix sans aperçu.\` : '\\n🎉 Toutes les voix sont validées !'))),
    () => { prompt('Copie ce texte :', code); }
  );
}

render();
</script>
</body></html>`;
}

main().catch((err) => { console.error("\nErreur inattendue :", err); process.exit(1); });
