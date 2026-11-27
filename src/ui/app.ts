import { HERO_BY_ID } from '../core/data/heroes';
import { REGION_BY_ID } from '../core/data/world';
import type { Game } from '../game';
import { fmtTime, h, svgEl } from './dom';
import { defCard, setCardClock } from './card';
import { achievementsScreen } from './screens/achievements';
import { embassyScreen } from './screens/embassy';
import { expeditionScreen } from './screens/expedition';
import { guildScreen } from './screens/guild';
import { heroesScreen } from './screens/heroes';
import { mapScreen } from './screens/map';
import { packsScreen } from './screens/packs';
import { partyScreen } from './screens/party';
import { spellsScreen } from './screens/spells';
import { GATE_ICON, PLACE_NAME, SCREEN_PLACE, townScreen } from './screens/town';
import { buildingSvg } from '../art/buildings';
import * as townCore from '../core/town';
import { unlocked, type Feature } from '../core/unlocks';
import { CLASS_NAMES } from '../core/data/heroes';
import { PARTY_NAMES } from '../core/state';
import { currentStep, TUTORIAL, stepScreen } from '../core/tutorial';
import { season, SEASON_TEXT, TIME_TEXT, timeOfDay, untilChange } from '../core/time';
import { MATERIAL_NAMES } from '../core/data/buildings';
import { tavernPackReady } from '../core/town';
import { totalPacksReady } from '../core/packs';
import { MATERIALS } from '../core/types';

export type ScreenName = 'guild' | 'town' | 'heroes' | 'party' | 'packs' | 'spells' | 'achievements' | 'map' | 'expedition' | 'embassy';

export interface Screen {
  el: HTMLElement;
  /** Called when game state changes. Return false to keep the screen as it is. */
  refresh?: () => boolean | void;
  destroy?: () => void;
  full?: boolean;
}

export class App {
  current: ScreenName = 'guild';
  /** A region the Map should open on (set by other screens). */
  focusRegion: string | null = null;
  private screen: Screen | null = null;
  private top = h('div.topbar');
  private body = h('div.screen');
  private toastBox = h('div.toasts');
  private guide = h('div.guide.panel.col');
  /** The guide folded down to a small button. */
  private guideFolded = false;

  constructor(public game: Game, root: HTMLElement) {
    root.append(this.top, this.body);
    document.body.appendChild(this.toastBox);
    document.body.appendChild(this.guide);
    game.onChange(() => this.onState());
    setInterval(() => this.renderTop(), 500);
    // Wounds on cards show the game's clock; when one heals (or its minutes tick down), redraw the screen.
    setCardClock(() => game.now());
    let wounds = '';
    setInterval(() => {
      const now = game.now();
      const w = game.state.roster.filter((x) => (x.woundedUntil ?? 0) > now).map((x) => `${x.uid}:${Math.ceil(((x.woundedUntil ?? 0) - now) / 60000)}`).join(',');
      if (w !== wounds) {
        wounds = w;
        if (this.current !== 'expedition' && !document.querySelector('.modal-back')) this.screen?.refresh?.();
      }
    }, 2000);
    this.go('town');
  }

  go(name: ScreenName) {
    this.screen?.destroy?.();
    this.current = name;
    this.body.replaceChildren();
    const make = { guild: guildScreen, town: townScreen, heroes: heroesScreen, party: partyScreen, packs: packsScreen, spells: spellsScreen, achievements: achievementsScreen, map: mapScreen, expedition: expeditionScreen, embassy: embassyScreen }[name];
    this.screen = make(this);
    this.body.className = 'screen' + (this.screen.full ? ' full' : '');
    // Every screen is a room in a place in town; the bar on top says where, and leads back out.
    const where = SCREEN_PLACE[name];
    this.body.dataset.place = where?.place ?? 'town';
    if (where && !this.screen.full) this.body.appendChild(this.placeBar(where.place, where.room));
    this.body.appendChild(this.screen.el);
    this.renderTop();
    this.renderGuide();
  }

  /** The tutorial guide: the current step, a way there, and a way out. */
  renderGuide() {
    const s = this.game.state;
    const step = currentStep(s);
    this.guide.style.display = step ? '' : 'none';
    if (!step) {
      this.body.classList.remove('guide-pad');
      return;
    }
    const n = s.tutorial.step + 1;
    if (this.guideFolded) {
      this.guide.className = 'guide folded';
      if (this.guide.parentElement !== document.body) document.body.appendChild(this.guide);
      this.body.classList.remove('guide-pad');
      this.guide.replaceChildren(h('button.btn.small', { onclick: () => { this.guideFolded = false; this.renderGuide(); } }, `Guide · step ${n} of ${TUTORIAL.length}`));
      return;
    }
    const target = stepScreen(step, s);
    const canGo = this.current !== target && (target !== 'expedition' || s.expeditions.length > 0);
    // On the screen the step is about, the guide is a banner at the top of the page, so it never covers
    // the buttons the step asks for. Elsewhere it floats in the corner (higher up on the Watch screen,
    // clear of the spell bar), and the page gets room at the bottom to scroll out from under it.
    const inline = this.current === target && this.current !== 'expedition' && !this.screen?.full;
    this.guide.className = `guide panel col${inline ? ' inline' : this.current === 'expedition' ? ' on-watch' : ''}`;
    if (inline && this.guide.parentElement !== this.body) this.body.prepend(this.guide);
    if (!inline && this.guide.parentElement !== document.body) document.body.appendChild(this.guide);
    this.body.classList.toggle('guide-pad', !inline && this.current !== 'expedition');
    this.guide.replaceChildren(
      h('div.row', { style: { alignItems: 'baseline' } },
        h('div.section-title.grow', { style: { margin: '0' } }, `GUIDE · STEP ${n} OF ${TUTORIAL.length}`),
        h('button.link', { title: 'Fold the guide away', onclick: () => { this.guideFolded = true; this.renderGuide(); } }, 'Hide')),
      h('h3', step.title),
      h('p', { style: { fontSize: '14px', lineHeight: '1.4' } }, step.text),
      h('div.row', { style: { gap: '8px' } },
        canGo ? h('button.btn.small', { onclick: () => this.go(target) }, target === 'guild' && s.reports.length ? 'Read the report' : 'Take me there') : null,
        h('button.btn.secondary.small', { onclick: () => { if (confirm('Skip the tutorial? You still get the starter gear and the gift pack.')) this.game.skipTutorial(); } }, 'Skip tutorial')));
  }

  /** "Greyford › Guild Hall › The Roster", with the way back to town and to the other rooms. */
  private placeBar(place: string, room: string): HTMLElement {
    const lvl = place === 'gate' ? 1 : townCore.level(this.game.state, place);
    const siblings = Object.entries(SCREEN_PLACE).filter(([sc, w]) => w.place === place && sc !== 'expedition' && sc !== this.current
      && (sc !== 'achievements' || unlocked(this.game.state, 'deeds')) && (sc !== 'packs' || unlocked(this.game.state, 'packs')));
    return h('div.place-bar',
      h('button.pb-back', { onclick: () => this.go('town'), title: 'Back to the town' }, h('span.pb-arrow', '◂'), 'Greyford'),
      h('div.pb-art', svgEl(place === 'gate' ? GATE_ICON : buildingSvg(place, Math.max(1, lvl)), 'bldg')),
      h('div.col', { style: { gap: '0' } },
        h('span.pb-place', PLACE_NAME(place)),
        h('span.pb-room', room)),
      siblings.length ? h('div.pb-rooms', siblings.map(([sc, w]) => h('button.pb-room', { onclick: () => this.go(sc as ScreenName) }, w.room))) : null);
  }

  private onState() {
    this.showToasts();
    this.renderTop();
    this.renderGuide();
    if (this.screen?.refresh) {
      if (this.screen.refresh() === false) return;
    } else {
      this.go(this.current);
    }
  }

  /** News waiting its turn: a burst of it is shown three at a time, not all at once. */
  private toastQueue: string[] = [];
  private pumpToasts() {
    const box = this.toastBox;
    while (this.toastQueue.length && box.children.length < 3) {
      const text = this.toastQueue.shift()!;
      const t = h('div.toast', text);
      box.appendChild(t);
      // Longer news (something new opening up) stays long enough to read.
      const ms = Math.min(11000, 4000 + text.length * 45);
      setTimeout(() => { t.style.opacity = '0'; }, ms);
      setTimeout(() => {
        t.remove();
        this.pumpToasts();
      }, ms + 600);
    }
  }

  /** Shows new toasts, and announces prestige class unlocks. */
  showToasts() {
    const game = this.game;
    while (game.toasts.length) this.toastQueue.push(game.toasts.shift()!);
    this.pumpToasts();
    // A secret hero who joined gets a proper announcement.
    while (game.joined.length) {
      const d = game.joined.shift()!;
      const close = modal(h('div.panel.col', { style: { alignItems: 'center', gap: '12px', textAlign: 'center', maxWidth: '420px' } },
        h('div.section-title', { style: { margin: '0' } }, 'A SECRET HERO'),
        h('h2', `${d.name} ${d.title} has joined the guild`),
        h('p.muted', `Word of what the guild did reached ${d.name}. ${d.name} can now also turn up in packs.`),
        h('p', { style: { fontStyle: 'italic' } }, `“${d.quote}”`),
        defCard(d, { ribbon: { text: 'NEW', kind: 'new' } }),
        h('div', h('button.btn', { onclick: () => close() }, 'Welcome'))));
    }
    // A prestige class unlock gets a proper announcement.
    while (game.earned.length) {
      const e = game.earned.shift()!;
      if (!e.def.reward.unlocks || !e.hero) continue;
      const cls = CLASS_NAMES[e.def.reward.unlocks];
      const close = modal(h('div.panel.col', { style: { alignItems: 'center', gap: '12px', textAlign: 'center', maxWidth: '420px' } },
        h('div.section-title', { style: { margin: '0' } }, 'ACHIEVEMENT · ' + e.def.name.toUpperCase()),
        h('h2', `The ${cls} class is unlocked`),
        h('p.muted', `${cls} heroes can now appear in packs. ${e.hero.name} has joined the guild to show how it is done.`),
        defCard(e.hero, { ribbon: { text: 'NEW', kind: 'new' } }),
        h('div', h('button.btn', { onclick: () => close() }, 'Excellent'))));
    }
  }

  renderTop() {
    const s = this.game.state;
    const open = (f: Feature) => unlocked(s, f);
    // The tab the guide points at pulses.
    const step = currentStep(s);
    const hint = step ? stepScreen(step, s) : undefined;
    const tab = (name: ScreenName, label: string, badge?: number | string) =>
      h(`button.medal${this.current === name ? '.active' : ''}${hint === name && this.current !== name ? '.hint' : ''}`, { onclick: () => this.go(name), title: label },
        h('span.medal-ico', { html: NAV_ICON[name] }), h('span.medal-lbl', label), badge ? h('span.badge', String(badge)) : null);
    // One chip per trip under way, and one for parties that are back.
    const many = this.game.partiesUnlocked() > 1;
    const chips = s.expeditions.map((ex) => h('button.exp-chip', {
      title: `${ex.parties.map((p) => PARTY_NAMES[p]).join(' and ')} · ${REGION_BY_ID[ex.regionId].name}`,
      onclick: () => { this.game.watch(ex.id); this.go('expedition'); },
    }, h('span.dot'), // With several trips the chips stay short: party and time (the region is in the tooltip).
    many && s.expeditions.length > 1
      ? `${ex.parties.map((p) => ROMAN[p]).join('+')} · ${fmtTime(this.game.timeLeftSec(ex.id))}`
      : `${many ? ex.parties.map((p) => ROMAN[p]).join('+') + ' · ' : ''}${REGION_BY_ID[ex.regionId].name} · ${fmtTime(this.game.timeLeftSec(ex.id))}`));
    // Scouts on the way.
    for (const m of s.scouting) {
      const who = s.roster.find((x) => x.uid === m.uid);
      chips.push(h('button.exp-chip', { title: `${who ? HERO_BY_ID[who.defId].name : 'A scout'} is ${m.open ? 'scouting' : 'searching'} ${REGION_BY_ID[m.regionId].name}`, onclick: () => { this.focusRegion = m.regionId; this.go('map'); } },
        h('span.dot', { style: { background: '#9ec3f0' } }), `${who ? HERO_BY_ID[who.defId].name : 'Scout'} · ${fmtTime(Math.max(0, m.endsAt - this.game.now()) / 1000)}`));
    }
    if (s.reports.length) chips.push(h('button.exp-chip', { onclick: () => this.go('guild') }, h('span.dot', { style: { background: '#f1d27a' } }), s.reports.length > 1 ? `${s.reports.length} reports waiting` : 'Party returned!'));
    const packsReady = totalPacksReady(s);
    this.top.replaceChildren(
      h('div.brand', { onclick: () => this.go('town'), title: 'Back to Greyford' }, h('span.brand-crest', { html: BRAND_CREST }), 'GUILDBOUND'),
      h('nav.nav',
        tab('town', 'Greyford', tavernPackReady(s, this.game.now()) ? '1' : undefined),
        tab('guild', 'Guild Hall', s.reports.length ? '!' : undefined),
        tab('heroes', 'Heroes'),
        tab('party', 'Party'),
        open('packs') ? tab('packs', 'Packs', s.pendingReveal ? '!' : packsReady || undefined) : null,
        open('spells') ? tab('spells', 'Spells') : null,
        open('deeds') ? tab('achievements', 'Deeds') : null,
        tab('map', 'Map'),
        s.expeditions.length ? tab('expedition', 'Watch') : null,
      ),
      h('div.res',
        ...chips,
        open('clock') ? clock(this.game.now()) : null,
        h('span.item', h('span.coin'), h('span.num', s.gold.toLocaleString()), h('span.lbl', 'Gold')),
        // Materials appear as the guild starts collecting them: only the ones it has had so far.
        open('materials') ? h('span.item.mat', { title: MATERIALS.map((m) => `${MATERIAL_NAMES[m]} ${s.materials[m]}`).join(', ') },
          MATERIALS.filter((m) => s.materials[m] > 0 || s.tripsCompleted >= 4).map((m) => h('span', { style: { marginLeft: '8px' }, title: MATERIAL_NAMES[m] }, h('span', { style: { color: MAT_COLOR[m], fontWeight: '700' } }, '■ '), String(s.materials[m])))) : null,
        s.essence ? h('span.item', { title: `Essence: ${s.essence}` }, h('span', { style: { color: '#c9a0ff' } }, '◆'), h('span.num', s.essence), h('span.lbl', 'Essence')) : null,
        s.shards ? h('span.item', { title: `Starshards: ${s.shards} (they awaken heroes past their star cap)` }, h('span', { style: { color: '#b9d8ff' } }, '✦'), h('span.num', s.shards), h('span.lbl', 'Starshards')) : null,
      ),
    );
  }
}

const ROMAN = ['I', 'II', 'III'];

const BRAND_CREST = '<svg viewBox="0 0 40 46"><path d="M2 2H38V20C38 34 20 44 20 44C20 44 2 34 2 20Z" fill="#3D6178" stroke="#E2B84A" stroke-width="3"/><path d="M11 11L29 29M29 11L11 29" stroke="#F2E6CC" stroke-width="3.6" stroke-linecap="round"/><circle cx="20" cy="20" r="4" fill="#E2B84A" stroke="#2A1A10" stroke-width="1.4"/></svg>';

/** Little engraved icons for the medallions in the top bar. */
const NAV_ICON: Record<ScreenName, string> = {
  embassy: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-3 4 3 4H5" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  town: '<svg viewBox="0 0 24 24"><path d="M2 21V12l3-2 3 2V8l4-5 4 5v4l3-2 3 2v9z" fill="currentColor"/><path d="M10 21v-5a2 2 0 0 1 4 0v5" fill="#2A1A10"/></svg>',
  guild: '<svg viewBox="0 0 24 24"><path d="M3 2h18v9c0 6-9 11-9 11S3 17 3 11z" fill="currentColor"/><path d="M8 7l8 8M16 7l-8 8" stroke="#2A1A10" stroke-width="2.2" stroke-linecap="round"/></svg>',
  heroes: '<svg viewBox="0 0 24 24"><path d="M4 15a8 8 0 0 1 16 0v6h-5v-6h-6v6H4z" fill="currentColor"/><path d="M12 3v4M9 15h6" stroke="#2A1A10" stroke-width="2"/></svg>',
  party: '<svg viewBox="0 0 24 24"><path d="M4 3l11 11M20 3L9 14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M13 16l4 4M11 16l-4 4M15 12l3 3M9 12l-3 3" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  packs: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="11" height="16" rx="2" fill="currentColor" transform="rotate(-10 8 13)"/><rect x="10" y="3" width="11" height="16" rx="2" fill="currentColor" stroke="#2A1A10" stroke-width="1.6"/><circle cx="15.5" cy="11" r="2.6" fill="#2A1A10"/></svg>',
  spells: '<svg viewBox="0 0 24 24"><path d="M3 5c3-2 6-2 9 0c3-2 6-2 9 0v15c-3-2-6-2-9 0c-3-2-6-2-9 0z" fill="currentColor"/><path d="M12 5v15" stroke="#2A1A10" stroke-width="1.6"/><path d="M7 9l1 2l2 .5l-2 .5l-1 2l-1-2l-2-.5l2-.5z" fill="#2A1A10"/></svg>',
  achievements: '<svg viewBox="0 0 24 24"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3c0 4 2 5 4 5M17 5h4c0 4-2 5-4 5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10 13h4l1 5h-6z M7 21h10v-3H7z" fill="currentColor"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M2 5l6-2 8 3 6-2v15l-6 2-8-3-6 2z" fill="currentColor"/><path d="M8 3v15M16 6v15" stroke="#2A1A10" stroke-width="1.4"/><path d="M10 10l2 2m0-2l-2 2" stroke="#8E2B23" stroke-width="1.8"/></svg>',
  expedition: '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="#2A1A10"/><circle cx="13.4" cy="10.6" r="1.2" fill="currentColor"/></svg>',
};

/** The world clock in the top bar: day or night (and how long until it turns), and the season. */
function clock(now: number): HTMLElement {
  const t = timeOfDay(now);
  const sn = season(now);
  const mins = Math.ceil(untilChange(now) / 60000);
  return h('span.item.clock', { title: [t === 'night' ? TIME_TEXT.night.effect : 'Day. Night falls every hour for 15 minutes.', `${SEASON_TEXT[sn].name}: ${SEASON_TEXT[sn].effect}`].join(' · ') },
    h('span', { style: { color: t === 'night' ? '#9ec3f0' : '#f1d27a' } }, `${TIME_TEXT[t].icon} ${mins}m`),
    h('span', { style: { marginLeft: '6px', color: '#c8b8a0' } }, SEASON_TEXT[sn].icon));
}

const MAT_COLOR = { wood: '#b07a45', stone: '#a99c7e', iron: '#9aa1a8', herbs: '#7fa35a', hides: '#c08a5a' } as const;

export function modal(content: HTMLElement, onClose?: () => void): () => void {
  const back = h('div.modal-back');
  // Escape closes the window on top.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && back.isConnected && back === [...document.querySelectorAll('.modal-back')].pop()) close();
  };
  const close = () => {
    document.removeEventListener('keydown', onKey);
    back.remove();
    onClose?.();
  };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', (e) => {
    if (e.target === back) close();
  });
  back.appendChild(h('div.modal', content));
  document.body.appendChild(back);
  return close;
}
