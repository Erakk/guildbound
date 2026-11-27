// Encounters: set pieces on the trail that play differently from "a monster group by the path".
//
//   - Ambush: the group hides in the brush on both sides of the trail and springs when the party is
//     level with it. A Ranger, Rogue or Beastmaster may spot it first, and then the party strikes first.
//   - Brawl: two bands of different kinds are at each other's throats. The Captain decides, by
//     personality, whether to wait for a weakened winner or charge in while they're busy.
//   - Escort: a merchant's wagon walks with the party for a stretch. Raiders go for the wagon; get it
//     through and the merchant pays.
//   - Troll bridge: a troll wants a toll (a share of the gold so far). The Captain pays or fights,
//     and fighting wins the troll's hoard.
//   - Nest: keeps sending out monsters until someone smashes it. Ranged heroes and the Captain go for it.
//   - Thief: a cutpurse snatches gold and runs. Bring him down before he gets away and the gold comes
//     back with his own purse. A Rogue may catch his wrist first.
//
// Each encounter but the thief takes the place of one of the trail's ordinary groups, so a trip's
// danger and loot stay about where they were.

import { ENEMY_BY_ID, tierScale } from '../data/world';
import { STORY_HOLD, storyFor } from '../data/stories';
import type { Biome, EnemyDef, GoalKind, Personality } from '../types';
import { HERO_BY_ID } from '../data/heroes';
import { DISCOVERY_BY_ID } from '../data/discoveries';
import { HAZARDS, LANDMARK_BY_ID } from '../data/landmarks';
import {
  activateGroup, addPieces, forkLabel, STORY_PLATE, BIOME_MATERIALS, dist, gain, giveGold, joinList, log, moveToward, once, plural, pointAt, TPS, unitAct, unitById,
  type EnemyGroup, type Pt, type Sim, type Unit,
} from './expedition';

export type EncounterKind = 'ambush' | 'brawl' | 'escort' | 'bridge' | 'nest' | 'thief';

export interface Encounter {
  id: number;
  kind: EncounterKind;
  /** Distance along the trail where it starts (where the party sees it, or meets it). */
  at: number;
  x: number;
  y: number;
  /** Groups taking part (a brawl has two). */
  groups: number[];
  state: 'waiting' | 'on' | 'done';
  /** What the Captain decided: wait or charge (brawl), pay or fight (bridge). */
  choice?: 'wait' | 'charge' | 'pay' | 'fight';
  /** The wagon, the troll, the nest or the thief. */
  unit?: number;
  /** Escort: where the wagon's road ends, and where the raiders spring. */
  to?: number;
  spring?: number;
  sprung?: boolean;
  /** Bridge: the toll. Thief: what he took. */
  gold?: number;
  /** Nest: monsters sent out so far, and the tick of the next. */
  spawned?: number;
  nextTick?: number;
  /** Brawl: when the party stops waiting, whatever happened. */
  until?: number;
  /** The trail direction there (for drawing the bridge). */
  dir?: Pt;
}

/** What the plate over an encounter says (shown on hover). The ambush and the thief have none. */
export const ENCOUNTER_PLATE: Partial<Record<EncounterKind, { title: string; text: string }>> = {
  brawl: { title: 'A brawl', text: 'Two bands at each other\'s throats: wait it out, or charge in' },
  escort: { title: 'A merchant\'s wagon', text: 'Walk it down the road and the merchant pays. Raiders want its load' },
  bridge: { title: 'Troll bridge', text: 'The troll wants a toll. Pay it, or fight for the troll\'s hoard' },
  nest: { title: 'A nest', text: 'Keeps sending out monsters until someone smashes it' },
};

/** Nests by monster family: the nest, and what crawls out of it. */
const NESTS: { family: string; nest: string; spawn: string[] }[] = [
  { family: 'Beasts', nest: 'spider_nest', spawn: ['spider'] },
  { family: 'Goblins', nest: 'goblin_burrow', spawn: ['goblin_spear', 'goblin_archer'] },
  { family: 'Undead', nest: 'crypt', spawn: ['skeleton'] },
];

/** Where there are rivers to bridge. */
const RIVERS: Biome[] = ['plains', 'farm', 'forest', 'marsh', 'hills', 'mountain', 'snow', 'barrow', 'haunted', 'ruins'];
/** Where merchants won't drive a wagon. */
const NO_ROAD: Biome[] = ['sea', 'sky', 'badlands'];

/** How keen a Captain is to fight rather than wait or pay. */
const FIGHTY: Record<Personality, number> = { reckless: 2, gloryhound: 2, greedy: 1, steady: 0.3, curious: 0, protective: -0.7, shy: -1.2, cowardly: -2 };

export interface EncounterSetup {
  /** The ordinary groups along the trail, which encounters may take the place of. */
  trailGroups: number[];
  pool: { id: string; weight: number }[];
  mainSpan: number;
  offSpur: (d: number) => number;
  totalLen: number;
  durationSec: number;
}

const TRIBE_OF = (u: Unit) => (u.defId ? HERO_BY_ID[u.defId]?.tribe : undefined);
const liveParty = (sim: Sim) => sim.units.filter((u) => u.side === 'hero' && u.alive && !u.pet && !u.minion && !u.freed);
const groupUnits = (sim: Sim, g: number) => sim.units.filter((u) => u.group === g && u.side === 'enemy');
const sideOf = (dir: Pt) => ({ x: -dir.y, y: dir.x });

function captain(sim: Sim): Unit | undefined {
  const c = unitById(sim, sim.captainId);
  return c && c.alive ? c : liveParty(sim)[0];
}

/** An enemy for an encounter, scaled to the region's danger tier like the trail's own groups. */
function monster(sim: Sim, e: EnemyDef, x: number, y: number, group: number, hpMul = 1, lootMul = 1): Unit {
  const tierMult = tierScale(sim.region.tier);
  const u: Unit = {
    id: sim.nextId++, side: 'enemy', key: e.id, name: e.name, sprite: e.id, role: e.role, slot: -1, row: 'front', fx: 0, fy: 0,
    x, y, homeX: x, homeY: y, hp: e.hp * tierMult * hpMul, maxHp: e.hp * tierMult * hpMul, atk: e.atk * 1.5 * tierMult, def: e.def,
    heal: e.role === 'healer' ? e.atk * 2 * tierMult : 0, range: e.range, speed: e.speed, attackRate: e.attackRate,
    crit: 0.05, splash: e.splash ?? 0, cd: sim.rng.range(0, e.attackRate), alive: true, targetId: null, group, facing: -1,
    kills: 0, gold: e.gold * lootMul, xp: e.xp * lootMul, hesitate: 0, fleeing: 0, family: e.family, big: e.hp >= 100,
    structure: e.structure,
  };
  sim.units.push(u);
  return u;
}

function newGroup(sim: Sim, x: number, y: number, family: string): EnemyGroup {
  const g: EnemyGroup = { id: sim.groups.length, x, y, active: false, cleared: false, announced: false, family };
  sim.groups.push(g);
  return g;
}

/** "3 Goblin Spearmen and a Goblin Archer", for a group's live members. */
function describe(sim: Sim, g: number): string {
  const counts = new Map<string, number>();
  for (const m of groupUnits(sim, g)) if (m.alive) counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
  return joinList([...counts].map(([n, c]) => (c > 1 ? `${c} ${plural(n)}` : `${/^[AEIOU]/.test(n) ? 'an' : 'a'} ${n}`)));
}

/** Wakes a group without the usual "Ambush!" line (the encounter says its own). */
function wake(sim: Sim, g: EnemyGroup) {
  g.held = false;
  g.hidden = false;
  g.announced = true;
  activateGroup(sim, g.id);
}

/** Puts a trip's encounters on the trail. Called once the trail's groups are in place. */
export function setupEncounters(sim: Sim, ctx: EncounterSetup) {
  const rng = sim.rng;
  const fams = new Set(ctx.pool.map((p) => ENEMY_BY_ID[p.id]?.family).filter(Boolean));
  const kinds: { value: EncounterKind; weight: number }[] = [{ value: 'ambush', weight: 3 }];
  // (Waiting out a brawl costs time; where a lord waits at the end of the trail, there is none to spare.)
  if (fams.size >= 2 && !sim.region.boss) kinds.push({ value: 'brawl', weight: 3 });
  if (!NO_ROAD.includes(sim.region.biome)) kinds.push({ value: 'escort', weight: 2 });
  if (RIVERS.includes(sim.region.biome)) kinds.push({ value: 'bridge', weight: 2 });
  if (NESTS.some((n) => fams.has(n.family))) kinds.push({ value: 'nest', weight: 2 });
  if (fams.has('Bandits') || fams.has('Goblins') || ['farm', 'plains', 'coast'].includes(sim.region.biome)) kinds.push({ value: 'thief', weight: 2 });
  // The hand says which encounters this trip holds (see core/deck); spots on the trail cap how many.
  const dealt = sim.hand.filter((id) => id.startsWith('enc:')).map((id) => id.slice(4) as EncounterKind).filter((k) => kinds.some((x) => x.value === k));
  const count = Math.min(dealt.length, ctx.durationSec < 300 ? 2 : 3);

  // Where each ordinary group stands along the main trail; the first one stays an ordinary fight.
  const along = (g: EnemyGroup) => {
    let best = 0;
    let bestD = Infinity;
    for (let dm = 0; dm <= ctx.mainSpan; dm += 25) {
      const d = ctx.offSpur(dm);
      const q = dist(pointAt(sim, d).p, g);
      if (q < bestD) { bestD = q; best = d; }
    }
    return best;
  };
  // (Only in the first 70% of the trail, so the party gets there before it has to turn for home.)
  const late = ctx.offSpur(0.7 * ctx.mainSpan);
  const spots = ctx.trailGroups.map((id) => ({ g: sim.groups[id], d: along(sim.groups[id]) })).sort((a, b) => a.d - b.d).slice(1).filter((x) => x.d <= late);

  for (let i = 0; i < count; i++) {
    const kind = dealt[i];
    if (!kind) break;
    if (kind === 'thief') {
      setupThief(sim, ctx.offSpur(rng.range(0.38, 0.6) * ctx.mainSpan));
      continue;
    }
    // Escorts need room before and after; nothing else may sit too close to another encounter.
    const fits = spots.filter((s) => sim.encounters.every((e) => Math.abs(e.at - s.d) > 700) && (kind !== 'escort' || (s.d > 700 && s.d < ctx.totalLen - 600)));
    if (!fits.length) continue;
    const spot = fits[rng.int(0, fits.length - 1)];
    spots.splice(spots.indexOf(spot), 1);
    if (kind === 'ambush') setupAmbush(sim, spot.g, spot.d);
    else if (kind === 'brawl') setupBrawl(sim, spot.g, spot.d, ctx.pool);
    else if (kind === 'escort') setupEscort(sim, spot.g, spot.d, ctx.totalLen);
    else if (kind === 'bridge') setupBridge(sim, spot.g, spot.d);
    else if (kind === 'nest') setupNest(sim, spot.g, spot.d, fams);
  }
}

function add(sim: Sim, e: Omit<Encounter, 'id' | 'state'>): Encounter {
  const enc: Encounter = { ...e, id: sim.encounters.length, state: 'waiting' };
  sim.encounters.push(enc);
  return enc;
}

function setupAmbush(sim: Sim, g: EnemyGroup, d: number) {
  const { p, dir } = pointAt(sim, d);
  const n = sideOf(dir);
  groupUnits(sim, g.id).forEach((u, i) => {
    const s = i % 2 ? 1 : -1;
    const k = 140 + sim.rng.range(0, 40);
    const a = sim.rng.range(-50, 50);
    u.x = u.homeX = p.x + n.x * s * k + dir.x * a;
    u.y = u.homeY = p.y + n.y * s * k + dir.y * a;
  });
  Object.assign(g, { x: p.x, y: p.y, held: true, hidden: true, enc: sim.encounters.length });
  add(sim, { kind: 'ambush', at: d - 20, x: p.x, y: p.y, groups: [g.id], dir });
}

function setupBrawl(sim: Sim, a: EnemyGroup, d: number, pool: { id: string; weight: number }[]) {
  const { p, dir } = pointAt(sim, d);
  const n = sideOf(dir);
  const otherFams = [...new Set(pool.map((x) => ENEMY_BY_ID[x.id].family))].filter((f) => f !== a.family);
  const famB = sim.rng.pick(otherFams);
  const poolB = pool.filter((x) => ENEMY_BY_ID[x.id].family === famB);
  const at = (k: number) => ({ x: p.x + dir.x * k + n.x * 50, y: p.y + dir.y * k + n.y * 50 });
  const ca = at(-70);
  const cb = at(70);
  const ua = groupUnits(sim, a.id);
  for (const u of ua) {
    u.x = u.homeX = ca.x + sim.rng.range(-40, 40);
    u.y = u.homeY = ca.y + sim.rng.range(-50, 50);
  }
  const b = newGroup(sim, cb.x, cb.y, famB);
  for (let i = 0; i < Math.max(2, ua.length - 1); i++) {
    const e = ENEMY_BY_ID[sim.rng.weighted(poolB.map((x) => ({ weight: x.weight, value: x.id })))];
    monster(sim, e, cb.x + sim.rng.range(-40, 40), cb.y + sim.rng.range(-50, 50), b.id);
  }
  const id = sim.encounters.length;
  Object.assign(a, { x: ca.x, y: ca.y, held: true, enc: id });
  Object.assign(b, { held: true, enc: id });
  add(sim, { kind: 'brawl', at: d - 480, x: p.x + n.x * 50, y: p.y + n.y * 50, groups: [a.id, b.id], dir });
}

function setupEscort(sim: Sim, g: EnemyGroup, d: number, totalLen: number) {
  const start = d - 520;
  const end = Math.min(totalLen - 150, d + 480);
  const { p, dir } = pointAt(sim, start);
  const n = sideOf(dir);
  // The raiders lie low out of sight until the wagon comes by.
  Object.assign(g, { held: true, hidden: true, enc: sim.encounters.length });
  // The wagon waits by the roadside.
  const tier = tierScale(sim.region.tier);
  const wx = p.x + n.x * 70;
  const wy = p.y + n.y * 70;
  const wagon: Unit = {
    id: sim.nextId++, side: 'hero', key: 'wagon', name: 'The merchant\'s wagon', sprite: 'wagon', role: 'brute', slot: -1, row: 'back',
    fx: -105, fy: 0, x: wx, y: wy, homeX: wx, homeY: wy, hp: 150 * tier, maxHp: 150 * tier, atk: 0, def: 4, heal: 0, range: 0, speed: 100,
    attackRate: 99, crit: 0, splash: 0, cd: 99, alive: true, targetId: null, group: -1, facing: 1, kills: 0, gold: 0, xp: 0,
    hesitate: 0, fleeing: 0, freed: true, structure: true, cart: true, parked: true,
  };
  sim.units.push(wagon);
  add(sim, { kind: 'escort', at: start, to: end, spring: d - 60, x: wx, y: wy, groups: [g.id], unit: wagon.id, dir });
}

function setupBridge(sim: Sim, g: EnemyGroup, d: number) {
  const { p, dir } = pointAt(sim, d);
  // The troll takes the group's place.
  sim.units = sim.units.filter((u) => u.group !== g.id);
  const troll = monster(sim, ENEMY_BY_ID.troll, p.x + dir.x * 40, p.y + dir.y * 40, g.id, 1.1, 1.5);
  troll.facing = -1;
  Object.assign(g, { x: troll.x, y: troll.y, held: true, family: troll.family, enc: sim.encounters.length });
  add(sim, { kind: 'bridge', at: d - 230, x: p.x, y: p.y, groups: [g.id], unit: troll.id, dir });
}

function setupNest(sim: Sim, g: EnemyGroup, d: number, fams: Set<string>) {
  const { p, dir } = pointAt(sim, d);
  const n = sideOf(dir);
  const kind = NESTS.find((x) => x.family === g.family) ?? sim.rng.pick(NESTS.filter((x) => fams.has(x.family)));
  const s = sim.rng.pick([-1, 1]);
  const nx = p.x + n.x * s * 150;
  const ny = p.y + n.y * s * 150;
  // A couple of its brood stand guard; the rest of the group stays home.
  sim.units = sim.units.filter((u) => u.group !== g.id);
  for (let i = 0; i < 2; i++) monster(sim, ENEMY_BY_ID[sim.rng.pick(kind.spawn)], nx - n.x * s * 60 + sim.rng.range(-40, 40), ny - n.y * s * 60 + sim.rng.range(-40, 40), g.id);
  const nest = monster(sim, ENEMY_BY_ID[kind.nest], nx, ny, g.id);
  nest.nest = true;
  // (Its own line in the chronicle says what it is, so no generic "Trouble ahead".)
  Object.assign(g, { x: nx, y: ny, family: kind.family, enc: sim.encounters.length, announced: true });
  add(sim, { kind: 'nest', at: d, x: nx, y: ny, groups: [g.id], unit: nest.id, spawned: 0, nextTick: 0, dir });
}

function setupThief(sim: Sim, d: number) {
  const { p, dir } = pointAt(sim, d);
  add(sim, { kind: 'thief', at: d, x: p.x, y: p.y, groups: [], dir });
}

/** Runs the encounters for one tick (before anyone acts). */
export function encounterStep(sim: Sim) {
  for (const e of sim.encounters) {
    if (e.state === 'done') continue;
    switch (e.kind) {
      case 'ambush': ambushStep(sim, e); break;
      case 'brawl': brawlStep(sim, e); break;
      case 'escort': escortStep(sim, e); break;
      case 'bridge': bridgeStep(sim, e); break;
      case 'nest': nestStep(sim, e); break;
      case 'thief': thiefStep(sim, e); break;
    }
  }
}

function ambushStep(sim: Sim, e: Encounter) {
  if (sim.phase !== 'out' || sim.leaderDist < e.at) return;
  e.state = 'done';
  const g = sim.groups[e.groups[0]];
  const party = liveParty(sim);
  const spotter = party.find((u) => u.heroClass === 'ranger') ?? party.find((u) => u.heroClass === 'rogue' || u.heroClass === 'beastmaster');
  const spotted = !!spotter && sim.rng.chance(spotter.heroClass === 'ranger' ? 0.7 : 0.5);
  const who = describe(sim, g.id);
  wake(sim, g);
  const foes = groupUnits(sim, g.id);
  if (spotted) {
    log(sim, `${spotter!.name} spotted movement in the brush on both sides of the trail. The ambushers were the ones surprised: ${who}.`);
    sim.events.push({ t: 'shout', id: spotter!.id, text: 'Left and right!' });
    for (const u of foes) u.cd += 2;
  } else {
    log(sim, `Ambush! ${who[0].toUpperCase()}${who.slice(1)} burst out of the brush on both sides of the trail.`);
    for (const u of foes) u.cd = 0;
    for (const h of party) h.hesitate = Math.max(h.hesitate, 0.8);
  }
}

function brawlStep(sim: Sim, e: Encounter) {
  const [a, b] = e.groups.map((id) => sim.groups[id]);
  if (e.state === 'waiting') {
    if (sim.phase !== 'out' || sim.leaderDist < e.at) return;
    e.state = 'on';
    const cap = captain(sim);
    let score = FIGHTY[cap?.personality ?? 'steady'];
    if (sim.orders.stance === 'bold') score += 1;
    if (sim.orders.stance === 'cautious') score -= 1;
    const hurt = liveParty(sim).reduce((s, u) => s + u.hp / u.maxHp, 0) / Math.max(1, liveParty(sim).length);
    if (hurt < 0.65) score -= 2;
    if (hurt >= 0.9) score += 0.3;
    const fa = a.family.toLowerCase();
    const fb = b.family.toLowerCase();
    log(sim, `Up ahead, ${fa} and ${fb} were tearing into each other.`);
    const wp = sim.waypoints[`enc:${e.id}`];
    if (wp) score = wp === 'take' ? 9 : -9;
    if (score > 0.7) {
      e.choice = 'charge';
      e.state = 'done';
      log(sim, `${cap?.name ?? 'The Captain'} wasn't going to wait: "Get them while they're busy!" Both bands turned on the party.`);
      if (cap) sim.events.push({ t: 'shout', id: cap.id, text: 'Now, while they\'re busy!' });
      wake(sim, a);
      wake(sim, b);
    } else {
      e.choice = 'wait';
      e.until = sim.tick + 20 * TPS;
      sim.pauseUntil = e.until;
      log(sim, `${cap?.name ?? 'The Captain'} raised a hand: "Let them wear each other down."`);
      if (cap) sim.events.push({ t: 'shout', id: cap.id, text: 'Wait for it…' });
    }
    return;
  }
  // Waiting: the two bands fight it out.
  const ua = groupUnits(sim, a.id).filter((u) => u.alive);
  const ub = groupUnits(sim, b.id).filter((u) => u.alive);
  if (ua.length && ub.length && sim.tick < (e.until ?? 0) && sim.phase === 'out') {
    for (const u of ua) unitAct(sim, u, ub, ua);
    for (const u of ub) unitAct(sim, u, ua, ub);
    return;
  }
  e.state = 'done';
  sim.pauseUntil = sim.tick;
  if (sim.phase !== 'out') return;
  const lost = !ua.length ? a : !ub.length ? b : null;
  if (lost) {
    lost.cleared = true;
    lost.held = false;
    const won = lost === a ? b : a;
    won.held = false;
    log(sim, `The ${lost.family.toLowerCase()} lost. The ${won.family.toLowerCase()} were still licking their wounds when the party walked up.`);
  } else {
    log(sim, 'Neither side would give in. The party went in anyway.');
    wake(sim, a);
    wake(sim, b);
  }
}

function escortStep(sim: Sim, e: Encounter) {
  const wagon = unitById(sim, e.unit ?? null)!;
  const raiders = sim.groups[e.groups[0]];
  if (e.state === 'waiting') {
    if (sim.phase !== 'out' || sim.leaderDist < e.at) return;
    e.state = 'on';
    wagon.parked = false;
    log(sim, 'A merchant\'s wagon waited by the roadside. "Walk with us a while, friends. There\'s coin in it, and the road\'s not safe."');
    return;
  }
  if (!wagon.alive) {
    e.state = 'done';
    log(sim, 'The wagon went over in a shower of splinters. The merchants fled into the fields, and so did the pay.');
    return;
  }
  if (sim.phase !== 'out') {
    e.state = 'done';
    wagon.alive = false;
    wagon.gone = true;
    log(sim, 'The party had to turn back. The merchant thanked them and drove on alone.');
    return;
  }
  if (!e.sprung && sim.leaderDist >= (e.spring ?? 0)) {
    e.sprung = true;
    const { dir } = pointAt(sim, sim.leaderDist);
    const n = sideOf(dir);
    const s = sim.rng.pick([-1, 1]);
    for (const u of groupUnits(sim, raiders.id)) {
      u.x = u.homeX = wagon.x + n.x * s * 230 + sim.rng.range(-50, 50);
      u.y = u.homeY = wagon.y + n.y * s * 230 + sim.rng.range(-40, 40);
    }
    raiders.raid = true;
    raiders.x = wagon.x;
    raiders.y = wagon.y;
    log(sim, `Raiders! ${describe(sim, raiders.id).replace(/^./, (c) => c.toUpperCase())} went straight for the wagon.`);
    wake(sim, raiders);
  }
  if (sim.leaderDist >= (e.to ?? Infinity) && !sim.inCombat) {
    e.state = 'done';
    const pay = giveGold(sim, Math.round(sim.rng.range(12, 18) * sim.region.tier), wagon);
    const mat = sim.rng.pick(BIOME_MATERIALS[sim.region.biome]);
    gain(sim, mat, 2);
    log(sim, `The wagon made it through. The merchant counted out ${pay} gold and threw in some ${mat}.`);
    wagon.alive = false;
    wagon.gone = true;
  }
}

function bridgeStep(sim: Sim, e: Encounter) {
  const g = sim.groups[e.groups[0]];
  const troll = unitById(sim, e.unit ?? null)!;
  if (e.state === 'waiting') {
    if (sim.phase !== 'out' || sim.leaderDist < e.at) return;
    const cap = captain(sim);
    const toll = Math.max(6 * sim.region.tier, Math.round(sim.gold * 0.2));
    e.gold = toll;
    let score = FIGHTY[cap?.personality ?? 'steady'];
    if (sim.orders.stance === 'bold') score += 1;
    if (sim.orders.stance === 'cautious') score -= 1;
    const hp = liveParty(sim).reduce((s, u) => s + u.hp / u.maxHp, 0) / Math.max(1, liveParty(sim).length);
    if (hp < 0.6) score -= 2;
    if (hp >= 0.9) score += 0.3;
    const broke = sim.gold < toll;
    const name = cap?.name ?? 'The Captain';
    const wp = sim.waypoints[`enc:${e.id}`];
    if (wp) score = wp === 'take' ? 9 : -9;
    if (score > 0.4 || broke) {
      e.choice = 'fight';
      e.state = 'on';
      log(sim, broke
        ? `A troll squatted on the bridge and wanted ${toll} gold. The party didn't have it, so it would have to be steel.`
        : `A troll squatted on the bridge and wanted ${toll} gold. ${name} drew steel instead: "Not one coin."`);
      if (cap) sim.events.push({ t: 'shout', id: cap.id, text: broke ? 'Then we fight!' : 'Not one coin!' });
      wake(sim, g);
    } else {
      e.choice = 'pay';
      e.state = 'done';
      sim.gold -= toll;
      log(sim, `A troll squatted on the bridge and wanted ${toll} gold. ${name} paid, and it stepped aside, counting every coin twice.`);
      if (cap) sim.events.push({ t: 'shout', id: cap.id, text: 'Fine. Take it.' });
      const n = sideOf(e.dir ?? { x: 1, y: 0 });
      troll.x = troll.homeX = e.x + n.x * 120;
      troll.y = troll.homeY = e.y + n.y * 120;
      g.cleared = true;
      g.held = false;
    }
    return;
  }
  if (g.cleared) {
    e.state = 'done';
    const hoard = giveGold(sim, Math.round(sim.rng.range(10, 15) * sim.region.tier), { x: e.x, y: e.y });
    const mat = sim.rng.pick(BIOME_MATERIALS[sim.region.biome]);
    gain(sim, mat, 2);
    log(sim, `Under the bridge: the troll's hoard. ${hoard} gold, some ${mat}, and a lot of old bones.`);
  } else if (sim.phase !== 'out' && !g.active) e.state = 'done';
}

function nestStep(sim: Sim, e: Encounter) {
  const g = sim.groups[e.groups[0]];
  const nest = unitById(sim, e.unit ?? null)!;
  if (!nest.alive) {
    e.state = 'done';
    const who = g.lastKiller ?? 'The party';
    const loot = giveGold(sim, Math.round(sim.rng.range(5, 9) * sim.region.tier), nest);
    gain(sim, sim.rng.pick(BIOME_MATERIALS[sim.region.biome]), 2);
    log(sim, `${who} smashed the ${nest.name.toLowerCase()}. Nothing more crawled out, and there were ${loot} gold in the muck.`);
    return;
  }
  if (!g.active) return;
  if (e.state === 'waiting') {
    e.state = 'on';
    const kind = NESTS.find((x) => x.nest === nest.key)!;
    log(sim, `${/^[AEIOU]/.test(nest.name) ? 'An' : 'A'} ${nest.name.toLowerCase()} by the trail, and ${plural(ENEMY_BY_ID[kind.spawn[0]].name).toLowerCase()} kept coming out of it. Smash it!`);
    e.nextTick = sim.tick + 4 * TPS;
  }
  const kind = NESTS.find((x) => x.nest === nest.key)!;
  const brood = groupUnits(sim, g.id).filter((u) => u.alive && !u.nest).length;
  if (sim.tick >= (e.nextTick ?? 0) && brood < 2 && (e.spawned ?? 0) < 6) {
    e.spawned = (e.spawned ?? 0) + 1;
    e.nextTick = sim.tick + 6 * TPS;
    const u = monster(sim, ENEMY_BY_ID[sim.rng.pick(kind.spawn)], nest.x + sim.rng.range(-30, 30), nest.y + 20, g.id, 0.8, 0.5);
    u.cd = 1;
  }
}

function thiefStep(sim: Sim, e: Encounter) {
  if (e.state === 'waiting') {
    if (sim.phase !== 'out' || sim.leaderDist < e.at || sim.inCombat) return;
    e.state = 'done';
    const party = liveParty(sim);
    const rogue = party.find((u) => u.heroClass === 'rogue');
    const ranger = party.find((u) => u.heroClass === 'ranger');
    const catcher = rogue && sim.rng.chance(0.35) ? rogue : ranger && sim.rng.chance(0.2) ? ranger : null;
    if (catcher) {
      log(sim, `A cutpurse darted out of the hedge, and ${catcher.name} caught his wrist mid-grab. He ran off empty-handed.`);
      sim.events.push({ t: 'shout', id: catcher.id, text: 'Not today.' });
      return;
    }
    const take = Math.min(Math.floor(sim.gold), 15 * sim.region.tier, Math.max(5 * sim.region.tier, Math.round(sim.gold * 0.2)));
    if (take < 4) {
      log(sim, 'A cutpurse sized up the party, found nothing worth the trouble, and slunk off.');
      return;
    }
    sim.gold -= take;
    e.gold = take;
    e.state = 'on';
    const { dir } = pointAt(sim, sim.leaderDist);
    const n = sideOf(dir);
    const s = sim.leader.y > sim.height / 2 ? -1 : 1;
    const g = newGroup(sim, sim.leader.x, sim.leader.y, 'Bandits');
    g.announced = true;
    g.enc = e.id;
    const thief = monster(sim, ENEMY_BY_ID.cutpurse, sim.leader.x + n.x * s * 60, sim.leader.y + n.y * s * 60, g.id);
    thief.thief = true;
    thief.stolen = take;
    e.unit = thief.id;
    e.dir = { x: n.x * s, y: n.y * s };
    g.active = true;
    const cap = captain(sim);
    log(sim, `A cutpurse darted out of the hedge, snatched ${take} gold and ran for it! Bring him down before he gets away.`);
    if (cap) sim.events.push({ t: 'shout', id: cap.id, text: 'Thief!' });
    return;
  }
  const thief = unitById(sim, e.unit ?? null)!;
  if (!thief.alive) {
    e.state = 'done';
    return;
  }
  // Run: away from the party, out to the side of the trail.
  const run = e.dir ?? { x: 0, y: 1 };
  moveToward(thief, thief.x + run.x * 100 + (thief.x - sim.leader.x) * 0.2, thief.y + run.y * 100 + (thief.y - sim.leader.y) * 0.2);
  if (dist(thief, sim.leader) > 720) {
    e.state = 'done';
    thief.alive = false;
    thief.gone = true;
    const g = sim.groups[thief.group];
    g.active = false;
    g.cleared = true;
    log(sim, `The cutpurse got away with ${thief.stolen} gold.`);
  }
}

/** A thief brought down: the gold comes back. Called from damage(). */
export function thiefDown(sim: Sim, thief: Unit, by: Unit | null) {
  if (!thief.stolen) return;
  sim.gold += thief.stolen;
  log(sim, `${by?.name ?? 'The party'} brought the cutpurse down: the ${thief.stolen} gold is back, and his own purse besides.`);
  if (by && by.side === 'hero') sim.events.push({ t: 'shout', id: by.id, text: 'Got him!' });
  thief.stolen = 0;
}

// ---- Rope bridges ----
// A gorge across the trail, and a rope bridge over it: the party crosses single file and slowly, so
// only the front heroes reach a fight first. A monster group nearby may hold the far end. A cowardly
// hero may freeze halfway across; Dawnwings just fly over.

export interface RopeBridge {
  from: number;
  to: number;
  x: number;
  y: number;
  dir: Pt;
  /** Someone froze halfway across (once per bridge). */
  froze?: boolean;
  stepped?: boolean;
  /** The group holding the far end, if any. */
  held?: number;
}

const GORGES: Biome[] = ['mountain', 'hills', 'snow', 'badlands', 'forest'];
/** How much slower the party is on a rope bridge. */
export const ROPE_SPEED = 0.6;

export function setupRopeBridge(sim: Sim, ctx: EncounterSetup) {
  if (!GORGES.includes(sim.region.biome) || !sim.hand.includes('feat:rope')) return;
  const mid = ctx.offSpur(sim.rng.range(0.3, 0.55) * ctx.mainSpan);
  // Not on top of an encounter.
  if (sim.encounters.some((e) => Math.abs(e.at - mid) < 400)) return;
  const len = 200;
  const { p, dir } = pointAt(sim, mid);
  const rb: RopeBridge = { from: mid - len / 2, to: mid + len / 2, x: p.x, y: p.y, dir };
  // An ordinary group near the far end moves onto it.
  const end = pointAt(sim, rb.to + 70).p;
  const g = sim.groups
    .filter((x) => x.enc === undefined && x.forkId === undefined && !x.held && ctx.trailGroups.includes(x.id) && dist(x, p) < 700)
    .sort((a, b) => dist(a, p) - dist(b, p))[0];
  if (g) {
    const dx = end.x - g.x;
    const dy = end.y - g.y;
    for (const u of groupUnits(sim, g.id)) {
      u.x = u.homeX = u.x + dx;
      u.y = u.homeY = u.y + dy;
    }
    g.x = end.x;
    g.y = end.y;
    rb.held = g.id;
  }
  sim.ropeBridges.push(rb);
}

/** The rope bridge the leader is on, if any. */
export function ropeHere(sim: Sim): RopeBridge | undefined {
  return sim.ropeBridges.find((b) => sim.leaderDist >= b.from - 30 && sim.leaderDist <= b.to + 30);
}

export function ropeStep(sim: Sim) {
  const b = ropeHere(sim);
  if (!b || sim.phase !== 'out') return;
  const party = liveParty(sim);
  if (!b.stepped) {
    b.stepped = true;
    const held = b.held !== undefined ? sim.groups[b.held] : undefined;
    log(sim, held && !held.cleared
      ? `A rope bridge over a gorge, single file and swaying. On the far side, ${held.family.toLowerCase()} were waiting.`
      : 'A rope bridge over a gorge. Single file, and nobody look down.');
    const wings = party.find((u) => TRIBE_OF(u) === 'dawnwings');
    if (wings) once(sim, `fly-${wings.id}`, `${wings.name} didn't bother with the bridge and flew across.`, wings, 'Wheee!');
  }
  if (!b.froze && sim.leaderDist > (b.from + b.to) / 2) {
    b.froze = true;
    const coward = party.find((u) => u.personality === 'cowardly');
    if (coward) {
      sim.pauseUntil = Math.max(sim.pauseUntil, sim.tick + 3 * TPS);
      log(sim, `Halfway across, ${coward.name} looked down and froze. It took two people to coax them on.`);
      sim.events.push({ t: 'shout', id: coward.id, text: 'Nope. Nope.' });
    }
  }
}

// ---- Find sets ----
// Now and then three markers of a kind stand along the trail: standing stones, spirit lanterns,
// cairns, tide bells or fire altars. The Guildmaster lights each one by clicking it while the party is
// near. Light all three and a secret opens: a hidden cache, and a little more hold on the area.

export type SetKind = 'stones' | 'lanterns' | 'cairns' | 'bells' | 'altars';
export interface SetMarker { id: number; x: number; y: number; at: number; lit: boolean }
export interface FindSet { kind: SetKind; markers: SetMarker[]; opened: boolean }

export const SET_INFO: Record<SetKind, { one: string; secret: string }> = {
  stones: { one: 'Standing stone', secret: 'The three stones hummed together, and a door opened in the hillside behind them.' },
  lanterns: { one: 'Spirit lantern', secret: 'The three lanterns burned blue at once, and the mist drew back from a hidden hollow.' },
  cairns: { one: 'Old cairn', secret: "With the third cairn's stone in place, the rock face beside it slid open." },
  bells: { one: 'Tide bell', secret: 'The three bells rang one note, and the tide drew back from a sea cave.' },
  altars: { one: 'Fire altar', secret: "Three altars alight, the ground cracked open on a smugglers' vault." },
};

const SET_BY_BIOME: Partial<Record<Biome, SetKind>> = {
  plains: 'stones', hills: 'stones', barrow: 'stones', ruins: 'stones', sky: 'stones', farm: 'stones',
  forest: 'lanterns', marsh: 'lanterns', haunted: 'lanterns',
  mountain: 'cairns', snow: 'cairns',
  coast: 'bells', sea: 'bells',
  badlands: 'altars',
};

/** How close the party must be for a marker to be lit. */
export const SET_REACH = 520;

export function setupFindSet(sim: Sim, ctx: EncounterSetup) {
  const kind = SET_BY_BIOME[sim.region.biome];
  if (!kind || !sim.hand.includes('feat:set')) return;
  const markers: SetMarker[] = [0.2, 0.38, 0.56].map((f, i) => {
    const at = ctx.offSpur((f + sim.rng.range(-0.03, 0.03)) * ctx.mainSpan);
    const { p, dir } = pointAt(sim, at);
    const n = sideOf(dir);
    const side = sim.rng.pick([-1, 1]) * sim.rng.range(110, 150);
    return { id: i, x: p.x + n.x * side, y: p.y + n.y * side, at, lit: false };
  });
  sim.findSet = { kind, markers, opened: false };
}

/** The Guildmaster lights a marker (the party has to be near it). */
export function lightMarker(sim: Sim, id: number) {
  const set = sim.findSet;
  const m = set?.markers.find((x) => x.id === id);
  if (!set || !m || m.lit || set.opened || sim.phase === 'done' || dist(sim.leader, m) > SET_REACH) return;
  m.lit = true;
  const info = SET_INFO[set.kind];
  const lit = set.markers.filter((x) => x.lit).length;
  if (lit < set.markers.length) {
    log(sim, `The Guildmaster's sign: the party touched the ${info.one.toLowerCase()} (${lit} of ${set.markers.length}). It began to glow.`);
    return;
  }
  set.opened = true;
  log(sim, info.secret);
  const at = { x: m.x, y: m.y };
  const gold = giveGold(sim, Math.round(sim.rng.range(25, 35) * sim.region.tier), at);
  const mat = sim.rng.pick(BIOME_MATERIALS[sim.region.biome]);
  gain(sim, mat, 3);
  sim.holdBonus += 1;
  log(sim, `Inside: ${gold} gold and a heap of ${mat}. Word will get round that the guild knows this land's secrets (+1 hold).`);
}

// ---- Area stories (see data/stories) ----

export interface SimStory {
  /** The chapter this trip plays (1-3). */
  chapter: number;
  at: number;
  x: number;
  y: number;
  /** Chapter 1: the party met whoever asked. */
  met?: boolean;
  /** Chapters 2 and 3: the party has come in sight of it. */
  seen?: boolean;
  /** Chapters 2 and 3: the group to beat. */
  group?: number;
  done?: boolean;
}

export function setupStory(sim: Sim, ctx: EncounterSetup, chapter: number) {
  const fam = ENEMY_BY_ID[sim.region.enemyPool[0].id]?.family ?? '';
  const def = storyFor(fam);
  const at = ctx.offSpur((chapter === 1 ? 0.3 : chapter === 2 ? 0.45 : 0.55) * ctx.mainSpan);
  const { p, dir } = pointAt(sim, at);
  const n = sideOf(dir);
  const story: SimStory = { chapter, at, x: p.x, y: p.y };
  sim.story = story;
  if (chapter === 1) return;
  const pool = sim.region.enemyPool.filter((e) => ENEMY_BY_ID[e.id]?.family === fam);
  const gx = p.x + n.x * 90;
  const gy = p.y + n.y * 90;
  const g = newGroup(sim, gx, gy, fam);
  g.announced = true;
  g.enc = -1;
  const size = chapter === 2 ? sim.region.groupSize[1] + 1 : 2;
  for (let i = 0; i < size; i++) {
    const e = ENEMY_BY_ID[sim.rng.weighted(pool.map((x) => ({ weight: x.weight, value: x.id })))];
    monster(sim, e, gx + sim.rng.range(-50, 50), gy + sim.rng.range(-45, 45), g.id, 1, 1.5);
  }
  if (chapter === 3) {
    // The chief: the toughest of the family, three times over, with a name.
    const big = pool.map((x) => ENEMY_BY_ID[x.id]).reduce((a, b) => (b.hp > a.hp ? b : a));
    const chief = monster(sim, big, gx + n.x * 30, gy + n.y * 30, g.id, 3, 4);
    chief.atk *= 1.4;
    chief.name = def.chief.replace(/^the /, 'The ').replace(/,.*$/, '');
    chief.big = true;
    chief.boss = true;
  }
  story.group = g.id;
}

export function storyStep(sim: Sim) {
  const st = sim.story;
  if (!st || st.done) return;
  const def = storyFor(ENEMY_BY_ID[sim.region.enemyPool[0].id]?.family ?? '');
  if (st.chapter === 1) {
    if (!st.met && sim.phase === 'out' && sim.leaderDist >= st.at) {
      st.met = true;
      log(sim, def.plea);
      const cap = captain(sim);
      if (cap) sim.events.push({ t: 'shout', id: cap.id, text: 'We\'ll see to it.' });
    }
    return;
  }
  const g = sim.groups[st.group!];
  if (!st.seen && !g.cleared && sim.phase === 'out' && dist(sim.leader, g) < 330) {
    st.seen = true;
    log(sim, st.chapter === 2 ? `There it was: ${def.lookout}, just as the locals said.` : `${def.chief[0].toUpperCase()}${def.chief.slice(1)} was waiting, with guards.`);
  }
  if (g.cleared) {
    st.done = true;
    if (st.chapter === 2) log(sim, `${def.lookout[0].toUpperCase()}${def.lookout.slice(1)} is cleared. Whoever leads them will have heard.`);
    else {
      const gold = giveGold(sim, Math.round(sim.rng.range(40, 60) * sim.region.tier), g);
      log(sim, `${def.chief[0].toUpperCase()}${def.chief.slice(1)} is beaten. ${sim.region.name} will sing about this one: ${gold} gold from the chief's own chest.`);
    }
    sim.holdBonus += STORY_HOLD[st.chapter];
  }
}

/** Chapter 1 is done when the party comes home having met whoever asked. */
export function storyDone(sim: Sim): boolean {
  const st = sim.story;
  if (!st) return false;
  if (st.chapter === 1 && st.met && sim.outcome === 'returned' && !st.done) {
    st.done = true;
    sim.holdBonus += STORY_HOLD[1];
  }
  return !!st.done;
}

// ---- Trip goals ----
// Picked when sending the party, for a bonus: hunt a marked alpha, bring a lost traveller home, map the
// far end of the trail, or clear every group. Failing costs nothing but the time.

export const GOAL_INFO: Record<GoalKind, { name: string; text: string }> = {
  hunt: { name: 'Hunt the alpha', text: 'A marked brute runs with one of the groups. Bring it down for a bounty.' },
  rescue: { name: 'Rescue the traveller', text: 'Someone is lost out there. Find them and bring them home alive (+1 hold).' },
  map: { name: 'Map the far reaches', text: 'Press on into the last stretch of the trail (the party turns back later). Pays in pack pieces (+1 hold).' },
  clear: { name: 'Clear the area', text: 'Beat every monster group on the trail for a bounty from the town.' },
};

/** How far along the trail the far reaches start. */
export const MAP_REACH = 0.85;

export interface SimGoal {
  kind: GoalKind;
  done: boolean;
  /** Hunt: the alpha. Rescue: the traveller. */
  unit?: number;
  at?: number;
  met?: boolean;
  /** Rescue: the traveller fell on the way. */
  lost?: boolean;
}

export function setupGoal(sim: Sim, ctx: EncounterSetup, kind: GoalKind) {
  const goal: SimGoal = { kind, done: false };
  sim.goal = goal;
  if (kind === 'hunt') {
    // The alpha joins an ordinary group halfway along.
    const mid = ctx.trailGroups.map((id) => sim.groups[id]).filter((g) => g.enc === undefined && !g.held && !g.cleared)
      .sort((a, b) => Math.abs(a.x - pointAt(sim, ctx.offSpur(ctx.mainSpan * 0.5)).p.x) - Math.abs(b.x - pointAt(sim, ctx.offSpur(ctx.mainSpan * 0.5)).p.x))[0];
    if (!mid) return;
    const big = sim.region.enemyPool.map((x) => ENEMY_BY_ID[x.id]).reduce((a, b) => (b.hp > a.hp ? b : a));
    const alpha = monster(sim, big, mid.x + 30, mid.y - 20, mid.id, 2.5, 3);
    alpha.atk *= 1.3;
    alpha.name = `${big.name} Alpha`;
    alpha.big = true;
    goal.unit = alpha.id;
  } else if (kind === 'rescue') {
    const at = ctx.offSpur(0.55 * ctx.mainSpan);
    const { p, dir } = pointAt(sim, at);
    const n = sideOf(dir);
    const tier = tierScale(sim.region.tier);
    const x = p.x + n.x * 110;
    const y = p.y + n.y * 110;
    const who: Unit = {
      id: sim.nextId++, side: 'hero', key: 'traveller', name: 'The lost traveller', sprite: 'militia', role: 'brute', slot: -1, row: 'back',
      fx: -70, fy: 30, x, y, homeX: x, homeY: y, hp: 60 * tier, maxHp: 60 * tier, atk: 0, def: 2, heal: 0, range: 0, speed: 100,
      attackRate: 99, crit: 0, splash: 0, cd: 99, alive: true, targetId: null, group: -1, facing: 1, kills: 0, gold: 0, xp: 0,
      hesitate: 0, fleeing: 0, freed: true, structure: true, parked: true,
    };
    sim.units.push(who);
    goal.unit = who.id;
    goal.at = at;
  }
}

export function goalStep(sim: Sim) {
  const goal = sim.goal;
  if (!goal || goal.done) return;
  const u = goal.unit !== undefined ? unitById(sim, goal.unit) : undefined;
  if (goal.kind === 'hunt' && u && !u.alive) {
    goal.done = true;
    const gold = giveGold(sim, Math.round(sim.rng.range(25, 35) * sim.region.tier), u);
    sim.xp += 10 * sim.region.tier;
    log(sim, `The ${u.name} is down. The town will pay ${gold} gold for that hide.`);
  } else if (goal.kind === 'rescue' && u) {
    if (!goal.met && sim.phase === 'out' && dist(sim.leader, u) < 260) {
      goal.met = true;
      u.parked = false;
      log(sim, 'There: the lost traveller, cold and hungry but alive. They fell in behind the party.');
    }
    if (goal.met && !u.alive && !goal.lost) {
      goal.lost = true;
      log(sim, 'The traveller didn\'t make it. The party carried the news home instead.');
    }
  } else if (goal.kind === 'map' && sim.phase !== 'done' && sim.leaderDist >= sim.pathLen[sim.pathLen.length - 1] * MAP_REACH) {
    goal.done = true;
    addPieces(sim, 'recruit', 2, sim.leader);
    sim.holdBonus += 1;
    log(sim, 'The party pressed on into the far reaches of the trail and mapped every step of it.');
  }
}

/** Goals settled when the trip ends: the traveller brought home, every group cleared. */
export function goalFinish(sim: Sim) {
  const goal = sim.goal;
  if (!goal || goal.done) return;
  if (goal.kind === 'rescue') {
    const u = goal.unit !== undefined ? unitById(sim, goal.unit) : undefined;
    if (goal.met && u?.alive) {
      goal.done = true;
      const gold = Math.round(sim.rng.range(20, 30) * sim.region.tier);
      sim.gold += gold;
      sim.holdBonus += 1;
      u.gone = true;
      log(sim, `The traveller was home safe. Their family pressed ${gold} gold on the party.`);
    }
  } else if (goal.kind === 'clear') {
    const trail = sim.groups.filter((g) => g.forkId === undefined && g.enc === undefined);
    if (trail.length && trail.every((g) => g.cleared)) {
      goal.done = true;
      const gold = Math.round(sim.rng.range(30, 40) * sim.region.tier);
      sim.gold += gold;
      log(sim, `Every group on the trail beaten: the town paid a ${gold} gold bounty.`);
    }
  }
}

// ---- The night camp ----
// On longer trips the party makes camp around the middle of the trail: they sit round a fire for a
// while and talk (their personalities, fondness and grudges come out), and the Guildmaster or the
// Captain decides how they spend the evening (see NIGHT_CAMP and applyDiscovery).

export interface SimCamp { at: number; x: number; y: number; findId: number; until?: number; talked?: boolean }

/** How long the party sits by the fire. */
export const CAMP_SEC = 10;

export function setupCamp(sim: Sim, ctx: EncounterSetup) {
  if (ctx.durationSec < 240) return;
  const at = ctx.offSpur(0.42 * ctx.mainSpan);
  if (sim.encounters.some((e) => Math.abs(e.at - at) < 300)) return;
  const { p } = pointAt(sim, at);
  const findId = sim.finds.length;
  sim.finds.push({ id: findId, x: p.x, y: p.y, gold: 0, expires: Number.MAX_SAFE_INTEGER, taken: false, disc: 'nightcamp', at: at + 40, decided: null });
  sim.camp = { at, x: p.x, y: p.y, findId };
}

/** Round the fire. Returns true while the party is sitting there. */
export function campStep(sim: Sim): boolean {
  const c = sim.camp;
  if (!c || sim.phase !== 'out') return false;
  if (c.until === undefined) {
    if (sim.leaderDist < c.at || sim.inCombat) return false;
    c.until = sim.tick + CAMP_SEC * TPS;
    sim.pauseUntil = Math.max(sim.pauseUntil, c.until);
    log(sim, sim.time === 'night' ? 'They made camp under the stars, a little way off the trail.' : 'The light was going. They made camp by the trail.');
    return true;
  }
  if (sim.tick >= c.until) return false;
  // A few lines round the fire, a moment after they sit down.
  if (!c.talked && sim.tick >= c.until - (CAMP_SEC - 3) * TPS) {
    c.talked = true;
    for (const line of fireside(sim)) log(sim, line);
  }
  return true;
}

/** What gets said round the fire: fond friends, old grudges, and each personality's habits. */
function fireside(sim: Sim): string[] {
  const party = liveParty(sim);
  const lines: string[] = [];
  const name = (id?: string) => party.find((u) => u.defId === id)?.name;
  for (const u of party) {
    const friend = name(u.fondOf);
    if (friend) { lines.push(`${u.name} saved ${friend} the warm spot by the fire.`); break; }
  }
  const grudger = party.find((u) => u.grudge);
  if (grudger) lines.push(`${grudger.name} told the one about the ${grudger.grudge!.toLowerCase()} again. Nobody asked.`);
  const HABIT: Partial<Record<Personality, string>> = {
    greedy: 'counted the day\'s coins twice, then once more to be sure',
    cowardly: 'jumped at every owl',
    curious: 'asked what the stars were called, and kept asking',
    gloryhound: 'told everyone how the last fight really went',
    shy: 'said nothing at all, and seemed happy',
    protective: 'took the first watch without being asked',
    reckless: 'wanted to keep walking in the dark',
    steady: 'cooked, and it was good',
  };
  const seen = new Set<string>();
  const start = party.length ? sim.rng.int(0, party.length - 1) : 0;
  for (const u of [...party.slice(start), ...party.slice(0, start)]) {
    const habit = u.personality && HABIT[u.personality];
    if (!habit || seen.has(u.personality!)) continue;
    seen.add(u.personality!);
    lines.push(`${u.name} ${habit}.`);
    if (lines.length >= 3) break;
  }
  return lines.slice(0, 3);
}

/** Round the fire: a hero's place in the circle. */
export function campSeat(sim: Sim, u: Unit): Pt | null {
  const c = sim.camp;
  if (!c || c.until === undefined || sim.tick >= c.until) return null;
  const ring = sim.units.filter((x) => x.side === 'hero' && x.alive && !x.parked).sort((a, b) => a.id - b.id);
  const i = ring.indexOf(u);
  if (i < 0) return null;
  const a = (i / ring.length) * Math.PI * 2;
  return { x: c.x + Math.cos(a) * 70, y: c.y + 20 + Math.sin(a) * 45 };
}

// ---- The road ahead (the Watch screen's route map) ----
// What's coming up, in order, and where the Guildmaster can set a waypoint: take or skip a side path or
// a chest, charge or wait at a brawl, fight or pay the troll. Ambushes and thieves stay a surprise.

export interface RoadNode {
  key: string;
  at: number;
  icon: string;
  title: string;
  /** Set when there's a decision to make: what "take" and "skip" mean here. */
  choice?: { take: string; skip: string };
  /** Already decided (by whom it doesn't matter): no more waypoints. */
  decided?: boolean;
}

export function roadAhead(sim: Sim, max = 6): RoadNode[] {
  if (sim.phase !== 'out' || sim.siege) return [];
  const nodes: RoadNode[] = [];
  for (const f of sim.forks) {
    if (f.kind === 'hoard') {
      const c = sim.chests[f.chestId!];
      if (!c) continue;
      const title = c.story ? STORY_PLATE[c.story].title : CHEST_TITLE_SHORT[c.kind ?? 'chest'];
      nodes.push({ key: `fork:${f.id}`, at: f.at, icon: '✦', title: c.kind === 'crate' ? title : `${title} (guarded)`, choice: { take: 'Go for it', skip: 'Leave it' }, decided: f.decided != null });
    } else {
      nodes.push({ key: `fork:${f.id}`, at: f.at, icon: '↗', title: forkLabel(f).title, choice: { take: 'Take the path', skip: 'Keep to the road' }, decided: f.decided != null });
    }
  }
  for (const e of sim.encounters) {
    if (e.kind === 'brawl') nodes.push({ key: `enc:${e.id}`, at: e.at, icon: '⚔', title: 'A brawl between monsters', choice: { take: 'Charge in', skip: 'Wait it out' }, decided: e.state !== 'waiting' });
    else if (e.kind === 'bridge') nodes.push({ key: `enc:${e.id}`, at: e.at, icon: '≈', title: 'Troll bridge', choice: { take: 'Fight', skip: 'Pay the toll' }, decided: e.state !== 'waiting' });
    else if (e.kind === 'escort') nodes.push({ key: `enc:${e.id}`, at: e.at, icon: '⚐', title: 'A merchant\'s wagon' });
    else if (e.kind === 'nest') nodes.push({ key: `enc:${e.id}`, at: e.at - 250, icon: '✸', title: 'A nest by the trail' });
  }
  for (const f of sim.finds) if (f.disc && f.disc !== 'nightcamp' && f.at !== undefined) nodes.push({ key: `disc:${f.id}`, at: f.at - 40, icon: '✧', title: DISCOVERY_BY_ID[f.disc]?.name ?? 'A discovery' });
  for (const lm of sim.landmarks) nodes.push({ key: `lm:${lm.id}`, at: lm.at, icon: '⌂', title: LANDMARK_BY_ID[lm.key]?.name ?? 'A landmark' });
  for (const hz of sim.hazards) nodes.push({ key: `hz:${hz.from}`, at: hz.from, icon: '⚠', title: HAZARDS[hz.kind].name });
  for (const b of sim.ropeBridges) nodes.push({ key: `rope:${b.from}`, at: b.from, icon: '≍', title: 'Rope bridge' });
  if (sim.camp) nodes.push({ key: 'camp', at: sim.camp.at, icon: '☾', title: 'Night camp' });
  if (sim.relic && !sim.relic.passed) nodes.push({ key: 'relic', at: sim.relic.at, icon: '✺', title: 'Shrine of the Old Gods (rare)' });
  for (const c of sim.chests) {
    if (!c.lead || c.lead === 'A crypt alcove' || c.taken) continue;
    // Roadside chests are picked up as the party walks by: list it where it lies along the trail.
    let best = 0;
    let bestD = Infinity;
    for (let d = 0; d < sim.pathLen[sim.pathLen.length - 1]; d += 40) {
      const p = pointAt(sim, d).p;
      const q = Math.hypot(p.x - c.x, p.y - c.y);
      if (q < bestD) { bestD = q; best = d; }
    }
    nodes.push({ key: `chest:${c.id}`, at: best, icon: '♛', title: 'The Lost Caravan (rare)' });
  }
  if (sim.findSet) for (const m of sim.findSet.markers) nodes.push({ key: `set:${m.id}`, at: m.at, icon: '◈', title: `${SET_INFO[sim.findSet.kind].one} (${m.id + 1} of 3)` });
  if (sim.story && sim.story.chapter > 1) nodes.push({ key: 'story', at: sim.story.at, icon: '★', title: storyFor(ENEMY_BY_ID[sim.region.enemyPool[0].id]?.family ?? '').titles[sim.story.chapter - 1] });
  if (sim.goal?.kind === 'rescue' && sim.goal.at !== undefined) nodes.push({ key: 'goal', at: sim.goal.at, icon: '♥', title: 'The lost traveller' });
  if (sim.goal?.kind === 'map') nodes.push({ key: 'goal', at: sim.pathLen[sim.pathLen.length - 1] * MAP_REACH, icon: '⚑', title: 'The far reaches' });
  // A dungeon: its mouth, then its rooms.
  if (sim.delve) {
    const d = sim.delve;
    const ROOM_NAME: Record<string, [string, string]> = { hall: ['▥', 'The entry hall'], traps: ['⚠', 'The trap corridor'], door: ['▮', 'A locked door (the lever opens it)'], crypt: ['✝', 'The crypt'], warden: ['♜', "The Warden's hall"] };
    if (!d.inside) nodes.push({ key: 'delve:mouth', at: d.jumpFrom - 1, icon: '⛫', title: 'The way down' });
    for (const r of d.rooms) nodes.push({ key: `delve:${r.kind}`, at: r.kind === 'hall' ? r.from + 1 : r.from, icon: ROOM_NAME[r.kind][0], title: ROOM_NAME[r.kind][1] });
  }
  return nodes.filter((n) => n.at >= sim.leaderDist - 10).sort((a, b) => a.at - b.at).slice(0, max);
}

const CHEST_TITLE_SHORT: Record<string, string> = { crate: 'A crate', chest: 'An iron-bound chest', strongbox: 'A locked strongbox', ornate: 'An ornate chest' };

// ---- Rare cards (see core/deck) ----
// The White Stag runs from the party: bring it down before it is gone. The Lost Caravan is a rich
// wreck by the road, with an item for sure. The Shrine of the Old Gods heals the party and blesses the
// rest of the trip (+20% gold and experience).

export function setupRares(sim: Sim, ctx: EncounterSetup) {
  const spot = (frac: number, side: number) => {
    const at = ctx.offSpur(frac * ctx.mainSpan);
    const { p, dir } = pointAt(sim, at);
    const n = sideOf(dir);
    const s = sim.rng.pick([-1, 1]) * side;
    return { at, x: p.x + n.x * s, y: p.y + n.y * s };
  };
  if (sim.hand.includes('rare:stag')) {
    const q = spot(sim.rng.range(0.3, 0.5), 170);
    const g = newGroup(sim, q.x, q.y, 'Beasts');
    Object.assign(g, { held: true, announced: true, enc: -2 });
    const stag = monster(sim, ENEMY_BY_ID.stag, q.x, q.y, g.id);
    stag.flees = true;
  }
  if (sim.hand.includes('rare:caravan')) {
    const q = spot(sim.rng.range(0.35, 0.55), 120);
    sim.chests.push({ id: sim.chests.length, x: q.x, y: q.y, gold: Math.round(sim.rng.range(30, 40) * sim.region.tier), taken: false, kind: 'ornate', lead: 'The Lost Caravan, half-buried by the road', itemBonus: 1 });
  }
  if (sim.hand.includes('rare:shrine')) {
    const q = spot(sim.rng.range(0.25, 0.4), 150);
    sim.relic = { x: q.x, y: q.y, at: q.at, passed: false };
  }
}

/** The White Stag: still until the party is near, then it runs; bring it down before it's gone. */
export function stagStep(sim: Sim) {
  for (const u of sim.units) {
    if (!u.flees) continue;
    const g = sim.groups[u.group];
    if (!u.alive) {
      if (!g.cleared || u.gone) continue;
      if (u.prized) continue;
      u.prized = true;
      const who = g.lastKiller ?? 'The party';
      const gold = giveGold(sim, Math.round(sim.rng.range(20, 30) * sim.region.tier), u);
      addPieces(sim, 'veteran', 1, u);
      sim.morale = Math.min(100, sim.morale + 10);
      log(sim, `${who} brought down the White Stag. The whole road will hear of it: ${gold} gold for the antlers alone, and a pack piece from a collector.`);
      continue;
    }
    if (u.gone) continue;
    if (!g.active) {
      if (sim.phase === 'out' && dist(sim.leader, u) < 300) {
        g.held = false;
        g.active = true;
        log(sim, 'A white stag stood among the trees, watching the party. Then it ran.');
        const cap = captain(sim);
        if (cap) sim.events.push({ t: 'shout', id: cap.id, text: 'The White Stag!' });
      }
      continue;
    }
    const dx = u.x - sim.leader.x;
    const dy = u.y - sim.leader.y;
    const d = Math.hypot(dx, dy) || 1;
    moveToward(u, u.x + (dx / d) * 100, u.y + (dy / d) * 100);
    if (d > 750) {
      u.alive = false;
      u.gone = true;
      g.active = false;
      g.cleared = true;
      log(sim, 'The White Stag was gone. Some say it can\'t be caught at all.');
    }
  }
}

/** Shrine of the Old Gods: passing it heals the party and blesses the rest of the trip. */
export function relicStep(sim: Sim) {
  const r = sim.relic!;
  if (sim.phase !== 'out' || sim.leaderDist < r.at) return;
  r.passed = true;
  for (const u of liveParty(sim)) u.hp = u.maxHp;
  sim.goldMult *= 1.2;
  sim.xpBonus = (sim.xpBonus ?? 1) * 1.2;
  log(sim, 'A shrine to the old gods, older than the guild, older than Greyford. The party knelt; wounds closed, and something like luck settled on them for the rest of the trip (+20% gold and experience).');
}
