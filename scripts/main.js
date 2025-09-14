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

  icon.textContent = isDark ? '☾' : '☀';
});

// Contact form handling
(function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  const fields = form.querySelectorAll('input[required], textarea[required]');
  const cfStatus = form.querySelector('#cf-status');
  const btn = form.querySelector('button[type="submit"]');
  const status = document.getElementById('hcStatus');
  const refreshBtn = document.getElementById('hcRefresh');

  // Disable submit until solved
  if (btn) {
    btn.disabled = true;
    btn.classList.add('opacity-60','cursor-not-allowed');
  }

  // Listen for completion from the challenge renderer
  window.addEventListener('human:solved', () => {
    form.dataset.validated = 'true';
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('opacity-60','cursor-not-allowed');
    }
    if (status) status.textContent = 'Nice one — challenge complete. You can send your message.';
  });

  // Allow user to roll a different challenge
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      form.dataset.validated = '';
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-60','cursor-not-allowed');
      }
      if (status) status.textContent = 'Swapped the challenge — complete it to enable Send.';
      if (window.humanChallenge && typeof window.humanChallenge.reset === 'function') {
        window.humanChallenge.reset();
      }
    });
  }

  fields.forEach(f=>{
    f.addEventListener('input',()=>{
      f.setAttribute('aria-invalid', f.checkValidity() ? 'false' : 'true');
    });
  });

  form.addEventListener('submit', async (e)=>{
    if (!form.dataset.validated) {
      e.preventDefault();
      alert('Please complete the challenge first.');
      return;
    }
    e.preventDefault();
    if(btn){
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }
    if(cfStatus){
      cfStatus.textContent = '';
      cfStatus.classList.remove('text-red-500');
    }
    const data = Object.fromEntries(new FormData(form).entries());
    for(const f of fields){
      if(!f.checkValidity()){
        f.setAttribute('aria-invalid','true');
        if(btn){
          btn.disabled = false;
          btn.textContent = 'Send';
        }
        f.focus();
        return;
      }
    }
    try{
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type':'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json().catch(()=>({}));
      if(res.ok && result.success){
        form.innerHTML = '<p class="text-green-500">Thanks! I\u2019ll reply within 24\u201348h.</p>';
      }else{
        throw new Error(result.error || 'Failed to send. Please try again later.');
      }
    }catch(err){
      if(btn){
        btn.disabled = false;
        btn.textContent = 'Send';
      }
      if(cfStatus){
        cfStatus.textContent = err.message;
        cfStatus.classList.add('text-red-500');
      }
      console.error('Contact form error:', err);
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
// 1) Page views — global with local fallback
(function(){
  const k = 'aj_views';
  const n = parseInt(localStorage.getItem(k) || '0', 10) + 1;
  localStorage.setItem(k, String(n));
  const el = document.getElementById('views');
  if (!el) return;
  const wrap = el.parentElement;

  countUp(el, n); // local count first

  const cacheKey = 'aj_views_global';
  const maxAge = 15 * 60 * 1000;
  const now = Date.now();

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { v, t } = JSON.parse(cached);
      if (typeof v === 'number' && now - t < maxAge) {
        wrap.title = 'Global views';
        countUp(el, v);
        return;
      }
    }
  } catch {}

  document.addEventListener('DOMContentLoaded', async () => {
    const path = encodeURIComponent(location.pathname);
    try {
      let res = await fetch(`/api/views?path=${path}`, { method: 'POST' });
      if (!res.ok) {
        res = await fetch(`/api/views?path=${path}`);
      }
      const d = res.ok ? await res.json() : null;
      if (!d || typeof d.count !== 'number') { el.title = 'Temporarily unavailable'; return; }
      wrap.title = 'Global views';
      el.removeAttribute('title');
      countUp(el, d.count);
      sessionStorage.setItem(cacheKey, JSON.stringify({ v: d.count, t: Date.now() }));
    } catch {
      el.title = 'Temporarily unavailable';
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const list = container.querySelector('ul');
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
    const trackWidth = list.scrollWidth;
    track.style.width = trackWidth + 'px';
    const width = trackWidth * fraction;
    if(prefersReduced){
      progress.style.transition = 'none';
      todayMarker.style.transition = 'none';
      progress.style.width = width + 'px';
      todayMarker.style.left = width + 'px';
    }else{
      progress.style.transition = '';
      todayMarker.style.transition = '';
      progress.style.width = '0px';
      todayMarker.style.left = '0px';
      requestAnimationFrame(()=>{
        progress.style.width = width + 'px';
        todayMarker.style.left = width + 'px';
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
  { id: 'blog-counter', url: 'https://uxillary.github.io/automated/blog-total.txt' },
  { id: 'subscriber-counter', url: 'https://uxillary.github.io/automated/total-subscribers.txt' }
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

document.addEventListener('DOMContentLoaded', () => {
  const analyticsSection = document.getElementById('views')?.closest('section');
  if(!analyticsSection) return;
  const obs = new IntersectionObserver((entries, observer) => {
    if(entries.some(e => e.isIntersecting)){
      refreshCounters();
      observer.disconnect();
    }
  }, { threshold:0.3 });
  obs.observe(analyticsSection);
});
