// Greyford, painted: the town is the game's main screen. One wide scene (viewBox 1600 × 860) that grows
// with the Town Hall, from a hamlet of thatched huts behind a fence (level 1) to a walled city of stone
// (level 5). Every guild building stands on its own plot and changes as it levels up.
//
// Buildings are drawn in a simple 3/4 projection: fronts face the viewer and right sides recede up and
// to the right (see P). Each building is drawn in its own coordinates, ground at y = 0, then placed.
// Window lights are collected separately and drawn over the night shade, so the town glows after dark.

import type { Season } from '../core/time';
import { BANDS } from './townLife';

export const SCENE_W = 1600;
export const SCENE_H = 860;
export const STAGE_NAMES = ['', 'Hamlet', 'Village', 'Town', 'Market Town', 'City'];

export interface TownView {
  levels: Record<string, number>;
  /** The building the builders are working on. */
  construction: string | null;
  night: boolean;
  season: Season;
  /** The place the tutorial guide points at. */
  hint: string | null;
  /** Small badges on the signs ("!" for a report, "1" for a free pack). */
  badges: Record<string, string>;
  names: Record<string, string>;
  maxLevels: Record<string, number>;
  /** Plots marked out so far (the rest of the town is still grass). */
  plots: Record<string, boolean>;
}

/** Where each place stands: position of its ground point, scale, and plot width (in its own units). */
export const PLACES: Record<string, { x: number; y: number; s: number; w: number }> = {
  magetower: { x: 395, y: 505, s: 0.85, w: 170 },
  townhall: { x: 790, y: 500, s: 0.88, w: 300 },
  temple: { x: 1185, y: 505, s: 0.85, w: 220 },
  guildhall: { x: 560, y: 645, s: 1, w: 270 },
  tavern: { x: 1065, y: 650, s: 1, w: 230 },
  weaponsmith: { x: 375, y: 800, s: 1.08, w: 240 },
  market: { x: 640, y: 812, s: 1.08, w: 250 },
  armorer: { x: 975, y: 806, s: 1.08, w: 210 },
  stables: { x: 1215, y: 800, s: 1.08, w: 260 },
  embassy: { x: 165, y: 655, s: 0.9, w: 210 },
  gate: { x: 1420, y: 642, s: 0.95, w: 180 },
};

// ---- Projection and drawing helpers ----

const OL = '#2A1A10';
const KX = 0.55;
const KY = -0.3;
type V = [number, number];

let bb = { x0: 0, x1: 0, y0: 0 };
const track = (x: number, y: number) => {
  if (x < bb.x0) bb.x0 = x;
  if (x > bb.x1) bb.x1 = x;
  if (y < bb.y0) bb.y0 = y;
};
/** A point at X (across), Z (depth, away from the viewer), Y (height) in screen units. */
const P = (X: number, Z: number, Y: number): V => {
  const v: V = [X + Z * KX, -Y + Z * KY];
  track(v[0], v[1]);
  return v;
};
const f = (n: number) => String(Math.round(n * 10) / 10);
const pp = (v: V) => `${f(v[0])} ${f(v[1])}`;
const dd = (pts: V[]) => 'M' + pts.map(pp).join(' L') + ' Z';
const shape = (pts: V[], fill: string, sw = 2) => `<path d="${dd(pts)}" fill="${fill}" stroke="${OL}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const tex = (pts: V[], fill: string) => `<path d="${dd(pts)}" fill="${fill}"/>`;
const ln = (a: V, b: V, c: string, w: number, extra = '') => `<path d="M${pp(a)} L${pp(b)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"${extra}/>`;
const lerp = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const len = (a: V, b: V) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Roof { c: string; side: string; line: string; tex: 'thatch' | 'tile' | 'slate' }
const ROOFS = {
  thatch: { c: '#D3AD60', side: '#AC8742', line: '#8A682C', tex: 'thatch' },
  red: { c: '#B4553E', side: '#8C3D2D', line: '#6A281C', tex: 'tile' },
  shingle: { c: '#8A6038', side: '#6A4626', line: '#46301A', tex: 'tile' },
  slate: { c: '#67748A', side: '#4C566A', line: '#394050', tex: 'slate' },
  blue: { c: '#41628C', side: '#2F4A6E', line: '#22344E', tex: 'slate' },
  purple: { c: '#6E5AA8', side: '#523F86', line: '#3A2B66', tex: 'slate' },
  green: { c: '#4F7E5A', side: '#3A6244', line: '#284632', tex: 'tile' },
  dark: { c: '#50545C', side: '#3C3F46', line: '#2A2C30', tex: 'slate' },
} satisfies Record<string, Roof>;

interface Wall { c: string; side: string; tex?: 'stone' | 'plank' }
const WALLS = {
  plaster: { c: '#EDE2C6', side: '#CDBA94' },
  daub: { c: '#DCC79C', side: '#B9A274' },
  ochre: { c: '#E6CE98', side: '#C4A870' },
  stone: { c: '#D4CAAF', side: '#ACA086', tex: 'stone' },
  grey: { c: '#BBB6AA', side: '#959084', tex: 'stone' },
  wood: { c: '#A2703F', side: '#7C512B', tex: 'plank' },
  barn: { c: '#A64B3A', side: '#7E3428', tex: 'plank' },
} satisfies Record<string, Wall>;

/** Winter puts snow on every roof. */
let snow = false;
const roofOf = (r: Roof): Roof => (snow ? { c: '#F2F5F7', side: '#CBD5DE', line: '#A9B6C3', tex: r.tex } : r);

/** One building being drawn: its art, and the lights that show at night. */
class Art {
  s = '';
  l = '';
}

/** Lines across a roof slope (e1→e2 is the eave, r1→r2 the ridge). */
function roofTex(roof: Roof, e1: V, e2: V, r2: V, r1: V): string {
  const n = Math.max(3, Math.round(len(e1, r1) / (roof.tex === 'thatch' ? 9 : 7)));
  let d = '';
  for (let i = 1; i < n; i++) {
    const a = lerp(e1, r1, i / n);
    const b = lerp(e2, r2, i / n);
    d += `M${pp(a)} L${pp(b)} `;
  }
  if (roof.tex === 'thatch') {
    const m = Math.max(4, Math.round(len(e1, e2) / 7));
    for (let i = 1; i < m; i++) {
      const a = lerp(e1, e2, (i + hash(i) * 0.4) / m);
      const b = lerp(a, lerp(r1, r2, i / m), 0.35);
      d += `M${pp(a)} L${pp(b)} `;
    }
  } else if (roof.tex === 'tile') {
    // Staggered joints between the tiles.
    for (let i = 0; i < n; i++) {
      const m = Math.max(3, Math.round(len(e1, e2) / 12));
      for (let j = 1; j < m; j++) {
        const t = (j + (i % 2) * 0.5) / m;
        if (t >= 1) continue;
        const a = lerp(lerp(e1, r1, i / n), lerp(e2, r2, i / n), t);
        const b = lerp(lerp(e1, r1, (i + 1) / n), lerp(e2, r2, (i + 1) / n), t);
        d += `M${pp(a)} L${pp(lerp(a, b, 0.8))} `;
      }
    }
  }
  return `<path d="${d}" stroke="${roof.line}" stroke-width="${roof.tex === 'thatch' ? 1.1 : 1.2}" opacity="0.75" fill="none"/>`;
}

interface Box {
  x: number; z?: number; y0?: number; w: number; d: number; h: number; rh: number;
  ridge: 'x' | 'z'; wall: Wall; roof?: Roof; timber?: boolean; crenel?: boolean; storeys?: number;
}

/** A building block: walls, a gable roof (ridge along x or along the depth) or a flat top. */
function box(b: Box): string {
  const z = b.z ?? 0;
  const Y = (y: number) => (b.y0 ?? 0) + y;
  const { x, w, d, h, rh } = b;
  const roof = b.roof && rh > 0 ? roofOf(b.roof) : null;
  let s = '';
  const side: V[] = b.ridge === 'x' && roof
    ? [P(x + w, z, Y(0)), P(x + w, z + d, Y(0)), P(x + w, z + d, Y(h)), P(x + w, z + d / 2, Y(h + rh)), P(x + w, z, Y(h))]
    : [P(x + w, z, Y(0)), P(x + w, z + d, Y(0)), P(x + w, z + d, Y(h)), P(x + w, z, Y(h))];
  s += shape(side, b.wall.side);
  if (b.wall.tex) s += tex(side, `url(#tx-${b.wall.tex})`);
  if (roof && b.ridge === 'z') {
    const a1 = P(x + w / 2, z, Y(h + rh));
    const a2 = P(x + w / 2, z + d, Y(h + rh));
    const e2 = P(x + w + 5, z + d, Y(h - 4));
    const e1 = P(x + w + 5, z, Y(h - 4));
    s += shape([a1, a2, e2, e1], roof.side);
    s += roofTex(roof, e1, e2, a2, a1);
    s += ln(a1, a2, OL, 3);
  }
  const front: V[] = b.ridge === 'z' && roof
    ? [P(x, z, Y(0)), P(x + w, z, Y(0)), P(x + w, z, Y(h)), P(x + w / 2, z, Y(h + rh)), P(x, z, Y(h))]
    : [P(x, z, Y(0)), P(x + w, z, Y(0)), P(x + w, z, Y(h)), P(x, z, Y(h))];
  s += shape(front, b.wall.c);
  if (b.wall.tex) s += tex(front, `url(#tx-${b.wall.tex})`);
  s += tex(front, 'url(#g-front)');
  if (b.timber) s += timber(b);
  if (roof && b.ridge === 'x') {
    const e1 = P(x - 5, z, Y(h - 3));
    const e2 = P(x + w + 4, z, Y(h - 3));
    const r2 = P(x + w + 4, z + d / 2, Y(h + rh));
    const r1 = P(x - 5, z + d / 2, Y(h + rh));
    s += shape([e1, e2, r2, r1], roof.c);
    s += roofTex(roof, e1, e2, r2, r1);
    s += ln(r1, r2, OL, 3.2);
    s += ln(e1, e2, roof.line, 2.5);
  }
  if (roof && b.ridge === 'z') {
    const l = P(x - 5, z, Y(h - 4));
    const a = P(x + w / 2, z, Y(h + rh + 2));
    const r = P(x + w + 5, z, Y(h - 4));
    s += `<path d="M${pp(l)} L${pp(a)} L${pp(r)}" fill="none" stroke="${OL}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><path d="M${pp(l)} L${pp(a)} L${pp(r)}" fill="none" stroke="${roof.c}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  if (!roof) {
    const top: V[] = [P(x, z, Y(h)), P(x + w, z, Y(h)), P(x + w, z + d, Y(h)), P(x, z + d, Y(h))];
    s += shape(top, b.wall.side, 1.6);
    if (b.crenel) s += crenels(P(x, z, Y(h)), P(x + w, z, Y(h)), b.wall) + crenels(P(x + w, z, Y(h)), P(x + w, z + d, Y(h)), b.wall);
  }
  return s;
}

/** Battlements along the top edge a→b. */
function crenels(a: V, b: V, wall: Wall, hh = 9, step = 12): string {
  const n = Math.max(2, Math.round(len(a, b) / step));
  let d = '';
  for (let i = 0; i < n; i += 2) {
    const p = lerp(a, b, i / n);
    const q = lerp(a, b, Math.min(1, (i + 1) / n));
    d += `M${pp(p)} L${f(p[0])} ${f(p[1] - hh)} L${f(q[0])} ${f(q[1] - hh)} L${pp(q)} Z `;
    track(p[0], p[1] - hh);
  }
  return `<path d="${d}" fill="${wall.c}" stroke="${OL}" stroke-width="1.6" stroke-linejoin="round"/>`;
}

/** Timber framing on the front wall. */
function timber(b: Box): string {
  const z = b.z ?? 0;
  const Y = (y: number) => (b.y0 ?? 0) + y;
  const { x, w, h, rh } = b;
  const n = Math.max(2, Math.round(w / 32));
  let d = '';
  const L = (a: V, c: V) => (d += `M${pp(a)} L${pp(c)} `);
  for (let i = 0; i <= n; i++) L(P(x + (i * w) / n, z, Y(0)), P(x + (i * w) / n, z, Y(h)));
  L(P(x, z, Y(h - 1.5)), P(x + w, z, Y(h - 1.5)));
  L(P(x, z, Y(2)), P(x + w, z, Y(2)));
  const st = b.storeys ?? (h > 75 ? 2 : 1);
  for (let k = 1; k < st; k++) L(P(x, z, Y((h * k) / st)), P(x + w, z, Y((h * k) / st)));
  // Braces in the end panels.
  const pw = w / n;
  const top = st > 1 ? h / st : h;
  L(P(x, z, Y(top * 0.15)), P(x + pw, z, Y(top * 0.85)));
  L(P(x + w, z, Y(top * 0.15)), P(x + w - pw, z, Y(top * 0.85)));
  if (b.ridge === 'z' && rh > 0) {
    L(P(x + w / 2, z, Y(h)), P(x + w / 2, z, Y(h + rh - 4)));
    L(P(x + w * 0.2, z, Y(h + rh * 0.2)), P(x + w * 0.8, z, Y(h + rh * 0.2)));
  }
  return `<path d="${d}" stroke="#5A3A22" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
}

/** A window on a front wall (Z = z): dark glass by day, lit at night. */
function win(a: Art, X: number, Yb: number, w: number, hh: number, o: { z?: number; arch?: boolean; glow?: string; shutters?: string } = {}) {
  const [sx, sy] = P(X, o.z ?? 0, Yb + hh);
  P(X + w, o.z ?? 0, Yb);
  const g = o.arch
    ? `M${f(sx)} ${f(sy + hh)} V${f(sy + w / 2)} A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(sx + w)} ${f(sy + w / 2)} V${f(sy + hh)} Z`
    : `M${f(sx)} ${f(sy)} h${f(w)} v${f(hh)} h${f(-w)} Z`;
  const mull = `<path d="M${f(sx + w / 2)} ${f(sy + (o.arch ? w / 4 : 0))} V${f(sy + hh)} M${f(sx)} ${f(sy + hh * 0.55)} H${f(sx + w)}" stroke="#4A3322" stroke-width="1.5"/>`;
  if (o.shutters) a.s += `<path d="M${f(sx - w * 0.42)} ${f(sy)} h${f(w * 0.4)} v${f(hh)} h${f(-w * 0.4)} Z M${f(sx + w * 1.02)} ${f(sy)} h${f(w * 0.4)} v${f(hh)} h${f(-w * 0.4)} Z" fill="${o.shutters}" stroke="${OL}" stroke-width="1.2"/>`;
  a.s += `<path d="${g}" fill="#333A48" stroke="${OL}" stroke-width="1.8"/>${mull}`;
  a.l += `<circle cx="${f(sx + w / 2)}" cy="${f(sy + hh / 2)}" r="${f(Math.max(w, hh) * 1.5)}" fill="url(#g-glow${o.glow ? '-m' : ''})"/><path d="${g}" fill="${o.glow ?? '#FFCB6B'}"/>${mull}`;
}

/** A window on a right-side wall (X = x), running Z..Z + w. */
function winS(a: Art, X: number, Z: number, Yb: number, w: number, hh: number, glow?: string) {
  const pts: V[] = [P(X, Z, Yb), P(X, Z + w, Yb), P(X, Z + w, Yb + hh), P(X, Z, Yb + hh)];
  a.s += shape(pts, '#2C323E', 1.6);
  const c = lerp(pts[0], pts[2], 0.5);
  a.l += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(hh * 1.3)}" fill="url(#g-glow)"/>${shape(pts, glow ?? '#F2B85A', 1.6)}`;
}

/** An arched door on a front wall. */
function door(a: Art, X: number, w: number, hh: number, o: { z?: number; c?: string; open?: boolean } = {}) {
  const [sx, sy] = P(X, o.z ?? 0, 0);
  P(X, o.z ?? 0, hh);
  const g = `M${f(sx)} ${f(sy)} V${f(sy - hh + w / 2)} A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(sx + w)} ${f(sy - hh + w / 2)} V${f(sy)} Z`;
  if (o.open) {
    a.s += `<path d="${g}" fill="#1E140E" stroke="${OL}" stroke-width="2"/>`;
    a.l += `<path d="${g}" fill="#E8A24A" opacity="0.85"/>`;
    return;
  }
  a.s += `<path d="${g}" fill="${o.c ?? '#6E4628'}" stroke="${OL}" stroke-width="2"/><path d="M${f(sx + w / 3)} ${f(sy)} V${f(sy - hh + w * 0.18)} M${f(sx + (2 * w) / 3)} ${f(sy)} V${f(sy - hh + w * 0.18)}" stroke="#3E2616" stroke-width="1.4"/><circle cx="${f(sx + w * 0.72)}" cy="${f(sy - hh * 0.42)}" r="1.8" fill="#C9A24A"/>`;
}

/** A round tower with a cone roof (or battlements). Returns the tip. */
function rtower(a: Art, cx: number, z: number, r: number, h: number, cone: number, wall: Wall, roof0: Roof | null, y0 = 0): V {
  const [sx, sy] = P(cx, z, y0);
  const top = sy - h;
  const ry = r * 0.32;
  track(sx - r - 6, top - cone);
  track(sx + r + 6, top);
  const body = `M${f(sx - r)} ${f(top)} V${f(sy)} A${f(r)} ${f(ry)} 0 0 0 ${f(sx + r)} ${f(sy)} V${f(top)} Z`;
  a.s += `<path d="${body}" fill="${wall.c}" stroke="${OL}" stroke-width="2"/>`;
  if (wall.tex) a.s += `<path d="${body}" fill="url(#tx-${wall.tex})"/>`;
  a.s += `<path d="${body}" fill="url(#g-cyl)"/>`;
  if (roof0 && cone > 0) {
    const roof = roofOf(roof0);
    const c = `M${f(sx - r - 6)} ${f(top + 2)} Q${f(sx)} ${f(top + ry * 2 + 6)} ${f(sx + r + 6)} ${f(top + 2)} L${f(sx)} ${f(top - cone)} Z`;
    a.s += `<path d="${c}" fill="${roof.c}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/><path d="${c}" fill="url(#g-cyl)"/>`;
    let d = '';
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const yy = top + 2 - cone * t;
      const rr = (r + 6) * (1 - t);
      d += `M${f(sx - rr)} ${f(yy)} Q${f(sx)} ${f(yy + ry * 2 * (1 - t) + 4)} ${f(sx + rr)} ${f(yy)} `;
    }
    a.s += `<path d="${d}" stroke="${roof.line}" stroke-width="1.2" fill="none" opacity="0.8"/>`;
    return [sx, top - cone];
  }
  // Battlements: the walkway seen from the front, and merlons on the near rim.
  a.s += `<ellipse cx="${f(sx)}" cy="${f(top)}" rx="${f(r)}" ry="${f(ry)}" fill="${wall.side}" stroke="${OL}" stroke-width="1.6"/>`;
  let d = '';
  for (let i = 0; i < 5; i++) {
    const t0 = -r + (i * 2 * r) / 5 + 1;
    const yy = top + Math.sqrt(Math.max(0, 1 - (t0 / r) ** 2)) * ry;
    d += `M${f(sx + t0)} ${f(yy)} v-9 h${f((2 * r) / 5 - 3)} v9 Z `;
  }
  a.s += `<path d="${d}" fill="${wall.c}" stroke="${OL}" stroke-width="1.5"/>`;
  return [sx, top - 9];
}

/** A pyramid roof on top of a box. */
function spire(x: number, z: number, w: number, d: number, yb: number, rh: number, roof0: Roof): string {
  const roof = roofOf(roof0);
  const ap = P(x + w / 2, z + d / 2, yb + rh);
  const fl = P(x - 4, z - 2, yb - 2);
  const fr = P(x + w + 4, z - 2, yb - 2);
  const br = P(x + w + 4, z + d + 2, yb - 2);
  let s = shape([fr, br, ap], roof.side) + shape([fl, fr, ap], roof.c);
  let dl = '';
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    dl += `M${pp(lerp(fl, ap, t))} L${pp(lerp(fr, ap, t))} M${pp(lerp(fr, ap, t))} L${pp(lerp(br, ap, t))} `;
  }
  s += `<path d="${dl}" stroke="${roof.line}" stroke-width="1.1" opacity="0.8" fill="none"/>`;
  return s;
}

const finial = (v: V, c = '#E2B84A') => `<path d="M${f(v[0])} ${f(v[1])} v-10" stroke="${OL}" stroke-width="2"/><circle cx="${f(v[0])}" cy="${f(v[1] - 12)}" r="3.4" fill="${c}" stroke="${OL}" stroke-width="1.2"/>`;

/** A flag on a pole (pole foot at v). */
function flag(v: V, pole: number, c: string, w = 26, trim = '#E2B84A'): string {
  const [x, y] = v;
  const t = y - pole;
  track(x + w, t - 2);
  return `<path d="M${f(x)} ${f(y)} V${f(t - 4)}" stroke="${OL}" stroke-width="2.2"/><circle cx="${f(x)}" cy="${f(t - 5)}" r="2.2" fill="#E2B84A"/>`
    + `<path class="flag" d="M${f(x + 1)} ${f(t)} h${w} l-6 7 l6 7 h${-w} Z" fill="${c}" stroke="${OL}" stroke-width="1.4"/><path class="flag" d="M${f(x + 1)} ${f(t + 3)} h${w - 6}" stroke="${trim}" stroke-width="1.4"/>`;
}

/** A long banner hanging on a wall (top-left at v). */
function banner(v: V, c: string, w = 16, hh = 40, sigil = ''): string {
  const [x, y] = v;
  return `<path d="M${f(x)} ${f(y)} h${w} v${hh} l${-w / 2} -7 l${-w / 2} 7 Z" fill="${c}" stroke="${OL}" stroke-width="1.5"/><path d="M${f(x + 2.5)} ${f(y + 2)} v${hh - 6} M${f(x + w - 2.5)} ${f(y + 2)} v${hh - 6}" stroke="#E2B84A" stroke-width="1.2"/>${sigil ? `<g transform="translate(${f(x + w / 2)} ${f(y + hh * 0.42)})">${sigil}</g>` : ''}<path d="M${f(x - 3)} ${f(y)} h${w + 6}" stroke="${OL}" stroke-width="3"/>`;
}

const smoke = (v: V, big = false) => `<g class="smoke${big ? ' big' : ''}" transform="translate(${f(v[0])} ${f(v[1])})"><circle r="5"/><circle r="5" style="animation-delay:-1.4s"/><circle r="5" style="animation-delay:-2.8s"/></g>`;

/** A chimney standing on a roof, with smoke. */
function chimney(a: Art, X: number, Z: number, yb: number, hh: number, smokeOn = true) {
  a.s += box({ x: X, z: Z, y0: yb, w: 11, d: 10, h: hh, rh: 0, ridge: 'x', wall: WALLS.grey });
  if (smokeOn) a.s += smoke(P(X + 8, Z + 5, yb + hh + 4));
}

const SHIELD = '<path d="M-6 -7h12v6c0 5-6 8-6 8s-6-3-6-8z" fill="#E2B84A" stroke="#2A1A10" stroke-width="1"/>';
const crest = (v: V, s = 1) => `<g transform="translate(${f(v[0])} ${f(v[1])}) scale(${s})"><path d="M-13 -15H13V1C13 11 0 17 0 17C0 17 -13 11 -13 1Z" fill="#3D6178" stroke="#E2B84A" stroke-width="2.4"/><path d="M-7 -8L7 8M7 -8L-7 8" stroke="#F2E6CC" stroke-width="2.6" stroke-linecap="round"/></g>`;

// ---- The guild's buildings, level by level ----

function townhall(a: Art, l: number) {
  if (l <= 2) {
    const h = l === 1 ? 60 : 68;
    const roof = l === 1 ? ROOFS.thatch : ROOFS.red;
    if (l === 1) {
      // A bell on a post beside the hall.
      a.s += `<path d="M-150 0V-74M-128 0V-74M-155 -72H-123" stroke="${OL}" stroke-width="5"/><path d="M-150 0V-74M-128 0V-74M-155 -72H-123" stroke="#7A5232" stroke-width="3"/><path d="M-146 -52C-146 -66 -132 -66 -132 -52L-130 -48H-148Z" fill="#C9A24A" stroke="${OL}" stroke-width="1.6"/>`;
      P(-155, 0, 80);
    }
    a.s += box({ x: -125, w: 190, d: 80, h, rh: 54, ridge: 'x', wall: WALLS.plaster, roof, timber: true });
    door(a, -48, 36, 46, { c: '#6A4022' });
    for (const X of [-112, -84, 4, 32]) win(a, X, 22, 16, 20, { shutters: '#3D6178' });
    winS(a, 65, 30, 24, 20, 18);
    a.s += crest(P(-30, 0, 56), 0.9);
    if (l === 2) {
      a.s += box({ x: -46, z: 26, y0: h + 34, w: 26, d: 26, h: 34, rh: 0, ridge: 'x', wall: WALLS.wood });
      a.s += spire(-46, 26, 26, 26, h + 68, 30, ROOFS.red);
      a.s += `<path d="M-36 ${-h - 44}c0-9 9-9 9 0l1 3h-11z" fill="#C9A24A" stroke="${OL}" stroke-width="1.2"/>`;
      a.s += flag(P(-33, 39, h + 98), 26, '#8E2B23');
    }
    return;
  }
  const big = l === 5;
  const W = big ? 290 : 240;
  const X0 = -W / 2 - 20;
  const h = big ? 96 : 84;
  const roof = big ? ROOFS.blue : ROOFS.slate;
  a.s += box({ x: X0, w: W, d: 100, h, rh: 62, ridge: 'x', wall: WALLS.stone, roof });
  for (let i = 0; i < 6; i++) {
    const X = X0 + 16 + i * ((W - 50) / 5);
    if (Math.abs(X + 30) < 44) continue;
    win(a, X, 26, 16, 34, { arch: true });
    if (h > 80) win(a, X, h - 28, 12, 14);
  }
  winS(a, X0 + W, 30, 30, 22, 30);
  if (big) a.s += banner(P(X0 + 40, 0, h - 6), '#8E2B23', 18, 44, SHIELD) + banner(P(X0 + W - 58, 0, h - 6), '#8E2B23', 18, 44, SHIELD);
  if (l >= 4) {
    for (const cx of [X0 - 2, X0 + W + 2]) {
      const tip = rtower(a, cx, -8, big ? 26 : 22, h + 44, big ? 70 : 56, WALLS.stone, big ? ROOFS.blue : ROOFS.slate);
      win(a, cx - 5, h + 8, 10, 16, { z: -8 - (big ? 26 : 22) * 0.6, arch: true });
      a.s += big ? flag(tip, 30, '#8E2B23') : finial(tip);
    }
  }
  const th = l === 3 ? 168 : l === 4 ? 192 : 226;
  a.s += box({ x: -58, z: -18, w: 56, d: 44, h: th, rh: 0, ridge: 'x', wall: WALLS.stone, crenel: l >= 4 });
  a.s += spire(-58, -18, 56, 44, th, big ? 116 : 80, roof);
  const tip = P(-30, 4, th + (big ? 116 : 80));
  a.s += big ? flag(tip, 36, '#E2B84A', 30, '#8E2B23') : finial(tip);
  door(a, -46, 32, 52, { z: -18, c: '#5A3418' });
  // The clock.
  const [cx, cy] = P(-30, -18, th - 34);
  a.s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="15" fill="#F2E6CC" stroke="${OL}" stroke-width="2"/><circle cx="${f(cx)}" cy="${f(cy)}" r="12" fill="none" stroke="#C9A24A" stroke-width="1.4"/><path d="M${f(cx)} ${f(cy)} v-9 M${f(cx)} ${f(cy)} l6 3" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>`;
  a.l += `<circle cx="${f(cx)}" cy="${f(cy)}" r="26" fill="url(#g-glow)"/>`;
  win(a, -36, th - 78, 12, 22, { z: -18, arch: true });
  win(a, -36, 68, 12, 22, { z: -18, arch: true });
}

function guildhall(a: Art, l: number) {
  const roof = l === 1 ? ROOFS.thatch : ROOFS.red;
  if (l >= 4) {
    const th = l === 5 ? 178 : 150;
    a.s += box({ x: 22, z: 62, w: 44, d: 40, h: th, rh: 0, ridge: 'x', wall: WALLS.stone, crenel: true });
    win(a, 36, th - 40, 12, 20, { z: 62, arch: true });
    a.s += spire(22, 62, 44, 40, th + 9, 54, l === 5 ? ROOFS.blue : ROOFS.slate);
    a.s += flag(P(44, 82, th + 63), 30, l === 5 ? '#E2B84A' : '#3D6178', 30, l === 5 ? '#3D6178' : '#E2B84A');
  }
  if (l >= 2) {
    a.s += box({ x: -172, z: 8, w: 62, d: 60, h: 50, rh: 34, ridge: 'z', wall: WALLS.plaster, roof, timber: true });
    win(a, -150, 20, 16, 18, { z: 8, shutters: '#3D6178' });
  }
  a.s += box({ x: -112, w: 170, d: 80, h: 68, rh: 56, ridge: 'x', wall: WALLS.plaster, roof, timber: true });
  if (l >= 3) {
    const band: V[] = [P(-112, 0, 0), P(58, 0, 0), P(58, 0, 14), P(-112, 0, 14)];
    a.s += shape(band, WALLS.stone.c, 1.6) + tex(band, 'url(#tx-stone)');
  }
  door(a, -47, 40, 52, { c: '#5E3A1E' });
  for (const X of [-102, -76, 2, 28]) win(a, X, 24, 16, 20, { shutters: '#3D6178' });
  winS(a, 58, 28, 26, 22, 20);
  a.s += crest(P(-27, 0, 60), l === 5 ? 1.25 : 1);
  a.s += smoke(P(-70, 30, 140));
  chimney(a, -76, 30, 96, 26);
  if (l >= 3) a.s += flag(P(58, 40, 124), 28, '#3D6178');
  if (l === 5) a.s += banner(P(-100, 0, 64), '#3D6178', 16, 40, SHIELD) + banner(P(30, 0, 64), '#3D6178', 16, 40, SHIELD);
}

function tavern(a: Art, l: number) {
  const roof = l === 1 ? ROOFS.thatch : ROOFS.red;
  if (l >= 3) {
    a.s += box({ x: -152, z: 24, w: 82, d: 70, h: 64, rh: 40, ridge: 'x', wall: WALLS.ochre, roof, timber: true });
    for (const X of [-140, -112]) win(a, X, 22, 15, 18, { z: 24 });
  }
  a.s += box({ x: -70, w: 112, d: 110, h: 102, rh: 62, ridge: 'z', wall: WALLS.plaster, roof, timber: true, storeys: 2 });
  chimney(a, 14, 66, 118, 30);
  door(a, -30, 30, 46, { c: '#7A4A24' });
  win(a, -62, 14, 22, 24);
  win(a, 12, 14, 22, 24);
  for (const X of [-60, -22, 16]) win(a, X, 62, 16, 22, { shutters: l >= 2 ? '#4F7A3A' : undefined });
  const [gx, gy] = P(-14, 0, 128);
  a.s += `<circle cx="${f(gx)}" cy="${f(gy)}" r="8" fill="#333A48" stroke="${OL}" stroke-width="1.8"/>`;
  a.l += `<circle cx="${f(gx)}" cy="${f(gy)}" r="16" fill="url(#g-glow)"/><circle cx="${f(gx)}" cy="${f(gy)}" r="8" fill="#FFCB6B"/>`;
  winS(a, 42, 30, 18, 24, 22);
  winS(a, 42, 70, 18, 24, 22);
  winS(a, 42, 50, 64, 20, 20);
  if (l >= 2) {
    // Flower boxes under the upper windows.
    let d = '';
    for (const X of [-60, -22, 16]) {
      const [sx, sy] = P(X - 2, 0, 60);
      d += `<rect x="${f(sx)}" y="${f(sy)}" width="20" height="5" fill="#6E4628" stroke="${OL}" stroke-width="1"/><circle cx="${f(sx + 4)}" cy="${f(sy - 1)}" r="2.6" fill="#D84A3A"/><circle cx="${f(sx + 10)}" cy="${f(sy - 2)}" r="2.6" fill="#F1D27A"/><circle cx="${f(sx + 16)}" cy="${f(sy - 1)}" r="2.6" fill="#D84A3A"/>`;
    }
    a.s += d;
  }
  // The sign: a tankard on a board, hung from a bracket.
  const [bx, by] = P(-70, 0, 80);
  a.s += `<path d="M${f(bx)} ${f(by)} h-30 M${f(bx)} ${f(by + 12)} l-12 -12" stroke="${OL}" stroke-width="3"/><path d="M${f(bx - 28)} ${f(by)} v6 M${f(bx - 10)} ${f(by)} v6" stroke="${OL}" stroke-width="1.4"/>`
    + `<rect x="${f(bx - 34)}" y="${f(by + 6)}" width="30" height="24" rx="3" fill="#7A5232" stroke="${OL}" stroke-width="1.8"/><path d="M${f(bx - 26)} ${f(by + 12)} h12 v13 h-12 Z" fill="#F1D27A" stroke="${OL}" stroke-width="1.2"/><path d="M${f(bx - 14)} ${f(by + 15)} h3 v6 h-3" fill="none" stroke="${OL}" stroke-width="1.2"/><path d="M${f(bx - 27)} ${f(by + 12)} q6 -5 13 0" fill="#FBF6E8" stroke="${OL}" stroke-width="1"/>`;
  // Barrels by the door.
  for (const [X, Z] of [[50, -14], [66, -8]] as V[]) {
    const [sx, sy] = P(X, Z, 0);
    a.s += `<path d="M${f(sx - 9)} ${f(sy)} q-2 -11 0 -22 h18 q2 11 0 22 Z" fill="#8A5A30" stroke="${OL}" stroke-width="1.6"/><path d="M${f(sx - 10)} ${f(sy - 6)} h20 M${f(sx - 10)} ${f(sy - 16)} h20" stroke="#4A4E56" stroke-width="2"/>`;
  }
  if (l >= 4) {
    for (const X of [-40, 6]) {
      const [lx, ly] = P(X, 0, 46);
      a.s += `<rect x="${f(lx - 3)}" y="${f(ly - 8)}" width="6" height="9" fill="#3A2A1A" stroke="${OL}" stroke-width="1"/>`;
      a.l += `<circle cx="${f(lx)}" cy="${f(ly - 4)}" r="16" fill="url(#g-glow)"/><rect x="${f(lx - 2)}" y="${f(ly - 7)}" width="4" height="6" fill="#FFE29A"/>`;
    }
  }
  if (l === 5) {
    // Bunting from the gable to the sign.
    const p1 = P(-14, 0, 150);
    const p2 = P(-100, -6, 86);
    const p3 = P(70, -10, 70);
    let d = `<path d="M${pp(p2)} Q${f((p1[0] + p2[0]) / 2)} ${f((p1[1] + p2[1]) / 2 + 22)} ${pp(p1)} Q${f((p1[0] + p3[0]) / 2)} ${f((p1[1] + p3[1]) / 2 + 26)} ${pp(p3)}" stroke="${OL}" stroke-width="1.2" fill="none"/>`;
    const cols = ['#D84A3A', '#F1D27A', '#3D6178', '#4F7A3A'];
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      const [qa, qb] = t < 0.5 ? [p2, p1] : [p1, p3];
      const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const q = lerp(qa, qb, u);
      const sag = Math.sin(u * Math.PI) * 22;
      d += `<path d="M${f(q[0] - 4)} ${f(q[1] + sag)} h8 l-4 8 Z" fill="${cols[i % 4]}" stroke="${OL}" stroke-width="0.8"/>`;
    }
    a.s += d;
  }
}

function magetower(a: Art, l: number) {
  const h = 150 + l * 24;
  a.s += box({ x: -92, w: 50, d: 50, h: 44, rh: 30, ridge: 'z', wall: WALLS.stone, roof: ROOFS.purple });
  door(a, -78, 20, 32, { c: '#4A3A6A' });
  if (l >= 2) {
    const tip2 = rtower(a, 46, 14, 15, 84 + l * 12, 46, WALLS.stone, ROOFS.purple);
    a.s += finial(tip2, '#B9FFF0');
    win(a, 42, 50 + l * 6, 8, 14, { z: 14 - 9, arch: true, glow: '#B9FFF0' });
  }
  const tip = rtower(a, 0, 0, 27, h, 92, WALLS.stone, ROOFS.purple);
  const [sx, sy] = P(0, 0, 0);
  a.s += `<path d="M${f(sx - 27)} ${f(sy - h + 18)} q27 9 54 0" stroke="#E2B84A" stroke-width="3" fill="none"/><path d="M${f(sx - 27)} ${f(sy - 40)} q27 9 54 0" stroke="#E2B84A" stroke-width="2" fill="none"/>`;
  for (let i = 0; i < 3; i++) win(a, -6, 44 + i * ((h - 80) / 2.4), 12, 20, { z: -18, arch: true, glow: '#B9FFF0' });
  // The windows glow faintly even by day: somebody is always studying.
  a.s += `<g class="twinkle">${[[-40, h + 40], [42, h - 10], [-34, h - 60], [30, h + 70]].map(([x, y], i) => `<path transform="translate(${f(sx + x)} ${f(sy - y)})" d="M0 -5L1.4 -1.4L5 0L1.4 1.4L0 5L-1.4 1.4L-5 0L-1.4 -1.4Z" fill="#B9FFF0" style="animation-delay:${-i * 0.7}s"/>`).join('')}</g>`;
  if (l >= 3) {
    a.s += `<g class="bob"><path transform="translate(${f(tip[0])} ${f(tip[1] - 26)})" d="M0 -14L8 0L0 14L-8 0Z" fill="#B9FFF0" stroke="#3A2B66" stroke-width="1.6"/></g>`;
    a.l += `<circle cx="${f(tip[0])}" cy="${f(tip[1] - 26)}" r="30" fill="url(#g-glow-m)"/>`;
    track(tip[0], tip[1] - 44);
  } else a.s += finial(tip, '#B9FFF0');
  if (l >= 4) {
    a.s += `<ellipse class="runes" cx="${f(sx)}" cy="${f(sy - h + 40)}" rx="44" ry="12" fill="none" stroke="#B9FFF0" stroke-width="2.2" stroke-dasharray="7 6"/>`;
  }
}

function temple(a: Art, l: number) {
  const th = 100 + l * 26;
  a.s += box({ x: -110, z: 4, w: 42, d: 40, h: th, rh: 0, ridge: 'x', wall: WALLS.stone, crenel: l >= 2 });
  win(a, -96, th - 36, 12, 22, { z: 4, arch: true });
  a.s += spire(-110, 4, 42, 40, th + (l >= 2 ? 9 : 0), 46 + l * 18, l === 3 ? ROOFS.blue : ROOFS.slate);
  const tip = P(-89, 24, th + 46 + l * 18 + (l >= 2 ? 9 : 0));
  a.s += l === 3 ? flag(tip, 28, '#F2E6CC', 24, '#E2B84A') : finial(tip);
  a.s += box({ x: -66, w: 94, d: 150, h: 80, rh: 56, ridge: 'z', wall: WALLS.stone, roof: l === 1 ? ROOFS.red : ROOFS.slate });
  if (l >= 2) {
    // Buttresses along the nave.
    let d = '';
    for (const Z of [30, 75, 120]) d += shape([P(28, Z, 0), P(40, Z, 0), P(40, Z + 8, 0), P(28, Z + 8, 62)], WALLS.stone.side, 1.4);
    a.s += d;
  }
  for (const Z of [12, 55, 98]) winS(a, 28, Z + 10, 26, 14, 34, l === 3 ? '#C9A0FF' : undefined);
  door(a, -34, 30, 50, { c: '#5A3418' });
  const [rx, ry] = P(-19, 0, 102);
  a.s += `<circle cx="${f(rx)}" cy="${f(ry)}" r="14" fill="#333A48" stroke="${OL}" stroke-width="2"/><path d="M${f(rx - 14)} ${f(ry)} h28 M${f(rx)} ${f(ry - 14)} v28 M${f(rx - 10)} ${f(ry - 10)} l20 20 M${f(rx + 10)} ${f(ry - 10)} l-20 20" stroke="#4A3322" stroke-width="1.4"/>`;
  a.l += `<circle cx="${f(rx)}" cy="${f(ry)}" r="30" fill="url(#g-glow)"/><circle cx="${f(rx)}" cy="${f(ry)}" r="14" fill="#F1D27A"/><path d="M${f(rx)} ${f(ry - 14)} a14 14 0 0 1 14 14 h-14 Z" fill="#D84A3A"/><path d="M${f(rx)} ${f(ry + 14)} a14 14 0 0 1 -14 -14 h14 Z" fill="#5EA6D8"/>`;
  a.s += `<circle cx="${f(rx)}" cy="${f(ry - 24)}" r="5" fill="#E2B84A" stroke="${OL}" stroke-width="1.2"/>`;
  win(a, -60, 22, 12, 28, { arch: true });
  win(a, 16, 22, 12, 28, { arch: true });
}

function weaponsmith(a: Art, l: number) {
  const wall = l >= 3 ? WALLS.stone : WALLS.wood;
  const roof = l === 1 ? ROOFS.thatch : l === 2 ? ROOFS.red : ROOFS.dark;
  a.s += box({ x: -100, w: 132, d: 72, h: 58, rh: 42, ridge: 'x', wall, roof });
  // The open forge, glowing.
  const [fx, fy] = P(-92, 0, 0);
  a.s += `<path d="M${f(fx)} ${f(fy)} V${f(fy - 40)} H${f(fx + 44)} V${f(fy)} Z" fill="#1E140E" stroke="${OL}" stroke-width="2"/><ellipse class="flicker" cx="${f(fx + 22)}" cy="${f(fy - 8)}" rx="14" ry="9" fill="#FF9A3C"/><ellipse class="flicker" cx="${f(fx + 22)}" cy="${f(fy - 9)}" rx="7" ry="5" fill="#FFE29A" style="animation-delay:-0.4s"/>`;
  a.l += `<circle cx="${f(fx + 22)}" cy="${f(fy - 14)}" r="46" fill="url(#g-glow-f)"/>`;
  door(a, -30, 26, 42, { c: '#5A3A22' });
  win(a, 4, 24, 16, 18);
  winS(a, 32, 30, 22, 20, 16);
  const ch = l >= 2 ? 64 : 44;
  a.s += box({ x: 6, z: 46, y0: 62, w: 20, d: 18, h: ch, rh: 0, ridge: 'x', wall: WALLS.grey });
  a.s += smoke(P(16, 55, 62 + ch + 6), true);
  if (l >= 3) {
    a.s += box({ x: -74, z: 46, y0: 72, w: 14, d: 12, h: 40, rh: 0, ridge: 'x', wall: WALLS.grey });
    a.s += smoke(P(-67, 52, 118), true);
    a.s += banner(P(-46, 0, 56), '#8E2B23', 16, 34, '<path d="M-5 -6L5 6M5 -6L-5 6" stroke="#E6EAED" stroke-width="2.4" stroke-linecap="round"/>');
  }
  // The anvil out front.
  const [ax, ay] = P(56, -26, 0);
  a.s += `<path d="M${f(ax - 6)} ${f(ay)} l3 -12 h6 l3 12 Z" fill="#5A3A22" stroke="${OL}" stroke-width="1.4"/><path d="M${f(ax - 16)} ${f(ay - 12)} h30 l-4 -7 h-20 q-6 0 -6 4 Z" fill="#4A4E56" stroke="${OL}" stroke-width="1.6"/>`;
  if (l >= 2) {
    // A rack of swords.
    const [rx, ry] = P(-138, -6, 0);
    a.s += `<path d="M${f(rx)} ${f(ry)} v-40 M${f(rx + 34)} ${f(ry)} v-40 M${f(rx - 3)} ${f(ry - 30)} h40" stroke="${OL}" stroke-width="4"/><path d="M${f(rx)} ${f(ry)} v-40 M${f(rx + 34)} ${f(ry)} v-40 M${f(rx - 3)} ${f(ry - 30)} h40" stroke="#7A5232" stroke-width="2.4"/>`
      + [8, 17, 26].map((dx) => `<path d="M${f(rx + dx)} ${f(ry - 4)} v-36" stroke="${OL}" stroke-width="4"/><path d="M${f(rx + dx)} ${f(ry - 4)} v-36" stroke="#E6EAED" stroke-width="2"/><path d="M${f(rx + dx - 4)} ${f(ry - 34)} h8" stroke="#C9A24A" stroke-width="2"/>`).join('');
    P(-140, -6, 46);
  }
}

function armorer(a: Art, l: number) {
  const wall = l >= 3 ? WALLS.stone : WALLS.plaster;
  const roof = l === 1 ? ROOFS.thatch : l === 2 ? ROOFS.red : ROOFS.slate;
  if (l >= 3) {
    a.s += box({ x: -128, z: 22, w: 64, d: 60, h: 50, rh: 30, ridge: 'x', wall, roof });
    win(a, -112, 18, 15, 18, { z: 22 });
  }
  a.s += box({ x: -62, w: 102, d: 82, h: 68, rh: 46, ridge: 'z', wall, roof, timber: l < 3 });
  door(a, -24, 26, 42, { c: '#4A5A6A' });
  win(a, -22, 50, 18, 16);
  winS(a, 40, 26, 22, 22, 18);
  // Shields on the wall.
  for (const [X, c] of [[-46, '#3D6178'], [24, '#8E2B23']] as [number, string][]) {
    const [sx, sy] = P(X, 0, 36);
    a.s += `<circle cx="${f(sx)}" cy="${f(sy)}" r="10" fill="${c}" stroke="${OL}" stroke-width="1.8"/><circle cx="${f(sx)}" cy="${f(sy)}" r="3.4" fill="#C9A24A" stroke="${OL}"/>`;
  }
  if (l >= 2) {
    const [ox, oy] = P(-30, -6, 48);
    a.s += `<path d="M${f(ox - 4)} ${f(oy)} h42 l6 10 h-54 Z" fill="#3D6178" stroke="${OL}" stroke-width="1.4"/><path d="M${f(ox + 6)} ${f(oy + 10)} v-10 M${f(ox + 20)} ${f(oy + 10)} v-10 M${f(ox + 34)} ${f(oy + 10)} v-10" stroke="#F2E6CC" stroke-width="3"/>`;
  }
  if (l >= 3) a.s += flag(P(-12, 0, 116), 26, '#3D6178');
  // An armour stand.
  const [mx, my] = P(66, -24, 0);
  a.s += `<path d="M${f(mx)} ${f(my)} v-34 M${f(mx - 8)} ${f(my)} h16" stroke="${OL}" stroke-width="3"/><path d="M${f(mx - 11)} ${f(my - 36)} h22 l-3 18 h-16 Z" fill="#9AA1A8" stroke="${OL}" stroke-width="1.6"/><path d="M${f(mx - 7)} ${f(my - 38)} q7 -14 14 0 Z" fill="#B9BFC5" stroke="${OL}" stroke-width="1.4"/>`;
  P(66, -24, 52);
}

function stall(a: Art, X: number, Z: number, c1: string, c2: string, goods: string[]) {
  a.s += box({ x: X + 4, z: Z + 6, w: 62, d: 22, h: 22, rh: 0, ridge: 'x', wall: WALLS.wood });
  const top = P(X + 4, Z + 6, 22);
  a.s += goods.map((c, i) => `<circle cx="${f(top[0] + 8 + i * 11)}" cy="${f(top[1] - 2)}" r="4.6" fill="${c}" stroke="${OL}" stroke-width="1"/>`).join('');
  const p1 = P(X, Z, 0);
  const p2 = P(X + 70, Z, 0);
  a.s += `<path d="M${f(p1[0])} ${f(p1[1])} v-58 M${f(p2[0])} ${f(p2[1])} v-58" stroke="${OL}" stroke-width="3.4"/><path d="M${f(p1[0])} ${f(p1[1])} v-58 M${f(p2[0])} ${f(p2[1])} v-58" stroke="#7A5232" stroke-width="1.8"/>`;
  const e1 = P(X - 6, Z - 4, 58);
  const e2 = P(X + 76, Z - 4, 58);
  const r2 = P(X + 76, Z + 30, 70);
  const r1 = P(X - 6, Z + 30, 70);
  a.s += shape([e1, e2, r2, r1], c1, 1.6);
  let d = '';
  for (let i = 1; i < 8; i += 2) {
    const q1 = lerp(e1, e2, i / 8);
    const q2 = lerp(e1, e2, (i + 1) / 8);
    d += `M${pp(q1)} L${pp(q2)} L${pp(lerp(r1, r2, (i + 1) / 8))} L${pp(lerp(r1, r2, i / 8))} Z `;
  }
  a.s += `<path d="${d}" fill="${c2}"/>`;
  // Scalloped valance.
  let v = `M${pp(e1)} `;
  for (let i = 0; i < 8; i++) {
    const q = lerp(e1, e2, (i + 1) / 8);
    v += `Q${f(q[0] - 5.1)} ${f(q[1] + 9)} ${pp(q)} `;
  }
  a.s += `<path d="${v}" fill="${c1}" stroke="${OL}" stroke-width="1.4"/>`;
}

function market(a: Art, l: number) {
  if (l >= 3) {
    a.s += box({ x: -130, z: 48, w: 220, d: 60, h: 60, rh: 36, ridge: 'x', wall: WALLS.stone, roof: ROOFS.red });
    let d = '';
    for (let i = 0; i < 6; i++) {
      const [sx, sy] = P(-122 + i * 35, 48, 0);
      d += `M${f(sx)} ${f(sy)} V${f(sy - 30)} A12 12 0 0 1 ${f(sx + 24)} ${f(sy - 30)} V${f(sy)} Z `;
    }
    a.s += `<path d="${d}" fill="#3A2A1E" stroke="${OL}" stroke-width="1.6"/>`;
  }
  const spots: [number, number, string, string, string[]][] = l === 1
    ? [[-100, 0, '#C8423A', '#F2E6CC', ['#D84A3A', '#E8C23A', '#7FA35A', '#D84A3A', '#E8C23A']], [-6, 10, '#3D6178', '#F2E6CC', ['#C9A24A', '#8E3A2A', '#F2E6CC', '#6A3A6E', '#C9A24A']]]
    : [[-126, -2, '#C8423A', '#F2E6CC', ['#D84A3A', '#E8C23A', '#7FA35A', '#D84A3A', '#E8C23A']], [-40, 8, '#3D6178', '#F2E6CC', ['#C9A24A', '#8E3A2A', '#F2E6CC', '#6A3A6E', '#C9A24A']], [46, -4, '#4F7A3A', '#F1D27A', ['#B07A45', '#E0C090', '#B07A45', '#7FA35A', '#E0C090']]];
  for (const [X, Z, c1, c2, g] of spots) stall(a, X, Z, c1, c2, g);
  if (l >= 2) {
    // Crates and a sack.
    const [cx, cy] = P(-150, -20, 0);
    a.s += `<rect x="${f(cx)}" y="${f(cy - 16)}" width="18" height="16" fill="#B07A45" stroke="${OL}" stroke-width="1.4"/><rect x="${f(cx + 6)}" y="${f(cy - 30)}" width="14" height="14" fill="#C08A5A" stroke="${OL}" stroke-width="1.4"/><path d="M${f(cx + 22)} ${f(cy)} q-2 -16 7 -18 q9 2 7 18 Z" fill="#E0C090" stroke="${OL}" stroke-width="1.4"/>`;
    P(-150, -20, 30);
  }
}

function horse(x: number, y: number, s: number, c: string, flip = false): string {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${flip ? -s : s} ${s})"><path d="M-22 0V-18M-14 0V-18M12 0V-18M18 0V-18" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M-22 0V-18M-14 0V-18M12 0V-18M18 0V-18" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M-26 -16C-28 -30 -14 -34 0 -33C12 -33 22 -32 22 -22C22 -14 14 -14 0 -14C-12 -14 -24 -10 -26 -16Z" fill="${c}" stroke="${OL}" stroke-width="1.8"/><path d="M16 -28C20 -38 24 -46 30 -48L34 -46C38 -44 40 -40 38 -38L32 -36C30 -32 26 -28 22 -24Z" fill="${c}" stroke="${OL}" stroke-width="1.8"/><path d="M18 -30C20 -38 24 -44 28 -47" stroke="#3A2414" stroke-width="3" fill="none"/><path d="M-26 -24C-32 -20 -32 -10 -30 -4" stroke="#3A2414" stroke-width="3" fill="none"/><circle cx="33" cy="-43" r="1.2" fill="${OL}"/></g>`;
}

/** The Embassy: a stone hall flying the tribes' banners (more of them as it grows), with a tower at level 3. */
const TRIBE_BANNERS = ['#9CB25E', '#5E646B', '#4F7A3A', '#7A3A28', '#3E6E5E', '#2E2846', '#E0B45A', '#24202E'];
function embassy(a: Art, l: number) {
  const w = l >= 2 ? 150 : 124;
  a.s += box({ x: -w / 2, w, d: 100, h: l >= 2 ? 66 : 58, rh: 46, ridge: 'x', wall: WALLS.stone, roof: l >= 3 ? ROOFS.blue : ROOFS.slate });
  if (l >= 3) a.s += box({ x: w / 2 - 34, z: 10, w: 40, d: 40, h: 120, rh: 34, ridge: 'z', wall: WALLS.grey, roof: ROOFS.blue });
  // The door, and the windows.
  const [dx, dy] = P(-14, 0, 0);
  a.s += `<path d="M${f(dx)} ${f(dy)} V${f(dy - 34)} Q${f(dx + 14)} ${f(dy - 48)} ${f(dx + 28)} ${f(dy - 34)} V${f(dy)} Z" fill="#5A3422" stroke="${OL}" stroke-width="2"/><circle cx="${f(dx + 21)}" cy="${f(dy - 16)}" r="1.8" fill="#E2B84A"/>`;
  winS(a, -w / 2 + 22, 30, 24, 18, 16);
  winS(a, w / 2 - 40, 30, 24, 18, 16);
  // Banners of the tribes along the front: 2, 4 or 8.
  const n = [0, 2, 4, 8][l] ?? 0;
  for (let i = 0; i < n; i++) {
    const X = -w / 2 + 10 + (i * (w - 20)) / Math.max(1, n - 1);
    const [px, py] = P(X, 12, 0);
    const c = TRIBE_BANNERS[i % TRIBE_BANNERS.length];
    a.s += `<path d="M${f(px)} ${f(py)} V${f(py - 74)}" stroke="${OL}" stroke-width="3"/><path d="M${f(px)} ${f(py)} V${f(py - 74)}" stroke="#8A6A44" stroke-width="1.6"/>`;
    a.s += `<path d="M${f(px + 1)} ${f(py - 72)} h16 v20 l-8 -5 l-8 5 Z" fill="${c}" stroke="${OL}" stroke-width="1.5"/>`;
  }
}

function stables(a: Art, l: number) {
  const w = l >= 3 ? 136 : 118;
  if (l >= 2) {
    // The paddock.
    let d = '';
    for (let i = 0; i <= 4; i++) {
      const p = P(56 + i * 24, -12, 0);
      d += `M${pp(p)} v-26 `;
    }
    const a1 = P(56, -12, 20);
    const a2 = P(152, -12, 20);
    const b1 = P(56, -12, 10);
    const b2 = P(152, -12, 10);
    d += `M${pp(a1)} L${pp(a2)} M${pp(b1)} L${pp(b2)}`;
    a.s += horse(P(108, 20, 0)[0], P(108, 20, 0)[1], 0.85, '#C9A27A', true);
    a.s += `<path d="${d}" stroke="${OL}" stroke-width="4.4" stroke-linecap="round"/><path d="${d}" stroke="#9A6A3E" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  a.s += box({ x: -116, w, d: 110, h: l >= 3 ? 68 : 60, rh: 58, ridge: 'z', wall: WALLS.barn, roof: l === 1 ? ROOFS.thatch : ROOFS.shingle });
  const dx = -116 + w / 2 - 28;
  const [sx, sy] = P(dx, 0, 0);
  a.s += `<path d="M${f(sx)} ${f(sy)} V${f(sy - 48)} H${f(sx + 56)} V${f(sy)} Z" fill="#6E3424" stroke="${OL}" stroke-width="2"/><path d="M${f(sx)} ${f(sy)} L${f(sx + 28)} ${f(sy - 48)} M${f(sx + 28)} ${f(sy)} L${f(sx)} ${f(sy - 48)} M${f(sx + 28)} ${f(sy)} L${f(sx + 56)} ${f(sy - 48)} M${f(sx + 56)} ${f(sy)} L${f(sx + 28)} ${f(sy - 48)} M${f(sx + 28)} ${f(sy)} V${f(sy - 48)}" stroke="#E9DCBD" stroke-width="2.6"/><path d="M${f(sx)} ${f(sy)} V${f(sy - 48)} H${f(sx + 56)} V${f(sy)}" fill="none" stroke="#E9DCBD" stroke-width="3"/>`;
  const [hx, hy] = P(-116 + w / 2 - 12, 0, (l >= 3 ? 68 : 60) + 8);
  a.s += `<rect x="${f(hx)}" y="${f(hy - 22)}" width="24" height="22" fill="#3A1E14" stroke="${OL}" stroke-width="1.8"/><path d="M${f(hx + 2)} ${f(hy)} q10 -12 20 0 Z" fill="#E2C25A" stroke="${OL}" stroke-width="1"/>`;
  a.l += `<rect x="${f(hx)}" y="${f(hy - 22)}" width="24" height="22" fill="#E8A24A" opacity="0.8"/>`;
  winS(a, -116 + w, 40, 26, 22, 16);
  winS(a, -116 + w, 76, 26, 22, 16);
  // Hay bales.
  const [bx, by] = P(-150, -10, 0);
  a.s += `<ellipse cx="${f(bx)}" cy="${f(by - 9)}" rx="13" ry="9" fill="#E2B84A" stroke="${OL}" stroke-width="1.5"/><ellipse cx="${f(bx + 18)}" cy="${f(by - 7)}" rx="11" ry="7.5" fill="#D8A83E" stroke="${OL}" stroke-width="1.5"/><path d="M${f(bx - 8)} ${f(by - 12)} q8 -3 16 0 M${f(bx - 9)} ${f(by - 6)} q9 -3 18 0" stroke="#A9853F" stroke-width="1" fill="none"/>`;
  P(-164, -10, 20);
  a.s += horse(P(-80, -30, 0)[0], P(-80, -30, 0)[1], 0.9, '#8A5A34');
  if (l >= 3) {
    const tip = P(-116 + w / 2, 0, 68 + 58 + 4);
    a.s += `<path d="M${f(tip[0])} ${f(tip[1])} v-16 M${f(tip[0] - 9)} ${f(tip[1] - 12)} h18" stroke="${OL}" stroke-width="2"/><path d="M${f(tip[0] - 2)} ${f(tip[1] - 18)} l12 -3 l-2 5 Z" fill="#E2B84A" stroke="${OL}" stroke-width="1"/>`;
  }
}

/** The town gate: the way out to the world map. Grows with the town. */
function gate(a: Art, stage: number) {
  if (stage <= 1) {
    a.s += `<path d="M-46 0V-78M46 0V-78M-58 -70H58" stroke="${OL}" stroke-width="8" stroke-linecap="round"/><path d="M-46 0V-78M46 0V-78M-58 -70H58" stroke="#8A6236" stroke-width="5" stroke-linecap="round"/>`;
    a.s += `<path d="M-30 -70v8M30 -70v8" stroke="${OL}" stroke-width="1.5"/><rect x="-36" y="-62" width="72" height="20" rx="3" fill="#7A5232" stroke="${OL}" stroke-width="1.8"/><text x="0" y="-48" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="9" fill="#F2E6CC">THE MARCHES</text>`;
    P(-60, 0, 84);
    P(60, 0, 0);
    return;
  }
  if (stage === 2) {
    for (const x of [-78, 40]) {
      a.s += box({ x, w: 36, d: 30, h: 92, rh: 0, ridge: 'x', wall: WALLS.wood });
      a.s += spire(x, 0, 36, 30, 92, 30, ROOFS.thatch);
    }
    a.s += shape([P(-42, 0, 62), P(40, 0, 62), P(40, 0, 74), P(-42, 0, 74)], WALLS.wood.c, 1.8);
    door(a, -38, 76, 60, { open: true });
    return;
  }
  if (stage === 3) {
    a.s += box({ x: -74, w: 148, d: 44, h: 96, rh: 40, ridge: 'x', wall: WALLS.wood, roof: ROOFS.red });
    door(a, -30, 60, 70, { open: true });
    win(a, -62, 66, 14, 16);
    win(a, 48, 66, 14, 16);
    a.s += flag(P(74, 22, 136), 26, '#3D6178');
    return;
  }
  const big = stage === 5;
  if (big) {
    a.s += box({ x: -46, z: 10, w: 92, d: 40, h: 116, rh: 0, ridge: 'x', wall: WALLS.stone, crenel: true });
    door(a, -26, 52, 76, { z: 10, open: true });
    a.s += `<path d="${(() => { const [x, y] = P(-26, 10, 76); let d = ''; for (let i = 1; i < 6; i++) d += `M${f(x + i * 8.7)} ${f(y)} v14 `; return d + `M${f(x)} ${f(y + 6)} h52 M${f(x)} ${f(y + 13)} h52`; })()}" stroke="${OL}" stroke-width="2.2"/>`;
    for (const cx of [-66, 66]) {
      const tip = rtower(a, cx, 0, 32, 150, 72, WALLS.stone, ROOFS.blue);
      a.s += flag(tip, 32, '#8E2B23');
      win(a, cx - 6, 92, 12, 20, { z: -18, arch: true });
    }
    a.s += banner(P(-14, 10, 112), '#8E2B23', 28, 30, SHIELD);
    return;
  }
  for (const x of [-92, 44]) {
    a.s += box({ x, w: 48, d: 44, h: 126, rh: 0, ridge: 'x', wall: WALLS.stone, crenel: true });
    win(a, x + 18, 84, 12, 18, { arch: true });
  }
  a.s += box({ x: -44, z: 6, w: 88, d: 36, h: 96, rh: 0, ridge: 'x', wall: WALLS.stone, crenel: true });
  door(a, -26, 52, 70, { z: 6, open: true });
  a.s += flag(P(-68, 22, 135), 26, '#3D6178');
  a.s += flag(P(68, 22, 135), 26, '#3D6178');
}

const BUILD: Record<string, (a: Art, l: number) => void> = { townhall, guildhall, tavern, magetower, temple, weaponsmith, armorer, market, stables, embassy };

/** An empty plot, staked out and waiting for builders. */
function plot(a: Art, w: number) {
  const x0 = -w / 2;
  const x1 = w / 2 - 40;
  const pts: V[] = [P(x0, -16, 0), P(x1, -16, 0), P(x1, 70, 0), P(x0, 70, 0)];
  a.s += `<path d="${dd(pts)}" fill="#A88B5C" opacity="0.55"/><path d="${dd(pts)}" fill="none" stroke="#F2E6CC" stroke-width="2" stroke-dasharray="6 5"/>`;
  a.s += pts.map((p) => `<path d="M${pp(p)} v-12" stroke="${OL}" stroke-width="4"/><path d="M${pp(p)} v-12" stroke="#C9A06A" stroke-width="2"/>`).join('');
  // A pile of timber and stone.
  const [lx, ly] = P(x0 + 24, 20, 0);
  a.s += `<path d="M${f(lx)} ${f(ly)} h40 M${f(lx + 3)} ${f(ly - 6)} h34 M${f(lx + 8)} ${f(ly - 12)} h24" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M${f(lx)} ${f(ly)} h40 M${f(lx + 3)} ${f(ly - 6)} h34 M${f(lx + 8)} ${f(ly - 12)} h24" stroke="#B07A45" stroke-width="4.5" stroke-linecap="round"/>`;
  const [sx, sy] = P(x1 - 40, 30, 0);
  a.s += `<path d="M${f(sx)} ${f(sy)} l6 -10 h10 l5 10 Z M${f(sx + 12)} ${f(sy)} l5 -8 h9 l4 8 Z" fill="#BBB6AA" stroke="${OL}" stroke-width="1.4"/>`;
  P(x0, -16, 40);
}

/** Scaffolding, a treadwheel crane and a builder at work. */
function scaffold(a: Art) {
  const x0 = bb.x0 + 8;
  const x1 = bb.x1 - 30;
  const top = Math.max(bb.y0 + 20, -150);
  let d = '';
  for (let x = x0; x <= x1; x += (x1 - x0) / 4) d += `M${f(x)} 2 V${f(top)} `;
  for (let y = -26; y > top; y -= 34) d += `M${f(x0 - 6)} ${f(y)} H${f(x1 + 6)} `;
  d += `M${f(x0)} -4 L${f(x0 + (x1 - x0) / 4)} ${f(Math.max(top, -60))} `;
  a.s += `<path d="${d}" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="${d}" stroke="#C9A06A" stroke-width="3" stroke-linecap="round"/>`;
  // The crane, with a stone swinging on its rope.
  const cx = x1 + 22;
  a.s += `<path d="M${f(cx)} 0 V${f(top - 30)} L${f(cx - 60)} ${f(top - 14)}" stroke="${OL}" stroke-width="5" fill="none"/><path d="M${f(cx)} 0 V${f(top - 30)} L${f(cx - 60)} ${f(top - 14)}" stroke="#9A6A3E" stroke-width="3" fill="none"/><circle cx="${f(cx)}" cy="-16" r="14" fill="none" stroke="${OL}" stroke-width="3"/><circle cx="${f(cx)}" cy="-16" r="14" fill="none" stroke="#9A6A3E" stroke-width="1.6" stroke-dasharray="4 3"/>`
    + `<g class="swing" style="transform-origin:${f(cx - 56)}px ${f(top - 14)}px"><path d="M${f(cx - 56)} ${f(top - 14)} v40" stroke="${OL}" stroke-width="1.2"/><rect x="${f(cx - 63)}" y="${f(top + 26)}" width="14" height="11" fill="#BBB6AA" stroke="${OL}" stroke-width="1.2"/></g>`;
  // A builder on the planks, hammering.
  const bx = (x0 + x1) / 2;
  const by = Math.min(-26, top + 34 * Math.floor((-26 - top) / 34)) ;
  a.s += `<g transform="translate(${f(bx)} ${f(by)})"><path d="M-3 0v-8M3 0v-8" stroke="${OL}" stroke-width="2.4"/><path d="M-5 -8h10v-10h-10Z" fill="#8E2B23" stroke="${OL}" stroke-width="1.2"/><circle cx="0" cy="-22" r="4" fill="#E8B896" stroke="${OL}" stroke-width="1.1"/><path d="M-4 -25h8" stroke="#C9A24A" stroke-width="3"/><g class="hammer"><path d="M4 -16l9 -6" stroke="${OL}" stroke-width="2"/><rect x="11" y="-26" width="5" height="7" fill="#4A4E56"/></g></g>`;
}

// ---- The town around the guild ----

interface Item { y: number; s: string; l?: string }

/** A townhouse in the style of the town's stage. */
function house(seed: number, stage: number): Art {
  const a = new Art();
  const r = hash(seed);
  const r2 = hash(seed + 7);
  const style = stage <= 1 ? 'hut' : stage === 2 ? (r < 0.55 ? 'hut' : 'cottage') : stage === 3 ? (r < 0.7 ? 'cottage' : 'town') : r < 0.3 ? 'cottage' : 'town';
  const ridge = r2 < 0.5 ? 'z' : 'x';
  if (style === 'hut') {
    a.s += box({ x: -30, w: 52, d: 44, h: 30, rh: 30, ridge, wall: WALLS.daub, roof: ROOFS.thatch });
    door(a, ridge === 'z' ? -14 : -24, 16, 22, { c: '#6E4628' });
    win(a, ridge === 'z' ? 8 : 0, 12, 10, 10);
    if (r > 0.4) a.s += smoke(P(-4, 22, ridge === 'z' ? 62 : 52));
    return a;
  }
  if (style === 'cottage') {
    const roofs = [ROOFS.red, ROOFS.thatch, ROOFS.red, ROOFS.shingle];
    const walls = [WALLS.plaster, WALLS.ochre, WALLS.plaster, WALLS.daub];
    const w = 56 + Math.round(r2 * 14);
    a.s += box({ x: -34, w, d: 50, h: 40, rh: 34, ridge, wall: walls[seed % 4], roof: roofs[(seed >> 1) % 4], timber: r > 0.35 });
    door(a, -34 + w / 2 - 8, 16, 26, { c: '#6E4628' });
    win(a, -28, 14, 12, 13, { shutters: '#3D6178' });
    win(a, -34 + w - 16, 14, 12, 13);
    if (r2 > 0.3) chimney(a, -34 + w * 0.7, 20, 52, 16, r > 0.5);
    return a;
  }
  const roofs = [ROOFS.slate, ROOFS.red, ROOFS.blue, ROOFS.red, ROOFS.green];
  const walls = [WALLS.plaster, WALLS.stone, WALLS.ochre, WALLS.plaster];
  const tall = stage === 5 && r2 > 0.5 ? 3 : 2;
  const h = tall * 34;
  a.s += box({ x: -28, w: 54, d: 56, h, rh: 36, ridge: 'z', wall: walls[seed % 4], roof: roofs[seed % 5], timber: walls[seed % 4] !== WALLS.stone, storeys: tall });
  door(a, -10, 16, 26, { c: '#5A3A22' });
  for (let k = 1; k < tall; k++) {
    win(a, -22, k * 34 + 8, 11, 15);
    win(a, 8, k * 34 + 8, 11, 15);
  }
  win(a, -24, 10, 11, 13);
  winS(a, 26, 20, h - 26, 14, 14);
  if (r > 0.3) chimney(a, 10, 32, h + 14, 18, r > 0.55);
  return a;
}

function tree(x: number, y: number, s: number, season: Season, seed: number): string {
  const r = hash(seed);
  const pine = r < 0.32;
  const t = `translate(${f(x)} ${f(y)}) scale(${f(s)})`;
  if (pine) {
    const c = season === 'winter' ? '#5E7A68' : '#3E6A4A';
    const snowcap = season === 'winter' ? '<path d="M0 -92L-10 -72H10Z M-6 -66l-10 14h32l-10-14z" fill="#F2F5F7"/>' : '';
    return `<g transform="${t}"><path d="M-3 0V-14H3V0Z" fill="#5A3A22" stroke="${OL}" stroke-width="1.4"/><path d="M0 -92L-20 -54H-10L-26 -14H26L10 -54H20Z" fill="${c}" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0 -92L-20 -54H-10L-26 -14H0Z" fill="#000" opacity="0.0"/><path d="M2 -88L14 -58M4 -50L20 -18" stroke="#2A4A32" stroke-width="1.4"/>${snowcap}</g>`;
  }
  if (season === 'winter') {
    return `<g transform="${t}"><path d="M0 0V-46M0 -30L-14 -48M0 -36L12 -56M0 -46L-4 -62M-8 -40L-16 -42M6 -46L16 -50" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/><path d="M0 0V-46M0 -30L-14 -48M0 -36L12 -56M0 -46L-4 -62" stroke="#6E4A28" stroke-width="1.8" stroke-linecap="round"/><path d="M-16 -48h6M10 -56h6M-6 -62h5" stroke="#F2F5F7" stroke-width="2.4" stroke-linecap="round"/></g>`;
  }
  const leaf = {
    spring: ['#86B85E', '#9CC870'],
    summer: ['#4F8A3A', '#62A048'],
    autumn: [['#C9772E', '#E0A23A'], ['#B8502A', '#D8743A'], ['#D9A23A', '#EAC25A']][Math.abs(seed) % 3],
    winter: ['', ''],
  }[season];
  const blossom = season === 'spring' && r > 0.6 ? `<circle cx="-8" cy="-50" r="2.2" fill="#F6C8D8"/><circle cx="6" cy="-58" r="2.2" fill="#F6C8D8"/><circle cx="10" cy="-40" r="2.2" fill="#F6C8D8"/><circle cx="-12" cy="-36" r="2.2" fill="#F6C8D8"/>` : '';
  return `<g transform="${t}"><path d="M-3 0V-30H3V0Z" fill="#6E4A28" stroke="${OL}" stroke-width="1.4"/><path d="M-22 -32C-30 -40 -24 -56 -12 -56C-10 -68 10 -70 14 -58C26 -58 30 -42 22 -34C24 -24 -18 -22 -22 -32Z" fill="${leaf[0]}" stroke="${OL}" stroke-width="1.8"/><path d="M-12 -50C-8 -60 6 -62 10 -54C4 -56 -6 -56 -12 -50Z" fill="${leaf[1]}"/>${blossom}</g>`;
}

/** A tiny townsperson, feet at 0, 0. */
function person(seed: number): string {
  const tops = ['#8E2B23', '#3D6178', '#4F7A3A', '#C9A24A', '#6A3A6E', '#9A6A3E', '#E9DCBD'];
  const skins = ['#E8B896', '#C98E6A', '#F0CDAA', '#8A5A3A'];
  const c = tops[seed % tops.length];
  const sk = skins[(seed >> 2) % skins.length];
  const hat = seed % 3 === 0 ? '<path d="M-5 -21h10l-2 -4h-6z" fill="#6E4A28" stroke="#2A1A10" stroke-width="0.8"/>' : '';
  const load = seed % 4 === 1 ? '<rect x="4" y="-14" width="6" height="6" fill="#B07A45" stroke="#2A1A10" stroke-width="0.8"/>' : '';
  return `<g class="walk"><path d="M-2 0v-7M2 0v-7" stroke="#2A1A10" stroke-width="2"/><path d="M-4.5 -6h9l-1.5 -9h-6z" fill="${c}" stroke="#2A1A10" stroke-width="1"/><circle cx="0" cy="-18" r="3.2" fill="${sk}" stroke="#2A1A10" stroke-width="0.9"/>${hat}${load}</g>`;
}

const ROAD_WE = 'M180 716 L420 704 L640 690 L800 676 L980 684 L1200 668 L1370 650';
const ROAD_NS = 'M800 850 L800 690';

function walkers(stage: number, night: boolean): string {
  const n = night ? 2 : 2 + stage * 2;
  let s = '';
  for (let i = 0; i < n; i++) {
    const ns = i % 4 === 3;
    const dur = 36 + hash(i + 3) * 40;
    const sc = ns ? 1.25 : 1.05;
    s += `<g><g transform="scale(${sc})">${person(i * 5 + 3)}</g><animateMotion dur="${f(dur)}s" begin="${f(-hash(i) * dur)}s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" path="${ns ? ROAD_NS : ROAD_WE}"/></g>`;
  }
  return s;
}

/** Town walls: none in a hamlet, a palisade for a village, stone for a town. */
function wallSeg(A: V, B: V, hA: number, hB: number, stage: number): string {
  const n = Math.max(2, Math.round(len(A, B) / 10));
  if (stage <= 3) {
    let top = '';
    let logs = '';
    for (let i = 0; i <= n; i++) {
      const p = lerp(A, B, i / n);
      const hh = hA + ((hB - hA) * i) / n;
      top += ` L${f(p[0])} ${f(p[1] - hh)}`;
      if (i < n) {
        const q = lerp(A, B, (i + 0.5) / n);
        top += ` L${f(q[0])} ${f(q[1] - hh - 7)}`;
      }
      logs += `M${f(p[0])} ${f(p[1])} V${f(p[1] - hh)} `;
    }
    return `<path d="M${pp(A)}${top} L${pp(B)} Z" fill="#8E6438" stroke="${OL}" stroke-width="1.8" stroke-linejoin="round"/><path d="${logs}" stroke="#5A3A22" stroke-width="1.4"/><path d="M${pp(A)}${top} L${pp(B)} Z" fill="url(#g-front)"/>`;
  }
  const pts: V[] = [A, B, [B[0], B[1] - hB], [A[0], A[1] - hA]];
  let mer = '';
  for (let i = 0; i < n; i += 2) {
    const p = lerp(A, B, i / n);
    const q = lerp(A, B, Math.min(1, (i + 1) / n));
    const hp = hA + ((hB - hA) * i) / n;
    const hq = hA + ((hB - hA) * Math.min(n, i + 1)) / n;
    mer += `M${f(p[0])} ${f(p[1] - hp)} v-8 L${f(q[0])} ${f(q[1] - hq - 8)} v8 Z `;
  }
  const wall = stage === 5 ? '#CFC6AE' : '#C4BBA2';
  return `${shape(pts, wall, 1.8)}${tex(pts, 'url(#tx-stone)')}<path d="${mer}" fill="${wall}" stroke="${OL}" stroke-width="1.4"/><path d="M${pp(A)} L${pp(B)}" stroke="#7A705A" stroke-width="4" opacity="0.5"/>`;
}

function wallTower(x: number, y: number, s: number, stage: number): string {
  const a = new Art();
  if (stage === 3) {
    a.s += box({ x: -18, w: 36, d: 30, h: 70, rh: 0, ridge: 'x', wall: WALLS.wood });
    a.s += spire(-18, 0, 36, 30, 70, 30, ROOFS.thatch);
  } else if (stage === 4) {
    a.s += box({ x: -22, w: 44, d: 40, h: 84, rh: 0, ridge: 'x', wall: WALLS.stone, crenel: true });
    win(a, -6, 50, 10, 16, { arch: true });
  } else {
    const tip = rtower(a, 0, 0, 24, 104, 56, WALLS.stone, ROOFS.blue);
    a.s += flag(tip, 26, '#8E2B23');
    win(a, -5, 62, 10, 16, { z: -14, arch: true });
  }
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">${a.s}</g>`;
}

function walls(stage: number, items: Item[]) {
  if (stage <= 1) {
    // A wattle fence or two.
    const fence = (A: V, B: V) => {
      let d = `M${f(A[0])} ${f(A[1] - 14)} L${f(B[0])} ${f(B[1] - 14)} M${f(A[0])} ${f(A[1] - 7)} L${f(B[0])} ${f(B[1] - 7)} `;
      const n = Math.round(len(A, B) / 22);
      for (let i = 0; i <= n; i++) {
        const p = lerp(A, B, i / n);
        d += `M${f(p[0])} ${f(p[1])} v-18 `;
      }
      return `<path d="${d}" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="${d}" stroke="#9A6A3E" stroke-width="2.2" stroke-linecap="round"/>`;
    };
    items.push({ y: 470, s: fence([150, 470], [330, 466]) + fence([1250, 466], [1460, 470]) });
    items.push({ y: 720, s: fence([1300, 616], [1350, 640]) });
    return;
  }
  const hB = stage === 2 ? 22 : stage === 3 ? 28 : stage === 4 ? 32 : 42;
  const hF = hB * 1.7;
  items.push({ y: 458, s: wallSeg([110, 462], [1490, 462], hB, hB, stage) });
  const right: V[] = [[1490, 462], [1478, 530], [1462, 610]];
  for (let i = 0; i < right.length - 1; i++) items.push({ y: right[i + 1][1], s: wallSeg(right[i], right[i + 1], hB + (hF - hB) * (i / 3), hB + (hF - hB) * ((i + 1) / 3), stage) });
  const left: V[] = [[110, 462], [101, 530], [92, 600]];
  for (let i = 0; i < left.length - 1; i++) items.push({ y: left[i + 1][1], s: wallSeg(left[i + 1], left[i], hB + (hF - hB) * ((i + 1) / 3), hB + (hF - hB) * (i / 3), stage) });
  if (stage >= 3) {
    items.push({ y: 462, s: wallTower(110, 466, 0.7, stage) });
    items.push({ y: 462, s: wallTower(1490, 466, 0.7, stage) });
    items.push({ y: 600, s: wallTower(92, 602, 0.85, stage) });
    if (stage >= 4) {
      items.push({ y: 458, s: wallTower(470, 462, 0.62, stage) });
      items.push({ y: 458, s: wallTower(1120, 462, 0.62, stage) });
    }
  }
}

/** The square: a well, later a fountain, at last a statue of the guild's founder. */
function square(stage: number): Item[] {
  const out: Item[] = [];
  const x = 800;
  const y = 676;
  let s = '';
  if (stage <= 3) {
    s += `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="26" ry="9" fill="#9A9284" stroke="${OL}" stroke-width="2"/><path d="M-26 0v-16a26 9 0 0 0 52 0v16" fill="#B9B4A8" stroke="${OL}" stroke-width="2"/><ellipse cx="0" cy="-16" rx="26" ry="9" fill="#8A8274" stroke="${OL}" stroke-width="2"/><ellipse cx="0" cy="-16" rx="18" ry="5.5" fill="#2E4A5E"/><path d="M-20 -16V-52M20 -16V-52" stroke="${OL}" stroke-width="5"/><path d="M-20 -16V-52M20 -16V-52" stroke="#7A5232" stroke-width="3"/><path d="M-30 -48L0 -66L30 -48Z" fill="${snow ? '#F2F5F7' : stage === 1 ? '#D3AD60' : '#B4553E'}" stroke="${OL}" stroke-width="2"/><path d="M-20 -40H20" stroke="${OL}" stroke-width="2.4"/><path d="M0 -40v12" stroke="${OL}" stroke-width="1"/><rect x="-4" y="-30" width="8" height="7" fill="#8A5A30" stroke="${OL}"/></g>`;
  } else {
    s += `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="54" ry="16" fill="#B9B4A8" stroke="${OL}" stroke-width="2"/><path d="M-54 0v-12a54 16 0 0 0 108 0v12" fill="#C9C2B0" stroke="${OL}" stroke-width="2"/><ellipse cx="0" cy="-12" rx="54" ry="16" fill="#A9A294" stroke="${OL}" stroke-width="2"/><ellipse cx="0" cy="-12" rx="46" ry="12" fill="${snow ? '#DCE8F0' : '#4E86A8'}"/><path d="M-10 -12v-24h20v24" fill="#C9C2B0" stroke="${OL}" stroke-width="1.8"/><ellipse cx="0" cy="-36" rx="18" ry="5" fill="#B9B4A8" stroke="${OL}" stroke-width="1.8"/>`;
    if (stage === 5) {
      // The founder, sword raised.
      s += `<g transform="translate(0 -40)"><path d="M-5 0v-14h10v14Z" fill="#8E9A94" stroke="${OL}" stroke-width="1.4"/><path d="M-7 -14l2 -18h10l2 18Z" fill="#9AA6A0" stroke="${OL}" stroke-width="1.4"/><circle cx="0" cy="-36" r="5" fill="#9AA6A0" stroke="${OL}" stroke-width="1.4"/><path d="M6 -28l10 -22" stroke="${OL}" stroke-width="4"/><path d="M6 -28l10 -22" stroke="#B9C4BE" stroke-width="2"/><path d="M-6 -28c-6 6-8 14-6 22" stroke="#8E9A94" stroke-width="5" fill="none"/></g>`;
    } else {
      s += `<path d="M0 -36v-14" stroke="${OL}" stroke-width="3"/>`;
    }
    if (!snow) s += `<g class="spray"><path d="M0 -50c-10 6-16 18-18 30M0 -50c10 6 16 18 18 30" stroke="#B9E2F2" stroke-width="2.4" fill="none"/></g>`;
    s += '</g>';
  }
  out.push({ y, s });
  // The training dummy by the Guild Hall.
  out.push({ y: 708, s: `<g transform="translate(468 708)"><path d="M0 0V-44M-14 -32H14" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M0 0V-44M-14 -32H14" stroke="#8A6236" stroke-width="3" stroke-linecap="round"/><ellipse cx="0" cy="-26" rx="8" ry="11" fill="#D9B860" stroke="${OL}" stroke-width="1.8"/><path d="M-6 -30h12M-7 -22h14" stroke="#A9853F" stroke-width="1.2"/><circle cx="0" cy="-42" r="6" fill="#D9B860" stroke="${OL}" stroke-width="1.6"/><circle cx="0" cy="-26" r="3.4" fill="none" stroke="#8E2B23" stroke-width="1.6"/></g>` });
  // Old graves by the east wall, older than the guild.
  out.push({ y: 798, s: `<g transform="translate(1494 798)">${[[-14, 0, 1], [6, -6, 0.9], [22, 2, 1.05]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-7 0V-14a7 7 0 0 1 14 0V0Z" fill="#A9A294" stroke="${OL}" stroke-width="1.6"/><path d="M-3 -12h6M0 -15v7" stroke="#7A705C" stroke-width="1.3"/><ellipse cx="0" cy="1" rx="9" ry="2.4" fill="#5E7A3A" opacity="0.6"/></g>`).join('')}</g>` });
  if (stage >= 2) {
    // The notice board.
    out.push({ y: 666, s: `<g transform="translate(690 666)"><path d="M-18 0V-40M18 0V-40" stroke="${OL}" stroke-width="4"/><path d="M-18 0V-40M18 0V-40" stroke="#7A5232" stroke-width="2.4"/><rect x="-22" y="-44" width="44" height="28" rx="2" fill="#8A6236" stroke="${OL}" stroke-width="1.8"/><path d="M-24 -44L0 -54L24 -44" fill="${snow ? '#F2F5F7' : '#6E4A28'}" stroke="${OL}" stroke-width="1.8"/><rect x="-17" y="-40" width="12" height="14" fill="#F2E6CC" transform="rotate(-4 -11 -33)"/><rect x="-2" y="-41" width="11" height="10" fill="#E9DCBD"/><rect x="10" y="-38" width="8" height="12" fill="#F2E6CC" transform="rotate(5 14 -32)"/></g>` });
  }
  if (stage >= 2) {
    // A cart with sacks.
    out.push({ y: 712, s: `<g transform="translate(905 712)"><path d="M-30 -14h50l4 -14h-58Z" fill="#9A6A3E" stroke="${OL}" stroke-width="1.8"/><path d="M20 -18l26 6" stroke="${OL}" stroke-width="3"/><circle cx="-16" cy="-8" r="9" fill="none" stroke="${OL}" stroke-width="3"/><circle cx="-16" cy="-8" r="9" fill="none" stroke="#7A5232" stroke-width="1.6"/><circle cx="10" cy="-8" r="9" fill="none" stroke="${OL}" stroke-width="3"/><circle cx="10" cy="-8" r="9" fill="none" stroke="#7A5232" stroke-width="1.6"/><path d="M-24 -28q4 -12 12 -10q6 -4 10 2q8 -6 12 4Z" fill="#E0C090" stroke="${OL}" stroke-width="1.4"/></g>` });
  }
  if (stage >= 3) {
    // Lamp posts.
    for (const [lx, ly] of [[700, 702], [900, 690], [500, 712], [1180, 676], [770, 600], [826, 600], [330, 718]] as V[]) {
      out.push({ y: ly, s: `<g transform="translate(${lx} ${ly})"><path d="M0 0V-46M0 -46h8" stroke="${OL}" stroke-width="3.4"/><path d="M0 0V-46" stroke="#4A4E56" stroke-width="1.8"/><path d="M4 -46h8l-1 9h-6Z" fill="#3A3A40" stroke="${OL}" stroke-width="1.2"/></g>`, l: `<g transform="translate(${lx} ${ly})"><circle cx="8" cy="-41" r="22" fill="url(#g-glow)"/><rect x="6" y="-44" width="4" height="6" fill="#FFE29A"/></g>` });
    }
  }
  if (stage >= 3) {
    // Guards at the gate.
    for (const gx of [1345, 1500]) out.push({ y: 660, s: `<g transform="translate(${gx} 660) scale(1.3)"><path d="M-2 0v-7M2 0v-7" stroke="${OL}" stroke-width="2"/><path d="M-4.5 -6h9l-1.5 -9h-6z" fill="#3D6178" stroke="${OL}" stroke-width="1"/><circle cx="0" cy="-18" r="3.2" fill="#E8B896" stroke="${OL}" stroke-width="0.9"/><path d="M-3.5 -20a3.5 3.5 0 0 1 7 0z" fill="#9AA1A8" stroke="${OL}" stroke-width="0.8"/><path d="M6 1V-28" stroke="${OL}" stroke-width="1.4"/><path d="M6 -28l-2 5h4z" fill="#E6EAED" stroke="${OL}" stroke-width="0.6"/></g>` });
  }
  return out;
}

/** Spots for the townsfolk's houses, filled nearest the square first as the town grows. */
const HOUSE_SLOTS: [number, number, number][] = [
  [655, 560, 0.72], [945, 562, 0.72], [270, 600, 0.82], [1300, 590, 0.8], [215, 720, 0.95], [1440, 760, 0.95],
  [560, 486, 0.56], [1030, 488, 0.56], [300, 488, 0.56], [1310, 490, 0.56], [880, 470, 0.5], [700, 470, 0.5],
  [460, 585, 0.72], [1130, 588, 0.72], [160, 600, 0.82], [180, 820, 1.08], [500, 860, 1.12], [1360, 860, 1.12],
  [620, 470, 0.5], [960, 470, 0.5], [240, 484, 0.56], [1380, 484, 0.56], [1000, 590, 0.72], [600, 590, 0.72],
  [380, 600, 0.82], [1250, 700, 0.9],
];

/** Trees inside the walls, cut down as the town fills in (shown while the stage is below the number). */
const INNER_TREES: [number, number, number, number][] = [
  [700, 562, 0.75, 3], [890, 566, 0.75, 4], [480, 712, 0.9, 3], [1140, 704, 0.9, 4], [250, 640, 0.85, 5], [1340, 720, 0.95, 3],
  [210, 850, 1.1, 6], [1480, 840, 1.1, 6], [160, 690, 1, 6], [520, 560, 0.7, 2], [1060, 556, 0.7, 2], [330, 560, 0.7, 4],
];

const OUTER_TREES: [number, number, number][] = [
  [60, 458, 0.5], [180, 444, 0.42], [380, 440, 0.38], [520, 446, 0.4], [700, 436, 0.36], [920, 440, 0.38], [1080, 446, 0.4],
  [1260, 442, 0.42], [1420, 448, 0.46], [1560, 456, 0.5], [-60, 470, 0.6], [1680, 470, 0.6], [-160, 560, 0.9], [1760, 560, 0.9],
  [-120, 720, 1.1], [1720, 740, 1.1], [-40, 840, 1.3], [1660, 860, 1.3], [-220, 640, 1], [1820, 660, 1],
];

// ---- Sky, hills and ground ----

function ridgePath(seed: number, base: number, amp: number, top: number, step: number): { d: string; peaks: V[] } {
  const pts: V[] = [];
  for (let x = -1300, i = 0; x <= 2900; x += step, i++) pts.push([x, top + hash(seed + i) * amp]);
  const peaks: V[] = [];
  for (let i = 1; i < pts.length - 1; i++) if (pts[i][1] < pts[i - 1][1] && pts[i][1] < pts[i + 1][1] && pts[i][1] < top + amp * 0.45) peaks.push(pts[i]);
  return { d: `M-1300 ${base} ` + pts.map((p) => `L${f(p[0])} ${f(p[1])}`).join(' ') + ` L2900 ${base} Z`, peaks: peaks.map((p, k) => [p[0], p[1] + k * 0]) };
}

function backdrop(v: TownView, stage: number): string {
  const night = v.night;
  const sn = v.season;
  let s = '';
  s += `<rect x="-1400" y="-900" width="4400" height="1420" fill="url(#g-sky-${night ? 'n' : sn === 'winter' ? 'w' : 'd'})"/>`;
  if (night) {
    let st = '';
    for (let i = 0; i < 90; i++) {
      const x = -600 + hash(i * 3) * 2800;
      const y = -200 + hash(i * 3 + 1) * 560;
      st += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + hash(i * 3 + 2) * 1.6)}" fill="#F6F0DC"${i % 6 === 0 ? ` class="twinkle-s" style="animation-delay:${-i * 0.3}s"` : ''}/>`;
    }
    s += st + `<circle cx="1250" cy="110" r="70" fill="url(#g-moonglow)"/><path d="M1250 76a34 34 0 1 0 26 56a28 28 0 1 1 -26 -56Z" fill="#F4F0DC"/>`;
  } else {
    s += `<circle cx="1270" cy="100" r="120" fill="url(#g-sunglow)"/><circle cx="1270" cy="100" r="36" fill="#FFF4D0"/>`;
    const cloud = (x: number, y: number, k: number, i: number) => `<g class="cloud" style="animation-duration:${90 + i * 25}s;animation-delay:${-i * 30}s"><g transform="translate(${x} ${y}) scale(${k})" fill="${sn === 'winter' ? '#EEF1F3' : '#FFFDF6'}" opacity="0.92"><ellipse cx="0" cy="0" rx="60" ry="16"/><circle cx="-24" cy="-10" r="20"/><circle cx="6" cy="-18" r="26"/><circle cx="34" cy="-8" r="18"/></g></g>`;
    s += cloud(160, 120, 1.1, 0) + cloud(620, 70, 0.8, 1) + cloud(980, 160, 1.3, 2) + cloud(1500, 60, 0.9, 3) + cloud(-200, 80, 1, 4);
    s += `<g class="birds"><path d="M500 180q6 -6 12 0q6 -6 12 0M540 196q5 -5 10 0q5 -5 10 0M470 204q4 -4 8 0q4 -4 8 0" stroke="#3A3A40" stroke-width="1.8" fill="none"/></g>`;
  }
  // The far mountains, and Dragonmaw smoking far to the east.
  const far = ridgePath(11, 470, 110, 250, 80);
  s += `<path d="${far.d}" fill="${night ? '#2C3452' : sn === 'winter' ? '#A6B2C2' : '#8E9CB4'}"/>`;
  s += far.peaks.map(([x, y]) => `<path d="M${f(x)} ${f(y)} l-24 26 l10 -4 l8 6 l8 -8 l6 4 l14 -10 Z" fill="${night ? '#8A92AE' : '#F4F6F8'}" opacity="0.9"/>`).join('');
  s += `<path d="M1430 470 L1505 300 L1530 304 L1610 470Z" fill="${night ? '#2A2A3E' : '#7A7486'}"/><path d="M1505 300 L1530 304 L1522 320 L1512 318Z" fill="${night ? '#FF7A3C' : '#C8603A'}"/>${smoke([1517, 296], true)}${night ? '<circle cx="1517" cy="304" r="40" fill="url(#g-glow-f)"/>' : ''}`;
  // Rolling hills with woods and fields.
  const hill = night ? '#2E3E36' : { spring: '#8AB062', summer: '#7DA04E', autumn: '#A89C52', winter: '#DDE4EA' }[sn];
  const hill2 = night ? '#26342C' : { spring: '#79A052', summer: '#6E9242', autumn: '#968A46', winter: '#CBD5DD' }[sn];
  s += `<path d="M-1300 480 C-900 400 -600 430 -300 410 C0 390 200 420 420 404 C640 388 900 420 1120 400 C1340 382 1600 420 1900 398 C2300 380 2600 420 2900 400 V560 H-1300Z" fill="${hill2}"/>`;
  s += `<path d="M-1300 500 C-800 450 -400 470 0 440 C300 420 600 448 900 430 C1200 414 1500 446 1800 430 C2200 414 2600 450 2900 440 V560 H-1300Z" fill="${hill}"/>`;
  // Fields on the slopes outside the walls.
  const field = (x: number, y: number, w: number, c: string) => `<path d="M${x} ${y} l${w} -6 l14 18 l${-w} 6 Z" fill="${c}" stroke="${night ? '#1E2A22' : '#6E7A3A'}" stroke-width="1" opacity="0.9"/>`;
  if (sn !== 'winter') {
    const fc = night ? ['#3A4A30', '#46502E'] : sn === 'autumn' ? ['#D9B85A', '#B8A04A'] : sn === 'summer' ? ['#D9C46A', '#9CB25E'] : ['#A8C878', '#C8D88A'];
    s += field(-420, 470, 160, fc[0]) + field(-250, 462, 120, fc[1]) + field(1640, 466, 150, fc[0]) + field(1810, 474, 130, fc[1]) + field(-600, 500, 150, fc[1]) + field(1900, 500, 160, fc[0]);
  }
  for (const [x, y, k] of OUTER_TREES) if (y < 500) s += tree(x, y, k, sn, Math.round(x));
  // The ground inside the walls.
  const g = night ? '#33402E' : { spring: '#93B866', summer: '#86A858', autumn: '#A9A45A', winter: '#E6EBEE' }[sn];
  s += `<path d="M-1400 470 C-600 462 0 458 800 456 C1600 458 2200 462 3000 470 V1500 H-1400Z" fill="${g}"/><path d="M-1400 470 C-600 462 0 458 800 456 C1600 458 2200 462 3000 470 V1500 H-1400Z" fill="url(#tx-grass)"/><rect x="-1400" y="600" width="4400" height="900" fill="url(#g-ground)"/>`;
  // Roads: dirt in a hamlet, cobbles from a town up.
  const road = stage >= 3 ? '#B3AA98' : night ? '#6A5A44' : '#C2A474';
  const edge = stage >= 3 ? '#8A826E' : '#9A7E54';
  const roads = [
    'M-1400 712 C-600 708 0 712 300 700 C500 692 640 684 800 668 C980 668 1180 660 1300 642 L1420 626 C1700 590 2200 560 3000 540 V566 C2200 590 1700 622 1440 664 L1300 682 C1180 696 980 706 800 708 C640 714 500 724 300 730 C0 742 -600 742 -1400 742 Z',
    'M770 676 L830 676 L880 900 L720 900 Z',
    'M786 640 L814 640 L806 504 L794 504 Z',
  ];
  for (const d of roads) s += `<path d="${d}" fill="${road}" stroke="${edge}" stroke-width="2"/>${stage >= 3 ? `<path d="${d}" fill="url(#tx-cobble)"/>` : ''}`;
  s += `<ellipse cx="800" cy="684" rx="${stage >= 4 ? 200 : 150}" ry="${stage >= 4 ? 52 : 40}" fill="${road}" stroke="${edge}" stroke-width="2"/>${stage >= 3 ? `<ellipse cx="800" cy="684" rx="${stage >= 4 ? 200 : 150}" ry="${stage >= 4 ? 52 : 40}" fill="url(#tx-cobble)"/>` : ''}`;
  if (stage >= 4) s += `<ellipse cx="800" cy="684" rx="120" ry="32" fill="none" stroke="${edge}" stroke-width="2" stroke-dasharray="10 6"/>`;
  return s;
}

const DEFS = `<defs>
<linearGradient id="g-sky-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FB0D8"/><stop offset="0.62" stop-color="#CFE2EC"/><stop offset="0.9" stop-color="#F6E7C8"/></linearGradient>
<linearGradient id="g-sky-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DB4C8"/><stop offset="0.65" stop-color="#DCE5EC"/><stop offset="0.9" stop-color="#F0EEE8"/></linearGradient>
<linearGradient id="g-sky-n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1130"/><stop offset="0.65" stop-color="#232A52"/><stop offset="0.9" stop-color="#4A3E62"/></linearGradient>
<radialGradient id="g-sunglow"><stop offset="0" stop-color="#FFF1C4" stop-opacity="0.9"/><stop offset="1" stop-color="#FFF1C4" stop-opacity="0"/></radialGradient>
<radialGradient id="g-moonglow"><stop offset="0" stop-color="#E8E4FF" stop-opacity="0.45"/><stop offset="1" stop-color="#E8E4FF" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow"><stop offset="0" stop-color="#FFC860" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC860" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow-m"><stop offset="0" stop-color="#9CFFF0" stop-opacity="0.55"/><stop offset="1" stop-color="#9CFFF0" stop-opacity="0"/></radialGradient>
<radialGradient id="g-glow-f"><stop offset="0" stop-color="#FF8A3C" stop-opacity="0.6"/><stop offset="1" stop-color="#FF8A3C" stop-opacity="0"/></radialGradient>
<linearGradient id="g-front" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#FFF" stop-opacity="0.1"/><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.14"/></linearGradient>
<linearGradient id="g-cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF" stop-opacity="0.18"/><stop offset="0.35" stop-color="#FFF" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></linearGradient>
<linearGradient id="g-night" gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="470"><stop offset="0" stop-color="#0A1030" stop-opacity="0"/><stop offset="1" stop-color="#0A1030" stop-opacity="0.5"/></linearGradient>
<linearGradient id="g-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2A1A10" stop-opacity="0.35"/></linearGradient>
<pattern id="tx-stone" width="22" height="12" patternUnits="userSpaceOnUse"><path d="M0 12H22M0 6H22M6 0V6M17 6V12" stroke="#5A4A38" stroke-opacity="0.28" stroke-width="1" fill="none"/></pattern>
<pattern id="tx-plank" width="8" height="40" patternUnits="userSpaceOnUse"><path d="M8 0V40" stroke="#3E2616" stroke-opacity="0.45" stroke-width="1"/></pattern>
<pattern id="tx-cobble" width="18" height="9" patternUnits="userSpaceOnUse"><path d="M1 4.5a4 3 0 0 1 8 0a4 3 0 0 1 -8 0M10 0a4 3 0 0 1 8 0M10 9a4 3 0 0 1 8 0" stroke="#6E6656" stroke-opacity="0.45" stroke-width="0.9" fill="none"/></pattern>
<pattern id="tx-grass" width="40" height="24" patternUnits="userSpaceOnUse"><path d="M4 18l2 -5l2 5M24 8l2 -4l2 4M32 22l1.5 -4l1.5 4" stroke="#2A3A1A" stroke-opacity="0.16" stroke-width="1.2" fill="none"/></pattern>
</defs>`;

/** The whole town. Places carry `data-place` for clicks; heroes carry `data-hero`. */
export function townSceneSvg(v: TownView): string {
  snow = v.season === 'winter';
  const stage = Math.max(1, Math.min(5, v.levels.townhall || 1));
  const items: Item[] = [];
  const labels: string[] = [];
  walls(stage, items);
  items.push(...square(stage));
  for (const [x, y, k] of OUTER_TREES) if (y >= 500) items.push({ y, s: tree(x, y, k, v.season, Math.round(x)) });
  for (const [x, y, k, until] of INNER_TREES) if (stage < until) items.push({ y, s: tree(x, y, k, v.season, Math.round(x + y)) });
  // Houses: a few in a hamlet, the whole town in a city.
  const total = Object.values(v.levels).reduce((n, l) => n + l, 0);
  const nHouses = Math.min(HOUSE_SLOTS.length, 3 + stage * 3 + Math.floor(total / 2));
  // (The Embassy, added later, stands where a few houses used to: they make way once its plot is out.)
  const emb = PLACES.embassy;
  const embassyUp = (v.levels.embassy ?? 0) > 0 || !!v.plots.embassy;
  for (let i = 0; i < nHouses; i++) {
    const [x, y, k] = HOUSE_SLOTS[i];
    if (embassyUp && Math.abs(x - emb.x) < 150 && Math.abs(y - emb.y) < 110) continue;
    const a = house(i * 13 + 5, Math.min(stage, i < 6 ? stage : Math.max(1, stage - 1)));
    const t = `translate(${x} ${y}) scale(${k})`;
    items.push({ y, s: `<g transform="${t}">${a.s}</g>`, l: `<g transform="${t}">${a.l}</g>` });
  }
  for (const [id, pl] of Object.entries(PLACES)) {
    if (id !== 'gate' && !v.plots[id]) continue;
    const lvl = id === 'gate' ? stage : v.levels[id] ?? 0;
    const a = new Art();
    bb = { x0: 0, x1: 0, y0: 0 };
    if (id === 'gate') gate(a, stage);
    else if (lvl > 0) BUILD[id](a, lvl);
    else if (v.construction === id) {
      // Going up: the foundations and a frame.
      a.s += box({ x: -pl.w / 2 + 20, w: pl.w - 100, d: 60, h: 10, rh: 0, ridge: 'x', wall: WALLS.stone });
      P(-pl.w / 2, 0, 90);
      P(pl.w / 2 - 40, 0, 0);
    } else plot(a, pl.w);
    if (v.construction === id) scaffold(a);
    const t = `translate(${pl.x} ${pl.y}) scale(${pl.s})`;
    const top = bb.y0;
    const hit = `<rect class="hit" x="${f(bb.x0 - 6)}" y="${f(top - 6)}" width="${f(bb.x1 - bb.x0 + 12)}" height="${f(-top + 20)}" fill="transparent"/>`;
    items.push({ y: pl.y, s: `<g class="place${lvl ? '' : ' empty'}${v.hint === id ? ' hinted' : ''}" data-place="${id}" transform="${t}"><g class="art">${a.s}</g>${hit}</g>`, l: `<g transform="${t}">${a.l}</g>` });
    // The sign over the building.
    const name = id === 'gate' ? 'Town Gate' : v.names[id];
    const ly = pl.y + top * pl.s - 16;
    const lx = pl.x + ((bb.x0 + bb.x1) / 2) * pl.s;
    labels.push(sign(id, name, lvl, id === 'gate' ? 0 : v.maxLevels[id], lx, Math.max(40, ly), v.badges[id], v.hint === id, v.construction === id));
  }
  // Empty groups between the rows of the town: the heroes walking about are moved into the one that
  // matches their depth (see townLife.ts), so they pass behind the Guild Hall and in front of the well.
  BANDS.forEach((b, k) => items.push({ y: b - 0.001, s: `<g class="hero-band" data-band="${k}"></g>` }));
  items.sort((p, q) => p.y - q.y);
  const body = items.map((it) => it.s).join('');
  const lights = v.night ? items.map((it) => it.l ?? '').join('') : '';
  let weather = '';
  if (v.season === 'winter') {
    for (let i = 0; i < 70; i++) weather += `<circle class="flake" cx="${f(-100 + hash(i * 7) * 1800)}" cy="${f(-60 - hash(i * 7 + 1) * 300)}" r="${f(1.2 + hash(i * 7 + 2) * 2.2)}" style="animation-duration:${f(9 + hash(i * 7 + 3) * 9)}s;animation-delay:${f(-hash(i * 7 + 4) * 18)}s"/>`;
  } else if (v.season === 'autumn') {
    for (let i = 0; i < 14; i++) weather += `<ellipse class="leaf" cx="${f(hash(i * 5) * 1600)}" cy="-40" rx="4" ry="2.2" fill="${['#C9772E', '#D9A23A', '#B8502A'][i % 3]}" style="animation-duration:${f(14 + hash(i * 5 + 1) * 10)}s;animation-delay:${f(-hash(i * 5 + 2) * 24)}s"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="town-svg${v.night ? ' night' : ''}" viewBox="0 0 ${SCENE_W} ${SCENE_H}" preserveAspectRatio="xMidYMid meet">${DEFS}`
    + backdrop(v, stage)
    + body
    + walkers(stage, v.night)
    + (v.night ? `<rect x="-1400" y="250" width="4400" height="1400" fill="url(#g-night)" pointer-events="none"/><g pointer-events="none">${lights}</g>` : '')
    + `<g pointer-events="none">${weather}</g>`
    + labels.join('')
    + '</svg>';
}

/** A hanging wooden sign with the building's name, level and any news. */
function sign(id: string, name: string, lvl: number, max: number, x: number, y: number, badge: string | undefined, hint: boolean, building: boolean): string {
  const text = lvl || id === 'gate' ? name : `${name} (build)`;
  const w = Math.round(text.length * 8.6 + (lvl ? 40 : 22));
  const x0 = -w / 2;
  let s = `<g class="sign${lvl || id === 'gate' ? '' : ' plot'}${hint ? ' hinted' : ''}" data-place="${id}" transform="translate(${f(x)} ${f(y)})">`;
  if (hint) s += `<g class="arrow"><path d="M0 -26l-10 -14h6v-14h8v14h6z" fill="#F1D27A" stroke="${OL}" stroke-width="1.6"/></g>`;
  s += `<rect x="${f(x0)}" y="-13" width="${w}" height="26" rx="5" fill="#2E2016" stroke="#C9A24A" stroke-width="1.6"/><rect x="${f(x0 + 3)}" y="-10" width="${w - 6}" height="20" rx="3" fill="none" stroke="#6E5434" stroke-width="1"/>`;
  if (lvl && id !== 'gate') {
    s += `<circle cx="${f(x0 + 14)}" cy="0" r="9" fill="#8E2B23" stroke="#C9A24A" stroke-width="1.4"/><text x="${f(x0 + 14)}" y="4" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="11" fill="#F6E9C9">${lvl}</text>`;
  }
  s += `<text x="${f(lvl && id !== 'gate' ? x0 + 28 : 0)}" y="5" text-anchor="${lvl && id !== 'gate' ? 'start' : 'middle'}" font-family="Cinzel, serif" font-weight="700" font-size="14" fill="${lvl || id === 'gate' ? '#F2E6CC' : '#CDBB97'}">${text}</text>`;
  if (building) s += `<g transform="translate(${f(-x0 + 2)} 0)"><circle r="10" fill="#4F7A3A" stroke="#C9A24A" stroke-width="1.4"/><g class="hammer-i"><path d="M-4 5l6 -6" stroke="#F2E6CC" stroke-width="2"/><rect x="0" y="-7" width="7" height="4" fill="#F2E6CC" transform="rotate(45 3 -5)"/></g></g>`;
  else if (badge) s += `<g transform="translate(${f(-x0 + 2)} -10)"><circle r="10" fill="#F1D27A" stroke="${OL}" stroke-width="1.4"/><text y="4" text-anchor="middle" font-family="Alegreya Sans, sans-serif" font-weight="700" font-size="12" fill="#2A1E14">${badge}</text></g>`;
  if (max && lvl >= max) s += `<path d="M${f(x0 + 4)} 13h${w - 8}" stroke="#F1D27A" stroke-width="1.6"/>`;
  return s + '</g>';
}
