import assert from "node:assert/strict";
import {
  GEMINI_TTS_MAX_ATTEMPTS,
  GeminiHttpError,
  getGeminiHttpStatus,
  isRetryableGeminiError,
} from "./retryPolicy";

assert.equal(GEMINI_TTS_MAX_ATTEMPTS, 2, "retry cap is two total attempts");
for (const status of [400, 401, 403, 404]) {
  assert.equal(isRetryableGeminiError(new GeminiHttpError(status)), false, `HTTP ${status} is terminal`);
}
for (const status of [408, 429, 500, 502, 503, 504, 599]) {
  assert.equal(isRetryableGeminiError(new GeminiHttpError(status)), true, `HTTP ${status} is temporary`);
}
assert.equal(getGeminiHttpStatus(new Error("Morceau 1/1 : Gemini API 404: model not found")), 404);
assert.equal(isRetryableGeminiError(Object.assign(new Error("Timeout Gemini"), { name: "TimeoutError" })), true);
assert.equal(isRetryableGeminiError(Object.assign(new Error("fetch failed"), { cause: { code: "ECONNRESET" } })), true);
assert.equal(isRetryableGeminiError(new Error("Réponse audio sans contenu valide")), false);

console.log("✅ Gemini retry policy: 404/400 terminal, 500/503/network timeout retryable (2 attempts max).");
