import { TRIBE_BONUS, TRIBE_NAMES } from '../../core/data/heroes';
import { REGION_BY_ID } from '../../core/data/world';
import { def, power } from '../../core/heroes';
import { heroByUid, MAX_PARTIES, PARTY_NAMES, PARTY_UNLOCK, partyOf } from '../../core/state';
import { captainStyle, captainText } from '../../core/data/captains';
import { heroStrength } from '../../core/town';
import type { Row, Tribe } from '../../core/types';
import type { App, Screen } from '../app';
import { heroCard } from '../card';
import { h, setChildren } from '../dom';
import { heroDetail } from './heroes';
import { unlocked as isOpen } from '../../core/unlocks';
import type { HeroInstance } from '../../core/types';

export function partyScreen(app: App): Screen {
  const el = h('div.col', { style: { gap: '18px', maxWidth: '1180px' } });
  let selected = 0;
  // Which party is being edited.
  let current = 0;
  // Drag and drop: the hero being dragged, and from which slot (null: from the bench).
  let dragging: { uid: string; slot: number | null } | null = null;
  // State changes during a drag wait until it ends, so the card under the mouse isn't rebuilt.
  let pending = false;

  const draggable = (el: HTMLElement, uid: string, slot: number | null) => {
    el.draggable = true;
    el.classList.add('draggable');
    el.addEventListener('dragstart', (e) => {
      dragging = { uid, slot };
      e.dataTransfer?.setData('text/plain', uid);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => el.classList.add('dragging'));
    });
    el.addEventListener('dragend', () => {
      dragging = null;
      el.classList.remove('dragging');
      el.ownerDocument.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));
      if (pending) {
        pending = false;
        render();
      }
    });
    return el;
  };
  type Drag = { uid: string; slot: number | null };
  const dropTarget = (el: HTMLElement, accepts: (d: Drag) => boolean, onDrop: (d: Drag) => void) => {
    el.addEventListener('dragover', (e) => {
      if (!dragging || !accepts(dragging)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', (e) => {
      if (!el.contains(e.relatedTarget as Node | null)) el.classList.remove('drag-over');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const d = dragging;
      dragging = null;
      if (d && accepts(d)) onDrop(d);
    });
    return el;
  };

  const render = () => {
    const game = app.game;
    const s = game.state;
    const unlocked = game.partiesUnlocked();
    if (current >= unlocked) current = 0;
    const party = s.parties[current];
    const trip = game.expeditionOf(current);
    const away = !!trip;
    const members = party.slots.map((u) => heroByUid(s, u));
    const tribes = new Map<Tribe, number>();
    for (const m of members) if (m) tribes.set(def(m).tribe, (tribes.get(def(m).tribe) ?? 0) + 1);
    // Party power counts gear, as on the Map.
    const total = members.reduce((sum, m) => sum + (m ? heroStrength(s, m) : 0), 0);
    const front = members.filter((m, i) => m && party.rows[i] === 'front').length;
    const back = members.filter((m, i) => m && party.rows[i] === 'back').length;

    const tabs = h('div.seg.party-tabs', Array.from({ length: MAX_PARTIES }, (_, p) => {
      const out = game.expeditionOf(p);
      const locked = p >= unlocked;
      return h(`button${p === current ? '.on' : ''}`, {
        disabled: locked,
        title: locked ? `Raise the Guild Hall to level ${PARTY_UNLOCK[p]} to lead this party` : '',
        onclick: () => { current = p; selected = 0; render(); },
      }, PARTY_NAMES[p], h('span.dim', { style: { fontSize: '12px', marginLeft: '6px' } }, locked ? `· Guild Hall ${PARTY_UNLOCK[p]}` : out ? '· out' : `· ${s.parties[p].slots.filter(Boolean).length}/5`));
    }));

    const rowToggle = (i: number) => h('div.seg', { style: { width: '100%' } },
      (['front', 'back'] as Row[]).map((r) => h(`button${party.rows[i] === r ? '.on' : ''}`, {
        style: { flex: '1' }, disabled: away,
        onclick: (e: Event) => { e.stopPropagation(); game.setRow(current, i, r); },
      }, r === 'front' ? 'Front' : 'Back')));

    /** The hero window, with the party's own buttons. */
    const details = (hero: HeroInstance) => heroDetail(app, hero, (close) => {
      if (away || game.isAway(hero.uid)) return [];
      const at = party.slots.indexOf(hero.uid);
      if (at >= 0) {
        return [
          party.captain !== hero.uid ? h('button.btn.small', { onclick: () => { game.setCaptain(current, hero.uid); close(); } }, 'Make Captain') : null,
          h('button.btn.secondary.small', { onclick: () => { game.setPartySlot(current, at, null); close(); } }, `Take out of ${PARTY_NAMES[current]}`),
        ];
      }
      const empty = party.slots[selected] === null ? selected : party.slots.findIndex((p) => p === null);
      const target = empty >= 0 ? empty : selected;
      const out = members[target];
      return [h('button.btn.small', { onclick: () => { game.setPartySlot(current, target, hero.uid); close(); } },
        out ? `Swap in for ${def(out).name}` : `Add to ${PARTY_NAMES[current]} (slot ${target + 1})`)];
    });

    const slot = (i: number) => {
      const m = members[i];
      // (A wounded hero's card says so itself, with the time left.)
      const card = m ? heroCard(m, { small: true, onClick: () => details(m) }) : null;
      if (card && m && !away) draggable(card, m.uid, i);
      const el = h('div.slot5', {
        style: { borderColor: selected === i ? '#c9a24a' : undefined },
        onclick: () => { selected = i; render(); },
      },
      h('span.label', `Slot ${i + 1}${m && party.captain === m.uid ? ' · Captain' : ''}`),
      card ?? h('div.empty', selected === i ? 'Drag a hero here' : 'Empty'),
      rowToggle(i),
      m && !away ? h('div.row', { style: { gap: '6px', justifyContent: 'center' } },
        h('button.btn.secondary.small', { onclick: (e: Event) => { e.stopPropagation(); game.setPartySlot(current, i, null); } }, 'Remove'),
        party.captain !== m.uid ? h('button.btn.secondary.small', { title: `As Captain: ${captainText(m.defId)}`, onclick: (e: Event) => { e.stopPropagation(); game.setCaptain(current, m.uid); } }, 'Captain') : null) : null);
      // Drop a hero here: from another slot they swap places; from the bench they take the slot.
      if (!away) dropTarget(el, (d) => d.slot !== i, (d) => { selected = i; game.setPartySlot(current, i, d.uid); });
      return el;
    };

    const preview = () => {
      const lane = (row: Row) => members.map((m, i) => (m && party.rows[i] === row ? def(m).name : null)).filter(Boolean).join(' · ') || 'nobody';
      const note = front === 0 && back > 0
        ? 'All in the back: strong at range, but enemies reach them with nobody holding the line.'
        : back === 0 && front > 0
          ? 'All in the front: a solid wall, slow to kill anything at range.'
          : 'Enemies go for the front row first; the back row is safer.';
      return h('div.panel.col', { style: { gap: '6px' } },
        h('div.section-title', { style: { margin: '0' } }, 'FORMATION (party walks left to right)'),
        h('div', h('b', 'Front row: '), h('span.muted', lane('front'))),
        h('div', h('b', 'Back row: '), h('span.muted', lane('back'))),
        h('span.dim', { style: { fontSize: '14px' } }, note),
        (() => {
          const cap = members.find((m) => m && m.uid === party.captain) ?? members.find(Boolean);
          if (!cap) return null;
          const style = captainStyle(cap.defId);
          return h('div', { style: { fontSize: '14px', borderTop: '1px solid #4a3626', paddingTop: '6px' } },
            h('b', 'Captain: '), `${def(cap).name} · `, h('span', { style: { color: ({ great: '#6fcb6a', good: '#a8d878', mixed: '#e0b04a', poor: '#e07a6a', plain: '#c8b8a0' })[style.grade] } }, captainText(cap.defId)),
            h('div.dim', { style: { fontSize: '12px' } }, 'Every hero leads differently. Some are born to it; some should never be asked.'));
        })());
    };

    // The bench: everyone not in this party. Heroes in another party at home can be moved over.
    const bench = s.roster.filter((r) => !party.slots.includes(r.uid)).sort((a, b) => {
      const pa = partyOf(s, a.uid) >= 0 ? 1 : 0;
      const pb = partyOf(s, b.uid) >= 0 ? 1 : 0;
      return pa - pb || power(b) - power(a);
    });
    setChildren(el,
      h('div.row', { style: { alignItems: 'baseline', gap: '14px' } }, h('h1.grow', 'Parties'), h('span.muted', `${PARTY_NAMES[current]} power ${total}`)),
      unlocked > 1 || isOpen(s, 'parties') ? tabs : null,
      unlocked < MAX_PARTIES && isOpen(s, 'parties') ? h('p.dim', { style: { fontSize: '14px', margin: '-6px 0 0' } }, `Raise the Guild Hall to level ${PARTY_UNLOCK[unlocked]} to lead ${PARTY_NAMES[unlocked]} as well: two parties on two trips at once, or both together against a fortress.`) : null,
      trip ? h('div.panel', h('p', `${PARTY_NAMES[current]} is out at ${REGION_BY_ID[trip.regionId].name}${trip.parties.length > 1 ? `, together with ${trip.parties.filter((p) => p !== current).map((p) => PARTY_NAMES[p]).join(' and ')}` : ''}. You can change it when they are back.`)) : null,
      h('p.muted', 'Drag heroes between the slots to swap them, from the bench into a slot, or back to the bench to take them out. Click a card to see everything about the hero. Front or back row, in any mix.'),
      h('div.formation5', [0, 1, 2, 3, 4].map(slot)),
      h('h2', 'Bench'),
      dropTarget(h('div.bench-drop',
        bench.length
          ? h('div.grid-cards', bench.map((hero) => {
              const other = partyOf(s, hero.uid);
              const heroAway = game.isAway(hero.uid);
              const card = heroCard(hero, {
                small: true,
                dim: away || heroAway,
                ribbon: heroAway ? { text: 'On expedition', kind: 'away' } : other >= 0 ? { text: `In ${PARTY_NAMES[other]}`, kind: 'copy' } : undefined,
                onClick: () => details(hero),
              });
              return away || heroAway ? card : draggable(card, hero.uid, null);
            }))
          : h('p.dim', 'Everyone you own is already in this party. Open packs to recruit more.')),
      // Dropped on the bench: out of the party.
      (d) => d.slot !== null && !away, (d) => game.setPartySlot(current, d.slot!, null)),
      preview(),
      !isOpen(s, 'tribes') ? null : h('div.panel.col', { style: { gap: '4px' } },
        h('div', h('b', 'Tribes: '), h('span.muted', [...tribes].map(([t, n]) => `${TRIBE_NAMES[t]} ${n}`).join(' · ') || 'none')),
        ...[...tribes].filter(([, n]) => n >= 3).map(([t, n]) => h('div', { style: { color: '#f1d27a', fontSize: '14px' } },
          `${n} ${TRIBE_NAMES[t]}: ${TRIBE_BONUS[t].three}${n === 5 ? ' · Five together: ' + TRIBE_BONUS[t].five : ''}`)),
        [...tribes.values()].every((n) => n < 3) ? h('span.dim', { style: { fontSize: '13px' } }, 'Three of one tribe unlock their map ability; five of one tribe add a bigger bonus.') : null),
    );
  };
  render();
  return {
    el,
    refresh: () => {
      if (dragging) pending = true;
      else render();
    },
  };
}
