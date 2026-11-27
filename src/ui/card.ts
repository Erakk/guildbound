import { cardNumber, HALL, heroCardArtUrl, spellCardArtUrl } from '../art/cards';
import { CLASS_NAMES, MAX_STARS, TRIBE_NAMES } from '../core/data/heroes';
import { def, levelCap, maxStars, power } from '../core/heroes';
import type { HeroDef, HeroInstance, OwnedSpell, Rarity, SpellDef } from '../core/types';
import { COPIES_FOR_LEVEL, maxSpellLevel } from '../core/spells';
import { h } from './dom';

export interface CardOpts {
  small?: boolean;
  ribbon?: { text: string; kind: 'new' | 'copy' | 'ess' | 'away' | 'up' };
  dim?: boolean;
  onClick?: () => void;
  /** A secret hero nobody has found: silhouette, no name. */
  secret?: boolean;
}

export function stars(n: number, max: number): HTMLElement {
  return h('span.stars', '★'.repeat(n), h('span.off', '★'.repeat(Math.max(0, max - n))));
}

/** The game clock, for wounds on cards (set by the App; Date.now until then). */
let clock: () => number = () => Date.now();
export function setCardClock(now: () => number) {
  clock = now;
}

/** "3 min" (or "40 s") until a wounded hero is back on their feet. */
export function woundLeft(hero: HeroInstance, now = clock()): string | null {
  if (!hero.woundedUntil || hero.woundedUntil <= now) return null;
  const sec = Math.ceil((hero.woundedUntil - now) / 1000);
  return sec >= 60 ? `${Math.ceil(sec / 60)} min` : `${sec} s`;
}

/** A hero card for an owned hero. Wounded heroes are greyed out with a bandage and the time left. */
export function heroCard(hero: HeroInstance, opts: CardOpts = {}): HTMLElement {
  const d = def(hero);
  const hurt = woundLeft(hero);
  const card = tradingCard({
    art: heroCardArtUrl(d), rarity: d.rarity, name: d.name, title: d.title, opts,
    stars: [hero.stars, maxStars(hero)],
    info: [`Lv ${hero.level} / ${levelCap(hero)}`, `Power ${power(hero)}`],
    text: d.trait, foot: `NO. ${String(cardNumber(d)).padStart(3, '0')} · ${HALL[d.tribe]}`,
    tip: hurt ? `${d.name} is wounded: back on their feet in ${hurt}. Can't go on trips or scout until then (the Temple can heal them sooner).` : `${d.name} ${d.title} · ${TRIBE_NAMES[d.tribe]} ${CLASS_NAMES[d.heroClass]}`,
  });
  if (hurt) {
    card.classList.add('wounded');
    card.append(h('div.tc-wound', h('b', '✚ Wounded'), h('span', `back in ${hurt}`)));
  }
  return card;
}

/** A card face for a hero definition (pack reveals, secrets, announcements). */
export function defCard(d: HeroDef, opts: CardOpts = {}): HTMLElement {
  if (opts.secret) {
    return tradingCard({
      art: heroCardArtUrl(d, true), rarity: d.rarity, name: '???', title: TRIBE_NAMES[d.tribe], opts,
      info: ['???', 'Not found yet'], text: 'A secret. Nobody knows how to find them.', foot: `NO. ??? · ${HALL[d.tribe]}`, tip: 'A secret hero',
    });
  }
  return tradingCard({
    art: heroCardArtUrl(d), rarity: d.rarity, name: d.name, title: d.title, opts,
    stars: [1, MAX_STARS[d.rarity]],
    info: [`${TRIBE_NAMES[d.tribe]}`, CLASS_NAMES[d.heroClass]],
    text: d.trait, foot: `NO. ${String(cardNumber(d)).padStart(3, '0')} · ${HALL[d.tribe]}`,
    tip: `${d.name} ${d.title} · ${TRIBE_NAMES[d.tribe]} ${CLASS_NAMES[d.heroClass]}`,
  });
}

/** A spell card: owned (with its level) or just the card face. */
export function spellCard(sp: SpellDef, owned?: OwnedSpell, opts: CardOpts & { locked?: boolean } = {}): HTMLElement {
  const max = maxSpellLevel(sp.id);
  return tradingCard({
    art: spellCardArtUrl(sp, !!opts.locked), rarity: sp.rarity, name: opts.locked ? '???' : sp.name, title: opts.locked ? `A ${sp.rarity} spell` : `${sp.mana} mana · ${sp.cooldownSec}s cooldown`,
    opts: { ...opts, dim: opts.dim || opts.locked },
    info: owned ? [`Level ${owned.level} / ${max}`, owned.level >= max ? 'Max' : `${owned.copies} / ${COPIES_FOR_LEVEL[owned.level]} copies`] : ['Spell', `Up to level ${max}`],
    text: opts.locked ? 'Not found yet. Spell cards come from packs, Grimoires above all.' : sp.description,
    foot: 'GUILDMASTER\'S SPELLBOOK', tip: opts.locked ? 'A spell not found yet' : `${sp.name}: ${sp.description}`,
  });
}

interface TradingCard {
  art: string; rarity: Rarity; name: string; title: string; opts: CardOpts;
  stars?: [number, number]; info: [string, string]; text: string; foot: string; tip: string;
}

/**
 * The card: painted art (frame, emblem, portrait, ribbon, parchment) as one cached image, with the
 * words laid over it. Every card has the pack's shape (5:7) and scales with its width.
 */
function tradingCard(c: TradingCard): HTMLElement {
  const o = c.opts;
  const el = h(`div.card.tcard.r-${c.rarity}${o.small ? '.small' : ''}${o.dim ? '.dimmed' : ''}`, { onclick: o.onClick, title: c.tip },
    h('img.tc-art', { src: c.art, alt: '', draggable: 'false' }),
    h('div.tc-name', c.name),
    h('div.tc-title', c.title),
    h('div.tc-rarity', c.rarity.toUpperCase()),
    c.stars ? h('div.tc-stars', '★'.repeat(c.stars[0]), h('span.off', '★'.repeat(Math.max(0, c.stars[1] - c.stars[0])))) : null,
    h('div.tc-info', h('span', c.info[0]), h('span', c.info[1])),
    h('div.tc-text', c.text),
    h('div.tc-foot', c.foot));
  if (o.ribbon) el.appendChild(h(`span.ribbon.${o.ribbon.kind}`, o.ribbon.text));
  return el;
}
