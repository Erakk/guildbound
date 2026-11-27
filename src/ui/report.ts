import { MATERIAL_NAMES } from '../core/data/buildings';
import { ITEM_BY_ID } from '../core/data/items';
import { PACKS, PACK_TYPES, type PackType } from '../core/data/packs';
import { REGION_BY_ID } from '../core/data/world';
import { def } from '../core/heroes';
import { heroByUid, PARTY_NAMES } from '../core/state';
import type { App } from './app';
import { modal } from './app';
import { heroCard } from './card';
import { holdGain, holdNeed, holdOf, secured } from '../core/hold';
import type { ExpeditionReport } from '../core/types';
import { heroDetail } from './screens/heroes';
import { h, setChildren } from './dom';
import { GOAL_INFO } from '../core/sim/encounters';

export const SIEGE_STAGE = { approach: 'Approach', breach: 'Breach', horde: 'Horde', keep: 'Keep', won: 'Won' } as const;

const append = (el: HTMLElement, ...c: (Node | null)[]) => el.append(...c.filter((x): x is Node => !!x));

/** Shows a waiting expedition report (the oldest, or the given one); "Collect" applies rewards and shows level-ups. */
export function showReport(app: App, id?: number) {
  const reports = app.game.state.reports;
  const r = id === undefined ? reports[0] : reports.find((x) => x.id === id) ?? reports[0];
  if (!r) return;
  const who = (r.parties ?? [0]).map((p) => PARTY_NAMES[p]).join(' and ');
  const region = REGION_BY_ID[r.regionId];
  const body = h('div.panel.parch.col');
  const close = modal(body);
  const collect = () => {
    const party = Object.keys(r.heroHpPct);
    const knocked = party.filter((u) => r.heroHpPct[u] <= 0).map((u) => { const x = heroByUid(app.game.state, u); return x ? def(x).name : ''; });
    const levels = app.game.claimReport(r.id);
    const more = app.game.state.reports.length;
    setChildren(body,
      h('h2', 'Rewards collected'),
      h('p.muted', `+${r.gold} gold${r.chestCards ? ' and a sealed chest (a whole Recruit Pack)' : ''}${r.shards ? `, ${r.shards} Starshard${r.shards > 1 ? 's' : ''}` : ''}. Every hero gained XP (half for those knocked out). Materials, items and pack pieces are in town.`),
      knocked.length ? h('p', { style: { color: '#e07a6a' } }, `${knocked.join(', ')} ${knocked.length === 1 ? 'is' : 'are'} wounded and must rest (or be healed at the Temple) before the next trip.`) : null,
      h('div.grid-cards', party.map((uid) => {
        const hero = heroByUid(app.game.state, uid);
        if (!hero) return null;
        const up = levels[uid];
        return heroCard(hero, { small: true, onClick: () => heroDetail(app, hero), ribbon: up ? { text: `Level up! +${up}`, kind: 'up' } : undefined });
      })),
      more
        ? h('div.row', h('button.btn', { onclick: () => { close(); showReport(app); } }, `Next report (${more})`), h('button.btn.secondary', { onclick: close }, 'Close'))
        : h('div.row', h('button.btn', { onclick: () => { close(); app.go('map'); } }, 'Send them out again'), h('button.btn.secondary', { onclick: close }, 'Close')),
    );
  };
  const hpLine = Object.entries(r.heroHpPct).map(([uid, pct]) => {
    const hero = heroByUid(app.game.state, uid);
    return hero ? `${def(hero).name} ${pct > 0 ? pct + '%' : 'knocked out'}` : '';
  }).filter(Boolean).join(' · ');
  append(body,
    h('div.section-title', { style: { color: '#7a5a2e' } }, `EXPEDITION REPORT · ${who.toUpperCase()}`),
    h('h2', r.outcome === 'returned' ? `Back from ${region.name}` : `Retreat from ${region.name}`),
    h('div.stat-tiles',
      h('div', h('b', r.gold), h('span', 'Gold')),
      h('div', h('b', r.xp), h('span', 'XP each')),
      h('div', h('b', r.enemiesDefeated), h('span', 'Foes defeated')),
      h('div', h('b', `+${r.guidancePct}%`), h('span', `Guidance (${r.findsCollected} finds)`)),
    ),
    r.knockouts ? h('p', { style: { color: '#8e2b23', fontWeight: '700' } },
      `${r.knockouts.count === 1 ? 'A hero was' : `${r.knockouts.count} heroes were`} knocked out. Carrying ${r.knockouts.count === 1 ? 'them' : 'them all'} home cost ${r.knockouts.lostPct}% of the haul: gold, materials, pack pieces and items were left behind.`) : null,
    r.goal ? h('p', { style: { color: r.goal.done ? '#3f7a2a' : '#8a6a3a', fontWeight: '700' } },
      `Goal: ${GOAL_INFO[r.goal.kind].name}. ${r.goal.done ? 'Done, and paid for.' : 'Not this time.'}`) : null,
    lootLine(r),
    holdReport(app, r),
    r.legendary ? h('p', { style: { color: '#7a5a12', fontWeight: '700' } },
      `A Legendary chest! ${r.legendary.shards} Starshard${r.legendary.shards > 1 ? 's' : ''}${r.legendary.item ? ` and ${ITEM_BY_ID[r.legendary.item].name}, named gear: “${ITEM_BY_ID[r.legendary.item].lore}”` : '.'}`) : null,
    r.site ? h('p', { style: { color: r.site.cleared ? '#2e6a2a' : '#8e2b23', fontWeight: '700' } },
      r.site.cleared ? `${r.site.name[0].toUpperCase() + r.site.name.slice(1)}: dealt with!` : `${r.site.name[0].toUpperCase() + r.site.name.slice(1)} is still there. Another party can try again.`) : null,
    r.conditions ? h('p', { style: { color: '#5a4630', fontSize: '14px' } },
      `${r.conditions.time === 'night' ? 'Set out by night' : 'Set out by day'} in ${r.conditions.season}.${r.conditions.event ? ` On the road: ${r.conditions.event === 'merchant' ? 'a travelling merchant' : r.conditions.event === 'rivals' ? 'a rival company' : 'a sudden storm'}.` : ''}`) : null,
    r.siege ? h('p', { style: { color: r.siege.won ? '#2e6a2a' : '#8e2b23', fontWeight: '700' } },
      r.siege.won
        ? `Siege won! ${r.siege.kind === 'dragonmaw' ? `Kalvorax the Elder Wyrm is slain: ${r.siege.sealed ?? 3} altars broken, ${r.siege.hordeDefeated} of her brood and her cultists defeated${r.siege.bolts ? `, ${r.siege.bolts} ballista bolts loosed` : ''}.` : r.siege.kind === 'cinder_legion' ? `The Cinder Legion is broken: ${r.siege.hordeDefeated} of its ranks defeated, ${r.siege.doused ?? 0} fires put out.` : r.siege.kind === 'barrow_uprising' ? `${r.siege.sealed ?? 4} tomb seals broken, ${r.siege.hordeDefeated} of the risen put back in the ground.` : `${r.siege.campsCleared} camps cleared on the way, ${r.siege.waves} waves held at the gate, ${r.siege.hordeDefeated} of the horde defeated.${r.siege.freed ? ` ${r.siege.freed} prisoners freed.` : ''}`} It stays quiet for two weeks.`
        : `The siege failed at the ${SIEGE_STAGE[r.siege.stage].toLowerCase()} stage. The fortress still stands; try again with a stronger party, more spells, or the camps cleared first.`) : null,
    h('div.section-title', { style: { color: '#7a5a2e', marginTop: '6px' } }, 'CHRONICLE'),
    h('div.report-lines', r.chronicle.map((l) => h('div', l))),
    h('p.muted', { style: { fontSize: '14px' } }, hpLine),
    r.fallen?.length ? h('p', { style: { color: '#8e2b23', fontWeight: '700' } },
      `☠ Fallen in ${region.name}: ${r.fallen.map((uid) => { const x = heroByUid(app.game.state, uid); return x ? def(x).name : '?'; }).join(', ')}. They will not come home. Their names will be carved in the Hall of the Fallen.`) : null,
    r.feathersUsed?.length ? h('p', { style: { color: '#7a5a2e' } },
      `A Phoenix Feather burned to save ${r.feathersUsed.map((uid) => { const x = heroByUid(app.game.state, uid); return x ? def(x).name : '?'; }).join(', ')}.`) : null,
    h('div.row', h('button.btn', { onclick: collect }, 'Collect rewards')),
  );
}

function lootLine(r: { materials: Record<string, number | undefined>; items: string[]; pieces?: Partial<Record<PackType, number>>; chestCards: number; shards?: number }): HTMLElement | null {
  const mats = Object.entries(r.materials).filter(([, n]) => (n ?? 0) > 0).map(([m, n]) => `${n} ${MATERIAL_NAMES[m as keyof typeof MATERIAL_NAMES].toLowerCase()}`);
  const items = r.items.map((id) => ITEM_BY_ID[id]?.name).filter(Boolean);
  const pieces = PACK_TYPES.filter((t) => (r.pieces?.[t] ?? 0) > 0).map((t) => `${r.pieces![t]} ${PACKS[t].name}`);
  if (r.chestCards) pieces.push('a sealed chest (a whole Recruit Pack)');
  if (!mats.length && !items.length && !pieces.length && !r.shards) return null;
  const lines: (HTMLElement | string)[][] = [];
  if (mats.length) lines.push([h('b', 'Materials: '), mats.join(', ')]);
  if (items.length) lines.push([h('b', 'Found: '), items.join(', ')]);
  if (pieces.length) lines.push([h('b', 'Pack pieces: '), pieces.join(', ')]);
  if (r.shards) lines.push([h('b', { style: { color: '#3e5a8e' } }, 'Starshards: '), `${r.shards} (they awaken heroes past their star cap)`]);
  return h('p', { style: { color: '#3b2a1c' } }, lines.flatMap((l, i) => (i ? [h('br'), ...l] : l)));
}

/** What the trip did for the guild's hold on the area. */
function holdReport(app: App, r: ExpeditionReport): HTMLElement | null {
  const s = app.game.state;
  const region = REGION_BY_ID[r.regionId];
  if (!region || region.siege) return null;
  const g = holdGain(r);
  const need = holdNeed(region);
  if (secured(s, r.regionId)) return null;
  const after = Math.min(need, holdOf(s, r.regionId) + g.total);
  return h('p', { style: { color: after >= need ? '#3c6e2a' : '#5a4632', fontWeight: after >= need ? '700' : '400' } },
    g.total
      ? `Hold on ${region.name}: +${g.total} (${g.parts.join(', ')}), now ${after} / ${need}.${after >= need ? ' Secured: scouts can map the land beyond.' : ''}`
      : `No hold gained on ${region.name}: the party turned back.`);
}
