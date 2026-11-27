// Tribe Embassies. The Embassy building keeps envoys for more tribes as it levels (2, 4, then all 8);
// opening a tribe's embassy costs gold and that tribe's two materials.
//
// Each open embassy has a reputation track (0-100):
//   - any trip home with three or more of the tribe in the party: +2 ("word of their kin");
//   - a tribe quest: five of the tribe, home safe from the tribe's own land: +10 and a Tribe Pack.
// Milestones (each also gives a Tribe Pack):
//   Friend (10): Tribe Packs hold four of the tribe instead of three.
//   Ally (30): the tribe's gear recipe, crafted at the Embassy.
//   Kin (60): the Legend chain, three trials in the tribe's land, ending in the tribe's Legendary hero
//   (the Thornkin and the Fenfolk, who have no Legend yet, send their finest Epic, at three stars).
// Tribe Packs: five hero cards at Recruit Pack odds, three (or four) of them from the tribe.

import { HERO_BY_ID, HEROES } from './data/heroes';
import { REGION_BY_ID } from './data/world';
import { TRIBE_MATERIALS } from './heroes';
import { addHero } from './state';
import type { Cost, ExpeditionReport, GameState, HeroDef, Tribe } from './types';

export const TRIBES: Tribe[] = ['freeholders', 'ironroot', 'thornkin', 'ashborn', 'fenfolk', 'moonveil', 'dawnwings', 'hollowed'];
/** How many tribes the Embassy keeps envoys for, by level. */
export const EMBASSY_SLOTS = [0, 2, 4, 8];
export const REP_MAX = 100;

/** Each tribe's own land: where its quests are. */
export const TRIBE_HOME: Record<Tribe, string> = {
  freeholders: 'oldmill', ironroot: 'ironspine', thornkin: 'elderwood', ashborn: 'cinderreach',
  fenfolk: 'fen', moonveil: 'gloaming', dawnwings: 'spires', hollowed: 'barrow',
};

export interface Milestone { at: number; name: string; text: string }
export const MILESTONES: Milestone[] = [
  { at: 10, name: 'Friend', text: 'Tribe Packs hold four of the tribe instead of three' },
  { at: 30, name: 'Ally', text: 'The tribe teaches its gear recipe' },
  { at: 60, name: 'Kin', text: 'The Legend chain: three trials for the tribe\'s greatest hero' },
];

/** The tribe's own gear, crafted at the Embassy once the guild is an Ally. */
export const TRIBE_GEAR: Record<Tribe, string> = {
  freeholders: 'hearthguard', ironroot: 'deeprune_plate', thornkin: 'heartwood_bow', ashborn: 'cinderbrand',
  fenfolk: 'reedfang', moonveil: 'moonglass_staff', dawnwings: 'dawnstar', hollowed: 'gravecloak',
};

/** The three trials of the Legend chain, after the tribe quest's own rule (five of the tribe, home from its land). */
export const LEGEND_TRIALS = [
  { name: 'The Road', text: 'Bring five of the tribe home from its land once more, as Kin.' },
  { name: 'The Proving', text: 'In the tribe\'s land, beat every monster group on the trail.' },
  { name: 'The Calling', text: 'In the tribe\'s land, come home with nobody knocked out.' },
];

export const rep = (s: GameState, t: Tribe) => s.rep?.[t] ?? 0;
export const embassyOpen = (s: GameState, t: Tribe) => (s.embassies ?? []).includes(t);
export const tribePacks = (s: GameState, t: Tribe) => s.tribePacks?.[t] ?? 0;
export const legendStep = (s: GameState, t: Tribe) => s.legend?.[t] ?? 0;

export function embassySlots(s: GameState): number {
  return EMBASSY_SLOTS[Math.min(EMBASSY_SLOTS.length - 1, s.buildings.embassy ?? 0)];
}

export function embassyCost(s: GameState, t: Tribe): Cost {
  const n = (s.embassies ?? []).length;
  const [a, b] = TRIBE_MATERIALS[t];
  return { gold: 200 * (n + 1), [a]: 10 + 4 * n, [b]: 10 + 4 * n };
}

function canPay(s: GameState, c: Cost): boolean {
  return Object.entries(c).every(([k, v]) => (k === 'gold' ? s.gold : (s.materials as Record<string, number>)[k] ?? 0) >= (v ?? 0));
}
function pay(s: GameState, c: Cost) {
  for (const [k, v] of Object.entries(c)) {
    if (k === 'gold') s.gold -= v ?? 0;
    else (s.materials as Record<string, number>)[k] -= v ?? 0;
  }
}

/** Why the guild can't open this tribe's embassy now, or null. */
export function openBlock(s: GameState, t: Tribe): string | null {
  if (!(s.buildings.embassy ?? 0)) return 'Build the Embassy first.';
  if (embassyOpen(s, t)) return 'Already open.';
  if ((s.embassies ?? []).length >= embassySlots(s)) return 'Every envoy\'s desk is taken: raise the Embassy\'s level for more.';
  if (!canPay(s, embassyCost(s, t))) return 'Not enough gold or materials.';
  return null;
}

export function openEmbassy(s: GameState, t: Tribe): boolean {
  if (openBlock(s, t)) return false;
  pay(s, embassyCost(s, t));
  s.embassies = [...(s.embassies ?? []), t];
  return true;
}

/** Adds reputation. Returns the milestones crossed (each gives a Tribe Pack). */
export function addRep(s: GameState, t: Tribe, n: number): Milestone[] {
  const before = rep(s, t);
  const after = Math.min(REP_MAX, before + n);
  s.rep = { ...(s.rep ?? {}), [t]: after };
  const crossed = MILESTONES.filter((m) => before < m.at && after >= m.at);
  if (crossed.length) s.tribePacks = { ...(s.tribePacks ?? {}), [t]: tribePacks(s, t) + crossed.length };
  return crossed;
}

/** How many of a Tribe Pack's five cards are from the tribe. */
export function packFromTribe(s: GameState, t: Tribe): number {
  return rep(s, t) >= MILESTONES[0].at ? 4 : 3;
}

/** The hero the Legend chain ends with: the tribe's Legendary (one not yet owned, if there are two), or its finest Epic. */
export function legendHero(s: GameState, t: Tribe): HeroDef {
  const legends = HEROES.filter((h) => h.tribe === t && h.rarity === 'legendary' && !h.secret);
  const fresh = legends.find((h) => !s.roster.some((x) => x.defId === h.id));
  if (fresh || legends.length) return fresh ?? legends[0];
  // No Legend: the tribe's finest Epic (even one the guild would otherwise only meet on a secret path).
  const all = HEROES.filter((h) => h.tribe === t && h.rarity === 'epic');
  const epics = all.some((h) => !h.secret) ? all.filter((h) => !h.secret) : all;
  return epics.find((h) => !s.roster.some((x) => x.defId === h.id)) ?? epics[0];
}

/** What the next tribe quest or Legend trial asks, for the Embassy screen. */
export function nextTask(s: GameState, t: Tribe): { title: string; text: string } {
  const home = REGION_BY_ID[TRIBE_HOME[t]]?.name ?? 'their land';
  const step = legendStep(s, t);
  if (rep(s, t) >= MILESTONES[2].at && step < 3) return { title: `Legend ${step + 1} of 3: ${LEGEND_TRIALS[step].name}`, text: `${LEGEND_TRIALS[step].text} (${home}, five of the tribe.)` };
  if (step >= 3) return { title: 'The Legend is told', text: `${legendHero(s, t).name} rides with the guild. Tribe quests still raise reputation.` };
  return { title: 'Tribe quest', text: `Send five of the tribe to ${home} and bring them home: +10 reputation and a Tribe Pack.` };
}

/** Crafting the tribe's gear (once an Ally). */
export function gearCost(t: Tribe): Cost {
  const [a, b] = TRIBE_MATERIALS[t];
  return { gold: 450, [a]: 15, [b]: 15 };
}
export function gearBlock(s: GameState, t: Tribe): string | null {
  if (!embassyOpen(s, t)) return 'Open this tribe\'s embassy first.';
  if (rep(s, t) < MILESTONES[1].at) return `Teaches its recipe at ${MILESTONES[1].at} reputation (Ally).`;
  if (!canPay(s, gearCost(t))) return 'Not enough gold or materials.';
  return null;
}
export function craftGear(s: GameState, t: Tribe): boolean {
  if (gearBlock(s, t)) return false;
  pay(s, gearCost(t));
  s.items.push({ uid: `i${s.nextUid++}`, defId: TRIBE_GEAR[t] });
  return true;
}

/**
 * A trip came home: reputation for the tribes that went, tribe quests, Legend trials. Returns what to tell
 * the Guildmaster.
 */
export function tribeTrip(s: GameState, r: ExpeditionReport): string[] {
  const news: string[] = [];
  if (r.outcome !== 'returned' || r.siege) return news;
  const party = Object.keys(r.heroHpPct).map((uid) => s.roster.find((h) => h.uid === uid)).filter((h): h is NonNullable<typeof h> => !!h);
  for (const t of s.embassies ?? []) {
    const kin = party.filter((h) => HERO_BY_ID[h.defId]?.tribe === t).length;
    if (kin < 3) continue;
    const name = tribeName(t);
    const home = r.regionId === TRIBE_HOME[t];
    const quest = home && kin >= 5 && party.length >= 5;
    const gained = quest ? 10 : 2;
    const crossed = addRep(s, t, gained);
    if (quest) {
      s.tribePacks = { ...(s.tribePacks ?? {}), [t]: tribePacks(s, t) + 1 };
      news.push(`The ${name} embassy: a tribe quest done! +${gained} reputation and a ${name} Tribe Pack.`);
      // The Legend chain, once the guild is Kin.
      const step = legendStep(s, t);
      if (rep(s, t) >= MILESTONES[2].at && step < 3) {
        const ok = step === 0 || (step === 1 && r.groupsTotal > 0 && r.groupsCleared >= r.groupsTotal) || (step === 2 && !r.knockouts);
        if (ok) {
          s.legend = { ...(s.legend ?? {}), [t]: step + 1 };
          news.push(`The ${name} Legend, trial ${step + 1} of 3: ${LEGEND_TRIALS[step].name}, done.`);
          if (step + 1 === 3) news.push(legendReward(s, t));
        }
      }
    } else news.push(`The ${name} embassy heard of their kin's deeds: +${gained} reputation.`);
    for (const m of crossed) news.push(`The ${name} now call the guild ${m.name}: ${m.text.toLowerCase()}. A Tribe Pack, as a token.`);
  }
  return news;
}

function legendReward(s: GameState, t: Tribe): string {
  const d = legendHero(s, t);
  const owned = s.roster.find((h) => h.defId === d.id);
  if (owned) {
    owned.copies += 2;
    return `${d.name} ${d.title} sent word: two copies of their oath, towards their next star.`;
  }
  const h = addHero(s, d.id);
  if (d.rarity !== 'legendary') h.stars = 3;
  return `${d.name} ${d.title} has come to Greyford to join the guild${d.rarity !== 'legendary' ? ', already a seasoned hero (3 stars)' : ''}!`;
}

export function tribeName(t: Tribe): string {
  return t[0].toUpperCase() + t.slice(1);
}
