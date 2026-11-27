// Town rules: buildings and construction, shops, equipment, the Market, the Temple and the Tavern.
// Everything takes `now` (ms) as an argument so it stays testable.

import { BUILDING_BY_ID, MATERIAL_VALUE } from './data/buildings';
import { HERO_BY_ID } from './data/heroes';
import { canWear, ITEM_BY_ID, ITEMS, PROFICIENT, sellValue } from './data/items';
import { def, power } from './heroes';
import type { Cost, GameState, GearSlot, HeroInstance, ItemDef, ItemInstance, Material, RegionDef } from './types';
import { MATERIALS } from './types';
import { SPELLS } from './data/spells';
import { Rng } from './rng';
import { addSpellCard } from './spells';

/** Share of the road the Stables take off, by level. */
export const STABLES_CUT = [0, 0.15, 0.3, 0.45];

/** Seconds on the road each way to a region, with the Stables' share taken off. */
export function travelSec(state: GameState, region: RegionDef): number {
  const cut = STABLES_CUT[state.buildings.stables ?? 0] ?? 0;
  return Math.round((region.travelSec ?? 0) * (1 - cut));
}

// ---- Power (heroes plus their gear) ----

/**
 * What a hero's gear adds to their power: weapon damage (half for an untrained weapon), armor,
 * health and stat bonuses, weighted the way they count in a fight. Calibrated against test runs
 * so that gear and levels count the same toward a region's recommended power.
 */
export function gearPower(state: GameState, h: HeroInstance): number {
  const cls = def(h).heroClass;
  let p = 0;
  for (const uid of Object.values(h.gear)) {
    const d = ITEM_BY_ID[state.items.find((i) => i.uid === uid)?.defId ?? ''];
    if (!d) continue;
    const atk = d.slot === 'main' && !PROFICIENT[cls].includes(d.kind) ? d.atk * 0.5 : d.atk;
    p += 2 * atk + 3 * d.def + 0.3 * d.hp + 2 * Object.values(d.stats).reduce((a, b) => a + (b ?? 0), 0);
  }
  return Math.round(p);
}

/** A hero's power with their gear on. */
export function heroStrength(state: GameState, h: HeroInstance): number {
  return power(h) + gearPower(state, h);
}

// ---- Costs ----

export function canAfford(state: GameState, cost: Cost): boolean {
  for (const [k, v] of Object.entries(cost)) {
    if (!v) continue;
    const have = k === 'gold' ? state.gold : state.materials[k as Material];
    if (have < v) return false;
  }
  return true;
}

function pay(state: GameState, cost: Cost) {
  for (const [k, v] of Object.entries(cost)) {
    if (!v) continue;
    if (k === 'gold') state.gold -= v;
    else state.materials[k as Material] -= v;
  }
}

export function costEntries(cost: Cost): [string, number][] {
  return Object.entries(cost).filter(([, v]) => (v ?? 0) > 0) as [string, number][];
}

// ---- Buildings ----

export function level(state: GameState, id: string): number {
  return state.buildings[id] ?? 0;
}

export type UpgradeBlock = 'max' | 'townhall' | 'busy' | 'cost' | null;

export function upgradeBlock(state: GameState, id: string): UpgradeBlock {
  const b = BUILDING_BY_ID[id];
  const next = level(state, id) + 1;
  if (next > b.maxLevel) return 'max';
  if (id !== 'townhall' && next > level(state, 'townhall')) return 'townhall';
  if (state.construction) return 'busy';
  if (!canAfford(state, b.cost(next))) return 'cost';
  return null;
}

export function startUpgrade(state: GameState, id: string, now: number): boolean {
  if (upgradeBlock(state, id)) return false;
  const b = BUILDING_BY_ID[id];
  const next = level(state, id) + 1;
  pay(state, b.cost(next));
  state.construction = { id, level: next, endsAt: now + b.time(next) * 1000 };
  return true;
}

/** Finishes construction whose timer has run out. Returns the building finished, if any. */
export function tickTown(state: GameState, now: number): string | null {
  const c = state.construction;
  if (!c || now < c.endsAt) return null;
  state.buildings[c.id] = c.level;
  state.construction = null;
  // The Tavern's welcome gift is its first pack (see the tutorial); the free ones start a full interval later.
  if (c.id === 'tavern' && c.level === 1) state.tavernNextPackAt = now + tavernInterval(state);
  // The Mage Tower's first scholar brings a spell (a Common one the guild doesn't have yet).
  if (c.id === 'magetower' && c.level === 1) {
    const fresh = SPELLS.filter((sp) => sp.rarity === 'common' && !state.spells[sp.id]);
    if (fresh.length) {
      const sp = fresh[Math.floor(new Rng(state.nextUid * 7919 + 13).next() * fresh.length)];
      addSpellCard(state, sp.id);
      state.firstSpell = sp.id;
    }
  }
  return c.id;
}

// ---- Tavern ----

/** Is the guild still new? Until the Town Hall is raised, the Tavern and easy contracts give Novice Packs. */
export function noviceEra(state: GameState): boolean {
  return level(state, 'townhall') < 2;
}

export function tavernInterval(state: GameState): number {
  const l = level(state, 'tavern');
  return l ? (4 - 0.5 * (l - 1)) * 3600 * 1000 : Infinity;
}

export function tavernPackReady(state: GameState, now: number): boolean {
  return level(state, 'tavern') > 0 && now >= state.tavernNextPackAt;
}

export function claimTavernPack(state: GameState, now: number): boolean {
  if (!tavernPackReady(state, now)) return false;
  // A new guild's Tavern hands out Novice Packs; once the Town Hall is raised, Recruit Packs.
  state.packs[noviceEra(state) ? 'novice' : 'recruit'] += 1;
  state.tavernNextPackAt = now + tavernInterval(state);
  return true;
}

// ---- Items and shops ----

export function shopStock(state: GameState, shop: ItemDef['shop']): ItemDef[] {
  const l = level(state, shop);
  // (Named gear and the tribes' own gear are never for sale.)
  return ITEMS.filter((i) => i.shop === shop && i.tier <= l && !i.named && !i.tribe);
}

export function addItem(state: GameState, defId: string): ItemInstance {
  const it = { uid: `i${state.nextUid++}`, defId };
  state.items.push(it);
  return it;
}

/** The two smithies, which forge gear to order instead of selling it off the shelf. */
export type Forge = 'weaponsmith' | 'armorer';
export const FORGES: Forge[] = ['weaponsmith', 'armorer'];
const isForge = (shop: string): shop is Forge => shop === 'weaponsmith' || shop === 'armorer';

/** How long a piece takes at the anvil, by metal: iron 45 seconds, steel 3 minutes, mithril 8. */
export const FORGE_SEC = [0, 45, 180, 480];
export function forgeTime(d: ItemDef): number {
  return FORGE_SEC[Math.max(1, Math.min(3, d.tier))] * 1000;
}

/** What a smithy is making now, if anything. */
export function forgeJob(state: GameState, shop: Forge) {
  return state.forge?.[shop] ?? null;
}

/** Orders a piece from a smithy: paid up front, ready when the smith is done. One piece at a time per smithy. */
export function startForge(state: GameState, defId: string, now: number): boolean {
  const d = ITEM_BY_ID[defId];
  if (!d || !isForge(d.shop) || d.named || d.tribe) return false;
  if (level(state, d.shop) < d.tier || forgeJob(state, d.shop) || !canAfford(state, d.cost)) return false;
  pay(state, d.cost);
  (state.forge ??= {})[d.shop] = { defId, startedAt: now, endsAt: now + forgeTime(d) };
  return true;
}

/** Finished pieces go to the storehouse. Returns what was finished. */
export function tickForge(state: GameState, now: number): ItemDef[] {
  const done: ItemDef[] = [];
  for (const shop of FORGES) {
    const job = state.forge?.[shop];
    if (!job || now < job.endsAt) continue;
    delete state.forge![shop];
    addItem(state, job.defId);
    done.push(ITEM_BY_ID[job.defId]);
  }
  return done;
}

/** Buys off the shelf: only the Market's jewelry. The smithies forge to order (startForge). */
export function buyItem(state: GameState, defId: string): ItemInstance | null {
  const d = ITEM_BY_ID[defId];
  if (!d || isForge(d.shop) || level(state, d.shop) < d.tier || !canAfford(state, d.cost)) return null;
  pay(state, d.cost);
  return addItem(state, defId);
}

export function itemOwner(state: GameState, itemUid: string): HeroInstance | undefined {
  return state.roster.find((h) => Object.values(h.gear).includes(itemUid));
}

export function gearDefs(state: GameState, h: HeroInstance): ItemDef[] {
  return Object.values(h.gear)
    .map((u) => state.items.find((i) => i.uid === u))
    .filter((i): i is ItemInstance => !!i)
    .map((i) => ITEM_BY_ID[i.defId]);
}

/** Equips an item (moving it off any other hero) and applies the one-handed rule. */
export function equip(state: GameState, heroUid: string, itemUid: string): boolean {
  const hero = state.roster.find((h) => h.uid === heroUid);
  const item = state.items.find((i) => i.uid === itemUid);
  if (!hero || !item) return false;
  const d = ITEM_BY_ID[item.defId];
  // Gear is class-specific: a hero can't put on what their class doesn't use.
  if (!canWear(HERO_BY_ID[hero.defId].heroClass, d)) return false;
  const prev = itemOwner(state, itemUid);
  if (prev) for (const k of Object.keys(prev.gear) as GearSlot[]) if (prev.gear[k] === itemUid) delete prev.gear[k];
  hero.gear[d.slot] = itemUid;
  // A two-handed weapon leaves no hand free; an off-hand needs a one-handed weapon (or none).
  if (d.slot === 'main' && d.hands === 2) delete hero.gear.off;
  if (d.slot === 'off') {
    const main = hero.gear.main && state.items.find((i) => i.uid === hero.gear.main);
    if (main && ITEM_BY_ID[main.defId].hands === 2) delete hero.gear.main;
  }
  return true;
}

export function unequip(state: GameState, heroUid: string, slot: GearSlot) {
  const hero = state.roster.find((h) => h.uid === heroUid);
  if (hero) delete hero.gear[slot];
}

// ---- Market ----

export function marketRate(state: GameState): number {
  return 0.8 + 0.2 * level(state, 'market');
}

export function sellItem(state: GameState, itemUid: string): number {
  if (level(state, 'market') < 1) return 0;
  const idx = state.items.findIndex((i) => i.uid === itemUid);
  if (idx < 0 || itemOwner(state, itemUid)) return 0;
  const gold = Math.round(sellValue(ITEM_BY_ID[state.items[idx].defId]) * marketRate(state));
  state.items.splice(idx, 1);
  state.gold += gold;
  return gold;
}

export function sellMaterial(state: GameState, m: Material, n: number): number {
  if (level(state, 'market') < 1 || state.materials[m] < n || n <= 0) return 0;
  const gold = Math.round(MATERIAL_VALUE[m] * n * marketRate(state));
  state.materials[m] -= n;
  state.gold += gold;
  return gold;
}

export function buyMaterialPrice(state: GameState, m: Material): number {
  return Math.ceil((MATERIAL_VALUE[m] * 3) / marketRate(state));
}

export function buyMaterial(state: GameState, m: Material, n: number): boolean {
  const price = buyMaterialPrice(state, m) * n;
  if (level(state, 'market') < 1 || state.gold < price || n <= 0) return false;
  state.gold -= price;
  state.materials[m] += n;
  return true;
}

// ---- Temple and wounds ----

/** How long a hero knocked out in a region of this tier stays wounded. */
export function woundDurationMs(state: GameState, tier: number): number {
  return 90_000 * tier * (1 - 0.25 * level(state, 'temple'));
}

export function isWounded(h: HeroInstance, now: number): boolean {
  return !!h.woundedUntil && h.woundedUntil > now;
}

export function healCost(h: HeroInstance, now: number): number {
  return isWounded(h, now) ? Math.ceil(((h.woundedUntil! - now) / 60_000) * 12) : 0;
}

export function healNow(state: GameState, heroUid: string, now: number): boolean {
  const h = state.roster.find((x) => x.uid === heroUid);
  if (!h || level(state, 'temple') < 1) return false;
  const cost = healCost(h, now);
  if (!cost || state.gold < cost) return false;
  state.gold -= cost;
  h.woundedUntil = undefined;
  return true;
}

export function emptyMaterials(): Record<Material, number> {
  return Object.fromEntries(MATERIALS.map((m) => [m, 0])) as Record<Material, number>;
}
