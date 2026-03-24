// gh-contribs.js — compact “micro-card” renderer
(function(){
  const SOURCES = [
    '/public/contributions.json',
    'https://raw.githubusercontent.com/uxillary/automated/main/contributions.json'
  ];
  const GITHUB_EVENTS_SOURCE = 'https://api.github.com/users/uxillary/events/public';
  const FALLBACK_AVATAR = 'https://avatars.githubusercontent.com/u/22217717?v=4';
  const mount = document.getElementById('ossList');
  if(!mount) return;

  const dot = (repo = '') => {
    const r = repo.toLowerCase();
    if (r.includes('hex') || r.includes('labs')) return '#55e6a5';
    if (r.includes('infinitecurios')) return '#60a5fa';
    if (r.includes('synthtax')) return '#a78bfa';
    return '#ff6b6b';
  };

  const pillLabel = (t) => {
    const m = (t || '').toLowerCase();
    if (m === 'commit') return 'Commit';
    if (m === 'push') return 'Push';
    if (m === 'issue' || m === 'issues') return 'Issue';
    if (m === 'pr' || m === 'pullrequest' || m === 'pull_request') return 'PR';
    if (m.includes('merge') || m === 'merged') return 'Merged';
    return t ? t : 'Update';
  };

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

  const normalizeEvents = (events) => {
    if(!Array.isArray(events)) return [];
    return events.map((event) => {
      if(!event || typeof event !== 'object') return null;
      const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
      const repo = event.repo && event.repo.name ? event.repo.name : 'uxillary';
      const createdAt = event.created_at;
      const avatar = event.actor && event.actor.avatar_url ? event.actor.avatar_url : FALLBACK_AVATAR;
      const base = {
        repo,
        avatar,
        date: createdAt,
        id: event.id
      };

      if(event.type === 'PushEvent'){
        const commits = Array.isArray(payload.commits) ? payload.commits : [];
        const first = commits[0] || {};
        const sha = first.sha || '';
        const shortRef = sha ? sha.slice(0, 7) : '';
        const compareUrl = payload.compare || '';
        const commitUrl = sha && repo ? `https://github.com/${repo}/commit/${sha}` : '';
        return {
          ...base,
          type: 'Commit',
          title: first.message || `Pushed ${commits.length || 1} commit${commits.length === 1 ? '' : 's'}`,
          summary: commits.length > 1 ? `${commits.length} commits pushed` : 'Commit pushed',
          shortRef,
          url: commitUrl || compareUrl || `https://github.com/${repo}`
        };
      }

      if(event.type === 'PullRequestEvent' && payload.pull_request){
        return {
          ...base,
          type: payload.action === 'closed' && payload.pull_request.merged_at ? 'Merged' : 'PR',
          title: payload.pull_request.title || 'Pull request update',
          summary: `#${payload.number || payload.pull_request.number || ''} ${payload.action || 'updated'}`.trim(),
          number: payload.pull_request.number,
          url: payload.pull_request.html_url || `https://github.com/${repo}/pulls`
        };
      }

      if(event.type === 'IssuesEvent' && payload.issue){
        return {
          ...base,
          type: 'Issue',
          title: payload.issue.title || 'Issue activity',
          summary: `#${payload.issue.number || ''} ${payload.action || 'updated'}`.trim(),
          number: payload.issue.number,
          url: payload.issue.html_url || `https://github.com/${repo}/issues`
        };
      }

      if(event.type === 'IssueCommentEvent' && payload.issue){
        return {
          ...base,
          type: 'Issue',
          title: payload.issue.title || 'Issue comment',
          summary: `Commented on #${payload.issue.number || ''}`.trim(),
          number: payload.issue.number,
          url: payload.issue.html_url || `https://github.com/${repo}/issues`
        };
      }

      if(event.type === 'CreateEvent'){
        const refType = payload.ref_type || 'branch';
        return {
          ...base,
          type: 'Update',
          title: `Created ${refType}${payload.ref ? ` ${payload.ref}` : ''}`,
          summary: `New ${refType} in ${repo}`,
          url: `https://github.com/${repo}`
        };
      }

      if(event.type === 'ReleaseEvent' && payload.release){
        return {
          ...base,
          type: 'Update',
          title: payload.release.name || payload.release.tag_name || 'Published a release',
          summary: payload.action || 'released',
          url: payload.release.html_url || `https://github.com/${repo}/releases`
        };
      }

      return {
        ...base,
        type: 'Update',
        title: event.type.replace(/Event$/, ''),
        summary: 'Public activity update',
        url: `https://github.com/${repo}`
      };
    }).filter(Boolean);
  };

  const loader = () => {
    mount.setAttribute('aria-busy','true');
    mount.classList.add('oss-grid');
    mount.innerHTML = `
      <div class="t-card flex items-center justify-center min-h-[140px]">
        <div class="tetris-loader" role="status" aria-label="Loading contributions">
          ${Array.from({ length: 12 }).map(() => '<span></span>').join('')}
        </div>
      </div>
    `;
  };

  const render = (items) => {
    mount.classList.add('oss-grid');
    if(!items.length){
      mount.innerHTML = `<div class="t-card">No recent contributions found.</div>`;
      mount.removeAttribute('aria-busy');
      return;
    }

    mount.innerHTML = items.map((it) => {
      const href = safeHref(it.url || it.link || '#');
      const avatar = safeHref(it.avatar || it.userAvatar || FALLBACK_AVATAR);
      const repo = it.repo || it.repository || it.project || 'repo';
      const title = it.title || it.message || it.subtitle || '';
      const type = pillLabel(it.type || it.kind);
      const ref = (it.shortRef || it.sha || it.id || it.number || '').toString().trim();
      const hash = ref ? ref.slice(0, 10) : '';
      const summary = (it.summary || `${type}${ref ? ` ${ref}` : ''}`).trim();
      const repoDescription = it.repoMeta && it.repoMeta.description ? it.repoMeta.description : '';
      const commitMeta = it.commitMeta && typeof it.commitMeta === 'object' ? it.commitMeta : null;
      const statsParts = [];
      if(commitMeta){
        if(Number.isFinite(commitMeta.additions)) statsParts.push(`+${commitMeta.additions}`);
        if(Number.isFinite(commitMeta.deletions)) statsParts.push(`−${commitMeta.deletions}`);
        if(Number.isFinite(commitMeta.filesChanged)) statsParts.push(`${commitMeta.filesChanged} file${commitMeta.filesChanged === 1 ? '' : 's'}`);
      }
      const statsHint = statsParts.join(' • ');
      const ts = resolveTimestamp(it);
      const when = formatInitialTime(it, ts);
      const timeAttr = Number.isFinite(ts) ? ` data-ts="${ts}"` : '';

      return `
        <a class="oss-card" href="${escapeHtml(href)}" rel="noopener noreferrer">
          <div class="oss-head">
            <img class="oss-ava" src="${escapeHtml(avatar)}" alt="" loading="lazy" decoding="async" />
            <div class="flex-1 min-w-0">
              <div class="oss-repo clamp-1">${escapeHtml(repo)}</div>
              <div class="oss-title clamp-2">${escapeHtml(title)}</div>
              <div class="oss-summary clamp-1 text-xs opacity-80">${escapeHtml(summary)}</div>
              ${repoDescription ? `<div class="oss-desc clamp-2 text-[11px] opacity-65">${escapeHtml(repoDescription)}</div>` : ''}
            </div>
            <span class="oss-dot" style="background:${dot(repo)}"></span>
          </div>
          <span class="oss-pill">${escapeHtml(type)}</span>
          <div class="oss-meta">
            ${hash ? `<span class="oss-sha">${escapeHtml(hash)}</span><span class="sep">•</span>` : ''}
            ${statsHint ? `<span class="oss-stats">${escapeHtml(statsHint)}</span><span class="sep">•</span>` : ''}
            <span class="oss-time"${timeAttr}>${escapeHtml(when)}</span>
          </div>
        </a>
      `;
    }).join('');
    mount.removeAttribute('aria-busy');
    updateTimes();
    ensureTicker();
  };

  const fetchFeed = async () => {
    const cacheBust = `cb=${Date.now()}`;
    for (const source of SOURCES) {
      const url = source.includes('?') ? `${source}&${cacheBust}` : `${source}?${cacheBust}`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if(!res.ok) continue;
        const data = await res.json();
        const generatedAt = data && data.generatedAt ? new Date(data.generatedAt).getTime() : Date.now();
        const raw = Array.isArray(data) ? data : (data && data.items) || [];
        const items = uniqueItems(raw).slice(0, 8);
        if(items.length){
          return {
            generatedAt: Number.isNaN(generatedAt) ? Date.now() : generatedAt,
            items
          };
        }
      } catch (error) {
        console.warn(`contribs source failed: ${source}`, error);
      }
    }
    try {
      const res = await fetch(GITHUB_EVENTS_SOURCE, {
        headers: { 'Accept': 'application/vnd.github+json' },
        cache: 'no-store'
      });
      if(res.ok){
        const events = await res.json();
        const items = uniqueItems(normalizeEvents(events)).slice(0, 8);
        if(items.length){
          return { generatedAt: Date.now(), items };
        }
      }
    } catch (error) {
      console.warn('contribs source failed: github events api', error);
    }
    return { generatedAt: Date.now(), items: [] };
  };

  async function load(){
    loader();
    try{
      const data = await fetchFeed();
      baseGeneratedAt = data.generatedAt;
      const items = data.items;
      render(items);
    }catch(e){
      console.error('contribs load failed', e);
      mount.innerHTML = `<div class="t-card">Couldn’t load contributions.</div>`;
      mount.removeAttribute('aria-busy');
    }
  }

  load();
  const btn = document.getElementById('refreshContribs');
  if(btn) btn.addEventListener('click', load);
})();
