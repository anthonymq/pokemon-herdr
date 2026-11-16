// Notifications for the pokedex layout. Ordinary ones look like Herdr's own toast. A wild encounter
// (its icon is a Pokemon sprite) reopens itself as a window centered over the layout (no keyboard grab)
// with a flashing battle card and a sound, gone after its timeout. It only arrives when the person opted
// in (the mirror checks shouldAlert()); the Pokemon itself waits in the tall grass either way.

import { View, div, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, closeOverlay, openOverlay, run, playSound } from "herdr";

const STRIPE = { error: "#9b293a", warning: "#ffd07a", success: "#9be29b", info: "#71d5df" };
const SPRITE = /^mods\/pokedex-agents\/pokemon\/\d+\.png$/;
const PIXEL = "PxPlus IBM VGA 8x16";
const C = { screen: "#17251f", lcd: "#d9e8bc", ink: "#244438", cream: "#f7eed7", housing: "#9b293a", gold: "#ffd07a" };

const isEncounter = (p) => SPRITE.test(p.icon ?? "") && /^A wild /.test(p.title ?? "");

export default class PokedexToast extends View {
  init(_props, cx) {
    const p = props() ?? {};
    if (!isEncounter(p)) return;
    if (!p.window) {
      openOverlay({
        mod: "pokedex-toast", kind: "window", key: "pokedex-wild", width: 460, height: 140,
        props: { title: p.title, body: p.body, icon: p.icon, action: p.action, timeout: p.timeout, window: true },
      });
      closeOverlay(p.overlay);
      return;
    }
    playSound("blocked");
    cx.timer.after(p.timeout ?? 15000, () => closeOverlay(props().overlay));
  }

  open(p) {
    if (p.action?.name) run(p.action.name, p.action.args ?? {});
    closeOverlay(p.overlay);
  }

  encounter(p) {
    const name = (p.title ?? "").replace(/^A wild /, "").replace(/ appeared!$/, "");
    return div().id("toast").relative().size_full().rounded(6).bg(C.screen).cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => this.open(p))
      // The frame flashes between housing red and gold, like a battle starting.
      .child(div().absolute().top(0).left(0).size_full().rounded(6).border(4).border_color(C.gold)
        .loop("opacity", { from: 0.25, to: 1, period: 500 }))
      .child(div().absolute().top(0).left(0).size_full().rounded(6).border(2).border_color(C.housing))
      .child(h_flex().size_full().px(16).gap(14).items_center()
        .child(div().size(92).flex_none().rounded(46).bg(C.lcd).border(3).border_color(C.housing)
          .flex().items_center().justify_center()
          .child(image(p.icon).size(84).loop("top", { from: 0, to: -5, period: 700 })))
        .child(v_flex().flex_1().min_w(0).gap(5)
          .child(h_flex().gap(8).items_center()
            .child(div().size(22).flex_none().rounded(4).bg(C.housing).flex().items_center().justify_center()
              .font_family(PIXEL).text_size(16).text_color(C.cream).child("!")
              .loop("opacity", { from: 0.3, to: 1, period: 350 }))
            .child(div().font_family(PIXEL).text_size(13).text_color(C.gold).child("WILD POKEMON")))
          .child(div().truncate().font_family(PIXEL).text_size(22).line_height("24px").text_color(C.cream)
            .child(`${name.toUpperCase()} APPEARED!`))
          .child(h_flex().gap(6).items_center()
            .child(div().px(8).py(3).rounded(4).bg(C.lcd).text_color(C.ink).text_size(12).font_semibold().child("Throw a Poke Ball"))
            .child(div().flex_1().min_w(0).truncate().text_size(11).text_color("#b6c6b8").child(p.body ?? "It's waiting in the tall grass."))))
        .child(div().id("wild-close").self_start().mt(10).size(22).flex_none().flex().items_center().justify_center()
          .rounded(4).text_color("#b6c6b8").text_size(14).hover((s) => s.bg("#244438").text_color(C.cream))
          .on_click((_e, cx) => { cx.stop_propagation(); closeOverlay(p.overlay); })
          .child("\u00d7")));
  }

  // Ordinary notifications as a Pokedex screen: dark LCD panel, a level-colored stripe, pixel title,
  // and the icon (a sprite for game news) in a light LCD chip.
  render() {
    const p = props() ?? {};
    const stripe = STRIPE[p.level] ?? STRIPE.info;
    if (isEncounter(p)) return this.encounter(p);
    const login = /^([a-z0-9][a-z0-9_.-]{0,31}) needs login; run hc machine login \1$/.exec(p.body ?? "");
    const command = login ? `hc machine login ${login[1]}` : null;
    return h_flex()
      .id("toast")
      .size_full()
      .pr(14)
      .gap(12)
      .items_center()
      .bg(C.screen)
      .border(2)
      .border_color("#244438")
      .rounded(6)
      .font_family("Geist")
      .cursor_pointer()
      .hover((s) => s.border_color(stripe))
      .on_click(() => this.open(p))
      .child(div().w(6).h_full().flex_none().rounded_l(4).bg(stripe))
      .child(div().size(34).flex_none().rounded(4).bg(C.lcd).border(1).border_color("#67866c").flex().items_center().justify_center()
        .child(p.icon ? image(p.icon).size(SPRITE.test(p.icon) ? 32 : 18).flex_none() : div().size(10).rounded(5).bg(stripe)))
      .child(
        v_flex()
          .flex_1()
          .gap(2)
          .overflow_hidden()
          .child(div().truncate().font_family(PIXEL).text_size(14).line_height("16px").text_color(C.cream).child((login ? `${login[1]} needs a login: run` : p.title ?? "").toUpperCase()))
          .when(!login && Boolean(p.body), (el) => el.child(div().truncate().text_size(12).text_color("#b6c6b8").child(p.body ?? "")))
          .when(Boolean(login), (el) => el.child(h_flex().gap(8).items_center()
            .child(div().flex_1().min_w(0).truncate().tooltip(command).text_size(12).text_color("#b6c6b8").child(command))
            .child(div().id("toast-login-copy").flex_none().px(6).py(3).rounded(4).bg(C.lcd)
              .text_size(12).text_color(C.ink).cursor_pointer().hover(s => s.bg(C.cream))
              .on_click((_e, cx) => { cx.stop_propagation(); cx.write_to_clipboard(command); this.copied = true; cx.notify(); })
              .child(this.copied ? "Copied" : "Copy")))),
      );
  }
}
