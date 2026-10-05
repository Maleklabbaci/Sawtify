const BACKEND_URL = 'https://sawtify-cllf.onrender.com';

// Proxy Cloudflare Pages -> Render pour le connecteur MCP (/mcp, /oauth/*, /.well-known/*).
export async function proxyToBackend(context: any): Promise<Response> {
  const incoming = new URL(context.request.url);
  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('content-length');
  const init: RequestInit = { method: context.request.method, headers, redirect: 'manual' };
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = await context.request.arrayBuffer();
  }
  try {
    const upstream = await fetch(`${BACKEND_URL}${incoming.pathname}${incoming.search}`, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch {
    return Response.json({ error: 'Backend Sawtify temporairement indisponible.' }, { status: 502 });
  }
}
