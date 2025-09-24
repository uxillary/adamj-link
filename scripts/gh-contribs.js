// gh-contribs.js — compact “micro-card” renderer
(function(){
  const SOURCE = '/public/contributions.json';
  const FALLBACK_AVATAR = 'https://avatars.githubusercontent.com/u/2219901?v=4';
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

  const parseRelative = (value) => {
    if(!value) return '';
    if(/just now/i.test(value)) return 'just now';
    const match = String(value).match(/(\d+)\s*(second|sec|minute|min|hour|day|week|month|year)s?/i);
    if(!match) return value;
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const symbol = unit.startsWith('year') ? 'y'
      : unit.startsWith('month') ? 'mo'
      : unit.startsWith('week') ? 'w'
      : unit.startsWith('day') ? 'd'
      : unit.startsWith('hour') ? 'h'
      : 'm';
    return `${amount}${symbol} ago`;
  };

  const ago = (item) => {
    if(item.timeAgo) return parseRelative(item.timeAgo);
    const ts = item.date || item.createdAt || item.timestamp;
    if(!ts) return '';
    const d = new Date(ts);
    if(Number.isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    const minutes = Math.floor(diff / 60);
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
      const when = ago(it);

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
            <span>${when}</span>
          </div>
        </a>
      `;
    }).join('');
    mount.removeAttribute('aria-busy');
  };

  async function load(){
    loader();
    try{
      const res = await fetch(SOURCE, { cache: 'reload' });
      const data = await res.json();
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
