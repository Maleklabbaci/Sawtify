const AGENT_ACCESS_TOKEN_KEY = 'sawtify_agent_access_token';

export function getAgentAccessToken(): string | null {
  try { return window.sessionStorage.getItem(AGENT_ACCESS_TOKEN_KEY); }
  catch { return null; }
}

export function saveAgentAccessToken(token: string): void {
  try { window.sessionStorage.setItem(AGENT_ACCESS_TOKEN_KEY, token); }
  catch { /* le jeton reste valable pour la session courante */ }
}

export function clearAgentAccessToken(): void {
  try { window.sessionStorage.removeItem(AGENT_ACCESS_TOKEN_KEY); }
  catch { /* ignore */ }
}
