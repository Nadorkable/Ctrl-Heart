"""
ctrlheart_helper.py (Nada): laptop-wide mode for Ctrl+Heart (Windows only)

What it does:
  1. watches the keyboard for the WHOLE laptop (any app) and tells the website
     which key was pressed, so typing in Notepad / Discord / anywhere counts
  2. the website tells it which keys blocked you, and it swallows those keys
     everywhere on the laptop until you reset, pause, or close this window

It never stores or sends what you type: only key names like "KeyQ" go to the
website, and only to the page on this laptop (127.0.0.1).

SAFETY (you can always get your keyboard back):
  - press Esc 3 times fast        -> unblocks everything until you restart the helper
  - close this window / Ctrl+C    -> keyboard back to normal instantly
  - Ctrl, Alt, Win and Esc are NEVER blocked for real (they still go grey on the site)
  - the mouse is never touched
  - if the website tab closes, everything unblocks by itself

Run it with run-helper.bat, then open the site with ?laptop at the end:
  https://nadorkable.github.io/Ctrl-Heart/?laptop
"""

import json
import queue
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pynput import keyboard

PORT = 8787

# keys the helper will never swallow, so you can always escape
NEVER_BLOCK = {"ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight", "Escape"}

# Windows scan code (+ "extended" flag) -> the same names the website uses (e.code)
SCAN = {
    0x29: "Backquote", 0x02: "Digit1", 0x03: "Digit2", 0x04: "Digit3", 0x05: "Digit4",
    0x06: "Digit5", 0x07: "Digit6", 0x08: "Digit7", 0x09: "Digit8", 0x0A: "Digit9",
    0x0B: "Digit0", 0x0C: "Minus", 0x0D: "Equal", 0x0E: "Backspace",
    0x0F: "Tab", 0x10: "KeyQ", 0x11: "KeyW", 0x12: "KeyE", 0x13: "KeyR", 0x14: "KeyT",
    0x15: "KeyY", 0x16: "KeyU", 0x17: "KeyI", 0x18: "KeyO", 0x19: "KeyP",
    0x1A: "BracketLeft", 0x1B: "BracketRight", 0x2B: "Backslash",
    0x3A: "CapsLock", 0x1E: "KeyA", 0x1F: "KeyS", 0x20: "KeyD", 0x21: "KeyF", 0x22: "KeyG",
    0x23: "KeyH", 0x24: "KeyJ", 0x25: "KeyK", 0x26: "KeyL", 0x27: "Semicolon",
    0x28: "Quote", 0x1C: "Enter",
    0x2A: "ShiftLeft", 0x2C: "KeyZ", 0x2D: "KeyX", 0x2E: "KeyC", 0x2F: "KeyV",
    0x30: "KeyB", 0x31: "KeyN", 0x32: "KeyM", 0x33: "Comma", 0x34: "Period",
    0x35: "Slash", 0x36: "ShiftRight",
    0x1D: "ControlLeft", 0x38: "AltLeft", 0x39: "Space", 0x01: "Escape",
}
SCAN_EXTENDED = {
    0x1D: "ControlRight", 0x38: "AltRight", 0x5B: "MetaLeft", 0x5C: "MetaRight",
    0x48: "ArrowUp", 0x50: "ArrowDown", 0x4B: "ArrowLeft", 0x4D: "ArrowRight",
}

WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP = 0x100, 0x101, 0x104, 0x105
LLKHF_EXTENDED, LLKHF_INJECTED = 0x01, 0x10

lock = threading.Lock()
blocked = set()          # codes the website says blocked you
paused = False           # website paused -> block nothing
panicked = False         # Esc x3 -> block nothing until restart
held = set()             # keys currently held down (to skip auto-repeat)
swallowed = set()        # keys whose key-down we swallowed (swallow their key-up too)
esc_times = []
clients = []             # one queue per open website tab


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def code_of(data):
    if data.flags & LLKHF_EXTENDED:
        return SCAN_EXTENDED.get(data.scanCode)
    return SCAN.get(data.scanCode)


def send_to_site(code):
    with lock:
        for q in clients:
            q.put(code)


def on_key(msg, data):
    """Runs for every key on the laptop. Must stay fast (Windows drops slow hooks)."""
    global panicked
    if data.flags & LLKHF_INJECTED:
        return True                                   # ignore fake/injected keys
    code = code_of(data)
    if code is None:
        return True                                   # not a key the site knows (F-keys, numpad...)

    down = msg in (WM_KEYDOWN, WM_SYSKEYDOWN)
    up = msg in (WM_KEYUP, WM_SYSKEYUP)

    if down:
        if code == "Escape":                          # emergency: Esc 3x within 1.5 sec
            now = time.time()
            esc_times.append(now)
            del esc_times[:-3]
            if len(esc_times) == 3 and now - esc_times[0] < 1.5 and not panicked:
                panicked = True
                log("ESC x3: everything unblocked until you restart the helper.")
            return True

        with lock:
            block_it = (code in blocked and code not in NEVER_BLOCK
                        and not paused and not panicked and clients)
        if block_it:
            swallowed.add(code)
            listener.suppress_event()                 # this key does nothing, anywhere
        if code in held:
            return True                               # holding the key down: count it once
        held.add(code)
        send_to_site(code)
        return True

    if up:
        held.discard(code)
        if code in swallowed:
            swallowed.discard(code)
            listener.suppress_event()
    return True


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):                     # keep the window quiet
        pass

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_POST(self):
        # the website sends {"blocked": ["Space", "KeyQ"], "paused": false}
        global paused
        if self.path != "/state":
            self.send_response(404); self.cors(); self.end_headers(); return
        length = int(self.headers.get("Content-Length", 0))
        try:
            state = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            state = {}
        new_blocked = set(state.get("blocked", []))
        with lock:
            changed = new_blocked != blocked or bool(state.get("paused")) != paused
            blocked.clear()
            blocked.update(new_blocked)
            paused = bool(state.get("paused"))
        if changed:
            real = sorted(new_blocked - NEVER_BLOCK)
            log(("PAUSED. " if paused else "") +
                ("blocked on the whole laptop: " + ", ".join(real) if real else "nothing blocked"))
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        # the website listens here for key presses (Server-Sent Events)
        if self.path != "/events":
            self.send_response(404); self.cors(); self.end_headers(); return
        self.send_response(200)
        self.cors()
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        q = queue.Queue()
        with lock:
            clients.append(q)
        log("website connected")
        try:
            while True:
                try:
                    code = q.get(timeout=2)
                    self.wfile.write(f"data: {code}\n\n".encode())
                except queue.Empty:
                    self.wfile.write(b": ping\n\n")   # also notices a closed tab
                self.wfile.flush()
        except OSError:
            pass
        finally:
            with lock:
                clients.remove(q)
                if not clients:                       # no website open -> unblock everything
                    blocked.clear()
            log("website disconnected" + ("" if clients else ", everything unblocked"))


listener = keyboard.Listener(win32_event_filter=on_key)

if __name__ == "__main__":
    print("=" * 60)
    print(" Ctrl+Heart laptop-wide mode")
    print(" open: https://nadorkable.github.io/Ctrl-Heart/?laptop")
    print(" EMERGENCY: press Esc 3x fast, or just close this window")
    print("=" * 60, flush=True)
    listener.start()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    server.daemon_threads = True
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        listener.stop()
        log("helper stopped, keyboard back to normal")
