export const GEMINI_TTS_MAX_ATTEMPTS = 2;

const RETRYABLE_HTTP_STATUSES = new Set([408, 429]);

export class GeminiHttpError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;
  readonly responseBody: string;

  constructor(status: number, responseBody = "", retryAfterMs?: number) {
    const boundedBody = responseBody.slice(0, 8_000);
    const detail = boundedBody.trim().slice(0, 300);
    super(`Gemini API ${status}${detail ? `: ${detail}` : ""}`);
    this.name = "GeminiHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.responseBody = boundedBody;
  }
}

/** Gets an HTTP status from a typed error or a wrapped/logged error message. */
export function getGeminiHttpStatus(error: unknown): number | null {
  if (!error) return null;
  const candidate = error as { status?: unknown; statusCode?: unknown; message?: unknown; cause?: unknown };
  const status = Number(candidate.status ?? candidate.statusCode);
  if (Number.isInteger(status) && status >= 100 && status <= 599) return status;

  const message = String(candidate.message ?? error);
  const match = message.match(/(?:Gemini API|HTTP(?:\s+status)?)\s*:?\s*(\d{3})/i);
  if (match) return Number(match[1]);
  if (candidate.cause) return getGeminiHttpStatus(candidate.cause);
  return null;
}

/** Identifies a daily quota (not a short-lived per-minute rate limit) response. */
export function isGeminiDailyQuotaError(error: unknown): boolean {
  if (getGeminiHttpStatus(error) !== 429) return false;
  const candidate = error as { message?: unknown; responseBody?: unknown; details?: unknown; cause?: unknown } | null;
  if (!candidate) return false;
  const content = [
    candidate.message,
    candidate.responseBody,
    candidate.details,
    candidate.cause && String((candidate.cause as { message?: unknown }).message || candidate.cause),
  ].map((value) => String(value || "")).join(" ");
  return /daily|per[\s_.-]*day|requests?[\s_.-]*per[\s_.-]*day|tokens?[\s_.-]*per[\s_.-]*day|quota.{0,80}(?:day|daily)|(?:day|daily).{0,80}quota/i.test(content);
}

/**
 * Only transient upstream/network failures may be retried. In particular,
 * configuration/client errors such as 400, 401, 403 and 404 are terminal.
 */
export function isRetryableGeminiError(error: unknown): boolean {
  const status = getGeminiHttpStatus(error);
  if (status !== null) return RETRYABLE_HTTP_STATUSES.has(status) || (status >= 500 && status <= 599);

  const candidate = error as { name?: unknown; code?: unknown; cause?: unknown; message?: unknown } | null;
  if (!candidate) return false;
  const name = String(candidate.name || "");
  if (["AbortError", "TimeoutError", "NetworkError"].includes(name)) return true;

  const cause = candidate.cause as { code?: unknown; message?: unknown; name?: unknown } | undefined;
  const code = String(candidate.code || cause?.code || "").toUpperCase();
  if (/^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET)$/.test(code)) {
    return true;
  }

  const message = `${String(candidate.message || error)} ${String(cause?.message || "")}`;
  return /timeout|timed out|fetch failed|network error|socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT/i.test(message);
}

export function geminiRetryDelayMs(error: unknown, attempt: number): number {
  const retryAfterMs = Number((error as { retryAfterMs?: unknown } | null)?.retryAfterMs);
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return Math.min(retryAfterMs, 60_000);
  if (getGeminiHttpStatus(error) === 429) return 20_000;
  return Math.min(400 * (2 ** Math.max(0, attempt - 1)), 2_000) + Math.floor(Math.random() * 150);
}
