// A drawer on the work area's right edge: agents that need you (blocked) or finished
// while you weren't looking (done). The peeking strip shows their status dots; hovered,
// each row offers Jump, Peek and Pin. Also takes keys (keys.json "layout:pokedex"):
//   pokedex-alerts.next-needy  jump to the most urgent agent (blocked first, then done)
//   pokedex-alerts.peek        peek at the most urgent agent
//   pokedex-alerts.pin         pin/unpin the focused agent
//   pokedex-alerts.focus       flip the work area between tabs and one full-size agent

import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, focused, layout, nextCommand, notify, placement, run, theme } from "herdr";

const C = { housing: "#244438", raised: "#355746", trim: "#67866c", cream: "#d9e8bc", screen: "#17251f" };
const PIXEL = "PxPlus IBM VGA 8x16";
const RANK = { blocked: 0, done: 1 };

function needy() {
  return agents().filter(a => a.status in RANK)
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.seq - a.seq);
}

function findNode(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return null;
}

export default class PokedexAlerts extends View {
  init(_props, cx) {
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        this.command(c);
        cx.notify();
      }
    });
  }

  command(c) {
    const first = needy()[0];
    if (c === "next-needy" || c === "peek") {
      if (!first) return notify({ title: "No agent needs you", level: "info", timeout: 2000 });
      run(c === "peek" ? "terminal.peek" : "agent.focus", { terminal: first.address });
      if (c === "next-needy") run("pane.focus", { terminal: first.address });
    } else if (c === "pin") {
      const me = agents().find(a => a.address === focused()?.terminal);
      if (!me) return notify({ title: "Focus an agent to pin it", level: "info", timeout: 2000 });
      run("terminal.pin", { terminal: me.address, pinned: !me.pinned });
    } else if (c === "focus") {
      const view = findNode(layout()?.root ?? layout(), "view");
      run("layout.select", { stack: "view", child: view?.active === "focus" ? "main" : "focus" });
    }
  }

  icon(p) {
    if (!p?.icon) return null;
    return p.tint ? svg(p.icon).size(14).flex_none().text_color(C.cream) : image(p.icon).size(14).flex_none();
  }

  button(id, label, onClick) {
    return div().id(id).px(6).h(20).flex().items_center().flex_none().border_1().border_color(C.trim)
      .bg(C.raised).text_size(11).text_color(C.cream).cursor_pointer()
      .hover(s => s.bg(C.trim).text_color(C.housing))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); onClick(); })
      .child(label);
  }

  row(a, t, right) {
    const color = t[a.status];
    const dot = div().size(10).flex_none().rounded(5).bg(color)
      .when(a.status === "blocked", el => el.loop("opacity", { from: 0.35, to: 1, period: 1000 }));
    const pic = this.icon(a.program);
    const body = v_flex().flex_1().min_w(0).gap(2)
      .child(h_flex().gap(6).items_center()
        .when(Boolean(pic), el => el.child(pic))
        .child(div().truncate().font_family(PIXEL).text_size(14).text_color(C.cream)
          .child((a.program?.name ?? a.app ?? "agent").toUpperCase())))
      .child(div().truncate().text_size(11).text_color(color)
        .child(`${a.status === "blocked" ? "Needs you" : "Done"} \u00b7 ${a.space_name} / ${a.tab_name}`))
      .child(h_flex().gap(4).pt(2)
        .child(this.button(`al-j-${a.address}`, "Jump", () => {
          run("agent.focus", { terminal: a.address });
          run("pane.focus", { terminal: a.address });
        }))
        .child(this.button(`al-p-${a.address}`, "Peek", () => run("terminal.peek", { terminal: a.address })))
        .child(this.button(`al-n-${a.address}`, a.pinned ? "Unpin" : "Pin",
          () => run("terminal.pin", { terminal: a.address, pinned: !a.pinned }))));
    const lead = div().w(28).flex_none().flex().justify_center().pt(4).child(dot);
    return h_flex().id(`al-${a.address}`).w(280).px(6).py(8).gap(6).items_start()
      .border_b(1).border_color(C.raised)
      .children(right ? [lead, body] : [body, lead]);
  }

  render() {
    const t = theme();
    const list = needy();
    const right = (placement()?.edge ?? "right") === "right";
    if (!list.length) return div().id("pokedex-alerts").w(28).h(26).flex().items_center().justify_center()
      .tooltip("No agent needs you").child(div().size(8).rounded(4).bg(t.idle));
    return v_flex().id("pokedex-alerts").max_h(520).overflow_y_scrollbar().font_family("Geist")
      .child(h_flex().px(6).h(26).gap(6).items_center().bg(C.screen)
        .children([
          div().w(28).flex_none().flex().justify_center()
            .child(div().font_family(PIXEL).text_size(14).text_color(t.blocked).child(`${list.length}`)),
          div().flex_1().font_family(PIXEL).text_size(13).text_color(C.cream).child("NEEDS YOU"),
        ][right ? "slice" : "reverse"]()))
      .children(list.map(a => this.row(a, t, right)));
  }
}
