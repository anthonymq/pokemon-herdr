// Game rules (mods/pokedex-agents/game.js) against an in-memory stand-in for Herdr's `herdr` module.
// Run with `bun test`. Randomness is pinned per test; nothing touches a real Herdr.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const herdr = { state: {}, notes: [], sounds: [], soundsEnabled: true };
mock.module("herdr", () => ({
  shared: (key) => herdr.state[key],
  setShared: (key, value) => { herdr.state[key] = structuredClone(value); },
  notify: (n) => { herdr.notes.push(n); return "note"; },
  playSound: (sound) => { herdr.sounds.push(sound); return null; },
  settings: () => ({ sounds: { enabled: herdr.soundsEnabled } }),
}));
const G = await import("../mods/pokedex-agents/game.js");

const realRandom = Math.random;
const roll = (value) => { Math.random = () => value; };
const titles = () => herdr.notes.map((n) => n.title);

beforeEach(() => {
  herdr.state = {};
  herdr.notes = [];
  herdr.sounds = [];
  herdr.soundsEnabled = true;
  roll(0.99); // no encounter, no shiny unless a test says otherwise
});
afterEach(() => { Math.random = realRandom; });

describe("XP and levels", () => {
  test("a turn earns 10 XP plus 5 per full minute, capped at 100", () => {
    expect(G.taskXp(5000)).toBe(10);
    expect(G.taskXp(180000)).toBe(25);
    expect(G.taskXp(3600000)).toBe(100);
    expect(G.taskXp(-1)).toBe(10);
  });

  test("level n needs 4 * n^2 XP, from Lv1 to Lv100", () => {
    expect(G.levelOf(0)).toBe(1);
    expect(G.levelOf(1023)).toBe(15);
    expect(G.levelOf(1024)).toBe(16);
    expect(G.levelOf(1e9)).toBe(100);
    expect(G.progress(4 * 16 ** 2 + (4 * 17 ** 2 - 4 * 16 ** 2) / 2).into).toBeCloseTo(0.5);
  });

  test("level-up news only when a partner crosses a multiple of 5", () => {
    herdr.state[G.GAME] = { xp: { p: 4 * 8 ** 2 } }; // Lv8
    G.finishTask("p", 1, 0); // +10 XP, still Lv8
    expect(titles()).toEqual([]);
    herdr.state[G.GAME].xp.p = 4 * 10 ** 2 - 5; // just under Lv10
    G.finishTask("p", 1, 0);
    expect(titles()).toEqual(["Bulbasaur reached Lv 10!"]);
  });
});

describe("project keys", () => {
  test("labels are the key's last path segment", () => {
    expect(G.projectLabel("/Users/a/workspace/kanto-api")).toBe("kanto-api");
    expect(G.projectLabel("vps:/srv/app")).toBe("app");
  });

  test("projectKey maps a space name, else returns it", () => {
    herdr.state[G.PROJECTS] = { "kanto renamed": "/r/kanto" };
    expect(G.projectKey("kanto renamed")).toBe("/r/kanto");
    expect(G.projectKey("other")).toBe("other");
  });

  test("migrating adds XP to the key and keeps an existing partner there", () => {
    herdr.state[G.PARTNERS] = { "old-name": 4, "/r/kanto": 25 };
    herdr.state[G.GAME] = { xp: { "old-name": 900, "/r/kanto": 100 } };
    G.migrateProject("old-name", "/r/kanto");
    expect(G.game().xp).toEqual({ "/r/kanto": 1000 });
    expect(herdr.state[G.PARTNERS]).toEqual({ "/r/kanto": 25 });
  });
});

describe("evolution, jingles and badges", () => {
  test("reaching the evolution level evolves, catches, plays one jingle and earns Thunder", () => {
    herdr.state[G.GAME] = { xp: { p: 1000 } };
    G.finishTask("p", 4, 600000); // +60 XP -> Lv16: Charmander -> Charmeleon
    expect(herdr.state[G.PARTNERS]).toEqual({ p: 5 });
    expect(herdr.state[G.CAUGHT]).toEqual([5]);
    expect(G.game().recent.map((r) => r.id)).toEqual([5]);
    expect(G.game().badges).toContain("thunder");
    expect(herdr.sounds).toEqual(["mods/pokedex-agents/sounds/evolve.mp3"]); // the badge stays quiet
  });

  test("a badge on its own plays the badge jingle", () => {
    herdr.state[G.CAUGHT] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    G.recordCatches([10]);
    expect(G.game().badges).toEqual(["boulder"]);
    expect(herdr.sounds).toEqual(["mods/pokedex-agents/sounds/badge.mp3"]);
  });

  test("jingles stay silent when sounds are off", () => {
    herdr.soundsEnabled = false;
    herdr.state[G.GAME] = { xp: { p: 1000 } };
    G.finishTask("p", 4, 600000);
    expect(herdr.sounds).toEqual([]);
    expect(herdr.state[G.PARTNERS]).toEqual({ p: 5 });
  });
});

describe("partners", () => {
  test("a project's first XP saves its partner, and a saved one is kept", () => {
    G.finishTask("p", 52, 0);
    expect(herdr.state[G.PARTNERS]).toEqual({ p: 52 });
    G.finishTask("p", 1, 0);
    expect(herdr.state[G.PARTNERS]).toEqual({ p: 52 });
  });
});

describe("sub-agents", () => {
  test("a finished sub-agent earns 10 XP without counting a task", () => {
    G.finishSubTask("p", 1);
    expect(G.game().xp.p).toBe(G.SUBTASK_XP);
    expect(G.game().subtasks).toBe(1);
    expect(G.game().tasks).toBe(0);
  });
});

describe("encounters", () => {
  test("a finished task can spawn one, counted as seen", () => {
    roll(0);
    G.finishTask("p", 1, 0);
    expect(G.game().encounter).not.toBeNull();
    expect(G.game().encounters.seen).toBe(1);
  });

  test("an expired encounter counts as fled and no longer blocks new ones", () => {
    herdr.state[G.GAME] = { encounter: { id: 94, at: Date.now() - G.ENCOUNTER_MS - 1000, balls: 3 } };
    G.finishTask("p", 1, 0);
    expect(G.game().encounters.fled).toBe(1);
    expect(G.game().encounter).toBeNull();
  });

  test("a throw that lands catches it", () => {
    herdr.state[G.GAME] = { encounter: { id: 94, at: Date.now(), balls: 3 } };
    roll(0);
    expect(G.throwBall()).toBe("caught");
    expect(G.game().encounters.caught).toBe(1);
    expect(herdr.state[G.CAUGHT]).toEqual([94]);
  });

  test("three misses and it flees", () => {
    herdr.state[G.GAME] = { encounter: { id: 94, at: Date.now(), balls: 3 } };
    expect([G.throwBall(), G.throwBall(), G.throwBall()]).toEqual(["missed", "missed", "fled"]);
    expect(G.game().encounters.fled).toBe(1);
  });

  test("running away counts as fled", () => {
    herdr.state[G.GAME] = { encounter: { id: 94, at: Date.now(), balls: 3 } };
    G.runAway();
    expect(G.game().encounters.fled).toBe(1);
    expect(G.game().encounter).toBeNull();
  });

  test("catch rates: basic, final form, legendary", () => {
    expect(G.catchRate(4)).toBe(0.6);
    expect(G.catchRate(6)).toBe(0.35);
    expect(G.catchRate(150)).toBe(0.03);
  });
});
