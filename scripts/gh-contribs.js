// gh-contribs.js — compact activity log renderer
(function(){
  const SOURCE = '/public/contributions.json';
  const mount = document.getElementById('ossList');
  if(!mount) return;

  const pillLabel = (t) => {
    const m = (t || '').toLowerCase();
    if (m === 'commit') return 'Commit';
    if (m === 'push') return 'Push';
    if (m === 'issue' || m === 'issues') return 'Issue';
    if (m === 'pr' || m === 'pullrequest' || m === 'pull_request') return 'PR';
    if (m.includes('merge') || m === 'merged') return 'Merged';
    return t ? t : 'Update';
  };

  const eventIcon = (t) => {
    const type = (t || '').toLowerCase();
    if(type === 'commit' || type === 'push') return 'fa-code-commit';
    if(type === 'delete' || type === 'deleted') return 'fa-trash-can';
    if(type === 'branch' || type === 'create' || type === 'created') return 'fa-code-branch';
    if(type === 'issue' || type === 'issues') return 'fa-circle-exclamation';
    if(type === 'pr' || type === 'pullrequest' || type === 'pull_request') return 'fa-code-pull-request';
    if(type.includes('merge') || type === 'merged') return 'fa-code-merge';
    return 'fa-code-branch';
  };

  const iconMarkup = (icon, className = '') => icon
    ? `<i class="fa-solid fa-fw ${icon} ${className}" aria-hidden="true"></i>`
    : '';

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const safeHref = (value) => {
    if(!value) return '#';
    const href = String(value).trim();
    if(/^https?:\/\//i.test(href)) return href;
    return '#';
  };

  const parseRelativeToSeconds = (value) => {
    if(!value) return null;
    if(/just now/i.test(value)) return 0;
    const normalized = String(value).toLowerCase().trim().replace(/about\s+|approximately\s+/g, '');
    const match = normalized.match(/(?:(\d+)|an?|one)\s*(second|sec|minute|min|hour|day|week|month|year)s?/);
    if(!match) return null;
    const amount = match[1] ? parseInt(match[1], 10) : 1;
    const unit = match[2];
    const seconds = unit.startsWith('year') ? amount * 365 * 24 * 3600
      : unit.startsWith('month') ? amount * 30 * 24 * 3600
      : unit.startsWith('week') ? amount * 7 * 24 * 3600
      : unit.startsWith('day') ? amount * 24 * 3600
      : unit.startsWith('hour') ? amount * 3600
      : unit.startsWith('min') ? amount * 60
      : amount;
    return seconds;
  };

  const formatRelativeFromSeconds = (seconds) => {
    if(seconds <= 0) return 'just now';
    if (seconds < 60) return `${Math.floor(seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  const formatRelativeLabel = (value) => {
    if(!value) return '';
    const seconds = parseRelativeToSeconds(value);
    if(seconds == null) return value;
    return formatRelativeFromSeconds(seconds);
  };

  let baseGeneratedAt = Date.now();
  let ticker = null;

  const resolveTimestamp = (item) => {
    if(!item || typeof item !== 'object') return NaN;
    const direct = item.date || item.createdAt || item.timestamp || item.datetime || item.time || item.occurredAt;
    if(direct !== undefined){
      if(typeof direct === 'number' && Number.isFinite(direct)) return direct;
      const parsed = new Date(direct);
      const ms = parsed.getTime();
      if(!Number.isNaN(ms)) return ms;
    }
    const seconds = parseRelativeToSeconds(item.timeAgo);
    if(seconds == null) return NaN;
    const origin = Number.isFinite(baseGeneratedAt) ? baseGeneratedAt : Date.now();
    return origin - seconds * 1000;
  };

  const formatInitialTime = (item, ts) => {
    if(Number.isFinite(ts)){
      const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      return formatRelativeFromSeconds(seconds);
    }
    return formatRelativeLabel(item.timeAgo);
  };

  const updateTimes = () => {
    const now = Date.now();
    mount.querySelectorAll('[data-ts]').forEach((node) => {
      const ts = Number(node.getAttribute('data-ts'));
      if(!Number.isFinite(ts)) return;
      const seconds = Math.max(0, Math.floor((now - ts) / 1000));
      node.textContent = formatRelativeFromSeconds(seconds);
    });
  };

  const ensureTicker = () => {
    if(ticker) return;
    ticker = setInterval(updateTimes, 60 * 1000);
  };

  const uniqueItems = (items) => {
    if(!Array.isArray(items)) return [];
    const seen = new Set();
    return items.filter((item) => {
      if(!item || typeof item !== 'object') return false;
      const key = item.url || `${item.repo || ''}:${item.title || ''}:${item.type || ''}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const loader = () => {
    mount.setAttribute('aria-busy','true');
    mount.classList.remove('oss-grid');
    mount.classList.add('oss-log');
    mount.innerHTML = `
      <div class="oss-state">
        <div class="tetris-loader" role="status" aria-label="Loading contributions">
          ${Array.from({ length: 12 }).map(() => '<span></span>').join('')}
        </div>
      </div>
    `;
  };

  const eventData = (it) => {
    const repo = it.repo || it.repository || it.project || 'repo';
    const type = pillLabel(it.type || it.kind);
    const ref = (it.shortRef || it.sha || it.id || it.number || '').toString().trim();
    const commitMeta = it.commitMeta && typeof it.commitMeta === 'object' ? it.commitMeta : null;
    const stats = [];
    if(commitMeta){
      if(Number.isFinite(commitMeta.additions)) stats.push(`<span class="oss-add">+${commitMeta.additions}</span>`);
      if(Number.isFinite(commitMeta.deletions)) stats.push(`<span class="oss-delete">−${commitMeta.deletions}</span>`);
      if(Number.isFinite(commitMeta.filesChanged)) stats.push(`<span>${commitMeta.filesChanged} file${commitMeta.filesChanged === 1 ? '' : 's'}</span>`);
    }
    const ts = resolveTimestamp(it);
    return {
      href: safeHref(it.url || it.link || '#'),
      repo,
      type,
      icon: eventIcon(it.type || it.kind),
      title: it.title || it.message || it.subtitle || '',
      summary: (it.summary || `${type}${ref ? ` ${ref}` : ''}`).trim(),
      hash: ref ? ref.slice(0, 10) : '',
      stats: stats.join(''),
      ts,
      when: formatInitialTime(it, ts)
    };
  };

  const timeMarkup = (event) => `<time class="oss-time"${Number.isFinite(event.ts) ? ` data-ts="${event.ts}"` : ''}>${escapeHtml(event.when)}</time>`;

  const metaMarkup = (event) => `
    <span class="oss-meta">
      ${event.hash ? `<span class="oss-sha">${escapeHtml(event.hash)}</span>` : ''}
      ${event.stats}
    </span>`;

  const render = (items) => {
    mount.classList.remove('oss-grid');
    mount.classList.add('oss-log');
    if(!items.length){
      mount.innerHTML = `<div class="oss-state">No recent contributions found.</div>`;
      mount.removeAttribute('aria-busy');
      return;
    }

    const events = items.map(eventData);
    const latest = events[0];
    const recent = events.slice(1, 9);
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const counts = new Map();
    events.forEach((event) => {
      if(!Number.isFinite(event.ts) || event.ts >= dayAgo) counts.set(event.repo, (counts.get(event.repo) || 0) + 1);
    });
    const repositories = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...repositories.map(([, count]) => count), 1);

    mount.innerHTML = `
      <div class="oss-signal" aria-labelledby="oss-signal-title">
        <div class="oss-board-label" id="oss-signal-title">24H Activity Signal</div>
        <div class="oss-signal-list">
          ${repositories.map(([repo, count]) => {
            const level = Math.max(1, Math.ceil((count / maxCount) * 5));
            return `<div class="oss-signal-row"><span class="clamp-1">${escapeHtml(repo)}</span><span class="oss-signal-count">${count} event${count === 1 ? '' : 's'}</span><span class="oss-bars" aria-label="Relative activity: ${level} of 5">${Array.from({length: 5}, (_, index) => `<i${index < level ? ' class="is-active"' : ''}></i>`).join('')}</span></div>`;
          }).join('') || '<div class="oss-signal-empty">No events in the last 24 hours</div>'}
        </div>
      </div>
      <div class="oss-latest">
        <div class="oss-board-label">Latest Event</div>
        <a class="oss-latest-link" href="${escapeHtml(latest.href)}" rel="noopener noreferrer">
          <span class="oss-event-mark">${iconMarkup(latest.icon)}</span>
          <span class="oss-latest-body">
            <span class="oss-event-head"><span class="oss-pill">${escapeHtml(latest.type)}</span><span class="oss-repo">${escapeHtml(latest.repo)}</span>${timeMarkup(latest)}</span>
            <span class="oss-title clamp-2">${escapeHtml(latest.title)}</span>
            <span class="oss-summary clamp-1">${escapeHtml(latest.summary)}</span>
            ${metaMarkup(latest)}
          </span>
        </a>
      </div>
      ${recent.length ? `<div class="oss-recent"><div class="oss-board-label">Recent Events</div><div class="oss-recent-grid">${recent.map((event) => `
        <a class="oss-event-cell" href="${escapeHtml(event.href)}" rel="noopener noreferrer">
          <span class="oss-event-head">${iconMarkup(event.icon, 'oss-cell-icon')}<span class="oss-pill">${escapeHtml(event.type)}</span>${timeMarkup(event)}</span>
          <span class="oss-repo clamp-1">${escapeHtml(event.repo)}</span>
          <span class="oss-title clamp-2">${escapeHtml(event.title)}</span>
          <span class="oss-summary clamp-1">${escapeHtml(event.summary)}</span>
          ${metaMarkup(event)}
        </a>`).join('')}</div></div>` : ''}
    `;
    mount.removeAttribute('aria-busy');
    updateTimes();
    ensureTicker();
  };

  async function load(){
    loader();
    try{
      const res = await fetch(SOURCE, { cache: 'reload' });
      const data = await res.json();
      const generatedAt = data && data.generatedAt ? new Date(data.generatedAt).getTime() : Date.now();
      baseGeneratedAt = Number.isNaN(generatedAt) ? Date.now() : generatedAt;
      const raw = Array.isArray(data) ? data : (data && data.items) || [];
      const items = uniqueItems(raw);
      render(items);
    }catch(e){
      console.error('contribs load failed', e);
      mount.classList.remove('oss-grid');
      mount.classList.add('oss-log');
      mount.innerHTML = `<div class="oss-state">Couldn’t load contributions.</div>`;
      mount.removeAttribute('aria-busy');
    }
  }

  load();
  const btn = document.getElementById('refreshContribs');
  if(btn) btn.addEventListener('click', load);
})();
