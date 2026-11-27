import { spellIcon } from '../../art/spells';
import { SPELLS, SPELL_BY_ID } from '../../core/data/spells';
import { RANK } from '../../core/packs';
import { slotCount } from '../../core/spells';
import type { App, Screen } from '../app';
import { spellCard } from '../card';
import { h } from '../dom';

const MAX_SLOTS = 5;

export function spellsScreen(app: App): Screen {
  const el = h('div.col', { style: { gap: '18px', maxWidth: '1180px' } });

  const render = () => {
    const game = app.game;
    const s = game.state;
    const slots = slotCount(s);
    const owned = Object.keys(s.spells).length;

    const slotBox = (i: number) => {
      if (i >= slots) {
        return h('div.spellslot.locked', h('span.key', String(i + 1)), h('span.dim', i === slots ? 'Build or upgrade the Mage Tower for another slot' : 'Mage Tower slot'));
      }
      const id = s.spellbook[i];
      const sp = id ? SPELL_BY_ID[id] : undefined;
      if (!sp) return h('div.spellslot.empty', h('span.key', String(i + 1)), h('span.dim', 'Empty: click a spell below'));
      return h('div.spellslot',
        h('span.key', String(i + 1)),
        h('span.icon', { html: spellIcon(sp.id, 30) }),
        h('div.col.grow', { style: { gap: '0' } }, h('b', sp.name), h('span.dim', { style: { fontSize: '12px' } }, `Level ${s.spells[id].level} · ${sp.mana} mana`)),
        h('div.row.slot-btns', { style: { gap: '4px' } },
          h('button.btn.secondary.small', { title: 'Earlier hotkey', disabled: i === 0, onclick: () => game.moveSpell(id, -1) }, '◀'),
          h('button.btn.secondary.small', { title: 'Later hotkey', disabled: i >= s.spellbook.length - 1, onclick: () => game.moveSpell(id, 1) }, '▶'),
          h('button.btn.secondary.small', { title: 'Take it out of the spellbook', onclick: () => game.unequipSpell(id) }, '✕')));
    };

    const list = [...SPELLS].sort((a, b) => RANK[a.rarity] - RANK[b.rarity]);
    const full = s.spellbook.length >= slots;
    el.replaceChildren(
      h('div.row', { style: { alignItems: 'baseline' } }, h('h1.grow', 'Spellbook'), h('span.muted', `${owned} of ${SPELLS.length} spells found`)),
      h('p.muted', 'Spell cards come from packs (Grimoires above all). Pick which spells the Guildmaster takes on expeditions; the number keys cast them in this order. Duplicates raise a spell\'s level, and each level makes it about 20% stronger. Common spells are blessings (more gold, materials or XP for a while); battle magic is rarer.'),
      slots === 0 ? h('p', { style: { color: '#f1d27a' } }, 'The spellbook is closed: build the Mage Tower in Town to take spells on expeditions. Spell cards you find before then wait here.') : '',
      h('div.panel.col', { style: { gap: '10px' } },
        h('div.section-title', { style: { margin: '0' } }, `SPELLS FOR THE NEXT TRIP (${s.spellbook.length} / ${slots} slots)`),
        h('div.spellslots', Array.from({ length: MAX_SLOTS }, (_, i) => slotBox(i))),
        s.expeditions.length ? h('span.dim', { style: { fontSize: '13px' } }, 'Parties already out took their spells with them. Changes here apply to the next trip.') : null),
      h('h2', 'Collection'),
      h('div.grid-cards', list.map((sp) => {
        const mine = s.spells[sp.id];
        if (!mine) return spellCard(sp, undefined, { locked: true });
        const slot = s.spellbook.indexOf(sp.id);
        return spellCard(sp, mine, {
          ribbon: slot >= 0 ? { text: `Slot ${slot + 1}`, kind: 'away' } : undefined,
          dim: slot < 0 && full,
          onClick: () => (slot >= 0 ? game.unequipSpell(sp.id) : game.equipSpell(sp.id)),
        });
      })),
      h('p.dim', { style: { fontSize: '13px' } }, full ? 'Every slot is in use. Click a spell in a slot to take it out first.' : 'Click a spell to put it in a free slot; click it again to take it out.'),
    );
  };
  render();
  return { el, refresh: () => render() };
}
