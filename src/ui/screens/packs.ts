import { PACKS, PACK_TYPES, type PackType } from '../../core/data/packs';
import { loadCards, packsReady, PITY_RARE, RANK, type PackCard } from '../../core/packs';
import type { App, Screen } from '../app';
import type { GameState, Tribe } from '../../core/types';
import { TRIBE_NAMES } from '../../core/data/heroes';
import { defCard, spellCard } from '../card';
import { h, setChildren } from '../dom';

/** The light that pours out of a torn pack, by the best card inside. */
const BURST: Record<string, string> = { common: '#f1d27a', rare: '#e8eef4', epic: '#f1d27a', legendary: '#c9a2f0' };
const SEAL: Record<PackType, string> = { novice: 'N', recruit: 'R', grimoire: 'G', veteran: 'V', champion: 'C' };

/** Pack types worth showing: ones the guild has pieces or packs of, or has opened before. */
export function packTypesShown(s: GameState): PackType[] {
  const shown = PACK_TYPES.filter((t) => s.packs[t] > 0 || s.pieces[t] > 0 || (s.opened?.[t] ?? 0) > 0);
  return shown.length ? shown : ['novice'];
}

/** The pack art, coloured by type. */
export function packArt(type: PackType, cls = ''): HTMLElement {
  const c = PACKS[type].color;
  return h(`div.pack${cls}`, { style: { background: `radial-gradient(circle at 50% 35%, ${c}, #1e140e 75%)` } }, h('div.seal', SEAL[type]));
}

export function packsScreen(app: App): Screen {
  const el = h('div.col', { style: { gap: '18px', maxWidth: '1180px' } });
  let busy = false;

  const idle = () => {
    const s = app.game.state;
    setChildren(el, 
      h('div.row', { style: { alignItems: 'baseline' } }, h('h1.grow', 'Card packs'), h('span.muted', `${s.packsOpened} opened`)),
      h('p.muted', s.tripsCompleted < 3
        ? 'Gold doesn\'t buy packs. Each pack is put together from its own pieces, found in chests and in glints the Guildmaster clicks on expeditions. The Tavern gives one now and then.'
        : 'Gold doesn\'t buy packs. Each pack is put together from its own pieces, found in chests, in glints the Guildmaster clicks, on secret paths and in won battles. Contracts on the quest board, sealed chests, the Tavern and achievements give whole packs. Rarer packs need more pieces.'),
      h('div.pack-grid', packTypesShown(s).map((type) => {
        const def = PACKS[type];
        const whole = s.packs[type];
        const pieces = s.pieces[type];
        const ready = packsReady(s, type);
        const shown = Math.min(pieces, def.pieces);
        return h('div.panel.col.pack-tile', { style: { alignItems: 'center', gap: '10px' } },
          packArt(type, ready ? '' : '.locked'),
          h('h3', def.name),
          h('div.col', { style: { width: '100%', gap: '4px' } },
            h('div.row', { style: { justifyContent: 'space-between', fontSize: '14px' } }, h('span', 'Pieces'), h('b', `${pieces} / ${def.pieces}`)),
            h('div.bar', h('i', { style: { width: `${(shown / def.pieces) * 100}%`, background: def.color } }))),
          h('span.dim', { style: { fontSize: '13px', textAlign: 'center', minHeight: '54px' } }, def.description),
          h('button.btn', { disabled: !ready, onclick: () => open(type) },
            ready ? `Open${ready > 1 ? ` (${ready})` : ''}` : 'Not enough pieces'),
          h('span.dim', { style: { fontSize: '12px' } }, whole ? `${whole} whole pack${whole > 1 ? 's' : ''} waiting` : pieces >= def.pieces ? 'Enough pieces to put one together' : `${def.pieces - pieces} more piece${def.pieces - pieces > 1 ? 's' : ''} needed`));
      })),
      packTypesShown(s).includes('recruit') ? h('p.dim', { style: { fontSize: '13px' } }, `Recruit Packs: a Rare or better within every ${PITY_RARE} (${PITY_RARE - s.pity.sinceRare} to go).`) : null,
    );
  };

  const open = (type: PackType) => {
    if (busy) return;
    const cards = app.game.openPack(type);
    if (!cards) return;
    busy = true;
    const best = cards.reduce((m, c) => Math.max(m, RANK[c.rarity]), 0);
    const glow = best >= 4 ? 'legendary' : best >= 3 ? 'epic' : best >= 2 ? 'rare' : '';
    const pack = packArt(type, `.shake${glow ? '.glow-' + glow : ''}`);
    pack.append(h('div.pack-strip'), h('div.pack-light'));
    pack.style.setProperty('--burst', BURST[glow || 'common']);
    const line = h('p.muted', glow ? 'Something shines inside…' : 'The seal cracks…');
    el.replaceChildren(h('h1', 'Opening…'), h('div.panel.pack-stage', pack, line));
    setTimeout(() => { pack.classList.add('torn'); line.textContent = 'Torn open!'; }, 1000);
    setTimeout(() => reveal(cards, type), 1700);
  };

  const reveal = (cards: PackCard[], type: PackType, flipped: number[] = [], tribe?: Tribe) => {
    let opened = flipped.length;
    const again = !tribe && packsReady(app.game.state, type) > 0;
    const packName = tribe ? `${TRIBE_NAMES[tribe]} Tribe Pack` : PACKS[type].name;
    const finish = () => {
      app.game.finishReveal();
      busy = false;
    };
    const done = h('div.row', { style: { justifyContent: 'center', visibility: opened === cards.length ? 'visible' : 'hidden' } },
      again ? h('button.btn', { onclick: () => { finish(); open(type); } }, `Open another ${PACKS[type].name}`) : null,
      h('button.btn.secondary', { onclick: () => { finish(); idle(); } }, 'Done'));
    const flips = cards.map((c, i) => {
      const ribbon = c.result === 'new' ? { text: 'NEW', kind: 'new' as const }
        : c.result === 'copy' ? { text: '+1 copy', kind: 'copy' as const }
          : c.result === 'training' ? { text: c.levels ? `Drill: level up${c.levels > 1 ? ` ×${c.levels}` : ''}!` : `Drill: +${c.xp} XP`, kind: 'up' as const }
          : c.result === 'level' ? { text: `Level ${c.kind === 'spell' ? c.level : ''}!`, kind: 'up' as const }
            : { text: '+1 Essence', kind: 'ess' as const };
      const face = c.kind === 'spell' ? spellCard(c.spell, undefined, { ribbon }) : defCard(c.def, { ribbon });
      // Every card is dealt at the pack's own size, its back in the pack's colours.
      const f = h('div.flip', h('div.face', h('div.back', h('div.seal', SEAL[type])), h('div.front', face)));
      f.style.setProperty('--pack-c', PACKS[type].color);
      // Cards already turned over before the Guildmaster stepped away stay face up.
      if (flipped.includes(i)) f.classList.add('open', 'instant');
      else {
        // Dealt in from the pack; the animation is taken off once the card lands (a lingering one flattens the 3D flip).
        f.classList.add('deal');
        f.style.setProperty('--i', String(i));
        f.addEventListener('animationend', (ev) => { if ((ev as AnimationEvent).animationName === 'deal') f.classList.remove('deal'); });
      }
      f.addEventListener('click', () => {
        if (f.classList.contains('open')) return;
        f.classList.add('open');
        if (RANK[c.rarity] >= RANK.rare) setTimeout(() => f.classList.add(`burst-${c.rarity}`), 220);
        if (c.rarity === 'legendary') {
          const flash = h('div.pack-flash');
          document.body.append(flash);
          setTimeout(() => flash.remove(), 900);
        }
        app.game.revealCard(i);
        opened++;
        if (opened === cards.length) {
          done.style.visibility = 'visible';
          app.game.tutorialFlag('packOpened');
        }
      });
      return f;
    });
    setChildren(el, 
      h('div.row', { style: { alignItems: 'baseline' } }, h('h1.grow', `Your ${packName}`),
        h('button.btn.secondary.small', { onclick: () => flips.filter((f) => !f.classList.contains('open')).forEach((f, i) => setTimeout(() => f.click(), i * 180)) }, 'Reveal all')),
      flipped.length ? h('p', { style: { color: 'var(--gold-bright)' } }, 'You left this pack half revealed. Here it is, just as you left it.') : null,
      h('p.muted', type === 'novice' ? 'Click each card to turn it over. A new recruit, if there is one, is always last.' : 'Click each card to turn it over. The best card is always last.'),
      h('div.reveal-row', flips),
      done,
    );
  };

  // A pack opened earlier and not fully revealed: pick it up where it was left.
  const pending = app.game.state.pendingReveal;
  if (pending) {
    busy = true;
    reveal(loadCards(pending.cards), pending.type, pending.flipped, pending.tribe);
  } else idle();
  return { el, refresh: () => (busy ? false : idle()) };
}
