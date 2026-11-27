import { buildingSvg } from '../../art/buildings';
import { itemIconSvg } from '../../art/items';
import { BUILDING_BY_ID, BUILDINGS, MATERIAL_NAMES } from '../../core/data/buildings';
import { ITEM_BY_ID, itemSummary, sellValue } from '../../core/data/items';
import { def } from '../../core/heroes';
import * as town from '../../core/town';
import type { Cost, ItemDef, Material } from '../../core/types';
import { MATERIALS } from '../../core/types';
import type { App, Screen, ScreenName } from '../app';
import { heroBody, petBody } from '../../art/sprites';
import { bandOf, buildRoutine, emoteSvg, poseAt, scaleAt, type Routine } from '../../art/townLife';
import { heroDetail } from './heroes';
import type { Emote } from '../../core/data/habits';
import { STAGE_NAMES, townSceneSvg, type TownView } from '../../art/townScene';
import { HERO_BY_ID } from '../../core/data/heroes';
import { REGION_BY_ID } from '../../core/data/world';
import { totalPacksReady } from '../../core/packs';
import { outingSlots, outingsOut, PARTY_NAMES, partyHeroes } from '../../core/state';
import { season, timeOfDay } from '../../core/time';
import { currentStep, stepScreen, TUTORIAL } from '../../core/tutorial';
import { plotOpen, unlocked } from '../../core/unlocks';
import { modal } from '../app';
import { fmtTime, h, setChildren, svgEl } from '../dom';

export function costLine(app: App, cost: Cost): HTMLElement {
  const s = app.game.state;
  return h('span.cost', town.costEntries(cost).map(([k, v]) => {
    const have = k === 'gold' ? s.gold : s.materials[k as Material];
    return h('span', { style: { color: have >= v ? '#cdbb97' : '#e07a6a', marginRight: '10px', whiteSpace: 'nowrap' } },
      `${v} ${k === 'gold' ? 'gold' : MATERIAL_NAMES[k as Material].toLowerCase()}`);
  }));
}

const BLOCK_TEXT: Record<string, string> = {
  max: 'Fully upgraded',
  townhall: 'Upgrade the Town Hall first',
  busy: 'The builders are busy',
  cost: 'Not enough resources',
};

/** Which place in town each screen belongs to: the Guild Hall holds the roster, the war table and the
 * trophies, the Tavern the packs, the Mage Tower the spellbook, and the gate leads out to the map. */
export const SCREEN_PLACE: Record<string, { place: string; room: string }> = {
  guild: { place: 'guildhall', room: 'The Great Hall' },
  heroes: { place: 'guildhall', room: 'The Roster' },
  party: { place: 'guildhall', room: 'The War Table' },
  achievements: { place: 'guildhall', room: 'Hall of Deeds' },
  packs: { place: 'tavern', room: 'Recruits\' Corner' },
  spells: { place: 'magetower', room: 'The Spellbook' },
  embassy: { place: 'embassy', room: 'The Envoys\' Hall' },
  map: { place: 'gate', room: 'Beyond the Gate' },
  expedition: { place: 'gate', room: 'On the Road' },
};

export const PLACE_NAME = (id: string) => (id === 'gate' ? 'Town Gate' : BUILDING_BY_ID[id]?.name ?? id);

interface Room { title: string; sub: string; screen: ScreenName; badge?: string }

/** The rooms inside each place, each one a screen. */
function rooms(app: App, id: string): Room[] {
  const s = app.game.state;
  const out: Room[] = [];
  if (id === 'guildhall') {
    out.push({ title: 'The Great Hall', sub: 'Reports, parties and contracts', screen: 'guild', badge: s.reports.length ? '!' : undefined });
    out.push({ title: 'The Roster', sub: 'Your heroes: cards, gear and stars', screen: 'heroes' });
    out.push({ title: 'The War Table', sub: 'Form the parties, pick the captains', screen: 'party' });
    if (unlocked(s, 'deeds')) out.push({ title: 'Hall of Deeds', sub: 'Achievements and prestige classes', screen: 'achievements' });
    if (!town.level(s, 'tavern') && unlocked(s, 'packs')) out.push({ title: 'The Pack Chest', sub: 'Open packs (until the Tavern is built)', screen: 'packs', badge: totalPacksReady(s) ? String(totalPacksReady(s)) : undefined });
  }
  if (id === 'tavern' && town.level(s, 'tavern')) out.push({ title: 'Recruits\' Corner', sub: 'Open card packs and meet new heroes', screen: 'packs', badge: totalPacksReady(s) ? String(totalPacksReady(s)) : undefined });
  if (id === 'magetower' && town.level(s, 'magetower')) out.push({ title: 'The Spellbook', sub: 'Choose the spells the party takes along', screen: 'spells' });
  if (id === 'gate') out.push({ title: 'The Frontier Marches', sub: 'The world map: send parties and scouts', screen: 'map' });
  if (id === 'embassy' && town.level(s, 'embassy')) {
    const waiting = (s.embassies ?? []).reduce((n, t) => n + (s.tribePacks?.[t] ?? 0), 0);
    out.push({ title: 'The Envoys\' Hall', sub: 'Tribe reputation, quests, Tribe Packs and gear', screen: 'embassy', badge: waiting ? String(waiting) : undefined });
  }
  return out;
}

const FLAVOUR: Record<string, string> = {
  gate: 'The road out of Greyford, east into the Frontier Marches. Parties and scouts leave from here, and come home here.',
};

/** The guide's target as a place in town. */
function hintPlace(app: App): string | null {
  const s = app.game.state;
  const step = currentStep(s);
  if (!step) return null;
  if (step.id === 'build') return town.level(s, 'tavern') ? null : 'tavern';
  const target = stepScreen(step, s);
  if (target === 'town') return null;
  if (target === 'packs' && !town.level(s, 'tavern')) return 'guildhall';
  return SCREEN_PLACE[target]?.place ?? null;
}

/** The heroes about town: everyone at home (the wounded too, resting), party members first. */
function heroesAtHome(app: App) {
  const s = app.game.state;
  const now = app.game.now();
  const first = new Set(partyHeroes(s, 0).map((x) => x.uid));
  return s.roster
    .filter((x) => !app.game.isAway(x.uid))
    .sort((p, q) => Number(first.has(q.uid)) - Number(first.has(p.uid)))
    .slice(0, 12)
    .map((x) => ({ uid: x.uid, defId: x.defId, wounded: town.isWounded(x, now) }));
}

interface Walker {
  uid: string;
  name: string;
  el: SVGGElement;
  body: SVGGElement;
  emote: SVGGElement;
  title: SVGTitleElement;
  routine: Routine;
  band: number;
  emoteKey: string;
  text: string;
  walking: boolean;
}
const SVG_NS = 'http://www.w3.org/2000/svg';

function townView(app: App): TownView {
  const s = app.game.state;
  const now = app.game.now();
  const levels: Record<string, number> = {};
  const names: Record<string, string> = {};
  const maxLevels: Record<string, number> = {};
  for (const b of BUILDINGS) {
    levels[b.id] = town.level(s, b.id);
    names[b.id] = b.name;
    maxLevels[b.id] = b.maxLevel;
  }
  const plots: Record<string, boolean> = {};
  for (const b of BUILDINGS) plots[b.id] = plotOpen(s, b.id);
  const badges: Record<string, string> = {};
  if (s.reports.length) badges.guildhall = '!';
  const packs = totalPacksReady(s) + (town.tavernPackReady(s, now) ? 1 : 0);
  if (packs && levels.tavern) badges.tavern = String(packs);
  else if (packs) badges.guildhall = badges.guildhall ?? String(packs);
  // A pack opened but not fully revealed is waiting on the table.
  if (s.pendingReveal) {
    if (levels.tavern) badges.tavern = '!';
    else badges.guildhall = '!';
  }
  const out = s.expeditions.length + s.scouting.length;
  if (out) badges.gate = String(out);
  const hurt = s.roster.filter((x) => town.isWounded(x, now)).length;
  if (hurt && levels.temple) badges.temple = String(hurt);
  return {
    levels, names, maxLevels, badges, plots,
    construction: s.construction?.id ?? null,
    night: timeOfDay(now) === 'night',
    season: season(now),
    hint: hintPlace(app),
  };
}

export function townScreen(app: App): Screen {
  const game = app.game;
  const stage = h('div.town-stage');
  const title = h('div.town-title');
  const builders = h('div.town-builders');
  const panel = h('div.town-panel');
  const el = h('div.town-view', stage, title, builders, panel);
  let selected: string | null = null;
  let key = '';
  let timer = 0;
  let frame = 0;
  let walkers: Walker[] = [];

  /** Puts the heroes about town, each on the loop their habit makes. */
  const spawnWalkers = (v: TownView) => {
    const bands = [...stage.querySelectorAll<SVGGElement>('.hero-band')];
    const ctx = { levels: v.levels, stage: Math.max(1, Math.min(5, v.levels.townhall || 1)), night: v.night };
    walkers = heroesAtHome(app).map((x, i) => {
      const d = HERO_BY_ID[x.defId];
      const el = document.createElementNS(SVG_NS, 'g');
      el.setAttribute('class', 'th-hero');
      el.setAttribute('data-hero', x.uid);
      const pet = d.pet ? `<g transform="translate(-34 0) scale(0.5)">${petBody(d.pet)}</g>` : '';
      el.innerHTML = `<title></title><ellipse class="th-shadow" cx="0" cy="0" rx="40" ry="10" fill="#000" opacity="0.22"/><g class="th-body"><g class="idle" style="animation-delay:${-i * 0.37}s">${pet}${heroBody(d)}</g></g><g class="th-emote"></g>`;
      const routine = buildRoutine(x.uid, x.defId, d.personality, x.wounded, ctx);
      const w: Walker = {
        uid: x.uid, name: d.name, el, routine, band: -1, emoteKey: '', text: '', walking: false,
        body: el.querySelector('.th-body') as SVGGElement,
        emote: el.querySelector('.th-emote') as SVGGElement,
        title: el.querySelector('title') as unknown as SVGTitleElement,
      };
      (bands[0] ?? stage.querySelector('svg'))?.appendChild(el);
      return w;
    });
    moveWalkers(bands);
  };

  /** Each frame: where everyone is now, how big, which way they face, and what they are up to. */
  const moveWalkers = (bands = [...stage.querySelectorAll<SVGGElement>('.hero-band')]) => {
    const t = Date.now() / 1000;
    for (const w of walkers) {
      const p = poseAt(w.routine, t);
      const sc = scaleAt(p.y);
      w.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      w.el.style.display = p.inside ? 'none' : '';
      w.body.setAttribute('transform', `scale(${(p.facing * sc).toFixed(3)} ${sc.toFixed(3)})`);
      (w.el.firstElementChild!.nextElementSibling as SVGElement).setAttribute('transform', `scale(${sc.toFixed(3)})`);
      const band = bandOf(p.y);
      if (band !== w.band && bands[band]) {
        bands[band].appendChild(w.el);
        w.band = band;
      }
      if (p.walking !== w.walking) {
        w.walking = p.walking;
        w.el.classList.toggle('walking', p.walking);
      }
      const ek = p.emote ?? '';
      if (ek !== w.emoteKey) {
        w.emoteKey = ek;
        w.emote.innerHTML = ek ? emoteSvg(ek as Emote) : '';
      }
      w.emote.setAttribute('transform', `translate(${(14 * sc / 0.4).toFixed(1)} ${(-104 * sc).toFixed(1)}) scale(${(sc / 0.4).toFixed(3)})`);
      if (p.text !== w.text) {
        w.text = p.text;
        w.title.textContent = `${w.name}, ${p.text}. ${w.routine.habit.text}`;
      }
    }
  };
  const loop = () => {
    moveWalkers();
    frame = requestAnimationFrame(loop);
  };

  const drawScene = (force = false) => {
    const v = townView(app);
    const home = heroesAtHome(app);
    const k = JSON.stringify([v.levels, v.construction, v.night, v.season, v.hint, v.badges, home, selected]);
    if (!force && k === key) return;
    key = k;
    stage.innerHTML = townSceneSvg(v);
    spawnWalkers(v);
    if (selected) stage.querySelector(`.place[data-place="${selected}"]`)?.classList.add('sel');
  };

  const drawTitle = () => {
    const s = game.state;
    const th = town.level(s, 'townhall');
    const st = Math.max(1, Math.min(5, th));
    setChildren(title,
      h('div.tt-crest', svgEl(CREST)),
      h('div.col', { style: { gap: '2px' } },
        h('div.tt-name', 'Greyford'),
        h('div.tt-stage', `${STAGE_NAMES[st]} of the Frontier`),
        !s.tutorial.done ? null : st < 5 ? h('div.tt-next', `Raise the Town Hall to level ${st + 1} and Greyford becomes a ${STAGE_NAMES[st + 1].toLowerCase()}.`) : h('div.tt-next', 'The greatest city of the Marches.')));
  };

  const drawBuilders = () => {
    const s = game.state;
    const c = s.construction;
    const now = game.now();
    // The builders appear when there is something to build: the tutorial's Tavern, or later.
    const step = currentStep(s);
    builders.style.display = c || !step || TUTORIAL.findIndex((t) => t.id === 'build') <= s.tutorial.step ? '' : 'none';
    if (c) {
      setChildren(builders,
        h('div.tb-ico', svgEl(HAMMER)),
        h('div.col.grow', { style: { gap: '4px' } },
          h('div', h('b', `The builders are ${c.level > 1 ? 'raising' : 'putting up'} the ${BUILDING_BY_ID[c.id].name}`), h('span.muted', ` · level ${c.level} · `), h('span.muted.tb-left', `${fmtTime((c.endsAt - now) / 1000)} left`)),
          h('div.bar', h('i.tb-bar', { style: { width: `${progress(c, now)}%` } }))),
        h('button.btn.secondary.small', { onclick: () => game.rushConstruction(), title: 'Testing aid: finish now' }, 'Finish (test)'));
    } else {
      setChildren(builders,
        h('div.tb-ico', svgEl(HAMMER)),
        h('div.grow', h('b', 'The builders are idle.'), h('span.muted', ' Click a building or an empty plot to build.')),
        h('button.btn.secondary.small', { onclick: () => ledgerModal(app) }, 'Builders\' ledger'));
    }
  };

  const drawPanel = () => {
    stage.querySelectorAll('.place.sel').forEach((n) => n.classList.remove('sel'));
    if (!selected) {
      panel.classList.remove('open');
      return;
    }
    stage.querySelector(`.place[data-place="${selected}"]`)?.classList.add('sel');
    panel.classList.add('open');
    setChildren(panel, placePanel(app, selected, () => select(null)));
  };

  const select = (id: string | null) => {
    selected = id;
    drawPanel();
  };

  stage.addEventListener('click', (e) => {
    const t = (e.target as Element).closest('[data-place], [data-hero]');
    if (!t) return select(null);
    const uid = t.getAttribute('data-hero');
    const hero = uid ? game.state.roster.find((x) => x.uid === uid) : undefined;
    if (hero) return heroDetail(app, hero);
    const id = t.getAttribute('data-place')!;
    select(selected === id ? null : id);
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected && !document.querySelector('.modal-back')) select(null);
  };
  document.addEventListener('keydown', onKey);

  drawScene(true);
  drawTitle();
  drawBuilders();
  frame = requestAnimationFrame(loop);
  timer = window.setInterval(() => {
    const c = game.state.construction;
    if (c) {
      const left = builders.querySelector('.tb-left');
      const bar = builders.querySelector('.tb-bar') as HTMLElement | null;
      if (left) left.textContent = `${fmtTime((c.endsAt - game.now()) / 1000)} left`;
      if (bar) bar.style.width = `${progress(c, game.now())}%`;
      const pl = panel.querySelector('.tp-left');
      const pb = panel.querySelector('.tp-bar') as HTMLElement | null;
      if (pl) pl.textContent = `${fmtTime((c.endsAt - game.now()) / 1000)} left`;
      if (pb) pb.style.width = `${progress(c, game.now())}%`;
    }
    const tv = panel.querySelector('.tp-tavern');
    if (tv) tv.textContent = tavernText(app);
    // Night falls, seasons turn, the free pack comes in.
    drawScene();
  }, 1000);

  return {
    el,
    full: true,
    refresh: () => {
      drawScene();
      drawTitle();
      drawBuilders();
      if (selected) setChildren(panel, placePanel(app, selected, () => select(null)));
    },
    destroy: () => {
      clearInterval(timer);
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
    },
  };
}

function tavernText(app: App): string {
  const s = app.game.state;
  return town.tavernPackReady(s, app.game.now()) ? 'A free Recruit Pack is waiting at the bar.' : `Next free pack in ${fmtTime((s.tavernNextPackAt - app.game.now()) / 1000)}.`;
}

/** The panel for one place: what it is, its rooms, its trade, and the builders' plans for it. */
function placePanel(app: App, id: string, close: () => void): HTMLElement {
  const game = app.game;
  const s = game.state;
  const isGate = id === 'gate';
  const b = BUILDING_BY_ID[id];
  const lvl = isGate ? 0 : town.level(s, id);
  const th = town.level(s, 'townhall');
  const parts: (HTMLElement | null)[] = [];
  parts.push(h('div.tp-head',
    h('div.tp-art', svgEl(isGate ? GATE_ICON : buildingSvg(id, lvl), 'bldg')),
    h('div.col.grow', { style: { gap: '2px' } },
      h('h2', PLACE_NAME(id)),
      isGate ? h('span.tp-sub', `${STAGE_NAMES[Math.max(1, Math.min(5, th))]} gate`) : h('span.tp-sub', lvl ? `Level ${lvl} of ${b.maxLevel}` : 'An empty plot')),
    h('button.tp-close', { title: 'Close (Esc)', onclick: close }, '×')));
  parts.push(h('p.tp-desc', isGate ? FLAVOUR.gate : b.description));

  const rs = rooms(app, id);
  if (rs.length) {
    parts.push(h('div.tp-rooms', rs.map((r) => h('button.room', { onclick: () => app.go(r.screen) },
      h('span.room-t', r.title), h('span.room-s', r.sub), r.badge ? h('span.badge', r.badge) : null))));
  }

  if (isGate) {
    const out = s.expeditions.map((ex) => h('div.tp-row',
      h('span.grow', h('b', ex.parties.map((p) => PARTY_NAMES[p]).join(' and ')), h('span.muted', ` · ${REGION_BY_ID[ex.regionId].name} · ${fmtTime(game.timeLeftSec(ex.id))}`)),
      h('button.btn.small', { onclick: () => { game.watch(ex.id); app.go('expedition'); } }, 'Watch')));
    for (const m of s.scouting) {
      const who = s.roster.find((x) => x.uid === m.uid);
      out.push(h('div.tp-row', h('span.grow', h('b', who ? HERO_BY_ID[who.defId].name : 'A scout'), h('span.muted', ` · ${m.open ? 'scouting' : 'searching'} ${REGION_BY_ID[m.regionId].name}`))));
    }
    parts.push(h('div.section-title', `ON THE ROAD · ${outingsOut(s)} OF ${outingSlots(s)} OUTING${outingSlots(s) > 1 ? 'S' : ''}`), out.length ? h('div.col', { style: { gap: '6px' } }, out) : h('p.dim', 'Nobody is out. The guards are playing dice.'));
    if (s.reports.length) parts.push(h('button.btn', { onclick: () => app.go('guild') }, s.reports.length > 1 ? `${s.reports.length} parties are back: read the reports` : 'A party is back: read the report'));
  }

  // What the place can do for the guild.
  if (lvl > 0) {
    const acts: HTMLElement[] = [];
    if (id === 'weaponsmith' || id === 'armorer') acts.push(h('button.btn', { onclick: () => shopModal(app, id) }, 'Browse the wares'));
    if (id === 'market') acts.push(h('button.btn', { onclick: () => marketModal(app) }, 'Trade'));
    if (id === 'temple') acts.push(h('button.btn', { onclick: () => templeModal(app) }, 'Visit the healers'));
    if (id === 'townhall') acts.push(h('button.btn.secondary', { onclick: () => ledgerModal(app) }, 'Builders\' ledger'));
    if (id === 'tavern') {
      const ready = town.tavernPackReady(s, game.now());
      parts.push(h('p.tp-tavern.muted', tavernText(app)));
      acts.push(h('button.btn', { disabled: !ready, onclick: () => game.claimTavernPack() }, 'Collect the free pack'));
    }
    if (acts.length) parts.push(h('div.row.wrap', { style: { gap: '8px' } }, acts));
  }
  if (id === 'townhall') {
    const st = Math.max(1, Math.min(5, th));
    parts.push(h('div.tp-note', h('b', `Greyford is a ${STAGE_NAMES[st].toLowerCase()}. `), st < 5 ? `At Town Hall level ${st + 1} it becomes a ${STAGE_NAMES[st + 1].toLowerCase()}: more houses, ${st + 1 >= 4 ? 'stone walls' : st + 1 >= 2 ? 'a palisade' : 'walls'} and a grander gate. No building can be a higher level than the Town Hall.` : 'Every building in the Marches answers to its Town Hall.'));
  }

  // Building and upgrading.
  if (!isGate) {
    const next = lvl + 1;
    const c = s.construction;
    const here = c?.id === id;
    const block = town.upgradeBlock(s, id);
    parts.push(h('div.section-title', lvl ? 'THE BUILDERS' : 'BUILD HERE'));
    if (lvl) parts.push(h('p', h('b', 'Now: '), b.levels[lvl]));
    if (here) {
      parts.push(h('p', h('b', `Going up: level ${c!.level}. `), h('span.muted.tp-left', `${fmtTime((c!.endsAt - game.now()) / 1000)} left`)),
        h('div.bar', h('i.tp-bar', { style: { width: `${progress(c!, game.now())}%` } })),
        h('div', h('button.btn.secondary.small', { onclick: () => game.rushConstruction(), title: 'Testing aid: finish now' }, 'Finish now (test)')));
    } else if (next <= b.maxLevel) {
      parts.push(h('p', h('b', lvl ? `Level ${next}: ` : 'Gives: '), b.levels[next]),
        h('div.tp-cost', costLine(app, b.cost(next)), h('span.dim', `· ${fmtTime(b.time(next))}`)),
        h('div.col', { style: { alignItems: 'flex-start', gap: '6px' } },
          h('button.btn', { disabled: !!block, onclick: () => game.upgrade(id) }, lvl ? `Upgrade to level ${next}` : `Build the ${b.name}`),
          block ? h('span.dim', { style: { fontSize: '13px' } }, block === 'townhall' ? `Raise the Town Hall to level ${next} first` : BLOCK_TEXT[block]) : null));
    } else parts.push(h('p.dim', 'Fully upgraded. The finest in the Marches.'));
  }
  return h('div.col', { style: { gap: '12px' } }, parts);
}

/** Every building on one page. */
export function ledgerModal(app: App) {
  const box = h('div.panel.col', { style: { gap: '14px' } });
  const close = modal(box, () => off());
  const render = () => setChildren(box,
    h('div.row', { style: { alignItems: 'baseline' } }, h('h2.grow', 'The Builders\' Ledger'), h('span.muted', `Town Hall level ${town.level(app.game.state, 'townhall')}`)),
    h('div.region-list', { style: { gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' } }, BUILDINGS.map((b) => buildingCard(app, b.id))),
    h('div', h('button.btn.secondary.small', { onclick: () => close() }, 'Close')));
  const off = app.game.onChange(render);
  render();
}

function progress(c: { id: string; level: number; endsAt: number }, now: number): number {
  const total = BUILDING_BY_ID[c.id].time(c.level) * 1000;
  return Math.max(0, Math.min(100, 100 - ((c.endsAt - now) / total) * 100));
}

const HAMMER = '<svg viewBox="0 0 32 32"><path d="M6 26L18 14" stroke="#2A1A10" stroke-width="6" stroke-linecap="round"/><path d="M6 26L18 14" stroke="#B07A45" stroke-width="3.4" stroke-linecap="round"/><path d="M14 8l6-4l8 8l-4 6z" fill="#9AA1A8" stroke="#2A1A10" stroke-width="2" stroke-linejoin="round"/></svg>';
const CREST = '<svg viewBox="0 0 40 46"><path d="M2 2H38V20C38 34 20 44 20 44C20 44 2 34 2 20Z" fill="#3D6178" stroke="#E2B84A" stroke-width="3"/><path d="M11 11L29 29M29 11L11 29" stroke="#F2E6CC" stroke-width="3.6" stroke-linecap="round"/><circle cx="20" cy="20" r="4" fill="#E2B84A" stroke="#2A1A10" stroke-width="1.4"/></svg>';
export const GATE_ICON = '<svg viewBox="0 0 120 96"><ellipse cx="60" cy="88" rx="54" ry="6" fill="#000" opacity="0.2"/><path d="M14 86V30H44V86ZM76 86V30H106V86Z" fill="#C9BE9E" stroke="#2A1A10" stroke-width="2"/><path d="M14 30v-8h6v8M26 30v-8h6v8M38 30v-8h6v8M76 30v-8h6v8M88 30v-8h6v8M100 30v-8h6v8" fill="#C9BE9E" stroke="#2A1A10" stroke-width="1.6"/><path d="M44 86V48H76V86" fill="#C9BE9E" stroke="#2A1A10" stroke-width="2"/><path d="M48 86V62A12 12 0 0 1 72 62V86Z" fill="#1E140E" stroke="#2A1A10" stroke-width="2"/><path d="M60 22V4" stroke="#2A1A10" stroke-width="2"/><path d="M60 4h16l-4 5l4 5h-16z" fill="#3D6178" stroke="#2A1A10"/></svg>';

function buildingCard(app: App, id: string): HTMLElement {
  const game = app.game;
  const s = game.state;
  const b = BUILDING_BY_ID[id];
  const lvl = town.level(s, id);
  const building = s.construction?.id === id;
  const block = town.upgradeBlock(s, id);
  const next = lvl + 1;
  const actions: (HTMLElement | null)[] = [];
  if (lvl > 0) {
    if (id === 'weaponsmith' || id === 'armorer') actions.push(h('button.btn.small', { onclick: () => shopModal(app, id) }, 'Shop'));
    if (id === 'market') actions.push(h('button.btn.small', { onclick: () => marketModal(app) }, 'Trade'));
    if (id === 'temple') actions.push(h('button.btn.small', { onclick: () => templeModal(app) }, 'Healing'));
    if (id === 'tavern') {
      const ready = town.tavernPackReady(s, game.now());
      actions.push(h('button.btn.small', { disabled: !ready, onclick: () => game.claimTavernPack() },
        ready ? 'Collect free pack' : `Next pack in ${fmtTime((s.tavernNextPackAt - game.now()) / 1000)}`));
    }
  }
  return h('div.region', { style: { cursor: 'default', gap: '8px' } },
    svgEl(buildingSvg(id, lvl), 'bldg'),
    h('div.row', { style: { alignItems: 'baseline' } }, h('h3.grow', b.name), h('span.dim', lvl ? `Level ${lvl} / ${b.maxLevel}` : 'Not built')),
    h('p.muted', { style: { fontSize: '14px' } }, b.description),
    lvl ? h('p', { style: { fontSize: '14px' } }, h('b', 'Now: '), b.levels[lvl]) : null,
    next <= b.maxLevel ? h('p', { style: { fontSize: '14px' } }, h('b', lvl ? 'Next: ' : 'Gives: '), b.levels[next]) : null,
    next <= b.maxLevel ? h('div', { style: { fontSize: '13px' } }, costLine(app, b.cost(next)), h('span.dim', ` · ${fmtTime(b.time(next))}`)) : null,
    h('div.row.wrap', { style: { gap: '8px' } },
      next <= b.maxLevel
        ? h('button.btn.small', { disabled: !!block || building, title: block ? BLOCK_TEXT[block] : '', onclick: () => game.upgrade(id) },
            building ? 'Building…' : lvl ? 'Upgrade' : 'Build')
        : null,
      ...actions),
    block && block !== 'max' && !building ? h('span.dim', { style: { fontSize: '12px' } }, BLOCK_TEXT[block]) : null,
  );
}

function itemRow(d: ItemDef, action: HTMLElement): HTMLElement {
  return h('div.row', { style: { alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #4a3826' } },
    svgEl(itemIconSvg(d), `bp-big ${d.named ? 'named' : 't' + d.tier}`),
    h('div.grow', h('b', d.named ? { style: { color: '#f1d27a' } } : {}, d.name), h('div.dim', { style: { fontSize: '13px' } }, itemSummary(d)),
      d.lore ? h('div.dim', { style: { fontSize: '12px', fontStyle: 'italic' } }, d.lore) : null),
    action);
}

export function shopModal(app: App, shop: 'weaponsmith' | 'armorer') {
  const box = h('div.panel.col', { style: { gap: '10px' } });
  const close = modal(box);
  const render = () => {
    const s = app.game.state;
    const stock = town.shopStock(s, shop);
    setChildren(box,
      h('div.row', { style: { alignItems: 'baseline' } }, h('h2.grow', BUILDING_BY_ID[shop].name), h('span.muted', `${s.gold} gold`)),
      h('p.muted', 'Bought items go to your storehouse. Equip them from a hero\'s page.'),
      h('div', { style: { maxHeight: '60vh', overflow: 'auto' } }, stock.map((d) =>
        itemRow(d, h('div.col', { style: { alignItems: 'flex-end', gap: '4px' } },
          h('div', { style: { fontSize: '13px' } }, costLine(app, d.cost)),
          h('button.btn.small', { disabled: !town.canAfford(s, d.cost), onclick: () => { app.game.buyItem(d.id); render(); } }, 'Buy'))))),
      h('div', h('button.btn.secondary.small', { onclick: close }, 'Close')),
    );
  };
  render();
}

export function marketModal(app: App) {
  const box = h('div.panel.col', { style: { gap: '10px' } });
  const close = modal(box);
  const render = () => {
    const s = app.game.state;
    const free = s.items.filter((i) => !town.itemOwner(s, i.uid));
    const rate = town.marketRate(s);
    setChildren(box,
      h('div.row', { style: { alignItems: 'baseline' } }, h('h2.grow', 'Market'), h('span.muted', `${s.gold} gold`)),
      h('div.section-title', 'MATERIALS'),
      h('div', MATERIALS.map((m) => h('div.row', { style: { alignItems: 'center', gap: '10px', padding: '6px 0' } },
        h('b', { style: { width: '80px' } }, MATERIAL_NAMES[m]), h('span.dim', { style: { width: '60px' } }, `have ${s.materials[m]}`),
        h('button.btn.secondary.small', { disabled: s.materials[m] < 5, onclick: () => { app.game.sellMaterial(m, 5); render(); } }, `Sell 5 (+${Math.round(5 * ({ wood: 2, stone: 3, iron: 6, herbs: 4, hides: 4 }[m]) * rate)}g)`),
        h('button.btn.secondary.small', { disabled: s.gold < town.buyMaterialPrice(s, m) * 5, onclick: () => { app.game.buyMaterial(m, 5); render(); } }, `Buy 5 (${town.buyMaterialPrice(s, m) * 5}g)`),
        h('button.btn.secondary.small', { disabled: s.gold < town.buyMaterialPrice(s, m) * 25, onclick: () => { app.game.buyMaterial(m, 25); render(); } }, `Buy 25 (${town.buyMaterialPrice(s, m) * 25}g)`)))),
      h('div.section-title', 'JEWELRY'),
      h('div', { style: { maxHeight: '28vh', overflow: 'auto' } }, town.shopStock(s, 'market').map((d) =>
        itemRow(d, h('div.col', { style: { alignItems: 'flex-end', gap: '4px' } },
          h('div', { style: { fontSize: '13px' } }, costLine(app, d.cost)),
          h('button.btn.small', { disabled: !town.canAfford(s, d.cost), onclick: () => { app.game.buyItem(d.id); render(); } }, 'Buy'))))),
      h('div.section-title', 'SELL UNUSED ITEMS'),
      free.length
        ? h('div', { style: { maxHeight: '28vh', overflow: 'auto' } }, free.map((it) => {
            const d = ITEM_BY_ID[it.defId];
            return itemRow(d, h('button.btn.secondary.small', { onclick: () => {
              // Named gear is one of a kind: ask first.
              if (d.named && !confirm(`Sell ${d.name}? Named gear is one of a kind, and the Market won't sell it back.`)) return;
              app.game.sellItem(it.uid);
              render();
            } }, `Sell +${Math.round(sellValue(d) * rate)}g`));
          }))
        : h('p.dim', 'Nothing unused in the storehouse.'),
      h('div', h('button.btn.secondary.small', { onclick: close }, 'Close')),
    );
  };
  render();
}

export function templeModal(app: App) {
  const box = h('div.panel.col', { style: { gap: '10px', maxWidth: '560px' } });
  let timer = 0;
  const close = modal(box, () => clearInterval(timer));
  const render = () => {
    const s = app.game.state;
    const now = app.game.now();
    const hurt = s.roster.filter((x) => town.isWounded(x, now));
    setChildren(box,
      h('h2', 'Temple'),
      h('p.muted', 'Heroes knocked out on an expedition come home wounded and must rest before going out again.'),
      hurt.length
        ? hurt.map((x) => h('div.row', { style: { alignItems: 'center', gap: '10px', padding: '6px 0' } },
            h('b.grow', def(x).name), h('span.dim', `${fmtTime((x.woundedUntil! - now) / 1000)} left`),
            h('button.btn.small', { disabled: s.gold < town.healCost(x, now), onclick: () => { app.game.healNow(x.uid); render(); } }, `Heal now (${town.healCost(x, now)}g)`)))
        : h('p', 'No one is wounded. The priests are bored.'),
      h('div', h('button.btn.secondary.small', { onclick: close }, 'Close')),
    );
  };
  render();
  timer = window.setInterval(render, 1000);
}
