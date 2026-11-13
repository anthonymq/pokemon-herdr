// Modified from Herdr's shipped mod (Apache License 2.0, see LICENSE): pixel-art restyle.
// A pane's header, for layouts that frame their panes:
//   { "tab": "active", "pane": { "header": { "content": { "mod": "pokedex-pane" } } } }
// Shows the program's icon (the app's program table), the agent's name or
// the terminal's title, the folder, and the agent's status; buttons split, zoom and close
// this pane. Props from the app: { pane, terminal }. Click: focus the pane.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, theme, home } from "herdr";

// Pixel look (fonts ship in mods/retropet-spaces/fonts). Only the header changes:
// the terminal's own text, font and colors are left alone.
const PX = "PxPlus IBM VGA 8x16";
const PXS = "Pixelated MS Sans Serif";
const HOUSING = "#244438";
const RAISED = "#355746";
const TRIM = "#67866c";
const CREAM = "#d9e8bc";
const CYAN = "#71d5df";
const LCD = "#d9e8bc";
const SCREEN = "#17251f";
const BADGE = { working: "BUSY", blocked: "NEEDS YOU", done: "DONE", idle: "IDLE" };

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Pane extends View {
  init() { this.hovered = false; }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(id, icon, command, args) {
    return div()
      .id(id)
      .p(3)
      .border_1()
      .border_color(TRIM)
      .bg(RAISED)
      .text_color(CREAM)
      .hover((s) => s.bg(TRIM).text_color(HOUSING))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/pokedex-pane/${icon}.svg`).size(14));
  }

  render(cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = icon(p.program, 14, CYAN);
    const st = p.status;
    const pane = p.pane;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .bg(HOUSING)
      .border_b(2)
      .border_color(p.focused ? TRIM : RAISED)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().size(6).flex_none().rounded(3).bg(p.focused ? CYAN : TRIM))
      .child(div().flex_none().truncate().max_w(260).px(4).bg(SCREEN).font_family(PX).text_size(16).line_height("16px")
        .text_color(LCD).child(name.toUpperCase()))
      .child(div().flex_1().min_w(0).truncate().font_family(PXS).text_size(11).text_color(CREAM).child(folder(p.cwd)))
      .when(Boolean(p.branch), el => el.child(div().flex_none().max_w(180).truncate().px(4).h(15).flex().items_center()
        .bg(RAISED).font_family(PXS).text_size(11).text_color(CYAN).child(`\u2387 ${p.branch}`)))
      .when(Boolean(st), el => el.child(div().flex_none().px(4).h(15).flex().items_center().border_1().border_color(t[st] ?? LCD).bg(SCREEN)
        .font_family(PXS).font_weight(700).text_size(11).text_color(t[st] ?? LCD).child(BADGE[st] ?? st.toUpperCase())))
      .when(this.hovered, el => el
        .child(this.button(`ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(`ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(`ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(`ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
