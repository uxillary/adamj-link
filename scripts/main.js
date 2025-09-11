// Year
document.getElementById('y').textContent = new Date().getFullYear();

// Theme toggle with flair (fade + icon spin)
const toggle = document.getElementById('themeToggle');
const icon = document.getElementById('themeIcon');
icon.textContent = document.documentElement.classList.contains('dark') ? '☾' : '☀';
toggle.addEventListener('click', () => {
  icon.classList.add('spin-anim');
  setTimeout(() => icon.classList.remove('spin-anim'), 400);

  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  if (isDark) {
    document.body.classList.add('bg-black','text-zinc-100');
    document.body.classList.remove('bg-white','text-zinc-900');
    icon.textContent = '☾';
  } else {
    document.body.classList.add('bg-white','text-zinc-900');
    document.body.classList.remove('bg-black','text-zinc-100');
    icon.textContent = '☀';
  }
});

// Contact form handling
(function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    const data = Object.fromEntries(new FormData(form).entries());
    try{
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify(data)
      });
      if(res.ok){
        form.innerHTML = '<p class="text-green-500">Thanks, message sent!</p>';
      }else{
        btn.disabled = false;
        btn.textContent = 'Send';
        alert('Failed to send. Please try again later.');
      }
    }catch{
      btn.disabled = false;
      btn.textContent = 'Send';
      alert('Failed to send. Please try again later.');
    }
  });
})();

// Ultra-subtle grid parallax (background-position)
(function(){
  const el = document.getElementById('bgGrid');
  if (!el) return;
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    // Move 1px per 100px scroll — extremely subtle
    const offset = Math.round((y / 100));
    // Shift diagonally a touch
    el.style.backgroundPosition = `${offset}px ${offset}px`;
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Tiny analytics:
// 1) Local page views (per device)
(function(){
  const k = 'aj_views';
  const n = parseInt(localStorage.getItem(k) || '0', 10) + 1;
  localStorage.setItem(k, String(n));
  const el = document.getElementById('views');
  if (el) countUp(el, n);
})();

// 2) GitHub followers (public API, no key)
(function(){
  fetch('https://api.github.com/users/uxillary')
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      const el = document.getElementById('ghFollowers');
      if (!el || !d || typeof d.followers !== 'number') { if (el) el.title = 'Temporarily unavailable'; return; }
      countUp(el, d.followers);
    })
    .catch(()=>{
      const el = document.getElementById('ghFollowers');
      if (el) el.title = 'Temporarily unavailable';
    });
})();

// Radius preference helper (optional, persists)
const savedR = localStorage.getItem('radius');
if(savedR) document.documentElement.setAttribute('data-radius', savedR);
window.setRadius = (v)=>{ document.documentElement.setAttribute('data-radius', v); localStorage.setItem('radius', v); };

// Radius toggle UI
(function(){
  const ui = document.getElementById('radiusUI');
  if(!ui) return;
  const buttons = ui.querySelectorAll('button[data-radius]');
  const update = () => {
    const current = document.documentElement.getAttribute('data-radius');
    buttons.forEach(btn => {
      const active = btn.dataset.radius === current;
      btn.classList.toggle('bg-brand', active);
      btn.classList.toggle('text-black', active);
    });
  };
  buttons.forEach(btn => btn.addEventListener('click', () => {
    setRadius(btn.dataset.radius);
    update();
  }));
  update();
})();

// Scroll-to-top button
(function(){
  const btn = document.getElementById('scrollTop');
  if(!btn) return;
  btn.addEventListener('click', () => {
    const opts = { top: 0, behavior: 'smooth' };
    window.scrollTo(opts);
    document.documentElement.scrollTo(opts);
    document.body.scrollTo(opts);
  });
})();

// Now timeline date-aware progress
(function(){
  const container = document.getElementById('nowTimeline');
  if(!container) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = container.querySelector('.now-track');
  const progress = container.querySelector('.now-progress');
  const todayMarker = container.querySelector('.now-today');
  const items = Array.from(container.querySelectorAll('[data-step]'));
  const dates = items.map(i => new Date(i.dataset.date));

  const setActive = (idx) => {
    items.forEach((item,i)=>{
      const dot = item.querySelector('.now-dot');
      const title = item.querySelector('.now-title');
      if(i===idx){
        item.setAttribute('aria-current','step');
        dot.classList.add('bg-brand','active');
        title.classList.add('text-white','font-semibold');
        item.scrollIntoView({inline:'center',block:'nearest',behavior:prefersReduced?'auto':'smooth'});
      }else{
        item.removeAttribute('aria-current');
        dot.classList.remove('bg-brand','active');
        title.classList.remove('text-white','font-semibold');
      }
    });
  };

  function updateTimelineProgress(){
    const today = new Date();
    today.setHours(0,0,0,0);
    const first = dates[0];
    const last = dates[dates.length-1];
    let fraction = 0;
    if(today <= first) fraction = 0;
    else if(today >= last) fraction = 1;
    else fraction = (today - first) / (last - first);
    const trackWidth = track.getBoundingClientRect().width;
    const width = trackWidth * fraction;
    if(prefersReduced){
      progress.style.transition = 'none';
      todayMarker.style.transition = 'none';
      progress.style.width = width + 'px';
      todayMarker.style.left = track.offsetLeft + width + 'px';
    }else{
      progress.style.transition = '';
      todayMarker.style.transition = '';
      progress.style.width = '0px';
      todayMarker.style.left = track.offsetLeft + 'px';
      requestAnimationFrame(()=>{
        progress.style.width = width + 'px';
        todayMarker.style.left = track.offsetLeft + width + 'px';
      });
    }
    let activeIdx = -1;
    for(let i=dates.length-1;i>=0;i--){
      if(today >= dates[i]){ activeIdx = i; break; }
    }
    setActive(activeIdx);
  }

  updateTimelineProgress();
  let resizeTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateTimelineProgress,150);
  });

  items.forEach(item=>{
    item.addEventListener('click',()=>setActive(parseInt(item.dataset.step,10)));
    item.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        setActive(parseInt(item.dataset.step,10));
      }
    });
  });
})();

const COUNTERS = [
  { id: 'youtube-counter', url: 'https://uxillary.github.io/automated/video-count.txt' },
  { id: 'repo-counter', url: 'https://uxillary.github.io/automated/repos.txt' },
  { id: 'gh-contributions', url: 'https://uxillary.github.io/automated/contributions.txt' },
  { id: 'blog-counter', url: 'https://uxillary.github.io/automated/blog-total.txt' }
];
const MIRRORS = {
  'youtube-counter': 'statVideos',
  'repo-counter': 'statRepos',
  'gh-contributions': 'statContribs',
  'blog-counter': 'statBlog'
};

function fmt(n){
  return new Intl.NumberFormat('en-GB').format(n);
}

function countUp(el, to, ms=800){
  if(!el) return;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labelMatch = el.textContent.match(/^[^:]+:\s*/);
  const label = labelMatch ? labelMatch[0] : '';
  if(prefersReduced){
    el.textContent = label + fmt(to);
    return;
  }
  const from = parseInt(el.textContent.replace(/[^0-9]/g,'') || '0', 10);
  const start = performance.now();
  function frame(now){
    const progress = Math.min((now - start) / ms, 1);
    const value = Math.round(from + (to - from) * progress);
    el.textContent = label + fmt(value);
    if(progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function setNumber(id, value){
  const el = document.getElementById(id);
  if(el) countUp(el, value);
  const mirrorId = MIRRORS[id];
  if(mirrorId){
    const mirrorEl = document.getElementById(mirrorId);
    if(mirrorEl) countUp(mirrorEl, value);
  }
}

async function refreshCounters(){
  const maxAge = 10 * 60 * 1000;
  const now = Date.now();
  for(const {id, url} of COUNTERS){
    const el = document.getElementById(id);
    if(!el) continue;
    try{
      const cached = sessionStorage.getItem(id);
      if(cached){
        const {v, t} = JSON.parse(cached);
        if(now - t < maxAge){
          setNumber(id, v);
          continue;
        }
      }
      const res = await fetch(url);
      if(!res.ok) throw new Error('fetch failed');
      const txt = await res.text();
      const num = parseInt(txt.trim(), 10);
      if(!Number.isFinite(num)) throw new Error('NaN');
      setNumber(id, num);
      sessionStorage.setItem(id, JSON.stringify({v:num, t:now}));
      el.removeAttribute('title');
    }catch{
      el.title = 'Temporarily unavailable';
    }
  }
}

document.addEventListener('DOMContentLoaded', refreshCounters);
