export const onRequest = async ({ request, env }) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || url.pathname;
  const unique = env.UNIQUE_VIEWS === '1';

  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,HEAD,OPTIONS'
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method === 'HEAD') return new Response(null, { headers });
  if (!['GET', 'POST'].includes(request.method)) {
    return new Response(JSON.stringify({ path, count: null, error: 'Method not allowed', unique }), {
      status: 405,
      headers
    });
  }

  try {
    const kv = env.VIEWS_KV;
    const countKey = `count:${path}`;
    let count = parseInt((await kv.get(countKey)) || '0', 10);

    if (request.method === 'POST') {
      let increment = true;
      if (unique) {
        const ip = request.headers.get('cf-connecting-ip') || '';
        const salt = env.IP_SALT || '';
        const day = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const data = new TextEncoder().encode(ip + salt);
        const buf = await crypto.subtle.digest('SHA-256', data);
        const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
        const stampKey = `seen:${path}:${day}:${hash}`;
        const seen = await kv.get(stampKey);
        if (seen) increment = false;
        else await kv.put(stampKey, '1', { expirationTtl: 86400 });
      }
      if (increment) {
        // KV counters aren't strictly atomic; Durable Objects would be the strict alternative.
        count += 1;
        await kv.put(countKey, String(count));
      }
    }

    return new Response(JSON.stringify({ path, count, unique }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ path, count: null, error: 'KV error', unique }), {
      status: 500,
      headers
    });
  }
};
