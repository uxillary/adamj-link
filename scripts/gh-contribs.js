// gh-contribs.js — compact “micro-card” renderer
(function(){
  const SOURCE = '/public/contributions.json';
  const FALLBACK_AVATAR = 'https://avatars.githubusercontent.com/u/22217717?v=4';
  const VIEW_KEY = 'contribViewMode';
  const mount = document.getElementById('ossList');
  if(!mount) return;

  const simpleBtn = document.getElementById('simpleViewBtn');
  const devBtn = document.getElementById('devViewBtn');

  const dot = (repo = '') => {
    const r = repo.toLowerCase();
    if (r.includes('hex') || r.includes('labs')) return '#55e6a5';
    if (r.includes('infinitecurios')) return '#60a5fa';
    if (r.includes('synthtax')) return '#a78bfa';
    return '#ff6b6b';
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

  const normalizeType = (value = '') => String(value).toLowerCase().replace(/[_\-\s]/g, '');
  const friendlyLabel = (type = '', text = '') => {
    const t = normalizeType(type);
    const hay = `${type} ${text}`.toLowerCase();
    if (hay.includes('deleted branch') || hay.includes('delete branch')) return 'Cleaned Up';
    if (t.includes('merge') || hay.includes('merged')) return 'Merged Changes';
    if (t.includes('issue') || hay.includes('issue')) return 'Issue / Fix';
    if (t.includes('pullrequest') || t === 'pr' || /\bpull request\b|\bpr\b/.test(hay)) return 'Feature Review';
    if (t.includes('push') || t.includes('commit') || hay.includes('commit') || hay.includes('push')) return 'Code Update';
    return 'Project Update';
  };

  const cleanSummary = (raw = '') => {
    if(!raw) return '';
    let text = String(raw).trim().replace(/^['"`]|['"`]$/g, '');
    text = text.replace(/^(feat|fix|chore|docs|style|refactor|perf|test|build|ci)(\([^)]+\))?:\s*/i, '');
    text = text.replace(/\b(ultra-light|wip|tmp|misc)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    if(!text) return '';
    text = text.replace(/\blanding\b/gi, 'landing page');
    text = text.replace(/^[a-z]/, (m) => m.toUpperCase());
    if(!/[.!?]$/.test(text)){
      text = /(add|update|improve|polish|refactor|clean|merge|fix)/i.test(text)
        ? `${text}.`
        : `Updated ${text.toLowerCase()}.`;
    }
    if(/\bpolish(ed|ing)?\b/i.test(text) && /landing page/i.test(text)) return 'Polished the landing page experience.';
    return text;
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

  let baseGeneratedAt = Date.now();
  let ticker = null;
  let currentView = localStorage.getItem(VIEW_KEY) === 'dev' ? 'dev' : 'simple';

  const setView = (next) => {
    currentView = next === 'dev' ? 'dev' : 'simple';
    mount.setAttribute('data-view', currentView);
    localStorage.setItem(VIEW_KEY, currentView);
    if(simpleBtn) {
      const on = currentView === 'simple';
      simpleBtn.classList.toggle('is-active', on);
      simpleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if(devBtn) {
      const on = currentView === 'dev';
      devBtn.classList.toggle('is-active', on);
      devBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  };

  const resolveTimestamp = (item) => {
    const direct = item.date || item.createdAt || item.timestamp || item.datetime || item.time || item.occurredAt;
    if(direct !== undefined){
      if(typeof direct === 'number' && Number.isFinite(direct)) return direct;
      const ms = new Date(direct).getTime();
      if(!Number.isNaN(ms)) return ms;
    }
    const seconds = parseRelativeToSeconds(item.timeAgo);
    if(seconds == null) return NaN;
    return (Number.isFinite(baseGeneratedAt) ? baseGeneratedAt : Date.now()) - seconds * 1000;
  };

  const updateTimes = () => {
    const now = Date.now();
    mount.querySelectorAll('[data-ts]').forEach((node) => {
      const ts = Number(node.getAttribute('data-ts'));
      if(Number.isFinite(ts)) node.textContent = formatRelativeFromSeconds(Math.max(0, Math.floor((now - ts) / 1000)));
    });
  };

  const ensureTicker = () => { if(!ticker) ticker = setInterval(updateTimes, 60 * 1000); };
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
    mount.innerHTML = `<div class="t-card flex items-center justify-center min-h-[140px]"><div class="tetris-loader" role="status" aria-label="Loading contributions">${Array.from({ length: 12 }).map(() => '<span></span>').join('')}</div></div>`;
  };

  const render = (items) => {
    mount.classList.add('oss-grid');
    if(!items.length){
      mount.innerHTML = `<div class="t-card">No recent build updates found.</div>`;
      mount.removeAttribute('aria-busy');
      return;
    }
    mount.innerHTML = items.map((it) => {
      const href = safeHref(it.url || it.link || '#');
      const avatar = safeHref(it.avatar || it.userAvatar || FALLBACK_AVATAR);
      const repo = it.repo || it.repository || it.project || 'project';
      const rawType = it.type || it.kind || 'update';
      const sourceText = it.title || it.message || it.subtitle || it.summary || '';
      const label = friendlyLabel(rawType, sourceText);
      const summary = cleanSummary(sourceText || it.summary || label);
      const ref = (it.shortRef || it.sha || it.id || it.number || '').toString().trim();
      const hash = ref ? ref.slice(0, 10) : '';
      const commitMeta = it.commitMeta && typeof it.commitMeta === 'object' ? it.commitMeta : null;
      const statsParts = [];
      if(commitMeta){
        if(Number.isFinite(commitMeta.additions)) statsParts.push(`+${commitMeta.additions}`);
        if(Number.isFinite(commitMeta.deletions)) statsParts.push(`−${commitMeta.deletions}`);
        if(Number.isFinite(commitMeta.filesChanged)) statsParts.push(`${commitMeta.filesChanged} file${commitMeta.filesChanged === 1 ? '' : 's'}`);
      }
      const ts = resolveTimestamp(it);
      const when = Number.isFinite(ts) ? formatRelativeFromSeconds(Math.max(0, Math.floor((Date.now() - ts) / 1000))) : (it.timeAgo || 'recently');
      const timeAttr = Number.isFinite(ts) ? ` data-ts="${ts}"` : '';

      return `<a class="oss-card" href="${escapeHtml(href)}" rel="noopener noreferrer"><div class="oss-head"><img class="oss-ava" src="${escapeHtml(avatar)}" alt="" loading="lazy" decoding="async" /><div class="flex-1 min-w-0"><div class="oss-repo clamp-1">${escapeHtml(repo)}</div><div class="oss-title clamp-2">${escapeHtml(label)}</div><div class="oss-summary clamp-2">${escapeHtml(summary || 'Project update made.')}</div></div><span class="oss-dot" style="background:${dot(repo)}"></span></div><div class="oss-meta"><span class="oss-time"${timeAttr}>${escapeHtml(when)}</span></div>${hash || statsParts.length ? `<div class="oss-devline"><span class="oss-dev-title">Dev details</span>${hash ? `<span class="oss-sha">#${escapeHtml(hash)}</span>` : ''}<span class="oss-raw-type">${escapeHtml(String(rawType))}</span></div>` : ''}${statsParts.length ? `<div class="oss-stats-row">${escapeHtml(statsParts.join(' • '))}</div>` : ''}</a>`;
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
      render(uniqueItems(raw).slice(0, 8));
    }catch(e){
      console.error('contribs load failed', e);
      mount.innerHTML = `<div class="t-card">Couldn’t load contributions.</div>`;
      mount.removeAttribute('aria-busy');
    }
  }

  if(simpleBtn) simpleBtn.addEventListener('click', () => setView('simple'));
  if(devBtn) devBtn.addEventListener('click', () => setView('dev'));

  setView(currentView);
  load();
  const btn = document.getElementById('refreshContribs');
  if(btn) btn.addEventListener('click', load);
})();
