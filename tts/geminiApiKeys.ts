export type GeminiApiKeyTier = "free" | "paid";

export type GeminiApiKeyCandidate = {
  tier: GeminiApiKeyTier;
  apiKey: string;
  /** Environment variable used; never log the secret itself. */
  sourceVariable: string;
};

export type GeminiApiKeyEnvironment = {
  GEMINI_API_KEY_FREE?: string;
  GEMINI_API_KEY_PAID?: string;
  /** Backwards-compatible name for the paid/fallback key. */
  GEMINI_API_KEY?: string;
};

const FREE_KEY_DISABLED_UNTIL = new Map<string, number>();
const PACIFIC_TIME_ZONE = "America/Los_Angeles";

function clean(value: string | undefined): string {
  return String(value || "").trim();
}

function keyScope(apiKey: string, scope: string): string {
  return `${scope.trim() || "default"}\u0000${apiKey}`;
}

function datePartsInPacific(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function pacificOffsetMilliseconds(timestamp: number): number {
  const parts = datePartsInPacific(timestamp);
  const localTimeAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localTimeAsUtc - Math.floor(timestamp / 1000) * 1000;
}

/** The Google AI Studio daily request quota resets at midnight Pacific time. */
export function nextGeminiQuotaResetAt(now = Date.now()): number {
  const current = datePartsInPacific(now);
  const nextLocalMidnightAsUtc = Date.UTC(current.year, current.month - 1, current.day + 1, 0, 0, 0);
  let guess = nextLocalMidnightAsUtc + 8 * 60 * 60 * 1000;
  // Iterate because Pacific time alternates between UTC-8 and UTC-7.
  for (let i = 0; i < 3; i++) {
    guess = nextLocalMidnightAsUtc - pacificOffsetMilliseconds(guess);
  }
  return guess;
}

function isFreeKeyDisabled(apiKey: string, scope: string, now: number): boolean {
  const stateKey = keyScope(apiKey, scope);
  const disabledUntil = FREE_KEY_DISABLED_UNTIL.get(stateKey);
  if (!disabledUntil) return false;
  if (now >= disabledUntil) {
    FREE_KEY_DISABLED_UNTIL.delete(stateKey);
    return false;
  }
  return true;
}

/**
 * Returns free-tier credentials first, then the paid key. The old GEMINI_API_KEY
 * variable remains a backward-compatible alias for GEMINI_API_KEY_PAID.
 * Quota exhaustion is scoped to a model so it does not disable other free models.
 */
export function getGeminiApiKeyCandidates(
  scope: string,
  env: GeminiApiKeyEnvironment = process.env,
  now = Date.now(),
): GeminiApiKeyCandidate[] {
  const freeKey = clean(env.GEMINI_API_KEY_FREE);
  const paidExplicitKey = clean(env.GEMINI_API_KEY_PAID);
  const legacyKey = clean(env.GEMINI_API_KEY);
  const paidKey = paidExplicitKey || legacyKey;
  const candidates: GeminiApiKeyCandidate[] = [];

  if (freeKey && !isFreeKeyDisabled(freeKey, scope, now)) {
    candidates.push({ tier: "free", apiKey: freeKey, sourceVariable: "GEMINI_API_KEY_FREE" });
  }
  if (paidKey && paidKey !== freeKey) {
    candidates.push({
      tier: "paid",
      apiKey: paidKey,
      sourceVariable: paidExplicitKey ? "GEMINI_API_KEY_PAID" : "GEMINI_API_KEY",
    });
  }
  return candidates;
}

/** Marks this model's free-tier key exhausted until the next midnight Pacific. */
export function markGeminiFreeQuotaExhausted(
  apiKey: string,
  scope: string,
  env: GeminiApiKeyEnvironment = process.env,
  now = Date.now(),
): number | null {
  const freeKey = clean(env.GEMINI_API_KEY_FREE);
  if (!freeKey || freeKey !== apiKey) return null;
  const resetAt = nextGeminiQuotaResetAt(now);
  FREE_KEY_DISABLED_UNTIL.set(keyScope(freeKey, scope), resetAt);
  return resetAt;
}

export function hasAnyGeminiApiKey(env: GeminiApiKeyEnvironment = process.env): boolean {
  return Boolean(clean(env.GEMINI_API_KEY_FREE) || clean(env.GEMINI_API_KEY_PAID) || clean(env.GEMINI_API_KEY));
}

export function getGeminiKeyConfiguration(env: GeminiApiKeyEnvironment = process.env) {
  const freeKey = clean(env.GEMINI_API_KEY_FREE);
  const paidKey = clean(env.GEMINI_API_KEY_PAID) || clean(env.GEMINI_API_KEY);
  return {
    freeConfigured: Boolean(freeKey),
    paidConfigured: Boolean(paidKey && paidKey !== freeKey),
    duplicateKeys: Boolean(freeKey && paidKey && freeKey === paidKey),
  };
}

/** Test helper; does not expose or persist any credential. */
export function clearGeminiApiKeyStateForTests(): void {
  FREE_KEY_DISABLED_UNTIL.clear();
}
