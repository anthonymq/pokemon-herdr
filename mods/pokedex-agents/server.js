// The Pokedex agents server (its own repo, pokedex-agents-server; http://127.0.0.1:7151) owns the game: every change
// goes through call(). pokedex-agents keeps Herdr's shared state a mirror of it (mirror()), so
// game() and shared("pokedex.*") read as before in every mod. Copied to each mod by scripts/sync-game.sh.
import { WebSocket } from "websocket";
import { shared, setShared, notify, exec } from "herdr";

export const SERVER = "127.0.0.1:7151";
const KEYS = ["pokedex.game", "pokedex.caught", "pokedex.partners", "pokedex.projects"];

// Resolves with the action's value; rejects with the server's error, or when it is down.
export async function call(action, ...args) {
  let r;
  try {
    const res = await fetch(`http://${SERVER}/call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, args, origin: "herdr" }),
    });
    r = await res.json();
  } catch (error) {
    throw new Error(`Pokedex server not reachable: ${error}`);
  }
  if (!r.ok) throw new Error(r.error);
  return r.value;
}
// Shares progress on X: the server puts the card image on the clipboard, and X's compose
// window opens with the post's text. Resolves with the message to show.
export async function shareOnX() {
  let r;
  try {
    r = await (await fetch(`http://${SERVER}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
  } catch (error) {
    throw new Error(`Pokedex server not reachable: ${error}`);
  }
  if (!r.ok) throw new Error(r.error);
  await exec("open", [r.url], { timeout: 5000 });
  return r.copied ? "Card copied: paste it into the post (⌘V)" : "X opened; the card couldn't be copied";
}

// For changes nobody waits on: a failure is logged, not thrown.
export const send = (action, ...args) => call(action, ...args).catch((error) => console.log(`pokedex: ${action} failed: ${error.message}`));

// A server that isn't running is started from where it is installed: $POKEDEX_SERVER_DIR, else
// ~/.local/share/pokedex-agents-server, else ~/workspace-perso/pokedex-agents-server. A second
// copy exits at once, so Herdr and Rex starting it together is fine.
async function startServer() {
  const script = `for d in "$POKEDEX_SERVER_DIR" "$HOME/.local/share/pokedex-agents-server" "$HOME/workspace-perso/pokedex-agents-server"; do
    if [ -n "$d" ] && [ -f "$d/bin/pokedex-agents-server.js" ]; then
      mkdir -p "$HOME/.local/state/pokedex-agents-server"
      nohup "$(command -v bun || echo "$HOME/.bun/bin/bun")" "$d/bin/pokedex-agents-server.js" >> "$HOME/.local/state/pokedex-agents-server/server.log" 2>&1 &
      exit 0
    fi
  done
  echo "pokedex-agents-server not installed" >&2; exit 1`;
  const r = await exec("sh", ["-lc", script], { timeout: 5000 });
  if (r.code !== 0) throw new Error(r.stderr.trim() || `exit ${r.code}`);
}

// Follows /ws for as long as `cx` lives: each state the server sends is written into Herdr's
// shared state (only the keys that changed, so mods redraw only on real news), and news this app
// caused is shown as a toast. On the first state it merges Herdr's old save into the server's, once.
export async function mirror(cx) {
  const since = Date.now();
  let shown = since, tries = 0, merged = false;
  for (;;) {
    try {
      const ws = await WebSocket.connect(`ws://${SERVER}/ws`);
      tries = 0;
      for (;;) {
        const msg = await ws.read();
        const state = JSON.parse(typeof msg === "string" ? msg : new TextDecoder().decode(msg));
        if (!merged) {
          const mine = Object.fromEntries(KEYS.map((k) => [k, shared(k)]));
          if (!(state.shared["pokedex.merged"] ?? []).includes("herdr") && Object.values(mine).some((v) => v !== undefined)) {
            await call("merge", "herdr", mine); // throws until it succeeds: nothing is mirrored before
            merged = true;
            continue; // the merged state comes next
          }
          merged = true;
        }
        for (const k of KEYS) {
          const v = state.shared[k];
          if (v !== undefined && JSON.stringify(v) !== JSON.stringify(shared(k))) setShared(k, v);
        }
        for (const n of state.notes ?? []) {
          if (n.origin !== "herdr" || n.at <= shown) continue;
          shown = n.at;
          notify({ title: n.title, body: n.body, level: n.level, icon: n.icon ?? undefined, action: n.action ?? undefined, timeout: n.timeout ?? undefined });
        }
        cx.notify();
      }
    } catch (error) {
      if (tries++ === 0) {
        console.log(`pokedex: server connection lost (${error}); starting it`);
        try { await startServer(); } catch (e) { console.log(`pokedex: could not start the server: ${e}`); }
      }
    }
    await cx.sleep(Math.min(10000, 1000 * tries));
  }
}
