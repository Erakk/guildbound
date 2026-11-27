// Scouting. Only scouts (Rangers, Rogues, Beastmasters and a few curious souls) can map new land:
// an area has to be scouted before a party can go there. Scouts can also search land already on
// the map for sites (an enemy camp, a monster's lair, a dungeon, a hidden cache or a shrine), which
// parties can then go and deal with.
//
// A scouting trip is a timed job for one hero, settled by one seeded roll when it ends: no live map.
// It can go wrong. A scout who is chased off comes back wounded, and in a skull area may not come
// back at all.

import { HERO_BY_ID } from './data/heroes';
import { ABILITY_TRIBE, ENEMY_BY_ID, recommendedPower, REGION_BY_ID } from './data/world';
import { def } from './heroes';
import { reachBlock } from './hold';
import { outingBlock } from './state';
import { Rng } from './rng';
import { heroStrength, isWounded, travelSec, woundDurationMs } from './town';
import type { Biome, GameState, HeroClass, HeroInstance, RegionDef, ScoutMission, Site, SiteKind } from './types';

export const SCOUT_CLASSES: HeroClass[] = ['ranger', 'rogue', 'beastmaster'];
/** Heroes of other classes who scout anyway. */
export const SCOUT_HEROES = ['tamsin', 'faelan', 'ixa', 'pip', 'lumen'];
/** Most sites one area can hold at a time. */
export const MAX_SITES = 3;

export function isScout(h: HeroInstance): boolean {
  return SCOUT_CLASSES.includes(def(h).heroClass) || SCOUT_HEROES.includes(h.defId);
}

/** Seconds of scouting by ring (on top of half the road each way: scouts travel light). */
const SCOUT_SEC = [0, 90, 150, 240, 360, 480, 600, 720, 900, 1080, 1260];

export function scoutSeconds(state: GameState, h: HeroInstance, region: RegionDef): number {
  const base = SCOUT_SEC[Math.min(SCOUT_SEC.length - 1, region.ring)] + travelSec(state, region);
  // Rangers read the land fastest.
  return Math.round(base * (def(h).heroClass === 'ranger' ? 0.85 : 1));
}

/** Chance the scout gets in and out unseen: their power against a fifth of a party's recommendation. */
export function scoutChance(state: GameState, h: HeroInstance, region: RegionDef): number {
  const need = recommendedPower(region.tier) / 5;
  const ratio = Math.min(1.2, heroStrength(state, h) / need);
  // About 95% at full strength, 70% at three quarters, 40% at half, 20% at a quarter.
  let p = 0.05 + 0.9 * Math.pow(ratio, 1.3);
  const tribe = HERO_BY_ID[h.defId].tribe;
  if (tribe === 'thornkin' && (region.biome === 'forest' || region.biome === 'haunted')) p += 0.1;
  if (tribe === 'moonveil') p += 0.05;
  if (def(h).heroClass === 'rogue') p += 0.05;
  return Math.max(0.1, Math.min(0.97, p));
}

/** Why this hero can't scout that area now, or null if they can. */
export function scoutBlock(state: GameState, h: HeroInstance, region: RegionDef, open: boolean, now: number): string | null {
  const d = def(h);
  if (!isScout(h)) return `${d.name} is no scout. Rangers, Rogues and Beastmasters scout (and a few others who can't help it).`;
  if (isWounded(h, now)) return `${d.name} is wounded.`;
  if (state.scouting.some((m) => m.uid === h.uid)) return `${d.name} is already out scouting.`;
  if (state.expeditions.some((e) => e.party.includes(h.uid))) return `${d.name} is on an expedition.`;
  // A scout takes one of the guild's outings, like a party.
  if (outingBlock(state)) return 'No free outing: wait for the road to clear.';
  if (open && state.explored.includes(region.id)) return 'Already on the map.';
  if (open) {
    const far = reachBlock(state, region);
    if (far) return far;
  }
  if (!open && !state.explored.includes(region.id)) return 'Map it first.';
  if (state.scouting.some((m) => m.regionId === region.id)) return 'A scout is already on the way there.';
  if (!open && state.sites.filter((x) => x.regionId === region.id).length >= MAX_SITES) return `Every site in ${region.name} is already known: deal with some first.`;
  if (region.requires) {
    const need = ABILITY_TRIBE[region.requires];
    if (d.tribe !== need.tribe) return `Only a ${need.name} scout can ${need.verb}.`;
  }
  return null;
}

export function startScouting(state: GameState, h: HeroInstance, regionId: string, open: boolean, now: number, seed: number): ScoutMission {
  const region = REGION_BY_ID[regionId];
  const m: ScoutMission = { id: state.nextUid++, uid: h.uid, regionId, startedAt: now, endsAt: now + scoutSeconds(state, h, region) * 1000, seed, open };
  state.scouting.push(m);
  return m;
}

export interface ScoutResult {
  mission: ScoutMission;
  ok: boolean;
  opened: boolean;
  sites: Site[];
  /** Lost in a skull area. */
  died: boolean;
  text: string;
}

/** Settles a scouting trip that has ended. The caller removes the mission and buries the dead. */
export function resolveScouting(state: GameState, m: ScoutMission, now: number): ScoutResult {
  const region = REGION_BY_ID[m.regionId];
  const h = state.roster.find((x) => x.uid === m.uid);
  const name = h ? def(h).name : 'The scout';
  const rng = new Rng(m.seed);
  const res: ScoutResult = { mission: m, ok: false, opened: false, sites: [], died: false, text: '' };
  if (!h || !region) return { ...res, text: 'A scout went missing.' };
  res.ok = rng.chance(scoutChance(state, h, region));
  if (!res.ok) {
    if (region.skull && rng.chance(0.35)) {
      res.died = true;
      res.text = `${name} did not come back from ${region.name}. In the skull lands, nobody gets a second look.`;
    } else {
      h.woundedUntil = now + woundDurationMs(state, region.tier);
      res.text = `${name} was spotted in ${region.name} and chased off. ${m.open ? 'The land is still unmapped, and' : 'Nothing found, and'} ${name} needs rest.`;
    }
    return res;
  }
  if (m.open) {
    state.explored.push(region.id);
    res.opened = true;
  }
  // Searching finds one site for sure (two, sometimes); mapping new land finds one now and then.
  const room = MAX_SITES - state.sites.filter((x) => x.regionId === region.id).length;
  const count = Math.min(room, m.open ? (rng.chance(0.3) ? 1 : 0) : 1 + (rng.chance(0.35) ? 1 : 0));
  for (let i = 0; i < count; i++) {
    // One of each kind per area.
    const have = new Set(state.sites.filter((x) => x.regionId === region.id).map((x) => x.kind));
    const kind = pickSite(rng, region, h, have);
    if (!kind) break;
    const site: Site = { id: state.nextUid++, kind, regionId: region.id, name: siteName(rng, kind, region), foundAt: now };
    state.sites.push(site);
    res.sites.push(site);
  }
  const found = res.sites.length ? ` Found: ${res.sites.map((x) => x.name).join(' and ')}.` : m.open ? '' : ' Nothing worth a trip this time.';
  res.text = m.open ? `${name} mapped ${region.name}.${found}` : `${name} searched ${region.name}.${found}`;
  return res;
}

const DUNGEONY: Biome[] = ['ruins', 'barrow', 'haunted', 'mountain'];

/** A site marked on a dead adventurer's map: added to the area when the report comes in (if there's room). */
export function noteSite(state: GameState, regionId: string, seed: number, now: number): Site | null {
  const region = REGION_BY_ID[regionId];
  if (!region || state.sites.filter((x) => x.regionId === regionId).length >= MAX_SITES) return null;
  const rng = new Rng(seed);
  const have = new Set(state.sites.filter((x) => x.regionId === regionId).map((x) => x.kind));
  const open = (['camp', 'cache', 'lair', 'dungeon', 'shrine'] as SiteKind[]).filter((k) => !have.has(k));
  if (!open.length) return null;
  const kind = rng.weighted(open.map((k) => ({ value: k, weight: k === 'cache' ? 3 : k === 'shrine' ? 1 : 2 })));
  const site: Site = { id: state.nextUid++, kind, regionId, name: siteName(rng, kind, region), foundAt: now };
  state.sites.push(site);
  return site;
}

function pickSite(rng: Rng, region: RegionDef, h: HeroInstance, have: Set<SiteKind>): SiteKind | null {
  const cls = def(h).heroClass;
  const w: Record<SiteKind, number> = { camp: 3, cache: 3, lair: 2, dungeon: 2, shrine: 1 };
  if (DUNGEONY.includes(region.biome)) w.dungeon += 2;
  if (['hills', 'mountain', 'snow', 'badlands'].includes(region.biome)) w.lair += 1;
  if (['plains', 'farm', 'forest'].includes(region.biome)) w.camp += 1;
  // Scouts find what they know to look for.
  if (cls === 'ranger') w.lair *= 2;
  if (cls === 'rogue') { w.cache *= 2; w.dungeon *= 1.5; }
  if (cls === 'beastmaster') { w.lair *= 1.5; w.camp *= 1.5; }
  if (cls === 'bard' || cls === 'mage') w.shrine *= 3;
  const open = (Object.keys(w) as SiteKind[]).filter((k) => !have.has(k));
  return open.length ? rng.weighted(open.map((k) => ({ value: k, weight: w[k] }))) : null;
}

const CAMP_NAME: Record<string, string> = {
  Goblins: 'a goblin war camp', Bandits: 'a bandit hideout', Beasts: 'a beast den', Undead: 'a restless graveyard',
  'Swamp horrors': 'a lurker nest', 'Trolls and giants': 'a troll camp', 'Spirits and fae': 'a fae ring',
  'Fire and ash': 'a fire camp', Frost: 'a frost camp', 'Sea and reef': 'a wreckers\' camp', Constructs: 'a rune forge',
  Dragonkin: 'a drake roost', Cultists: 'a cult camp',
};
const DUNGEON_NAME: Partial<Record<Biome, string[]>> = {
  ruins: ['a forgotten crypt', 'a sunken vault'], barrow: ['an open barrow', 'a king\'s tomb'], haunted: ['a haunted cellar', 'a forgotten crypt'],
  mountain: ['an old mine', 'a dwarf-hold'], hills: ['an old mine', 'a smugglers\' tunnel'], forest: ['a sunken temple', 'a root cave'],
  sea: ['a sea cave'], coast: ['a sea cave', 'a smugglers\' tunnel'], badlands: ['a lava tube'], snow: ['an ice cave'], marsh: ['a drowned cellar'],
};

function siteName(rng: Rng, kind: SiteKind, region: RegionDef): string {
  const family = (id: string) => ENEMY_BY_ID[id]?.family ?? '';
  switch (kind) {
    case 'camp': return CAMP_NAME[family(region.enemyPool[0].id)] ?? 'an enemy camp';
    case 'lair': return `the lair of ${lairBossName(region)}`;
    case 'dungeon': return rng.pick(DUNGEON_NAME[region.biome] ?? ['a dungeon']);
    case 'cache': return rng.pick(['a smugglers\' cache', 'a buried hoard', 'a hidden stash']);
    case 'shrine': return rng.pick(['a forgotten shrine', 'a wayside shrine', 'a standing stone']);
  }
}

/** The toughest monster that lives in an area, which a lair is home to a huge one of. */
export function lairBeast(region: RegionDef): string {
  return [...region.enemyPool].sort((a, b) => (ENEMY_BY_ID[b.id]?.hp ?? 0) - (ENEMY_BY_ID[a.id]?.hp ?? 0))[0].id;
}

/** "a great Bog Troll" */
export function lairBossName(region: RegionDef): string {
  const e = ENEMY_BY_ID[lairBeast(region)];
  return `a great ${e?.name ?? 'beast'}`;
}
