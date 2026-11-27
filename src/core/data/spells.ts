import type { SpellDef } from '../types';

// Guildmaster spells: cast from the live map onto the battlefield. They come from packs
// as spell cards; duplicates raise a spell's level, and each level makes it about 20% stronger.
// A new guild has none: the Mage Tower opens the spellbook. Common spells are blessings (gold,
// materials, XP, finds); support and control are Uncommon; damage starts at Rare.
export const SPELLS: SpellDef[] = [
  // Common: the Guildmaster's everyday blessings. Nothing here hurts anyone.
  { id: 'fortune', name: "Fortune's Favor", rarity: 'common', mana: 30, cooldownSec: 45, radius: 150, target: 'ground',
    description: 'For 30 seconds, foes, chests and discoveries give 50% more gold.', perLevel: '+20% to the bonus' },
  { id: 'harvest', name: 'Bountiful Harvest', rarity: 'common', mana: 25, cooldownSec: 45, radius: 150, target: 'ground',
    description: 'For 30 seconds, every material the party picks up is doubled.', perLevel: '+20% to the bonus' },
  { id: 'insight', name: "Sage's Insight", rarity: 'common', mana: 30, cooldownSec: 45, radius: 150, target: 'ground',
    description: 'For 30 seconds, every foe the party defeats gives 50% more XP.', perLevel: '+20% to the bonus' },
  { id: 'reveal', name: 'Reveal', rarity: 'common', mana: 20, cooldownSec: 20, radius: 220, target: 'ground',
    description: 'Uncovers hidden finds near the spot: click them before they fade.', perLevel: '+20% gold; a third find at level 3' },
  // Uncommon: support and control.
  { id: 'heal_rain', name: 'Healing Rain', rarity: 'uncommon', mana: 35, cooldownSec: 12, radius: 130, target: 'heroes',
    description: 'Heals every hero in the area.', perLevel: '+20% healing' },
  { id: 'haste', name: 'Haste', rarity: 'uncommon', mana: 30, cooldownSec: 18, radius: 140, target: 'heroes',
    description: 'Heroes in the area move and strike 35% faster for a while.', perLevel: '+20% duration' },
  { id: 'ward', name: 'Ward against Fear', rarity: 'uncommon', mana: 25, cooldownSec: 25, radius: 160, target: 'heroes',
    description: 'Nobody in the area hesitates or flees, and the party\'s morale lifts.', perLevel: '+20% duration' },
  { id: 'entangle', name: 'Entangling Roots', rarity: 'uncommon', mana: 30, cooldownSec: 14, radius: 100, target: 'enemies',
    description: 'Roots enemies in place. They can still hit whatever is next to them.', perLevel: '+20% duration' },
  { id: 'barrier', name: 'Stoneskin', rarity: 'uncommon', mana: 40, cooldownSec: 20, radius: 120, target: 'heroes',
    description: 'Wraps heroes in stone that soaks up damage until it breaks.', perLevel: '+20% shield' },
  // Rare: the first real battle magic.
  { id: 'rally', name: 'Rallying Cry', rarity: 'rare', mana: 35, cooldownSec: 22, radius: 150, target: 'heroes',
    description: 'Heroes in the area hit 25% harder for a while.', perLevel: '+20% duration' },
  { id: 'lightning', name: 'Lightning Strike', rarity: 'rare', mana: 30, cooldownSec: 8, radius: 70, target: 'enemies',
    description: 'Strikes every enemy in a small area.', perLevel: '+20% damage' },
  { id: 'frost', name: 'Frost Nova', rarity: 'rare', mana: 35, cooldownSec: 14, radius: 110, target: 'enemies',
    description: 'Chills enemies: some damage, and they move and attack slower. Puts out burning ground.', perLevel: '+20% damage and duration' },
  // Epic and Legendary: the big guns.
  { id: 'fireball', name: 'Fireball', rarity: 'epic', mana: 45, cooldownSec: 12, radius: 90, target: 'enemies',
    description: 'A burst of flame that hits every enemy in the area hard.', perLevel: '+20% damage' },
  { id: 'meteor', name: 'Meteor', rarity: 'legendary', mana: 70, cooldownSec: 40, radius: 120, target: 'enemies',
    description: 'Calls down a falling star. Few things get up again.', perLevel: '+20% damage' },
  { id: 'second_wind', name: 'Second Wind', rarity: 'legendary', mana: 80, cooldownSec: 60, radius: 160, target: 'heroes',
    description: 'Knocked-out heroes in the area get back up, and the rest are healed.', perLevel: '+20% health on rising' },
];

export const SPELL_BY_ID: Record<string, SpellDef> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

/** A new guild starts without spells (the Mage Tower opens the spellbook). */
export const STARTER_SPELLS: string[] = [];

/** How much stronger a spell is at a level: +20% per level above 1. */
export function spellPower(level: number): number {
  return 1 + 0.2 * (level - 1);
}
