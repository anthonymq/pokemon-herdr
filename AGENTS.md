# pokemon-herdr

The Pokedex for Herdr: `mods/pokedex-*`, a client of pokedex-agents-server.

## The three repos

| Repo | Local path | Role |
|---|---|---|
| pokedex-agents-server (github.com/anthonymq/pokedex-agents-server) | `~/workspace-perso/pokedex-agents-server` | The only process that runs the game rules. Bun, 127.0.0.1:7151. Save: `~/.local/state/pokedex-agents-server/shared.json`. |
| pokemon-rex (github.com/anthonymq/pokemon-rex) | `~/.config/rex/pokedex` | Rex client. The checkout is also the live install. |
| pokemon-herdr (github.com/anthonymq/pokemon-herdr) | `~/workspace-perso/pokemon-herdr` | Herdr client. The checkout is not live: the mods run from `~/.config/herdr-app/mods/pokedex-*`. |

- Neither app depends on the other. Whichever app needs the server starts it; a second copy exits at once.
- A rule change belongs in the server's `src/game.js`. The apps only read the game and send actions (`POST /call`, `POST /share`).
- The apps keep read-only copies of the server's `game.js` and `pokemon.js`, and every Herdr mod keeps a copy of `mods/pokedex-agents/server.js`. Never edit a copy: change the source, then run `scripts/sync-game.sh` in the app repo. `scripts/sync-game.sh --check` is what Herdr's CI runs.

## Changing things safely

- Before any write to the live save (a live Herdr mod, a running server, a real Rex pane), copy `~/.local/state/pokedex-agents-server/shared.json` aside first, not after.
- For experiments use an isolated server: `POKEDEX_STATE=<tmp dir> POKEDEX_PORT=7199`. Test panes in a live Rex are seen by the real daemon and change the real save.
- The running server only picks up new code after a restart. Its pid is in `~/.local/state/pokedex-agents-server/server.json`; start it again with `bun bin/pokedex-agents-server.js` from the server repo.
- When an app starts using a new server route, push the server first.
- Anything shared publicly (the X post, the share card) shows Pokemon, levels and totals, never project names or paths: those include work repos.

## This repo

- Edit here, then copy the changed files to `~/.config/herdr-app/mods/<mod>/`. Herdr reloads a mod the moment a file is saved there, so that copy is a live deploy.
- `mods/pokedex-agents/server.js` is the source of the server client. It mirrors the server's save into Herdr's shared state over `/ws`. `scripts/sync-game.sh` copies it, plus `game.js` and `pokemon.js`, into each mod that plays.
- Check a mod after copying it: `herdr-app check ~/.config/herdr-app/mods/<mod>`.
- Herdr's own rules for mods are in `~/.config/herdr-app/AGENTS.md`. Herdr rewrites that file, so don't edit it.
- Commit messages: Conventional Commits (`feat(pokedex): ...`, `fix(agents): ...`).
