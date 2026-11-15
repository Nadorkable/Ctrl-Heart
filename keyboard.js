// keyboard.js: [label, code, width]
const LAYOUT = [
  [['`','Backquote'],['1','Digit1'],['2','Digit2'],['3','Digit3'],['4','Digit4'],['5','Digit5'],['6','Digit6'],['7','Digit7'],['8','Digit8'],['9','Digit9'],['0','Digit0'],['-','Minus'],['=','Equal'],['Delete','Backspace',1.7]],
  [['Tab','Tab',1.5],['Q','KeyQ'],['W','KeyW'],['E','KeyE'],['R','KeyR'],['T','KeyT'],['Y','KeyY'],['U','KeyU'],['I','KeyI'],['O','KeyO'],['P','KeyP'],['[','BracketLeft'],[']','BracketRight'],['\\','Backslash',1.2]],
  [['Caps','CapsLock',1.8],['A','KeyA'],['S','KeyS'],['D','KeyD'],['F','KeyF'],['G','KeyG'],['H','KeyH'],['J','KeyJ'],['K','KeyK'],['L','KeyL'],[';','Semicolon'],["'",'Quote'],['Return','Enter',1.9]],
  [['Shift','ShiftLeft',2.3],['Z','KeyZ'],['X','KeyX'],['C','KeyC'],['V','KeyV'],['B','KeyB'],['N','KeyN'],['M','KeyM'],[',','Comma'],['.','Period'],['/','Slash'],['Shift','ShiftRight',2.3]],
  [['fn','Fn'],['Ctrl','ControlLeft'],['Opt','AltLeft'],['Cmd','MetaLeft',1.3],['Space','Space',5.5],['Cmd','MetaRight',1.3],['Opt','AltRight'],['←','ArrowLeft'],['↑↓','ArrowUp'],['→','ArrowRight']]
];

const keyboardEl = document.getElementById('keyboard');

LAYOUT.forEach(row => {
  const r = document.createElement('div');
  r.className = 'row';
  row.forEach(([label, code, w = 1]) => {
    const k = document.createElement('div');
    k.className = 'key meh';
    k.dataset.code = code;
    k.style.flex = w;
    k.innerHTML = label + '<span class="pct"></span><span class="face"></span>';
    r.append(k);
  });
  keyboardEl.append(r);
});

// legend
const MOODS = [
  ['thriving','thriving'],['happy','happy'],['fine','fine'],['meh','meh'],
  ['sad','sad'],['jealous','jealous'],['blocked','blocked']
];
const legend = document.createElement('div');
legend.className = 'legend';
MOODS.forEach(([cls, name]) => {
  const item = document.createElement('span');
  item.className = 'legend-item';
  item.innerHTML = '<i class="swatch ' + cls + '"></i>' + name;
  legend.append(item);
});
keyboardEl.after(legend);