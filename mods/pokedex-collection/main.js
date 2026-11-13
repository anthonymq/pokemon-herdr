import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex, InputState, Input } from "gpui-base";
import { shared, setShared, props, closeOverlay, nextCommand } from "herdr";
import { POKEMON } from "./pokemon.js";
import { game } from "./game.js";

const CAUGHT = "pokedex.caught";
const PARTNERS = "pokedex.partners";
const C = {
  screen: "#17251f", panel: "#244438", border: "#67866c",
  lcd: "#d9e8bc", ink: "#244438", cream: "#f7eed7",
  cyan: "#71d5df", muted: "#b6c6b8", housing: "#9b293a",
};
const PIXEL = "PxPlus IBM VGA 8x16";
const isGen1 = id => Number.isInteger(id) && id >= 1 && id <= 151;

export default class PokedexCollection extends View {
  init(_props, cx) {
    const selected = props()?.pokemon;
    this.query = isGen1(selected) ? String(selected) : "";
    // Opened from an agent's scene with { project, partner }: a partner picker over the caught Pokemon.
    this.project = props()?.project ?? null;
    this.partner = props()?.partner ?? null;
    this.label = props()?.label ?? this.project;
    this.caughtOnly = Boolean(this.project);
    this.width = 820;
    this.error = "";
    this.input = InputState.new({
      placeholder: "Search Pokemon or number...",
      value: this.query,
    });
    this.input.on("change", (_event, cx) => {
      this.query = this.input.value();
      cx.notify();
    });
    this.input.focus();
    cx.spawn(async cx => {
      for (;;) {
        this.command(await nextCommand());
        cx.notify();
      }
    });
  }

  caught() {
    return shared(CAUGHT) ?? [];
  }

  setCaught(id, caught) {
    if (!isGen1(id)) {
      this.error = "Choose a Pokemon number from 001 to 151.";
      return;
    }
    this.error = "";
    const current = this.caught();
    if (current.includes(id) === caught) return;
    setShared(CAUGHT, caught
      ? [...current, id].sort((a, b) => a - b)
      : current.filter(value => value !== id));
  }

  command(command) {
    switch (command) {
      case "focus":
        this.input.focus();
        return;
      case "show-all":
        this.caughtOnly = false;
        return;
      case "show-caught":
        this.caughtOnly = true;
        return;
      default: {
        if (command.startsWith("search-")) {
          this.query = command.slice(7);
          this.input.set_value(this.query);
          return;
        }
        const match = /^(catch|release)-(\d+)$/.exec(command);
        if (!match) {
          this.error = "Use catch-<number> or release-<number>, from 001 to 151.";
          return;
        }
        this.setCaught(Number(match[2]), match[1] === "catch");
      }
    }
  }

  visible() {
    const query = this.query.trim().toLowerCase().replace(/^#/, "");
    const number = /^\d+$/.test(query) ? Number(query) : null;
    const caught = this.caught();
    return POKEMON.filter(p =>
      (!(this.caughtOnly || this.project) || caught.includes(p.id)) &&
      (!query || (number !== null ? p.id === number : p.name.toLowerCase().includes(query))));
  }

  filterButton(id, label, active, onClick) {
    return div().id(id).h(34).px(12).flex_none().flex().items_center()
      .rounded(5).border(1).border_color(active ? C.lcd : C.border)
      .bg(active ? C.lcd : C.panel).text_color(active ? C.ink : C.cream)
      .text_size(12).font_semibold().cursor_pointer()
      .hover(el => el.border_color(C.cyan)).on_click(onClick).child(label);
  }

  choose(id) {
    setShared(PARTNERS, { ...(shared(PARTNERS) ?? {}), [this.project]: id });
    closeOverlay(props().overlay);
  }

  card(p, caught, shiny) {
    const selected = caught.includes(p.id);
    const gold = shiny.includes(p.id);
    const partner = Boolean(this.project) && p.id === this.partner;
    return v_flex().id(`pokemon-${p.id}`).flex_1().min_w(0).h(126)
      .p(8).gap(3).items_center().rounded(5).border(1)
      .border_color(gold ? "#e8c35a" : selected ? C.cyan : C.border).when(gold, el => el.border(2))
      .bg(selected ? C.lcd : C.panel).text_color(selected ? C.ink : C.cream)
      .when(partner, el => el.border(2).border_color(C.housing))
      .when(Boolean(this.project) && selected && !partner, el => el.cursor_pointer()
        .hover(s => s.border_color(C.housing))
        .on_click(() => this.choose(p.id)))
      .child(h_flex().w_full().h(12).justify_between().items_center()
        .child(div().text_size(10).child(`#${String(p.id).padStart(3, "0")}`))
        .when(partner, el => el.child(div().text_size(10).font_bold().text_color(C.housing).child("PARTNER")))
        .when(gold, el => el.child(div().text_size(10).font_bold().text_color("#a07c12").child("\u2726 SHINY")))
        .when(selected, el => el.child(svg("mods/workspace-chrome/check.svg").size(12))))
      .child(image(`mods/pokedex-agents/pokemon/${p.id}.png`).size(48).flex_none())
      .child(h_flex().w_full().h(17).justify_center().items_center()
        .child(div().min_w(0).truncate().text_size(12).font_semibold().child(p.name)));
  }

  render() {
    const caught = this.caught();
    const shiny = game().shiny;
    const matches = this.visible();
    const columns = Math.max(1, Math.min(5, Math.floor((this.width - 24) / 136)));
    const rows = [];
    for (let i = 0; i < matches.length; i += columns) {
      const cells = matches.slice(i, i + columns);
      rows.push(h_flex().h(126).flex_none().gap(8)
        .children(cells.map(p => this.card(p, caught, shiny)))
        .children(Array.from({ length: columns - cells.length }, () => div().flex_1().min_w(0))));
    }

    return v_flex().id("pokedex-collection").size_full().min_w(0).min_h(0)
      .p(16).gap(10).bg(C.screen).text_color(C.cream).font_family("Geist")
      .on_size_change((size, cx) => {
        this.width = size.width;
        cx.notify();
      })
      .child(h_flex().h(34).flex_none().gap(10).items_center()
        .child(div().flex_1().min_w(0).truncate().font_family(PIXEL).text_size(23)
          .child(this.project ? `CHOOSE PARTNER \u00b7 ${String(this.label).toUpperCase()}` : "KANTO POKEDEX"))
        .child(div().px(10).h(28).rounded(4).bg(C.lcd).text_color(C.ink)
          .text_size(13).font_semibold().flex().items_center().child(`Caught ${caught.length} / 151`))
        .when(Boolean(props()?.overlay), el => el.child(div().id("collection-close").size(28)
          .flex_none().flex().items_center().justify_center().rounded(4)
          .cursor_pointer().hover(el => el.bg(C.panel))
          .on_click(() => closeOverlay(props().overlay))
          .child(svg("mods/pane/close.svg").size(13)))))
      .child(div().flex_none().text_size(12).text_color(C.muted)
        .child(this.project
          ? "Pick one of your caught Pokemon. It takes over this project's level and XP."
          : "Gen 1 only. A Pokemon is caught when an agent opens in its project."))
      .child(div().h(4).w_full().flex_none().rounded(2).bg(C.panel)
        .child(div().h_full().rounded(2).bg(C.cyan)
          .w(Math.max(0, this.width - 32) * caught.length / 151)))
      .child(h_flex().h(34).flex_none().gap(8).items_center()
        .child(Input.new(this.input).flex_1().min_w(0).h_full().px(10)
          .rounded(5).border(1).border_color(C.border).bg(C.panel)
          .text_size(13).text_color(C.cream))
        .when(!this.project, el => el
          .child(this.filterButton("collection-all", "All 151", !this.caughtOnly,
            (_event, cx) => { this.caughtOnly = false; cx.notify(); }))
          .child(this.filterButton("collection-caught", "Caught", this.caughtOnly,
            (_event, cx) => { this.caughtOnly = true; cx.notify(); }))))
      .child(div().h(18).flex_none().text_size(11)
        .text_color(this.error ? "#ffb9b1" : C.muted)
        .child(this.error || "Saved on this device."))
      .child(v_flex().id("collection-grid").flex_1().min_h(0).gap(8).pr(4)
        .overflow_y_scrollbar().mode("always")
        .children(rows)
        .when(matches.length === 0, el => el.child(v_flex().flex_1().items_center()
          .justify_center().gap(8).py(30)
          .child(div().font_semibold().child(this.caughtOnly && caught.length === 0 ? "No catches yet" : "No Pokemon found"))
          .child(div().text_size(12).text_color(C.muted).child("Choose All or search a name or number from 001 to 151."))
          .child(this.filterButton("collection-reset-filter", "Show all Pokemon", false,
            (_event, cx) => {
              this.query = "";
              this.input.set_value("");
              this.caughtOnly = false;
              cx.notify();
            })))))
      .child(div().h(16).flex_none().text_size(11).text_color(C.muted)
        .child(`${matches.length} shown \u00b7 Bulbasaur #001 to Mew #151`));
  }
}
