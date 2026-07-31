(function () {
  const list = document.getElementById('blogList');
  if (!list) return;

  const bookCard = document.querySelector('.writing-book');

  const syncBookHeight = () => {
    if (!bookCard) return;
    const firstPost = list.querySelector('.post-card');
    if (!firstPost) return;
    const { height } = firstPost.getBoundingClientRect();
    if (height) {
      bookCard.style.minHeight = `${height}px`;
    }
  };

  async function loadPosts() {
    list.innerHTML = Array.from({ length: 3 }).map(() => `
      <div class="post-card border border-zinc-800/60 overflow-hidden animate-pulse shrink-0 snap-start">
        <div class="aspect-[16/9] bg-white/10"></div>
        <div class="p-4">
          <div class="h-3 w-24 mb-2 bg-white/10"></div>
          <div class="h-4 w-3/4 mb-2 bg-white/10"></div>
          <div class="h-3 w-5/6 bg-white/10"></div>
        </div>
      </div>
    `).join('');
    requestAnimationFrame(syncBookHeight);

    try {
      const res = await fetch('/api/404cache-latest', { cache: 'reload' });
      const { items } = await res.json();
      if (!items || !items.length) {
        list.innerHTML = '<p class="text-sm text-zinc-500">No posts yet.</p>';
        if (bookCard) bookCard.style.minHeight = '';
        return;
      }
        list.innerHTML = items.map(it => {
          const d = it.pubDate ? new Date(it.pubDate) : null;
          const date = d ? d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const tag = (it.category || '').toLowerCase();
          const cat = it.category ? `<span class="post-tag mt-3 w-fit self-start px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">${it.category}</span>` : '';
          return `
            <a href="${it.link}" class="post-card border border-zinc-800/60 overflow-hidden flex flex-col shrink-0 snap-start" data-tag="${tag}">
              <div class="aspect-[16/9] bg-no-repeat bg-cover bg-center" style="background-image: linear-gradient(to bottom right, rgba(39,39,42,0.4), rgba(24,24,27,0.4)), url('/public/404cache-shadow-sm.png');"></div>
              <div class="p-4 flex flex-col">
                <span class="mb-2 inline-block px-2 py-0.5 border border-zinc-800/60 text-[0.65rem] uppercase tracking-wide text-zinc-400">${date}</span>
                <h3 class="text-lg font-semibold leading-tight">${it.title}</h3>
                <p class="mt-2 text-sm text-zinc-400/90 line-clamp-2">${it.summary || ''}</p>
                ${cat}
              </div>
            </a>
          `;
        }).join('');
        requestAnimationFrame(syncBookHeight);
    } catch (err) {
      console.error(err);
      list.innerHTML = '<p class="text-sm text-zinc-500">Posts unavailable.</p>';
      if (bookCard) bookCard.style.minHeight = '';
    }
  }

  const btn = document.getElementById('refreshPosts');
  if (btn) btn.addEventListener('click', loadPosts);

  requestAnimationFrame(syncBookHeight);
  let resizeFrame;
  window.addEventListener('resize', () => {
    if (!bookCard) return;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(syncBookHeight);
  });

  loadPosts();
})();
