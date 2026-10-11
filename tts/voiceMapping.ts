import { resolveVoiceName } from "./voiceNames";

/**
 * Identifiants historiques Sawtify -> noms officiels acceptés par Gemini TTS.
 * Ne jamais envoyer `voice_amin` (ou un autre identifiant interne) à Gemini.
 */
export const VOICE_MAPPING: Readonly<Record<string, string>> = Object.freeze({
  // Personas historiques Sawtify.
  voice_amin: "Puck",
  voice_khalid: "Charon",
  voice_rashid: "Fenrir",
  voice_bilal: "Algenib",
  voice_faycal: "Orus",
  voice_yasmin: "Zephyr",
  voice_maryam: "Sulafat",
  voice_layla: "Leda",
  voice_nour: "Achernar",

  // Alias conservés pour les anciennes intégrations.
  voice_dz_amine: "Puck",
  voice_dz_yasmine: "Zephyr",
  voice_ar_sofiane: "Puck",
  voice_fr_ines: "Sulafat",
  voice_dz_rachid: "Fenrir",
  voice_en_lina: "Leda",

  // Noms officiels Gemini couramment utilisés.
  Puck: "Puck",
  Zephyr: "Zephyr",
  Charon: "Charon",
  Kore: "Kore",
  Fenrir: "Fenrir",
  Aoede: "Aoede",
  Orus: "Orus",
  Sulafat: "Sulafat",
  Leda: "Leda",
  Achernar: "Achernar",
});

const VOICE_MAPPING_LOWERCASE = new Map(
  Object.entries(VOICE_MAPPING).map(([from, to]) => [from.toLowerCase(), to]),
);

/** Convertit un identifiant interne, alias ou prénom en ID attendu par Gemini. */
export function resolveGeminiVoiceName(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "Puck";

  const mapped = VOICE_MAPPING[raw] || VOICE_MAPPING_LOWERCASE.get(raw.toLowerCase());
  if (mapped) return mapped;

  // Le résolveur des noms couvre les 30 voix, les prénoms et les slugs.
  // Ses IDs historiques sont eux-mêmes remappés juste après.
  const resolved = resolveVoiceName(raw);
  if (resolved) {
    const resolvedMapping = VOICE_MAPPING[resolved]
      || VOICE_MAPPING_LOWERCASE.get(resolved.toLowerCase());
    if (resolvedMapping) return resolvedMapping;
    return resolved;
  }

  // Les voix personnalisées Google utilisent ce préfixe et doivent rester intactes.
  if (/^voice_[A-Za-z0-9_-]{6,120}$/.test(raw)) return raw;
  return "Puck";
}
