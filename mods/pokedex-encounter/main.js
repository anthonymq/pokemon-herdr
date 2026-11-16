import { View, div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { game, throwRate, nameOf, ITEMS, ENCOUNTER_MS, WILD_MAX } from "./game.js";
import { call } from "./server.js";

const C = {
  screen: "#17251f", panel: "#244438", border: "#67866c", lcd: "#d9e8bc", ink: "#244438",
  cream: "#f7eed7", cyan: "#71d5df", muted: "#b6c6b8", housing: "#9b293a", gold: "#e8c35a",
};
const PIXEL = "PxPlus IBM VGA 8x16";

const SAY = {
  caught: (n) => `Gotcha! ${n} was caught!`,
  missed: (n) => `Oh no! ${n} broke free!`,
  fled: (n) => `${n} fled!`,
  left: (n) => `You left ${n} in the grass.`,
  gone: () => "The wild Pokemon is gone.",
  empty: () => "No balls of that kind left.",
};
const BALL = { poke: "Poke Ball", great: ITEMS.great.name, ultra: ITEMS.ultra.name };
// A queued Pokemon is known by when it appeared and what it is: its index moves as others leave.
const same = (a, b) => a && b && a.id === b.id && a.at === b.at;

// The tall grass: every wild Pokemon waiting (up to WILD_MAX, each for ENCOUNTER_MS), oldest first.
// Pick one, then throw: three free Poke Balls each, plus Great and Ultra Balls from the bag. Every agent
// task finished while they wait weakens them (up to 3), raising the odds.
export default class PokedexEncounter extends View {
  init() {
    this.pick = null; // the chosen Pokemon ({id, at}); the oldest when null
    this.result = null; // what happened to `this.last`, the one the last action was about
    this.last = null;
  }

  queue() {
    return game().wild.filter((e) => Date.now() - e.at <= ENCOUNTER_MS);
  }

  button(id, label, onClick, primary, disabled = false) {
    if (disabled) return div().id(id).w_full().h(34).flex().items_center().justify_center().rounded(5).border(1)
      .border_color(C.border).bg(C.screen).text_color(C.muted).text_size(12).child(label);
    return div().id(id).w_full().h(34).flex().items_center().justify_center().rounded(5).border(1)
      .border_color(primary ? C.lcd : C.border).bg(primary ? C.lcd : C.panel).text_color(primary ? C.ink : C.cream)
      .text_size(13).font_semibold().cursor_pointer().hover(el => el.border_color(C.cyan)).on_click(onClick).child(label);
  }

  grass(list, e) {
    return h_flex().w_full().gap(6).justify_center()
      .children(list.map((w, i) => div().id(`wild-${i}`).size(46).flex_none().flex().items_center().justify_center()
        .rounded(5).border(2).border_color(same(w, e) ? C.lcd : C.border).bg(C.panel).cursor_pointer()
        .hover(el => el.border_color(C.cyan)).tooltip(`${nameOf(w.id)}${w.weak ? ` \u00b7 weakened x${w.weak}` : ""}`)
        .on_click((_ev, cx) => { this.pick = { id: w.id, at: w.at }; this.result = null; this.error = null; cx.notify(); })
        .child(image(`mods/pokedex-agents/pokemon/${w.id}.png`).size(40))));
  }

  render() {
    const overlay = props()?.overlay;
    const close = () => overlay && closeOverlay(overlay);
    const list = this.queue();
    const e = list.find((w) => same(w, this.pick)) ?? list[0] ?? null;
    // The server drops expired Pokemon before it reads the index, as queue() does.
    const index = e ? list.findIndex((w) => same(w, e)) : -1;
    // The last throw ended an encounter (caught, fled, left): show that one until another is picked.
    const ended = this.result && !["missed", "empty"].includes(this.result) && this.last;
    const shown = ended ? this.last : e;
    const name = shown ? nameOf(shown.id) : "";
    const bag = game().bag;
    const left = { poke: e?.balls ?? 0, great: bag.great ?? 0, ultra: bag.ultra ?? 0 };
    const odds = (ball) => e ? `${Math.round(throwRate(e, ball) * 100)}%` : "";
    const act = (action, ...args) => (_ev, cx) => {
      if (this.busy || index < 0) return;
      this.busy = true;
      this.last = e;
      this.pick = null;
      cx.spawn(async (cx) => {
        try {
          const r = await call(action, ...args, index);
          this.result = action === "runAway" ? "left" : r;
          if (r === "missed" || r === "empty") this.pick = { id: e.id, at: e.at };
          this.error = null;
        } catch (error) { this.error = error.message; }
        this.busy = false;
        cx.notify();
      });
    };
    const status = this.error ? this.error
      : this.result ? SAY[this.result](name)
      : e ? `Catch rate ${odds("poke")} with a Poke Ball` : "";
    return v_flex().id("pokedex-encounter").size_full().p(16).gap(10).items_center().bg(C.screen).text_color(C.cream).font_family("Geist")
      .child(div().font_family(PIXEL).text_size(13).text_color(C.muted).child(`TALL GRASS ${list.length}/${WILD_MAX}`))
      .when(list.length > 1, el => el.child(this.grass(list, ended ? null : e)))
      .child(div().font_family(PIXEL).text_size(20).child(shown ? `WILD ${name.toUpperCase()}` : "NOTHING IN THE GRASS"))
      .child(div().size(120).flex_none().flex().items_center().justify_center().rounded(60).bg(C.panel)
        .when(Boolean(shown), el => el.child(image(`mods/pokedex-agents/pokemon/${shown.id}.png`).size(96)
          .when(this.result === "caught" && Boolean(ended), el => el.opacity(0.35))
          .when(!ended, el => el.loop("top", { from: 0, to: -4, period: 900 })))))
      .child(div().h(18).text_size(13).child(status))
      .child(div().text_size(11).text_color(e?.weak && !ended ? C.gold : C.muted)
        .child(!e ? "Wild Pokemon wait here a day after a finished task." : ended ? "" :
          e.weak ? `Weakened x${e.weak} by your agents' work` : "Finish agent tasks while it waits to weaken it"))
      .child(div().flex_1())
      .child(v_flex().w_full().gap(6)
        .when(Boolean(e) && !ended, el => el
          .children(["poke", "great", "ultra"].map((ball) => this.button(`enc-${ball}`,
            `${BALL[ball]} x${left[ball]} \u00b7 ${odds(ball)}`, act("throwBall", ball), ball === "poke", left[ball] < 1)))
          .child(this.button("enc-run", "Run", act("runAway"), false)))
        .when(Boolean(ended) && Boolean(e), el => el.child(this.button("enc-next", `Next: ${nameOf(e.id)}`,
          (_ev, cx) => { this.result = null; this.last = null; cx.notify(); }, true)))
        .when(!e || Boolean(ended), el => el.child(this.button("enc-close", "Close", close, !e))));
  }
}
