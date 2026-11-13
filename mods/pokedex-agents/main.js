// Agents in grouped or priority views; parents take their most urgent sub-agent's place.
// Drawn as a Pokedex: a red housing with a pale LCD card per agent, its project's Pokémon in it.

import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, terminals, panes, focused, spaces, run, theme, shared, setShared, setAgentOrder, openOverlay, closeOverlay, props, layout, settings, exec } from "herdr";
import { game, progress, finishTask, finishSubTask, recordCatches, migrateProject, projectKey, projectLabel, PROJECTS } from "./game.js";

// The Pokedex, named as in pokedex-spaces and pokedex-tabs.
const HOUSING = "#9b293a"; // the body
const EDGE = "#641b2b"; // its deep edge: bezels, pressed faces
const LCD = "#d9e8bc"; // the pale screen
const SCREEN = "#244438"; // what the screen prints
const CYAN = "#71d5df"; // the lens
const CREAM = "#f7eed7"; // labels on the housing
// The same inks at a strength (hex alpha): the screen's for cards, the housing's for labels.
const INK = { soft: SCREEN + "b3", dim: SCREEN + "80", line: SCREEN + "59", wash: SCREEN + "14" };
const LABEL = { soft: CREAM + "b3", line: CREAM + "66" };
const PX = "PxPlus IBM VGA 8x16"; // the pixel heading font, loaded from pokedex-spaces/fonts
// At zoom 1: the scene a Pokémon stands in, its sprite (96 px art at half size stays crisp), the card around it.
const SCENE = 48;
const SPRITE = 48;
const CARD = 62; // the shortest card; one with a task line grows to fit, so its border is never covered
const STATUS_WORD = { working: "WORKING", blocked: "NEEDS YOU", done: "DONE", idle: "IDLE" };
const TILE = 84; // the narrowest a square tile gets before the grid drops a column
const VIEWS = [
  { id: "tiles", label: "Tiles", icon: "layers" },
  { id: "cards", label: "Cards with sub-agents", icon: "layers" },
];
const viewOf = () => (shared("agents.view") === "cards" ? "cards" : "tiles");

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail, or back to the width it had (the layout's 300 px until the person drags it).
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 300) : 76 });
}

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

function leadPanes(all) {
  const leads = new Map();
  for (const p of all) {
    if (!p.terminal) continue;
    const current = leads.get(p.tab);
    // First agent, else first focused terminal, else first terminal in the tab.
    if (!current || (!current.program?.agent && (p.program?.agent || (!current.focused && p.focused)))) leads.set(p.tab, p);
  }
  return leads;
}

function title(tab, l) {
  const prog = l?.program?.name;
  const live = clean(l?.title);
  // clean() would strip a path's leading ~ or /: test the title with only its status glyph gone.
  const path = /^[~/]|^[A-Za-z]:\\/.test((l?.title ?? "").replace(/^[^\p{L}\p{N}~/]+/u, ""));
  const telling = live && live !== prog && !path && !live.includes("@") && live.toLowerCase() !== l?.program?.key;
  return (tab.name === prog || !tab.named) && telling ? live : tab.name;
}
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
// A sub-agent without a pane isn't in agents(): its raw word, error counting as
// blocked. It's never done: it reports to its parent, and the parent's done is the news.
const kidStatus = (k, listed) => {
  const s = listed.get(k.address) ?? k.status;
  return s === "error" ? "blocked" : s === "done" ? "idle" : s;
};
const SORTS = [
  { id: "priority", label: "Priority", icon: "clock" },
  { id: "grouped", label: "Grouped by space", icon: "layers" },
];
const sortOf = () => SORTS.find((s) => s.id === shared("agents.sort")) ?? SORTS[0];
const SECTION = { 4: "Needs you", 3: "Done", 2: "Working", 1: "Idle" };
const SECTION_STATUS = { 4: "blocked", 3: "done", 2: "working" };

function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

// Spaces are the project identity in the sidebar. All their agents share a pet.
const LEGACY_POKEMON = [1, 4, 7, 10, 16, 25, 35, 39, 52, 54, 60, 63, 74, 77, 79, 92, 104, 113, 133, 147, 152, 155, 158, 175, 179, 194, 200, 216, 220, 231, 252, 255, 258, 280, 300, 311, 312, 393, 390, 387];
const POKEMON = Array.from({ length: 151 }, (_, i) => i + 1);
function projectPet(name) {
  const selected = shared("pokedex.partners")?.[projectKey(name)];
  if (Number.isInteger(selected) && selected >= 1 && selected <= 151) return selected - 1;
  let hash = 2166136261;
  for (const c of name || "?") hash = Math.imul(hash ^ c.codePointAt(0), 16777619);
  const legacy = LEGACY_POKEMON[((hash >>> 0) + (shared("retro-pokemon.steps")?.[name] ?? 0)) % LEGACY_POKEMON.length];
  return (legacy <= 151 ? legacy : (hash >>> 0) % 151 + 1) - 1;
}
function projectIcon(name, size) {
  return image(`mods/pokedex-agents/pokemon/${POKEMON[projectPet(name)]}.png`).w(size).h(size).flex_none();
}
const dexNumber = (name) => String(POKEMON[projectPet(name)]).padStart(3, "0");
// The program as the app's table draws it: a one-color glyph in `color`, or a picture.
function programIcon(p, size, color) {
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}
// What runs, by the table's name; one the table doesn't know goes by what the agent reported (OSC 7501 app).
function programName(a) {
  const p = a.program;
  const unknown = !p?.name || p.key === "program" || p.key === "agent";
  return unknown && a.app ? a.app : p?.name ?? a.app ?? "";
}
// The scene a project's Pokémon stands in: it bobs while the agent works, pulses when the agent
// needs you, sleeps (z) when idle and sparkles when done. Click: another Pokémon for the project.
function petScene(a) {
  const pet = div().relative().child(projectIcon(a.space_name, SPRITE));
  if (a.status === "working") pet.loop("top", { from: 0, to: -3, period: 1000 });
  if (a.status === "blocked") pet.loop("opacity", { from: 0.55, to: 1, period: 800 });
  const mark = { idle: "z", blocked: "!", done: "✦" }[a.status];
  return div().id(`pet-${a.address}`).relative().size(SCENE).flex_none()
    .flex().items_center().justify_center()
    .bg(INK.wash).border(1.5).border_color(INK.line).rounded(3).cursor_pointer()
    .tooltip(`No. ${dexNumber(a.space_name)} \u00b7 Click to choose a partner from your catches; right-click to open the collection`)
    .on_click((_e, cx) => {
      cx.stop_propagation();
      openOverlay({ mod: "pokedex-collection", kind: "dialog", width: 700, height: 560, props: { project: projectKey(a.space_name), label: a.space_name, partner: POKEMON[projectPet(a.space_name)] } });
    })
    .on_mouse_down("right", (_e, cx) => {
      cx.stop_propagation();
      openOverlay({ mod: "pokedex-collection", kind: "dialog", width: 820, height: 680, props: { pokemon: POKEMON[projectPet(a.space_name)] } });
    })
    .child(pet)
    .when(Boolean(mark), el => el.child(div().absolute().top(1).right(4).text_size(12).font_bold().text_color(a.status === "blocked" ? HOUSING : SCREEN).child(mark)));
}

export default class Agents extends View {
  init(_props, cx) {
    if (props()?.sortMenu) return;
    this.folded = new Set();
    // Each agent's last state and when it changed (ms), kept across restarts.
    this.changed = JSON.parse(localStorage.getItem("changed") ?? "{}");
    this.pendingPins = JSON.parse(localStorage.getItem("pins") ?? "[]");
    if (!this.pendingPins.length) localStorage.removeItem("pins");
    this.migratingPins = new Set();
    cx.timer.every(30000, (cx) => cx.notify());
  }

  // Each space's project key is the git repo root of its first terminal's live folder (machine-qualified
  // when remote), so progress survives a renamed or recreated space. Not `space.folder`: that is where the
  // space was created, and many spaces share it. Resolved once per space name; existing progress moves to
  // the key. A space whose terminals report no folder yet is tried again on a later render.
  resolveProjects(cx) {
    this.resolving ??= new Set();
    const known = shared(PROJECTS) ?? {};
    const allPanes = panes();
    for (const sp of spaces()) {
      if (!sp.name || sp.name in known || this.resolving.has(sp.name)) continue;
      const tabs = new Set(sp.tabs.map((tab) => tab.id));
      const cwd = allPanes.find((p) => p.terminal && p.cwd && tabs.has(p.tab))?.cwd;
      if (!cwd) continue;
      this.resolving.add(sp.name);
      cx.spawn(async () => {
        let key = sp.name;
        try {
          // Outside a repo git exits non-zero and the space name stays the key.
          const r = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on: sp.machine ?? undefined, timeout: 5000 });
          const top = r.stdout.trim();
          if (r.code === 0 && top) key = sp.machine ? `${sp.machine}:${top}` : top;
        } catch (error) {
          // git couldn't run (machine unreachable, timeout): leave the space unresolved and retry on a later render.
          console.log(`pokedex-agents: project key for ${sp.name} not resolved: ${error}`);
          this.resolving.delete(sp.name);
          return;
        }
        migrateProject(sp.name, key);
        setShared(PROJECTS, { ...(shared(PROJECTS) ?? {}), [sp.name]: key });
        this.resolving.delete(sp.name);
      });
    }
  }

  // A sub-agent without its own pane that goes from working to idle or done earns its project 10 XP.
  // Kept sub-agents are in agents() and earn through track() like any agent.
  trackSubAgents(list, all) {
    this.subPrev ??= {};
    const listed = new Set(list.map((a) => a.address));
    for (const a of list) {
      for (const { t: k } of this.tree(all, a.address)) {
        if (listed.has(k.address)) continue;
        const prev = this.subPrev[k.address];
        this.subPrev[k.address] = k.status;
        if (prev === "working" && (k.status === "idle" || k.status === "done")) {
          finishSubTask(projectKey(a.space_name), POKEMON[projectPet(a.space_name)]);
        }
      }
    }
  }

  // Stamps agents whose state changed. Done and idle count as one: looking at a
  // finished agent turns done into idle, and looking isn't the agent doing anything.
  track(list, now) {
    let dirty = false;
    for (const a of list) {
      const s = a.status === "done" ? "idle" : a.status;
      const prev = this.changed[a.address];
      if (prev?.s === s) continue;
      // A working agent going quiet finished a task: its project's partner earns XP.
      if (prev?.s === "working" && s === "idle") finishTask(projectKey(a.space_name), POKEMON[projectPet(a.space_name)], now - prev.at);
      this.changed[a.address] = { s, at: now };
      dirty = true;
    }
    if (!dirty) return;
    // Gone and old: the list alone is empty right after a start.
    const listed = new Set(list.map((a) => a.address));
    for (const [k, c] of Object.entries(this.changed)) if (!listed.has(k) && now - c.at > 30 * 86400000) delete this.changed[k];
    localStorage.setItem("changed", JSON.stringify(this.changed));
  }

  // An agent that is open catches its project's current Pokemon: each address is handled once
  // per start, so a Pokemon is caught when its agent opens (or is already open at start).
  catchOpened(list) {
    this.seen ??= new Set();
    const fresh = new Set();
    for (const a of list) {
      if (this.seen.has(a.address)) continue;
      this.seen.add(a.address);
      fresh.add(POKEMON[projectPet(a.space_name)]);
    }
    if (fresh.size) recordCatches([...fresh]);
  }

  // Keep offline pins until their terminal returns, and keep each pending until
  // core echoes the label so a failed write doesn't erase the old pin.
  migratePins(all) {
    const listed = new Map(all.filter((t) => t.state === "live").map((t) => [t.address, t]));
    const pending = this.pendingPins.filter((address) => {
      const terminal = listed.get(address);
      if (!terminal) return true;
      if (terminal.labels?.["herdr.pinned"]) return false;
      if (!this.migratingPins.has(address)) {
        this.migratingPins.add(address);
        run("terminal.pin", { terminal: address, pinned: true });
      }
      return true;
    });
    if (pending.length === this.pendingPins.length) return;
    this.pendingPins = pending;
    if (pending.length) localStorage.setItem("pins", JSON.stringify(pending));
    else localStorage.removeItem("pins");
  }

  since(a) {
    return this.changed[a.address]?.at ?? 0;
  }

  rank(a) {
    return RANK[a.status] ?? 0;
  }

  sortMenu(t) {
    const on = sortOf().id;
    return v_flex()
      .w_full()
      .p(5)
      .bg(t.popover)
      .text_size(12.8)
      .child(div().px(8).pt(4).pb(6).text_size(11).text_color(t.dim).child("Sort agents"))
      .children(SORTS.map((s) => h_flex()
        .id(`sort-${s.id}`)
        .h(31)
        .px(8)
        .gap(9)
        .rounded(7)
        .items_center()
        .text_color(t.foreground)
        .hover((el) => el.bg(t.hover))
        .on_click(() => {
          setShared("agents.sort", s.id);
          closeOverlay(props().overlay);
        })
        .child(svg(`mods/workspace-chrome/${s.icon}.svg`).size(14).flex_none().text_color(t.muted))
        .child(div().flex_1().child(s.label))
        .when(s.id === on, (el) => el.child(svg("mods/workspace-chrome/check.svg").size(14).flex_none().text_color(t.foreground)))))
      .child(div().px(8).pt(8).pb(6).text_size(11).text_color(t.dim).child("View"))
      .children(VIEWS.map((v) => h_flex()
        .id(`view-${v.id}`)
        .h(31)
        .px(8)
        .gap(9)
        .rounded(7)
        .items_center()
        .text_color(t.foreground)
        .hover((el) => el.bg(t.hover))
        .on_click(() => {
          setShared("agents.view", v.id);
          closeOverlay(props().overlay);
        })
        .child(div().flex_1().child(v.label))
        .when(v.id === viewOf(), (el) => el.child(svg("mods/workspace-chrome/check.svg").size(14).flex_none().text_color(t.foreground)))));
  }

  peek(addr) {
    run("terminal.peek", { terminal: addr });
  }

  collectionButton(compact) {
    const count = (shared("pokedex.caught") ?? []).length;
    return h_flex().id("pokedex-collection-open").flex_none()
      .h(compact ? 24 : 30).px(compact ? 4 : 9).gap(7).items_center()
      .rounded(4).bg(compact ? HOUSING : LCD)
      .text_color(compact ? CREAM : SCREEN).text_size(12).cursor_pointer()
      .tooltip(`Caught ${count} / 151 \u00b7 Open Kanto Pokedex`)
      .hover(el => el.bg(compact ? EDGE : "#c8dca6"))
      .on_click(() => openOverlay({ mod: "pokedex-collection", kind: "dialog", width: 820, height: 680 }))
      .when(compact, el => el.child(div().font_family(PX).text_size(14).child("151")))
      .when(!compact, el => el
        .child(div().font_family(PX).text_size(16).child("KANTO DEX"))
        .child(div().flex_1())
        .child(div().font_semibold().child(`Caught ${count} / 151`))
        .child(svg("mods/workspace-chrome/chevron-right.svg").size(11)));
  }

  // The partner's XP toward its next level: a thin strip under the status line.
  levelBar(project) {
    const { into } = progress(game().xp[projectKey(project)]);
    return div().mx(3).h(3).flex_none().rounded(2).bg(INK.line)
      .child(div().h_full().rounded(2).bg(SCREEN).w_full().when(into < 1, el => el.w(`${Math.round(into * 100)}%`)));
  }

  // Live sub-agents of `addr`, depth first, each with the tree lines in front of it.
  tree(all, addr, lead = []) {
    const kids = all.filter((k) => k.parent === addr && k.state === "live");
    return kids.flatMap((k, i) => {
      const last = i === kids.length - 1;
      return [
        { t: k, lines: [...lead, last ? "└" : "├"] },
        ...this.tree(all, k.address, [...lead, last ? "" : "│"]),
      ];
    });
  }

  subRow(s, shown, compact, project) {
    const k = s.t;
    const st = kidStatus(k, this.listed);
    const on = k.address === shown;
    // The tree lines run on the housing, from the parent's card down to a narrow LCD strip.
    return h_flex()
      .pl(10)
      .h(26)
      .flex_none()
      .gap(0)
      .items_center()
      .children(s.lines.map(l => div().self_start().mt(-5).w(9).h(18).mr(4).flex_none()
        .when(Boolean(l), el => el.border_l(1.5).border_color(LABEL.line))
        .when(l === "└" || l === "├", el => el.border_b(1.5).rounded_bl(6))))
      .child(h_flex()
        .id(`sub-${k.address}`)
        .flex_1()
        .min_w(0)
        .h(24)
        .pl(6)
        .pr(7)
        .gap(6)
        .items_center()
        .bg(LCD)
        .border(1.5)
        .border_color(on ? SCREEN : INK.line)
        .rounded(3)
        .text_size(11.5)
        .cursor_pointer()
        .hover((el) => el.border_color(on ? SCREEN : INK.soft))
        .on_click(() => (this.listed.has(k.address) ? run("pane.focus", { terminal: k.address }) : this.peek(k.address)))
        .child(projectIcon(project, 14))
        .child(div().flex_1().min_w(0).truncate().text_color(on ? SCREEN : INK.soft).when(on, el => el.font_semibold()).child(k.name || k.template || k.program?.name || k.address))
        .child(this.status({ status: st }, compact)));
  }

  // The LCD's marks: a turning ring while working, a red chip when blocked (NEEDS YOU, or just
  // a ! where the words are already there), a filled dot when done, an empty ring when idle.
  status(a, compact = false) {
    if (a.status === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).mx(1).flex_none().text_color(SCREEN).spin(900);
    if (a.status === "blocked" && compact) return div().size(14).flex_none().rounded(3).bg(HOUSING).text_size(10.5).font_bold().text_color(CREAM).flex().items_center().justify_center().child("!");
    if (a.status === "blocked") return div().flex_none().px(5).h(16).rounded(3).bg(HOUSING).text_size(10).font_bold().text_color(CREAM).flex().items_center().child("NEEDS YOU");
    if (a.status === "idle") return div().size(7).mx(3).flex_none().rounded(4).border(1.5).border_color(INK.dim);
    return div().size(7).mx(3).flex_none().rounded(4).bg(a.status === "done" ? SCREEN : SCREEN + "00");
  }

  // The same states in the housing's inks (the rail, a folded group): the ring turns,
  // ! needs you, * done, · idle; on a selected LCD cell, the screen's ink.
  housingMark(status, on = false) {
    if (status === "working") return svg("mods/workspace-chrome/spinner.svg").size(10).flex_none().text_color(on ? SCREEN : CYAN).spin(900);
    const glyph = { blocked: "!", done: "*", idle: "\u00b7" }[status] ?? "";
    const ink = on ? SCREEN : status === "blocked" ? CYAN : status === "done" ? CREAM : LABEL.soft;
    return div().flex_none().font_family(PX).text_size(16).line_height("16px").text_color(ink).child(glyph);
  }

  render(cx) {
    const t = theme();
    if (props()?.sortMenu) return this.sortMenu(t);
    const collapsed = narrow();
    const sort = sortOf();
    let list = agents();
    this.listed = new Map(list.map((a) => [a.address, a.status]));
    const all = terminals();
    this.migratePins(all);
    const shown = focused()?.agent;
    const now = Date.now();
    this.track(list, now);
    this.resolveProjects(cx);
    this.trackSubAgents(list, terminals());
    this.catchOpened(list);
    // A kept sub-agent (one with a pane) is in agents() too: where a tree shows
    // it, it gets no row of its own, unless it's pinned.
    const nested = new Set(collapsed ? [] : list.flatMap((a) => this.tree(all, a.address).map((s) => s.t.address)));
    list = list.filter((a) => a.pinned || !nested.has(a.address));
    const tabCounts = new Map();
    for (const a of list) tabCounts.set(a.tab, (tabCounts.get(a.tab) ?? 0) + 1);
    const byPriority = sort.id === "priority";
    const urgency = new Map(list.map((a) => [a.address, Math.max(this.rank(a), ...this.tree(all, a.address).map((s) => RANK[kidStatus(s.t, this.listed)] ?? 0))]));
    const rankOf = (a) => urgency.get(a.address);
    if (byPriority) list = [...list].sort((x, y) => rankOf(y) - rankOf(x) || this.since(y) - this.since(x) || y.seq - x.seq);
    const pinned = list.filter((a) => a.pinned);
    const rest = list.filter((a) => !a.pinned);
    list = [...pinned, ...rest];
    setAgentOrder(list.map((a) => a.address));

    const withKids = (a, i) => {
      const subs = collapsed ? [] : this.tree(all, a.address);
      const r = row(a, i, subs);
      if (this.folded.has(a.address)) return [r];
      return [r, ...subs.map((s) => this.subRow(s, shown, byPriority, a.space_name))];
    };

    // The fold chevron; folded, the count too, colored by the most urgent one.
    const fold = (a, subs) => {
      const sts = subs.map((s) => kidStatus(s.t, this.listed));
      const top = sts.reduce((m, s) => ((RANK[s] ?? 0) > (RANK[m] ?? 0) ? s : m), null);
      const open = !this.folded.has(a.address);
      return div()
        .id(`fold-${a.address}`)
        .h(16)
        .px(3)
        .gap(3)
        .flex()
        .items_center()
        .rounded(3)
        .text_size(10.5)
        .text_color(open ? INK.dim : top === "blocked" ? HOUSING : SCREEN)
        .cursor_pointer()
        .hover((s) => s.bg(INK.wash).text_color(SCREEN))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          open ? this.folded.add(a.address) : this.folded.delete(a.address);
          cx.notify();
        })
        .child(svg(`mods/workspace-chrome/chevron-${open ? "down" : "right"}.svg`).size(11).flex_none())
        .when(!open, (el) => el.child(String(subs.length)));
    };

    // A row reads "space \u00b7 detail": the detail is a tab someone named or the
    // agent's own title, never an automatic tab number unless two rows would
    // otherwise read the same.
    // Read the pane snapshot once: every host read copies the whole list into JS.
    const leads = leadPanes(panes());
    const tabs = new Map(spaces().flatMap(s => s.tabs).map(tab => [tab.id, tab]));
    const labels = new Map(list.map(a => {
      const tab = tabs.get(a.tab);
      const many = tabCounts.get(a.tab) > 1;
      return [a.address, tab ? title(many ? { ...tab, named: false } : tab, many ? a : leads.get(a.tab)) : (a.title || a.program?.name || "")];
    }));
    const label = (a) => labels.get(a.address);
    const detail = new Map(list.map(a => [a.address, /^\d+$/.test(label(a)) ? null : label(a)]));
    const seen = {};
    for (const a of list) { const k = `${a.space_name}\u0000${detail.get(a.address) ?? ""}`; seen[k] = (seen[k] ?? 0) + 1; }
    for (const a of list) {
      if (detail.get(a.address) == null && seen[`${a.space_name}\u0000`] > 1) detail.set(a.address, label(a));
    }

    const row = (a, i, subs = []) => {
      const more = detail.get(a.address);
      // An agent on another machine (`vps/t7`) says which.
      const machine = a.address.includes("/") ? a.address.split("/")[0] : null;
      const on = a.focused;
      if (collapsed) {
        // A rail cell: its number and state in the housing's inks, an LCD cell when selected.
        return h_flex().flex_none().justify_center().child(h_flex()
          .id(`ag-${a.address}`)
          .w(32)
          .h(26)
          .rounded(6)
          .gap(3)
          .items_center()
          .justify_center()
          .cursor_pointer()
          .when(on, (el) => el.bg(LCD))
          .when(!on, (el) => el.hover((s) => s.bg(EDGE)))
          .on_click(() => run("pane.focus", { pane: a.pane }))
          .child(div().font_family(PX).text_size(16).line_height("16px").text_color(on ? SCREEN : CREAM).child(String(i + 1)))
          .child(this.housingMark(a.status, on)));
      }
      const when = this.since(a);
      const isPinned = a.pinned;
      const pin = div()
        .id(`pin-${a.address}`)
        .flex_none()
        .p(2)
        .rounded(3)
        .text_color(on ? LCD + "b3" : INK.dim)
        .cursor_pointer()
        .hover((s) => s.bg(on ? LCD + "26" : INK.wash).text_color(on ? LCD : SCREEN))
        .tooltip(isPinned ? "Unpin" : "Pin to the top")
        .on_click((_e, cx) => {
          cx.stop_propagation();
          run("terminal.pin", { terminal: a.address, pinned: !isPinned });
          // The row moves away from under the pointer, and no hover-out comes.
          this.hovered = null;
          cx.notify();
        })
        .child(svg(`mods/workspace-chrome/${isPinned ? "pin-off" : "pin"}.svg`).size(13));
      // Under a space header the space goes without saying; an automatic tab number says nothing.
      // Without a space header above (priority, pinned) the row names its space, then its task.
      const full = byPriority || isPinned;
      const name = full ? a.space_name || label(a) : more ?? (/^\d+$/.test(label(a)) ? a.program?.name || label(a) : label(a));
      const task = full ? more : null;
      const program = programName(a);
      return h_flex()
        .id(`ag-${a.address}`)
        .p(5)
        .min_h(CARD)
        .flex_none()
        .gap(8)
        .items_center()
        .bg(LCD)
        .border(1.5)
        .border_color(on ? SCREEN : INK.line)
        .rounded(4)
        .cursor_pointer()
        .hover((s) => s.border_color(on ? SCREEN : INK.soft))
        .on_hover((over, cx) => {
          if (over) this.hovered = a.address;
          else if (this.hovered === a.address) this.hovered = null;
          cx.notify();
        })
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .child(petScene(a))
        .child(v_flex().flex_1().min_w(0).gap(1)
          // The name line, inverted on the selected card the way an LCD menu marks its cursor; the level sits at its end.
          .child(h_flex().h(16).px(3).gap(4).items_center().rounded(2).when(on, el => el.bg(SCREEN))
            .child(div().flex_1().min_w(0).truncate().font_family(PX).text_size(16).line_height("16px").text_color(on ? LCD : SCREEN).child(name))
            .when(this.hovered === a.address, el => el.child(pin))
            .child(div().flex_none().font_family(PX).text_size(12).line_height("12px").text_color(on ? LCD : INK.soft)
              .child(`Lv${progress(game().xp[projectKey(a.space_name)]).level}`)))
          .when(Boolean(task), el => el.child(div().px(3).truncate().text_size(11.5).text_color(INK.soft).child(task)))
          .child(h_flex().px(3).gap(5).items_center().text_size(10.5)
            .child(this.status(a, true))
            .child(div().flex_none().font_bold().text_color(a.status === "blocked" ? HOUSING : a.status === "idle" ? INK.soft : SCREEN).child(STATUS_WORD[a.status] ?? ""))
            .when(Boolean(program), el => el.child(h_flex().min_w(0).gap(3).items_center().text_color(INK.soft)
              .when(Boolean(a.program?.icon), el => el.child(programIcon(a.program, 11, INK.soft)))
              .child(div().truncate().child(program))))
            .when(Boolean(machine), el => el.child(div().flex_none().text_color(INK.dim).child(machine)))
            .child(div().flex_1())
            .when(Boolean(when), el => el.child(div().flex_none().text_color(INK.dim).child(duration(now - when))))
            .when(subs.length > 0, el => el.child(fold(a, subs))))
          .child(this.levelBar(a.space_name)));
    };

    // A square tile: status, Pokemon, project name and level. Details live in the tooltip;
    // click focuses the agent, right-click chooses the project's partner.
    const tile = (a) => {
      const on = a.focused;
      const subs = this.tree(all, a.address);
      const when = this.since(a);
      const program = programName(a);
      const { level, into } = progress(game().xp[projectKey(a.space_name)]);
      const tip = [a.space_name || label(a), detail.get(a.address), STATUS_WORD[a.status], program, when ? duration(now - when) : null,
        subs.length ? `${subs.length} sub-agent${subs.length > 1 ? "s" : ""}` : null, `Lv${level}`].filter(Boolean).join(" \u00b7 ");
      const pin = div().id(`pin-${a.address}`).flex_none().rounded(2).text_color(INK.dim).cursor_pointer()
        .hover((s) => s.text_color(SCREEN))
        .tooltip(a.pinned ? "Unpin" : "Pin to the top")
        .on_click((_e, cx) => {
          cx.stop_propagation();
          run("terminal.pin", { terminal: a.address, pinned: !a.pinned });
          this.hovered = null;
          cx.notify();
        })
        .child(svg(`mods/workspace-chrome/${a.pinned ? "pin-off" : "pin"}.svg`).size(11));
      return v_flex()
        .id(`ag-${a.address}`)
        .w(tileWidth)
        .flex_none()
        .relative()
        .px(4)
        .pt(3)
        .pb(4)
        .gap(1)
        .items_center()
        .bg(LCD)
        .border(1.5)
        .border_color(on ? SCREEN : a.status === "blocked" ? HOUSING : INK.line)
        .rounded(4)
        .cursor_pointer()
        .tooltip(tip)
        .hover((s) => s.border_color(on ? SCREEN : INK.soft))
        .on_hover((over, cx) => {
          if (over) this.hovered = a.address;
          else if (this.hovered === a.address) this.hovered = null;
          cx.notify();
        })
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          openOverlay({ mod: "pokedex-collection", kind: "dialog", width: 700, height: 560, props: { project: projectKey(a.space_name), label: a.space_name, partner: POKEMON[projectPet(a.space_name)] } });
        })
        // The sprite takes the top of the tile, its row and the status line's: drawn at 80 px in a 63 px
        // window that crops the art's empty margin. The tile keeps its size.
        .child(div().w_full().h(63).flex_none().overflow_hidden().flex().items_center().justify_center()
          .child(div().relative().flex_none().child(projectIcon(a.space_name, 80))
            .when(a.status === "working", (el) => el.loop("top", { from: 0, to: -3, period: 1000 }))
            .when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.55, to: 1, period: 800 }))))
        .child(h_flex().w_full().h(14).px(2).justify_center().items_center().rounded(2).when(on, (el) => el.bg(SCREEN))
          .child(div().min_w(0).truncate().font_family(PX).text_size(12).line_height("12px").text_color(on ? LCD : SCREEN).child(a.space_name || label(a))))
        .child(h_flex().w_full().px(2).gap(3).items_center()
          .child(div().flex_none().font_family(PX).text_size(10).line_height("10px").text_color(INK.soft).child(`Lv${level}`))
          .child(div().flex_1().h(3).rounded(2).bg(INK.line)
            .child(div().h_full().rounded(2).bg(SCREEN).w_full().when(into < 1, (el) => el.w(`${Math.round(into * 100)}%`)))))
        // Status, pin and sub-agent count float over the sprite's top corners instead of taking a row.
        .child(h_flex().absolute().top(3).left(4).right(4).h(14).items_center().justify_between()
          .child(h_flex().gap(3).items_center()
            .when(this.hovered === a.address || a.pinned, (el) => el.child(pin))
            .when(subs.length > 0, (el) => el.child(div().text_size(9.5).font_bold().text_color(INK.soft).child(`+${subs.length}`))))
          .child(this.status(a, true)));
    };
    // Every tile gets the same fixed width: flex shares let each tile's text nudge its column.
    // The list keeps 8 px each side and 6 px for its scrollbar. The measured width includes the
    // person's zoom, while sizes are written at zoom 1.
    const inner = (this.width ?? 300) / (Number(settings().zoom) || 1) - 22;
    const cols = Math.max(1, Math.floor((inner + 5) / (TILE + 5)));
    const tileWidth = Math.floor((inner - 5 * (cols - 1)) / cols);
    const grid = (members) => {
      const out = [];
      for (let i = 0; i < members.length; i += cols) {
        out.push(h_flex().flex_none().gap(5).children(members.slice(i, i + cols).map(tile)));
      }
      return out;
    };

    // Groups in list order: spaces (grouped) or priority sections. Agents of a
    // space are next to each other in agents(), so neighbours make a group.
    const groups = pinned.length ? [{ id: "pinned", label: "Pinned", status: null, members: pinned }] : [];
    for (const a of rest) {
      const r = rankOf(a) || RANK.idle;
      const id = byPriority ? `sec-${r}` : `sp-${a.space}`;
      if (groups.at(-1)?.id === id) groups.at(-1).members.push(a);
      else groups.push({ id, label: byPriority ? SECTION[r] : a.space_name || "", status: byPriority ? SECTION_STATUS[r] : null, members: [a] });
    }

    // A group's label on the housing: NAME, a count, a rule to the edge; it folds the group.
    // Folded, the most urgent state and a chevron at the end.
    const header = (g) => {
      const open = !this.folded.has(g.id);
      const top = g.members.reduce((m, a) => ((RANK[a.status] ?? 0) > (RANK[m] ?? 0) ? a.status : m), null);
      return h_flex()
        .id(g.id)
        .px(4)
        .pt(6)
        .h(30)
        .flex_none()
        .gap(7)
        .items_center()
        .font_family(PX)
        .text_size(16)
        .line_height("16px")
        .text_color(LABEL.soft)
        .cursor_pointer()
        .hover((s) => s.text_color(CREAM))
        .on_click((_e, cx) => {
          open ? this.folded.add(g.id) : this.folded.delete(g.id);
          cx.notify();
        })
        .child(div().flex_none().max_w(170).truncate().child(g.label.toUpperCase()))
        .when(byPriority || !open, (el) => el.child(div().flex_none().child(String(g.members.length))))
        .child(div().flex_1().min_w(8).h(1).bg(LABEL.line))
        .when(!open, (el) => el
          .when(!byPriority && top && top !== "idle", (el) => el.child(this.housingMark(top)))
          .child(svg("mods/workspace-chrome/chevron-right.svg").size(11).flex_none()));
    };
    const rows = collapsed
      ? list.flatMap(withKids)
      : groups.flatMap((g) => [header(g), ...(this.folded.has(g.id) ? [] : viewOf() === "tiles" ? grid(g.members) : g.members.flatMap(withKids))]);

    // The housing: a header strip like the spaces list's (the lens, the label, the sort button;
    // in the rail only the button), the cards, and in the rail the way back out.
    return v_flex()
      .id("ag-root")
      .on_size_change((size, cx) => {
        this.width = size.width;
        cx.notify();
      })
      .size_full()
      .min_h(0)
      .bg(HOUSING)
      .text_size(13)
      .child(
        h_flex()
          .h(36)
          .pl(12)
          .pr(10)
          .flex_none()
          .items_center()
          .justify_between()
          .bg(HOUSING)
          .border_b(2)
          .border_color(EDGE)
          .text_color(CREAM)
          .gap(6)
          .when(collapsed, (el) => el.pl(0).pr(0).justify_center())
          .when(!collapsed, (el) => el.child(h_flex().gap(8).items_center()
            .child(div().size(14).rounded(7).border_2().border_color(CREAM).bg(CYAN).flex_none())
            .child(div().font_family(PX).text_size(16).line_height("16px").child("POKÉMON / AGENTS"))))
          .child(
            div()
              .id("ag-sort")
              .size(24)
              .flex_none()
              .flex()
              .items_center()
              .justify_center()
              .rounded(4)
              .cursor_pointer()
              .hover((s) => s.text_color(CYAN))
              .on_click(() => openOverlay({ mod: "pokedex-agents", kind: "popup", width: 200, height: 240, props: { sortMenu: true } }))
              .tooltip(`Sort agents: ${sort.label}`)
              .child(svg(`mods/workspace-chrome/${sort.icon}.svg`).size(14)),
          )
          .when(collapsed, el => el.child(this.collectionButton(true))),
      )
      .when(!collapsed, el => el.child(div().mx(8).mt(7).child(this.collectionButton(false))))
      .when(list.length === 0 && !collapsed, (el) =>
        el.child(v_flex().mx(8).mt(8).p(10).gap(4).flex_none().bg(LCD).border(1.5).border_color(INK.line).rounded(4)
          .child(div().font_family(PX).text_size(16).line_height("16px").text_color(SCREEN).child("NO DATA"))
          .child(div().text_size(11.5).text_color(INK.soft).child("Agents show up here when they report their status. Older versions and agents inside tmux may not."))),
      )
      .child(v_flex().id("ag-list").flex_1().min_h(0).px(collapsed ? 0 : 8).pt(2).pb(14).gap(collapsed ? 2 : 5).overflow_y_scrollbar().mode("always").children(rows))
      .when(collapsed, (el) =>
        el.child(
          h_flex()
            .h(28)
            .flex_none()
            .items_center()
            .justify_center()
            .child(
              div()
                .id("collapse")
                .font_family(PX)
                .text_size(16)
                .line_height("16px")
                .text_color(LABEL.soft)
                .cursor_pointer()
                .hover((s) => s.text_color(CYAN))
                .on_click(toggleSidebar)
                .child("»"),
            ),
        ),
      );
  }
}
