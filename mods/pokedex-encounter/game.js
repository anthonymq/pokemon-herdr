// Pokedex gamification rules, shared by pokedex-agents, pokedex-console, pokedex-collection,
// pokedex-trainer and pokedex-encounter. Mods can't import across folders, so each keeps a copy;
// edit mods/pokedex-agents/game.js and run scripts/sync-game.sh (the repo checks the copies match).
// State lives in shared("pokedex.game"):
// { xp: {project: n}, tasks, subtasks, evolutions, streak: {last, days, best}, badges: [ids], shiny: [ids],
//   encounter: {id, at, balls} | null, encounters: {seen, caught, fled}, recent: [{id, at}] }
// A project key is the space's git repo root (machine-qualified for remote spaces), else its name.
import { shared, setShared, notify } from "herdr";
import { POKEMON as DEX } from "./pokemon.js";

export const nameOf = (id) => DEX[id - 1]?.name ?? `#${id}`;
export const projectLabel = (key) => String(key).split(/[/\\]/).filter(Boolean).pop() ?? String(key);

export const GAME = "pokedex.game";
export const CAUGHT = "pokedex.caught";
export const PARTNERS = "pokedex.partners";
export const PROJECTS = "pokedex.projects"; // space name -> project key, filled by pokedex-agents
export const projectKey = (name) => shared(PROJECTS)?.[name] ?? name;
export const SUBTASK_XP = 10;
export const ENCOUNTER_CHANCE = 0.15;
export const ENCOUNTER_MS = 60000;
export const BALLS = 3;
const RECENT = 10;
const LEGENDARY = [144, 145, 146, 150, 151];

// A finished turn earns 10 XP plus 5 per full minute it ran, up to 100.
export const taskXp = (ms) => 10 + 5 * Math.min(18, Math.floor(Math.max(0, ms) / 60000));

// Gen 1 evolutions: from -> [to, level]. Stone and trade evolutions happen at 30.
const EVOLVE = {
  1: [2, 16], 2: [3, 32], 4: [5, 16], 5: [6, 36], 7: [8, 16], 8: [9, 36], 10: [11, 7], 11: [12, 10],
  13: [14, 7], 14: [15, 10], 16: [17, 18], 17: [18, 36], 19: [20, 20], 21: [22, 20], 23: [24, 22],
  25: [26, 30], 27: [28, 22], 29: [30, 16], 30: [31, 30], 32: [33, 16], 33: [34, 30], 35: [36, 30],
  37: [38, 30], 39: [40, 30], 41: [42, 22], 43: [44, 21], 44: [45, 30], 46: [47, 24], 48: [49, 31],
  50: [51, 26], 52: [53, 28], 54: [55, 33], 56: [57, 28], 58: [59, 30], 60: [61, 25], 61: [62, 30],
  63: [64, 16], 64: [65, 30], 66: [67, 28], 67: [68, 30], 69: [70, 21], 70: [71, 30], 72: [73, 30],
  74: [75, 25], 75: [76, 30], 77: [78, 40], 79: [80, 37], 81: [82, 30], 84: [85, 31], 86: [87, 34],
  88: [89, 38], 90: [91, 30], 92: [93, 25], 93: [94, 30], 96: [97, 26], 98: [99, 28], 100: [101, 30],
  102: [103, 30], 104: [105, 28], 109: [110, 35], 111: [112, 42], 116: [117, 32], 118: [119, 33],
  120: [121, 30], 129: [130, 20], 133: [134, 30], 138: [139, 40], 140: [141, 40], 147: [148, 30], 148: [149, 55],
};
const FINAL = new Set(Object.values(EVOLVE).map(([to]) => to).filter((to) => !EVOLVE[to]));

export const BADGES = [
  { id: "boulder", name: "Boulder", color: "#a8a29a", goal: "Catch 10 Pokemon", test: (g, c) => c >= 10 },
  { id: "cascade", name: "Cascade", color: "#5aa9e6", goal: "Finish 50 agent tasks", test: (g) => g.tasks >= 50 },
  { id: "thunder", name: "Thunder", color: "#f2c94c", goal: "Evolve a partner", test: (g) => g.evolutions >= 1 },
  { id: "rainbow", name: "Rainbow", color: "#9be29b", goal: "Reach a 3-day streak", test: (g) => g.streak.best >= 3 },
  { id: "soul", name: "Soul", color: "#e58ad6", goal: "Catch 75 Pokemon", test: (g, c) => c >= 75 },
  { id: "marsh", name: "Marsh", color: "#d4af37", goal: "Finish 500 agent tasks", test: (g) => g.tasks >= 500 },
  { id: "volcano", name: "Volcano", color: "#ef6b4a", goal: "Reach a 30-day streak", test: (g) => g.streak.best >= 30 },
  { id: "earth", name: "Earth", color: "#5fbf77", goal: "Catch all 151", test: (g, c) => c >= 151 },
];

export function game() {
  const g = shared(GAME) ?? {};
  return {
    xp: g.xp ?? {}, tasks: g.tasks ?? 0, subtasks: g.subtasks ?? 0, evolutions: g.evolutions ?? 0,
    streak: g.streak ?? { last: null, days: 0, best: 0 },
    badges: g.badges ?? [], shiny: g.shiny ?? [], encounter: g.encounter ?? null,
    encounters: g.encounters ?? { seen: 0, caught: 0, fled: 0 }, recent: g.recent ?? [],
  };
}

// Level n needs 4 * n^2 XP: Lv16 at 1024, Lv36 at 5184, Lv100 at 40000.
export const levelOf = (xp) => Math.max(1, Math.min(100, Math.floor(Math.sqrt((xp ?? 0) / 4))));
export function progress(xp) {
  const level = levelOf(xp);
  if (level >= 100) return { level, into: 1 };
  const lo = 4 * level ** 2, hi = 4 * (level + 1) ** 2;
  return { level, into: Math.min(1, Math.max(0, ((xp ?? 0) - lo) / (hi - lo))) };
}
export const trainerLevel = (g) => Object.values(g.xp).reduce((sum, xp) => sum + levelOf(xp), 0);
// Today's streak, which lapses when yesterday had no finished task.
export function liveStreak(g, now = new Date()) {
  const s = g.streak;
  return s.last === day(now) || s.last === day(new Date(now - 86400000)) ? s.days : 0;
}

const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shinyChance = (g) => { const s = liveStreak(g); return s >= 30 ? 1 / 4 : s >= 7 ? 1 / 8 : 0; };
export const catchRate = (id) => LEGENDARY.includes(id) ? 0.03 : FINAL.has(id) ? 0.35 : 0.6;
const expired = (e, now = Date.now()) => now - e.at > ENCOUNTER_MS;

// New catches go into the Pokedex and the recent list; each may be shiny on a long streak. Mutates g.
function addCaught(g, ids) {
  const caught = shared(CAUGHT) ?? [];
  const fresh = ids.filter((id) => !caught.includes(id));
  if (!fresh.length) return [];
  for (const id of fresh) if (Math.random() < shinyChance(g) && !g.shiny.includes(id)) g.shiny = [...g.shiny, id];
  g.recent = [...fresh.map((id) => ({ id, at: Date.now() })), ...g.recent].slice(0, RECENT);
  setShared(CAUGHT, [...caught, ...fresh].sort((a, b) => a - b));
  return fresh;
}

function save(g) {
  const count = (shared(CAUGHT) ?? []).length;
  const earned = BADGES.filter((b) => !g.badges.includes(b.id) && b.test(g, count));
  if (earned.length) {
    g.badges = [...g.badges, ...earned.map((b) => b.id)];
    for (const b of earned) notify({ title: `${b.name} Badge earned!`, body: b.goal, level: "success" });
  }
  setShared(GAME, g);
}

// Catches from outside the rules (an agent opening in its project) go through here, for shinies and badges.
export function recordCatches(ids) {
  const g = game();
  const fresh = addCaught(g, ids);
  if (fresh.length) save(g);
}

// Moves a project's XP and partner to a new key (a space renamed, or the key scheme changing).
export function migrateProject(from, to) {
  if (from === to) return;
  const g = game();
  const partners = shared(PARTNERS) ?? {};
  if (g.xp[from] !== undefined) {
    const { [from]: moved, ...rest } = g.xp;
    g.xp = { ...rest, [to]: (rest[to] ?? 0) + moved };
    setShared(GAME, g);
  }
  if (partners[from] !== undefined) {
    const { [from]: partner, ...rest } = partners;
    setShared(PARTNERS, { ...rest, [to]: rest[to] ?? partner });
  }
}

// XP to a project's partner, with level-up and evolution news. Mutates g.
function award(g, project, partnerId, amount) {
  const before = levelOf(g.xp[project]);
  g.xp = { ...g.xp, [project]: (g.xp[project] ?? 0) + amount };
  const after = levelOf(g.xp[project]);
  const label = projectLabel(project);
  // Evolve as many stages as the new level allows (Eevee goes by the project's name).
  let id = partnerId;
  while (EVOLVE[id] && after >= EVOLVE[id][1]) {
    id = id === 133 ? 134 + [...label].reduce((h, c) => h + c.codePointAt(0), 0) % 3 : EVOLVE[id][0];
  }
  if (id !== partnerId) {
    g.evolutions += 1;
    setShared(PARTNERS, { ...(shared(PARTNERS) ?? {}), [project]: id });
    addCaught(g, [id]);
    notify({ title: `What? ${nameOf(partnerId)} is evolving!`, body: `${label}'s partner became ${nameOf(id)} (Lv ${after}).`, level: "success", icon: `mods/pokedex-agents/pokemon/${id}.png` });
  } else if (after > before) {
    notify({ title: `${nameOf(partnerId)} grew to Lv ${after}!`, body: label, level: "info" });
  }
}

// A finished agent turn: XP by its length, the streak, maybe a wild Pokemon.
export function finishTask(project, partnerId, ms) {
  const g = game();
  g.tasks += 1;
  award(g, project, partnerId, taskXp(ms));

  const today = day(new Date());
  if (g.streak.last !== today) {
    const days = g.streak.last === day(new Date(Date.now() - 86400000)) ? g.streak.days + 1 : 1;
    g.streak = { last: today, days, best: Math.max(g.streak.best, days) };
  }

  // An encounter nobody answered fled; without this it would block every later one.
  if (g.encounter && expired(g.encounter)) {
    g.encounters = { ...g.encounters, fled: g.encounters.fled + 1 };
    g.encounter = null;
  }
  if (!g.encounter && Math.random() < ENCOUNTER_CHANCE) {
    let wild = 1 + Math.floor(Math.random() * 151);
    if (LEGENDARY.includes(wild)) wild = 1 + Math.floor(Math.random() * 151); // legendaries need a second roll
    g.encounter = { id: wild, at: Date.now(), balls: BALLS };
    g.encounters = { ...g.encounters, seen: g.encounters.seen + 1 };
    notify({ title: `A wild ${nameOf(wild)} appeared!`, body: "Click to throw a Poke Ball.", level: "info", timeout: ENCOUNTER_MS, icon: `mods/pokedex-agents/pokemon/${wild}.png`, action: { name: "mod.open", args: { name: "pokedex-encounter" } } });
  }
  save(g);
}

// A finished sub-agent (one without its own pane): a smaller award, no encounter, no streak day.
export function finishSubTask(project, partnerId) {
  const g = game();
  g.subtasks += 1;
  award(g, project, partnerId, SUBTASK_XP);
  save(g);
}

// One Poke Ball at the waiting encounter: "caught", "missed", "fled" or "gone".
export function throwBall() {
  const g = game();
  const e = g.encounter;
  if (!e || expired(e)) {
    if (e) g.encounters = { ...g.encounters, fled: g.encounters.fled + 1 };
    g.encounter = null;
    setShared(GAME, g);
    return "gone";
  }
  if (Math.random() < catchRate(e.id)) {
    addCaught(g, [e.id]);
    g.encounter = null;
    g.encounters = { ...g.encounters, caught: g.encounters.caught + 1 };
    save(g);
    return "caught";
  }
  if (e.balls > 1) {
    g.encounter = { ...e, balls: e.balls - 1 };
    setShared(GAME, g);
    return "missed";
  }
  g.encounter = null;
  g.encounters = { ...g.encounters, fled: g.encounters.fled + 1 };
  setShared(GAME, g);
  return "fled";
}

export function runAway() {
  const g = game();
  if (g.encounter) g.encounters = { ...g.encounters, fled: g.encounters.fled + 1 };
  setShared(GAME, { ...g, encounter: null });
}
