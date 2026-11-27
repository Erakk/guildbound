import { CLASS_NAMES, CLASS_TEXT, HERO_BY_ID, PERSONALITY_TEXT, TRIBE_NAMES } from '../../core/data/heroes';
import { ascendBlock, ascendCost, AWAKEN_COST, awakenBlock, canAscend, def, levelCap, MAX_AWAKENING, maxStars, power, signatureUnlocked, stats, xpToNext } from '../../core/heroes';
import type { GameState, Material } from '../../core/types';
import { MATERIAL_NAMES } from '../../core/data/buildings';
import type { HeroInstance, Rarity } from '../../core/types';
import type { App, Screen } from '../app';
import { modal } from '../app';
import { heroCard, stars, woundLeft } from '../card';
import { equipmentPanel } from '../equipment';
import { captainStyle, captainText } from '../../core/data/captains';
import { isScout } from '../../core/scouting';
import { HEROES } from '../../core/data/heroes';
import { defCard } from '../card';
import { gearDefs, healCost, heroStrength, isWounded } from '../../core/town';
import { heroCombat } from '../../core/sim/expedition';
import { h, setChildren } from '../dom';
import { unlocked } from '../../core/unlocks';

const RANK: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };

export function heroesScreen(app: App): Screen {
  const el = h('div.col', { style: { gap: '18px' } });
  const render = () => {
    const s = app.game.state;
    const list = [...s.roster].sort((a, b) => RANK[def(a).rarity] - RANK[def(b).rarity] || power(b) - power(a));
    el.replaceChildren(
      h('div.row', { style: { alignItems: 'baseline', gap: '14px' } }, h('h1.grow', 'Heroes'),
        s.shards ? h('span', { style: { color: '#b9d8ff' } }, `✦ ${s.shards} Starshard${s.shards > 1 ? 's' : ''}`) : null,
        h('span.muted', `${s.roster.length} recruited`)),
      (unlocked(s, 'secrets') ? secretsPanel(s) : null) ?? '',
      h('div.grid-cards', list.map((hero) => heroCard(hero, {
        ribbon: canAscend(s, hero) ? { text: 'Can ascend!', kind: 'up' } : (ascendCost(hero) && hero.copies >= ascendCost(hero)!.copies) ? { text: 'Copies ready', kind: 'copy' } : canAwakenNow(s, hero) ? { text: 'Can awaken!', kind: 'up' } : app.game.isAway(hero.uid) ? { text: 'On expedition', kind: 'away' } : undefined,
        onClick: () => heroDetail(app, hero),
      }))),
    );
  };
  render();
  return { el, refresh: () => render() };
}

/** The next star: what it takes (copies, training, gold, homeland materials, and more for the high stars). */
function ascendPanel(app: App, hero: HeroInstance, render: () => void): HTMLElement {
  const s = app.game.state;
  const cost = ascendCost(hero);
  const head = h('div', stars(hero.stars, maxStars(hero)));
  if (!cost) return h('div.panel', head, h('div.dim', { style: { fontSize: '14px' } }, 'Maximum stars reached.'));
  const need = (ok: boolean, text: string, title = '') => h(`span.asc-need${ok ? '.ok' : ''}`, { title }, ok ? '✓ ' : '', text);
  const items = [
    need(hero.copies >= cost.copies, `${hero.copies} / ${cost.copies} cop${cost.copies === 1 ? 'y' : 'ies'}`, 'Duplicates from packs count.'),
    need(hero.level >= cost.level, `Level ${cost.level}${hero.level < cost.level ? ` (now ${hero.level})` : ''}`, 'Training: experience from expeditions and Novice Pack drills.'),
    need(s.gold >= cost.gold, `${cost.gold.toLocaleString()} gold`),
    ...Object.entries(cost.materials).map(([m, n]) => need(s.materials[m as Material] >= n!, `${n} ${MATERIAL_NAMES[m as Material].toLowerCase()}${s.materials[m as Material] < n! ? ` (have ${s.materials[m as Material]})` : ''}`, `${TRIBE_NAMES[def(hero).tribe]} heroes ascend with the materials of their homeland. The Market sells them.`)),
    cost.essence ? need(s.essence >= cost.essence, `${cost.essence} Essence${s.essence < cost.essence ? ` (have ${s.essence})` : ''}`, 'Essence comes from copies a hero no longer needs.') : null,
    cost.shards ? need(s.shards >= cost.shards, `${cost.shards} Starshards${s.shards < cost.shards ? ` (have ${s.shards})` : ''}`, 'Starshards come from the Deep Marches.') : null,
  ];
  const block = ascendBlock(s, hero);
  return h('div.panel.col', { style: { gap: '8px' } },
    h('div.row', { style: { alignItems: 'center', gap: '14px' } },
      h('div.grow', head, h('div.dim', { style: { fontSize: '13px' } }, `To reach ${hero.stars + 1} stars (level cap ${levelCap(hero) + 10}):`)),
      h('button.btn', { disabled: !!block || app.game.isAway(hero.uid), title: block ?? '', onclick: () => { app.game.ascend(hero.uid); render(); } }, 'Ascend')),
    h('div.row.wrap', { style: { gap: '6px' } }, items));
}

/** A wounded hero: how long until they can go out again, and the Temple's quicker way. */
function woundLine(app: App, hero: HeroInstance, render: () => void): HTMLElement | null {
  const now = app.game.now();
  if (!isWounded(hero, now)) return null;
  const s = app.game.state;
  const left = woundLeft(hero, now);
  const temple = (s.buildings.temple ?? 0) > 0;
  const cost = healCost(hero, now);
  return h('div.panel.row', { style: { alignItems: 'center', gap: '12px', borderColor: '#d8603a', background: 'rgba(110, 22, 18, 0.35)' } },
    h('div.grow', h('b', { style: { color: '#f0a08a' } }, `✚ Wounded: back on their feet in ${left}.`),
      h('div.dim', { style: { fontSize: '13px' } }, temple ? 'Until then they can\'t go on trips or scout. The Temple can heal them now.' : 'Until then they can\'t go on trips or scout. A Temple in town could heal them sooner.')),
    temple ? h('button.btn.small', { disabled: s.gold < cost, onclick: () => { app.game.healNow(hero.uid); render(); } }, `Heal now (${cost} gold)`) : null);
}

/** What a hero does in a fight, gear included: the numbers behind the card. */
function combatPanel(app: App, hero: HeroInstance): HTMLElement {
  const c = heroCombat(hero, gearDefs(app.game.state, hero));
  const melee = c.range <= 60;
  const tiles: [string, string, string][] = [
    ['Health', String(Math.round(c.maxHp)), 'Hit points. Vigor and armour raise it.'],
    ['Attack', String(Math.round(c.atk)), 'Damage per hit, weapon included.'],
    ['Damage / sec', (c.atk / c.attackRate).toFixed(1), `One attack every ${c.attackRate.toFixed(2)} s.`],
    ['Armour', String(Math.round(c.def)), 'Takes this much off every hit.'],
    ['Critical', `${Math.round(c.crit * 100)}%`, 'Chance of a hit for double damage.'],
    ['Reach', melee ? 'Melee' : String(Math.round(c.range)), melee ? 'Fights up close.' : 'Attacks from this far away.'],
    ['Speed', String(Math.round(c.speed)), 'How fast the hero moves on the map.'],
  ];
  if (c.heal > 0) tiles.splice(3, 0, ['Healing', String(Math.round(c.heal)), 'Health restored to an ally per cast.']);
  if (c.splash > 0) tiles.push(['Splash', String(Math.round(c.splash)), 'Hits also strike enemies this close to the target.']);
  return h('div.col', { style: { gap: '6px' } },
    h('div.section-title', { style: { margin: '0' } }, 'IN A FIGHT (WITH GEAR)'),
    h('div.combat-tiles', tiles.map(([k, v, tip]) => h('div', { title: tip }, h('span', k), h('b', v)))));
}

export function heroDetail(app: App, hero: HeroInstance, actions?: (close: () => void) => (HTMLElement | null)[]) {
  app.game.tutorialFlag('heroOpened');
  const d = def(hero);
  const box = h('div.panel.col', { style: { gap: '18px' } });
  const close = modal(box);
  const render = () => {
    const st = stats(hero);
    const atMax = hero.stars >= maxStars(hero);
    setChildren(box, h('div.row', { style: { gap: '24px', alignItems: 'flex-start' } },
      (() => { const c = heroCard(hero); c.style.setProperty('--card-w', '300px'); return c; })(),
      h('div.col.grow',
        h('div', h('h2', `${d.name} ${d.title}`), h('div.muted', `${d.rarity[0].toUpperCase() + d.rarity.slice(1)} ${TRIBE_NAMES[d.tribe]} ${CLASS_NAMES[d.heroClass]} · power ${power(hero)}, ${heroStrength(app.game.state, hero)} with gear`)),
        h('p', { style: { fontStyle: 'italic' } }, `“${d.quote}”`),
        h('div.row', { style: { gap: '10px' } },
          ...(['might', 'finesse', 'arcana', 'vigor', 'resolve'] as const).map((k) =>
            h('div.panel', { style: { padding: '8px 12px', textAlign: 'center', flex: '1' } }, h('div.dim', { style: { fontSize: '12px' } }, k.toUpperCase()), h('b', { style: { fontSize: '20px' } }, st[k])))),
        h('div',
          h('div.row', { style: { justifyContent: 'space-between', fontSize: '14px' } }, h('span', `Level ${hero.level} / ${levelCap(hero)}`), h('span.dim', hero.level >= levelCap(hero) ? (atMax ? 'Level cap: awaken to raise it' : 'Level cap: ascend to raise it') : `${hero.xp} / ${xpToNext(hero.level)} XP`)),
          h('div.bar', h('i', { style: { width: `${hero.level >= levelCap(hero) ? 100 : (hero.xp / xpToNext(hero.level)) * 100}%` } }))),
        woundLine(app, hero, render),
        combatPanel(app, hero),
        h('div', h('b', `${CLASS_NAMES[d.heroClass]}: `), h('span.muted', CLASS_TEXT[d.heroClass])),
        h('div', h('b', 'Trait: '), h('span.muted', d.trait)),
        h('div', h('b', 'As Captain: '), h('span', { style: { color: ({ great: '#6fcb6a', good: '#a8d878', mixed: '#e0b04a', poor: '#e07a6a', plain: '#c8b8a0' })[captainStyle(d.id).grade] } }, captainText(d.id)),
          isScout(hero) ? h('span.muted', ' · Can scout new land.') : null),
        h('div', h('b', 'Personality: '), h('span', { style: { color: '#f1d27a' } }, d.personality[0].toUpperCase() + d.personality.slice(1).replace('hound', ' hound')), h('span.muted', ' · ' + PERSONALITY_TEXT[d.personality])),
        d.grudge || d.fond ? h('div.muted', d.grudge ? 'Hates ' + d.grudge.toLowerCase() + ': charges them first, hits them harder.' : '', d.grudge && d.fond ? ' ' : '', d.fond ? 'Fond of ' + HERO_BY_ID[d.fond].name + ': fights harder if they fall.' : '') : null,
        h('div', h('b', 'Signature: '), h('span', { style: { color: signatureUnlocked(hero) ? '#f1d27a' : '#a8977a' } }, signatureUnlocked(hero) ? `${d.signature} (unlocked)` : `${d.signature} (unlocks at 3★)`)),
        ascendPanel(app, hero, render),
        atMax ? awakenPanel(app, hero, render) : null,
      )),
      // The backpack gets the whole width of the window.
      unlocked(app.game.state, 'gear') ? equipmentPanel(app, hero, render) : null,
      h('div.row.wrap', { style: { gap: '8px' } }, ...(actions?.(close) ?? []), h('button.btn.secondary.small', { onclick: close }, 'Close')),
    );
  };
  render();
}

function canAwakenNow(s: GameState, hero: HeroInstance): boolean {
  const cost = AWAKEN_COST[hero.awakened ?? 0];
  return !awakenBlock(hero) && !!cost && s.shards >= cost.shards && s.gold >= cost.gold;
}

/** Past the last star: Starshards from the Deep Marches awaken a hero, up to three times. */
function awakenPanel(app: App, hero: HeroInstance, rerender: () => void): HTMLElement {
  const s = app.game.state;
  const a = hero.awakened ?? 0;
  const cost = AWAKEN_COST[a];
  const block = awakenBlock(hero);
  const short = cost && !block && (s.shards < cost.shards || s.gold < cost.gold);
  return h('div.panel', { style: { display: 'flex', alignItems: 'center', gap: '14px', borderColor: '#5e7ab0' } },
    h('div.grow',
      h('div', h('b', { style: { color: '#b9d8ff' } }, 'Awakening '), h('span', { style: { color: '#b9d8ff', letterSpacing: '2px' } }, '✦'.repeat(a) + '✧'.repeat(MAX_AWAKENING - a))),
      h('div.dim', { style: { fontSize: '14px' } }, a >= MAX_AWAKENING
        ? 'Fully awakened: +15 level cap and +30% to every stat.'
        : `Each awakening: +5 level cap and +10% to every stat. Next: ${cost.shards} Starshards and ${cost.gold} gold (you have ${s.shards} and ${Math.floor(s.gold)}).${block ? ` ${block}.` : ''} Starshards come from the Deep Marches (rings 8-10).`)),
    a < MAX_AWAKENING ? h('button.btn', {
      disabled: !!block || !!short || app.game.isAway(hero.uid),
      onclick: () => { if (app.game.awaken(hero.uid)) app.game.toasts.push(`${def(hero).name} is awakened! Level cap ${levelCap(hero)}.`); rerender(); },
    }, 'Awaken') : null);
}

/** Secret heroes not found yet: a silhouette and a rumour each. Nothing says how. */
function secretsPanel(s: GameState): HTMLElement | null {
  const hidden = HEROES.filter((d) => d.secret && !s.secrets.found.includes(d.id));
  const total = HEROES.filter((d) => d.secret).length;
  if (!hidden.length) return null;
  return h('details.panel', { style: { padding: '10px 14px' } },
    h('summary', { style: { cursor: 'pointer' } }, h('b', `Secrets: ${hidden.length} of ${total} heroes still out there`)),
    h('p.dim', { style: { fontSize: '13px' } }, 'Every tribe has someone who breaks its mould. They come to the guild of their own accord, when the guild does something that catches their eye. Nobody knows what.'),
    h('div.grid-cards', hidden.map((d) => defCard(d, { secret: true }))));
}
