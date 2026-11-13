# pokemon-herdr

A Pokedex-themed native coding workspace for [Herdr](https://herdr.dev):
red device housing, a blue sensor, green LCD project navigation and Pokémon
agent cards around your terminals.

![Pokedex layout](preview.png)

The preview is a native Herdr capture with isolated demo projects and
representative terminal text.

Build it from an empty folder using [RECIPE.md](RECIPE.md).

The layout is named **pokedex**. It handles Herdr's generic agent model,
including OMP, OMO, Claude Code, Codex and other reporting agents.
The footer contains only Settings.

## Contents

- `layouts/pokedex.json` and its settings preview.
- Five custom mods: `pokedex-console`, `pokedex-spaces`, `pokedex-agents`,
  `pokedex-tabs` and `pokedex-pane`.
- Pokémon sprites, pixel fonts with their license notices, and native icons.
- `programs.json` with OMP/OMO launcher entries and their personal icon.

Herdr's shipped `files`, `changes`, `menu`, `new-menu`, `worktree` and
`workspace-chrome` mods/assets remain dependencies supplied by Herdr.
This is a layout package, not the Herdr application source.

## Install

Use a current Herdr installation. Copy `layouts/`, `mods/` and
`personal-icons/` into your Herdr app home, normally `~/.config/herdr-app`.
Check for existing names first; do not overwrite your own modified files.

Merge the `programs` entries from this repository's `programs.json` into your
existing file instead of replacing it. OMP and OMO must be installed as
`omp` and `omo` for their launcher choices to be enabled. Claude Code and
Codex use Herdr's built-in entries; Codex retains `--no-daemon`.
Personal settings and keybindings are not included.

The Projects mod runs `git` and `hc` and watches Git metadata outside its own
folder. For remote spaces, those commands run on the space's machine through
Herdr. The agent menu starts the program you select using Herdr's launcher.

Validate the mods:

```sh
(
  for mod in pokedex-console pokedex-spaces pokedex-agents pokedex-tabs pokedex-pane; do
    herdr-app check "$HOME/.config/herdr-app/mods/$mod" || exit 1
  done
) && herdr-app do layout.switch --name pokedex
```

To return to Herdr's default layout:

```sh
herdr-app do layout.switch --name main
```

The copied [mod usage guide](mods/pokedex-console/README.md) also mentions
`retro-workspace`, the original machine's personal layout. That layout is
not part of this package; use an installed layout name on your own machine.

## Controls

The blue sensor opens the command palette. Settings opens Look settings.
Projects and agent cards focus their spaces or terminals. Pokémon portraits
cycle the partner associated with a project. The tab bar supports new
terminals/installed agents and Files/Changes panels.

Working, Needs you, Done and Idle are taken from Herdr's reported status.
Agents that do not report status still work as ordinary terminals.
Pinning, sorting, subagent trees, peek, pane splitting and zoom remain available.
Resize the sidebar down to 76px for compact navigation.

## Validation

The source layout was checked in running Herdr at full and compact sidebar
widths. `herdr-app check` validates initial rendering, not every deferred
state or pointer interaction; inspect the running app after installation.
Generated `.d.ts` and `jsconfig.json` files, runtime state, caches and private
terminal screenshots are deliberately excluded.

## Credits

Several custom mods were cloned from Herdr's shipped mods and retain their
source attribution headers. See [NOTICE.md](NOTICE.md) and the included
inherited source license. Font terms are included under
`mods/pokedex-spaces/fonts/`. Pokémon sprites were copied unchanged from the
existing personal setup; this repository does not grant rights to Pokémon
names or artwork.

Design details: [DESIGN.md](mods/pokedex-console/DESIGN.md).
