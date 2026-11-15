// feelings.js (Nada): the feelings math
// Reads Sara's keys (.key[data-code] with .pct + .face spans inside),
// keeps every key's happiness %, and decides its mood.
//
// Shares:   window.keys          { KeyQ: { el, label, pct, blocked, jealousUntil, uses }, ... }
//           window.totalPresses  number of counted presses
// Sends:    'keydrama' events, detail = { type, key, pct, top? }
//           type is one of: 'blocked' | 'jealous' | 'fading' | 'thriving'
//           (for 'jealous', top = the key that got spammed)

(() => {
  // every number in one place: tweak these while testing
  const SETTINGS = {
    startMin: 20,      // each key starts at a random % between these two
    startMax: 60,
    boost: 10,         // +% per press (max 100)
    fadeAmount: 1,     // every tick, every key loses this many %...
    fadeEverySecs: 2,  // ...and a tick happens every 2 sec
                       // => an ignored key at 20% blocks after ~40s, at 30% after ~60s,
                       //    at 50% after ~100s. in a 60s pitch only the lowest few block.
                       //    faster: fadeEverySecs 1.5 · slower: fadeEverySecs 3
    jealousAfter: 5,   // same key this many times in a row...
    jealousSecs: 3,    // ...makes its neighbours jealous for this long
    bounceMs: 150,     // how long the squish class stays on
    fadingBelow: 25,   // drama when a key drops under this
    thrivingFrom: 80,  // drama when a key climbs to this
  };

  const MOODS = ['thriving', 'happy', 'fine', 'meh', 'sad', 'jealous', 'blocked'];
  const FACES = {
    thriving: ':D', happy: '^_^', fine: ':)', meh: '-_-',
    sad: 'T_T', jealous: '>:(', blocked: 'x_x',
  };

  const keys = {};
  let totalPresses = 0;
  let lastCode = null;
  let streak = 0;
  let started = false;
  let paused = false;    // ctrl:pause / ctrl:resume (Sara's buttons)

  window.keys = keys;
  window.totalPresses = 0;

  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  // tell everyone (chat, stats) something happened
  function drama(type, k, extra = {}) {
    document.dispatchEvent(new CustomEvent('keydrama', {
      detail: { type, key: k.label, pct: k.pct, ...extra },
    }));
  }

  // blocked -> jealous -> thriving 80+ -> happy 60+ -> fine 40+ -> meh 25+ -> sad
  function moodOf(k) {
    if (k.blocked) return 'blocked';
    if (Date.now() < k.jealousUntil) return 'jealous';
    if (k.pct >= 80) return 'thriving';
    if (k.pct >= 60) return 'happy';
    if (k.pct >= 40) return 'fine';
    if (k.pct >= 25) return 'meh';
    return 'sad';
  }

  // paint every key: mood class + % + face
  // (only swaps the 7 mood classes, so Sara's own classes on .key stay put)
  function render() {
    for (const code in keys) {
      const k = keys[code];
      const mood = moodOf(k);
      k.el.classList.remove(...MOODS);
      k.el.classList.add(mood);
      if (k.pctEl) k.pctEl.textContent = k.pct + '%';
      if (k.faceEl) k.faceEl.textContent = FACES[mood];
    }
  }

  // change a key's % and send drama if it crossed a line
  function setPct(k, pct) {
    const before = k.pct;
    k.pct = Math.max(0, Math.min(100, pct));
    if (k.pct === 0 && !k.blocked) {
      k.blocked = true;                          // forever. no unblocking.
      drama('blocked', k);
    } else if (before >= SETTINGS.fadingBelow && k.pct < SETTINGS.fadingBelow) {
      drama('fading', k);
    } else if (before < SETTINGS.thrivingFrom && k.pct >= SETTINGS.thrivingFrom) {
      drama('thriving', k);
    }
  }

  // squish (Sara styles .bounce in keyboard.css)
  function bounce(k) {
    clearTimeout(k.bounceTimer);
    k.el.classList.remove('bounce');
    void k.el.offsetWidth;                       // restart the animation if pressed fast
    k.el.classList.add('bounce');
    k.bounceTimer = setTimeout(() => k.el.classList.remove('bounce'), SETTINGS.bounceMs);
  }

  // the keys right next to the spammed one (same row) get jealous
  function makeNeighboursJealous(k) {
    const until = Date.now() + SETTINGS.jealousSecs * 1000;
    [k.el.previousElementSibling, k.el.nextElementSibling].forEach(el => {
      const n = el && keys[el.dataset.code];
      if (!n || n.blocked) return;
      n.jealousUntil = until;
      drama('jealous', n, { top: k.label });
    });
    // repaint when the jealousy wears off
    setTimeout(render, SETTINGS.jealousSecs * 1000 + 20);
  }

  // 1. START: find every key Sara built, give it a random start %
  document.addEventListener('ctrl:start', () => {
    if (started) return;
    started = true;
    document.querySelectorAll('.key').forEach(el => {
      const code = el.dataset.code;
      if (!code) return;
      const first = el.firstChild;
      keys[code] = {
        el,
        label: (first && first.nodeType === 3 && first.textContent.trim()) || code,
        pctEl: el.querySelector('.pct'),
        faceEl: el.querySelector('.face'),
        pct: rand(SETTINGS.startMin, SETTINGS.startMax),
        blocked: false,
        jealousUntil: 0,
        uses: 0,
      };
    });
    render();
    setInterval(fade, SETTINGS.fadeEverySecs * 1000);
  });

  // 2. A PRESS: +10%, squish, maybe jealousy
  document.addEventListener('keydown', e => {
    if (!started) return;
    const k = keys[e.code];
    if (!k) return;                                          // not on our keyboard
    const isModifier = /^(Control|Meta|Alt|Shift)/.test(e.code);
    if ((e.ctrlKey || e.metaKey) && !isModifier) return;     // let Ctrl+R / Cmd+R still refresh
    e.preventDefault();                                      // stop Space scrolling, Tab jumping
    if (e.repeat || k.blocked || paused) return;             // holding a key / blocked / paused = nothing

    totalPresses++;
    window.totalPresses = totalPresses;
    k.uses++;
    setPct(k, k.pct + SETTINGS.boost);

    streak = (e.code === lastCode) ? streak + 1 : 1;
    lastCode = e.code;
    if (streak % SETTINGS.jealousAfter === 0) makeNeighboursJealous(k);

    bounce(k);
    render();
  });

  // 3. EVERY FEW SECONDS: everyone fades, 0% = blocked
  function fade() {
    if (paused) return;                                      // paused = nobody fades
    for (const code in keys) {
      const k = keys[code];
      if (!k.blocked) setPct(k, k.pct - SETTINGS.fadeAmount);
    }
    render();
  }

  // 4. PAUSE / RESUME / RESET (Sara's buttons send these signals)
  document.addEventListener('ctrl:pause',  () => { paused = true; });
  document.addEventListener('ctrl:resume', () => { paused = false; });

  // reset = everyone gets a fresh random %, nobody is blocked, counters go back to 0
  document.addEventListener('ctrl:reset', () => {
    Object.values(keys).forEach(k => {
      k.pct = rand(SETTINGS.startMin, SETTINGS.startMax);
      k.blocked = false;
      k.jealousUntil = 0;
      k.uses = 0;
      clearTimeout(k.bounceTimer);
      k.el.classList.remove('bounce');
    });
    totalPresses = 0;
    window.totalPresses = 0;
    lastCode = null;                                         // forget the "same key 5x in a row" streak
    streak = 0;
    paused = false;
    render();
  });
})();
