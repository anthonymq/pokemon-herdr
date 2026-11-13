# Pokedex coding workspace

## Brief
An instrument for supervising coding agents, not a Pokemon encyclopedia.
The primary action is selecting the agent that needs attention. Projects,
agent identity and truthful status precede decorative device details.
OMP, OMO, Codex, Claude and other programs use Herdr's shared program and
agent model; no tool-specific filter or launcher is introduced.

## Visual system
The existing personal retro-workspace supplies the device vocabulary.
The new layout gives it quieter, coordinated materials:

| Role | Value |
|---|---|
| Housing | `#9b293a` |
| Raised housing | `#bd3c4c` |
| Deep red seams | `#641b2b` |
| Housing highlight | `#e8797d` |
| LCD | `#d9e8bc` |
| LCD ink | `#244438` |
| Sensor | `#71d5df` |
| Cream bezel | `#f7eed7` |
| Terminal canvas | `#17251f` |
| Quiet UI | Geist, 12-14px |
| Instrument labels | PxPlus IBM VGA 8x16, 16px |
| Rhythm | 4, 8, 12, 16px |

Use the existing installed pixel font only for short instrument labels,
not long task descriptions. Keep the user's terminal font and size.
Sensor rings, inset LCD panels and red seams evoke a handheld Pokedex.
Do not add fake battery/network readings, decorative counters or fake game
actions. The footer contains only the Settings control.

## Layout
Layout: coding workspace - fixed device controls beside bounded working
regions -> native fixed-sidebar shell; scroll owners: spaces list and agent
list independently; the terminal owns its own history. No scrolling ancestor
around the complete workspace. The original personal layout supplies the
native composition contract.

Sidebar: 300px default, 76px compact, draggable to 440px. Brand at top,
projects above agents, a 48px Settings footer at bottom. Main: fixed tab bar,
flexible active tab, fixed telemetry strip. Preserve Files and Changes stack
IDs for existing panel logic and keyboard commands.

## Components and states
- Sensor: command palette action, cyan lens, cream ring, hover feedback.
- Agent cards: project, real program identity, task and working/blocked/done/
  idle status; current selection distinguishable. Preserve agent ordering,
  subagents, menus, pinning and compact rail.
- Space rows: selected LCD fill, readable ink, truncating project/git labels.
- Tabs: selected cream with dark ink, unselected red with cream text. Preserve
  scrolling, reorder, rename, close, new-agent menu and per-space panels.
- Pane header: program, folder and status, split/zoom/close on hover.
- Footer: Settings opens Look settings; a gear icon is used in compact mode.
- No render timers for decorative motion; use native animation.

## Verification
Run `herdr-app check` for all five new mods. Inspect live captures at full
and compact sidebar widths. Compare terminal/space/tab IDs and key contents.
Perform a round trip to retro-workspace and back. Pointer/keyboard QA needs
macOS Accessibility permission; screenshots use Herdr's native capture API.
