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
    fadeAmount: 3,     // every tick, every key loses this many %...
    fadeEverySecs: 1.5,// ...and a tick happens every 1.5 sec  (= 2% per second)
                       // => an ignored key at 20% blocks after ~10s, at 40% after ~20s,
                       //    at 60% after ~30s. by the end of a 60s pitch only the keys
                       //    you keep pressing are alive.
                       //    slower: fadeAmount 2 · even faster: fadeAmount 4
    // impatient keys: they fade this many times faster than everyone else.
    // ignore them and Q + Z (x4) block you after ~3-8s, X + J (x3) after ~4-10s.
    impatient: { KeyQ: 4, KeyZ: 4, KeyX: 3, KeyJ: 3 },
    // rage-quitters: these keys block you this many seconds after START (and after RESET),
    // no matter what you do. A opens the show.
    rageQuit: { KeyA: 2 },
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
      helperSync();                              // laptop-wide mode: block it everywhere
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
    helperSync();                                            // laptop mode: a fresh game starts with nothing blocked
    scheduleRageQuits();
  });

  // rage-quitters (SETTINGS.rageQuit) block you a few seconds into every game
  let rageTimers = [];
  function scheduleRageQuits() {
    rageTimers.forEach(clearTimeout);
    rageTimers = Object.entries(SETTINGS.rageQuit).map(([code, secs]) =>
      setTimeout(() => {
        const k = keys[code];
        if (!k || k.blocked) return;
        setPct(k, 0);                                        // straight to 0% = blocked (+ drama, + laptop mode)
        render();
      }, secs * 1000));
  }

  // 2. A PRESS: +10%, squish, maybe jealousy
  document.addEventListener('keydown', e => {
    if (!started) return;
    const k = keys[e.code];
    if (!k) return;                                          // not on our keyboard
    const isModifier = /^(Control|Meta|Alt|Shift)/.test(e.code);
    if ((e.ctrlKey || e.metaKey) && !isModifier) return;     // let Ctrl+R / Cmd+R still refresh

    if (k.blocked && !paused) {
      // blocked key: nothing types, nothing counts. just a silly sound + a roast.
      e.preventDefault();
      if (!e.repeat) nope(k);
      return;
    }
    if (e.target && e.target.id === 'notepad') {
      if (e.code === 'Tab') e.preventDefault();              // stay in the notepad
    } else {
      e.preventDefault();                                    // stop Space scrolling, Tab jumping
    }
    if (e.repeat || helperOn) return;                        // laptop-wide mode: the helper reports presses
    press(e.code);
  });

  function press(code) {
    const k = keys[code];
    if (!started || !k || k.blocked || paused) return;      // blocked / paused = nothing

    totalPresses++;
    window.totalPresses = totalPresses;
    k.uses++;
    setPct(k, k.pct + SETTINGS.boost);

    streak = (code === lastCode) ? streak + 1 : 1;
    lastCode = code;
    if (streak % SETTINGS.jealousAfter === 0) makeNeighboursJealous(k);

    bounce(k);
    render();
  }

  // SILLY SOUNDS for pressing a blocked key. Made with the browser's own synth
  // (Web Audio), so there are no sound files to download or lose.
  let audio = null;
  let lastSound = 0;
  // browsers only allow sound after the person clicks or types, so the sound
  // engine is switched on (and woken up) by EVERY click / key press, not just START.
  // (Safari also wants a tiny silent sound played during that click to unlock.)
  function unlockAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state !== 'running') {
        audio.resume();
        const silent = audio.createBuffer(1, 1, 22050);
        const src = audio.createBufferSource();
        src.buffer = silent;
        src.connect(audio.destination);
        src.start(0);
      }
    } catch (err) { /* no sound on this browser, everything else still works */ }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(type =>
    document.addEventListener(type, unlockAudio, { capture: true, passive: true }));
  document.addEventListener('ctrl:start', unlockAudio);

  // one tone that slides from one pitch to another
  function tone(type, from, to, start, length, volume = 0.18) {
    const t0 = audio.currentTime + start;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + length);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + length);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + length + 0.02);
  }

  const SOUNDS = [
    () => tone('sine', 320, 70, 0, 0.18, 0.3),                       // bonk
    () => { tone('square', 200, 200, 0, 0.11, 0.08);                 // nuh-uh buzzer
            tone('square', 150, 150, 0.14, 0.16, 0.08); },
    () => tone('triangle', 900, 180, 0, 0.22, 0.22),                 // sad slide whistle
    () => { tone('sawtooth', 300, 290, 0, 0.14, 0.07);               // wah wah wahhh
            tone('sawtooth', 270, 260, 0.16, 0.14, 0.07);
            tone('sawtooth', 240, 180, 0.32, 0.32, 0.07); },
    () => { tone('sine', 700, 1400, 0, 0.06, 0.15);                  // boing
            tone('sine', 1400, 300, 0.06, 0.18, 0.15); },
  ];

  function nopeSound() {
    unlockAudio();
    if (!audio) return;
    const now = performance.now();
    if (now - lastSound < 120) return;                       // mashing a dead key = not a wall of noise
    lastSound = now;
    try { SOUNDS[Math.floor(Math.random() * SOUNDS.length)](); } catch (err) { /* stay quiet */ }
  }

  // a blocked key was pressed: silly sound + a roast under the notepad
  const NOPE_LINES = [
    '{key} blocked you. it is not typing that.',
    '{key} has left the chat. and the keyboard.',
    '{key} is ignoring you.',
    '{key}: "new phone who dis"',
    'you pressed {key}. {key} did not care.',
  ];
  function nope(k) {
    nopeSound();
    const status = document.getElementById('notepad-status');
    if (!status) return;
    const line = NOPE_LINES[Math.floor(Math.random() * NOPE_LINES.length)];
    status.textContent = line.replaceAll('{key}', k.label);
    status.classList.remove('nope');
    void status.offsetWidth;                                 // replay the little shake
    status.classList.add('nope');
  }

  // 3. EVERY FEW SECONDS: everyone fades, 0% = blocked
  function fade() {
    if (paused) return;                                      // paused = nobody fades
    for (const code in keys) {
      const k = keys[code];
      const speed = SETTINGS.impatient[code] || 1;          // impatient keys lose more per tick
      if (!k.blocked) setPct(k, k.pct - SETTINGS.fadeAmount * speed);
    }
    render();
  }

  // 4. PAUSE / RESUME / RESET (Sara's buttons send these signals)
  document.addEventListener('ctrl:pause',  () => { paused = true;  helperSync(); });
  document.addEventListener('ctrl:resume', () => { paused = false; helperSync(); });

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
    helperSync();                                            // laptop-wide mode: unblock everything
    scheduleRageQuits();                                     // A rage-quits again 2s into the new game
  });

  // 5. LAPTOP-WIDE MODE (helper/ctrlheart_helper.py, Windows)
  //    Only when the link ends in ?laptop, so normal visitors never see a
  //    "this site wants to access your local network" popup.
  //    The helper sends every key pressed anywhere on the laptop, and we tell it
  //    which keys blocked you so it can swallow them in every app.
  const HELPER = 'http://127.0.0.1:8787';
  const wantHelper = new URLSearchParams(location.search).has('laptop');
  let helperOn = false;

  function helperSync() {
    if (!helperOn || !started) return;                       // a tab that hasn't started never overwrites the blocks
    const list = Object.keys(keys).filter(code => keys[code].blocked);
    fetch(HELPER + '/state', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },             // "simple" request, no extra round trip
      body: JSON.stringify({ blocked: list, paused }),
    }).catch(() => {});
  }

  function connectHelper() {
    const es = new EventSource(HELPER + '/events');
    es.onopen = () => {
      helperOn = true;
      helperSync();
      document.dispatchEvent(new CustomEvent('ctrl:helper', { detail: { on: true } }));
    };
    es.onmessage = e => {
      if (e.data[0] === '!') {                               // "!KeyQ" = the helper swallowed a blocked key
        const k = keys[e.data.slice(1)];
        if (k && k.blocked && !paused) nope(k);
        return;
      }
      press(e.data);                                         // a key pressed anywhere on the laptop
    };
    es.onerror = () => {
      es.close();
      if (helperOn) document.dispatchEvent(new CustomEvent('ctrl:helper', { detail: { on: false } }));
      helperOn = false;                                      // back to normal website typing
      setTimeout(connectHelper, 3000);                       // keep trying (helper may start later)
    };
  }

  if (wantHelper) connectHelper();
})();
