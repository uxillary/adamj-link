(function () {
  const list = document.getElementById('blogList');
  if (!list) return;

  async function loadPosts() {
    list.innerHTML = Array.from({ length: 3 }).map((_, index) => `
      <div class="post-card ${index === 0 ? 'post-card-featured' : 'post-card-secondary'} border border-zinc-800/60 overflow-hidden animate-pulse shrink-0 snap-start">
        <div class="p-4">
          <div class="h-3 w-24 mb-2 bg-white/10"></div>
          <div class="h-4 w-3/4 mb-2 bg-white/10"></div>
          <div class="h-3 w-5/6 bg-white/10"></div>
        </div>
      </div>
    `).join('');

    try {
      const res = await fetch('/api/infinite-curios-latest', { cache: 'reload' });
      if (!res.ok) throw new Error(`Posts request failed with status ${res.status}`);
      const { items } = await res.json();
      if (!items || !items.length) {
        list.innerHTML = '<p class="text-sm text-zinc-500">No posts yet.</p>';
        return;
      }
        list.innerHTML = items.map((it, index) => {
          const d = it.pubDate ? new Date(it.pubDate) : null;
          const date = d ? d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const tag = (it.category || '').toLowerCase();
          const cat = it.category ? `<span class="post-tag">${it.category}</span>` : '';
          return `
            <a href="${it.link}" class="post-card ${index === 0 ? 'post-card-featured' : 'post-card-secondary'} border border-zinc-800/60 overflow-hidden flex flex-col shrink-0 snap-start" data-tag="${tag}">
              <div class="p-4 flex flex-col">
                <div class="post-meta"><span>${date}</span>${cat}</div>
                <h3 class="text-lg font-semibold leading-tight">${it.title}</h3>
                <p class="mt-2 text-sm text-zinc-400/90 line-clamp-2">${it.summary || ''}</p>
                <span class="post-arrow" aria-hidden="true"><span>↗</span></span>
              </div>
            </a>
          `;
        }).join('');
    } catch (err) {
      console.error(err);
      list.innerHTML = '<p class="text-sm text-zinc-500">Posts unavailable.</p>';
    }
  }

  const btn = document.getElementById('refreshPosts');
  if (btn) btn.addEventListener('click', loadPosts);

  loadPosts();
})();
