import { HERO_BY_ID, MAX_STARS } from './data/heroes';
import type { GameState, HeroDef, HeroInstance, Material, Rarity, Stats, Tribe } from './types';

// Star bonuses from the design: +10%, +10%, +10%, +15%, +15% (compounding).
const STAR_MULT = [1, 1, 1.1, 1.21, 1.331, 1.531, 1.76];
/** Copies needed to go from N stars to N+1. Index = current stars. */
export const COPIES_FOR_STAR = [0, 1, 2, 4, 8, 12];

export function def(h: HeroInstance): HeroDef {
  return HERO_BY_ID[h.defId];
}

/**
 * Awakening: a hero at their last star and level cap can be awakened with Starshards from the
 * deep rings (8-10), up to three times. Each one raises the level cap by 5 and every stat by 10%.
 */
export const MAX_AWAKENING = 3;
export const AWAKEN_COST: { shards: number; gold: number }[] = [{ shards: 3, gold: 2500 }, { shards: 6, gold: 6000 }, { shards: 10, gold: 12000 }];

export function levelCap(h: HeroInstance): number {
  return 10 + 10 * h.stars + 5 * (h.awakened ?? 0);
}

/** Why a hero can't be awakened yet, or null if they can (shards and gold aside). */
export function awakenBlock(h: HeroInstance): string | null {
  const a = h.awakened ?? 0;
  if (a >= MAX_AWAKENING) return 'Fully awakened';
  if (h.stars < maxStars(h)) return `Needs ${maxStars(h)} stars first`;
  if (h.level < levelCap(h)) return `Needs level ${levelCap(h)} first`;
  return null;
}

export function xpToNext(level: number): number {
  return Math.round(20 * Math.pow(level, 1.5));
}

export function stats(h: HeroInstance): Stats {
  const base = def(h).base;
  const m = STAR_MULT[h.stars] * (1 + 0.05 * (h.level - 1)) * (1 + 0.1 * (h.awakened ?? 0));
  return {
    might: Math.round(base.might * m),
    finesse: Math.round(base.finesse * m),
    arcana: Math.round(base.arcana * m),
    vigor: Math.round(base.vigor * m),
    resolve: Math.round(base.resolve * m),
  };
}

export function power(h: HeroInstance): number {
  const s = stats(h);
  return Math.round((s.might + s.finesse + s.arcana + s.vigor + s.resolve) * 2);
}

export function signatureUnlocked(h: HeroInstance): boolean {
  return h.stars >= 3;
}

export function maxStars(h: HeroInstance): number {
  return MAX_STARS[def(h).rarity];
}

/**
 * What the next star costs. Copies were always the heart of it; on top come training (a minimum level),
 * gold, the hero's tribe materials, and for the high stars Essence (from spare copies) and, for a
 * Legendary's sixth star, Starshards. Every step costs more than the last, and rarer heroes cost more.
 * Index = the hero's current stars.
 */
const ASCEND_STEP = [
  null,
  { level: 8, gold: 150, mats: 8, essence: 0, shards: 0 },
  { level: 16, gold: 500, mats: 24, essence: 0, shards: 0 },
  { level: 26, gold: 1500, mats: 55, essence: 3, shards: 0 },
  { level: 36, gold: 4000, mats: 100, essence: 8, shards: 0 },
  { level: 46, gold: 9000, mats: 170, essence: 15, shards: 2 },
];
const RARITY_COST: Record<Rarity, number> = { common: 1, uncommon: 1.25, rare: 1.6, epic: 2.1, legendary: 2.8 };
/** Each tribe's ascension asks for the materials of its homeland: the first in full, the second half as much. */
export const TRIBE_MATERIALS: Record<Tribe, [Material, Material]> = {
  ironroot: ['iron', 'stone'],
  freeholders: ['wood', 'stone'],
  thornkin: ['herbs', 'wood'],
  ashborn: ['iron', 'hides'],
  fenfolk: ['herbs', 'hides'],
  moonveil: ['herbs', 'stone'],
  dawnwings: ['wood', 'herbs'],
  hollowed: ['stone', 'hides'],
};

export interface AscendCost {
  copies: number;
  level: number;
  gold: number;
  materials: Partial<Record<Material, number>>;
  essence: number;
  shards: number;
}

/** The price of the next star, or null at the last one. */
export function ascendCost(h: HeroInstance): AscendCost | null {
  if (h.stars >= maxStars(h)) return null;
  const step = ASCEND_STEP[h.stars]!;
  const d = def(h);
  const k = RARITY_COST[d.rarity];
  const [a, b] = TRIBE_MATERIALS[d.tribe];
  const m = Math.round(step.mats * k);
  return {
    copies: COPIES_FOR_STAR[h.stars],
    level: step.level,
    gold: Math.round((step.gold * k) / 10) * 10,
    materials: { [a]: m, [b]: Math.ceil(m / 2) },
    essence: Math.round(step.essence * k),
    shards: step.shards,
  };
}

/** What still stands between a hero and their next star, or null if they can ascend now. */
export function ascendBlock(s: GameState, h: HeroInstance): string | null {
  const c = ascendCost(h);
  if (!c) return 'Maximum stars reached';
  if (h.copies < c.copies) return `Needs ${c.copies - h.copies} more cop${c.copies - h.copies === 1 ? 'y' : 'ies'}`;
  if (h.level < c.level) return `Needs level ${c.level}`;
  if (s.gold < c.gold) return 'Not enough gold';
  for (const [m, n] of Object.entries(c.materials)) if (s.materials[m as Material] < n!) return `Not enough ${m}`;
  if (s.essence < c.essence) return 'Not enough Essence';
  if (s.shards < c.shards) return 'Not enough Starshards';
  return null;
}

export function canAscend(s: GameState, h: HeroInstance): boolean {
  return ascendBlock(s, h) === null;
}

/** Pays for and grants the next star. */
export function ascend(s: GameState, h: HeroInstance): boolean {
  const c = ascendCost(h);
  if (!c || !canAscend(s, h)) return false;
  h.copies -= c.copies;
  s.gold -= c.gold;
  for (const [m, n] of Object.entries(c.materials)) s.materials[m as Material] -= n!;
  s.essence -= c.essence;
  s.shards -= c.shards;
  h.stars += 1;
  return true;
}

/** Adds XP, levelling up as far as the level cap allows. Returns levels gained. */
export function addXp(h: HeroInstance, xp: number): number {
  let gained = 0;
  h.xp += xp;
  while (h.level < levelCap(h) && h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level += 1;
    gained += 1;
  }
  if (h.level >= levelCap(h)) h.xp = Math.min(h.xp, xpToNext(h.level) - 1);
  return gained;
}
