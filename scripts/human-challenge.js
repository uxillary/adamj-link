(function(){
    const mount = document.getElementById('hcMount');
    if(!mount) return;

    const solvedEvt = new Event('human:solved');

  // Utility
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sr = (t) => `<span class="sr-only">${t}</span>`;

  function fireSolved(){
    if (mount.dataset.solved) return; // idempotent
    mount.dataset.solved = '1';
    window.dispatchEvent(solvedEvt);
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
    grid.className = 'mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2 w-max mx-auto';
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

  function render(){
    mount.dataset.solved = '';
    renderOddOneOut();
  }

  // public API
  window.humanChallenge = {
    reset: render
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
  render();
  })();
