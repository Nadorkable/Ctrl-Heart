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
    fading:  k => k + ' is sad',
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

let dramaQueue = [];

document.addEventListener('keydrama', e => {
  recent.push(e.detail);          // chat still reacts to the latest event
  dramaQueue.push(e.detail);
  if (dramaQueue.length > 5) dramaQueue.shift();   // drop the oldest so it never backs up
});

function dramaTick() {
function nextMessage() {
  if (!paused) {
    const ev = recent.pop();
    recent = [];
    if (ev && LINES[ev.type]) {
      const k = nice(ev.key);
      addMsg(k, pick(LINES[ev.type]).replaceAll('{key}', k));
    } else {
      const [who, text] = personalityLine();
      addMsg(who, text);
    }
  }
  setTimeout(nextMessage, 5000 + Math.random() * 2000);
}
  const d = dramaQueue.pop();     // show the NEWEST, so it stays relevant
  dramaQueue = [];                // throw away the rest
  if (d) addDrama(d);
}
let paused = false;
document.addEventListener('ctrl:pause',  () => { paused = true; });
document.addEventListener('ctrl:resume', () => { paused = false; });
document.addEventListener('ctrl:reset', () => {
  paused = false;
  recent = [];
  dramaQueue = [];
  dramaEl.innerHTML = '';
  gcEl.innerHTML = '';
});


  document.addEventListener('ctrl:start', () => {
    setTimeout(nextMessage, 3000);
    setInterval(dramaTick, 4000);
  });
})();