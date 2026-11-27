// Shared game types. The core (everything under src/core) has no DOM or graphics code,
// so it can run in tests, in fast-forward and on screen alike.

import type { PackType } from './data/packs';
import type { Quest } from './quests';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export type Tribe =
  | 'freeholders'
  | 'thornkin'
  | 'ironroot'
  | 'ashborn'
  | 'fenfolk'
  | 'moonveil'
  | 'dawnwings'
  | 'hollowed';

export type BaseClass = 'warrior' | 'ranger' | 'rogue' | 'mage' | 'cleric' | 'bard';
/** Prestige classes: not in packs until an achievement unlocks them. */
export type PrestigeClass = 'paladin' | 'beastmaster' | 'necromancer' | 'dragonslayer';
export type HeroClass = BaseClass | PrestigeClass;
export const PRESTIGE_CLASSES: PrestigeClass[] = ['beastmaster', 'paladin', 'necromancer', 'dragonslayer'];

export interface Stats {
  might: number;
  finesse: number;
  arcana: number;
  vigor: number;
  resolve: number;
}

export interface HeroDef {
  /** A secret hero: never in packs until found. */
  secret?: boolean;
  id: string;
  name: string;
  title: string;
  tribe: Tribe;
  heroClass: HeroClass;
  rarity: Rarity;
  base: Stats;
  trait: string;
  signature: string;
  quote: string;
  personality: Personality;
  /** Enemy family this hero hates: charges them first and hits them harder. */
  grudge?: string;
  /** Hero id this hero is fond of: fights harder if they fall. */
  fond?: string;
  /** Beastmasters: the animal that fights beside them. */
  pet?: string;
}

export type Personality = 'reckless' | 'cowardly' | 'shy' | 'protective' | 'gloryhound' | 'greedy' | 'curious' | 'steady';

export interface HeroInstance {
  uid: string;
  defId: string;
  level: number;
  xp: number;
  stars: number;
  /** Spare duplicate copies waiting to be spent on the next star. */
  copies: number;
  /** Equipped item uids by slot. */
  gear: Partial<Record<GearSlot, string>>;
  /** Knocked out on a trip: can't go out again until this time (ms). */
  woundedUntil?: number;
  /** Times awakened with Starshards past the star cap (0-3). */
  awakened?: number;
}

export type Row = 'front' | 'back';
export type Material = 'wood' | 'stone' | 'iron' | 'herbs' | 'hides';
export const MATERIALS: Material[] = ['wood', 'stone', 'iron', 'herbs', 'hides'];
export type GearSlot = 'main' | 'off' | 'armor' | 'jewelry';
export type Cost = Partial<Record<Material | 'gold', number>>;

export interface ItemDef {
  id: string;
  name: string;
  slot: GearSlot;
  /** Weapon kind, off-hand kind, armor weight or jewelry kind. */
  kind: string;
  hands?: 1 | 2;
  tier: number;
  atk: number;
  def: number;
  hp: number;
  stats: Partial<Stats>;
  speed?: number;
  cost: Cost;
  shop: 'weaponsmith' | 'armorer' | 'market';
  /** Named gear from the deep rings' Legendary chests: never sold in town. */
  named?: boolean;
  /** A tribe's own gear, crafted at its Embassy. */
  tribe?: Tribe;
  /** A line of lore for named gear. */
  lore?: string;
}

/** One card of an opened pack, as saved: ids instead of whole definitions. */
export interface SavedCard {
  kind: 'hero' | 'spell';
  id: string;
  rarity: Rarity;
  result: string;
  heroUid?: string;
  xp?: number;
  levels?: number;
  level?: number;
}

export interface PendingReveal {
  type: PackType;
  /** A Tribe Pack (shown in the Recruit Pack's style, under the tribe's name). */
  tribe?: Tribe;
  cards: SavedCard[];
  /** Cards already turned over, by position. */
  flipped: number[];
}

export interface ItemInstance {
  uid: string;
  defId: string;
}

export type EnemyRole = 'brute' | 'skirmisher' | 'archer' | 'caster' | 'healer' | 'swarm' | 'beast';

export interface EnemyDef {
  id: string;
  name: string;
  family: string;
  role: EnemyRole;
  sprite: string;
  hp: number;
  atk: number;
  def: number;
  range: number;
  speed: number;
  /** Seconds between attacks. */
  attackRate: number;
  gold: number;
  xp: number;
  /** Colour swaps applied to the base sprite, for regional variants. */
  tint?: Record<string, string>;
  /** Damage to others near the target (bombs). */
  splash?: number;
  /** Doesn't move or fight: a gate or a wall. */
  structure?: boolean;
  /** A named leader with a rage when hurt. */
  boss?: boolean;
}

/** Tribe map abilities that open tiles other parties can't reach. */
export type Ability = 'swim' | 'fly' | 'tunnel' | 'lava' | 'veil' | 'cursed' | 'stealth';

export type Biome = 'plains' | 'forest' | 'marsh' | 'hills' | 'barrow' | 'farm' | 'coast' | 'sea' | 'mountain' | 'snow' | 'badlands' | 'haunted' | 'sky' | 'ruins';

export interface RegionDef {
  id: string;
  name: string;
  ring: number;
  tier: number;
  biome: Biome;
  /** Hex position on the world map (axial coordinates; the town is 0,0). */
  q: number;
  r: number;
  /** World-map tile art key. */
  art: string;
  requires?: Ability;
  /** A large battle (siege) instead of a normal trip, and which kind. */
  siege?: SiegeKind;
  /** A skull region: heroes knocked out here can die for good. */
  skull?: boolean;
  /** An enemy waiting in a lair at the end of the trail. */
  boss?: string;
  /** Real seconds for the adventure itself. */
  durationSec: number;
  /** Real seconds on the road each way before and after it (far rings). */
  travelSec: number;
  enemyPool: { id: string; weight: number }[];
  groupSize: [number, number];
  groups: number;
  goldPerGroup: [number, number];
  description: string;
}

export type Focus = 'treasure' | 'hunt' | 'explore' | 'gather';
export type Stance = 'cautious' | 'balanced' | 'bold';

export interface Orders {
  focus: Focus;
  stance: Stance;
  retreatAtPct: number;
  /** An optional goal for the trip, for a bonus (see sim/encounters). */
  goal?: GoalKind;
}
export type GoalKind = 'hunt' | 'rescue' | 'map' | 'clear';

export interface SpellDef {
  id: string;
  name: string;
  rarity: Rarity;
  mana: number;
  cooldownSec: number;
  radius: number;
  /** Who it touches, for the targeting circle's colour. */
  target: 'heroes' | 'enemies' | 'ground';
  description: string;
  /** What each level adds, in a few words. */
  perLevel: string;
}

/** A spell card the guild owns. Duplicates raise its level. */
export interface OwnedSpell {
  level: number;
  copies: number;
}

/** A spell as it was packed for one trip, so replays stay exact. */
export interface LoadoutSpell {
  id: string;
  level: number;
}

/** Something the player did during a trip, recorded so the trip can be replayed exactly. */
export type PlayerInput =
  | { tick: number; kind: 'cast'; spell: string; x: number; y: number }
  | { tick: number; kind: 'find'; findId: number; choice?: number }
  | { tick: number; kind: 'recall' }
  /** Light a marker of a find set (standing stones and the like). */
  | { tick: number; kind: 'marker'; id: number }
  /** Pull the lever by a dungeon's locked door. */
  | { tick: number; kind: 'lever' }
  /** A waypoint on the road ahead: take or skip a side path, a chest, a brawl or a toll (null: the Captain decides). */
  | { tick: number; kind: 'route'; key: string; choice: 'take' | 'skip' | null };

/** A party of five: who stands where, and who leads. */
export interface Party {
  /** Hero uids in five slots. */
  slots: (string | null)[];
  rows: Row[];
  captain: string | null;
}

export interface ActiveExpedition {
  id: number;
  /** Which parties went (one, or two together for a siege). */
  parties: number[];
  regionId: string;
  seed: number;
  startedAt: number;
  party: string[];
  rows: Row[];
  captain?: string | null;
  orders: Orders;
  inputs: PlayerInput[];
  /** Spells taken on this trip (older saves: the two starter spells). */
  spells?: LoadoutSpell[];
  /** The trip is a siege (false for a razed fortress: just stragglers). */
  siege?: boolean;
  /** The area's state when the party left. */
  area?: AreaKind;
  /** The field journal's page for this kind of land was complete when the party left (+10% gold). */
  journal?: boolean;
  /** The area story's chapter this trip plays. */
  story?: number;
  /** The part of the area's deck the guild had opened up when the party left (core/deck). */
  deck?: string[];
  /** The settlement by the trail when the party left (core/life), and how far the area's trouble has grown. */
  life?: number;
  areaLevel?: number;
  /** The tutorial's first trip: heroes can't be knocked out. */
  safe?: boolean;
  /** The time of day and season when the party left. */
  time?: 'day' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  /** Seconds on the road each way, with the Stables' share taken off when the party left. */
  travelSec?: number;
  /** A site the party went for (found by a scout). */
  site?: { id: number; kind: SiteKind; name: string };
}

/** What scouts can find inside a known area. */
export type SiteKind = 'camp' | 'lair' | 'dungeon' | 'cache' | 'shrine';
export interface Site { id: number; kind: SiteKind; regionId: string; name: string; foundAt: number }
/** A scout on the way: `open` maps new land; otherwise they search known land for sites. */
export interface ScoutMission { id: number; uid: string; regionId: string; startedAt: number; endsAt: number; seed: number; open: boolean }
export interface ScoutNews { at: number; regionId: string; ok: boolean; text: string }

export interface ExpeditionReport {
  /** The expedition it reports on, and which parties went. */
  id?: number;
  parties?: number[];
  regionId: string;
  outcome: 'returned' | 'retreated';
  gold: number;
  xp: number;
  enemiesDefeated: number;
  findsCollected: number;
  /** Hold the party added on the trip itself (a vein or a stash marked for the guild). */
  holdBonus?: number;
  /** The cards this trip was dealt from the area's deck. */
  cards?: string[];
  /** The trip's goal, and whether the party managed it. */
  goal?: { kind: GoalKind; done: boolean };
  /** The area story's chapter played on this trip, and whether it was finished. */
  story?: { chapter: number; done: boolean };
  /** Discoveries met on the trip (for the field journal). */
  discoveries?: string[];
  /** A dead adventurer's note marked a site in this area. */
  note?: boolean;
  /** Heroes knocked out, and the share of the haul lost carrying them home. */
  knockouts?: { count: number; lostPct: number };
  /** Sealed chests: each one is a whole Recruit Pack. */
  chestCards: number;
  /** Pack pieces found, by pack type. */
  pieces: Partial<Record<PackType, number>>;
  /** Starshards found (deep rings only): they awaken heroes. */
  shards?: number;
  /** Who led the trip (hero uid). */
  captain?: string;
  /** The site the party went for, and whether they dealt with it. */
  site?: { id: number; kind: SiteKind; name: string; cleared: boolean };
  /** A Legendary chest came home (deep rings): what was in it is already in shards and items. */
  legendary?: { shards: number; item: string | null };
  guidancePct: number;
  chronicle: string[];
  heroHpPct: Record<string, number>;
  materials: Partial<Record<Material, number>>;
  /** Item def ids found on the trip. */
  items: string[];
  /** Enemies defeated, by enemy id. */
  kills: Record<string, number>;
  groupsCleared: number;
  groupsTotal: number;
  /** How a siege went, if this trip was one. */
  siege?: SiegeReport;
  /** The area's trouble when the party left, and whether they cleared it. */
  area?: { kind: AreaKind; cleared: boolean };
  /** Skull regions: heroes who fell for good, and heroes whose Phoenix Feather burned (uids). */
  fallen?: string[];
  feathersUsed?: string[];
  /** When the party went, and what happened on the road. */
  conditions?: { time: 'day' | 'night'; season: 'spring' | 'summer' | 'autumn' | 'winter'; event: 'merchant' | 'rivals' | 'storm' | null };
}

/** A plaque in the Hall of the Fallen. */
export interface Plaque {
  name: string;
  title: string;
  defId: string;
  rarity: Rarity;
  stars: number;
  level: number;
  regionId: string;
  at: number;
}

/** The large battles built so far. */
export type SiegeKind = 'goblin_fortress' | 'bandit_hold' | 'barrow_uprising' | 'cinder_legion' | 'dragonmaw';

export interface SiegeReport {
  kind?: SiegeKind;
  /** Barrow Uprising: tomb seals broken. Bandit King's Hold: prisoners freed. */
  sealed?: number;
  freed?: number;
  /** Cinder Legion: fires put out. */
  doused?: number;
  /** Siege of Dragonmaw: ballista bolts that hit the Elder Wyrm. */
  bolts?: number;
  won: boolean;
  /** The furthest stage reached. */
  stage: 'approach' | 'breach' | 'horde' | 'keep' | 'won';
  campsCleared: number;
  waves: number;
  hordeDefeated: number;
}

/** How an area is doing: calm, or one of three kinds of trouble. */
export type AreaKind = 'calm' | 'infested' | 'corrupted' | 'besieged';

/** Running totals that achievements are measured against. */
export interface GuildRecords {
  kills: Record<string, number>;
  /** Trips where nobody was knocked out. */
  cleanTrips: number;
  /** Regions where a party once defeated every monster group. */
  clearedRegions: string[];
  siegesWon: number;
  /** Heroes awakened with Starshards. */
  awakenings?: number;
}

export interface GameState {
  version: 1;
  gold: number;
  essence: number;
  materials: Record<Material, number>;
  roster: HeroInstance[];
  /** The guild's parties. The Guild Hall unlocks more than one. */
  parties: Party[];
  items: ItemInstance[];
  /** Building id -> level (0 = not built). */
  buildings: Record<string, number>;
  /** Region ids the guild has explored. */
  explored: string[];
  construction: { id: string; level: number; endsAt: number } | null;
  /** Gear being forged at the Weaponsmith and the Armorer: one piece at a time in each. */
  forge?: Partial<Record<'weaponsmith' | 'armorer', { defId: string; startedAt: number; endsAt: number }>>;
  tavernNextPackAt: number;
  /** The guild's hold on each explored area (see core/hold): secured areas let scouts go further. */
  hold?: Record<string, number>;
  /** Parts of the game that have opened up (see core/unlocks), so each is announced once. */
  seen?: string[];
  /** Area stories: chapters finished, by region (see data/stories). */
  stories?: Record<string, number>;
  /** The field journal: discoveries seen, as "biome:discovery" (see core/journal). */
  journal?: string[];
  /** Packs opened, by type. */
  opened?: Partial<Record<PackType, number>>;
  /** A pack that was opened but not every card turned over yet: the Packs screen picks it up again. */
  pendingReveal?: PendingReveal | null;
  pity: { sinceRare: number; sinceEpic: number };
  packsOpened: number;
  /** Whole packs ready to open, by type. */
  packs: Record<PackType, number>;
  /** Pack pieces saved up, by type. Enough of them make a pack. */
  pieces: Record<PackType, number>;
  /** Heroes who died in skull regions. */
  memorial: Plaque[];
  /** Starshards from the deep rings, spent on awakening heroes. */
  shards: number;
  /** Save format revision, for one-off fixes when loading older saves. */
  rev?: number;
  /** Scouts out mapping new land or searching known land. */
  scouting: ScoutMission[];
  /** Places scouts have found inside known areas: camps, lairs, dungeons, caches and shrines. */
  sites: Site[];
  /** What the scouts reported lately (newest last). */
  scoutLog: ScoutNews[];
  /** Secret heroes found, and progress toward the ones that need doing more than once. */
  secrets: { found: string[]; progress: Record<string, number> };
  /** Tutorial progress (older saves start with it done). */
  tutorial: { step: number; done: boolean; skipped?: boolean; flags: Record<string, boolean> };
  /** The Guild Hall's quest board. */
  quests: { active: Quest[]; nextAt: number; done: number; seed: number; nextId: number };
  /** Trips under way (one per party, or a joint one). */
  expeditions: ActiveExpedition[];
  /** Reports waiting to be read, oldest first. */
  reports: ExpeditionReport[];
  nextUid: number;
  lastSeen: number;
  tripsCompleted: number;
  spells: Record<string, OwnedSpell>;
  /** Spell ids in the order of their hotkeys. */
  spellbook: string[];
  records: GuildRecords;
  /** Achievement ids already earned. */
  achievements: string[];
  /** Fortresses the guild has razed: region id -> when it is rebuilt (ms). */
  razedUntil: Record<string, number>;
  /** Troubled areas (calm ones aren't listed) and when the trouble started. */
  /** Trouble in an area: what, since when, how far it has grown (1-3), and whether it has burned a settlement. */
  areas: Record<string, { kind: AreaKind; since: number; level?: number; scarred?: boolean }>;
  /** The spell the Mage Tower's first scholar brought (for the announcement). */
  firstSpell?: string;
  /** The Map's animations already shown: areas whose fog burned away, and badges stamped on. */
  mapSeen?: string[];
  mapStamps?: string[];
  /** Tribe Embassies (core/embassy): open embassies, reputation, Tribe Packs waiting, Legend trials done. */
  embassies?: Tribe[];
  rep?: Partial<Record<Tribe, number>>;
  tribePacks?: Partial<Record<Tribe, number>>;
  legend?: Partial<Record<Tribe, number>>;
  /** Expedition deck cards the guild has been dealt, by region (core/deck). */
  cardsSeen?: Record<string, string[]>;
  /** Living areas (core/life): trips home by region, and settlements burned back by trouble. */
  tripsHome?: Record<string, number>;
  lifeScars?: Record<string, number>;
  /** Areas shielded from new trouble until this time (ms). */
  calmUntil: Record<string, number>;
  /** The world clock: when the next world event happens, and its dice. */
  world: { nextEventAt: number; seed: number };
}
