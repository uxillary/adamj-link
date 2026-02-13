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
  // Contact collapse: reveal challenge when needed
  const humanChallenge = document.getElementById('humanChallenge');
  const humanToggle = document.getElementById('humanToggle');
  const messageField = document.getElementById('cf-message');
  let challengeShown = false;

  const showChallenge = () => {
    if (!humanChallenge || challengeShown) return;
    challengeShown = true;
    humanChallenge.classList.remove('is-collapsed');
    humanChallenge.setAttribute('aria-hidden', 'false');
    if (humanToggle) {
      humanToggle.setAttribute('aria-expanded', 'true');
      humanToggle.setAttribute('hidden', 'true');
    }
  };

  if (humanChallenge) {
    humanChallenge.classList.add('is-collapsed');
    humanChallenge.setAttribute('aria-hidden', 'true');
    challengeShown = false;
  }

  if (humanToggle) {
    humanToggle.setAttribute('aria-expanded', 'false');
    humanToggle.addEventListener('click', () => {
      showChallenge();
      if (humanChallenge) {
        const focusable = humanChallenge.querySelector('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
      }
    });
  }

  if (messageField) {
    messageField.addEventListener('focus', showChallenge, { once: true });
  }

  if (btn) {
    btn.addEventListener('click', () => { showChallenge(); }, { once: false });
  }

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
      if (humanChallenge) {
        challengeShown = true;
        humanChallenge.classList.remove('is-collapsed');
        humanChallenge.setAttribute('aria-hidden', 'false');
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

(function(){
  const wrap = document.querySelector('[data-upcoming]');
  if(!wrap) return;
  const scroller = wrap.querySelector('[data-drag-scroll]');
  if(!scroller) return;
  const bar = wrap.querySelector('.upcoming-progress-bar');
  let rafId = null;

  const update = () => {
    rafId = null;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const left = scroller.scrollLeft;
    const clamped = Math.max(0, Math.min(1, max > 0 ? left / max : 1));
    wrap.classList.toggle('is-start', left <= 1);
    wrap.classList.toggle('is-end', left >= max - 1);
    if(bar){
      bar.style.setProperty('--progress', max <= 0 ? 1 : clamped);
    }
  };

  const requestUpdate = () => {
    if(rafId !== null) return;
    rafId = requestAnimationFrame(update);
  };

  scroller.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  let isDragging = false;
  let startX = 0;
  let startScroll = 0;

  scroller.addEventListener('pointerdown', e => {
    if(e.button !== 0) return;
    isDragging = true;
    startX = e.clientX;
    startScroll = scroller.scrollLeft;
    scroller.classList.add('is-dragging');
    scroller.setPointerCapture?.(e.pointerId);
  });

  const endDrag = e => {
    if(!isDragging) return;
    isDragging = false;
    scroller.classList.remove('is-dragging');
    scroller.releasePointerCapture?.(e.pointerId);
  };

  scroller.addEventListener('pointermove', e => {
    if(!isDragging) return;
    const dx = e.clientX - startX;
    scroller.scrollLeft = startScroll - dx;
  });
  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointercancel', endDrag);

  scroller.addEventListener('wheel', e => {
    if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
      scroller.scrollLeft += e.deltaY;
      e.preventDefault();
      requestUpdate();
    }
  }, { passive: false });

  requestUpdate();
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

// Tabs: Projects showcase
(() => {
  const projects = document.getElementById('projects');
  if(!projects) return;
  const tabs = Array.from(projects.querySelectorAll('[role="tab"]'));
  if(!tabs.length) return;

  const panelFor = (tab) => {
    const id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  };

  let current = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0];

  const activate = (next, shouldFocus = true) => {
    if(!next) return;
    current = next;
    tabs.forEach(tab => {
      const selected = tab === next;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      if(selected){
        tab.setAttribute('aria-current', 'true');
        tab.removeAttribute('tabindex');
        if(shouldFocus) tab.focus();
      }else{
        tab.removeAttribute('aria-current');
        tab.setAttribute('tabindex', '-1');
      }
      const panel = panelFor(tab);
      if(panel){
        panel.classList.toggle('tab-hidden', !selected);
      }
    });
  };

  const focusNext = (delta) => {
    const index = tabs.indexOf(current);
    const nextIndex = (index + delta + tabs.length) % tabs.length;
    activate(tabs[nextIndex]);
  };

  activate(current, false);
  tabs.forEach(tab => {
    if(tab !== current){
      tab.setAttribute('tabindex', '-1');
      const panel = panelFor(tab);
      if(panel) panel.classList.add('tab-hidden');
    }
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      switch(event.key){
        case 'ArrowLeft':
          event.preventDefault();
          focusNext(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          focusNext(1);
          break;
        case 'Home':
          event.preventDefault();
          activate(tabs[0]);
          break;
        case 'End':
          event.preventDefault();
          activate(tabs[tabs.length - 1]);
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          activate(tab);
          break;
        default:
          break;
      }
    });
  });
})();
