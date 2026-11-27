import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/core/data/world';
import { HERO_BY_ID } from '../src/core/data/heroes';
import { createSim, damage, pointAt, runUntil, step, type Sim } from '../src/core/sim/expedition';
import type { Encounter, EncounterKind } from '../src/core/sim/encounters';
import { newGame } from '../src/core/state';
import type { Orders, PlayerInput } from '../src/core/types';

const orders: Orders = { focus: 'explore', stance: 'balanced', retreatAtPct: 25 };

function makeSim(regionId: string, seed: number, o: Orders = orders): Sim {
  const state = newGame(0);
  return createSim({
    regionId, orders: o, seed,
    party: state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; }),
  });
}

const RING1 = REGIONS.filter((x) => x.ring === 1 && !x.siege && !x.requires && x.id !== 'greenhollow');

/** The first ring-1 trip (by region and seed) with an encounter of this kind. */
function findTrip(kind: EncounterKind): { sim: Sim; e: Encounter } {
  for (let seed = 1; seed < 200; seed++) {
    for (const r of RING1) {
      const sim = makeSim(r.id, seed);
      const e = sim.encounters.find((x) => x.kind === kind);
      if (e) return { sim, e };
    }
  }
  throw new Error(`no ${kind}`);
}

/** Steps until the condition holds (or the trip ends). */
function until(sim: Sim, cond: () => boolean) {
  while (sim.phase !== 'done' && !cond()) step(sim);
}

describe('encounters', () => {
  it('every kind turns up on ring-1 trips, and the first trip has none', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) for (const r of RING1) for (const e of makeSim(r.id, seed).encounters) seen.add(e.kind);
    expect([...seen].sort()).toEqual(['ambush', 'brawl', 'bridge', 'escort', 'nest', 'thief']);
    for (let seed = 1; seed <= 5; seed++) expect(makeSim('greenhollow', seed).encounters).toHaveLength(0);
  });

  it('an ambush stays hidden until the party is level with it', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const r of RING1) {
        const sim = makeSim(r.id, seed);
        const e = sim.encounters.find((x) => x.kind === 'ambush');
        if (!e) continue;
        const g = sim.groups[e.groups[0]];
        expect(g.hidden).toBe(true);
        until(sim, () => sim.leaderDist >= e.at - 60 || sim.phase !== 'out');
        if (sim.phase !== 'out') continue;
        expect(g.active).toBe(false);
        until(sim, () => e.state === 'done');
        expect(g.hidden).toBe(false);
        expect(g.active || g.cleared).toBe(true);
        return;
      }
    }
    throw new Error('no ambush reached');
  });

  it('monsters fighting each other in a brawl bring the party nothing', () => {
    const { sim, e } = findTrip('brawl');
    until(sim, () => e.state !== 'waiting');
    if (e.choice !== 'wait') return;
    const gold = sim.gold;
    const kills = sim.enemiesDefeated;
    until(sim, () => e.state === 'done');
    expect(sim.gold).toBe(gold);
    expect(sim.enemiesDefeated).toBe(kills);
  });

  it('a cutpurse brought down gives the gold back', () => {
    for (let seed = 1; seed < 300; seed++) {
      for (const r of RING1) {
        const sim = makeSim(r.id, seed);
        const e = sim.encounters.find((x) => x.kind === 'thief');
        if (!e) continue;
        until(sim, () => e.state !== 'waiting');
        if (e.state !== 'on') continue;
        const thief = sim.units.find((u) => u.id === e.unit)!;
        const after = sim.gold;
        damage(sim, sim.units.find((u) => u.side === 'hero')!, thief, 1e6, false);
        expect(sim.gold).toBeGreaterThanOrEqual(after + e.gold!);
        expect(thief.stolen).toBe(0);
        return;
      }
    }
    throw new Error('no theft found');
  });

  it('a troll paid off costs the toll; a troll fought is a fight', () => {
    let paid = false;
    let fought = false;
    for (let seed = 1; seed < 200 && !(paid && fought); seed++) {
      for (const r of RING1) {
        for (const stance of ['cautious', 'bold'] as const) {
          const sim = makeSim(r.id, seed, { ...orders, stance });
          const e = sim.encounters.find((x) => x.kind === 'bridge');
          if (!e) continue;
          until(sim, () => sim.leaderDist >= e.at - 5);
          const before = sim.gold;
          until(sim, () => e.state !== 'waiting');
          if (e.choice === 'pay') {
            expect(sim.gold).toBeCloseTo(before - e.gold!, 0);
            expect(sim.groups[e.groups[0]].cleared).toBe(true);
            paid = true;
          } else if (e.choice === 'fight') {
            expect(sim.groups[e.groups[0]].active).toBe(true);
            fought = true;
          }
        }
      }
    }
    expect(paid && fought).toBe(true);
  });

  it('an escorted wagon that gets through pays, and drives off', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const r of RING1) {
        const sim = makeSim(r.id, seed);
        const e = sim.encounters.find((x) => x.kind === 'escort');
        if (!e) continue;
        runUntil(sim, []);
        if (!sim.chronicle.some((l) => /made it through/.test(l))) continue;
        const wagon = sim.units.find((u) => u.id === e.unit)!;
        expect(wagon.gone).toBe(true);
        return;
      }
    }
    throw new Error('no escort got through');
  });

  it('the same seed plays the same encounters', () => {
    for (const r of RING1) {
      const a = makeSim(r.id, 7);
      const b = makeSim(r.id, 7);
      runUntil(a, []);
      runUntil(b, []);
      expect(a.chronicle).toEqual(b.chronicle);
      expect(a.gold).toBe(b.gold);
    }
  });
});

describe('discoveries by focus', () => {
  it('Gather turns up more ore and herbs; Treasure more caches', async () => {
    const { FOCUS_FINDS } = await import('../src/core/data/discoveries');
    /** Share of a trip's discoveries that suit `kind`, on trips with focus `focus`. */
    const share = (focus: Orders['focus'], kind: 'gather' | 'treasure') => {
      let hits = 0;
      let all = 0;
      for (let seed = 1; seed <= 60; seed++) {
        for (const id of ['foothill', 'brackenwood', 'oldmill']) {
          const finds = makeSim(id, seed, { ...orders, focus }).finds.filter((f) => f.disc);
          all += finds.length;
          hits += finds.filter((f) => FOCUS_FINDS[kind]!.includes(f.disc!)).length;
        }
      }
      return hits / all;
    };
    expect(share('gather', 'gather')).toBeGreaterThan(share('explore', 'gather') * 1.2);
    expect(share('treasure', 'treasure')).toBeGreaterThan(share('explore', 'treasure') * 1.2);
  }, 60000);
});

describe('mimics', () => {
  it('a mimic bites (or gets poked first), and killing it gives up the loot', () => {
    for (let seed = 1; seed < 400; seed++) {
      for (const r of RING1) {
        const sim = makeSim(r.id, seed, { ...orders, focus: 'treasure', stance: 'bold' });
        const c = sim.chests.find((x) => x.mimic);
        if (!c) continue;
        runUntil(sim, []);
        const woke = sim.chronicle.find((l) => /A mimic!/.test(l));
        if (!woke) continue;
        expect(woke).toMatch(/grew teeth|poked the chest/);
        const m = sim.units.find((u) => u.mimicChest === c.id)!;
        if (m.alive) continue;
        expect(sim.chronicle.some((l) => /Inside the dead mimic/.test(l))).toBe(true);
        expect(c.taken).toBe(true);
        expect(c.mimicLive).toBe(false);
        return;
      }
    }
    throw new Error('no mimic opened and killed');
  }, 60000);
});

describe('chest traps', () => {
  it('cautious parties disarm traps; bold ones spring them for more gold', () => {
    const seen = { cautious: false, bold: false };
    for (let seed = 1; seed < 300 && !(seen.cautious && seen.bold); seed++) {
      for (const r of RING1) {
        for (const stance of ['cautious', 'bold'] as const) {
          const sim = makeSim(r.id, seed, { ...orders, focus: 'treasure', stance });
          if (!sim.chests.some((c) => c.trap)) continue;
          runUntil(sim, []);
          const lines = sim.chronicle.join('\n');
          if (stance === 'cautious' && /disarmed/.test(lines)) {
            expect(lines).not.toMatch(/trap and all/);
            seen.cautious = true;
          }
          if (stance === 'bold' && /trap and all/.test(lines)) {
            expect(lines).not.toMatch(/disarmed/);
            seen.bold = true;
          }
        }
      }
    }
    expect(seen).toEqual({ cautious: true, bold: true });
  }, 60000);
});

describe('rope bridges', () => {
  it('appear over gorges; the party crosses single file', () => {
    for (let seed = 1; seed < 100; seed++) {
      const sim = makeSim('foothill', seed);
      const b = sim.ropeBridges[0];
      if (!b) continue;
      until(sim, () => sim.leaderDist >= (b.from + b.to) / 2 + 20 || sim.phase !== 'out');
      if (sim.phase !== 'out' || sim.inCombat) continue;
      for (let i = 0; i < 15; i++) step(sim);
      expect(sim.chronicle.some((l) => /rope bridge/.test(l))).toBe(true);
      // Everyone close to the trail line: no one walking out over the gorge beside it.
      const heroes = sim.units.filter((u) => u.side === 'hero' && u.alive && !u.pet);
      const off = heroes.map((h) => {
        let best = Infinity;
        for (let d = b.from - 300; d <= b.to + 50; d += 5) best = Math.min(best, Math.hypot(pointAt(sim, d).p.x - h.x, pointAt(sim, d).p.y - h.y));
        return best;
      });
      expect(Math.max(...off)).toBeLessThan(45);
      return;
    }
    throw new Error('no rope bridge crossed');
  }, 60000);
});

describe('story loot', () => {
  it("a dead adventurer's note marks a site in the area", async () => {
    const { buildReport } = await import('../src/core/sim/expedition');
    const { noteSite } = await import('../src/core/scouting');
    for (let seed = 1; seed < 400; seed++) {
      for (const r of RING1) {
        const sim = makeSim(r.id, seed, { ...orders, focus: 'treasure' });
        if (!sim.chests.some((c) => c.story === 'pack')) continue;
        runUntil(sim, []);
        const report = buildReport(sim);
        if (!report.note) continue;
        expect(sim.chronicle.some((l) => /map of/.test(l))).toBe(true);
        const state = newGame(0);
        const site = noteSite(state, r.id, 42, 0);
        expect(site?.regionId).toBe(r.id);
        expect(state.sites).toHaveLength(1);
        return;
      }
    }
    throw new Error('no note found');
  }, 60000);
});

describe('find sets', () => {
  it('lighting all three markers opens the secret; out of reach does nothing', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const r of RING1) {
        const sim = makeSim(r.id, seed);
        const set = sim.findSet;
        if (!set) continue;
        const inputs: PlayerInput[] = [];
        // Too far: the first click, at the start, does nothing.
        inputs.push({ tick: 1, kind: 'marker', id: 2 });
        // Then each one as the party passes it.
        const probe = makeSim(r.id, seed);
        for (const m of set.markers) {
          until(probe, () => probe.leaderDist >= m.at || probe.phase !== 'out');
          inputs.push({ tick: probe.tick, kind: 'marker', id: m.id });
        }
        if (probe.phase === 'done') continue;
        runUntil(sim, inputs);
        if (!sim.findSet!.opened) continue;
        expect(sim.findSet!.markers.every((m) => m.lit)).toBe(true);
        expect(sim.holdBonus).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    throw new Error('no find set opened');
  }, 60000);
});

describe('field journal', () => {
  it('records discoveries by biome; a full page is complete', async () => {
    const { journalPage, recordJournal } = await import('../src/core/journal');
    const { discoveriesFor } = await import('../src/core/data/discoveries');
    const state = newGame(0);
    expect(recordJournal(state, 'farm', ['cart'])).toBeNull();
    expect(journalPage(state, 'farm').seen.has('cart')).toBe(true);
    expect(journalPage(state, 'forest').seen.size).toBe(0);
    const all = discoveriesFor('farm').map((d) => d.id);
    expect(recordJournal(state, 'farm', all)).toBe('farm');
    expect(journalPage(state, 'farm').done).toBe(true);
    // A complete page means +10% gold on the trip.
    const a = makeSim('oldmill', 3);
    const st = newGame(0);
    const b = createSim({ regionId: 'oldmill', orders, seed: 3, journal: true,
      party: st.parties[0].slots.map((u, i) => { const hero = st.roster.find((h) => h.uid === u); return hero ? { hero, row: st.parties[0].rows[i], items: [] } : null; }) });
    expect(b.goldMult).toBeCloseTo(a.goldMult * 1.1);
  });
});

describe('area stories', () => {
  it('three chapters: a plea, a lookout, a chief; each finished adds hold', async () => {
    const { buildReport } = await import('../src/core/sim/expedition');
    const strong = async () => {
      const state = newGame(0);
      const { addXp } = await import('../src/core/heroes');
      for (const h of state.roster) { h.stars = 3; addXp(h, 1e6); }
      return state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; });
    };
    const party = await strong();
    for (const chapter of [1, 2, 3]) {
      const sim = createSim({ regionId: 'oldmill', orders, seed: 11, party, story: chapter });
      runUntil(sim, []);
      const r = buildReport(sim);
      expect(r.story).toEqual({ chapter, done: true });
      expect(r.holdBonus ?? 0).toBeGreaterThanOrEqual(chapter === 3 ? 3 : 1);
      if (chapter === 1) expect(sim.chronicle.some((l) => /miller's daughter/.test(l))).toBe(true);
      if (chapter === 3) expect(sim.chronicle.some((l) => /Varrick/.test(l))).toBe(true);
    }
    const { storyChapter } = await import('../src/core/storyline');
    const s = newGame(0);
    s.tutorial.done = true;
    expect(storyChapter(s, 'oldmill')).toBe(1);
    s.stories = { oldmill: 3 };
    expect(storyChapter(s, 'oldmill')).toBeNull();
    expect(storyChapter(s, 'greenhollow')).toBeNull();
  }, 60000);
});

describe('trip goals', () => {
  it('each goal can be met by a strong party, and pays', async () => {
    const { buildReport } = await import('../src/core/sim/expedition');
    const { addXp } = await import('../src/core/heroes');
    const state = newGame(0);
    for (const h of state.roster) { h.stars = 3; addXp(h, 1e6); }
    const party = state.parties[0].slots.map((u, i) => { const hero = state.roster.find((h) => h.uid === u); return hero ? { hero, row: state.parties[0].rows[i], items: [] } : null; });
    for (const goal of ['hunt', 'rescue', 'map', 'clear'] as const) {
      let met = false;
      for (let seed = 1; seed <= 20 && !met; seed++) {
        const sim = createSim({ regionId: 'oldmill', orders: { ...orders, goal }, seed, party });
        runUntil(sim, []);
        const r = buildReport(sim);
        expect(r.goal?.kind).toBe(goal);
        met = r.goal!.done;
      }
      expect(met, goal).toBe(true);
    }
  }, 60000);
});

describe('night camp', () => {
  it('longer trips make camp: the party sits round the fire, talks, and the evening is decided', () => {
    for (let seed = 1; seed < 60; seed++) {
      const sim = makeSim('reedwater', seed);
      const c = sim.camp;
      if (!c) continue;
      until(sim, () => (c.until !== undefined && sim.tick >= c.until - 20) || sim.phase !== 'out');
      if (sim.phase !== 'out') continue;
      // Everyone in the ring, near the fire.
      for (const u of sim.units.filter((x) => x.side === 'hero' && x.alive && !x.parked)) expect(Math.hypot(u.x - c.x, u.y - c.y - 20)).toBeLessThan(110);
      expect(sim.chronicle.some((l) => /made camp/.test(l))).toBe(true);
      runUntil(sim, []);
      const f = sim.finds[c.findId];
      expect(f.decided).not.toBeNull();
      expect(f.by).toBe('captain');
      return;
    }
    throw new Error('no camp');
  }, 60000);
});

describe('the road ahead', () => {
  it('lists what is coming in order; waypoints override the Captain', async () => {
    const { roadAhead } = await import('../src/core/sim/encounters');
    for (let seed = 1; seed < 100; seed++) {
      const sim = makeSim('brackenwood', seed);
      const nodes = roadAhead(sim, 20);
      const pick = nodes.find((n) => n.choice && n.key.startsWith('fork:'));
      if (!pick) continue;
      expect(nodes.map((n) => n.at)).toEqual([...nodes.map((n) => n.at)].sort((a, b) => a - b));
      expect(nodes.some((n) => /ambush/i.test(n.title))).toBe(false);
      // Mark it the opposite of what the Captain chose, and see the party follow the waypoint.
      const probe = makeSim('brackenwood', seed);
      runUntil(probe, []);
      const f = probe.forks.find((x) => `fork:${x.id}` === pick.key)!;
      if (f.decided == null) continue;
      const want = f.decided === 'take' ? 'skip' : 'take';
      runUntil(sim, [{ tick: 1, kind: 'route', key: pick.key, choice: want }]);
      expect(sim.forks.find((x) => x.id === f.id)!.decided).toBe(want);
      expect(sim.chronicle.some((l) => /Guildmaster had marked/.test(l))).toBe(true);
      return;
    }
    throw new Error('no fork to mark');
  }, 60000);
});

describe('living areas', () => {
  it('a settlement grows with care, is burned back by ignored trouble, and comes back', async () => {
    const life = await import('../src/core/life');
    const { tickWorld, SPREAD_MS, WORLD_EVENT_MS } = await import('../src/core/areas');
    const { holdNeed } = await import('../src/core/hold');
    const s = newGame(0);
    const r = REGIONS.find((x) => x.id === 'oldmill')!;
    expect(life.lifeLevel(s, r.id)).toBe(0);
    if (!s.explored.includes(r.id)) s.explored.push(r.id);
    s.hold = { ...(s.hold ?? {}), [r.id]: holdNeed(r) };
    expect(life.lifeLevel(s, r.id)).toBe(1);
    for (let i = 0; i < 6; i++) life.countTrip(s, r.id);
    expect(life.lifeLevel(s, r.id)).toBe(2);
    for (let i = 0; i < 6; i++) life.countTrip(s, r.id);
    expect(life.lifeLevel(s, r.id)).toBe(3);
    // Goblins move in and are left alone: perks off, then the town is burned back and the camp grows.
    s.areas[r.id] = { kind: 'infested', since: 0 };
    expect(life.lifePerks(s, r.id)).toBe(0);
    s.world.nextEventAt = 0;
    tickWorld(s, SPREAD_MS.infested + WORLD_EVENT_MS);
    expect(life.lifeLevel(s, r.id)).toBe(2);
    expect(s.areas[r.id]?.level ?? 1).toBeGreaterThan(1);
    // Cleared: people come back.
    delete s.areas[r.id];
    expect(life.heal(s, r.id)).toBe(true);
    expect(life.lifeLevel(s, r.id)).toBe(3);
  });

  it('a market town makes the trip richer, with a trader on the road', () => {
    const plain = makeSim('oldmill', 5);
    const st = newGame(0);
    const town = createSim({ regionId: 'oldmill', orders, seed: 5, life: 3,
      party: st.parties[0].slots.map((u, i) => { const hero = st.roster.find((h) => h.uid === u); return hero ? { hero, row: st.parties[0].rows[i], items: [] } : null; }) });
    expect(town.goldMult).toBeCloseTo(plain.goldMult * 1.1);
    expect(town.event.kind).toBe('merchant');
    expect(town.chronicle.some((l) => /market town/.test(l))).toBe(true);
  });
});

describe('expedition deck', () => {
  it('hold opens the deck; a trip is dealt only open cards, and the trail follows the hand', async () => {
    const deck = await import('../src/core/deck');
    const { holdNeed } = await import('../src/core/hold');
    const s = newGame(0);
    const r = REGIONS.find((x) => x.id === 'brackenwood')!;
    const all = deck.fullDeck(r);
    expect(deck.openDeck(s, r.id)).toHaveLength(deck.DECK_START);
    s.hold = { [r.id]: 1 };
    expect(deck.openDeck(s, r.id)).toHaveLength(deck.DECK_START + deck.DECK_PER_HOLD);
    if (!s.explored.includes(r.id)) s.explored.push(r.id);
    s.hold = { [r.id]: holdNeed(r) };
    expect(deck.openDeck(s, r.id)).toEqual(all);
    expect(all.filter((c) => c.startsWith('rare:')).length).toBeGreaterThanOrEqual(2);
    // A small deck: every card in the hand is from it, and the trail holds just those encounters.
    const small = all.slice(0, deck.DECK_START);
    const st = newGame(0);
    const party = st.parties[0].slots.map((u, i) => { const hero = st.roster.find((h) => h.uid === u); return hero ? { hero, row: st.parties[0].rows[i], items: [] } : null; });
    for (let seed = 1; seed <= 20; seed++) {
      const sim = createSim({ regionId: r.id, orders, seed, party, deck: small });
      expect(sim.hand.every((c) => small.includes(c))).toBe(true);
      for (const e of sim.encounters) expect(sim.hand).toContain(`enc:${e.kind}`);
      for (const f of sim.finds.filter((x) => x.disc && x.disc !== 'nightcamp')) expect(small.includes(`disc:${f.disc}`) || sim.hand.every((c) => !c.startsWith('disc:'))).toBe(true);
    }
  });

  it('rare cards: the shrine blesses the trip, the caravan pays, the stag runs', () => {
    const st = newGame(0);
    const party = st.parties[0].slots.map((u, i) => { const hero = st.roster.find((h) => h.uid === u); return hero ? { hero, row: st.parties[0].rows[i], items: [] } : null; });
    const make = (deck: string[], seed = 3) => createSim({ regionId: 'brackenwood', orders, seed, party, deck });
    const shrine = make(['rare:shrine']);
    const before = shrine.goldMult;
    runUntil(shrine, []);
    expect(shrine.chronicle.some((l) => /old gods/.test(l))).toBe(true);
    expect(shrine.goldMult).toBeCloseTo(before * 1.2);
    const caravan = make(['rare:caravan']);
    runUntil(caravan, []);
    expect(caravan.chronicle.some((l) => /Lost Caravan/.test(l))).toBe(true);
    const stag = make(['rare:stag']);
    runUntil(stag, []);
    expect(stag.chronicle.some((l) => /white stag stood/i.test(l))).toBe(true);
    expect(stag.chronicle.some((l) => /brought down the White Stag|White Stag was gone/.test(l))).toBe(true);
  });
});

describe('dungeon delves', () => {
  const strong = async (drop: string[] = []) => {
    const { addXp } = await import('../src/core/heroes');
    const st = newGame(0);
    for (const h of st.roster) { h.stars = 3; addXp(h, 1e6); }
    return st.parties[0].slots.map((u, i) => {
      const hero = st.roster.find((h) => h.uid === u);
      return hero && !drop.includes(HERO_BY_ID[hero.defId].heroClass) ? { hero, row: st.parties[0].rows[i], items: [] } : null;
    });
  };
  const site = { kind: 'dungeon' as const, name: 'a forgotten crypt' };

  it('a strong party goes down, clears the five rooms and the Warden, takes the vault and comes back up', async () => {
    const { siteCleared } = await import('../src/core/sim/expedition');
    const sim = createSim({ regionId: 'watchtower', orders, seed: 1, party: await strong(), site });
    expect(sim.delve).toBeTruthy();
    runUntil(sim, []);
    expect(siteCleared(sim)).toBe(true);
    expect(sim.chronicle.some((l) => /down the stairs/.test(l))).toBe(true);
    expect(sim.chronicle.some((l) => /Warden of the Forgotten Crypt rose/.test(l))).toBe(true);
    expect(sim.chronicle.some((l) => /hoard of a forgotten crypt/.test(l))).toBe(true);
    expect(sim.chronicle.some((l) => /Up the stairs/.test(l))).toBe(true);
  }, 60000);

  it('without a Rogue: darts in the corridor and a forced door, unless the Guildmaster pulls the lever', async () => {
    const party = await strong(['rogue', 'mage']);
    const plain = createSim({ regionId: 'watchtower', orders, seed: 2, party, site });
    runUntil(plain, []);
    expect(plain.delve!.trap.how).toBe('darts');
    expect(plain.chronicle.some((l) => /started forcing it/.test(l))).toBe(true);
    // Pull the lever as soon as they're inside.
    const probe = createSim({ regionId: 'watchtower', orders, seed: 2, party, site });
    while (probe.phase !== 'done' && !probe.delve!.inside) step(probe);
    const lever = createSim({ regionId: 'watchtower', orders, seed: 2, party, site });
    runUntil(lever, [{ tick: probe.tick + 1, kind: 'lever' }]);
    expect(lever.chronicle.some((l) => /found the lever/.test(l))).toBe(true);
    expect(lever.chronicle.some((l) => /started forcing it/.test(l))).toBe(false);
  }, 60000);
});
