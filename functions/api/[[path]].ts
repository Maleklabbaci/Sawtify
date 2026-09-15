const BACKEND_URL = 'https://sawtify-cllf.onrender.com';

export async function onRequest(context: any): Promise<Response> {
  const incoming = new URL(context.request.url);
  const target = `${BACKEND_URL}${incoming.pathname}${incoming.search}`;
  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  };
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = await context.request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('content-encoding');
    // Telegram, WhatsApp et certains connecteurs refusent un média distant
    // sans taille connue. Ne pas supprimer Content-Length pour les fichiers
    // audio binaires servis par /api/v1/developer/media/.
    if (incoming.pathname.includes('/api/v1/developer/media/')) {
      const length = upstream.headers.get('content-length');
      if (length) responseHeaders.set('content-length', length);
      responseHeaders.set('Content-Disposition', 'inline');
      responseHeaders.set('Accept-Ranges', 'bytes');
    } else {
      responseHeaders.delete('content-length');
    }
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: 'Backend Sawtify temporairement indisponible.' }, { status: 502 });
  }
}
