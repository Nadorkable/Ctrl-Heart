// chat.js: live drama + group chat
(() => {
  const dramaEl = document.getElementById('drama');
  const gcEl = document.getElementById('gc');
  let recent = [];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // "KeyQ" -> "Q", "Digit3" -> "3", "Q" stays "Q"
  const nice = k => String(k).replace(/^(Key|Digit)/, '');

  const DRAMA_TEXT = {
    blocked: k => k + ' blocked you',
    jealous: k => k + ' is jealous',
    fading:  k => k + ' is fading away',
    thriving: k => k + ' is thriving'
  };

  function addDrama(d) {
    const k = nice(d.key);
    const li = document.createElement('li');
    li.className = d.type;
    li.textContent = (DRAMA_TEXT[d.type] || (() => k + ' did something'))(k);
    dramaEl.prepend(li);
    while (dramaEl.children.length > 3) dramaEl.lastChild.remove();
  }

  function addMsg(who, text) {
    const div = document.createElement('div');
    div.className = 'msg';
    const b = document.createElement('b');
    b.textContent = who + ': ';
    div.append(b, text);
    gcEl.append(div);
    while (gcEl.querySelectorAll('.msg').length > 4) gcEl.querySelector('.msg').remove();
  }

  function personalityLine() {
    const letters = Object.keys(LINES.personality);
    const who = pick(letters);
    return [who, pick(LINES.personality[who])];
  }

  function nextMessage() {
    const ev = recent.pop();
    recent = [];
    if (ev && LINES[ev.type]) {
      const k = nice(ev.key);
      addMsg(k, pick(LINES[ev.type]).replaceAll('{key}', k));
    } else {
      const [who, text] = personalityLine();
      addMsg(who, text);
    }
    setTimeout(nextMessage, 5000 + Math.random() * 2000);
  }

  document.addEventListener('keydrama', e => {
    recent.push(e.detail);
    addDrama(e.detail);
  });

  document.addEventListener('ctrl:start', () => setTimeout(nextMessage, 3000));
})();