// Pokedex gamification rules, shared by pokedex-agents, pokedex-console, pokedex-collection,
// pokedex-trainer and pokedex-encounter; each keeps an identical copy (mods can't import across folders). All state lives in shared("pokedex.game"):
// { xp: {project: n}, tasks, streak: {last, days, best}, badges: [ids], shiny: [ids], encounter: {id, at, balls} | null }
import { shared, setShared, notify } from "herdr";
import { POKEMON as DEX } from "./pokemon.js";

export const nameOf = (id) => DEX[id - 1]?.name ?? `#${id}`;

export const GAME = "pokedex.game";
export const CAUGHT = "pokedex.caught";
export const PARTNERS = "pokedex.partners";
export const TASK_XP = 25;
export const LONG_TASK_BONUS = 25; // a task over 10 minutes
export const LONG_TASK_MS = 10 * 60000;
export const ENCOUNTER_CHANCE = 0.15;
export const ENCOUNTER_MS = 60000;
export const BALLS = 3;
const LEGENDARY = [144, 145, 146, 150, 151];

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
  { id: "thunder", name: "Thunder", color: "#f2c94c", goal: "Evolve a partner", test: (g) => (g.evolutions ?? 0) >= 1 },
  { id: "rainbow", name: "Rainbow", color: "#9be29b", goal: "Reach a 3-day streak", test: (g) => g.streak.best >= 3 },
  { id: "soul", name: "Soul", color: "#e58ad6", goal: "Catch 75 Pokemon", test: (g, c) => c >= 75 },
  { id: "marsh", name: "Marsh", color: "#d4af37", goal: "Finish 500 agent tasks", test: (g) => g.tasks >= 500 },
  { id: "volcano", name: "Volcano", color: "#ef6b4a", goal: "Reach a 30-day streak", test: (g) => g.streak.best >= 30 },
  { id: "earth", name: "Earth", color: "#5fbf77", goal: "Catch all 151", test: (g, c) => c >= 151 },
];

export function game() {
  const g = shared(GAME) ?? {};
  return {
    xp: g.xp ?? {}, tasks: g.tasks ?? 0, evolutions: g.evolutions ?? 0,
    streak: g.streak ?? { last: null, days: 0, best: 0 },
    badges: g.badges ?? [], shiny: g.shiny ?? [], encounter: g.encounter ?? null,
  };
}

// The medium-fast curve: level n needs n^3 XP.
export const levelOf = (xp) => Math.max(1, Math.min(100, Math.floor(Math.cbrt(xp ?? 0))));
export function progress(xp) {
  const level = levelOf(xp);
  if (level >= 100) return { level, into: 1 };
  const lo = level ** 3, hi = (level + 1) ** 3;
  return { level, into: Math.max(0, ((xp ?? 0) - lo) / (hi - lo)) };
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

// Adds catches to the Pokedex; each new one may be shiny on a long streak. Mutates g.
function addCaught(g, ids) {
  const caught = shared(CAUGHT) ?? [];
  const fresh = ids.filter((id) => !caught.includes(id));
  if (!fresh.length) return [];
  for (const id of fresh) if (Math.random() < shinyChance(g) && !g.shiny.includes(id)) g.shiny = [...g.shiny, id];
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

// A finished agent task: XP to the project's partner, evolution, the streak, maybe a wild Pokemon.
export function finishTask(project, partnerId, ms) {
  const g = game();
  const before = levelOf(g.xp[project]);
  g.xp = { ...g.xp, [project]: (g.xp[project] ?? 0) + TASK_XP + (ms > LONG_TASK_MS ? LONG_TASK_BONUS : 0) };
  g.tasks += 1;
  const after = levelOf(g.xp[project]);

  const today = day(new Date());
  if (g.streak.last !== today) {
    const days = g.streak.last === day(new Date(Date.now() - 86400000)) ? g.streak.days + 1 : 1;
    g.streak = { last: today, days, best: Math.max(g.streak.best, days) };
  }

  // Evolve as many stages as the new level allows (Eevee goes by the project's name).
  let id = partnerId;
  while (EVOLVE[id] && after >= EVOLVE[id][1]) {
    id = id === 133 ? 134 + [...project].reduce((h, c) => h + c.codePointAt(0), 0) % 3 : EVOLVE[id][0];
  }
  if (id !== partnerId) {
    g.evolutions += 1;
    setShared(PARTNERS, { ...(shared(PARTNERS) ?? {}), [project]: id });
    addCaught(g, [id]);
    notify({ title: `What? ${nameOf(partnerId)} is evolving!`, body: `${project}'s partner became ${nameOf(id)} (Lv ${after}).`, level: "success" });
  } else if (after > before) {
    notify({ title: `${nameOf(partnerId)} grew to Lv ${after}!`, body: project, level: "info" });
  }

  if (!g.encounter && Math.random() < ENCOUNTER_CHANCE) {
    let wild = 1 + Math.floor(Math.random() * 151);
    if (LEGENDARY.includes(wild)) wild = 1 + Math.floor(Math.random() * 151); // legendaries need a second roll
    g.encounter = { id: wild, at: Date.now(), balls: BALLS };
    notify({ title: `A wild ${nameOf(wild)} appeared!`, body: "Click to throw a Poke Ball.", level: "info", timeout: ENCOUNTER_MS, action: { name: "mod.open", args: { name: "pokedex-encounter" } } });
  }
  save(g);
}

// One Poke Ball at the waiting encounter: "caught", "missed", "fled" or "gone".
export function throwBall() {
  const g = game();
  const e = g.encounter;
  if (!e || Date.now() - e.at > ENCOUNTER_MS) {
    g.encounter = null;
    setShared(GAME, g);
    return "gone";
  }
  if (Math.random() < catchRate(e.id)) {
    addCaught(g, [e.id]);
    g.encounter = null;
    save(g);
    return "caught";
  }
  g.encounter = e.balls > 1 ? { ...e, balls: e.balls - 1 } : null;
  setShared(GAME, g);
  return g.encounter ? "missed" : "fled";
}

export function runAway() {
  setShared(GAME, { ...game(), encounter: null });
}
