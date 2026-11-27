// The game controller: owns the state, runs every live expedition and the town timers, saves,
// and tells the UI to refresh. One expedition at a time is "watched" on the Watch screen.

import { claimAchievements, type Earned } from './core/achievements';
import { AREA_TEXT, areaState, calmArea, tickWorld } from './core/areas';
import { HERO_BY_ID } from './core/data/heroes';
import { BUILDING_BY_ID } from './core/data/buildings';
import { ABILITY_TRIBE, ENEMY_BY_ID, FORT_REBUILD_MS, REGION_BY_ID } from './core/data/world';
import { addXp, ascend, AWAKEN_COST, awakenBlock } from './core/heroes';
import { PACKS, PACK_TYPES, type PackType } from './core/data/packs';
import { openPack, openTribePack, type PackCard, saveCards } from './core/packs';
import * as embassy from './core/embassy';
import { abandonQuest, progressQuests, scoutedQuest, tickQuests } from './core/quests';
import * as scouting from './core/scouting';
import { BIOME_LABEL, journalComplete, recordJournal } from './core/journal';
import { storyChapter } from './core/storyline';
import * as life from './core/life';
import { cardById, openDeck, recordCards } from './core/deck';
import { lifePerks } from './core/life';
import { storyFor } from './core/data/stories';
import { checkSecrets } from './core/secretHeroes';
import { advanceTutorial, currentStep, skipTutorial, STARTER_GEAR } from './core/tutorial';
import { WORLD_EVENT_MS } from './core/areas';
import { season, timeOfDay } from './core/time';
import { Rng, randomSeed } from './core/rng';
import { buildReport, createSim, runUntil, step, TPS, type Sim, type SimHero } from './core/sim/expedition';
import * as spellbook from './core/spells';
import { heroByUid, load, newGame, outingBlock, PARTY_NAMES, PARTY_UNLOCK, partiesUnlocked, partyHeroes, partyOf, save, wipeSave } from './core/state';
import * as town from './core/town';
import { newUnlocks, unlocked } from './core/unlocks';
import { gainHold } from './core/hold';
import type { ActiveExpedition, GameState, GearSlot, HeroDef, HeroInstance, Material, Orders, PlayerInput, Row, Tribe } from './core/types';
import { ITEM_BY_ID } from './core/data/items';
import { SPELL_BY_ID } from './core/data/spells';
import { MATERIALS } from './core/types';

type Listener = () => void;
type InputNoTick = { [K in PlayerInput['kind']]: Omit<Extract<PlayerInput, { kind: K }>, 'tick'> }[PlayerInput['kind']];

export class Game {
  state: GameState;
  /** Running simulations by expedition id. */
  private sims = new Map<number, Sim>();
  /** The expedition shown on the Watch screen. */
  private watching: number | null = null;
  /** Short messages for the UI ("Tavern finished!"). */
  toasts: string[] = [];
  /** Achievements earned that the UI hasn't shown yet. */
  earned: Earned[] = [];
  /** Secret heroes who joined, for the UI to announce. */
  joined: HeroDef[] = [];
  private listeners = new Set<Listener>();
  private lastFrame = performance.now();
  private saveTimer = 0;
  private slowTimer = 0;

  constructor() {
    this.state = load() ?? newGame();
    this.restoreExpeditions();
    this.tickTown();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    // Keep simulating when the tab is hidden (requestAnimationFrame pauses there).
    setInterval(() => {
      if (document.hidden) {
        this.advance();
        this.tickTown();
      }
    }, 1000);
    window.addEventListener('beforeunload', () => save(this.state));
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn();
  }

  persist() {
    save(this.state);
  }

  private commit() {
    for (const t of advanceTutorial(this.state)) this.toasts.push(`Guide: ${t} done.`);
    const earned = claimAchievements(this.state);
    for (const e of earned) {
      this.earned.push(e);
      this.toasts.push(`Achievement: ${e.def.name}${e.hero ? ` · ${e.hero.name} joined the guild` : ''}`);
    }
    // Parts of the game that just opened up.
    for (const n of newUnlocks(this.state)) this.toasts.push(n);
    this.persist();
    this.emit();
  }

  resetSave() {
    wipeSave();
    this.state = newGame();
    this.sims.clear();
    this.commit();
  }

  /** The game's clock, which test speed moves forward faster. */
  now(): number {
    return Date.now() + this.timeSkew;
  }
  private timeSkew = 0;

  // ---- Expeditions ----

  private simParty(uids: string[], rows: Row[]): (SimHero | null)[] {
    return uids.map((u, i) => {
      const hero = heroByUid(this.state, u);
      return hero ? { hero, row: rows[i] ?? 'back', items: town.gearDefs(this.state, hero) } : null;
    });
  }

  private startSim(ex: ActiveExpedition): Sim {
    const sim = createSim({ regionId: ex.regionId, party: this.simParty(ex.party, ex.rows), orders: ex.orders, seed: ex.seed, captain: ex.captain, spells: ex.spells, siege: ex.siege, area: ex.area, safe: ex.safe, time: ex.time, season: ex.season, site: ex.site, journal: ex.journal, story: ex.story, life: ex.life, areaLevel: ex.areaLevel, deck: ex.deck });
    this.sims.set(ex.id, sim);
    return sim;
  }

  private restoreExpeditions() {
    for (const ex of [...this.state.expeditions]) {
      const sim = this.startSim(ex);
      // Catch up on whatever happened while the game was closed.
      runUntil(sim, ex.inputs, this.targetTick(ex));
      if (this.homeAgain(ex, sim)) this.completeExpedition(ex.id);
    }
  }

  /** Ticks since the party left (travel included). */
  private elapsedTicks(ex: ActiveExpedition): number {
    return Math.floor(((this.now() - ex.startedAt) / 1000) * TPS);
  }

  /** Ticks on the road each way (far rings only). */
  private travelTicks(ex: ActiveExpedition): number {
    return (ex.travelSec ?? REGION_BY_ID[ex.regionId]?.travelSec ?? 0) * TPS;
  }

  /** How far the adventure itself has got: the road out comes first. */
  private targetTick(ex: ActiveExpedition): number {
    return Math.max(0, this.elapsedTicks(ex) - this.travelTicks(ex));
  }

  /** The adventure is over and the road home walked. */
  private homeAgain(ex: ActiveExpedition, sim: Sim): boolean {
    return sim.phase === 'done' && this.elapsedTicks(ex) >= sim.tick + 2 * this.travelTicks(ex);
  }

  /** Where a trip is: on the road out, in the adventure, or on the road home. */
  roadState(expeditionId?: number): 'out' | 'adventure' | 'back' {
    const ex = expeditionId === undefined ? this.watched : this.state.expeditions.find((e) => e.id === expeditionId);
    const sim = ex ? this.sims.get(ex.id) : null;
    if (!ex || !sim) return 'adventure';
    if (sim.phase === 'done') return 'back';
    const travel = this.travelTicks(ex);
    return travel > 0 && this.elapsedTicks(ex) < travel ? 'out' : 'adventure';
  }

  /** Seconds left on the road out (or home), for the Watch screen. */
  roadLeftSec(expeditionId?: number): number {
    const ex = expeditionId === undefined ? this.watched : this.state.expeditions.find((e) => e.id === expeditionId);
    const sim = ex ? this.sims.get(ex.id) : null;
    if (!ex || !sim) return 0;
    const travel = this.travelTicks(ex);
    const elapsed = this.elapsedTicks(ex);
    return Math.max(0, (sim.phase === 'done' ? sim.tick + 2 * travel - elapsed : travel - elapsed) / TPS);
  }

  /** The expedition shown on the Watch screen. */
  get watched(): ActiveExpedition | null {
    const all = this.state.expeditions;
    return all.find((e) => e.id === this.watching) ?? all[0] ?? null;
  }

  /** The simulation shown on the Watch screen. */
  get sim(): Sim | null {
    const ex = this.watched;
    return ex ? this.sims.get(ex.id) ?? null : null;
  }

  watch(expeditionId: number) {
    this.watching = expeditionId;
  }

  simOf(expeditionId: number): Sim | null {
    return this.sims.get(expeditionId) ?? null;
  }

  /** The trip a party is on, if any. */
  expeditionOf(party: number): ActiveExpedition | null {
    return this.state.expeditions.find((e) => e.parties.includes(party)) ?? null;
  }

  partiesUnlocked(): number {
    return partiesUnlocked(this.state);
  }

  /** Why these parties can't leave for a region right now, or null if they can. */
  dispatchBlock(regionId: string | undefined, parties: number[] = [0]): string | null {
    const s = this.state;
    const region = regionId ? REGION_BY_ID[regionId] : undefined;
    if (parties.length > 1 && region && !region.siege) return 'Parties only march together to large battles.';
    const heroes: HeroInstance[] = [];
    for (const p of parties) {
      const name = PARTY_NAMES[p];
      if (p >= this.partiesUnlocked()) return `${name} is not unlocked yet: raise the Guild Hall to level ${PARTY_UNLOCK[p]}.`;
      if (this.expeditionOf(p)) return `${name} is already out.`;
      if (s.reports.some((r) => r.parties?.includes(p))) return `Read ${name}'s report first.`;
      const members = partyHeroes(s, p);
      if (!members.length) return `${name} is empty.`;
      heroes.push(...members);
    }
    // Parties and scouts share the guild's outings.
    const full = outingBlock(s, parties.length);
    if (full) return full;
    // New land has to be mapped by a scout first.
    if (region && !s.explored.includes(region.id)) return `Nobody has mapped ${region.name} yet: send a scout first.`;
    const scouting = heroes.filter((h) => s.scouting.some((m) => m.uid === h.uid));
    if (scouting.length) return `${HERO_BY_ID[scouting[0].defId].name} is out scouting. Wait, or swap them out.`;
    const hurt = heroes.filter((h) => town.isWounded(h, this.now()));
    if (hurt.length) {
      const names = hurt.map((h) => `${HERO_BY_ID[h.defId].name} (${fmtWound(h.woundedUntil! - this.now())})`);
      return `Still wounded: ${names.join(', ')}. Wait, heal them at the Temple, or swap them out on the War Table.`;
    }
    if (region?.requires) {
      const need = ABILITY_TRIBE[region.requires];
      const have = heroes.filter((h) => HERO_BY_ID[h.defId].tribe === need.tribe).length;
      if (have < 3) return `Only a party with 3 or more ${need.name} can ${need.verb} (you have ${have}).`;
    }
    return null;
  }

  /** A fortress region whose fortress stands (not razed): sending a party starts a siege. */
  siegeReady(regionId: string): boolean {
    return !!REGION_BY_ID[regionId]?.siege && (this.state.razedUntil[regionId] ?? 0) <= this.now();
  }

  /** Can any party leave right now? */
  canDispatch(): boolean {
    return Array.from({ length: this.partiesUnlocked() }, (_, p) => p).some((p) => this.dispatchBlock(undefined, [p]) === null);
  }

  /** Sends one party, or two together (sieges only). Returns the new expedition's id. */
  dispatch(regionId: string, orders: Orders, parties: number[] = [0], siteId?: number): number | null {
    if (this.dispatchBlock(regionId, parties) || !REGION_BY_ID[regionId]) return null;
    const s = this.state;
    const site = siteId !== undefined ? s.sites.find((x) => x.id === siteId && x.regionId === regionId) : undefined;
    const party: string[] = [];
    const rows: Row[] = [];
    for (const p of parties) {
      party.push(...s.parties[p].slots.map((u) => u ?? ''));
      rows.push(...s.parties[p].rows);
    }
    const ex: ActiveExpedition = {
      id: s.nextUid++, parties: [...parties], regionId, seed: randomSeed(), startedAt: this.now(), party, rows,
      captain: s.parties[parties[0]].captain, orders, inputs: [], spells: spellbook.loadout(s), siege: this.siegeReady(regionId),
      area: areaState(s, regionId),
      areaLevel: s.areas[regionId]?.level,
      deck: openDeck(s, regionId),
      life: lifePerks(s, regionId) || undefined,
      // The tutorial's first trip can't be lost.
      safe: !s.tutorial.done && !s.tutorial.flags.gearGiven,
      // The world clock when they leave: night and the season shape the trip.
      time: timeOfDay(this.now()),
      season: season(this.now()),
      // The road, shortened by the Stables.
      travelSec: town.travelSec(s, REGION_BY_ID[regionId]),
      site: site && !this.siegeReady(regionId) ? { id: site.id, kind: site.kind, name: site.name } : undefined,
      journal: journalComplete(s, REGION_BY_ID[regionId].biome) || undefined,
      story: storyChapter(s, regionId) ?? undefined,
    };
    s.expeditions.push(ex);
    this.startSim(ex);
    this.watching = ex.id;
    this.commit();
    return ex.id;
  }

  /** A click on the watched expedition (a spell, a find, the Recall Horn). */
  input(i: InputNoTick) {
    const ex = this.watched;
    const sim = this.sim;
    if (!ex || !sim || sim.phase === 'done' || this.roadState(ex.id) !== 'adventure') return;
    ex.inputs.push({ ...i, tick: sim.tick } as PlayerInput);
    if (!this.state.tutorial.done && (i.kind === 'cast' || i.kind === 'find')) this.tutorialFlag(i.kind === 'cast' ? 'cast' : 'glint');
  }

  /** Brings the watched party home now: the trip ends early and keeps what it found. */
  recall() {
    if (this.sim?.phase === 'out') this.input({ kind: 'recall' });
  }

  /**
   * How far a party is between Greyford (0) and its area (1), for the banner on the Map: the road out (far
   * rings), then its progress along the trail (out as it explores, back as it heads home), then the road home.
   */
  mapProgress(expeditionId: number): number {
    const ex = this.state.expeditions.find((e) => e.id === expeditionId);
    const sim = ex ? this.sims.get(ex.id) : null;
    if (!ex || !sim) return 0;
    const travel = this.travelTicks(ex);
    const el = this.elapsedTicks(ex);
    const road = travel > 0 ? 0.4 : 0;
    if (travel > 0 && el < travel) return road * (el / travel);
    if (sim.phase !== 'done') {
      const total = sim.pathLen[sim.pathLen.length - 1] || 1;
      return road + (1 - road) * Math.min(1, sim.leaderDist / (total * 0.6));
    }
    if (travel > 0) return Math.max(0, road * (1 - (el - (sim.tick + travel)) / travel));
    return 0;
  }

  /** Time until the party is home: the rest of the adventure (at most) plus the road. */
  timeLeftSec(expeditionId?: number): number {
    const ex = expeditionId === undefined ? this.watched : this.state.expeditions.find((e) => e.id === expeditionId);
    const sim = ex ? this.sims.get(ex.id) : null;
    if (!ex || !sim) return 0;
    const travel = this.travelTicks(ex);
    const end = (sim.phase === 'done' ? sim.tick : sim.maxTicks) + 2 * travel;
    return Math.max(0, (end - this.elapsedTicks(ex)) / TPS);
  }

  private advance() {
    for (const ex of [...this.state.expeditions]) {
      const sim = this.sims.get(ex.id) ?? this.startSim(ex);
      const target = this.targetTick(ex);
      let steps = 0;
      while (sim.phase !== 'done' && sim.tick < target && steps < 4000) {
        step(sim, ex.inputs);
        steps++;
      }
      // Effects are only drawn while someone watches; don't let them pile up otherwise.
      if (sim.events.length > 300) sim.events.splice(0, sim.events.length - 300);
      if (this.homeAgain(ex, sim)) this.completeExpedition(ex.id);
    }
  }

  private completeExpedition(id: number) {
    const ex = this.state.expeditions.find((e) => e.id === id);
    const sim = this.sims.get(id);
    if (!ex || !sim) return;
    const built = buildReport(sim);
    const report = { ...built, id, parties: ex.parties, captain: ex.captain ?? undefined, site: built.site && ex.site ? { ...built.site, id: ex.site.id } : undefined };
    // The tutorial's first trip brings home starter gear and what the Tavern will cost.
    if (!this.state.tutorial.done && !this.state.tutorial.flags.gearGiven) {
      this.state.tutorial.flags.gearGiven = true;
      report.items = [...report.items, ...STARTER_GEAR];
      report.materials = { ...report.materials, wood: (report.materials.wood ?? 0) + 20, hides: (report.materials.hides ?? 0) + 6 };
      report.chronicle = [...report.chronicle, 'In an abandoned cart by the road: an Iron Sword, an Iron Shield, a Padded Jerkin and a Copper Ring.'];
    }
    // The far rings pay for the long road: extra pack pieces.
    const ring = REGION_BY_ID[ex.regionId].ring;
    const bonus: [PackType, number][] = ring >= 10 ? [['champion', 4], ['grimoire', 2]] : ring === 9 ? [['champion', 3], ['veteran', 1]] : ring === 8 ? [['champion', 2], ['veteran', 2]] : ring >= 7 ? [['champion', 2], ['veteran', 1]] : ring === 6 ? [['veteran', 2], ['champion', 1]] : ring === 5 ? [['veteran', 1]] : [];
    if (bonus.length && report.outcome === 'returned') {
      report.pieces = { ...report.pieces };
      for (const [t, n] of bonus) report.pieces[t] = (report.pieces[t] ?? 0) + n;
      report.chronicle = [...report.chronicle, `For the long road, the people of Greyford pressed ${bonus.map(([t, n]) => `${n} ${PACKS[t].name} piece${n > 1 ? 's' : ''}`).join(' and ')} on the party.`];
    }
    this.state.reports.push(report);
    this.state.expeditions = this.state.expeditions.filter((e) => e.id !== id);
    this.toasts.push(`${ex.parties.map((p) => PARTY_NAMES[p]).join(' and ')} ${ex.parties.length > 1 ? 'are' : 'is'} back from ${REGION_BY_ID[ex.regionId].name}.`);
    this.commit();
  }

  /** Applies the oldest report's rewards (or the given one's). Returns level-ups per hero uid. */
  claimReport(id?: number): Record<string, number> {
    const s = this.state;
    const r = id === undefined ? s.reports[0] : s.reports.find((x) => x.id === id);
    const levels: Record<string, number> = {};
    if (!r) return levels;
    s.gold += r.gold;
    s.packs.recruit += r.chestCards;
    s.shards += r.shards ?? 0;
    for (const t of PACK_TYPES) s.pieces[t] += r.pieces?.[t] ?? 0;
    for (const m of MATERIALS) s.materials[m] += r.materials[m] ?? 0;
    for (const itemId of r.items) town.addItem(s, itemId);
    // The guild's hold on the area grows; once it is secured, scouts can map the land beyond.
    if (gainHold(s, r)) this.toasts.push(`${REGION_BY_ID[r.regionId].name} is secured: scouts can now map the land beyond it.`);
    // Tribe Embassies: reputation, tribe quests, Legend trials.
    this.toasts.push(...embassy.tribeTrip(s, r));
    // Living areas: every trip home helps the settlement by the trail grow.
    if (r.outcome === 'returned' && !r.siege) {
      const before = life.lifeLevel(s, r.regionId);
      life.countTrip(s, r.regionId);
      const after = life.lifeLevel(s, r.regionId);
      if (after > before) this.toasts.push(`${life.LIFE_NAME[after]} has grown up by the trail in ${REGION_BY_ID[r.regionId].name}. ${life.LIFE_PERK[after]}`);
    }
    // The area's story moves on.
    if (r.story?.done) {
      s.stories = { ...(s.stories ?? {}), [r.regionId]: r.story.chapter };
      const def = storyFor(ENEMY_BY_ID[REGION_BY_ID[r.regionId].enemyPool[0].id]?.family ?? '');
      this.toasts.push(r.story.chapter < 3 ? `${REGION_BY_ID[r.regionId].name}: "${def.titles[r.story.chapter - 1]}" is done. Next time: ${def.titles[r.story.chapter]}.` : `${REGION_BY_ID[r.regionId].name}: the story is told. ${def.titles[2]} is beaten.`);
    }
    // The expedition deck: cards seen in this area.
    if (r.cards) {
      const fresh = recordCards(s, r.regionId, r.cards).filter((c) => c.startsWith('rare:'));
      for (const c of fresh) this.toasts.push(`A rare card for ${REGION_BY_ID[r.regionId].name}'s deck: ${cardById(c)?.name}.`);
    }
    // The field journal.
    const filled = recordJournal(s, REGION_BY_ID[r.regionId].biome, r.discoveries ?? []);
    if (filled) this.toasts.push(`The field journal's page on ${BIOME_LABEL[filled].toLowerCase()} is complete: +10% gold on trips there.`);
    // A dead adventurer's note: a site marked on the map.
    if (r.note) {
      const site = scouting.noteSite(s, r.regionId, s.nextUid * 7919 + 1, this.now());
      if (site) this.toasts.push(`The adventurer's map marked ${site.name} in ${REGION_BY_ID[r.regionId].name}. It's on the Map now.`);
    }
    const xpMult = 1 + 0.1 * (town.level(s, 'guildhall') - 1);
    const tier = REGION_BY_ID[r.regionId].tier;
    for (const [uid, hpPct] of Object.entries(r.heroHpPct)) {
      const h = heroByUid(s, uid);
      if (!h) continue;
      levels[uid] = addXp(h, Math.round((hpPct > 0 ? r.xp : r.xp / 2) * xpMult));
      if (hpPct <= 0) h.woundedUntil = this.now() + town.woundDurationMs(s, tier);
    }
    s.tripsCompleted += 1;
    // Skull regions: burnt Phoenix Feathers are gone, and the fallen are gone for good.
    for (const uid of r.feathersUsed ?? []) {
      const h = heroByUid(s, uid);
      const featherUid = h?.gear.jewelry;
      if (h && featherUid && s.items.find((i) => i.uid === featherUid)?.defId === 'phoenix_feather') {
        delete h.gear.jewelry;
        s.items = s.items.filter((i) => i.uid !== featherUid);
      }
    }
    for (const uid of r.fallen ?? []) this.bury(uid, r.regionId);
    // Records for achievements.
    for (const [kid, n] of Object.entries(r.kills ?? {})) s.records.kills[kid] = (s.records.kills[kid] ?? 0) + n;
    const hps = Object.values(r.heroHpPct);
    if (r.outcome === 'returned' && hps.length && hps.every((p) => p > 0)) s.records.cleanTrips += 1;
    if (r.siege?.won) {
      s.records.siegesWon += 1;
      s.razedUntil[r.regionId] = this.now() + FORT_REBUILD_MS;
    }
    if (r.outcome === 'returned' && r.groupsTotal > 0 && r.groupsCleared >= r.groupsTotal && !s.records.clearedRegions.includes(r.regionId)) {
      s.records.clearedRegions.push(r.regionId);
    }
    if (!s.explored.includes(r.regionId)) s.explored.push(r.regionId);
    // A site dealt with is gone; one that wasn't is still there for next time.
    if (r.site?.cleared) {
      s.sites = s.sites.filter((x) => x.id !== r.site!.id);
      this.toasts.push(`${r.site.name[0].toUpperCase() + r.site.name.slice(1)} in ${REGION_BY_ID[r.regionId].name}: dealt with.`);
    }
    this.announceSecrets(checkSecrets(s, { kind: 'report', report: r }));
    // Trouble cleared: the area calms down (if it is still the same trouble) and shields its neighbours.
    if (r.area?.cleared && areaState(s, r.regionId) === r.area.kind) {
      calmArea(s, r.regionId, this.now());
      if (life.heal(s, r.regionId)) this.toasts.push(`With the trouble gone, people are coming back to ${REGION_BY_ID[r.regionId].name} to rebuild.`);
      this.toasts.push(`${REGION_BY_ID[r.regionId].name} is calm again (${AREA_TEXT[r.area.kind].name.toLowerCase()} no more).`);
    }
    if (!s.tutorial.done) s.tutorial.flags[currentStep(s)?.id === 'alone' ? 'claimed2' : 'claimed'] = true;
    // Contracts on the quest board.
    this.toasts.push(...progressQuests(s, r, this.now()));
    s.reports = s.reports.filter((x) => x !== r);
    if (r.id !== undefined) this.sims.delete(r.id);
    this.commit();
    return levels;
  }

  private loop(now: number) {
    const dt = Math.min(0.25, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.advance();
    this.slowTimer += dt;
    if (this.slowTimer > 0.5) {
      this.slowTimer = 0;
      this.tickTown();
    }
    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.persist();
    }
    requestAnimationFrame(this.loop);
  }

  // ---- Town ----

  private tickTown() {
    this.tickScouts();
    const done = town.tickTown(this.state, this.now());
    if (done) this.toasts.push(`Construction finished: ${BUILDING_BY_ID[done]?.name ?? done}.`);
    // A new Mage Tower level: fill the new slots with spells already found.
    if (done === 'magetower') {
      if (this.state.firstSpell) {
        this.toasts.push(`The Mage Tower's first scholar brought a spell: ${SPELL_BY_ID[this.state.firstSpell]?.name ?? 'a spell'}. More turn up now and then in packs.`);
        this.state.firstSpell = undefined;
      }
      for (const id of Object.keys(this.state.spells)) spellbook.equipSpell(this.state, id);
      this.commit();
    }
    // The world moves on: trouble appears and spreads.
    // The world waits for a new guild: contracts once the guide is done, trouble a few trips later.
    const trouble = unlocked(this.state, 'troubles');
    if (!trouble) this.state.world.nextEventAt = Math.max(this.state.world.nextEventAt, this.now() + WORLD_EVENT_MS);
    const posted = this.state.quests.active.length;
    const news = [...(trouble ? tickWorld(this.state, this.now()) : []), ...(this.state.tutorial.done ? tickQuests(this.state, this.now()) : [])];
    // The first contracts arrive quietly, but the screen still has to show them.
    if (this.state.quests.active.length !== posted && !news.length) {
      this.commit();
      return;
    }
    this.toasts.push(...news);
    if (done || news.length) this.commit();
  }

  upgrade(id: string): boolean {
    const ok = town.startUpgrade(this.state, id, this.now());
    if (ok) this.commit();
    return ok;
  }

  /** Finishes the current construction at once (testing aid). */
  rushConstruction() {
    if (this.state.construction) {
      this.state.construction.endsAt = this.now();
      this.tickTown();
    }
  }

  claimTavernPack(): boolean {
    const ok = town.claimTavernPack(this.state, this.now());
    if (ok) this.commit();
    return ok;
  }

  buyItem(defId: string): boolean {
    const ok = !!town.buyItem(this.state, defId);
    if (ok) this.commit();
    return ok;
  }

  equip(heroUid: string, itemUid: string) {
    if (this.isAway(heroUid) || this.isAway(town.itemOwner(this.state, itemUid)?.uid ?? '')) return;
    if (town.equip(this.state, heroUid, itemUid)) this.commit();
  }

  unequip(heroUid: string, slot: GearSlot) {
    if (this.isAway(heroUid)) return;
    town.unequip(this.state, heroUid, slot);
    this.commit();
  }

  sellItem(itemUid: string): number {
    const g = town.sellItem(this.state, itemUid);
    if (g) this.commit();
    return g;
  }

  sellMaterial(m: Material, n: number): number {
    const g = town.sellMaterial(this.state, m, n);
    if (g) this.commit();
    return g;
  }

  buyMaterial(m: Material, n: number): boolean {
    const ok = town.buyMaterial(this.state, m, n);
    if (ok) this.commit();
    return ok;
  }

  healNow(uid: string): boolean {
    const ok = town.healNow(this.state, uid, this.now());
    if (ok) this.commit();
    return ok;
  }

  // ---- Heroes and packs ----

  openPack(type: PackType = 'recruit'): PackCard[] | null {
    // (The tutorial's "Open a pack" step is done once every card is turned over: see the Packs screen.)
    // What's inside is decided and saved now; the reveal is kept too, so leaving halfway loses nothing.
    const cards = openPack(this.state, new Rng(randomSeed()), type);
    if (cards) this.state.pendingReveal = { type, cards: saveCards(cards), flipped: [] };
    this.commit();
    return cards;
  }

  /** Opens a Tribe Pack from that tribe's embassy; the Packs screen shows the reveal. */
  openTribePack(t: Tribe): PackCard[] | null {
    const s = this.state;
    if (!embassy.embassyOpen(s, t) || embassy.tribePacks(s, t) <= 0 || s.pendingReveal) return null;
    s.tribePacks = { ...(s.tribePacks ?? {}), [t]: embassy.tribePacks(s, t) - 1 };
    const cards = openTribePack(s, new Rng(randomSeed()), t, embassy.packFromTribe(s, t));
    s.pendingReveal = { type: 'recruit', tribe: t, cards: saveCards(cards), flipped: [] };
    this.commit();
    return cards;
  }

  openEmbassy(t: Tribe): boolean {
    const ok = embassy.openEmbassy(this.state, t);
    if (ok) this.toasts.push(`The ${embassy.tribeName(t)} sent an envoy to Greyford.`);
    this.commit();
    return ok;
  }

  craftTribeGear(t: Tribe): boolean {
    const ok = embassy.craftGear(this.state, t);
    if (ok) this.toasts.push(`The ${embassy.tribeName(t)} smiths made the guild a ${ITEM_BY_ID[embassy.TRIBE_GEAR[t]].name}.`);
    this.commit();
    return ok;
  }

  /** A card of the pack being revealed was turned over. */
  revealCard(i: number) {
    const p = this.state.pendingReveal;
    if (!p || p.flipped.includes(i)) return;
    p.flipped.push(i);
    this.persist();
  }

  /** The reveal is over (every card seen, and the player moved on). */
  finishReveal() {
    if (!this.state.pendingReveal) return;
    this.state.pendingReveal = null;
    this.commit();
  }

  /** A hero died in a skull region: a plaque in the Hall of the Fallen, some Essence back, and gone. */
  private bury(uid: string, regionId: string) {
    const s = this.state;
    const h = heroByUid(s, uid);
    if (!h) return;
    const d = HERO_BY_ID[h.defId];
    const rank = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(d.rarity);
    const essence = (rank + 1) * h.stars * 3;
    s.essence += essence;
    s.memorial.push({ name: d.name, title: d.title, defId: d.id, rarity: d.rarity, stars: h.stars, level: h.level, regionId, at: this.now() });
    // Their gear goes back to the storehouse; their place in the party is empty.
    h.gear = {};
    for (const p of s.parties) {
      p.slots = p.slots.map((x) => (x === uid ? null : x));
      if (p.captain === uid) p.captain = p.slots.find(Boolean) ?? null;
    }
    s.roster = s.roster.filter((x) => x.uid !== uid);
    this.toasts.push(`${d.name} ${d.title} has fallen in ${REGION_BY_ID[regionId].name}. Their name is carved in the Hall of the Fallen (+${essence} Essence).`);
  }

  // ---- Tutorial ----

  /** Something the tutorial waits for happened (a hero card opened, a spell cast…). */
  tutorialFlag(name: string) {
    if (this.state.tutorial.done || this.state.tutorial.flags[name]) return;
    this.state.tutorial.flags[name] = true;
    this.commit();
  }

  skipTutorial() {
    skipTutorial(this.state, (id) => town.addItem(this.state, id));
    this.toasts.push('Tutorial skipped. The starter gear is in your stores, and a gift pack is waiting.');
    this.commit();
  }

  abandonQuest(id: number) {
    abandonQuest(this.state, id, this.now());
    this.commit();
  }

  // ---- Spellbook ----

  equipSpell(id: string, slot?: number) {
    if (spellbook.equipSpell(this.state, id, slot)) this.commit();
  }

  unequipSpell(id: string) {
    spellbook.unequipSpell(this.state, id);
    this.commit();
  }

  moveSpell(id: string, by: -1 | 1) {
    spellbook.moveSpell(this.state, id, by);
    this.commit();
  }

  ascend(uid: string): boolean {
    const h = heroByUid(this.state, uid);
    const ok = !!h && ascend(this.state, h);
    if (ok) this.commit();
    return ok;
  }

  /** Spends Starshards and gold to awaken a hero past their star cap. */
  awaken(uid: string): boolean {
    const h = heroByUid(this.state, uid);
    if (!h || awakenBlock(h)) return false;
    const cost = AWAKEN_COST[h.awakened ?? 0];
    if (this.state.shards < cost.shards || this.state.gold < cost.gold) return false;
    this.state.shards -= cost.shards;
    this.state.gold -= cost.gold;
    h.awakened = (h.awakened ?? 0) + 1;
    this.state.records.awakenings = (this.state.records.awakenings ?? 0) + 1;
    this.commit();
    return true;
  }

  isAway(uid: string): boolean {
    return !!uid && (this.state.expeditions.some((e) => e.party.includes(uid)) || this.state.scouting.some((m) => m.uid === uid));
  }

  // ---- Scouting ----

  /** Sends one scout to map new land (open) or search known land for sites. */
  sendScout(uid: string, regionId: string, open: boolean): boolean {
    const h = heroByUid(this.state, uid);
    const region = REGION_BY_ID[regionId];
    if (!h || !region || scouting.scoutBlock(this.state, h, region, open, this.now())) return false;
    scouting.startScouting(this.state, h, regionId, open, this.now(), randomSeed());
    this.toasts.push(`${HERO_BY_ID[h.defId].name} set off to ${open ? 'scout' : 'search'} ${region.name}.`);
    this.commit();
    return true;
  }

  /** Scouts who are back: settle what happened. */
  private tickScouts() {
    const s = this.state;
    const now = this.now();
    const back = s.scouting.filter((m) => m.endsAt <= now);
    if (!back.length) return;
    for (const m of back) {
      s.scouting = s.scouting.filter((x) => x !== m);
      const res = scouting.resolveScouting(s, m, now);
      if (res.died) this.bury(m.uid, m.regionId);
      s.scoutLog.push({ at: now, regionId: m.regionId, ok: res.ok, text: res.text });
      while (s.scoutLog.length > 12) s.scoutLog.shift();
      this.toasts.push(res.text);
      if (res.opened) this.toasts.push(...scoutedQuest(s, m.regionId, now));
      this.announceSecrets(checkSecrets(s, { kind: 'scout', uid: m.uid, regionId: m.regionId, ok: res.ok }));
    }
    this.commit();
  }

  private announceSecrets(joined: HeroDef[]) {
    for (const d of joined) {
      this.joined.push(d);
      this.toasts.push(`A stranger has joined the guild: ${d.name} ${d.title}.`);
    }
  }

  /** Puts a hero in a party slot (or empties it). A hero in another party at home moves over. */
  setPartySlot(party: number, slot: number, uid: string | null) {
    const s = this.state;
    if (party >= this.partiesUnlocked() || this.expeditionOf(party) || (uid && this.isAway(uid))) return;
    const p = s.parties[party];
    if (uid) {
      const from = partyOf(s, uid);
      if (from === party) {
        p.slots[p.slots.indexOf(uid)] = p.slots[slot];
      } else if (from >= 0) {
        const other = s.parties[from];
        other.slots[other.slots.indexOf(uid)] = null;
        if (other.captain === uid) other.captain = other.slots.find(Boolean) ?? null;
      }
    }
    p.slots[slot] = uid;
    if (!p.captain || !p.slots.includes(p.captain)) p.captain = p.slots.find(Boolean) ?? null;
    this.state.tutorial.flags.partyEdited = true;
    this.commit();
  }

  setRow(party: number, slot: number, row: Row) {
    if (this.expeditionOf(party)) return;
    this.state.parties[party].rows[slot] = row;
    this.state.tutorial.flags.partyEdited = true;
    this.commit();
  }

  setCaptain(party: number, uid: string) {
    const p = this.state.parties[party];
    if (p.slots.includes(uid) && !this.expeditionOf(party)) {
      p.captain = uid;
      this.state.tutorial.flags.partyEdited = true;
      this.commit();
    }
  }
}

/** "2:05" for a wound that has 2 minutes 5 seconds left. */
function fmtWound(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} left`;
}
