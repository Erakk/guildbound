import { spellIcon } from '../../art/spells';
import { SPELL_BY_ID } from '../../core/data/spells';
import { REGION_BY_ID } from '../../core/data/world';
import { MANA_MAX, TPS } from '../../core/sim/expedition';
import { siegeStatus } from '../../core/sim/siege';
import { AREA_TEXT } from '../../core/areas';
import { SEASON_TEXT, TIME_TEXT } from '../../core/time';
import { PARTY_NAMES } from '../../core/state';
import { ExpeditionView } from '../../render/expeditionView';
import { DISCOVERY_BY_ID, LEANS } from '../../core/data/discoveries';
import type { App, Screen } from '../app';
import { fmtTime, h } from '../dom';
import { roadAhead } from '../../core/sim/encounters';
import { unlocked } from '../../core/unlocks';

export function expeditionScreen(app: App): Screen {
  const game = app.game;
  const el = h('div', { style: { position: 'absolute', inset: '0' } });
  const ex = game.watched;
  if (!ex || !game.sim) {
    el.append(h('div.screen', h('div.panel.col', { style: { maxWidth: '520px' } },
      h('h2', 'No party is out right now'),
      h('p.muted', 'Send one from the map.'),
      h('div', h('button.btn', { onclick: () => app.go('map') }, 'Open the map')))));
    return { el, refresh: () => { if (game.state.expeditions.length) app.go('expedition'); } };
  }
  game.watch(ex.id);
  const tripCount = game.state.expeditions.length;
  const who = ex.parties.map((p) => PARTY_NAMES[p]).join(' + ');

  const canvasHost = h('div.exp-canvas');
  const view = new ExpeditionView(canvasHost, game);
  const chronicle = h('div.chron');
  // Start from the chronicle so far; drop effects queued before this view existed.
  game.sim.events.length = 0;
  const lines: string[] = [...game.sim.chronicle.slice(-5)];
  const pushLine = (t: string) => {
    lines.push(t);
    while (lines.length > 5) lines.shift();
    chronicle.replaceChildren(...lines.map((l) => h('div', l)));
  };
  pushLine(lines.pop() ?? '');
  view.onLog = pushLine;

  const region = REGION_BY_ID[ex.regionId];
  const timeTxt = h('b');
  const timeBar = h('i');
  const goldTxt = h('span');
  const guideTxt = h('span');
  const siegeTxt = h('b', { style: { color: '#f1d27a', fontSize: '14px' } });
  const siegeSub = h('span.dim', { style: { fontSize: '13px' } });
  const siegeBar = h('i', { style: { background: '#d8423a' } });
  const siegeBox = game.sim.siege
    ? h('div.col', { style: { gap: '4px', borderTop: '1px solid #4a3626', paddingTop: '6px', marginTop: '2px' } }, siegeTxt, h('div.bar', siegeBar), siegeSub)
    : null;
  const areaLine = h('div', { style: { fontSize: '13px', borderTop: '1px solid #4a3626', paddingTop: '6px', color: '#f0b08a' } });
  // The road ahead: what's coming, and waypoints where there's a decision to make.
  const roadBox = h('div.roadmap.col');
  let roadSig = '';
  const renderRoad = () => {
    const sim = game.sim;
    if (!sim) return;
    const nodes = roadAhead(sim, 5);
    const sig = nodes.map((n) => `${n.key}:${n.decided ? 1 : 0}:${sim.waypoints[n.key] ?? ''}`).join('|');
    if (sig === roadSig) return;
    roadSig = sig;
    roadBox.style.display = nodes.length ? '' : 'none';
    roadBox.replaceChildren(
      h('div.section-title', { style: { margin: '0' } }, 'THE ROAD AHEAD'),
      ...nodes.map((n, i) => {
        const wp = sim.waypoints[n.key] ?? null;
        const pick = (v: 'take' | 'skip' | null, label: string, tip: string) => h(`button${wp === v ? '.on' : ''}`, {
          title: tip,
          onclick: () => game.input({ kind: 'route', key: n.key, choice: v }),
        }, label);
        return h(`div.road-row${i === 0 ? '.next' : ''}`,
          h('div.row', { style: { gap: '6px', alignItems: 'baseline' } }, h('span.road-icon', n.icon), h('span.grow', n.title)),
          n.choice && !n.decided && unlocked(game.state, 'waypoints') ? h('div.road-pick',
            pick('take', n.choice.take, 'Your waypoint: the party will do this'),
            pick('skip', n.choice.skip, 'Your waypoint: the party will do this'),
            pick(null, 'Captain', "Leave it to the Captain's judgement")) : null);
      }));
  };
  // Blessings (common spells) running right now.
  const boonLine = h('div', { style: { fontSize: '13px', color: '#f2d26a', display: 'none' } });
  const tl = h('div.hud.tl.col', { style: { gap: '6px' } },
    h('h3', region.name),
    h('div.dim', { style: { fontSize: '13px' } }, `${who} · ring ${region.ring} · tier ${region.tier} · ${ex.orders.focus} · ${ex.orders.stance}`),
    h('div', { style: { fontSize: '13px', color: game.sim.time === 'night' ? '#9ec3f0' : '#c8b8a0' } },
      `${TIME_TEXT[game.sim.time].icon} ${TIME_TEXT[game.sim.time].name} · ${SEASON_TEXT[game.sim.season].icon} ${SEASON_TEXT[game.sim.season].name}`),
    h('div.row', { style: { justifyContent: 'space-between', fontSize: '14px' } }, h('span', 'Time left'), timeTxt),
    h('div.bar', timeBar),
    h('div.row', { style: { justifyContent: 'space-between', fontSize: '14px' } }, goldTxt, guideTxt),
    siegeBox,
    game.sim.area.kind !== 'calm' ? areaLine : null,
    boonLine,
    roadBox,
  );
  const hpGrid = h('div.hp');
  const tr = h('div.hud.tr.col', { style: { gap: '8px' } }, h('div.section-title', { style: { margin: '0' } }, who.toUpperCase()), hpGrid,
    h('button.btn.small', { onclick: () => game.recall(), title: 'Bring the party home now' }, 'Recall Horn'),
    h('div.section-title', { style: { margin: '6px 0 0' } }, 'CHRONICLE'), chronicle);

  const manaBar = h('i', { style: { background: '#6e9ee0' } });
  const manaTxt = h('span');
  const spellBtns = game.sim.spells.map(({ id, level }, i) => {
    const s = SPELL_BY_ID[id];
    const cd = h('span.cd', { style: { display: 'none' } });
    const b = h(`button.spell${s.target === 'heroes' ? '.heal' : s.target === 'ground' ? '.ground' : ''}`, {
      title: `${s.name}, level ${level} (${s.mana} mana): ${s.description} Click it, then click the map.`,
      'aria-label': s.name,
      html: spellIcon(s.id),
      onclick: (e: Event) => {
        e.stopPropagation();
        view.armedSpell = view.armedSpell === s.id ? null : s.id;
      },
    });
    b.append(h('span.key', String(i + 1)), cd);
    if (level > 1) b.append(h('span.lvl', `L${level}`));
    return { s, b: b as HTMLButtonElement, cd };
  });
  const speedBtns = [1, 4, 16].map((n) => h(`button${game.speed === n ? '.on' : ''}`, { onclick: () => { game.speed = n; speedBtns.forEach((x, i) => x.classList.toggle('on', [1, 4, 16][i] === n)); } }, `×${n}`));
  const bc = h('div.hud.bc',
    ...spellBtns.map((x) => x.b),
    spellBtns.length
      ? h('div.col', { style: { gap: '4px', fontSize: '13px', minWidth: '150px' } }, h('span', { style: { color: '#9ec3f0', fontWeight: '700' } }, manaTxt), h('div.bar', { style: { background: '#2b2f44' } }, manaBar),
          h('span.dim', 'Click discoveries by the trail'))
      : h('div.col', { style: { gap: '4px', fontSize: '13px', maxWidth: '230px' } }, h('b', 'Click discoveries by the trail'),
          h('span.dim', 'Click a discovery by the trail to decide what the party does there.')),
    h('div.col', { style: { gap: '4px', fontSize: '12px' } }, h('span.dim', 'Test speed'), h('div.seg.speed', speedBtns)),
  );

  // With several trips under way: switch which one to watch.
  const switcher = tripCount > 1
    ? h('div.hud.tc.seg', game.state.expeditions.map((e) => h(`button${e.id === ex.id ? '.on' : ''}`, {
        onclick: () => { game.watch(e.id); app.go('expedition'); },
      }, `${e.parties.map((p) => PARTY_NAMES[p]).join(' + ')} · ${REGION_BY_ID[e.regionId].name}`)))
    : null;
  // Far rings: the road out and home, shown over the map.
  const road = h('div.road.panel.col', { style: { display: 'none' } });
  // A discovery's choice: what the party could do there, and who it suits.
  const discCard = h('div.disc-card.panel.col', { style: { display: 'none' } });
  let discOpen: number | null = null;
  // Discoveries the player closed: the Captain decides those, and the card doesn't pop up again.
  const dismissed = new Set<number>();
  const discBar = h('i', { style: { background: '#f1d27a' } });
  const closeDisc = () => {
    discOpen = null;
    discCard.style.display = 'none';
  };
  const openDisc = (findId: number) => {
    const sim = game.sim;
    const f = sim?.finds.find((x) => x.id === findId);
    if (!sim || !f?.disc || f.decided != null) return;
    const d = DISCOVERY_BY_ID[f.disc];
    const party = sim.units.filter((u) => u.side === 'hero' && u.alive && !u.pet && !u.minion);
    const captain = sim.units.find((u) => u.id === sim.captainId);
    const leans = LEANS[captain?.personality ?? 'steady'];
    const capPick = (() => {
      for (const l of leans) {
        const i = d.options.findIndex((o) => o.lean.includes(l));
        if (i >= 0) return i;
      }
      return -1;
    })();
    const choose = (i: number) => {
      game.input({ kind: 'find', findId, choice: i });
      closeDisc();
    };
    discOpen = findId;
    discCard.style.display = '';
    discCard.replaceChildren(
      h('div.row', { style: { alignItems: 'baseline' } }, h('div.section-title.grow', { style: { margin: '0' } }, f.disc === 'nightcamp' ? 'AT THE CAMPFIRE' : 'A DISCOVERY'), h('button.tp-close', { onclick: () => { dismissed.add(findId); closeDisc(); }, title: 'Close (the Captain decides in a moment)' }, '×')),
      h('h3', d.name),
      h('p.muted', { style: { fontSize: '13.5px' } }, d.text),
      ...d.options.map((o, i) => {
        const helped = o.helps && party.some((u) => o.helps!.includes(u.heroClass as never));
        return h('button.disc-opt', { onclick: () => choose(i) },
          h('b', o.label), h('span', o.text),
          o.helpText ? h('span', { style: { color: helped ? '#9fe09a' : '#a8977a', fontSize: '12px' } }, `${helped ? '✓ ' : ''}${o.helpText[0].toUpperCase()}${o.helpText.slice(1)}${helped ? '.' : ' (nobody in this party).'}`) : null);
      }),
      h('button.disc-opt.leave', { onclick: () => choose(-1) }, h('b', 'Leave it'), h('span', 'Walk on by.')),
      h('p.dim', { style: { fontSize: '12px' } }, `If you don't choose in time, ${captain?.name ?? 'the Captain'} decides: ${capPick >= 0 ? `"${d.options[capPick].label}"` : 'walk on by'}.`),
      h('div.bar', { title: 'Until the party gets there' }, discBar));
  };
  view.onDiscovery = openDisc;
  el.append(canvasHost, tl, tr, bc, road, discCard);
  if (switcher) el.append(switcher);
  void view.init();
  (window as unknown as { guildbound: Record<string, unknown> }).guildbound.view = view;

  const onKey = (e: KeyboardEvent) => {
    const idx = Number(e.key) - 1;
    if (spellBtns[idx]) view.armedSpell = view.armedSpell === spellBtns[idx].s.id ? null : spellBtns[idx].s.id;
    if (e.key === 'Escape') view.armedSpell = null;
  };
  window.addEventListener('keydown', onKey);

  const roadBanner = () => {
    const state = game.roadState();
    road.style.display = state === 'adventure' ? 'none' : '';
    if (state === 'adventure') return;
    const left = fmtTime(game.roadLeftSec());
    road.replaceChildren(
      h('div.section-title', { style: { margin: '0' } }, state === 'out' ? 'ON THE ROAD' : 'HEADING HOME'),
      h('h2', state === 'out' ? `Travelling to ${region.name}` : `On the long road home`),
      h('p.muted', state === 'out'
        ? `${region.name} is in ring ${region.ring}, far from Greyford. The party arrives in ${left}; the adventure starts then. Spells and clicks wait until they get there.`
        : `The adventure is over. The party is back in Greyford in ${left}, and the report comes with them.`));
  };

  const hud = () => {
    roadBanner();
    const sim = game.sim;
    if (!sim) return;
    renderRoad();
    if (discOpen != null && sim.finds.find((x) => x.id === discOpen)?.decided != null) closeDisc();
    // A discovery: its card opens once a hero is standing beside it; the party waits a few seconds for the
    // Guildmaster's word before the Captain decides.
    if (discOpen == null && sim.phase === 'out') {
      const next = sim.finds.find((x) => x.disc && x.decided == null && x.reachedAt !== undefined && !dismissed.has(x.id));
      if (next) openDisc(next.id);
    }
    if (discOpen != null) {
      const f = sim.finds.find((x) => x.id === discOpen);
      if (f && f.decideBy !== undefined && f.reachedAt !== undefined) discBar.style.width = `${Math.max(0, Math.min(100, (100 * (f.decideBy - sim.tick)) / Math.max(1, f.decideBy - f.reachedAt)))}%`;
    }
    const left = game.timeLeftSec();
    timeTxt.textContent = sim.phase === 'home' ? `${fmtTime(left)} · heading home` : fmtTime(left);
    timeBar.style.width = `${(100 * sim.tick) / sim.maxTicks}%`;
    goldTxt.textContent = `Gold so far: ${Math.round(sim.gold)}`;
    guideTxt.textContent = `Guidance +${sim.guidance}%`;
    manaTxt.textContent = `Mana ${Math.floor(sim.mana)} / ${MANA_MAX}`;
    if (sim.area.kind !== 'calm') {
      const goal = sim.area.kind === 'infested' ? 'clear the goblin camp on the trail' : sim.area.kind === 'corrupted' ? 'destroy the Gloom Heart' : 'rout the warbands';
      areaLine.textContent = sim.area.cleared ? `${AREA_TEXT[sim.area.kind].name}: cleared! The area will calm down.` : `${AREA_TEXT[sim.area.kind].name}: ${goal} to calm the area.`;
    }
    if (sim.siege) {
      const [title, sub, pct] = siegeStatus(sim);
      siegeTxt.textContent = title;
      siegeSub.textContent = sub;
      siegeBar.style.width = `${Math.max(0, Math.min(1, pct)) * 100}%`;
    }
    manaBar.style.width = `${(100 * sim.mana) / MANA_MAX}%`;
    const boons = (Object.entries(sim.boons ?? {}) as [string, { until: number; mult: number }][]).filter(([, b]) => b.until > sim.tick);
    boonLine.style.display = boons.length ? '' : 'none';
    boonLine.textContent = boons.map(([id, b]) => `✦ ${SPELL_BY_ID[id].name} ${Math.ceil((b.until - sim.tick) / TPS)}s`).join(' · ');
    for (const { s, b, cd } of spellBtns) {
      const wait = Math.max(0, ((sim.spellReadyAt[s.id] ?? 0) - sim.tick) / TPS);
      const blocked = wait > 0 || sim.mana < s.mana;
      b.disabled = blocked;
      cd.style.display = blocked ? 'flex' : 'none';
      cd.textContent = wait > 0 ? `${Math.ceil(wait)}s` : `${s.mana}`;
      b.classList.toggle('armed', view.armedSpell === s.id);
    }
    canvasHost.style.cursor = view.armedSpell ? 'crosshair' : 'default';
    hpGrid.replaceChildren(...sim.units.filter((u) => u.side === 'hero' && !u.pet && !u.minion && !u.freed).flatMap((u) => {
      const pct = u.alive ? u.hp / u.maxHp : 0;
      const col = !u.alive ? '#5a4a38' : pct > 0.6 ? '#6fcb6a' : pct > 0.3 ? '#e0b04a' : '#d8603a';
      return [h('span', { style: { color: u.alive ? undefined : u.fallen ? '#e07a6a' : '#8e7c60' }, title: u.fallen ? 'Fallen: dead unless raised before the trip ends' : '' }, u.fallen ? `☠ ${u.name}` : u.name), h('div.bar', h('i', { style: { width: `${pct * 100}%`, background: col } }))];
    }));
  };
  const timer = window.setInterval(hud, 200);
  hud();

  return {
    el,
    full: true,
    refresh: () => {
      const all = game.state.expeditions;
      // This trip ended, or another one started: rebuild (or leave if nothing is out).
      if (!all.some((e) => e.id === ex.id) || all.length !== tripCount) app.go(all.length ? 'expedition' : 'guild');
      return false;
    },
    destroy: () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      view.destroy();
    },
  };
}
