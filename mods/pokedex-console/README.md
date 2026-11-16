# Pokedex coding workspace

A native Herdr layout for supervising coding agents. Red device housing,
green LCD project navigation, Pokemon partners and live agent status surround
the terminal without replacing it.

## Open or leave

```sh
herdr-app do layout.switch --name pokedex
herdr-app do layout.switch --name retro-workspace
```

The blue sensor opens Herdr's command palette. Settings opens Look settings.

## Work with agents

Use the **+** button in the tab bar for the installed-agent menu.
OMP and OMO are registered in `programs.json` with `["omp"]` and `["omo"]`.
Claude Code and Codex retain Herdr's built-in launch entries, including
Codex's `--no-daemon` argument. Other installed agents remain available.
Remote menus use the target machine's installed commands.

Each agent card shows the project, program identity, task/title and live
status. Click the card to focus its terminal. Click the Pokemon portrait to
change that project's partner. Agent sorting, hover-button pinning, nested subagents,
peek and keep behavior are inherited from the existing personal agent mod.

Statuses are Herdr's reported **Working**, **Needs you**, **Done** and
**Idle**, not inferred from a tool's name. Any agent reporting to Herdr can
participate. An ordinary terminal still works when its program does not
report status. The layout does not add an agent-specific status adapter.

Space selection, tab selection/reorder/rename, pane split/zoom/close,
Files, Changes and existing keyboard bindings remain available.

## Kanto collection

Only the 151 original Pokemon (#001 to #151) are used. Every project gets a
Gen 1 partner: projects that already had a Gen 1 partner keep it, later
generation partners are remapped. Click a portrait to move to the next partner
(Mew wraps to Bulbasaur). Right-click a portrait to open the collection on that Pokemon.

The **KANTO DEX** button (**151** in the compact rail) opens a searchable
All/Caught grid. Pokemon are caught in the wild (the status bar's tall grass) or by evolving;
there is no catch button. `catch-<n>` below is a debug command: the server refuses it
unless it runs with `POKEDEX_DEBUG=1`. Progress is
saved as `pokedex.caught` in your own Herdr `shared.json` and is never part of
this repository. Commands for keybindings: `pokedex-collection.catch-<n>`,
`release-<n>`, `show-all`, `show-caught`, `search-<text>`; numbers outside 1 to 151 are rejected.

## Compact mode

Drag the sidebar boundary or use these commands. The compact rail's **»**
control expands it again.

```sh
herdr-app do layout.resize --id sidebar --px 76
herdr-app do layout.resize --id sidebar --px 300
```

The compact rail keeps project and agent navigation. Long labels truncate
instead of expanding the sidebar. Lists scroll independently.

## Maintenance

Personal files:

- `layouts/pokedex.json` and its settings preview `layouts/pokedex.svg`
- `mods/pokedex-console` for sensor, footer and status strip
- `mods/pokedex-spaces`, `pokedex-agents`, `pokedex-tabs`, `pokedex-pane`, `pokedex-collection`
- `programs.json` for OMP/OMO launcher registration

The original personal layout and shipped mods are preserved. Personal
clones are not updated by Herdr upgrades; compare with upstream when native
API changes require it. The original source licenses remain in each clone.
The 151 Gen 1 sprites are local files in `mods/pokedex-agents/pokemon/`.

Run a native check after editing each mod:

```sh
herdr-app check ~/.config/herdr-app/mods/pokedex-console
herdr-app check ~/.config/herdr-app/mods/pokedex-spaces
herdr-app check ~/.config/herdr-app/mods/pokedex-agents
herdr-app check ~/.config/herdr-app/mods/pokedex-tabs
herdr-app check ~/.config/herdr-app/mods/pokedex-pane
herdr-app status
herdr-app shot /var/tmp/pokedex.png
```

`check` validates initial rendering, not deferred states or pointer actions.
Inspect the running interface too. Screen Recording and Accessibility are
needed for OS-level automated interaction checks; native app screenshots
alone do not prove clicks or keyboard behavior.

Design decisions: [DESIGN.md](DESIGN.md).
