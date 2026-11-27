// The quest board: three contracts at a time, posted in the Guild Hall. Each asks for something
// the parties can do on their trips (hunt a family of monsters, scout an area, bring back
// materials, end trouble, storm the fortress) and pays in packs: the main steady source of
// packs now that gold doesn't buy them.

import { neighbours } from './areas';
import { canReach } from './hold';
import { PACKS, type PackType } from './data/packs';
import { ENEMY_BY_ID, REGION_BY_ID, REGIONS } from './data/world';
import { Rng } from './rng';
import type { ExpeditionReport, GameState, Material, RegionDef } from './types';
import { MATERIALS } from './types';
import { noviceEra } from './town';

export type QuestKind = 'slay' | 'scout' | 'gather' | 'calm' | 'siege' | 'unhurt';

export interface QuestReward {
  /** A whole pack. */
  pack?: PackType;
  /** Pieces toward one. */
  pieces?: [PackType, number];
}

export interface Quest {
  id: number;
  kind: QuestKind;
  title: string;
  text: string;
  need: number;
  progress: number;
  family?: string;
  regionId?: string;
  material?: Material;
  reward: QuestReward;
}

export const BOARD_SIZE = 3;
/** A new contract is posted this long after one is finished or dropped. */
export const REFILL_MS = 20 * 60 * 1000;

const REWARDS: Record<'easy' | 'medium' | 'hard' | 'epic' | 'novice', QuestReward> = {
  novice: { pack: 'novice' },
  easy: { pack: 'recruit' },
  medium: { pack: 'recruit', pieces: ['veteran', 3] },
  hard: { pack: 'veteran' },
  epic: { pack: 'champion' },
};

export function rewardText(r: QuestReward): string {
  const parts: string[] = [];
  if (r.pack) parts.push(PACKS[r.pack].name);
  if (r.pieces) parts.push(`${r.pieces[1]} ${PACKS[r.pieces[0]].name} pieces`);
  return parts.join(' + ');
}

/**
 * The early days: the Town Hall is still at level 1, or the guild hasn't explored past the first ring.
 * Contracts then pay in Novice Packs, like most finds in the first ring.
 */
export function earlyDays(s: GameState): boolean {
  return noviceEra(s) || !s.explored.some((id) => (REGION_BY_ID[id]?.ring ?? 0) >= 2);
}

/** Areas next to explored land (and town) that nobody has scouted yet. */
function unscouted(s: GameState): RegionDef[] {
  const known = new Set(s.explored);
  return REGIONS.filter((r) => !known.has(r.id) && !r.requires && !r.siege
    && (r.ring === 1 || neighbours(r).some((n) => known.has(n.id))) && canReach(s, r));
}

/** Writes a new contract that fits what the guild can reach now. */
function makeQuest(s: GameState, rng: Rng, now: number): Quest | null {
  const taken = (k: QuestKind, key?: string) => s.quests.active.some((q) => q.kind === k && (key === undefined || q.regionId === key || q.family === key || q.material === key));
  const explored = s.explored.map((id) => REGION_BY_ID[id]).filter((r) => r && !r.requires);
  const options: { weight: number; make: () => Omit<Quest, 'id' | 'progress'> | null }[] = [];

  // Hunt a family of monsters seen in explored areas. Harder families pay more.
  options.push({ weight: 3, make: () => {
    const families = new Map<string, number>();
    for (const r of explored) for (const e of r.enemyPool) {
      const fam = ENEMY_BY_ID[e.id].family;
      families.set(fam, Math.min(families.get(fam) ?? 9, r.tier));
    }
    const choices = [...families].filter(([f]) => !taken('slay', f) && f !== 'Constructs' && f !== 'Dragonkin');
    if (!choices.length) return null;
    const [family, tier] = rng.pick(choices);
    const need = [0, 12, 15, 20, 25][Math.min(4, tier)];
    return { kind: 'slay', family, need, title: `Bounty: ${family}`, text: `Defeat ${need} ${family.toLowerCase()} on expeditions.`,
      reward: earlyDays(s) ? REWARDS.novice : tier <= 1 ? REWARDS.easy : tier === 2 ? REWARDS.medium : REWARDS.hard };
  } });

  // Scout an area nobody has mapped yet.
  options.push({ weight: 2, make: () => {
    const open = unscouted(s).filter((r) => !taken('scout', r.id));
    if (!open.length) return null;
    const r = rng.pick(open);
    return { kind: 'scout', regionId: r.id, need: 1, title: 'Cartographer\'s request', text: `Send a scout to map the unmapped land at ring ${r.ring}${r.ring > 1 ? '' : ' near town'}.`,
      reward: earlyDays(s) ? REWARDS.novice : r.ring <= 1 ? REWARDS.easy : r.ring === 2 ? REWARDS.medium : REWARDS.hard };
  } });

  // Bring back materials. The town pays in a pack (a Novice one in the early days).
  options.push({ weight: 2, make: () => {
    const m = rng.pick(MATERIALS.filter((x) => !taken('gather', x)));
    if (!m) return null;
    const need = rng.int(4, 7) * 5;
    return { kind: 'gather', material: m, need, title: `Supplies: ${m}`, text: `Bring back ${need} ${m} from expeditions.`, reward: earlyDays(s) ? REWARDS.novice : REWARDS.easy };
  } });

  // End trouble in an area.
  const troubled = Object.entries(s.areas).filter(([id]) => !taken('calm', id));
  if (troubled.length) options.push({ weight: 4, make: () => {
    const [id, a] = rng.pick(troubled);
    const what = a.kind === 'infested' ? 'Burn the goblin camp in' : a.kind === 'corrupted' ? 'Destroy the Gloom Heart in' : 'Rout the warbands raiding';
    return { kind: 'calm', regionId: id, need: 1, title: `Plea from ${REGION_BY_ID[id].name}`, text: `${what} ${REGION_BY_ID[id].name}.`, reward: REWARDS.hard };
  } });

  // Storm a standing fortress.
  const sieges = REGIONS.filter((r) => r.siege && s.explored.includes(r.id) && (s.razedUntil[r.id] ?? 0) <= now);
  if (sieges.length && !taken('siege')) options.push({ weight: 1, make: () => {
    const fort = rng.pick(sieges);
    return { kind: 'siege', regionId: fort.id, need: 1, title: 'The Crown\'s commission', text: `Win the battle at ${fort.name}.`, reward: REWARDS.epic };
  } });

  // Come home from a far area with nobody knocked out.
  if (explored.some((r) => r.ring >= 2) && !taken('unhurt')) options.push({ weight: 1, make: () => ({
    kind: 'unhurt', need: 1, title: 'Not a scratch', text: 'Return from a ring 2 or further area with nobody knocked out.', reward: REWARDS.medium,
  }) });

  for (let tries = 0; tries < 8 && options.length; tries++) {
    const pick = rng.weighted(options.map((o) => ({ value: o, weight: o.weight })));
    const q = pick.make();
    if (q) return { ...q, id: s.quests.nextId++, progress: 0 };
    options.splice(options.indexOf(pick), 1);
  }
  return null;
}

/** Posts new contracts when the board has room, and withdraws ones that can't be done any more. Returns news. */
export function tickQuests(s: GameState, now: number): string[] {
  const news: string[] = [];
  // Trouble that ended on its own (warbands scattering) takes its contract with it.
  for (const q of [...s.quests.active]) {
    const stale = (q.kind === 'calm' && !s.areas[q.regionId!]) || (q.kind === 'siege' && (s.razedUntil[q.regionId!] ?? 0) > now)
      || (q.kind === 'scout' && s.explored.includes(q.regionId!));
    if (stale) {
      s.quests.active = s.quests.active.filter((x) => x !== q);
      startRefill(s, now);
      news.push(`Contract withdrawn: ${q.title}. It can't be done any more.`);
    }
  }
  if (s.quests.active.length >= BOARD_SIZE || s.quests.nextAt > now) return news;
  const rng = new Rng(s.quests.seed);
  let added = 0;
  while (s.quests.active.length < BOARD_SIZE) {
    const q = makeQuest(s, rng, now);
    if (!q) break;
    s.quests.active.push(q);
    added++;
  }
  s.quests.seed = rng.int(1, 2147483646);
  s.quests.nextAt = now + REFILL_MS;
  if (added && s.quests.done + s.quests.active.length > BOARD_SIZE) news.push(added === 1 ? 'A new contract is on the quest board.' : `${added} new contracts are on the quest board.`);
  return news;
}

/** Counts a returned trip toward the contracts, and pays out finished ones. Returns news. */
export function progressQuests(s: GameState, r: ExpeditionReport, now: number): string[] {
  const news: string[] = [];
  const region = REGION_BY_ID[r.regionId];
  for (const q of [...s.quests.active]) {
    let add = 0;
    if (q.kind === 'slay') add = Object.entries(r.kills ?? {}).reduce((a, [id, n]) => a + (ENEMY_BY_ID[id]?.family === q.family ? n : 0), 0);
    if (q.kind === 'scout' && r.regionId === q.regionId) add = 1;
    if (q.kind === 'gather') add = r.materials[q.material!] ?? 0;
    if (q.kind === 'calm' && r.regionId === q.regionId && r.area?.cleared) add = 1;
    if (q.kind === 'siege' && r.regionId === q.regionId && r.siege?.won) add = 1;
    if (q.kind === 'unhurt' && r.outcome === 'returned' && region.ring >= 2 && Object.values(r.heroHpPct).every((p) => p > 0)) add = 1;
    if (!add) continue;
    q.progress = Math.min(q.need, q.progress + add);
    if (q.progress >= q.need) {
      if (q.reward.pack) s.packs[q.reward.pack] += 1;
      if (q.reward.pieces) s.pieces[q.reward.pieces[0]] += q.reward.pieces[1];
      s.quests.active = s.quests.active.filter((x) => x !== q);
      s.quests.done += 1;
      startRefill(s, now);
      news.push(`Contract done: ${q.title}. Reward: ${rewardText(q.reward)}.`);
    }
  }
  return news;
}

/** A scout mapped this area: pays out a Cartographer's request for it. Returns news. */
export function scoutedQuest(s: GameState, regionId: string, now: number): string[] {
  const q = s.quests.active.find((x) => x.kind === 'scout' && x.regionId === regionId);
  if (!q) return [];
  if (q.reward.pack) s.packs[q.reward.pack] += 1;
  if (q.reward.pieces) s.pieces[q.reward.pieces[0]] += q.reward.pieces[1];
  s.quests.active = s.quests.active.filter((x) => x !== q);
  s.quests.done += 1;
  startRefill(s, now);
  return [`Contract done: ${q.title}. Reward: ${rewardText(q.reward)}.`];
}

/** Drops a contract; a new one is posted later. */
export function abandonQuest(s: GameState, id: number, now: number) {
  s.quests.active = s.quests.active.filter((q) => q.id !== id);
  startRefill(s, now);
}

/** A free spot on the board is filled REFILL_MS later (unless a refill is already on its way). */
function startRefill(s: GameState, now: number) {
  if (s.quests.nextAt <= now) s.quests.nextAt = now + REFILL_MS;
}
