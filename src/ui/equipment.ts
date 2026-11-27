import { SLOT_ICON, itemIconSvg } from '../art/items';
import { spriteSvg } from '../art/sprites';
import { canWear, ITEM_BY_ID, wornBy } from '../core/data/items';
import { CLASS_NAMES } from '../core/data/heroes';
import { def } from '../core/heroes';
import { heroCombat } from '../core/sim/expedition';
import * as town from '../core/town';
import type { GearSlot, HeroInstance, ItemDef, ItemInstance } from '../core/types';
import type { App } from './app';
import { h, setChildren, svgEl } from './dom';

const SLOT_LABEL: Record<GearSlot, string> = { main: 'Weapon', off: 'Off hand', armor: 'Armor', jewelry: 'Jewelry' };
const TIER_NAME = ['', 'Iron tier', 'Steel tier', 'Mithril tier'];
/** What each attribute does, in a few words. */
const STAT_HINT: Record<string, string> = {
  might: 'strength: harder blows with heavy weapons',
  finesse: 'skill: bows, daggers and critical hits',
  arcana: 'magic: spells and healing',
  vigor: 'toughness: more health',
  resolve: 'nerve: armor and courage',
};
const SLOTS: GearSlot[] = ['main', 'off', 'armor', 'jewelry'];
const ORDER: Record<GearSlot, number> = { main: 0, off: 1, armor: 2, jewelry: 3 };
type Filter = 'all' | GearSlot;
/** The backpack always shows at least this many cells, so it looks like a bag with room in it. */
const MIN_CELLS = 30;

/**
 * The hero's gear as a backpack: a paper doll with the four slots around the hero, and every item the guild
 * owns in a grid beside it. Drag an item onto a slot (or double-click it) to put it on; drag it off the doll
 * (or press Take off) to put it back. Hovering or clicking an item shows what it would change.
 */
export function equipmentPanel(app: App, hero: HeroInstance, rerender: () => void): HTMLElement {
  const game = app.game;
  const s = game.state;
  const away = game.isAway(hero.uid);
  const cls = def(hero).heroClass;
  let filter: Filter = 'all';
  /** The item whose card is pinned open (clicked), if any. */
  let selected: string | null = null;
  let dragging: { uid: string; from: GearSlot | null } | null = null;

  const panel = h('div.panel.col.bp', { style: { gap: '10px', position: 'relative' } });
  const hint = h('div.bp-hint');
  // The item card: next to an item while the mouse is on it, and pinned open by a click.
  const pop = h('div.bp-pop', { style: { display: 'none' }, onclick: (e: Event) => e.stopPropagation() });

  const itemOf = (uid: string | undefined): ItemInstance | undefined => (uid ? s.items.find((i) => i.uid === uid) : undefined);
  const defOf = (uid: string | undefined): ItemDef | undefined => {
    const it = itemOf(uid);
    return it ? ITEM_BY_ID[it.defId] : undefined;
  };
  const wearable = (d: ItemDef) => canWear(cls, d);
  const tierCls = (d: ItemDef) => (d.named ? '.named' : `.t${d.tier}`);

  /** The hero's fight numbers with this item on instead (two-handed weapons take the off hand too). */
  const compare = (uid: string) => {
    const d = defOf(uid)!;
    const before = heroCombat(hero, town.gearDefs(s, hero));
    const gear = { ...hero.gear, [d.slot]: uid };
    if (d.slot === 'main' && d.hands === 2) delete gear.off;
    if (d.slot === 'off' && defOf(gear.main)?.hands === 2) delete gear.main;
    const after = heroCombat(hero, Object.values(gear).map((u) => defOf(u)).filter((x): x is ItemDef => !!x));
    const rows: [string, number][] = [['Damage', after.atk - before.atk], ['Armor', after.def - before.def], ['Health', after.maxHp - before.maxHp], ['Healing', after.heal - before.heal], ['Speed', after.speed - before.speed]];
    return rows.filter(([, v]) => Math.abs(v) >= 0.5).map(([k, v]) => h(`span.bp-delta${v > 0 ? '.up' : '.down'}`, `${k} ${v > 0 ? '+' : ''}${Math.round(v)}`));
  };

  const drop = (el: HTMLElement, accepts: () => boolean, onDrop: () => void) => {
    el.addEventListener('dragover', (e) => {
      if (!dragging || !accepts()) return;
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget as Node | null)) el.classList.remove('drag-over');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (dragging && accepts()) onDrop();
      dragging = null;
    });
  };
  const drag = (el: HTMLElement, uid: string, from: GearSlot | null) => {
    if (away) return;
    el.draggable = true;
    el.addEventListener('dragstart', (e) => {
      dragging = { uid, from };
      e.dataTransfer?.setData('text/plain', uid);
      panel.classList.add('dragging-' + ITEM_BY_ID[itemOf(uid)!.defId].slot);
      requestAnimationFrame(() => el.classList.add('lifted'));
    });
    el.addEventListener('dragend', () => {
      dragging = null;
      el.classList.remove('lifted');
      SLOTS.forEach((sl) => panel.classList.remove('dragging-' + sl));
      panel.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));
    });
  };

  const put = (uid: string) => {
    if (!wearable(ITEM_BY_ID[itemOf(uid)!.defId])) return;
    const owner = town.itemOwner(s, uid);
    if (owner && owner.uid !== hero.uid && game.isAway(owner.uid)) return;
    game.equip(hero.uid, uid);
    selected = uid;
    rerender();
  };
  const takeOff = (slot: GearSlot) => {
    game.unequip(hero.uid, slot);
    rerender();
  };

  const cell = (it: ItemInstance) => {
    const d = ITEM_BY_ID[it.defId];
    const el: HTMLElement = h(`div.bp-cell${tierCls(d)}${selected === it.uid ? '.sel' : ''}${wearable(d) ? '' : '.cant'}`, {
      'data-uid': it.uid,
      onclick: (e: Event) => { e.stopPropagation(); pin(it.uid); },
      ondblclick: () => { if (!away) put(it.uid); },
      onmouseenter: () => showPop(it.uid, el),
      onmouseleave: () => restorePop(),
    }, svgEl(itemIconSvg(d), 'bp-icon'),
    wearable(d) ? null : h('span.bp-warn', { title: `A ${CLASS_NAMES[cls]} can't use this` }, '✕'),
    d.tier > 1 && !d.named ? h('span.bp-tier', 'I'.repeat(d.tier)) : null);
    if (wearable(d)) drag(el, it.uid, null);
    return el;
  };

  const slotBox = (slot: GearSlot) => {
    const uid = hero.gear[slot];
    const d = defOf(uid);
    const blocked = slot === 'off' && !d && defOf(hero.gear.main)?.hands === 2;
    const el: HTMLElement = h(`div.bp-slot.s-${slot}${d ? tierCls(d) : ''}${uid && selected === uid ? '.sel' : ''}`, {
      title: d ? '' : blocked ? 'Both hands are on the two-handed weapon' : `${SLOT_LABEL[slot]}: empty`,
      'data-uid': uid ?? '',
      onclick: (e: Event) => { e.stopPropagation(); if (uid) pin(uid); },
      ondblclick: () => { if (uid && !away) takeOff(slot); },
      onmouseenter: () => { if (uid) showPop(uid, el); },
      onmouseleave: () => restorePop(),
    }, d ? svgEl(itemIconSvg(d), 'bp-icon') : h('span.bp-empty', { html: SLOT_ICON[slot] }), h('span.bp-slot-lbl', blocked ? 'Two hands' : SLOT_LABEL[slot]));
    if (uid) drag(el, uid, slot);
    if (!away) drop(el, () => !!dragging && ITEM_BY_ID[itemOf(dragging.uid)!.defId].slot === slot && wearable(ITEM_BY_ID[itemOf(dragging.uid)!.defId]), () => put(dragging!.uid));
    return el;
  };

  /** The item card: what it is, what every number on it does, and what it would change for this hero. */
  const popContent = (uid: string, pinned: boolean) => {
    const d = defOf(uid)!;
    const owner = town.itemOwner(s, uid);
    const worn = owner?.uid === hero.uid;
    const rows: HTMLElement[] = [];
    const row = (label: string, value: number, what: string) =>
      rows.push(h('div.pop-row', h('b', { style: { color: value > 0 ? '#9fe09a' : '#f0a08a' } }, `${value > 0 ? '+' : ''}${value} ${label}`), h('span', what)));
    if (d.atk) row('damage', d.atk, 'added to every hit');
    if (d.def) row('armor', d.def, 'taken off every hit the wearer takes');
    if (d.hp) row('health', d.hp, 'more hit points');
    for (const [k, v] of Object.entries(d.stats)) row(k, v!, STAT_HINT[k] ?? '');
    if (d.speed) row('speed', d.speed, d.speed < 0 ? 'heavy: the wearer walks slower' : 'the wearer walks faster');
    const users = d.slot === 'jewelry' ? [] : wornBy(d).map((c) => CLASS_NAMES[c]);
    const can = wearable(d);
    const deltas = worn || !can ? [] : compare(uid);
    return [
      h('div.pop-head', svgEl(itemIconSvg(d), `bp-big${tierCls(d).replace('.', ' ')}`),
        h('div.col', { style: { gap: '1px' } },
          h('b', { style: { color: d.named ? '#f1d27a' : '#f6e9c9', fontSize: '15px' } }, d.name),
          h('span.dim', { style: { fontSize: '12px' } }, `${d.named ? 'Named, one of a kind' : TIER_NAME[d.tier]} · ${SLOT_LABEL[d.slot]}${d.slot === 'main' ? (d.hands === 2 ? ', two hands' : ', one hand') : ''}`))),
      h('div.col', { style: { gap: '3px' } }, rows),
      d.hands === 2 ? h('div.pop-note', 'Takes both hands: nothing in the off hand.') : null,
      d.kind === 'shield' ? h('div.pop-note', 'Needs a one-handed weapon (or none).') : null,
      users.length ? h('div.pop-note', `Worn by: ${users.join(', ')}.`) : h('div.pop-note', 'Anyone can wear it.'),
      d.lore ? h('div.pop-lore', d.lore) : null,
      worn ? h('div.pop-note', { style: { color: '#9ec3f0' } }, `${def(hero).name} is wearing it.`)
        : !can ? h('div.pop-note', { style: { color: '#f0a08a' } }, `${def(hero).name} can't use it: ${/^[AEIOU]/.test(CLASS_NAMES[cls]) ? 'an' : 'a'} ${CLASS_NAMES[cls]} doesn't wear this.`)
        : h('div.col', { style: { gap: '4px' } }, h('span.dim', { style: { fontSize: '12px' } }, `For ${def(hero).name}, instead of what is on now:`),
          deltas.length ? h('div.row.wrap', { style: { gap: '5px' } }, deltas) : h('span.dim', { style: { fontSize: '12px' } }, 'No change in a fight.')),
      pinned && !away ? h('div.row', { style: { gap: '6px', justifyContent: 'flex-end' } },
        worn ? h('button.btn.secondary.small', { onclick: () => takeOff(d.slot) }, 'Take off') : can ? h('button.btn.small', { onclick: () => put(uid) }, 'Put on') : null,
        h('button.btn.secondary.small', { onclick: () => pin(null) }, 'Close')) : null,
    ];
  };
  const place = (anchor: HTMLElement) => {
    const pr = panel.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const w = 290;
    let left = ar.right - pr.left + 10;
    if (left + w > pr.width - 4) left = ar.left - pr.left - w - 10;
    pop.style.left = `${Math.max(4, left)}px`;
    pop.style.top = `${Math.max(4, Math.min(ar.top - pr.top - 8, pr.height - pop.offsetHeight - 4))}px`;
  };
  const showPop = (uid: string, anchor: HTMLElement, pinned = selected === uid) => {
    if (dragging) return;
    setChildren(pop, popContent(uid, pinned));
    pop.classList.toggle('pinned', pinned);
    pop.style.display = '';
    place(anchor);
  };
  /** The mouse left an item: back to the pinned card, or nothing. */
  const restorePop = () => {
    const a = selected ? panel.querySelector<HTMLElement>(`[data-uid="${selected}"]`) : null;
    if (selected && a) showPop(selected, a, true);
    else pop.style.display = 'none';
  };
  const pin = (uid: string | null) => {
    selected = selected === uid ? null : uid;
    panel.querySelectorAll('.bp-cell.sel, .bp-slot.sel').forEach((n) => n.classList.remove('sel'));
    if (selected) panel.querySelector(`[data-uid="${selected}"]`)?.classList.add('sel');
    restorePop();
  };
  // A click anywhere else in the backpack closes the pinned card.
  panel.addEventListener('click', () => { if (selected) pin(null); });

  const draw = () => {
    const c = heroCombat(hero, town.gearDefs(s, hero));
    // The bag holds what nobody is wearing; this hero's gear is on the doll, and other heroes keep theirs.
    const worn = new Set(s.roster.flatMap((x) => Object.values(x.gear)));
    const bag = s.items
      .filter((i) => !worn.has(i.uid))
      .filter((i) => filter === 'all' || ITEM_BY_ID[i.defId].slot === filter)
      .sort((a, b) => {
        const x = ITEM_BY_ID[a.defId];
        const y = ITEM_BY_ID[b.defId];
        return ORDER[x.slot] - ORDER[y.slot] || Number(!!y.named) - Number(!!x.named) || y.tier - x.tier || x.name.localeCompare(y.name);
      });
    const grid = h('div.bp-grid', bag.map(cell), Array.from({ length: Math.max(MIN_CELLS, Math.ceil(bag.length / 10) * 10) - bag.length }, () => h('div.bp-cell.empty')));
    // Dropping something from the doll back into the bag takes it off.
    if (!away) drop(grid, () => !!dragging && dragging.from !== null, () => takeOff(dragging!.from!));
    const counts = (f: Filter) => s.items.filter((i) => !worn.has(i.uid) && (f === 'all' || ITEM_BY_ID[i.defId].slot === f)).length;
    setChildren(panel,
      h('div.row', { style: { alignItems: 'baseline' } }, h('div.section-title.grow', { style: { margin: '0' } }, 'GEAR AND BACKPACK'),
        h('span.dim', { style: { fontSize: '13px' } }, `Damage ${Math.round(c.atk)} · Armor ${Math.round(c.def)} · Health ${Math.round(c.maxHp)}`)),
      h('div.bp-body',
        h('div.bp-doll',
          slotBox('main'), slotBox('armor'),
          h('div.bp-figure', { html: spriteSvg(`hero:${hero.defId}`, 120) }),
          slotBox('off'), slotBox('jewelry')),
        h('div.col.grow', { style: { gap: '6px', minWidth: '0' } },
          h('div.bp-filters', (['all', 'main', 'off', 'armor', 'jewelry'] as Filter[]).map((f) => h(`button${filter === f ? '.on' : ''}`, { onclick: () => { filter = f; draw(); } },
            f === 'all' ? 'All' : SLOT_LABEL[f], h('span', String(counts(f)))))),
          grid)),
      hint,
      pop,
    );
    setChildren(hint, h('span.dim', away
      ? 'On an expedition: gear can be changed when they return.'
      : 'Point at an item to see what it does; click it to keep its card open. Drag it onto a slot to put it on (or double-click it), and back into the bag to take it off.'));
    requestAnimationFrame(() => restorePop());
  };

  draw();
  return panel;
}
