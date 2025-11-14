// gh-contribs.js — compact “micro-card” renderer
(function(){
  const SOURCE = '/public/contributions.json';
  const FALLBACK_AVATAR = 'https://avatars.githubusercontent.com/u/22217717?v=4';
  const mount = document.getElementById('ossList');
  if(!mount) return;

  const dot = () => '#55e6a5';

  const pillLabel = (t) => {
    const m = (t || '').toLowerCase();
    if (m === 'commit') return 'Commit';
    if (m === 'push') return 'Push';
    if (m === 'issue' || m === 'issues') return 'Issue';
    if (m === 'pr' || m === 'pullrequest' || m === 'pull_request') return 'PR';
    if (m.includes('merge') || m === 'merged') return 'Merged';
    return t ? t : 'Update';
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
      const href = it.url || it.link || '#';
      const avatar = it.avatar || it.userAvatar || FALLBACK_AVATAR;
      const repo = it.repo || it.repository || it.project || 'repo';
      const title = it.title || it.message || it.subtitle || '';
      const type = pillLabel(it.type || it.kind);
      const ref = (it.shortRef || it.sha || it.id || it.number || '').toString().trim();
      const hash = ref ? ref.slice(0, 10) : '';
      const ts = resolveTimestamp(it);
      const when = formatInitialTime(it, ts);
      const timeAttr = Number.isFinite(ts) ? ` data-ts="${ts}"` : '';

      return `
        <a class="oss-card" href="${href}" rel="noopener noreferrer">
          <div class="oss-head">
            <img class="oss-ava" src="${avatar}" alt="" loading="lazy" decoding="async" />
            <div class="flex-1 min-w-0">
              <div class="oss-repo clamp-1">${repo}</div>
              <div class="oss-title clamp-2">${title}</div>
            </div>
            <span class="oss-dot" style="background:${dot(repo)}"></span>
          </div>
          <span class="oss-pill">${type}</span>
          <div class="oss-meta">
            ${hash ? `<span class="oss-sha">${hash}</span><span class="sep">•</span>` : ''}
            <span class="oss-time"${timeAttr}>${when}</span>
          </div>
        </a>
      `;
    }).join('');
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
      const items = uniqueItems(raw).slice(0, 8);
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
