/**
 * MESURER LE GENRE D'UNE VOIX — sans l'écouter, sans le deviner
 * ==============================================================
 *
 *   npm run analyser:genre
 *
 * POURQUOI CE SCRIPT EXISTE
 * -------------------------
 * Google publie 30 voix mais NE DIT PAS lesquelles sont des hommes et
 * lesquelles sont des femmes. Résultat : dans Sawtify, 21 voix sur 30 sont
 * marquées « inconnu » et le filtre Hommes / Femmes ne montre que 9 voix.
 *
 * Deviner serait malhonnête. Ici, on MESURE.
 *
 * COMMENT ÇA MARCHE (en clair)
 * ----------------------------
 * Une voix grave vibre lentement, une voix aiguë vibre vite. C'est la
 * fréquence fondamentale, en hertz (Hz) :
 *
 *     voix d'homme   :  ~85 – 155 Hz
 *     voix de femme  :  ~165 – 255 Hz
 *
 * Le script découpe chaque aperçu audio en petites tranches, mesure la
 * fréquence de chacune, garde celles où la personne parle vraiment (et pas
 * les silences), puis prend la MÉDIANE. La médiane est insensible aux
 * outliers : un toussement ne fausse pas le résultat.
 *
 * ⚠️ CE N'EST PAS UNE VÉRITÉ ABSOLUE. C'est une mesure objective qui donne
 *    une PROPOSITION. Une voix d'homme très haut perchée ou une voix de
 *    femme très grave peut se tromper de case — c'est pour ça qu'il y a une
 *    zone « incertain » et que l'oreille garde le dernier mot.
 *
 * PRÉREQUIS
 * ---------
 *   npm run apercus:voix      (nécessite ta clé API, ~3 dinars)
 *
 * puis
 *
 *   npm run analyser:genre    ← lit storage/voice-previews/*.wav
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "..");
const DOSSIER_APERCUS = path.join(RACINE, "storage", "voice-previews");
const FICHIER_RESULTAT = path.join(RACINE, "storage", "genre-mesure.json");

/* ── LES SEUILS ────────────────────────────────────────────────────────────
 * 160 Hz est le seuil classique utilisé en analyse de la parole. La bande
 * 150–175 Hz est laissée « incertaine » : y trancher au couteau serait une
 * invention, pas une mesure.                                                        */
const SEUIL_HOMME_HZ = 150;
const SEUIL_FEMME_HZ = 175;

/* ── LES VOIX DÉJÀ CONNUES ─────────────────────────────────────────────────
 * Les 9 voix algériennes de Sawtify : leur genre est un choix éditorial, pas
 * une mesure. On ne les analyse pas, on les confirme telles quelles.               */
const DEJA_CONNUES: Record<string, "male" | "female"> = {
  Puck: "male", Charon: "male", Algenib: "male", Orus: "male",
  Fenrir: "male", Sulafat: "male",
  Kore: "female", Zephyr: "female", Achernar: "female", Leda: "female",
  Aoede: "female",
};

/* ══════════════════════════════════════════════════════════════════════════
   LECTURE D'UN FICHIER WAV
   ══════════════════════════════════════════════════════════════════════════ */
interface Audio {
  ech: Float32Array; // échantillons entre -1 et 1
  hz: number;        // fréquence d'échantillonnage
}

function lireWav(chemin: string): Audio {
  const buf = fs.readFileSync(chemin);
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("ce n'est pas un fichier WAV");
  if (buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("en-tête WAVE manquante");

  let pos = 12;
  let hz = 0, canaux = 1, bits = 16;
  let data: Buffer | null = null;

  // un WAV est une suite de blocs : on cherche « fmt » puis « data »
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const taille = buf.readUInt32LE(pos + 4);
    const debut = pos + 8;
    if (id === "fmt ") {
      canaux = buf.readUInt16LE(debut + 2);
      hz = buf.readUInt32LE(debut + 4);
      bits = buf.readUInt16LE(debut + 14);
    } else if (id === "data") {
      data = buf.subarray(debut, debut + taille);
    }
    pos = debut + taille + (taille % 2); // les blocs sont alignés sur 2 octets
  }
  if (!data || !hz) throw new Error("bloc « fmt » ou « data » introuvable");
  if (bits !== 16) throw new Error(`attendu 16 bits, trouvé ${bits}`);

  // stéréo → on ne garde que le canal de gauche
  const total = Math.floor(data.length / 2 / canaux);
  const ech = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    ech[i] = data.readInt16LE(i * canaux * 2) / 32768;
  }
  return { ech, hz };
}

/* ══════════════════════════════════════════════════════════════════════════
   MESURE DE LA FRÉQUENCE FONDAMENTALE (autocorrélation)
   ══════════════════════════════════════════════════════════════════════════
   Principe : on décale le signal sur lui-même et on cherche le décalage où
   il se ressemble le plus. Ce décalage est la période de la voix ; son
   inverse est la fréquence.                                                        */
const F_MIN = 70;   // under this → not a human voice
const F_MAX = 350;  // above this → not a human voice

function periodeFondamentale(tranche: Float32Array, hz: number): number | null {
  const n = tranche.length;

  // 1. la tranche est-elle assez forte pour être de la parole ? (sinon : silence)
  let energie = 0;
  for (let i = 0; i < n; i++) energie += tranche[i] * tranche[i];
  const rms = Math.sqrt(energie / n);
  if (rms < 0.01) return null;

  // 2. on retire la composante continue (évite un faux pic à zéro)
  let moyenne = 0;
  for (let i = 0; i < n; i++) moyenne += tranche[i];
  moyenne /= n;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = tranche[i] - moyenne;

  // 3. autocorrélation, normalisée (pour ne pas favoriser les petits décalages)
  const min = Math.max(2, Math.floor(hz / F_MAX));
  const max = Math.min(n - 1, Math.floor(hz / F_MIN));

  let meilleur = -1;
  let meilleurScore = 0;
  for (let d = min; d <= max; d++) {
    let somme = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < n - d; i++) {
      somme += x[i] * x[i + d];
      e1 += x[i] * x[i];
      e2 += x[i + d] * x[i + d];
    }
    const score = somme / (Math.sqrt(e1 * e2) + 1e-12);
    if (score > meilleurScore) { meilleurScore = score; meilleur = d; }
  }

  // 4. un pic faible = pas de vraie périodicité → on rejette (bruit, souffle)
  if (meilleur < 0 || meilleurScore < 0.3) return null;
  return meilleur;
}

function mediane(valeurs: number[]): number {
  if (!valeurs.length) return 0;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

interface Mesure {
  f0: number;         // fréquence médiane, en Hz
  tranches: number;   // nombre de tranches analysées
  fiabilite: number;  // 0 à 1 : proportion de tranches exploitables
}

function mesurerF0(audio: Audio): Mesure {
  const taille = Math.round(audio.hz * 0.04); // 40 ms par tranche
  const saut = Math.round(audio.hz * 0.02);   // on avance de 20 ms
  const frequences: number[] = [];
  let total = 0;

  for (let debut = 0; debut + taille <= audio.ech.length; debut += saut) {
    total++;
    const periode = periodeFondamentale(audio.ech.subarray(debut, debut + taille), audio.hz);
    if (periode) {
      const f = audio.hz / periode;
      if (f >= F_MIN && f <= F_MAX) frequences.push(f);
    }
  }

  return {
    f0: mediane(frequences),
    tranches: frequences.length,
    fiabilite: total ? frequences.length / total : 0,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   PROGRAMME
   ══════════════════════════════════════════════════════════════════════════ */
const ligne = (s = "") => console.log(s);
const verdict = (ok: boolean, quoi: string, detail = "") =>
  ligne(`  ${ok ? "✅" : "⚠️ "} ${quoi}${detail ? ` — ${detail}` : ""}`);

ligne();
ligne("  ╔══════════════════════════════════════════════════════════════════════╗");
ligne("  ║   MESURE DU GENRE DES VOIX — npm run analyser:genre                  ║");
ligne("  ╚══════════════════════════════════════════════════════════════════════╝");
ligne();

if (!fs.existsSync(DOSSIER_APERCUS)) {
  ligne("  ❌ Aucun aperçu audio trouvé.");
  ligne();
  ligne("     Il faut d'abord écouter les voix, donc les fabriquer :");
  ligne();
  ligne("         npm run apercus:voix        (nécessite ta clé API, ~3 dinars)");
  ligne();
  ligne("     Puis relance :");
  ligne();
  ligne("         npm run analyser:genre");
  ligne();
  process.exit(1);
}

const fichiers = fs.readdirSync(DOSSIER_APERCUS).filter(f => f.toLowerCase().endsWith(".wav")).sort();
if (!fichiers.length) {
  ligne("  ❌ Le dossier des aperçus est vide.");
  ligne("     Lance d'abord :  npm run apercus:voix");
  ligne();
  process.exit(1);
}

ligne(`  ${fichiers.length} aperçu(s) audio trouvé(s). Analyse…`);
ligne();
ligne("  ──────────────────────────────────────────────────────────────────────");
ligne("    nom            voix       fréquence    ce que ça dit");
ligne("  ──────────────────────────────────────────────────────────────────────");

const resultats: Record<string, { f0: number; genre: string; fiabilite: number }> = {};
let homme = 0, femme = 0, incertain = 0, echecs = 0;

for (const fichier of fichiers) {
  const nomVoix = path.basename(fichier, ".wav");
  try {
    const audio = lireWav(path.join(DOSSIER_APERCUS, fichier));
    const duree = audio.ech.length / audio.hz;

    if (duree < 0.4) {
      ligne(`  ${nomVoix.padEnd(14)} — trop court (${duree.toFixed(2)} s), ignoré`);
      echecs++;
      continue;
    }

    const m = mesurerF0(audio);
    if (!m.tranches || m.f0 <= 0) {
      ligne(`  ${nomVoix.padEnd(14)} — aucune voix détectée (silence ?)`);
      echecs++;
      continue;
    }

    let genre: string, dit: string;
    if (m.f0 < SEUIL_HOMME_HZ) { genre = "homme"; dit = "grave → voix d'homme"; homme++; }
    else if (m.f0 > SEUIL_FEMME_HZ) { genre = "femme"; dit = "aiguë → voix de femme"; femme++; }
    else { genre = "incertain"; dit = "entre les deux → à trancher à l'oreille"; incertain++; }

    const connue = DEJA_CONNUES[nomVoix];
    const marque = connue ? (connue === genre ? " ✓" : " ⚠️ contredit le catalogue") : "";
    ligne(`  ${nomVoix.padEnd(14)} ${String(Math.round(m.f0)).padStart(4)} Hz    ${dit}${marque}`);

    resultats[nomVoix] = { f0: Math.round(m.f0), genre, fiabilite: Number(m.fiabilite.toFixed(2)) };
  } catch (e: any) {
    ligne(`  ${nomVoix.padEnd(14)} — illisible : ${e.message}`);
    echecs++;
  }
}

ligne("  ──────────────────────────────────────────────────────────────────────");
ligne();
ligne(`  ${homme} voix d'homme  ·  ${femme} voix de femme  ·  ${incertain} à trancher${echecs ? `  ·  ${echecs} échec(s)` : ""}`);
ligne();

// vérification croisée : les 9 voix dont le genre est déjà choisi dans Sawtify
const contredites = Object.entries(DEJA_CONNUES)
  .filter(([nom, genre]) => resultats[nom] && resultats[nom].genre !== "incertain" && resultats[nom].genre !== genre)
  .map(([nom]) => nom);

if (contredites.length) {
  verdict(false, "la mesure contredit le catalogue", contredites.join(", "));
  ligne("     → dans ce cas, c'est l'OREILLE qui tranche, pas le chiffre.");
} else {
  const testees = Object.keys(DEJA_CONNUES).filter(n => resultats[n]);
  if (testees.length) verdict(true, `les ${testees.length} voix déjà classées : la mesure confirme`);
  else ligne("  ℹ️  aucune des 9 voix déjà classées n'est présente dans les aperçus");
}

// on enregistre la proposition : rien n'est modifié automatiquement
fs.mkdirSync(path.dirname(FICHIER_RESULTAT), { recursive: true });
fs.writeFileSync(FICHIER_RESULTAT, JSON.stringify({
  mesureLe: new Date().toISOString(),
  seuils: { homme: `< ${SEUIL_HOMME_HZ} Hz`, femme: `> ${SEUIL_FEMME_HZ} Hz` },
  resultats,
}, null, 2));

ligne();
ligne(`  📄 Proposition écrite dans : storage/genre-mesure.json`);
ligne("     RIEN N'A ÉTÉ MODIFIÉ. Ce fichier sert à décider, pas à décider tout seul.");
ligne();
ligne("     → écoute 3 ou 4 voix de la liste, vérifie que ça correspond,");
ligne("       et on mettra le catalogue à jour avec ce qui est confirmé.");
ligne();
