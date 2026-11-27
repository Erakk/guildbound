// Large battles. A siege runs in stages on top of the normal expedition. Three kinds so far:
//
// Goblin Fortress and Bandit King's Hold (a fortress):
//   1. Approach: the trail has enemy camps on side paths. Every camp cleared means fewer waves later.
//   2. Breach:   the party breaks the gate while archers shoot from the towers.
//   3. The horde: waves pour out of the courtyard through the broken gate. The party holds the
//                gateway, so the enemies bunch up in the gap: a good place for a Fireball.
//                (Bandit King's Hold: cages in the courtyard hold captives. Break a cage, or click
//                the prison key, and the captives fight on the party's side.)
//   4. The keep: the boss and their guard.
//
// Barrow Uprising (an open barrow field):
//   1. Approach as above.
//   2. The rising: four tombs keep raising the dead until the party breaks their seals.
//   3. The king: with every tomb sealed, the Barrow King rises from the great mound.
//
// Cinder Legion (a burning plain):
//   1. Approach as above.
//   2. The legion: waves march in while fire fissures open and the burning ground spreads.
//      Heroes standing in fire burn (Ashborn walk through it); fire creatures heal in it.
//      Frost Nova and the water cisterns put fires out.
//   3. The Cinder Lord, who throws more fire around himself when hurt.
//
// Then the aftermath: the vault, and the place lies quiet (razed) for a while.
//
// A fortress is a wall (a vertical line) with one gate. Nobody crosses the wall except through
// the gateway once the gate is down; units on the wrong side are routed through it.

import { LOOT_ITEMS } from '../data/items';
import { HERO_BY_ID } from '../data/heroes';
import { ENEMY_BY_ID, tierScale } from '../data/world';
import type { EnemyDef, SiegeKind } from '../types';
import { ITEM_BY_ID, NAMED_ITEMS } from '../data/items';
import { activateGroup, addPieces, damage, log, once, pieceName, TPS, type EnemyGroup, type Pt, type Sim, type Unit } from './expedition';

export type { SiegeKind };
export type SiegeStage = 'approach' | 'breach' | 'horde' | 'keep' | 'won';

export interface Fortress {
  wallX: number;
  gateY: number;
  /** Half the width of the gateway. */
  gateHalf: number;
  top: number;
  bottom: number;
  keep: Pt;
  towers: Pt[];
  /** The gate is down: the gateway can be crossed. */
  open: boolean;
}

export interface SiegeState {
  kind: SiegeKind;
  stage: SiegeStage;
  /** The fortress (null for the barrow field, which has no walls). */
  fort: Fortress | null;
  /** The barrow field's centre and the great mound. */
  field: Pt | null;
  mound: Pt | null;
  gateId: number;
  bossId: number;
  wallsGroup: number;
  keepGroup: number;
  /** Barrow Uprising: the tombs. Bandit King's Hold: the cages. */
  tombs: number[];
  cages: number[];
  extraGroup: number;
  wavesTotal: number;
  wavesSent: number;
  nextWaveTick: number;
  campsCleared: number;
  hordeDefeated: number;
  freed: number;
  /** Where the party forms up during the siege (null: follow the trail). */
  anchor: Pt | null;
  enraged: boolean;
  /** Cinder Legion: patches of burning ground (they grow, and new ones spread from them). Dragonmaw: breath scorch. */
  fires: Fire[];
  nextFireTick: number;
  doused: number;
  /** Siege of Dragonmaw: dragon breath about to land (shown on the ground first), and ballista hits on the wyrm. */
  breaths: Breath[];
  bolts: number;
}

/** Burning ground. `until`: the tick it burns out (dragon breath); spreading fire has none. */
export interface Fire { x: number; y: number; r: number; max: number; until?: number }
/** Dragon breath: lands on (x, y) at tick `at`; warned from tick `from`. */
export interface Breath { x: number; y: number; r: number; at: number; from: number }

/** What makes each fortress its own. */
interface FortressDef {
  name: string;
  family: string;
  archer: string;
  boss: string;
  guards: [string, number][];
  wave: [string, number][];
  waveSize: number;
  baseWaves: number;
  cages: number;
  approach: string;
  enrage: string;
}

const FORTRESSES: Record<'goblin_fortress' | 'bandit_hold', FortressDef> = {
  goblin_fortress: {
    name: "Gnashgut's Fortress", family: 'Goblins', archer: 'goblin_archer', boss: 'warlord', guards: [['ironguard', 1], ['ironguard', 1]],
    wave: [['goblin_spear', 6], ['goblin_archer', 2], ['wolf_rider', 2], ['goblin_bomber', 1], ['goblin_shaman', 1]], waveSize: 14, baseWaves: 7, cages: 0,
    approach: 'Somewhere ahead: Gnashgut\'s Fortress. Scouts counted about a hundred goblins.',
    enrage: 'Gnashgut roared and threw his shield away. He fights faster now.',
  },
  bandit_hold: {
    name: "the Bandit King's Hold", family: 'Bandits', archer: 'bandit_xbow', boss: 'bandit_king', guards: [['bandit', 2.2], ['bandit', 2.2]],
    wave: [['bandit', 5], ['bandit_xbow', 2], ['boar', 2], ['dire_wolf', 2]], waveSize: 12, baseWaves: 6, cages: 3,
    approach: 'Somewhere ahead: the Bandit King\'s Hold. Word is he keeps prisoners for ransom.',
    enrage: 'The Bandit King kicked over a brazier and laughed. "Is that all?" He fights faster now.',
  },
};

const RISEN: [string, number][] = [['skeleton', 5], ['ghoul', 3], ['wraith', 2]];
const TOMB_NAMES = ['north-west', 'north-east', 'south-west', 'south-east'];

/** Most horde enemies alive at once before the next wave waits. */
const HORDE_CAP = 70;
/** Horde enemies are rabble: weaker than the same enemy met in the wild. */
const HORDE_HP = 0.6;
const HORDE_ATK = 0.22;
/** Seconds between waves. */
const WAVE_GAP = 5;
/** Archers shooting down from the towers. */
const TOWER_ATK = 0.6;
/** How far heroes leave the gateway to chase enemies during the horde. */
const HOLD = 210;
/** Barrow Uprising: seconds between risings, and the risen alive at once. */
const RISE_GAP = 8;
const RISEN_CAP = 28;

export function setupSiege(sim: Sim) {
  const kind = sim.region.siege!;
  if (kind === 'barrow_uprising') setupBarrow(sim);
  else if (kind === 'cinder_legion') setupCinder(sim);
  else if (kind === 'dragonmaw') setupDragonmaw(sim);
  else setupFortress(sim, kind);
}

function baseState(kind: SiegeKind): SiegeState {
  return {
    kind, stage: 'approach', fort: null, field: null, mound: null, gateId: -1, bossId: -1, wallsGroup: -1, keepGroup: -1,
    tombs: [], cages: [], extraGroup: -1, wavesTotal: 0, wavesSent: 0, nextWaveTick: 0, campsCleared: 0, hordeDefeated: 0, freed: 0,
    anchor: null, enraged: false, fires: [], nextFireTick: 0, doused: 0, breaths: [], bolts: 0,
  };
}

/** A fortress at the end of the trail: gate, tower archers, the keep (and cages in the courtyard). */
function setupFortress(sim: Sim, kind: 'goblin_fortress' | 'bandit_hold') {
  const def = FORTRESSES[kind];
  const end = sim.path[sim.path.length - 1];
  const wallX = end.x + 170;
  const gateY = end.y;
  const fort: Fortress = {
    wallX, gateY, gateHalf: 48, top: gateY - 430, bottom: gateY + 430,
    keep: { x: wallX + 620, y: gateY }, open: false,
    towers: [-290, -150, 150, 290].map((dy) => ({ x: wallX + 16, y: gateY + dy })),
  };
  sim.width = wallX + 950;
  const sg = baseState(kind);
  sg.fort = fort;
  sg.wavesTotal = def.baseWaves;
  const walls = newGroup(sim, wallX, gateY, false, def.family);
  sg.wallsGroup = walls.id;
  sg.gateId = enemy(sim, ENEMY_BY_ID.gate, wallX, gateY, walls.id, 1, 1).id;
  for (const t of fort.towers) enemy(sim, ENEMY_BY_ID[def.archer], t.x, t.y, walls.id, 1, TOWER_ATK).fixed = true;
  // Two more archers on the gatehouse.
  for (const dy of [-70, 70]) enemy(sim, ENEMY_BY_ID[def.archer], wallX + 22, gateY + dy, walls.id, 1, TOWER_ATK).fixed = true;
  const keep = newGroup(sim, fort.keep.x, fort.keep.y, false, def.family);
  sg.keepGroup = keep.id;
  sg.bossId = enemy(sim, ENEMY_BY_ID[def.boss], fort.keep.x, fort.keep.y, keep.id, 1, 1).id;
  def.guards.forEach(([id, hp], i) => enemy(sim, ENEMY_BY_ID[id], fort.keep.x - 60, fort.keep.y + (i ? 70 : -70), keep.id, hp, 1));
  if (def.cages) {
    // The cages wake up (become targets) when the gate falls.
    const cages = newGroup(sim, wallX + 300, gateY, false, def.family);
    cages.announced = true; // cages are announced by the siege, not as an ambush
    sg.extraGroup = cages.id;
    for (const [dx, dy] of [[250, -190], [250, 190], [430, 0]].slice(0, def.cages)) sg.cages.push(enemy(sim, ENEMY_BY_ID.cage, wallX + dx, gateY + dy, cages.id, 1, 1).id);
  }
  sim.siege = sg;
  log(sim, def.approach);
}

/** The barrow field at the end of the trail: four tombs around it, the great mound beyond. */
function setupBarrow(sim: Sim) {
  const end = sim.path[sim.path.length - 1];
  const field = { x: end.x + 430, y: end.y };
  const mound = { x: field.x + 400, y: field.y };
  sim.width = mound.x + 500;
  const sg = baseState('barrow_uprising');
  sg.field = field;
  sg.mound = mound;
  const tombs = newGroup(sim, field.x, field.y, false, 'Undead');
  sg.wallsGroup = tombs.id;
  tombs.announced = true; // the tombs are the goal, not an ambush
  for (const [dx, dy] of [[-130, -230], [190, -210], [-130, 230], [190, 210]]) sg.tombs.push(enemy(sim, ENEMY_BY_ID.tomb, field.x + dx, field.y + dy, tombs.id, 1, 1).id);
  sim.siege = sg;
  log(sim, 'Somewhere ahead: the old barrow field. The ground has been heaving for days, and the tombs are open.');
}

/** The burning plain at the end of the trail; the Cinder Lord's spire beyond it. */
function setupCinder(sim: Sim) {
  const end = sim.path[sim.path.length - 1];
  const field = { x: end.x + 430, y: end.y };
  const mound = { x: field.x + 440, y: field.y };
  sim.width = mound.x + 500;
  const sg = baseState('cinder_legion');
  sg.field = field;
  sg.mound = mound;
  sg.wavesTotal = CINDER_WAVES;
  sim.siege = sg;
  log(sim, 'Somewhere ahead: the Cinder Legion\'s camp. The horizon glows, and the ground smokes.');
}

const CINDER_WAVES = 7;
const CINDER_WAVE: [string, number][] = [['imp', 3], ['magma_hound', 2], ['fire_elemental', 2], ['ash_goblin', 3]];
/** Burning ground: share of health lost per second standing in it, and how it spreads. */
const BURN = 0.018;
const FIRE_GAP = 9;
const FIRE_GROW = 5;
const MAX_FIRES = 16;

function cinderStep(sim: Sim) {
  const sg = sim.siege!;
  const field = sg.field!;
  switch (sg.stage) {
    case 'approach':
      if (partyMembers(sim).some((h) => Math.hypot(h.x - field.x, h.y - field.y) < 520)) {
        sg.stage = 'horde';
        sg.anchor = { x: field.x - 120, y: field.y };
        sg.campsCleared = sim.forks.filter((k) => sim.groups.some((g) => g.forkId === k.id && g.cleared)).length;
        sg.wavesTotal = Math.max(3, CINDER_WAVES - 2 * sg.campsCleared);
        sg.nextWaveTick = sim.tick + 3 * TPS;
        sg.nextFireTick = sim.tick + FIRE_GAP * TPS;
        for (const [dx, dy] of [[80, -160], [160, 120], [-20, 40]]) sg.fires.push({ x: field.x + dx, y: field.y + dy, r: 30, max: sim.rng.range(90, 130) });
        for (const [dx, dy] of [[-170, -150], [-170, 150]]) addFind(sim, field.x + dx, field.y + dy, 300, 'water');
        log(sim, `The ground cracked open and fire poured out. ${sg.wavesTotal} ranks of the Cinder Legion marched through the smoke. Ashborn walk through fire; everyone else had better not stand in it.`);
      }
      break;
    case 'horde': {
      const alive = sim.units.filter((u) => u.horde && u.alive).length;
      if (sg.wavesSent < sg.wavesTotal && sim.tick >= sg.nextWaveTick && alive < HORDE_CAP) {
        legionWave(sim);
        sg.nextWaveTick = sim.tick + 6 * TPS;
      }
      if (sg.wavesSent >= sg.wavesTotal && alive === 0) {
        sg.stage = 'keep';
        const lord = sg.mound!;
        const keep = newGroup(sim, lord.x, lord.y, true, 'Fire and ash');
        sg.keepGroup = keep.id;
        sg.bossId = enemy(sim, ENEMY_BY_ID.cinder_lord, lord.x, lord.y, keep.id, 1, 1).id;
        for (const dy of [-80, 80]) enemy(sim, ENEMY_BY_ID.fire_elemental, lord.x - 50, lord.y + dy, keep.id, 1, 0.9);
        sg.anchor = { x: lord.x - 200, y: lord.y };
        healUp(sim);
        addFind(sim, lord.x - 260, lord.y + 130, 240, 'water');
        log(sim, 'The legion broke. From the black spire stepped the Cinder Lord himself, and the air began to burn.');
      }
      break;
    }
    case 'keep':
      if (!unit(sim, sg.bossId).alive && !sim.units.some((u) => u.group === sg.keepGroup && u.alive)) win(sim);
      break;
  }
  spreadFire(sim);
}

function legionWave(sim: Sim) {
  const sg = sim.siege!;
  const field = sg.field!;
  sg.wavesSent += 1;
  const g = newGroup(sim, field.x, field.y, true, 'Fire and ash');
  g.horde = true;
  const cx = field.x + sim.rng.range(380, 480);
  for (let i = 0; i < 10; i++) {
    const id = sim.rng.weighted(CINDER_WAVE.map(([value, weight]) => ({ value, weight })));
    const u = enemy(sim, ENEMY_BY_ID[id], cx + sim.rng.range(-60, 60), field.y + sim.rng.range(-240, 240), g.id, 0.6, 0.26);
    u.horde = true;
    u.homeX = field.x;
    u.homeY = field.y;
  }
  log(sim, sg.wavesSent === sg.wavesTotal ? 'The last rank of the legion marched out of the smoke.' : `Rank ${sg.wavesSent} of ${sg.wavesTotal} marched in.`);
}

/** Fires grow, new ones catch next to old ones, heroes burn and fire creatures heal. */
function spreadFire(sim: Sim) {
  const sg = sim.siege!;
  if (sg.stage === 'approach' || sg.stage === 'won') return;
  sg.fires = sg.fires.filter((f) => f.until === undefined || sim.tick < f.until);
  const spreads = sg.kind === 'cinder_legion';
  if (spreads) for (const f of sg.fires) f.r = Math.min(f.max, f.r + FIRE_GROW * (1 / TPS));
  if (spreads && sim.tick >= sg.nextFireTick && sg.fires.length && sg.fires.length < MAX_FIRES) {
    const from = sim.rng.pick(sg.fires);
    const a = sim.rng.range(0, Math.PI * 2);
    const d = sim.rng.range(120, 190);
    sg.fires.push({ x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d, r: 25, max: sim.rng.range(80, 130) });
    sg.nextFireTick = sim.tick + FIRE_GAP * TPS;
  }
  const burning = (u: Unit) => sg.fires.some((f) => Math.hypot(u.x - f.x, u.y - f.y) < f.r);
  for (const u of sim.units) {
    if (!u.alive || u.structure || !burning(u)) continue;
    if (u.side === 'enemy') {
      if (u.family === 'Fire and ash') u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.01 / TPS);
      continue;
    }
    if (u.defId && HERO_BY_ID[u.defId]?.tribe === 'ashborn') continue; // they walk through fire
    u.hp -= (u.maxHp * BURN) / TPS;
    if (sim.tick % TPS === 0) sim.events.push({ t: 'hit', x: u.x, y: u.y - 30, amount: Math.round(u.maxHp * BURN), crit: false, onHero: true });
    if (u.hp <= 0) {
      u.hp = 1;
      damage(sim, null, u, 1e9, false);
    }
    if (u.side === 'hero' && !u.pet && !u.minion && !u.freed) {
      // At Dragonmaw the whole party ends up in the scorch sooner or later: one line for all of them.
      if (sg.kind === 'dragonmaw') once(sim, 'burn-scorch', 'Where the breath lands, the ground keeps burning. Anyone standing in the scorch catches fire (Ashborn excepted).', u, 'Hot!');
      else once(sim, `burn-${u.id}`, `${u.name} stepped into the burning ground and caught fire!`, u, 'Hot!');
    }
  }
}

// ---- The Siege of Dragonmaw: altars, the brood under a circling dragon, then the Elder Wyrm ----

const ALTAR_NAMES = ['north', 'east', 'south'];
/** Altars summon every few seconds, up to this many cultists at once. */
const ALTAR_GAP = 8;
const SUMMONED_CAP = 22;
const SUMMONED: [string, number][] = [['cultist', 4], ['wyrmling', 1]];
const BROOD: [string, number][] = [['drake', 3], ['wyrmling', 3], ['cultist', 2]];
const BROOD_WAVES = 6;
/** Dragon breath from above: every few seconds, warned on the ground first, a share of each hero's health. */
const BREATH_GAP = 10;
export const BREATH_WARN = 2.2;
const BREATH_R = 110;
const BREATH_HIT = 0.2;
const BREATH_BURN_SEC = 14;
/** Each ballista bolt that hits her takes this share off the Elder Wyrm's health when she lands (up to three count). */
const BOLT_CUT = 0.12;
const MAX_BOLTS = 3;
const WYRM_SHARDS = 3;

/** The foot of Dragonmaw: three blood altars on the field, the wyrm's cave beyond. */
function setupDragonmaw(sim: Sim) {
  const end = sim.path[sim.path.length - 1];
  const field = { x: end.x + 430, y: end.y };
  const mound = { x: field.x + 470, y: field.y };
  sim.width = mound.x + 520;
  const sg = baseState('dragonmaw');
  sg.field = field;
  sg.mound = mound;
  sg.wavesTotal = BROOD_WAVES;
  const altars = newGroup(sim, field.x, field.y, false, 'Cultists');
  sg.wallsGroup = altars.id;
  altars.announced = true; // the altars are the goal, not an ambush
  for (const [dx, dy] of [[-40, -220], [210, 0], [-40, 220]]) sg.tombs.push(enemy(sim, ENEMY_BY_ID.altar, field.x + dx, field.y + dy, altars.id, 1, 1).id);
  sim.siege = sg;
  log(sim, 'Somewhere ahead: Dragonmaw itself, the mountain the dragons come from. Cultists chant at its foot, and something vast sleeps inside.');
}

function dragonStep(sim: Sim) {
  const sg = sim.siege!;
  const field = sg.field!;
  switch (sg.stage) {
    case 'approach':
      if (partyMembers(sim).some((h) => Math.hypot(h.x - field.x, h.y - field.y) < 500)) {
        sg.stage = 'breach';
        sg.anchor = { ...field };
        activateGroup(sim, sg.wallsGroup);
        sg.campsCleared = sim.forks.filter((k) => sim.groups.some((g) => g.forkId === k.id && g.cleared)).length;
        sg.wavesTotal = Math.max(3, BROOD_WAVES - 2 * sg.campsCleared);
        sg.nextWaveTick = sim.tick + 2 * TPS;
        for (const [dx, dy] of [[-190, -230], [-190, 230]]) addFind(sim, field.x + dx, field.y + dy, 900, 'ballista');
        log(sim, 'The cultists saw the party coming. Blood fire leapt up on three altars and the chanting rose. Break the altars before the whole mountain wakes!');
      }
      break;
    case 'breach': {
      const lit = sg.tombs.map((id) => unit(sim, id)).filter((t) => t.alive);
      const summoned = sim.units.filter((u) => u.horde && u.alive).length;
      if (lit.length && sim.tick >= sg.nextWaveTick && summoned < SUMMONED_CAP) {
        for (const t of lit) summon(sim, t);
        sg.nextWaveTick = sim.tick + ALTAR_GAP * TPS;
      }
      if (!lit.length && summoned === 0) {
        sg.stage = 'horde';
        sg.anchor = { x: field.x + 60, y: field.y };
        sg.nextWaveTick = sim.tick + 3 * TPS;
        sg.nextFireTick = sim.tick + 5 * TPS;
        healUp(sim);
        log(sim, `The last altar shattered. A roar shook the mountain: ${sg.wavesTotal} waves of the brood are coming down the slopes, and their mother circles above.`);
      }
      break;
    }
    case 'horde': {
      const alive = sim.units.filter((u) => u.horde && u.alive).length;
      if (sg.wavesSent < sg.wavesTotal && sim.tick >= sg.nextWaveTick && alive < HORDE_CAP) {
        broodWave(sim);
        sg.nextWaveTick = sim.tick + 7 * TPS;
      }
      // She breathes fire from above.
      if (sim.tick >= sg.nextFireTick) {
        const targets = partyMembers(sim);
        if (targets.length) {
          const t = sim.rng.pick(targets);
          sg.breaths.push({ x: t.x, y: t.y, r: BREATH_R, at: sim.tick + BREATH_WARN * TPS, from: sim.tick });
          once(sim, 'breath', 'A vast shadow swept over the field: the Elder Wyrm, breathing fire from the sky! Click the ballistas to shoot at her.', t, 'Look out!');
        }
        sg.nextFireTick = sim.tick + BREATH_GAP * TPS;
      }
      if (sg.wavesSent >= sg.wavesTotal && alive === 0) {
        sg.stage = 'keep';
        const cave = sg.mound!;
        const keep = newGroup(sim, cave.x, cave.y, true, 'Dragonkin');
        sg.keepGroup = keep.id;
        const bolts = Math.min(MAX_BOLTS, sg.bolts);
        sg.bossId = enemy(sim, ENEMY_BY_ID.elder_wyrm, cave.x, cave.y, keep.id, 1 - BOLT_CUT * bolts, 1).id;
        for (const dy of [-90, 90]) enemy(sim, ENEMY_BY_ID.drake, cave.x - 60, cave.y + dy, keep.id, 1, 0.8);
        sg.anchor = { x: cave.x - 210, y: cave.y };
        healUp(sim);
        addFind(sim, cave.x - 300, cave.y - 160, 400, 'ballista');
        log(sim, `The brood lay broken. With a sound like a landslide, the Elder Wyrm came down in front of her cave${bolts ? `, ${bolts === 1 ? 'a ballista bolt' : `${bolts} ballista bolts`} still in her hide` : ''}.`);
      }
      break;
    }
    case 'keep':
      if (!unit(sim, sg.bossId).alive && !sim.units.some((u) => u.group === sg.keepGroup && u.alive)) win(sim);
      break;
  }
  breathStep(sim);
  sg.tombs.forEach((id, i) => {
    const t = unit(sim, id);
    if (!t.alive && !t.horde) {
      t.horde = true; // marks it as handled
      const left = sg.tombs.filter((x) => unit(sim, x).alive).length;
      log(sim, `The ${ALTAR_NAMES[i]} altar cracked and its fire went out.${left ? ` ${left} still burning.` : ''}`);
    }
  });
  spreadFire(sim);
}

/** Cultists (and the odd wyrmling) answer an altar's call. */
function summon(sim: Sim, altar: Unit) {
  const g = newGroup(sim, altar.x, altar.y, true, 'Cultists');
  g.horde = true;
  const n = sim.rng.chance(0.5) ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const id = sim.rng.weighted(SUMMONED.map(([value, weight]) => ({ value, weight })));
    const u = enemy(sim, ENEMY_BY_ID[id], altar.x + sim.rng.range(-40, 40), altar.y + sim.rng.range(-30, 30), g.id, 0.7, 0.26);
    u.horde = true;
  }
}

function broodWave(sim: Sim) {
  const sg = sim.siege!;
  const field = sg.field!;
  sg.wavesSent += 1;
  const g = newGroup(sim, field.x, field.y, true, 'Dragonkin');
  g.horde = true;
  const cx = field.x + sim.rng.range(380, 480);
  for (let i = 0; i < 8; i++) {
    const id = sim.rng.weighted(BROOD.map(([value, weight]) => ({ value, weight })));
    const u = enemy(sim, ENEMY_BY_ID[id], cx + sim.rng.range(-60, 60), field.y + sim.rng.range(-240, 240), g.id, 0.6, 0.26);
    u.horde = true;
    u.homeX = field.x;
    u.homeY = field.y;
  }
  log(sim, sg.wavesSent === sg.wavesTotal ? 'The last of the brood came down the mountain.' : `Wave ${sg.wavesSent} of ${sg.wavesTotal}: drakes and wyrmlings poured down the slopes.`);
}

/** Breath lands where it was warned: fire on everyone under it, and scorched ground that burns a while. */
function breathStep(sim: Sim) {
  const sg = sim.siege!;
  if (!sg.breaths.length) return;
  const landing = sg.breaths.filter((b) => sim.tick >= b.at);
  if (!landing.length) return;
  sg.breaths = sg.breaths.filter((b) => sim.tick < b.at);
  for (const b of landing) {
    sim.events.push({ t: 'spell', spell: 'fireball', x: b.x, y: b.y, r: b.r });
    sg.fires.push({ x: b.x, y: b.y, r: b.r * 0.75, max: b.r * 0.75, until: sim.tick + BREATH_BURN_SEC * TPS });
    for (const u of sim.units) {
      if (u.side !== 'hero' || !u.alive || Math.hypot(u.x - b.x, u.y - b.y) > b.r) continue;
      const ashborn = !!u.defId && HERO_BY_ID[u.defId]?.tribe === 'ashborn';
      const hit = u.maxHp * BREATH_HIT * (ashborn ? 0.5 : 1);
      u.hp -= hit;
      sim.events.push({ t: 'hit', x: u.x, y: u.y - 30, amount: Math.round(hit), crit: true, onHero: true });
      if (u.hp <= 0) {
        u.hp = 1;
        damage(sim, null, u, 1e9, false);
      }
    }
  }
}

/** A ballista bolt into the dragon: it hurts her when she lands (or now, if she already has), and she breaks off her next pass. */
export function fireBallista(sim: Sim, at: Pt) {
  const sg = sim.siege;
  if (!sg || sg.kind !== 'dragonmaw') return;
  sim.events.push({ t: 'spell', spell: 'lightning', x: at.x + 120, y: at.y - 80, r: 60 });
  sg.bolts += 1;
  sg.nextFireTick = Math.max(sg.nextFireTick, sim.tick) + 8 * TPS;
  const boss = sg.bossId >= 0 ? unit(sim, sg.bossId) : null;
  if (boss?.alive) {
    const cut = boss.maxHp * BOLT_CUT;
    boss.hp = Math.max(1, boss.hp - cut);
    sim.events.push({ t: 'hit', x: boss.x, y: boss.y - 60, amount: Math.round(cut), crit: true, onHero: false });
    log(sim, 'The Guildmaster swung a ballista round and loosed: the bolt punched through the Elder Wyrm\'s wing!');
  } else {
    log(sim, sg.bolts > MAX_BOLTS
      ? 'Another ballista bolt hissed up at the circling dragon. She shied away from the field again.'
      : 'The Guildmaster loosed a ballista bolt into the circling dragon! She shrieked and veered away.');
  }
}

/** Water (or frost) puts out fires near a point. Returns how many went out. */
export function douse(sim: Sim, at: Pt, radius: number): number {
  const sg = sim.siege;
  if (!sg || !sg.fires.length) return 0;
  const before = sg.fires.length;
  sg.fires = sg.fires.filter((f) => Math.hypot(f.x - at.x, f.y - at.y) > radius + f.r * 0.5);
  // Fires at the edge of the splash shrink.
  for (const f of sg.fires) if (Math.hypot(f.x - at.x, f.y - at.y) < radius + f.r) f.r *= 0.5;
  const out = before - sg.fires.length;
  sg.doused += out;
  return out;
}

function newGroup(sim: Sim, x: number, y: number, active: boolean, family: string): EnemyGroup {
  const g: EnemyGroup = { id: sim.groups.length, x, y, active, cleared: false, announced: active, family };
  sim.groups.push(g);
  return g;
}

/** An enemy at the battle, scaled to the region's danger tier. */
function enemy(sim: Sim, e: EnemyDef, x: number, y: number, group: number, hpMul: number, atkMul: number): Unit {
  const tierMult = tierScale(sim.region.tier);
  const u: Unit = {
    id: sim.nextId++, side: 'enemy', key: e.id, name: e.name, sprite: e.id, role: e.role, slot: -1, row: 'front', fx: 0, fy: 0,
    x, y, homeX: x, homeY: y, hp: e.hp * tierMult * hpMul, maxHp: e.hp * tierMult * hpMul, atk: e.atk * 1.5 * tierMult * atkMul, def: e.def,
    heal: e.role === 'healer' ? e.atk * 2 * tierMult * atkMul : 0, range: e.range, speed: e.speed, attackRate: e.attackRate,
    crit: 0.05, splash: e.splash ?? 0, cd: sim.rng.range(0, e.attackRate), alive: true, targetId: null, group, facing: -1,
    kills: 0, gold: e.gold, xp: e.xp, hesitate: 0, fleeing: 0, family: e.family, big: e.hp >= 100,
    structure: e.structure, boss: e.boss,
  };
  sim.units.push(u);
  return u;
}

const unit = (sim: Sim, id: number) => sim.units.find((u) => u.id === id)!;
const partyMembers = (sim: Sim) => sim.units.filter((u) => u.side === 'hero' && u.alive && !u.pet && !u.minion && !u.freed);
const healUp = (sim: Sim) => {
  for (const h of sim.units) if (h.side === 'hero' && h.alive && !h.minion) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.25);
};

/** Advances the siege's stages. Called every tick before anyone acts. */
export function siegeStep(sim: Sim) {
  const sg = sim.siege!;
  if (sim.phase === 'home') {
    // Out through the gateway first (if there is one), then back along the trail.
    const f = sg.fort;
    sg.anchor = f && partyMembers(sim).some((h) => h.x > f.wallX - 70) ? { x: f.wallX - 130, y: f.gateY } : null;
    return;
  }
  if (sg.kind === 'barrow_uprising') barrowStep(sim);
  else if (sg.kind === 'cinder_legion') cinderStep(sim);
  else if (sg.kind === 'dragonmaw') dragonStep(sim);
  else fortressStep(sim);
  bossRage(sim);
  sg.hordeDefeated = sim.units.filter((u) => u.horde && !u.alive).length;
}

function fortressStep(sim: Sim) {
  const sg = sim.siege!;
  const f = sg.fort!;
  const def = FORTRESSES[sg.kind as 'goblin_fortress' | 'bandit_hold'];
  switch (sg.stage) {
    case 'approach':
      if (sim.groups[sg.wallsGroup].active) {
        sg.stage = 'breach';
        sg.anchor = { x: f.wallX - 130, y: f.gateY };
        log(sim, 'The walls loomed out of the smoke. Arrows rained from the towers: break the gate!');
        addFind(sim, f.wallX - 60, f.gateY + 95, 150, 'keg');
      }
      break;
    case 'breach':
      if (!unit(sim, sg.gateId).alive) {
        f.open = true;
        sg.stage = 'horde';
        sg.anchor = { x: f.wallX - 80, y: f.gateY };
        sg.campsCleared = sim.forks.filter((k) => sim.groups.some((g) => g.forkId === k.id && g.cleared)).length;
        sg.wavesTotal = Math.max(3, def.baseWaves - 2 * sg.campsCleared);
        sg.nextWaveTick = sim.tick + 3 * TPS;
        // The tower archers climb down to join the fight.
        for (const u of sim.units) if (u.group === sg.wallsGroup && u.alive && u.fixed) { u.fixed = false; u.horde = true; u.homeX = f.wallX + 50; u.homeY = f.gateY; }
        log(sim, `The gate splintered! ${sg.campsCleared ? `Thanks to the ${sg.campsCleared === 1 ? 'camp' : 'camps'} cleared on the way, only ${sg.wavesTotal} waves` : `${sg.wavesTotal} waves`} poured into the courtyard.`);
        for (const dy of [-70, 70]) addFind(sim, f.wallX + 120, f.gateY + dy, 200, 'keg');
        if (sg.cages.length) {
          activateGroup(sim, sg.extraGroup);
          addFind(sim, f.wallX + 60, f.gateY + 150, 240, 'key');
          log(sim, 'Inside: cages full of prisoners, shouting for help. Break them open, or find the key.');
        }
      }
      break;
    case 'horde': {
      const alive = sim.units.filter((u) => u.horde && u.alive).length;
      if (sg.wavesSent < sg.wavesTotal && sim.tick >= sg.nextWaveTick && alive < HORDE_CAP) {
        sendWave(sim, def);
        sg.nextWaveTick = sim.tick + WAVE_GAP * TPS;
      }
      if (sg.wavesSent >= sg.wavesTotal && alive === 0) {
        sg.stage = 'keep';
        sg.anchor = { x: f.keep.x - 180, y: f.keep.y };
        healUp(sim);
        log(sim, `The horde broke and fled. The party bound its wounds: only the keep remains, and ${unit(sim, sg.bossId).name}.`);
      }
      break;
    }
    case 'keep':
      if (!unit(sim, sg.bossId).alive && !sim.units.some((u) => u.group === sg.keepGroup && u.alive)) win(sim);
      break;
  }
  // Cages that broke free their captives.
  for (const id of sg.cages) {
    const cage = unit(sim, id);
    if (!cage.alive && !cage.horde) {
      cage.horde = true; // marks it as handled
      freeCaptives(sim, cage);
    }
  }
}

function barrowStep(sim: Sim) {
  const sg = sim.siege!;
  const field = sg.field!;
  switch (sg.stage) {
    case 'approach':
      if (partyMembers(sim).some((h) => Math.hypot(h.x - field.x, h.y - field.y) < 480)) {
        sg.stage = 'horde';
        sg.anchor = { ...field };
        activateGroup(sim, sg.wallsGroup);
        sg.nextWaveTick = sim.tick + 2 * TPS;
        log(sim, 'The ground split. Bony hands clawed out of the open tombs. Break the tomb seals, or the dead will never stop coming!');
        for (const [dx, dy] of [[-40, -110], [60, 120]]) addFind(sim, field.x + dx, field.y + dy, 240, 'holy');
      }
      break;
    case 'horde': {
      const open = sg.tombs.map((id) => unit(sim, id)).filter((t) => t.alive);
      const risen = sim.units.filter((u) => u.horde && u.alive).length;
      if (open.length && sim.tick >= sg.nextWaveTick && risen < RISEN_CAP) {
        for (const t of open) rise(sim, t);
        sg.wavesSent += 1;
        sg.nextWaveTick = sim.tick + RISE_GAP * TPS;
      }
      if (!open.length && risen === 0) {
        sg.stage = 'keep';
        const mound = sg.mound!;
        const keep = newGroup(sim, mound.x, mound.y, true, 'Undead');
        sg.keepGroup = keep.id;
        sg.bossId = enemy(sim, ENEMY_BY_ID.barrow_king, mound.x, mound.y, keep.id, 1, 1).id;
        for (const dy of [-80, 80]) enemy(sim, ENEMY_BY_ID.wraith, mound.x - 40, mound.y + dy, keep.id, 1, 0.8);
        sg.anchor = { x: mound.x - 190, y: mound.y };
        healUp(sim);
        log(sim, 'Every tomb sealed, the field fell silent. Then the great mound cracked open, and the Barrow King rose to his feet.');
      }
      break;
    }
    case 'keep':
      if (!unit(sim, sg.bossId).alive && !sim.units.some((u) => u.group === sg.keepGroup && u.alive)) win(sim);
      break;
  }
  // Seals broken.
  sg.tombs.forEach((id, i) => {
    const t = unit(sim, id);
    if (!t.alive && !t.horde) {
      t.horde = true; // marks it as handled
      const left = sg.tombs.filter((x) => unit(sim, x).alive).length;
      log(sim, `The ${TOMB_NAMES[i]} tomb's seal is broken: no more dead from there.${left ? ` ${left} still open.` : ''}`);
    }
  });
}

/** The dead climb out of an open tomb. */
function rise(sim: Sim, tomb: Unit) {
  const g = newGroup(sim, tomb.x, tomb.y, true, 'Undead');
  g.horde = true;
  // One or two at a time: a steady trickle, not a flood.
  const n = sim.rng.chance(0.5) ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const id = sim.rng.weighted(RISEN.map(([value, weight]) => ({ value, weight })));
    const u = enemy(sim, ENEMY_BY_ID[id], tomb.x + sim.rng.range(-40, 40), tomb.y + sim.rng.range(-30, 30), g.id, 0.7, 0.24);
    u.horde = true;
  }
}

/** The boss rages below half health (the Barrow King also calls more dead). */
function bossRage(sim: Sim) {
  const sg = sim.siege!;
  if (sg.stage !== 'keep' || sg.enraged) return;
  const boss = unit(sim, sg.bossId);
  if (!boss.alive || boss.hp >= boss.maxHp * 0.5) return;
  sg.enraged = true;
  boss.atk *= 1.4;
  boss.attackRate *= 0.8;
  if (sg.kind === 'dragonmaw') {
    // She takes to the air for a moment: fire across the whole field, and her brood answers.
    const targets = partyMembers(sim);
    for (let i = 0; i < 3 && targets.length; i++) {
      const t = sim.rng.pick(targets);
      sg.breaths.push({ x: t.x + sim.rng.range(-40, 40), y: t.y + sim.rng.range(-40, 40), r: BREATH_R, at: sim.tick + (BREATH_WARN + i * 0.6) * TPS, from: sim.tick });
    }
    for (const dy of [-110, 0, 110]) enemy(sim, ENEMY_BY_ID.drake, boss.x + 60, boss.y + dy, sg.keepGroup, 0.8, 0.6).horde = true;
    once(sim, 'enrage', `${boss.name} reared up and breathed fire across the whole field. Three drakes dropped from the cliffs to her side.`, boss, 'ROAR!');
  } else if (sg.kind === 'cinder_legion') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      sg.fires.push({ x: boss.x + Math.cos(a) * 120, y: boss.y + Math.sin(a) * 120, r: 40, max: 110 });
    }
    once(sim, 'enrage', 'The Cinder Lord roared, and the ground around him burst into flame.', boss, 'BURN!');
  } else if (sg.kind === 'barrow_uprising') {
    for (let i = 0; i < 3; i++) enemy(sim, ENEMY_BY_ID.skeleton, boss.x - 60 + i * 40, boss.y + 90, sg.keepGroup, 1, 0.6).horde = true;
    once(sim, 'enrage', 'The Barrow King raised his sword, and three of his old guard climbed out of the mound.', boss, 'RISE!');
  } else {
    once(sim, 'enrage', FORTRESSES[sg.kind].enrage, boss, 'GRAAAH!');
  }
}

function sendWave(sim: Sim, def: FortressDef) {
  const sg = sim.siege!;
  const f = sg.fort!;
  sg.wavesSent += 1;
  const g = newGroup(sim, f.wallX + 60, f.gateY, true, def.family);
  g.horde = true;
  const cx = f.wallX + sim.rng.range(380, 520);
  for (let i = 0; i < def.waveSize; i++) {
    const id = sim.rng.weighted(def.wave.map(([v, weight]) => ({ value: v, weight })));
    const u = enemy(sim, ENEMY_BY_ID[id], cx + sim.rng.range(-70, 70), f.gateY + sim.rng.range(-260, 260), g.id, HORDE_HP, HORDE_ATK);
    u.horde = true;
    // They hold the gateway, not their spawn point.
    u.homeX = f.wallX + 50;
    u.homeY = f.gateY;
  }
  log(sim, sg.wavesSent === sg.wavesTotal ? 'The last wave came screaming through the gate.' : `Wave ${sg.wavesSent} of ${sg.wavesTotal} charged the gateway.`);
}

/** A broken cage: three captives grab what they can and fight on the party's side. */
function freeCaptives(sim: Sim, cage: Unit) {
  const sg = sim.siege!;
  const m = ENEMY_BY_ID.militia;
  const tierMult = tierScale(sim.region.tier);
  for (let i = 0; i < 3; i++) {
    sim.units.push({
      id: sim.nextId++, side: 'hero', key: 'militia', name: m.name, sprite: 'militia', role: m.role, slot: -1, row: 'front',
      fx: -60 - i * 20, fy: (i - 1) * 50, x: cage.x + (i - 1) * 30, y: cage.y + 20, homeX: 0, homeY: 0,
      hp: m.hp * tierMult, maxHp: m.hp * tierMult, atk: m.atk * 1.5 * tierMult, def: m.def, heal: 0, range: m.range, speed: m.speed,
      attackRate: m.attackRate, crit: 0.05, splash: 0, cd: 0, alive: true, targetId: null, group: -1, facing: 1,
      kills: 0, gold: 0, xp: 0, hesitate: 0, fleeing: 0, freed: true,
    });
  }
  sg.freed += 3;
  log(sim, `A cage burst open. Three prisoners grabbed fallen weapons and joined the fight!${sg.freed > 3 ? ` (${sg.freed} freed so far.)` : ''}`);
}

function win(sim: Sim) {
  const sg = sim.siege!;
  sg.stage = 'won';
  const tier = sim.region.tier;
  const vault = 250 * tier;
  sim.gold += vault;
  sim.xp += 200;
  const loot = LOOT_ITEMS.filter((i) => i.tier === 3);
  const found: string[] = [];
  // Gear is mostly forged in town now: the vault holds one Mithril piece.
  for (let i = 0; i < 1; i++) {
    const it = sim.rng.pick(loot.filter((x) => !found.includes(x.name)));
    sim.items.push(it.id);
    found.push(it.name);
  }
  const at = sg.fort?.keep ?? sg.mound!;
  addPieces(sim, 'veteran', 4, at);
  addPieces(sim, 'champion', 3, { x: at.x, y: at.y - 30 });
  const boss = unit(sim, sg.bossId).name;
  const hoard = sg.kind === 'barrow_uprising' ? 'the barrow hoard' : sg.kind === 'cinder_legion' ? 'the ash of his spire' : sg.kind === 'dragonmaw' ? "the wyrm's hoard" : 'the vault';
  sg.fires = [];
  sg.breaths = [];
  if (sg.kind === 'dragonmaw') {
    // The greatest hoard in the Marches: a piece of named gear and Starshards on top of the rest.
    const named = sim.rng.pick(NAMED_ITEMS);
    sim.items.push(named);
    found.push(ITEM_BY_ID[named].name);
    sim.shards += WYRM_SHARDS;
    sim.gold += vault;
    found.push(`${WYRM_SHARDS} Starshards`);
  }
  log(sim, `${boss} fell! ${sg.kind === 'barrow_uprising' ? 'The dead lie still at last.' : sg.kind === 'cinder_legion' ? 'The fires guttered out across the plain.' : sg.kind === 'dragonmaw' ? 'Dragonmaw is silent. The guild will be singing about this for a hundred years.' : 'The place is ours.'}${sg.freed ? ` ${sg.freed} prisoners walk free.` : ''} In ${hoard}: ${sg.kind === 'dragonmaw' ? vault * 2 : vault} gold, ${found.join(', ')}, ${pieceName('veteran', 4)}, ${pieceName('champion', 3)} and a sealed chest.`);
  sim.phase = 'home';
  sg.anchor = sg.fort ? { x: sg.fort.wallX - 130, y: sg.fort.gateY } : null;
}

/** Clickable help: a powder keg, a flask of holy water, or the prison key. */
function addFind(sim: Sim, x: number, y: number, seconds: number, kind: 'keg' | 'holy' | 'key' | 'water' | 'ballista') {
  sim.finds.push({ id: sim.finds.length, x, y, gold: 0, expires: sim.tick + seconds * TPS, taken: false, keg: kind === 'keg' || kind === 'holy', key: kind === 'key', water: kind === 'water', ballista: kind === 'ballista' });
}

/** A water cistern: tipped over, it puts out the fires around it. */
export function useWater(sim: Sim, at: Pt) {
  sim.events.push({ t: 'spell', spell: 'frost', x: at.x, y: at.y, r: 240 });
  const out = douse(sim, at, 240);
  log(sim, out ? `The Guildmaster tipped over a water cistern: ${out} ${out === 1 ? 'fire' : 'fires'} hissed out.` : 'A cistern of water drenched the ground. There was nothing burning there.');
}

/** The prison key: the nearest cage swings open. */
export function useKey(sim: Sim) {
  const cages = sim.siege?.cages.map((id) => unit(sim, id)).filter((c) => c.alive) ?? [];
  if (!cages.length) return;
  const cage = cages[0];
  cage.hp = 0;
  damage(sim, null, cage, 1, false);
  log(sim, 'The Guildmaster spotted the prison key hanging by the gate. One cage swung open.');
}

/** A powder keg (or, at the barrow, holy water): a blast that also cracks gates and tomb seals. */
export function blowKeg(sim: Sim, at: Pt) {
  const tier = sim.region.tier;
  const holy = sim.siege?.kind === 'barrow_uprising';
  sim.events.push({ t: 'spell', spell: holy ? 'second_wind' : 'keg', x: at.x, y: at.y, r: 120 });
  let hit = 0;
  let structure = false;
  for (const u of sim.units) {
    if (u.side !== 'enemy' || !u.alive || Math.hypot(u.x - at.x, u.y - at.y) > (holy ? 140 : 120)) continue;
    activateGroup(sim, u.group);
    if (u.structure) {
      if (u.key === 'cage') continue; // nobody blows up the prisoners
      structure = true;
      const cut = u.maxHp * (holy ? 0.4 : 0.3);
      u.hp -= cut;
      sim.events.push({ t: 'hit', x: u.x, y: u.y - 30, amount: Math.round(cut), crit: true, onHero: false });
      if (u.hp <= 0) damage(sim, null, u, 1, false);
    } else {
      damage(sim, null, u, (holy ? 140 : 90) + (holy ? 40 : 30) * tier, false);
      hit++;
    }
  }
  if (holy) {
    log(sim, `The Guildmaster hurled a flask of holy water.${structure ? ' A tomb seal cracked,' : ''} ${hit} of the dead ${hit === 1 ? 'was' : 'were'} scorched.`);
    return;
  }
  const parts = [structure ? 'the gate cracked' : '', hit ? `${hit} ${hit === 1 ? 'enemy was' : 'enemies were'} caught in the blast` : ''].filter(Boolean);
  log(sim, parts.length ? `The Guildmaster lit a powder keg. BOOM: ${parts.join(' and ')}.` : 'A powder keg went off with a bang, scaring nobody.');
}

/** Barrow Uprising: melee heroes break the nearest tomb seal when one is close. */
export function preferredTarget(sim: Sim, u: Unit, foes: Unit[]): Unit | null {
  const sg = sim.siege;
  if (!sg || u.range > 100) return null;
  // Barrow tombs during the rising; Dragonmaw's blood altars while they burn.
  const key = sg.kind === 'barrow_uprising' && sg.stage === 'horde' ? 'tomb' : sg.kind === 'dragonmaw' && sg.stage === 'breach' ? 'altar' : null;
  if (!key) return null;
  let best: Unit | null = null;
  let bestD = 320;
  for (const f of foes) {
    if (f.key !== key) continue;
    const d = Math.hypot(f.x - u.x, f.y - u.y);
    if (d < bestD) { bestD = d; best = f; }
  }
  return best;
}

/** Where a unit should walk to reach (x, y): through the gateway if the wall is in the way. */
export function navPoint(sim: Sim, u: Unit, x: number, y: number): Pt {
  const f = sim.siege?.fort;
  if (!f) return { x, y };
  const uIn = u.x > f.wallX;
  const tIn = x > f.wallX;
  if (uIn === tIn || !f.open) return { x, y };
  const lane = f.gateHalf - 14;
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  if (Math.abs(u.y - f.gateY) < lane && Math.abs(u.x - f.wallX) < 40) {
    return { x: f.wallX + (tIn ? 70 : -70), y: f.gateY + clamp(u.y - f.gateY, lane) };
  }
  return { x: f.wallX + (uIn ? 32 : -32), y: f.gateY + clamp(y - f.gateY, lane * 0.6) };
}

/** Can this unit fight that one? Melee can't reach anyone across a closed wall, or up on a tower. */
export function canReach(sim: Sim, u: Unit, t: Unit): boolean {
  const f = sim.siege?.fort;
  if (!f || u.range > 100 || t.structure) return true;
  if (t.fixed) return false;
  return f.open || (u.x > f.wallX) === (t.x > f.wallX);
}

/** During a fortress horde, heroes hold the gateway instead of chasing enemies across the courtyard. */
export function holdsPosition(sim: Sim, u: Unit, t: Unit): boolean {
  const sg = sim.siege;
  if (!sg || !sg.fort || sg.stage !== 'horde' || u.side !== 'hero' || !sg.anchor) return false;
  const a = sg.anchor;
  if (Math.hypot(t.x - a.x, t.y - a.y) <= HOLD) return false;
  // Only while enemies are pressing the gateway; once it's quiet, go and get the stragglers (and the cages).
  return sim.units.some((e) => e.horde && e.alive && Math.hypot(e.x - a.x, e.y - a.y) <= HOLD);
}

/** Puts back anyone who crossed the wall anywhere but an open gateway. */
export function clampToWall(sim: Sim) {
  const f = sim.siege?.fort;
  if (!f) return;
  for (const u of sim.units) {
    if (!u.alive || u.px === undefined) continue;
    const before = u.px > f.wallX;
    const now = u.x > f.wallX;
    if (before === now) continue;
    if (f.open && Math.abs(u.y - f.gateY) < f.gateHalf) continue;
    u.x = f.wallX + (before ? 1 : -1);
  }
}

export function siegeReport(sim: Sim) {
  const sg = sim.siege!;
  return {
    doused: sg.doused,
    bolts: sg.bolts,
    kind: sg.kind, won: sg.stage === 'won', stage: sg.stage, campsCleared: sg.campsCleared, waves: sg.wavesSent, hordeDefeated: sg.hordeDefeated,
    sealed: sg.tombs.filter((id) => !unit(sim, id).alive).length, freed: sg.freed,
  };
}

/** The Watch screen's siege line: title, detail, and a progress bar (0-1). */
export function siegeStatus(sim: Sim): [string, string, number] {
  const sg = sim.siege!;
  const hp = (id: number) => Math.max(0, unit(sim, id).hp) / unit(sim, id).maxHp;
  const horde = sim.units.filter((u) => u.horde && u.alive && !u.structure).length;
  if (sim.phase === 'home' && sg.stage !== 'won') return ['Siege · falling back', 'The party is pulling back.', 0];
  switch (sg.stage) {
    case 'approach': {
      const camps = sim.forks.filter((k) => sim.groups.some((g) => g.forkId === k.id && g.cleared)).length;
      return ['Siege · the approach', sg.kind === 'barrow_uprising' ? 'The barrow field lies at the end of the trail.' : `${sg.kind === 'cinder_legion' ? 'Fire camps' : sg.kind === 'dragonmaw' ? 'Cultist camps' : 'Camps'} cleared: ${camps} of ${sim.forks.length}. Each one means fewer waves at the gate.`, 0];
    }
    case 'breach':
      if (sg.kind === 'dragonmaw') {
        const lit = sg.tombs.filter((id) => unit(sim, id).alive).length;
        return [`Siege · the altars: ${lit} of 3 still burning`, `${horde} cultists on the field. Break the altars before the mountain wakes.`, lit / 3];
      }
      return ['Siege · break the gate', `Gate ${Math.round(hp(sg.gateId) * 100)}%. Click the powder keg by the wall!`, hp(sg.gateId)];
    case 'horde':
      if (sg.kind === 'cinder_legion') {
        return [`Siege · the Legion: rank ${sg.wavesSent} of ${sg.wavesTotal}`, `${horde} on the field, ${sg.fires.length} fires burning. Frost Nova and the water cisterns put them out; Ashborn walk through.`, 1 - sg.wavesSent / sg.wavesTotal + (horde ? 0.05 : 0)];
      }
      if (sg.kind === 'dragonmaw') {
        return [`Siege · the brood: wave ${sg.wavesSent} of ${sg.wavesTotal}`, `${horde} on the field. The Elder Wyrm circles overhead: get out from under her shadow, and click the ballistas!${sg.bolts ? ` Bolts in her: ${sg.bolts}.` : ''}`, 1 - sg.wavesSent / sg.wavesTotal + (horde ? 0.05 : 0)];
      }
      if (sg.kind === 'barrow_uprising') {
        const open = sg.tombs.filter((id) => unit(sim, id).alive).length;
        return [`Siege · the rising: ${open} of 4 tombs open`, `${horde} risen on the field. Break the seals; click the holy water.`, open / 4];
      }
      return [`Siege · the horde: wave ${sg.wavesSent} of ${sg.wavesTotal}`, `${horde} on the field. They bunch up in the gateway: a good spot for a spell.${sg.cages.length ? ` Prisoners freed: ${sg.freed}.` : ''}`, 1 - sg.wavesSent / sg.wavesTotal + (horde ? 0.05 : 0)];
    case 'keep':
      return [`Siege · ${unit(sim, sg.bossId).name}`, `${Math.round(hp(sg.bossId) * 100)}% left.`, hp(sg.bossId)];
    default:
      return ['Siege won!', 'The hoard is loaded up. Heading home.', 0];
  }
}
