(async function () {
  const list = document.getElementById('blogList');
  if (!list) return;

  list.innerHTML = Array.from({length:3}).map(()=>`
    <div class="t-card p-4 animate-pulse">
      <div class="h-3 w-24 mb-2 bg-white/10 rounded"></div>
      <div class="h-4 w-3/4 mb-2 bg-white/10 rounded"></div>
      <div class="h-3 w-5/6 bg-white/10 rounded"></div>
    </div>
  `).join('');

  try {
    const res = await fetch('/api/infinitecurios-latest', { cache: 'reload' });
    const { items } = await res.json();
    if (!items || !items.length) {
      list.innerHTML = '<p class="text-sm text-zinc-500">No posts yet.</p>';
      return;
    }
    list.innerHTML = items.map(it => {
      const d = it.pubDate ? new Date(it.pubDate) : null;
      const date = d ? d.toLocaleDateString('en-GB', { month:'short', day:'numeric', year:'numeric' }) : '';
      return `
        <a href="${it.link}" class="t-card p-4 group">
          <div class="text-xs text-zinc-500">${date}</div>
          <h3 class="mt-1 font-medium group-hover:underline">${it.title}</h3>
          <p class="mt-1 text-sm text-zinc-400/90 leading-relaxed line-clamp-2">${it.summary || ''}</p>
        </a>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p class="text-sm text-zinc-500">Couldn’t load posts right now.</p>';
  }
})();
