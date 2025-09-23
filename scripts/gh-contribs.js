const GH_EVENTS_URL = 'https://api.github.com/users/uxillary/events/public';
const FALLBACK_FEED_URL = '/public/contributions.json';
const MAX_ITEMS = 8;

const FALLBACK_IGNORED_TYPES = new Set(['Create', 'Delete']);
const IGNORED_EVENT_TYPES = new Set(['DeleteEvent']);

async function fetchGithubEvents() {
  const url = `${GH_EVENTS_URL}?per_page=50&ts=${Date.now()}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json' }
  });
  if (!res.ok) {
    throw new Error(`GitHub events request failed: ${res.status}`);
  }
  return res.json();
}

async function fetchFallbackFeed() {
  const url = `${FALLBACK_FEED_URL}?ts=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load contributions.json');
  return res.json();
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date)) return '';

  const diffSeconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSeconds <= 0) return 'just now';

  const ranges = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 604800, divisor: 86400, unit: 'day' },
    { limit: 2629800, divisor: 604800, unit: 'week' },
    { limit: 31557600, divisor: 2629800, unit: 'month' }
  ];

  for (const { limit, divisor, unit } of ranges) {
    if (diffSeconds < limit) {
      const value = Math.max(1, Math.round(diffSeconds / divisor));
      return rtf.format(-value, unit);
    }
  }

  const years = Math.max(1, Math.round(diffSeconds / 31557600));
  return rtf.format(-years, 'year');
}

function truncate(text, len = 96) {
  if (!text) return '';
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= len) return clean;
  return `${clean.slice(0, len - 1)}…`;
}

function capitalise(text = '') {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function extractRepoName(full = '') {
  if (!full.includes('/')) return full || 'repo';
  return full.split('/').pop() || full;
}

function mapPushEvent(event, base) {
  const commits = Array.isArray(event?.payload?.commits) ? event.payload.commits : [];
  const commit = commits.find((c) => c?.distinct) || commits[0] || {};
  const message = truncate(commit?.message) || `Pushed ${event?.payload?.size || 1} commit${event?.payload?.size === 1 ? '' : 's'}`;
  const head = event?.payload?.head;

  return {
    ...base,
    title: message,
    type: 'Push',
    url: head ? `https://github.com/${event.repo.name}/commit/${head}` : `https://github.com/${event.repo.name}`,
    shortRef: head ? head.slice(0, 7) : ''
  };
}

function mapPullRequestEvent(event, base) {
  const pr = event?.payload?.pull_request;
  if (!pr) return null;
  const action = event?.payload?.action;
  let type = 'Pull request';
  if (action) {
    if (action === 'closed' && pr.merged_at) type = 'PR merged';
    else type = `PR ${capitalise(action)}`;
  }

  return {
    ...base,
    title: truncate(pr.title) || 'Pull request',
    type,
    url: pr.html_url || `https://github.com/${event.repo.name}/pull/${pr.number}`,
    shortRef: pr.number ? `#${pr.number}` : ''
  };
}

function mapIssuesEvent(event, base) {
  const issue = event?.payload?.issue;
  if (!issue) return null;
  const action = event?.payload?.action;
  const type = action ? `Issue ${capitalise(action)}` : 'Issue';

  return {
    ...base,
    title: truncate(issue.title) || 'Issue',
    type,
    url: issue.html_url || `https://github.com/${event.repo.name}/issues/${issue.number}`,
    shortRef: issue.number ? `#${issue.number}` : ''
  };
}

function mapIssueCommentEvent(event, base) {
  const issue = event?.payload?.issue;
  if (!issue) return null;
  const comment = event?.payload?.comment;

  return {
    ...base,
    title: truncate(`Commented: ${issue.title}`) || 'Issue comment',
    type: 'Issue comment',
    url: comment?.html_url || issue.html_url || `https://github.com/${event.repo.name}`,
    shortRef: issue.number ? `#${issue.number}` : ''
  };
}

function mapPullRequestReviewEvent(event, base) {
  const pr = event?.payload?.pull_request;
  if (!pr) return null;
  const review = event?.payload?.review;
  const action = event?.payload?.action;
  const type = action ? `PR review ${action}` : 'PR review';

  return {
    ...base,
    title: truncate(pr.title) || 'Pull request review',
    type: capitalise(type),
    url: review?.html_url || pr.html_url || `https://github.com/${event.repo.name}`,
    shortRef: pr.number ? `#${pr.number}` : ''
  };
}

function mapReleaseEvent(event, base) {
  const release = event?.payload?.release;
  if (!release) return null;

  return {
    ...base,
    title: truncate(release.name || release.tag_name) || 'Release',
    type: 'Release',
    url: release.html_url || `https://github.com/${event.repo.name}/releases`,
    shortRef: release.tag_name || ''
  };
}

function mapGithubEvent(event) {
  if (!event || typeof event !== 'object') return null;
  if (IGNORED_EVENT_TYPES.has(event.type)) return null;

  const repoFull = event?.repo?.name;
  if (!repoFull) return null;

  const base = {
    repo: extractRepoName(repoFull),
    timeAgo: formatTimeAgo(event.created_at)
  };

  switch (event.type) {
    case 'PushEvent':
      return mapPushEvent(event, base);
    case 'PullRequestEvent':
      return mapPullRequestEvent(event, base);
    case 'IssuesEvent':
      return mapIssuesEvent(event, base);
    case 'IssueCommentEvent':
      return mapIssueCommentEvent(event, base);
    case 'PullRequestReviewEvent':
    case 'PullRequestReviewCommentEvent':
      return mapPullRequestReviewEvent(event, base);
    case 'ReleaseEvent':
      return mapReleaseEvent(event, base);
    default:
      return null;
  }
}

function normalizeGithubEvents(events) {
  if (!Array.isArray(events)) return [];
  const seen = new Set();
  const items = [];

  for (const event of events) {
    const item = mapGithubEvent(event);
    if (!item) continue;
    const key = item.url || `${item.repo}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}

function normalizeFallbackItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const seen = new Set();
  const items = [];

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    if (FALLBACK_IGNORED_TYPES.has(item.type)) continue;
    const key = item.url || `${item.repo}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      repo: item.repo || 'repo',
      title: item.title || 'Update',
      type: item.type || '',
      url: item.url || '#',
      shortRef: item.shortRef || '',
      timeAgo: item.timeAgo || ''
    });
    if (items.length >= MAX_ITEMS) break;
  }

  return items;
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

async function loadContributions() {
  try {
    const events = await fetchGithubEvents();
    const items = normalizeGithubEvents(events);
    if (items.length) return items;
  } catch (err) {
    console.error('GitHub events error:', err);
  }

  try {
    const data = await fetchFallbackFeed();
    const items = normalizeFallbackItems(data?.items);
    if (items.length) return items;
  } catch (err) {
    console.error('Contrib fallback error:', err);
  }

  return [];
}

async function initContribs() {
  const grid = document.getElementById('contribs-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="contribs-skeleton">Loading recent contributions…</div>';

  const items = await loadContributions();
  renderContribGrid(items);
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
