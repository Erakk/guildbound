import { describe, expect, it } from 'vitest';
import { HEROES, HERO_BY_ID } from '../src/core/data/heroes';
import * as emb from '../src/core/embassy';
import { openTribePack } from '../src/core/packs';
import { Rng } from '../src/core/rng';
import { newGame, addHero } from '../src/core/state';
import type { ExpeditionReport, GameState, Tribe } from '../src/core/types';

function rich(): GameState {
  const s = newGame(0);
  s.gold = 100000;
  for (const m of Object.keys(s.materials)) (s.materials as Record<string, number>)[m] = 1000;
  s.buildings.embassy = 1;
  return s;
}

/** A report of a trip home with these heroes. */
function trip(_s: GameState, regionId: string, uids: string[], extra: Partial<ExpeditionReport> = {}): ExpeditionReport {
  return {
    regionId, outcome: 'returned', gold: 0, xp: 0, pieces: {}, materials: {}, items: [], chronicle: [], chestCards: 0,
    heroHpPct: Object.fromEntries(uids.map((u) => [u, 100])), groupsCleared: 3, groupsTotal: 3, ...extra,
  } as unknown as ExpeditionReport;
}

function fiveOf(s: GameState, t: Tribe): string[] {
  const defs = HEROES.filter((d) => d.tribe === t && !d.secret).slice(0, 5);
  return defs.map((d) => (s.roster.find((h) => h.defId === d.id) ?? addHero(s, d.id)).uid);
}

describe('tribe embassies', () => {
  it('the Embassy keeps envoys for 2, 4, then 8 tribes; opening one costs gold and the tribe\'s materials', () => {
    const s = rich();
    expect(emb.openEmbassy(s, 'ironroot')).toBe(true);
    expect(emb.openEmbassy(s, 'fenfolk')).toBe(true);
    expect(emb.openBlock(s, 'ashborn')).toMatch(/Every envoy/);
    s.buildings.embassy = 3;
    expect(emb.openEmbassy(s, 'ashborn')).toBe(true);
    expect(s.embassies).toEqual(['ironroot', 'fenfolk', 'ashborn']);
  });

  it('reputation: +2 for a trip with three of the tribe, +10 and a Tribe Pack for a tribe quest; milestones give packs', () => {
    const s = rich();
    emb.openEmbassy(s, 'ironroot');
    const five = fiveOf(s, 'ironroot');
    emb.tribeTrip(s, trip(s, 'greenhollow', five.slice(0, 3)));
    expect(emb.rep(s, 'ironroot')).toBe(2);
    expect(emb.tribePacks(s, 'ironroot')).toBe(0);
    const news = emb.tribeTrip(s, trip(s, emb.TRIBE_HOME.ironroot, five));
    expect(emb.rep(s, 'ironroot')).toBe(12);
    // The quest's pack, and Friend (10) crossed: another.
    expect(emb.tribePacks(s, 'ironroot')).toBe(2);
    expect(news.join(' ')).toMatch(/tribe quest done/);
    expect(emb.packFromTribe(s, 'ironroot')).toBe(4);
    // Retreats count for nothing.
    emb.tribeTrip(s, trip(s, emb.TRIBE_HOME.ironroot, five, { outcome: 'retreated' } as Partial<ExpeditionReport>));
    expect(emb.rep(s, 'ironroot')).toBe(12);
  });

  it('a Tribe Pack holds at least three (or four) of the tribe', () => {
    const s = rich();
    for (const [t, n] of [['moonveil', 3], ['ashborn', 4]] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const cards = openTribePack(s, new Rng(seed), t, n);
        expect(cards).toHaveLength(5);
        expect(cards.filter((c) => c.kind === 'hero' && c.def.tribe === t).length).toBeGreaterThanOrEqual(n);
      }
    }
  });

  it('Ally teaches the gear recipe; Kin opens the Legend chain, which ends with the tribe\'s greatest hero', () => {
    const s = rich();
    emb.openEmbassy(s, 'ashborn');
    expect(emb.gearBlock(s, 'ashborn')).toMatch(/Teaches its recipe/);
    emb.addRep(s, 'ashborn', 30);
    expect(emb.craftGear(s, 'ashborn')).toBe(true);
    expect(s.items.some((i) => i.defId === 'cinderbrand')).toBe(true);
    emb.addRep(s, 'ashborn', 30);
    const five = fiveOf(s, 'ashborn');
    const home = emb.TRIBE_HOME.ashborn;
    emb.tribeTrip(s, trip(s, home, five));
    expect(emb.legendStep(s, 'ashborn')).toBe(1);
    // Trial 2 needs every group beaten.
    emb.tribeTrip(s, trip(s, home, five, { groupsCleared: 1, groupsTotal: 3 } as Partial<ExpeditionReport>));
    expect(emb.legendStep(s, 'ashborn')).toBe(1);
    emb.tribeTrip(s, trip(s, home, five));
    expect(emb.legendStep(s, 'ashborn')).toBe(2);
    // Trial 3: nobody knocked out.
    const news = emb.tribeTrip(s, trip(s, home, five));
    expect(emb.legendStep(s, 'ashborn')).toBe(3);
    expect(s.roster.some((h) => h.defId === 'embermaw')).toBe(true);
    expect(news.join(' ')).toMatch(/Embermaw/);
  });

  it('the Thornkin and the Fenfolk, with no Legend, send their finest Epic at three stars', () => {
    const s = rich();
    for (const t of ['thornkin', 'fenfolk'] as const) {
      const d = emb.legendHero(s, t);
      expect(d.tribe).toBe(t);
      expect(['epic', 'legendary']).toContain(d.rarity);
      expect(HERO_BY_ID[d.id]).toBeTruthy();
    }
  });
});

describe('world map terrain', () => {
  it('draws the same land every time, with no broken numbers, and a shoreline where sea meets land', async () => {
    const { terrainSvg, DECOR_DEFS } = await import('../src/art/worldTerrain');
    const { REGIONS } = await import('../src/core/data/world');
    const land = [{ id: 'greyford', q: 0, r: 0, art: 'town' }, ...REGIONS.filter((r) => r.ring <= 3).map((r) => ({ id: r.id, q: r.q, r: r.r, art: r.art }))];
    const a = terrainSvg(land, 121.24, 105);
    expect(terrainSvg(land, 121.24, 105)).toBe(a);
    expect(a).not.toMatch(/NaN|undefined/);
    expect(a).toMatch(/<path d="M[^"]+ C[^"]+"\/>/); // shoreline curves
    // Every tile has a scenery version (no background of its own).
    for (const art of new Set(REGIONS.map((r) => r.art))) expect(DECOR_DEFS).toContain(`id="d-${art}"`);
    expect(DECOR_DEFS).not.toMatch(/<rect x="-70" y="-70" width="140"/);
  });
});

describe('world map rivers', () => {
  it('every river runs unbroken from its spring to the sea, and each hex it enters knows where it came in', async () => {
    const { riverNetwork } = await import('../src/art/worldTerrain');
    const { REGIONS } = await import('../src/core/data/world');
    const art = new Map(REGIONS.map((r) => [`${r.q},${r.r}`, r.art]));
    art.set('0,0', 'town');
    const DIR: [number, number][] = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
    const net = riverNetwork();
    const springs = [...net].filter(([, x]) => x.spring);
    expect(springs.length).toBeGreaterThan(5);
    for (const [k] of springs) {
      let cur = k;
      for (let i = 0; i < 60; i++) {
        const a = art.get(cur);
        if (a === 'sea' || a === 'reef') break;
        const x = net.get(cur)!;
        expect(x.out).toBeGreaterThanOrEqual(0);
        const [q, r] = cur.split(',').map(Number);
        const next = `${q + DIR[x.out][0]},${r + DIR[x.out][1]}`;
        // The next hex has the river coming in through the matching edge.
        expect(net.get(next)!.ins.some((n) => n.edge === (x.out + 3) % 6)).toBe(true);
        cur = next;
      }
      expect(['sea', 'reef']).toContain(art.get(cur));
    }
  });
});

describe('spells are rare', () => {
  it('hero packs hold at most one spell, now and then; Grimoires are all spells and never in chests', async () => {
    const { openPack } = await import('../src/core/packs');
    const { PACKS, chestPieceRoll, FIND_PIECE_ROLL } = await import('../src/core/data/packs');
    const s = newGame(0);
    s.buildings.magetower = 1;
    s.tutorial.done = true;
    s.tutorial.flags.giftPack = false;
    let spells = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      s.packs.recruit = 1;
      const cards = openPack(s, new Rng(i + 1), 'recruit')!;
      const n = cards.filter((c) => c.kind === 'spell').length;
      expect(n).toBeLessThanOrEqual(1);
      spells += n;
    }
    // About 7 in 100 Recruit Packs.
    expect(spells / N).toBeGreaterThan(0.03);
    expect(spells / N).toBeLessThan(0.12);
    s.packs.grimoire = 1;
    expect(openPack(s, new Rng(5), 'grimoire')!.every((c) => c.kind === 'spell')).toBe(true);
    expect(PACKS.grimoire.pieces).toBeGreaterThanOrEqual(10);
    for (const t of [1, 2, 3, 5, 8]) expect(chestPieceRoll(t).some(([k, w]) => k === 'grimoire' && w > 0)).toBe(false);
    expect(FIND_PIECE_ROLL.some(([k]) => k === 'grimoire')).toBe(false);
  });

  it('building the Mage Tower brings one Common spell', async () => {
    const town = await import('../src/core/town');
    const { SPELL_BY_ID } = await import('../src/core/data/spells');
    const s = newGame(0);
    expect(Object.keys(s.spells)).toHaveLength(0);
    s.construction = { id: 'magetower', level: 1, endsAt: 0 };
    town.tickTown(s, 1);
    const got = Object.keys(s.spells);
    expect(got).toHaveLength(1);
    expect(SPELL_BY_ID[got[0]].rarity).toBe('common');
  });
});

describe('the first ring pays in Novice Packs', () => {
  it('first-ring trips bring home mostly Novice pieces; early contracts pay Novice Packs', async () => {
    const { buildReport, createSim, runUntil } = await import('../src/core/sim/expedition');
    const { REGIONS } = await import('../src/core/data/world');
    const { earlyDays } = await import('../src/core/quests');
    const tot: Record<string, number> = {};
    for (const r of REGIONS.filter((x) => x.ring === 1)) for (let seed = 1; seed <= 8; seed++) {
      const st = newGame(0);
      const sim = createSim({ regionId: r.id, orders: { focus: 'treasure', stance: 'balanced', retreatAtPct: 25 }, seed,
        party: st.parties[0].slots.map((u, i) => { const hero = st.roster.find((h) => h.uid === u); return hero ? { hero, row: st.parties[0].rows[i], items: [] } : null; }) });
      runUntil(sim, []);
      for (const [k, n] of Object.entries(buildReport(sim).pieces)) tot[k] = (tot[k] ?? 0) + (n ?? 0);
    }
    const novice = tot.novice ?? 0;
    const other = Object.entries(tot).filter(([k]) => k !== 'novice').reduce((a, [, n]) => a + n, 0);
    expect(novice).toBeGreaterThan(other * 4);
    const s = newGame(0);
    expect(earlyDays(s)).toBe(true);
    s.buildings.townhall = 2;
    s.explored.push('cinderreach');
    expect(earlyDays(s)).toBe(false);
  }, 60000);
});

describe('discoveries wait for someone to look', () => {
  it('a hero runs over first; the card opens (reachedAt) only once they are beside it, and the party waits', async () => {
    const { createSim, step } = await import('../src/core/sim/expedition');
    const st = newGame(0);
    const party = st.parties[0].slots.map((u, i) => { const hero = st.roster.find((h) => h.uid === u); return hero ? { hero, row: st.parties[0].rows[i], items: [] } : null; });
    const sim = createSim({ regionId: 'oldmill', orders: { focus: 'explore', stance: 'balanced', retreatAtPct: 25 }, seed: 3, party });
    const f = sim.finds.find((x) => x.disc && x.disc !== 'nightcamp')!;
    let passedEarly = false;
    let n = 0;
    while (sim.phase === 'out' && f.reachedAt === undefined && n++ < 4000) {
      step(sim);
      if (sim.leaderDist > (f.at ?? 0) + 21) passedEarly = true;
    }
    expect(passedEarly).toBe(false);
    expect(f.reachedAt).toBeDefined();
    const r = sim.units.find((u) => u.id === f.runner)!;
    expect(Math.hypot(r.x - f.x, r.y - f.y)).toBeLessThan(50);
    // The Captain decides after the wait, and the runner goes back to the party.
    while (sim.phase === 'out' && f.decided == null && n++ < 6000) step(sim);
    expect(f.by).toBe('captain');
    expect(r.investigating).toBeUndefined();
  }, 60000);
});

describe('trip orders open with the town', () => {
  it('focus with Guild Hall 2, stance with a Weaponsmith, retreat with a Temple, goals with Town Hall 3, waypoints with Stables', async () => {
    const { unlocked, nextOrderUnlock } = await import('../src/core/unlocks');
    const s = newGame(0);
    s.tutorial.done = true;
    s.tripsCompleted = 10;
    for (const f of ['focus', 'stance', 'retreat', 'goals', 'waypoints'] as const) expect(unlocked(s, f)).toBe(false);
    expect(nextOrderUnlock(s)?.name).toBe('Focus');
    s.buildings.guildhall = 2;
    expect(unlocked(s, 'focus')).toBe(true);
    expect(nextOrderUnlock(s)?.name).toBe('Stance');
    s.buildings.weaponsmith = 1;
    s.buildings.temple = 1;
    s.buildings.townhall = 3;
    s.buildings.stables = 1;
    for (const f of ['stance', 'retreat', 'goals', 'waypoints'] as const) expect(unlocked(s, f)).toBe(true);
    expect(nextOrderUnlock(s)).toBeNull();
  });
});

describe('class-specific gear', () => {
  it('each class wears only its own kinds of gear; jewellery is for everyone', async () => {
    const { canWear, ITEM_BY_ID, wornBy } = await import('../src/core/data/items');
    const I = (id: string) => ITEM_BY_ID[id];
    expect(canWear('ranger', I('sword_1'))).toBe(false);
    expect(canWear('ranger', I('bow_1'))).toBe(true);
    expect(canWear('ranger', I('quiver_1'))).toBe(true);
    expect(canWear('warrior', I('quiver_1'))).toBe(false);
    expect(canWear('mage', I('robe_1'))).toBe(true);
    expect(canWear('mage', I('heavy_1'))).toBe(false);
    expect(canWear('mage', I('staff_1'))).toBe(true);
    expect(canWear('rogue', I('staff_1'))).toBe(false);
    expect(canWear('mage', I('ring_arcana_1'))).toBe(true);
    // Quivers are for bow users only.
    expect(wornBy(I('quiver_2')).every((c) => canWear(c, I('bow_2')))).toBe(true);
  });

  it('equipping refuses gear the class can\'t wear; old saves take it off', async () => {
    const town = await import('../src/core/town');
    const { migrate } = await import('../src/core/state');
    const s = newGame(0);
    const mage = s.roster.find((h) => HERO_BY_ID[h.defId].heroClass === 'mage') ?? addHero(s, HEROES.find((d) => d.heroClass === 'mage' && !d.secret)!.id);
    const plate = town.addItem(s, 'heavy_1');
    const robe = town.addItem(s, 'robe_1');
    expect(town.equip(s, mage.uid, plate.uid)).toBe(false);
    expect(town.equip(s, mage.uid, robe.uid)).toBe(true);
    // An old save where the mage wore plate: it goes back in the backpack.
    mage.gear.armor = plate.uid;
    const after = migrate(JSON.parse(JSON.stringify(s)));
    expect(after.roster.find((h) => h.uid === mage.uid)!.gear.armor).toBeUndefined();
    expect(after.items.some((i) => i.uid === plate.uid)).toBe(true);
  });
});

describe('gear is forged in town, rarely found', () => {
  it('the smithies forge to order: paid up front, one piece at a time, ready after its time', async () => {
    const town = await import('../src/core/town');
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const s = newGame(0);
    s.gold = 5000;
    s.materials = { wood: 99, stone: 99, iron: 99, herbs: 99, hides: 99 };
    expect(town.startForge(s, 'sword_1', 0)).toBe(false); // no Weaponsmith yet
    s.buildings.weaponsmith = 1;
    expect(town.buyItem(s, 'sword_1')).toBeNull(); // not off the shelf
    expect(town.startForge(s, 'sword_2', 0)).toBe(false); // steel needs level 2
    const items = s.items.length;
    expect(town.startForge(s, 'sword_1', 0)).toBe(true);
    expect(s.gold).toBe(5000 - (ITEM_BY_ID.sword_1.cost.gold ?? 0));
    expect(town.startForge(s, 'axe_1', 0)).toBe(false); // the anvil is busy
    expect(town.tickForge(s, town.forgeTime(ITEM_BY_ID.sword_1) - 1)).toEqual([]);
    expect(s.items.length).toBe(items);
    expect(town.tickForge(s, town.forgeTime(ITEM_BY_ID.sword_1)).map((d) => d.id)).toEqual(['sword_1']);
    expect(s.items.length).toBe(items + 1);
    expect(town.forgeJob(s, 'weaponsmith')).toBeNull();
    // The Market still sells jewelry off the shelf.
    s.buildings.market = 1;
    expect(town.buyItem(s, 'ring_arcana_1')).not.toBeNull();
  });

  it('a trip rarely brings gear home', async () => {
    const { REGIONS } = await import('../src/core/data/world');
    const { buildReport, createSim, runUntil } = await import('../src/core/sim/expedition');
    let items = 0, trips = 0;
    for (const r of REGIONS.filter((x) => x.ring <= 2 && !x.siege)) {
      for (let seed = 1; seed <= 3; seed++) {
        const state = newGame(0);
        const party = state.parties[0].slots.map((u, i) => {
          const hero = state.roster.find((x) => x.uid === u)!;
          hero.level = 6;
          return { hero, row: state.parties[0].rows[i], items: [] };
        });
        const sim = createSim({ regionId: r.id, party, orders: { focus: 'explore', stance: 'balanced', retreatAtPct: 25 }, seed: seed * 31 });
        runUntil(sim, []);
        items += buildReport(sim).items.length;
        trips++;
      }
    }
    // About one piece every five to eight trips (it used to be more than one a trip).
    expect(items / trips).toBeLessThan(0.4);
  }, 120_000);
});

describe('field stones near town', () => {
  it('every trip to a stoneless first-ring area brings home a little stone', async () => {
    const { buildReport, createSim, runUntil, FIELD_STONE } = await import('../src/core/sim/expedition');
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => {
      const hero = state.roster.find((x) => x.uid === u)!;
      hero.level = 4;
      return { hero, row: state.parties[0].rows[i], items: [] };
    });
    const sim = createSim({ regionId: 'greenhollow', party, orders: { focus: 'explore', stance: 'balanced', retreatAtPct: 25 }, seed: 5 });
    runUntil(sim, []);
    expect(buildReport(sim).materials.stone ?? 0).toBeGreaterThanOrEqual(FIELD_STONE);
  });
});
