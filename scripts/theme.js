(function(){
  const pref = localStorage.getItem('theme');
  const light = pref === 'light' || (!pref && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.classList.toggle('dark', !light);
})();
