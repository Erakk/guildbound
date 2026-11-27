// The expedition simulation. Runs at a fixed 10 ticks per second.
// The same code drives the live map (one tick per 100 ms, drawn by the renderer)
// and fast-forward when the player was away (thousands of ticks at once, nothing drawn).
//
// Heroes act on their personalities (reckless, cowardly, shy, protective, glory hound, greedy,
// curious, steady), grudges against enemy families and fondness for each other. Trails branch:
// at each crossroads the Captain decides whether to take a side path, swayed by the orders,
// their own personality and the party's mood; others may grumble, which lowers morale.
//
// Allies that aren't party members also fight on the party's side: Beastmasters' animal
// companions ("pets") and enemies raised by Necromancers ("minions"). They never count toward
// the retreat rule, the report or wounds.

import { HERO_BY_ID, TRIBE_NAMES } from '../data/heroes';
import type { Season, TimeOfDay } from '../time';
import { chestPieceRoll, earlyPieces, FIND_PIECE_ROLL, PACKS, SECRET_PIECE_ROLL, type PackType, type PieceRoll } from '../data/packs';
import { FOREST_BIOMES, ROAD_BIOMES, SECRET_BY_KIND, SECRET_PATHS, type SecretKind } from '../data/secrets';
import { canWear, ITEM_BY_ID, LOOT_ITEMS, NAMED_ITEMS, PROFICIENT } from '../data/items';
import { captainStyle, type CaptainMods } from '../data/captains';
import { DISCOVERY_BY_ID, discoveriesFor, discoveryWeight, LEANS, type DiscoveryDef } from '../data/discoveries';
import { AREA_LANDMARKS, BIOME_LANDMARKS, HAZARDS, hazardFor, LANDMARK_BY_ID, type HazardKind, type LandmarkDef, type LandmarkEffect } from '../data/landmarks';
import { lairBeast } from '../scouting';
import { DEEP_RING } from '../data/frontier';
import { SPELL_BY_ID, spellPower } from '../data/spells';
import { ENEMY_BY_ID, REGION_BY_ID, tierScale } from '../data/world';
import { stats } from '../heroes';
import { Rng } from '../rng';
import { deal, fullDeck, handSize } from '../deck';
import { delveStep, delveWalk, pullLever, setupDelve, type Delve } from './delve';
import { CAMP_SEC, campSeat, campStep, relicStep, setupCamp, setupRares, stagStep, type SimCamp, encounterStep, goalFinish, goalStep, setupGoal, type SimGoal, setupStory, storyDone, storyStep, type SimStory, lightMarker, ROPE_SPEED, ropeHere, ropeStep, setupEncounters, setupFindSet, setupRopeBridge, thiefDown, type Encounter, type FindSet, type RopeBridge } from './encounters';
import { blowKeg, canReach, clampToWall, douse, fireBallista, holdsPosition, navPoint, preferredTarget, setupSiege, siegeReport, siegeStep, useKey, useWater, type SiegeState } from './siege';
import type { SiteKind } from '../types';
import type { AreaKind, Biome, EnemyDef, EnemyRole, ExpeditionReport, HeroClass, HeroInstance, ItemDef, LoadoutSpell, Material, Orders, Personality, PlayerInput, RegionDef, Row, Stats, Tribe } from '../types';

export const TPS = 10;
export const DT = 1 / TPS;
export const MANA_MAX = 100;
const MANA_REGEN = 2.5; // per second
const AGGRO = 270;
const LEASH = 650;
const WALK_SPEED = 85;
const GUIDANCE_CAP = 25;
/** Skull regions: monster health and damage on top of the tier, and the richer loot. */
const SKULL_HP = 1.67;
const SKULL_ATK = 1.57;
const SKULL_GOLD = 1.6;

export interface Pt { x: number; y: number }

export interface Unit {
  id: number;
  side: 'hero' | 'enemy';
  key: string; // hero uid or enemy def id
  name: string;
  sprite: string;
  heroClass?: HeroClass;
  role: EnemyRole | HeroClass;
  slot: number;
  row: Row;
  /** Formation offset from the leader: forward, side. */
  fx: number;
  fy: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  heal: number;
  range: number;
  speed: number;
  attackRate: number;
  crit: number;
  splash: number;
  cd: number;
  alive: boolean;
  targetId: number | null;
  group: number; // enemy group index, -1 for heroes
  facing: 1 | -1;
  kills: number;
  gold: number;
  xp: number;
  // Heroes
  defId?: string;
  personality?: Personality;
  grudge?: string;
  fondOf?: string;
  raging?: boolean;
  /** Seconds left of hanging back at the start of a fight (cowardly). */
  hesitate: number;
  /** Seconds left of running for cover (cowardly). */
  fleeing: number;
  // Enemies
  family?: string;
  /** A big monster (Dragonslayers hit these harder). */
  big?: boolean;
  // Allies that are not party members.
  pet?: boolean;
  minion?: boolean;
  ownerId?: number;
  /** Tick a raised minion crumbles at. */
  expiresAt?: number;
  /** Necromancers: tick they can raise the dead again. */
  raiseReadyAt?: number;
  // Spell effects: the tick each one wears off.
  hasteUntil?: number;
  rootUntil?: number;
  slowUntil?: number;
  rallyUntil?: number;
  wardUntil?: number;
  /** Damage a Stoneskin shield still soaks up. */
  shield?: number;
  /** Movement and attack-speed multipliers from effects, refreshed every tick. */
  moveMul?: number;
  actMul?: number;
  // Sieges.
  /** Stays put (archers up on the towers). */
  fixed?: boolean;
  /** Doesn't move or fight (the gate). */
  structure?: boolean;
  boss?: boolean;
  /** Part of a siege horde. */
  horde?: boolean;
  /** Position at the start of the tick, to keep units from walking through walls. */
  px?: number;
  // Skull regions.
  /** A prisoner freed in a siege: fights for the party, but isn't a party member. */
  freed?: boolean;
  /** Wears an unburnt Phoenix Feather. */
  phoenix?: boolean;
  /** Knocked out with nobody to save them: dead unless raised before the trip ends. */
  fallen?: boolean;
  // Encounters.
  /** The merchant's wagon (escorted; doesn't fight). */
  cart?: boolean;
  /** Waiting by the roadside: not with the party yet. */
  parked?: boolean;
  /** Left the map (a wagon that drove on, a thief who got away): not drawn, not dead. */
  gone?: boolean;
  /** A nest that keeps sending out monsters. */
  nest?: boolean;
  /** A cutpurse running off with the party's gold. */
  thief?: boolean;
  /** Runs from the party instead of fighting (the White Stag). */
  flees?: boolean;
  /** The White Stag's prize has been given. */
  prized?: boolean;
  /** Running over to look at a discovery (its find id). */
  investigating?: number;
  /** A mimic: the chest it was, whose loot it drops. */
  mimicChest?: number;
  stolen?: number;
}

export interface EnemyGroup {
  id: number;
  x: number;
  y: number;
  active: boolean;
  cleared: boolean;
  announced: boolean;
  lastKiller?: string;
  family: string;
  /** Set for groups waiting at the end of a side path. */
  forkId?: number;
  /** A siege wave. */
  horde?: boolean;
  /** Part of an encounter: not woken by walking near it (the encounter decides when). */
  held?: boolean;
  /** Not drawn yet (an ambush in the brush, raiders lying low). */
  hidden?: boolean;
  /** The encounter it belongs to. */
  enc?: number;
  /** Raiders: they go for the wagon. */
  raid?: boolean;
}

export type ForkKind = 'ruins' | 'camp' | 'stranger' | 'shrine' | 'hoard' | SecretKind;

export interface Fork {
  id: number;
  kind: ForkKind;
  /** Path distance where the side path leaves the trail, and where it rejoins it. */
  at: number;
  spurEnd: number;
  /** Path distance of the side path's far end. */
  poiDist: number;
  x: number;
  y: number;
  poi: Pt;
  family?: string;
  decided: 'take' | 'skip' | null;
  arrived: boolean;
  /** A chest's side path: the chest waiting at its end. */
  chestId?: number;
}

export type ChestKind = 'crate' | 'chest' | 'strongbox' | 'ornate';
export type ChestTrap = 'needle' | 'gas' | 'alarm';
export type ChestStory = 'pack' | 'stash' | 'wagon';
/** What a story chest is called on its plate, and the line under it. */
export const STORY_PLATE: Record<ChestStory, { title: string; text: string }> = {
  pack: { title: 'A dead adventurer\'s pack', text: 'Unguarded. There may be more than coin in it' },
  stash: { title: 'A goblin stash', text: 'Unguarded, for now: the goblins are out' },
  wagon: { title: 'An overturned wagon', text: 'Unguarded. Its merchant won\'t be needing the goods' },
};
/** A landmark beside the trail (see data/landmarks). */
export interface SimLandmark { id: number; key: string; x: number; y: number; at: number; passed: boolean; outcome?: string }
/** A hazardous stretch of trail, by path distance. */
export interface SimHazard { kind: HazardKind; from: number; to: number; entered: boolean; x: number; y: number }
export interface Chest {
  id: number; x: number; y: number; gold: number; taken: boolean; vault?: SiteKind;
  kind?: ChestKind;
  /** At the end of its own short side path: the Captain decides whether it's worth the detour. */
  hoard?: boolean;
  /** A mimic: bites when opened, and drops the loot when killed. */
  mimic?: boolean;
  /** What the chronicle calls it, and a better item chance (the Lost Caravan). */
  lead?: string;
  itemBonus?: number;
  /** A trap on the lid (iron-bound and ornate chests; strongboxes have their needle). */
  trap?: ChestTrap;
  /** An unguarded crate with a story: a dead adventurer's pack, a goblin stash, an overturned wagon. */
  story?: ChestStory;
  /** The mimic is up and fighting (the chest isn't drawn). */
  mimicLive?: boolean;
}
export interface Find {
  id: number; x: number; y: number; gold: number; expires: number; taken: boolean;
  /** A powder keg (sieges). */
  keg?: boolean;
  /** A travelling merchant's cart: click to buy. */
  merchant?: boolean;
  /** A siege's prison key: click to open a cage. */
  key?: boolean;
  /** A water cistern (Cinder Legion): click to put out fires. */
  water?: boolean;
  /** A ballista (Siege of Dragonmaw): click to shoot at the dragon. */
  ballista?: boolean;
  /** A discovery beside the trail (see data/discoveries): a choice for the Guildmaster or the Captain. */
  disc?: string;
  /** Path distance of the spot it sits beside. */
  at?: number;
  /** The hero who ran over to look (a discovery is only decided once someone stands beside it). */
  runner?: number;
  /** When they got there, and when the Captain decides if the Guildmaster hasn't (ticks). */
  reachedAt?: number;
  decideBy?: number;
  /** The option chosen (-1: left alone), or null while undecided. */
  decided?: number | null;
  /** What came of it, in a few words (for the plate over it). */
  outcome?: string;
  /** Who decided: the Guildmaster (clicked) or the Captain (walked past). */
  by?: 'guildmaster' | 'captain';
}

export type RoadEvent = 'merchant' | 'rivals' | 'storm';

export type SimEvent =
  | { t: 'hit'; x: number; y: number; amount: number; crit: boolean; onHero: boolean }
  | { t: 'heal'; x: number; y: number; amount: number }
  | { t: 'shot'; fromX: number; fromY: number; toX: number; toY: number; kind: 'arrow' | 'bolt' | 'magic' | 'holy' | 'dark' | 'bomb' | 'fire' }
  | { t: 'spell'; spell: string; x: number; y: number; r: number }
  | { t: 'death'; id: number; x: number; y: number; hero: boolean }
  | { t: 'loot'; x: number; y: number; gold: number }
  /** A chest opens: coins burst out, and an item (if any) flies to the party. */
  | { t: 'chest'; x: number; y: number; gold: number; item?: string }
  | { t: 'piece'; x: number; y: number; pack: PackType; n: number }
  | { t: 'shout'; id: number; text: string }
  | { t: 'log'; text: string };

export interface Sim {
  region: RegionDef;
  orders: Orders;
  rng: Rng;
  tick: number;
  maxTicks: number;
  path: Pt[];
  pathLen: number[]; // cumulative distance at each path point
  width: number;
  height: number;
  leader: Pt;
  leaderDist: number; // distance along path
  phase: 'out' | 'home' | 'done';
  outcome: 'returned' | 'retreated';
  units: Unit[];
  groups: EnemyGroup[];
  /** Set pieces on the trail: ambushes, brawls, escorts, troll bridges, nests and thieves. */
  encounters: Encounter[];
  /** Rope bridges over gorges: single file and slow. */
  ropeBridges: RopeBridge[];
  /** Three markers to light, for a secret (some trips). */
  findSet?: FindSet;
  /** The area's story: the chapter this trip plays. */
  story?: SimStory;
  /** The trip's goal, if the Guildmaster set one. */
  goal?: SimGoal;
  /** The night camp halfway along a longer trip. */
  camp?: SimCamp;
  /** The Guildmaster's waypoints on the road ahead, by node key (see roadAhead). */
  waypoints: Record<string, 'take' | 'skip'>;
  /** Experience multiplier from the camp's stories. */
  xpBonus?: number;
  /** The settlement by the trail (0-3). */
  life: number;
  /** Ticks spent waiting at discoveries for a decision (the party turns back that much later). */
  waited?: number;
  /** The cards this trip was dealt from the area's deck. */
  hand: string[];
  /** A dungeon below the map, when the party went for a dungeon site (see delve.ts). */
  delve?: Delve;
  /** Shrine of the Old Gods (a rare card), passed once. */
  relic?: { x: number; y: number; at: number; passed: boolean };
  chests: Chest[];
  finds: Find[];
  forks: Fork[];
  captainId: number | null;
  morale: number;
  /** The tribe if all five heroes share one (their five-member bonus applies). */
  fiveTribe: Tribe | null;
  goldMult: number;
  matMult: Partial<Record<Material, number>>;
  nextFindTick: number;
  findInterval: [number, number];
  /** Blessings from common spells: the bonus multiplier and when it runs out (tick). */
  boons: Partial<Record<Boon, { until: number; mult: number }>>;
  /** What the Captain's style does to this trip. */
  cap: CaptainMods;
  /** The site the party is going for: its groups, its hoard chest, and whether it's dealt with. */
  site: { kind: SiteKind; name: string; groups: number[]; chest: number; boss: number } | null;
  nextId: number;
  mana: number;
  spellReadyAt: Record<string, number>;
  /** Spells the party took, with their levels. */
  spells: LoadoutSpell[];
  /** Enemies defeated, by enemy id. */
  kills: Record<string, number>;
  /** Necromancer raises waiting to happen at the end of the tick. */
  raises: { necroId: number; corpseId: number }[];
  gold: number;
  xp: number;
  guidance: number;
  enemiesDefeated: number;
  findsCollected: number;
  chestCards: number;
  /** Pack pieces found on this trip. */
  pieces: Partial<Record<PackType, number>>;
  /** Starshards found (Deep Marches only). */
  shards: number;
  /** The Legendary chest, if the party earned one (Deep Marches only). */
  legendary: { shards: number; item: string | null } | null;
  materials: Partial<Record<Material, number>>;
  items: string[];
  chronicle: string[];
  /** One-off story beats already told ("Pip ran for cover"), so they aren't repeated. */
  told: Record<string, true>;
  events: SimEvent[];
  inputIndex: number;
  inCombat: boolean;
  lowestHpPct: number;
  /** Set when this trip is a siege. */
  siege?: SiegeState;
  /** Heroes can't be knocked out (the tutorial's first trip). */
  safe: boolean;
  landmarks: SimLandmark[];
  hazards: SimHazard[];
  /** The party stands still until this tick (digging, thawing). */
  pauseUntil: number;
  /** Hold added on the trip itself. */
  holdBonus: number;
  /** A dead adventurer's note marks a site in this area (added when the report is collected). */
  note?: boolean;
  time: TimeOfDay;
  season: Season;
  /** A random event on the road: where on the trail it happens, and whether it has. */
  event: { kind: RoadEvent | null; at: number; happened: boolean };
  /** A storm blows until this tick. */
  stormUntil: number;
  /** Skull regions: healers who already pulled someone out, and heroes whose feather burned. */
  rescuers: number[];
  feathers: string[];
  /** Tribe map abilities at work on this trip. */
  roadMult: number;
  stealth: boolean;
  /** The area's trouble on this trip: the groups that make it up, and where to draw it. */
  area: { kind: AreaKind; groups: number[]; site: Pt | null; cleared: boolean };
}

export interface SimHero {
  hero: HeroInstance;
  row: Row;
  items: ItemDef[];
}

export interface SimParams {
  regionId: string;
  party: (SimHero | null)[];
  orders: Orders;
  seed: number;
  /** Hero uid of the Captain, who decides at crossroads. */
  captain?: string | null;
  /** Spells the Guildmaster can cast (default: the two starter spells at level 1). */
  spells?: LoadoutSpell[];
  /** Fight this region's siege (its fortress isn't razed). */
  siege?: boolean;
  /** The area's state when the party left. */
  area?: AreaKind;
  /** The field journal's page for this land is complete: the guild knows where to look (+10% gold). */
  journal?: boolean;
  /** The area story's next chapter (1-3), if it has one to play. */
  story?: number;
  /** The settlement by the trail (core/life): 0 none, 1 hamlet, 2 village, 3 market town. */
  life?: number;
  /** How far the area's trouble has grown (1-3). */
  areaLevel?: number;
  /** The part of the area's deck that's open (core/deck); all of it if not given. */
  deck?: string[];
  /** Heroes can't be knocked out (the tutorial's first trip). */
  safe?: boolean;
  /** When the party leaves. */
  time?: TimeOfDay;
  season?: Season;
  /** A site a scout found here, which the party goes for. */
  site?: { kind: SiteKind; name: string };
}

/** Formation offsets [forward, side] for any mix of front and back rows. */
export function formationOffsets(rows: (Row | null)[]): [number, number][] {
  const out: [number, number][] = rows.map(() => [0, 0]);
  const spread = (row: Row, forward: number) => {
    const idx = rows.map((r, i) => (r === row ? i : -1)).filter((i) => i >= 0);
    idx.forEach((slot, k) => {
      out[slot] = [forward, (k - (idx.length - 1) / 2) * 46];
    });
  };
  spread('front', 26);
  spread('back', -30);
  return out;
}

export const BIOME_MATERIALS: Record<Biome, [Material, Material]> = {
  plains: ['wood', 'herbs'],
  farm: ['wood', 'hides'],
  forest: ['wood', 'hides'],
  marsh: ['herbs', 'hides'],
  hills: ['stone', 'iron'],
  barrow: ['stone', 'iron'],
  coast: ['wood', 'hides'],
  sea: ['herbs', 'hides'],
  mountain: ['stone', 'iron'],
  snow: ['wood', 'hides'],
  badlands: ['stone', 'iron'],
  haunted: ['herbs', 'stone'],
  sky: ['herbs', 'stone'],
  ruins: ['stone', 'iron'],
};

/** Combat numbers for a hero, including equipped gear. Off-class weapons deal half their damage. */
export function heroCombat(h: HeroInstance, worn: ItemDef[] = []) {
  const items = worn.filter((d) => canWear(HERO_BY_ID[h.defId].heroClass, d));
  const s: Stats = { ...stats(h) };
  for (const it of items) for (const [k, v] of Object.entries(it.stats)) s[k as keyof Stats] = Math.max(1, s[k as keyof Stats] + v!);
  const cls = HERO_BY_ID[h.defId].heroClass;
  const weapon = items.find((i) => i.slot === 'main');
  const weaponAtk = weapon ? weapon.atk * (PROFICIENT[cls].includes(weapon.kind) ? 1 : 0.5) : 0;
  const gearDef = items.reduce((a, i) => a + i.def, 0);
  const gearHp = items.reduce((a, i) => a + i.hp, 0);
  const gearSpeed = items.reduce((a, i) => a + (i.speed ?? 0), 0);
  const base = { maxHp: 50 + s.vigor * 7 + gearHp, def: s.vigor * 0.3 + s.resolve * 0.3 + gearDef, heal: 0, crit: 0.05, splash: 0, speed: 95 + gearSpeed };
  switch (cls) {
    case 'warrior': return { ...base, atk: s.might + s.finesse * 0.3 + weaponAtk, range: 46, attackRate: 1.1 };
    case 'rogue': return { ...base, atk: s.finesse * 0.9 + s.might * 0.4 + weaponAtk, range: 44, attackRate: 0.85, crit: 0.2, speed: 110 + gearSpeed };
    case 'ranger': return { ...base, atk: s.finesse + weaponAtk, range: 260, attackRate: 1.3, crit: 0.12 };
    case 'mage': return { ...base, atk: s.arcana + weaponAtk, range: 230, attackRate: 1.7, splash: 60 };
    case 'cleric': return { ...base, atk: s.arcana * 0.5 + weaponAtk * 0.5, heal: s.arcana * 1.1 + weaponAtk * 0.5, range: 210, attackRate: 1.5 };
    case 'bard': return { ...base, atk: (s.finesse + s.arcana) * 0.4 + weaponAtk, range: 210, attackRate: 1.4 };
    case 'paladin': return { ...base, atk: s.might * 0.8 + s.arcana * 0.2 + weaponAtk, heal: s.arcana * 0.7, range: 46, attackRate: 1.2 };
    case 'beastmaster': return { ...base, atk: s.finesse * 0.8 + s.might * 0.3 + weaponAtk, range: 180, attackRate: 1.3, crit: 0.08 };
    case 'necromancer': return { ...base, atk: s.arcana * 0.85 + weaponAtk, range: 220, attackRate: 1.6 };
    case 'dragonslayer': return { ...base, atk: s.might * 1.05 + s.finesse * 0.3 + weaponAtk, range: 50, attackRate: 1.3, crit: 0.1 };
  }
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Position and direction at a distance along the path. */
export function pointAt(sim: Sim, d: number): { p: Pt; dir: Pt } {
  const { path, pathLen } = sim;
  const total = pathLen[pathLen.length - 1];
  const dd = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < path.length - 1 && pathLen[i] < dd) i++;
  const a = path[i - 1];
  const b = path[i];
  const seg = pathLen[i] - pathLen[i - 1] || 1;
  const t = (dd - pathLen[i - 1]) / seg;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, dir: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } };
}

function stanceGroupMod(o: Orders): number {
  return o.stance === 'bold' ? 1 : o.stance === 'cautious' ? -1 : 0;
}

const FORK_KINDS: ForkKind[] = ['ruins', 'camp', 'stranger', 'shrine'];
/**
 * Areas without extras: no crossroads and no road events, just the trail, its monsters and its chests.
 * Greenhollow, the meadows outside town, is where a new guild learns the basics.
 */
export const PLAIN_AREAS = new Set(['greenhollow']);

/** What a side path's place is, and what going there does: shown on the map of the trip. */
export function forkLabel(f: Fork): { title: string; text: string } {
  const secret = SECRET_BY_KIND[f.kind as SecretKind];
  if (secret) return { title: secret.label[0].toUpperCase() + secret.label.slice(1), text: `A secret way only ${TRIBE_NAMES[secret.tribe]} can find: treasure at the end` };
  switch (f.kind) {
    case 'ruins': return { title: 'Ruined tower', text: 'Treasure inside, and something guarding it' };
    case 'camp': return { title: f.family ? `${f.family} camp` : 'Enemy camp', text: 'A hard fight, then the camp\'s loot chest' };
    case 'stranger': return { title: 'Someone calling for help', text: 'Help them for a reward (or walk into a trap)' };
    case 'shrine': return { title: 'Old shrine', text: 'Heals the party and blesses their weapons' };
    default: return { title: 'A side path', text: '' };
  }
}

/** What the Captain calls out when choosing the side path. */
const FORK_SHOUT: Partial<Record<ForkKind, string>> = { ruins: 'To the tower!', camp: 'Clear that camp!', stranger: 'Someone needs help!', shrine: 'To the shrine!' };

/** Rough threat of one enemy: health x damage, with armor counted. A Goblin Spearman is about 220. */
export function enemyThreat(e: EnemyDef): number {
  return e.hp * e.atk * (1 + e.def / 20) * (e.range > 100 ? 1.15 : 1);
}

/** Scales a group's head count to its pool, so a group of trolls is one or two trolls, not five. */
function sized(base: number, pool: { id: string; weight: number }[]): number {
  const total = pool.reduce((a, p) => a + p.weight, 0);
  const avg = pool.reduce((a, p) => a + enemyThreat(ENEMY_BY_ID[p.id]) * p.weight, 0) / total;
  const scale = Math.max(0.45, Math.min(1.2, Math.sqrt(230 / avg)));
  return Math.max(1, Math.round(base * scale));
}

export function createSim(params: SimParams): Sim {
  const region = REGION_BY_ID[params.regionId];
  const rng = new Rng(params.seed);
  const o = params.orders;
  const siege = !!(region.siege && params.siege);
  // A razed fortress is just a short trip among the ruins.
  const durationSec = region.siege && !siege ? region.durationSec / 2 : region.durationSec;
  const maxTicks = durationSec * TPS;

  // Path: wanders left to right; long enough to walk out in about 45% of the trip.
  // Side paths branch off at crossroads and come back to the same point (out and back).
  const height = 1800;
  // A siege's approach is short: most of the time goes on the battle.
  // (A dungeon trip's trail is shorter: the dungeon itself is the long part.)
  const target = WALK_SPEED * durationSec * (siege ? 0.45 : o.focus === 'explore' ? 0.5 : 0.42) * (params.site?.kind === 'dungeon' && !siege ? 0.55 : 1);
  const path: Pt[] = [{ x: 260, y: height / 2 }];
  const pathLen = [0];
  const push = (p: Pt) => {
    pathLen.push(pathLen[pathLen.length - 1] + dist(path[path.length - 1], p));
    path.push(p);
  };
  const forkCount = PLAIN_AREAS.has(region.id) && !siege ? 0 : durationSec >= 200 ? 2 : 1;
  const forkAt = forkCount === 0 ? [] : forkCount === 1 ? [0.45] : [0.3, 0.62];
  // Chests: few, nearly always guarded, each at the end of its own short side path. The Captain decides
  // which are worth the detour. Treasure orders, curious heroes, summer and some Captains add one.
  const members = params.party.filter((p): p is SimHero => !!p).map((p) => HERO_BY_ID[p.hero.defId]);
  const curiousCount = members.filter((d) => d.personality === 'curious').length;
  const capHero = params.party.find((p) => p && p.hero.uid === params.captain) ?? params.party.find((p) => !!p);
  const capMods = capHero ? captainStyle(capHero.hero.defId).mods : {};
  const hoardCount = siege ? 0 : Math.min(4, 1 + (o.focus === 'treasure' ? 1 : 0) + (curiousCount >= 2 ? 1 : 0) + ((params.season ?? 'summer') === 'summer' ? 1 : 0) + (capMods.chests ?? 0));
  // Early enough on the trail that the party gets there before it has to turn for home.
  const slots = [0.12, 0.2, 0.32, 0.44, 0.56, 0.66].filter((x) => forkAt.every((fa) => Math.abs(fa - x) > 0.07));
  const nHoards = Math.min(hoardCount, slots.length);
  const hoardAt: number[] = [];
  for (let i = 0; i < nHoards; i++) hoardAt.push(slots[Math.min(slots.length - 1, Math.floor(((i + rng.range(0.2, 0.8)) * slots.length) / nHoards))]);
  const branches = [...forkAt.map((f) => ({ f, hoard: false })), ...[...new Set(hoardAt)].map((f) => ({ f, hoard: true }))].sort((a, b) => a.f - b.f);
  let bi = 0;
  const forks: Fork[] = [];
  let mainLen = 0;
  while (mainLen < target) {
    const last = path[path.length - 1];
    const next = { x: last.x + rng.range(380, 520), y: Math.max(260, Math.min(height - 260, last.y + rng.range(-260, 260))) };
    const segLen = dist(last, next);
    push(next);
    mainLen += segLen;
    if (bi < branches.length && mainLen >= target * branches[bi].f) {
      const hoard = branches[bi++].hoard;
      const reach = hoard ? 125 : 220;
      // Branch sideways, away from the nearer map edge, then come back.
      const prev = path[path.length - 2];
      const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
      const nx = -(next.y - prev.y) / len;
      const ny = (next.x - prev.x) / len;
      const sign = next.y + ny * 300 > height - 200 || next.y + ny * 300 < 200 ? -1 : 1;
      const mid = { x: next.x + nx * sign * reach + rng.range(-40, 40), y: next.y + ny * sign * reach };
      const far = { x: next.x + nx * sign * reach * 2 + rng.range(-60, 60), y: next.y + ny * sign * reach * 2 };
      const at = pathLen[pathLen.length - 1];
      push(mid);
      push(far);
      const poiDist = pathLen[pathLen.length - 1];
      push({ ...mid });
      push({ ...next });
      forks.push({
        id: forks.length, kind: hoard ? 'hoard' : rng.pick(FORK_KINDS), at, spurEnd: pathLen[pathLen.length - 1], poiDist,
        x: next.x, y: next.y, poi: far, decided: null, arrived: false,
      });
    }
  }
  // Siege side paths always lead to goblin camps.
  if (siege) for (const f of forks) f.kind = 'camp';
  const width = Math.max(...path.map((p) => p.x)) + 300;

  const sim: Sim = {
    region, orders: o, rng, tick: 0, maxTicks, path, pathLen, width, height,
    leader: { ...path[0] }, leaderDist: 0, phase: 'out', outcome: 'returned',
    units: [], groups: [], encounters: [], ropeBridges: [], waypoints: {}, life: 0, hand: [], chests: [], finds: [], forks, captainId: null, morale: 100, fiveTribe: null, goldMult: 1, matMult: {},
    nextFindTick: rng.int(12, 20) * TPS, findInterval: [18, 28], boons: {}, cap: {}, site: null, nextId: 1,
    mana: 60, spellReadyAt: {}, spells: params.spells ?? [{ id: 'heal_rain', level: 1 }, { id: 'lightning', level: 1 }], kills: {}, raises: [], pieces: {}, gold: 0, xp: region.tier * 10, guidance: 0,
    enemiesDefeated: 0, findsCollected: 0, chestCards: 0, shards: 0, legendary: null, materials: {}, items: [], chronicle: [], told: {},
    events: [], inputIndex: 0, inCombat: false, lowestHpPct: 100, roadMult: 1, stealth: false, safe: !!params.safe, pauseUntil: 0, holdBonus: 0, landmarks: [], hazards: [],
    time: params.time ?? 'day', season: params.season ?? 'summer', event: { kind: null, at: 0, happened: false }, stormUntil: 0, rescuers: [], feathers: [],
    area: { kind: siege ? 'calm' : params.area ?? 'calm', groups: [], site: null, cleared: false },
  };

  // Heroes.
  const offsets = formationOffsets(params.party.map((p) => p?.row ?? null));
  params.party.forEach((p, slot) => {
    if (!p) return;
    const h = p.hero;
    const c = heroCombat(h, p.items);
    const d = HERO_BY_ID[h.defId];
    const [fx, fy] = offsets[slot];
    const reckless = d.personality === 'reckless';
    sim.units.push({
      id: sim.nextId++, side: 'hero', key: h.uid, name: d.name, sprite: `hero:${d.id}`, heroClass: d.heroClass, role: d.heroClass, slot,
      row: p.row, fx, fy,
      x: path[0].x - 40 + fx, y: path[0].y + fy, homeX: 0, homeY: 0,
      hp: c.maxHp, maxHp: c.maxHp, atk: c.atk * (reckless ? 1.1 : 1), def: c.def * (reckless ? 0.85 : 1), heal: c.heal, range: c.range,
      speed: c.speed * (reckless ? 1.15 : 1),
      attackRate: c.attackRate, crit: c.crit, splash: c.splash, cd: 0, alive: true, targetId: null, group: -1, facing: 1,
      kills: 0, gold: 0, xp: 0,
      defId: d.id, personality: d.personality, grudge: d.grudge, fondOf: d.fond, hesitate: 0, fleeing: 0,
      phoenix: p.items.some((i) => i.id === 'phoenix_feather'),
    });
  });
  const party = heroes(sim);
  sim.captainId = party.find((u) => u.key === params.captain)?.id ?? party[0]?.id ?? null;
  // The Captain's style: good and/or bad effects for the whole trip.
  const captainUnit = party.find((u) => u.id === sim.captainId);
  sim.cap = captainUnit ? captainStyle(captainUnit.defId!).mods : {};
  for (const u of party) {
    u.atk *= sim.cap.atk ?? 1;
    u.def *= sim.cap.def ?? 1;
    u.heal *= sim.cap.heal ?? 1;
  }
  // Beastmasters bring their animals.
  for (const owner of party) {
    const petKey = HERO_BY_ID[owner.defId!].pet;
    if (petKey) addPet(sim, owner, petKey);
  }
  // A Bard's song: +10% party damage.
  if (party.some((u) => u.heroClass === 'bard')) for (const u of party) u.atk *= 1.1;
  // Five heroes of one tribe: their five-member bonus.
  const tribeOf = (u: Unit) => HERO_BY_ID[u.defId!].tribe;
  if (party.length === 5 && party.every((u) => tribeOf(u) === tribeOf(party[0]))) {
    const t = tribeOf(party[0]);
    sim.fiveTribe = t;
    switch (t) {
      case 'freeholders': sim.goldMult = 1.2; break;
      case 'thornkin': if (region.biome === 'forest') for (const u of party) u.atk *= 1.15; break;
      case 'ironroot': sim.matMult = { stone: 1.5, iron: 1.5 }; break;
      case 'ashborn': for (const u of party) u.atk *= 1.15; break;
      case 'fenfolk': sim.matMult = { herbs: 2 }; break;
      case 'moonveil': for (const u of party) if (u.heroClass === 'mage' || u.heroClass === 'cleric' || u.heroClass === 'bard') { u.atk *= 1.15; u.heal *= 1.15; } break;
      case 'dawnwings': for (const u of party) u.heal *= 1.15; break;
      case 'hollowed': sim.maxTicks = Math.round(sim.maxTicks * 1.15); for (const u of party) { u.maxHp *= 1.15; u.hp = u.maxHp; } break;
    }
  }
  sim.goldMult *= sim.cap.gold ?? 1;
  if (params.journal) sim.goldMult *= 1.1;
  sim.life = siege ? 0 : params.life ?? 0;
  sim.goldMult *= [1, 1.03, 1.06, 1.1][sim.life] ?? 1;
  // Night: the Moonveil are at their best.
  if (sim.time === 'night') for (const u of party) if (tribeOf(u) === 'moonveil') { u.atk *= 1.15; u.heal *= 1.15; }
  // Tribe map abilities (3 or more of a tribe): faster roads, moving unseen, and secret paths.
  const tribeCount = new Map<Tribe, number>();
  for (const u of party) tribeCount.set(tribeOf(u), (tribeCount.get(tribeOf(u)) ?? 0) + 1);
  const has = (t: Tribe) => (tribeCount.get(t) ?? 0) >= 3;
  if (has('freeholders') && ROAD_BIOMES.includes(region.biome)) sim.roadMult = 1.25;
  if (has('thornkin') && FOREST_BIOMES.includes(region.biome)) sim.stealth = true;
  const secrets = SECRET_PATHS.filter((p) => has(p.tribe) && p.biomes.includes(region.biome));
  const sideForks = forks.filter((f) => f.kind !== 'hoard');
  if (secrets.length && sideForks.length && !siege) sideForks[0].kind = rng.pick(secrets).kind;
  // Curious heroes spot more.
  const curious = party.filter((u) => u.personality === 'curious').length;
  sim.findInterval = [Math.max(10, 18 - 4 * curious), Math.max(16, 28 - 4 * curious)];
  // The Captain: pace, first strikes and an eye for glints.
  sim.roadMult *= sim.cap.road ?? 1;
  if (sim.cap.finds) sim.findInterval = [Math.round(sim.findInterval[0] / sim.cap.finds), Math.round(sim.findInterval[1] / sim.cap.finds)];

  // Enemy groups spaced along the outward trail, never on a side path.
  // The three early skull regions are tougher than their tier says. (The Deep Marches' tier is danger enough.)
  const earlySkull = region.skull && region.ring < DEEP_RING;
  const tierMult = tierScale(region.tier) * (earlySkull ? SKULL_HP : 1);
  const atkMult = 1.5 * tierScale(region.tier) * (earlySkull ? SKULL_ATK : 1);
  // What each chest is (rolled now, so guarded chests can stand in for a trail group or two).
  const chestKinds = new Map<number, ChestKind>();
  for (const f of forks) {
    if (f.kind !== 'hoard') continue;
    const r = rng.next();
    chestKinds.set(f.id, r < 0.18 ? 'crate' : r < 0.62 ? 'chest' : r < 0.9 ? 'strongbox' : 'ornate');
  }
  const guardedChests = [...chestKinds.values()].filter((k) => k !== 'crate').length;
  const groupCount = Math.max(2, region.groups + (o.focus === 'hunt' ? 1 : 0) - Math.floor(guardedChests / 2));
  const totalLen = pathLen[pathLen.length - 1];
  // Distance along the main trail -> distance along the full path (skipping side paths).
  const offSpur = (dm: number) => {
    let d = dm;
    for (const f of forks) if (d >= f.at - 40) d += f.spurEnd - f.at + 80;
    return d;
  };
  const spawnGroup = (gx: number, gy: number, pool: { id: string; weight: number }[], size: number, goldMult = 1): EnemyGroup => {
    const g: EnemyGroup = { id: sim.groups.length, x: gx, y: gy, active: false, cleared: false, announced: false, family: '' };
    sim.groups.push(g);
    for (let i = 0; i < size; i++) {
      const e: EnemyDef = ENEMY_BY_ID[rng.weighted(pool.map((x) => ({ weight: x.weight, value: x.id })))];
      g.family = g.family || e.family;
      const ex = gx + rng.range(-55, 55);
      const ey = gy + rng.range(-45, 45);
      sim.units.push({
        id: sim.nextId++, side: 'enemy', key: e.id, name: e.name, sprite: e.id, role: e.role, slot: -1, row: 'front', fx: 0, fy: 0,
        x: ex, y: ey, homeX: ex, homeY: ey, hp: e.hp * tierMult, maxHp: e.hp * tierMult, atk: e.atk * atkMult, def: e.def,
        heal: e.role === 'healer' ? e.atk * 2 * tierMult : 0, range: e.range, speed: e.speed, attackRate: e.attackRate,
        crit: 0.05, splash: e.splash ?? 0, cd: rng.range(0, e.attackRate), alive: true, targetId: null, group: g.id, facing: -1,
        kills: 0, gold: e.gold * goldMult, xp: e.xp, hesitate: 0, fleeing: 0, family: e.family, big: e.hp >= 100,
      });
    }
    return g;
  };
  const mainSpan = totalLen - forks.reduce((a, f) => a + (f.spurEnd - f.at), 0);
  const poolWeight = region.enemyPool.reduce((a, p) => a + p.weight, 0);
  const pool = sim.area.kind === 'corrupted'
    ? [...region.enemyPool, { id: 'wisp', weight: poolWeight * 0.25 }, { id: 'banshee', weight: poolWeight * 0.15 }]
    : [...region.enemyPool];
  // Night brings spirits and wolves; winter brings frost wolves (not to the sea, the sky or the lava fields).
  const landlocked = !['sea', 'sky'].includes(region.biome);
  if (sim.time === 'night' && !siege) {
    pool.push({ id: 'wisp', weight: poolWeight * 0.15 });
    if (landlocked) pool.push({ id: 'dire_wolf', weight: poolWeight * 0.15 });
  }
  if (sim.season === 'winter' && !siege && landlocked && region.biome !== 'badlands') pool.push({ id: 'frost_wolf', weight: poolWeight * 0.2 });
  for (let g = 0; g < groupCount; g++) {
    const frac = 0.14 + (0.8 * (g + rng.range(0.2, 0.8))) / groupCount;
    const { p, dir } = pointAt(sim, Math.min(totalLen - 50, offSpur(frac * mainSpan)));
    const side = rng.range(-110, 110);
    spawnGroup(p.x - dir.y * side, p.y + dir.x * side, pool,
      sized(rng.int(region.groupSize[0], region.groupSize[1]) + stanceGroupMod(o) + (sim.cap.groupSize ?? 0), pool));
  }
  // Encounters: set pieces that take the place of some of those groups (not on sieges or the first trips).
  // The hand: what this trip is dealt from the area's deck (see core/deck).
  if (!siege && !PLAIN_AREAS.has(region.id)) sim.hand = deal(rng, params.deck ?? fullDeck(region), handSize(durationSec, o.focus, curiousCount), o.focus);
  if (!siege && !sim.safe && !PLAIN_AREAS.has(region.id)) {
    const ctx = { trailGroups: sim.groups.map((g) => g.id), pool, mainSpan, offSpur, totalLen, durationSec };
    setupEncounters(sim, ctx);
    setupRopeBridge(sim, ctx);
    setupFindSet(sim, ctx);
    setupRares(sim, ctx);
    if (params.story && params.story <= 3) setupStory(sim, ctx, params.story);
    if (o.goal) setupGoal(sim, ctx, o.goal);
    setupCamp(sim, ctx);
  }

  // The area's trouble sits right on the trail, so the party can't slip past it.
  const onTrail = (frac: number) => pointAt(sim, Math.min(totalLen - 50, offSpur(frac * mainSpan))).p;
  const trouble = (frac: number, troublePool: [string, number][], size: number, goldMult: number) => {
    const at = onTrail(frac);
    const list = troublePool.map(([id, weight]) => ({ id, weight }));
    const g = spawnGroup(at.x + 40, at.y, list, sized(size, list), goldMult);
    sim.area.groups.push(g.id);
    return at;
  };
  // A skull region's lord waits at the end of the trail.
  if (region.boss && !siege) {
    const lair = onTrail(0.97);
    spawnGroup(lair.x + 80, lair.y, [{ id: region.boss, weight: 1 }], 1, 1);
    spawnGroup(lair.x - 30, lair.y + 90, pool, 2, 1);
  }
  if (params.site && !siege) setupSite(sim, params.site, onTrail, spawnGroup, pool);
  // Ignored trouble grows: a bigger camp, a richer one.
  const grown = Math.max(0, (params.areaLevel ?? 1) - 1);
  if (sim.area.kind === 'infested') {
    sim.area.site = trouble(0.55, [['goblin_spear', 4], ['goblin_archer', 2], ['goblin_shaman', 1], ['wolf_rider', 1]], region.groupSize[1] + 1 + grown, 1.8 + 0.3 * grown);
    sim.chests.push({ id: sim.chests.length, x: sim.area.site.x + 90, y: sim.area.site.y - 70, gold: Math.round(rng.range(20, 30) * region.tier), taken: false });
  } else if (sim.area.kind === 'besieged') {
    sim.area.site = trouble(0.45, [['wolf_rider', 3], ['goblin_spear', 3], ['goblin_bomber', 1], ['goblin_archer', 1]], region.groupSize[1] + 2 + grown, 1.6 + 0.3 * grown);
    trouble(0.75, [['wolf_rider', 2], ['goblin_spear', 3], ['goblin_archer', 2]], region.groupSize[1] + 1 + grown, 1.6 + 0.3 * grown);
  } else if (sim.area.kind === 'corrupted') {
    const at = onTrail(0.6);
    const g = spawnGroup(at.x + 40, at.y, [{ id: 'wisp', weight: 1 }], 2, 1.5);
    const heart = ENEMY_BY_ID.gloom_heart;
    const tierMult = tierScale(region.tier);
    sim.units.push({
      id: sim.nextId++, side: 'enemy', key: heart.id, name: heart.name, sprite: heart.id, role: heart.role, slot: -1, row: 'front', fx: 0, fy: 0,
      x: at.x + 80, y: at.y, homeX: at.x + 80, homeY: at.y, hp: heart.hp * tierMult * (1 + 0.3 * grown), maxHp: heart.hp * tierMult * (1 + 0.3 * grown), atk: heart.atk * 1.5 * tierMult, def: heart.def,
      heal: 0, range: heart.range, speed: 0, attackRate: heart.attackRate, crit: 0.05, splash: 0, cd: 1, alive: true, targetId: null, group: g.id, facing: -1,
      kills: 0, gold: heart.gold * region.tier, xp: heart.xp, hesitate: 0, fleeing: 0, family: heart.family, big: true,
    });
    sim.area.groups.push(g.id);
    sim.area.site = at;
    sim.morale -= 10;
  }

  // The chests, each at the end of its side path; all but crates have guards standing between it and the trail.
  for (const f of forks) {
    const kind = chestKinds.get(f.id);
    if (!kind) continue;
    const [lo, hi] = CHEST_GOLD[kind];
    f.chestId = sim.chests.length;
    // Now and then an iron-bound chest or a strongbox is a mimic.
    const mimic = (kind === 'chest' || kind === 'strongbox') && rng.chance(MIMIC_CHANCE);
    // Some chests are trapped: a needle, a puff of gas, or an alarm bell that calls the neighbours.
    const trap = !mimic && rng.chance(TRAP_CHANCE[kind]) ? rng.pick<ChestTrap>(['needle', 'gas', 'alarm']) : undefined;
    // Crates tell a little story: whose they were says what's in them.
    const stories: ChestStory[] = ['pack'];
    if (pool.some((p) => ENEMY_BY_ID[p.id]?.family === 'Goblins')) stories.push('stash');
    if (!['sea', 'sky', 'badlands'].includes(region.biome)) stories.push('wagon');
    const story = kind === 'crate' ? rng.pick(stories) : undefined;
    sim.chests.push({ id: sim.chests.length, x: f.poi.x, y: f.poi.y, gold: Math.round(rng.range(lo, hi) * region.tier), taken: false, kind, hoard: true, mimic, trap, story });
    if (kind === 'crate') continue;
    const size = kind === 'ornate' ? region.groupSize[1] : kind === 'strongbox' ? region.groupSize[0] : Math.max(2, region.groupSize[0] - 1);
    const gx = f.poi.x + (f.x - f.poi.x) * 0.3;
    const gy = f.poi.y + (f.y - f.poi.y) * 0.3;
    const g = spawnGroup(gx, gy, pool, sized(size + stanceGroupMod(o), pool));
    g.forkId = f.id;
    f.family = g.family;
  }

  // Discoveries beside the trail: a few choices along the way, for the Guildmaster or the Captain.
  if (!siege) {
    const extra = (curiousCount ? 1 : 0) + (o.focus === 'explore' ? 1 : 0) + Math.round(((capMods.finds ?? 1) - 1) * 4);
    void extra;
    const n = PLAIN_AREAS.has(region.id) ? 1 : 1;
    const choices = discoveriesFor(region.biome);
    // The first trip's one discovery is the campfire: easy to understand, nothing to lose.
    const picked: DiscoveryDef[] = [];
    if (PLAIN_AREAS.has(region.id)) picked.push(DISCOVERY_BY_ID.campfire);
    // Otherwise the hand says what's there (up to four), and every trip has at least one.
    for (const id of sim.hand) if (id.startsWith('disc:') && picked.length < 4 && DISCOVERY_BY_ID[id.slice(5)]) picked.push(DISCOVERY_BY_ID[id.slice(5)]);
    // The focus tips what turns up: Gather finds ore and herbs, Treasure finds caches, Hunt finds tracks.
    while (picked.length < n && picked.length < choices.length) {
      const d = rng.weighted(choices.filter((c) => !picked.includes(c)).map((c) => ({ value: c, weight: discoveryWeight(c, o.focus) })));
      picked.push(d);
    }
    picked.forEach((d, i) => {
      const dm = Math.min(totalLen - 80, offSpur((0.1 + (0.6 * (i + rng.range(0.25, 0.75))) / picked.length) * mainSpan));
      const { p, dir } = pointAt(sim, dm);
      const side = rng.pick([-1, 1]) * rng.range(95, 140);
      sim.finds.push({ id: sim.finds.length, x: p.x - dir.y * side, y: p.y + dir.x * side, gold: 0, expires: Number.MAX_SAFE_INTEGER, taken: false, disc: d.id, at: dm, decided: null });
    });
  }

  // Landmarks: the area's own, and one of its biome on longer trips (or wherever there is no signature one).
  if (!siege) {
    const marks: LandmarkDef[] = [];
    const own = AREA_LANDMARKS[region.id];
    if (own) marks.push(own);
    const local = BIOME_LANDMARKS[region.biome] ?? [];
    if (local.length && (!own || durationSec >= 300)) marks.push(rng.pick(local));
    marks.forEach((d, i) => {
      const frac = marks.length === 1 ? rng.range(0.3, 0.45) : [0.24, 0.52][i] + rng.range(-0.03, 0.03);
      const dm = Math.min(totalLen - 80, offSpur(frac * mainSpan));
      const { p, dir } = pointAt(sim, dm);
      const side = rng.pick([-1, 1]) * rng.range(175, 230);
      sim.landmarks.push({ id: i, key: d.id, x: p.x - dir.y * side, y: p.y + dir.x * side, at: dm, passed: false });
    });
    // A hazardous stretch of trail, by biome and season (not on the first trip's meadows).
    const hk = PLAIN_AREAS.has(region.id) ? null : hazardFor(region.biome, sim.season);
    if (hk) {
      const start = rng.range(0.2, 0.42) * mainSpan;
      const from = offSpur(start);
      const to = offSpur(start + rng.range(380, 520));
      const { p } = pointAt(sim, from);
      sim.hazards.push({ kind: hk, from, to, entered: false, x: p.x, y: p.y });
      // Fog: monsters waiting in it strike harder.
      const ambushBonus = HAZARDS[hk].ambush;
      if (ambushBonus) {
        const pts: Pt[] = [];
        for (let d = from; d <= to; d += 50) pts.push(pointAt(sim, d).p);
        for (const g of sim.groups) {
          if (g.forkId !== undefined || !pts.some((q) => dist(q, g) < 220)) continue;
          for (const u of sim.units) if (u.group === g.id) u.atk *= 1 + ambushBonus;
        }
      }
    }
  }

  // What waits at the end of each side path.
  for (const f of forks) {
    if (f.kind === 'ruins') {
      for (let i = 0; i < 2; i++) sim.chests.push({ id: sim.chests.length, x: f.poi.x + rng.range(-60, 60), y: f.poi.y + rng.range(-40, 40), gold: Math.round(rng.range(14, 24) * region.tier), taken: false });
      spawnGroup(f.poi.x + 70, f.poi.y + 60, region.enemyPool, sized(rng.int(region.groupSize[0], region.groupSize[1]), region.enemyPool)).forkId = f.id;
    } else if (f.kind === 'camp') {
      const fam = ENEMY_BY_ID[rng.weighted(region.enemyPool.map((x) => ({ weight: x.weight, value: x.id })))].family;
      const pool = region.enemyPool.filter((e) => ENEMY_BY_ID[e.id].family === fam);
      f.family = fam;
      spawnGroup(f.poi.x, f.poi.y + 80, pool, sized(region.groupSize[1] + 2, pool), 1.6).forkId = f.id;
      sim.chests.push({ id: sim.chests.length, x: f.poi.x + 40, y: f.poi.y - 50, gold: Math.round(rng.range(20, 30) * region.tier), taken: false });
    }
  }

  log(sim, `The party set out for ${region.name}${sim.captainId ? `, ${unitById(sim, sim.captainId)!.name} leading (${captainStyle(unitById(sim, sim.captainId)!.defId!).name.toLowerCase()})` : ''}.`);
  if (sim.site) log(sim, `They are going for ${sim.site.name}, as the scouts reported.`);
  if (sim.area.kind === 'infested') log(sim, `${region.name} is infested: a goblin camp sits right across the trail.`);
  if (sim.area.kind === 'corrupted') log(sim, `A fae gloom hangs over ${region.name}. Spirits drift between the trees, and spirits are low.`);
  if (sim.area.kind === 'besieged') log(sim, `Smoke on the horizon: warbands from Gnashgut's Fortress are raiding ${region.name}.`);
  if (sim.season === 'winter' && ['marsh', 'coast', 'sea'].includes(region.biome)) {
    sim.roadMult *= 1.15;
    log(sim, 'The streams have frozen over: the party crossed on the ice and made good time.');
  }
  if (sim.time === 'night') log(sim, sim.rng.chance(0.5) ? 'They set out under the stars. Something howled in the dark.' : 'Night had fallen. Lanterns lit, the party walked on.');
  // A random event somewhere on the road (not on sieges or the tutorial's first trip).
  if (!siege && !sim.safe && !PLAIN_AREAS.has(region.id) && rng.chance(0.35)) {
    sim.event.kind = rng.weighted<RoadEvent>([{ value: 'merchant', weight: 4 }, { value: 'rivals', weight: 3 }, { value: 'storm', weight: 3 }]);
    sim.event.at = mainSpan * rng.range(0.25, 0.55);
  }
  if (params.journal && !siege) log(sim, 'The guild\'s field journal on this kind of land is complete: they knew where to look (+10% gold).');
  if (sim.life > 0) {
    log(sim, sim.life === 1 ? `The hamlet at the edge of ${region.name} waved the party off. Someone pressed fresh bread into their hands.`
      : sim.life === 2 ? `The village at the edge of ${region.name} turned out to see the party off. A trader said they'd set up along the road.`
        : `${region.name}'s market town was busy as ever. Villagers had chalked where the monsters were seen, and the traders wanted first look at the loot.`);
    // A village or town: a trader on the road every trip.
    if (sim.life >= 2 && !siege && sim.event.kind !== 'merchant') {
      sim.event.kind = 'merchant';
      sim.event.at = mainSpan * rng.range(0.25, 0.45);
    }
    // A market town: the first group on the trail was spotted, and is weaker for it.
    if (sim.life >= 3) {
      const first = sim.groups.filter((g) => g.forkId === undefined && g.enc === undefined && !g.held).sort((a, b) => a.x - b.x)[0];
      if (first) for (const u of sim.units) if (u.group === first.id) u.hp = u.maxHp = u.maxHp * 0.8;
    }
  }
  if (sim.roadMult > 1) log(sim, 'The Freeholders know these farm roads: the party made good time.');
  if (sim.stealth) log(sim, 'The Thornkin led the party under the trees, quiet as moss.');
  if (siege) setupSiege(sim);
  else if (region.siege) log(sim, 'The fortress is still a smoking ruin. Only a few goblin stragglers remain.');
  if (sim.fiveTribe) log(sim, `Five ${HERO_BY_ID[party[0].defId!].tribe[0].toUpperCase() + HERO_BY_ID[party[0].defId!].tribe.slice(1)} together: their kin-bond is strong today.`);
  const tribes = new Set(party.map((u) => HERO_BY_ID[u.defId!].tribe));
  if (tribes.has('dawnwings') && tribes.has('hollowed')) {
    sim.morale -= 10;
    log(sim, 'The Dawnwings and the Hollowed kept to opposite ends of the party.');
  }
  return sim;
}

export function unitById(sim: Sim, id: number | null): Unit | undefined {
  return id === null ? undefined : sim.units.find((u) => u.id === id);
}

export function log(sim: Sim, text: string) {
  sim.chronicle.push(text);
  sim.events.push({ t: 'log', text });
}

/** Tells a story beat once per trip. */
export function once(sim: Sim, key: string, text: string, shoutBy?: Unit, shout?: string) {
  if (sim.told[key]) return;
  sim.told[key] = true;
  log(sim, text);
  if (shoutBy && shout) sim.events.push({ t: 'shout', id: shoutBy.id, text: shout });
}

/** Party members (not pets or raised dead). */
const heroes = (sim: Sim) => sim.units.filter((u) => u.side === 'hero' && !u.pet && !u.minion && !u.freed);
const liveHeroes = (sim: Sim) => sim.units.filter((u) => u.side === 'hero' && u.alive && !u.pet && !u.minion && !u.freed);
/** Everyone fighting on the party's side, pets and raised dead included. */
const liveAllies = (sim: Sim) => sim.units.filter((u) => u.side === 'hero' && u.alive && !u.parked);

const PETS: Record<string, { label: string; hp: number; atk: number; rate: number; speed: number; range: number }> = {
  pet_wolf: { label: 'wolf', hp: 0.6, atk: 0.7, rate: 1.0, speed: 135, range: 40 },
  pet_boar: { label: 'boar', hp: 0.85, atk: 0.65, rate: 1.4, speed: 115, range: 40 },
  pet_toad: { label: 'toad', hp: 0.9, atk: 0.5, rate: 1.3, speed: 95, range: 60 },
  pet_bonehound: { label: 'bone hound', hp: 0.65, atk: 0.7, rate: 1.0, speed: 130, range: 40 },
  pet_moonwolf: { label: 'moon wolf', hp: 0.6, atk: 0.8, rate: 0.9, speed: 150, range: 40 },
};

function addPet(sim: Sim, owner: Unit, key: string) {
  const p = PETS[key];
  if (!p) return;
  const atkBonus = owner.defId === 'tamra' ? 1.2 : 1;
  sim.units.push({
    id: sim.nextId++, side: 'hero', key: `${owner.key}:pet`, name: `${owner.name}'s ${p.label}`, sprite: key, role: 'beast', slot: -1,
    row: owner.row, fx: owner.fx - 18, fy: owner.fy + (owner.fy >= 0 ? 26 : -26),
    x: owner.x - 18, y: owner.y + 26, homeX: 0, homeY: 0,
    hp: owner.maxHp * p.hp, maxHp: owner.maxHp * p.hp, atk: owner.atk * p.atk * atkBonus, def: owner.def * 0.8, heal: 0,
    range: p.range, speed: p.speed, attackRate: p.rate, crit: 0.05, splash: 0, cd: 0, alive: true, targetId: null, group: -1, facing: 1,
    kills: 0, gold: 0, xp: 0, hesitate: 0, fleeing: 0, pet: true, ownerId: owner.id,
  });
}

/** A Necromancer raises a fallen enemy to fight for the party for a while. */
function raiseDead(sim: Sim, necro: Unit, corpse: Unit) {
  const ttl = (necro.defId === 'ossian' ? 18 : 12) * TPS;
  const atkMul = necro.defId === 'vanthe' ? 0.8 : 0.6;
  sim.units.push({
    ...corpse,
    id: sim.nextId++, side: 'hero', name: `Raised ${corpse.name}`, slot: -1, row: 'front', fx: 0, fy: 0, group: -1,
    hp: corpse.maxHp * 0.6, maxHp: corpse.maxHp * 0.6, atk: corpse.atk * atkMul, heal: 0, alive: true, targetId: null, cd: 0,
    facing: 1, kills: 0, gold: 0, xp: 0, minion: true, ownerId: necro.id, expiresAt: sim.tick + ttl, family: undefined, big: false,
    hasteUntil: 0, rootUntil: 0, slowUntil: 0, rallyUntil: 0, wardUntil: 0, shield: 0,
  });
  necro.raiseReadyAt = sim.tick + 8 * TPS;
  if (!sim.told[`raise-${necro.id}`]) {
    once(sim, `raise-${necro.id}`, `${necro.name} raised a fallen ${corpse.name} to fight for the party.`, necro, 'Rise!');
  }
}

function partyHpPct(sim: Sim): number {
  const hs = heroes(sim);
  const cur = hs.reduce((s, u) => s + (u.alive ? u.hp : 0), 0);
  const max = hs.reduce((s, u) => s + u.maxHp, 0);
  return max ? (cur / max) * 100 : 0;
}

function applyInput(sim: Sim, input: PlayerInput) {
  if (input.kind === 'recall') {
    if (sim.phase === 'out') {
      sim.phase = 'home';
      log(sim, 'The Recall Horn sounded. The party turned for home.');
    }
    return;
  }
  if (input.kind === 'lever') {
    if (pullLever(sim)) sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 3);
    return;
  }
  if (input.kind === 'route') {
    if (input.choice) sim.waypoints[input.key] = input.choice;
    else delete sim.waypoints[input.key];
    return;
  }
  if (input.kind === 'marker') {
    lightMarker(sim, input.id);
    sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 2);
    return;
  }
  if (input.kind === 'find') {
    const f = sim.finds.find((x) => x.id === input.findId);
    if (f?.disc) {
      if (f.decided != null) return;
      applyDiscovery(sim, f, input.choice ?? -1, 'guildmaster');
      sim.findsCollected += 1;
      sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 5);
      return;
    }
    if (f && !f.taken && sim.tick <= f.expires && f.water) {
      f.taken = true;
      sim.findsCollected += 1;
      sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 5);
      useWater(sim, f);
      return;
    }
    if (f && !f.taken && sim.tick <= f.expires && f.ballista) {
      f.taken = true;
      sim.findsCollected += 1;
      sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 5);
      fireBallista(sim, f);
      return;
    }
    if (f && !f.taken && sim.tick <= f.expires && f.key) {
      f.taken = true;
      sim.findsCollected += 1;
      useKey(sim);
      return;
    }
    if (f && !f.taken && sim.tick <= f.expires && f.merchant) {
      buyFromMerchant(sim, f);
      return;
    }
    if (f && !f.taken && sim.tick <= f.expires && f.keg) {
      f.taken = true;
      sim.findsCollected += 1;
      sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 5);
      blowKeg(sim, f);
      return;
    }
    if (f && !f.taken && sim.tick <= f.expires) {
      f.taken = true;
      sim.gold += f.gold;
      sim.findsCollected += 1;
      sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 5);
      sim.events.push({ t: 'loot', x: f.x, y: f.y, gold: f.gold });
      const piece = rollPiece(sim, earlyPieces(FIND_PIECE_ROLL, sim.region.tier), f);
      log(sim, `A glint in the grass: the Guildmaster spotted ${f.gold} gold${piece ? ` and ${pieceName(piece)}` : ''} the party would have walked past.`);
    }
    return;
  }
  const spell = SPELL_BY_ID[input.spell];
  const packed = sim.spells.find((x) => x.id === input.spell);
  if (!spell || !packed || sim.mana < spell.mana || (sim.spellReadyAt[spell.id] ?? 0) > sim.tick) return;
  sim.mana -= spell.mana;
  sim.spellReadyAt[spell.id] = sim.tick + spell.cooldownSec * TPS;
  sim.events.push({ t: 'spell', spell: spell.id, x: input.x, y: input.y, r: spell.radius });
  const L = spellPower(packed.level);
  const t = sim.region.tier;
  const secs = (n: number) => sim.tick + Math.round(n * L * TPS);
  const inArea = sim.units.filter((u) => dist(u, input) <= spell.radius);
  const allies = inArea.filter((u) => u.side === 'hero' && u.alive);
  const foes = inArea.filter((u) => u.side === 'enemy' && u.alive);
  const hurt = (amount: number) => {
    for (const u of foes) {
      activateGroup(sim, u.group);
      damage(sim, null, u, amount, false);
    }
    return foes.length > 0;
  };
  const healAll = (us: Unit[], amount: (u: Unit) => number) => {
    let healed = false;
    for (const u of us) {
      const amt = Math.min(u.maxHp - u.hp, amount(u));
      if (amt > 1) healed = true;
      u.hp += amt;
      // No "+0" over heroes who were already at full health.
      if (amt >= 1) sim.events.push({ t: 'heal', x: u.x, y: u.y, amount: Math.round(amt) });
    }
    return healed;
  };
  let useful = false;
  switch (spell.id) {
    case 'fortune':
    case 'harvest':
    case 'insight': {
      sim.boons[spell.id as Boon] = { until: sim.tick + BOON_SEC * TPS, mult: 1 + (spell.id === 'harvest' ? 1 : 0.5) * L };
      log(sim, BOON_TEXT[spell.id as Boon]);
      useful = true;
      break;
    }
    case 'heal_rain': useful = healAll(allies, () => (45 + t * 10) * L); break;
    // Rarer damage spells hit a little harder than they used to.
    case 'lightning': useful = hurt((40 + t * 10) * L); break;
    case 'fireball': useful = hurt((65 + t * 16) * L); break;
    case 'meteor': useful = hurt((130 + t * 30) * L); break;
    case 'frost': {
      for (const u of foes) u.slowUntil = secs(6);
      useful = hurt((18 + t * 5) * L);
      // Frost puts out burning ground (the Cinder Legion).
      const out = douse(sim, input, spell.radius);
      if (out) {
        useful = true;
        log(sim, `The Frost Nova hissed over the burning ground: ${out} ${out === 1 ? 'fire' : 'fires'} went out.`);
      }
      break;
    }
    case 'entangle':
      for (const u of foes) u.rootUntil = secs(4);
      useful = hurt((8 + t * 2) * L);
      break;
    case 'haste': for (const u of allies) u.hasteUntil = secs(8); useful = allies.length > 0; break;
    case 'rally':
      for (const u of allies) u.rallyUntil = secs(10);
      if (allies.length) sim.morale = Math.min(100, sim.morale + 5);
      useful = allies.length > 0;
      break;
    case 'ward':
      for (const u of allies) { u.wardUntil = secs(15); u.hesitate = 0; u.fleeing = 0; }
      if (allies.length) sim.morale = Math.min(100, sim.morale + 15);
      useful = allies.length > 0;
      break;
    case 'barrier':
      for (const u of allies) u.shield = Math.max(u.shield ?? 0, (40 + t * 10) * L);
      useful = allies.length > 0;
      break;
    case 'second_wind': {
      for (const u of inArea) {
        if (u.side !== 'hero' || u.alive || u.minion) continue;
        u.alive = true;
        u.fallen = false;
        u.hp = u.maxHp * Math.min(0.6, 0.35 * L);
        useful = true;
        log(sim, `${u.name} got back up!`);
        sim.events.push({ t: 'shout', id: u.id, text: 'Not yet!' });
      }
      if (healAll(allies.filter((u) => u.alive), (u) => u.maxHp * 0.25)) useful = true;
      break;
    }
    case 'reveal': {
      const n = packed.level >= 3 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = sim.rng.range(0, Math.PI * 2);
        const r = sim.rng.range(40, spell.radius * 0.8);
        sim.finds.push({
          id: sim.finds.length, x: input.x + Math.cos(a) * r, y: input.y + Math.sin(a) * r,
          gold: Math.round(sim.rng.range(8, 14) * t * L), expires: sim.tick + 15 * TPS, taken: false,
        });
      }
      useful = true;
      break;
    }
  }
  if (useful) sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 2);
}

/** The Guildmaster's blessings (common spells): gold, materials or XP for a while. */
export type Boon = 'fortune' | 'harvest' | 'insight';
export const BOON_SEC = 30;
const BOON_TEXT: Record<Boon, string> = {
  fortune: "The Guildmaster called on Fortune's Favor: gold shines a little brighter for a while.",
  harvest: 'A Bountiful Harvest: everything the party picks up comes in double for a while.',
  insight: "Sage's Insight: every fight teaches the party more for a while.",
};

/** A blessing's multiplier right now (1 when it isn't active). */
export function boon(sim: Sim, k: Boon): number {
  const b = sim.boons?.[k];
  return b && sim.tick < b.until ? b.mult : 1;
}

// ---- Sites (found by scouts) ----

type Spawn = (gx: number, gy: number, pool: { id: string; weight: number }[], size: number, goldMult?: number) => EnemyGroup;

/** Puts a scouted site near the end of the trail: what guards it, and its hoard. */
function setupSite(sim: Sim, site: { kind: SiteKind; name: string }, onTrail: (frac: number) => Pt, spawn: Spawn, pool: { id: string; weight: number }[]) {
  const region = sim.region;
  const rng = sim.rng;
  const tier = region.tier;
  const s: NonNullable<Sim['site']> = { kind: site.kind, name: site.name, groups: [], chest: -1, boss: -1 };
  sim.site = s;
  const hoard = (at: Pt, gold: number, kind: SiteKind) => {
    s.chest = sim.chests.length;
    sim.chests.push({ id: sim.chests.length, x: at.x + 40, y: at.y - 110, gold: Math.round(gold), taken: false, vault: kind });
  };
  // Partway along, so the party gets there with time to spare; and a little extra time to deal with it.
  const at = onTrail(0.62);
  sim.maxTicks = Math.round(sim.maxTicks * 1.2);
  switch (site.kind) {
    case 'camp': {
      // Two war bands a little apart, then the camp's hoard.
      for (const f of [0.56, 0.64]) {
        const p = onTrail(f);
        s.groups.push(spawn(p.x, p.y, pool, region.groupSize[1], 2).id);
      }
      hoard(onTrail(0.66), rng.range(30, 45) * tier, 'camp');
      break;
    }
    case 'lair': {
      const beast = lairBeast(region);
      const g = spawn(at.x + 60, at.y, [{ id: beast, weight: 1 }], 1, 8);
      const boss = sim.units.find((u) => u.group === g.id)!;
      boss.hp = boss.maxHp = boss.maxHp * 6;
      boss.atk *= 1.6;
      boss.name = `Great ${boss.name}`;
      boss.boss = true;
      boss.big = true;
      boss.xp *= 6;
      s.boss = boss.id;
      s.groups.push(g.id, spawn(at.x - 30, at.y + 90, pool, 2).id);
      // The hoard lies on the trail just past the beast (off to the side, the party could walk by it).
      hoard(onTrail(0.66), rng.range(45, 60) * tier, 'lair');
      break;
    }
    case 'dungeon': {
      // Down at the end of the trail: five rooms below the map, then the vault (see delve.ts).
      const { groups, vault } = setupDelve(sim, site.name, pool, spawn);
      s.groups.push(...groups);
      hoard({ x: vault.x - 40, y: vault.y + 110 }, rng.range(50, 65) * tier, 'dungeon');
      sim.maxTicks = Math.round(sim.maxTicks * 1.15);
      break;
    }
    case 'cache': {
      s.groups.push(spawn(at.x - 40, at.y + 60, pool, 2).id);
      hoard(at, rng.range(35, 50) * tier, 'cache');
      break;
    }
    case 'shrine':
      hoard(at, rng.range(5, 10) * tier, 'shrine');
      break;
  }
}

/** Has the party dealt with the site it came for? */
export function siteCleared(sim: Sim): boolean {
  const s = sim.site;
  if (!s) return false;
  const chestTaken = s.chest >= 0 && sim.chests[s.chest]?.taken;
  switch (s.kind) {
    case 'lair': return s.boss >= 0 && !sim.units.find((u) => u.id === s.boss)?.alive;
    case 'camp':
    case 'dungeon': return s.groups.every((g) => sim.groups[g]?.cleared);
    default: return !!chestTaken;
  }
}

/** A site's hoard: more gold, an item and pack pieces (a shrine heals and blesses instead). */
function openVault(sim: Sim, c: Chest) {
  // Nobody loots a camp or a lair with its guards still standing.
  const s = sim.site;
  if (s && (c.vault === 'camp' || c.vault === 'lair' || c.vault === 'dungeon') && s.groups.some((g) => !sim.groups[g]?.cleared)) return;
  c.taken = true;
  sim.gold += c.gold;
  sim.events.push({ t: 'loot', x: c.x, y: c.y, gold: c.gold });
  const tier = sim.region.tier;
  if (c.vault === 'shrine') {
    const party = liveHeroes(sim);
    for (const h of party) {
      const amt = Math.min(h.maxHp - h.hp, h.maxHp * 0.5);
      h.hp += amt;
      h.atk *= 1.1;
      if (amt >= 1) sim.events.push({ t: 'heal', x: h.x, y: h.y - 30, amount: Math.round(amt) });
    }
    sim.guidance = Math.min(GUIDANCE_CAP, sim.guidance + 10);
    const left = addPieces(sim, 'grimoire', 1, c);
    log(sim, `The party knelt at ${s?.name ?? 'the shrine'}. Wounds closed, blows steadied, and someone left ${pieceName(left)} on the altar.`);
    return;
  }
  const itemTier = Math.max(1, Math.min(3, Math.round(tier * 0.7) + 1));
  const it = sim.rng.pick(LOOT_ITEMS.filter((i) => i.tier === itemTier));
  sim.items.push(it.id);
  const piece: PackType = tier >= 5 ? 'champion' : tier >= 3 ? 'veteran' : 'recruit';
  const n = piece === 'recruit' ? 3 : piece === 'veteran' ? 2 : 1;
  const got = addPieces(sim, piece, n, c);
  log(sim, `The hoard of ${s?.name ?? 'the site'}: ${c.gold} gold, ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name} and ${pieceName(got, n)}!`);
}

export function activateGroup(sim: Sim, g: number, chargedBy?: Unit) {
  const group = sim.groups[g];
  if (!group || group.active) return;
  group.active = true;
  if (!group.announced) {
    group.announced = true;
    const members = sim.units.filter((u) => u.group === g && u.alive);
    const counts = new Map<string, number>();
    for (const m of members) counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
    const parts = [...counts].map(([n, c]) => (c > 1 ? `${c} ${plural(n)}` : /^The | the /.test(n) ? n : `${/^[AEIOU]/.test(n) ? 'an' : 'a'} ${n}`));
    if (chargedBy && !sim.told[`charge-${chargedBy.id}`]) {
      sim.told[`charge-${chargedBy.id}`] = true;
      log(sim, `${chargedBy.name} charged ahead before anyone could stop them: ${joinList(parts)}!`);
      sim.events.push({ t: 'shout', id: chargedBy.id, text: 'CHARGE!' });
    } else if (chargedBy) {
      log(sim, `${sim.rng.pick([`${chargedBy.name} was already running at them:`, `Here we go again. ${chargedBy.name} charged:`, `Nobody was surprised when ${chargedBy.name} ran in first:`])} ${joinList(parts)}.`);
    }
    else if (sim.stealth) {
      log(sim, `${sim.rng.pick(['Unseen, the party fell on', 'Out of the undergrowth, the party struck:', 'They never saw it coming:'])} ${joinList(parts)}.`);
      // Moving unseen: the party strikes first.
      for (const m of members) m.cd += 1.5;
    } else if (sim.cap.firstStrike) {
      // A Captain with a knack for ambushes: the party hits first.
      const cap = unitById(sim, sim.captainId);
      log(sim, `${cap?.name ?? 'The Captain'} had them spotted first: ${joinList(parts)}.`);
      for (const m of members) m.cd += 1.5;
    } else log(sim, `${sim.rng.pick(['Monsters on the trail:', 'Trouble ahead:', 'Blades out:', 'Contact:'])} ${joinList(parts)}.`);
    for (const h of liveHeroes(sim)) {
      if (h.grudge && h.grudge === group.family) {
        once(sim, `grudge-${h.id}`, `${h.name} saw ${group.family.toLowerCase()} and went red in the face. Old grudges die hard.`, h, 'You again!');
      }
    }
  }
}

export function plural(name: string): string {
  if (name.endsWith('Shaman')) return name + 's';
  if (name.endsWith('man')) return name.slice(0, -3) + 'men';
  if (name.endsWith('Wolf')) return name.slice(0, -4) + 'Wolves';
  return name + 's';
}

export function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

export function damage(sim: Sim, from: Unit | null, to: Unit, raw: number, canCrit: boolean) {
  let amt = raw * sim.rng.range(0.85, 1.15) * (30 / (30 + to.def));
  const crit = canCrit && from !== null && sim.rng.chance(from.crit);
  if (crit) amt *= 1.8;
  if (to.defId === 'torvald') amt *= 0.9;
  if (to.defId === 'bruni' && from?.big) amt *= 0.8;
  amt = Math.max(1, amt);
  // Stoneskin soaks damage first.
  if (to.shield && to.shield > 0) {
    const soaked = Math.min(to.shield, amt);
    to.shield -= soaked;
    amt -= soaked;
  }
  to.hp -= amt;
  if (sim.safe && to.side === 'hero' && !to.pet && !to.minion) to.hp = Math.max(1, to.hp);
  sim.events.push({ t: 'hit', x: to.x, y: to.y - 30, amount: Math.round(amt), crit, onHero: to.side === 'hero' });
  if (to.hp <= 0 && to.alive) {
    to.alive = false;
    to.hp = 0;
    sim.events.push({ t: 'death', id: to.id, x: to.x, y: to.y, hero: to.side === 'hero' });
    if (to.side === 'enemy') {
      // (Monsters killed by other monsters, in a brawl, aren't the party's kills.)
      if (from?.side !== 'enemy') {
        sim.enemiesDefeated += 1;
        sim.kills[to.key] = (sim.kills[to.key] ?? 0) + 1;
      }
      // Necromancers nearby may raise the body (applied at the end of the tick).
      for (const n of liveHeroes(sim)) {
        if (n.heroClass !== 'necromancer' || dist(n, to) > 320 || (n.raiseReadyAt ?? 0) > sim.tick) continue;
        if (sim.raises.some((r) => r.necroId === n.id)) continue;
        if (sim.rng.chance(n.defId === 'grell' ? 0.6 : 0.4)) sim.raises.push({ necroId: n.id, corpseId: to.id });
      }
      if (to.stolen) thiefDown(sim, to, from);
      if (to.mimicChest !== undefined) mimicLoot(sim, to);
      if (from?.side !== 'enemy') {
        sim.gold += to.gold * (1 + 0.15 * (sim.region.tier - 1)) * boon(sim, 'fortune');
        sim.xp += to.xp * (sim.orders.focus === 'hunt' ? 1.2 : 1) * boon(sim, 'insight');
      }
      if (from) {
        from.kills += 1;
        if (from.side === 'hero') sim.groups[to.group].lastKiller = from.name;
      }
    } else if (to.minion) {
      // Raised dead just crumble.
    } else if (to.pet) {
      once(sim, `petdown-${to.id}`, `${to.name} limped out of the fight.`);
    } else if (to.freed) {
      // A freed prisoner fell; they fought bravely.
    } else if (sim.region.skull && !fallInSkullRegion(sim, to)) {
      // Saved (a Phoenix Feather): back on their feet.
    } else {
      if (!sim.region.skull) log(sim, `${to.name} was knocked out!`);
      // Friends take it personally.
      for (const f of liveHeroes(sim)) {
        if (f.fondOf === to.defId && !f.raging) {
          f.raging = true;
          f.atk *= 1.3;
          once(sim, `rage-${f.id}`, `${f.name} screamed ${to.name}'s name and fought like a storm.`, f, `${to.name}!`);
        }
      }
    }
  }
}

/**
 * A hero goes down in a skull region. A Phoenix Feather burns and they rise (returns false);
 * otherwise a healer may drag them out (once per healer per trip), and if nobody can, they have
 * fallen: dead for good unless Second Wind raises them before the trip ends.
 */
function fallInSkullRegion(sim: Sim, to: Unit): boolean {
  if (to.phoenix) {
    to.phoenix = false;
    to.alive = true;
    to.hp = to.maxHp * 0.4;
    sim.feathers.push(to.key);
    sim.events.push({ t: 'heal', x: to.x, y: to.y - 30, amount: Math.round(to.hp) });
    sim.events.push({ t: 'shout', id: to.id, text: 'Not today!' });
    log(sim, `${to.name}'s Phoenix Feather burst into flame, and ${to.name} rose from the ashes!`);
    return false;
  }
  const rescuer = liveHeroes(sim).find((h) => h.heal > 0 && !sim.rescuers.includes(h.id) && dist(h, to) < 420);
  if (rescuer) {
    sim.rescuers.push(rescuer.id);
    log(sim, `${to.name} went down, but ${rescuer.name} dragged them out of harm's way. Badly hurt, but alive.`);
    sim.events.push({ t: 'shout', id: rescuer.id, text: 'I have you!' });
  } else {
    to.fallen = true;
    log(sim, `${to.name} has fallen. In the skull lands, the fallen do not get up.`);
  }
  return true;
}

function nearest(from: Unit, candidates: Unit[], bias?: (u: Unit) => number): Unit | null {
  let best: Unit | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const s = dist(from, c) + (bias ? bias(c) : 0);
    if (s < bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

/** Walks toward a point, routed through the fortress gateway if a wall is in the way. */
function seek(sim: Sim, u: Unit, x: number, y: number, speedMul = 1) {
  const p = sim.siege ? navPoint(sim, u, x, y) : { x, y };
  moveToward(u, p.x, p.y, speedMul);
}

export function moveToward(u: Unit, x: number, y: number, speedMul = 1) {
  const dx = x - u.x;
  const dy = y - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const step = Math.min(d, u.speed * speedMul * (u.moveMul ?? 1) * DT);
  u.x += (dx / d) * step;
  u.y += (dy / d) * step;
  if (Math.abs(dx) > 2) u.facing = dx > 0 ? 1 : -1;
}

/** How much an enemy wants to hit a hero (lower = more likely): front row, warriors and protectors draw fire; shy heroes hide. */
function threatBias(sim: Sim, f: Unit): number {
  let b = (f.row === 'front' ? -90 : 0) + (f.heroClass === 'warrior' || f.heroClass === 'paladin' ? -30 : 0);
  if (f.personality === 'protective') b -= 60;
  if (f.personality === 'shy' && liveHeroes(sim).some((o) => o !== f && dist(o, f) < 160)) b += 80;
  return b;
}

function heroTarget(sim: Sim, u: Unit, all: Unit[]): Unit | null {
  const foes = sim.siege ? all.filter((f) => canReach(sim, u, f)) : all;
  if (!foes.length) return null;
  const preferred = sim.siege ? preferredTarget(sim, u, foes) : null;
  if (preferred) return preferred;
  const nest = foes.find((f) => f.nest);
  if (nest && (u.range > 100 || u.id === sim.captainId || u.personality === 'gloryhound')) return nest;
  // Grudges come first.
  if (u.grudge) {
    const hated = foes.filter((f) => f.family === u.grudge);
    if (hated.length) return nearest(u, hated);
  }
  if (u.heroClass === 'dragonslayer') {
    const big = foes.filter((f) => f.big);
    if (big.length) return nearest(u, big);
  }
  if (u.personality === 'gloryhound') {
    const top = Math.max(...foes.map((f) => f.maxHp));
    return nearest(u, foes.filter((f) => f.maxHp >= top * 0.9));
  }
  if (u.personality === 'protective') {
    // Go after whoever is hurting the weakest friend.
    const hurt = liveHeroes(sim).filter((h) => h !== u && h.hp / h.maxHp < 0.6);
    if (hurt.length) {
      const weakest = hurt.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
      const attackers = foes.filter((f) => f.targetId === weakest.id);
      if (attackers.length) return nearest(u, attackers);
    }
  }
  return nearest(u, foes);
}

export function unitAct(sim: Sim, u: Unit, foes: Unit[], friends: Unit[]) {
  if (u.structure) return;
  u.cd -= DT * (u.actMul ?? 1);
  if ((u.wardUntil ?? 0) > sim.tick) {
    u.hesitate = 0;
    u.fleeing = 0;
  }
  if (u.hesitate > 0) {
    u.hesitate -= DT;
    return;
  }
  // Cowards run for cover when badly hurt.
  if (u.personality === 'cowardly' && (u.wardUntil ?? 0) <= sim.tick) {
    if (u.fleeing <= 0 && u.hp / u.maxHp < 0.35) {
      u.fleeing = 3;
      once(sim, `flee-${u.id}`, `${u.name} squeaked and ran for cover.`, u, 'Nope!');
    }
    if (u.fleeing > 0) {
      u.fleeing -= DT;
      const threat = nearest(u, foes);
      if (threat) {
        const dx = u.x - threat.x;
        const dy = u.y - threat.y;
        const d = Math.hypot(dx, dy) || 1;
        moveToward(u, u.x + (dx / d) * 80, u.y + (dy / d) * 80, 1.2);
      }
      return;
    }
  }
  // Greedy heroes slip off to open chests, even mid-fight.
  if (u.personality === 'greedy') {
    const chest = sim.chests.find((c) => !c.taken && dist(u, c) < 320 && (!c.hoard || sim.forks.some((f) => f.chestId === c.id && f.decided === 'take')));
    if (chest) {
      if (dist(u, chest) < 30) {
        takeChest(sim, chest, `${u.name} slipped off mid-fight to pry open a chest`);
      } else {
        moveToward(u, chest.x, chest.y, 1.1);
        return;
      }
    }
  }
  // Healers look after hurt friends first.
  if (u.heal > 0) {
    const hurt = friends.filter((f) => f.hp / f.maxHp < 0.75 && dist(u, f) <= u.range + 40);
    if (hurt.length && u.cd <= 0) {
      const t = hurt.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
      const amt = Math.min(t.maxHp - t.hp, u.heal * sim.rng.range(0.9, 1.1));
      t.hp += amt;
      u.cd = u.attackRate;
      sim.events.push({ t: 'shot', fromX: u.x, fromY: u.y - 20, toX: t.x, toY: t.y - 20, kind: 'holy' });
      if (amt >= 1) sim.events.push({ t: 'heal', x: t.x, y: t.y - 30, amount: Math.round(amt) });
      return;
    }
  }
  if (!foes.length) return;
  let target = u.targetId ? foes.find((f) => f.id === u.targetId) ?? null : null;
  if (!target || sim.tick % 15 === u.id % 15) {
    if (u.side === 'enemy') {
      // Enemies are drawn to the front-line fighters; archers pick off the weakest.
      // Archers on the towers can only shoot whoever is in range.
      const pool = u.fixed ? foes.filter((f) => dist(u, f) <= u.range) : foes;
      if (!pool.length) return;
      const cart = sim.groups[u.group]?.raid ? pool.find((f) => f.cart) : undefined;
      target = cart ?? (u.role === 'archer' ? pool.reduce((a, b) => (a.hp < b.hp ? a : b)) : nearest(u, pool, (f) => threatBias(sim, f)));
    } else {
      target = heroTarget(sim, u, foes);
    }
    u.targetId = target?.id ?? null;
  }
  if (!target) return;
  const d = dist(u, target);
  if (d > u.range) {
    if (u.fixed || holdsPosition(sim, u, target)) return;
    seek(sim, u, target.x, target.y);
    return;
  }
  u.facing = target.x >= u.x ? 1 : -1;
  if (u.cd > 0) return;
  u.cd = u.attackRate;
  if (u.range > 100) {
    const kind = u.heroClass === 'mage' ? 'magic' : u.heroClass === 'cleric' ? 'holy' : u.heroClass === 'necromancer' ? 'dark' : u.key === 'bandit_xbow' ? 'bolt' : u.key === 'goblin_bomber' ? 'bomb' : u.key === 'gloom_heart' || u.key === 'banshee' ? 'dark' : u.key === 'dragon' || u.key === 'wyrmling' || u.key === 'imp' ? 'fire' : 'arrow';
    sim.events.push({ t: 'shot', fromX: u.x, fromY: u.y - 24, toX: target.x, toY: target.y - 20, kind });
  }
  let atk = u.atk * (u.side === 'hero' && sim.morale < 75 ? 0.9 : 1);
  if (u.grudge && target.family === u.grudge) atk *= 1.25;
  if (u.personality === 'gloryhound' && target.maxHp >= Math.max(...foes.map((f) => f.maxHp)) * 0.9) atk *= 1.15;
  if ((u.rallyUntil ?? 0) > sim.tick) atk *= 1.25;
  if (sim.stormUntil > sim.tick && u.range > 100) atk *= 0.75;
  if (u.heroClass === 'dragonslayer') atk *= target.family === 'Dragonkin' ? 2 : target.big ? 1.5 : 1;
  damage(sim, u, target, atk, true);
  if (u.splash > 0) {
    for (const f of foes) if (f !== target && f.alive && dist(f, target) < u.splash) damage(sim, u, f, atk * 0.5, false);
  }
}

function separate(sim: Sim) {
  const live = sim.units.filter((u) => u.alive);
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 38;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
}

export function gain(sim: Sim, m: Material, n: number) {
  const season = (sim.season === 'spring' && m === 'herbs') ? 1.5 : (sim.season === 'autumn' && (m === 'wood' || m === 'hides')) ? 1.3 : 1;
  const mult = (sim.orders.focus === 'gather' ? 2 : 1) * (sim.matMult[m] ?? 1) * season * boon(sim, 'harvest') * (sim.cap?.mats ?? 1);
  sim.materials[m] = (sim.materials[m] ?? 0) + n * mult;
}

function takeChest(sim: Sim, c: Chest, lead = 'A chest by the path', itemBonus = 0) {
  if (c.vault) return openVault(sim, c);
  c.taken = true;
  c.gold = Math.round(c.gold * boon(sim, 'fortune'));
  sim.gold += c.gold;
  sim.events.push({ t: 'loot', x: c.x, y: c.y, gold: c.gold });
  // A chest worth a detour (and a fight) holds more than a crate by the road.
  gain(sim, sim.rng.pick(BIOME_MATERIALS[sim.region.biome]), c.hoard ? sim.rng.int(2, 3) : sim.rng.int(1, 3));
  const piece = rollPiece(sim, chestPieceRoll(sim.region.tier), c);
  let extra = piece ? ` and ${pieceName(piece)}` : '';
  // The Deep Marches: chests can hold a Starshard.
  if (sim.region.ring >= DEEP_RING && sim.rng.chance(SHARD_CHANCE[sim.region.ring] ?? 0)) {
    sim.shards += 1;
    extra += ', and a Starshard glowing in the bottom';
  }
  const itemChance = c.kind === 'ornate' ? 1 : 0.2 + (sim.orders.focus === 'treasure' ? 0.15 : 0) + (c.kind === 'strongbox' ? 0.15 : 0) + itemBonus;
  if (sim.rng.chance(itemChance)) {
    const tier = Math.max(1, Math.min(3, Math.round(sim.region.tier * 0.7)));
    const it = sim.rng.pick(LOOT_ITEMS.filter((i) => i.tier === tier));
    sim.items.push(it.id);
    sim.events.push({ t: 'chest', x: c.x, y: c.y, gold: c.gold, item: it.id });
    log(sim, `${lead}: ${c.gold} gold, ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name}${extra}!`);
  } else {
    sim.events.push({ t: 'chest', x: c.x, y: c.y, gold: c.gold });
    log(sim, `${lead}: ${c.gold} gold${extra}.`);
  }
}

// ---- Road events ----

function roadEvent(sim: Sim) {
  sim.event.happened = true;
  const tier = sim.region.tier;
  const ahead = pointAt(sim, sim.leaderDist + 160);
  if (sim.event.kind === 'merchant') {
    sim.finds.push({ id: sim.finds.length, x: ahead.p.x - ahead.dir.y * 110, y: ahead.p.y + ahead.dir.x * 110, gold: merchantPrice(sim), expires: sim.tick + 45 * TPS, taken: false, merchant: true });
    log(sim, `A travelling merchant's cart by the road. "Fine wares, fair prices!" Click the cart to buy (${merchantPrice(sim)} gold from the trip's takings).`);
  } else if (sim.event.kind === 'storm') {
    sim.stormUntil = sim.tick + 45 * TPS;
    log(sim, 'A sudden storm rolled in. Slow going, and arrows went wide.');
  } else if (sim.event.kind === 'rivals') {
    const party = liveHeroes(sim);
    const captain = unitById(sim, sim.captainId);
    const proud = sim.orders.stance === 'bold' || captain?.personality === 'reckless' || captain?.personality === 'gloryhound';
    if (proud) {
      const g = spawnLateGroup(sim, ahead.p.x + 60, ahead.p.y, [{ id: 'rival_blade', weight: 3 }, { id: 'rival_bow', weight: 2 }], 3 + Math.floor(tier / 2));
      for (const u of sim.units) if (u.group === g) u.gold *= 2.5;
      activateGroup(sim, g);
      log(sim, `A rival adventuring company blocked the road. ${captain?.name ?? 'The Captain'} told them to step aside. They did not.`);
    } else {
      // (Not a site's hoard, guarded by its owner, nor a rare find like the Lost Caravan.)
      const chests = sim.chests.filter((c) => !c.taken && !c.vault && !c.lead && c.x > sim.leader.x).sort((a, b) => a.x - b.x).slice(0, 2);
      for (const c of chests) c.taken = true;
      log(sim, chests.length ? `A rival company hurried past, and got there first: ${chests.length === 1 ? 'the next chest was' : 'the next two chests were'} already empty.` : 'A rival company hurried past, with nothing left to beat the party to.');
    }
    if (party[0]) sim.events.push({ t: 'shout', id: party[0].id, text: proud ? 'Make way!' : 'Hey!' });
  }
}

function merchantPrice(sim: Sim): number {
  return 25 * sim.region.tier + 25;
}

/** The Guildmaster buys from the merchant: a good item and a round of tonics for everyone. */
function buyFromMerchant(sim: Sim, f: Find) {
  if (sim.gold < f.gold) {
    log(sim, `The merchant wants ${f.gold} gold; the party only has ${Math.floor(sim.gold)} so far.`);
    return;
  }
  f.taken = true;
  sim.gold -= f.gold;
  sim.findsCollected += 1;
  const tier = Math.max(1, Math.min(3, Math.round(sim.region.tier * 0.7) + 1));
  const it = sim.rng.pick(LOOT_ITEMS.filter((i) => i.tier === tier));
  sim.items.push(it.id);
  for (const h of liveHeroes(sim)) {
    const amt = Math.min(h.maxHp - h.hp, h.maxHp * 0.3);
    h.hp += amt;
    if (amt > 1) sim.events.push({ t: 'heal', x: h.x, y: h.y - 30, amount: Math.round(amt) });
  }
  log(sim, `Bought from the merchant for ${f.gold} gold: ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name}, and a round of tonics for everyone.`);
}

/** Rolls for a pack piece. Returns the pack type found, if any. */
function rollPiece(sim: Sim, roll: PieceRoll, at: Pt): PackType | null {
  const type = sim.rng.weighted(roll.filter(([, w]) => w > 0).map(([value, weight]) => ({ value, weight })));
  if (type === 'none') return null;
  return addPieces(sim, type, 1, at);
}

/** In the first ring, a piece of anything but a Novice Pack stays what it is only this often (it's a Novice piece otherwise). */
export const RING1_KEEP = 0.1;

/** Adds pack pieces to the haul. Returns what they turned out to be (in the first ring, mostly Novice Pack pieces). */
export function addPieces(sim: Sim, type: PackType, n: number, at: Pt): PackType {
  if (sim.region.ring <= 1 && !sim.siege && type !== 'novice' && !sim.rng.chance(RING1_KEEP)) type = 'novice';
  sim.pieces[type] = (sim.pieces[type] ?? 0) + n;
  sim.events.push({ t: 'piece', x: at.x, y: at.y - 24, pack: type, n });
  return type;
}

/** "a Recruit Pack piece", "3 Veteran Pack pieces". */
export function pieceName(type: PackType, n = 1): string {
  return n === 1 ? `a ${PACKS[type].name} piece` : `${n} ${PACKS[type].name} pieces`;
}

// ---- Crossroads ----

const FORK_TEXT: Partial<Record<ForkKind, { sign: string; take: string; skip: string }>> = {
  ruins: { sign: 'a side path toward a ruined tower', take: 'turned off toward the ruined tower', skip: 'kept to the road past the ruins' },
  camp: { sign: 'smoke rising from a camp', take: 'led the party toward the camp, weapons drawn', skip: 'gave the camp a wide berth' },
  stranger: { sign: 'someone calling for help off the road', take: 'went to see who was calling', skip: 'pretended not to hear the calls' },
  shrine: { sign: 'an old shrine up a mossy path', take: 'climbed the mossy path to the shrine', skip: 'walked past the shrine' },
};

const CAMP_SIGN: Record<string, string> = {
  Goblins: 'smoke rising from a goblin camp',
  Beasts: 'bones and tracks leading to a beast den',
  Bandits: 'a bandit hideout half hidden in the trees',
  Undead: 'an open crypt with cold air pouring out',
  'Swamp horrors': 'bubbles rising from a black pool',
  Cultists: 'chanting from a cultist camp among the rocks',
  Dragonkin: 'scorched bones around a drake nest',
  'Fire and ash': 'smoke and the glow of a fire camp',
};

const PREF: Record<Personality, Partial<Record<ForkKind, number>>> = {
  reckless: { ruins: 0, camp: 3, stranger: 0, shrine: -1 },
  cowardly: { ruins: 0, camp: -3, stranger: -1, shrine: 1 },
  shy: { ruins: 0, camp: -2, stranger: -1, shrine: 1 },
  protective: { ruins: 0, camp: 0, stranger: 3, shrine: 1 },
  gloryhound: { ruins: 1, camp: 3, stranger: -1, shrine: 0 },
  greedy: { ruins: 3, camp: 1, stranger: 1, shrine: -1 },
  curious: { ruins: 2, camp: 1, stranger: 2, shrine: 2 },
  steady: { ruins: 0, camp: 0, stranger: 0, shrine: 0 },
};

/** How much a hero wants to take this side path (positive = yes). */
export function heroForkOpinion(u: Unit, f: Fork, partyHurt: boolean): number {
  let v = PREF[u.personality ?? 'steady'][f.kind] ?? 0;
  if (f.kind === 'camp' && u.grudge && u.grudge === f.family) v += 3;
  if (partyHurt && f.kind === 'camp') v -= 2;
  if (partyHurt && f.kind === 'shrine') v += 2;
  return v;
}

/** What the orders say about this side path. */
export function ordersForkScore(o: Orders, f: Fork): number {
  let v = 0;
  if (o.focus === 'treasure' && f.kind === 'ruins') v += 2;
  if (o.focus === 'hunt' && f.kind === 'camp') v += 2;
  if (o.focus === 'gather' && f.kind === 'ruins') v += 1;
  if (o.focus === 'explore') v += 1;
  if (o.stance === 'bold') v += f.kind === 'camp' ? 2 : 0.5;
  if (o.stance === 'cautious') v += f.kind === 'camp' ? -2 : f.kind === 'shrine' ? 1 : -0.5;
  return v;
}

function decideFork(sim: Sim, f: Fork) {
  if (f.kind === 'hoard') return decideHoard(sim, f);
  const party = liveHeroes(sim);
  const secret = SECRET_BY_KIND[f.kind as SecretKind];
  if (secret) {
    // Only this tribe can see the way, so there is nothing to argue about.
    f.decided = 'take';
    const guides = party.filter((u) => HERO_BY_ID[u.defId!].tribe === secret.tribe).map((u) => u.name);
    log(sim, `A secret way: ${secret.sign}. ${joinList(guides.slice(0, 3))} ${secret.take}.`);
    if (guides[0]) sim.events.push({ t: 'shout', id: party.find((u) => u.name === guides[0])!.id, text: 'This way!' });
    return;
  }
  const wp = sim.waypoints[`fork:${f.id}`];
  if (wp) {
    f.decided = wp;
    const t = FORK_TEXT[f.kind]!;
    const sign = f.kind === 'camp' ? CAMP_SIGN[f.family ?? ''] ?? t.sign : t.sign;
    log(sim, `A crossroads: ${sign}. The Guildmaster had marked it on the map: ${wp === 'take' ? 'take the side path' : 'keep to the road'}.`);
    return;
  }
  const captain = unitById(sim, sim.captainId);
  const leader = captain && captain.alive ? captain : party[0];
  const hurt = partyHpPct(sim) < 60;
  const others = party.filter((u) => u !== leader);
  const own = leader ? heroForkOpinion(leader, f, hurt) : 0;
  const mood = others.reduce((a, u) => a + heroForkOpinion(u, f, hurt), 0);
  let score = ordersForkScore(sim.orders, f) + own * 1.5 + mood * 0.3 + (hurt && f.kind === 'camp' ? -2 : 0);
  if (Math.abs(score) <= 0.5) score = sim.rng.chance(0.5) ? 1 : -1;
  f.decided = score > 0 ? 'take' : 'skip';
  const name = leader?.name ?? 'The party';
  const text = FORK_TEXT[f.kind]!;
  const signText = f.kind === 'camp' ? CAMP_SIGN[f.family ?? ''] ?? text.sign : text.sign;
  log(sim, `A crossroads: ${signText}. ${name}${leader?.id === sim.captainId ? ' (Captain)' : ''} ${f.decided === 'take' ? text.take : text.skip}.`);
  if (leader) sim.events.push({ t: 'shout', id: leader.id, text: f.decided === 'take' ? FORK_SHOUT[f.kind] ?? 'This way!' : 'Keep to the road.' });
  // Strong disagreement is grumbled about; strong agreement lifts spirits.
  const sign = f.decided === 'take' ? 1 : -1;
  for (const u of others) {
    const op = heroForkOpinion(u, f, hurt);
    if (Math.abs(op) >= 2 && Math.sign(op) !== sign) {
      sim.morale = Math.max(0, sim.morale - 6);
      log(sim, f.decided === 'take'
        ? `${u.name} grumbled the whole way there.`
        : `${u.name} kept looking back over a shoulder and muttering.`);
      sim.events.push({ t: 'shout', id: u.id, text: f.decided === 'take' ? 'Bad idea…' : 'Boring.' });
    } else if (Math.abs(op) >= 2) {
      sim.morale = Math.min(100, sim.morale + 2);
    }
  }
  if (sim.fiveTribe === 'dawnwings') sim.morale = Math.max(80, sim.morale);
}

function arriveAtFork(sim: Sim, f: Fork) {
  f.arrived = true;
  if (f.kind === 'hoard') return arriveHoard(sim, f);
  const party = liveHeroes(sim);
  const secret = SECRET_BY_KIND[f.kind as SecretKind];
  if (secret) {
    const tier = sim.region.tier;
    log(sim, secret.arrive);
    const gold = Math.round(secret.gold * tier * sim.rng.range(0.85, 1.15));
    sim.gold += gold;
    sim.events.push({ t: 'loot', x: f.poi.x, y: f.poi.y, gold });
    for (const [m, n] of secret.materials) gain(sim, m, n);
    if (secret.heal) {
      for (const h of party) {
        const amt = Math.min(h.maxHp - h.hp, h.maxHp * secret.heal);
        h.hp += amt;
        if (amt > 1) sim.events.push({ t: 'heal', x: h.x, y: h.y - 30, amount: Math.round(amt) });
      }
    }
    if (secret.mana) sim.mana = MANA_MAX;
    if (sim.rng.chance(secret.item)) {
      const it = sim.rng.pick(LOOT_ITEMS.filter((i) => i.tier === Math.max(1, Math.min(3, Math.round(tier * 0.7) + 1))));
      sim.items.push(it.id);
      log(sim, `Among the find: ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name}, ${gold} gold and ${pieceName(rollPiece(sim, SECRET_PIECE_ROLL, f.poi)!)}.`);
    } else {
      log(sim, `The find was worth ${gold} gold and ${pieceName(rollPiece(sim, SECRET_PIECE_ROLL, f.poi)!)}.`);
    }
    if (secret.guards) {
      const g = spawnLateGroup(sim, f.poi.x + 60, f.poi.y + 30, [{ id: 'skeleton', weight: 3 }, { id: 'wraith', weight: 1 }], 2 + Math.floor(tier / 2));
      activateGroup(sim, g);
    }
    return;
  }
  if (f.kind === 'shrine') {
    for (const h of party) {
      const amt = Math.min(h.maxHp - h.hp, h.maxHp * 0.4);
      h.hp += amt;
      if (amt > 1) sim.events.push({ t: 'heal', x: h.x, y: h.y - 30, amount: Math.round(amt) });
      h.atk *= 1.1;
    }
    sim.morale = Math.min(100, sim.morale + 10);
    log(sim, 'The party knelt at the old shrine. Wounds closed and spirits rose.');
    if (party[0]) sim.events.push({ t: 'shout', id: party[0].id, text: 'Blessed! (+10% damage)' });
  } else if (f.kind === 'stranger') {
    const roll = sim.rng.next();
    const tier = sim.region.tier;
    if (roll < 0.2) {
      log(sim, 'It was a trap! Bandits burst from the bushes.');
      if (party[0]) sim.events.push({ t: 'shout', id: party[0].id, text: 'A trap!' });
      const pool = [{ id: 'bandit', weight: 3 }, { id: 'bandit_xbow', weight: 1 }];
      const g = spawnLateGroup(sim, f.poi.x + 60, f.poi.y + 40, pool, 2 + Math.floor(tier / 2));
      activateGroup(sim, g);
    } else {
      const gold = Math.round(sim.rng.range(15, 25) * tier);
      sim.gold += gold;
      sim.xp += 10 * tier;
      sim.events.push({ t: 'loot', x: f.poi.x, y: f.poi.y - 40, gold });
      if (party[0]) sim.events.push({ t: 'shout', id: party[0].id, text: 'Glad to help!' });
      if (party.some((u) => u.personality === 'protective')) sim.morale = Math.min(100, sim.morale + 5);
      const who = sim.rng.pick(['a lost shepherd', 'a wounded knight', 'a pedlar stuck in the mud', 'a hermit with a sprained ankle']);
      log(sim, `It was ${who}. The party helped, and was thanked with ${gold} gold.`);
      if (sim.rng.chance(0.25)) {
        const it = sim.rng.pick(LOOT_ITEMS.filter((i) => i.tier === Math.max(1, Math.min(3, Math.round(tier * 0.7)))));
        sim.items.push(it.id);
        log(sim, `They also pressed ${/^[AEIOU]/.test(it.name) ? 'an' : 'a'} ${it.name} into the Captain's hands.`);
      }
    }
  } else if (f.kind === 'ruins') {
    log(sim, 'The ruined tower: old stones, older treasure, and something living in it.');
  }
}

function spawnLateGroup(sim: Sim, gx: number, gy: number, pool: { id: string; weight: number }[], size: number): number {
  const tierMult = tierScale(sim.region.tier);
  const g: EnemyGroup = { id: sim.groups.length, x: gx, y: gy, active: false, cleared: false, announced: true, family: ENEMY_BY_ID[pool[0].id].family };
  sim.groups.push(g);
  for (let i = 0; i < size; i++) {
    const e = ENEMY_BY_ID[sim.rng.weighted(pool.map((x) => ({ weight: x.weight, value: x.id })))];
    const ex = gx + sim.rng.range(-50, 50);
    const ey = gy + sim.rng.range(-40, 40);
    sim.units.push({
      id: sim.nextId++, side: 'enemy', key: e.id, name: e.name, sprite: e.id, role: e.role, slot: -1, row: 'front', fx: 0, fy: 0,
      x: ex, y: ey, homeX: ex, homeY: ey, hp: e.hp * tierMult, maxHp: e.hp * tierMult, atk: e.atk * 1.45 * tierMult, def: e.def,
      heal: 0, range: e.range, speed: e.speed, attackRate: e.attackRate, crit: 0.05, splash: 0, cd: e.attackRate,
      alive: true, targetId: null, group: g.id, facing: -1, kills: 0, gold: e.gold, xp: e.xp, hesitate: 0, fleeing: 0, family: e.family,
    });
  }
  return g.id;
}

function finish(sim: Sim) {
  sim.phase = 'done';
  goalFinish(sim);
  if (sim.life >= 3 && sim.outcome === 'returned') {
    const got = addPieces(sim, 'recruit', 1, sim.leader);
    log(sim, `Back in ${sim.region.name}'s market, a trader swapped them ${pieceName(got)} for a story.`);
  }
  if (sim.orders.focus === 'gather') sim.gold *= 0.7;
  sim.gold = Math.round(sim.gold * sim.goldMult * (sim.region.skull ? SKULL_GOLD : 1) * (1 + sim.guidance / 100));
  if (sim.outcome === 'retreated' && liveHeroes(sim).length === 0) sim.gold = Math.round(sim.gold * 0.5);
  sim.xp = Math.round(sim.xp * (sim.cap?.xp ?? 1) * (sim.xpBonus ?? 1));
  // Small chance of a sealed chest that opens like a pack.
  const chestChance = (sim.orders.focus === 'treasure' ? 0.18 : 0.08) + 0.02 * sim.region.tier;
  // (A won siege's vault already holds one.)
  if (sim.outcome === 'returned' && sim.siege?.stage !== 'won' && sim.rng.chance(chestChance)) {
    sim.chestCards = 1;
    log(sim, 'Among the loot: a sealed chest, still locked. It will open like a card pack.');
  }
  if (sim.siege?.stage === 'won') sim.chestCards = Math.max(1, sim.chestCards);
  legendaryChest(sim);
  if (sim.morale < 75) log(sim, 'Morale was low by the end. Too much arguing on the road.');
  log(sim, sim.outcome === 'returned'
    ? `The party returned to Greyford with ${sim.gold} gold.`
    : `Battered, the party limped back to Greyford with ${sim.gold} gold.`);
}

/** Advances the simulation by one tick, applying any player inputs scheduled for it. */
export function step(sim: Sim, inputs: PlayerInput[] = []): void {
  if (sim.phase === 'done') return;
  while (sim.inputIndex < inputs.length && inputs[sim.inputIndex].tick <= sim.tick) {
    if (inputs[sim.inputIndex].tick === sim.tick) applyInput(sim, inputs[sim.inputIndex]);
    sim.inputIndex++;
  }
  sim.mana = Math.min(MANA_MAX, sim.mana + MANA_REGEN * DT);
  if (sim.stormUntil && sim.stormUntil === sim.tick) log(sim, 'The storm blew over. The sun came out on soaked heroes.');
  // Spell effects: how fast everyone moves and swings this tick.
  for (const u of sim.units) {
    if (!u.alive) continue;
    const rooted = (u.rootUntil ?? 0) > sim.tick;
    const slowed = (u.slowUntil ?? 0) > sim.tick;
    const hasted = (u.hasteUntil ?? 0) > sim.tick;
    u.moveMul = rooted ? 0 : (slowed ? 0.5 : 1) * (hasted ? 1.35 : 1) * (sim.stormUntil > sim.tick ? 0.75 : 1);
    u.actMul = (slowed ? 0.7 : 1) * (hasted ? 1.35 : 1);
    // Raised dead crumble when their time is up.
    if (u.minion && (u.expiresAt ?? 0) <= sim.tick) {
      u.alive = false;
      u.hp = 0;
      sim.events.push({ t: 'death', id: u.id, x: u.x, y: u.y, hero: true });
    }
  }

  if (sim.siege) {
    for (const u of sim.units) u.px = u.x;
    siegeStep(sim);
  }
  const party = liveHeroes(sim);
  const allies = liveAllies(sim);
  if (party.length === 0) {
    sim.outcome = 'retreated';
    log(sim, 'Every hero is down. Locals carried the party home on a hay cart.');
    finish(sim);
    return;
  }

  // Wake up enemy groups the party walks near. Reckless heroes, and anyone with a grudge, charge from further away.
  if (sim.phase === 'out') {
    for (const g of sim.groups) {
      if (g.active || g.cleared || g.held) continue;
      // Moving unseen (Thornkin in a forest), only groups right by the trail notice the party.
      if (sim.stealth ? dist(sim.leader, g) < AGGRO * 0.4 : allies.some((h) => dist(h, g) < AGGRO)) {
        activateGroup(sim, g.id);
        continue;
      }
      // ...and the Thornkin hold reckless heroes back.
      const chargeRange = sim.stealth ? AGGRO * 0.4 : AGGRO + 140;
      const charger = party.find((h) => (h.personality === 'reckless' || (h.grudge && h.grudge === g.family)) && dist(h, g) < chargeRange);
      if (charger) activateGroup(sim, g.id, charger);
    }
  }
  if (!sim.siege && sim.encounters.length) encounterStep(sim);
  if (sim.ropeBridges.length) ropeStep(sim);
  if (sim.story) storyStep(sim);
  if (sim.goal) goalStep(sim);
  if (sim.camp) campStep(sim);
  if (sim.relic && !sim.relic.passed) relicStep(sim);
  if (sim.delve) delveStep(sim, party);
  stagStep(sim);
  const activeEnemies = sim.units.filter((u) => u.side === 'enemy' && u.alive && sim.groups[u.group].active);
  const wasInCombat = sim.inCombat;
  sim.inCombat = activeEnemies.length > 0 && sim.phase !== 'home';
  if (sim.inCombat && !wasInCombat) {
    for (const h of party) if (h.personality === 'cowardly') h.hesitate = 1.5;
  }

  // Retreat rule.
  const pct = partyHpPct(sim);
  if (pct < sim.lowestHpPct) sim.lowestHpPct = pct;
  if (sim.phase === 'out' && pct < sim.orders.retreatAtPct + (sim.cap?.retreat ?? 0)) {
    sim.phase = 'home';
    sim.outcome = 'retreated';
    log(sim, 'Too hurt to go on, the party turned back toward town.');
  }

  if (sim.inCombat) {
    for (const u of allies) unitAct(sim, u, activeEnemies, allies);
  } else {
    for (const h of party) {
      h.hesitate = 0;
      h.fleeing = 0;
    }
    // Between fights the raised dead fall back to dust, and hurt animals limp back.
    for (const u of sim.units) {
      if (u.minion && u.alive) {
        u.alive = false;
        u.hp = 0;
        sim.events.push({ t: 'death', id: u.id, x: u.x, y: u.y, hero: true });
      }
      if (u.pet && !u.alive && unitById(sim, u.ownerId ?? null)?.alive) {
        u.alive = true;
        u.hp = u.maxHp * 0.3;
        once(sim, `petback-${u.id}`, `${u.name} limped back, licking its wounds.`);
      }
    }
    const pets = sim.units.filter((u) => (u.pet || u.freed) && u.alive && !u.parked);
    const anchor = sim.siege?.anchor;
    if (anchor) {
      // At the fortress the party forms up at a spot instead of walking the trail.
      sim.leader = { ...anchor };
      for (const h of [...party, ...pets]) {
        const fp = formationPos(sim, h);
        seek(sim, h, fp.x, fp.y, dist(h, fp) > 50 ? 1.6 : 1);
        h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.004 * DT);
        h.targetId = null;
      }
      if (sim.siege!.stage !== 'won' && sim.phase === 'out' && sim.tick >= sim.maxTicks * 0.8) {
        sim.phase = 'home';
        sim.outcome = 'retreated';
        log(sim, 'Time ran out before the fortress fell. The party pulled back.');
      }
    } else {
    // Walk the path; regroup in formation around the leader.
    const speed = (sim.phase === 'home' ? WALK_SPEED * 1.7 : WALK_SPEED) * sim.roadMult;
    const total = sim.pathLen[sim.pathLen.length - 1];
    // The leader waits for stragglers, so the party never strings out along the trail.
    const regrouped = party.every((h) => h.investigating !== undefined || dist(h, formationPos(sim, h)) < (wasInCombat ? 70 : 110));
    const prev = sim.leaderDist;
    if (regrouped && sim.tick >= sim.pauseUntil) sim.leaderDist += (sim.phase === 'home' ? -1 : 1) * speed * hazardSpeed(sim, party) * (ropeHere(sim) ? ROPE_SPEED : 1) * DT;
    // Crossroads.
    for (const f of sim.forks) {
      if (sim.phase === 'out' && prev < f.at && sim.leaderDist >= f.at) {
        if (!f.decided) decideFork(sim, f);
        if (f.decided === 'skip') sim.leaderDist = f.spurEnd + (sim.leaderDist - f.at);
      }
      if (sim.phase === 'out' && f.decided === 'take' && !f.arrived && sim.leaderDist >= f.poiDist) arriveAtFork(sim, f);
      // On the way home, don't walk side paths again.
      if (sim.phase === 'home' && prev >= f.spurEnd && sim.leaderDist < f.spurEnd) sim.leaderDist = f.at - (f.spurEnd - sim.leaderDist);
    }
    // (A siege's trail ends at the fortress gate: the siege takes over there.)
    if (sim.phase === 'out' && ((!sim.siege && sim.leaderDist >= total) || sim.tick >= sim.maxTicks * (sim.siege ? 0.8 : sim.delve?.inside ? 0.85 : sim.goal?.kind === 'map' && !sim.goal.done ? 0.72 : 0.62) + (sim.camp?.until !== undefined ? CAMP_SEC * TPS : 0) + (sim.waited ?? 0))) {
      if (sim.siege && sim.siege.stage !== 'won') sim.outcome = 'retreated';
      sim.phase = 'home';
      log(sim, sim.leaderDist >= total ? 'The trail ran out. Time to head home.' : 'The light is fading. The party turned for home.');
    }
    sim.leaderDist = Math.max(0, Math.min(total, sim.leaderDist));
    // Nobody walks past a discovery before someone has had a look at it.
    if (sim.phase === 'out') {
      for (const fd of sim.finds) {
        if (fd.disc && fd.disc !== 'nightcamp' && fd.decided == null && fd.reachedAt === undefined && fd.at !== undefined && prev <= fd.at + 20 && sim.leaderDist > fd.at + 20) sim.leaderDist = fd.at + 20;
      }
    }
    if (sim.delve) delveWalk(sim, prev);
    sim.leader = pointAt(sim, sim.leaderDist).p;
    // Down (or up) the dungeon stairs: everyone goes with the leader.
    if (sim.delve?.jumped) {
      sim.delve.jumped = false;
      for (const h of [...party, ...pets]) {
        const fp = formationPos(sim, h);
        h.x = fp.x;
        h.y = fp.y;
      }
    }
    for (const h of [...party, ...pets]) {
      const fp = formationPos(sim, h);
      const behind = dist(h, fp);
      // Running over to look at a discovery: beside it, not in formation.
      const look = h.investigating !== undefined ? sim.finds[h.investigating] : undefined;
      if (look) moveToward(h, look.x - LOOK_OFFSET, look.y + 6, 1.9);
      else moveToward(h, fp.x, fp.y, behind > 50 ? 2 : 1.2 * (speed / WALK_SPEED));
      // Resting while walking (not in snowdrifts or on lava), and thorns or heat wearing at the party.
      const hd = hazardHere(sim);
      const used = hd?.tribe && HERO_BY_ID[h.defId ?? '']?.tribe === hd.tribe;
      if (!hd?.noRest || used) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.004 * DT);
      if (hd?.hurt && !used && h.side === 'hero' && !h.pet) h.hp = Math.max(1, h.hp - h.maxHp * hd.hurt * DT);
      h.targetId = null;
    }
    if (sim.phase === 'home' && sim.leaderDist <= 0) {
      finish(sim);
      return;
    }
    if (sim.event.kind && !sim.event.happened && sim.phase === 'out' && sim.leaderDist >= sim.event.at) roadEvent(sim);
    // Chests next to the path (a greedy hero spots them from further off).
    const reach = party.some((u) => u.personality === 'greedy') ? 240 : 170;
    for (const c of sim.chests) if (!c.taken && !c.hoard && dist(sim.leader, c) < reach) takeChest(sim, c, c.lead, c.itemBonus);
    // Discoveries nobody chose by the time the party walks past: the Captain decides.
    // Landmarks passed, and hazards reached.
    if (sim.phase === 'out') for (const lm of sim.landmarks) if (!lm.passed && sim.leaderDist >= lm.at) passLandmark(sim, lm);
    for (const hz of sim.hazards) if (!hz.entered && sim.leaderDist >= hz.from && sim.leaderDist <= hz.to) enterHazard(sim, hz);
    for (const fd of sim.finds) {
      if (!fd.disc || fd.decided != null) continue;
      // On the way out, someone runs over to look first (see lookAt); a trip cut short decides on the way home.
      if (sim.phase === 'out') lookAt(sim, fd, party);
      else if (sim.leaderDist <= (fd.at ?? 0) - 40) captainDiscovery(sim, fd);
    }
    }
  }

  // Enemies: fight if active, go home and heal if the party is out of reach.
  const byGroup = new Map<number, Unit[]>();
  for (const u of sim.units) {
    if (u.side !== 'enemy' || !u.alive) continue;
    const list = byGroup.get(u.group);
    if (list) list.push(u);
    else byGroup.set(u.group, [u]);
  }
  for (const e of sim.units) {
    if (e.side !== 'enemy' || !e.alive || e.structure || e.thief || e.flees) continue;
    const g = sim.groups[e.group];
    if (!g.active) continue;
    const near = allies.filter((h) => h.alive && dist(h, e) < LEASH);
    if (near.length && dist(e, { x: e.homeX, y: e.homeY }) < LEASH) {
      unitAct(sim, e, near, byGroup.get(e.group) ?? []);
    } else {
      if (!e.fixed) seek(sim, e, e.homeX, e.homeY);
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.05 * DT);
      if (!allies.some((h) => dist(h, g) < LEASH)) g.active = false;
    }
  }

  // Groups that are wiped out.
  for (const g of sim.groups) {
    if (g.active && !sim.units.some((u) => u.group === g.id && u.alive)) {
      g.active = false;
      g.cleared = true;
      const [m1, m2] = BIOME_MATERIALS[sim.region.biome];
      if (sim.fiveTribe === 'ashborn') for (const h of party) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.1);
      // Old Bogga's toad eats well after a fight.
      for (const t of sim.units) if (t.pet && t.alive && t.sprite === 'pet_toad') t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.3);
      gain(sim, m1, sim.rng.int(1, 2));
      if (sim.rng.chance(0.6)) gain(sim, m2, 1);
      const who = g.lastKiller ?? party.reduce((a, b) => (a.kills >= b.kills ? a : b)).name;
      if (sim.area.groups.includes(g.id) && !sim.area.cleared && sim.area.groups.every((id) => sim.groups[id].cleared)) {
        sim.area.cleared = true;
        const a = addPieces(sim, 'recruit', 2, { x: g.x, y: g.y });
        const b = addPieces(sim, 'veteran', 1, { x: g.x, y: g.y - 30 });
        log(sim, `Grateful locals pressed ${pieceName(a, 2)} and ${pieceName(b)} into the Captain's hands.`);
        sim.morale = Math.min(100, sim.morale + 10);
        log(sim, sim.area.kind === 'infested' ? `The goblin camp went up in flames. ${sim.region.name} can breathe again.`
          : sim.area.kind === 'corrupted' ? 'The Gloom Heart shattered with a sound like breaking ice. The gloom began to lift.'
            : 'The warband broke and fled back toward the fortress. The raids here are over.');
        if (party[0]) sim.events.push({ t: 'shout', id: party[0].id, text: 'Done!' });
      }
      if (!g.horde) log(sim, `${who} ${sim.rng.pick(['finished off the last of them.', 'landed the final blow.', 'stood over the last one.', 'ended the fight.'])}`);
    }
  }

  // Necromancers' raises from this tick.
  for (const r of sim.raises) {
    const n = unitById(sim, r.necroId);
    const corpse = unitById(sim, r.corpseId);
    if (n?.alive && corpse && sim.inCombat) raiseDead(sim, n, corpse);
  }
  sim.raises.length = 0;

  separate(sim);
  if (sim.siege) clampToWall(sim);
  sim.tick += 1;
  if (sim.tick >= sim.maxTicks) finish(sim);
}

function formationPos(sim: Sim, u: Unit): Pt {
  // Round the campfire.
  const seat = sim.camp ? campSeat(sim, u) : null;
  if (seat) return seat;
  // On a rope bridge: single file along the trail, front row first.
  if (!sim.siege && ropeHere(sim)) {
    const line = sim.units.filter((x) => x.side === 'hero' && x.alive && !x.parked).sort((a, b) => b.fx - a.fx || a.id - b.id);
    const rank = Math.max(0, line.indexOf(u));
    return pointAt(sim, Math.max(0, sim.leaderDist + (sim.phase === 'home' ? 1 : -1) * rank * 42)).p;
  }
  const dir = sim.siege?.anchor ? { x: 1, y: 0 } : pointAt(sim, sim.leaderDist).dir;
  const d = sim.phase === 'home' ? { x: -dir.x, y: -dir.y } : dir;
  const f = u.fx;
  const s = u.fy;
  return { x: sim.leader.x + d.x * f - d.y * s, y: sim.leader.y + d.y * f + d.x * s };
}

/** Runs ticks without drawing until `untilTick` or the end. Used for fast-forward and tests. */
export function runUntil(sim: Sim, inputs: PlayerInput[], untilTick = Infinity): Sim {
  while (sim.phase !== 'done' && sim.tick < untilTick) {
    step(sim, inputs);
    if (sim.events.length > 500) sim.events.length = 0;
  }
  sim.events.length = 0;
  return sim;
}

/** Chance of a Starshard in a chest, by ring. */
const SHARD_CHANCE = [0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0.3, 0.4];

/**
 * The Deep Marches: slay the lair's lord, or clear every group, and the party carries home a
 * Legendary chest with Starshards and maybe a piece of named gear.
 */
function legendaryChest(sim: Sim) {
  const region = sim.region;
  if (region.ring < DEEP_RING || sim.outcome !== 'returned') return;
  // A won siege out here counts as a lord slain (the Elder Wyrm of Dragonmaw).
  const lordSlain = (!!region.boss && sim.units.some((u) => u.key === region.boss && u.side === 'enemy' && !u.alive)) || sim.siege?.stage === 'won' || (sim.site?.kind === 'lair' && siteCleared(sim));
  const main = sim.groups.filter((g) => g.forkId === undefined || sim.forks[g.forkId].decided === 'take');
  const cleared = main.length > 0 && main.every((g) => g.cleared);
  if (!lordSlain && !cleared) return;
  const depth = region.ring - DEEP_RING;
  const shards = sim.rng.int(1, 2) + depth + (lordSlain ? 2 : 0);
  const itemChance = 0.3 + 0.1 * depth + (lordSlain ? 0.4 : 0);
  const item = sim.rng.chance(itemChance) ? sim.rng.pick(NAMED_ITEMS) : null;
  sim.shards += shards;
  if (item) sim.items.push(item);
  sim.legendary = { shards, item };
  const lead = lordSlain ? `In the lord's lair: a Legendary chest` : 'With the land cleared, the party found a Legendary chest';
  log(sim, `${lead}, holding ${shards} Starshard${shards > 1 ? 's' : ''}${item ? ` and ${ITEM_BY_ID[item].name}` : ''}!`);
}

/** Share of the haul lost for each hero knocked out: they have to be carried home, and the loot left behind. */
export const KNOCKOUT_LOSS = 0.33;

export function buildReport(sim: Sim): ExpeditionReport {
  const heroHpPct: Record<string, number> = {};
  for (const h of heroes(sim)) heroHpPct[h.key] = Math.round((h.alive ? h.hp / h.maxHp : 0) * 100);
  // Every hero knocked out costs a third of the haul: gold, materials, pack pieces and items.
  const knocked = heroes(sim).filter((h) => !h.alive && !h.pet && !h.minion && !h.freed).length;
  const lost = Math.min(1, knocked * KNOCKOUT_LOSS);
  const keep = (n: number) => Math.floor(n * (1 - lost) + 1e-9);
  const materials: typeof sim.materials = {};
  for (const [m, n] of Object.entries(sim.materials)) if (keep(n ?? 0) > 0) materials[m as Material] = keep(n ?? 0);
  const pieces: typeof sim.pieces = {};
  for (const [t, n] of Object.entries(sim.pieces)) if (keep(n ?? 0) > 0) pieces[t as PackType] = keep(n ?? 0);
  const items = lost ? sim.items.filter(() => sim.rng.chance(1 - lost)) : [...sim.items];
  return {
    regionId: sim.region.id,
    outcome: sim.outcome,
    gold: keep(sim.gold),
    knockouts: knocked ? { count: knocked, lostPct: Math.round(lost * 100) } : undefined,
    xp: sim.xp,
    enemiesDefeated: sim.enemiesDefeated,
    findsCollected: sim.findsCollected,
    note: sim.note || undefined,
    discoveries: sim.finds.filter((f) => f.disc && f.disc !== 'nightcamp' && f.decided != null).map((f) => f.disc!),
    story: sim.story ? { chapter: sim.story.chapter, done: storyDone(sim) } : undefined,
    goal: sim.goal ? { kind: sim.goal.kind, done: sim.goal.done } : undefined,
    cards: sim.hand.length ? [...sim.hand] : undefined,
    holdBonus: sim.holdBonus || undefined,
    chestCards: sim.chestCards,
    pieces,
    shards: sim.shards || undefined,
    legendary: sim.legendary ?? undefined,
    materials,
    items,
    kills: { ...sim.kills },
    // Groups the party was meant to meet: the main trail, plus side paths it took.
    groupsCleared: sim.groups.filter((g) => g.cleared).length,
    groupsTotal: sim.groups.filter((g) => g.forkId === undefined || sim.forks[g.forkId].decided === 'take').length,
    siege: sim.siege ? siegeReport(sim) : undefined,
    site: sim.site ? { id: 0, kind: sim.site.kind, name: sim.site.name, cleared: siteCleared(sim) } : undefined,
    area: sim.area.kind === 'calm' ? undefined : { kind: sim.area.kind, cleared: sim.area.cleared },
    fallen: heroes(sim).filter((h) => h.fallen && !h.alive).map((h) => h.key),
    conditions: { time: sim.time, season: sim.season, event: sim.event.happened ? sim.event.kind : null },
    feathersUsed: [...sim.feathers],
    guidancePct: sim.guidance,
    chronicle: trimChronicle(sim.chronicle),
    heroHpPct,
  };
}

function trimChronicle(lines: string[]): string[] {
  if (lines.length <= 18) return lines;
  return [...lines.slice(0, 8), '…', ...lines.slice(-9)];
}


// ---- Chests on their side paths ----

/** Gold per danger tier, by kind of chest. */
const CHEST_GOLD: Record<ChestKind, [number, number]> = { crate: [6, 11], chest: [14, 22], strongbox: [20, 30], ornate: [32, 48] };
const CHEST_NAME: Record<ChestKind, string> = { crate: 'A crate', chest: 'An iron-bound chest', strongbox: 'A locked strongbox', ornate: 'An ornate chest' };
/** How keen a Captain of each personality is on chests. */
const CHEST_EAGER: Record<Personality, number> = { greedy: 3, curious: 1.5, gloryhound: 1, reckless: 1, steady: 0.5, protective: -0.5, shy: -1, cowardly: -1.5 };
const CHEST_TAKE: Partial<Record<Personality, string>> = {
  greedy: 'made straight for it, eyes shining', curious: 'had to know what was inside', reckless: 'drew steel and went for it',
  gloryhound: 'went for it: a fight and a prize', cowardly: 'went for it, very carefully', shy: 'quietly led the party to it',
};

/** Whether the party detours for a chest: the Captain's personality, the orders, the guards and the party's state. */
function decideHoard(sim: Sim, f: Fork) {
  const c = sim.chests[f.chestId!];
  const party = liveHeroes(sim);
  const captain = unitById(sim, sim.captainId);
  const leader = captain && captain.alive ? captain : party[0];
  const kind = c.kind ?? 'chest';
  const guarded = kind !== 'crate';
  const pers = leader?.personality ?? 'steady';
  let score = CHEST_EAGER[pers];
  if (!guarded) score += 2;
  if (kind === 'ornate') score += 2;
  if (kind === 'strongbox' && !party.some((u) => u.heroClass === 'rogue')) score -= 0.5;
  const o = sim.orders;
  if (o.focus === 'treasure') score += 2;
  if (o.focus === 'hunt' && guarded) score += 1;
  if (o.stance === 'bold' && guarded) score += 1;
  if (o.stance === 'cautious' && guarded) score -= 1.5;
  if (guarded && partyHpPct(sim) < 60) score -= 2.5;
  score += party.filter((u) => u !== leader && u.personality === 'greedy').length * 0.4;
  if (c.taken) score = -9;
  if (Math.abs(score) < 0.01) score = sim.rng.chance(0.5) ? 1 : -1;
  f.decided = score > 0 ? 'take' : 'skip';
  // The Guildmaster's waypoint overrides the Captain.
  const wp = sim.waypoints[`fork:${f.id}`];
  if (wp && !c.taken) {
    f.decided = wp;
    log(sim, `${CHEST_NAME[kind]} off the trail${guarded && f.family ? `, guarded by ${f.family.toLowerCase()}` : ''}. The Guildmaster had marked it: ${wp === 'take' ? 'go for it' : 'leave it'}.`);
    return;
  }
  const name = leader?.name ?? 'The party';
  const what = `${CHEST_NAME[kind]} off the trail${guarded && f.family ? `, guarded by ${f.family.toLowerCase()}` : ''}`;
  if (f.decided === 'take') {
    log(sim, `${what}. ${name}${leader?.id === sim.captainId ? ' (Captain)' : ''} ${CHEST_TAKE[pers] ?? 'led the party to it'}.`);
    if (leader) sim.events.push({ t: 'shout', id: leader.id, text: pers === 'greedy' ? 'Gold!' : guarded ? 'For the chest!' : 'Grab it!' });
    const worried = party.find((u) => u !== leader && guarded && (u.personality === 'cowardly' || u.personality === 'protective'));
    if (worried) sim.events.push({ t: 'shout', id: worried.id, text: worried.personality === 'cowardly' ? 'Do we have to?' : 'Careful, it\'s guarded!' });
  } else {
    log(sim, `${what}. ${name}${leader?.id === sim.captainId ? ' (Captain)' : ''} ${guarded ? 'left it to its guards' : 'didn\'t think it worth the walk'}.`);
    if (leader) sim.events.push({ t: 'shout', id: leader.id, text: 'Leave it.' });
    const greedy = party.find((u) => u !== leader && u.personality === 'greedy');
    if (greedy && !c.taken) {
      sim.morale = Math.max(0, sim.morale - 4);
      sim.events.push({ t: 'shout', id: greedy.id, text: 'But the gold…' });
      log(sim, `${greedy.name} kept looking back at the chest.`);
    }
  }
}

/** At the chest: opening it, and how the party behaves around it. */
function arriveHoard(sim: Sim, f: Fork) {
  const c = sim.chests[f.chestId!];
  if (!c || c.taken) {
    log(sim, 'Someone had already emptied the chest.');
    return;
  }
  const party = liveHeroes(sim);
  if (c.mimic) return wakeMimic(sim, c, party);
  if (c.story) return openStory(sim, c);
  const kind = c.kind ?? 'chest';
  const rogue = party.find((u) => u.heroClass === 'rogue');
  const greedy = party.find((u) => u.personality === 'greedy');
  const curious = party.find((u) => u.personality === 'curious');
  const protective = party.find((u) => u.personality === 'protective');
  let lead: string = CHEST_NAME[kind];
  if (c.trap) lead = chestTrap(sim, c, party, lead);
  if (kind === 'strongbox') {
    if (rogue) {
      lead = `${rogue.name} picked the strongbox's lock`;
      sim.events.push({ t: 'shout', id: rogue.id, text: 'Click.' });
    } else if (protective) {
      lead = `${protective.name} spotted the needle trap on the strongbox, and they forced it open`;
      sim.events.push({ t: 'shout', id: protective.id, text: 'Wait, it\'s trapped!' });
      c.gold = Math.round(c.gold * 0.9);
    } else {
      const victim = sim.rng.pick(party);
      if (victim) {
        const dmg = Math.round(victim.maxHp * 0.12);
        victim.hp = Math.max(1, victim.hp - dmg);
        sim.events.push({ t: 'hit', x: victim.x, y: victim.y - 30, amount: dmg, crit: false, onHero: true });
        sim.events.push({ t: 'shout', id: victim.id, text: 'Ow! A trap!' });
        lead = `The strongbox was trapped: a poisoned needle for ${victim.name}. They smashed it open`;
      }
      c.gold = Math.round(c.gold * 0.85);
    }
  }
  if (greedy) {
    c.gold = Math.round(c.gold * 1.15);
    sim.events.push({ t: 'shout', id: greedy.id, text: 'Mine!' });
    log(sim, `${greedy.name} went through it twice and found a false bottom.`);
  }
  if (curious && kind !== 'ornate') log(sim, `${curious.name} turned over every board, just in case.`);
  takeChest(sim, c, lead, curious ? 0.15 : 0);
}

// ---- Discoveries ----

/** A story crate: a dead adventurer's pack (with a note marking a site), a goblin stash (a heap of one material), an overturned wagon (likely an item). */
function openStory(sim: Sim, c: Chest) {
  const area = sim.region.name;
  if (c.story === 'pack') {
    takeChest(sim, c, 'A dead adventurer\'s pack');
    if (!sim.note) {
      sim.note = true;
      log(sim, `Folded in the pack: a map of ${area}, with a spot marked further in. The scouts will want to see it.`);
    }
  } else if (c.story === 'stash') {
    const m = sim.rng.pick(BIOME_MATERIALS[sim.region.biome]);
    gain(sim, m, 4);
    takeChest(sim, c, `A goblin stash, with a heap of ${m}`);
  } else {
    takeChest(sim, c, 'An overturned wagon', 0.35);
  }
}

/** How often each kind of chest is trapped (strongboxes have their own needle). */
const TRAP_CHANCE: Record<ChestKind, number> = { crate: 0, chest: 0.25, strongbox: 0, ornate: 0.4 };
const TRAP_NAME: Record<ChestTrap, string> = { needle: 'a poisoned needle', gas: 'a puff of choking gas', alarm: 'an alarm bell' };

/**
 * A trapped chest. Cautious orders: the party always checks first and disarms it (it takes a moment).
 * Balanced: a Rogue, a protective or a curious hero may spot it. Bold: they tear it open, trap and all,
 * and grab a fifth more gold. Returns the chronicle's lead for the loot line.
 */
function chestTrap(sim: Sim, c: Chest, party: Unit[], lead: string): string {
  const trap = c.trap!;
  const stance = sim.orders.stance;
  const spotter = party.find((u) => u.heroClass === 'rogue') ?? party.find((u) => u.personality === 'protective' || u.personality === 'curious');
  if (stance === 'cautious' || (stance === 'balanced' && spotter && sim.rng.chance(0.6))) {
    const who = stance === 'cautious' ? (spotter ?? party[0]) : spotter!;
    sim.pauseUntil = Math.max(sim.pauseUntil, sim.tick + 3 * TPS);
    if (who) sim.events.push({ t: 'shout', id: who.id, text: 'Hold on…' });
    log(sim, `${who?.name ?? 'Someone'} checked the lid before anyone touched it, and disarmed ${TRAP_NAME[trap]}.`);
    return lead;
  }
  const bold = stance === 'bold';
  if (bold) c.gold = Math.round(c.gold * 1.2);
  const opener = party.find((u) => u.personality === 'greedy') ?? sim.rng.pick(party);
  if (trap === 'needle' && opener) {
    const dmg = Math.round(opener.maxHp * 0.15);
    opener.hp = Math.max(1, opener.hp - dmg);
    sim.events.push({ t: 'hit', x: opener.x, y: opener.y - 30, amount: dmg, crit: false, onHero: true });
    sim.events.push({ t: 'shout', id: opener.id, text: 'Ow!' });
  } else if (trap === 'gas') {
    for (const u of party) {
      const dmg = Math.round(u.maxHp * 0.07);
      u.hp = Math.max(1, u.hp - dmg);
      sim.events.push({ t: 'hit', x: u.x, y: u.y - 30, amount: dmg, crit: false, onHero: true });
    }
    if (opener) sim.events.push({ t: 'shout', id: opener.id, text: '*cough*' });
  } else if (trap === 'alarm') {
    ambush(sim, { x: c.x + 60, y: c.y - 40 }, sim.region.enemyPool, 2);
    if (opener) sim.events.push({ t: 'shout', id: opener.id, text: 'Uh oh.' });
  }
  const what = trap === 'needle' ? `${TRAP_NAME[trap]} for ${opener?.name ?? 'someone'}` : trap === 'gas' ? `${TRAP_NAME[trap]} for everyone` : `${TRAP_NAME[trap]}, and two of the neighbours came running`;
  log(sim, `${bold ? 'They tore the chest open, trap and all' : 'The chest was trapped'}: ${what}.`);
  return bold ? `${lead}, ripped open` : lead;
}

/** About one iron-bound chest or strongbox in twelve is a mimic. */
export const MIMIC_CHANCE = 0.08;

/** The chest grows teeth. A Ranger or Rogue may poke it first; otherwise it bites (a greedy hero, if there is one). */
function wakeMimic(sim: Sim, c: Chest, party: Unit[]) {
  c.taken = true;
  c.mimicLive = true;
  const g = spawnLateGroup(sim, c.x, c.y, [{ id: 'mimic', weight: 1 }], 1);
  const m = sim.units.find((u) => u.group === g)!;
  // It springs out past the chest, away from the trail, so it isn't lost among the party.
  const f = sim.forks.find((x) => x.chestId === c.id);
  const dx = f ? c.x - f.x : 0;
  const dy = f ? c.y - f.y : 1;
  const len = Math.hypot(dx, dy) || 1;
  m.x = m.homeX = c.x + (dx / len) * 80;
  m.y = m.homeY = c.y + (dy / len) * 80;
  m.mimicChest = c.id;
  sim.groups[g].family = m.family!;
  const wary = party.find((u) => u.heroClass === 'ranger' || u.heroClass === 'rogue');
  if (wary && sim.rng.chance(0.5)) {
    m.cd = m.attackRate + 2;
    log(sim, `${wary.name} poked the chest with a stick first, and it bit the stick in half. A mimic!`);
    sim.events.push({ t: 'shout', id: wary.id, text: 'Knew it!' });
  } else {
    const victim = party.find((u) => u.personality === 'greedy') ?? sim.rng.pick(party);
    if (victim) {
      const dmg = Math.round(victim.maxHp * 0.25);
      victim.hp = Math.max(1, victim.hp - dmg);
      sim.events.push({ t: 'hit', x: victim.x, y: victim.y - 30, amount: dmg, crit: false, onHero: true });
      sim.events.push({ t: 'shout', id: victim.id, text: 'It BIT me!' });
      log(sim, `${victim.name} reached for the lid, and the chest grew teeth. A mimic!`);
    }
    m.cd = 0;
  }
  activateGroup(sim, g);
}

/** A mimic killed: what it had swallowed is still inside. */
function mimicLoot(sim: Sim, m: Unit) {
  const c = sim.chests[m.mimicChest!];
  if (!c) return;
  c.mimicLive = false;
  c.taken = false;
  c.mimic = false;
  takeChest(sim, c, 'Inside the dead mimic', 0.3);
}

function healParty(sim: Sim, frac: number) {
  for (const h of liveHeroes(sim)) {
    const amt = Math.min(h.maxHp - h.hp, h.maxHp * frac);
    h.hp += amt;
    if (amt > 1) sim.events.push({ t: 'heal', x: h.x, y: h.y - 30, amount: Math.round(amt) });
  }
}

function hurtParty(sim: Sim, frac: number) {
  for (const h of liveHeroes(sim)) {
    const dmg = Math.round(h.maxHp * frac);
    h.hp = Math.max(1, h.hp - dmg);
    sim.events.push({ t: 'hit', x: h.x, y: h.y - 30, amount: dmg, crit: false, onHero: true });
  }
}

export function giveGold(sim: Sim, n: number, at: Pt) {
  const g = Math.round(n * boon(sim, 'fortune'));
  sim.gold += g;
  sim.events.push({ t: 'loot', x: at.x, y: at.y - 30, gold: g });
  return g;
}

/** A pack piece for certain (from the chest table, without the empty result). */
function somePiece(sim: Sim, at: Pt): PackType {
  const roll = earlyPieces(chestPieceRoll(sim.region.tier), sim.region.tier).filter(([t]) => t !== 'none') as [PackType, number][];
  const t = sim.rng.weighted(roll.filter(([, w]) => w > 0).map(([value, weight]) => ({ value, weight })));
  return addPieces(sim, t, 1, at);
}

function someItem(sim: Sim, bump = 0): string {
  const tier = Math.max(1, Math.min(3, Math.round(sim.region.tier * 0.7) + bump));
  const it = sim.rng.pick(LOOT_ITEMS.filter((i) => i.tier === tier));
  sim.items.push(it.id);
  return it.name;
}

/** The nearest monster group still waiting ahead on the trail. */
function nextGroup(sim: Sim): EnemyGroup | undefined {
  return sim.groups
    .filter((g) => !g.active && !g.cleared && g.forkId === undefined && !g.horde && g.enc === undefined && g.x > sim.leader.x - 40)
    .sort((a, b) => dist(sim.leader, a) - dist(sim.leader, b))[0];
}

function ambush(sim: Sim, at: Pt, pool: { id: string; weight: number }[], size: number) {
  const g = spawnLateGroup(sim, at.x + 60, at.y + 30, pool, size);
  activateGroup(sim, g);
  return g;
}

const has = (sim: Sim, classes: HeroClass[]) => liveHeroes(sim).some((u) => classes.includes(u.heroClass as HeroClass));

/** The Captain walks past an undecided discovery and decides in their own way. */
function captainDiscovery(sim: Sim, f: Find) {
  const d = DISCOVERY_BY_ID[f.disc!];
  const captain = unitById(sim, sim.captainId);
  const leader = captain && captain.alive ? captain : liveHeroes(sim)[0];
  const leans = LEANS[leader?.personality ?? 'steady'];
  let pick = -1;
  for (const lean of leans) {
    pick = d.options.findIndex((o) => o.lean.includes(lean));
    if (pick >= 0) break;
  }
  if (leader) {
    log(sim, pick >= 0
      ? `${d.name} by the trail. ${leader.name} (Captain) decided: ${d.options[pick].label.toLowerCase()}.`
      : `${d.name} by the trail. ${leader.name} (Captain) walked on by.`);
    sim.events.push({ t: 'shout', id: leader.id, text: pick >= 0 ? d.options[pick].label + '!' : 'Keep moving.' });
  }
  applyDiscovery(sim, f, pick, 'captain');
}

/** What each choice at a discovery does. */
/** How long the party waits at a discovery for the Guildmaster's word (seconds), and where the one looking stands. */
export const DECIDE_SEC = 6;
const LOOK_OFFSET = 26;

/**
 * A discovery coming up: one hero (a curious one, else a Rogue or Ranger, else the Captain) runs over to it,
 * and the party doesn't walk past until they're there. Once they are, the Guildmaster's card opens and the
 * party waits a few seconds; then the Captain decides. (The night camp: the card opens when they sit down.)
 */
function lookAt(sim: Sim, fd: Find, party: Unit[]) {
  if (fd.disc === 'nightcamp') {
    const c = sim.camp;
    if (c?.until !== undefined && fd.reachedAt === undefined) {
      fd.reachedAt = sim.tick;
      fd.decideBy = c.until;
    }
    if (fd.decideBy !== undefined && sim.tick >= fd.decideBy) captainDiscovery(sim, fd);
    return;
  }
  const at = fd.at ?? 0;
  let r = fd.runner !== undefined ? unitById(sim, fd.runner) : undefined;
  if (r && !r.alive) {
    r.investigating = undefined;
    r = undefined;
    fd.runner = undefined;
  }
  if (!r && fd.reachedAt === undefined && sim.leaderDist >= at - 200 && !sim.inCombat) {
    const cap = unitById(sim, sim.captainId);
    r = party.find((u) => u.personality === 'curious') ?? party.find((u) => u.heroClass === 'rogue' || u.heroClass === 'ranger') ?? (cap?.alive ? cap : party[0]);
    if (r) {
      fd.runner = r.id;
      r.investigating = fd.id;
      sim.events.push({ t: 'shout', id: r.id, text: sim.rng.pick(['What\'s this?', 'Over here!', 'Hold on…', 'Look!']) });
    }
  }
  if (fd.reachedAt === undefined) {
    if (r && Math.hypot(r.x - (fd.x - LOOK_OFFSET), r.y - (fd.y + 6)) < 22) {
      fd.reachedAt = sim.tick;
      fd.decideBy = sim.tick + DECIDE_SEC * TPS;
      sim.pauseUntil = Math.max(sim.pauseUntil, fd.decideBy);
    }
    return;
  }
  if (sim.tick >= (fd.decideBy ?? 0)) captainDiscovery(sim, fd);
}

function applyDiscovery(sim: Sim, f: Find, choice: number, by: 'guildmaster' | 'captain') {
  const d = DISCOVERY_BY_ID[f.disc!];
  // Whoever went to look comes back, and the party moves on.
  if (f.runner !== undefined) {
    const r = unitById(sim, f.runner);
    if (r) r.investigating = undefined;
  }
  if (f.decideBy !== undefined && sim.pauseUntil === f.decideBy && f.disc !== 'nightcamp') sim.pauseUntil = sim.tick;
  // The time spent waiting here doesn't count against the trail: the party turns back that much later.
  if (f.reachedAt !== undefined && f.disc !== 'nightcamp') sim.waited = (sim.waited ?? 0) + Math.max(0, sim.tick - f.reachedAt);
  f.decided = choice;
  f.taken = true;
  f.by = by;
  const t = sim.region.tier;
  const at = { x: f.x, y: f.y };
  const say = (text: string, outcome: string) => {
    log(sim, by === 'guildmaster' ? `The Guildmaster's word at the ${d.name.toLowerCase()}: ${text}` : text);
    f.outcome = outcome;
  };
  const hero = liveHeroes(sim)[0];
  const shout = (text: string, u = hero) => { if (u) sim.events.push({ t: 'shout', id: u.id, text }); };
  if (choice < 0 || !d.options[choice]) {
    f.outcome = 'Left alone';
    if (by === 'guildmaster') log(sim, `The Guildmaster left the ${d.name.toLowerCase()} alone.`);
    return;
  }
  const bandits = [{ id: 'bandit', weight: 3 }, { id: 'bandit_xbow', weight: 1 }];
  switch (`${d.id}:${choice}`) {
    case 'nightcamp:0': {
      const tended = has(sim, ['cleric', 'bard']);
      healParty(sim, tended ? 0.65 : 0.5);
      sim.mana = MANA_MAX;
      say(`They slept well${tended ? ', the fire kept high all night' : ''}, and woke ready for anything.`, 'A good night\'s sleep');
      break;
    }
    case 'nightcamp:1': {
      const ranger = liveHeroes(sim).find((u) => u.heroClass === 'ranger' || u.heroClass === 'beastmaster');
      const g = ambush(sim, { x: f.x + 140, y: f.y - 60 }, sim.region.enemyPool, ranger ? 2 : 3);
      if (ranger) for (const u of sim.units) if (u.group === g && u.alive) u.cd += 2;
      giveGold(sim, Math.round(sim.rng.range(8, 14) * t), at);
      say(ranger ? `${ranger.name} heard them coming. Whatever prowled the camp met the watch head-on.` : 'Something came out of the dark at the camp. The watch was ready for it.', 'A fight in the night');
      break;
    }
    case 'nightcamp:2': {
      const bard = has(sim, ['bard']);
      sim.morale = Math.min(100, sim.morale + 15);
      sim.xpBonus = bard ? 1.25 : 1.15;
      say(bard ? 'The Bard told the old tales, and everyone joined in the chorus. They\'ll remember this trip.' : 'They swapped stories until the fire burned low.', 'Stories by the fire');
      break;
    }
    case 'beehive:0': healParty(sim, 0.25); gain(sim, 'herbs', 2); say('Smoked out the honey: sticky, sweet and healing.', 'Honey for everyone'); break;
    case 'beehive:1': {
      const g = nextGroup(sim);
      if (g) for (const u of sim.units) if (u.group === g.id && u.alive) u.hp *= 0.75;
      say(g ? 'The hive sailed into the monsters ahead. The bees did the rest.' : 'The hive sailed into an empty clearing. The bees were furious anyway.', g ? 'The bees found the monsters' : 'Angry bees, nobody to sting');
      shout('Ha!');
      break;
    }
    case 'fairyring:0': {
      const b = sim.rng.pick<Boon>(['fortune', 'harvest', 'insight']);
      sim.boons[b] = { until: sim.tick + BOON_SEC * TPS, mult: b === 'harvest' ? 2 : 1.5 };
      say(`Inside the ring the air hummed. ${BOON_TEXT[b]}`, `Fae blessing: ${b === 'fortune' ? 'more gold' : b === 'harvest' ? 'double finds' : 'more XP'}`);
      break;
    }
    case 'fairyring:1': {
      const cost = Math.min(Math.floor(sim.gold), 5 * t);
      sim.gold -= cost;
      sim.mana = MANA_MAX;
      sim.morale = Math.min(100, sim.morale + 8);
      say(`A coin left for the fae (${cost} gold). The Guildmaster's power came flooding back.`, 'The fae are pleased');
      break;
    }
    case 'orevein:0': {
      const quick = has(sim, ['warrior', 'dragonslayer']);
      sim.pauseUntil = sim.tick + (quick ? 3 : 7) * TPS;
      gain(sim, 'iron', 2 + t);
      gain(sim, 'stone', 1 + t);
      say(quick ? 'Strong arms made short work of the vein: iron and stone.' : 'The party dug for a while: iron and stone for the guild.', 'Iron and stone');
      break;
    }
    case 'orevein:1': sim.holdBonus += 1; say('The vein went on the guild\'s map. The guild\'s hold here grows.', '+1 hold'); break;
    case 'campfire:0': healParty(sim, 0.33); say('The party rested by the warm embers.', 'A good rest'); break;
    case 'campfire:1': {
      const gold = giveGold(sim, 10 * t, at);
      const item = sim.rng.chance(0.3) ? someItem(sim) : null;
      const caught = !has(sim, ['rogue']) && sim.rng.chance(0.3);
      say(`The bedrolls held ${gold} gold${item ? ` and ${/^[AEIOU]/.test(item) ? 'an' : 'a'} ${item}` : ''}.${caught ? ' Then their owners came back.' : ''}`, caught ? 'Loot, and angry owners' : 'Loot from the bedrolls');
      if (caught) { ambush(sim, at, bandits, 2 + Math.floor(t / 2)); shout('Company!'); }
      break;
    }
    case 'gravegoods:0': {
      const gold = giveGold(sim, 18 * t, at);
      const p = somePiece(sim, at);
      ambush(sim, at, [{ id: 'skeleton', weight: 3 }, { id: 'ghoul', weight: 1 }], 2 + Math.floor(t / 2));
      say(`The grave goods: ${gold} gold and ${pieceName(p)}. The dead rose to take them back.`, 'Treasure, and the dead rose');
      shout('They\'re getting up!');
      break;
    }
    case 'gravegoods:1': {
      sim.morale = Math.min(100, sim.morale + 8);
      sim.xp += 12 * t;
      const holy = has(sim, ['cleric', 'paladin', 'necromancer']);
      if (holy) healParty(sim, 0.2);
      say(`The party paid its respects${holy ? ', and a quiet blessing eased their wounds' : ''}.`, 'Respects paid');
      break;
    }
    case 'wisp:0': {
      hurtParty(sim, 0.1);
      const gold = giveGold(sim, 14 * t, at);
      const p = somePiece(sim, at);
      say(`The wisp led through stinging bog water to a drowned purse: ${gold} gold and ${pieceName(p)}.`, 'Treasure in the bog');
      break;
    }
    case 'wisp:1': sim.mana = Math.min(MANA_MAX, sim.mana + 50); say('The wisp went into a jar, glowing with power.', 'A jar of light (+50 mana)'); break;
    case 'bottle:0': {
      const ahead = pointAt(sim, Math.min(sim.pathLen[sim.pathLen.length - 1] - 60, (f.at ?? sim.leaderDist) + 300));
      sim.chests.push({ id: sim.chests.length, x: ahead.p.x - ahead.dir.y * 70, y: ahead.p.y + ahead.dir.x * 70, gold: Math.round(20 * t), taken: false, kind: 'crate' });
      say('A treasure map! The cross was just up the trail.', 'A treasure map');
      shout('X marks the spot!');
      break;
    }
    case 'bottle:1': { const g = giveGold(sim, 6 * t, at); say(`The bottle will fetch ${g} gold from a collector.`, 'A bottle to sell'); break; }
    case 'frozen:0': {
      const mage = has(sim, ['mage']);
      if (!mage) sim.pauseUntil = sim.tick + 8 * TPS;
      const item = someItem(sim, 1);
      say(`${mage ? 'A little magefire' : 'A long while by a fire'} freed the pack: ${/^[AEIOU]/.test(item) ? 'an' : 'a'} ${item}.`, 'A frozen pack, thawed');
      break;
    }
    case 'frozen:1': { const g = giveGold(sim, 14 * t, at); say(`The traveller's purse: ${g} gold.`, 'A frozen purse'); break; }
    case 'stones:0': {
      sim.xp += 10 * t;
      const scholar = has(sim, ['mage', 'cleric', 'bard']);
      if (scholar) sim.boons.insight = { until: sim.tick + BOON_SEC * TPS, mult: 1.5 };
      say(scholar ? `The runes told of old battles. ${BOON_TEXT.insight}` : 'Nobody could read the runes, but the party learned a little trying.', scholar ? 'Runes read: more XP' : 'Runes, half read');
      break;
    }
    case 'stones:1': for (const h of liveHeroes(sim)) h.atk *= 1.08; say('A shiver ran up every arm. The party hits harder now.', '+8% damage'); shout('I feel it!'); break;
    case 'tracks:0': {
      const g = ambush(sim, { x: f.x + 80, y: f.y }, [{ id: 'dire_wolf', weight: 2 }, { id: 'boar', weight: 1 }], 2 + Math.floor(t / 2));
      for (const u of sim.units) if (u.group === g) u.gold *= 2;
      gain(sim, 'hides', 3);
      const hunter = has(sim, ['ranger', 'beastmaster']);
      if (hunter) for (const u of sim.units) if (u.group === g && u.alive) u.hp *= 0.8;
      say(hunter ? 'The hunters read the tracks and struck first.' : 'The tracks led to the beasts. They were waiting.', 'The hunt is on');
      shout('Tally-ho!');
      break;
    }
    case 'tracks:1': {
      const g = nextGroup(sim);
      const u = g && sim.units.filter((x) => x.group === g.id && x.alive).sort((a, b) => a.maxHp - b.maxHp)[0];
      const left = g ? sim.units.filter((x) => x.group === g.id && x.alive).length : 0;
      if (u && left > 1) { u.alive = false; u.hp = 0; }
      say('The party steered clear of whatever made the tracks: one less monster ahead.', 'One less monster ahead');
      break;
    }
    case 'cart:0': { const g = giveGold(sim, 8 * t, at); sim.morale = Math.min(100, sim.morale + 6); sim.xp += 5 * t; say(`The farmer thanked the party with ${g} gold.`, 'A grateful farmer'); shout('Glad to help!'); break; }
    case 'cart:1': gain(sim, 'wood', 4); gain(sim, 'hides', 2); say('The cart came apart into planks and hides.', 'Wood and hides'); break;
    case 'mushrooms:0': {
      if (sim.rng.chance(0.5)) { healParty(sim, 0.35); say('The mushrooms were wonderful.', 'Delicious, and healing'); }
      else { hurtParty(sim, 0.08); sim.boons.insight = { until: sim.tick + BOON_SEC * TPS, mult: 1.5 }; say(`Strange visions, and stomach aches. ${BOON_TEXT.insight}`, 'Visions (and stomach aches)'); shout('Urgh…'); }
      break;
    }
    case 'mushrooms:1': gain(sim, 'herbs', 4); say('A basket of mushrooms for the herbalist.', 'Herbs'); break;
    case 'spring:0': healParty(sim, 0.2); sim.mana = Math.min(MANA_MAX, sim.mana + 30); say('Cold water, a short rest.', 'Refreshed'); break;
    case 'spring:1': {
      const cost = Math.min(Math.floor(sim.gold), 4 * t);
      sim.gold -= cost;
      sim.boons.fortune = { until: sim.tick + BOON_SEC * TPS, mult: 1.5 };
      say(`A coin in the spring (${cost} gold). ${BOON_TEXT.fortune}`, 'Fortune smiles');
      break;
    }
    case 'stash:0': {
      const g = giveGold(sim, 26 * t, at);
      const caught = sim.rng.chance(has(sim, ['rogue']) ? 0.1 : 0.4);
      say(`The stash: ${g} gold.${caught ? ' The bandits came back for it.' : ''}`, caught ? 'Gold, and angry bandits' : 'A bandit\'s gold');
      if (caught) { ambush(sim, at, bandits, 3 + Math.floor(t / 2)); shout('Bandits!'); }
      break;
    }
    case 'stash:1': sim.holdBonus += 1; say('The town watch will want to know about this. The guild\'s hold here grows.', '+1 hold'); break;
    case 'embervent:0': for (const h of liveHeroes(sim)) h.atk *= 1.1; say('Blades tempered in the vent glow a dull red. The party hits harder now.', '+10% damage'); break;
    case 'embervent:1': gain(sim, 'stone', 3); gain(sim, 'iron', 2); say('Obsidian and iron from the vent.', 'Stone and iron'); break;
    case 'crabpot:0': healParty(sim, 0.25); sim.morale = Math.min(100, sim.morale + 5); say('Crab on the fire. Everyone ate well.', 'A crab supper'); break;
    case 'crabpot:1': { const g = giveGold(sim, 8 * t, at); say(`The catch will sell for ${g} gold.`, 'A catch to sell'); break; }
    case 'nest:0': {
      const g = giveGold(sim, 15 * t, at);
      const p = somePiece(sim, at);
      const sure = has(sim, ['ranger', 'rogue']);
      if (!sure && hero) {
        const v = sim.rng.pick(liveHeroes(sim));
        const dmg = Math.round(v.maxHp * 0.2);
        v.hp = Math.max(1, v.hp - dmg);
        sim.events.push({ t: 'hit', x: v.x, y: v.y - 30, amount: dmg, crit: false, onHero: true });
        shout('Whoa!', v);
      }
      say(`The nest held ${g} gold and ${pieceName(p)}.${sure ? '' : ' Someone fell on the way down.'}`, 'A magpie\'s hoard');
      break;
    }
  }
}


// ---- Landmarks and hazards ----

/** The hazard the party is walking through right now, if any. */
function hazardHere(sim: Sim) {
  const hz = sim.hazards.find((x) => sim.leaderDist >= x.from && sim.leaderDist <= x.to);
  return hz ? HAZARDS[hz.kind] : undefined;
}

/** How fast the party gets through: a hero of the right tribe guides the rest. */
function hazardSpeed(sim: Sim, party: Unit[]): number {
  const hd = hazardHere(sim);
  if (!hd) return 1;
  if (hd.speed < 1 && hd.tribe && party.some((u) => u.alive && HERO_BY_ID[u.defId ?? '']?.tribe === hd.tribe)) return Math.max(hd.speed, 0.95);
  return hd.speed;
}

function enterHazard(sim: Sim, hz: SimHazard) {
  hz.entered = true;
  const hd = HAZARDS[hz.kind];
  log(sim, hd.enter);
  const party = liveHeroes(sim);
  const guide = hd.tribe ? party.find((u) => HERO_BY_ID[u.defId ?? '']?.tribe === hd.tribe) : undefined;
  if (guide) {
    log(sim, `${guide.name} ${hd.speed < 1 ? 'knew the way through and led the others' : 'didn\'t mind it at all'}.`);
    sim.events.push({ t: 'shout', id: guide.id, text: 'Follow my steps!' });
  }
  if (hd.knock) {
    const exposed = party.filter((u) => HERO_BY_ID[u.defId ?? '']?.tribe !== hd.tribe);
    const v = exposed.length ? sim.rng.pick(exposed) : null;
    if (v) {
      const dmg = Math.round(v.maxHp * hd.knock);
      v.hp = Math.max(1, v.hp - dmg);
      sim.events.push({ t: 'hit', x: v.x, y: v.y - 30, amount: dmg, crit: false, onHero: true });
      sim.events.push({ t: 'shout', id: v.id, text: 'Ow, rocks!' });
    }
  }
}

function landmarkEffect(sim: Sim, e: LandmarkEffect, at: Pt) {
  const t = sim.region.tier;
  switch (e.kind) {
    case 'heal': healParty(sim, e.amount); break;
    case 'morale': sim.morale = Math.min(100, sim.morale + e.amount); break;
    case 'gold': giveGold(sim, e.amount * t, at); break;
    case 'mats': gain(sim, e.mat, e.amount); break;
    case 'xp': sim.xp += e.amount * t; break;
    case 'mana': sim.mana = Math.min(MANA_MAX, sim.mana + e.amount); break;
    case 'atk': for (const h of liveHeroes(sim)) h.atk *= 1 + e.amount; break;
    case 'warn': {
      const g = nextGroup(sim);
      if (g) for (const u of sim.units) if (u.group === g.id && u.alive) u.hp *= 1 - e.amount;
      break;
    }
  }
}

/** Walking past a landmark: what the party gets out of it (more, for the right tribe). */
function passLandmark(sim: Sim, lm: SimLandmark) {
  lm.passed = true;
  const d = LANDMARK_BY_ID[lm.key];
  if (!d) return;
  const party = liveHeroes(sim);
  const kin = d.tribe ? party.find((u) => HERO_BY_ID[u.defId ?? '']?.tribe === d.tribe!.tribe) : undefined;
  const at = { x: lm.x, y: lm.y };
  if (kin && d.tribe) {
    log(sim, `${d.name}. ${d.tribe.pass}`);
    landmarkEffect(sim, d.tribe.effect, at);
    lm.outcome = d.tribe.outcome;
    sim.events.push({ t: 'shout', id: kin.id, text: 'I know this place.' });
    return;
  }
  log(sim, `${d.name}. ${d.pass}`);
  landmarkEffect(sim, d.effect, at);
  lm.outcome = d.outcome;
  const who = party[sim.rng.int(0, Math.max(0, party.length - 1))];
  if (d.shout && who) sim.events.push({ t: 'shout', id: who.id, text: d.shout });
}
