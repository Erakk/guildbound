import type { HeroClass, ItemDef, Stats, Tribe } from '../types';

// Three tiers of materials, as the design's Weaponsmith and Armorer levels unlock them.
const TIER_NAME = ['', 'Iron', 'Steel', 'Mithril'];

interface WeaponKind { kind: string; label: string; hands: 1 | 2; atk: number; stats?: Partial<Stats> }
const WEAPONS: WeaponKind[] = [
  { kind: 'sword', label: 'Sword', hands: 1, atk: 4 },
  { kind: 'axe', label: 'Axe', hands: 1, atk: 5, stats: { finesse: -1 } },
  { kind: 'mace', label: 'Mace', hands: 1, atk: 4, stats: { resolve: 1 } },
  { kind: 'dagger', label: 'Dagger', hands: 1, atk: 3, stats: { finesse: 2 } },
  { kind: 'wand', label: 'Wand', hands: 1, atk: 3, stats: { arcana: 2 } },
  { kind: 'greatsword', label: 'Greatsword', hands: 2, atk: 8 },
  { kind: 'warhammer', label: 'Warhammer', hands: 2, atk: 9, stats: { finesse: -2 } },
  { kind: 'bow', label: 'Longbow', hands: 2, atk: 7, stats: { finesse: 1 } },
  { kind: 'staff', label: 'Staff', hands: 2, atk: 6, stats: { arcana: 3 } },
];

/**
 * What each class can wear: weapons, off-hands and armour, by kind (jewellery is for everyone). A hero
 * can't put on anything else: no swords for Rangers, no plate for Mages, a quiver only with a bow.
 */
export const WEARS: Record<HeroClass, string[]> = {
  warrior: ['sword', 'axe', 'mace', 'greatsword', 'warhammer', 'shield', 'heavy', 'medium'],
  paladin: ['sword', 'mace', 'greatsword', 'warhammer', 'shield', 'heavy', 'medium'],
  dragonslayer: ['greatsword', 'axe', 'warhammer', 'sword', 'shield', 'heavy', 'medium'],
  ranger: ['bow', 'dagger', 'quiver', 'light', 'medium'],
  beastmaster: ['axe', 'bow', 'dagger', 'quiver', 'light', 'medium'],
  rogue: ['dagger', 'sword', 'light'],
  bard: ['sword', 'dagger', 'wand', 'tome', 'light', 'robe'],
  cleric: ['mace', 'staff', 'shield', 'tome', 'robe', 'medium'],
  mage: ['staff', 'wand', 'tome', 'robe'],
  necromancer: ['staff', 'wand', 'dagger', 'tome', 'robe'],
};

/** Can a hero of this class wear it? */
export function canWear(cls: HeroClass, d: ItemDef): boolean {
  return d.slot === 'jewelry' || (WEARS[cls] ?? []).includes(d.kind);
}

/** The classes that can wear an item (all of them for jewellery). */
export function wornBy(d: ItemDef): HeroClass[] {
  return (Object.keys(WEARS) as HeroClass[]).filter((c) => canWear(c, d));
}

/** Weapons each class is trained with (the weapons it can wear). */
export const PROFICIENT: Record<HeroClass, string[]> = Object.fromEntries(
  (Object.keys(WEARS) as HeroClass[]).map((c) => [c, WEARS[c].filter((k) => WEAPONS.some((w) => w.kind === k))]),
) as Record<HeroClass, string[]>;

function scale(stats: Partial<Stats> | undefined, t: number): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(stats ?? {})) out[k as keyof Stats] = v! > 0 ? v! * t : v!;
  return out;
}

const items: ItemDef[] = [];
for (let t = 1; t <= 3; t++) {
  const metal = t === 1 ? { iron: 4 } : t === 2 ? { iron: 10, stone: 4 } : { iron: 18, stone: 8, herbs: 4 };
  for (const w of WEAPONS) {
    items.push({
      id: `${w.kind}_${t}`, name: `${TIER_NAME[t]} ${w.label}`, slot: 'main', kind: w.kind, hands: w.hands, tier: t,
      atk: Math.round(w.atk * (1 + (t - 1) * 0.9)), def: 0, hp: 0, stats: scale(w.stats, t),
      cost: { gold: Math.round((w.hands === 2 ? 70 : 50) * t * t), ...(w.kind === 'bow' || w.kind === 'staff' || w.kind === 'wand' ? { wood: 4 * t } : metal) },
      shop: 'weaponsmith',
    });
  }
  // Off-hands: a shield for defense, a tome for spellcasters, a quiver for archers.
  items.push({ id: `shield_${t}`, name: `${TIER_NAME[t]} Shield`, slot: 'off', kind: 'shield', tier: t, atk: 0, def: 3 * t, hp: 10 * t, stats: {}, cost: { gold: 45 * t * t, wood: 3 * t, ...metal }, shop: 'armorer' });
  items.push({ id: `tome_${t}`, name: `${['', 'Worn', 'Bound', 'Runed'][t]} Tome`, slot: 'off', kind: 'tome', tier: t, atk: 0, def: 0, hp: 0, stats: { arcana: 2 * t }, cost: { gold: 45 * t * t, hides: 3 * t, herbs: 2 * t }, shop: 'weaponsmith' });
  items.push({ id: `quiver_${t}`, name: `${['', 'Hide', 'Fletched', 'Elven'][t]} Quiver`, slot: 'off', kind: 'quiver', tier: t, atk: 0, def: 0, hp: 0, stats: { finesse: 2 * t }, cost: { gold: 40 * t * t, hides: 4 * t }, shop: 'weaponsmith' });
  // Armor weights, and robes for spellcasters.
  items.push({ id: `robe_${t}`, name: `${['', 'Apprentice', 'Embroidered', 'Archmage'][t]} Robe`, slot: 'armor', kind: 'robe', tier: t, atk: 0, def: t, hp: 8 * t, stats: { arcana: 2 * t }, cost: { gold: 45 * t * t, hides: 2 * t, herbs: 3 * t }, shop: 'armorer' });
  items.push({ id: `light_${t}`, name: `${['', 'Padded', 'Studded', 'Shadowweave'][t]} Jerkin`, slot: 'armor', kind: 'light', tier: t, atk: 0, def: 2 * t, hp: 12 * t, stats: { finesse: t }, cost: { gold: 45 * t * t, hides: 5 * t }, shop: 'armorer' });
  items.push({ id: `medium_${t}`, name: `${TIER_NAME[t]} Mail`, slot: 'armor', kind: 'medium', tier: t, atk: 0, def: 4 * t, hp: 20 * t, stats: {}, cost: { gold: 60 * t * t, hides: 2 * t, ...metal }, shop: 'armorer' });
  items.push({ id: `heavy_${t}`, name: `${TIER_NAME[t]} Plate`, slot: 'armor', kind: 'heavy', tier: t, atk: 0, def: 6 * t, hp: 30 * t, stats: { finesse: -2 }, speed: -10, cost: { gold: 80 * t * t, ...metal, iron: (metal.iron ?? 0) + 4 * t }, shop: 'armorer' });
  // Jewelry, sold at the Market.
  const ring = (stat: keyof Stats, label: string) => items.push({ id: `ring_${stat}_${t}`, name: `${['', 'Copper', 'Silver', 'Gold'][t]} Ring of ${label}`, slot: 'jewelry', kind: 'ring', tier: t, atk: 0, def: 0, hp: 0, stats: { [stat]: 2 * t }, cost: { gold: 70 * t * t }, shop: 'market' });
  ring('might', 'Strength');
  ring('finesse', 'Swiftness');
  ring('arcana', 'Insight');
  items.push({ id: `amulet_vigor_${t}`, name: `${['', 'Bone', 'Jade', 'Dragonglass'][t]} Amulet of Vigor`, slot: 'jewelry', kind: 'amulet', tier: t, atk: 0, def: 0, hp: 15 * t, stats: { vigor: 2 * t }, cost: { gold: 80 * t * t }, shop: 'market' });
  items.push({ id: `amulet_resolve_${t}`, name: `${['', 'Bone', 'Jade', 'Dragonglass'][t]} Amulet of Resolve`, slot: 'jewelry', kind: 'amulet', tier: t, atk: 0, def: 1 * t, hp: 0, stats: { resolve: 3 * t }, cost: { gold: 80 * t * t }, shop: 'market' });
}

// The Phoenix Feather: saves its wearer once from death in a skull region, then burns away.
items.push({ id: 'phoenix_feather', name: 'Phoenix Feather', slot: 'jewelry', kind: 'feather', tier: 3, atk: 0, def: 0, hp: 10, stats: { resolve: 2 }, cost: { gold: 900, herbs: 12 }, shop: 'market' });

// Named gear: one of a kind, found only in the Legendary chests of the Deep Marches (rings 8-10).
type Named = [id: string, name: string, slot: ItemDef['slot'], kind: string, atk: number, def: number, hp: number, stats: Partial<Stats>, lore: string, hands?: 2, speed?: number];
const NAMED: Named[] = [
  ['dawnbreaker', 'Dawnbreaker', 'main', 'greatsword', 32, 0, 0, { might: 5 }, 'Forged for the first Guildmaster of Greyford. It glows at first light.', 2],
  ['mournblade', 'Mournblade', 'main', 'sword', 16, 0, 0, { might: 3, resolve: 3 }, 'Its edge hums a dirge for every foe it fells.'],
  ['whisper', 'Whisper', 'main', 'dagger', 12, 0, 0, { finesse: 10 }, 'Nobody has ever heard it drawn.'],
  ['starfall', 'Starfall', 'main', 'bow', 28, 0, 0, { finesse: 6 }, 'Strung with a thread from a falling star.', 2],
  ['ember_staff', 'The Ember Staff', 'main', 'staff', 24, 0, 0, { arcana: 12 }, "A brand from the Cinder Lord's own fire, tamed in oak.", 2],
  ['moonsilver', 'Moonsilver Wand', 'main', 'wand', 12, 0, 0, { arcana: 8, resolve: 4 }, 'Moonveil silver, cold to the touch even in summer.'],
  ['worldbreaker', 'Worldbreaker', 'main', 'warhammer', 36, 0, 0, { might: 6, finesse: -2 }, 'Said to be the hammer that cracked the Glacier Gate.', 2],
  ['aegis', 'Aegis of Greyford', 'off', 'shield', 0, 14, 50, { resolve: 4 }, "Every name in the Hall of the Fallen is carved on its rim."],
  ['heartwood', 'The Heartwood Tome', 'off', 'tome', 0, 0, 0, { arcana: 10, vigor: 3 }, 'Written in sap by the oldest tree in the Thornheart.'],
  ['wyrmscale', 'Wyrmscale Mail', 'armor', 'medium', 0, 18, 90, { vigor: 4 }, 'Scales shed by an elder dragon, riveted onto mithril.'],
  ['thornmantle', 'Thornmantle', 'armor', 'light', 0, 9, 55, { finesse: 6 }, 'A cloak of living briar that parts for its wearer and no one else.'],
  ['crown_of_kings', 'Crown of the Marches', 'jewelry', 'crown', 0, 2, 20, { might: 3, finesse: 3, arcana: 3, vigor: 3, resolve: 3 }, 'Every king of the Marches wore it. None of them for long.'],
];
for (const [id, name, slot, kind, atk, def, hp, stats, lore, hands, speed] of NAMED) {
  items.push({ id, name, slot, kind, hands: hands ?? (slot === 'main' ? 1 : undefined), tier: 4, atk, def, hp, stats, speed, cost: { gold: 3000 }, shop: slot === 'jewelry' ? 'market' : slot === 'main' || kind === 'tome' ? 'weaponsmith' : 'armorer', named: true, lore });
}
export const NAMED_ITEMS = NAMED.map(([id]) => id);

// Tribe gear: each tribe's own piece, crafted at its Embassy once the guild is an Ally (core/embassy).
type TribeGear = [id: string, name: string, tribe: Tribe, slot: ItemDef['slot'], kind: string, atk: number, def: number, hp: number, stats: Partial<Stats>, lore: string, hands?: 2];
const TRIBE_GEAR: TribeGear[] = [
  ['hearthguard', 'Hearthguard Shield', 'freeholders', 'off', 'shield', 0, 10, 35, { resolve: 3 }, 'Painted with every farm along the Old Mill Road.'],
  ['deeprune_plate', 'Deeprune Plate', 'ironroot', 'armor', 'heavy', 0, 14, 60, { vigor: 3, resolve: 2 }, 'The runes on it were old when the mountains were young.'],
  ['heartwood_bow', 'Heartwood Bow', 'thornkin', 'main', 'bow', 20, 0, 0, { finesse: 4 }, 'Grown, not carved. It still puts out leaves in spring.', 2],
  ['cinderbrand', 'Cinderbrand Axe', 'ashborn', 'main', 'axe', 22, 0, 0, { might: 4 }, 'Quenched in the lava of the Cinderreach. It never quite cools.'],
  ['reedfang', 'Reedfang', 'fenfolk', 'main', 'dagger', 11, 0, 0, { finesse: 6 }, "A pike's tooth set in reed and pitch. Fast as the fen."],
  ['moonglass_staff', 'Moonglass Staff', 'moonveil', 'main', 'staff', 18, 0, 0, { arcana: 7 }, 'It holds a little of every full moon it has seen.', 2],
  ['dawnstar', 'Dawnstar Mace', 'dawnwings', 'main', 'mace', 14, 0, 0, { arcana: 3, resolve: 3 }, 'Its head was cast in the first light over the Drifting Spires.'],
  ['gravecloak', 'Gravecloak', 'hollowed', 'armor', 'light', 0, 7, 40, { finesse: 3, arcana: 3 }, 'Woven from barrow mist. The dead pass the wearer by.'],
];
for (const [id, name, tribe, slot, kind, atk, def, hp, stats, lore, hands] of TRIBE_GEAR) {
  items.push({ id, name, slot, kind, hands: hands ?? (slot === 'main' ? 1 : undefined), tier: 3, atk, def, hp, stats, cost: { gold: 1500 }, shop: slot === 'main' ? 'weaponsmith' : 'armorer', named: true, lore, tribe });
}
export const TRIBE_GEAR_ITEMS = TRIBE_GEAR.map(([id]) => id);

export const ITEMS = items;
/** Items that never turn up as random loot. */
export const SPECIAL_ITEMS = new Set(['phoenix_feather', ...NAMED_ITEMS, ...TRIBE_GEAR.map(([id]) => id)]);
/** What chests, strangers and vaults can hold. */
export const LOOT_ITEMS = items.filter((i) => !SPECIAL_ITEMS.has(i.id));
export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));

export function itemSummary(d: ItemDef): string {
  const parts: string[] = [];
  if (d.atk) parts.push(`+${d.atk} damage`);
  if (d.def) parts.push(`+${d.def} armor`);
  if (d.hp) parts.push(`+${d.hp} health`);
  for (const [k, v] of Object.entries(d.stats)) parts.push(`${v! > 0 ? '+' : ''}${v} ${k}`);
  if (d.speed) parts.push(`${d.speed} speed`);
  if (d.hands === 2) parts.push('two-handed');
  return parts.join(', ');
}

/** Sell value: half the gold part of the price. */
export function sellValue(d: ItemDef): number {
  return Math.round((d.cost.gold ?? 0) / 2);
}
