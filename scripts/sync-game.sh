#!/bin/sh
# Herdr mods can't import across folders, so every mod that plays keeps its own copy of:
#   game.js, pokemon.js  the rules' read-only helpers and Pokemon names, from the pokedex-agents-server
#                        repo ($POKEDEX_SERVER_DIR, else ../pokedex-agents-server), which alone changes the game
#   server.js            the client for that server; mods/pokedex-agents holds the source copy
#   scripts/sync-game.sh          copy the source files to every mod
#   scripts/sync-game.sh --check  exit 1, naming each copy that differs (for CI or a pre-commit hook)
set -eu
cd "$(dirname "$0")/.."
SERVER="${POKEDEX_SERVER_DIR:-../pokedex-agents-server}"
[ -f "$SERVER/src/game.js" ] || { echo "pokedex-agents-server not found at $SERVER (set POKEDEX_SERVER_DIR)" >&2; exit 1; }
MODS="pokedex-agents pokedex-console pokedex-collection pokedex-trainer pokedex-encounter"
status=0
copy() { # source, target
  if [ "${CHECK:-}" = 1 ]; then
    if ! cmp -s "$1" "$2"; then
      echo "$2 differs from $1" >&2
      status=1
    fi
  else
    cp "$1" "$2"
  fi
}
[ "${1:-}" = "--check" ] && CHECK=1
for mod in $MODS; do
  copy "$SERVER/src/game.js" "mods/$mod/game.js"
  copy "$SERVER/src/pokemon.js" "mods/$mod/pokemon.js"
  [ "$mod" = pokedex-agents ] || copy mods/pokedex-agents/server.js "mods/$mod/server.js"
done
[ "${CHECK:-}" = 1 ] && [ "$status" -eq 0 ] && echo "game.js, pokemon.js and server.js match in every mod"
exit "$status"
