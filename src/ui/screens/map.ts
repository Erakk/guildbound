import { WORLD_DEFS } from '../../art/worldTiles';
import { HERO_BY_ID, TRIBE_NAMES } from '../../core/data/heroes';
import { AREA_TEXT, areaState, SPREAD_MS } from '../../core/areas';
import { season, SEASON_TEXT, TIME_TEXT, timeOfDay, untilChange } from '../../core/time';
import { SECRET_PATHS } from '../../core/data/secrets';
import { ABILITY_BADGE, ABILITY_TRIBE, ENEMY_BY_ID, recommendedPower, REGION_BY_ID, REGIONS } from '../../core/data/world';
import type { GameState } from '../../core/types';

import { outingBlock, PARTY_NAMES, partyHeroes } from '../../core/state';
import { level as buildingLevel, heroStrength, STABLES_CUT, travelSec } from '../../core/town';
import { DEEP_RING } from '../../core/data/frontier';
import { isScout, scoutBlock, scoutChance, scoutSeconds } from '../../core/scouting';
import { canReach, holdNeed, holdOf, reachBlock, secured } from '../../core/hold';
import { areaStory, storyChapter } from '../../core/storyline';
import { LIFE_NAME, LIFE_PERK, lifeBase, lifeLevel, tripsHome } from '../../core/life';
import { cardById, DECK_PER_HOLD, DECK_START, fullDeck, openDeck, seenCards } from '../../core/deck';
import { PLAIN_AREAS } from '../../core/sim/expedition';
import { GOAL_INFO } from '../../core/sim/encounters';
import { nextOrderUnlock, unlocked as isOpen } from '../../core/unlocks';
import { CLASS_NAMES } from '../../core/data/heroes';
import { def } from '../../core/heroes';
import { captainText } from '../../core/data/captains';
import type { Site, SiteKind } from '../../core/types';
import type { Focus, GoalKind, Orders, RegionDef, Stance } from '../../core/types';
import type { SiegeKind } from '../../core/types';
import type { App, Screen } from '../app';
import { modal } from '../app';
import { fmtTime, h, setChildren } from '../dom';
import { DECOR_DEFS, terrainSvg, type TerrainHex } from '../../art/worldTerrain';

const HX = 121.24;
const HY = 105;
const RING_COLOR = ['#F6E9C9', '#E2B84A', '#D49A3E', '#B87A45', '#A0663E', '#8E5A9E', '#6E4AA8', '#4A3A9E', '#9A3A3A', '#7A2630', '#5A1620'];
const NEIGHBOURS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/** Explored regions plus everything next to them (and next to town). */
/** Can the guild see Veiled areas? Only with 3 or more Moonveil in one party. */
export function seesVeil(s: GameState): boolean {
  return s.parties.some((p) => p.slots.filter((u) => u && HERO_BY_ID[s.roster.find((h) => h.uid === u)?.defId ?? '']?.tribe === 'moonveil').length >= 3);
}

export function visibleRegions(explored: string[], veil = false): Set<string> {
  const known = new Set(['0,0', ...explored.map((id) => `${REGION_BY_ID[id]?.q},${REGION_BY_ID[id]?.r}`)]);
  const vis = new Set<string>();
  for (const r of REGIONS) {
    // Veiled areas stay hidden from anyone who can't see through the Veil.
    if (r.requires === 'veil' && !veil && !explored.includes(r.id)) continue;
    if (known.has(`${r.q},${r.r}`)) { vis.add(r.id); continue; }
    if (NEIGHBOURS.some(([dq, dr]) => known.has(`${r.q + dq},${r.r + dr}`))) vis.add(r.id);
  }
  return vis;
}

/** Map animations in flight (fog burning, badges stamping): when each started, so redraws pick them up. */
const PLAYING = new Map<string, number>();
const ANIM_MS = 2600;

export function mapScreen(app: App): Screen {
  const el = h('div.row.wrap', { style: { gap: '18px', alignItems: 'flex-start' } });
  const s0 = app.game.state;
  let selected: RegionDef = REGION_BY_ID[app.focusRegion ?? s0.expeditions[0]?.regionId ?? s0.reports[0]?.regionId ?? 'greenhollow'];
  app.focusRegion = null;
  const orders: Orders = { focus: 'explore', stance: 'balanced', retreatAtPct: 30 };
  // Who goes: one party, or two together (sieges). Starts on the first party free to leave.
  const freeParty = () => Array.from({ length: app.game.partiesUnlocked() }, (_, p) => p).find((p) => !app.game.dispatchBlock(undefined, [p])) ?? 0;
  let who: number[] = [freeParty()];
  // Map zoom and the point at its centre (map units). Starts centred on the selected area.
  const ZOOMS = [0.3, 0.45, 0.6, 0.8, 1];
  let zoomAt = 3;
  let view: { x: number; y: number } | null = null;

  const seg = <T extends string>(options: [T, string][], value: T, set: (v: T) => void) =>
    h('div.seg', options.map(([v, label]) => h(`button${v === value ? '.on' : ''}`, { onclick: () => { set(v); render(); } }, label)));

  /** Where a road from Greyford to an area bends, and a point along it (t from 0 at town to 1 at the area). */
  const roadPoint = (x: number, y: number, t: number) => {
    const cx = x / 2 + y * 0.18;
    const cy = y / 2 - x * 0.18;
    const u = 1 - t;
    return { x: 2 * u * t * cx + t * t * x, y: 2 * u * t * cy + t * t * y, cx, cy };
  };
  /** Each party out: a dashed road to its area and a banner moving along it; scouts get a small pennant. */
  const roadsAndBanners = (): string => {
    const s = app.game.state;
    let out = '';
    s.expeditions.forEach((ex, i) => {
      const r = REGION_BY_ID[ex.regionId];
      if (!r) return;
      const x = HX * (r.q + r.r / 2);
      const y = HY * r.r;
      const { cx, cy } = roadPoint(x, y, 0);
      const p = roadPoint(x, y, app.game.mapProgress(ex.id));
      const colour = ex.parties[0] === 1 ? '#3D6178' : '#8E2B23';
      out += `<path class="maproad" d="M0 0 Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x} ${y}"/>`;
      out += `<g class="mapbanner" data-exp="${ex.id}" data-x="${x}" data-y="${y}" style="transform: translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)">
        <ellipse cx="0" cy="2" rx="9" ry="3" fill="#2A1E14" opacity="0.35"/>
        <path d="M0 2V-40" stroke="#2A1E14" stroke-width="3"/>
        <g class="flag"><path d="M1 -40H30L23 -32L30 -24H1Z" fill="${colour}" stroke="#C9A24A" stroke-width="1.6"/><text x="12" y="-28" class="tier" style="font-size:9px">${ex.parties.map((q) => ['I', 'II', 'III'][q]).join('+')}</text></g>
      </g>`;
      void i;
    });
    for (const m of s.scouting) {
      const r = REGION_BY_ID[m.regionId];
      if (!r) continue;
      const x = HX * (r.q + r.r / 2);
      const y = HY * r.r;
      const p = roadPoint(x, y, scoutProgress(m, app.game.now()));
      out += `<g class="mapbanner scout" data-scout="${m.id}" data-x="${x}" data-y="${y}" style="transform: translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)">
        <path d="M0 2V-26" stroke="#2A1E14" stroke-width="2.2"/>
        <g class="flag"><path d="M1 -26H18L1 -16Z" fill="#9EC3F0" stroke="#2A1E14" stroke-width="1.2"/></g>
      </g>`;
    }
    return out;
  };

  const mapSvg = (): HTMLElement => {
    const s = app.game.state;
    const explored = new Set(s.explored);
    const vis = visibleRegions(s.explored, seesVeil(s));
    const shown = REGIONS.filter((r) => vis.has(r.id));
    const xs = [0, ...shown.map((r) => HX * (r.q + r.r / 2))];
    const ys = [0, ...shown.map((r) => HY * r.r)];
    const minX = Math.min(...xs) - 80, maxX = Math.max(...xs) + 80, minY = Math.min(...ys) - 90, maxY = Math.max(...ys) + 90;
    const scoutAt = new Set(s.scouting.map((m) => m.regionId));
    const sitesAt = new Map<string, number>();
    for (const x of s.sites) sitesAt.set(x.regionId, (sitesAt.get(x.regionId) ?? 0) + 1);
    // Animations play once: fog burning off newly explored land, and badges stamped on. (A save that
    // predates them starts with everything already seen.)
    const firstLook = !s.mapSeen;
    const seenFog = new Set(s.mapSeen ?? s.explored);
    const seenStamp = new Set(s.mapStamps ?? []);
    const newFog: string[] = [];
    const newStamps: string[] = [];
    // The map is redrawn often (every change in the game): an animation that has started keeps being
    // drawn, picked up where it is, until it has played out.
    const now = performance.now();
    const running = (key: string, fresh: boolean): number | null => {
      if (fresh) PLAYING.set(key, now);
      const t0 = PLAYING.get(key);
      if (t0 === undefined) return null;
      if (now - t0 > ANIM_MS) {
        PLAYING.delete(key);
        return null;
      }
      return (now - t0) / 1000;
    };
    const stamp = (key: string, svg: string) => {
      if (!svg) return '';
      const fresh = !firstLook && !seenStamp.has(key);
      if (fresh || firstLook) newStamps.push(key);
      const t = running(`stamp:${key}`, fresh);
      return t === null ? svg : `<g class="stamp" style="--t:${-t}s"><circle class="stamp-dust" r="16"/>${svg}</g>`;
    };
    const tiles = shown.map((r) => {
      const x = HX * (r.q + r.r / 2);
      const y = HY * r.r;
      const known = explored.has(r.id);
      const sel = r.id === selected.id;
      const ring = RING_COLOR[r.ring] ?? '#8e969d';
      const freshFog = known && !seenFog.has(r.id);
      if (freshFog) newFog.push(r.id);
      const burnT = known ? running(`fog:${r.id}`, freshFog) : null;
      const burning = burnT !== null;
      const state = areaState(s, r.id);
      return `<g class="hex${sel ? ' sel' : ''}" data-id="${r.id}" transform="translate(${x} ${y})" style="cursor:pointer">
        <use href="#${known ? 'd' : 't'}-${known ? r.art : 'fog'}"/>
        ${known && areaState(s, r.id) === 'corrupted' ? '<use href="#hx" fill="#5E3A8C" fill-opacity="0.28"/>' : ''}
        <use href="#hx" fill="none" stroke="${sel ? '#fff3c4' : known && state !== 'calm' ? STATE_BADGE[state][0] : known ? ring : '#a89878'}" stroke-width="${sel ? 6 : known && state !== 'calm' ? 4 : known ? 1.4 : 3}" stroke-opacity="${sel || (known && state !== 'calm') || !known ? 1 : 0.45}"/>
        ${known && state !== 'calm' ? stamp(`trouble:${r.id}:${state}`, `<g transform="translate(-38 8)"><circle r="11" fill="${STATE_BADGE[state][0]}" stroke="#F6E9C9" stroke-width="1.5"/><text y="4" class="tier">${STATE_BADGE[state][1]}</text></g>`) : ''}
        ${known
          ? `<rect x="-46" y="30" width="92" height="17" rx="8.5" fill="#2a1e14" opacity="0.9"/><text y="42.5" class="nm">${escape(r.name)}</text>
             <circle cy="-48" r="10" fill="#3b2a1c" stroke="${ring}" stroke-width="1.5"/><text y="-44" class="tier">${r.tier}</text>`
          : canReach(s, r)
            ? `<rect x="-40" y="30" width="80" height="17" rx="8.5" fill="#2a1e14" opacity="0.75"/><text y="42.5" class="nm">Unscouted</text>`
            : `<use href="#hx" fill="#1B140E" fill-opacity="0.35"/><rect x="-44" y="30" width="88" height="17" rx="8.5" fill="#2a1e14" opacity="0.6"/><text y="42.5" class="nm" style="opacity:0.75">Beyond reach</text>`}
        ${known && !r.siege ? (secured(s, r.id) ? stamp(`secured:${r.id}:${lifeLevel(s, r.id)}`, holdBadge(s, r)) : holdBadge(s, r)) : ''}
        ${r.skull ? `<g transform="translate(-34 -40)"><circle r="11" fill="#1B140E" stroke="#E8E0D0" stroke-width="1.5"/><text y="4" class="tier">☠</text></g>` : ''}
        ${r.siege ? `<g transform="translate(-34 -40)"><circle r="11" fill="#8E2B23" stroke="#F6E9C9" stroke-width="1.5"/><path d="M-5 -5L5 5M5 -5L-5 5" stroke="#F6E9C9" stroke-width="2.2" stroke-linecap="round"/></g>` : ''}
        ${r.requires ? `<g transform="translate(34 -40)"><circle r="11" fill="${ABILITY_BADGE[r.requires][0]}" stroke="#F6E9C9" stroke-width="1.5"/><text y="4" class="tier">${ABILITY_BADGE[r.requires][1]}</text></g>` : ''}
        ${known && sitesAt.get(r.id) ? stamp(`sites:${r.id}:${sitesAt.get(r.id)}`, `<g transform="translate(36 8)"><circle r="10" fill="#E2B84A" stroke="#2A1E14" stroke-width="1.5"/><text y="4" class="tier" style="fill:#2A1E14">${sitesAt.get(r.id)}</text></g>`) : ''}
        ${scoutAt.has(r.id) ? '<g transform="translate(26 -14)"><circle r="11" fill="#2A1E14" stroke="#9ec3f0" stroke-width="1.5"/><path d="M-7 0C-3 -5 3 -5 7 0C3 5 -3 5 -7 0Z" fill="none" stroke="#9ec3f0" stroke-width="1.5"/><circle r="2" fill="#9ec3f0"/></g>' : ''}
        ${burning ? `<g class="burn" style="--t:${-(burnT ?? 0)}s"><use href="#t-fog" class="burn-fog"/><use href="#hx" class="burn-ring" fill="none" stroke="#FF9A3C" stroke-width="7"/>${[[-30, 10], [18, -24], [34, 18], [-8, 30], [6, -4]].map(([ex, ey], i) => `<circle class="burn-ember" cx="${ex}" cy="${ey}" r="3.2" style="animation-delay:calc(var(--t) + ${0.25 + i * 0.18}s)"/>`).join('')}</g>` : ''}
      </g>`;
    }).join('');
    // The land itself, continuous under the explored areas and Greyford (see art/worldTerrain).
    const land: TerrainHex[] = [{ id: 'greyford', q: 0, r: 0, art: 'town' }, ...shown.filter((r) => explored.has(r.id)).map((r) => ({ id: r.id, q: r.q, r: r.r, art: r.art }))];
    const terrain = terrainSvg(land, HX, HY);
    const town = `<g transform="translate(0 0)"><use href="#d-town"/><use href="#hx" fill="none" stroke="#F6E9C9" stroke-width="2.5" stroke-opacity="0.8"/>
      <rect x="-48" y="34" width="96" height="20" rx="10" fill="#8E2B23" stroke="#C9A24A" stroke-width="1.5"/><text y="48" class="nm" style="font-family:Cinzel,serif">GREYFORD</text></g>`;
    const zoom = ZOOMS[zoomAt];
    const wrap = h('div.worldmap');
    wrap.innerHTML = `<svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${Math.round((maxX - minX) * zoom)}" height="${Math.round((maxY - minY) * zoom)}" role="img" aria-label="World map of the explored Frontier Marches">
      <defs>${WORLD_DEFS}${DECOR_DEFS}</defs>
      <style>.nm{font-family:'Alegreya Sans',sans-serif;font-weight:700;font-size:11px;fill:#F6E9C9;text-anchor:middle}.tier{font-family:'Alegreya Sans',sans-serif;font-weight:700;font-size:11px;fill:#F6E9C9;text-anchor:middle}.hex{filter:drop-shadow(0 4px 3px rgba(50,30,12,.45))}.hex:hover use:first-child{filter:brightness(1.08)}</style>
      <rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="#E6D7B4"/>
      ${terrain}${town}${tiles}${roadsAndBanners()}
    </svg>`;
    // Remember what was shown, without redrawing (the animations are playing).
    if (newFog.length || newStamps.length || firstLook) {
      s.mapSeen = [...new Set([...(s.mapSeen ?? s.explored), ...newFog])];
      s.mapStamps = [...new Set([...(s.mapStamps ?? []), ...newStamps])];
      app.game.persist();
    }
    // Keep the same spot in the middle across redraws and zooms; drag to pan.
    const centre = () => {
      const v = view ?? { x: HX * (selected.q + selected.r / 2), y: HY * selected.r };
      wrap.scrollLeft = (v.x - minX) * zoom - wrap.clientWidth / 2;
      wrap.scrollTop = (v.y - minY) * zoom - wrap.clientHeight / 2;
    };
    requestAnimationFrame(centre);
    wrap.addEventListener('scroll', () => {
      view = { x: minX + (wrap.scrollLeft + wrap.clientWidth / 2) / zoom, y: minY + (wrap.scrollTop + wrap.clientHeight / 2) / zoom };
    });
    let drag: { x: number; y: number; left: number; top: number; moved: boolean } | null = null;
    let dragged = false;
    wrap.addEventListener('pointerdown', (ev) => { const e = ev as PointerEvent; drag = { x: e.clientX, y: e.clientY, left: wrap.scrollLeft, top: wrap.scrollTop, moved: false }; dragged = false; });
    wrap.addEventListener('pointermove', (ev) => {
      const e = ev as PointerEvent;
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      wrap.scrollLeft = drag.left - dx;
      wrap.scrollTop = drag.top - dy;
    });
    const endDrag = () => { if (drag?.moved) dragged = true; drag = null; };
    wrap.addEventListener('pointerup', endDrag);
    wrap.addEventListener('pointerleave', endDrag);
    wrap.addEventListener('click', (e) => {
      if (dragged) { dragged = false; return; }
      const g = (e.target as Element).closest('.hex') as SVGGElement | null;
      const id = g?.dataset.id;
      if (id && REGION_BY_ID[id]) {
        selected = REGION_BY_ID[id];
        render();
      }
    });
    const zoomBy = (d: number) => { zoomAt = Math.max(0, Math.min(ZOOMS.length - 1, zoomAt + d)); render(); };
    return h('div.worldmap-wrap', wrap,
      h('div.map-zoom',
        h('button', { title: 'Zoom in', disabled: zoomAt >= ZOOMS.length - 1, onclick: () => zoomBy(1) }, '+'),
        h('button', { title: 'Zoom out', disabled: zoomAt <= 0, onclick: () => zoomBy(-1) }, '−'),
        h('button', { title: 'Back to the selected area', onclick: () => { view = null; render(); } }, '◎')));
  };

  const siegePanel = () => {
    const game = app.game;
    const until = game.state.razedUntil[selected.id] ?? 0;
    if (!game.siegeReady(selected.id)) {
      const left = Math.max(0, until - game.now()) / 1000;
      const days = Math.floor(left / 86400);
      const hours = Math.floor((left % 86400) / 3600);
      return h('div.col', { style: { gap: '4px', borderTop: '1px solid #4a3626', paddingTop: '8px' } },
        h('b', { style: { color: '#6fcb6a' } }, 'Razed by the guild'),
        h('span.muted', { style: { fontSize: '14px' } }, `It comes back in ${days} d ${hours} h. Until then a trip here is a short visit to the ruins.`));
    }
    return h('div.col', { style: { gap: '4px', borderTop: '1px solid #4a3626', paddingTop: '8px' } },
      h('b', { style: { color: '#f08a5a' } }, 'LARGE BATTLE: SIEGE'),
      ...SIEGE_TEXT[selected.siege!].map((t) => h('span.muted', { style: { fontSize: '14px' } }, t)),
      h('span.muted', { style: { fontSize: '14px' } }, 'Bring area spells such as Fireball or Meteor. The hoard holds Mithril gear, gold, pack pieces and a sealed chest.'));
  };

  /** What leaving now means: night or day, and the season. */
  const conditions = () => {
    const now = app.game.now();
    const t = timeOfDay(now);
    const sn = season(now);
    return h('div.col', { style: { gap: '2px', fontSize: '13px', borderTop: '1px solid #4a3626', paddingTop: '8px' } },
      h('span', { style: { color: t === 'night' ? '#9ec3f0' : '#f1d27a' } }, `${TIME_TEXT[t].icon} ${TIME_TEXT[t].name} for another ${Math.ceil(untilChange(now) / 60000)} min${t === 'night' ? `: ${TIME_TEXT.night.effect}` : '. Night brings spirits and wolves, and favours the Moonveil.'}`),
      h('span', { style: { color: '#c8b8a0' } }, `${SEASON_TEXT[sn].icon} ${SEASON_TEXT[sn].name}: ${SEASON_TEXT[sn].effect}`),
      h('span.dim', 'A party keeps the time and season it leaves in.'));
  };

  /** Sends the chosen party with the chosen orders. */
  // What the party goes for: the area itself, or a site a scout found there.
  let target: number | null = null;
  const send = () => {
    const s = app.game.state;
    const o: Orders = {
      focus: isOpen(s, 'focus') ? orders.focus : 'explore',
      stance: isOpen(s, 'stance') ? orders.stance : 'balanced',
      retreatAtPct: isOpen(s, 'retreat') ? orders.retreatAtPct : 30,
      goal: isOpen(s, 'goals') ? orders.goal : undefined,
    };
    if (app.game.dispatch(selected.id, o, who, target ?? undefined) !== null) app.go('expedition');
  };

  /** The guild's hold on the selected area: pips, and what it does. */
  const holdLine = () => {
    const s = app.game.state;
    const need = holdNeed(selected);
    const have = holdOf(s, selected.id);
    const pips = Array.from({ length: need }, (_, i) => h(`span.hold-pip${i < have ? '.on' : ''}`));
    return h('div.col', { style: { gap: '3px' } },
      h('div.row', { style: { gap: '8px', alignItems: 'center' } }, h('b', 'Hold'), h('span.hold-pips', pips),
        secured(s, selected.id) ? h('span.hold-ok', 'Secured') : h('span.dim', { style: { fontSize: '13px' } }, `${have} / ${need}`)),
      h('span.dim', { style: { fontSize: '13px' } }, secured(s, selected.id)
        ? 'Scouts can map the land beyond it.'
        : 'Secure it to let scouts map the land beyond. A trip that comes home adds 1; clearing every group, a site or the trouble adds 1 more each.'));
  };

  /** The area's expedition deck: how much of it hold has opened, and a button to look through it. */
  const deckLine = () => {
    const s = app.game.state;
    const all = fullDeck(selected);
    const open = openDeck(s, selected.id);
    const seen = seenCards(s, selected.id);
    return h('div.col', { style: { gap: '3px' } },
      h('div.row', { style: { gap: '8px', alignItems: 'center' } }, h('b', 'Deck'),
        h('span.grow', `${open.length} of ${all.length} cards open · ${[...seen].filter((c) => all.includes(c)).length} seen`),
        h('button.btn.secondary.small', { onclick: () => deckModal(app, selected) }, 'View deck')),
      h('span.dim', { style: { fontSize: '13px' } }, 'Each trip is dealt a hand from this deck. More hold opens more cards; a secured area has them all, rare ones too.'));
  };

  /** Orders not open yet: what the party does meanwhile, and the next one the town will teach. */
  const ordersNote = () => {
    const s = app.game.state;
    const next = nextOrderUnlock(s);
    if (!next) return null;
    const plain = !isOpen(s, 'focus') ? 'The party explores and fights at a steady pace, and the Captain makes the calls. ' : '';
    return h('span.dim', { style: { fontSize: '13px' } }, `${plain}More orders open as the town grows. Next: ${next.name}, with ${next.needs}.`);
  };

  /** The settlement by the trail: how far it has grown, what it does, and what it needs to grow. */
  const settlementLine = () => {
    const s = app.game.state;
    const lvl = lifeLevel(s, selected.id);
    const base = lifeBase(s, selected.id);
    const trips = tripsHome(s, selected.id);
    const next = !secured(s, selected.id) ? 'Secure the area and a hamlet grows by the trail.'
      : lvl === 1 ? `It becomes a village when the area's story is told, or after 6 trips home (${trips} so far).`
        : lvl === 2 ? `It becomes a market town after 12 trips home (${trips} so far).` : '';
    const hiding = lvl > 0 && s.areas[selected.id] ? ' Its people are hiding from the trouble: no perks until it is cleared.' : '';
    const burned = base > lvl ? ' Trouble burned it back; clearing trouble here lets people come back.' : '';
    return h('div.col', { style: { gap: '3px' } },
      h('div.row', { style: { gap: '8px', alignItems: 'baseline' } }, h('b', 'Settlement'), h('span', lvl ? LIFE_NAME[lvl] : 'None yet')),
      h('span.dim', { style: { fontSize: '13px' } }, `${lvl ? LIFE_PERK[lvl] : ''}${hiding}${burned} ${next}`.trim()));
  };

  /** The area's story: the chapter the next trip plays, or that it's all told. */
  const storyLine = () => {
    const s = app.game.state;
    const def = areaStory(selected.id);
    if (!def || !s.tutorial.done) return null;
    const next = storyChapter(s, selected.id);
    const hint = ['Come home from a trip here and the guild takes it on (+1 hold).', 'A tough group to clear (+1 hold).', 'A named chief with guards. Beat them for their chest (+3 hold).'];
    return h('div.col', { style: { gap: '3px' } },
      h('div.row', { style: { gap: '8px', alignItems: 'baseline' } }, h('b', 'Story'),
        next ? h('span', `${def.titles[next - 1]} (chapter ${next} of 3)`) : h('span.hold-ok', 'Told')),
      h('span.dim', { style: { fontSize: '13px' } }, next ? hint[next - 1] : `${def.titles[2]} is beaten.`));
  };

  /** Scouts: who can go, their odds, and how long it takes. `open` maps new land; otherwise search for sites. */
  const scoutPanel = (open: boolean) => {
    const game = app.game;
    const s = game.state;
    const now = game.now();
    const scouts = s.roster.filter(isScout);
    const out = s.scouting.find((m) => m.regionId === selected.id);
    const odds = (p: number) => (p >= 0.85 ? 'good odds' : p >= 0.65 ? 'fair odds' : p >= 0.45 ? 'risky' : 'poor odds');
    const far = open && !s.explored.includes(selected.id) ? reachBlock(s, selected) : null;
    if (far) {
      return h('div.panel.col', { style: { gap: '8px' } },
        h('div.section-title', { style: { margin: '0' } }, 'BEYOND REACH'),
        h('p', far),
        h('p.dim', { style: { fontSize: '13px' } }, 'Scouts can map land next to town, or next to an area the guild has secured. Every trip that comes home adds to the guild\'s hold on its area; clearing every monster group, a site or the area\'s trouble adds more.'));
    }
    const rows = scouts
      .map((hero) => ({ hero, block: scoutBlock(s, hero, selected, open, now), p: scoutChance(s, hero, selected) }))
      .sort((a, b) => Number(!!a.block) - Number(!!b.block) || b.p - a.p)
      .slice(0, 6);
    return h('div.panel.col', { style: { gap: '8px' } },
      h('div.section-title', { style: { margin: '0' } }, open ? 'SCOUTING: MAP THIS LAND' : 'SCOUTING: SEARCH FOR SITES'),
      h('p.dim', { style: { fontSize: '13px' } }, open
        ? 'Parties only go where scouts have been. Rangers, Rogues and Beastmasters scout (and a few curious others). A scout who is spotted comes back wounded, and in skull areas may not come back.'
        : 'A scout can search known land for sites: enemy camps, monster lairs, dungeons, hidden caches and shrines. Parties can then go for them.'),
      out ? h('p', { style: { color: '#9ec3f0' } }, `${def(s.roster.find((x) => x.uid === out.uid)!).name} is on the way: back in ${fmtTime((out.endsAt - now) / 1000)}.`) : null,
      !out && outingBlock(s) ? h('p', { style: { color: '#e0b04a' } }, outingBlock(s)!) : null,
      !scouts.length ? h('p', { style: { color: '#e0b04a' } }, 'The guild has no scouts. Recruit a Ranger, Rogue or Beastmaster.') : null,
      ...rows.map(({ hero, block, p }) => h('div.row', { style: { alignItems: 'center', gap: '8px', borderTop: '1px solid #3b2a1c', paddingTop: '6px' } },
        h('div.grow', h('b', def(hero).name), h('div.dim', { style: { fontSize: '12px' } },
          block ?? `${CLASS_NAMES[def(hero).heroClass]} · ${odds(p)} · ${fmtTime(scoutSeconds(s, hero, selected))}`)),
        h('button.btn.small', { disabled: !!block, onclick: () => { if (game.sendScout(hero.uid, selected.id, open)) render(); } }, 'Send'))),
    );
  };

  const SITE_ICON: Record<SiteKind, string> = { camp: '⚑', lair: '☗', dungeon: '⛫', cache: '✦', shrine: '✚' };
  const SITE_TEXT: Record<SiteKind, string> = {
    camp: 'A big war band guarding its hoard.',
    lair: 'A great beast with two guards, and its hoard behind it.',
    dungeon: 'Three rooms of monsters, then a vault.',
    cache: 'Loot under a light guard.',
    shrine: 'Heals the party and steadies their blows. No fight.',
  };

  /** Skull regions: say plainly what can happen before anyone goes. */
  const confirmSkull = (go: () => void) => {
    const close = modal(h('div.panel.col', { style: { gap: '12px', maxWidth: '460px' } },
      h('div.section-title', { style: { margin: '0', color: '#e07a6a' } }, '☠ SKULL REGION'),
      h('h2', `Heroes can die in ${selected.name}`),
      h('p.muted', 'A hero knocked out here dies for good, unless a Phoenix Feather saves them, a Cleric or Paladin drags them out (once each per trip), or Second Wind raises them before the trip ends. The fallen get a plaque in the Hall of the Fallen and return some Essence.'),
      h('p.muted', 'A higher retreat rule brings the party home before anyone goes down.'),
      h('div.row', { style: { gap: '8px' } },
        h('button.btn', { onclick: () => { close(); go(); } }, 'Send them anyway'),
        h('button.btn.secondary', { onclick: () => close() }, 'Not yet'))));
  };

  const skullPanel = () => h('div.col', { style: { gap: '4px', borderTop: '1px solid #4a3626', paddingTop: '8px' } },
    h('b', { style: { color: '#e07a6a' } }, '☠ SKULL REGION: HEROES CAN DIE HERE'),
    h('span.muted', { style: { fontSize: '14px' } }, 'The best loot in the Marches, and permanent death for heroes knocked out. Safeguards: a Phoenix Feather (Market, level 3) saves its wearer once; each Cleric or Paladin can drag one hero out per trip; Second Wind raises the fallen; a higher retreat rule turns back sooner.'),
    selected.boss ? h('span', { style: { fontSize: '14px', color: '#f0b08a' } }, `In the lair at the end of the trail: ${/^The /.test(ENEMY_BY_ID[selected.boss].name) ? '' : 'the '}${ENEMY_BY_ID[selected.boss].name}.`) : null,
    selected.ring >= DEEP_RING ? h('span', { style: { fontSize: '14px', color: '#e2b84a' } },
      `THE DEEP MARCHES: ${selected.boss ? 'slay the lord, or clear every group,' : 'clear every group'} to carry home a Legendary chest: Starshards (they awaken heroes past their star cap) and maybe a piece of named gear. Chests here can hold Starshards too.`) : null);

  /** The area's state: what the trouble means for a trip, and how long before it spreads. */
  const statePanel = () => {
    const s = app.game.state;
    const now = app.game.now();
    const kind = areaState(s, selected.id);
    if (kind === 'calm') {
      const shield = (s.calmUntil[selected.id] ?? 0) - now;
      return shield > 0 ? h('p', { style: { fontSize: '14px', color: '#6fcb6a' } }, h('b', 'Calm: '), `recently cleared; no new trouble for ${hours(shield)}.`) : null;
    }
    const left = s.areas[selected.id].since + SPREAD_MS[kind] - now;
    return h('div.col', { style: { gap: '4px', borderTop: '1px solid #4a3626', paddingTop: '8px' } },
      h('b', { style: { color: STATE_BADGE[kind][0] === '#8E2B23' ? '#e07a6a' : '#f0b08a' } }, `${AREA_TEXT[kind].name.toUpperCase()}: ${AREA_TEXT[kind].short}`),
      h('span.muted', { style: { fontSize: '14px' } }, AREA_TEXT[kind].trip),
      h('span', { style: { fontSize: '13px', color: '#e0b04a' } }, left > 0 ? `Spreads to a neighbouring area in about ${hours(left)}.` : 'Ready to spread to a neighbouring area.'));
  };

  /** Which tribes would find a secret path here, and what. */
  const secretLine = () => {
    const here = SECRET_PATHS.filter((p) => p.biomes.includes(selected.biome));
    if (!here.length) return null;
    return h('p', { style: { fontSize: '14px', color: '#c9b8f0' } }, h('b', 'Secret paths: '),
      here.map((p) => `${p.label} (3+ ${TRIBE_NAMES[p.tribe]})`).join('; '));
  };

  const render = () => {
    const game = app.game;
    const s = game.state;
    const known = s.explored.includes(selected.id);
    const unlocked = game.partiesUnlocked();
    // Both together only for sieges; drop that choice when another region is picked.
    if (who.length > 1 && !selected.siege) who = [freeParty()];
    if (who.some((p) => p >= unlocked)) who = [0];
    const party = who.flatMap((p) => partyHeroes(s, p));
    const partyPower = party.reduce((a, p) => a + heroStrength(s, p), 0);
    const whoName = who.map((p) => PARTY_NAMES[p]).join(' and ');
    const goers = who.length > 1 ? 'both parties' : PARTY_NAMES[who[0]];
    const families = [...new Set(selected.enemyPool.map((e) => ENEMY_BY_ID[e.id].family))];
    const recommended = recommendedPower(selected.tier);
    const ratio = partyPower / recommended;
    const risk = ratio >= 1 ? 'comfortable' : ratio >= 0.85 ? 'risky' : ratio >= 0.7 ? 'dangerous' : 'too dangerous';
    const block = game.dispatchBlock(selected.id, who);
    const whoOptions: [string, string][] = Array.from({ length: unlocked }, (_, p) => [String(p), PARTY_NAMES[p]] as [string, string]);
    if (unlocked > 1 && selected.siege) whoOptions.push(['all', 'Both together']);
    const req = selected.requires ? ABILITY_TRIBE[selected.requires] : null;
    const sites: Site[] = s.sites.filter((x) => x.regionId === selected.id);
    if (target !== null && !sites.some((x) => x.id === target)) target = null;
    /** Who leads, and what that means for the trip. */
    const captainLine = () => {
      const capUid = s.parties[who[0]]?.captain;
      const cap = party.find((x) => x.uid === capUid) ?? party[0];
      return cap ? h('div', { style: { fontSize: '13px' } }, h('b', 'Captain: '), `${def(cap).name} (${captainText(cap.defId).replace(': ', '): ')}`) : null;
    };
    setChildren(el,
      h('div.col', { style: { flex: '1 1 520px', minWidth: '0', gap: '10px' } },
        h('div.row', { style: { alignItems: 'baseline' } }, h('h1.grow', 'The Frontier Marches'), h('span.muted', `${s.explored.length} of ${REGIONS.length} areas explored`)),
        mapSvg(),
        h('p.dim', { style: { fontSize: '13px' } }, 'You see the areas you have explored and the ones next to them. Scouts map new land; parties only go where scouts have been. Gold badges: sites found. Blue eye: a scout on the way. Rings further out take longer and are more dangerous.')),
      h('div.col', { style: { flex: '0 1 400px', gap: '14px' } },
        h('div.panel.col', { style: { gap: '8px' } },
          h('div.section-title', { style: { margin: '0' } }, `RING ${selected.ring} · ${known ? 'DANGER TIER ' + selected.tier : 'UNSCOUTED'}`),
          h('h2', known ? selected.name : 'Unscouted land'),
          h('p.muted', known ? selected.description : 'Nobody from the guild has been here yet. Send a scout to map it.'),
          known ? h('p', h('b', 'Seen here: '), families.join(', ')) : null,
          h('p', h('b', 'Trip length: '), `about ${tripLength(selected, travelSec(s, selected))}`, selected.travelSec
            ? h('span.dim', ` (${Math.round(travelSec(s, selected) / 60)} min on the road each way${buildingLevel(s, 'stables') ? `, ${Math.round(STABLES_CUT[buildingLevel(s, 'stables')] * 100)}% shorter thanks to the Stables` : ''})`) : null),
          req ? h('p', { style: { color: '#9ec3f0' } }, `Needs 3 or more ${req.name} in the party to ${req.verb}.`) : null,
          known && !selected.siege && isOpen(s, 'tribes') ? secretLine() : null,
          known ? statePanel() : null,
          known && !selected.siege ? holdLine() : null,
          known ? storyLine() : null,
          known && !selected.siege && secured(app.game.state, selected.id) ? settlementLine() : null,
          known && !selected.siege && !PLAIN_AREAS.has(selected.id) && (app.game.state.buildings.townhall ?? 1) >= 2 ? deckLine() : null,
          isOpen(s, 'clock') ? conditions() : null,
          known && selected.siege ? siegePanel() : null,
          selected.skull ? skullPanel() : null,
          known ? h('p', { style: { color: ratio >= 1 ? '#6fcb6a' : ratio >= 0.85 ? '#e0b04a' : '#e07a6a' }, title: 'Power counts heroes and their gear.' }, `${whoName} power ${partyPower} · recommended ${recommended} · ${risk}${selected.skull && ratio < 1 ? ' (and heroes can die here)' : ''}`) : h('p.dim', `${whoName} power ${partyPower} · danger unknown`),
        ),
        !known ? (isOpen(s, 'scouting') ? scoutPanel(true) : h('div.panel', h('p.muted', 'Nobody from the guild has mapped this land yet. Scouting comes a little later.'))) : h('div.panel.col', { style: { gap: '10px' } },
          h('div.section-title', { style: { margin: '0' } }, 'ORDERS'),
          sites.length && !selected.siege ? h('div.col', { style: { gap: '6px' } }, h('b', 'Go for'),
            h('div.col', { style: { gap: '4px' } },
              h(`button.btn.secondary.small${target === null ? '.on' : ''}`, { style: { textAlign: 'left' }, onclick: () => { target = null; render(); } }, `${target === null ? '● ' : '○ '}The area itself`),
              ...sites.map((x) => h(`button.btn.secondary.small${target === x.id ? '.on' : ''}`, { style: { textAlign: 'left' }, title: SITE_TEXT[x.kind], onclick: () => { target = x.id; render(); } },
                `${target === x.id ? '● ' : '○ '}${SITE_ICON[x.kind]} ${x.name[0].toUpperCase() + x.name.slice(1)}`))),
            h('span.dim', { style: { fontSize: '13px' } }, target !== null ? SITE_TEXT[sites.find((x) => x.id === target)!.kind] + ' It stays until a party deals with it.' : 'Sites are partway along the trail; a trip that goes for one takes a little longer.')) : null,
          captainLine(),
          unlocked > 1 ? h('div.col', { style: { gap: '6px' } }, h('b', 'Who goes'),
            seg<string>(whoOptions, who.length > 1 ? 'all' : String(who[0]), (v) => (who = v === 'all' ? Array.from({ length: unlocked }, (_, p) => p) : [Number(v)])),
            who.length > 1 ? h('span.dim', { style: { fontSize: '13px' } }, 'Ten heroes march together. The first party\'s Captain leads.') : null) : null,
          ordersNote(),
          !isOpen(s, 'focus') ? null : h('div.col', { style: { gap: '6px' } }, h('b', 'Focus'), seg<Focus>([['explore', 'Explore'], ['treasure', 'Treasure'], ['hunt', 'Hunt'], ['gather', 'Gather']], orders.focus, (v) => (orders.focus = v)),
            h('span.dim', { style: { fontSize: '13px' } }, orders.focus === 'treasure' ? 'More chests, more items, a better chance of a sealed chest. Turns up caches and stashes.' : orders.focus === 'hunt' ? 'An extra group of monsters and +20% XP. Turns up tracks and nests.' : orders.focus === 'gather' ? 'Double materials, 30% less gold. Turns up ore, herbs and honey.' : 'A longer trail and more things to spot.')),
          !isOpen(s, 'stance') ? null : h('div.col', { style: { gap: '6px' } }, h('b', 'Stance'), seg<Stance>([['cautious', 'Cautious'], ['balanced', 'Balanced'], ['bold', 'Bold']], orders.stance, (v) => (orders.stance = v)),
            h('span.dim', { style: { fontSize: '13px' } }, orders.stance === 'bold' ? 'Bigger fights, more gold, more risk.' : orders.stance === 'cautious' ? 'Smaller fights, less gold.' : 'Normal fights.')),
          !isOpen(s, 'goals') || selected.siege ? null : h('div.col', { style: { gap: '6px' } }, h('b', 'Goal'),
            seg<string>([['none', 'None'], ['hunt', 'Hunt'], ['rescue', 'Rescue'], ['map', 'Map'], ['clear', 'Clear']], orders.goal ?? 'none', (v) => (orders.goal = v === 'none' ? undefined : (v as GoalKind))),
            h('span.dim', { style: { fontSize: '13px' } }, orders.goal ? `${GOAL_INFO[orders.goal].name}: ${GOAL_INFO[orders.goal].text}` : 'An optional goal for the trip, for a bonus. Failing costs nothing but time.')),
          !isOpen(s, 'retreat') ? null : h('div.col', { style: { gap: '6px' } }, h('b', 'Retreat when party health drops below'), seg<string>([['20', '20%'], ['30', '30%'], ['45', '45%']], String(orders.retreatAtPct), (v) => (orders.retreatAtPct = Number(v)))),
          h('button.btn', { disabled: !!block, onclick: () => (selected.skull ? confirmSkull(() => send()) : send()) },
            selected.siege && game.siegeReady(selected.id) ? `Lay siege with ${goers}` : target !== null ? `Send ${goers} to the ${SITE_LABEL[sites.find((x) => x.id === target)!.kind]}` : `Send ${goers} to ${selected.name}`),
          block ? h('p', { style: { color: '#e0b04a', fontSize: '14px' } }, block) : null,
          s.expeditions.length ? h('button.btn.secondary.small', { onclick: () => app.go('expedition') }, s.expeditions.length > 1 ? 'Watch the parties' : 'Watch the party') : null,
        ),
        known && !selected.siege && isOpen(s, 'scouting') ? scoutPanel(false) : null,
      ),
    );
  };
  render();
  const mover = window.setInterval(() => {
    const g = app.game;
    for (const node of el.querySelectorAll<SVGGElement>('.mapbanner')) {
      const x = Number(node.dataset.x);
      const y = Number(node.dataset.y);
      let t = 0;
      if (node.dataset.exp) t = g.mapProgress(Number(node.dataset.exp));
      else {
        const m = g.state.scouting.find((q) => q.id === Number(node.dataset.scout));
        if (m) t = scoutProgress(m, g.now());
      }
      const p = roadPoint(x, y, t);
      node.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    }
  }, 250);
  return { el, refresh: () => render(), destroy: () => clearInterval(mover) };
}

/** A scout: out along the road for the first 30% of the trip, at the area, then back for the last 30%. */
function scoutProgress(m: { startedAt: number; endsAt: number }, now: number): number {
  const t = Math.max(0, Math.min(1, (now - m.startedAt) / Math.max(1, m.endsAt - m.startedAt)));
  return t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
}

const SITE_LABEL: Record<SiteKind, string> = { camp: 'camp', lair: 'lair', dungeon: 'dungeon', cache: 'cache', shrine: 'shrine' };

/** What each large battle is like, for the map panel. */
const SIEGE_TEXT: Record<SiegeKind, string[]> = {
  goblin_fortress: ['About a hundred goblins. Camps on side paths (each one cleared means fewer waves later), breaking the gate under arrow fire, holding the gateway against the horde, then Warlord Gnashgut in the keep.', 'Click the powder kegs by the walls.'],
  bandit_hold: ['Bandits and their war beasts behind a stockade. Camps on side paths, the gate under crossbow fire, waves at the gateway, then the Bandit King.', 'Prisoners wait in cages in the courtyard: break a cage (or click the prison key) and they fight on your side.'],
  cinder_legion: ['A burning plain. Ranks of imps, magma hounds and fire elementals march while fire fissures open and spread; then the Cinder Lord.', 'Standing in fire burns (Ashborn walk through it, and fire creatures heal in it). Frost Nova and the water cisterns put fires out.'],
  dragonmaw: ['The Siege of Dragonmaw, the hardest battle in the Marches. Cultist camps on the way up; three blood altars that keep summoning until they are broken; waves of drakes and wyrmlings while the Elder Wyrm breathes fire from the sky; then Kalvorax herself.', 'Her breath is marked on the ground just before it lands (Ashborn take half). Click the ballistas to shoot her: every bolt that hits leaves her weaker when she lands. Bring both parties.'],
  barrow_uprising: ['An open barrow field. Four tombs keep raising the dead until the party breaks their seals; then the Barrow King rises from the great mound.', 'Click the flasks of holy water: they scorch the dead and crack the seals.'],
};

/** Border colour and symbol for each area state on the map. */
const STATE_BADGE = { calm: ['', ''], infested: ['#8E2B23', '⚑'], corrupted: ['#7A4EC0', '✺'], besieged: ['#C8642A', '⚔'] } as const;

function hours(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return h ? `${h} h ${m} min` : `${m} min`;
}

/** "18:00", or "2 h 40 min" for the far rings. */
function tripLength(r: RegionDef, travel = r.travelSec ?? 0): string {
  const sec = r.durationSec + 2 * travel;
  if (sec < 3600) return fmtTime(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h} h${m ? ` ${m} min` : ''}`;
}

function escape(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;');
}

/** On a map hex: a banner once the area is secured, otherwise a row of hold pips. */
/** An area's expedition deck: seen cards face up, the rest face down, and those hold hasn't opened yet locked. */
function deckModal(app: App, r: RegionDef) {
  const s = app.game.state;
  const all = fullDeck(r);
  const open = new Set(openDeck(s, r.id));
  const seen = seenCards(s, r.id);
  const need = holdNeed(r);
  const box = h('div.panel.col', { style: { gap: '12px', maxWidth: '860px' } });
  const close = modal(box);
  const card = (id: string, i: number) => {
    const c = cardById(id);
    if (!c) return null;
    const rare = c.kind === 'rare';
    if (!open.has(id)) {
      const at = Math.min(need, Math.ceil((i + 1 - DECK_START) / DECK_PER_HOLD));
      return h(`div.deck-card.locked${rare ? '.rare' : ''}`, h('div.dc-icon', '⛓'), h('b', rare ? 'A rare card' : 'Locked'), h('span', at >= need ? 'Opens when the area is secured' : `Opens at ${at} hold`));
    }
    if (!seen.has(id)) return h(`div.deck-card.back${rare ? '.rare' : ''}`, h('div.dc-icon', '?'), h('b', rare ? 'A rare card' : 'Not dealt yet'), h('span', rare ? 'Rare cards turn up now and then.' : 'Turns up on a trip here.'));
    return h(`div.deck-card${rare ? '.rare' : ''}`, h('div.dc-icon', c.icon), h('b', c.name), h('span', c.text),
      h('i', { style: { fontSize: '11px', color: '#7a6a52' } }, c.kind === 'encounter' ? 'Encounter' : c.kind === 'discovery' ? 'Discovery' : c.kind === 'feature' ? 'Feature' : 'Rare'));
  };
  box.append(
    h('div.row', { style: { alignItems: 'baseline' } }, h('h2.grow', `${r.name}: the deck`), h('button.btn.secondary.small', { onclick: () => close() }, 'Close')),
    h('p.muted', { style: { margin: '0' } }, `Each trip here is dealt a hand from this deck: what waits on the trail. ${open.size} of ${all.length} cards are open; more hold opens more, and a secured area has them all.`),
    h('div.deck-grid', all.map(card).filter((x): x is HTMLElement => !!x)));
}

function holdBadge(s: GameState, r: RegionDef): string {
  const need = holdNeed(r);
  const have = holdOf(s, r.id);
  if (secured(s, r.id)) {
    const lvl = lifeLevel(s, r.id);
    const label = ['SECURED', 'HAMLET', 'VILLAGE', 'TOWN'][lvl];
    return `<g transform="translate(0 21)"><rect x="-27" y="-7" width="54" height="14" rx="7" fill="${lvl ? '#7A5A2A' : '#4F7A3A'}" stroke="#F1D27A" stroke-width="1.2"/><text y="3.5" class="tier" style="font-size:8.5px;letter-spacing:1px">${label}</text></g>`;
  }
  let pips = '';
  for (let i = 0; i < need; i++) pips += `<path transform="translate(${(i - (need - 1) / 2) * 11} 21)" d="M0 -4.5L4 0L0 4.5L-4 0Z" fill="${i < have ? '#F1D27A' : '#2a1e14'}" stroke="#F1D27A" stroke-width="1"/>`;
  return pips;
}
