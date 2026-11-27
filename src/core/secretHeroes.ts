// Secret heroes: one per tribe, each one the exception to their tribe (a Thornkin warrior, an Ironroot
// mage...). Nothing in the game says how to find them; the Heroes screen only shows a silhouette.
// The conditions live here and are checked when a report is collected or a scout returns.

import { HERO_BY_ID, SECRET_HEROES } from './data/heroes';
import { REGION_BY_ID } from './data/world';
import { addHero, heroByUid } from './state';
import type { ExpeditionReport, GameState, HeroDef, Tribe } from './types';

export type SecretEvent =
  | { kind: 'report'; report: ExpeditionReport }
  | { kind: 'scout'; uid: string; regionId: string; ok: boolean };

const tribeOf = (s: GameState, uid: string | undefined): Tribe | undefined => {
  const h = uid ? heroByUid(s, uid) : undefined;
  return h ? HERO_BY_ID[h.defId].tribe : undefined;
};

/** Checks every secret against what just happened. Returns the heroes who joined. */
export function checkSecrets(s: GameState, e: SecretEvent): HeroDef[] {
  const joined: HeroDef[] = [];
  const bump = (id: string) => (s.secrets.progress[id] = (s.secrets.progress[id] ?? 0) + 1);
  const found = (id: string) => s.secrets.found.includes(id);
  const tests: Record<string, () => boolean> = {};
  if (e.kind === 'report') {
    const r = e.report;
    const region = REGION_BY_ID[r.regionId];
    const home = r.outcome === 'returned';
    const cap = tribeOf(s, r.captain);
    const party = Object.keys(r.heroHpPct);
    const night = r.conditions?.time === 'night';
    tests.marta = () => home && night && r.regionId === 'kingsroad' && cap === 'freeholders';
    tests.oakhewn = () => home && r.regionId === 'thornheart' && cap === 'thornkin';
    tests.runa = () => !!r.site?.cleared && r.site.kind === 'dungeon' && party.filter((u) => tribeOf(s, u) === 'ironroot').length >= 3;
    tests.yssa = () => !!r.siege?.won && r.siege.kind === 'cinder_legion' && cap === 'ashborn';
    tests.sable = () => home && night && cap === 'moonveil' && bump('sable') >= 8;
    tests.corvin = () => home && cap === 'dawnwings' && r.findsCollected >= 3;
    tests.lament = () => home && s.memorial.length > 0 && cap === 'hollowed' && (region?.biome === 'barrow' || region?.biome === 'haunted');
  } else {
    const region = REGION_BY_ID[e.regionId];
    tests.quill = () => e.ok && tribeOf(s, e.uid) === 'fenfolk' && (region?.biome === 'sea' || region?.biome === 'coast') && bump('quill') >= 3;
  }
  for (const id of SECRET_HEROES) {
    if (found(id) || !tests[id]?.()) continue;
    s.secrets.found.push(id);
    addHero(s, id);
    joined.push(HERO_BY_ID[id]);
  }
  return joined;
}
