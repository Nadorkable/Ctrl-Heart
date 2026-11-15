// start.js (Nada): fake loading bar + START TYPING button
// Fills Sara's #load-fill and #load-text, then swaps #start -> #dashboard.

(() => {
  const SETTINGS = { stuckAt: 87, stuckMs: 1200, tickMs: 30 };

  const btn = document.getElementById('start-btn');
  const fill = document.getElementById('load-fill');   // Sara's markup; may not exist yet
  const text = document.getElementById('load-text');   // Sara's markup; may not exist yet
  const startScreen = document.getElementById('start');
  const dashboard = document.getElementById('dashboard');

  function show(pct, msg) {
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = msg;
  }

  // 1. fill to 87%, 1% at a time
  let p = 0;
  btn.disabled = true;
  const t = setInterval(() => {
    p++;
    show(p, 'loading feelings… ' + p + '%');
    if (p === SETTINGS.stuckAt) {
      clearInterval(t);
      setTimeout(finish, SETTINGS.stuckMs);   // 2. get "stuck" for a sec
    }
  }, SETTINGS.tickMs);

  // 3. jump to 100% and unlock the button
  function finish() {
    show(100, 'feelings loaded. 100%. good luck.');
    btn.disabled = false;
  }

  // 4. START TYPING: hide the title page, show the dashboard, tell everyone
  btn.addEventListener('click', () => {
    startScreen.hidden = true;
    dashboard.hidden = false;
    document.dispatchEvent(new Event('ctrl:start'));
  }, { once: true });
})();
