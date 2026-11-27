import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/core/data/world';
import { addXp, ascend, levelCap } from '../src/core/heroes';
import { openPack, PITY_RARE } from '../src/core/packs';
import { Rng } from '../src/core/rng';
import { buildReport, createSim, runUntil, step } from '../src/core/sim/expedition';
import { newGame, partyHeroes } from '../src/core/state';
import type { Orders, PlayerInput } from '../src/core/types';

const orders: Orders = { focus: 'explore', stance: 'balanced', retreatAtPct: 25 };
type GameStateLike = { rev?: number; buildings: Record<string, number> };

function runTrip(regionId: string, seed: number, inputs: PlayerInput[] = []) {
  const state = newGame(0);
  const sim = createSim({ regionId, party: state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; }), orders, seed });
  runUntil(sim, inputs);
  return { sim, report: buildReport(sim) };
}

describe('expedition simulation', () => {
  it('gives the same result for the same seed', () => {
    const a = runTrip('greenhollow', 1234).report;
    const b = runTrip('greenhollow', 1234).report;
    expect(a).toEqual(b);
  });

  it('always finishes within the trip length', () => {
    for (const r of REGIONS) {
      const { sim } = runTrip(r.id, 99);
      expect(sim.phase).toBe('done');
      expect(sim.tick).toBeLessThanOrEqual(sim.maxTicks);
    }
  }, 180_000);

  it('lets the starter party clear the first region comfortably', () => {
    let returned = 0;
    for (let seed = 1; seed <= 40; seed++) if (runTrip('greenhollow', seed).report.outcome === 'returned') returned++;
    expect(returned).toBeGreaterThanOrEqual(36);
  });

  it('applies recorded player inputs on replay', () => {
    const base = runTrip('greenhollow', 7).sim;
    const find = base.finds.find((f) => f.disc)!;
    expect(find).toBeDefined();
    // The first trip's discovery is the campfire; the Guildmaster chooses to rest there.
    expect(find.disc).toBe('campfire');
    const withFind = runTrip('greenhollow', 7, [{ tick: 20, kind: 'find', findId: find.id, choice: 0 }]);
    expect(withFind.report.findsCollected).toBe(1);
    expect(withFind.sim.finds.find((f) => f.id === find.id)!.by).toBe('guildmaster');
  });
});

describe('packs', () => {
  it('guarantees a Rare or better within 10 packs', () => {
    const state = newGame(0);
    state.packs.recruit = 1000;
    const rng = new Rng(5);
    for (let p = 0; p < 200; p++) {
      openPack(state, rng);
      expect(state.pity.sinceRare).toBeLessThan(PITY_RARE);
    }
  });

  it('turns duplicates into copies', () => {
    const state = newGame(0);
    state.packs.recruit = 1000;
    const rng = new Rng(11);
    for (let p = 0; p < 30; p++) openPack(state, rng);
    const ids = state.roster.map((h) => h.defId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(state.roster.some((h) => h.copies > 0)).toBe(true);
  });
});

describe('heroes', () => {
  it('raises the level cap with each star', () => {
    const state = newGame(0);
    const h = partyHeroes(state)[0];
    expect(levelCap(h)).toBe(20);
    addXp(h, 1e6);
    expect(h.level).toBe(20);
    h.copies = 1;
    // Copies alone are not enough: a star also costs gold and the hero's tribe materials.
    state.gold = 0;
    expect(ascend(state, h)).toBe(false);
    state.gold = 1e5;
    for (const m of ['wood', 'stone', 'iron', 'herbs', 'hides'] as const) state.materials[m] = 1000;
    expect(ascend(state, h)).toBe(true);
    expect(levelCap(h)).toBe(30);
    expect(h.copies).toBe(0);
    expect(state.gold).toBeLessThan(1e5);
  });

  it('makes every star cost more than the last, and rare heroes more than common ones', async () => {
    const { ascendCost } = await import('../src/core/heroes');
    const { addHero } = await import('../src/core/state');
    const state = newGame(0);
    const common = partyHeroes(state)[0];
    const legend = addHero(state, 'aldric');
    let last = 0;
    for (let star = 1; star < 6; star++) {
      legend.stars = star;
      const c = ascendCost(legend)!;
      const total = c.gold + Object.values(c.materials).reduce((a, b) => a + b!, 0) * 10 + c.essence * 100;
      expect(total).toBeGreaterThan(last);
      expect(c.level).toBeGreaterThan(star * 7);
      last = total;
    }
    legend.stars = 1;
    expect(ascendCost(legend)!.gold).toBeGreaterThan(ascendCost(common)!.gold);
    legend.stars = 6;
    expect(ascendCost(legend)).toBeNull();
  });
});

describe('balance overview (printed, not asserted)', () => {
  it('prints outcomes per region for the starter party', () => {
    const rows: string[] = [];
    for (const r of REGIONS.filter((x) => x.ring === 1)) {
      let ret = 0, gold = 0, low = 0, kills = 0, kos = 0, mats = 0, items = 0;
      const n = 12;
      for (let s = 1; s <= n; s++) {
        const { report, sim } = runTrip(r.id, s * 31);
        if (report.outcome === 'returned') ret++;
        gold += report.gold;
        kills += report.enemiesDefeated;
        low += sim.lowestHpPct;
        kos += sim.units.filter((u) => u.side === 'hero' && !u.alive).length;
        mats += Object.values(report.materials).reduce((a, b) => a + (b ?? 0), 0);
        items += report.items.length;
      }
      rows.push(`${r.name.padEnd(16)} ring ${r.ring} tier ${r.tier}  returned ${String(Math.round((ret / n) * 100)).padStart(3)}%  gold ${Math.round(gold / n)}  kills ${Math.round(kills / n)}  lowest hp ${Math.round(low / n)}%  knockouts ${(kos / n).toFixed(1)}  materials ${(mats / n).toFixed(1)}  items ${(items / n).toFixed(2)}`);
    }
    console.log('\n' + rows.join('\n'));
  }, 180_000);
});

describe('town', () => {
  it('builds with a timer and respects the Town Hall cap', async () => {
    const town = await import('../src/core/town');
    const s = newGame(0);
    s.gold = 1e6;
    for (const m of ['wood', 'stone', 'iron', 'herbs', 'hides'] as const) s.materials[m] = 1e4;
    expect(town.startUpgrade(s, 'tavern', 0)).toBe(true);
    expect(town.upgradeBlock(s, 'market')).toBe('busy');
    expect(town.tickTown(s, 1000)).toBeNull();
    expect(town.tickTown(s, 31_000)).toBe('tavern');
    expect(town.level(s, 'tavern')).toBe(1);
    expect(town.upgradeBlock(s, 'tavern')).toBe('townhall');
    // The welcome gift comes with the tutorial; the free packs start one interval after the build.
    expect(town.tavernPackReady(s, 31_000)).toBe(false);
    expect(town.tavernPackReady(s, 31_000 + town.tavernInterval(s))).toBe(true);
  });

  it('applies the one-handed rule', async () => {
    const town = await import('../src/core/town');
    const s = newGame(0);
    const hero = s.roster[0];
    const sword = town.addItem(s, 'sword_1');
    const shield = town.addItem(s, 'shield_1');
    const great = town.addItem(s, 'greatsword_1');
    town.equip(s, hero.uid, sword.uid);
    town.equip(s, hero.uid, shield.uid);
    expect(hero.gear).toEqual({ main: sword.uid, off: shield.uid });
    town.equip(s, hero.uid, great.uid);
    expect(hero.gear).toEqual({ main: great.uid });
    town.equip(s, hero.uid, shield.uid);
    expect(hero.gear).toEqual({ off: shield.uid });
  });

  it('moves an item between heroes instead of copying it', async () => {
    const town = await import('../src/core/town');
    const s = newGame(0);
    const ring = town.addItem(s, 'ring_might_1');
    town.equip(s, s.roster[0].uid, ring.uid);
    town.equip(s, s.roster[1].uid, ring.uid);
    expect(s.roster[0].gear.jewelry).toBeUndefined();
    expect(s.roster[1].gear.jewelry).toBe(ring.uid);
  });

  it('sells only unequipped items, and only with a Market', async () => {
    const town = await import('../src/core/town');
    const s = newGame(0);
    const it = town.addItem(s, 'axe_1');
    expect(town.sellItem(s, it.uid)).toBe(0);
    s.buildings.market = 1;
    town.equip(s, s.roster[0].uid, it.uid);
    expect(town.sellItem(s, it.uid)).toBe(0);
    town.unequip(s, s.roster[0].uid, 'main');
    expect(town.sellItem(s, it.uid)).toBeGreaterThan(0);
  });

  it('shops only stock tiers their level allows', async () => {
    const town = await import('../src/core/town');
    const s = newGame(0);
    expect(town.shopStock(s, 'weaponsmith')).toHaveLength(0);
    s.buildings.weaponsmith = 2;
    const tiers = new Set(town.shopStock(s, 'weaponsmith').map((i) => i.tier));
    expect([...tiers].sort()).toEqual([1, 2]);
  });
});

describe('formation', () => {
  it('lets all five stand in the back row', async () => {
    const { formationOffsets } = await import('../src/core/sim/expedition');
    const off = formationOffsets(['back', 'back', 'back', 'back', 'back']);
    expect(off.every(([f]) => f === -30)).toBe(true);
    expect(new Set(off.map(([, s]) => s)).size).toBe(5);
    const state = newGame(0);
    state.parties[0].rows = ['back', 'back', 'back', 'back', 'back'];
    const sim = createSim({ regionId: 'greenhollow', party: state.parties[0].slots.map((u, i) => ({ hero: state.roster.find((h) => h.uid === u)!, row: state.parties[0].rows[i], items: [] })), orders, seed: 3 });
    runUntil(sim, []);
    expect(sim.phase).toBe('done');
  });

  it('gives gear real weight in combat', async () => {
    const { heroCombat } = await import('../src/core/sim/expedition');
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const state = newGame(0);
    const brannoc = state.roster[0];
    const bare = heroCombat(brannoc);
    const geared = heroCombat(brannoc, [ITEM_BY_ID.axe_2, ITEM_BY_ID.heavy_2]);
    expect(geared!.atk).toBeGreaterThan(bare!.atk);
    expect(geared!.def).toBeGreaterThan(bare!.def);
    expect(geared!.maxHp).toBeGreaterThan(bare!.maxHp);
    const offClass = heroCombat(brannoc, [ITEM_BY_ID.staff_2]);
    expect(offClass!.atk - bare!.atk).toBeLessThan(ITEM_BY_ID.staff_2.atk);
  });
});

describe('personalities and crossroads', () => {
  it('weighs side paths by personality and orders', async () => {
    const { heroForkOpinion, ordersForkScore } = await import('../src/core/sim/expedition');
    const u = (personality: string, grudge?: string) => ({ personality, grudge }) as never;
    const fork = (kind: string, family?: string) => ({ kind, family }) as never;
    expect(heroForkOpinion(u('curious'), fork('ruins'), false)).toBeGreaterThan(0);
    expect(heroForkOpinion(u('cowardly'), fork('camp'), false)).toBeLessThan(0);
    expect(heroForkOpinion(u('steady', 'Goblins'), fork('camp', 'Goblins'), false)).toBeGreaterThan(0);
    expect(heroForkOpinion(u('reckless'), fork('camp'), true)).toBeLessThan(heroForkOpinion(u('reckless'), fork('camp'), false));
    expect(ordersForkScore({ focus: 'hunt', stance: 'bold', retreatAtPct: 30 }, fork('camp'))).toBeGreaterThan(
      ordersForkScore({ focus: 'explore', stance: 'cautious', retreatAtPct: 30 }, fork('camp')));
  });

  it('makes crossroads decisions and tells personality stories', async () => {
    const { addHero } = await import('../src/core/state');
    const lines: string[] = [];
    let forksDecided = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const state = newGame(0);
      const ids = ['kragga', 'brannoc', 'ssiv', 'pip', 'elowen'];
      const party = ids.map((id, i) => ({ hero: addHero(state, id), row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: [] }));
      const sim = createSim({ regionId: 'warrens', party, orders, seed, captain: party[0].hero.uid });
      runUntil(sim, []);
      forksDecided += sim.forks.filter((f) => f.decided).length;
      lines.push(...sim.chronicle);
    }
    const text = lines.join('\n');
    expect(forksDecided).toBeGreaterThan(20);
    expect(text).toContain('A crossroads');
    expect(text).toMatch(/charged ahead/);
    expect(text).toMatch(/Old grudges die hard/);
  });
});

describe('sample chronicle (printed, not asserted)', () => {
  it('prints one trip with a mixed-personality party', async () => {
    const { addHero } = await import('../src/core/state');
    const state = newGame(0);
    const party = ['kragga', 'brannoc', 'ssiv', 'pip', 'lyra'].map((id, i) => ({ hero: addHero(state, id), row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: [] }));
    const sim = createSim({ regionId: 'warrens', party, orders: { focus: 'treasure', stance: 'bold', retreatAtPct: 25 }, seed: 77, captain: party[2].hero.uid });
    runUntil(sim, []);
    console.log('\n' + sim.chronicle.join('\n') + `\n(morale ${sim.morale})`);
  });
});

describe('benchmark balance (printed, not asserted)', () => {
  it('prints how a party at the expected strength for each tier does', async () => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const LEVEL = [1, 4, 9, 14];
    const STARS = [1, 1, 1, 2];
    const GEAR = [0, 1, 1, 2];
    const KIT: Record<string, string[]> = {
      warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'],
      mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'], bard: ['sword', 'light'],
    };
    const rows: string[] = [];
    for (const r of REGIONS) {
      let ret = 0, low = 0, gold = 0;
      const n = 8;
      for (let s = 1; s <= n; s++) {
        const state = newGame(0);
        const t = r.tier - 1;
        const party = state.parties[0].slots.map((u, i) => {
          const hero = state.roster.find((x) => x.uid === u)!;
          hero.level = LEVEL[t];
          hero.stars = STARS[t];
          const items = GEAR[t] ? KIT[def(hero).heroClass].map((k) => ITEM_BY_ID[`${k}_${GEAR[t]}`]) : [];
          return { hero, row: state.parties[0].rows[i], items };
        });
        const sim = createSim({ regionId: r.id, party, orders, seed: s * 17 });
        runUntil(sim, []);
        if (sim.outcome === 'returned') ret++;
        low += sim.lowestHpPct;
        gold += buildReport(sim).gold;
      }
      rows.push(`${r.name.padEnd(16)} ring ${r.ring} tier ${r.tier}  returned ${String(Math.round((ret / n) * 100)).padStart(3)}%  lowest hp ${Math.round(low / n)}%  gold ${Math.round(gold / n)}`);
    }
    console.log('\n' + rows.join('\n'));
  }, 300_000);
});

describe('spell cards', () => {
  it('levels a spell up from duplicates and caps it by rarity', async () => {
    const { addSpellCard, maxSpellLevel } = await import('../src/core/spells');
    const state = newGame(0);
    expect(addSpellCard(state, 'fireball')).toBe('new');
    expect(state.spells.fireball.level).toBe(1);
    expect(addSpellCard(state, 'fireball')).toBe('level'); // 1 copy for level 2
    expect(addSpellCard(state, 'fireball')).toBe('copy');
    expect(addSpellCard(state, 'fireball')).toBe('level'); // 2 copies for level 3
    for (let i = 0; i < 40; i++) addSpellCard(state, 'heal_rain');
    expect(state.spells.heal_rain.level).toBe(maxSpellLevel('heal_rain'));
    expect(state.essence).toBeGreaterThan(0);
  });

  it('starts without spells; the Mage Tower opens the spellbook, one slot per level after the first two', async () => {
    const { addSpellCard, equipSpell, loadout } = await import('../src/core/spells');
    const state = newGame(0);
    expect(Object.keys(state.spells)).toEqual([]);
    for (const id of ['fortune', 'haste', 'frost', 'fireball']) addSpellCard(state, id);
    expect(loadout(state)).toEqual([]);
    expect(equipSpell(state, 'fortune')).toBe(false);
    state.buildings.magetower = 1;
    expect(equipSpell(state, 'fortune')).toBe(true);
    expect(equipSpell(state, 'haste')).toBe(true);
    expect(equipSpell(state, 'frost')).toBe(false);
    state.buildings.magetower = 2;
    expect(equipSpell(state, 'frost')).toBe(true);
    expect(loadout(state)).toHaveLength(3);
  });

  it('commons are blessings; damage spells are Rare or rarer', async () => {
    const { SPELLS } = await import('../src/core/data/spells');
    const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
    for (const s of SPELLS) {
      if (s.rarity === 'common') expect(s.target).toBe('ground');
      if (['lightning', 'frost', 'fireball', 'meteor'].includes(s.id)) expect(RANK[s.rarity]).toBeGreaterThanOrEqual(2);
    }
    expect(SPELLS.filter((s) => s.rarity === 'common').length).toBeGreaterThanOrEqual(4);
  });

  it("Fortune's Favor, Bountiful Harvest and Sage's Insight raise gold, materials and XP for 30 seconds", () => {
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; });
    const run = (spells: string[]) => {
      const sim = createSim({ regionId: 'greenhollow', party, orders, seed: 5, spells: spells.map((id) => ({ id, level: 1 })) });
      // Cast each blessing as soon as there is mana for it, all trip long.
      const inputs: PlayerInput[] = [];
      for (let t = 10; t < 3000; t += 460) spells.forEach((id, k) => inputs.push({ tick: t + k * 120, kind: 'cast', spell: id, x: 0, y: 0 }));
      runUntil(sim, inputs);
      const r = buildReport(sim);
      return { gold: r.gold, xp: r.xp, mats: Object.values(r.materials).reduce((a, b) => a + (b ?? 0), 0) };
    };
    const plain = run([]);
    const blessed = run(['fortune', 'harvest', 'insight']);
    expect(blessed.gold).toBeGreaterThan(plain.gold);
    expect(blessed.xp).toBeGreaterThan(plain.xp);
    expect(blessed.mats).toBeGreaterThanOrEqual(plain.mats);
  });

  it('casts only packed spells, and stronger at higher levels', () => {
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; });
    const hits = (level: number, packed: boolean) => {
      const sim = createSim({ regionId: 'greenhollow', party, orders, seed: 3, spells: packed ? [{ id: 'fireball', level }] : [] });
      const foe = sim.units.find((u) => u.side === 'enemy')!;
      sim.mana = 100;
      foe.hp = foe.maxHp = 10000; // so the spell can't kill it outright
      const before = foe.hp;
      runUntil(sim, [{ tick: 0, kind: 'cast', spell: 'fireball', x: foe.x, y: foe.y }], 1);
      return before - foe.hp;
    };
    expect(hits(1, false)).toBe(0);
    expect(hits(1, true)).toBeGreaterThan(0);
    expect(hits(5, true)).toBeGreaterThan(hits(1, true));
  });

  it('can bring knocked-out heroes back with Second Wind', () => {
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; });
    const sim = createSim({ regionId: 'greenhollow', party, orders, seed: 3, spells: [{ id: 'second_wind', level: 1 }] });
    const lyra = sim.units.find((u) => u.name === 'Lyra')!;
    lyra.alive = false;
    lyra.hp = 0;
    sim.mana = 100;
    runUntil(sim, [{ tick: 0, kind: 'cast', spell: 'second_wind', x: lyra.x, y: lyra.y }], 1);
    expect(lyra.alive).toBe(true);
    expect(lyra.hp).toBeGreaterThan(0);
  });

  it('puts spell cards in hero packs only once the Mage Tower is built (Grimoires always)', () => {
    const state = newGame(0);
    state.packs.recruit = 1000;
    state.packs.grimoire = 10;
    const rng = new Rng(11);
    let spells = 0;
    for (let p = 0; p < 30; p++) spells += openPack(state, rng)!.filter((c) => c.kind === 'spell').length;
    expect(spells).toBe(0);
    expect(openPack(state, rng, 'grimoire')!.every((c) => c.kind === 'spell')).toBe(true);
    state.buildings.magetower = 1;
    for (let p = 0; p < 60; p++) spells += openPack(state, rng)!.filter((c) => c.kind === 'spell').length;
    // Spells are rare now: a few in 60 Recruit Packs, not dozens.
    expect(spells).toBeGreaterThan(0);
    expect(spells).toBeLessThan(12);
  });

  it('older saves keep their spell slots: the Mage Tower goes up a level', async () => {
    const { migrate } = await import('../src/core/state');
    const old = newGame(0) as GameStateLike;
    delete old.rev;
    old.buildings.magetower = 2;
    const s = migrate(old as never);
    expect(s.buildings.magetower).toBe(3);
    expect(migrate(s).buildings.magetower).toBe(3);
  });
});

describe('achievements and prestige classes', () => {
  it('keeps prestige heroes out of packs until their class is unlocked', async () => {
    const { packPool } = await import('../src/core/packs');
    const { claimAchievements } = await import('../src/core/achievements');
    const state = newGame(0);
    expect(packPool(state).some((d) => d.heroClass === 'paladin')).toBe(false);
    state.records.cleanTrips = 25;
    const earned = claimAchievements(state);
    const paladin = earned.find((e) => e.def.id === 'paladin')!;
    expect(paladin.hero?.heroClass).toBe('paladin');
    expect(paladin.hero?.rarity).toBe('common');
    expect(state.roster.some((h) => h.defId === paladin.hero!.id)).toBe(true);
    expect(packPool(state).some((d) => d.heroClass === 'paladin')).toBe(true);
    expect(packPool(state).some((d) => d.heroClass === 'necromancer')).toBe(false);
    // Rewards are paid once.
    expect(claimAchievements(state).find((e) => e.def.id === 'paladin')).toBeUndefined();
  });

  it('gives every tribe exactly two prestige classes', async () => {
    const { HEROES } = await import('../src/core/data/heroes');
    const { PRESTIGE_CLASSES } = await import('../src/core/types');
    const byTribe = new Map<string, Set<string>>();
    for (const d of HEROES) {
      if (!(PRESTIGE_CLASSES as string[]).includes(d.heroClass)) continue;
      if (!byTribe.has(d.tribe)) byTribe.set(d.tribe, new Set());
      byTribe.get(d.tribe)!.add(d.heroClass);
    }
    expect(byTribe.size).toBe(8);
    for (const classes of byTribe.values()) expect(classes.size).toBe(2);
  });

  it('brings Beastmaster animals and raised dead, but keeps them out of the report', async () => {
    const { addHero } = await import('../src/core/state');
    const state = newGame(0);
    const ids = ['tamra', 'ossian', 'brannoc', 'mirela', 'vanthe'];
    const party = ids.map((id, i) => ({ hero: addHero(state, id), row: i < 2 ? 'front' as const : 'back' as const, items: [] }));
    let raised = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const sim = createSim({ regionId: 'barrow', party, orders, seed });
      expect(sim.units.filter((u) => u.pet)).toHaveLength(1);
      runUntil(sim, []);
      raised += sim.units.filter((u) => u.minion).length;
      const report = buildReport(sim);
      expect(Object.keys(report.heroHpPct)).toHaveLength(5);
      expect(Object.values(report.kills).reduce((a, n) => a + n, 0)).toBe(report.enemiesDefeated);
    }
    expect(raised).toBeGreaterThan(0);
  });
});

describe('sieges', () => {
  const strongParty = async () => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const KIT: Record<string, string[]> = {
      warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'],
      mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'], bard: ['sword', 'light'],
    };
    const state = newGame(0);
    return state.parties[0].slots.map((u, i) => {
      const hero = state.roster.find((x) => x.uid === u)!;
      hero.level = 20;
      hero.stars = 3;
      return { hero, row: state.parties[0].rows[i], items: KIT[def(hero).heroClass].map((k) => ITEM_BY_ID[`${k}_3`]) };
    });
  };

  it('plays through camps, gate, horde and keep, and a strong party wins', async () => {
    const party = await strongParty();
    const sim = createSim({ regionId: 'gobfort', party, orders: { focus: 'hunt', stance: 'balanced', retreatAtPct: 20 }, seed: 31, siege: true });
    runUntil(sim, []);
    const r = buildReport(sim);
    expect(r.siege?.won).toBe(true);
    expect(r.siege?.waves).toBeGreaterThanOrEqual(3);
    expect(r.chestCards).toBe(1);
    expect(r.items.length).toBeGreaterThanOrEqual(3);
    expect(sim.units.filter((u) => u.side === 'enemy').length).toBeGreaterThan(60);
    // Same seed, same siege.
    const again = createSim({ regionId: 'gobfort', party, orders: { focus: 'hunt', stance: 'balanced', retreatAtPct: 20 }, seed: 31, siege: true });
    runUntil(again, []);
    expect(buildReport(again)).toEqual(r);
  });

  it('keeps everyone on their side of the wall until the gate falls', async () => {
    const { step } = await import('../src/core/sim/expedition');
    const party = await strongParty();
    const sim = createSim({ regionId: 'gobfort', party, orders, seed: 5, siege: true });
    const f = sim.siege!.fort!;
    const inside = new Map(sim.units.map((u) => [u.id, u.x > f.wallX]));
    while (sim.phase !== 'done' && !f.open) {
      step(sim, []);
      for (const u of sim.units) if (u.alive && inside.has(u.id)) expect(u.x > f.wallX).toBe(inside.get(u.id));
    }
    expect(f.open).toBe(true);
  });

  it('turns a razed fortress into a short trip among the ruins', async () => {
    const party = await strongParty();
    const sim = createSim({ regionId: 'gobfort', party, orders, seed: 5, siege: false });
    expect(sim.siege).toBeUndefined();
    expect(sim.maxTicks).toBe(REGIONS.find((r) => r.id === 'gobfort')!.durationSec * 10 / 2);
  });

  it('blows up a powder keg when clicked', async () => {
    const party = await strongParty();
    const sim = createSim({ regionId: 'gobfort', party, orders, seed: 5, siege: true });
    const { step } = await import('../src/core/sim/expedition');
    while (sim.siege!.stage !== 'breach') step(sim, []);
    const keg = sim.finds.find((x) => x.keg)!;
    const gate = sim.units.find((u) => u.structure)!;
    const before = gate.hp;
    // Pretend the keg sits right by the gate.
    keg.x = gate.x - 30;
    keg.y = gate.y;
    step(sim, [{ tick: sim.tick, kind: 'find', findId: keg.id }]);
    expect(gate.hp).toBeLessThan(before - gate.maxHp * 0.25);
  });
});

describe('several parties', () => {
  it('turns an old one-party save into Party I', async () => {
    const { migrate, newGame: fresh } = await import('../src/core/state');
    const state = fresh(0);
    const old = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    delete old.parties;
    delete old.expeditions;
    delete old.reports;
    old.party = ['h1', 'h2', null, 'h4', 'h5'];
    old.rows = ['front', 'back', 'back', 'back', 'front'];
    old.captain = 'h2';
    old.expedition = { regionId: 'greenhollow', seed: 1, startedAt: 0, party: ['h1'], rows: ['front'], orders, inputs: [] };
    old.pendingReport = null;
    const m = migrate(old as never);
    expect(m.parties).toHaveLength(2);
    expect(m.parties[0]).toEqual({ slots: ['h1', 'h2', null, 'h4', 'h5'], rows: ['front', 'back', 'back', 'back', 'front'], captain: 'h2' });
    expect(m.parties[1].slots.every((x) => x === null)).toBe(true);
    expect(m.expeditions).toHaveLength(1);
    expect(m.expeditions[0].parties).toEqual([0]);
    expect(m.reports).toEqual([]);
    expect('party' in m).toBe(false);
  });

  it('unlocks the second party at Guild Hall level 3', async () => {
    const { partiesUnlocked, newGame: fresh } = await import('../src/core/state');
    const state = fresh(0);
    expect(partiesUnlocked(state)).toBe(1);
    state.buildings.guildhall = 3;
    expect(partiesUnlocked(state)).toBe(2);
  });

  it('lets two parties (10 heroes) storm a fortress together', async () => {
    const { addHero } = await import('../src/core/state');
    const state = newGame(0);
    const ids = ['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela', 'edric', 'rowan', 'caelum', 'faelan', 'oss'];
    const party = ids.map((id, i) => {
      const hero = state.roster.find((h) => h.defId === id) ?? addHero(state, id);
      hero.level = 14;
      hero.stars = 2;
      return { hero, row: (i % 5 < 2 ? 'front' : 'back') as 'front' | 'back', items: [] };
    });
    let won = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const sim = createSim({ regionId: 'gobfort', party, orders: { focus: 'hunt', stance: 'balanced', retreatAtPct: 20 }, seed, siege: true });
      expect(sim.units.filter((u) => u.side === 'hero' && !u.pet)).toHaveLength(10);
      runUntil(sim, []);
      const r = buildReport(sim);
      expect(Object.keys(r.heroHpPct)).toHaveLength(10);
      if (r.siege?.won) won++;
    }
    // Ten heroes at the strength where five win about half the time should usually win.
    expect(won).toBeGreaterThanOrEqual(3);
  });
});

describe('tribe map abilities', () => {
  const tribeParty = async (ids: string[], level = 1) => {
    const { addHero } = await import('../src/core/state');
    const state = newGame(0);
    return ids.map((id, i) => {
      const hero = state.roster.find((h) => h.defId === id) ?? addHero(state, id);
      hero.level = level;
      return { hero, row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: [] };
    });
  };

  it('opens a secret path for 3+ of a tribe in their home terrain', async () => {
    // Three Fenfolk in a marsh: a sunken wreck.
    const fen = await tribeParty(['mudtail', 'ssiv', 'oss', 'lyra', 'mirela']);
    const sim = createSim({ regionId: 'reedwater', party: fen, orders, seed: 4 });
    expect(sim.forks.find((f) => f.kind !== 'hoard')!.kind).toBe('wreck');
    runUntil(sim, []);
    expect(sim.chronicle.some((l) => l.startsWith('A secret way'))).toBe(true);
    // Two Fenfolk aren't enough.
    const two = await tribeParty(['mudtail', 'ssiv', 'brannoc', 'lyra', 'mirela']);
    expect(createSim({ regionId: 'reedwater', party: two, orders, seed: 4 }).forks.find((f) => f.kind !== 'hoard')!.kind).not.toBe('wreck');
  });

  it('speeds Freeholders along farm roads and hides Thornkin in forests', async () => {
    const free = await tribeParty(['edric', 'rowan', 'mirela', 'lyra', 'elowen']);
    expect(createSim({ regionId: 'oldmill', party: free, orders, seed: 2 }).roadMult).toBeGreaterThan(1);
    expect(createSim({ regionId: 'brackenwood', party: free, orders, seed: 2 }).roadMult).toBe(1);
    const thorn = await tribeParty(['briar', 'lyra', 'faelan', 'brannoc', 'mirela']);
    expect(createSim({ regionId: 'brackenwood', party: thorn, orders, seed: 2 }).stealth).toBe(true);
    expect(createSim({ regionId: 'oldmill', party: thorn, orders, seed: 2 }).stealth).toBe(false);
  });

  it('prints how a matching tribe party does in the four new areas (printed, not asserted)', async () => {
    const parties: Record<string, string[]> = {
      caldera: ['kragga', 'urzog', 'gorm', 'brannoc', 'mirela'],
      veiledglade: ['elowen', 'pip', 'nyx', 'brannoc', 'mirela'],
      blightmoor: ['hollis', 'vesper', 'wren', 'brannoc', 'mirela'],
      thornheart: ['briar', 'lyra', 'faelan', 'brannoc', 'mirela'],
    };
    const rows: string[] = [];
    for (const [region, ids] of Object.entries(parties)) {
      let ret = 0, low = 0, gold = 0;
      const n = 6;
      for (let seed = 1; seed <= n; seed++) {
        const { ITEM_BY_ID } = await import('../src/core/data/items');
        const { def } = await import('../src/core/heroes');
        const KIT: Record<string, string[]> = {
          warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'],
          mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'], bard: ['sword', 'light'],
        };
        const party = await tribeParty(ids, 14);
        for (const p of party) {
          p.hero.stars = 2;
          p.items = KIT[def(p.hero).heroClass].map((k) => ITEM_BY_ID[`${k}_2`]) as never[];
        }
        const sim = createSim({ regionId: region, party, orders, seed: seed * 13 });
        runUntil(sim, []);
        if (sim.outcome === 'returned') ret++;
        low += sim.lowestHpPct;
        gold += buildReport(sim).gold;
      }
      rows.push(`${region.padEnd(12)} returned ${Math.round((100 * ret) / n)}%  lowest hp ${Math.round(low / n)}%  gold ${Math.round(gold / n)}`);
    }
    console.log('\n' + rows.join('\n'));
  }, 300_000);
});

describe('area states', () => {
  it('brings trouble over time, spreads it if ignored, and shields neighbours once cleared', async () => {
    const { tickWorld, calmArea, neighbours, WORLD_EVENT_MS, SPREAD_MS, areaState } = await import('../src/core/areas');
    const { REGION_BY_ID } = await import('../src/core/data/world');
    const state = newGame(0);
    state.explored = ['greenhollow', 'oldmill', 'brackenwood', 'saltshore', 'reedwater', 'watchtower', 'warrens', 'wolfden', 'barrow'];
    let t = 0;
    while (!Object.keys(state.areas).length && t < 40 * WORLD_EVENT_MS) {
      t += WORLD_EVENT_MS;
      tickWorld(state, t);
    }
    const [first] = Object.keys(state.areas);
    expect(first).toBeDefined();
    // Leave it alone long enough and it spreads to a neighbour.
    const kind = state.areas[first].kind as 'infested' | 'corrupted';
    t += SPREAD_MS[kind] + WORLD_EVENT_MS;
    tickWorld(state, t);
    const near = neighbours(REGION_BY_ID[first]).map((r) => r.id);
    const spreadable = near.some((id) => state.explored.includes(id));
    if (spreadable) expect(Object.keys(state.areas).some((id) => near.includes(id) && state.areas[id].kind === kind)).toBe(true);
    // Clearing calms it and shields the neighbours.
    calmArea(state, first, t);
    expect(areaState(state, first)).toBe('calm');
    for (const id of near) expect(state.calmUntil[id]).toBeGreaterThan(t);
  });

  it('never has more than a few troubles at once, even after a long time away', async () => {
    const { tickWorld, MAX_TROUBLES } = await import('../src/core/areas');
    const { REGIONS } = await import('../src/core/data/world');
    const state = newGame(0);
    state.explored = REGIONS.filter((r) => r.ring <= 3).map((r) => r.id);
    tickWorld(state, 1000 * 3600 * 1000);
    expect(Object.keys(state.areas).length).toBeLessThanOrEqual(MAX_TROUBLES + 1);
  });

  it('puts the trouble on the trail: a camp, a gloom heart, or warbands', () => {
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => ({ hero: state.roster.find((h) => h.uid === u)!, row: state.parties[0].rows[i], items: [] }));
    const infested = createSim({ regionId: 'greenhollow', party, orders, seed: 8, area: 'infested' });
    expect(infested.area.groups).toHaveLength(1);
    const corrupted = createSim({ regionId: 'brackenwood', party, orders, seed: 8, area: 'corrupted' });
    expect(corrupted.units.some((u) => u.key === 'gloom_heart')).toBe(true);
    const besieged = createSim({ regionId: 'thornback', party, orders, seed: 8, area: 'besieged' });
    expect(besieged.area.groups).toHaveLength(2);
    runUntil(infested, []);
    const r = buildReport(infested);
    expect(r.area?.kind).toBe('infested');
    expect(typeof r.area?.cleared).toBe('boolean');
  });

  it('prints how the starter party does against trouble in ring 1 (printed, not asserted)', () => {
    const rows: string[] = [];
    for (const kind of ['calm', 'infested', 'corrupted'] as const) {
      for (const regionId of ['greenhollow', 'brackenwood']) {
        let ret = 0, cleared = 0, gold = 0;
        const n = 10;
        for (let seed = 1; seed <= n; seed++) {
          const state = newGame(0);
          const party = state.parties[0].slots.map((u, i) => ({ hero: state.roster.find((h) => h.uid === u)!, row: state.parties[0].rows[i], items: [] }));
          const sim = createSim({ regionId, party, orders, seed: seed * 7, area: kind });
          runUntil(sim, []);
          if (sim.outcome === 'returned') ret++;
          if (sim.area.cleared) cleared++;
          gold += buildReport(sim).gold;
        }
        rows.push(`${regionId.padEnd(12)} ${kind.padEnd(10)} returned ${ret}/${n}  cleared ${cleared}/${n}  gold ${Math.round(gold / n)}`);
      }
    }
    console.log('\n' + rows.join('\n'));
  }, 120_000);
});

describe('pack pieces and the quest board', () => {
  it('opens packs only from whole packs or enough pieces, and never for gold', async () => {
    const { PACKS } = await import('../src/core/data/packs');
    const state = newGame(0);
    state.gold = 1e9;
    state.packs.recruit = 0;
    state.pieces.recruit = 4;
    expect(openPack(state, new Rng(1), 'recruit')).toBeNull();
    expect(state.gold).toBe(1e9);
    state.pieces.recruit = PACKS.recruit.pieces + 1;
    expect(openPack(state, new Rng(1), 'recruit')).toHaveLength(5);
    expect(state.pieces.recruit).toBe(1);
  });

  it('keeps each pack type\'s promise', async () => {
    const { RANK } = await import('../src/core/packs');
    const state = newGame(0);
    state.packs = { novice: 0, recruit: 0, grimoire: 50, veteran: 50, champion: 50 };
    const rng = new Rng(3);
    for (let i = 0; i < 50; i++) {
      const g = openPack(state, rng, 'grimoire')!;
      expect(g.every((c) => c.kind === 'spell')).toBe(true);
      expect(Math.max(...g.map((c) => RANK[c.rarity]))).toBeGreaterThanOrEqual(RANK.uncommon);
      const v = openPack(state, rng, 'veteran')!;
      expect(v.some((c) => c.rarity === 'common')).toBe(false);
      expect(Math.max(...v.map((c) => RANK[c.rarity]))).toBeGreaterThanOrEqual(RANK.rare);
      const c = openPack(state, rng, 'champion')!;
      expect(Math.min(...c.map((x) => RANK[x.rarity]))).toBeGreaterThanOrEqual(RANK.rare);
      expect(Math.max(...c.map((x) => RANK[x.rarity]))).toBeGreaterThanOrEqual(RANK.epic);
    }
  });

  it('finds pieces on expeditions (printed: pieces per trip)', () => {
    let pieces = 0, recruit = 0;
    const n = 30;
    for (let seed = 1; seed <= n; seed++) {
      const { report } = runTrip('greenhollow', seed);
      const p = report.pieces ?? {};
      pieces += Object.values(p).reduce((a, x) => a + (x ?? 0), 0);
      recruit += p.recruit ?? 0;
    }
    console.log(`\nGreenhollow, no glints clicked: ${(pieces / n).toFixed(2)} pieces per trip (${(recruit / n).toFixed(2)} Recruit)`);
    expect(pieces).toBeGreaterThan(0);
  });

  it('fills the quest board, counts trips toward contracts, and pays in packs', async () => {
    const { tickQuests, progressQuests, BOARD_SIZE } = await import('../src/core/quests');
    const state = newGame(0);
    tickQuests(state, 1000);
    expect(state.quests.active).toHaveLength(BOARD_SIZE);
    // Force a goblin bounty and complete it with a report.
    state.quests.active[0] = { id: 99, kind: 'slay', family: 'Goblins', need: 5, progress: 0, title: 'Bounty: Goblins', text: '', reward: { pack: 'veteran' } };
    const before = state.packs.veteran;
    const report = runTrip('greenhollow', 3).report;
    const goblins = Object.entries(report.kills).filter(([id]) => id.startsWith('goblin')).reduce((a, [, n]) => a + n, 0);
    const news = progressQuests(state, { ...report, kills: { goblin_spear: Math.max(5, goblins) } }, 2000);
    expect(news.some((x) => x.includes('Bounty: Goblins'))).toBe(true);
    expect(state.packs.veteran).toBe(before + 1);
    expect(state.quests.active).toHaveLength(BOARD_SIZE - 1);
    // A new contract is posted later, not at once.
    tickQuests(state, 3000);
    expect(state.quests.active).toHaveLength(BOARD_SIZE - 1);
    tickQuests(state, 3000 + 21 * 60 * 1000);
    expect(state.quests.active).toHaveLength(BOARD_SIZE);
  });
});

describe('tutorial', () => {
  it('walks through the steps in order, with the gift pack on the way', async () => {
    const { advanceTutorial, currentStep, TUTORIAL } = await import('../src/core/tutorial');
    const town = await import('../src/core/town');
    const { addHero } = await import('../src/core/state');
    const state = newGame(0);
    expect(currentStep(state)?.id).toBe('cards');
    state.tutorial.flags.heroOpened = true;
    state.tutorial.flags.partyEdited = true;
    advanceTutorial(state);
    expect(currentStep(state)?.id).toBe('send');
    state.tutorial.flags.claimed = true;
    advanceTutorial(state);
    expect(currentStep(state)?.id).toBe('equip');
    // Equip the starter gear.
    const party = state.parties[0].slots.map((u) => state.roster.find((h) => h.uid === u)!);
    const [brannoc] = party;
    town.addItem(state, 'sword_1');
    const uid = (id: string) => state.items.find((i) => i.defId === id)!.uid;
    town.equip(state, brannoc.uid, uid('sword_1'));
    state.buildings.tavern = 1;
    const noviceBefore = state.packs.novice;
    advanceTutorial(state);
    expect(currentStep(state)?.id).toBe('pack');
    expect(state.packs.novice).toBe(noviceBefore + 1);
    // The gift pack is a Novice Pack: upgrades for the heroes the guild has, and one new Rare, last.
    state.packs.novice = 1;
    const rosterBefore = state.roster.length;
    const cards = openPack(state, new Rng(9), 'novice')!;
    expect(cards[4].kind === 'hero' && cards[4].result).toBe('new');
    expect(cards[4].rarity).toBe('rare');
    expect(cards.slice(0, 4).every((c) => c.kind === 'hero' && c.result !== 'new')).toBe(true);
    expect(state.roster.length).toBe(rosterBefore + 1);
    state.tutorial.flags.packOpened = true;
    advanceTutorial(state);
    expect(currentStep(state)?.id).toBe('swap');
    const rare = cards[4].kind === 'hero' ? cards[4].heroUid : addHero(state, 'grimgar').uid;
    state.parties[0].slots[4] = rare;
    advanceTutorial(state);
    expect(currentStep(state)?.id).toBe('scout');
    state.explored.push('oldmill');
    advanceTutorial(state);
    expect(currentStep(state)?.id).toBe('alone');
    state.tutorial.flags.claimed2 = true;
    advanceTutorial(state);
    expect(state.tutorial.done).toBe(true);
    expect(TUTORIAL.length).toBe(11);
  });

  it('keeps heroes standing on the first trip, and lets older saves skip it', async () => {
    const { migrate } = await import('../src/core/state');
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => ({ hero: state.roster.find((h) => h.uid === u)!, row: state.parties[0].rows[i], items: [] }));
    for (let seed = 1; seed <= 5; seed++) {
      const sim = createSim({ regionId: 'brackenwood', party, orders, seed, safe: true });
      runUntil(sim, []);
      expect(Object.values(buildReport(sim).heroHpPct).every((p) => p > 0)).toBe(true);
    }
    const old = JSON.parse(JSON.stringify(state));
    delete old.tutorial;
    expect(migrate(old).tutorial.done).toBe(true);
  });
});

describe('endgame permadeath', () => {
  const kit = async (level: number, stars: number, gear: number, ids = ['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela'], extra: string[] = []) => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const { addHero } = await import('../src/core/state');
    const KIT: Record<string, string[]> = {
      warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'],
      mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'], bard: ['sword', 'light'],
    };
    const state = newGame(0);
    return ids.map((id, i) => {
      const hero = state.roster.find((h) => h.defId === id) ?? addHero(state, id);
      hero.level = level;
      hero.stars = stars;
      const items = [...(KIT[def(hero).heroClass] ?? []).map((k) => ITEM_BY_ID[`${k}_${gear}`]), ...extra.map((x) => ITEM_BY_ID[x])];
      return { hero, row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items };
    });
  };

  it('lets a Phoenix Feather save its wearer once, healers pull one hero out each, and the rest fall', async () => {
    const { damage } = await import('../src/core/sim/expedition');
    // No healer: Brannoc wears a feather, Ssiv doesn't.
    const party = await kit(10, 2, 1, ['brannoc', 'ssiv', 'lyra', 'elowen', 'urzog']);
    party[0].items = [...party[0].items, (await import('../src/core/data/items')).ITEM_BY_ID.phoenix_feather];
    const sim = createSim({ regionId: 'bonewastes', party, orders, seed: 1 });
    const brannoc = sim.units.find((u) => u.name === 'Brannoc')!;
    const ssiv = sim.units.find((u) => u.name === 'Ssiv')!;
    damage(sim, null, brannoc, 1e6, false);
    expect(brannoc.alive).toBe(true);
    expect(sim.feathers).toEqual([brannoc.key]);
    damage(sim, null, ssiv, 1e6, false);
    expect(ssiv.alive).toBe(false);
    expect(ssiv.fallen).toBe(true);
    expect(buildReport(sim).fallen).toEqual([ssiv.key]);
    // With a Cleric: the first knockout is pulled out, the second falls.
    const withCleric = await kit(10, 2, 1);
    const sim2 = createSim({ regionId: 'bonewastes', party: withCleric, orders, seed: 1 });
    const [a, b] = sim2.units.filter((u) => u.side === 'hero' && u.heroClass !== 'cleric');
    damage(sim2, null, a, 1e6, false);
    damage(sim2, null, b, 1e6, false);
    expect(a.fallen).toBeFalsy();
    expect(b.fallen).toBe(true);
    // Outside skull regions nobody falls.
    const sim3 = createSim({ regionId: 'greenhollow', party: withCleric, orders, seed: 1 });
    const c = sim3.units.find((u) => u.side === 'hero')!;
    damage(sim3, null, c, 1e6, false);
    expect(c.fallen).toBeFalsy();
  });

  it('puts the elder dragon in the Dragonmaw lair', () => {
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => ({ hero: state.roster.find((h) => h.uid === u)!, row: state.parties[0].rows[i], items: [] }));
    const sim = createSim({ regionId: 'dragonmaw', party, orders, seed: 4 });
    expect(sim.units.filter((u) => u.key === 'dragon')).toHaveLength(1);
  });

  it('prints how strong and endgame parties fare in skull regions (printed, not asserted)', async () => {
    const rows: string[] = [];
    for (const [label, level, stars, gear] of [['strong', 20, 3, 3], ['endgame', 30, 4, 3]] as const) {
      for (const regionId of ['bonewastes', 'whitesilence', 'dragonmaw']) {
        let ret = 0, deaths = 0, gold = 0, dragons = 0;
        const n = 8;
        for (let seed = 1; seed <= n; seed++) {
          const party = await kit(level, stars, gear);
          const sim = createSim({ regionId, party, orders: { focus: 'explore', stance: 'balanced', retreatAtPct: 30 }, seed: seed * 11 });
          runUntil(sim, []);
          const r = buildReport(sim);
          if (r.outcome === 'returned') ret++;
          deaths += r.fallen?.length ?? 0;
          gold += r.gold;
          dragons += r.kills.dragon ?? 0;
        }
        rows.push(`${label.padEnd(8)} ${regionId.padEnd(13)} returned ${ret}/${n}  deaths ${(deaths / n).toFixed(2)}/trip  gold ${Math.round(gold / n)}${regionId === 'dragonmaw' ? `  dragons slain ${dragons}/${n}` : ''}`);
      }
    }
    console.log('\n' + rows.join('\n'));
  }, 300_000);
});

describe('day, night, seasons and road events', () => {
  const starters = () => {
    const state = newGame(0);
    return state.parties[0].slots.map((u, i) => ({ hero: state.roster.find((h) => h.uid === u)!, row: state.parties[0].rows[i], items: [] }));
  };

  it('turns day to night every hour and the seasons every day', async () => {
    const { timeOfDay, season, untilChange, DAY_CYCLE_MS, SEASON_MS } = await import('../src/core/time');
    expect(timeOfDay(0)).toBe('day');
    expect(timeOfDay(DAY_CYCLE_MS * 0.8)).toBe('night');
    expect(timeOfDay(DAY_CYCLE_MS)).toBe('day');
    expect(untilChange(0)).toBe(DAY_CYCLE_MS * 0.75);
    expect([0, 1, 2, 3, 4].map((d) => season(d * SEASON_MS))).toEqual(['spring', 'summer', 'autumn', 'winter', 'spring']);
  });

  it('brings spirits and wolves at night, frost wolves in winter, and strengthens the Moonveil', () => {
    let nightFae = 0, dayFae = 0, winterFrost = 0;
    for (let seed = 1; seed <= 20; seed++) {
      nightFae += createSim({ regionId: 'oldmill', party: starters(), orders, seed, time: 'night' }).units.filter((u) => u.key === 'wisp').length;
      dayFae += createSim({ regionId: 'oldmill', party: starters(), orders, seed, time: 'day' }).units.filter((u) => u.key === 'wisp').length;
      winterFrost += createSim({ regionId: 'oldmill', party: starters(), orders, seed, season: 'winter' }).units.filter((u) => u.key === 'frost_wolf').length;
    }
    expect(nightFae).toBeGreaterThan(0);
    expect(dayFae).toBe(0);
    expect(winterFrost).toBeGreaterThan(0);
    const day = createSim({ regionId: 'oldmill', party: starters(), orders, seed: 1, time: 'day' }).units.find((u) => u.name === 'Elowen')!;
    const night = createSim({ regionId: 'oldmill', party: starters(), orders, seed: 1, time: 'night' }).units.find((u) => u.name === 'Elowen')!;
    expect(night.atk).toBeCloseTo(day.atk * 1.15);
  });

  it('runs road events: a merchant to buy from, rivals, and storms', async () => {
    const { step } = await import('../src/core/sim/expedition');
    const seen = new Set<string>();
    let bought = false;
    for (let seed = 1; seed <= 60 && (seen.size < 3 || !bought); seed++) {
      const sim = createSim({ regionId: 'brackenwood', party: starters(), orders, seed });
      if (!sim.event.kind) continue;
      const inputs: import('../src/core/types').PlayerInput[] = [];
      while (sim.phase !== 'done') {
        step(sim, inputs);
        const cart = sim.finds.find((f) => f.merchant && !f.taken && sim.tick <= f.expires);
        if (cart && sim.gold >= cart.gold && !inputs.length) inputs.push({ tick: sim.tick + 1, kind: 'find', findId: cart.id });
      }
      if (sim.event.happened) seen.add(sim.event.kind);
      if (sim.chronicle.some((l) => l.startsWith('Bought from the merchant'))) bought = true;
      expect(buildReport(sim).conditions?.event).toBe(sim.event.happened ? sim.event.kind : null);
    }
    expect([...seen].sort()).toEqual(['merchant', 'rivals', 'storm']);
    expect(bought).toBe(true);
  });

  it('prints how the starter party does by night and in winter (printed, not asserted)', () => {
    const rows: string[] = [];
    for (const [time, season] of [['day', 'summer'], ['night', 'summer'], ['day', 'winter'], ['night', 'winter']] as const) {
      for (const regionId of ['greenhollow', 'brackenwood']) {
        let ret = 0, low = 0;
        const n = 12;
        for (let seed = 1; seed <= n; seed++) {
          const sim = createSim({ regionId, party: starters(), orders, seed: seed * 5, time, season });
          runUntil(sim, []);
          if (sim.outcome === 'returned') ret++;
          low += sim.lowestHpPct;
        }
        rows.push(`${regionId.padEnd(12)} ${time.padEnd(5)} ${season.padEnd(6)} returned ${ret}/${n}  lowest hp ${Math.round(low / n)}%`);
      }
    }
    console.log('\n' + rows.join('\n'));
  }, 120_000);
});

describe('more sieges', () => {
  const strong = async () => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const KIT: Record<string, string[]> = { warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'], mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'], bard: ['sword', 'light'] };
    const state = newGame(0);
    return state.parties[0].slots.map((u, i) => { const hero = state.roster.find((x) => x.uid === u)!; hero.level = 20; hero.stars = 3; return { hero, row: state.parties[0].rows[i], items: KIT[def(hero).heroClass].map((k) => ITEM_BY_ID[`${k}_3`]) }; });
  };
  const hunt = { focus: 'hunt' as const, stance: 'balanced' as const, retreatAtPct: 20 };

  it('Barrow Uprising: seal the tombs, then the Barrow King', async () => {
    const sim = createSim({ regionId: 'kingsbarrow', party: await strong(), orders: hunt, seed: 31, siege: true });
    expect(sim.siege!.kind).toBe('barrow_uprising');
    expect(sim.siege!.fort).toBeNull();
    expect(sim.siege!.tombs).toHaveLength(4);
    runUntil(sim, []);
    const r = buildReport(sim);
    expect(r.siege?.won).toBe(true);
    expect(r.siege?.sealed).toBe(4);
    expect(r.kills.barrow_king).toBe(1);
  });

  it("Bandit King's Hold: free the prisoners and they fight", async () => {
    const sim = createSim({ regionId: 'banditking', party: await strong(), orders: hunt, seed: 31, siege: true });
    expect(sim.siege!.cages).toHaveLength(3);
    runUntil(sim, []);
    const r = buildReport(sim);
    expect(r.siege?.won).toBe(true);
    expect(r.siege?.freed).toBeGreaterThan(0);
    expect(sim.units.some((u) => u.freed)).toBe(true);
    // Freed prisoners aren't party members: no report line, no wounds.
    expect(Object.keys(r.heroHpPct)).toHaveLength(5);
  });

  it('opens a cage with the prison key', async () => {
    const { step } = await import('../src/core/sim/expedition');
    const sim = createSim({ regionId: 'banditking', party: await strong(), orders: hunt, seed: 7, siege: true });
    while (sim.siege!.stage !== 'horde' && sim.phase !== 'done') step(sim, []);
    const key = sim.finds.find((f) => f.key)!;
    expect(key).toBeDefined();
    step(sim, [{ tick: sim.tick, kind: 'find', findId: key.id }]);
    step(sim, []);
    expect(sim.siege!.freed).toBe(3);
  });
});

describe('the far Marches (rings 4-7)', () => {
  it('fills every hex out to ring 10 with a unique, travel-timed area', async () => {
    const { ringHexes, TRAVEL_SEC } = await import('../src/core/data/frontier');
    for (let ring = 1; ring <= 10; ring++) {
      for (const [q, r] of ringHexes(ring)) expect(REGIONS.some((x) => x.q === q && x.r === r)).toBe(true);
    }
    expect(new Set(REGIONS.map((r) => r.name)).size).toBe(REGIONS.length);
    for (const r of REGIONS) {
      if (r.ring >= 5) expect(r.travelSec).toBe(TRAVEL_SEC[r.ring]);
      if (r.biome === 'sea') expect(r.requires).toBe('swim');
    }
    // A ring 7 trip takes a couple of hours, as the design's scale says.
    const far = REGIONS.find((r) => r.ring === 7)!;
    expect((far.durationSec + 2 * far.travelSec) / 3600).toBeGreaterThan(2);
  });

  it('prints how strong and endgame parties do in rings 5-7 (printed, not asserted)', async () => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const KIT: Record<string, string[]> = { warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'], mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'], bard: ['sword', 'light'] };
    const rows: string[] = [];
    for (const [label, level, stars] of [['strong', 20, 3], ['endgame', 30, 4], ['legend', 40, 5]] as const) {
      for (const tier of [5, 6, 7]) {
        const regions = REGIONS.filter((r) => r.tier === tier && r.ring >= 5 && !r.requires).slice(0, 4);
        let ret = 0, n = 0, gold = 0;
        for (const r of regions) for (let seed = 1; seed <= 3; seed++) {
          const state = newGame(0);
          const party = state.parties[0].slots.map((u, i) => { const hero = state.roster.find((x) => x.uid === u)!; hero.level = level; hero.stars = stars; return { hero, row: state.parties[0].rows[i], items: KIT[def(hero).heroClass].map((k) => ITEM_BY_ID[`${k}_3`]) }; });
          const sim = createSim({ regionId: r.id, party, orders, seed: seed * 7 });
          runUntil(sim, []);
          n++;
          if (sim.outcome === 'returned') ret++;
          gold += buildReport(sim).gold;
        }
        rows.push(`${label.padEnd(8)} tier ${tier}  returned ${ret}/${n}  gold ${Math.round(gold / n)}`);
      }
    }
    console.log('\n' + rows.join('\n'));
  }, 300_000);
});

describe('Cinder Legion', () => {
  const party = async (ids: string[], level = 30, stars = 4) => {
    const { addHero } = await import('../src/core/state');
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const KIT: Record<string, string[]> = { warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'], mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'], bard: ['sword', 'light'] };
    const state = newGame(0);
    return ids.map((id, i) => { const hero = state.roster.find((h) => h.defId === id) ?? addHero(state, id); hero.level = level; hero.stars = stars; return { hero, row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: (KIT[def(hero).heroClass] ?? []).map((k) => ITEM_BY_ID[`${k}_3`]) }; });
  };
  const hunt = { focus: 'hunt' as const, stance: 'balanced' as const, retreatAtPct: 20 };

  it('sits in ring 6 with a road out, and the burning ground spreads', async () => {
    const { step } = await import('../src/core/sim/expedition');
    const r = REGIONS.find((x) => x.id === 'cinderlegion')!;
    expect(r.ring).toBe(6);
    expect(r.travelSec).toBeGreaterThan(0);
    const sim = createSim({ regionId: 'cinderlegion', party: await party(['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela']), orders: hunt, seed: 3, siege: true });
    while (sim.siege!.stage === 'approach' && sim.phase === 'out') step(sim, []);
    const first = sim.siege!.fires.length;
    for (let i = 0; i < 30 * 10; i++) step(sim, []);
    expect(sim.siege!.fires.length).toBeGreaterThan(first);
  });

  it('burns heroes standing in fire, but not the Ashborn', async () => {
    const { step } = await import('../src/core/sim/expedition');
    const sim = createSim({ regionId: 'cinderlegion', party: await party(['brannoc', 'kragga', 'lyra', 'elowen', 'mirela']), orders: hunt, seed: 3, siege: true });
    while (sim.siege!.stage === 'approach' && sim.phase === 'out') step(sim, []);
    const brannoc = sim.units.find((u) => u.name === 'Brannoc')!;
    const kragga = sim.units.find((u) => u.name === 'Kragga')!;
    // Put both in a fire, away from the fighting.
    sim.siege!.fires = [{ x: brannoc.x, y: brannoc.y, r: 300, max: 300 }];
    kragga.x = brannoc.x + 20;
    kragga.y = brannoc.y;
    const b0 = brannoc.hp, k0 = kragga.hp;
    sim.units.filter((u) => u.side === 'enemy').forEach((u) => (u.alive = false));
    step(sim, []);
    expect(brannoc.hp).toBeLessThan(b0);
    expect(kragga.hp).toBeGreaterThanOrEqual(k0);
  });

  it('puts fires out with Frost Nova and the water cisterns', async () => {
    const { step } = await import('../src/core/sim/expedition');
    const sim = createSim({ regionId: 'cinderlegion', party: await party(['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela']), orders: hunt, seed: 3, siege: true, spells: [{ id: 'frost', level: 1 }] });
    while (sim.siege!.stage === 'approach' && sim.phase === 'out') step(sim, []);
    const fire = sim.siege!.fires[0];
    sim.mana = 100;
    // One input list for the whole trip, as the game keeps it.
    const inputs: import('../src/core/types').PlayerInput[] = [{ tick: sim.tick, kind: 'cast', spell: 'frost', x: fire.x, y: fire.y }];
    step(sim, inputs);
    expect(sim.siege!.fires).not.toContain(fire);
    const cistern = sim.finds.find((f) => f.water)!;
    const byCistern = { x: cistern.x + 50, y: cistern.y, r: 60, max: 100 };
    sim.siege!.fires.push(byCistern);
    inputs.push({ tick: sim.tick, kind: 'find', findId: cistern.id });
    step(sim, inputs);
    expect(sim.siege!.fires).not.toContain(byCistern);
    expect(sim.siege!.doused).toBeGreaterThanOrEqual(2);
  });
});

describe('the Deep Marches (rings 8-10)', () => {
  const KIT: Record<string, string[]> = { warrior: ['worldbreaker', 'wyrmscale'], rogue: ['whisper', 'thornmantle'], ranger: ['starfall', 'thornmantle'], mage: ['ember_staff', 'thornmantle'], cleric: ['moonsilver', 'aegis', 'wyrmscale'], bard: ['mournblade', 'thornmantle'] };
  const awakenedParty = async (level = 55, awakened = 3) => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const state = newGame(0);
    return state.parties[0].slots.map((u, i) => {
      const hero = state.roster.find((x) => x.uid === u)!;
      hero.level = level; hero.stars = 5; hero.awakened = awakened;
      return { hero, row: state.parties[0].rows[i], items: KIT[def(hero).heroClass].map((k) => ITEM_BY_ID[k]) };
    });
  };

  it('are skull areas of tiers 7-10, hours away, some with a lord in the lair', () => {
    const deep = REGIONS.filter((r) => r.ring >= 8);
    expect(deep.length).toBe(48 + 54 + 60);
    for (const r of deep) {
      expect(r.skull).toBe(true);
      expect(r.tier).toBeGreaterThanOrEqual(r.ring - 1);
      expect(r.tier).toBeLessThanOrEqual(r.ring);
    }
    const ten = deep.find((r) => r.ring === 10)!;
    expect((ten.durationSec + 2 * ten.travelSec) / 3600).toBeGreaterThan(8);
    const lords = new Set(deep.map((r) => r.boss).filter(Boolean));
    expect(lords.size).toBeGreaterThanOrEqual(5);
    // Nothing nearer than ring 8 changed tier: the old far Marches stop at 7.
    expect(Math.max(...REGIONS.filter((r) => r.ring <= 7).map((r) => r.tier))).toBe(7);
  });

  it('the Stables shorten the road', async () => {
    const town = await import('../src/core/town');
    const state = newGame(0);
    const r = REGIONS.find((x) => x.ring === 9)!;
    expect(town.travelSec(state, r)).toBe(r.travelSec);
    state.buildings.stables = 2;
    expect(town.travelSec(state, r)).toBe(Math.round(r.travelSec * 0.7));
  });

  it('awakening raises the level cap and stats, only past the last star and level cap', async () => {
    const { awakenBlock, levelCap, stats } = await import('../src/core/heroes');
    const state = newGame(0);
    const h = state.roster[0];
    h.stars = 5; h.level = 30;
    expect(awakenBlock(h)).toMatch(/level/);
    h.level = levelCap(h);
    const capBefore = levelCap(h);
    const mightBefore = stats(h).might;
    expect(awakenBlock(h)).toBeNull();
    h.awakened = 1;
    expect(levelCap(h)).toBe(capBefore + 5);
    expect(stats(h).might).toBeGreaterThan(mightBefore * 1.08);
    h.awakened = 3;
    expect(awakenBlock(h)).toMatch(/Fully/);
  });

  it('named gear never turns up as ordinary loot or in shops', async () => {
    const { ITEM_BY_ID, LOOT_ITEMS, NAMED_ITEMS } = await import('../src/core/data/items');
    const town = await import('../src/core/town');
    expect(NAMED_ITEMS.length).toBe(12);
    for (const id of NAMED_ITEMS) {
      expect(ITEM_BY_ID[id].named).toBe(true);
      expect(LOOT_ITEMS.some((i) => i.id === id)).toBe(false);
    }
    const state = newGame(0);
    for (const shop of ['weaponsmith', 'armorer', 'market'] as const) {
      state.buildings[shop] = 3;
      expect(town.shopStock(state, shop).some((i) => i.named)).toBe(false);
    }
  });

  it('a lord slain brings home a Legendary chest with Starshards', async () => {
    const lair = REGIONS.find((r) => r.ring === 8 && r.tier === 7 && r.boss && !r.requires)!;
    const sim = createSim({ regionId: lair.id, party: await awakenedParty(), orders, seed: 7 });
    runUntil(sim, []);
    const report = buildReport(sim);
    expect(report.outcome).toBe('returned');
    expect(report.legendary).toBeTruthy();
    expect(report.legendary!.shards).toBeGreaterThanOrEqual(3);
    expect(report.shards).toBeGreaterThanOrEqual(report.legendary!.shards);
    if (report.legendary!.item) expect(report.items).toContain(report.legendary!.item);
    expect(report.chronicle.some((l) => /Legendary chest/.test(l))).toBe(true);
  }, 60_000);

  it('a legendary party (not awakened) is out of its depth at tier 10', async () => {
    const r = REGIONS.find((x) => x.tier === 10 && !x.boss && !x.requires)!;
    const sim = createSim({ regionId: r.id, party: await awakenedParty(40, 0), orders, seed: 7 });
    runUntil(sim, []);
    const report = buildReport(sim);
    expect(report.outcome).toBe('retreated');
    expect(report.legendary).toBeUndefined();
  }, 60_000);
});

describe('the Siege of Dragonmaw', () => {
  const NAMED: Record<string, string[]> = { warrior: ['worldbreaker', 'wyrmscale'], rogue: ['whisper', 'thornmantle'], ranger: ['starfall', 'thornmantle'], mage: ['ember_staff', 'thornmantle'], cleric: ['moonsilver', 'aegis', 'wyrmscale'], bard: ['mournblade', 'thornmantle'] };
  const hunt = { focus: 'hunt' as const, stance: 'balanced' as const, retreatAtPct: 20 };
  const bothParties = async () => {
    const { addHero } = await import('../src/core/state');
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const state = newGame(0);
    return ['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela', 'varra', 'hilda', 'ashka', 'caelum', 'tamsin'].map((id, i) => {
      const hero = state.roster.find((h) => h.defId === id) ?? addHero(state, id);
      hero.level = 55; hero.stars = 5; hero.awakened = 3;
      return { hero, row: (i % 5 < 2 ? 'front' : 'back') as 'front' | 'back', items: NAMED[def(hero).heroClass].map((k) => ITEM_BY_ID[k]) };
    });
  };
  /** Runs the siege, clicking every ballista as soon as it shows up. */
  const runClicking = async (seed: number) => {
    const { step } = await import('../src/core/sim/expedition');
    const sim = createSim({ regionId: 'wyrmthrone', party: await bothParties(), orders: hunt, seed, siege: true });
    const inputs: PlayerInput[] = [];
    const seen: string[] = [];
    for (let n = 0; sim.phase !== 'done' && n < 40000; n++) {
      for (const f of sim.finds) if (f.ballista && !f.taken && sim.tick <= f.expires && !inputs.some((i) => i.kind === 'find' && i.findId === f.id)) inputs.push({ kind: 'find', findId: f.id, tick: sim.tick });
      if (sim.siege && !seen.includes(sim.siege.stage)) seen.push(sim.siege.stage);
      step(sim, inputs);
    }
    return { sim, seen };
  };

  it('is a ring-9 skull siege, far up the road', () => {
    const r = REGIONS.find((x) => x.id === 'wyrmthrone')!;
    expect(r.siege).toBe('dragonmaw');
    expect(r.ring).toBe(9);
    expect(r.skull).toBe(true);
    expect(r.travelSec).toBeGreaterThan(2 * 3600);
  });

  it('goes altars, brood, Elder Wyrm; winning brings named gear, Starshards and a dragon kill', async () => {
    const { sim, seen } = await runClicking(11);
    expect(seen).toEqual(['approach', 'breach', 'horde', 'keep', 'won']);
    const report = buildReport(sim);
    expect(report.siege!.won).toBe(true);
    expect(report.siege!.sealed).toBe(3);
    expect(report.siege!.bolts).toBeGreaterThanOrEqual(2);
    expect(report.kills.elder_wyrm).toBe(1);
    const { NAMED_ITEMS } = await import('../src/core/data/items');
    expect(report.items.some((id) => NAMED_ITEMS.includes(id))).toBe(true);
    expect(report.shards).toBeGreaterThanOrEqual(6);
    expect(report.legendary).toBeTruthy();
  }, 120_000);

  it('dragon breath is marked first, then lands on whoever is under it', async () => {
    const { step } = await import('../src/core/sim/expedition');
    const sim = createSim({ regionId: 'wyrmthrone', party: await bothParties(), orders: hunt, seed: 11, siege: true });
    for (let n = 0; n < 40000 && !(sim.siege!.breaths.length); n++) step(sim, []);
    const b = sim.siege!.breaths[0];
    expect(b).toBeTruthy();
    expect(b.at).toBeGreaterThan(sim.tick);
    // Put a hero right under it and let it land.
    const hero = sim.units.find((u) => u.side === 'hero' && u.alive && !u.pet && !u.minion)!;
    while (sim.siege!.breaths.includes(b)) { hero.x = b.x; hero.y = b.y; hero.hp = hero.maxHp; step(sim, []); }
    expect(hero.hp).toBeLessThan(hero.maxHp * 0.95);
    expect(sim.siege!.fires.some((f) => f.until !== undefined)).toBe(true);
  }, 120_000);
});

describe('playtest fixes', () => {
  it('Next Goals says what the Town Hall is short of, and where to find it', async () => {
    const { nextGoals } = await import('../src/core/tutorial');
    const state = newGame(0);
    state.materials.stone = 10;
    const goal = nextGoals(state).find((g) => g.startsWith('Raise the Town Hall'))!;
    expect(goal).toMatch(/short of .*stone/);
    expect(goal).toMatch(/hills, mountains/);
    state.buildings.market = 1;
    expect(nextGoals(state).join(' ')).toMatch(/The Market sells them too/);
  });
});

describe('mid-game balance', () => {
  it('power counts gear, and the recommendation rises with every tier', async () => {
    const town = await import('../src/core/town');
    const { RECOMMENDED } = await import('../src/core/data/world');
    const { power } = await import('../src/core/heroes');
    const state = newGame(0);
    const brannoc = state.roster[0];
    expect(town.heroStrength(state, brannoc)).toBe(power(brannoc));
    town.addItem(state, 'axe_3');
    town.equip(state, brannoc.uid, state.items[state.items.length - 1].uid);
    expect(town.heroStrength(state, brannoc)).toBeGreaterThan(power(brannoc) + 20);
    for (let t = 2; t < RECOMMENDED.length; t++) expect(RECOMMENDED[t]).toBeGreaterThan(RECOMMENDED[t - 1]);
  });

  it('a party at the recommended power comes home from its tier', async () => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const town = await import('../src/core/town');
    const { recommendedPower } = await import('../src/core/data/world');
    // Level 16, 2 stars, Steel kit: about 1100 power, the tier-4 recommendation.
    const KIT: Record<string, string[]> = { warrior: ['axe', 'shield', 'heavy'], rogue: ['dagger', 'light'], ranger: ['bow', 'light'], mage: ['staff', 'robe'], cleric: ['mace', 'shield', 'medium'] };
    const state = newGame(0);
    for (const h of state.roster) {
      h.level = 16; h.stars = 2;
      for (const k of KIT[def(h).heroClass]) { town.addItem(state, `${k}_2`); town.equip(state, h.uid, state.items[state.items.length - 1].uid); }
    }
    const total = state.roster.reduce((a, h) => a + town.heroStrength(state, h), 0);
    expect(total).toBeGreaterThanOrEqual(recommendedPower(4) * 0.95);
    const party = state.parties[0].slots.map((u, i) => {
      const hero = state.roster.find((h) => h.uid === u)!;
      return { hero, row: state.parties[0].rows[i], items: Object.values(hero.gear).map((uid) => ITEM_BY_ID[state.items.find((x) => x.uid === uid)!.defId]) };
    });
    let home = 0;
    for (const r of REGIONS.filter((x) => x.tier === 4 && !x.requires && !x.siege && !x.skull).slice(0, 3)) {
      const sim = createSim({ regionId: r.id, party, orders, seed: 5 });
      runUntil(sim, []);
      if (buildReport(sim).outcome === 'returned') home++;
    }
    expect(home).toBeGreaterThanOrEqual(2);
  }, 120_000);
});

describe('scouting, sites, captains and secret heroes', () => {
  const strongParty = async (level = 30, stars = 4) => {
    const { ITEM_BY_ID } = await import('../src/core/data/items');
    const { def } = await import('../src/core/heroes');
    const KIT: Record<string, string[]> = { warrior: ['axe_3', 'shield_3', 'heavy_3'], rogue: ['dagger_3', 'light_3'], ranger: ['bow_3', 'light_3'], mage: ['staff_3', 'robe_3'], cleric: ['mace_3', 'shield_3', 'medium_3'] };
    const state = newGame(0);
    const party = state.parties[0].slots.map((u, i) => {
      const hero = state.roster.find((h) => h.uid === u)!;
      hero.level = level; hero.stars = stars;
      return { hero, row: state.parties[0].rows[i], items: KIT[def(hero).heroClass].map((k) => ITEM_BY_ID[k]) };
    });
    return { state, party };
  };

  it('only scouts scout; a scout maps new land or finds sites in known land', async () => {
    const sc = await import('../src/core/scouting');
    const state = newGame(0);
    const brannoc = state.roster.find((h) => h.defId === 'brannoc')!;
    const lyra = state.roster.find((h) => h.defId === 'lyra')!;
    const oldmill = REGIONS.find((r) => r.id === 'oldmill')!;
    expect(sc.isScout(brannoc)).toBe(false);
    expect(sc.scoutBlock(state, brannoc, oldmill, true, 0)).toMatch(/no scout/);
    expect(sc.scoutBlock(state, lyra, oldmill, true, 0)).toBeNull();
    expect(sc.scoutBlock(state, lyra, oldmill, false, 0)).toMatch(/Map it first/);
    // Strong enough to be sure: Lyra maps Old Mill Road.
    lyra.level = 20; lyra.stars = 3;
    const m = sc.startScouting(state, lyra, 'oldmill', true, 0, 42);
    expect(sc.scoutBlock(state, lyra, REGIONS.find((r) => r.id === 'brackenwood')!, true, 0)).toMatch(/already out scouting/);
    const res = sc.resolveScouting(state, m, m.endsAt);
    expect(res.ok).toBe(true);
    expect(state.explored).toContain('oldmill');
    // Searching known land finds at least one site.
    const search = sc.startScouting(state, lyra, 'greenhollow', false, 0, 7);
    state.scouting = [];
    const found = sc.resolveScouting(state, search, search.endsAt);
    expect(found.sites.length).toBeGreaterThanOrEqual(1);
    expect(state.sites.filter((x) => x.regionId === 'greenhollow').length).toBe(found.sites.length);
  });

  it('scouts and parties share the guild\'s outings: one at first, two from Guild Hall level 3', async () => {
    const sc = await import('../src/core/scouting');
    const { outingBlock, outingsOut } = await import('../src/core/state');
    const s = newGame(0);
    // Lyra is a party member; a bench scout shows the rule isn't about who is in the party.
    const lyra = s.roster.find((h) => h.defId === 'lyra')!;
    const ssiv = s.roster.find((h) => h.defId === 'ssiv')!;
    const brackenwood = REGIONS.find((r) => r.id === 'brackenwood')!;
    expect(outingBlock(s)).toBeNull();
    sc.startScouting(s, lyra, 'oldmill', true, 0, 1);
    expect(outingsOut(s)).toBe(1);
    // A second scout can't go, and nor can the party.
    expect(sc.scoutBlock(s, ssiv, brackenwood, true, 0)).toMatch(/No free outing/);
    expect(outingBlock(s)).toMatch(/one outing at a time.*Lyra is scouting Old Mill Road/);
    // With the Guild Hall at level 3 there is room for both, but not for a siege of two parties.
    s.buildings.guildhall = 3;
    expect(outingBlock(s)).toBeNull();
    expect(outingBlock(s, 2)).toMatch(/2 outings at a time/);
    expect(sc.scoutBlock(s, ssiv, brackenwood, true, 0)).toBeNull();
  });

  it('a weak scout gets chased off and comes back wounded', async () => {
    const sc = await import('../src/core/scouting');
    const state = newGame(0);
    const ssiv = state.roster.find((h) => h.defId === 'ssiv')!;
    const far = REGIONS.find((r) => r.tier === 6 && !r.requires && !r.skull)!;
    expect(sc.scoutChance(state, ssiv, far)).toBeLessThan(0.4);
    let wounded = 0;
    for (let seed = 1; seed <= 20; seed++) {
      ssiv.woundedUntil = 0;
      const m = sc.startScouting(state, ssiv, far.id, true, 0, seed);
      state.scouting = [];
      if (!sc.resolveScouting(state, m, 1000).ok) { wounded++; expect(ssiv.woundedUntil).toBeGreaterThan(1000); }
    }
    expect(wounded).toBeGreaterThan(10);
  });

  it('sites put a camp, lair or dungeon on the trail, and a strong party deals with them', async () => {
    for (const kind of ['camp', 'lair', 'dungeon', 'cache', 'shrine'] as const) {
      const { party } = await strongParty();
      const sim = createSim({ regionId: 'brackenwood', party, orders, seed: 4, site: { kind, name: `a test ${kind}` } });
      expect(sim.site?.kind).toBe(kind);
      runUntil(sim, []);
      const r = buildReport(sim);
      expect(r.site?.cleared).toBe(true);
      if (kind !== 'shrine') expect(r.items.length).toBeGreaterThan(0);
    }
  }, 120_000);

  it('every hero leads differently, and the Captain changes the trip', async () => {
    const { HEROES } = await import('../src/core/data/heroes');
    const { HERO_CAPTAIN, CAPTAIN_STYLES } = await import('../src/core/data/captains');
    for (const d of HEROES) expect(CAPTAIN_STYLES[HERO_CAPTAIN[d.id]]).toBeTruthy();
    const grades = new Set(HEROES.map((d) => CAPTAIN_STYLES[HERO_CAPTAIN[d.id]].grade));
    for (const g of ['great', 'good', 'mixed', 'poor', 'plain']) expect(grades.has(g as never)).toBe(true);
    const { state, party } = await strongParty(10, 1);
    const lyra = state.roster.find((h) => h.defId === 'lyra')!; // Pathfinder
    const brannoc = state.roster.find((h) => h.defId === 'brannoc')!; // Bulwark
    expect(createSim({ regionId: 'greenhollow', party, orders, seed: 1, captain: lyra.uid }).roadMult).toBeCloseTo(1.2);
    expect(createSim({ regionId: 'greenhollow', party, orders, seed: 1, captain: brannoc.uid }).roadMult).toBeCloseTo(0.9);
  });

  it('secret heroes stay out of packs until something catches their eye', async () => {
    const { packPool } = await import('../src/core/packs');
    const { checkSecrets } = await import('../src/core/secretHeroes');
    const { addHero } = await import('../src/core/state');
    const state = newGame(0);
    expect(packPool(state).some((d) => d.secret)).toBe(false);
    const edric = addHero(state, 'edric');
    const report = { regionId: 'kingsroad', outcome: 'returned', gold: 0, xp: 0, enemiesDefeated: 0, findsCollected: 0, chestCards: 0, pieces: {}, materials: {}, items: [], kills: {},
      groupsCleared: 0, groupsTotal: 0, chronicle: [], guidancePct: 0, heroHpPct: { [edric.uid]: 100 }, captain: edric.uid, conditions: { time: 'day', season: 'spring', event: null } } as never;
    expect(checkSecrets(state, { kind: 'report', report })).toHaveLength(0);
    (report as { conditions: { time: string } }).conditions.time = 'night';
    const joined = checkSecrets(state, { kind: 'report', report });
    expect(joined.map((d) => d.id)).toEqual(['marta']);
    expect(state.roster.some((h) => h.defId === 'marta')).toBe(true);
    expect(packPool(state).some((d) => d.id === 'marta')).toBe(true);
    // Only once.
    expect(checkSecrets(state, { kind: 'report', report })).toHaveLength(0);
  });
});

describe('card art', () => {
  it('every hero has a persona, and every card draws without holes', async () => {
    const { HEROES } = await import('../src/core/data/heroes');
    const { SPELLS } = await import('../src/core/data/spells');
    const { HAS_PERSONA } = await import('../src/art/portraits');
    const { heroCardArtSvg, spellCardArtSvg } = await import('../src/art/cards');
    for (const d of HEROES) {
      expect(HAS_PERSONA(d.id)).toBe(true);
      for (const silhouette of [false, true]) {
        const svg = heroCardArtSvg(d, { silhouette });
        expect(svg).not.toMatch(/undefined|NaN/);
        expect(svg.startsWith('<svg')).toBe(true);
      }
    }
    for (const sp of SPELLS) {
      const svg = spellCardArtSvg(sp);
      expect(svg).not.toMatch(/undefined|NaN/);
      // One <svg> tag per nested icon, never two width attributes in one tag.
      expect(svg).not.toMatch(/<svg[^>]*width="[^"]*"[^>]*width=/);
    }
  });
});

describe('small fixes', () => {
  it("the guide's last step follows the party: out, then to the report", async () => {
    const { stepScreen, TUTORIAL } = await import('../src/core/tutorial');
    const alone = TUTORIAL.find((t) => t.id === 'alone')!;
    const state = newGame(0);
    expect(stepScreen(alone, state)).toBe('map');
    state.expeditions.push({ id: 1 } as never);
    expect(stepScreen(alone, state)).toBe('expedition');
    state.reports.push({ id: 1 } as never);
    expect(stepScreen(alone, state)).toBe('guild');
  });

  it('generated areas grow their groups by danger tier, not by ring', () => {
    for (const r of REGIONS.filter((x) => x.id.startsWith('far_') && x.ring < 8)) {
      expect(r.groupSize[1]).toBe(r.tier <= 6 ? 6 : 7);
    }
  });
});

describe('heroes about town', () => {
  it('every hero has a habit of their own, and every routine is a closed loop', async () => {
    const { HEROES } = await import('../src/core/data/heroes');
    const { HABITS } = await import('../src/core/data/habits');
    const { buildRoutine, poseAt } = await import('../src/art/townLife');
    const full = { townhall: 5, guildhall: 5, tavern: 5, weaponsmith: 3, armorer: 3, temple: 3, market: 3, magetower: 4, stables: 3 };
    const bare = { townhall: 1, guildhall: 1 };
    for (const d of HEROES) {
      expect(HABITS[d.id], d.id).toBeDefined();
      for (const levels of [full, bare]) {
        for (const night of [false, true]) {
          const r = buildRoutine(`u-${d.id}`, d.id, d.personality, false, { levels, stage: levels.townhall, night });
          expect(r.total).toBeGreaterThan(10);
          // The loop ends where it starts, so the hero never jumps when it repeats.
          const a = poseAt(r, -r.offset);
          const b = poseAt(r, r.total - r.offset - 0.001);
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(2);
        }
      }
    }
  });

  it('nobody drinks at a Tavern that is not built', async () => {
    const { buildRoutine } = await import('../src/art/townLife');
    const r = buildRoutine('u1', 'bruni', 'steady', false, { levels: { townhall: 1, guildhall: 1 }, stage: 1, night: false });
    expect(r.legs.some((l) => l.text.includes('Tavern'))).toBe(false);
    const w = buildRoutine('u1', 'bruni', 'steady', true, { levels: { townhall: 3, guildhall: 3, temple: 1 }, stage: 3, night: false });
    expect(w.legs.every((l) => l.kind === 'walk' || l.text.includes('Temple'))).toBe(true);
  });
});

describe('novice packs', () => {
  it('mostly train the heroes the guild has, and rarely bring a new face', () => {
    const state = newGame(0);
    const start = state.roster.length;
    state.packs.novice = 40;
    const rng = new Rng(21);
    let newFaces = 0;
    let copies = 0;
    let drills = 0;
    for (let i = 0; i < 40; i++) {
      for (const c of openPack(state, rng, 'novice')!) {
        if (c.kind !== 'hero') throw new Error('Novice Packs hold no spells');
        if (c.result === 'new') newFaces++;
        if (c.result === 'copy') copies++;
        if (c.result === 'training') drills++;
        if (c.result === 'new') expect(c.rarity).toBe('common');
      }
    }
    expect(state.roster.length).toBe(start + newFaces);
    // About one pack in eight brings someone new.
    expect(newFaces).toBeGreaterThan(0);
    expect(newFaces).toBeLessThan(12);
    expect(copies + drills).toBeGreaterThan(170);
  });

  it('the Tavern gives Novice Packs until the Town Hall is raised', async () => {
    const town = await import('../src/core/town');
    const state = newGame(0);
    state.buildings.tavern = 1;
    state.tavernNextPackAt = 0;
    town.claimTavernPack(state, 1);
    expect(state.packs.novice).toBe(1);
    state.buildings.townhall = 2;
    state.tavernNextPackAt = 0;
    town.claimTavernPack(state, 2);
    expect(state.packs.recruit).toBe(1);
  });
});

describe('opening up a little at a time', () => {
  it('old saves get no Novice Pack and no flood of news', async () => {
    const { migrate } = await import('../src/core/state');
    const { newUnlocks } = await import('../src/core/unlocks');
    const old = newGame(0) as unknown as Record<string, unknown>;
    old.packs = { recruit: 2, grimoire: 0, veteran: 0, champion: 0 };
    old.pieces = { recruit: 3, grimoire: 0, veteran: 0, champion: 0 };
    const s = migrate(old as never);
    expect(s.packs.novice).toBe(0);
    expect(s.pieces.novice).toBe(0);
    expect(newUnlocks(s)).toEqual([]);
  });

  it('a new guild sees only what it needs, and more opens with each trip', async () => {
    const { unlocked, plotOpen, newUnlocks } = await import('../src/core/unlocks');
    const s = newGame(0);
    newUnlocks(s);
    expect(['spells', 'deeds', 'clock', 'contracts', 'focus', 'stance', 'tribes', 'parties'].some((f) => unlocked(s, f as never))).toBe(false);
    expect(['weaponsmith', 'armorer', 'market', 'temple', 'magetower', 'stables'].some((b) => plotOpen(s, b))).toBe(false);
    expect(plotOpen(s, 'tavern')).toBe(true);
    // Trip orders open with the town, not with trips: Focus comes with the Guild Hall at level 2.
    s.tripsCompleted = 1;
    expect(unlocked(s, 'focus')).toBe(false);
    s.buildings.guildhall = 2;
    expect(unlocked(s, 'focus')).toBe(true);
    expect(newUnlocks(s).some((n) => n.includes('choose a focus'))).toBe(true);
    s.tripsCompleted = 4;
    s.tutorial.done = true;
    expect(plotOpen(s, 'magetower')).toBe(true);
    expect(unlocked(s, 'clock')).toBe(true);
  });
});

describe('half-revealed packs', () => {
  it('keep their cards in the save, exactly as dealt', async () => {
    const { saveCards, loadCards } = await import('../src/core/packs');
    const state = newGame(0);
    state.packs.novice = 1;
    state.packs.recruit = 1;
    for (const type of ['novice', 'recruit'] as const) {
      const cards = openPack(state, new Rng(5), type)!;
      const back = loadCards(JSON.parse(JSON.stringify(saveCards(cards))));
      expect(back.map((c) => [c.kind, c.rarity, c.result, c.kind === 'hero' ? c.def.id : c.spell.id]))
        .toEqual(cards.map((c) => [c.kind, c.rarity, c.result, c.kind === 'hero' ? c.def.id : c.spell.id]));
    }
  });
});

describe("the guild's hold", () => {
  it('scouts reach only land next to town or next to a secured area', async () => {
    const { canReach, gainHold, holdNeed, secured } = await import('../src/core/hold');
    const { neighbours } = await import('../src/core/areas');
    const s = newGame(0);
    const home = REGIONS.find((r) => r.id === 'greenhollow')!;
    const beyond = neighbours(home).find((r) => r.ring === 2)!;
    expect(canReach(s, REGIONS.find((r) => r.ring === 1 && r.id !== 'greenhollow')!)).toBe(true);
    expect(canReach(s, beyond)).toBe(false);
    const trip = { regionId: 'greenhollow', outcome: 'returned', groupsCleared: 3, groupsTotal: 3 } as never;
    expect(gainHold(s, trip)).toBe(false);
    expect(s.hold!.greenhollow).toBe(2);
    expect(gainHold(s, trip)).toBe(true);
    expect(secured(s, 'greenhollow')).toBe(true);
    expect(s.hold!.greenhollow).toBe(holdNeed(home));
    expect(canReach(s, beyond)).toBe(true);
    // A party that turns back adds nothing.
    const t = newGame(0);
    gainHold(t, { regionId: 'greenhollow', outcome: 'retreated', groupsCleared: 0, groupsTotal: 3 } as never);
    expect(t.hold!.greenhollow ?? 0).toBe(0);
  });

  it('older saves keep every area they had mapped secured', async () => {
    const { migrate } = await import('../src/core/state');
    const { secured } = await import('../src/core/hold');
    const old = newGame(0) as unknown as Record<string, unknown>;
    delete old.hold;
    old.explored = ['greenhollow', 'oldmill'].filter((id) => REGIONS.some((r) => r.id === id));
    const s = migrate(old as never);
    for (const id of s.explored) expect(secured(s, id)).toBe(true);
  });
});

describe('the first area is plain', () => {
  it('Greenhollow has no crossroads or road events; other areas keep their side paths', () => {
    const party = partyHeroes(newGame(0)).map((hero, i) => ({ hero, row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: [] }));
    const orders: Orders = { focus: 'explore', stance: 'balanced', retreatAtPct: 30 };
    for (let seed = 1; seed <= 20; seed++) {
      const sim = createSim({ regionId: 'greenhollow', party, orders, seed });
      expect(sim.forks.filter((f) => f.kind !== 'hoard')).toHaveLength(0);
      expect(sim.event.kind).toBeNull();
    }
    const other = REGIONS.find((r) => r.ring === 1 && r.id !== 'greenhollow' && !r.siege)!;
    expect(createSim({ regionId: other.id, party, orders, seed: 3 }).forks.length).toBeGreaterThan(0);
  });
});

describe('chests and discoveries', () => {
  const party = () => partyHeroes(newGame(0)).map((hero, i) => ({ hero, row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: [] }));
  const orders: Orders = { focus: 'explore', stance: 'balanced', retreatAtPct: 30 };

  it('puts few chests on side paths, nearly all of them guarded', () => {
    let chests = 0, guarded = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const sim = createSim({ regionId: 'oldmill', party: party(), orders, seed, season: 'spring' });
      const hoards = sim.forks.filter((f) => f.kind === 'hoard');
      expect(hoards.length).toBeLessThanOrEqual(3);
      chests += hoards.length;
      guarded += hoards.filter((f) => sim.groups.some((g) => g.forkId === f.id)).length;
    }
    expect(chests / 40).toBeLessThan(2.2);
    expect(guarded / chests).toBeGreaterThanOrEqual(0.7);
  });

  it('lets the Captain decide: a greedy Captain goes for chests far more often than a cowardly one', async () => {
    const { addHero } = await import('../src/core/state');
    const takeRate = (captainId: string) => {
      let taken = 0, seen = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const s = newGame(0);
        const cap = addHero(s, captainId);
        const p = [cap, ...partyHeroes(s).slice(0, 4)].map((hero, i) => ({ hero, row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: [] }));
        const sim = runUntil(createSim({ regionId: 'oldmill', party: p, orders, seed, captain: cap.uid }), []);
        for (const f of sim.forks.filter((x) => x.kind === 'hoard' && x.decided)) {
          seen++;
          if (f.decided === 'take') taken++;
        }
      }
      return taken / Math.max(1, seen);
    };
    expect(takeRate('rowan')).toBeGreaterThan(takeRate('pip') + 0.3);
  });

  it('lets the Captain decide at discoveries the Guildmaster leaves alone', () => {
    const sim = runUntil(createSim({ regionId: 'oldmill', party: party(), orders, seed: 4 }), []);
    const discs = sim.finds.filter((f) => f.disc);
    expect(discs.length).toBeGreaterThan(0);
    for (const f of discs) if (f.at! < sim.pathLen[sim.pathLen.length - 1] * 0.5) expect(f.decided).not.toBeNull();
  });
});

describe('landmarks and hazards', () => {
  const orders: Orders = { focus: 'explore', stance: 'balanced', retreatAtPct: 30 };
  const team = async (ids: string[]) => {
    const { addHero } = await import('../src/core/state');
    const s = newGame(0);
    return ids.map((id, i) => ({ hero: s.roster.find((h) => h.defId === id) ?? addHero(s, id), row: (i < 2 ? 'front' : 'back') as 'front' | 'back', items: [] }));
  };

  it('every hand-made area has its own landmark, and the party passes it', async () => {
    const { AREA_LANDMARKS } = await import('../src/core/data/landmarks');
    for (const r of REGIONS.filter((x) => x.ring <= 3 && !x.siege && !x.requires)) expect(AREA_LANDMARKS[r.id], r.id).toBeDefined();
    const party = await team(['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela']);
    const sim = runUntil(createSim({ regionId: 'oldmill', party, orders, seed: 2 }), []);
    expect(sim.landmarks.some((l) => l.key === 'mill' && l.passed)).toBe(true);
    expect(sim.chronicle.some((l) => l.startsWith('The broken mill.'))).toBe(true);
  });

  it('gives the right tribe more at their landmark', async () => {
    const thorn = await team(['lyra', 'briar', 'brannoc', 'ssiv', 'mirela']);
    // Seasoned heroes, so the Thornkin are still standing when the party reaches the tree.
    for (const p of thorn) addXp(p.hero, 1e6);
    const sim = runUntil(createSim({ regionId: 'elderwood', party: thorn, orders, seed: 5 }), []);
    expect(sim.landmarks.find((l) => l.key === 'eldertree')?.outcome).toBe('The Elder Tree\'s blessing');
  });

  it('makes hazards slow the party, unless a hero of the right tribe leads the way', async () => {
    const plain = await team(['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela']);
    const free = await team(['edric', 'rowan', 'mirela', 'lyra', 'elowen']);
    const spring = { regionId: 'oldmill', orders, seed: 9, season: 'spring' as const };
    const a = createSim({ ...spring, party: plain });
    const b = createSim({ ...spring, party: free });
    expect(a.hazards[0]?.kind).toBe('mud');
    const through = (sim: typeof a) => {
      const hz = sim.hazards[0];
      while (sim.leaderDist < hz.from + 10 && sim.phase === 'out') step(sim, []);
      const t0 = sim.tick;
      while (sim.leaderDist < hz.to && sim.phase === 'out') step(sim, []);
      return sim.tick - t0;
    };
    expect(through(b)).toBeLessThan(through(a));
    // In summer the farm roads are dry.
    expect(createSim({ ...spring, season: 'summer', party: plain }).hazards).toHaveLength(0);
  });

  it('costs a third of the haul for every hero knocked out', async () => {
    const { KNOCKOUT_LOSS } = await import('../src/core/sim/expedition');
    const fresh = () => {
      const state = newGame(0);
      const sim = createSim({ regionId: 'greenhollow', party: state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; }), orders, seed: 3 });
      sim.gold = 300;
      sim.materials = { wood: 9 };
      return sim;
    };
    const whole = fresh();
    expect(buildReport(whole).gold).toBe(300);
    expect(buildReport(whole).knockouts).toBeUndefined();
    const one = fresh();
    one.units.filter((u) => u.side === 'hero')[0].alive = false;
    const r1 = buildReport(one);
    expect(KNOCKOUT_LOSS).toBeCloseTo(0.33);
    expect(r1.gold).toBe(Math.floor(300 * 0.67));
    expect(r1.materials.wood).toBe(6);
    expect(r1.knockouts).toEqual({ count: 1, lostPct: 33 });
    const two = fresh();
    for (const u of two.units.filter((x) => x.side === 'hero').slice(0, 2)) u.alive = false;
    expect(buildReport(two).gold).toBe(Math.floor(300 * 0.34));
    expect(buildReport(two).knockouts?.lostPct).toBe(66);
  });
});
