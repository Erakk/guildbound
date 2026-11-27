import type { Rarity } from '../types';

// Pack types. Gold doesn't buy packs: each type is assembled from its own pieces, found on
// expeditions, or given whole by quests, sealed chests, the Tavern and achievements.
// Rarer packs need more pieces and hold better cards.

export type PackType = 'novice' | 'recruit' | 'grimoire' | 'veteran' | 'champion';
export const PACK_TYPES: PackType[] = ['novice', 'recruit', 'grimoire', 'veteran', 'champion'];

export interface PackDef {
  id: PackType;
  name: string;
  /** Pieces needed to assemble one. */
  pieces: number;
  /** Rarity odds for each card. */
  weights: Record<Rarity, number>;
  /** The best card is at least this rare. */
  guaranteed?: Rarity;
  /** Chance the pack holds one spell card among its heroes (1 = spells only: a Grimoire). */
  spellChance: number;
  description: string;
  /** Seal colour on the pack art. */
  color: string;
}

export const PACKS: Record<PackType, PackDef> = {
  // The first packs: they train the heroes the guild already has, so a new Guildmaster gets to know five
  // heroes well instead of meeting twenty at once. A new face is rare.
  novice: {
    id: 'novice', name: 'Novice Pack', pieces: 4, spellChance: 0, color: '#4F7A3A',
    weights: { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    description: 'Training for the heroes you have: copies that raise their stars, and drills that raise their level. Once in a while, a new recruit.',
  },
  recruit: {
    id: 'recruit', name: 'Recruit Pack', pieces: 5, spellChance: 0.07, color: '#8E2B23',
    weights: { common: 60, uncommon: 25, rare: 11, epic: 3.5, legendary: 0.5 },
    description: 'Five cards at the usual odds. A Rare or better is guaranteed within every 10 Recruit Packs.',
  },
  grimoire: {
    id: 'grimoire', name: 'Grimoire', pieces: 10, spellChance: 1, color: '#3D6178', guaranteed: 'uncommon',
    weights: { common: 50, uncommon: 30, rare: 14, epic: 5, legendary: 1 },
    description: 'A rare find: five spell cards, at least one Uncommon or better.',
  },
  veteran: {
    id: 'veteran', name: 'Veteran Pack', pieces: 8, spellChance: 0.12, color: '#B8963C', guaranteed: 'rare',
    weights: { common: 0, uncommon: 55, rare: 33, epic: 10, legendary: 2 },
    description: 'No Commons, and at least one Rare or better.',
  },
  champion: {
    id: 'champion', name: 'Champion Pack', pieces: 12, spellChance: 0.2, color: '#6E4A9A', guaranteed: 'epic',
    weights: { common: 0, uncommon: 0, rare: 62, epic: 30, legendary: 8 },
    description: 'Rare or better only, and at least one Epic or better.',
  },
};

/** What a piece is worth on the roll tables below (weights; 'none' = no piece). */
export type PieceRoll = [PackType | 'none', number][];

/** A chest by the trail. Better pieces turn up in more dangerous areas. */
export function chestPieceRoll(tier: number): PieceRoll {
  // In the meadows (tier 1) a piece is a rarer find: the Tavern is a new guild's main source of packs.
  // (Grimoires are a rare find: never in an ordinary chest.)
  return [['none', 58], [tier <= 1 ? 'novice' : 'recruit', tier <= 1 ? 10 : 30], ['veteran', tier >= 2 ? 5 : 0], ['champion', tier >= 5 ? 7 : tier >= 3 ? 2 : 0]];
}

/** In the meadows outside town (danger tier 1), pieces are for Novice Packs. */
export function earlyPieces(roll: PieceRoll, tier: number): PieceRoll {
  return tier <= 1 ? roll.map(([t, w]) => (t === 'recruit' ? ['novice', w * 0.4] : t === 'grimoire' ? ['none', w] : [t, w])) : roll;
}

/** A glint the Guildmaster clicked. */
export const FIND_PIECE_ROLL: PieceRoll = [['none', 78], ['recruit', 18], ['veteran', 2]];

/** The end of a secret path: always something. */
export const SECRET_PIECE_ROLL: PieceRoll = [['recruit', 55], ['grimoire', 4], ['veteran', 32], ['champion', 9]];
