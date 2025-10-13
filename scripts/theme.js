(function(){
  const pref = localStorage.getItem('theme');
  const isDark = pref ? pref === 'dark' : true;
  document.documentElement.classList.toggle('dark', isDark);
})();
