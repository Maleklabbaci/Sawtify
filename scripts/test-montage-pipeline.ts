/**
 * Test hors ligne du pipeline de montage vidéo (video/montage.ts).
 * Aucune clé API requise : le plan Gemini est simulé + le plan de secours
 * est testé tel quel. Vérifie : sondage des médias, sanitization du plan,
 * captions minutées (arabe + secours de police), rendu FFmpeg 9:16 réel.
 *
 *   npm run test:montage
 */
import { mkdirSync, existsSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import path from "path";
import { createRequire } from "node:module";
import ffmpegStaticPath from "ffmpeg-static";
import {
  VIDEO_CAPTION_FONTS,
  ARABIC_FALLBACK_FONT,
  resolveFontFile,
  stageFontsForJob,
  hasArabicScript,
  chunkScriptForCaptions,
  probeMediaStreams,
  sanitizeSegments,
  fallbackSegments,
  buildTimedCaptions,
  evenCaptions,
  buildCaptionsAss,
  buildMontageFfmpegArgs,
  plannedDurationSeconds,
  runFfmpeg,
  type MontageClip,
} from "../video/montage";

let pass = 0, fail = 0;
const ok = (cond: boolean, label: string, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? `\n      → ${extra}` : ""}`); }
};
const section = (title: string) => console.log(`\n${"─".repeat(74)}\n  ${title}\n${"─".repeat(74)}`);

// ── Binaire FFmpeg : ffmpeg-static s'il est téléchargé, sinon @ffmpeg-installer (CI/offline)
const ffmpegPath = existsSync(String(ffmpegStaticPath))
  ? String(ffmpegStaticPath)
  : (() => {
    try {
      const installer = createRequire(path.join(process.cwd(), "package.json"))("@ffmpeg-installer/ffmpeg");
      return String(installer.path);
    } catch {
      return "";
    }
  })();

const WORK_DIR = path.join(process.cwd(), "storage", "video-test");
rmSync(WORK_DIR, { recursive: true, force: true });
mkdirSync(WORK_DIR, { recursive: true });

const main = async () => {
  section("Polices Google gratuites (paquets @expo-google-fonts)");
  for (const family of VIDEO_CAPTION_FONTS) {
    const regular = resolveFontFile(family, 400);
    const bold = resolveFontFile(family, 700);
    ok(Boolean(regular && existsSync(regular)), `${family} — graisse 400`, regular || "introuvable");
    ok(Boolean(bold && existsSync(bold)), `${family} — graisse 700`, bold || "introuvable");
  }
  ok(resolveFontFile("Police Inconnue", 400) === null, "Police inconnue → null (pas de crash)");
  ok(hasArabicScript("واش راك") && !hasArabicScript("Salut ça va"), "Détection d'écriture arabe");
  const staged = stageFontsForJob("test-job", "Inter", WORK_DIR);
  ok(Boolean(staged && existsSync(staged!)), "Dossier de polices du job préparé (Inter + secours Cairo)");
  const stagedFiles = staged ? readdirSync(staged) : [];
  ok(stagedFiles.some((name) => name.includes("Cairo")), "Le secours arabe (Cairo) est copié même quand on choisit Inter");

  section("Sondage des médias (durée + piste audio)");
  if (!ffmpegPath) {
    ok(false, "Binaire FFmpeg introuvable — installe ffmpeg-static ou @ffmpeg-installer/ffmpeg");
    console.log(`\n  Résumé : ${pass} OK, ${fail} KO`);
    process.exit(1);
  }
  const clipA = path.join(WORK_DIR, "clipA.mp4");
  const clipB = path.join(WORK_DIR, "clipB.mp4");
  const imageC = path.join(WORK_DIR, "imageC.png");
  await runFfmpeg(ffmpegPath, ["-y", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=8", "-f", "lavfi", "-i", "sine=frequency=440:duration=8", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", clipA]);
  await runFfmpeg(ffmpegPath, ["-y", "-f", "lavfi", "-i", "smptebars=size=720x1280:rate=30:duration=6", "-f", "lavfi", "-i", "sine=frequency=880:duration=6", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", clipB]);
  await runFfmpeg(ffmpegPath, ["-y", "-f", "lavfi", "-i", "color=c=purple@0.9:size=800x600:d=1", "-frames:v", "1", imageC]);
  const probeA = await probeMediaStreams(ffmpegPath, clipA);
  const probeB = await probeMediaStreams(ffmpegPath, clipB);
  const probeC = await probeMediaStreams(ffmpegPath, imageC);
  ok(Math.abs((probeA.duration ?? 0) - 8) < 0.5, `clipA : durée ≈ 8 s (reçue ${probeA.duration?.toFixed(2)})`);
  ok(probeA.hasAudio, "clipA : piste audio détectée");
  ok(Math.abs((probeB.duration ?? 0) - 6) < 0.5, `clipB : durée ≈ 6 s (reçue ${probeB.duration?.toFixed(2)})`);
  ok(probeC.duration === null && !probeC.hasAudio, "image : pas de durée, pas d'audio");

  section("Plan Gemini simulé → sanitization");
  const clips: MontageClip[] = [
    { id: "a", name: "A", kind: "video", path: clipA, duration: probeA.duration, hasAudio: probeA.hasAudio },
    { id: "b", name: "B", kind: "video", path: clipB, duration: probeB.duration, hasAudio: probeB.hasAudio },
    { id: "c", name: "C", kind: "image", path: imageC, duration: null, hasAudio: false },
  ];
  // Gemini renvoie n'importe quoi : indices dupliqués, hors bornes, durées incohérentes
  const rawGemini = { segments: [{ clip: 9, start: 0, end: 5 }, { clip: 2, start: 3, end: 1 }, { clip: 0, start: 1.5, end: 6.5 }, { clip: 1, start: 20, end: 40 }, { clip: 1, start: 0, end: 3 }] };
  const segments = sanitizeSegments(rawGemini.segments, clips, null);
  ok(segments.length === 3, `Indices inconnus écartés, doublons dédupliqués, coupes absurdes réparées (3 conservés → ${segments.length})`, JSON.stringify(segments));
  ok(segments[0].clip === 2, "L'image est passée en premier (ordre Gemini conservé)", JSON.stringify(segments));
  ok(segments.every((segment) => segment.end > segment.start), "Tous les segments ont end > start");
  const target = 10;
  const segmentsVoice = sanitizeSegments([{ clip: 0, start: 0, end: 5 }, { clip: 1, start: 0, end: 3 }, { clip: 2, start: 0, end: 2 }], clips, target);
  const voiceTotal = plannedDurationSeconds(segmentsVoice);
  ok(Math.abs(voiceTotal - target) < 0.5, `Mode voix : somme des segments ≈ durée exacte de la voix (${voiceTotal.toFixed(2)} ≈ ${target})`);
  ok(segmentsVoice.every((segment) => segment.end - segment.start >= 0.6 - 0.01), "Aucun segment plus court que 0,6 s");

  section("Captions minutées (texte exact, timings réparés)");
  const chunks = chunkScriptForCaptions("هذا هو المونتاج الآلي من صوتيفي [excited] مع كابتيونات متزامنة مع الصوت. Gemini choisit les coupes et FFmpeg rend le MP4 final.");
  ok(chunks.length >= 3, `Script découpé en chunks « caption » (${chunks.length})`, JSON.stringify(chunks));
  ok(chunks.every((chunk) => chunk.length <= 68), "Chunks raisonnablement courts");
  // Timings Gemini cassés : chevauchements, index inconnu, durée négative
  const rawTimings = [{ i: 99, start: 0, end: 1 }, { i: 0, start: 0, end: 2.5 }, { i: 1, start: 1.5, end: 4 }, { i: 2, start: 3, end: 2 }];
  const captions = buildTimedCaptions(rawTimings, chunks, 10);
  ok(captions.length === chunks.length, `Chaque chunk reçoit un timing, même sans données Gemini (${captions.length}/${chunks.length})`);
  ok(captions.every((caption, index) => index === 0 || caption.start >= captions[index - 1].end - 0.05), "Aucun chevauchement après réparation");
  ok(captions.every((caption) => caption.text === chunks[captions.indexOf(caption)]), "Le texte des captions est exactement le script (jamais réécrit)");
  const even = evenCaptions(chunks, 10);
  ok(even.length === chunks.length && Math.abs(even[even.length - 1].end - 10) < 0.01, "Répartition uniforme de secours couvre [0, durée]");

  section("Fichier ASS : police choisie + secours arabe");
  const ass = buildCaptionsAss(captions, "Inter", "white", "bold", 48, ARABIC_FALLBACK_FONT);
  ok(ass.includes("Style: Sawtify,Inter,"), "Style principal = police choisie (Inter)");
  ok(ass.includes("Style: SawtifyAr,Cairo,"), "Style de secours = Cairo pour les lignes arabes");
  const arabicLines = captions.filter((caption) => hasArabicScript(caption.text)).length;
  const sawtifyArUses = (ass.match(/,SawtifyAr,/g) || []).length;
  ok(sawtifyArUses === arabicLines, `Seules les ${arabicLines} lignes arabes utilisent le secours (${sawtifyArUses})`);
  const assLatinOnly = buildCaptionsAss(evenCaptions(["Hello world", "Second line"], 6), "Inter", "white", "bold", 48, ARABIC_FALLBACK_FONT);
  ok(!assLatinOnly.includes("SawtifyAr"), "Pas de style de secours quand il n'y a pas d'arabe");
  ok(!ass.includes("[excited]"), "Les balises vocales sont retirées des captions");

  section("Rendu FFmpeg réel — mode voix (9:16, captions incrustées)");
  const captionsVoice = buildTimedCaptions([], chunks, voiceTotal);
  const assVoice = buildCaptionsAss(captionsVoice, "Inter", "yellow", "bold", 48, ARABIC_FALLBACK_FONT);
  const fontsDir = stageFontsForJob("voice-job", "Inter", WORK_DIR);
  const captionsPathVoice = path.join(WORK_DIR, "voice-captions.ass");
  writeFileSync(captionsPathVoice, assVoice, "utf8");
  const outputPathVoice = path.join(WORK_DIR, "voice-result.mp4");
  const argsVoice = buildMontageFfmpegArgs({ clips, segments: segmentsVoice, audioMode: "voice", audioPath: clipA, captionsPath: captionsPathVoice, fontsDir, outputPath: outputPathVoice, targetDuration: voiceTotal });
  await runFfmpeg(ffmpegPath, argsVoice);
  ok(existsSync(outputPathVoice) && (await probeMediaStreams(ffmpegPath, outputPathVoice)).duration !== null, `MP4 rendu en mode voix (${((await probeMediaStreams(ffmpegPath, outputPathVoice)).duration ?? 0).toFixed(2)} s)`);

  section("Rendu FFmpeg réel — mode audio d'origine (mélange vidéo muette + image)");
  const silentClip = path.join(WORK_DIR, "silent.mp4");
  await runFfmpeg(ffmpegPath, ["-y", "-f", "lavfi", "-i", "testsrc=size=600x900:rate=30:duration=5", "-c:v", "libx264", "-preset", "ultrafast", silentClip]);
  const clipsMixed: MontageClip[] = [
    { id: "s", name: "S", kind: "video", path: silentClip, duration: 5, hasAudio: false },
    { id: "b", name: "B", kind: "video", path: clipB, duration: probeB.duration, hasAudio: true },
    { id: "c", name: "C", kind: "image", path: imageC, duration: null, hasAudio: false },
  ];
  const segmentsOriginal = [
    { clip: 0, start: 0, end: 3 },
    { clip: 1, start: 0.5, end: 4.5 },
    { clip: 2, start: 0, end: 2, freeze: 1 },
  ];
  const assOriginal = buildCaptionsAss(evenCaptions(["Premier plan", "التفاصيل مهمة", "Fin"], 10), "Tajawal", "white", "boxed", 44, ARABIC_FALLBACK_FONT);
  const captionsPathOriginal = path.join(WORK_DIR, "original-captions.ass");
  writeFileSync(captionsPathOriginal, assOriginal, "utf8");
  const fontsDirOriginal = stageFontsForJob("original-job", "Tajawal", WORK_DIR);
  const outputPathOriginal = path.join(WORK_DIR, "original-result.mp4");
  const argsOriginal = buildMontageFfmpegArgs({ clips: clipsMixed, segments: segmentsOriginal, audioMode: "original", audioPath: null, captionsPath: captionsPathOriginal, fontsDir: fontsDirOriginal, outputPath: outputPathOriginal, targetDuration: null });
  await runFfmpeg(ffmpegPath, argsOriginal);
  const probeOriginal = await probeMediaStreams(ffmpegPath, outputPathOriginal);
  ok(existsSync(outputPathOriginal) && probeOriginal.hasAudio, `MP4 rendu en mode original, avec audio continu (${(probeOriginal.duration ?? 0).toFixed(2)} s)`);
  ok(Math.abs((probeOriginal.duration ?? 0) - 10) < 0.6, `Durée = somme des segments + gel (≈10 s → ${probeOriginal.duration?.toFixed(2)})`);

  section("Plan de secours (sans Gemini)");
  const fallback = fallbackSegments(clips, 12);
  ok(fallback.length === clips.length, "Chaque rush est utilisé une fois");
  ok(Math.abs(plannedDurationSeconds(fallback) - 12) < 1, `Somme ≈ durée cible (${plannedDurationSeconds(fallback).toFixed(2)} ≈ 12)`);

  console.log(`\n${"═".repeat(74)}`);
  console.log(`  Résumé : ${pass} OK, ${fail} KO`);
  console.log(`  Sorties : ${WORK_DIR}`);
  console.log(`${"═".repeat(74)}`);
  process.exit(fail ? 1 : 0);
};

main().catch((error) => {
  console.error("Erreur fatale :", error);
  process.exit(1);
});
