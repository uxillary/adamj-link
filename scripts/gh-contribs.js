const CONTRIB_FEED_URLS = [
  '/public/contributions.json',
  'https://uxillary.github.io/automated/contributions.json'
];

const IGNORED_TYPES = new Set(['Create', 'Delete']);

const ACCENT_PALETTE = [
  '#55e6a5',
  '#60a5fa',
  '#f97316',
  '#a78bfa',
  '#f472b6',
  '#22d3ee',
  '#f87171',
  '#34d399'
];

function accentFromRepo(repo = '') {
  if (!repo) return ACCENT_PALETTE[0];

  let hash = 0;
  for (let i = 0; i < repo.length; i += 1) {
    hash = (hash << 5) - hash + repo.charCodeAt(i);
    hash |= 0; // eslint-disable-line no-bitwise
  }

  const index = Math.abs(hash) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[index];
}

const TYPE_LABELS = {
  IssueComment: 'Issue comment',
  PullRequestReviewComment: 'Review comment',
  PullRequestReview: 'PR review',
  PullRequest: 'Pull request',
  Issues: 'Issue opened',
  PR: 'Pull request',
  Merge: 'PR merged',
  Commit: 'Commit'
};

function formatType(type = '') {
  if (!type) return '';
  return TYPE_LABELS[type] || type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

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
  const accent = item.accent || accentFromRepo(repo);
  const type = formatType(item.type);
  const meta = [item.shortRef, item.timeAgo].filter(Boolean).join(' • ');

  return `
    <a class="contrib-card" href="${href}" target="_blank" rel="noopener" style="--accent:${accent}">
      <div class="contrib-card-header">
        <span class="contrib-indicator" aria-hidden="true"></span>
        <span class="contrib-repo">${repo}</span>
        ${type ? `<span class="contrib-type">${type}</span>` : ''}
      </div>
      <div class="contrib-title">${title}</div>
      ${meta ? `<div class="contrib-meta">${meta}</div>` : ''}
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
  }).map((item) => ({
    ...item,
    accent: item.color || accentFromRepo(item.repo)
  }));
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
