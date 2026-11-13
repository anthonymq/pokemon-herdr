import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { shared, props, closeOverlay } from "herdr";
import { game, BADGES, CAUGHT, PARTNERS, progress, trainerLevel, liveStreak, nameOf } from "./game.js";

const C = {
  screen: "#17251f", panel: "#244438", border: "#67866c", lcd: "#d9e8bc", ink: "#244438",
  cream: "#f7eed7", cyan: "#71d5df", muted: "#b6c6b8", housing: "#9b293a", gold: "#e8c35a",
};
const PIXEL = "PxPlus IBM VGA 8x16";

// The trainer card: totals, the eight Kanto badges and each project's partner with its level.
export default class PokedexTrainer extends View {
  stat(label, value) {
    return v_flex().flex_1().p(10).gap(2).rounded(5).bg(C.panel).border(1).border_color(C.border)
      .child(div().text_size(10).text_color(C.muted).child(label))
      .child(div().font_family(PIXEL).text_size(20).text_color(C.cream).child(String(value)));
  }

  badge(b, earned) {
    return v_flex().id(`badge-${b.id}`).flex_1().gap(4).items_center().tooltip(`${b.name} Badge \u00b7 ${b.goal}`)
      .child(image(`mods/pokedex-trainer/badges/${b.id}.png`).size(36).flex_none()
        .when(!earned, el => el.opacity(0.25)))
      .child(div().text_size(10).text_color(earned ? C.cream : C.muted).child(b.name));
  }

  render() {
    const g = game();
    const caught = shared(CAUGHT) ?? [];
    const partners = shared(PARTNERS) ?? {};
    const team = Object.entries(g.xp).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const overlay = props()?.overlay;
    return v_flex().id("pokedex-trainer").size_full().p(16).gap(12).bg(C.screen).text_color(C.cream).font_family("Geist")
      .child(h_flex().h(30).gap(10).items_center()
        .child(div().flex_1().font_family(PIXEL).text_size(23).child("TRAINER CARD"))
        .when(Boolean(overlay), el => el.child(div().id("trainer-close").size(28).flex().items_center().justify_center()
          .rounded(4).cursor_pointer().hover(el => el.bg(C.panel)).on_click(() => closeOverlay(overlay))
          .child(svg("mods/pane/close.svg").size(13)))))
      .child(h_flex().gap(8)
        .child(this.stat("TRAINER LV", trainerLevel(g)))
        .child(this.stat("CAUGHT", `${caught.length}/151`))
        .child(this.stat("TASKS DONE", g.tasks))
        .child(this.stat("STREAK", `${liveStreak(g)}d (best ${g.streak.best})`)))
      .child(div().text_size(11).text_color(C.muted).child("BADGES"))
      .child(h_flex().gap(4).p(10).rounded(5).bg(C.panel).border(1).border_color(C.border)
        .children(BADGES.map(b => this.badge(b, g.badges.includes(b.id)))))
      .child(div().text_size(11).text_color(C.muted).child(`PARTNERS \u00b7 ${g.shiny.length} shiny`))
      .child(v_flex().flex_1().min_h(0).gap(6).overflow_y_scrollbar()
        .when(team.length === 0, el => el.child(div().text_size(12).text_color(C.muted)
          .child("No XP yet. Partners earn 25 XP each time an agent in their project finishes a task.")))
        .children(team.map(([project, xp]) => {
          const id = partners[project];
          const { level, into } = progress(xp);
          return h_flex().h(44).flex_none().px(8).gap(10).items_center().rounded(5).bg(C.lcd).text_color(C.ink)
            .when(Number.isInteger(id), el => el.child(image(`mods/pokedex-agents/pokemon/${id}.png`).size(36).flex_none()))
            .child(v_flex().flex_1().min_w(0).gap(3)
              .child(div().truncate().font_semibold().text_size(12).child(`${project}${Number.isInteger(id) ? " \u00b7 " + nameOf(id) : ""}`))
              .child(div().h(4).w_full().rounded(2).bg(C.ink + "26").child(div().h_full().rounded(2).bg(C.ink).w(`${Math.round(into * 100)}%`))))
            .child(div().flex_none().font_family(PIXEL).text_size(16).child(`Lv${level}`));
        })));
  }
}
