// The far Marches: rings 4 to 10, generated. Each direction from Greyford keeps its character
// (fire to the east, peaks and sky to the north-east, snow and old forest to the north, the sea to
// the west, marsh and haunted woods to the south-west, barrows and plains to the south), and every
// area gets a name, monsters and a description from tables. The same map comes out every time.
//
// Further rings are further away: the trip includes a road out and back (travel time) on top of
// the adventure itself, so a ring 7 trip takes a couple of hours, as the design's scale says.
//
// Rings 8 to 10 are the Deep Marches, the endgame: every area there is a skull area (heroes can die
// for good), danger tiers 7 to 10, trips of 4 to 8 hours, and some areas hold a lord in its lair.

import { Rng } from '../rng';
import type { Ability, Biome } from '../types';

export type FarRow = {
  id: string; name: string; q: number; r: number; biome: Biome; art: string; tier: number; durationSec: number; travelSec: number;
  pool: [string, number][]; size: [number, number]; groups: number; description: string; requires?: Ability;
  skull?: boolean; boss?: string;
};

/** One-way travel to each ring (seconds). Rings 1-4 are close enough to walk straight into. */
export const TRAVEL_SEC = [0, 0, 0, 0, 0, 15 * 60, 35 * 60, 70 * 60, 100 * 60, 160 * 60, 240 * 60];

/** The Deep Marches start here. */
export const DEEP_RING = 8;
export const OUTER_RING = 10;

/** Heavier kinds that join the locals in the Deep Marches. */
const DEEP_MONSTERS: Partial<Record<Biome, string[]>> = {
  badlands: ['drake', 'fire_elemental'], mountain: ['drake', 'golem'], hills: ['troll'], sky: ['drake'], snow: ['yeti'],
  forest: ['troll'], haunted: ['wraith'], marsh: ['troll'], barrow: ['wraith'], plains: ['ogre'], farm: ['ogre'], ruins: ['golem'],
  sea: ['crab'], coast: ['crab'],
};

/** Who rules a lair in the Deep Marches, by terrain. */
export const LORDS: Record<Biome, string> = {
  badlands: 'dragon', mountain: 'stone_titan', hills: 'stone_titan', sky: 'stone_titan', snow: 'frost_wyrm',
  forest: 'alpha', plains: 'alpha', farm: 'alpha', haunted: 'dread_lord', barrow: 'dread_lord', ruins: 'dread_lord',
  sea: 'leviathan', coast: 'leviathan', marsh: 'leviathan',
};
const LAIR_CHANCE = [0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.28, 0.36];
const LAIR_TEXT: Record<string, string> = {
  dragon: 'An elder dragon lairs at the heart of it.', frost_wyrm: 'A frost wyrm sleeps in the ice at its heart.',
  stone_titan: 'A stone titan walks the heights.', alpha: 'The Grey Alpha leads the packs here.',
  dread_lord: 'A Dread Lord holds court among the dead.', leviathan: 'Something vast moves under the water: a leviathan.',
};
const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Terrain by direction (degrees on the map, 0 = east, clockwise because the map's y points down). */
const SECTORS: [number, number, Biome[]][] = [
  [-30, 30, ['badlands', 'badlands', 'ruins']],
  [-90, -30, ['mountain', 'mountain', 'sky', 'hills']],
  [-120, -90, ['snow', 'snow', 'mountain']],
  [-150, -120, ['forest', 'forest', 'haunted']],
  [150, 181, ['sea', 'coast', 'coast']],
  [-181, -150, ['sea', 'coast', 'coast']],
  [120, 150, ['coast', 'marsh', 'sea']],
  [90, 120, ['marsh', 'haunted', 'haunted']],
  [60, 90, ['barrow', 'haunted', 'plains']],
  [30, 60, ['plains', 'hills', 'farm', 'hills']],
];

const ART: Record<Biome, string[]> = {
  badlands: ['bad'], mountain: ['mtn', 'mine'], sky: ['sky'], hills: ['hills'], snow: ['snowforest', 'glacier'], forest: ['forest'],
  haunted: ['haunt'], sea: ['sea', 'reef'], coast: ['coast'], marsh: ['marsh'], barrow: ['barrow'], plains: ['plains'], farm: ['farm'], ruins: ['tower', 'abbey'],
};

/** Who lives where. Stronger kinds show up further out. */
const MONSTERS: Record<Biome, string[]> = {
  badlands: ['imp', 'magma_hound', 'ash_goblin', 'cultist', 'wyrmling'],
  mountain: ['troll', 'ogre', 'golem', 'goblin_spear', 'storm_wisp'],
  sky: ['storm_wisp', 'golem', 'wisp'],
  hills: ['ogre', 'goblin_spear', 'wolf_rider', 'troll', 'goblin_shaman'],
  snow: ['frost_wolf', 'yeti', 'ice_wraith', 'frost_goblin'],
  forest: ['dire_wolf', 'spider', 'wisp', 'bandit'],
  haunted: ['wisp', 'banshee', 'ghoul', 'wraith'],
  sea: ['crab', 'drowned', 'bog_lurker'],
  coast: ['crab', 'drowned', 'bandit', 'bandit_xbow'],
  marsh: ['bog_lurker', 'troll', 'spider', 'wisp'],
  barrow: ['skeleton', 'wraith', 'ghoul', 'cultist'],
  plains: ['dire_wolf', 'boar', 'bandit', 'wolf_rider'],
  farm: ['bandit', 'bandit_xbow', 'boar', 'rival_blade'],
  ruins: ['skeleton', 'golem', 'cultist', 'ghoul'],
};

const NAMES: Record<Biome, [string[], string[]]> = {
  badlands: [['Ember', 'Cinder', 'Ash', 'Slag', 'Smoke', 'Scorch', 'Brimstone', 'Char'], ['Waste', 'Flats', 'Rift', 'Crater', 'Barrens', 'Hollows', 'Vents']],
  mountain: [['Iron', 'Grey', 'Thunder', 'Anvil', 'Giant\'s', 'Broken', 'High', 'Hammer'], ['Peaks', 'Spur', 'Crags', 'Pass', 'Heights', 'Teeth', 'Shelf']],
  sky: [['Cloud', 'Wind', 'Gull', 'Sun', 'Feather', 'Storm'], ['Isles', 'Reach', 'Steps', 'Shoals', 'Perch']],
  hills: [['Bramble', 'Goat', 'Barrow', 'Long', 'Red', 'Stone'], ['Downs', 'Hills', 'Ridge', 'Knolls', 'Tors']],
  snow: [['Frost', 'Rime', 'White', 'Winter', 'Ice', 'Hoar', 'Snow'], ['Fang', 'Wastes', 'Fields', 'Pines', 'Shelf', 'Hollow', 'Veil']],
  forest: [['Elder', 'Moss', 'Shadow', 'Thorn', 'Deep', 'Briar', 'Old'], ['wood', 'weald', 'thicket', 'grove', 'holt']],
  haunted: [['Gloom', 'Whisper', 'Grave', 'Mourn', 'Pale', 'Wraith', 'Hush'], ['wood', 'mere', 'vale', 'moor', 'hollow']],
  sea: [['Drowned', 'Salt', 'Grey', 'Kraken', 'Siren', 'Wreck'], ['Deeps', 'Reach', 'Shoals', 'Isles', 'Sound']],
  coast: [['Shell', 'Wreck', 'Gull', 'Smuggler\'s', 'Tide', 'Storm'], ['Cove', 'Strand', 'Point', 'Bay', 'Shore']],
  marsh: [['Black', 'Sedge', 'Leech', 'Fog', 'Toad', 'Sunk'], ['fen', 'mire', 'bog', 'marsh', 'reeds']],
  barrow: [['Bone', 'King\'s', 'Old', 'Silent', 'Grey', 'Crow'], ['Barrows', 'Mounds', 'Field', 'Cairns', 'Rest']],
  plains: [['Wind', 'Golden', 'Wide', 'Horse', 'Lark', 'Long'], ['Steppe', 'Plain', 'Meadows', 'Grass', 'Leas']],
  farm: [['Burnt', 'Widow\'s', 'Miller\'s', 'Low', 'Lost'], ['Farms', 'Fields', 'Holdings', 'Acres']],
  ruins: [['Fallen', 'Sunken', 'Old', 'Shattered', 'Emperor\'s'], ['Citadel', 'Ruins', 'Spire', 'Halls', 'Bastion']],
};

const DESC: Record<Biome, string[]> = {
  badlands: ['Black rock and rivers of slow fire.', 'Ash drifts like snow over the cracked ground.', 'The air shimmers; something big moves in the smoke.'],
  mountain: ['Cliffs and narrow passes; trolls guard the bridges.', 'The roads end here, and the climbing starts.', 'Old mine shafts whistle in the wind.'],
  sky: ['Rocks that float above the clouds. Only fliers get up here.', 'Islands of stone drifting on the wind.'],
  hills: ['Rolling hills with too many caves in them.', 'Grassy ridges where ogres keep their herds.'],
  snow: ['Endless white; the cold bites through any cloak.', 'Pines bent under snow, and tracks of something large.', 'A frozen land where even the wind howls.'],
  forest: ['Trees older than the Marches themselves.', 'A wood so thick the light comes through green.', 'Paths that change when nobody is looking.'],
  haunted: ['Twilight that never quite becomes night.', 'Lights drift between the trees, calling names.', 'The dead walk here, and so do worse things.'],
  sea: ['Open water, reefs and wrecks. Swimmers only.', 'Isles far out in the grey sea. Only the Fenfolk swim this far.'],
  coast: ['Cliffs, wrecks and coves full of smugglers.', 'A shore littered with the bones of ships.'],
  marsh: ['Mud, reeds and pools that bubble.', 'A fen where the mist never lifts.'],
  barrow: ['Mounds of an old war\'s dead.', 'Standing stones and open graves.'],
  plains: ['Grass to the horizon and riders on it.', 'Wide plains where the wolves hunt in packs.'],
  farm: ['Abandoned farms, now home to bandits.', 'Fields gone wild around burned-out houses.'],
  ruins: ['The bones of an empire that came before.', 'Broken towers where something still keeps watch.'],
};

function hash(q: number, r: number): number {
  return (((q * 73856093) ^ (r * 19349663)) >>> 0) % 2147483646 + 1;
}

function sectorBiomes(q: number, r: number): Biome[] {
  const x = q + r / 2;
  const y = r * 0.866;
  const a = (Math.atan2(y, x) * 180) / Math.PI;
  return SECTORS.find(([lo, hi]) => a >= lo && a < hi)?.[2] ?? ['plains'];
}

export function ringHexes(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let q = -n; q <= n; q++) for (let r = -n; r <= n; r++) if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === n) out.push([q, r]);
  return out;
}

/** Builds the far areas for rings 4-10, skipping hexes that already have a hand-made area. */
export function generateFrontier(taken: Set<string>, takenNames: Set<string>): FarRow[] {
  const rows: FarRow[] = [];
  for (let ring = 4; ring <= OUTER_RING; ring++) {
    for (const [q, r] of ringHexes(ring)) {
      if (taken.has(`${q},${r}`)) continue;
      const rng = new Rng(hash(q, r));
      const biome = rng.pick(sectorBiomes(q, r));
      // Rings 5 and up: one of two tiers (ring 5: 4-5 ... ring 10: 9-10).
      const tier = ring === 4 ? 4 : ring - (rng.chance(0.5) ? 1 : 0);
      const deep = ring >= DEEP_RING;
      // A name nobody else has.
      const [pre, suf] = NAMES[biome];
      let name = '';
      for (let i = 0; i < 40 && (!name || takenNames.has(name)); i++) {
        const p = rng.pick(pre);
        const s = rng.pick(suf);
        name = s[0] === s[0].toLowerCase() ? p + s : `${p} ${s}`;
      }
      if (takenNames.has(name)) {
        const base = name;
        for (const n of ROMAN) if (takenNames.has(name)) name = `${base} ${n}`;
      }
      takenNames.add(name);
      // Three or four kinds of monster, heavier ones weighted up further out.
      const kinds = [...MONSTERS[biome]].sort(() => rng.next() - 0.5).slice(0, rng.int(3, 4));
      const pool: [string, number][] = kinds.map((id, i) => [id, i === 0 ? 4 : i === 1 ? 3 : 2]);
      if (deep) for (const id of DEEP_MONSTERS[biome] ?? []) if (!kinds.includes(id)) pool.push([id, 2]);
      const boss = deep && rng.chance(LAIR_CHANCE[ring]) ? LORDS[biome] : undefined;
      const requires: Ability | undefined = biome === 'sea' ? 'swim' : biome === 'sky' ? 'fly' : undefined;
      rows.push({
        id: `far_${q}_${r}`.replace(/-/g, 'm'), name, q, r, biome, art: rng.pick(ART[biome]), tier,
        durationSec: ring === 4 ? rng.int(15, 18) * 60 : deep ? rng.int(20, 26) * 60 : rng.int(16, 22) * 60, travelSec: TRAVEL_SEC[ring],
        // Group sizes follow the danger tier (not the ring), so each tier is one even step harder.
        pool, size: deep ? [5, 7] : tier <= 6 ? [4, 6] : [4, 7], groups: deep ? 10 : tier <= 5 ? 8 : 9,
        description: rng.pick(DESC[biome]) + (deep ? ` ${boss ? LAIR_TEXT[boss] : 'The Deep Marches: the fallen do not get up here.'}` : ''), requires,
        skull: deep || undefined, boss,
      });
    }
  }
  return rows;
}
