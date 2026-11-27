import { BUILDINGS } from './data/buildings';
import { HERO_BY_ID, STARTER_HEROES } from './data/heroes';
import { WORLD_EVENT_MS } from './areas';
import { STARTER_SPELLS } from './data/spells';
import { REGION_BY_ID, START_EXPLORED } from './data/world';
import { holdNeed } from './hold';
import { emptyMaterials } from './town';
import { BUILDING_BY_ID } from './data/buildings';
import type { GameState, HeroInstance, Party, Row } from './types';

const SAVE_KEY = 'guildbound-save-v1';
export const DEFAULT_ROWS: Row[] = ['front', 'front', 'back', 'back', 'back'];
/** Parties the game supports now (a third one is planned for later). */
export const MAX_PARTIES = 2;
/** The save format revision (see migrate). */
export const SAVE_REV = 2;
/** Guild Hall level that unlocks each party (index = party). */
export const PARTY_UNLOCK = [0, 3];
export const PARTY_NAMES = ['Party I', 'Party II', 'Party III'];

export function emptyParty(): Party {
  return { slots: [null, null, null, null, null], rows: [...DEFAULT_ROWS], captain: null };
}

/** How many parties the Guild Hall lets the guild run. */
export function partiesUnlocked(state: GameState): number {
  const gh = state.buildings.guildhall ?? BUILDING_BY_ID.guildhall.start;
  return PARTY_UNLOCK.filter((lvl) => gh >= lvl).length;
}

// Outings: everything the guild has out on the road at once. A party on a trip takes one (two
// parties marching to a siege take two), and so does every scout. The Guild Hall sets how many
// the guild can run: one at first, two from level 3.

/** How many outings the guild can run at once. */
export function outingSlots(state: GameState): number {
  return partiesUnlocked(state);
}

/** How many outings are on the road now. */
export function outingsOut(state: GameState): number {
  return state.expeditions.reduce((n, e) => n + e.parties.length, 0) + state.scouting.length;
}

/** Why the guild can't start `more` outings now (every slot is taken), or null if it can. */
export function outingBlock(state: GameState, more = 1): string | null {
  const slots = outingSlots(state);
  if (outingsOut(state) + more <= slots) return null;
  const who = [
    ...state.expeditions.map((e) => `${e.parties.map((p) => PARTY_NAMES[p]).join(' and ')} ${e.parties.length > 1 ? 'are' : 'is'} at ${REGION_BY_ID[e.regionId]?.name ?? 'the front'}`),
    ...state.scouting.map((m) => {
      const h = state.roster.find((x) => x.uid === m.uid);
      return `${h ? HERO_BY_ID[h.defId].name : 'A scout'} is ${m.open ? 'scouting' : 'searching'} ${REGION_BY_ID[m.regionId]?.name ?? 'the wilds'}`;
    }),
  ];
  const room = slots === 1 ? 'one outing at a time' : `${slots} outings at a time`;
  const grow = slots < PARTY_UNLOCK.length ? ` (the Guild Hall at level ${PARTY_UNLOCK[slots]} adds another)` : '';
  return `The guild can only run ${room}, a party or a scout${grow}. ${who.length ? `${listOf(who)}.` : 'Every slot is taken.'}`;
}

function listOf(xs: string[]): string {
  return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function newGame(now = Date.now()): GameState {
  const state: GameState = {
    version: 1,
    gold: 200,
    essence: 0,
    materials: emptyMaterials(),
    roster: [],
    parties: Array.from({ length: MAX_PARTIES }, emptyParty),
    items: [],
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, b.start])),
    explored: [...START_EXPLORED],
    construction: null,
    tavernNextPackAt: 0,
    pity: { sinceRare: 0, sinceEpic: 0 },
    packsOpened: 0,
    // A new guild starts with no packs: the first is the Tavern's welcome gift.
    packs: { novice: 0, recruit: 0, grimoire: 0, veteran: 0, champion: 0 },
    pieces: { novice: 0, recruit: 0, grimoire: 0, veteran: 0, champion: 0 },
    tutorial: { step: 0, done: false, flags: {} },
    memorial: [],
    shards: 0,
    rev: SAVE_REV,
    scouting: [],
    sites: [],
    scoutLog: [],
    secrets: { found: [], progress: {} },
    quests: { active: [], nextAt: 0, done: 0, seed: ((now * 7) % 2147483647) >>> 0 || 7, nextId: 1 },
    expeditions: [],
    reports: [],
    nextUid: 1,
    lastSeen: now,
    tripsCompleted: 0,
    spells: Object.fromEntries(STARTER_SPELLS.map((id) => [id, { level: 1, copies: 0 }])),
    spellbook: [...STARTER_SPELLS],
    records: { kills: {}, cleanTrips: 0, clearedRegions: [], siegesWon: 0 },
    achievements: [],
    razedUntil: {},
    areas: {},
    calmUntil: {},
    world: { nextEventAt: now + WORLD_EVENT_MS, seed: (now % 2147483647) >>> 0 || 1 },
    hold: {},
  };
  // Starter party: Brannoc and Ssiv in front, Lyra, Elowen and Mirela behind.
  STARTER_HEROES.forEach((defId, i) => {
    const h = addHero(state, defId);
    state.parties[0].slots[i] = h.uid;
  });
  state.parties[0].captain = state.parties[0].slots[0];
  return state;
}

/** Fills in fields added after a save was written, so old saves keep working. */
export function migrate(s: GameState): GameState {
  const fresh = newGame(s.lastSeen);
  const out = { ...fresh, ...s } as GameState;
  out.materials = { ...fresh.materials, ...(s.materials ?? {}) };
  out.buildings = { ...fresh.buildings, ...(s.buildings ?? {}) };
  // Saves from before several parties: the one party becomes Party I.
  const old = s as unknown as { party?: (string | null)[]; rows?: Row[]; captain?: string | null; expedition?: GameState['expeditions'][number] | null; pendingReport?: GameState['reports'][number] | null };
  if (!s.parties) {
    out.parties = Array.from({ length: MAX_PARTIES }, emptyParty);
    if (old.party) out.parties[0] = { slots: old.party, rows: old.rows?.length === 5 ? old.rows : [...DEFAULT_ROWS], captain: old.captain ?? old.party.find(Boolean) ?? null };
  }
  while (out.parties.length < MAX_PARTIES) out.parties.push(emptyParty());
  if (!s.expeditions) out.expeditions = old.expedition ? [{ ...old.expedition, id: old.expedition.id ?? 0, parties: [0] }] : [];
  if (!s.reports) out.reports = old.pendingReport ? [{ ...old.pendingReport, parties: [0] }] : [];
  for (const k of ['party', 'rows', 'captain', 'expedition', 'pendingReport']) delete (out as unknown as Record<string, unknown>)[k];
  out.items = s.items ?? [];
  // Older saves: everything they could already visit counts as explored.
  out.explored = s.explored ?? ['greenhollow', 'oldmill', 'brackenwood', 'reedwater', 'warrens', 'barrow'];
  for (const h of out.roster) h.gear ??= {};
  out.spells = s.spells ?? fresh.spells;
  out.spellbook = s.spellbook ?? [...fresh.spellbook];
  out.records = { ...fresh.records, ...(s.records ?? {}) };
  out.achievements = s.achievements ?? [];
  out.razedUntil = s.razedUntil ?? {};
  out.areas = s.areas ?? {};
  // Saves from when gold bought packs: free packs become Recruit Packs.
  const legacy = s as unknown as { freePacks?: number };
  // Novice Packs came later: an older guild has none (it is past the novice stage anyway).
  out.packs = { ...fresh.packs, ...(s.packs ?? { recruit: legacy.freePacks ?? 0 }) };
  out.pieces = { ...fresh.pieces, ...(s.pieces ?? {}) };
  if (s.packs?.novice === undefined) out.packs.novice = 0;
  if (s.pieces?.novice === undefined) out.pieces.novice = 0;
  out.quests = s.quests ?? fresh.quests;
  // Saves from before the guild's hold: everything already on the map counts as secured.
  if (!s.hold) out.hold = Object.fromEntries((out.explored ?? []).filter((id) => REGION_BY_ID[id]).map((id) => [id, holdNeed(REGION_BY_ID[id])]));
  out.memorial = s.memorial ?? [];
  out.shards = s.shards ?? 0;
  out.scouting = s.scouting ?? [];
  out.sites = s.sites ?? [];
  out.scoutLog = s.scoutLog ?? [];
  out.secrets = s.secrets ?? { found: [], progress: {} };
  // Rev 2: spells moved behind the Mage Tower (level 1 now gives the 2 slots everyone used to have).
  // Older guilds keep the slots they had: their Mage Tower goes up one level.
  if ((s.rev ?? 0) < 2) out.buildings.magetower = Math.min(4, (out.buildings.magetower ?? 0) + 1);
  out.rev = SAVE_REV;
  // Players from before the tutorial existed don't need it.
  out.tutorial = s.tutorial ?? { step: 0, done: true, skipped: true, flags: { giftGiven: true, gearGiven: true } };
  delete (out as unknown as Record<string, unknown>).freePacks;
  out.calmUntil = s.calmUntil ?? {};
  out.world = s.world ?? { nextEventAt: s.lastSeen + WORLD_EVENT_MS, seed: (s.lastSeen % 2147483647) >>> 0 || 1 };
  for (const ex of out.expeditions) ex.rows ??= [...DEFAULT_ROWS];
  for (const r of out.reports) {
    r.parties ??= [0];
    r.materials ??= {};
    r.items ??= [];
    r.kills ??= {};
    r.groupsCleared ??= 0;
    r.groupsTotal ??= 0;
    r.pieces ??= {};
  }
  return out;
}

export function addHero(state: GameState, defId: string): HeroInstance {
  const h: HeroInstance = { uid: `h${state.nextUid++}`, defId, level: 1, xp: 0, stars: 1, copies: 0, gear: {} };
  state.roster.push(h);
  return h;
}

export function heroByUid(state: GameState, uid: string | null | undefined): HeroInstance | undefined {
  return uid ? state.roster.find((h) => h.uid === uid) : undefined;
}

export function partyHeroes(state: GameState, party = 0): HeroInstance[] {
  return state.parties[party].slots.map((u) => heroByUid(state, u)).filter((h): h is HeroInstance => !!h);
}

/** The party a hero belongs to, or -1. */
export function partyOf(state: GameState, uid: string): number {
  return state.parties.findIndex((p) => p.slots.includes(uid));
}

export function save(state: GameState, storage: Storage = localStorage): void {
  state.lastSeen = Date.now();
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function load(storage: Storage = localStorage): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as GameState;
    return s.version === 1 ? migrate(s) : null;
  } catch {
    return null;
  }
}

export function wipeSave(storage: Storage = localStorage): void {
  storage.removeItem(SAVE_KEY);
}
