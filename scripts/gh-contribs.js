const OSS_CACHE_KEY = 'aj_oss_v1';
const OSS_CACHE_TTL = 15 * 60 * 1000;
const OSS_MAX_RETRIES = 3;
const OSS_RETRY_DELAY = 5000;
let ossRetries = 0;
// Render recent GitHub contributions into OSS cards

function cacheRead(key){
  try{
    const raw = sessionStorage.getItem(key);
    if(!raw) return null;
    const {items, t} = JSON.parse(raw);
    if(Date.now() - t > OSS_CACHE_TTL) return null;
    return items;
  }catch{ return null; }
}

function cacheWrite(key, items){
  try{ sessionStorage.setItem(key, JSON.stringify({items, t:Date.now()})); }catch{}
}

let rtf;
try{
  rtf = new Intl.RelativeTimeFormat('en', {numeric:'auto'});
}catch{}

function timeAgo(d){
  const date = new Date(d);
  const ts = date.getTime();
  if(Number.isNaN(ts)) return '';

  if(rtf){
    let diff = (ts - Date.now()) / 1000;
    const units = [ ['year',31536000], ['month',2592000], ['day',86400], ['hour',3600], ['minute',60], ['second',1] ];
    for(const [unit, sec] of units){
      if(Math.abs(diff) >= sec || unit === 'second'){
        return rtf.format(Math.round(diff/sec), unit);
      }
    }
  }

  return date.toLocaleDateString('en-GB', {year:'numeric', month:'short', day:'numeric'});
}
function esc(str){ const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

async function fetchContribs(){
  const cached = cacheRead(OSS_CACHE_KEY);
  if(cached) return cached;
  const res = await fetch('/public/contributions.json');
  if(!res.ok) throw new Error('fetch failed');
  const items = await res.json();
  cacheWrite(OSS_CACHE_KEY, items);
  return items;
}

function renderContrib(it){
  const repoFull = it.repoFullName || it.repo || '';
  const repoShort = repoFull.replace(/^.*\//, '');
  const url = it.url || it.link || '#';
  let kind = it.kind || it.type || 'Commit';
  const shaFull = it.sha || it.hash || '';
  const shaShort = (it.shortSha || shaFull).slice(0,7);
  const when = it.when || it.time || it.relative || timeAgo(it.date);
  const title = it.title || it.message || '';
  let subtitle = it.subtitle || '';
  if(!subtitle){
    if(it.kind === 'PR') subtitle = `#${it.number}`;
    else if(it.kind === 'Issue') subtitle = `#${it.number}`;
    else if(it.kind === 'Release') subtitle = it.tag || '';
  }

  const badgeLabel = kind === 'PR' ? (it.merged ? 'PR merged' : 'PR') : kind;
  const badgeTitle = kind === 'PR' ? `Pull Request${it.merged ? ' • merged' : ''}` : kind;
  const meta = kind === 'Commit' ? shaShort : kind === 'PR' ? `#${it.number}${it.merged ? ' • merged' : ''}` : kind === 'Issue' ? `#${it.number}` : kind === 'Release' ? (it.tag || '') : '';
  const icons = {
    'Commit':'<svg class="icon-line" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6"/></svg>',
    'PR':'<svg class="icon-line" viewBox="0 0 24 24"><path d="M6 3v12"/><circle cx="6" cy="15" r="3"/><path d="M6 6a6 6 0 0 1 6 6v3"/><circle cx="12" cy="15" r="3"/></svg>',
    'Issue':'<svg class="icon-line" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
    'Release':'<svg class="icon-line" viewBox="0 0 24 24"><path d="M3 3h7l11 11-7 7L3 10V3z"/><path d="M7 7h.01"/></svg>'
  };
  const icon = icons[kind === 'PR' ? 'PR' : kind] || '';

  const clampClass = 'line-clamp-2';

  return `
    <article class="oss-card t-card p-4 h-full flex flex-col">
      <!-- Top row: avatar + repo + time -->
      <div class="flex items-center justify-between text-xs text-zinc-400 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          ${it.avatar ? `<img src="${it.avatar}" alt="" class="w-4 h-4 rounded-full shrink-0">` : ''}
          <a href="${url}" class="min-w-0 inline-flex items-center gap-1 truncate" title="${esc(repoFull)}">
            ${it.langColor ? `<span class="w-2 h-2 rounded-full shrink-0" style="background:${it.langColor}"></span>` : ''}
            <span class="truncate">${esc(repoShort)}</span>
          </a>
        </div>
        <span class="whitespace-nowrap text-zinc-500">${esc(when)}</span>
      </div>

      <div class="mt-2 h-px bg-zinc-800/60"></div>

      <!-- Title / message -->
      <h3 class="mt-2 text-sm text-zinc-200 ${clampClass}">
        ${esc(title) || '&nbsp;'}
      </h3>

      <!-- Optional small subtitle (PR number, etc.) -->
      ${subtitle ? `<div class="mt-1 text-xs text-zinc-500">${esc(subtitle)}</div>` : ''}

      <!-- Spacer to push meta row down -->
      <div class="mt-auto"></div>

      <!-- Meta row: badge left, meta right -->
      <div class="pt-2 flex items-center justify-between text-xs text-zinc-500">
        <span class="badge inline-flex items-center gap-1 shrink-0" title="${esc(badgeTitle)}">${icon}${esc(badgeLabel)}</span>
        <span class="${kind==='Commit'?'copy-sha cursor-pointer text-zinc-400':''}"${kind==='Commit'?` data-sha="${shaFull}"`:''}>${esc(meta)}</span>
      </div>
    </article>
  `;
}

function renderContribs(items){
  const list = document.getElementById('ossList');
  list.innerHTML = items.map(renderContrib).join('');
  list.removeAttribute('aria-busy');
}

function showFallback(){
  const list = document.getElementById('ossList');
  list.innerHTML='<div class="text-sm text-zinc-500">Unable to load contributions.</div>';
  list.removeAttribute('aria-busy');
}

function renderLoader(){
  const list = document.getElementById('ossList');
  list.setAttribute('aria-busy','true');
  list.innerHTML='<div class="col-span-full flex justify-center"><div class="tetris-loader" aria-hidden="true"><span></span><span></span><span></span><span></span></div></div>';
}

function loadContribs(force=false){
  if(force){
    try{ sessionStorage.removeItem(OSS_CACHE_KEY); }catch{}
    ossRetries = 0;
  }
  renderLoader();
  fetchContribs().then(items=>{
    if(!items || !items.length) throw new Error('empty');
    ossRetries = 0;
    renderContribs(items);
  }).catch(()=>{
    if(ossRetries < OSS_MAX_RETRIES){
      ossRetries++;
      setTimeout(()=>loadContribs(force), OSS_RETRY_DELAY);
    }else{
      showFallback();
    }
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  loadContribs();
  const btn=document.getElementById('refreshContribs');
  if(btn) btn.addEventListener('click',()=>{ ossRetries=0; loadContribs(true); });
});

document.addEventListener('click',e=>{
  const t=e.target.closest('.copy-sha');
  if(!t) return;
  e.preventDefault();
  e.stopPropagation();
  const sha=t.dataset.sha;
  navigator.clipboard.writeText(sha).then(()=>{
    const txt=t.textContent;
    t.textContent='copied';
    setTimeout(()=>{t.textContent=txt;},1000);
  });
});
