// Achievements: long-running goals measured against the guild's records. Some pay out gold or
// packs; four unlock the prestige classes, which only then start appearing in packs.

import { LORDS } from './data/frontier';
import { HEROES } from './data/heroes';
import type { PackType } from './data/packs';
import { ENEMY_BY_ID, REGION_BY_ID } from './data/world';
import { addHero } from './state';
import type { GameState, HeroDef, PrestigeClass, Rarity } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Shown while the goal can't be reached yet in this build. */
  hint?: string;
  goal: number;
  progress: (s: GameState) => number;
  /** Gold, whole packs (Recruit unless `packType` says otherwise), or a prestige class. */
  reward: { gold?: number; packs?: number; packType?: PackType; unlocks?: PrestigeClass };
}

const totalKills = (s: GameState, keep: (id: string) => boolean) =>
  Object.entries(s.records.kills).reduce((a, [id, n]) => a + (keep(id) ? n : 0), 0);

const isBeast = (id: string) => ENEMY_BY_ID[id]?.family === 'Beasts' || ENEMY_BY_ID[id]?.role === 'beast';
/** The lords of the Deep Marches' lairs. */
const DEEP_LORDS = [...new Set(Object.values(LORDS))];
/** Full-grown dragons (Wyrmlings and drakes don't count). */
export const DRAGON_IDS = ['dragon', 'frost_wyrm', 'elder_wyrm'];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_trip', name: 'First Steps', description: 'Finish your first expedition.', goal: 1,
    progress: (s) => s.tripsCompleted, reward: { gold: 100 } },
  { id: 'explorer', name: 'Cartographer', description: 'Explore 10 areas of the Frontier Marches.', goal: 10,
    progress: (s) => s.explored.length, reward: { packs: 1 } },
  { id: 'far_edge', name: 'Edge of the Map', description: 'Explore an area in ring 7, at the edge of the old maps.', goal: 1,
    progress: (s) => (s.explored.some((id) => (REGION_BY_ID[id]?.ring ?? 0) >= 7) ? 1 : 0), reward: { packs: 1, packType: 'champion' } },
  { id: 'deep_marches', name: 'Into the Deep', description: 'Explore an area in ring 8, the first of the Deep Marches.', goal: 1,
    progress: (s) => (s.explored.some((id) => (REGION_BY_ID[id]?.ring ?? 0) >= 8) ? 1 : 0), reward: { packs: 1, packType: 'champion' } },
  { id: 'worlds_end', name: "World's End", description: 'Explore an area in ring 10, the end of the known world.', goal: 1,
    progress: (s) => (s.explored.some((id) => (REGION_BY_ID[id]?.ring ?? 0) >= 10) ? 1 : 0), reward: { packs: 2, packType: 'champion' } },
  { id: 'deep_lords', name: 'Lord of the Deep', description: 'Slay 3 lair lords: elder dragons, frost wyrms, stone titans, Dread Lords, leviathans or the Grey Alpha.', goal: 3,
    progress: (s) => totalKills(s, (id) => DEEP_LORDS.includes(id)), reward: { packs: 2, packType: 'champion' } },
  { id: 'awakened', name: 'Awakened', description: 'Awaken a hero with Starshards.', goal: 1,
    progress: (s) => s.records.awakenings ?? 0, reward: { gold: 3000 } },
  { id: 'far_ring', name: 'Beyond the Horizon', description: 'Explore an area in ring 3.', goal: 1,
    progress: (s) => (s.explored.some((id) => (REGION_BY_ID[id]?.ring ?? 0) >= 3) ? 1 : 0), reward: { gold: 250 } },
  { id: 'collector', name: 'Full Roster', description: 'Recruit 15 different heroes.', goal: 15,
    progress: (s) => s.roster.length, reward: { packs: 1 } },
  { id: 'spellbinder', name: 'Spellbinder', description: 'Own 6 different spells.', goal: 6,
    progress: (s) => Object.keys(s.spells).length, reward: { packs: 1 } },
  { id: 'monster_hunter', name: 'Monster Hunter', description: 'Defeat 300 enemies on expeditions.', goal: 300,
    progress: (s) => totalKills(s, () => true), reward: { gold: 300 } },
  { id: 'fortress', name: 'Fortress Breaker', description: 'Win a large battle: storm a fortress or put down an uprising.', goal: 1,
    progress: (s) => s.records.siegesWon, reward: { packs: 1, packType: 'champion' } },
  { id: 'builder', name: 'Master Builder', description: 'Raise the Town Hall to level 3.', goal: 3,
    progress: (s) => s.buildings.townhall ?? 0, reward: { packs: 1 } },
  // Prestige classes.
  { id: 'beastmaster', name: 'Respect of the Wild', description: 'Defeat 500 beasts on expeditions (wolves, boars, spiders and hounds).', goal: 500,
    progress: (s) => totalKills(s, isBeast), reward: { unlocks: 'beastmaster' } },
  { id: 'paladin', name: 'Unbroken', description: 'Finish 25 expeditions with no hero knocked out.', goal: 25,
    progress: (s) => s.records.cleanTrips, reward: { unlocks: 'paladin' } },
  { id: 'necromancer', name: 'The Abbey Bells', description: 'Clear the Sunken Abbey: defeat every monster group there in a single trip.', goal: 1,
    progress: (s) => (s.records.clearedRegions.includes('abbey') ? 1 : 0), reward: { unlocks: 'necromancer' } },
  { id: 'dragonslayer', name: 'Dragonslayer', description: 'Slay a full-grown dragon.', goal: 1,
    hint: 'The elder dragon lairs at Dragonmaw, a skull region past the Wyrmling Crags. Heroes can die there.',
    progress: (s) => totalKills(s, (id) => DRAGON_IDS.includes(id)), reward: { unlocks: 'dragonslayer' } },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Prestige classes the guild has unlocked. */
export function unlockedClasses(s: GameState): Set<PrestigeClass> {
  const out = new Set<PrestigeClass>();
  for (const id of s.achievements) {
    const c = ACHIEVEMENT_BY_ID[id]?.reward.unlocks;
    if (c) out.add(c);
  }
  return out;
}

const RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

export interface Earned {
  def: AchievementDef;
  /** The free hero that came with a prestige unlock. */
  hero?: HeroDef;
}

/** Awards every achievement whose goal is now met, applying its reward. */
export function claimAchievements(s: GameState): Earned[] {
  const earned: Earned[] = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id) || a.progress(s) < a.goal) continue;
    s.achievements.push(a.id);
    s.gold += a.reward.gold ?? 0;
    s.packs[a.reward.packType ?? 'recruit'] += a.reward.packs ?? 0;
    const e: Earned = { def: a };
    if (a.reward.unlocks) {
      // The first unlock comes with one free hero of the class: the most common one not yet owned.
      const owned = new Set(s.roster.map((h) => h.defId));
      const pick = HEROES.filter((d) => d.heroClass === a.reward.unlocks && !owned.has(d.id)).sort((x, y) => RANK[x.rarity] - RANK[y.rarity])[0];
      if (pick) {
        addHero(s, pick.id);
        e.hero = pick;
      }
    }
    earned.push(e);
  }
  return earned;
}
