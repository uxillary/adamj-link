export const onRequestGet = async ({ request }) => {
  const FEED_URL = "https://infinitecurios.blog/feed.xml";
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const resp = await fetch(FEED_URL, { cf: { cacheTtl: 300 } });
  if (!resp.ok) {
    return new Response(JSON.stringify({ items: [], error: "feed fetch failed" }), {
      status: 502, headers: { "content-type": "application/json" }
    });
  }
  const xml = await resp.text();

  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const b of blocks.slice(0, 3)) {
    const pick = (tag) => {
      const m = b.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return (m ? m[1] : "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    };
    const title = pick("title");
    const link = pick("link");
    const pubDate = pick("pubDate");
    const desc = pick("description")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 180);

    const url = new URL(link);
    const seg = url.pathname.split("/")[2] || "";
    const category = decodeURIComponent(seg);

    items.push({ title, link, pubDate, summary: desc, category });
  }

  const out = new Response(JSON.stringify({ items }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
  await cache.put(cacheKey, out.clone());
  return out;
};
