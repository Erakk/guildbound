// The Envoys' Hall (the Embassy): one desk per tribe. Open a tribe's embassy, then win its reputation with
// trips and tribe quests; milestones bring Tribe Packs, the tribe's gear recipe and its Legend chain.

import { HERO_BY_ID, TRIBE_NAMES } from '../../core/data/heroes';
import { ITEM_BY_ID } from '../../core/data/items';
import { MATERIAL_NAMES } from '../../core/data/buildings';
import { REGION_BY_ID } from '../../core/data/world';
import * as emb from '../../core/embassy';
import type { Cost, Tribe } from '../../core/types';
import type { App, Screen } from '../app';
import { h, setChildren } from '../dom';

const TRIBE_COLOR: Record<Tribe, [string, string]> = {
  freeholders: ['#E7D9A4', '#9CB25E'], thornkin: ['#C4D49C', '#4F7A3A'], ironroot: ['#B7C0CA', '#5E646B'], ashborn: ['#E9A272', '#7A3A28'],
  fenfolk: ['#A9C8B8', '#3E6E5E'], moonveil: ['#9C8AC0', '#2E2846'], dawnwings: ['#FFF1C4', '#E0B45A'], hollowed: ['#6E6888', '#24202E'],
};

function costText(c: Cost): string {
  return Object.entries(c).filter(([, v]) => v).map(([k, v]) => (k === 'gold' ? `${v} gold` : `${v} ${(MATERIAL_NAMES as Record<string, string>)[k]?.toLowerCase() ?? k}`)).join(', ');
}

function standing(rep: number): string {
  const m = [...emb.MILESTONES].reverse().find((x) => rep >= x.at);
  return m ? m.name : rep > 0 ? 'Known' : 'Stranger';
}

export function embassyScreen(app: App): Screen {
  const el = h('div.col', { style: { gap: '16px', maxWidth: '1180px' } });

  const render = () => {
    const s = app.game.state;
    const slots = emb.embassySlots(s);
    const opened = s.embassies ?? [];
    const card = (t: Tribe) => {
      const [light, dark] = TRIBE_COLOR[t];
      const name = TRIBE_NAMES[t];
      const kin = s.roster.filter((x) => HERO_BY_ID[x.defId]?.tribe === t).length;
      const home = REGION_BY_ID[emb.TRIBE_HOME[t]]?.name ?? '';
      const head = h('div.emb-head', { style: { background: `linear-gradient(90deg, ${dark}, ${light})` } }, h('b', name), h('span', home ? `Home: ${home}` : ''));
      if (!emb.embassyOpen(s, t)) {
        const block = emb.openBlock(s, t);
        return h('div.panel.col.emb-card.closed', head,
          h('p.dim', { style: { fontSize: '13px', margin: '0' } }, `You have ${kin} ${name} hero${kin === 1 ? '' : 'es'}. Opening their embassy costs ${costText(emb.embassyCost(s, t))}.`),
          h('button.btn.small', { disabled: !!block, title: block ?? '', onclick: () => { app.game.openEmbassy(t); render(); } }, 'Open the embassy'),
          block && block !== 'Not enough gold or materials.' ? h('span.dim', { style: { fontSize: '12px' } }, block) : null);
      }
      const rep = emb.rep(s, t);
      const task = emb.nextTask(s, t);
      const packs = emb.tribePacks(s, t);
      const gear = ITEM_BY_ID[emb.TRIBE_GEAR[t]];
      const gearBlock = emb.gearBlock(s, t);
      const legend = emb.legendStep(s, t);
      const ticks = emb.MILESTONES.map((m) => h(`span.emb-tick${rep >= m.at ? '.on' : ''}`, { style: { left: `${m.at}%` }, title: `${m.name} (${m.at}): ${m.text}` }));
      return h('div.panel.col.emb-card', head,
        h('div.row', { style: { alignItems: 'baseline', gap: '8px' } }, h('b', standing(rep)), h('span.grow.dim', { style: { fontSize: '13px' } }, `${rep} / ${emb.REP_MAX} reputation`)),
        h('div.emb-bar', h('i', { style: { width: `${rep}%`, background: dark } }), ...ticks),
        h('div.dim', { style: { fontSize: '12px' } }, emb.MILESTONES.map((m) => `${rep >= m.at ? '✓' : '○'} ${m.name} ${m.at}`).join('  ·  ')),
        h('div.col', { style: { gap: '2px' } }, h('b', { style: { fontSize: '14px' } }, task.title), h('span', { style: { fontSize: '13px' } }, task.text),
          h('span.dim', { style: { fontSize: '12px' } }, `You have ${kin} ${name} hero${kin === 1 ? '' : 'es'}${kin < 5 ? `: ${5 - kin} more needed for a tribe quest` : ''}. Any trip home with 3 or more of them: +2.`)),
        rep >= emb.MILESTONES[2].at ? h('span', { style: { fontSize: '13px', color: '#e2b84a' } }, `Legend: ${legend} of 3 trials. It ends with ${emb.legendHero(s, t).name}.`) : null,
        h('div.row', { style: { gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          h('button.btn.small', { disabled: packs <= 0 || !!s.pendingReveal, onclick: () => { if (app.game.openTribePack(t)) app.go('packs'); } }, packs ? `Open a Tribe Pack (${packs})` : 'No Tribe Packs yet'),
          h('span.dim', { style: { fontSize: '12px' } }, `${emb.packFromTribe(s, t)} of 5 cards are ${name}.`)),
        h('div.row', { style: { gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #4a3626', paddingTop: '8px' } },
          h('div.grow.col', { style: { gap: '1px' } }, h('b', { style: { fontSize: '13px' } }, gear.name),
            h('span.dim', { style: { fontSize: '12px' } }, gear.lore ?? ''),
            h('span.dim', { style: { fontSize: '12px' } }, gearBlock && gearBlock.startsWith('Teaches') ? gearBlock : `Costs ${costText(emb.gearCost(t))}.`)),
          h('button.btn.small', { disabled: !!gearBlock, title: gearBlock ?? '', onclick: () => { app.game.craftTribeGear(t); render(); } }, 'Craft')));
    };
    setChildren(el,
      h('div.row', { style: { alignItems: 'baseline' } }, h('h1.grow', 'The Envoys\' Hall'), h('span.muted', `Envoys: ${opened.length} of ${slots}`)),
      h('p.muted', { style: { margin: '0' } }, 'Each tribe\'s envoy watches what the guild does for their people. Trips with three or more of a tribe win a little reputation; a tribe quest (five of the tribe, home safe from their land) wins more and a Tribe Pack. At Friend, Tribe Packs hold more of the tribe; at Ally, the tribe teaches its gear; at Kin, the Legend chain opens.'),
      h('div.emb-grid', [...opened, ...emb.TRIBES.filter((t) => !opened.includes(t))].map(card)));
  };
  render();
  return { el, refresh: () => render() };
}
