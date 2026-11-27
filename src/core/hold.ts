// The guild's hold on the land. Scouts can only map land next to town, or next to an area the guild has
// secured. An area is secured by trips there: every trip that comes home adds to the guild's hold, and so
// does clearing every monster group, dealing with a site, calming the area's trouble or winning a siege.
// Further rings need a firmer hold before the guild can push past them.

import { neighbours } from './areas';
import { REGION_BY_ID } from './data/world';
import type { ExpeditionReport, GameState, RegionDef } from './types';

/** Hold needed to secure an area, by ring. */
const NEED = [0, 3, 4, 5, 5, 6, 6, 6, 6, 6, 6];

export function holdNeed(r: RegionDef): number {
  return NEED[Math.min(NEED.length - 1, r.ring)] ?? 6;
}

export function holdOf(s: GameState, regionId: string): number {
  return s.hold?.[regionId] ?? 0;
}

export function secured(s: GameState, regionId: string): boolean {
  const r = REGION_BY_ID[regionId];
  return !!r && s.explored.includes(regionId) && holdOf(s, regionId) >= holdNeed(r);
}

/** Can a scout reach this area: is it next to town, or next to a secured area? */
export function canReach(s: GameState, r: RegionDef): boolean {
  return r.ring <= 1 || neighbours(r).some((n) => secured(s, n.id));
}

/** Why scouts can't reach an area yet (naming the neighbours that would open it), or null if they can. */
export function reachBlock(s: GameState, r: RegionDef): string | null {
  if (canReach(s, r)) return null;
  const near = neighbours(r).filter((n) => s.explored.includes(n.id));
  if (!near.length) return 'Too far: no land next to it is on the map yet.';
  const names = near.map((n) => `${n.name} (${holdOf(s, n.id)} / ${holdNeed(n)})`);
  return `Too far for now. Secure ${names.length > 1 ? names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1] : names[0]} first: trips there build the guild's hold.`;
}

/** What a trip adds to the guild's hold on its area. */
export function holdGain(r: ExpeditionReport): { total: number; parts: string[] } {
  const parts: string[] = [];
  if (r.siege) {
    if (r.siege.won) parts.push('won the battle +3');
  } else if (r.outcome === 'returned') {
    parts.push('came home +1');
    if (r.groupsTotal > 0 && r.groupsCleared >= r.groupsTotal) parts.push('cleared every group +1');
  }
  if (r.site?.cleared) parts.push(`dealt with the ${r.site.kind} +1`);
  if (r.area?.cleared) parts.push('calmed the trouble +1');
  if (r.holdBonus) parts.push(`marked for the guild +${r.holdBonus}`);
  const total = parts.reduce((n, p) => n + Number(p.match(/\+(\d)/)?.[1] ?? 0), 0);
  return { total, parts };
}

/** Adds a trip's hold. Returns true if that secured the area just now. */
export function gainHold(s: GameState, r: ExpeditionReport): boolean {
  const region = REGION_BY_ID[r.regionId];
  if (!region) return false;
  const before = secured(s, r.regionId);
  const g = holdGain(r).total;
  if (!g) return false;
  s.hold = { ...(s.hold ?? {}), [r.regionId]: Math.min(holdNeed(region), holdOf(s, r.regionId) + g) };
  return !before && secured(s, r.regionId);
}
