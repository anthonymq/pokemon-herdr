import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, focused, props, run, spaces } from "herdr";

const C = {
  housing: "#9b293a", raised: "#bd3c4c", seam: "#641b2b",
  highlight: "#e8797d", lcd: "#d9e8bc", ink: "#244438",
  cyan: "#71d5df", cream: "#f7eed7", screen: "#17251f",
};
const PIXEL = "PxPlus IBM VGA 8x16";

export default class PokedexConsole extends View {
  init() { this.width = 300; }

  button(id, label, action, width = 64) {
    return div().id(id).w(width).h(26).flex_none().flex().items_center()
      .justify_center().rounded(4).border(1).border_color(C.highlight)
      .bg(C.housing).text_color(C.cream).text_size(11)
      .cursor_pointer().hover(s => s.bg(C.raised))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(action).child(label);
  }

  lens(compact) {
    return div().id("pokedex-sensor").size(compact ? 32 : 46).flex_none()
      .rounded(24).bg(C.seam).p(3).cursor_pointer()
      .tooltip("Open command palette")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => run("app.palette"))
      .hover(s => s.bg(C.highlight))
      .child(div().size_full().rounded(22).bg(C.cream).p(3)
        .child(div().size_full().rounded(20).bg("#298eaa").p(3)
          .child(div().size_full().rounded(18).bg(C.cyan)
            .child(div().size(8).mt(3).ml(3).rounded(4).bg("#edffff")))));
  }

  brand(compact) {
    const all = agents();
    const working = all.some(a => a.status === "working");
    const blocked = all.some(a => a.status === "blocked");
    return v_flex().size_full().justify_end().px(compact ? 8 : 16).pb(13)
      .gap(12).bg(C.housing).border_b(2).border_color(C.highlight)
      .child(h_flex().gap(12).items_center().when(compact, el => el.justify_center())
        .child(this.lens(compact))
        .when(!compact, el => el.child(v_flex().gap(2).min_w(0).flex_1()
          .child(div().font_family(PIXEL).text_size(23).line_height("24px")
            .text_color(C.cream).child("POKEDEX"))
          .child(div().text_size(10).font_semibold().text_color("#f3bfba")
            .child("AGENT CONTROL"))))
        .when(!compact, el => el.child(h_flex().gap(5).self_start()
          .child(div().size(7).rounded(4).bg(blocked ? "#ffcc67" : "#6e2930")
            .tooltip(blocked ? "Agents need you" : "No blocked agents"))
          .child(div().size(7).rounded(4).bg(working ? C.cyan : "#6e2930")
            .tooltip(working ? "Agents working" : "No working agents"))
          .child(div().size(7).rounded(4).bg(C.lcd).tooltip("Herdr running")))))
      .when(!compact, el => el.child(h_flex().gap(5)
        .children([1, 2, 3].map(i => div().h(3).w(i === 1 ? 84 : 20)
          .rounded(2).bg(C.seam)))));
  }

  footer(compact) {
    return v_flex().size_full().px(compact ? 8 : 14).py(10)
      .bg(C.housing).border_t(2).border_color(C.seam)
      .child(this.button("pokedex-settings", compact ? "⚙" : "Settings",
        () => run("app.settings", { section: "look" }), compact ? 40 : 88));
  }

  status() {
    const all = agents();
    const space = spaces().find(s => s.active);
    const current = all.find(a => a.address === focused()?.terminal);
    const counts = [
      ["working", "Working", C.cyan], ["blocked", "Needs you", "#ffd07a"],
      ["done", "Done", C.lcd], ["idle", "Idle", "#b6c6b8"],
    ].map(([status, label, color]) => ({ label, color, count: all.filter(a => a.status === status).length }));
    return h_flex().size_full().px(14).gap(14).items_center().min_w(0)
      .bg(C.screen).text_size(11).text_color("#b6c6b8")
      .child(div().size(6).rounded(3).bg(C.cyan).flex_none())
      .child(div().max_w(250).truncate().child(space?.name ?? "Herdr"))
      .when(Boolean(current), el => el.child(div().max_w(160).truncate()
        .text_color(C.cream).child(current.program?.name ?? current.app)))
      .child(div().flex_1())
      .children(counts.filter(c => c.count > 0).map(c =>
        h_flex().flex_none().gap(5).items_center()
          .child(div().size(5).rounded(3).bg(c.color))
          .child(div().child(`${c.label} ${c.count}`))))
      .child(div().text_color("#819788").flex_none().child("HERDR / FIELD SYSTEM"));
  }

  render() {
    const role = props()?.role ?? "brand";
    const compact = this.width < 160;
    return div().id("pokedex-console").size_full().min_w(0)
      .font_family("Geist")
      .on_size_change((size, cx) => { this.width = size.width; cx.notify(); })
      .child(role === "status" ? this.status() : role === "footer" ? this.footer(compact) : this.brand(compact));
  }
}
