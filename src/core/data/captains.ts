// Captains. Whoever leads a trip shapes it: every hero has a captain style with good and/or bad
// effects. They are not balanced on purpose: some heroes are born leaders, some are fine as long
// as somebody else gives the orders, and a few are terrible at it (and great at everything else).

export interface CaptainMods {
  /** Multipliers. */
  gold?: number; xp?: number; mats?: number; road?: number; atk?: number; def?: number; heal?: number;
  /** Glints come this much more often (1.3 = 30% more often). */
  finds?: number;
  /** Extra chests along the way. */
  chests?: number;
  /** Extra enemies in every group. */
  groupSize?: number;
  /** The party retreats this many health points sooner (negative: later). */
  retreat?: number;
  /** The party strikes first in every fight. */
  firstStrike?: boolean;
}

export type CaptainGrade = 'great' | 'good' | 'mixed' | 'poor' | 'plain';

export interface CaptainStyle {
  id: string;
  name: string;
  grade: CaptainGrade;
  good?: string;
  bad?: string;
  mods: CaptainMods;
}

const S = (id: string, name: string, grade: CaptainGrade, mods: CaptainMods, good?: string, bad?: string): CaptainStyle => ({ id, name, grade, mods, good, bad });

export const CAPTAIN_STYLES: Record<string, CaptainStyle> = Object.fromEntries([
  S('legend', 'Born to lead', 'great', { atk: 1.1, gold: 1.1, xp: 1.1 }, '+10% damage, gold and XP'),
  S('drillmaster', 'Drillmaster', 'good', { xp: 1.15 }, '+15% XP'),
  S('quartermaster', 'Quartermaster', 'good', { mats: 1.3 }, '+30% materials'),
  S('pathfinder', 'Pathfinder', 'good', { road: 1.2 }, 'The party walks 20% faster'),
  S('shadow', 'Shadow', 'good', { firstStrike: true }, 'The party strikes first in every fight'),
  S('medic', 'Field medic', 'good', { heal: 1.2 }, '+20% healing'),
  S('lucky', 'Lucky star', 'good', { finds: 1.3, chests: 1 }, 'One more discovery along the way, and an extra chest'),
  S('inspiring', 'Inspiring', 'good', { atk: 1.08, heal: 1.08 }, '+8% damage and healing'),
  S('bulwark', 'Bulwark', 'mixed', { def: 1.15, road: 0.9 }, '+15% armor', 'The party walks 10% slower'),
  S('hothead', 'Hothead', 'mixed', { atk: 1.12, def: 0.88, retreat: -10 }, '+12% damage', '-12% armor, and retreats later than ordered'),
  S('treasure', 'Treasure nose', 'mixed', { gold: 1.2, xp: 0.9 }, '+20% gold', '-10% XP'),
  S('miser', 'Miser', 'mixed', { chests: 2, gold: 1.1, road: 0.9 }, 'Two extra chests and +10% gold', 'Stops for every coin: walks 10% slower'),
  S('scholar', 'Scholar', 'mixed', { xp: 1.2, gold: 0.85 }, '+20% XP', '-15% gold'),
  S('glory', 'Glory-seeker', 'mixed', { gold: 1.25, xp: 1.15, groupSize: 1 }, '+25% gold and +15% XP', 'Picks fights: one more enemy in every group'),
  S('dreamer', 'Dreamer', 'mixed', { finds: 1.5, road: 0.85 }, 'Two more discoveries along the way', 'Wanders: the party walks 15% slower'),
  S('grim', 'Grim', 'mixed', { atk: 1.12, xp: 0.9 }, '+12% damage', 'Nobody learns much from fear: -10% XP'),
  S('worrier', 'Worrier', 'mixed', { def: 1.1, retreat: 15 }, '+10% armor', 'Retreats much sooner than ordered'),
  S('tyrant', 'Tyrant', 'poor', { atk: 1.1, gold: 0.85, xp: 0.85 }, '+10% damage', '-15% gold and XP: nobody wants to work for him'),
  S('lost', 'Hopeless with maps', 'poor', { road: 0.85, xp: 0.9 }, undefined, 'Gets the party lost: walks 15% slower, -10% XP'),
  S('plain', 'Plain and steady', 'plain', {}, undefined, undefined),
].map((s) => [s.id, s]));

/** Each hero's captain style. */
export const HERO_CAPTAIN: Record<string, string> = {
  brannoc: 'bulwark', hilda: 'medic', dorrik: 'hothead', grimgar: 'quartermaster', varra: 'inspiring',
  mirela: 'worrier', edric: 'drillmaster', rowan: 'treasure', tamsin: 'dreamer',
  lyra: 'pathfinder', briar: 'shadow', faelan: 'scholar', sylwen: 'quartermaster',
  kragga: 'grim', urzog: 'glory', gorm: 'drillmaster', ashka: 'lucky', embermaw: 'tyrant',
  ssiv: 'miser', mudtail: 'plain', oss: 'medic', ixa: 'scholar',
  elowen: 'dreamer', pip: 'lost', nyx: 'shadow', selune: 'medic',
  aurelia: 'inspiring', seraphiel: 'worrier', caelum: 'glory', lumen: 'drillmaster',
  hollis: 'bulwark', vesper: 'worrier', wren: 'pathfinder', morrow: 'grim',
  tamra: 'pathfinder', grukk: 'hothead', bogga: 'quartermaster', graves: 'grim', isolde: 'shadow',
  gwen: 'medic', torvald: 'bulwark', solenne: 'legend',
  ossian: 'plain', grell: 'miser', vanthe: 'dreamer',
  fenn: 'treasure', bruni: 'bulwark', valerian: 'glory', skarr: 'hothead', aldric: 'legend',
  // Secret heroes.
  marta: 'legend', oakhewn: 'bulwark', runa: 'scholar', yssa: 'medic', quill: 'lucky', sable: 'shadow', corvin: 'miser', lament: 'inspiring',
};

export function captainStyle(heroId: string): CaptainStyle {
  return CAPTAIN_STYLES[HERO_CAPTAIN[heroId] ?? 'plain'] ?? CAPTAIN_STYLES.plain;
}

/** "Bulwark: +15% armor, but the party walks 10% slower" (both sides, when there are two). */
export function captainText(heroId: string): string {
  const c = captainStyle(heroId);
  const low = (t: string) => t[0].toLowerCase() + t.slice(1);
  const text = c.good && c.bad ? `${c.good}, but ${low(c.bad)}` : c.good ?? c.bad ?? 'no surprises either way';
  return `${c.name}: ${text}`;
}
