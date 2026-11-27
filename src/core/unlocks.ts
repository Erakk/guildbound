// Opening the game up a little at a time. A new Guildmaster sees five heroes, a Guild Hall, a Town Hall,
// one empty plot and the map; everything else (more plots, the spellbook, contracts, orders, tribes, the
// clock, materials) appears when it starts to matter, with a note saying what just opened.
// Built buildings and anything a save already uses always stay visible.

import { totalPacksReady } from './packs';
import { TUTORIAL } from './tutorial';
import type { GameState, Tribe } from './types';
import { HERO_BY_ID } from './data/heroes';
import { BUILDING_BY_ID } from './data/buildings';

export type Feature =
  | 'packs' | 'spells' | 'deeds' | 'clock' | 'materials' | 'contracts' | 'troubles' | 'secrets'
  | 'focus' | 'stance' | 'scouting' | 'parties' | 'tribes' | 'gear' | 'retreat' | 'goals' | 'waypoints';

const stepAt = (s: GameState, id: string) => s.tutorial.done || s.tutorial.step >= TUTORIAL.findIndex((t) => t.id === id);

function tribesMatter(s: GameState): boolean {
  const n = new Map<Tribe, number>();
  for (const h of s.roster) {
    const t = HERO_BY_ID[h.defId].tribe;
    n.set(t, (n.get(t) ?? 0) + 1);
  }
  return [...n.values()].some((c) => c >= 3) || s.roster.length >= 9;
}

/** Is this part of the game open yet? */
export function unlocked(s: GameState, f: Feature): boolean {
  const trips = s.tripsCompleted;
  const done = s.tutorial.done;
  switch (f) {
    case 'packs': return s.packsOpened > 0 || totalPacksReady(s) > 0;
    case 'spells': return (s.buildings.magetower ?? 0) > 0;
    case 'deeds': return s.achievements.length > 0 || trips >= 3;
    case 'clock': return trips >= 4;
    case 'materials': return trips >= 1 || Object.values(s.materials).some((n) => n > 0);
    case 'contracts': return done;
    case 'troubles': return done && trips >= 4;
    case 'secrets': return trips >= 6 || (s.secrets?.found.length ?? 0) > 0;
    // Trip orders open with the town: each comes with the building that teaches it.
    case 'focus': return (s.buildings.guildhall ?? 1) >= 2;
    case 'stance': return (s.buildings.weaponsmith ?? 0) >= 1;
    case 'retreat': return (s.buildings.temple ?? 0) >= 1;
    case 'goals': return (s.buildings.townhall ?? 1) >= 3;
    case 'waypoints': return (s.buildings.stables ?? 0) >= 1;
    case 'scouting': return stepAt(s, 'scout') || s.scouting.length > 0 || s.explored.length > 1;
    case 'parties': return (s.buildings.guildhall ?? 1) >= 2;
    case 'tribes': return tribesMatter(s);
    case 'gear': return s.items.length > 0;
  }
}

/** Is this building's plot marked out in town yet? Built (or building) ones always are. */
export function plotOpen(s: GameState, id: string): boolean {
  if ((s.buildings[id] ?? 0) > 0 || s.construction?.id === id) return true;
  const trips = s.tripsCompleted;
  const th = s.buildings.townhall ?? 1;
  switch (id) {
    case 'townhall':
    case 'guildhall':
    case 'tavern':
      return true;
    case 'weaponsmith':
    case 'armorer':
    case 'market':
      // After the Tavern and its first pack, so the tutorial's one plot is the only one.
      return trips >= 2 || stepAt(s, 'scout');
    case 'temple':
      return trips >= 3 || th >= 2 || s.roster.some((h) => !!h.woundedUntil);
    case 'magetower':
      return trips >= 4 || th >= 2;
    case 'stables':
      return th >= 3;
    case 'embassy':
      // Once the guild has a few trips behind it and a bigger town: tribes start to matter.
      return th >= 2 && trips >= 6;
    default:
      return true;
  }
}

/** What the guild is told when something opens. */
const NEWS: Partial<Record<Feature, string>> = {
  spells: 'The spellbook is open: the Guildmaster can take spells on expeditions. See the Mage Tower.',
  deeds: 'New in the Guild Hall: the Hall of Deeds, where achievements and prestige classes are kept.',
  clock: 'Day and night and the seasons now show at the top. Both change what happens out in the Marches.',
  contracts: 'The quest board in the Great Hall has contracts now. They pay in packs.',
  troubles: 'Trouble in the Marches: areas can turn dangerous. The Great Hall lists them.',
  secrets: 'Rumours reach the Roster: some heroes only join when the guild does something special.',
  focus: 'The Guild Hall drills parties for different work: choose a focus when you send one out (explore, treasure, hunt or gather).',
  stance: 'With the Weaponsmith\'s steel, parties can pick their fights: choose a stance when you send one out (cautious, balanced or bold).',
  retreat: 'The Temple\'s clerics advise when to turn back: choose when a party retreats when you send it out.',
  goals: 'The town council posts bounties for the trail: give a trip a goal when you send it out, for a bonus.',
  waypoints: 'The stable-masters keep route maps: on the Watch screen, mark which side paths, chests and fights the party takes on the road ahead.',
  parties: 'The Guild Hall is growing: at level 3 it can lead a second party, and run two outings at once (a party or a scout each). See the War Table.',
  tribes: 'Tribes matter: three heroes of one tribe in a party unlock a bonus. See the War Table.',
};

const FEATURES: Feature[] = ['packs', 'spells', 'deeds', 'clock', 'materials', 'contracts', 'troubles', 'secrets', 'focus', 'stance', 'retreat', 'goals', 'waypoints', 'scouting', 'parties', 'tribes', 'gear'];

/** The trip orders, in the order they open, and what opens each. */
export const ORDER_UNLOCKS: { feature: Feature; name: string; needs: string }[] = [
  { feature: 'focus', name: 'Focus', needs: 'the Guild Hall at level 2' },
  { feature: 'stance', name: 'Stance', needs: 'a Weaponsmith' },
  { feature: 'retreat', name: 'When to retreat', needs: 'a Temple' },
  { feature: 'goals', name: 'Goals', needs: 'the Town Hall at level 3' },
  { feature: 'waypoints', name: 'Waypoints on the road ahead', needs: 'the Stables' },
];

/** The next trip order still to open, if any. */
export function nextOrderUnlock(s: GameState): { name: string; needs: string } | null {
  return ORDER_UNLOCKS.find((o) => !unlocked(s, o.feature)) ?? null;
}
const PLOTS = ['tavern', 'weaponsmith', 'armorer', 'market', 'temple', 'magetower', 'stables', 'embassy'];

function openNow(s: GameState): string[] {
  return [...FEATURES.filter((f) => unlocked(s, f)), ...PLOTS.filter((p) => plotOpen(s, p)).map((p) => `plot:${p}`)];
}

/**
 * Notes for whatever opened since last time. The first call on a save only records what is open, so an
 * old save doesn't get a flood of news.
 */
export function newUnlocks(s: GameState): string[] {
  const now = openNow(s);
  if (!s.seen) {
    s.seen = now;
    return [];
  }
  const seen = new Set(s.seen);
  const fresh = now.filter((k) => !seen.has(k));
  if (!fresh.length) return [];
  s.seen.push(...fresh);
  const out: string[] = [];
  for (const k of fresh) if (!k.startsWith('plot:') && NEWS[k as Feature]) out.push(NEWS[k as Feature]!);
  const plots = fresh.filter((k) => k.startsWith('plot:') && !(s.buildings[k.slice(5)] ?? 0)).map((k) => BUILDING_BY_ID[k.slice(5)].name);
  if (plots.length) out.push(`The builders have marked out ${plots.length > 1 ? 'new plots' : 'a new plot'} in town: ${plots.length > 1 ? plots.slice(0, -1).join(', ') + ' and ' + plots[plots.length - 1] : plots[0]}.`);
  return out;
}
