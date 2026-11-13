#!/bin/sh
# Herdr mods can't import across folders, so every mod that plays keeps its own copy of the game
# rules (game.js) and Pokemon names (pokemon.js). mods/pokedex-agents holds the source copies.
#   scripts/sync-game.sh          copy the source files to every other mod
#   scripts/sync-game.sh --check  exit 1, naming each copy that differs (for CI or a pre-commit hook)
set -eu
cd "$(dirname "$0")/.."
SOURCE=mods/pokedex-agents
MODS="pokedex-console pokedex-collection pokedex-trainer pokedex-encounter"
FILES="game.js pokemon.js"
status=0
for mod in $MODS; do
  for file in $FILES; do
    if [ "${1:-}" = "--check" ]; then
      if ! cmp -s "$SOURCE/$file" "mods/$mod/$file"; then
        echo "mods/$mod/$file differs from $SOURCE/$file" >&2
        status=1
      fi
    else
      cp "$SOURCE/$file" "mods/$mod/$file"
    fi
  done
done
[ "${1:-}" = "--check" ] && [ "$status" -eq 0 ] && echo "game.js and pokemon.js match in every mod"
exit "$status"
