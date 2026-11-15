// stats.js (Nada): header pills + favourite child card
// Reads window.keys and window.totalPresses from feelings.js, twice a second.

(() => {
  const count = document.getElementById('count');
  const morale = document.getElementById('morale');
  const fav = document.getElementById('fav');
  const title = document.querySelector('#dashboard header h1');

  // header title: make the + hot pink (styled in stats.css)
  if (title) title.innerHTML = 'Ctrl<span class="plus">+</span>Heart';

  // favourite child card: mascot keycap with legs + the two lines under it
  fav.insertAdjacentHTML('beforeend', `
    <svg id="mascot" viewBox="0 0 80 100" aria-hidden="true">
      <path d="M31 66 L28 90 M28 90 h-6 M49 66 L52 90 M52 90 h6"
            stroke="#2B0F1E" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <rect x="14" y="10" width="56" height="58" rx="11" fill="#2B0F1E"/>
      <rect x="10" y="6" width="56" height="58" rx="11" fill="#FF8FBD" stroke="#2B0F1E" stroke-width="3"/>
      <rect x="18" y="13" width="40" height="36" rx="7" fill="#fff" stroke="#2B0F1E" stroke-width="2.5"/>
      <text id="mascot-key" x="38" y="30" text-anchor="middle"
            font-family="'Dela Gothic One', sans-serif" font-size="13" fill="#2B0F1E">?</text>
      <circle cx="32.5" cy="37" r="1.8" fill="#2B0F1E"/>
      <circle cx="43.5" cy="37" r="1.8" fill="#2B0F1E"/>
      <path d="M33.5 41 q4.5 3.5 9 0" stroke="#2B0F1E" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>
    <p id="fav-line"><b id="fav-key">–</b>: <span id="fav-pct">–</span></p>
    <p id="least">least favourite: –</p>
  `);
  const mascotKey = document.getElementById('mascot-key');
  const favKey = document.getElementById('fav-key');
  const favPct = document.getElementById('fav-pct');
  const least = document.getElementById('least');

  // notes.txt: a built-in notepad between the keyboard and the 3 cards.
  // feelings.js makes blocked keys refuse to type in it, so the
  // "my keyboard is broken" bit works on ANY laptop, no helper needed.
  const cards = document.querySelector('#dashboard .cards');
  const padCard = document.createElement('div');
  padCard.className = 'card';
  padCard.id = 'notepad-card';
  padCard.innerHTML = `
    <h3>notes.txt <small>try typing. the blocked keys won't let you.</small></h3>
    <textarea id="notepad" spellcheck="false" autocomplete="off"
      placeholder="type your very important essay here. the keys are watching."></textarea>
    <p id="notepad-status">&nbsp;</p>
  `;
  if (cards) cards.before(padCard);
  const pad = document.getElementById('notepad');
  const padStatus = document.getElementById('notepad-status');
  const focusPad = () => setTimeout(() => pad.focus({ preventScroll: true }), 0);

  // START / Sara's buttons: put the cursor back in the notepad so typing just works
  ['ctrl:start', 'ctrl:resume'].forEach(n => document.addEventListener(n, focusPad));
  document.addEventListener('ctrl:reset', () => {
    pad.value = '';
    padStatus.innerHTML = '&nbsp;';
    focusPad();
  });

  // average % -> morale word: 60+ thriving, 40+ stable, 20+ tense, under 20 doomed
  function label(avg) {
    if (avg >= 60) return 'thriving';
    if (avg >= 40) return 'stable';
    if (avg >= 20) return 'tense';
    return 'doomed';
  }

  function showFavourite(top, bottom) {
    if (!top) {                                   // every single key blocked you
      mascotKey.textContent = 'x_x';
      mascotKey.setAttribute('font-size', '11');
      favKey.textContent = 'nobody';
      favPct.textContent = 'everyone blocked you';
      least.textContent = 'least favourite: you';
      return;
    }
    mascotKey.textContent = top.label;
    mascotKey.setAttribute('font-size', top.label.length > 3 ? '9' : '13');
    favKey.textContent = top.label;
    favPct.textContent = top.pct + '% · used ' + top.uses + '×';
    least.textContent = 'least favourite: ' + bottom.label + ' (' + bottom.pct + '%)';
  }

  function update() {
    const list = Object.values(window.keys || {});
    if (!list.length) {                           // before START: never say "undefined"
      count.textContent = 'keys pressed: –';
      morale.textContent = 'keyboard morale: –';
      return;
    }
    const avg = list.reduce((s, k) => s + k.pct, 0) / list.length;
    const mood = label(avg);
    count.textContent = 'keys pressed: ' + (window.totalPresses || 0).toLocaleString();
    morale.textContent = 'keyboard morale: ' + mood.toUpperCase();
    morale.dataset.mood = mood;

    const alive = list.filter(k => !k.blocked).sort((a, b) => b.pct - a.pct);
    showFavourite(alive[0], alive[alive.length - 1]);
  }

  update();
  setInterval(update, 500);
})();
