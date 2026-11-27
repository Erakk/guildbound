// The expedition deck. Every area has a deck of cards: the encounters that can happen there, the
// discoveries of its kind of land, its features (a rope bridge over a gorge, a find set), and three
// rare cards to chase. Each trip is dealt a hand from the area's deck, and the hand decides what
// waits on the trail.
//
// Hold opens up the deck: a new area shows a few familiar cards; every point of hold adds two more,
// and a secured area has its whole deck, rare cards included. Cards the guild has been dealt are
// remembered (seen), for the deck viewer on the Map.

import { discoveriesFor, discoveryWeight, DISCOVERY_BY_ID } from './data/discoveries';
import { ENEMY_BY_ID, REGION_BY_ID } from './data/world';
import { holdNeed, holdOf } from './hold';
import { Rng } from './rng';
import type { Biome, Focus, GameState, RegionDef } from './types';

export type CardKind = 'encounter' | 'discovery' | 'feature' | 'rare';
export interface DeckCard { id: string; kind: CardKind; name: string; text: string; icon: string }

const ENCOUNTER_CARDS: Record<string, Omit<DeckCard, 'id' | 'kind'>> = {
  ambush: { name: 'Ambush', text: 'Monsters hide in the brush on both sides of the trail.', icon: '⚔' },
  brawl: { name: 'A brawl', text: 'Two bands of monsters at each other\'s throats.', icon: '⚔' },
  escort: { name: 'The merchant\'s wagon', text: 'Walk a wagon down the road; raiders want its load.', icon: '⚐' },
  bridge: { name: 'Troll bridge', text: 'A troll wants a toll to cross the river.', icon: '≈' },
  nest: { name: 'A nest', text: 'Keeps sending out monsters until it is smashed.', icon: '✸' },
  thief: { name: 'Cutpurse', text: 'A thief snatches gold and runs for it.', icon: '✦' },
};
const FEATURE_CARDS: Record<string, Omit<DeckCard, 'id' | 'kind'>> = {
  rope: { name: 'Rope bridge', text: 'Single file across a gorge.', icon: '≍' },
  set: { name: 'Find set', text: 'Three markers to light for a secret.', icon: '◈' },
};
export const RARE_CARDS: Record<string, Omit<DeckCard, 'id' | 'kind'>> = {
  stag: { name: 'The White Stag', text: 'A creature out of the old stories. Bring it down before it is gone.', icon: '❦' },
  caravan: { name: 'The Lost Caravan', text: 'A rich caravan, lost on the road years ago.', icon: '♛' },
  shrine: { name: 'Shrine of the Old Gods', text: 'Heals the party and blesses the whole trip.', icon: '✺' },
};

// Where things can happen (kept in step with sim/encounters).
const RIVERS: Biome[] = ['plains', 'farm', 'forest', 'marsh', 'hills', 'mountain', 'snow', 'barrow', 'haunted', 'ruins'];
const NO_ROAD: Biome[] = ['sea', 'sky', 'badlands'];
const GORGES: Biome[] = ['mountain', 'hills', 'snow', 'badlands', 'forest'];
const SET_BIOMES: Biome[] = ['plains', 'hills', 'barrow', 'ruins', 'sky', 'farm', 'forest', 'marsh', 'haunted', 'mountain', 'snow', 'coast', 'sea', 'badlands'];
const NEST_FAMILIES = ['Beasts', 'Goblins', 'Undead'];
const STAG_BIOMES: Biome[] = ['plains', 'farm', 'forest', 'hills', 'mountain', 'snow', 'marsh', 'haunted'];

/** The encounters that can happen in an area. */
export function encounterKinds(r: RegionDef): string[] {
  const fams = new Set(r.enemyPool.map((p) => ENEMY_BY_ID[p.id]?.family).filter(Boolean));
  const kinds = ['ambush'];
  if (fams.size >= 2 && !r.boss) kinds.push('brawl');
  if (!NO_ROAD.includes(r.biome)) kinds.push('escort');
  if (RIVERS.includes(r.biome)) kinds.push('bridge');
  if (NEST_FAMILIES.some((f) => fams.has(f))) kinds.push('nest');
  if (fams.has('Bandits') || fams.has('Goblins') || ['farm', 'plains', 'coast'].includes(r.biome)) kinds.push('thief');
  return kinds;
}

export function cardById(id: string): DeckCard | null {
  const [kind, key] = id.split(':') as [string, string];
  if (kind === 'enc' && ENCOUNTER_CARDS[key]) return { id, kind: 'encounter', ...ENCOUNTER_CARDS[key] };
  if (kind === 'feat' && FEATURE_CARDS[key]) return { id, kind: 'feature', ...FEATURE_CARDS[key] };
  if (kind === 'rare' && RARE_CARDS[key]) return { id, kind: 'rare', ...RARE_CARDS[key] };
  if (kind === 'disc' && DISCOVERY_BY_ID[key]) return { id, kind: 'discovery', name: DISCOVERY_BY_ID[key].name, text: DISCOVERY_BY_ID[key].text, icon: '✧' };
  return null;
}

/**
 * An area's whole deck, in the order hold opens it up: two encounters and four discoveries to start,
 * then the rest in an order of the area's own, rare cards last.
 */
export function fullDeck(r: RegionDef): string[] {
  const rng = new Rng([...r.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7));
  const enc = encounterKinds(r).map((k) => `enc:${k}`);
  const disc = discoveriesFor(r.biome).map((d) => `disc:${d.id}`);
  const feat = [...(GORGES.includes(r.biome) ? ['feat:rope'] : []), ...(SET_BIOMES.includes(r.biome) ? ['feat:set'] : [])];
  const rare = [...(STAG_BIOMES.includes(r.biome) ? ['rare:stag'] : []), ...(!NO_ROAD.includes(r.biome) ? ['rare:caravan'] : []), 'rare:shrine'];
  const shuffle = (xs: string[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const e = shuffle(enc);
  const d = shuffle(disc);
  const start = [...e.slice(0, 2), ...d.slice(0, 4)];
  return [...start, ...shuffle([...e.slice(2), ...d.slice(4), ...feat]), ...shuffle(rare)];
}

/** Cards a new area shows, and how many each point of hold adds. */
export const DECK_START = 6;
export const DECK_PER_HOLD = 2;

/** The part of an area's deck the guild's hold has opened up (all of it once secured). */
export function openDeck(s: GameState, regionId: string): string[] {
  const r = REGION_BY_ID[regionId];
  if (!r) return [];
  const all = fullDeck(r);
  const hold = holdOf(s, regionId);
  if (hold >= holdNeed(r)) return all;
  return all.slice(0, DECK_START + hold * DECK_PER_HOLD);
}

/** How many cards a trip is dealt. */
export function handSize(durationSec: number, focus: Focus, curious: number): number {
  return Math.min(7, 4 + (durationSec >= 300 ? 1 : 0) + (durationSec >= 500 ? 1 : 0) + (focus === 'explore' ? 1 : 0) + (curious > 0 ? 1 : 0));
}

/** Deals a hand: weighted draws without replacement (the focus favours its discoveries; rare cards are rare). */
export function deal(rng: Rng, deck: string[], size: number, focus: Focus): string[] {
  const left = [...deck];
  const hand: string[] = [];
  const weight = (id: string) => {
    const [k, key] = id.split(':');
    if (k === 'rare') return 0.15;
    if (k === 'feat') return 0.7;
    if (k === 'disc') return DISCOVERY_BY_ID[key] ? discoveryWeight(DISCOVERY_BY_ID[key], focus) : 1;
    return 1;
  };
  while (hand.length < size && left.length) {
    const pick = rng.weighted(left.map((id) => ({ value: id, weight: weight(id) })));
    hand.push(pick);
    left.splice(left.indexOf(pick), 1);
  }
  return hand;
}

/** Cards the guild has been dealt in an area. */
export function seenCards(s: GameState, regionId: string): Set<string> {
  return new Set(s.cardsSeen?.[regionId] ?? []);
}

export function recordCards(s: GameState, regionId: string, cards: string[]): string[] {
  const seen = seenCards(s, regionId);
  const fresh = cards.filter((c) => !seen.has(c));
  if (fresh.length) s.cardsSeen = { ...(s.cardsSeen ?? {}), [regionId]: [...seen, ...fresh] };
  return fresh;
}
