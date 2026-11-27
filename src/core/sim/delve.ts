// Dungeon delves. A party sent to a dungeon site walks a shorter trail to the dungeon's mouth, then goes
// down: the path carries on underground (drawn below the map) through five rooms, one after another.
//
//   1. The entry hall: its guards.
//   2. The trap corridor: darts from the walls. A Rogue finds the pressure plates; a Cautious party
//      creeps along testing every stone (slow, but safe). Anyone else takes the darts.
//   3. The locked door: a Rogue picks it, a Mage reads its runes, otherwise it's forced (slowly). The
//      Guildmaster can pull the lever on the wall to open it at once.
//   4. The crypt: more monsters, and an alcove with a chest.
//   5. The Warden's hall: the dungeon's keeper and its guards, and behind them the vault.
// Coming home, the party climbs back up the stairs and walks the trail back.

import { ENEMY_BY_ID } from '../data/world';
import { log, type Pt, type Sim, type Unit } from './expedition';

export type RoomKind = 'hall' | 'traps' | 'door' | 'crypt' | 'warden';
export const ROOM_ORDER: RoomKind[] = ['hall', 'traps', 'door', 'crypt', 'warden'];
export const ROOM_W = 560;

export interface Delve {
  /** The dungeon's mouth at the end of the trail, and the stairs at the bottom. */
  entrance: Pt;
  stairs: Pt;
  /** Path distances: the end of the trail, and the foot of the stairs (the party jumps between them). */
  jumpFrom: number;
  jumpTo: number;
  /** Where the rooms are: x of the first room's left wall, the corridor's y, room width. */
  x0: number;
  y0: number;
  rooms: { kind: RoomKind; from: number; to: number; cx: number }[];
  trap: { from: number; to: number; how?: 'rogue' | 'careful' | 'darts' };
  door: { at: number; x: number; open: boolean; waitUntil?: number; how?: string; lever: Pt };
  warden: number;
  wardenSeen?: boolean;
  /** Just went down (or up) the stairs: heroes are moved with the leader. */
  jumped?: boolean;
  inside?: boolean;
}

type Spawn = (x: number, y: number, pool: { id: string; weight: number }[], size: number, goldMult?: number) => { id: number };

/** Lays out the dungeon below the map and appends its path to the trail. Returns the groups to clear and where the vault goes. */
export function setupDelve(sim: Sim, name: string, pool: { id: string; weight: number }[], spawn: Spawn): { groups: number[]; vault: Pt } {
  const region = sim.region;
  const end = sim.path[sim.path.length - 1];
  const x0 = Math.max(200, end.x - 900);
  const y0 = sim.height + 1400;
  const push = (p: Pt) => {
    const last = sim.path[sim.path.length - 1];
    sim.pathLen.push(sim.pathLen[sim.pathLen.length - 1] + Math.hypot(p.x - last.x, p.y - last.y));
    sim.path.push(p);
  };
  const jumpFrom = sim.pathLen[sim.pathLen.length - 1];
  const stairs = { x: x0 + 70, y: y0 };
  push(stairs);
  const jumpTo = sim.pathLen[sim.pathLen.length - 1];
  const rooms = ROOM_ORDER.map((kind, i) => {
    const left = x0 + i * ROOM_W;
    return { kind, from: jumpTo + (left - stairs.x), to: jumpTo + (left + ROOM_W - stairs.x), cx: left + ROOM_W / 2 };
  });
  push({ x: x0 + ROOM_ORDER.length * ROOM_W - 160, y: y0 });
  sim.width = Math.max(sim.width, x0 + ROOM_ORDER.length * ROOM_W + 300);

  const groups: number[] = [];
  const room = (k: RoomKind) => rooms.find((r) => r.kind === k)!;
  // 1. The entry hall's guards.
  groups.push(spawn(room('hall').cx + 80, y0, pool, region.groupSize[0] + 1, 1.5).id);
  // 4. The crypt, and an alcove with a chest.
  groups.push(spawn(room('crypt').cx + 60, y0 + 20, pool, region.groupSize[0] + 1, 1.5).id);
  sim.chests.push({ id: sim.chests.length, x: room('crypt').cx - 120, y: y0 - 150, gold: Math.round(sim.rng.range(15, 22) * region.tier), taken: false, kind: 'chest', lead: 'A crypt alcove' });
  // 5. The Warden: the toughest thing in the area, four times over.
  const kin = region.enemyPool.map((p) => ENEMY_BY_ID[p.id]); // the area's own monsters, not the season's visitors
  const keepers = kin.some((e) => e.family !== 'Beasts') ? kin.filter((e) => e.family !== 'Beasts') : kin;
  const big = keepers.reduce((a, b) => (b.hp > a.hp ? b : a));
  const wg = spawn(room('warden').cx + 70, y0, [{ id: big.id, weight: 1 }], 1, 6);
  const warden = sim.units.find((u) => u.group === wg.id)!;
  warden.hp = warden.maxHp = warden.maxHp * 4;
  warden.atk *= 1.5;
  warden.xp *= 5;
  warden.boss = true;
  warden.big = true;
  sim.groups[wg.id].announced = true;
  warden.name = `The Warden of the ${name.replace(/^(a|an|the) /i, '').replace(/\b\w/g, (c) => c.toUpperCase())}`;
  groups.push(wg.id, spawn(room('warden').cx - 60, y0 + 110, pool, 2, 1.5).id);

  sim.delve = {
    entrance: { ...end }, stairs, jumpFrom, jumpTo, x0, y0, rooms,
    trap: { from: room('traps').from + 40, to: room('traps').to - 40 },
    door: { at: room('door').to - 50, x: x0 + 3 * ROOM_W, open: false, lever: { x: x0 + 3 * ROOM_W - 70, y: y0 - 190 } },
    warden: warden.id,
  };
  return { groups, vault: { x: room('warden').cx + 160, y: y0 + 110 } };
}

/** Called after the leader moves: the stairs (a jump between the trail and the dungeon), the locked door, the traps' pace. */
export function delveWalk(sim: Sim, prev: number) {
  const d = sim.delve!;
  if (sim.phase === 'out') {
    if (prev <= d.jumpFrom && sim.leaderDist > d.jumpFrom) {
      sim.leaderDist = d.jumpTo + (sim.leaderDist - d.jumpFrom);
      d.jumped = true;
      d.inside = true;
      log(sim, 'Torches lit, the party went down the stairs into the dark.');
    }
    // The locked door holds them until it opens.
    if (!d.door.open && sim.leaderDist > d.door.at) sim.leaderDist = d.door.at;
    // Creeping through the traps.
    if (d.trap.how === 'careful' && sim.leaderDist > d.trap.from && sim.leaderDist < d.trap.to) sim.leaderDist = prev + (sim.leaderDist - prev) * 0.55;
  } else if (sim.phase === 'home') {
    if (prev >= d.jumpTo && sim.leaderDist < d.jumpTo) {
      sim.leaderDist = d.jumpFrom - (d.jumpTo - sim.leaderDist);
      d.jumped = true;
      d.inside = false;
      log(sim, 'Up the stairs and out into the air again.');
    }
  }
}

/** The rooms' goings-on, once per tick. */
export function delveStep(sim: Sim, party: Unit[]) {
  const d = sim.delve!;
  if (sim.phase !== 'out' || !d.inside) return;
  const at = sim.leaderDist;
  // The trap corridor.
  if (at > d.trap.from && at < d.trap.to) {
    if (!d.trap.how) {
      const rogue = party.find((u) => u.heroClass === 'rogue');
      d.trap.how = rogue ? 'rogue' : sim.orders.stance === 'cautious' ? 'careful' : 'darts';
      if (rogue) {
        log(sim, `${rogue.name} found the pressure plates in the corridor floor and wedged every one.`);
        sim.events.push({ t: 'shout', id: rogue.id, text: 'Step where I step.' });
      } else if (d.trap.how === 'careful') log(sim, 'The party crept along the corridor, testing every stone. Slow going, but nobody got hurt.');
      else log(sim, 'Click. Darts hissed from the walls of the corridor!');
    }
    if (d.trap.how === 'darts' && sim.tick % 5 === 0) {
      for (const u of party) {
        const dmg = u.maxHp * 0.012 * 5 / 10;
        u.hp = Math.max(1, u.hp - dmg);
        if (sim.tick % 15 === 0) sim.events.push({ t: 'hit', x: u.x, y: u.y - 30, amount: Math.round(dmg * 3), crit: false, onHero: true });
      }
    }
  }
  // The locked door.
  if (!d.door.open && at >= d.door.at - 1) {
    if (d.door.waitUntil === undefined) {
      const rogue = party.find((u) => u.heroClass === 'rogue');
      const mage = party.find((u) => u.heroClass === 'mage');
      const secs = rogue ? 2 : mage ? 2.5 : 7;
      d.door.waitUntil = sim.tick + Math.round(secs * 10);
      d.door.how = rogue ? `${rogue.name} picked the lock` : mage ? `${mage.name} read the runes on the door aloud` : 'They put their shoulders to it';
      log(sim, `A locked iron door. ${rogue ? `${rogue.name} knelt at the lock.` : mage ? `${mage.name} studied the runes on it.` : 'Nobody had a key, so they started forcing it. (The Guildmaster could pull the lever.)'}`);
    } else if (sim.tick >= d.door.waitUntil) {
      d.door.open = true;
      log(sim, `${d.door.how}, and the door ground open.`);
    }
  }
  // The Warden.
  const w = sim.units.find((u) => u.id === d.warden);
  const hall = d.rooms[4];
  if (w && !d.wardenSeen && at > hall.from - 60) {
    d.wardenSeen = true;
    log(sim, `${w.name} rose to meet them.`);
  }
}

/** The Guildmaster pulls the lever: the door opens at once. */
export function pullLever(sim: Sim): boolean {
  const d = sim.delve;
  if (!d || d.door.open || sim.phase !== 'out') return false;
  d.door.open = true;
  log(sim, 'The Guildmaster\'s sign: someone found the lever in the wall, and the door ground open.');
  return true;
}
