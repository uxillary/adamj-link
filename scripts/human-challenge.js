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

  // ---- Challenge 1: Code Scramble (click letters in order) ----
  function renderScramble(){
    mount.innerHTML = '';
    const words = ['ADAMJ','AJ_STUDIOS','HEXLABS','INFINITE','CURIOUS'];
    const answer = pick(words);
    const letters = answer.split('');
    const shuffled = [...letters].sort(()=>Math.random() - 0.5);

    const wrap = document.createElement('div');
    wrap.className = 'p-3 border border-zinc-800/60 bg-zinc-900/30';

    const instructions = document.createElement('p');
    instructions.className = 'text-sm text-zinc-400';
    instructions.textContent = 'Tap letters in the correct order to spell the brand word.';
    wrap.appendChild(instructions);

    const grid = document.createElement('div');
    grid.className = 'mt-3 grid grid-cols-8 gap-2';
    wrap.appendChild(grid);

    const progress = document.createElement('div');
    progress.className = 'mt-2 text-xs text-zinc-400';
    progress.textContent = 'Progress: 0/' + letters.length;
    wrap.appendChild(progress);

    let idx = 0;
    shuffled.forEach((ch,i)=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 border border-zinc-700 hover:border-brand/70 focus-ring';
      btn.textContent = ch;
      btn.setAttribute('aria-label','letter '+ch);
      btn.addEventListener('click', ()=>{
        if (letters[idx] === ch) {
          idx++;
          btn.classList.add('bg-brand','text-black','border-brand');
          btn.disabled = true;
          progress.textContent = 'Progress: ' + idx + '/' + letters.length;
          if (idx === letters.length) {
            progress.textContent = 'Solved ✔';
            fireSolved();
          }
        } else {
          // brief shake
          btn.classList.add('animate-wiggle');
          setTimeout(()=>btn.classList.remove('animate-wiggle'), 250);
        }
      });
      grid.appendChild(btn);
    });

    mount.appendChild(wrap);
  }

  // ---- Challenge 2: Glitchy “Press the Button” ----
  function renderGlitchButton(){
    mount.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'relative p-6 border border-zinc-800/60 bg-zinc-900/30 overflow-hidden';
    const p = document.createElement('p');
    p.className = 'text-sm text-zinc-400';
    p.textContent = 'Catch the button after it stabilises.';
    box.appendChild(p);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mt-4 px-4 py-2 border border-zinc-700 bg-black/40 hover:border-brand/70 focus-ring';
    btn.textContent = 'Press me';
    box.appendChild(btn);

    // jitter for ~2 seconds, then stop
    let t0 = performance.now();
    const jitter = () => {
      const t = performance.now() - t0;
      if (t < 2000) {
        const dx = (Math.random()*16 - 8);
        const dy = (Math.random()*16 - 8);
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
        btn.style.filter = Math.random() > 0.7 ? 'blur(0.5px)' : 'none';
        requestAnimationFrame(jitter);
      } else {
        btn.style.transform = 'translate(0,0)';
        btn.style.filter = 'none';
        btn.classList.add('border-brand');
      }
    };
    jitter();

    btn.addEventListener('click', ()=>{
      if (!btn.classList.contains('border-brand')) return; // must wait
      btn.textContent = 'Nice ✔';
      fireSolved();
    });

    mount.appendChild(box);
  }

  // ---- Challenge 3: Line Icon “Odd One Out” ----
  function renderOddOneOut(){
    mount.innerHTML = '';
    const choices = [
      { id:'github', label:'GitHub' },
      { id:'youtube', label:'YouTube' },
      { id:'x', label:'X' },
      { id:'banana', label:'Banana', odd:true } // the oddball
    ];
    // randomize order; keep exactly one odd
    const pool = [...choices].sort(()=>Math.random()-0.5);

    const box = document.createElement('div');
    box.className = 'p-4 border border-zinc-800/60 bg-zinc-900/30';
    box.innerHTML = `<p class="text-sm text-zinc-400">Select the icon that <strong>doesn\u2019t</strong> match the others.</p>`;

    const grid = document.createElement('div');
    grid.className = 'mt-3 grid grid-cols-4 gap-3';
    pool.forEach(opt=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'aspect-square flex items-center justify-center border border-zinc-700 hover:border-brand/70 focus-ring';
      b.setAttribute('aria-label', opt.label);
      if (opt.id === 'banana') {
        b.textContent = '🍌';
        b.style.fontSize = '22px';
      } else {
        b.innerHTML = `<svg width="22" height="22" aria-hidden="true"><use href="/public/icons.svg#${opt.id}"></use></svg>${sr(opt.label)}`;
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

  // ---- Challenge 4: Mini Terminal Prompt ----
  function renderTerminal(){
    mount.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'p-4 border border-zinc-800/60 bg-black/60 font-mono';
    const label = document.createElement('div');
    label.className = 'text-sm text-zinc-400';
    label.textContent = 'Type y and press Enter.';
    const line = document.createElement('div');
    line.className = 'mt-2 flex items-center gap-2';
    line.innerHTML = `<span>&gt;</span>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.className = 'flex-1 bg-black/20 border border-zinc-700 focus-ring px-2 py-1';
    input.setAttribute('aria-label','Type y and press Enter to confirm');
    line.appendChild(input);
    box.appendChild(label);
    box.appendChild(line);
    mount.appendChild(box);
    input.focus();

    input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') {
        const v = (input.value || '').trim().toLowerCase();
        if (v === 'y' || v === 'yes') {
          label.textContent = 'Confirmed ✔';
          fireSolved();
        } else {
          label.textContent = 'Try again: type y';
          input.classList.add('animate-wiggle');
          setTimeout(()=>input.classList.remove('animate-wiggle'), 250);
        }
      }
    });
  }

  const challenges = [renderScramble, renderGlitchButton, renderOddOneOut, renderTerminal];
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
