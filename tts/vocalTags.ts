/**
 * ============================================================================
 *  SAWTIFY — CATALOGUE DES SONS HUMAINS (balises vocales inline)
 * ============================================================================
 *  Source : documentation officielle Gemini 3.8 TTS (24/09/2026)
 *  → « Vocal bursts and non-speech sounds »
 *
 *  RÈGLE ABSOLUE : Gemini 3.8 n'accepte que les sons **HUMAINS**, entre
 *  crochets ANGLE `<...>`. Les bruitages (applaudissements, coups, portes…)
 *  sont explicitement déconseillés par Google et dégradent la qualité audio.
 *
 *  Ancien système (gemini-3.1) : crochets CARRÉS `[excited]` = SUPPRIMÉ.
 *  Nouveau système (gemini-3.8) : crochets ANGLE `<laugh>` = OBLIGATOIRE.
 * ============================================================================
 */

export type TagCategory =
  | "rire"
  | "emotion_forte"
  | "tristesse"
  | "respiration"
  | "voix"
  | "silence";

export type VocalTag = {
  /** Balise canonique à insérer dans le transcript (minuscules, crochets angle). */
  tag: string;
  /** Variantes officielles acceptées par Google, normalisées vers `tag`. */
  aliases?: string[];
  /** 🇫🇷 Écritures FRANÇAISES acceptées (normalisées vers `tag`). */
  aliasesFr?: string[];
  /** 🇩🇿 Écritures ARABES acceptées (normalisées vers `tag`). */
  aliasesAr?: string[];
  category: TagCategory;
  /** Libellé français (interface / documentation). */
  fr: string;
  /** Libellé arabe (darija, interface / documentation). */
  ar: string;
  /** Émotion principale associée — sert au style turn-level si l'utilisateur n'en donne pas. */
  styleHint?: string;
  /** true si le son est un silence (pas un son vocal). */
  isPause?: boolean;
};

/**
 * Les 35 sons humains officiellement supportés par Gemini 3.8 TTS.
 *
 * ⚠️ SUR LES LANGUES :
 * Google n'accepte QUE les balises en ANGLAIS (`<laugh>`, `<sigh>`…) et
 * recommande explicitement de les garder en anglais même dans un texte
 * arabe, pour la meilleure qualité audio. Mais un utilisateur algérien
 * écrit naturellement `<rire>` ou `<ضحكة>`.
 *
 * → Le catalogue accepte donc les TROIS écritures et les normalise
 *   TOUJOURS vers la balise anglaise officielle avant l'envoi.
 *   Le modèle ne reçoit jamais autre chose que l'anglais : la qualité est
 *   préservée, et l'utilisateur écrit dans sa langue.
 */
export const VOCAL_TAGS: VocalTag[] = [
  // ─── RIRE & JOIE ─────────────────────────────────────────────────────────
  { tag: "<laugh>", aliases: ["<laughter>"], aliasesFr: ["<rire>", "<rires>", "<fou rire>"], aliasesAr: ["<ضحكة>", "<ضحك>", "<قهقهة خفيفة>"], category: "rire", fr: "Rire", ar: "ضحكة", styleHint: "cheerful and amused" },
  { tag: "<giggle>", aliasesFr: ["<gloussement>", "<rire leger>", "<petit rire>"], aliasesAr: ["<ضحكة خفيفة>", "<ضحكة صغيرة>"], category: "rire", fr: "Rire léger / gloussement", ar: "ضحكة خفيفة", styleHint: "playful and light" },
  { tag: "<chuckle>", aliases: ["<chuckles>"], aliasesFr: ["<rire etouffe>", "<ricanement doux>"], aliasesAr: ["<ضحكة مكتومة>", "<ضحكة خفيفة مكتومة>"], category: "rire", fr: "Rire étouffé", ar: "ضحكة مكتومة", styleHint: "warm and amused" },
  { tag: "<cackle>", aliasesFr: ["<rire aigu>", "<rire franc>", "<rire sonore>"], aliasesAr: ["<قهقهة>", "<ضحك بصوت عالي>"], category: "rire", fr: "Rire aigu / franc", ar: "قهقهة", styleHint: "loud and laughing" },
  { tag: "<snicker>", aliasesFr: ["<ricanement>", "<rire moqueur>"], aliasesAr: ["<سخرية>", "<ضحكة ساخرة>"], category: "rire", fr: "Ricanement", ar: "سخرية خفيفة", styleHint: "sly and amused" },
  { tag: "<cheer>", aliasesFr: ["<acclamation>", "<hourra>", "<bravo>"], aliasesAr: ["<هتاف>", "<تصفيق فرح>", "<فرحة>"], category: "rire", fr: "Acclamation joyeuse", ar: "هتاف فرح", styleHint: "celebratory and energetic" },

  // ─── ÉMOTIONS FORTES ─────────────────────────────────────────────────────
  { tag: "<gasp>", aliasesFr: ["<surprise>", "<souffle coupe>", "<stupeur>"], aliasesAr: ["<شهقة>", "<مفاجأة>", "<شهقة مفاجأة>"], category: "emotion_forte", fr: "Surprise (souffle coupé)", ar: "شهقة مفاجأة", styleHint: "surprised and breathless" },
  { tag: "<scream>", aliasesFr: ["<cri>", "<hurlement>"], aliasesAr: ["<صرخة>", "<صراخ>"], category: "emotion_forte", fr: "Cri", ar: "صرخة", styleHint: "terrified or exhilarated, screaming" },
  { tag: "<shout>", aliasesFr: ["<exclamation>", "<cri fort>"], aliasesAr: ["<صياح>", "<نظرة قوية>"], category: "emotion_forte", fr: "Exclamation forte", ar: "صياح", styleHint: "loud and forceful" },
  { tag: "<shriek>", aliasesFr: ["<cri perçant>", "<cri aigu>"], aliasesAr: ["<صرخة حادة>"], category: "emotion_forte", fr: "Cri perçant", ar: "صرخة حادة", styleHint: "high-pitched and startled" },
  { tag: "<grr>", aliasesFr: ["<grognement>", "<enerve>", "<agace>"], aliasesAr: ["<تذمر>", "<غضب خفيف>"], category: "emotion_forte", fr: "Grognement de colère", ar: "تذمر", styleHint: "annoyed and growling" },
  { tag: "<growl>", aliasesFr: ["<grondement>", "<menace>"], aliasesAr: ["<هدير>", "<دمدمة غاضبة>"], category: "emotion_forte", fr: "Grondement", ar: "هدير غاضب", styleHint: "low and menacing" },
  { tag: "<argh>", aliasesFr: ["<exasperation>", "<ras le bol>", "<zut>"], aliasesAr: ["<تأفف>", "<يا حسراه>", "<طفح الكيل>"], category: "emotion_forte", fr: "Exaspération", ar: "تأفف", styleHint: "frustrated" },
  { tag: "<tsk>", aliasesFr: ["<claquement de langue>", "<desapprobation>"], aliasesAr: ["<لثغة>", "<استنكار>", "<لثغة استنكار>"], category: "emotion_forte", fr: "Claquement de langue (désapprobation)", ar: "لثغة استنكار", styleHint: "disapproving" },
  { tag: "<pff>", aliases: ["<phew>"], aliasesFr: ["<soupir blase>", "<soulagement>"], aliasesAr: ["<تنفس الصعداء>", "<ارتياح>"], category: "emotion_forte", fr: "Soupir de soulagement / blasé", ar: "تنفس الصعداء", styleHint: "relieved or unimpressed" },
  { tag: "<snort>", aliasesFr: ["<reniflement>", "<derision>"], aliasesAr: ["<استنشاق ساخر>"], category: "emotion_forte", fr: "Reniflement (dérision)", ar: "استنشاق ساخر", styleHint: "derisive" },

  // ─── TRISTESSE ───────────────────────────────────────────────────────────
  { tag: "<cry>", aliasesFr: ["<pleurs>", "<pleurer>", "<sanglots>"], aliasesAr: ["<بكاء>", "<عياط>"], category: "tristesse", fr: "Pleurs", ar: "بكاء", styleHint: "crying and emotional" },
  { tag: "<sob>", aliasesFr: ["<sanglot>", "<sangloter>"], aliasesAr: ["<نشيج>", "<بكاء مكتوم>"], category: "tristesse", fr: "Sanglot", ar: "نشيج", styleHint: "sobbing, voice breaking" },
  { tag: "<whimper>", aliasesFr: ["<gemissement>", "<plainte faible>"], aliasesAr: ["<أنين>", "<أنين خفيف>"], category: "tristesse", fr: "Gémissement faible", ar: "أنين خفيف", styleHint: "weak and distressed" },
  { tag: "<moan>", aliasesFr: ["<plainte>", "<ronchonnement>"], aliasesAr: ["<توجع>"], category: "tristesse", fr: "Gémissement", ar: "توجع", styleHint: "pained" },
  { tag: "<groan>", aliasesFr: ["<rale>", "<plainte grave>"], aliasesAr: ["<تأوه>", "<تعب>"], category: "tristesse", fr: "Râle / plainte", ar: "تأوه", styleHint: "weary and pained" },

  // ─── RESPIRATION & CORPS ─────────────────────────────────────────────────
  { tag: "<breath>", aliasesFr: ["<respiration>", "<souffle>"], aliasesAr: ["<نفس>", "<تنفس>"], category: "respiration", fr: "Respiration", ar: "نفس", styleHint: "speaking with natural breath" },
  { tag: "<heavy breath>", aliasesFr: ["<respiration lourde>", "<souffle lourd>"], aliasesAr: ["<نفس ثقيل>", "<تنفس عميق>"], category: "respiration", fr: "Respiration lourde", ar: "نفس ثقيل", styleHint: "out of breath" },
  { tag: "<exhales>", aliasesFr: ["<expiration>", "<souffler>", "<soupir long>"], aliasesAr: ["<زفير>", "<إخراج النفس>"], category: "respiration", fr: "Expiration", ar: "زفير", styleHint: "exhaling slowly" },
  { tag: "<pant>", aliasesFr: ["<haletement>", "<essouffle>"], aliasesAr: ["<لهاث>", "<لهثة>"], category: "respiration", fr: "Halètement", ar: "لهاث", styleHint: "out of breath, panting" },
  { tag: "<sigh>", aliases: ["<sighs>"], aliasesFr: ["<soupir>", "<soupirs>", "<soupirer>"], aliasesAr: ["<تنهد>", "<تنهيدة>", "<زفرة>"], category: "respiration", fr: "Soupir", ar: "تنهد", styleHint: "weary" },
  { tag: "<yawn>", aliasesFr: ["<baillement>", "<baille>"], aliasesAr: ["<تثاؤب>", "<تعب ونعاس>"], category: "respiration", fr: "Bâillement", ar: "تثاؤب", styleHint: "tired and drowsy" },
  { tag: "<sneeze>", aliasesFr: ["<eternuement>", "<atchoum>"], aliasesAr: ["<عطسة>", "<عطس>"], category: "respiration", fr: "Éternuement", ar: "عطسة", styleHint: "natural" },
  { tag: "<cough>", aliasesFr: ["<toux>", "<tousser>"], aliasesAr: ["<كحة>", "<سعال>", "<كح>"], category: "respiration", fr: "Toux", ar: "كحة", styleHint: "natural" },
  { tag: "<throat-clearing>", aliasesFr: ["<raclement de gorge>", "<toux legere>"], aliasesAr: ["<تنحنح>", "<تجهيز الصوت>"], category: "respiration", fr: "Raclement de gorge", ar: "تنحنح", styleHint: "clearing throat, slightly nervous" },

  // ─── VOIX ────────────────────────────────────────────────────────────────
  { tag: "<whispers>", aliases: ["<whispering>"], aliasesFr: ["<chuchotement>", "<chuchoter>", "<murmure>"], aliasesAr: ["<همس>", "<همس خفيف>"], category: "voix", fr: "Chuchotement", ar: "همس", styleHint: "whispering" },
  { tag: "<hiss>", aliasesFr: ["<sifflement>", "<chut>", "<chuut>"], aliasesAr: ["<خشخشة>", "<صوت السكون>"], category: "voix", fr: "Sifflement (chut)", ar: "صوت الخشخشة", styleHint: "hissing softly" },
  { tag: "<grunt>", aliasesFr: ["<grommellement>", "<marmonner>"], aliasesAr: ["<دمدمة>", "<كلام غير واضح>"], category: "voix", fr: "Grommellement", ar: "دمدمة", styleHint: "effortful and terse" },

  // ─── SILENCES ────────────────────────────────────────────────────────────
  { tag: "<short pause>", aliasesFr: ["<pause courte>", "<petite pause>", "<courte pause>"], aliasesAr: ["<وقفة قصيرة>", "<سكتة قصيرة>"], category: "silence", fr: "Petite pause", ar: "وقفة قصيرة", isPause: true },
  { tag: "<long pause>", aliasesFr: ["<pause longue>", "<grande pause>"], aliasesAr: ["<وقفة طويلة>", "<سكتة طويلة>"], category: "silence", fr: "Longue pause", ar: "وقفة طويلة", isPause: true },
];

/**
 * Normalise une écriture de balise pour la recherche :
 * minuscules, accents latins retirés, diacritiques arabes retirés,
 * variantes de lettres arabes unifiées, espaces réduits.
 *
 * Permet à `<rire léger>`, `<rire leger>` et `<RIRE  LÉGER>` de matcher
 * la même entrée, de même que `<تأفّف>` et `<تأفف>`.
 */
export function normalizeTagKey(raw: string): string {
  return String(raw)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    // accents latins (é → e, ç → c…) + diacritiques arabes (tashkeel)
    .replace(/[\u0300-\u036f\u064b-\u0652\u0670\u06d6-\u06ed]/g, "")
    // unification des lettres arabes : أ إ آ → ا ، ة → ه ، ى → ي
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0649/g, "\u064a")
    .replace(/[\u0640]/g, "") // tatweel (ـــ)
    .replace(/\s+/g, " ")
    .trim();
}

/** Clé de recherche normalisée (sans les chevrons). */
const tagKeyOf = (s: string) => normalizeTagKey(String(s).replace(/^<|>$/g, ""));

/** Index canonique : toute écriture (anglaise, française, arabe) → tag officiel. */
const TAG_INDEX: Map<string, VocalTag> = (() => {
  const m = new Map<string, VocalTag>();
  const register = (t: VocalTag, writings: (string[] | undefined)[]) => {
    for (const list of writings) {
      for (const w of list || []) {
        const k = tagKeyOf(w);
        if (k && !m.has(k)) m.set(k, t);
      }
    }
    m.set(tagKeyOf(t.tag), t);
  };
  for (const t of VOCAL_TAGS) {
    register(t, [t.aliases, t.aliasesFr, t.aliasesAr]);
  }
  return m;
})();

/**
 * Ancien vocabulaire Sawtify (celui de gemini-3.1, à crochets CARRÉS).
 * Conservé UNIQUEMENT pour la détection/nettoyage : ces balises ne doivent
 * JAMAIS atteindre Gemini 3.8 (il les lirait à voix haute).
 */
/**
 * ⚠️ À NE PAS CONFONDRE — c'est l'erreur qui a rendu 5 effets « morts » :
 *
 *   • une BALISE (`<laugh>`) est un bruit PONCTUEL : elle ne dure qu'un instant ;
 *   • un TON (« calme », « énergique ») est SOUTENU : il dure toute la lecture.
 *
 * Google n'expose donc AUCUNE balise pour dire « calme » ou « énergique » —
 * ces intentions passent par `speech_metadata.style`. Mapper `[calm]` vers
 * « rien » était faux : l'utilisateur avait explicitement demandé un ton.
 *
 * Trois familles :
 *   • `tag`   → il existe une balise officielle équivalente → on l'émet ;
 *   • `style` → aucun équivalent en balise → on envoie une instruction de TON ;
 *   • `none`  → la balise demandait déjà le comportement par défaut → rien à faire.
 *
 * Les instructions de ton restent COURTES à dessein : la documentation Google
 * précise que « extra prompt text increases drift ».
 */
export type LegacySquareMapping =
  | { kind: "tag"; tag: string }
  | { kind: "tone"; style: string }
  | { kind: "delivery"; style: string }
  | { kind: "none" };

export const LEGACY_SQUARE_TAGS: Record<string, LegacySquareMapping> = {
  // ── Équivalent direct en balise officielle (bruit ponctuel) ──
  whispers: { kind: "tag", tag: "<whispers>" },
  whisper: { kind: "tag", tag: "<whispers>" },
  laughter: { kind: "tag", tag: "<laugh>" },
  laughs: { kind: "tag", tag: "<laugh>" },
  breathing: { kind: "tag", tag: "<breath>" },
  sighs: { kind: "tag", tag: "<sigh>" },

  // ── HUMAIS : aucune balise ne décrit un ton ──
  // Le style étant SOUTENU, il s'applique dès le premier mot : c'est exactement
  // ce que promet la pop-up « Comment la voix doit-elle commencer ? ».
  //
  // ⚠️ UN SEUL ton par lecture. L'ancienne syntaxe 3.1 permettait de changer de
  // ton EN PLEIN MILIEU du texte (« [excited] … [calm] … »). C'est impossible
  // en 3.8 : `speech_metadata.style` dure toute la réplique. Cumuler
  // « excité » ET « calme » enverrait une consigne contradictoire au modèle —
  // donc le PREMIER ton gagne, et les suivants sont signalés à l'utilisateur.
  calm: { kind: "tone", style: "calm and composed from the very first word, soft and soothing throughout" },
  excited: { kind: "tone", style: "excited and enthusiastic, high energy from the very first word" },
  dramatic: { kind: "tone", style: "dramatic and captivating, with weight on the key words" },
  serious: { kind: "tone", style: "serious and formal, measured delivery" },

  // ── FAÇON DE DIRE : complémentaire, donc cumulable avec un ton ──
  // « [excited] [articulated] » doit donner l'énergie ET la diction nette.
  articulated: { kind: "delivery", style: "clear and precise articulation, every consonant well pronounced" },
  fast: { kind: "delivery", style: "fast-paced, brisk delivery without slurring" },

  // ── Déjà le comportement par défaut : rien à ajouter ──
  natural: { kind: "none" },
};

/**
 * Bruitages NON HUMAINS — explicitement déconseillés par Google
 * (« Avoid non-vocal sound-effect tags such as applause or thuds »).
 * On les retire et on prévient, au lieu de laisser le modèle produire
 * un audio dégradé.
 */
export const FORBIDDEN_SFX: string[] = [
  "applause", "clapping", "cheering crowd", "thud", "bang", "gunshot",
  "door", "glass", "explosion", "car", "siren", "bell", "music",
  "applaudissements", "bruit", "sonnerie", "musique",
];

export type ParsedTranscript = {
  /** Transcript nettoyé, prêt à envoyer à Gemini (tags angle valides uniquement). */
  text: string;
  /** Balises valides trouvées, dans l'ordre d'apparition. */
  tags: VocalTag[];
  /** Balises `<...>` inconnues de Google — retirées, signalées pour avertissement. */
  unknownTags: string[];
  /** Anciennes balises `[...]` détectées et converties/retirées. */
  legacyTagsFound: string[];
  /** Bruitages non humains détectés et retirés. */
  forbiddenSfx: string[];
    /** Style suggéré, déduit de la 1re balise « porteuse d'émotion » trouvée. */
    suggestedStyle: string | null;
    /**
     * Ton RÉELLEMENT DEMANDÉ par l'utilisateur, via une ancienne balise à
     * crochets carrés (`[calm]`, `[excited]`, `[dramatic]`…).
     *
     * Différence capitale avec `suggestedStyle` :
     *   • `suggestedStyle` est DÉDUIT d'un bruit entendu dans le texte
     *     (« il y a un <laugh>, donc le ton est joyeux ») — c'est une invention,
     *     et c'est pour ça qu'il n'est plus utilisé par défaut ;
     *   • `requestedStyle` est une DEMANDE EXPLICITE de l'utilisateur. On ne
     *     l'invente pas, on la transmet : elle est donc TOUJOURS honorée,
     *     indépendamment de `autoStyle`.
     */
    requestedStyle: string | null;
    /**
     * Tons refusés parce qu'un seul ton par lecture est possible en 3.8.
     * Ex. « [excited] … [calm] … » : le 1er gagne, `calm` atterrit ici — et
     * l'utilisateur est prévenu au lieu de croire que son 2e réglage a agi.
     */
    droppedTones: string[];
    /**
     * Les balises à crochets carrés RÉELLEMENT honorées, dans l'ordre.
     *
     * Sert au mode 3.1 : ce mode comprend NATIVEMENT `[calm]`, `[excited]`…
     * (c'est même écrit dans ses DIRECTOR'S NOTES). On les lui rend donc telles
     * quelles, au lieu de les traduire en style comme en 3.8.
     */
    honoredLegacyTags: string[];
  /** Balises écrites en français et automatiquement traduites vers l'anglais. */
  translatedFromFrench: string[];
  /** Balises écrites en arabe et automatiquement traduites vers l'anglais. */
  translatedFromArabic: string[];
};

/**
 * Analyse et nettoie un transcript destiné à Gemini 3.8 TTS.
 *
 * RÈGLE DE SÉCURITÉ FONDAMENTALE :
 *   • `<...>` = l'utilisateur veut un SON → si la balise n'est pas reconnue,
 *     elle est RETIRÉE. Jamais laissée dans le texte, sinon Gemini la
 *     PRONONCE (« <ضحكة> » deviendrait le mot « ضحكة » lu à voix haute).
 *   • `[...]` = l'utilisateur veut un MOT PRONONCÉ → si elle n'est pas une
 *     ancienne balise connue, elle est CONSERVÉE telle quelle.
 *     (« [مهتم] », « [promo] »… doivent être lus, pas transformés en son.)
 *
 * Traductions automatiques acceptées → toujours normalisées vers l'ANGLAIS
 * officiel, seule forme garantie par Google pour la qualité audio :
 *   `<rire>`  → `<laugh>`
 *   `<ضحكة>`  → `<laugh>`
 *   `[excited]` (ancien) → `<cheer>`
 */
export function parseTranscript(raw: string): ParsedTranscript {
  const tags: VocalTag[] = [];
  const unknownTags: string[] = [];
  const legacyTagsFound: string[] = [];
  /** Tons demandés explicitement via `[calm]`, `[excited]`… (voir requestedStyle). */
  const requestedTones: string[] = [];
  /** Façons de dire demandées (`[articulated]`, `[fast]`) — cumulables avec un ton. */
  const requestedDeliveries: string[] = [];
  /** Tons refusés faute de place : un seul ton par lecture (le 1er gagne). */
  const droppedTones: string[] = [];
  /** Balises `[...]` honorées, rendues telles quelles au mode 3.1. */
  const honoredLegacyTags: string[] = [];
  const forbiddenSfx: string[] = [];
  const translatedFromFrench: string[] = [];
  const translatedFromArabic: string[] = [];

  let text = raw;

  // 1) Bruitages non humains : « [applause] », « <applause> », texte libre.
  for (const sfx of FORBIDDEN_SFX) {
    const re = new RegExp(`[<\\[]\\s*${sfx}\\s*[>\\]]`, "gi");
    if (re.test(text)) {
      forbiddenSfx.push(sfx);
      text = text.replace(re, " ");
    }
  }

  // 2) UNE SEULE PASSE couvrant les deux syntaxes, pour que `tags` respecte
  //    l'ORDRE RÉEL dans le texte (sinon une balise carrée en fin de phrase
  //    remonterait artificiellement en tête et fausserait le style déduit).
  //
  //    ⚠️ Pour les chevrons, on capture TOUT caractère (`[^<>]+`) et pas
  //    seulement l'alphabet latin : c'est indispensable pour attraper
  //    `<ضحكة>` et `<rire>`. Un motif limité à a-zA-Z laisserait passer une
  //    balise arabe, que Gemini lirait alors à voix haute.
  text = text.replace(
    /\[([^\]]+)\]|<\s*([^<>]+?)\s*>/g,
    (match, square: string | undefined, angle: string | undefined) => {
      // ── Ancienne syntaxe carrée (mode 3.1 / saisie utilisateur) ──
      if (square !== undefined) {
        const raw = String(square).trim();
        const key = raw.toLowerCase();

        // Un mot NON latin entre crochets n'est jamais une balise : il doit
        // être PRONONCÉ. Ex. « [مهتم] », « [فيديو] ». On le laisse intact.
        if (/[^\x00-\x7F]/.test(raw)) return match;

          if (!(key in LEGACY_SQUARE_TAGS)) return match; // ex. « [promo] » → prononcé
          legacyTagsFound.push(key);
          const mapping = LEGACY_SQUARE_TAGS[key];

          // Déjà le comportement par défaut → simple retrait (« [natural] »).
          if (mapping.kind === "none") return " ";

          // Aucune balise ne décrit un TON → on le transmet via le style.
          if (mapping.kind === "tone" || mapping.kind === "delivery") {
            // Un seul TON par lecture (le style dure toute la réplique) ; les
            // consignes de diction, elles, se cumulent.
            const doublon = [...requestedTones, ...requestedDeliveries].includes(mapping.style);
            const tonDejaPris = mapping.kind === "tone" && requestedTones.length > 0;
            if (doublon) {
              // Même demande deux fois : ce n'est pas un conflit, rien à faire.
            } else if (tonDejaPris) {
              if (!droppedTones.includes(key)) droppedTones.push(key);
            } else {
              (mapping.kind === "tone" ? requestedTones : requestedDeliveries).push(mapping.style);
              honoredLegacyTags.push(key);
            }
            return " ";
          }

          // Équivalent officiel en bruit ponctuel (« [laughter] » → « <laugh> »).
          const official = TAG_INDEX.get(tagKeyOf(mapping.tag));
          if (official && !tags.includes(official)) tags.push(official);
          return official ? official.tag : mapping.tag;
      }

      // ── Nouvelle syntaxe angle (Gemini 3.8) ──
      const raw = String(angle).trim();
      const official = TAG_INDEX.get(tagKeyOf(raw));

      if (!official) {
        // Balise inconnue (peu importe la langue) → RETIRÉE.
        // Ne JAMAIS la laisser : Gemini la prononcerait.
        unknownTags.push(`<${raw}>`);
        return " ";
      }

      if (!tags.includes(official)) tags.push(official);

      // Journal : la balise a-t-elle été écrite dans une autre langue ?
      const asFr = (official.aliasesFr || []).some((a) => tagKeyOf(a) === tagKeyOf(raw));
      const asAr = (official.aliasesAr || []).some((a) => tagKeyOf(a) === tagKeyOf(raw));
      if (asFr && !translatedFromFrench.includes(raw)) translatedFromFrench.push(raw);
      if (asAr && !translatedFromArabic.includes(raw)) translatedFromArabic.push(raw);

      return official.tag; // toujours la forme ANGLAISE officielle
    }
  );

  // 3) GARDE-FOU : un « < » ou un « > » ORPHELIN (sans paire) est un fragment
  //    de balise — par exemple un texte découpé en plein milieu d'une balise,
  //    ou un utilisateur qui a tapé « <laugh » sans fermer. Un tel fragment
  //    n'est pas reconnu par l'étape 2 (il n'a pas de « > ») : il partirait
  //    BRUT vers Gemini, qui risquerait de le prononcer.
  //    On le retire donc, et on le signale.
  //    On compte les chevrons qui RESTENT une fois toutes les balises bien
  //    formées retirées — jamais les chevrons des balises valides.
  const restant = text.replace(/<[^<>\n]*>/g, "");
  const nbOrphelins = (restant.match(/[<>]/g) || []).length;
  if (nbOrphelins > 0) {
    unknownTags.push(`fragment de balise sans paire (${nbOrphelins})`);
    // On remplace soit une balise complète (inchangée), soit un chevron orphelin.
    text = text.replace(/<[^<>\n]*>|[<>]/g, (m) => (m.length === 1 ? " " : m));
  }

  // 4) Espaces propres (sans toucher aux retours à la ligne significatifs).
  text = text.replace(/[ \t]{2,}/g, " ").replace(/ +([,.;!?؟،؛:])/g, "$1").trim();

    // 5) Style suggéré : première balise porteuse d'une émotion, hors silences.
    //    L'ordre est celui du texte (garanti par la passe unique ci-dessus).
    const withStyle = tags.find((t) => !t.isPause && t.styleHint);
    const suggestedStyle = withStyle?.styleHint ?? null;

    // 5bis) Ton DEMANDÉ par l'utilisateur (balises à crochets carrés).
    //       Le TON vient en premier, la FAÇON DE DIRE ensuite :
    //       « [excited] [articulated] » → énergie + diction nette.
    const demande = [...requestedTones, ...requestedDeliveries];
    const requestedStyle = demande.length ? demande.join(", ") : null;

    return {
      text, tags, unknownTags, legacyTagsFound, forbiddenSfx, suggestedStyle, requestedStyle,
      droppedTones, honoredLegacyTags, translatedFromFrench, translatedFromArabic,
    };
}

/** Vérifie qu'un texte ne contient QUE des balises officielles. */
export function validateTagsOnly(text: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const { unknownTags, legacyTagsFound, forbiddenSfx } = parseTranscript(text);
  for (const t of unknownTags) problems.push(`Balise inconnue de Google : ${t}`);
  for (const t of legacyTagsFound) problems.push(`Ancienne balise (crochets carrés) : [${t}]`);
  for (const t of forbiddenSfx) problems.push(`Bruitage non humain déconseillé : ${t}`);
  return { ok: problems.length === 0, problems };
}

/** Liste des balises, groupées par catégorie (pour l'interface et la doc). */
export function tagsByCategory(): Record<TagCategory, VocalTag[]> {
  const out = {} as Record<TagCategory, VocalTag[]>;
  for (const t of VOCAL_TAGS) {
    (out[t.category] ||= []).push(t);
  }
  return out;
}

/** Toutes les formes acceptées, pour l'autocomplétion côté interface. */
export function allAcceptedTagStrings(): string[] {
  const out: string[] = [];
  for (const t of VOCAL_TAGS) {
    out.push(t.tag, ...(t.aliases || []), ...(t.aliasesFr || []), ...(t.aliasesAr || []));
  }
  return out.sort();
}

/** Toutes les écritures officielles anglaises (celles envoyées à Google). */
export function officialTagStrings(): string[] {
  return VOCAL_TAGS.flatMap((t) => [t.tag, ...(t.aliases || [])]).sort();
}

/** Nombre d'écritures françaises / arabes acceptées. */
export function aliasCounts(): { officielles: number; francaises: number; arabes: number } {
  return {
    officielles: VOCAL_TAGS.reduce((n, t) => n + 1 + (t.aliases?.length || 0), 0),
    francaises: VOCAL_TAGS.reduce((n, t) => n + (t.aliasesFr?.length || 0), 0),
    arabes: VOCAL_TAGS.reduce((n, t) => n + (t.aliasesAr?.length || 0), 0),
  };
}
