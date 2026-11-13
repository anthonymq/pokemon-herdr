import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { shared, props, closeOverlay } from "herdr";
import { game, quests, BADGES, ITEMS, CAUGHT, PARTNERS, progress, trainerLevel, liveStreak, nameOf, projectLabel } from "./game.js";

const C = {
  screen: "#17251f", panel: "#244438", border: "#67866c", lcd: "#d9e8bc", ink: "#244438",
  cream: "#f7eed7", cyan: "#71d5df", muted: "#b6c6b8", housing: "#9b293a", gold: "#e8c35a",
};
const PIXEL = "PxPlus IBM VGA 8x16";

// The trainer card: totals, encounter record, the eight Kanto badges, recent catches and every
// project's partner with its level.
export default class PokedexTrainer extends View {
  stat(label, value) {
    return v_flex().flex_1().min_w(0).p(10).gap(2).rounded(5).bg(C.panel).border(1).border_color(C.border)
      .child(div().text_size(10).text_color(C.muted).child(label))
      .child(div().truncate().font_family(PIXEL).text_size(20).text_color(C.cream).child(String(value)));
  }

  badge(b, earned) {
    return v_flex().id(`badge-${b.id}`).flex_1().gap(4).items_center().tooltip(`${b.name} Badge \u00b7 ${b.goal}`)
      .child((b.rank
        ? div().size(36).flex_none().rounded(18).bg(b.color).border(3).border_color(C.gold).flex().items_center().justify_center()
          .font_family(PIXEL).text_size(16).text_color(C.ink).child(b.name[0])
        : image(`mods/pokedex-trainer/badges/${b.id}.png`).size(36).flex_none())
        .when(!earned, el => el.opacity(0.25)))
      .child(div().text_size(10).text_color(earned ? C.cream : C.muted).child(b.name));
  }

  section(label) {
    return div().flex_none().text_size(11).text_color(C.muted).child(label);
  }

  render() {
    const g = game();
    const caught = shared(CAUGHT) ?? [];
    const partners = shared(PARTNERS) ?? {};
    const team = Object.entries(g.xp).sort((a, b) => b[1] - a[1]);
    const enc = g.encounters;
    const overlay = props()?.overlay;
    return v_flex().id("pokedex-trainer").size_full().p(16).gap(10).bg(C.screen).text_color(C.cream).font_family("Geist")
      .child(h_flex().h(30).flex_none().gap(10).items_center()
        .child(div().flex_1().font_family(PIXEL).text_size(23).child("TRAINER CARD"))
        .when(Boolean(overlay), el => el.child(div().id("trainer-close").size(28).flex().items_center().justify_center()
          .rounded(4).cursor_pointer().hover(el => el.bg(C.panel)).on_click(() => closeOverlay(overlay))
          .child(svg("mods/pane/close.svg").size(13)))))
      .child(h_flex().flex_none().gap(8)
        .child(this.stat("TRAINER LV", trainerLevel(g)))
        .child(this.stat("CAUGHT", `${caught.length}/151`))
        .child(this.stat("TASKS", `${g.tasks} + ${g.subtasks} sub`))
        .child(this.stat("STREAK", `${liveStreak(g)}d (best ${g.streak.best})`)))
      .child(h_flex().flex_none().gap(8)
        .child(this.stat("ENCOUNTERS", enc.seen))
        .child(this.stat("CAUGHT IN WILD", enc.caught))
        .child(this.stat("FLED", enc.fled))
        .child(this.stat("CATCH RATE", enc.caught + enc.fled ? `${Math.round(100 * enc.caught / (enc.caught + enc.fled))}%` : "-")))
      .child(this.section("BADGES"))
      .child(h_flex().flex_none().gap(4).p(10).rounded(5).bg(C.panel).border(1).border_color(C.border)
        .children(BADGES.map(b => this.badge(b, g.badges.includes(b.id)))))
      .child(this.section("BAG"))
      .child(h_flex().flex_none().gap(6).flex_wrap()
        .when(!Object.values(g.bag).some(n => n > 0), el => el.child(div().text_size(12).text_color(C.muted)
          .child("Empty. Long tasks, streak days and quests fill it.")))
        .children(Object.entries(ITEMS).filter(([k]) => g.bag[k] > 0).map(([k, it]) => h_flex().id(`bag-${k}`).h(24).px(8).gap(6)
          .items_center().rounded(4).bg(C.panel).border(1).border_color(it.color).text_size(12)
          .child(div().size(8).rounded(4).bg(it.color)).child(`${it.name} x${g.bag[k]}`))))
      .child(this.section("QUESTS"))
      .child(v_flex().flex_none().gap(4)
        .children(quests(g).map(q => h_flex().id(`quest-${q.id}`).h(24).px(8).gap(8).items_center().rounded(4)
          .bg(q.done ? C.lcd : C.panel).text_color(q.done ? C.ink : C.cream).text_size(12)
          .child(div().flex_none().font_family(PIXEL).text_size(11).child(q.weekly ? "WEEK" : "DAY"))
          .child(div().flex_1().min_w(0).truncate().child(q.goal))
          .child(div().flex_none().text_size(11).text_color(q.done ? C.ink : C.muted).child(q.done ? "Done" : `${q.n}/${q.need} \u00b7 ${q.reward}`)))))
      .child(this.section(`RECENT CATCHES \u00b7 ${g.shiny.length} shiny`))
      .child(h_flex().flex_none().h(52).gap(6).px(6).items_center().rounded(5).bg(C.panel).border(1).border_color(C.border)
        .when(g.recent.length === 0, el => el.child(div().text_size(12).text_color(C.muted).child("Nothing caught yet.")))
        .children(g.recent.map(({ id }) => div().id(`recent-${id}`).size(42).flex_none().rounded(4)
          .bg(g.shiny.includes(id) ? "#3d3a1c" : C.screen).border(1).border_color(g.shiny.includes(id) ? C.gold : C.border)
          .flex().items_center().justify_center().tooltip(`#${String(id).padStart(3, "0")} ${nameOf(id)}`)
          .child(image(`mods/pokedex-agents/pokemon/${id}.png`).size(40)))))
      .child(this.section(`PARTNERS \u00b7 ${team.length}`))
      .child(v_flex().id("trainer-partners").flex_1().min_h(0).gap(6).overflow_y_scrollbar()
        .when(team.length === 0, el => el.child(div().text_size(12).text_color(C.muted)
          .child("No XP yet. Partners earn XP each time an agent in their project finishes a task.")))
        .children(team.map(([project, xp]) => {
          const id = partners[project];
          const { level, into } = progress(xp);
          return h_flex().h(44).flex_none().px(8).gap(10).items_center().rounded(5).bg(C.lcd).text_color(C.ink)
            .tooltip(project)
            .when(Number.isInteger(id), el => el.child(image(`mods/pokedex-agents/pokemon/${id}.png`).size(36).flex_none()))
            .child(v_flex().flex_1().min_w(0).gap(3)
              .child(div().truncate().font_semibold().text_size(12).child(`${projectLabel(project)}${Number.isInteger(id) ? " \u00b7 " + nameOf(id) : ""}${g.shiny.includes(id) ? " \u2726" : ""}${g.fainted[project] ? " \u00b7 FAINTED" : ""}`))
              .child(div().h(4).w_full().rounded(2).bg(C.ink + "26").child(div().h_full().rounded(2).bg(C.ink).w(`${Math.round(into * 100)}%`))))
            .child(div().flex_none().font_family(PIXEL).text_size(16).child(`Lv${level}`));
        })));
  }
}
