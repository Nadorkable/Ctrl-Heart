# Ctrl+Heart

a keyboard usage tracker. except your keys have feelings.

Plain HTML + CSS + JS, no server. Open `index.html` with Live Server.

## Who owns which file

Only edit your own files. Need a change in the other person's file? Ask them.

| Nada | Sara |
|---|---|
| `base.css`: fonts, colours, dot grid, sticker classes | `index.html`: everything after this skeleton |
| `start.js`: loading bar + START button | `start.css`: how the title page looks |
| `icon.svg`: the app icon | `keyboard.js` · `keyboard.css`: every key + mood colours |
| `feelings.js`: %, fading, blocking, jealousy | `chat.js` · `chat.css`: group chat + live drama |
| `stats.js` · `stats.css`: header pills, favourite child, page layout | `dialogue.js`: all the chat lines |

## Signals between files

- `ctrl:start`: start.js sends it when START is clicked. Everyone starts their timers.
- `keydrama`: feelings.js sends it when a key blocks you / gets jealous / fades / thrives. chat.js listens.
