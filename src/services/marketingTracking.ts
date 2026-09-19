import { API_BASE_URL } from '../config/apiBase';

const SESSION_KEY = 'sawtify_marketing_session';
const sent = new Set<string>();

function sessionId() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const value = `${crypto.randomUUID()}-${Date.now()}`;
  localStorage.setItem(SESSION_KEY, value);
  return value;
}

function campaignData() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    referrer: document.referrer || null,
  };
}

export function trackMarketingEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  const key = `${eventName}:${window.location.pathname}`;
  if (sent.has(key)) return;
  sent.add(key);
  const payload = { sessionId: sessionId(), eventName, path: window.location.pathname, ...campaignData(), metadata };
  void fetch(`${API_BASE_URL}/api/marketing/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
}
