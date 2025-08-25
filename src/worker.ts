export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // If the assets binding is missing, return a clear error in dev.
    if (!env || !env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('ASSETS binding is not configured. Ensure [assets] binding = "ASSETS" in wrangler.toml', { status: 500 });
    }

    // Try to serve a static asset first
    let res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    // SPA-style fallback: if not an asset path, serve index.html
    const isAsset = /\.[a-z0-9]+$/i.test(url.pathname);
    if (!isAsset) {
      const indexReq = new Request(new URL('/index.html', url), request);
      res = await env.ASSETS.fetch(indexReq);
      if (res.status !== 404) return res;
    }

    return new Response('Not Found', { status: 404 });
  },
};