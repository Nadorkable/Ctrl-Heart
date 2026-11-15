// stats.js (Nada): header pills + the notes.txt notepad card
// Reads window.keys and window.totalPresses from feelings.js, twice a second.

(() => {
  const count = document.getElementById('count');
  const morale = document.getElementById('morale');
  const title = document.querySelector('#dashboard header h1');

  // header title: make the + hot pink (styled in stats.css)
  if (title) title.innerHTML = 'Ctrl<span class="plus">+</span>Heart';

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

  // "keys that have blocked u": a card under the group chat listing every key
  // that blocked us, in the order they did it (feelings.js sends 'keydrama' blocked)
  const gcCard = document.getElementById('gc') && document.getElementById('gc').closest('.card');
  const blockedCard = document.createElement('div');
  blockedCard.className = 'card';
  blockedCard.id = 'blocked-card';
  blockedCard.innerHTML = `
    <h3>keys that have blocked u <span id="blocked-count"></span></h3>
    <div id="blocked-list"><span class="blocked-none">nobody (yet)</span></div>
  `;
  if (gcCard) gcCard.after(blockedCard);
  else if (cards) cards.append(blockedCard);
  const blockedList = document.getElementById('blocked-list');
  const blockedCount = document.getElementById('blocked-count');

  function clearBlocked() {
    blockedList.innerHTML = '<span class="blocked-none">nobody (yet)</span>';
    blockedCount.textContent = '';
  }
  document.addEventListener('keydrama', e => {
    if (e.detail.type !== 'blocked') return;
    const none = blockedList.querySelector('.blocked-none');
    if (none) none.remove();
    const chip = document.createElement('span');
    chip.className = 'blocked-chip';
    chip.textContent = e.detail.key;
    blockedList.append(chip);
    blockedCount.textContent = '(' + blockedList.children.length + ')';
  });
  document.addEventListener('ctrl:reset', clearBlocked);

  // average % -> morale word: 60+ thriving, 40+ stable, 20+ tense, under 20 doomed
  function label(avg) {
    if (avg >= 60) return 'thriving';
    if (avg >= 40) return 'stable';
    if (avg >= 20) return 'tense';
    return 'doomed';
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
  }

  update();
  setInterval(update, 500);
})();
