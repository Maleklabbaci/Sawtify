import assert from "node:assert/strict";
import {
  clearGeminiApiKeyStateForTests,
  getGeminiApiKeyCandidates,
  getGeminiKeyConfiguration,
  markGeminiFreeQuotaExhausted,
  nextGeminiQuotaResetAt,
  type GeminiApiKeyEnvironment,
} from "./geminiApiKeys";
import { GeminiHttpError, isGeminiDailyQuotaError } from "./retryPolicy";

clearGeminiApiKeyStateForTests();
const env: GeminiApiKeyEnvironment = {
  GEMINI_API_KEY_FREE: "free-project-key",
  GEMINI_API_KEY_PAID: "paid-project-key",
};

assert.deepEqual(
  getGeminiApiKeyCandidates("gemini-3.8-flash-tts", env).map(({ tier }) => tier),
  ["free", "paid"],
  "free tier is attempted before the paid fallback",
);
assert.deepEqual(
  getGeminiApiKeyCandidates("model", { GEMINI_API_KEY: "legacy-paid-key" }).map(({ tier }) => tier),
  ["paid"],
  "legacy GEMINI_API_KEY remains a paid fallback",
);
assert.equal(
  getGeminiApiKeyCandidates("model", { GEMINI_API_KEY_FREE: "same", GEMINI_API_KEY_PAID: "same" }).length,
  1,
  "duplicate keys must not be treated as independent quotas",
);
assert.equal(
  getGeminiKeyConfiguration({ GEMINI_API_KEY_FREE: "same", GEMINI_API_KEY_PAID: "same" }).duplicateKeys,
  true,
);

const dailyQuota = new GeminiHttpError(429, JSON.stringify({
  error: {
    status: "RESOURCE_EXHAUSTED",
    details: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }],
  },
}));
const perMinuteQuota = new GeminiHttpError(429, JSON.stringify({
  error: {
    status: "RESOURCE_EXHAUSTED",
    details: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }],
  },
}));
assert.equal(isGeminiDailyQuotaError(dailyQuota), true, "daily quota errors trigger paid fallback");
assert.equal(isGeminiDailyQuotaError(perMinuteQuota), false, "per-minute throttling does not burn paid fallback");
assert.equal(isGeminiDailyQuotaError(new GeminiHttpError(404, "not found")), false);

const now = Date.UTC(2026, 9, 11, 12, 0, 0);
const resetAt = markGeminiFreeQuotaExhausted(env.GEMINI_API_KEY_FREE!, "gemini-3.8-flash-tts", env, now);
assert.ok(resetAt && resetAt > now && resetAt <= now + 24 * 60 * 60 * 1000, "free quota cooldown ends at the next Pacific midnight");
assert.deepEqual(
  getGeminiApiKeyCandidates("gemini-3.8-flash-tts", env, now).map(({ tier }) => tier),
  ["paid"],
  "exhausted free key is bypassed for this model until reset",
);
assert.deepEqual(
  getGeminiApiKeyCandidates("gemini-3.8-flash-lite-tts", env, now).map(({ tier }) => tier),
  ["free", "paid"],
  "exhaustion is scoped to the model that hit its daily quota",
);
assert.deepEqual(
  getGeminiApiKeyCandidates("gemini-3.8-flash-tts", env, resetAt!).map(({ tier }) => tier),
  ["free", "paid"],
  "free key is re-enabled at quota reset",
);
assert.ok(nextGeminiQuotaResetAt(now) > now);
clearGeminiApiKeyStateForTests();

console.log("✅ Gemini key routing: free-first, daily-quota fallback, model-scoped Pacific reset, legacy paid key.");
