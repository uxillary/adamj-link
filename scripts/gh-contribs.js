const CONTRIB_FEED_URLS = [
  'https://uxillary.github.io/automated/contributions.json',
  '/contributions.json'
];

const IGNORED_TYPES = new Set(['Create', 'Delete']);

async function fetchContributions() {
  const ts = Date.now();

  for (const baseUrl of CONTRIB_FEED_URLS) {
    const url = `${baseUrl}?ts=${ts}`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Contribs fetch failed for', baseUrl, err);
    }
  }

  throw new Error('All contribution feed URLs failed');
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

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  const seen = new Set();

  return rawItems.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    if (IGNORED_TYPES.has(item.type)) return false;

    const key = item.url || `${item.repo}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
}

async function initContribs() {
  const grid = document.getElementById('contribs-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="contribs-skeleton">Loading recent contributions…</div>';

  try {
    const data = await fetchContributions();
    const items = normalizeItems(data?.items);
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
