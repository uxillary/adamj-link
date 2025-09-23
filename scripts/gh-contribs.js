const CONTRIB_FEED_URL = 'https://raw.githubusercontent.com/uxillary/automated/main/contributions.json';

async function fetchContributions() {
  const url = `${CONTRIB_FEED_URL}?ts=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load contributions.json');
  return res.json();
}

function renderContribCard(item = {}) {
  const href = item.url || '#';
  const title = item.title || 'Update';
  const repo = item.repo || 'repo';
  const meta = [item.type, item.shortRef, item.timeAgo].filter(Boolean).join(' • ');

  return `
    <a class="contrib-card" href="${href}" target="_blank" rel="noopener">
      <div class="contrib-meta">${repo}</div>
      <div class="contrib-title">${title}</div>
      <div class="contrib-meta">${meta}</div>
    </a>
  `;
}

function renderContribGrid(items = []) {
  const grid = document.getElementById('contribs-grid');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = '<div class="contribs-skeleton">No recent contributions found.</div>';
    return;
  }

  grid.innerHTML = items.map(renderContribCard).join('');
}

async function initContribs() {
  const grid = document.getElementById('contribs-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="contribs-skeleton">Loading recent contributions…</div>';

  try {
    const data = await fetchContributions();
    const items = Array.isArray(data?.items) ? data.items : [];
    renderContribGrid(items);
  } catch (err) {
    console.error('Contribs error:', err);
    renderContribGrid([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initContribs();
  const refresh = document.getElementById('refreshContribs');
  if (refresh) {
    refresh.addEventListener('click', () => {
      initContribs();
    });
  }
});
