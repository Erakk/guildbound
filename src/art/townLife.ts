// Heroes about town. Each hero at home follows a routine built from their hidden habit (core/data/habits):
// they walk the roads between their favourite spots, linger there doing their thing (an emote over their
// head says what), and some go inside buildings for a while. The routine is a loop, so it can be sampled at
// any moment from the clock alone, and it carries on where it was when the scene is redrawn.
//
// Depth: the town is drawn back to front, so a hero has to sit at the right depth to pass behind the Guild
// Hall and in front of the well. The scene has a row of empty "band" groups between its rows of things;
// a walking hero is moved into the band that matches how far down the screen they are.

import { habitOf, type Emote, type Habit, type SpotId } from '../core/data/habits';

type V = [number, number];

interface Spot {
  x: number;
  y: number;
  /** The road the spot is reached from. */
  node: string;
  text: string;
  emote?: Emote;
  /** The building it needs (level 1 or more). */
  need?: string;
  /** The Town Hall level it needs. */
  stage?: number;
  /** The hero goes in and disappears for a while. */
  inside?: boolean;
  /** Which way they face while there (1 right, -1 left). */
  face?: 1 | -1;
  /** Fine to be at after dark. */
  night?: boolean;
}

const SPOTS: Record<SpotId, Spot> = {
  square: { x: 826, y: 714, node: 'SQ', text: 'in the square', emote: 'chat', night: true },
  well: { x: 770, y: 697, node: 'SQ', text: 'by the well', face: 1, night: true },
  board: { x: 706, y: 684, node: 'SQW', text: 'reading the notice board', emote: 'book', stage: 2, face: -1 },
  guild: { x: 533, y: 654, node: 'RW1', text: 'inside the Guild Hall', inside: true, night: true },
  steps: { x: 594, y: 664, node: 'RW1', text: 'on the Guild Hall steps', emote: 'chat', night: true },
  dummy: { x: 492, y: 714, node: 'RW1', text: 'at the training dummy', emote: 'sword', face: -1 },
  tavern: { x: 1049, y: 659, node: 'RE1', text: 'inside the Tavern', inside: true, need: 'tavern', night: true },
  barrels: { x: 1142, y: 668, node: 'RE1', text: 'by the Tavern barrels', emote: 'ale', need: 'tavern', face: -1, night: true },
  forge: { x: 442, y: 818, node: 'RW2', text: 'by the forge', emote: 'hammer', need: 'weaponsmith', face: -1, night: true },
  armorer: { x: 1046, y: 822, node: 'RE1', text: 'at the Armorer', emote: 'shield', need: 'armorer', face: -1 },
  market: { x: 702, y: 836, node: 'S1', text: 'at the market', emote: 'coin', need: 'market', face: -1 },
  temple: { x: 1170, y: 514, node: 'BLE', text: 'inside the Temple', inside: true, need: 'temple', night: true },
  templeSteps: { x: 1202, y: 520, node: 'BLE', text: 'on the Temple steps', emote: 'pray', need: 'temple', face: -1, night: true },
  tower: { x: 332, y: 512, node: 'BLW', text: 'inside the Mage Tower', inside: true, need: 'magetower', night: true },
  towerFoot: { x: 424, y: 518, node: 'BLW', text: 'at the foot of the Mage Tower', emote: 'star', need: 'magetower', face: -1, night: true },
  townhall: { x: 758, y: 517, node: 'TH', text: 'on the Town Hall steps', emote: 'look' },
  stables: { x: 1302, y: 818, node: 'RE2', text: 'with the horses', emote: 'horse', need: 'stables', face: 1 },
  gate: { x: 1384, y: 668, node: 'GATE', text: 'at the gate', emote: 'look', face: 1, night: true },
  outside: { x: 1548, y: 614, node: 'GATE', text: 'outside the gate, watching the road', emote: 'look', face: 1 },
  oldTree: { x: 192, y: 710, node: 'RW3', text: 'under the old tree', emote: 'zz', face: 1, night: true },
  graves: { x: 1462, y: 808, node: 'GATE', text: 'by the old graves', emote: 'flower', face: 1, night: true },
  southRoad: { x: 800, y: 848, node: 'S2', text: 'at the edge of town', emote: 'look' },
};

/** The roads, as a small graph. */
const NODES: Record<string, V> = {
  SQ: [800, 706], SQW: [690, 696], SQE: [910, 696], RW1: [560, 704], RW2: [400, 712], RW3: [232, 718],
  RE1: [1060, 686], RE2: [1250, 670], GATE: [1396, 654], NS1: [800, 600], TH: [800, 528], BLW: [560, 534], BLE: [1060, 534],
  S1: [800, 782], S2: [800, 850],
};
const EDGES: [string, string][] = [
  ['SQ', 'SQW'], ['SQ', 'SQE'], ['SQW', 'RW1'], ['RW1', 'RW2'], ['RW2', 'RW3'], ['SQE', 'RE1'], ['RE1', 'RE2'], ['RE2', 'GATE'],
  ['SQ', 'NS1'], ['NS1', 'TH'], ['TH', 'BLW'], ['TH', 'BLE'], ['SQ', 'S1'], ['S1', 'S2'],
];
const ADJ: Record<string, string[]> = {};
for (const [a, b] of EDGES) {
  (ADJ[a] ??= []).push(b);
  (ADJ[b] ??= []).push(a);
}
const dist = (a: V, b: V) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Shortest road route between two nodes. */
function route(from: string, to: string): string[] {
  const best: Record<string, number> = { [from]: 0 };
  const prev: Record<string, string> = {};
  const open = new Set([from]);
  while (open.size) {
    let cur = '';
    for (const n of open) if (!cur || best[n] < best[cur]) cur = n;
    open.delete(cur);
    if (cur === to) break;
    for (const n of ADJ[cur] ?? []) {
      const d = best[cur] + dist(NODES[cur], NODES[n]);
      if (best[n] === undefined || d < best[n]) {
        best[n] = d;
        prev[n] = cur;
        open.add(n);
      }
    }
  }
  const out = [to];
  while (out[0] !== from && prev[out[0]]) out.unshift(prev[out[0]]);
  return out;
}

export interface Leg {
  kind: 'walk' | 'stay';
  t0: number;
  t1: number;
  pts: V[];
  cum: number[];
  emote?: Emote;
  inside?: boolean;
  face: 1 | -1;
  text: string;
}

export interface Routine {
  legs: Leg[];
  total: number;
  offset: number;
  habit: Habit;
}

export interface Pose {
  x: number;
  y: number;
  facing: 1 | -1;
  walking: boolean;
  inside: boolean;
  emote: Emote | null;
  text: string;
}

function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LifeContext {
  levels: Record<string, number>;
  stage: number;
  night: boolean;
}

/** A hero's loop around town, from their habit, what is built, and the time of day. */
export function buildRoutine(uid: string, defId: string, personality: string, wounded: boolean, ctx: LifeContext): Routine {
  const habit = habitOf(defId, personality);
  const ok = (id: SpotId) => {
    const sp = SPOTS[id];
    return (!sp.need || (ctx.levels[sp.need] ?? 0) > 0) && (!sp.stage || ctx.stage >= sp.stage);
  };
  let likes: [SpotId, number, Emote | undefined][] = habit.spots.filter(([id]) => ok(id)).map(([id, w, e]) => [id, w, e]);
  let stay: [number, number] = habit.stay;
  let pace = habit.pace;
  if (wounded) {
    // The wounded rest: in the Temple if there is one, else in the Guild Hall.
    likes = ok('temple') ? [['temple', 3, undefined], ['templeSteps', 1, 'bandage']] : [['guild', 3, undefined], ['steps', 1, 'bandage']];
    stay = [30, 60];
    pace = 14;
  } else if (ctx.night && !habit.nightOwl) {
    // After dark most heroes head indoors: the Guild Hall, or wherever they like that has a roof.
    likes = likes.map(([id, w, e]): [SpotId, number, Emote | undefined] => [id, SPOTS[id].inside ? w * 4 : SPOTS[id].night ? w : w * 0.25, e]);
    likes.push(['guild', 4, undefined]);
  }
  if (!likes.length) likes = [['square', 2, undefined], ['well', 1, undefined], ['steps', 1, undefined]];
  const r = rng(strHash(`${uid}:${ctx.night ? 'n' : 'd'}`));
  // Everyone has their own place at a spot and their own lane on the road, so nobody stands inside anybody.
  const at = (id: SpotId): V => {
    const sp = SPOTS[id];
    const h = strHash(`${uid}@${id}`);
    const spread = sp.inside ? 3 : 22;
    return [sp.x + ((h & 1023) / 1023 - 0.5) * 2 * spread, sp.y + (((h >> 10) & 1023) / 1023 - 0.5) * (sp.inside ? 2 : 10)];
  };
  const lane = ((strHash(uid) & 255) / 255 - 0.5) * 14;
  const pick = (not?: SpotId): [SpotId, Emote | undefined] => {
    const pool = likes.filter(([id]) => id !== not || likes.length === 1);
    let x = r() * pool.reduce((n, [, w]) => n + w, 0);
    for (const [id, w, e] of pool) {
      x -= w;
      if (x <= 0) return [id, e];
    }
    return [pool[0][0], pool[0][2]];
  };
  // A loop of visits that ends where it started.
  const visits: [SpotId, Emote | undefined][] = [pick()];
  for (let i = 0; i < 5; i++) visits.push(pick(visits[visits.length - 1][0]));
  visits.push(visits[0]);

  const legs: Leg[] = [];
  let t = 0;
  let face: 1 | -1 = 1;
  const stayLeg = (id: SpotId, e: Emote | undefined, len: number) => {
    const sp = SPOTS[id];
    const f = sp.face ?? face;
    legs.push({ kind: 'stay', t0: t, t1: t + len, pts: [at(id)], cum: [0], emote: sp.inside ? undefined : e ?? sp.emote, inside: sp.inside, face: f, text: sp.text });
    t += len;
  };
  const stayLen = () => stay[0] + r() * (stay[1] - stay[0]);
  const walkLeg = (pts: V[], text: string) => {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    const len = cum[cum.length - 1];
    if (len < 1) return;
    legs.push({ kind: 'walk', t0: t, t1: t + len / pace, pts, cum, face, text });
    t += len / pace;
    const last = pts[pts.length - 1];
    const before = pts[pts.length - 2];
    face = last[0] >= before[0] ? 1 : -1;
  };
  for (let i = 0; i < visits.length; i++) {
    const [id, e] = visits[i];
    const sp = SPOTS[id];
    if (i > 0) {
      const from = SPOTS[visits[i - 1][0]];
      const nodes = from.node === sp.node ? [from.node] : route(from.node, sp.node);
      walkLeg([at(visits[i - 1][0]), ...nodes.map((n): V => [NODES[n][0] + lane, NODES[n][1] + lane * 0.4]), at(id)], `on the way ${sp.inside ? 'to' : 'over to'} ${placeOf(sp.text)}`);
    }
    if (i < visits.length - 1) stayLeg(id, e, sp.inside ? stayLen() * 1.6 : stayLen());
  }
  return { legs, total: t, offset: r() * t, habit };
}

const placeOf = (text: string) => text.replace(/^(inside|on|in|by|at|with|under|reading|outside) (the )?/, 'the ').replace(/, .*$/, '');

/** Where a hero is, and what they are doing, at a moment (seconds on any steady clock). */
export function poseAt(r: Routine, seconds: number): Pose {
  const t = (((seconds + r.offset) % r.total) + r.total) % r.total;
  let leg = r.legs[r.legs.length - 1];
  for (const l of r.legs) {
    if (t < l.t1) {
      leg = l;
      break;
    }
  }
  if (leg.kind === 'stay') {
    const [x, y] = leg.pts[0];
    return { x, y, facing: leg.face, walking: false, inside: !!leg.inside, emote: leg.emote ?? null, text: leg.text };
  }
  const d = ((t - leg.t0) / (leg.t1 - leg.t0)) * leg.cum[leg.cum.length - 1];
  let i = 1;
  while (i < leg.cum.length - 1 && leg.cum[i] < d) i++;
  const a = leg.pts[i - 1];
  const b = leg.pts[i];
  const seg = leg.cum[i] - leg.cum[i - 1] || 1;
  const k = Math.max(0, Math.min(1, (d - leg.cum[i - 1]) / seg));
  const dx = b[0] - a[0];
  return { x: a[0] + dx * k, y: a[1] + (b[1] - a[1]) * k, facing: Math.abs(dx) < 0.5 ? leg.face : dx > 0 ? 1 : -1, walking: true, inside: false, emote: null, text: leg.text };
}

/** Heroes further down the screen are nearer, so a little bigger. */
export const scaleAt = (y: number) => 0.3 + Math.max(0, Math.min(1, (y - 500) / 360)) * 0.17;

/** The depth bands, by the y they end at (the scene draws an empty group for each). */
export const BANDS = [480, 506, 540, 580, 620, 651, 680, 710, 740, 770, 813, 840, 100000];
export const bandOf = (y: number) => BANDS.findIndex((b) => y < b);

const OL = '#2A1A10';
const ICON: Record<Emote, string> = {
  zz: `<text x="0" y="1.5" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="9" fill="#3D6178">zZ</text>`,
  ale: `<path d="M-4 -4h6v8h-6z" fill="#E2B84A" stroke="${OL}" stroke-width="1"/><path d="M2 -2h2v4h-2" fill="none" stroke="${OL}" stroke-width="1"/><path d="M-4.5 -4c1-2 6-2 7 0z" fill="#FBF6E8" stroke="${OL}" stroke-width="0.8"/>`,
  sword: `<path d="M-4 4L4 -4" stroke="${OL}" stroke-width="2.6"/><path d="M-4 4L4 -4" stroke="#C6CBD0" stroke-width="1.4"/><path d="M-4 0L0 4" stroke="#8A6A3E" stroke-width="1.6"/>`,
  hammer: `<path d="M-4 4L1 -1" stroke="#8A6A3E" stroke-width="1.8"/><path d="M-1 -5l5 5l-2 2l-5-5z" fill="#6A7078" stroke="${OL}" stroke-width="0.8"/>`,
  shield: `<path d="M-4 -4h8v3c0 4-4 6-4 6s-4-2-4-6z" fill="#3D6178" stroke="${OL}" stroke-width="1"/><path d="M0 -3v7" stroke="#E2B84A" stroke-width="1"/>`,
  coin: `<ellipse cx="-1.5" cy="3" rx="4" ry="1.6" fill="#C9A24A" stroke="${OL}" stroke-width="0.8"/><ellipse cx="-1.5" cy="1" rx="4" ry="1.6" fill="#E2B84A" stroke="${OL}" stroke-width="0.8"/><ellipse cx="2" cy="-1.5" rx="3.6" ry="3.6" fill="#F1D27A" stroke="${OL}" stroke-width="0.8"/><circle cx="2" cy="-1.5" r="1.8" fill="none" stroke="#A07A20" stroke-width="0.7"/>`,
  pray: `<path d="M0 -5l1.4 3.6l3.6 1.4l-3.6 1.4l-1.4 3.6l-1.4-3.6l-3.6-1.4l3.6-1.4z" fill="#F1D27A" stroke="#C9A24A" stroke-width="0.6"/>`,
  star: `<path d="M0 -5l1.5 3.2l3.5 .4l-2.6 2.4l.7 3.4l-3.1-1.8l-3.1 1.8l.7-3.4l-2.6-2.4l3.5-.4z" fill="#B9FFF0" stroke="#3E3266" stroke-width="0.7"/>`,
  book: `<path d="M-5 -3c2-1 3-1 5 0c2-1 3-1 5 0v6c-2-1-3-1-5 0c-2-1-3-1-5 0z" fill="#F2E6CC" stroke="${OL}" stroke-width="0.9"/><path d="M0 -3v6" stroke="${OL}" stroke-width="0.8"/>`,
  horse: `<path d="M-3.5 4v-4a3.5 3.5 0 0 1 7 0v4" fill="none" stroke="#6A7078" stroke-width="2.2"/>`,
  look: `<path d="M-5 0c3-4 7-4 10 0c-3 4-7 4-10 0z" fill="#FBF6E8" stroke="${OL}" stroke-width="0.9"/><circle r="1.8" fill="#3D6178"/>`,
  chat: `<circle cx="-3" r="1.2" fill="${OL}"/><circle r="1.2" fill="${OL}"/><circle cx="3" r="1.2" fill="${OL}"/>`,
  music: `<path d="M-1 3v-7l4 -1v6" fill="none" stroke="${OL}" stroke-width="1.2"/><circle cx="-2.4" cy="3.2" r="1.7" fill="${OL}"/><circle cx="1.6" cy="2.2" r="1.7" fill="${OL}"/>`,
  heart: `<path d="M0 4c-4-3-5-5-5-6.5a2.5 2.5 0 0 1 5-.5a2.5 2.5 0 0 1 5 .5c0 1.5-1 3.5-5 6.5z" fill="#D84A3A" stroke="${OL}" stroke-width="0.8"/>`,
  flower: `<circle cy="-2.4" r="1.8" fill="#F6C8D8"/><circle cx="2.3" cy="-0.6" r="1.8" fill="#F6C8D8"/><circle cx="1.4" cy="2" r="1.8" fill="#F6C8D8"/><circle cx="-1.4" cy="2" r="1.8" fill="#F6C8D8"/><circle cx="-2.3" cy="-0.6" r="1.8" fill="#F6C8D8"/><circle r="1.3" fill="#E2B84A"/>`,
  fish: `<path d="M-5 0c2-3 6-3 8 0c-2 3-6 3-8 0zM3 0l3-2.5v5z" fill="#7FA8C8" stroke="${OL}" stroke-width="0.8"/>`,
  bandage: `<rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="#FBF6E8" stroke="${OL}" stroke-width="0.8"/><path d="M0 -2.6v5.2M-2.6 0h5.2" stroke="#D84A3A" stroke-width="1.8"/>`,
};

/** A thought bubble with what the hero is doing. */
export const emoteSvg = (e: Emote) => `<path d="M-8 -8h16a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-5l-3 4l-1-4h-7a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2z" fill="#FBF6E8" stroke="${OL}" stroke-width="1.2" opacity="0.95"/><g transform="translate(0 -1.5)">${ICON[e]}</g>`;
