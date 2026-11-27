// Living areas: the land changes with what the guild does there.
//
// Look after an area and a settlement grows by its trail:
//   1. A hamlet, once the area is secured: a welcome at the edge of the trail (+3% gold).
//   2. A village, once its story is told or after 6 trips home: a trader by the road (+6% gold).
//   3. A market town, after 12 trips home: villagers mark where the first monsters are, and the
//      market's traders add a pack piece (+10% gold).
// Leave trouble (goblins, gloom, warbands) sitting in an area with a settlement and it gets burned
// back a step (a scar); clearing the trouble lets the people come back (the scar heals). While an area
// is troubled, its people hide and the perks are off.

import { secured } from './hold';
import { storyChapter, areaStory } from './storyline';
import type { GameState } from './types';

export type LifeLevel = 0 | 1 | 2 | 3;

export const LIFE_NAME = ['', 'A hamlet', 'A village', 'A market town'] as const;
export const LIFE_PERK = [
  '',
  'A welcome at the edge of the trail: +3% gold.',
  'A trader sets up by the road every trip: +6% gold.',
  'Villagers mark where the first monsters wait, and the market adds a pack piece: +10% gold.',
] as const;
export const LIFE_GOLD = [1, 1.03, 1.06, 1.1];

/** Trips home (not retreats) to an area. */
export function tripsHome(s: GameState, regionId: string): number {
  return s.tripsHome?.[regionId] ?? 0;
}

function storyTold(s: GameState, regionId: string): boolean {
  return !!areaStory(regionId) && storyChapter(s, regionId) === null && (s.stories?.[regionId] ?? 0) >= 3;
}

/** How far the settlement would have grown, scars aside. */
export function lifeBase(s: GameState, regionId: string): LifeLevel {
  if (!secured(s, regionId)) return 0;
  const trips = tripsHome(s, regionId);
  if (trips >= 12) return 3;
  if (storyTold(s, regionId) || trips >= 6) return 2;
  return 1;
}

export function lifeLevel(s: GameState, regionId: string): LifeLevel {
  return Math.max(0, lifeBase(s, regionId) - (s.lifeScars?.[regionId] ?? 0)) as LifeLevel;
}

/** The level whose perks a trip gets: none while the area is troubled. */
export function lifePerks(s: GameState, regionId: string): LifeLevel {
  return s.areas[regionId] ? 0 : lifeLevel(s, regionId);
}

/** A trip came home: one more for the settlement to grow on. */
export function countTrip(s: GameState, regionId: string) {
  s.tripsHome = { ...(s.tripsHome ?? {}), [regionId]: tripsHome(s, regionId) + 1 };
}

/** Trouble burned the settlement back a step. */
export function scar(s: GameState, regionId: string) {
  s.lifeScars = { ...(s.lifeScars ?? {}), [regionId]: (s.lifeScars?.[regionId] ?? 0) + 1 };
}

/** Trouble cleared: people come back, and a scar heals. Returns true if one did. */
export function heal(s: GameState, regionId: string): boolean {
  const n = s.lifeScars?.[regionId] ?? 0;
  if (n <= 0) return false;
  s.lifeScars = { ...s.lifeScars, [regionId]: n - 1 };
  return true;
}
