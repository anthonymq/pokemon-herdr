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
cycle that project's partner. Agent sorting, hover-button pinning, nested subagents,
peek and keep behavior are inherited from the existing personal agent mod.

Statuses are Herdr's reported **Working**, **Needs you**, **Done** and
**Idle**, not inferred from a tool's name. Any agent reporting to Herdr can
participate. An ordinary terminal still works when its program does not
report status. The layout does not add an agent-specific status adapter.

Space selection, tab selection/reorder/rename, pane split/zoom/close,
Files, Changes and existing keyboard bindings remain available.

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
- `mods/pokedex-spaces`, `pokedex-agents`, `pokedex-tabs`, `pokedex-pane`
- `programs.json` for OMP/OMO launcher registration

The original personal layout and shipped mods are preserved. Personal
clones are not updated by Herdr upgrades; compare with upstream when native
API changes require it. The original source licenses remain in each clone.
The Pokemon sprites are inherited from the existing personal agent mod.

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
