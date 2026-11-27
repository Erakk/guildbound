import { HERO_BY_ID } from '../../core/data/heroes';
import { AREA_TEXT } from '../../core/areas';
import { REGION_BY_ID } from '../../core/data/world';
import { PACKS } from '../../core/data/packs';
import { totalPacksReady } from '../../core/packs';
import { BOARD_SIZE, rewardText } from '../../core/quests';
import { nextGoals } from '../../core/tutorial';
import { MAX_PARTIES, PARTY_NAMES, PARTY_UNLOCK, partyHeroes } from '../../core/state';
import type { App, Screen } from '../app';
import { heroCard } from '../card';
import { fmtTime, h, setChildren } from '../dom';
import { showReport } from '../report';
import { unlocked as isOpen, type Feature } from '../../core/unlocks';
import { packTypesShown } from './packs';
import { heroDetail } from './heroes';

export function guildScreen(app: App): Screen {
  const el = h('div.col', { style: { gap: '20px', maxWidth: '1180px' } });
  let timer = 0;

  /** What one party is doing, with the button that fits. */
  const partyStatus = (p: number) => {
    const game = app.game;
    const s = game.state;
    if (p >= game.partiesUnlocked()) {
      return h('div.col',
        h('h3', `${PARTY_NAMES[p]}: not founded yet`),
        h('p.muted', `Raise the Guild Hall to level ${PARTY_UNLOCK[p]} to lead a second party. Two trips at once, or both together against a fortress.`),
        h('div', h('button.btn.secondary', { onclick: () => app.go('town') }, 'Go to the Town')));
    }
    const report = s.reports.find((r) => r.parties?.includes(p));
    const ex = game.expeditionOf(p);
    const together = (parties: number[]) => (parties.length > 1 ? ` (with ${parties.filter((x) => x !== p).map((x) => PARTY_NAMES[x]).join(' and ')})` : '');
    if (report) {
      return h('div.col',
        h('h3', `${PARTY_NAMES[p]} is back!`),
        h('p.muted', `Returned from ${REGION_BY_ID[report.regionId].name}${together(report.parties ?? [p])} with ${report.gold} gold.`),
        h('div', h('button.btn', { onclick: () => showReport(app, report.id) }, 'Read the report')));
    }
    if (ex) {
      return h('div.col',
        h('h3', `${PARTY_NAMES[p]}: out in ${REGION_BY_ID[ex.regionId].name}${together(ex.parties)}`),
        h('p.muted', { 'data-time': String(ex.id) }, timeText(app, ex.id)),
        h('div', h('button.btn', { onclick: () => { game.watch(ex.id); app.go('expedition'); } }, 'Watch')));
    }
    const members = partyHeroes(s, p);
    return h('div.col',
      h('h3', `${PARTY_NAMES[p]} is resting in the hall`),
      h('p.muted', members.length ? `${members.length} heroes ready. Pick a destination on the map.` : 'Nobody is in this party yet. Fill it on the Party screen.'),
      h('div.row', { style: { gap: '8px' } },
        h('button.btn', { onclick: () => app.go('map'), disabled: !!game.dispatchBlock(undefined, [p]) }, 'Choose a destination'),
        h('button.btn.secondary', { onclick: () => app.go('party') }, 'Edit party')));
  };

  /** Trouble in the Marches: troubled areas, with a link to each on the map. */
  const troubles = () => {
    const areas = Object.entries(app.game.state.areas);
    if (!areas.length) return null;
    return h('div.panel.col', { style: { gap: '8px' } },
      h('div.section-title', { style: { margin: '0' } }, 'TROUBLE IN THE MARCHES'),
      ...areas.map(([id, a]) => h('div.row', { style: { alignItems: 'center', gap: '12px' } },
        h('div.grow', h('b', `${REGION_BY_ID[id].name}: ${AREA_TEXT[a.kind].name}. `), h('span.muted', AREA_TEXT[a.kind].short)),
        h('button.btn.secondary.small', { onclick: () => { app.focusRegion = id; app.go('map'); } }, 'Show on map'))),
      h('span.dim', { style: { fontSize: '13px' } }, 'Clear the trouble on a trip to calm the area and shield its neighbours. Left alone, it spreads.'));
  };

  /** After the tutorial: where to go next, until it's done. */
  const goals = () => {
    const s = app.game.state;
    const list = s.tutorial.done ? nextGoals(s) : [];
    return list.length ? [h('div.panel.parch.col', { style: { gap: '4px' } },
      h('div.section-title', { style: { margin: '0', color: '#7a5a2e' } }, 'NEXT GOALS'),
      ...list.map((g) => h('div', { style: { color: '#3b2a1c' } }, '• ', g)))] : [];
  };

  /** The Hall of the Fallen: heroes who died in skull regions. */
  const fallen = () => {
    const m = app.game.state.memorial;
    if (!m.length) return [];
    return [h('div.panel.col', { style: { gap: '6px' } },
      h('div.section-title', { style: { margin: '0' } }, 'HALL OF THE FALLEN'),
      ...[...m].reverse().map((p) => h('div.row', { style: { gap: '10px', alignItems: 'baseline' } },
        h('span', { style: { color: '#e8e0d0' } }, '☠'),
        h('b', `${p.name} ${p.title}`),
        h('span.dim', { style: { fontSize: '13px' } }, `${p.rarity}, ${p.stars}★, level ${p.level} · fell in ${REGION_BY_ID[p.regionId]?.name ?? 'the wilds'}`))))];
  };

  /** The quest board: contracts that pay in packs. */
  /** Scouts on the way, and what came back lately. */
  const scouts = () => {
    const s = app.game.state;
    const now = app.game.now();
    const news = [...s.scoutLog].reverse().slice(0, 5);
    return h('div.panel.col', { style: { gap: '6px' } },
      h('div.row', { style: { alignItems: 'baseline' } }, h('div.section-title.grow', { style: { margin: '0' } }, 'SCOUTS'),
        h('button.btn.secondary.small', { onclick: () => app.go('map') }, 'Send a scout')),
      s.scouting.length
        ? h('div.col', { style: { gap: '2px' } }, s.scouting.map((m) => {
            const who = s.roster.find((x) => x.uid === m.uid);
            return h('div', { style: { fontSize: '14px', color: '#9ec3f0' } }, `${who ? HERO_BY_ID[who.defId].name : 'A scout'} is ${m.open ? 'mapping' : 'searching'} ${REGION_BY_ID[m.regionId].name}: back in ${fmtTime((m.endsAt - now) / 1000)}.`);
          }))
        : h('p.dim', { style: { fontSize: '14px' } }, 'No scouts out. Rangers, Rogues and Beastmasters map new land and find camps, lairs, dungeons, caches and shrines in known land.'),
      ...news.map((n) => h('div', { style: { fontSize: '13px', color: n.ok ? '#c8b8a0' : '#e0907a' } }, n.text)));
  };

  const questBoard = () => {
    const q = app.game.state.quests;
    if (!app.game.state.tutorial.done) {
      return h('div.panel.col', h('div.section-title', { style: { margin: '0' } }, 'QUEST BOARD'),
        h('span.muted', 'The quest board opens once the guide is done. Contracts pay in packs.'));
    }
    const left = Math.max(0, q.nextAt - app.game.now()) / 1000;
    return h('div.panel.col', { style: { gap: '4px' } },
      h('div.row', { style: { alignItems: 'baseline' } }, h('div.section-title.grow', { style: { margin: '0' } }, 'QUEST BOARD'), h('span.dim', { style: { fontSize: '13px' } }, `${q.done} contracts done`)),
      ...q.active.map((c) => h('div.quest',
        h('div.col.grow', { style: { gap: '4px' } },
          h('b', c.title), h('span.muted', { style: { fontSize: '14px' } }, c.text),
          c.need > 1 ? h('div.row', { style: { gap: '8px', alignItems: 'center' } }, h('div.bar', { style: { width: '200px' } }, h('i', { style: { width: `${(100 * c.progress) / c.need}%` } })), h('span.dim', { style: { fontSize: '12px' } }, `${c.progress} / ${c.need}`)) : null),
        h('span.reward', `Reward: ${rewardText(c.reward)}`),
        h('button.btn.secondary.small', { title: 'Drop this contract; a new one is posted later', onclick: () => app.game.abandonQuest(c.id) }, 'Drop'))),
      q.active.length < BOARD_SIZE ? h('span.dim', { style: { fontSize: '13px', paddingTop: '6px' } }, `A new contract is posted in ${fmtTime(left)}.`) : null,
      h('span.dim', { style: { fontSize: '13px' } }, 'Contracts count what your parties do on expeditions, and pay in packs.'));
  };

  const render = () => {
    const s = app.game.state;
    const unlocked = app.game.partiesUnlocked();
    const open = (f: Feature) => isOpen(s, f);
    setChildren(el, 
      h('div.panel.parch.col',
        h('div.section-title', { style: { color: '#7a5a2e' } }, 'GREYFORD · GUILD HALL'),
        h('h1', { style: { color: '#2b1f14' } }, s.tripsCompleted ? 'Welcome back, Guildmaster' : 'Welcome, Guildmaster'),
        h('p.muted', 'Recruit heroes from card packs, send your parties into the wild, and spend what they bring home.'),
      ),
      h('div.row.wrap',
        // Parties the guild can lead, and (once the Guild Hall grows) the next one it could found.
        ...Array.from({ length: MAX_PARTIES }, (_, p) => p).filter((p) => p < unlocked || (p === unlocked && open('parties'))).map((p) => h('div.panel.grow', { style: { minWidth: '320px', opacity: p < unlocked ? '1' : '0.75' } },
          h('div.section-title', PARTY_NAMES[p].toUpperCase()), partyStatus(p))),
        open('packs') ? h('div.panel', { style: { width: '260px' } },
          h('div.section-title', 'CARD PACKS'),
          h('p.muted', totalPacksReady(s) ? `${totalPacksReady(s)} pack${totalPacksReady(s) > 1 ? 's' : ''} ready to open.` : 'No pack ready yet. Pieces come from chests and glints.'),
          h('div.col', { style: { gap: '2px', fontSize: '13px', marginTop: '6px' } },
            packTypesShown(s).map((t) => h('span.dim', `${PACKS[t].name}: ${s.pieces[t]} / ${PACKS[t].pieces} pieces${s.packs[t] ? ` · ${s.packs[t]} whole` : ''}`))),
          h('div', { style: { marginTop: '12px' } }, h('button.btn', { onclick: () => app.go('packs') }, 'Open packs')),
        ) : null,
      ),
      ...Array.from({ length: unlocked }, (_, p) => {
        const members = partyHeroes(s, p);
        const ex = app.game.expeditionOf(p);
        return h('div.panel.col',
          h('div.row', { style: { alignItems: 'center' } }, h('div.section-title.grow', { style: { margin: '0' } }, PARTY_NAMES[p].toUpperCase())),
          members.length
            ? h('div.grid-cards', members.map((hero) => heroCard(hero, { small: true, onClick: () => heroDetail(app, hero), ribbon: ex ? { text: 'On expedition', kind: 'away' } : undefined })))
            : h('p.dim', 'Empty.'));
      }),
      ...goals(),
      open('scouting') ? scouts() : null,
      open('contracts') ? questBoard() : null,
      ...[open('troubles') ? troubles() : null].filter((x): x is HTMLElement => !!x),
      ...fallen(),
      h('p.dim', `${s.roster.length} heroes recruited · ${s.tripsCompleted} expeditions · ${s.packsOpened} ${s.packsOpened === 1 ? 'pack' : 'packs'} opened`),
      h('div', h('button.btn.secondary.small', { onclick: () => { if (confirm('Start over? This deletes your save.')) app.game.resetSave(); } }, 'Start a new game')),
    );
  };

  render();
  if (app.game.state.reports.length) setTimeout(() => showReport(app), 300);
  timer = window.setInterval(() => {
    for (const t of el.querySelectorAll<HTMLElement>('[data-time]')) t.textContent = timeText(app, Number(t.dataset.time));
  }, 500);
  return {
    el,
    refresh: () => {
      render();
      if (app.game.state.reports.length && !document.querySelector('.modal-back')) showReport(app);
    },
    destroy: () => clearInterval(timer),
  };
}

function timeText(app: App, id: number): string {
  return `${fmtTime(app.game.timeLeftSec(id))} until they are back. The trip keeps going while the game is closed.`;
}
