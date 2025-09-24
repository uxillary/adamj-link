// gh-contribs.js — compact “micro-card” renderer
(function(){
  const mount = document.getElementById('ossList');
  if(!mount) return;

  // map provider/repo to a subtle dot color
  const dot = (repo) => {
    const r = repo.toLowerCase();
    if (r.includes('reddi')) return '#60a5fa';
    if (r.includes('synthtax')) return '#a78bfa';
    if (r.includes('hex') || r.includes('labs')) return '#55e6a5';
    return '#55e6a5'; // default brand
  };

  const pillLabel = (t) => {
    const m = (t||'').toLowerCase();
    if (m==='commit') return 'Commit';
    if (m==='push') return 'Push';
    if (m==='issue' || m==='issues') return 'Issue';
    if (m==='pr' || m==='pullrequest') return 'PR';
    if (m.includes('merged')) return 'PR merged';
    if (m==='merge') return 'PR merged';
    if (m==='delete') return 'Delete';
    if (m==='create') return 'Create';
    return t || 'Update';
  };

  const ago = (ts) => {
    const d = ts ? new Date(ts) : null;
    if(!d || isNaN(d)) return '';
    const s = Math.floor((Date.now()-d.getTime())/1000);
    const M = Math.floor(s/60), H=Math.floor(M/60), D=Math.floor(H/24);
    if (D>0) return `${D} day${D>1?'s':''} ago`;
    if (H>0) return `${H} hour${H>1?'s':''} ago`;
    if (M>0) return `${M} min${M>1?'s':''} ago`;
    return 'just now';
  };

  function skeleton(n=8){
    mount.setAttribute('aria-busy','true');
    mount.classList.add('oss-grid');
    mount.innerHTML = Array.from({length:n}).map(()=>`
      <div class="oss-card">
        <div class="oss-head">
          <div class="oss-ava" style="background:rgba(255,255,255,0.05)"></div>
          <div class="flex-1">
            <div class="oss-repo" style="height:12px;background:rgba(255,255,255,.08)"></div>
            <div class="oss-title" style="height:12px;margin-top:.35rem;background:rgba(255,255,255,.06)"></div>
          </div>
        </div>
        <span class="oss-pill" style="opacity:.6">Loading…</span>
        <div class="oss-meta"><span class="oss-sha">……</span><span class="sep">•</span><span>…</span></div>
      </div>
    `).join('');
  }

  function render(items){
    mount.innerHTML = items.map(it=>{
      const href = it.url || it.link || '#';
      const avatar = it.avatar || it.userAvatar || 'https://avatars.githubusercontent.com/u/9919?s=32'; // fallback
      const repo = it.repo || it.repository || it.project || 'repo';
      const title = it.title || it.message || it.subtitle || '';
      const type = pillLabel(it.type || it.kind);
      const hash = (it.shortRef || it.sha || it.id || it.number || '').toString().slice(0,7);
      const when = it.timeAgo || ago(it.date || it.createdAt || it.timestamp);

      return `
        <a class="oss-card" href="${href}" rel="noopener noreferrer">
          <div class="oss-head">
            <img class="oss-ava" src="${avatar}" alt="" loading="lazy" decoding="async"/>
            <div class="flex-1 min-w-0">
              <div class="oss-repo clamp-1">${repo}</div>
              <div class="oss-title clamp-2">${title}</div>
            </div>
            <span class="oss-dot" style="background:${dot(repo)}"></span>
          </div>
          <span class="oss-pill">${type}</span>
          <div class="oss-meta">
            ${hash ? `<span class="oss-sha">${hash}</span><span class="sep">•</span>`:''}
            <span>${when}</span>
          </div>
        </a>
      `;
    }).join('');
    mount.removeAttribute('aria-busy');
  }

  const SOURCE = '/public/contributions.json';

  async function load(){
    skeleton();
    try{
      const res = await fetch(SOURCE, { cache: 'reload' });
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      render(items.slice(0,8));
    }catch(e){
      console.error('contribs load failed', e);
      mount.innerHTML = `<div class="t-card">Couldn’t load contributions.</div>`;
      mount.removeAttribute('aria-busy');
    }
  }

  // kick off + expose manual refresh (button already exists)
  load();
  const btn = document.getElementById('refreshContribs');
  if(btn) btn.addEventListener('click', load);
})();
