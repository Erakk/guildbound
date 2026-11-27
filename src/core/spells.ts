// Owning spells: cards from packs, levels from duplicates, and the spellbook (which spells,
// in which hotkey order, the party takes on its next trip).

import { spellSlots } from './data/buildings';
import { MAX_STARS } from './data/heroes';
import { SPELL_BY_ID } from './data/spells';
import { COPIES_FOR_STAR } from './heroes';
import type { GameState, LoadoutSpell, OwnedSpell } from './types';

/** Duplicates needed to go from level N to N+1 (same curve as hero stars). Index = current level. */
export const COPIES_FOR_LEVEL = COPIES_FOR_STAR;

export function maxSpellLevel(id: string): number {
  return MAX_STARS[SPELL_BY_ID[id].rarity];
}

export type SpellCardResult = 'new' | 'copy' | 'level' | 'essence';

/** Adds one spell card to the collection. Duplicates count toward the next level, which applies at once. */
export function addSpellCard(s: GameState, id: string): SpellCardResult {
  const owned = s.spells[id];
  if (!owned) {
    s.spells[id] = { level: 1, copies: 0 };
    // A new spell goes straight into a free slot.
    if (s.spellbook.length < slotCount(s)) s.spellbook.push(id);
    return 'new';
  }
  if (owned.level >= maxSpellLevel(id)) {
    s.essence += 1;
    return 'essence';
  }
  owned.copies += 1;
  if (owned.copies >= COPIES_FOR_LEVEL[owned.level]) {
    owned.copies -= COPIES_FOR_LEVEL[owned.level];
    owned.level += 1;
    return 'level';
  }
  return 'copy';
}

export function slotCount(s: GameState): number {
  return spellSlots(s.buildings.magetower ?? 0);
}

/** Puts a spell in the spellbook (at the end, or in place of the spell in `slot`). */
export function equipSpell(s: GameState, id: string, slot?: number): boolean {
  if (!s.spells[id] || s.spellbook.includes(id)) return false;
  const max = slotCount(s);
  if (slot !== undefined && slot < s.spellbook.length) s.spellbook[slot] = id;
  else if (s.spellbook.length < max) s.spellbook.push(id);
  else return false;
  return true;
}

export function unequipSpell(s: GameState, id: string): void {
  s.spellbook = s.spellbook.filter((x) => x !== id);
}

/** Moves a spell one hotkey earlier or later. */
export function moveSpell(s: GameState, id: string, by: -1 | 1): void {
  const i = s.spellbook.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= s.spellbook.length) return;
  [s.spellbook[i], s.spellbook[j]] = [s.spellbook[j], s.spellbook[i]];
}

/** The spells (and their levels) packed for a trip. */
export function loadout(s: GameState): LoadoutSpell[] {
  return s.spellbook.slice(0, slotCount(s)).filter((id) => s.spells[id] && SPELL_BY_ID[id]).map((id) => ({ id, level: s.spells[id].level }));
}

export function ownedSpell(s: GameState, id: string): OwnedSpell | undefined {
  return s.spells[id];
}
