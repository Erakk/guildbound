import { unlockedClasses } from './achievements';
import { HERO_BY_ID, HEROES, MAX_STARS } from './data/heroes';
import { PACKS, PACK_TYPES, type PackType } from './data/packs';
import { SPELL_BY_ID, SPELLS } from './data/spells';
import { COPIES_FOR_STAR, levelCap, xpToNext, addXp } from './heroes';
import { Rng } from './rng';
import { addSpellCard, type SpellCardResult } from './spells';
import { addHero } from './state';
import type { GameState, HeroDef, Rarity, SavedCard, SpellDef, Tribe } from './types';
import { PRESTIGE_CLASSES, RARITIES } from './types';

export const RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
export const CARDS_PER_PACK = 5;
/** Recruit Packs: a Rare or better within every 10, an Epic or better within every 50. */
export const PITY_RARE = 10;
export const PITY_EPIC = 50;
/** Chance that a Recruit Pack holds a spell card. */
export const SPELL_CHANCE = PACKS.recruit.spellChance;

export type PackCard =
  | { kind: 'hero'; rarity: Rarity; def: HeroDef; result: 'new' | 'copy' | 'essence'; heroUid: string }
  | { kind: 'hero'; rarity: Rarity; def: HeroDef; result: 'training'; heroUid: string; xp: number; levels: number }
  | { kind: 'spell'; rarity: Rarity; spell: SpellDef; result: SpellCardResult; level: number };

/** Heroes that can come out of a pack: everyone except prestige classes that are still locked. */
export function packPool(state: GameState): HeroDef[] {
  const open = unlockedClasses(state);
  return HEROES.filter((h) => (!(PRESTIGE_CLASSES as string[]).includes(h.heroClass) || open.has(h.heroClass as never))
    && (!h.secret || (state.secrets?.found ?? []).includes(h.id)));
}

/** A pack's cards as the save keeps them while the reveal is unfinished. */
export function saveCards(cards: PackCard[]): SavedCard[] {
  return cards.map((c) => c.kind === 'spell'
    ? { kind: 'spell', id: c.spell.id, rarity: c.rarity, result: c.result, level: c.level }
    : { kind: 'hero', id: c.def.id, rarity: c.rarity, result: c.result, heroUid: c.heroUid, ...(c.result === 'training' ? { xp: c.xp, levels: c.levels } : {}) });
}

/** And back again, for the Packs screen. */
export function loadCards(saved: SavedCard[]): PackCard[] {
  return saved.map((c): PackCard => c.kind === 'spell'
    ? { kind: 'spell', rarity: c.rarity, spell: SPELL_BY_ID[c.id], result: c.result as SpellCardResult, level: c.level ?? 1 }
    : c.result === 'training'
      ? { kind: 'hero', rarity: c.rarity, def: HERO_BY_ID[c.id], result: 'training', heroUid: c.heroUid ?? '', xp: c.xp ?? 0, levels: c.levels ?? 0 }
      : { kind: 'hero', rarity: c.rarity, def: HERO_BY_ID[c.id], result: c.result as 'new' | 'copy' | 'essence', heroUid: c.heroUid ?? '' });
}

/** Packs of this type ready to open: whole ones, plus one more if enough pieces are saved up. */
export function packsReady(state: GameState, type: PackType): number {
  return state.packs[type] + Math.floor(state.pieces[type] / PACKS[type].pieces);
}

export function totalPacksReady(state: GameState): number {
  return PACK_TYPES.reduce((a, t) => a + packsReady(state, t), 0);
}

/** Opens a pack of this type (a whole one first, otherwise assembled from pieces). Null if there's none. */
export function openPack(state: GameState, rng: Rng, type: PackType = 'recruit'): PackCard[] | null {
  const def = PACKS[type];
  if (state.packs[type] > 0) state.packs[type] -= 1;
  else if (state.pieces[type] >= def.pieces) state.pieces[type] -= def.pieces;
  else return null;
  state.opened = { ...(state.opened ?? {}), [type]: (state.opened?.[type] ?? 0) + 1 };
  if (type === 'novice') return openNovice(state, rng);

  const weights = RARITIES.map((value) => ({ value, weight: def.weights[value] }));
  const rarities: Rarity[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) rarities.push(rng.weighted(weights));

  // The pack's own guarantee, and (for Recruit Packs) the bad-luck protection.
  // The tutorial's gift pack holds a Rare (or better) hero.
  const gift = type === 'recruit' && !!state.tutorial.flags.giftPack;
  if (gift) state.tutorial.flags.giftPack = false;
  const best = Math.max(...rarities.map((r) => RANK[r]));
  let floor = def.guaranteed ? RANK[def.guaranteed] : gift ? RANK.rare : 0;
  if (type === 'recruit') {
    if (state.pity.sinceEpic + 1 >= PITY_EPIC) floor = Math.max(floor, RANK.epic);
    else if (state.pity.sinceRare + 1 >= PITY_RARE) floor = Math.max(floor, RANK.rare);
  }
  if (best < floor) rarities[CARDS_PER_PACK - 1] = RARITIES[floor];
  if (type === 'recruit') {
    const finalBest = Math.max(...rarities.map((r) => RANK[r]));
    state.pity.sinceRare = finalBest >= RANK.rare ? 0 : state.pity.sinceRare + 1;
    state.pity.sinceEpic = finalBest >= RANK.epic ? 0 : state.pity.sinceEpic + 1;
  }
  state.packsOpened += 1;

  // Show the best card last, so the reveal builds up.
  rarities.sort((a, b) => RANK[a] - RANK[b]);
  const pool = packPool(state);

  // Hero packs hold a spell card only now and then (and only once the Mage Tower has opened the spellbook):
  // at most one, among the lesser cards. A Grimoire is all spells.
  const spellsOpen = (state.buildings.magetower ?? 0) > 0;
  const spellAt = def.spellChance >= 1 ? -2 : !gift && spellsOpen && rng.chance(def.spellChance) ? rng.int(0, CARDS_PER_PACK - 2) : -1;
  return rarities.map((rarity, i): PackCard => {
    const spells = SPELLS.filter((s) => s.rarity === rarity);
    const spellCard = spellAt === -2 || spellAt === i;
    if (spells.length && spellCard) {
      const spell = rng.pick(spells);
      const result = addSpellCard(state, spell.id);
      return { kind: 'spell', rarity, spell, result, level: state.spells[spell.id].level };
    }
    return grantHero(state, rng.pick(pool.filter((h) => h.rarity === rarity)), rarity);
  });
}

/** A hero card: a new hero, a copy towards the next star, or (when copies can't help any more) Essence. */
function grantHero(state: GameState, d: HeroDef, rarity: Rarity): PackCard {
  const owned = state.roster.find((h) => h.defId === d.id);
  if (!owned) {
    const h = addHero(state, d.id);
    return { kind: 'hero', rarity, def: d, result: 'new', heroUid: h.uid };
  }
  // Copies beyond what max stars can ever use turn into Essence.
  const maxUsable = copiesStillUseful(owned.stars, MAX_STARS[d.rarity]) - owned.copies;
  if (maxUsable > 0) {
    owned.copies += 1;
    return { kind: 'hero', rarity, def: d, result: 'copy', heroUid: owned.uid };
  }
  state.essence += 1;
  return { kind: 'hero', rarity, def: d, result: 'essence', heroUid: owned.uid };
}

/**
 * A Tribe Pack (from an Embassy): five hero cards at Recruit Pack odds, `fromTribe` of them heroes of one
 * tribe. Where the tribe has nobody of the rolled rarity, the nearest lower one of theirs stands in.
 * No spells, and it doesn't touch the Recruit Packs' bad-luck counter.
 */
export function openTribePack(state: GameState, rng: Rng, tribe: Tribe, fromTribe: number): PackCard[] {
  const weights = RARITIES.map((value) => ({ value, weight: PACKS.recruit.weights[value] }));
  const rarities: Rarity[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) rarities.push(rng.weighted(weights));
  rarities.sort((a, b) => RANK[a] - RANK[b]);
  state.packsOpened += 1;
  state.opened = { ...(state.opened ?? {}), recruit: (state.opened?.recruit ?? 0) + 1 };
  const pool = packPool(state);
  const tribal = pool.filter((h) => h.tribe === tribe);
  const marks = new Set<number>();
  while (marks.size < Math.min(fromTribe, CARDS_PER_PACK)) marks.add(rng.int(0, CARDS_PER_PACK - 1));
  return rarities.map((rarity, i) => {
    let r = rarity;
    let choices = (marks.has(i) ? tribal : pool).filter((h) => h.rarity === r);
    if (!choices.length && marks.has(i)) {
      for (let k = RANK[rarity]; k >= 0 && !choices.length; k--) {
        r = RARITIES[k];
        choices = tribal.filter((h) => h.rarity === r);
      }
    }
    if (!choices.length) {
      r = rarity;
      choices = pool.filter((h) => h.rarity === r);
    }
    return grantHero(state, rng.pick(choices), r);
  });
}

/** Chance a Novice Pack holds a new recruit (a Common), instead of five upgrades. */
export const NOVICE_NEW_CHANCE = 0.12;

/**
 * A Novice Pack: five upgrades for heroes the guild already has, party members first. An upgrade is a copy
 * (towards the next star) while copies still help, otherwise a drill worth most of a level. Once in a
 * while one card is a new Common hero; the tutorial's gift pack holds a new Rare.
 */
function openNovice(state: GameState, rng: Rng): PackCard[] {
  const gift = !!state.tutorial.flags.giftPack;
  if (gift) state.tutorial.flags.giftPack = false;
  state.packsOpened += 1;
  const newAt = gift ? CARDS_PER_PACK - 1 : rng.chance(NOVICE_NEW_CHANCE) ? rng.int(0, CARDS_PER_PACK - 1) : -1;
  const inParty = new Set(state.parties.flatMap((p) => p.slots).filter(Boolean));
  const cards: PackCard[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) {
    if (i === newAt) {
      const rarity: Rarity = gift ? 'rare' : 'common';
      const fresh = packPool(state).filter((d) => d.rarity === rarity && !state.roster.some((h) => h.defId === d.id));
      if (fresh.length) {
        const d = rng.pick(fresh);
        const h = addHero(state, d.id);
        cards.push({ kind: 'hero', rarity, def: d, result: 'new', heroUid: h.uid });
        continue;
      }
    }
    // Someone who can still grow, the party most of all.
    const growing = state.roster.filter((h) => {
      const d = HERO_BY_ID[h.defId];
      return copiesStillUseful(h.stars, MAX_STARS[d.rarity]) - h.copies > 0 || h.level < levelCap(h);
    });
    const pool = growing.length ? growing : state.roster;
    const h = rng.weighted(pool.map((x) => ({ value: x, weight: inParty.has(x.uid) ? 4 : 1 })));
    const d = HERO_BY_ID[h.defId];
    const copyHelps = copiesStillUseful(h.stars, MAX_STARS[d.rarity]) - h.copies > 0;
    const canTrain = h.level < levelCap(h);
    if (copyHelps && (!canTrain || rng.chance(0.5))) {
      h.copies += 1;
      cards.push({ kind: 'hero', rarity: d.rarity, def: d, result: 'copy', heroUid: h.uid });
    } else if (canTrain) {
      const xp = Math.round(xpToNext(h.level) * 0.75);
      const levels = addXp(h, xp);
      cards.push({ kind: 'hero', rarity: d.rarity, def: d, result: 'training', heroUid: h.uid, xp, levels });
    } else {
      state.essence += 1;
      cards.push({ kind: 'hero', rarity: d.rarity, def: d, result: 'essence', heroUid: h.uid });
    }
  }
  // The new face last, so the reveal builds up.
  return [...cards.filter((c) => c.result !== 'new'), ...cards.filter((c) => c.result === 'new')];
}

function copiesStillUseful(stars: number, maxStars: number): number {
  let n = 0;
  for (let s = stars; s < maxStars; s++) n += COPIES_FOR_STAR[s];
  return n;
}
