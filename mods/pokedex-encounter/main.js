import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { game, throwRate, nameOf, ITEMS, ENCOUNTER_MS } from "./game.js";
import { call, send } from "./server.js";

const C = {
  screen: "#17251f", panel: "#244438", border: "#67866c", lcd: "#d9e8bc", ink: "#244438",
  cream: "#f7eed7", cyan: "#71d5df", muted: "#b6c6b8", housing: "#9b293a", gold: "#e8c35a",
};
const PIXEL = "PxPlus IBM VGA 8x16";

const SAY = {
  caught: (n) => `Gotcha! ${n} was caught!`,
  missed: (n) => `Oh no! ${n} broke free!`,
  fled: (n) => `${n} fled!`,
  gone: () => "The wild Pokemon is gone.",
  empty: () => "No balls of that kind left.",
};
const BALL = { poke: "Poke Ball", great: ITEMS.great.name, ultra: ITEMS.ultra.name };

// A wild encounter, opened from its toast: three free Poke Balls, plus Great and Ultra Balls from the bag.
// Every agent task finished while it waits weakens it (up to 3), raising the odds.
export default class PokedexEncounter extends View {
  init(_props, cx) {
    const e = game().encounter;
    this.wild = e && Date.now() - e.at <= ENCOUNTER_MS ? e.id : null;
    this.result = this.wild ? null : "gone";
    // Redraw the moment it runs out of patience, so the balls go away with it.
    if (this.wild) cx.timer.after(Math.max(0, e.at + ENCOUNTER_MS - Date.now()) + 50, (cx) => cx.notify());
  }

  button(id, label, onClick, primary, disabled = false) {
    if (disabled) return div().id(id).w_full().h(34).flex().items_center().justify_center().rounded(5).border(1)
      .border_color(C.border).bg(C.screen).text_color(C.muted).text_size(12).child(label);
    return div().id(id).w_full().h(34).flex().items_center().justify_center().rounded(5).border(1)
      .border_color(primary ? C.lcd : C.border).bg(primary ? C.lcd : C.panel).text_color(primary ? C.ink : C.cream)
      .text_size(13).font_semibold().cursor_pointer().hover(el => el.border_color(C.cyan)).on_click(onClick).child(label);
  }

  render() {
    const overlay = props()?.overlay;
    const close = () => overlay && closeOverlay(overlay);
    const e = game().encounter;
    const name = this.wild ? nameOf(this.wild) : "";
    // It fled while this was open (time ran out, or it was ended elsewhere): no more throws.
    const here = e && e.id === this.wild && Date.now() - e.at <= ENCOUNTER_MS;
    if (this.wild && !here && (!this.result || this.result === "missed" || this.result === "empty")) this.result = "fled";
    const done = this.result && this.result !== "missed" && this.result !== "empty";
    const bag = game().bag;
    const left = { poke: e?.balls ?? 0, great: bag.great ?? 0, ultra: bag.ultra ?? 0 };
    const odds = (ball) => e ? `${Math.round(throwRate(e, ball) * 100)}%` : "";
    const toss = (ball) => (_e, cx) => {
      if (this.busy) return;
      this.busy = true;
      cx.spawn(async (cx) => {
        try { this.result = await call("throwBall", ball); } catch (error) { this.error = error.message; }
        this.busy = false;
        cx.notify();
      });
    };
    return v_flex().id("pokedex-encounter").size_full().p(16).gap(10).items_center().bg(C.screen).text_color(C.cream).font_family("Geist")
      .child(div().font_family(PIXEL).text_size(20).child(this.wild ? `WILD ${name.toUpperCase()}` : "NO ENCOUNTER"))
      .child(div().size(120).flex_none().flex().items_center().justify_center().rounded(60).bg(C.panel)
        .when(Boolean(this.wild), el => el.child(image(`mods/pokedex-agents/pokemon/${this.wild}.png`).size(96)
          .when(this.result === "caught", el => el.opacity(0.35))
          .when(!this.result || this.result === "missed", el => el.loop("top", { from: 0, to: -4, period: 900 })))))
      .child(div().h(18).text_size(13).child(this.error ? this.error : this.result ? SAY[this.result](name) : `Catch rate ${odds("poke")} with a Poke Ball`))
      .child(div().text_size(11).text_color(e?.weak ? C.gold : C.muted)
        .child(e && !done ? (e.weak ? `Weakened x${e.weak} by your agents' work` : "Finish agent tasks while it waits to weaken it") : ""))
      .child(div().flex_1())
      .child(v_flex().w_full().gap(6)
        .when(!done, el => el
          .children(["poke", "great", "ultra"].map((ball) => this.button(`enc-${ball}`,
            `${BALL[ball]} x${left[ball]} \u00b7 ${odds(ball)}`, toss(ball), ball === "poke", left[ball] < 1)))
          .child(this.button("enc-run", "Run", () => { send("runAway"); close(); }, false)))
        .when(Boolean(done), el => el.child(this.button("enc-close", "Close", close, true))));
  }
}
