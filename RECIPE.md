# Pokedex

A Herdr window dressed as a handheld Pokedex. The left side is a red device housing: a blue camera sensor and the word POKEDEX at the top, a dark green screen listing your projects, and below it a stack of pale LCD cards, one per coding agent. Each card shows the Pokemon that belongs to that agent's project. The Pokemon bobs while the agent works, pulses when it needs you, sparkles when it's done and sleeps when idle. On the right, your terminals sit in rounded cards on a deep red body under a red tab bar, with a dark status strip along the bottom. It's also a game: partners level up and evolve as agents finish tasks, wild Pokemon appear, and a trainer card tracks badges and a daily streak. Everything is drawn natively by Herdr (GPUI elements described from JavaScript). There's no HTML or web view anywhere.

![Pokedex](preview.png)

## What you see

The window has no system title bar. On macOS the window buttons sit at 12, 16 px over the top left of the sidebar. The whole window is a row: the sidebar (300 px, resizable from 76 to 440 px), a 3 px `#641b2b` divider, then the work area. The base housing color is `#9b293a`.

**Sidebar, top to bottom**

1. **Brand plate (124 px).** Red `#9b293a` with a 2 px `#e8797d` line underneath. Dragging it moves the window. On the left is a 46 px round sensor: a `#641b2b` bezel, a cream `#f7eed7` ring, a `#298eaa` ring, a cyan `#71d5df` lens and a small `#edffff` glint. Beside it, "POKEDEX" in the pixel font (PxPlus IBM VGA 8x16, 23 px), with "AGENT CONTROL" below it in 10 px semibold `#f3bfba`. Three 7 px lights sit at the top right: yellow `#ffcc67` while any agent is blocked, cyan while any is working, and dark `#6e2930` otherwise. The third light is always LCD green `#d9e8bc`. Under them runs a row of three short `#641b2b` bars (84, 20 and 20 px). The rest of the console text uses Geist.
2. **Projects (weight 0.9, min 120 px).** A 36 px red header strip: a small cyan lens dot, "PROJECTS / SPACES" in cream pixel type, and a "+" on the right. Below it is a dark green screen (`#244438`). Each machine gets a heading band (`#355746` with a 2 px cyan left edge): a monitor or server pixel icon, the machine name in caps ("THIS MACHINE" for this computer), a thin rule, a space count and a "+". Spaces are 32 px rows (28 px for worktrees) with a 6 px colored square, the name in 16 px pixel type, and a "!" (blocked) or "*" (done) mark. Only unusual git info follows the name: the repo when it differs from the name, the branch unless it's main or master or matches the name, then ahead in LCD green (↑2) and behind in `#ffd3a8` (↓1). The active space is an LCD green row with dark ink and a cyan left edge. Worktree spaces sit under their main checkout with a branch icon.
3. **Agents (weight 1.4, min 160 px).** A red header strip with the lens dot, "POKÉMON / AGENTS", and a sort icon on the right. Under it, on the red housing, are group labels in pixel caps (`#f7eed7` at 70%) with a count and a rule to the edge, then 88 px LCD cards (`#d9e8bc`, 1.5 px border, 4 px corners) with 5 px between them. Each card holds:
   - a 58 px scene with a faint ground strip and the project's Pokemon sprite at 48 px. Its corner mark is "z" (idle), "!" (blocked) or "✦" (done).
   - a name line in 16 px pixel type. On the focused card it's inverted (LCD text on `#244438`).
   - an optional task line (11.5 px).
   - a status line (10.5 px): a status mark, a bold status word (WORKING, NEEDS YOU, DONE, IDLE), the program's icon and name, the machine name for remote agents, the time since the last state change (`<1m`, `5m`, `3h`, `2d`), and a fold chevron with a count when the agent has sub-agents.
   - a level line: "Lv<n>" in 12 px pixel type and a 4 px XP bar (`#244438` fill on a 1 px ink outline) showing progress to the next level.
   - Sub-agents sit under their parent as 24 px LCD strips joined by tree lines: a 14 px Pokemon, the name and a status mark.
   - With no agents, a "NO DATA" card explains that agents appear when they report status, and that older versions and agents inside tmux may not.
4. **Footer (48 px).** Red with a 2 px `#641b2b` top line. It holds the trainer strip, a 26 px LCD chip filling the width: "TR<level>" in 14 px pixel type, a streak "♨<days>" (`#b4472f` when the streak is alive), then the eight badge sprites at 13 px (25% opacity when locked). After it is a "Settings" button (72 x 26 px, `#e8797d` border).

**Work area, top to bottom**

1. **Tab bar (48 px).** Red `#9b293a` with a 2 px `#e8797d` bottom line. You can drag the window by it. Tabs are 32 px tabs with 6 px corners, `#9b293a` with an `#e8797d` border and cream text. The active tab is cream with dark green text, a cream border and a close cross. Each tab shows its program icon, its name (ordinary unnamed tabs show their number), a spinner while working and a dot when blocked or done. A zoomed tab gets " Z" after its name. On the right are a round 26 px "+", then FILES and CHANGES buttons (white when their panel is open). On Linux and Windows, minimize, maximize and close buttons come last. On macOS the bar leaves room for the traffic lights when the sidebar is narrow.
2. **Body.** A `#812535` row with 10 px padding and 10 px gaps. Terminal panes are cards with 8 px corners, a 2 px `#4c302d` border that turns cyan `#71d5df` on focus, and 14 x 12 px terminal padding. They're framed even when a tab has only one pane. Each pane has a 34 px dark green header: the program icon, a 6 px dot (cyan when focused), the name in caps on a `#17251f` chip, the folder (with `~` for home) in Pixelated MS Sans Serif 11 px, and a status badge (BUSY, NEEDS YOU, DONE, IDLE) in the theme's status color. A 368 px side panel (280 to 900 px) on the right shows Herdr's Files or Changes. It's hidden until opened.
3. **Status strip (30 px).** Dark `#17251f` with 11 px `#b6c6b8` text: a cyan dot, the active space's name, the focused agent's program, then counts that only appear when they're nonzero: "Working N" (cyan), "Needs you N" (`#ffd07a`), "Done N" (LCD green) and "Idle N" (`#b6c6b8`). It ends with "HERDR / FIELD SYSTEM" in `#819788`.

**Theme.** The layout sets no theme of its own, so the person's theme still applies. It only overrides colors: canvas `#17251f`, chrome `#9b293a`, accent and working `#71d5df`, blocked `#ffd07a`, done `#b9dc92`. Pane backgrounds use the theme's `background`.

**Compact rail.** Under 160 px the sidebar becomes a rail. The sensor shrinks to 32 px and the title goes. Spaces and agents become 32 x 26 px numbered cells. Agent cells show a state mark in housing inks: a cyan spinner, "!" in cyan, "*" in cream, "·" for idle. The footer shows only the "TR<level>" chip, and a "»" at the bottom of the agents list widens the sidebar again.

## How it behaves

**Agent statuses** come from Herdr's reported status (OSC 7501). Agents that don't report show up only as ordinary terminals.

- **Working:** the sprite bobs 3 px over 1 s, the card shows a spinning ring and WORKING, the brand plate's cyan light comes on, and the pane badge reads BUSY.
- **Blocked (needs you):** the sprite pulses between 55% and 100% opacity over 0.8 s, with a red "!" in the corner and a red "!" chip next to NEEDS YOU on the card. The yellow brand light comes on and the space row shows "!". Sub-agent strips use a "!" chip in Priority view and a NEEDS YOU chip in Grouped view.
- **Done:** a "✦" sparkle, a filled dot and DONE. The space row shows "*". Once someone looks at the agent, Herdr turns it to idle.
- **Idle:** a "z" over the sprite, an empty ring and IDLE in softer ink.

A sub-agent reporting `error` counts as blocked. A sub-agent never shows done: its parent carries that news. A parent sorts by its most urgent sub-agent.

**Pokemon per project.** Only Gen 1 (#001 to #151) is used. A project's partner is `shared("pokedex.partners")[spaceName]` if set. Otherwise it migrates from the older 40-entry pool: FNV-1a of the space name plus its old step count picks a legacy id; ids up to 151 are kept and later ones become `hash % 151 + 1`. Clicking a scene (tooltip "No. 025 · Click to change partner; right-click to log a catch") moves to the next id, #151 wrapping to #001. Right-click opens the collection on that Pokemon.

**Kanto collection.** The `KANTO DEX` button ("151" in the compact rail) shows `Caught N / 151` and opens `pokedex-collection` as an 820 x 680 dialog: title, progress bar, search by name or number, All and Caught filters, and a grid of cards (#id, 48 px sprite, name; caught cards are filled with a check mark). Cards are not clickable and there is no catch button. Catches happen when an agent opens in a project (its partner is added once per agent address per start), or by the commands below; stored as sorted unique ids in `shared("pokedex.caught")`. The mod's `nextCommand()` accepts `catch-<n>`, `release-<n>`, `show-all`, `show-caught`, `search-<text>`, `focus`; ids outside 1 to 151 are refused with a message and change nothing. Commands reach only an open copy.

**Gamification.** All rules live in `game.js`; state is `shared("pokedex.game")`: `{ xp: {spaceName: n}, tasks, evolutions, streak: {last, days, best}, badges: [ids], shiny: [ids], encounter: {id, at, balls} | null }`.

- **XP.** When an agent's status goes from working to idle or done (done and idle count as one), its project gets 25 XP, plus 25 when the task ran over 10 minutes. Only the agents mod awards XP. It's counted only while Herdr is open.
- **Levels.** Medium-fast curve: level n needs n³ XP, from Lv1 to Lv100. A level-up posts a toast "<Name> grew to Lv <n>!".
- **Evolution.** At its Gen 1 level the partner evolves (Charmander 16, Charmeleon 36, Magikarp 20, Dratini 30, Dragonair 55...). Stone and trade evolutions happen at 30, and Eevee picks Vaporeon, Jolteon or Flareon from the project name. The new form becomes the partner in `pokedex.partners`, is caught, and a toast says "What? <Name> is evolving!".
- **Daily streak.** A day counts when at least one task finished. Yesterday plus today extends it; a gap resets it to 1. The best streak is kept.
- **Shinies.** Every new catch has a 1 in 8 chance to be shiny at a 7-day streak and 1 in 4 at 30 days. Shiny cards in the collection get a 2 px gold `#e8c35a` border and a "✦ SHINY" tag.
- **Wild encounters.** Each finished task has a 15% chance (when none is waiting) to spawn a random Gen 1 Pokemon; legendaries (#144-146, #150, #151) need a second roll. A toast "A wild <Name> appeared!" lasts 60 s and runs `mod.open pokedex-encounter` when clicked. The 340 x 340 encounter dialog shows the bobbing sprite, its catch rate and 3 Poke Balls: 60% for basic and middle forms, 35% for final forms, 3% for legendaries. "Throw Poke Ball" says Gotcha!, broke free or fled; "Run" clears it. After 60 s it's gone.
- **Badges.** Eight Kanto badges, each announced by a toast when earned: Boulder (10 caught), Cascade (50 tasks), Thunder (first evolution), Rainbow (3-day streak), Soul (75 caught), Marsh (500 tasks), Volcano (30-day streak), Earth (all 151).
- **Trainer card.** Clicking the footer strip opens `pokedex-trainer` as a 560 x 520 dialog: TRAINER LV (sum of partner levels), CAUGHT n/151, TASKS DONE, STREAK ("<n>d (best <m>)"), the badge row (the real Kanto badge art at 36 px, 25% opacity when locked, goal in a tooltip), and up to six partners by XP with sprite, project, name, XP bar and level.

**Agents list.**
- Clicking a card focuses its pane. Clicking a sub-agent strip focuses it if it has a pane, and otherwise peeks at it.
- Hovering a card reveals a pin. It pins the agent to the top of every agent list across connected Herdr clients, or unpins it.
- The sort icon opens a small popup: **Priority** (the default) groups cards under Needs you, Done, Working and Idle, newest change first. **Grouped by space** puts them under each space's name. Pinned agents always come first, under "PINNED".
- Clicking a group label folds it. Folded, it shows its count, its most urgent mark and a chevron. The chevron on a card folds its sub-agents.
- The list sets Herdr's agent order, so next agent and previous agent follow it.
- Time-since labels refresh every 30 s.

**Projects list.**
- Clicking a space switches to it. Dragging one onto another in the same machine reorders them, with a cyan line marking where it will land. Right-click opens Herdr's space menu, which includes the worktree actions.
- The header "+" makes a new space. A machine's "+" makes one on that machine. A machine heading folds and unfolds. A machine that was rebuilt offers "Connect".
- Worktree spaces move under their main checkout by themselves.
- Git info refreshes when a command or agent turn ends, when the repo changes on disk, and every 60 s for visible repos while the window is in front.

**Brand, footer and status.** Clicking the sensor opens the command palette (tooltip "Open command palette"). The trainer strip opens the trainer card. Settings opens Herdr's Look settings. The status strip is display only.

**Tabs.** Click to select a tab, double-click to rename it, drag to reorder it, right-click for its menu. The close cross closes the active tab. Scrolling the wheel over the bar moves to the previous or next tab, and the bar scrolls to keep the active tab in view. "+" opens Herdr's new menu (terminal or any installed agent). FILES and CHANGES toggle the side panel, and each space remembers which panel it had open. When a command prefix is armed, the active tab's border turns cyan.

**Panes.** Clicking a header focuses its pane. Hovering a header shows split right, split down, zoom (unzoom when zoomed) and close.

**Movement.** Sprite bobbing, pulsing and the spinners are native animations, not timers. You can drag the sidebar edge, and the side panel resizes too.

## Built from

- **`layouts/pokedex.json`.** Root `row` with `titlebar: "none"`, `traffic_lights: [12, 16]`, `preview: "layouts/pokedex.svg"`, `background: "#9b293a"`, the `colors` above, `terminal_padding: [14, 12]` and a 3 px `#641b2b` divider. Tree:
  - `sidebar` column (300 px, min 76, max 440, `#9b293a`):
    - `brand` block, 124 px, `window_drag`, mod `pokedex-console` with props `{ role: "brand" }`
    - `sidebar-lists` column (3 px `#641b2b` divider):
      - `spaces` block (weight 0.9, min 120), mod `pokedex-spaces`
      - `agents` block (weight 1.4, min 160), mod `pokedex-agents`
    - `sidebar-footer` block, 48 px, `pokedex-console` with `{ role: "footer" }`
  - `work` column, `resizable: false`:
    - `tabs` block, 48 px, `window_drag`, mod `pokedex-tabs`
    - `work-body` row (padding 10, gap 10, `#812535`):
      - `main` block, `{ tab: "active" }` with the pane frame: gap 10, radius 8, background `background`, border 2 `#4c302d`, focus 2 `#71d5df`, header mod `pokedex-pane` (34 px, top, always), `lone: true`
      - `panel` column (hidden, 368 px, 280 to 900) holding `panel-body`, a `stack` (active `files`) of `files` and `changes` blocks using Herdr's shipped mods
    - `status` block, 30 px, `pokedex-console` with `{ role: "status" }`
- **`layouts/pokedex.svg`.** The settings preview.
- **Eight mods.** All have `place: "none"`. Herdr refuses imports from another mod's folder, so each mod that plays keeps identical copies of `game.js` (the rules) and `pokemon.js` (names): `pokedex-agents`, `pokedex-console`, `pokedex-collection`, `pokedex-trainer` and `pokedex-encounter`.
  - `pokedex-trainer` is the trainer card dialog (`mod.json` overlay dialog 560 x 520). It holds `badges/` with the eight Kanto badge PNGs (`boulder.png` to `earth.png`, 75-85 px, from the PokeAPI sprites repository `sprites/badges/1-8.png`); the console strip reads them from there too. It reads `pokedex.game`, `pokedex.caught` and `pokedex.partners`.
  - `pokedex-encounter` is the wild encounter dialog (`mod.json` overlay dialog 340 x 340), opened by `mod.open` from the encounter toast. It calls `throwBall()` and `runAway()`.
  - `pokedex-console` draws three roles from `props().role`: `brand`, `footer` and `status` (it defaults to brand). It reads `agents()`, `spaces()`, `focused()` and the game state, runs `app.palette` and `app.settings {section: "look"}`, and opens `pokedex-trainer`. It measures its own width with `on_size_change` and goes compact under 160 px.
  - `pokedex-spaces` was cloned from Herdr's spaces mod (via `retropet-spaces`). It uses `spaces()`, `machines()`, `panes()`, `window()`, `layout()` and `shared("space.colors")`. It runs `exec("git", ...)` (`status --porcelain=v2 --branch`, `rev-parse`) locally or on the space's machine, and `hc machine ls/rm/add`. It uses `watchFolder` on local repos, `space.select`, `space.move`, `space.new` and `openOverlay` of the shipped `menu`. Its timers run at 250 ms (cheap change check) and 15 s (machines). It holds `fonts/` and `art/` (`monitor.svg`, `server.svg`, `dither.svg`).
  - `pokedex-agents` was cloned from `retro-agents`. It uses `agents()`, `terminals()` (sub-agent trees via `parent`), `panes()`, `spaces()`, `focused()` and `setAgentOrder`. It runs `pane.focus`, `terminal.peek` and `terminal.pin`. It awards XP through `finishTask()` from its status tracking and records catches through `recordCatches()`. Shared keys: `agents.sort`, `pokedex.partners`, `pokedex.caught`, `pokedex.game`, legacy `retro-pokemon.steps`, `sidebar.width` and `sidebar.collapsed`. It calls `layout.resize` on `sidebar` (76 px, or back to the saved width, default 300). It opens itself as a 200 x 140 popup with `{ sortMenu: true }`. Its localStorage keys are `changed` (state timestamps, pruned after 30 days) and `pins`. It holds `pokemon/` with 151 PNG sprites (1.png to 151.png, 96 x 96, from the PokeAPI sprites repository).
  - `pokedex-tabs` was cloned via `retropet-tabs`. It runs `tab.select`, `tab.move`, `tab.rename`, `tab.close`, `tab.prev` and `tab.next`, plus `layout.select/show/hide` on `panel-body` and `panel`, and the `window.*` commands. It opens the `new-menu` popup (250 x 512) and `menu`. It reads `shared("workspace.panels")` (default files and changes) and stores each space's panel in localStorage `panels`. It uses `ScrollHandle` and holds Windows window icons (`win-min`, `win-max`, `win-restore`, `win-close`).
  - `pokedex-pane` was cloned via `retropet-pane`. It reads `panes()` and `home()`, runs `pane.focus`, `pane.split`, `pane.zoom` and `pane.close`, and holds `split-right`, `split-down`, `zoom`, `unzoom` and `close` SVGs.
  - `pokedex-collection` is new: `main.js`, `mod.json` (`focusable`, overlay 820 x 680) and `pokemon.js`, a static `POKEMON` array of 151 `{id, name}` records (names such as Nidoran F, Nidoran M, Farfetch'd, Mr. Mime). It uses `shared`, `setShared`, `props`, `closeOverlay`, `nextCommand`, `InputState`/`Input`, and reads sprites from `mods/pokedex-agents/pokemon/`. It makes no network calls.
- **Fonts.** Three files in `mods/pokedex-spaces/fonts/`: `PxPlus_IBM_VGA_8x16.ttf`, plus `PixelatedMSSansSerif-Regular.ttf` and `-Bold.ttf`. Their notices are `LICENSE-PxPlus.txt` (CC BY-SA 4.0) and `LICENSE-MSSansSerif.txt` (lou 2017, FontStruct, CC BY-SA 3.0). Herdr loads them at start, and every mod uses them by family name.
- **Shipped Herdr dependencies, not packaged:** `files`, `changes`, `menu`, `new-menu`, `worktree` (reached through the menus), Geist, and `workspace-chrome` icons (`spinner`, `chevron-down/right`, `pin`, `pin-off`, `clock`, `layers`, `check`, `plus`, `branch`, `monitor`, `server`). It also uses `mods/pane/close.svg`, `mods/files/file.svg` and `mods/changes/changes.svg`.
- **`programs.json`.** Merge entries for `omp` (name "OMP", tile `#f3a9bd`, `run: ["omp"]`) and `omo` (name "OMO", tile `#71d5df`, `run: ["omo"]`). Both use `personal-icons/retro-agent.svg` with `tint: false`. Claude Code and Codex use Herdr's built-in entries. Agent identity is generic: a card names the program from Herdr's table, and falls back to the agent's reported `app` when the table doesn't know it.
- **Keys.** No `keys.json` is packaged. Keep the person's own keybindings.
- **Status protocol.** Programs report through [OSC 7501](https://www.superlogical.com/rex/docs/build/program-status): colon-separated `key=value` pairs, not JSON; `state` is required, `app` identifies the program, and `msg`/`title` are base64 UTF-8. For example, `ESC ] 7501 ; state=working:app=codex ST`. Herdr exposes the parsed state as `a.status`; the layout reads it rather than guessing from terminal text.
- **Reusing the art.** The exact sprites and font files are included at their paths in this repository. A rebuild in an empty folder can reuse those assets from [pokemon-herdr](https://github.com/anthonymq/pokemon-herdr), retaining the font notices. Build the native UI from this brief; do not substitute the screenshot for working elements.

## Watch out

- Mods can't import across folders (`resolves outside the application directory`). Keep the five `game.js` copies identical; change one, copy it to all.
- Card height grew from 73 to 88 px for the level line; shrinking it clips the XP bar.
- Game state, like caught progress, is personal state in `shared.json`; never publish it.
- Herdr's shipped mods are read-only. Build the eight mods under these new names, and don't edit `spaces`, `agents`, `tabs` or `pane` in place.
- Every mod decides compact mode from the `sidebar` node's `size.px` (under 160) in `layout()`, not from a flag. The console uses its own measured width instead. Keep the node id `sidebar`, plus `panel`, `panel-body`, `files` and `changes`, which the tabs mod drives by id.
- Fonts are referenced by family name and loaded from `pokedex-spaces/fonts`. Keep that folder, or the pixel type falls back. The comment in `pokedex-pane` mentions `retropet-spaces/fonts`, which is stale.
- Partner choices are keyed by space name, so renaming a space can change its Pokemon. Caught progress is personal state in `shared.json`; never publish it.
- Keep the legacy 40-id migration list unchanged, or existing projects get different partners.
- `herdr-app check` covers the first render only. The sort popup, hover pins, sub-agent rows, folded groups and machine states need a look in the running app.
- Agents inside tmux, and older agents, may not report status and won't appear as cards.
- Don't put Pokedex or POKEDEX with an accented e in user-facing text. The agents header does read "POKÉMON / AGENTS".
- The footer has only the trainer strip and Settings. Earlier builds had an "Original" button and pane-focus arrows there, and both were removed. Don't add them back.
- Normal tabs display their names or ordinal numbers. Only a legacy name matching `tb` followed by digits is replaced by the program name; do not assume all unnamed tabs show the program name.
- Herdr regenerates `gpui-kit.d.ts`, `herdr.d.ts` and `jsconfig.json` in each mod. Leave them out of the package.
- The sprites and Pokemon names are third-party artwork. This package grants no rights to them.

## Done when

- `herdr-app check` passes for `pokedex-console`, `pokedex-spaces`, `pokedex-agents`, `pokedex-tabs`, `pokedex-pane`, `pokedex-collection`, `pokedex-trainer` and `pokedex-encounter`.
- An agent going working then idle adds 25 XP to its project: its card's XP bar moves and the trainer card's TASKS DONE goes up by one.
- `herdr-app do mod.open --name pokedex-trainer` shows the four stats, eight badges and partners; clicking the footer strip opens the same card.
- With an encounter waiting, its toast opens `pokedex-encounter`; three misses make it flee, a catch adds it to the collection.
- Every sprite is Gen 1; `herdr-app do mod.open --name pokedex-collection` then `pokedex-collection.catch-25` twice and `catch-151` saves `[25,151]`; `release-25`, `release-151` empty it; `catch-0` and `catch-152` change nothing; the list survives an app restart.
- `herdr-app do layout.switch --name pokedex` shows the red sidebar with POKEDEX, PROJECTS / SPACES, POKEMON cards with Lv lines, and a footer with the trainer strip and Settings.
- Clicking the sensor opens the palette, and Settings opens Look settings.
- An agent that reports working, blocked, done and idle shows each animation, word and mark, and the status strip counts change to match.
- Clicking a Pokemon scene changes the sprite for every agent in that space, and a project keeps its partner after a restart.
- Priority and Grouped sorts both work. A pin moves a card under PINNED, and sub-agents appear in a tree under their parent.
- Dragging the sidebar under 160 px gives numbered rail cells, and "»" brings back the previous width.
- FILES and CHANGES open the side panel, and switching spaces restores each space's choice.
- Hovering a pane header shows split, zoom and close, and they act on that pane.
