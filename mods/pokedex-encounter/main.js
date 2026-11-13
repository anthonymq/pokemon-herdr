import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { game, throwBall, runAway, catchRate, nameOf, ENCOUNTER_MS } from "./game.js";

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
};

// A wild encounter, opened from its toast: throw up to three Poke Balls before it flees.
export default class PokedexEncounter extends View {
  init() {
    const e = game().encounter;
    this.wild = e && Date.now() - e.at <= ENCOUNTER_MS ? e.id : null;
    this.result = this.wild ? null : "gone";
  }

  button(id, label, onClick, primary) {
    return div().id(id).flex_1().h(34).flex().items_center().justify_center().rounded(5).border(1)
      .border_color(primary ? C.lcd : C.border).bg(primary ? C.lcd : C.panel).text_color(primary ? C.ink : C.cream)
      .text_size(13).font_semibold().cursor_pointer().hover(el => el.border_color(C.cyan)).on_click(onClick).child(label);
  }

  render() {
    const overlay = props()?.overlay;
    const close = () => overlay && closeOverlay(overlay);
    const e = game().encounter;
    const name = this.wild ? nameOf(this.wild) : "";
    const done = this.result && this.result !== "missed";
    return v_flex().id("pokedex-encounter").size_full().p(16).gap(10).items_center().bg(C.screen).text_color(C.cream).font_family("Geist")
      .child(div().font_family(PIXEL).text_size(20).child(this.wild ? `WILD ${name.toUpperCase()}` : "NO ENCOUNTER"))
      .child(div().size(120).flex_none().flex().items_center().justify_center().rounded(60).bg(C.panel)
        .when(Boolean(this.wild), el => el.child(image(`mods/pokedex-agents/pokemon/${this.wild}.png`).size(96)
          .when(this.result === "caught", el => el.opacity(0.35))
          .when(!this.result || this.result === "missed", el => el.loop("top", { from: 0, to: -4, period: 900 })))))
      .child(div().h(18).text_size(13).child(this.result ? SAY[this.result](name) : `Catch rate ${Math.round(catchRate(this.wild) * 100)}%`))
      .child(div().text_size(11).text_color(C.muted).child(e && !done ? `Poke Balls left: ${e.balls}` : ""))
      .child(div().flex_1())
      .child(h_flex().w_full().gap(8)
        .when(!done, el => el
          .child(this.button("enc-throw", "Throw Poke Ball", (_e, cx) => { this.result = throwBall(); cx.notify(); }, true))
          .child(this.button("enc-run", "Run", () => { runAway(); close(); }, false)))
        .when(Boolean(done), el => el.child(this.button("enc-close", "Close", close, true))));
  }
}
