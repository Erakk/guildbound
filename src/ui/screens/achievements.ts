import { portraitOnlySvg } from '../../art/portraits';
import { ACHIEVEMENTS, unlockedClasses } from '../../core/achievements';
import { CLASS_NAMES, CLASS_TEXT, HEROES, TRIBE_NAMES } from '../../core/data/heroes';
import { PACKS } from '../../core/data/packs';
import { PRESTIGE_CLASSES, type PrestigeClass } from '../../core/types';
import type { App, Screen } from '../app';
import { discoverySvg } from '../../art/discoveries';
import { BIOME_LABEL, journalBiomes, journalPage } from '../../core/journal';
import type { Biome, GameState } from '../../core/types';
import { h, svgEl } from '../dom';

/** The field journal: every discovery seen, page by page for each kind of land the guild has explored. */
function journalSection(s: GameState): HTMLElement | null {
  const biomes = journalBiomes(s);
  if (!biomes.length || !(s.journal ?? []).length) return null;
  const page = (b: Biome) => {
    const p = journalPage(s, b);
    return h(`div.panel.col.journal-page${p.done ? '.done' : ''}`, { style: { gap: '8px' } },
      h('div.row', { style: { alignItems: 'baseline', gap: '8px' } }, h('h3.grow', BIOME_LABEL[b]), h('span.muted', `${p.seen.size} / ${p.all.length}`)),
      h('div.journal-finds', p.all.map((d) => p.seen.has(d.id)
        ? h('div.jf', { title: `${d.name}: ${d.text}` }, svgEl(discoverySvg(d.id), 'jf-art'), h('span', d.name))
        : h('div.jf.unknown', { title: 'Not seen yet' }, h('div.jf-q', '?'), h('span', '???')))),
      h('span', { style: { fontSize: '13px', color: p.done ? '#6fcb6a' : '#a8977a' } }, p.done ? 'Complete: +10% gold on trips to this kind of land.' : 'Fill the page for +10% gold on trips to this kind of land.'));
  };
  return h('div.col', { style: { gap: '10px' } },
    h('div.section-title', 'FIELD JOURNAL'),
    h('p.muted', { style: { marginTop: '-8px' } }, 'Every discovery the guild has come across, by kind of land. The orders\' focus changes what turns up.'),
    h('div.journal-grid', biomes.map(page)));
}

export function achievementsScreen(app: App): Screen {
  const el = h('div.col', { style: { gap: '18px', maxWidth: '1180px' } });

  const render = () => {
    const s = app.game.state;
    const open = unlockedClasses(s);
    const progressBar = (cur: number, goal: number, done: boolean) =>
      h('div.col', { style: { gap: '3px' } },
        h('div.bar', h('i', { style: { width: `${Math.min(100, (100 * cur) / goal)}%`, background: done ? '#6fcb6a' : undefined } })),
        h('span.dim', { style: { fontSize: '12px' } }, done ? 'Done' : `${Math.min(cur, goal).toLocaleString()} / ${goal.toLocaleString()}`));

    const prestigeCard = (cls: PrestigeClass) => {
      const a = ACHIEVEMENTS.find((x) => x.reward.unlocks === cls)!;
      const unlocked = open.has(cls);
      const heroes = HEROES.filter((d) => d.heroClass === cls);
      const face = heroes[0];
      return h(`div.panel.col.prestige${unlocked ? '.open' : ''}`, { style: { gap: '8px' } },
        svgEl(portraitOnlySvg(face, { silhouette: !unlocked }), 'portrait'),
        h('div.row.wrap', { style: { alignItems: 'baseline', gap: '4px 8px' } }, h('h3.grow', CLASS_NAMES[cls]), h('span', { style: { color: unlocked ? '#6fcb6a' : '#a8977a', fontSize: '13px', fontWeight: '700' } }, unlocked ? 'UNLOCKED' : 'LOCKED')),
        h('p.muted', { style: { fontSize: '14px' } }, CLASS_TEXT[cls]),
        h('div', { style: { fontSize: '14px' } }, h('b', `${a.name}: `), a.description),
        progressBar(a.progress(s), a.goal, unlocked),
        a.hint && !unlocked ? h('span', { style: { color: '#e0b04a', fontSize: '13px' } }, a.hint) : null,
        h('span.dim', { style: { fontSize: '12px' } }, unlocked
          ? `In packs now: ${heroes.map((d) => `${d.name} (${TRIBE_NAMES[d.tribe]})`).join(', ')}`
          : `${heroes.length} heroes, from the ${[...new Set(heroes.map((d) => TRIBE_NAMES[d.tribe]))].join(', ')}. The first unlock brings one of them free.`),
      );
    };

    const row = (a: (typeof ACHIEVEMENTS)[number]) => {
      const done = s.achievements.includes(a.id);
      const pack = PACKS[a.reward.packType ?? 'recruit'].name;
      const reward = a.reward.unlocks ? `Unlocks the ${CLASS_NAMES[a.reward.unlocks]} class` : a.reward.gold ? `${a.reward.gold} gold` : `${a.reward.packs === 1 ? 'A' : a.reward.packs} ${pack}${(a.reward.packs ?? 0) > 1 ? 's' : ''}`;
      return h(`div.ach${done ? '.done' : ''}`,
        h('span.tick', done ? '✓' : ''),
        h('div.col.grow', { style: { gap: '2px' } }, h('b', a.name), h('span.muted', { style: { fontSize: '14px' } }, a.description)),
        h('div', { style: { width: '180px' } }, progressBar(a.progress(s), a.goal, done)),
        h('span.reward', reward));
    };

    el.replaceChildren(
      h('div.row', { style: { alignItems: 'baseline' } }, h('h1.grow', 'Achievements'), h('span.muted', `${s.achievements.length} of ${ACHIEVEMENTS.length} earned`)),
      h('div.section-title', 'PRESTIGE CLASSES'),
      h('p.muted', { style: { marginTop: '-8px' } }, 'Four classes are not in any pack at first. Earn the deed to unlock one; from then on its heroes appear in packs at the normal rates for their rarity.'),
      h('div.prestige-grid', PRESTIGE_CLASSES.map(prestigeCard)),
      journalSection(s) ?? '',
      h('div.section-title', 'ALL ACHIEVEMENTS'),
      h('div.panel.col', { style: { gap: '0', padding: '4px 16px' } }, ACHIEVEMENTS.map(row)),
    );
  };
  render();
  return { el, refresh: () => render() };
}
