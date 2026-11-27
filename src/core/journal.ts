// The field journal: every discovery the guild has seen, by kind of land. Fill a biome's page and the
// guild knows where to look there: +10% gold on trips to that kind of land.

import { DISCOVERY_BY_ID, discoveriesFor, type DiscoveryDef } from './data/discoveries';
import { REGION_BY_ID } from './data/world';
import type { Biome, GameState } from './types';

export const JOURNAL_BONUS = 0.1;

export const BIOME_LABEL: Record<Biome, string> = {
  plains: 'Meadows', forest: 'Forests', marsh: 'Marshes', hills: 'Hills', barrow: 'Barrows', farm: 'Farmland', coast: 'Coasts',
  sea: 'The sea', mountain: 'Mountains', snow: 'Snowfields', badlands: 'Badlands', haunted: 'Haunted lands', sky: 'Sky isles', ruins: 'Ruins',
};

const key = (biome: Biome, id: string) => `${biome}:${id}`;

export interface JournalPage { biome: Biome; all: DiscoveryDef[]; seen: Set<string>; done: boolean }

export function journalPage(s: GameState, biome: Biome): JournalPage {
  const all = discoveriesFor(biome);
  const have = new Set(s.journal ?? []);
  const seen = new Set(all.filter((d) => have.has(key(biome, d.id))).map((d) => d.id));
  return { biome, all, seen, done: all.length > 0 && seen.size === all.length };
}

export function journalComplete(s: GameState, biome: Biome): boolean {
  return journalPage(s, biome).done;
}

/** Biomes of the land the guild has explored, in the order it was explored. */
export function journalBiomes(s: GameState): Biome[] {
  return [...new Set(s.explored.map((id) => REGION_BY_ID[id]?.biome).filter((b): b is Biome => !!b))];
}

/** Writes a trip's discoveries into the journal. Returns the biome if this trip finished its page. */
export function recordJournal(s: GameState, biome: Biome, ids: string[]): Biome | null {
  const before = journalComplete(s, biome);
  const set = new Set(s.journal ?? []);
  for (const id of ids) if (DISCOVERY_BY_ID[id]) set.add(key(biome, id));
  s.journal = [...set];
  return !before && journalComplete(s, biome) ? biome : null;
}
