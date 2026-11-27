// The world map's land, drawn as one continuous surface under the hex tiles, so lines match across hexes.
//
// - Borders: every hex edge between two explored areas is one wiggly line, worked out from the edge itself
//   (seeded by its two corners), so both neighbours draw exactly the same border.
// - Water: each hex corner is wet or dry, from the three hexes that share it (sea and reef count 2, coast
//   1; 3 or more is water). The shoreline crosses an edge at a point both hexes agree on, and leaves it at
//   a right angle on both sides, so a coastline runs on smoothly from hex to hex (marching squares, on hexes).
// - Roads: one network from Greyford out through the explored land, each road crossing a hex edge at its
//   middle, so roads join up.
// The painted tile art goes on top as scenery only: its own background, edge-to-edge roads and shorelines
// are stripped (see DECOR_DEFS), and it fades out towards the hex's edge.

import { REGIONS } from '../core/data/world';
import { WORLD_DEFS } from './worldTiles';

export interface TerrainHex { id: string; q: number; r: number; art: string }

type V = { x: number; y: number };

/** Flat ground colours by tile art, from each tile's own background gradient (averaged). */
const GROUND: Record<string, string> = (() => {
  const grads = new Map<string, string[]>();
  for (const m of WORLD_DEFS.matchAll(/<(?:linear|radial)Gradient id="(\w+)"[^>]*>(.*?)<\/(?:linear|radial)Gradient>/g)) {
    grads.set(m[1], [...m[2].matchAll(/stop-color="(#[0-9A-Fa-f]{6})"/g)].map((x) => x[1]));
  }
  const avg = (cs: string[]) => {
    const n = cs.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
    const m = [0, 1, 2].map((k) => Math.round(n.reduce((a, b) => a + b[k], 0) / n.length));
    return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };
  const out: Record<string, string> = {};
  for (const m of WORLD_DEFS.matchAll(/<g id="t-(\w+)"><g clip-path="url\(#hc\)">\s*<rect x="-70" y="-70" width="140" height="140" fill="([^"]+)"/g)) {
    const fill = m[2];
    const g = fill.match(/url\(#(\w+)\)/);
    out[m[1]] = g ? avg(grads.get(g[1]) ?? ['#9DB565']) : fill;
  }
  return out;
})();
export const WATER = '#4F82A0';
const WATER_DEEP = '#2E5674';
const WET: Record<string, number> = { sea: 2, reef: 2, coast: 1 };
/** A corner is water at this much wetness. */
const WET_AT = 3;

// ---- Rivers ----
// One network for the whole world (so it doesn't change as land is explored). Every hex knows how many steps
// it is from the sea; springs rise in some of the high country, and each river steps towards the sea one
// hex at a time (lower ground first), so every river ends in the sea. Rivers that meet merge and run on
// wider. The sky isles have none.

/** The six neighbours, in the order of the hex's edges (edge i runs from corner i to corner i+1). */
const EDGE_DIR: [number, number][] = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
const HIGH = new Set(['mtn', 'mine', 'glacier', 'hills', 'snowforest']);
const LOW: Record<string, number> = { sea: 0, reef: 0, coast: 1, marsh: 1, plains: 2, farm: 2, tower: 2, abbey: 2, barrow: 2, haunt: 2, town: 2, forest: 3, warrens: 3, bad: 4, dragon: 4, fort: 3, hills: 4, snowforest: 4, mine: 5, mtn: 5, glacier: 5 };

export interface RiverHex {
  /** Edges where rivers come in (with the flow each carries), and the edge it leaves by (-1 at a spring with no way on). */
  ins: { edge: number; flow: number }[];
  out: number;
  flow: number;
  spring: boolean;
}

let RIVERS: Map<string, RiverHex> | null = null;
export function riverNetwork(): Map<string, RiverHex> {
  if (RIVERS) return RIVERS;
  const all = [...REGIONS.map((r) => ({ id: r.id, q: r.q, r: r.r, art: r.art })), { id: 'greyford', q: 0, r: 0, art: 'town' }];
  const at = new Map(all.map((h) => [`${h.q},${h.r}`, h]));
  // Steps to the sea (breadth first from every sea and reef hex; the sky is no way through).
  const dist = new Map<string, number>();
  let frontier = all.filter((h) => h.art === 'sea' || h.art === 'reef');
  for (const h of frontier) dist.set(`${h.q},${h.r}`, 0);
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const h of frontier) {
      for (const [dq, dr] of EDGE_DIR) {
        const k = `${h.q + dq},${h.r + dr}`;
        const n = at.get(k);
        if (!n || dist.has(k) || n.art === 'sky') continue;
        dist.set(k, dist.get(`${h.q},${h.r}`)! + 1);
        next.push(n);
      }
    }
    frontier = next;
  }
  const net = new Map<string, RiverHex>();
  const get = (k: string) => {
    let x = net.get(k);
    if (!x) { x = { ins: [], out: -1, flow: 0, spring: false }; net.set(k, x); }
    return x;
  };
  const springs = all.filter((h) => HIGH.has(h.art) && (dist.get(`${h.q},${h.r}`) ?? 0) >= 3 && hash(`${h.id}:spring`) < 0.3);
  for (const s of springs) {
    let h = s;
    get(`${h.q},${h.r}`).spring = true;
    for (let guard = 0; guard < 40; guard++) {
      const k = `${h.q},${h.r}`;
      const d = dist.get(k) ?? 0;
      const cur = get(k);
      cur.flow += 1;
      if (d === 0) break; // the sea
      // Downstream: a neighbour a step nearer the sea, lower ground first.
      const options = EDGE_DIR.map(([dq, dr], e) => ({ e, n: at.get(`${h.q + dq},${h.r + dr}`) }))
        .filter((o) => o.n && dist.get(`${o.n.q},${o.n.r}`) === d - 1)
        .sort((a, b) => (LOW[a.n!.art] ?? 3) - (LOW[b.n!.art] ?? 3) || hash(`${k}>${a.e}`) - hash(`${k}>${b.e}`));
      const pick = cur.out >= 0 ? options.find((o) => o.e === cur.out) ?? options[0] : options[0];
      if (!pick) break;
      cur.out = pick.e;
      const nk = `${pick.n!.q},${pick.n!.r}`;
      const back = (pick.e + 3) % 6;
      const nxt = get(nk);
      const inn = nxt.ins.find((x) => x.edge === back);
      if (inn) inn.flow += 1;
      else nxt.ins.push({ edge: back, flow: 1 });
      h = pick.n!;
    }
  }
  RIVERS = net;
  return net;
}

const RADIUS = 70;
const CORNERS: V[] = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return { x: Math.cos(a) * RADIUS, y: Math.sin(a) * RADIUS };
});

const f1 = (n: number) => Math.round(n * 10) / 10;
const key = (p: V) => `${f1(p.x)},${f1(p.y)}`;
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
};

/**
 * The terrain under every hex in `land` (explored areas and Greyford): ground, water and shoreline, roads.
 * `hx`/`hy` are the map's hex spacing. Returns SVG to draw before the tiles.
 */
export function terrainSvg(land: TerrainHex[], hx: number, hy: number): string {
  const centre = (h: { q: number; r: number }): V => ({ x: hx * (h.q + h.r / 2), y: hy * h.r });
  const inLand = new Set(land.map((h) => `${h.q},${h.r}`));
  // Wetness of each corner, from every area in the world (so shorelines don't move as land is explored).
  const all = [...REGIONS.map((r) => ({ q: r.q, r: r.r, art: r.art })), { q: 0, r: 0, art: 'town' }];
  const wet = new Map<string, number>();
  const cornersOf = (h: { q: number; r: number }) => {
    const c = centre(h);
    return CORNERS.map((p) => ({ x: c.x + p.x, y: c.y + p.y }));
  };
  for (const h of all) for (const p of cornersOf(h)) wet.set(key(p), (wet.get(key(p)) ?? 0) + (WET[h.art] ?? 0));
  // Water where the sea clearly reaches: sea plus coast, or two seas (one sea hex alone doesn't drown land).
  const isWet = (p: V) => (wet.get(key(p)) ?? 0) >= WET_AT;

  // An edge's line, from corner a to corner b: wiggly between two explored hexes, straight otherwise.
  const edgeLine = (a: V, b: V, wiggle: boolean): V[] => {
    const [p, q, flip] = key(a) < key(b) ? [a, b, false] : [b, a, true];
    const pts: V[] = [p];
    const nx = -(q.y - p.y);
    const ny = q.x - p.x;
    const len = Math.hypot(nx, ny) || 1;
    const seed = `${key(p)}|${key(q)}`;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const o = wiggle ? (hash(`${seed}:${i}`) - 0.5) * 12 * Math.sin(Math.PI * t) : 0;
      pts.push({ x: p.x + (q.x - p.x) * t + (nx / len) * o, y: p.y + (q.y - p.y) * t + (ny / len) * o });
    }
    pts.push(q);
    return flip ? pts.reverse() : pts;
  };
  // A point a fraction of the way along a polyline.
  const along = (pts: V[], t: number): { p: V; i: number } => {
    const n = pts.length - 1;
    const s = Math.max(0, Math.min(n - 1e-6, t * n));
    const i = Math.floor(s);
    const u = s - i;
    return { p: { x: pts[i].x + (pts[i + 1].x - pts[i].x) * u, y: pts[i].y + (pts[i + 1].y - pts[i].y) * u }, i };
  };
  // Where the shoreline crosses the edge from a (wet) to b (dry): the same point from either side.
  const crossT = (a: V, b: V) => {
    const wa = wet.get(key(a)) ?? 0;
    const wb = wet.get(key(b)) ?? 0;
    const t = wa === wb ? 0.5 : (wa - (WET_AT - 0.5)) / (wa - wb);
    return Math.max(0.3, Math.min(0.7, t));
  };
  const P = (p: V) => `${f1(p.x)} ${f1(p.y)}`;

  let ground = '';
  let water = '';
  let shore = '';
  let roads = '';
  let rivers = '';
  let riverLines = '';
  const net = riverNetwork();
  const riverWidth = (f: number) => Math.min(8, 2.6 + 1.5 * Math.sqrt(f));
  for (const h of land) {
    const c = centre(h);
    const cs = cornersOf(h);
    const wig = (i: number) => {
      // The neighbour across edge i (corners i, i+1) is explored too?
      const mid = { x: (cs[i].x + cs[(i + 1) % 6].x) / 2, y: (cs[i].y + cs[(i + 1) % 6].y) / 2 };
      const nb = { x: 2 * mid.x - c.x, y: 2 * mid.y - c.y };
      const r = Math.round(nb.y / hy);
      const q = Math.round(nb.x / hx - r / 2);
      return inLand.has(`${q},${r}`);
    };
    const edges = [0, 1, 2, 3, 4, 5].map((i) => edgeLine(cs[i], cs[(i + 1) % 6], wig(i)));
    const outline = edges.map((e) => e.slice(0, -1).map(P).join(' L')).join(' L');
    const fill = GROUND[h.art] ?? GROUND.plains ?? '#9DB565';
    ground += `<path d="M${outline}Z" fill="${fill}" stroke="${fill}" stroke-width="1.2"/>`;

    // Water: runs of wet corners.
    const w = cs.map(isWet);
    const sea = h.art === 'reef' ? WATER_DEEP : WATER;
    if (w.every(Boolean)) {
      water += `<path d="M${outline}Z" fill="${sea}" stroke="${sea}" stroke-width="1.2"/>`;
    } else if (w.some(Boolean)) {
      for (let s = 0; s < 6; s++) {
        if (!w[s] || w[(s + 5) % 6]) continue; // a run starts at corner s
        let e = s;
        while (w[(e + 1) % 6]) e = (e + 1) % 6;
        // From the crossing on the edge into the run (corner s-1 dry -> s wet), round the wet corners, out
        // across the edge after it, then the shoreline back through the hex.
        const ein = (s + 5) % 6;
        const tin = 1 - crossT(cs[s], cs[ein]);
        const a = along(edges[ein], tin);
        let d = `M${P(a.p)}`;
        for (let k = a.i + 1; k < edges[ein].length; k++) d += ` L${P(edges[ein][k])}`;
        for (let k = s; k !== e; k = (k + 1) % 6) for (let m = 1; m < edges[k].length; m++) d += ` L${P(edges[k][m])}`;
        const tout = crossT(cs[e], cs[(e + 1) % 6]);
        const b = along(edges[e], tout);
        for (let k = 1; k <= b.i; k++) d += ` L${P(edges[e][k])}`;
        d += ` L${P(b.p)}`;
        // The shoreline: leaves each crossing at a right angle to its edge, into the hex.
        const inward = (edge: V[], at: V) => {
          const mx = (edge[0].x + edge[edge.length - 1].x) / 2 - c.x;
          const my = (edge[0].y + edge[edge.length - 1].y) / 2 - c.y;
          const l = Math.hypot(mx, my) || 1;
          return { x: at.x - (mx / l) * 26, y: at.y - (my / l) * 26 };
        };
        const c1 = inward(edges[e], b.p);
        const c2 = inward(edges[ein], a.p);
        const curve = ` C${P(c1)} ${P(c2)} ${P(a.p)}`;
        water += `<path d="${d}${curve}Z" fill="${sea}"/>`;
        shore += `<path d="M${P(b.p)}${curve}"/>`;
      }
    }

    // Rivers: in through their edges, together at a junction, out through the edge towards the sea. Each
    // crossing is the same point from both sides and the river leaves it square to the edge.
    const rv = net.get(`${h.q},${h.r}`);
    if (rv && !(h.art === 'sea' || h.art === 'reef')) {
      const cross = (e: number) => {
        const pts = edges[e];
        const ka = key(pts[0]);
        const kb = key(pts[pts.length - 1]);
        const t = 0.4 + 0.2 * hash(ka < kb ? `${ka}|${kb}:river` : `${kb}|${ka}:river`);
        const tt = ka < kb ? t : 1 - t;
        const p = along(pts, tt).p;
        const mx = (pts[0].x + pts[pts.length - 1].x) / 2 - c.x;
        const my = (pts[0].y + pts[pts.length - 1].y) / 2 - c.y;
        const l = Math.hypot(mx, my) || 1;
        return { p, n: { x: -mx / l, y: -my / l } };
      };
      const J = { x: c.x + (hash(`${h.id}:jx`) - 0.5) * 24, y: c.y + (hash(`${h.id}:jy`) - 0.5) * 24 };
      let dir = { x: 0, y: 1 };
      if (rv.out >= 0) {
        const o = cross(rv.out);
        const dx = o.p.x - J.x;
        const dy = o.p.y - J.y;
        const l = Math.hypot(dx, dy) || 1;
        dir = { x: dx / l, y: dy / l };
        const w = riverWidth(rv.flow);
        const d = `M${P(J)} C${P({ x: J.x + dir.x * 22, y: J.y + dir.y * 22 })} ${P({ x: o.p.x + o.n.x * 24, y: o.p.y + o.n.y * 24 })} ${P(o.p)}`;
        rivers += `<path d="${d}" stroke-width="${w.toFixed(1)}"/>`;
        riverLines += `<path d="${d}" stroke-width="${(w * 0.3).toFixed(1)}"/>`;
      }
      for (const inn of rv.ins) {
        const i = cross(inn.edge);
        const w = riverWidth(inn.flow);
        const d = `M${P(i.p)} C${P({ x: i.p.x + i.n.x * 24, y: i.p.y + i.n.y * 24 })} ${P({ x: J.x - dir.x * 22, y: J.y - dir.y * 22 })} ${P(J)}`;
        rivers += `<path d="${d}" stroke-width="${w.toFixed(1)}"/>`;
        riverLines += `<path d="${d}" stroke-width="${(w * 0.3).toFixed(1)}"/>`;
      }
      if (rv.spring) rivers += `<ellipse cx="${f1(J.x)}" cy="${f1(J.y)}" rx="7" ry="4.5" fill="#6E9EB0" stroke="none"/>`;
    }

    // Roads: each explored land area to its neighbour nearer Greyford, through the middle of their shared edge.
    if (!WET[h.art] || h.art === 'coast') {
      if (h.art === 'sky' || w.filter(Boolean).length >= 4) continue;
      const ring = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
      const mine = ring(h.q, h.r);
      if (mine === 0) continue;
      const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      const toward = DIRS.map(([dq, dr]) => ({ q: h.q + dq, r: h.r + dr }))
        .filter((n) => inLand.has(`${n.q},${n.r}`) && ring(n.q, n.r) < mine)
        .filter((n) => { const nb = land.find((x) => x.q === n.q && x.r === n.r); return !!nb && (nb.art === 'town' || !WET[nb.art] || nb.art === 'coast') && nb.art !== 'sky'; })
        .sort((a, b) => hash(`${h.id}>${a.q},${a.r}`) - hash(`${h.id}>${b.q},${b.r}`))[0];
      if (!toward) continue;
      const nc = centre(toward);
      const mid = { x: (c.x + nc.x) / 2, y: (c.y + nc.y) / 2 };
      // A gentle bend in each half, straight through the shared edge's middle so the halves join smoothly.
      const bend = (from: V, to: V, seed: string) => {
        const nx = -(to.y - from.y);
        const ny = to.x - from.x;
        const l = Math.hypot(nx, ny) || 1;
        const o = (hash(seed) - 0.5) * 22;
        const k = { x: from.x + (to.x - from.x) * 0.45 + (nx / l) * o, y: from.y + (to.y - from.y) * 0.45 + (ny / l) * o };
        const k2 = { x: from.x + (to.x - from.x) * 0.8, y: from.y + (to.y - from.y) * 0.8 };
        return `M${P(from)} C${P(k)} ${P(k2)} ${P(to)}`;
      };
      roads += bend(c, mid, `${h.id}:road`) + ' ' + bend(nc, mid, `${toward.q},${toward.r}>${h.id}:road`) + ' ';
    }
  }
  return `<g class="terrain">
    <g>${ground}</g>
    <g fill="none" stroke="#5E90A8" stroke-linecap="round">${rivers}</g>
    <g fill="none" stroke="#B9DCE6" stroke-linecap="round" opacity="0.6">${riverLines}</g>
    <g fill="none" stroke="#E8D7A8" stroke-width="11" stroke-linecap="round">${shore}</g>
    <g>${water}</g>
    <g fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.7" transform="translate(-3 0)">${shore}</g>
    <g fill="none" stroke-linecap="round"><path d="${roads}" stroke="#DCC690" stroke-width="6"/><path d="${roads}" stroke="#B89F68" stroke-width="1.2" stroke-dasharray="3 6"/></g>
  </g>`;
}

/**
 * Scenery versions of the tiles (<g id="d-<art>">): the painted art without its own background, without
 * anything drawn from edge to edge (roads, streams, shorelines, bands of ground), fading out towards the
 * hex's edge so nothing ends in a hard line.
 */
export const DECOR_DEFS: string = (() => {
  let out = '<mask id="decor-fade" maskContentUnits="userSpaceOnUse"><path d="M0 -60L52 -30V30L0 60L-52 30V-30Z" fill="#fff" filter="url(#blur8)"/></mask>';
  for (const m of WORLD_DEFS.matchAll(/<g id="t-(\w+)"><g clip-path="url\(#hc\)">([\s\S]*?)<\/g><\/g>(?:\n|$)/g)) {
    if (m[1] === 'fog') continue;
    let body = m[2];
    body = body.replace(/<rect x="-70"[^>]*\/>/g, '');
    body = body.replace(/<path d="M-?(6\d|7\d)[ ,.-][^>]*\/>/g, '');
    body = body.replace(/<path d="M-?\d+ -70[^>]*\/>/g, '');
    out += `<g id="d-${m[1]}"><g mask="url(#decor-fade)">${body}</g></g>`;
  }
  return out;
})();
