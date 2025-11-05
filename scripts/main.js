// Year
document.getElementById('y').textContent = new Date().getFullYear();

// Theme toggle with flair (fade + icon spin)
const toggle = document.getElementById('themeToggle');
const icon = document.getElementById('themeIcon');
const docEl = document.documentElement;
if(toggle && icon){
  const setThemeIcon = () => { icon.textContent = docEl.classList.contains('dark') ? '☾' : '☀'; };
  const emitThemeChange = (mode) => document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: mode } }));
  setThemeIcon();
  emitThemeChange(docEl.classList.contains('dark') ? 'dark' : 'light');

  toggle.addEventListener('click', () => {
    icon.classList.add('spin-anim');
    setTimeout(() => icon.classList.remove('spin-anim'), 400);

    const isDark = docEl.classList.toggle('dark');
    const mode = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', mode);
    setThemeIcon();
    emitThemeChange(mode);
  });
}

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
  const overrideDate = container.dataset.today ? new Date(container.dataset.today) : null;
  const hasValidOverride = overrideDate instanceof Date && !Number.isNaN(overrideDate?.getTime());

  const setActive = (idx) => {
    items.forEach((item,i)=>{
      const dot = item.querySelector('.now-dot');
      const title = item.querySelector('.now-title');
      if(i===idx){
        item.setAttribute('aria-current','step');
        dot.classList.add('bg-brand','active');
        title.classList.add('text-white','font-semibold');
        if(idx >= 0 && container.scrollWidth > container.clientWidth){
          const targetRect = item.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offset = targetRect.left - containerRect.left + container.scrollLeft;
          const center = offset - (container.clientWidth - item.offsetWidth) / 2;
          const maxScroll = container.scrollWidth - container.clientWidth;
          const nextScroll = Math.min(Math.max(center, 0), Math.max(maxScroll, 0));
          container.scrollTo({
            left: nextScroll,
            behavior: prefersReduced ? 'auto' : 'smooth'
          });
        }
      }else{
        item.removeAttribute('aria-current');
        dot.classList.remove('bg-brand','active');
        title.classList.remove('text-white','font-semibold');
      }
    });
  };

  function updateTimelineProgress(){
    if(!items.length) return;
    const today = hasValidOverride ? new Date(overrideDate) : new Date();
    today.setHours(0,0,0,0);

    const wrap = list.parentElement;
    const wrapRect = wrap.getBoundingClientRect();
    const positions = items.map(item => {
      const dot = item.querySelector('.now-dot');
      const sourceRect = (dot ? dot.getBoundingClientRect() : item.getBoundingClientRect());
      return (sourceRect.left + sourceRect.width / 2) - wrapRect.left;
    });

    const firstPos = positions[0] ?? 0;
    const lastPos = positions[positions.length - 1] ?? firstPos;
    const trackStart = 0;
    const trackWidth = Math.max(wrapRect.width, lastPos);

    track.style.left = trackStart + 'px';
    track.style.width = trackWidth + 'px';
    progress.style.left = trackStart + 'px';

    let markerPos = firstPos;
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    if(today <= firstDate){
      markerPos = firstPos;
    }else if(today >= lastDate){
      markerPos = lastPos;
    }else{
      for(let i = 0; i < dates.length - 1; i++){
        const startDate = dates[i];
        const endDate = dates[i + 1];
        if(today >= startDate && today <= endDate){
          const segmentSpan = Math.max(positions[i + 1] - positions[i], 0);
          const segmentDuration = endDate - startDate;
          const dateProgress = segmentDuration === 0 ? 0 : (today - startDate) / segmentDuration;
          markerPos = positions[i] + (segmentSpan * dateProgress);
          break;
        }
      }
    }

    const trackEnd = trackStart + trackWidth;
    markerPos = Math.min(Math.max(markerPos, trackStart), trackEnd);

    const progressWidth = Math.min(
      Math.max(markerPos - trackStart, 0),
      trackEnd - trackStart
    );

    if(prefersReduced){
      progress.style.transition = 'none';
      todayMarker.style.transition = 'none';
    }else{
      progress.style.transition = '';
      todayMarker.style.transition = '';
    }

    progress.style.width = progressWidth + 'px';
    todayMarker.style.left = markerPos + 'px';

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

// Header scroll micro-interaction
(() => {
  const header = document.getElementById('siteHeader');
  if(!header) return;
  let lastState = null;
  const update = () => {
    const scrolled = window.scrollY > 12;
    if(scrolled !== lastState){
      header.classList.toggle('scrolled', scrolled);
      lastState = scrolled;
    }
  };
  update();
  window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
})();

// Section reveal animations
(() => {
  const elements = Array.from(document.querySelectorAll('.reveal'));
  if(!elements.length) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold:0.22, rootMargin:'0px 0px -10%' });
  elements.forEach(el => io.observe(el));
})();

// Gradient cursor trail
(() => {
  const trail = document.getElementById('cursorTrail');
  if(!trail) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine = window.matchMedia('(pointer: fine)');
  if(prefersReduced.matches || !pointerFine.matches) return;

  let rafId = null;
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let active = false;

  const step = () => {
    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    trail.style.left = `${currentX}px`;
    trail.style.top = `${currentY}px`;
    if(Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5){
      rafId = requestAnimationFrame(step);
    }else{
      rafId = null;
    }
  };

  const queue = (x, y) => {
    targetX = x;
    targetY = y;
    if(rafId === null) rafId = requestAnimationFrame(step);
  };

  const onMove = (event) => {
    if(event.pointerType && event.pointerType !== 'mouse') return;
    if(prefersReduced.matches) return;
    if(!active){
      active = true;
      trail.classList.add('is-active');
      currentX = event.clientX;
      currentY = event.clientY;
      trail.style.left = `${currentX}px`;
      trail.style.top = `${currentY}px`;
    }
    queue(event.clientX, event.clientY);
  };

  const deactivate = () => {
    if(!active) return;
    active = false;
    trail.classList.remove('is-active');
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', deactivate);
  document.addEventListener('visibilitychange', () => { if(document.hidden) deactivate(); });
  prefersReduced.addEventListener?.('change', (event) => { if(event.matches) deactivate(); });
})();

// Floating HUD (time, theme, section)
(() => {
  const hud = document.getElementById('systemHud');
  const timeEl = document.getElementById('hudTime');
  const themeEl = document.getElementById('hudTheme');
  const sectionEl = document.getElementById('hudSection');
  if(!hud || !timeEl || !themeEl || !sectionEl) return;

  const formatTime = () => new Intl.DateTimeFormat(undefined, { hour:'2-digit', minute:'2-digit' }).format(new Date());
  const updateTime = () => { timeEl.textContent = formatTime(); };
  updateTime();
  setInterval(updateTime, 60 * 1000);

  const applyTheme = (mode) => {
    themeEl.textContent = mode === 'light' ? 'Light' : 'Dark';
  };
  applyTheme(docEl.classList.contains('dark') ? 'dark' : 'light');
  document.addEventListener('theme:change', (event) => {
    applyTheme(event.detail?.theme || (docEl.classList.contains('dark') ? 'dark' : 'light'));
  });
  const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  schemeQuery.addEventListener?.('change', () => {
    applyTheme(docEl.classList.contains('dark') ? 'dark' : 'light');
  });
  const classObserver = new MutationObserver(() => {
    applyTheme(docEl.classList.contains('dark') ? 'dark' : 'light');
  });
  classObserver.observe(docEl, { attributes:true, attributeFilter:['class'] });

  const sections = Array.from(document.querySelectorAll('[data-section-label]')).map(el => ({
    el,
    label: el.dataset.sectionLabel || el.getAttribute('id') || el.querySelector('h2,h3,h1')?.textContent?.trim() || 'Section'
  }));

  if(sections.length){
    let ticking = false;
    let lastLabel = '';
    const chooseSection = () => {
      let next = sections[0];
      let bestScore = Number.POSITIVE_INFINITY;
      const focusPoint = window.innerHeight * 0.35;
      sections.forEach(section => {
        const rect = section.el.getBoundingClientRect();
        if(rect.bottom < 80 || rect.top > window.innerHeight * 0.85) return;
        const distance = Math.abs(rect.top - focusPoint);
        if(distance < bestScore){
          bestScore = distance;
          next = section;
        }
      });
      if(next && next.label !== lastLabel){
        sectionEl.textContent = next.label;
        lastLabel = next.label;
      }
    };
    const onScroll = () => {
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        chooseSection();
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    chooseSection();
  }
})();

// AI-flavoured console overlay
(() => {
  const overlay = document.getElementById('consoleOverlay');
  const logEl = document.getElementById('consoleLog');
  const closeBtn = document.getElementById('consoleClose');
  if(!overlay || !logEl) return;

  const sectionLabels = Array.from(document.querySelectorAll('[data-section-label]')).map(el => el.dataset.sectionLabel).filter(Boolean);
  const badges = ['Google Cloud Innovator','GitHub Developer','Reddit Developer','Amazon Associate'];
  const states = ['ready','synced','ok','cached','complete','updated'];
  const metrics = ['latency','glow','depth','parallax','signal','gradient'];
  const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const buildLog = () => {
    const now = new Date();
    const header = `[${now.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit', second:'2-digit' })}] initializing system shell...`;
    const lines = [header];
    const count = 6 + Math.floor(Math.random() * 5);
    for(let i = 0; i < count; i++){
      const metric = random(metrics);
      const value = (Math.random() * 0.8 + 0.2).toFixed(2);
      const ms = Math.floor(Math.random() * 70) + 20;
      const badge = random(badges);
      const section = sectionLabels.length ? random(sectionLabels) : 'Hero';
      const state = random(states);
      const templates = [
        `sparkline.${metric} :: ${state} (${value})`,
        `hud.sync(section="${section}", t+${ms}ms)`,
        `badge.emit("${badge}") // ${state}`,
        `cursor.trail(alpha=${value}, ease=${(Math.random() * 0.2 + 0.6).toFixed(2)})`,
        `grid.parallax(offset=${(Math.random() * 4).toFixed(1)}px)`,
        `timeline.gradient → ${Math.round(Math.random() * 100)}%`,
        `cards.glowPulse(amplitude=${(Math.random() * 0.4 + 0.4).toFixed(2)})`
      ];
      lines.push(`> ${random(templates)}`);
    }
    lines.push('// log stream complete');
    return lines.join('\n');
  };

  let isOpen = false;
  const openConsole = () => {
    if(isOpen) return;
    isOpen = true;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('console-open');
    logEl.textContent = buildLog();
    logEl.scrollTop = logEl.scrollHeight;
    requestAnimationFrame(() => closeBtn?.focus());
  };
  const closeConsole = () => {
    if(!isOpen) return;
    isOpen = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('console-open');
  };
  const toggleConsole = () => (isOpen ? closeConsole() : openConsole());

  document.addEventListener('keydown', (event) => {
    if(event.key === '`' || event.key === '~'){
      const target = document.activeElement;
      if(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      toggleConsole();
    }else if(event.key === 'Escape' && isOpen){
      closeConsole();
    }
  });

  closeBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    closeConsole();
  });

  overlay.addEventListener('click', (event) => {
    if(event.target === overlay) closeConsole();
  });
})();
