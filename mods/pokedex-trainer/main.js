import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { shared, props, closeOverlay, openOverlay } from "herdr";
import { call, shareOnX } from "./server.js";
import { game, quests, BADGES, ITEMS, CAUGHT, GIFTS, STARTERS, DAYCARE, PARTY_MAX, TIERS, TUTORIAL, progress, partyOf, itemsFor, trainerLevel, liveStreak, nameOf } from "./game.js";

const C = {
  screen: "#17251f", panel: "#244438", border: "#67866c", lcd: "#d9e8bc", ink: "#244438",
  cream: "#f7eed7", cyan: "#71d5df", muted: "#b6c6b8", housing: "#9b293a", gold: "#e8c35a",
};
const PIXEL = "PxPlus IBM VGA 8x16";

// The trainer card: the starter choice, waiting gifts, totals, the party (lead, Day Care, stones),
// the encounter record, the eight Kanto badges, the bag, quests and recent catches. Once, for a save
// from before the party, a short explainer of what changed; for a new save, Professor Oak's first steps.
export default class PokedexTrainer extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.message = "";
    // Opening the card is one of Professor Oak's steps.
    call("seen", "trainer").catch(() => {});
  }

  share(cx) {
    this.message = "Opening X...";
    cx.spawn(async (cx) => {
      try { this.message = await shareOnX(); } catch (error) { this.message = `Share failed: ${error.message}`; }
      cx.notify();
    });
  }

  // A tile's number stays whole; `note` (a second, smaller figure) sits beside it and is what shortens.
  stat(label, value, note) {
    return v_flex().flex_1().min_w(0).p(10).gap(2).rounded(5).bg(C.panel).border(1).border_color(C.border)
      .child(div().text_size(10).text_color(C.muted).child(label))
      .child(h_flex().min_w(0).gap(5).items_end()
        .child(div().flex_none().font_family(PIXEL).text_size(20).text_color(C.cream).child(String(value)))
        .when(Boolean(note), el => el.child(div().flex_1().min_w(0).truncate().pb(4).text_size(10).text_color(C.muted).child(note))));
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

  // Sends an action; its error shows in the header.
  act(cx, action, ...args) {
    this.message = "";
    cx.spawn(async (cx) => {
      try { await call(action, ...args); } catch (error) { this.message = error.message; }
      cx.notify();
    });
  }

  button(id, label, tip, onClick) {
    return div().id(id).h(24).px(8).flex_none().flex().items_center().rounded(4).bg(C.lcd).text_color(C.ink)
      .text_size(11).font_semibold().cursor_pointer().tooltip(tip).hover(el => el.bg(C.cyan)).on_click(onClick).child(label);
  }

  // A Pokemon to pick (a starter, a gift): its sprite and name on a clickable LCD card.
  pick(id, tip, onClick) {
    return v_flex().id(`pick-${id}`).flex_1().min_w(0).p(6).gap(2).items_center().rounded(5).bg(C.lcd).text_color(C.ink)
      .border(2).border_color(C.lcd).cursor_pointer().tooltip(tip).hover(el => el.border_color(C.housing))
      .on_click(onClick)
      .child(image(`mods/pokedex-agents/pokemon/${id}.png`).size(72).flex_none())
      .child(div().font_family(PIXEL).text_size(14).child(nameOf(id).toUpperCase()));
  }

  // One panel with a pixel title, a line of text and what goes under it.
  panel(id, title, text, ...children) {
    return v_flex().id(id).flex_none().p(10).gap(8).rounded(5).bg(C.panel).border(2).border_color(C.cyan)
      .child(div().font_family(PIXEL).text_size(16).text_color(C.cyan).child(title))
      .when(Boolean(text), el => el.child(div().text_size(12).child(text)))
      .children(children);
  }

  // Shown once to a save that had progress before the party: dismissing it marks "phase2" seen.
  explainer() {
    const steps = [
      "One party for everything: the XP your agents earn goes to your lead, whichever project they work in. The rest of the party gets 25% at the Day Care.",
      "Projects keep their Pokemon as mascots, drawn on their cards. Change one by clicking its card's Pokemon.",
      "Your trainer level grows with all the XP you've ever earned. Gifts wait at trainer levels 5, 10, 15, 20 and 30.",
    ];
    return this.panel("trainer-phase2", "NEW POKEDEX", null,
      ...steps.map((s, i) => h_flex().gap(8).items_start().text_size(12)
        .child(div().flex_none().font_family(PIXEL).text_size(14).text_color(C.lcd).child(`${i + 1}`))
        .child(div().flex_1().min_w(0).child(s))),
      h_flex().child(div().flex_1()).child(this.button("trainer-phase2-ok", "Got it", "Don't show this again",
        (_e, cx) => { this.act(cx, "seen", "phase2"); cx.notify(); })));
  }

  // Professor Oak's five first steps, while the tutorial lasts.
  oak(g) {
    return this.panel("trainer-oak", `PROFESSOR OAK \u00b7 ${g.tutorial.length}/${TUTORIAL.length}`,
      "Five first steps. Finish them for 5 Poke Balls and your Pokedex.",
      ...TUTORIAL.map(t => h_flex().gap(8).items_center().text_size(12)
        .child(div().flex_none().w(14).font_family(PIXEL).text_size(14).text_color(g.tutorial.includes(t.id) ? C.lcd : C.muted)
          .child(g.tutorial.includes(t.id) ? "\u2713" : "\u00b7"))
        .child(div().flex_1().min_w(0).text_color(g.tutorial.includes(t.id) ? C.muted : C.cream).child(t.goal))));
  }

  // A quest: its period, the tier reached (Bronze, Silver, Gold), the goal for the next tier and what
  // it pays. A daily quest with no tier yet can be rerolled once a day.
  quest(q) {
    return h_flex().id(`quest-${q.id}`).h(24).px(8).gap(8).items_center().rounded(4)
      .bg(q.done ? C.lcd : C.panel).text_color(q.done ? C.ink : C.cream).text_size(12)
      .child(div().flex_none().w(34).font_family(PIXEL).text_size(11).child(q.weekly ? "WEEK" : "DAY"))
      .when(q.tier > 0, el => el.child(div().flex_none().px(5).rounded(3).text_size(10).font_bold().text_color(C.ink)
        .bg(["#c98a4b", C.muted, C.gold][q.tier - 1]).child(TIERS[q.tier - 1])))
      .child(div().flex_1().min_w(0).truncate().child(q.goal))
      .child(div().flex_none().text_size(11).text_color(q.done ? C.ink : C.muted).child(q.done ? `${q.n}/${q.need}` : `${q.n}/${q.need} \u00b7 ${q.reward}`))
      .when(q.rerollable, el => el.child(div().id(`reroll-${q.id}`).h(18).px(6).flex_none().flex().items_center().rounded(3)
        .border(1).border_color(C.border).text_size(10).cursor_pointer().tooltip("Swap it for another quest (once a day)")
        .hover(el => el.bg(C.screen)).on_click((_e, cx) => { this.act(cx, "rerollQuest", q.id); cx.notify(); }).child("Reroll")));
  }

  starter(g) {
    return this.panel("trainer-starter", "CHOOSE YOUR STARTER",
      `It leads your party: every XP your agents earn goes to it.${g.bank ? ` ${g.bank} XP is already waiting for it.` : ""}`,
      h_flex().gap(8).children(STARTERS.map(id => this.pick(id, `Choose ${nameOf(id)}`,
        (_e, cx) => { this.act(cx, "chooseStarter", id); cx.notify(); }))));
  }

  gift(tr) {
    const ids = GIFTS.find(x => x.tr === tr)?.ids ?? [];
    return this.panel(`trainer-gift-${tr}`, `TRAINER LV ${tr} GIFT`, "Choose one. It joins your Pokedex.",
      h_flex().gap(8).children(ids.map(id => this.pick(id, `Take ${nameOf(id)}`,
        (_e, cx) => { this.act(cx, "claimGift", tr, id); cx.notify(); }))));
  }

  // A party member: the lead or Day Care, its XP toward the next level, and what it can do.
  member(m, i, g) {
    const { into } = progress(m.xp);
    const stones = itemsFor(m.id, g).filter(x => x.have > 0);
    return h_flex().id(`party-${m.id}`).h(52).flex_none().px(8).gap(10).items_center().rounded(5).bg(C.lcd).text_color(C.ink)
      .when(i === 0, el => el.border(2).border_color(C.housing))
      .child(image(`mods/pokedex-agents/pokemon/${m.id}.png`).size(44).flex_none())
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(h_flex().gap(6).items_center()
          .child(div().min_w(0).truncate().font_semibold().text_size(12).child(`${nameOf(m.id)}${g.shiny.includes(m.id) ? " \u2726" : ""}`))
          .child(div().flex_none().text_size(10).font_bold().text_color(i === 0 ? C.housing : C.ink + "99")
            .child(i === 0 ? "LEAD" : `DAY CARE ${Math.round(DAYCARE * 100)}%`)))
        .child(div().h(4).w_full().rounded(2).bg(C.ink + "26").child(div().h_full().rounded(2).bg(C.ink).w(`${Math.round(into * 100)}%`)))
        .child(div().text_size(10).text_color(C.ink + "b3").child(`${m.xp} XP`)))
      .children(stones.map(({ item, to, have }) => div().id(`use-${m.id}-${item}`).h(22).px(6).flex_none().flex().items_center().gap(4)
        .rounded(4).border(1).border_color(ITEMS[item].color).text_size(10).cursor_pointer().hover(el => el.bg(C.cream))
        .tooltip(`Use a ${ITEMS[item].name} (${have} in the bag): ${nameOf(m.id)} evolves into ${nameOf(to)}`)
        .on_click((_e, cx) => { this.act(cx, "useItem", m.id, item); cx.notify(); })
        .child(div().size(7).rounded(4).bg(ITEMS[item].color)).child(`\u2192 ${nameOf(to)}`)))
      .when(i > 0, el => el.child(this.button(`lead-${m.id}`, "Lead", `Make ${nameOf(m.id)} your lead`,
        (_e, cx) => { this.act(cx, "setLead", m.id); cx.notify(); })))
      .child(div().w(44).flex_none().font_family(PIXEL).text_size(16).child(`Lv${m.level}`));
  }

  render() {
    const g = game();
    const caught = shared(CAUGHT) ?? [];
    const party = partyOf(g);
    const tr = trainerLevel(g);
    const enc = g.encounters;
    const overlay = props()?.overlay;
    return v_flex().id("pokedex-trainer").size_full().p(16).gap(10).bg(C.screen).text_color(C.cream).font_family("Geist")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.keystroke !== "s") return;
        this.share(cx);
        cx.stop_propagation();
        cx.notify();
      })
      .child(h_flex().h(30).flex_none().gap(10).items_center()
        .child(div().flex_1().font_family(PIXEL).text_size(23).child("TRAINER CARD"))
        .when(Boolean(this.message), el => el.child(div().flex_none().text_size(11).text_color(C.muted).child(this.message)))
        .child(div().id("trainer-share").h(26).px(10).flex_none().flex().items_center().rounded(4).bg(C.lcd).text_color(C.ink)
          .text_size(12).font_semibold().cursor_pointer().tooltip("Post your progress on X (S)").hover(el => el.bg(C.cyan))
          .on_click((_e, cx) => { this.share(cx); cx.notify(); }).child("Share on X"))
        .when(Boolean(overlay), el => el.child(div().id("trainer-close").size(28).flex().items_center().justify_center()
          .rounded(4).cursor_pointer().hover(el => el.bg(C.panel)).on_click(() => closeOverlay(overlay))
          .child(svg("mods/pane/close.svg").size(13)))))
      .child(v_flex().id("trainer-body").flex_1().min_h(0).gap(10).pr(4).overflow_y_scrollbar()
      .when(g.lifetime > 0 && !g.seen.includes("phase2"), el => el.child(this.explainer()))
      .when(Array.isArray(g.tutorial), el => el.child(this.oak(g)))
      .when(party.length === 0, el => el.child(this.starter(g)))
      .children(g.gifts.pending.map(t => this.gift(t)))
      .child(h_flex().flex_none().gap(8)
        .child(this.stat("TRAINER LV", tr, `${g.lifetime} XP \u00b7 next ${40 * (tr + 1) ** 2}`))
        .child(this.stat("CAUGHT", `${caught.length}/151`))
        .child(this.stat("TASKS", g.tasks, `+${g.subtasks} sub`))
        .child(this.stat("STREAK", `${liveStreak(g)}d`, `best ${g.streak.best}d \u00b7 ${g.streak.freezes ?? 0} freeze${g.streak.freezes === 1 ? "" : "s"}`)))
      .child(h_flex().flex_none().gap(8)
        .child(this.stat("ENCOUNTERS", enc.seen))
        .child(this.stat("CAUGHT IN WILD", enc.caught))
        .child(this.stat("FLED", enc.fled))
        .child(this.stat("CATCH RATE", enc.caught + enc.fled ? `${Math.round(100 * enc.caught / (enc.caught + enc.fled))}%` : "-")))
      .when(party.length > 0, el => el
        .child(h_flex().flex_none().items_center()
          .child(div().flex_1().child(this.section(`PARTY \u00b7 ${party.length}/${PARTY_MAX}`)))
          .child(this.button("trainer-party-edit", "Change party", "Add catches to your party or take them out",
            () => openOverlay({ mod: "pokedex-collection", kind: "dialog", width: 820, height: 680, props: { party: true } }))))
        .child(v_flex().flex_none().gap(6).children(party.map((m, i) => this.member(m, i, g)))))
      .child(this.section("BADGES"))
      .child(h_flex().flex_none().gap(4).p(10).rounded(5).bg(C.panel).border(1).border_color(C.border)
        .children(BADGES.map(b => this.badge(b, g.badges.includes(b.id)))))
      .child(this.section("BAG"))
      .child(h_flex().flex_none().gap(6).flex_wrap()
        .when(!Object.values(g.bag).some(n => n > 0) && !g.money && !g.rested, el => el.child(div().text_size(12).text_color(C.muted)
          .child("Empty. Long tasks, active days and quests fill it.")))
        .when(g.money > 0, el => el.child(h_flex().id("bag-money").h(24).px(8).gap(6).items_center().rounded(4).bg(C.panel)
          .border(1).border_color(C.gold).text_size(12).tooltip("From Gold quests. The Poke Mart opens later.")
          .child(div().size(8).rounded(4).bg(C.gold)).child(`PokeDollars ${g.money}`)))
        .when(g.rested > 0, el => el.child(h_flex().id("bag-rested").h(24).px(8).gap(6).items_center().rounded(4).bg(C.panel)
          .border(1).border_color(C.cyan).text_size(12).tooltip("Days away build it: XP counts double until it's spent.")
          .child(div().size(8).rounded(4).bg(C.cyan)).child(`Rested: next ${g.rested} XP x2`)))
        .children(Object.entries(ITEMS).filter(([k]) => g.bag[k] > 0).map(([k, it]) => h_flex().id(`bag-${k}`).h(24).px(8).gap(6)
          .items_center().rounded(4).bg(C.panel).border(1).border_color(it.color).text_size(12)
          .child(div().size(8).rounded(4).bg(it.color)).child(`${it.name} x${g.bag[k]}`))))
      .child(this.section("QUESTS"))
      .child(v_flex().flex_none().gap(4)
        .children(quests(g).map(q => this.quest(q))))
      .child(this.section(`RECENT CATCHES \u00b7 ${g.shiny.length} shiny`))
      .child(h_flex().flex_none().h(52).gap(6).px(6).items_center().rounded(5).bg(C.panel).border(1).border_color(C.border)
        .when(g.recent.length === 0, el => el.child(div().text_size(12).text_color(C.muted).child("Nothing caught yet.")))
        .children(g.recent.map(({ id }) => div().id(`recent-${id}`).size(42).flex_none().rounded(4)
          .bg(g.shiny.includes(id) ? "#3d3a1c" : C.screen).border(1).border_color(g.shiny.includes(id) ? C.gold : C.border)
          .flex().items_center().justify_center().tooltip(`#${String(id).padStart(3, "0")} ${nameOf(id)}`)
          .child(image(`mods/pokedex-agents/pokemon/${id}.png`).size(40))))));
  }
}
