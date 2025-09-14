const OSS_CACHE_KEY = 'aj_oss_v1';
const OSS_CACHE_TTL = 15 * 60 * 1000;
const OSS_MAX_RETRIES = 3;
const OSS_RETRY_DELAY = 5000;
let ossRetries = 0;

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

const rtf = new Intl.RelativeTimeFormat('en', {numeric:'auto'});
function timeAgo(d){
  let diff = (new Date(d).getTime() - Date.now()) / 1000;
  const units = [ ['year',31536000], ['month',2592000], ['day',86400], ['hour',3600], ['minute',60], ['second',1] ];
  for(const [unit, sec] of units){
    if(Math.abs(diff) >= sec || unit === 'second'){
      return rtf.format(Math.round(diff/sec), unit);
    }
  }
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

function renderContribs(items){
  const list = document.getElementById('ossList');
  list.innerHTML='';
  items.forEach(item=>{
    const card=document.createElement('a');
    card.href=item.link;
    card.className='t-card p-3 flex flex-col gap-1.5 focus-ring hover:-translate-y-0.5 hover:ring-1 hover:ring-brand/40';
    const badgeLabel = item.kind==='PR'? (item.merged?'PR merged':'PR') : item.kind;
    const badgeTitle = item.kind==='PR' ? `Pull Request${item.merged?' • merged':''}` : item.kind;
    const meta = item.kind==='Commit'? item.shortSha : item.kind==='PR'? `#${item.number}${item.merged?' • merged':''}` : item.kind==='Issue'? `#${item.number}` : item.kind==='Release'? item.tag : '';
    const icon = {
      'Commit':'<svg class="icon-line" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6"/></svg>',
      'PR':'<svg class="icon-line" viewBox="0 0 24 24"><path d="M6 3v12"/><circle cx="6" cy="15" r="3"/><path d="M6 6a6 6 0 0 1 6 6v3"/><circle cx="12" cy="15" r="3"/></svg>',
      'Issue':'<svg class="icon-line" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
      'Release':'<svg class="icon-line" viewBox="0 0 24 24"><path d="M3 3h7l11 11-7 7L3 10V3z"/><path d="M7 7h.01"/></svg>'
    }[item.kind==='PR'?'PR':item.kind];
    card.innerHTML=`<div class="flex items-center justify-between text-xs text-zinc-400">
        <div class="flex items-center gap-2">
          ${item.avatar ? `<img src="${item.avatar}" alt="" class="w-4 h-4 rounded-full">` : ''}
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full" style="background:${item.langColor}"></span>${esc(item.repo)}</span>
        </div>
        <span class="text-zinc-500">${timeAgo(item.date)}</span>
      </div>
      <div class="h-px bg-zinc-800/60"></div>
      <div class="text-sm text-white clamp-2">${esc(item.message)}</div>
      <div class="flex items-center justify-between text-xs mt-1">
        <span class="badge" title="${badgeTitle}">${icon}${badgeLabel}</span>
        <span class="${item.kind==='Commit'?'copy-sha cursor-pointer text-zinc-400':''}"${item.kind==='Commit'?` data-sha="${item.shortSha}"`:''}>${esc(meta)}</span>
      </div>`;
    list.appendChild(card);
  });
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
