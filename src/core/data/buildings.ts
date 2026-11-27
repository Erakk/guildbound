import type { Cost } from '../types';

export interface BuildingDef {
  id: string;
  name: string;
  maxLevel: number;
  /** Level the town starts with. */
  start: number;
  description: string;
  /** What each level gives, index = level. */
  levels: string[];
  cost: (level: number) => Cost;
  /** Build time in seconds for reaching `level`. */
  time: (level: number) => number;
}

// Build times rise steeply: the first builds are quick so the town grows during the first session.
const T = [0, 30, 120, 480, 1200, 2700];

function standard(gold: number, mats: (lvl: number) => Cost) {
  return (lvl: number): Cost => ({ gold: Math.round(gold * Math.pow(lvl, 1.8)), ...mats(lvl) });
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'townhall', name: 'Town Hall', maxLevel: 5, start: 1,
    description: 'The heart of Greyford. No other building can be a higher level than the Town Hall.',
    levels: ['', 'Buildings up to level 1', 'Buildings up to level 2', 'Buildings up to level 3', 'Buildings up to level 4', 'Buildings up to level 5'],
    // Level 2 asks less stone: none of the first areas give any.
    cost: (l) => ({ gold: Math.round(150 * Math.pow(l, 1.9)), wood: 20 * l, stone: l === 2 ? 30 : 25 * l, iron: l > 2 ? 10 * l : 0 }),
    time: (l) => T[l] * 1.5,
  },
  {
    id: 'guildhall', name: 'Guild Hall', maxLevel: 5, start: 1,
    description: 'Where the parties train between trips. Every level adds 10% XP from expeditions; level 3 lets the guild lead a second party and run two outings (parties or scouts) at once.',
    levels: ['', '+0% XP', '+10% XP', '+20% XP and a second party', '+30% XP', '+40% XP'],
    cost: standard(120, (l) => ({ wood: 15 * l, stone: 10 * l })),
    time: (l) => T[l],
  },
  {
    id: 'tavern', name: 'Tavern', maxLevel: 5, start: 0,
    description: 'Ale, songs and recruits. Gives a free Recruit Pack on a timer.',
    levels: ['', 'A Recruit Pack every 4 h', 'A Recruit Pack every 3 h 30 min', 'A Recruit Pack every 3 h', 'A Recruit Pack every 2 h 30 min', 'A Recruit Pack every 2 h'],
    cost: standard(80, (l) => ({ wood: 20 * l, hides: 4 * l })),
    // The tutorial's first building goes up quickly.
    time: (l) => (l === 1 ? 10 : T[l]),
  },
  {
    id: 'weaponsmith', name: 'Weaponsmith', maxLevel: 3, start: 0,
    description: 'Forges weapons, tomes and quivers to order, from gold and materials. Each level unlocks the next metal.',
    levels: ['', 'Iron weapons', 'Steel weapons', 'Mithril weapons'],
    cost: standard(100, (l) => ({ wood: 15 * l, stone: 10 * l, iron: 6 * l })),
    time: (l) => T[l + 1],
  },
  {
    id: 'armorer', name: 'Armorer', maxLevel: 3, start: 0,
    description: 'Forges armor, robes and shields to order, from gold and materials. Each level unlocks the next metal.',
    levels: ['', 'Iron armor and shields', 'Steel armor and shields', 'Mithril armor and shields'],
    cost: standard(100, (l) => ({ wood: 10 * l, stone: 15 * l, hides: 6 * l })),
    time: (l) => T[l + 1],
  },
  {
    id: 'temple', name: 'Temple', maxLevel: 3, start: 0,
    description: 'Heals heroes knocked out on expeditions. Each level shortens recovery by 25%.',
    levels: ['', 'Recovery 25% faster, pay to heal at once', 'Recovery 50% faster', 'Recovery 75% faster'],
    cost: standard(90, (l) => ({ stone: 20 * l, herbs: 8 * l })),
    time: (l) => T[l],
  },
  {
    id: 'market', name: 'Market', maxLevel: 3, start: 0,
    description: 'Sell loot and spare materials, buy materials and jewelry.',
    levels: ['', 'Copper jewelry, fair prices', 'Silver jewelry, better prices', 'Gold jewelry, best prices'],
    // No stone for the first level: the Market is how a new guild buys its way past the early stone shortage.
    cost: standard(80, (l) => ({ wood: 25 * l, stone: l > 1 ? 5 * l : 0 })),
    time: (l) => T[l],
  },
  {
    id: 'magetower', name: 'Mage Tower', maxLevel: 4, start: 0,
    description: 'Where the Guildmaster studies. Building it opens the spellbook: spells to cast on expeditions. Each level adds a slot.',
    levels: ['', 'The spellbook opens: 2 spell slots', '3 spell slots', '4 spell slots', '5 spell slots'],
    cost: standard(110, (l) => ({ wood: 10 * l, stone: 20 * l, herbs: 6 * l })),
    time: (l) => T[l + 1],
  },
  {
    id: 'stables', name: 'Stables', maxLevel: 3, start: 0,
    description: 'Horses and wagons for the long roads. Each level cuts the road time to the far rings (5 and out).',
    levels: ['', 'Far roads 15% shorter', 'Far roads 30% shorter', 'Far roads 45% shorter'],
    cost: standard(130, (l) => ({ wood: 25 * l, hides: 8 * l, iron: 4 * l })),
    time: (l) => T[l + 1],
  },
  {
    id: 'embassy', name: 'Embassy', maxLevel: 3, start: 0,
    description: 'Envoys of the tribes. Each tribe\'s embassy sets tribe quests, hands out Tribe Packs to its friends, and teaches its gear to its allies.',
    levels: ['', 'Envoys for 2 tribes', 'Envoys for 4 tribes', 'Envoys for all 8 tribes'],
    cost: standard(160, (l) => ({ wood: 20 * l, stone: 25 * l, iron: 6 * l })),
    time: (l) => T[l + 1],
  },
];

/** Spells the party can take on a trip: none without a Mage Tower, then 2, 3, 4 and 5. */
export function spellSlots(magetowerLevel: number): number {
  return magetowerLevel > 0 ? Math.min(5, magetowerLevel + 1) : 0;
}

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

export const MATERIAL_NAMES = { wood: 'Wood', stone: 'Stone', iron: 'Iron', herbs: 'Herbs', hides: 'Hides' } as const;

/** Gold the Market pays per unit, before its level bonus. */
export const MATERIAL_VALUE = { wood: 2, stone: 3, iron: 6, herbs: 4, hides: 4 } as const;
