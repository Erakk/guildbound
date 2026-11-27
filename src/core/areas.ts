// Area states: the world changes while the guild is busy. An area can be Calm, Infested (a goblin
// camp has moved in), Corrupted (fae gloom spreading) or Besieged (warbands from a standing
// fortress). Clearing the trouble on a trip calms the area and shields its neighbours for a while;
// ignored trouble spreads to a neighbouring tile.
//
// The world moves on a clock: one world event per WORLD_EVENT_MS, caught up after time away.

import { REGION_BY_ID, REGIONS } from './data/world';
import { Rng } from './rng';
import type { AreaKind, GameState, RegionDef } from './types';
import { LIFE_NAME, lifeLevel, scar } from './life';

export const WORLD_EVENT_MS = 45 * 60 * 1000;
/** Ignored trouble spreads after this long. */
export const SPREAD_MS: Record<Exclude<AreaKind, 'calm'>, number> = {
  infested: 3 * 3600 * 1000,
  corrupted: 4 * 3600 * 1000,
  besieged: 5 * 3600 * 1000,
};
/** After clearing trouble, the area and its neighbours stay calm this long. */
export const PROTECT_MS = 8 * 3600 * 1000;
/** Never more than this many troubled areas at once. */
export const MAX_TROUBLES = 3;
/** Most world events caught up in one go after a long time away. */
const MAX_CATCH_UP = 12;

export const AREA_TEXT: Record<AreaKind, { name: string; short: string; trip: string }> = {
  calm: { name: 'Calm', short: '', trip: '' },
  infested: {
    name: 'Infested', short: 'A goblin camp has moved in.',
    trip: 'A goblin camp sits right on the trail: no way around it. Clear it for its loot, and the area and its neighbours calm down for a while. Left alone, the goblins spread.',
  },
  corrupted: {
    name: 'Corrupted', short: 'Fae gloom is spreading.',
    trip: 'Spirits roam among the usual monsters and morale suffers. Destroy the Gloom Heart to cleanse the area and shield its neighbours. Left alone, the gloom spreads.',
  },
  besieged: {
    name: 'Besieged', short: "Warbands from Gnashgut's Fortress raid here.",
    trip: 'A goblin warband raids the area: bigger fights, grateful locals. Rout the warband to lift the siege. Razing the fortress stops the raids for good.',
  },
};

const NEIGHBOURS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export function neighbours(r: RegionDef): RegionDef[] {
  return NEIGHBOURS.map(([dq, dr]) => REGIONS.find((x) => x.q === r.q + dq && x.r === r.r + dr)).filter((x): x is RegionDef => !!x);
}

function hexDist(a: RegionDef, b: RegionDef): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
}

export function areaState(s: GameState, regionId: string): AreaKind {
  return s.areas[regionId]?.kind ?? 'calm';
}

/** Areas trouble can reach: explored, ordinary (no siege, no tribe gate), and not shielded. */
function canTrouble(s: GameState, r: RegionDef, now: number): boolean {
  return s.explored.includes(r.id) && !r.siege && !r.requires && areaState(s, r.id) === 'calm' && (s.calmUntil[r.id] ?? 0) <= now;
}

/** Trouble cleared: the area calms down and it and its neighbours are shielded for a while. */
export function calmArea(s: GameState, regionId: string, now: number) {
  delete s.areas[regionId];
  s.calmUntil[regionId] = now + PROTECT_MS;
  const r = REGION_BY_ID[regionId];
  if (r) for (const n of neighbours(r)) s.calmUntil[n.id] = Math.max(s.calmUntil[n.id] ?? 0, now + PROTECT_MS);
}

/** Runs world events up to `now`. Returns what happened, for toasts. */
export function tickWorld(s: GameState, now: number): string[] {
  const news: string[] = [];
  let n = 0;
  while (s.world.nextEventAt <= now && n < MAX_CATCH_UP) {
    worldEvent(s, s.world.nextEventAt, news);
    s.world.nextEventAt += WORLD_EVENT_MS;
    n++;
  }
  // After a very long absence, skip ahead rather than replaying weeks of events.
  if (s.world.nextEventAt <= now) s.world.nextEventAt = now + WORLD_EVENT_MS;
  return news;
}

function worldEvent(s: GameState, at: number, news: string[]) {
  const rng = new Rng(s.world.seed);
  s.world.seed = (s.world.seed * 1103515245 + 12345) >>> 0;
  // Only Gnashgut's goblins send warbands out raiding.
  const fort = REGIONS.find((r) => r.siege === 'goblin_fortress');
  const fortStands = !!fort && s.explored.includes(fort.id) && (s.razedUntil[fort.id] ?? 0) <= at;

  // Without a standing fortress, its warbands scatter.
  if (!fortStands) {
    for (const [id, a] of Object.entries(s.areas)) {
      if (a.kind === 'besieged') {
        delete s.areas[id];
        news.push(`The warbands besieging ${REGION_BY_ID[id].name} scattered: the fortress has fallen.`);
      }
    }
  }

  // Trouble left sitting burns the settlement there back a step (once per trouble).
  for (const [id, a] of Object.entries(s.areas)) {
    if (a.kind === 'calm' || a.scarred || at - a.since < SPREAD_MS[a.kind] / 2 || lifeLevel(s, id) === 0) continue;
    a.scarred = true;
    const was = LIFE_NAME[lifeLevel(s, id)].toLowerCase();
    scar(s, id);
    news.push(a.kind === 'infested' ? `Goblins raided ${was} in ${REGION_BY_ID[id].name} and burned the barns.`
      : a.kind === 'corrupted' ? `The gloom drove people out of ${was} in ${REGION_BY_ID[id].name}.`
        : `Warbands sacked ${was} in ${REGION_BY_ID[id].name}.`);
  }

  // Old trouble spreads to a neighbour, and grows where it is.
  for (const [id, a] of Object.entries(s.areas)) {
    if (a.kind === 'calm' || at - a.since < SPREAD_MS[a.kind]) continue;
    if ((a.level ?? 1) < 3) {
      a.level = (a.level ?? 1) + 1;
      news.push(a.kind === 'infested' ? `The goblin camp in ${REGION_BY_ID[id].name} has grown${a.level === 3 ? ' into a war camp' : ''}.`
        : a.kind === 'corrupted' ? `The gloom over ${REGION_BY_ID[id].name} has deepened.`
          : `The warbands raiding ${REGION_BY_ID[id].name} have grown.`);
    }
    const options = neighbours(REGION_BY_ID[id]).filter((r) => canTrouble(s, r, at));
    if (!options.length || Object.keys(s.areas).length >= MAX_TROUBLES + 1) continue;
    const to = rng.pick(options);
    s.areas[to.id] = { kind: a.kind, since: at };
    a.since = at; // the clock restarts for the next spread
    news.push(a.kind === 'infested' ? `Goblins from ${REGION_BY_ID[id].name} spread into ${to.name}.`
      : a.kind === 'corrupted' ? `The gloom crept from ${REGION_BY_ID[id].name} into ${to.name}.`
        : `The warbands pushed on from ${REGION_BY_ID[id].name} into ${to.name}.`);
    return;
  }

  if (Object.keys(s.areas).length >= MAX_TROUBLES) return;
  const roll = rng.next();
  if (fortStands && roll < 0.3 && !Object.values(s.areas).some((a) => a.kind === 'besieged')) {
    const near = REGIONS.filter((r) => r.id !== fort!.id && hexDist(r, fort!) <= 2 && canTrouble(s, r, at));
    if (near.length) {
      const to = rng.pick(near);
      s.areas[to.id] = { kind: 'besieged', since: at };
      news.push(`Warbands from Gnashgut's Fortress are raiding ${to.name}.`);
      return;
    }
  }
  if (roll < 0.75) {
    // New trouble: goblins anywhere, gloom where the fae live.
    const corrupt = rng.chance(0.35);
    const pool = REGIONS.filter((r) => canTrouble(s, r, at) && (!corrupt || ['forest', 'haunted', 'marsh', 'snow'].includes(r.biome)));
    if (pool.length) {
      const to = rng.pick(pool);
      s.areas[to.id] = { kind: corrupt ? 'corrupted' : 'infested', since: at };
      news.push(corrupt ? `A fae gloom has fallen over ${to.name}.` : `A goblin camp has moved into ${to.name}.`);
    }
  }
}
