// controls.js: side buttons send signals, other files listen
(() => {
  const send = name => document.dispatchEvent(new Event(name));
  const start = document.getElementById('btn-start');
  const pause = document.getElementById('btn-pause');
  const reset = document.getElementById('btn-reset');

  function setState(running) {
    start.disabled = running;
    pause.disabled = !running;
  }
  setState(true);

  start.onclick = () => { send('ctrl:resume'); setState(true); start.blur(); };
  pause.onclick = () => { send('ctrl:pause');  setState(false); pause.blur(); };
  reset.onclick = () => { send('ctrl:reset');  setState(true);  reset.blur(); };
})();