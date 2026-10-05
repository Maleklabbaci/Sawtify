const BACKEND_URL = 'https://sawtify-cllf.onrender.com';

// Connecteur MCP : /mcp, /oauth/* et /.well-known/oauth-* sont envoyés au backend Render.
// Tout le reste du site passe normalement (context.next()).
// Un seul fichier, sans dossier caché (.well-known) : plus simple à déployer.
function isMcpPath(pathname: string): boolean {
  return (
    pathname === '/mcp' ||
    pathname.startsWith('/mcp/') ||
    pathname.startsWith('/oauth/') ||
    pathname.startsWith('/.well-known/oauth-') ||
    pathname === '/.well-known/openid-configuration'
  );
}

export async function onRequest(context: any): Promise<Response> {
  const incoming = new URL(context.request.url);
  if (!isMcpPath(incoming.pathname)) return context.next();

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
