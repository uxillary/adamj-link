(function(){
  const mount = document.getElementById('hcMount');
  if(!mount) return;

  const brand = '#55e6a5';
  const accent = '#ff6347';
  const solvedEvt = new Event('human:solved');

  // Utility
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sr = (t) => `<span class="sr-only">${t}</span>`;

  function fireSolved(){
    if (mount.dataset.solved) return; // idempotent
    mount.dataset.solved = '1';
    window.dispatchEvent(solvedEvt);
  }

  // ---- Challenge: Glitchy “Press the Button” ----
  function renderGlitchButton(){
    mount.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'relative p-3 border border-zinc-800/40 bg-zinc-900/20 overflow-hidden';
    const p = document.createElement('p');
    p.className = 'text-sm text-zinc-400';
    p.textContent = 'Wait for the button to settle, then press it.';
    box.appendChild(p);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mt-3 px-3 py-1.5 border border-zinc-700 bg-black/40 hover:border-brand/70 focus-ring';
    btn.textContent = 'Press me';
    box.appendChild(btn);

    let ready = false;
    function run(){
      ready = false;
      btn.classList.remove('border-brand');
      let t0 = performance.now();
      const anim = () => {
        const t = performance.now() - t0;
        if (t < 1500) {
          const dx = (Math.random()*16 - 8);
          const dy = (Math.random()*16 - 8);
          btn.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(anim);
        } else if (t < 3000) {
          const dx = (Math.random()*120 - 60);
          const dy = (Math.random()*60 - 30);
          btn.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(anim);
        } else {
          btn.style.transform = 'translate(0,0)';
          btn.classList.add('border-brand');
          ready = true;
        }
      };
      anim();
    }
    run();

    btn.addEventListener('click', ()=>{
      if (!ready) {
        run();
        return;
      }
      btn.textContent = 'Nice ✔';
      fireSolved();
    });

    mount.appendChild(box);
  }

  // ---- Challenge: Line Icon “Odd One Out” ----
  function renderOddOneOut(){
    mount.innerHTML = '';
    const icons = [
      { id:'github', label:'GitHub' },
      { id:'linkedin', label:'LinkedIn' },
      { id:'x', label:'X' },
      { id:'facebook', label:'Facebook' },
      { id:'instagram', label:'Instagram' },
      { id:'buymeacoffee', label:'Buy Me a Coffee' },
      { id:'mail', label:'Mail' }
    ];
    const emojis = ['🍌','🍕','🚀','🦊','🎧','💡','🌮','🍣','🦄'];
    const chosenIcons = [...icons].sort(()=>Math.random()-0.5).slice(0,5);
    const emoji = pick(emojis);
    const pool = [...chosenIcons, { emoji, odd:true, label: emoji }].sort(()=>Math.random()-0.5);

    const box = document.createElement('div');
    box.className = 'p-3 border border-zinc-800/40 bg-zinc-900/20';
    box.innerHTML = `<p class="text-sm text-zinc-400">Select the item that <strong>doesn\u2019t</strong> match the others.</p>`;

    const grid = document.createElement('div');
    grid.className = 'mt-2 inline-grid grid-cols-3 sm:grid-cols-6 gap-2';
    pool.forEach(opt=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'size-9 flex items-center justify-center border border-zinc-700 hover:border-brand/70 focus-ring';
      b.setAttribute('aria-label', opt.label);
      if (opt.odd) {
        b.textContent = opt.emoji;
        b.style.fontSize = '18px';
      } else {
        b.innerHTML = `<svg width="18" height="18" aria-hidden="true"><use href="/public/icons.svg#${opt.id}"></use></svg>${sr(opt.label)}`;
      }
      b.addEventListener('click', ()=>{
        if (opt.odd) {
          b.classList.add('border-brand');
          fireSolved();
        } else {
          b.classList.add('animate-wiggle');
          setTimeout(()=>b.classList.remove('animate-wiggle'), 250);
        }
      });
      grid.appendChild(b);
    });

    box.appendChild(grid);
    mount.appendChild(box);
  }

  // ---- Challenge: Mini Terminal Prompt ----
  function renderTerminal(){
    mount.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'p-3 border border-zinc-800/40 bg-black/40 font-mono';
    const label = document.createElement('div');
    label.className = 'text-sm text-zinc-400';
    label.textContent = 'Enter the brand hex (55e6a5) and press Enter.';
    const line = document.createElement('div');
    line.className = 'mt-2 flex items-center gap-2';
    line.innerHTML = `<span>&gt;</span>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.className = 'flex-1 bg-black/20 border border-zinc-700 focus-ring px-2 py-1';
    input.setAttribute('aria-label','Enter the brand color hex and press Enter');
    line.appendChild(input);
    box.appendChild(label);
    box.appendChild(line);
    mount.appendChild(box);
    input.focus();

    input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') {
        const v = (input.value || '').trim().toLowerCase();
        if (v === '55e6a5') {
          label.textContent = 'Confirmed ✔';
          fireSolved();
        } else {
          label.textContent = 'Try again: 55e6a5';
          input.classList.add('animate-wiggle');
          setTimeout(()=>input.classList.remove('animate-wiggle'), 250);
        }
      }
    });
  }

  const challenges = [renderGlitchButton, renderOddOneOut, renderTerminal];
  let lastIdx = -1;

  function renderRandom(){
    mount.dataset.solved = '';
    const pool = challenges.map((_,i)=>i).filter(i=>i!==lastIdx);
    const idx = pool[Math.floor(Math.random()*pool.length)];
    lastIdx = idx;
    challenges[idx]();
  }

  // public API
  window.humanChallenge = {
    reset: renderRandom
  };

  // Minimal animation (wiggle) via injected CSS once
  if (!document.getElementById('hc-inline-css')) {
    const style = document.createElement('style');
    style.id = 'hc-inline-css';
    style.textContent = `
      @keyframes wiggle { 0%{transform:translateX(0)} 25%{transform:translateX(-3px)} 50%{transform:translateX(3px)} 75%{transform:translateX(-2px)} 100%{transform:translateX(0)} }
      .animate-wiggle { animation: wiggle .18s ease; }
    `;
    document.head.appendChild(style);
  }

  // initial render
  renderRandom();
})();
