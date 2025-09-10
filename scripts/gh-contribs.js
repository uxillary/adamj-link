const GH_USER = 'uxillary';
const OSS_LIMIT = 6;
const OSS_CACHE_KEY = 'aj_oss_v1';
const OSS_CACHE_TTL = 15 * 60 * 1000;
const LANG_COLORS = { JavaScript:'#f1e05a', TypeScript:'#3178c6', HTML:'#e34c26', CSS:'#563d7c', Python:'#3572A5', Go:'#00ADD8', Rust:'#dea584', Shell:'#89e051', Java:'#b07219' };

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
function cleanMessage(msg){ return msg.replace(/^(feat|chore|fix|refactor|docs|test|style|perf|ci|build)(\(.+\))?:\s*/i,'').trim(); }

async function fetchContribs(){
  const cached = cacheRead(OSS_CACHE_KEY);
  if(cached) return cached;
  const res = await fetch(`https://api.github.com/users/${GH_USER}/events/public`);
  if(!res.ok) throw new Error('fetch failed');
  const data = await res.json();
  const mapped = data.filter(e=>['PushEvent','PullRequestEvent','IssuesEvent','ReleaseEvent'].includes(e.type))
    .map(e=>{
      const item = {repo:e.repo.name, date:e.created_at};
      switch(e.type){
        case 'PushEvent':{
          const c = e.payload.commits && e.payload.commits[0];
          item.kind='Commit';
          if(c){ item.message=c.message; item.sha=c.sha; item.link=`https://github.com/${e.repo.name}/commit/${c.sha}`; }
          else { item.message='Pushed commits'; item.link=`https://github.com/${e.repo.name}`; }
          break;}
        case 'PullRequestEvent':
          item.kind='PR';
          item.merged=e.payload.pull_request.merged;
          item.number=e.payload.pull_request.number;
          item.message=e.payload.pull_request.title;
          item.link=e.payload.pull_request.html_url;
          break;
        case 'IssuesEvent':
          item.kind='Issue';
          item.number=e.payload.issue.number;
          item.message=e.payload.issue.title;
          item.link=e.payload.issue.html_url;
          break;
        case 'ReleaseEvent':
          item.kind='Release';
          item.tag=e.payload.release.tag_name;
          item.message=e.payload.release.name || item.tag;
          item.link=e.payload.release.html_url;
          break;
      }
      item.message = cleanMessage(item.message);
      return item;
    });

  const items = [];
  const seen = new Set();
  for(const item of mapped){
    const key = item.repo + '|' + item.message;
    if(seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if(items.length === OSS_LIMIT) break;
  }

  const repos = [...new Set(items.map(i=>i.repo))];
  await Promise.all(repos.map(async repo=>{
    try{
      const r = await fetch(`https://api.github.com/repos/${repo}`);
      if(!r.ok) return;
      const j = await r.json();
      items.filter(i=>i.repo===repo).forEach(i=>{
        i.stars=j.stargazers_count;
        i.language=j.language;
        i.avatar=j.owner && j.owner.avatar_url;
        i.langColor=LANG_COLORS[j.language] || '#999';
      });
    }catch{}
  }));

  items.forEach(i=>{ if(i.kind==='Commit' && i.sha) i.shortSha=i.sha.slice(0,7); if(i.language && !i.langColor) i.langColor='#999'; });

  cacheWrite(OSS_CACHE_KEY, items);
  return items;
}

function renderContribs(items){
  const list = document.getElementById('ossList');
  list.innerHTML='';
  items.forEach(item=>{
    const card=document.createElement('a');
    card.href=item.link;
    card.className='t-card p-4 flex flex-col gap-2 focus-ring hover:-translate-y-0.5 hover:ring-1 hover:ring-brand/40';
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

function renderSkeletons(){
  const list = document.getElementById('ossList');
  list.setAttribute('aria-busy','true');
  list.innerHTML='';
  for(let i=0;i<OSS_LIMIT;i++){
    const sk=document.createElement('div');
    sk.className='t-card p-4 flex flex-col gap-2 animate-pulse';
    sk.innerHTML=`<div class="flex items-center justify-between"><div class="h-3 bg-zinc-700/40 rounded w-24"></div><div class="h-3 bg-zinc-700/40 rounded w-12"></div></div><div class="h-4 bg-zinc-700/30 rounded w-5/6"></div><div class="h-4 bg-zinc-700/30 rounded w-2/3"></div><div class="h-3 bg-zinc-700/30 rounded w-16 mt-1"></div>`;
    list.appendChild(sk);
  }
}

function loadContribs(force=false){
  if(force) try{ sessionStorage.removeItem(OSS_CACHE_KEY); }catch{}
  renderSkeletons();
  fetchContribs().then(renderContribs).catch(showFallback);
}

document.addEventListener('DOMContentLoaded',()=>{
  loadContribs();
  const btn=document.getElementById('refreshContribs');
  if(btn) btn.addEventListener('click',()=>loadContribs(true));
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
