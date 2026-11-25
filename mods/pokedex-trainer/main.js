import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { shared, props, closeOverlay, openOverlay } from "herdr";
import { call, shareOnX, questsNow, streakNow, weekNow, gymNow } from "./server.js";
import { game, BADGES, MEDALS, GYMS, ITEMS, CAUGHT, GIFTS, STARTERS, DAYCARE, PARTY_MAX, TIERS, TUTORIAL, STREAK_NEED, progress, partyOf, itemsFor, trainerLevel, nameOf } from "./game.js";

// One dark LCD screen; sections are tonal surfaces (panel, then raised for the lead), never outlines.
// Gold marks what's best (the lead, Gold quests, shinies); the LCD green fills progress bars.
const C = {
  screen: "#17251f", panel: "#1f3529", raised: "#2a4637", lcd: "#d9e8bc", ink: "#244438",
  cream: "#f7eed7", cyan: "#71d5df", muted: "#9fb3a4", gold: "#e8c35a", housing: "#9b293a",
};
const TIER_COLOR = ["#c98a4b", "#c9d3cc", C.gold];
const PIXEL = "PxPlus IBM VGA 8x16";

// The trainer card: who you are (lead, trainer level, totals), today's quests, the open gym (or the
// Elite Four, or the Hall of Fame), the party, the eight Kanto badges and side medals, the bag and
// recent catches. Above them while they apply: the starter choice, waiting
// gifts, Professor Oak's first steps, and once, for a save from before the party, what changed.
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

  // Sends an action; its error shows in the header.
  act(cx, action, ...args) {
    this.message = "";
    cx.spawn(async (cx) => {
      try { await call(action, ...args); } catch (error) { this.message = error.message; }
      cx.notify();
    });
  }

  section(label, right) {
    return h_flex().flex_none().pt(6).items_center()
      .child(div().flex_1().font_family(PIXEL).text_size(12).text_color(C.muted).child(label))
      .when(Boolean(right), el => el.child(right));
  }

  // A quiet text action that lights up on hover.
  link(id, label, tip, onClick) {
    return div().id(id).h(20).px(6).flex_none().flex().items_center().rounded(4).text_size(11).text_color(C.muted)
      .cursor_pointer().tooltip(tip).hover(el => el.bg(C.raised).text_color(C.cream)).on_click(onClick).child(label);
  }

  button(id, label, tip, onClick) {
    return div().id(id).h(26).px(10).flex_none().flex().items_center().rounded(4).bg(C.lcd).text_color(C.ink)
      .text_size(12).font_semibold().cursor_pointer().tooltip(tip).hover(el => el.bg(C.cyan)).on_click(onClick).child(label);
  }

  bar(into, h = 4) {
    return div().h(h).w_full().rounded(2).bg(C.screen).child(div().h_full().rounded(2).bg(C.lcd).w(`${Math.round(into * 100)}%`));
  }

  // A label over its value, for the totals beside the trainer level.
  fact(label, value, note) {
    return v_flex().min_w(0).gap(1)
      .child(div().text_size(10).text_color(C.muted).child(label))
      .child(h_flex().min_w(0).gap(4).items_end()
        .child(div().flex_none().font_family(PIXEL).text_size(14).text_color(C.cream).child(String(value)))
        .when(Boolean(note), el => el.child(div().min_w(0).truncate().text_size(10).text_color(C.muted).child(note))));
  }

  // Who you are: the lead, the trainer level and its XP, and the totals.
  identity(g, party, caught) {
    const tr = trainerLevel(g), lo = 40 * tr ** 2, hi = 40 * (tr + 1) ** 2;
    const enc = g.encounters, lead = party[0];
    const freezes = g.streak.freezes ?? 0, streak = streakNow(g);
    const frozen = freezes ? ` \u00b7 ${freezes} freeze${freezes > 1 ? "s" : ""}` : "";
    const facts = [
      this.fact("Caught", `${caught.length}/151`, g.shiny.length ? `${g.shiny.length} shiny` : null),
      this.fact("Tasks", g.tasks, g.subtasks ? `+${g.subtasks} sub` : null),
      // Until a streak starts, the week's active days toward one.
      streak ? this.fact("Streak", `${streak} day${streak > 1 ? "s" : ""}`, `best ${g.streak.best}${frozen}`)
        : this.fact("Streak", `${weekNow(g)}/${STREAK_NEED}`, `days this week \u00b7 best ${g.streak.best}${frozen}`),
      this.fact("Wild", `${enc.caught}/${enc.seen}`, enc.fled ? `${enc.fled} fled` : null),
    ];
    return h_flex().flex_none().p(10).gap(12).items_center().rounded(6).bg(C.panel)
      .when(Boolean(lead), el => el.child(image(`mods/pokedex-agents/pokemon/${lead.id}.png`).size(64).flex_none()))
      .child(v_flex().w(150).flex_none().gap(4)
        .child(div().font_family(PIXEL).text_size(20).text_color(C.cream).child(`TRAINER LV ${tr}`))
        .child(this.bar(Math.min(1, (g.lifetime - lo) / (hi - lo)), 5))
        .child(div().text_size(10).text_color(C.muted).child(`${g.lifetime} / ${hi} XP`)))
      .child(v_flex().flex_1().min_w(0).gap(6)
        .child(h_flex().gap(10).child(div().flex_1().min_w(0).child(facts[0])).child(div().flex_1().min_w(0).child(facts[1])))
        .child(h_flex().gap(10).child(div().flex_1().min_w(0).child(facts[2])).child(div().flex_1().min_w(0).child(facts[3]))));
  }

  // A Pokemon to pick (a starter, a gift): its sprite and name, clickable.
  pick(id, tip, onClick) {
    return v_flex().id(`pick-${id}`).flex_1().min_w(0).p(6).gap(2).items_center().rounded(5).bg(C.raised)
      .cursor_pointer().tooltip(tip).hover(el => el.bg(C.ink)).on_click(onClick)
      .child(image(`mods/pokedex-agents/pokemon/${id}.png`).size(64).flex_none())
      .child(div().font_family(PIXEL).text_size(13).child(nameOf(id).toUpperCase()));
  }

  // One raised panel with a pixel title, a line of text and what goes under it.
  panel(id, title, text, ...children) {
    return v_flex().id(id).flex_none().p(10).gap(8).rounded(6).bg(C.raised)
      .child(div().font_family(PIXEL).text_size(14).text_color(C.cyan).child(title))
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

  // A quest: its period, the tier reached (Bronze, Silver, Gold) in its colour, the goal for the next
  // tier, progress and what the next tier pays. A daily quest with no tier yet can be rerolled once a day.
  quest(q) {
    return h_flex().id(`quest-${q.id}`).h(26).px(8).gap(8).items_center().rounded(4).bg(C.panel).text_size(12)
      .child(div().flex_none().w(36).font_family(PIXEL).text_size(11).text_color(C.muted).child(q.weekly ? "WEEK" : "DAY"))
      .child(div().flex_none().w(46).text_size(11).font_bold().text_color(q.tier ? TIER_COLOR[q.tier - 1] : C.muted)
        .child(q.tier ? TIERS[q.tier - 1] : "\u2014"))
      .child(div().flex_1().min_w(0).truncate().text_color(q.done ? C.muted : C.cream).child(q.goal))
      .when(!q.done, el => el.child(div().flex_none().text_size(10).text_color(C.muted).child(q.reward)))
      .child(div().flex_none().w(44).text_size(12).font_semibold().text_color(q.done ? C.gold : C.cream).child(`${q.n}/${q.need}`))
      .when(q.rerollable, el => el.child(this.link(`reroll-${q.id}`, "Reroll", "Swap it for another quest (once a day)",
        (_e, cx) => { this.act(cx, "rerollQuest", q.id); cx.notify(); })));
  }

  // A party member, half the card wide: the lead (raised, gold label) or Day Care, its XP toward the next
  // level, a stone it can take (its tooltip says which evolution) and, for the Day Care, making it lead.
  member(m, i, g) {
    const { into } = progress(m.xp);
    const stones = itemsFor(m.id, g).filter(x => x.have > 0);
    return h_flex().id(`party-${m.id}`).flex_1().min_w(0).h(48).px(6).gap(8).items_center().rounded(5).bg(i === 0 ? C.raised : C.panel)
      .child(image(`mods/pokedex-agents/pokemon/${m.id}.png`).size(40).flex_none())
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(h_flex().min_w(0).gap(6).items_center()
          .child(div().min_w(0).truncate().font_semibold().text_size(12).child(nameOf(m.id)))
          .when(g.shiny.includes(m.id), el => el.child(div().flex_none().text_size(11).text_color(C.gold).child("\u2726")))
          .child(div().flex_1())
          .child(div().flex_none().font_family(PIXEL).text_size(12).child(`Lv${m.level}`)))
        .child(this.bar(into, 3))
        .child(h_flex().gap(6).items_center()
          .child(div().flex_1().min_w(0).truncate().text_size(10).text_color(i === 0 ? C.gold : C.muted)
            .child(i === 0 ? "LEAD" : `DAY CARE ${Math.round(DAYCARE * 100)}%`))
          .children(stones.map(({ item, to, have }) => div().id(`use-${m.id}-${item}`).h(16).px(4).flex_none().flex().items_center().gap(3)
            .rounded(3).text_size(10).text_color(C.cream).cursor_pointer().hover(el => el.bg(C.screen))
            .tooltip(`Use a ${ITEMS[item].name} (${have} in the bag): ${nameOf(m.id)} evolves into ${nameOf(to)}`)
            .on_click((_e, cx) => { this.act(cx, "useItem", m.id, item); cx.notify(); })
            .child(div().size(7).rounded(4).bg(ITEMS[item].color)).child(`\u2192 ${nameOf(to)}`)))
          .when(i > 0, el => el.child(div().id(`lead-${m.id}`).h(16).px(4).flex_none().flex().items_center().rounded(3)
            .text_size(10).text_color(C.muted).cursor_pointer().hover(el => el.bg(C.screen).text_color(C.cream))
            .tooltip(`Make ${nameOf(m.id)} your lead`).on_click((_e, cx) => { this.act(cx, "setLead", m.id); cx.notify(); }).child("Make lead")))));
  }

  // The party two by two.
  partyRows(party, g) {
    const rows = [];
    for (let i = 0; i < party.length; i += 2) {
      rows.push(h_flex().flex_none().gap(6)
        .child(this.member(party[i], i, g))
        .child(party[i + 1] ? this.member(party[i + 1], i + 1, g) : div().flex_1()));
    }
    return rows;
  }

  // One way to win a gym: its goal, then each part's count against its need (all parts must hold).
  option(o, i) {
    const into = Math.min(...o.parts.map(p => p.n / p.need));
    return h_flex().id(`gym-option-${i}`).h(24).px(8).gap(8).items_center().rounded(4).bg(C.raised).text_size(12)
      .child(div().flex_none().w(18).font_family(PIXEL).text_size(11).text_color(C.muted).child(i ? "OR" : ""))
      .child(div().flex_1().min_w(0).truncate().text_color(o.done ? C.muted : C.cream).child(o.goal.charAt(0).toUpperCase() + o.goal.slice(1)))
      .child(div().w(60).flex_none().child(this.bar(into, 4)))
      .child(div().flex_none().w(64).text_size(12).font_semibold().text_color(o.done ? C.gold : C.cream)
        .child(o.parts.map(p => `${p.n}/${p.need}`).join(" + ")));
  }

  // The gym that's open (any one option beats it), the Elite Four member of the week, or the Hall of Fame.
  gym(v) {
    const head = (title, note) => h_flex().gap(8).items_center()
      .child(div().flex_1().min_w(0).truncate().font_family(PIXEL).text_size(13).text_color(C.cream).child(title))
      .when(Boolean(note), el => el.child(div().flex_none().text_size(10).text_color(C.muted).child(note)));
    const box = () => v_flex().id("trainer-gym").flex_none().p(8).gap(4).rounded(6).bg(C.panel);
    if (v.gym) {
      const x = v.gym;
      return box()
        .child(h_flex().gap(8).items_center()
          .child(image(`mods/pokedex-trainer/badges/${x.id}.png`).size(20).flex_none().opacity(0.35))
          .child(div().flex_1().child(head(`${x.leader.toUpperCase()} \u00b7 ${x.name.toUpperCase()} BADGE`,
            `Gym ${x.index + 1}/${GYMS.length}${x.head ? " \u00b7 Classic head start" : ""}`))))
        .children(x.options.map((o, i) => this.option(o, i)));
    }
    if (v.league) {
      const x = v.league;
      return box()
        .child(head(`ELITE FOUR ${x.index + 1}/4 \u00b7 ${x.leader.toUpperCase()}`, x.waiting ? "From next Monday" : "This week only"))
        .children(x.options.map((o, i) => this.option(o, i)));
    }
    if (!v.fame) return null;
    return box()
      .child(head("HALL OF FAME", `Champion since ${new Date(v.fame.at).toLocaleDateString()}`))
      .child(h_flex().gap(6).children(v.fame.party.map(m => v_flex().id(`fame-${m.id}`).flex_none().items_center()
        .tooltip(`${nameOf(m.id)} Lv${m.level}${m.shiny ? " (shiny)" : ""}`)
        .child(image(`mods/pokedex-agents/pokemon/${m.id}.png`).size(40))
        .child(div().text_size(10).text_color(m.shiny ? C.gold : C.muted).child(`Lv${m.level}`)))));
  }

  // Side medals and the Classic medals (badges from before the gyms): never required for anything.
  medals(g) {
    const chip = (id, color, label, tip) => h_flex().id(id).flex_none().gap(5).items_center().text_size(11).tooltip(tip)
      .child(div().size(7).rounded(4).bg(color)).child(label);
    const classic = BADGES.filter(b => g.classic.includes(b.id));
    return h_flex().flex_none().px(10).py(6).gap_x(14).gap_y(6).flex_wrap().rounded(6).bg(C.panel)
      .children([
        ...MEDALS.filter(m => g.medals.includes(m.id)).map(m => chip(`medal-${m.id}`, m.color, m.name, m.goal)),
        ...classic.map(b => chip(`classic-${b.id}`, b.color, `Classic ${b.name}`, "A badge from before the gyms: it gave its gym a head start")),
      ]);
  }

  badge(b, earned) {
    return v_flex().id(`badge-${b.id}`).flex_1().min_w(0).gap(3).items_center().tooltip(`${b.name} Badge \u00b7 ${b.goal}`)
      .child((b.rank
        ? div().size(26).flex_none().rounded(13).bg(b.color).flex().items_center().justify_center()
          .font_family(PIXEL).text_size(12).text_color(C.ink).child(b.name[0])
        : image(`mods/pokedex-trainer/badges/${b.id}.png`).size(26).flex_none())
        .when(!earned, el => el.opacity(0.2)))
      .child(div().max_w_full().truncate().text_size(9).text_color(earned ? C.cream : C.muted).child(b.name));
  }

  // The bag as one line of items: PokeDollars and Rested XP first, then balls, stones and cables.
  bag(g) {
    const item = (id, color, label, tip) => h_flex().id(id).flex_none().gap(5).items_center().text_size(11)
      .when(Boolean(tip), el => el.tooltip(tip))
      .child(div().size(7).rounded(4).bg(color)).child(label);
    const items = [
      ...(g.money > 0 ? [item("bag-money", C.gold, `${g.money} PokeDollars`, "From Gold quests. The Poke Mart opens later.")] : []),
      ...(g.rested > 0 ? [item("bag-rested", C.cyan, `Rested: next ${g.rested} XP x2`, "Days away build it: XP counts double until it's spent.")] : []),
      ...Object.entries(ITEMS).filter(([k]) => g.bag[k] > 0).map(([k, it]) => item(`bag-${k}`, it.color, `${it.name} \u00d7${g.bag[k]}`)),
    ];
    return h_flex().flex_none().px(10).py(8).gap_x(14).gap_y(6).flex_wrap().rounded(6).bg(C.panel)
      .when(!items.length, el => el.child(div().text_size(12).text_color(C.muted).child("Empty. Long tasks, active days and quests fill it.")))
      .children(items);
  }

  render() {
    const g = game();
    const caught = shared(CAUGHT) ?? [];
    const party = partyOf(g);
    const overlay = props()?.overlay;
    const v = gymNow(g);
    const gymView = v.gym || v.league || v.fame ? v : null;
    return v_flex().id("pokedex-trainer").size_full().p(14).gap(8).bg(C.screen).border(4).border_color(C.housing).rounded(8)
      .text_color(C.cream).font_family("Geist")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.keystroke !== "s") return;
        this.share(cx);
        cx.stop_propagation();
        cx.notify();
      })
      .child(h_flex().h(30).flex_none().gap(10).items_center()
        .child(div().flex_1().font_family(PIXEL).text_size(22).child("TRAINER CARD"))
        .when(Boolean(this.message), el => el.child(div().flex_none().text_size(11).text_color(C.muted).child(this.message)))
        .child(this.button("trainer-share", "Share on X", "Post your progress on X (S)", (_e, cx) => { this.share(cx); cx.notify(); }))
        .when(Boolean(overlay), el => el.child(div().id("trainer-close").size(28).flex().items_center().justify_center()
          .rounded(4).cursor_pointer().hover(el => el.bg(C.panel)).on_click(() => closeOverlay(overlay))
          .child(svg("mods/pane/close.svg").size(13)))))
      .child(v_flex().id("trainer-body").flex_1().min_h(0).gap(6).pr(4).overflow_y_scrollbar()
        .when(g.lifetime > 0 && !g.seen.includes("phase2"), el => el.child(this.explainer()))
        .when(Array.isArray(g.tutorial), el => el.child(this.oak(g)))
        .when(party.length === 0, el => el.child(this.starter(g)))
        .children(g.gifts.pending.map(t => this.gift(t)))
        .child(this.identity(g, party, caught))
        .child(this.section("QUESTS"))
        .child(v_flex().flex_none().gap(3).children(questsNow(g).map(q => this.quest(q))))
        .when(Boolean(gymView), el => el.child(this.section(gymView.gym ? "GYM" : gymView.league ? "ELITE FOUR" : "HALL OF FAME")).child(this.gym(gymView)))
        .when(party.length > 0, el => el
          .child(this.section(`PARTY \u00b7 ${party.length}/${PARTY_MAX}`, this.link("trainer-party-edit", "Change party",
            "Add catches to your party or take them out",
            () => openOverlay({ mod: "pokedex-collection", kind: "dialog", width: 820, height: 680, props: { party: true } }))))
          .child(v_flex().flex_none().gap(6).children(this.partyRows(party, g))))
        .child(this.section("BADGES"))
        .child(h_flex().flex_none().px(6).py(8).rounded(6).bg(C.panel).children(BADGES.map(b => this.badge(b, g.badges.includes(b.id)))))
        .when(g.medals.length + g.classic.length > 0, el => el.child(this.medals(g)))
        .child(this.section("BAG"))
        .child(this.bag(g))
        .child(this.section("RECENT CATCHES"))
        .child(h_flex().flex_none().px(8).py(4).gap(4).items_center().rounded(6).bg(C.panel)
          .when(g.recent.length === 0, el => el.child(div().py(8).text_size(12).text_color(C.muted).child("Nothing caught yet.")))
          .children(g.recent.map(({ id }) => v_flex().id(`recent-${id}`).flex_none().items_center()
            .tooltip(`#${String(id).padStart(3, "0")} ${nameOf(id)}${g.shiny.includes(id) ? " (shiny)" : ""}`)
            .child(image(`mods/pokedex-agents/pokemon/${id}.png`).size(36))
            .child(div().size(4).rounded(2).bg(g.shiny.includes(id) ? C.gold : C.panel))))));
  }
}
