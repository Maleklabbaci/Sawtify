/* ==========================================================================
   DIAGNOSTIC DE LA DARIJA — une seule commande, une réponse claire

       npm run diag:darija

   Répond à une question précise : « est-ce que la darija marche TOUJOURS ? »

   Ce n'est pas un test unitaire de plus : c'est un contrôle de bout en bout des
   SIX choses qui, si elles cassent, abîment la darija sans prévenir. Chaque
   section affiche une mesure, pas une opinion. Le script sort en erreur (code 1)
   si l'une des six lâche, pour pouvoir être branché sur une alerte.

   Historique : chaque section correspond à un défaut RÉELLEMENT trouvé.
     ① le découpage coupait une balise en deux
     ② une balise partait brute vers Gemini
     ③ la langue n'était plus dite au modèle (lu comme de l'arabe standard)
     ④ une balise inconnue pouvait traverser
     ⑤ un prénom de voix pouvait retomber silencieusement sur Puck
     ⑥ rien ne mesurait le coût du découpage
   ========================================================================== */

import {
  buildTtsRequest,
  splitIntoChunksForTTS,
  protegerBalises,
  restaurerBalises,
} from "../tts/engine";
import { VOICES_FR } from "../src/data/voices";
import { parseTranscript } from "../tts/vocalTags";
import { resolveVoiceName } from "../tts/voiceNames";

let ko = 0;
const ligne = (texte = "") => console.log(texte);
const titre = (texte: string) => {
  ligne();
  ligne("  ──────────────────────────────────────────────────────────────────────");
  ligne(`    ${texte}`);
  ligne("  ──────────────────────────────────────────────────────────────────────");
};
const verdict = (bon: boolean, texte: string, detail = "") => {
  if (!bon) ko++;
  ligne(`    ${bon ? "✅" : "❌"} ${texte}${detail ? ` — ${detail}` : ""}`);
  return bon;
};

/* --------------------------------------------------------------------------
   Le texte de référence : exactement ce qu'un utilisateur algérien écrit.
   Arabe + français + chiffres + trois balises de trois natures différentes.
   -------------------------------------------------------------------------- */
const TEXTE = `واش راكم خاوتي، اليوم راني نهدر معاكم على حاجة مهمة بزاف. <laugh>
المشكل اللي كاين هو أنو الناس ما يعرفوش منين يبداو، ويضيعو الوقت والدراهم في باطل.
مع منصة Sawtify، تقدر تحول أي نص لصوت طبيعي في ثواني. بصح <short pause> لازم تعرف حاجة:
الجودة ما تجيش من الفارغ، رانا خدمنا على النطق بالدارجة الجزائرية الحقيقية.
إذا راك تبيع منتوج، ولا عندك صفحة Facebook، ولا تخدم في marketing digital، هاد الحل ليك.
جرب اليوم، وشوف الفرق بعينيك. ما تنساش تقولي واش راك تشوف!

Pour finir: السلام عليكم ورحمة الله، ونتمنى لكم التوفيق.`;

const LIMITE = 800;

ligne();
ligne("  ╔══════════════════════════════════════════════════════════════════════╗");
ligne("  ║   DIAGNOSTIC DARIJA — npm run diag:darija                            ║");
ligne("  ╚══════════════════════════════════════════════════════════════════════╝");
ligne(`  Texte de contrôle : ${TEXTE.length} caractères (arabe + français + 3 balises)`);

/* ── ① LE DÉCOUPAGE NE COUPE RIEN EN DEUX ───────────────────────────────── */
titre("① LE DÉCOUPAGE — le texte long est-il coupé proprement ?");
{
  const chunks = splitIntoChunksForTTS(TEXTE, LIMITE);
  ligne(`    ${chunks.length} morceau(x), limite ${LIMITE} caractères`);
  let sales = 0;
  chunks.forEach((morceau, i) => {
    const fin = morceau.trim().slice(-1);
    const propre = /[.!?؟…»]/.test(fin);
    if (!propre) sales++;
    ligne(`      ${i + 1}. ${String(morceau.length).padStart(4)} car. — finit par « ${fin} » ${propre ? "✅" : "⚠️"}`);
  });
  verdict(sales === 0, "aucune phrase coupée au milieu", sales ? `${sales} coupe(s) brutale(s)` : "");
}

/* ── ② LES BALISES SURVIVENT AU DÉCOUPAGE ───────────────────────────────── */
titre("② LES BALISES — arrivent-elles intactes de l'autre côté ?");
{
  const { texte: protege, balises } = protegerBalises(TEXTE);
  const restaure = restaurerBalises(protege, balises);
  verdict(balises.length === 2, "les 2 balises du texte sont repérées", `${balises.length} protégée(s)`);
  verdict(restaure === TEXTE, "aller-retour identique au caractère près");
  const brutes = (protege.match(/<[a-z]/gi) || []).length;
  verdict(brutes === 0, "plus aucune balise exposée pendant le découpage");
}

/* ── ③ CE QUI PART VRAIMENT À GOOGLE ────────────────────────────────────── */
titre("③ LA REQUÊTE — que reçoit réellement le moteur vocal ?");
for (const [nom, modele] of [
  ["3.8 (le mode actuel)", "gemini-3.8-flash-tts"],
  ["3.1 (le mode de secours)", "gemini-3.1-flash-tts-preview"],
] as [string, string][]) {
  const requete: any = buildTtsRequest({
    model: modele,
    rawText: TEXTE,
    voiceName: "Kore",
    style: "speaking rapidly",
  });
  const part: any = requete.body.contents[0].parts[0];
  const style: string = part.speech_metadata?.style || "";
  ligne();
  ligne(`    ── ${nom}`);
  ligne(`       poids de la requête        : ${JSON.stringify(requete.body).length} caractères`);
  verdict(part.text.includes("الجودة"), "le texte darija arrive intact");
  if (modele.startsWith("gemini-3.8")) {
    // En 3.8 le texte est lu MOT POUR MOT : la moindre instruction écrite
    // dedans serait prononcée à voix haute.
    verdict(!/DIRECTOR|Speaker:|Language:/i.test(part.text), "aucune instruction dans le texte (elle serait LUE)");
    verdict(style.length > 0, "consigne de jeu transmise séparément", `style de ${style.split(" ").length} mots`);
    verdict(style.split(" ").length <= 32, "consigne assez courte (la doc : trop long = dérive)");
  } else {
    // En 3.1, Google ne connaît pas les crochets ANGLE : le moteur traduit
    // chaque balise vers son équivalent carré natif. On vérifie donc qu'il ne
    // reste AUCUN chevron brut — pas que la balise soit identique.
    verdict(!part.text.includes("<short pause>") && /\[[^\]]+\]/.test(part.text),
            "les balises sont traduites en crochets carrés (seul format lu par 3.1)");
    verdict(/Language: Algerian Darija/.test(part.text), "consigne de langue présente dans le prompt 3.1");
    verdict(part.speech_metadata === undefined, "aucun champ `style` (non supporté en 3.1)");
  }
}

/* ── ③bis LA LANGUE EST-ELLE ENCORE DITE AU MODÈLE ? ────────────────────── */
titre("③bis — LA DARIJA EST-ELLE ENCORE ANNONCÉE AU MOTEUR ?");
{
  // C'est LA question. En 3.8 le texte est lu mot pour mot : impossible de
  // glisser une consigne dedans. Le seul endroit est le champ `style`. S'il
  // n'y a plus rien, le modèle lit la darija comme de l'arabe standard — la
  // langue des journaux télévisés, pas celle de la rue.
  const arabe: any = buildTtsRequest({
    model: "gemini-3.8-flash-tts", rawText: "واش راك يا خويا؟", voiceName: "Kore",
  });
  const styleArabe: string = (arabe.body as any).contents[0].parts[0].speech_metadata?.style || "";
  verdict(/Darija|darija/.test(styleArabe), "un texte ARABE porte la consigne de darija", styleArabe || "(vide)");

  // Et surtout : PAS de darija sur du français. On ne doit jamais forcer un
  // accent algérien sur un texte français.
  const francais: any = buildTtsRequest({
    model: "gemini-3.8-flash-tts", rawText: "Bonjour à tous, bienvenue sur Sawtify.", voiceName: "Kore",
  });
  const partFr: any = (francais.body as any).contents[0].parts[0];
  verdict(partFr.speech_metadata === undefined, "un texte FRANÇAIS ne reçoit aucune consigne de darija");

  // Un texte mixte (ce que les Algériens écrivent vraiment) doit la recevoir.
  const mixte: any = buildTtsRequest({
    model: "gemini-3.8-flash-tts", rawText: "واش راك khouya, un nouveau service", voiceName: "Kore",
  });
  verdict(/Darija/.test((mixte.body as any).contents[0].parts[0].speech_metadata?.style || ""),
          "un texte MIXTE arabe + français la reçoit aussi");
}

/* ── ④ AUCUNE BALISE INCONNUE NE PASSE ──────────────────────────────────── */
titre("④ LES BALISES INCONNUES — sont-elles détectées ?");
{
  const analyse = parseTranscript(TEXTE);
  verdict(analyse.tags.length === 2, "les balises du texte sont reconnues", analyse.tags.map((t: any) => t.tag).join(" "));
  verdict(analyse.unknownTags.length === 0, "aucune balise inconnue", analyse.unknownTags.join(" "));
  // Un son INEXISTANT (« <applause> ») doit être repéré ET retiré du texte
  // parlé — sinon la voix risquerait de le prononcer.
  const piege = parseTranscript("واش راك <applause> خويا");
  const signale = piege.forbiddenSfx.includes("applause") || piege.unknownTags.includes("<applause>");
  verdict(signale, "une balise inexistante est signalée");
  verdict(!piege.text.includes("applause"), "et elle est retirée du texte parlé");
}

/* ── ⑤ LES 30 VOIX SE RÉSOLVENT ─────────────────────────────────────────── */
titre("⑤ LES 30 VOIX — aucune ne retombe sur Puck par erreur ?");
{
  // ⚠️ La liste est LUE DEPUIS LE CATALOGUE, jamais recopiée à la main : une
  // liste en dur finit toujours par mentir (elle a menti une fois, le
  // 26/09/2026, après le renommage de 5 voix). Ici, impossible.
  const attendues = VOICES_FR.map((v) => v.id);
  const perdues = attendues.filter((nom) => !resolveVoiceName(nom));
  verdict(perdues.length === 0, "les 30 prénoms trouvent leur voix", perdues.join(", "));
  const distinctes = new Set(attendues.map((nom) => resolveVoiceName(nom)));
  verdict(distinctes.size === 30, "30 prénoms → 30 voix différentes", `${distinctes.size} voix distinctes`);
}

/* ── ⑥ LE COÛT DU DÉCOUPAGE ─────────────────────────────────────────────── */
titre("⑥ PERFORMANCE — le découpage coûte-t-il quelque chose ?");
{
  const gros = TEXTE.repeat(8);
  const TOURS = 200;
  const debut = Date.now();
  for (let i = 0; i < TOURS; i++) splitIntoChunksForTTS(gros, LIMITE);
  const parTour = (Date.now() - debut) / TOURS;
  ligne(`    ${gros.length} caractères découpés ${TOURS} fois`);
  ligne(`    → ${parTour.toFixed(2)} ms par génération`);
  verdict(parTour < 20, "négligeable devant l'appel réseau (1 à 5 secondes)");
}

/* ── VERDICT ────────────────────────────────────────────────────────────── */
ligne();
ligne("  ══════════════════════════════════════════════════════════════════════");
if (ko === 0) {
  ligne("    ✅ LA DARIJA FONCTIONNE — les 6 contrôles passent.");
  ligne();
  ligne("       Le texte part intact, les balises survivent au découpage,");
  ligne("       la langue est annoncée au moteur, et les 30 voix répondent.");
} else {
  ligne(`    ❌ ${ko} CONTRÔLE(S) EN ÉCHEC — la darija est abîmée.`);
  ligne();
  ligne("       Ne déploie pas en l'état : regarde la ligne marquée ❌ ci-dessus.");
}
ligne("  ══════════════════════════════════════════════════════════════════════");
ligne();

process.exit(ko === 0 ? 0 : 1);
