// Card portraits: a painted bust of each hero over their tribe's home, in the style of the final
// card design (Brannoc's card): soft gradients, a dark outline, rim light, a vignette and grain.
//
// Every hero has a persona (hair, beard, brows, eyes, mouth, tells, headgear and a prop) so two
// heroes of the same tribe and class still look and feel like different people.
//
// The art area is 520 x 446. The head is centred at x 260, the eyes at about y 206, and the bust
// fills the bottom. Everything is plain SVG; ids are prefixed per hero so cards can share a page.

import { HERO_BY_ID } from '../core/data/heroes';
import type { HeroClass, HeroDef, Tribe } from '../core/types';

const OL = '#1E1712';

// ---- Colour helpers ----

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  return hex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t));
}
const light = (c: string, t = 0.3) => mix(c, '#FFFFFF', t);
const dark = (c: string, t = 0.35) => mix(c, '#000000', t);

// ---- Personas ----

type Hair = 'none' | 'short' | 'long' | 'braids' | 'bun' | 'mohawk' | 'topknot' | 'messy' | 'curly' | 'leafy' | 'flame' | 'swept' | 'bob' | 'feathers' | 'wild';
type Beard = 'none' | 'full' | 'forked' | 'braided' | 'goatee' | 'stubble' | 'long' | 'singed' | 'moss';
type Brow = 'calm' | 'angry' | 'raised' | 'worried' | 'sly' | 'stern' | 'sad';
type Eyes = 'open' | 'squint' | 'half' | 'wide' | 'closed' | 'wink' | 'glow';
type Mouth = 'smile' | 'grin' | 'smirk' | 'frown' | 'neutral' | 'open' | 'gap' | 'snarl' | 'tongue' | 'sing';
type Tell = 'scar' | 'eyescar' | 'claws' | 'freckles' | 'warpaint' | 'stripes' | 'rune' | 'earring' | 'blush' | 'stitches' | 'goggles' | 'bandage' | 'beauty' | 'wrinkles' | 'tear' | 'soot' | 'mask' | 'spots' | 'burn' | 'ash' | 'nosering' | 'tattoo' | 'sweat' | 'monocle';
type Hat = 'none' | 'helmet' | 'horned' | 'hornedBroken' | 'hood' | 'wizard' | 'featherCap' | 'cap' | 'circlet' | 'tiara' | 'halo' | 'wingedHelm' | 'wolfpelt' | 'cowl' | 'dragonhelm' | 'flowerCrown' | 'mushroomHat' | 'crescent' | 'sunCrown' | 'kerchief' | 'shellCrown' | 'trophyHat' | 'boneCrown' | 'bandana' | 'boarpelt';
type Prop = 'none' | 'pipe' | 'lantern' | 'coin' | 'rune' | 'bomb' | 'flower' | 'mushroom' | 'gem' | 'skull' | 'candle' | 'moth' | 'dove' | 'drum' | 'conch' | 'pearl' | 'spyglass' | 'tooth' | 'wrench' | 'flame' | 'book' | 'bell' | 'lyre' | 'chains' | 'shovel' | 'feather';
type Weapon = 'auto' | 'none' | 'axe' | 'sword' | 'greatsword' | 'hammer' | 'bow' | 'staff' | 'mace' | 'spear' | 'scythe' | 'crossbow' | 'lute' | 'daggers' | 'shield';

interface Persona {
  hair: Hair; hairC: string; beard?: Beard; beardC?: string;
  brow: Brow; eyes: Eyes; mouth: Mouth; tells?: Tell[];
  hat?: Hat; prop?: Prop; weapon?: Weapon; outfit?: string; skin?: string; eyeC?: string;
}

const P = (hair: Hair, hairC: string, brow: Brow, eyes: Eyes, mouth: Mouth, rest: Partial<Persona> = {}): Persona => ({ hair, hairC, brow, eyes, mouth, ...rest });

/** Who each hero is, in the face: from their trait, flaw, prop and tell. */
const PERSONA: Record<string, Persona> = {
  // Ironroot
  brannoc: P('none', '#B0532A', 'raised', 'squint', 'gap', { beard: 'full', beardC: '#A8482A', tells: ['eyescar'], hat: 'hornedBroken', prop: 'pipe', weapon: 'axe' }),
  hilda: P('braids', '#D8843A', 'calm', 'open', 'smile', { tells: ['freckles', 'rune'], prop: 'rune', outfit: '#3D6178' }),
  dorrik: P('mohawk', '#2A1A14', 'angry', 'wide', 'grin', { beard: 'goatee', beardC: '#2A1A14', tells: ['soot', 'bandage'], hat: 'none', prop: 'bomb' }),
  grimgar: P('short', '#9A9A9A', 'stern', 'open', 'neutral', { beard: 'forked', beardC: '#B8B8B8', tells: ['monocle'], prop: 'wrench', weapon: 'crossbow' }),
  varra: P('braids', '#C0502A', 'stern', 'open', 'neutral', { tells: ['warpaint', 'earring'], hat: 'circlet', weapon: 'shield' }),
  torvald: P('none', '#8A8A8A', 'stern', 'open', 'neutral', { beard: 'braided', beardC: '#A0A0A0', hat: 'helmet', weapon: 'hammer' }),
  bruni: P('none', '#C06030', 'raised', 'squint', 'grin', { beard: 'singed', beardC: '#C06030', tells: ['soot'], weapon: 'hammer', hat: 'none' }),
  runa: P('braids', '#E8E4DC', 'raised', 'glow', 'smile', { tells: ['rune', 'wrinkles'], prop: 'rune', eyeC: '#7FD9E6', outfit: '#2E4A6A' }),
  // Freeholders
  mirela: P('bun', '#6E4A28', 'worried', 'open', 'smile', { tells: ['blush', 'freckles'], prop: 'lantern' }),
  edric: P('swept', '#E0C070', 'calm', 'open', 'smile', { beard: 'stubble', beardC: '#B89A50', tells: ['scar'], outfit: '#2E5A8E' }),
  rowan: P('messy', '#A0522A', 'sly', 'half', 'smirk', { tells: ['freckles', 'earring'], hat: 'cap', prop: 'coin' }),
  tamsin: P('long', '#1E1A1A', 'raised', 'wink', 'grin', { tells: ['beauty'], hat: 'featherCap', weapon: 'lute', outfit: '#8E2B4A' }),
  gwen: P('bob', '#C8C4BC', 'calm', 'open', 'smile', { tells: ['wrinkles'], hat: 'circlet' }),
  aldric: P('long', '#ECE8E0', 'stern', 'squint', 'neutral', { beard: 'full', beardC: '#ECE8E0', tells: ['claws', 'wrinkles'], prop: 'tooth', hat: 'none' }),
  marta: P('long', '#E8C060', 'sly', 'half', 'smirk', { tells: ['beauty'], hat: 'tiara', weapon: 'daggers', outfit: '#5A1E3A' }),
  // Thornkin
  lyra: P('leafy', '#C8D070', 'raised', 'open', 'smile', { tells: ['freckles'], hat: 'hood', weapon: 'bow' }),
  briar: P('wild', '#2E4A26', 'angry', 'squint', 'grin', { tells: ['scar', 'warpaint'], hat: 'none', weapon: 'daggers' }),
  faelan: P('curly', '#7A5A34', 'raised', 'wide', 'open', { tells: ['spots'], hat: 'mushroomHat', prop: 'mushroom' }),
  sylwen: P('long', '#B0602A', 'worried', 'half', 'smile', { tells: ['blush'], hat: 'flowerCrown', prop: 'flower' }),
  tamra: P('braids', '#6E4A28', 'raised', 'open', 'grin', { tells: ['stripes'], hat: 'wolfpelt' }),
  fenn: P('short', '#7A5A34', 'raised', 'open', 'grin', { tells: ['bandage'], hat: 'trophyHat', prop: 'tooth' }),
  oakhewn: P('leafy', '#5E7A2E', 'stern', 'glow', 'neutral', { beard: 'moss', beardC: '#5E7A2E', skin: '#9A7A52', eyeC: '#B9F07A', weapon: 'shield', hat: 'none' }),
  // Ashborn
  kragga: P('mohawk', '#1E1412', 'angry', 'wide', 'snarl', { tells: ['warpaint', 'scar'], weapon: 'axe' }),
  urzog: P('topknot', '#1E1412', 'raised', 'open', 'grin', { tells: ['earring', 'nosering'], weapon: 'spear' }),
  gorm: P('none', '#1E1412', 'calm', 'half', 'smile', { beard: 'goatee', beardC: '#1E1412', tells: ['tattoo'], prop: 'drum', hat: 'none' }),
  ashka: P('flame', '#FF7A2A', 'sly', 'glow', 'smirk', { tells: ['ash'], eyeC: '#FFB23A', prop: 'flame' }),
  embermaw: P('wild', '#1E1412', 'angry', 'glow', 'snarl', { tells: ['burn', 'scar'], eyeC: '#FF7A2A', prop: 'chains', weapon: 'greatsword' }),
  grukk: P('mohawk', '#3A2214', 'angry', 'squint', 'gap', { tells: ['bandage'], hat: 'boarpelt' }),
  skarr: P('none', '#1E1412', 'stern', 'squint', 'smirk', { tells: ['burn'], hat: 'dragonhelm' }),
  yssa: P('long', '#1E1412', 'calm', 'closed', 'smile', { tells: ['ash'], hat: 'circlet', prop: 'flame', outfit: '#8E3A1E' }),
  // Fenfolk
  ssiv: P('none', '#2E6A56', 'sly', 'half', 'tongue', { tells: ['earring'], hat: 'hood', prop: 'coin', outfit: '#6A3A6E' }),
  mudtail: P('none', '#2E6A56', 'calm', 'half', 'neutral', { tells: ['soot'], hat: 'helmet' }),
  oss: P('none', '#2E6A56', 'calm', 'open', 'smile', { hat: 'shellCrown', prop: 'conch' }),
  ixa: P('none', '#2E6A56', 'raised', 'wide', 'open', { tells: ['spots'], prop: 'pearl', outfit: '#2E4A7A' }),
  bogga: P('none', '#2E6A56', 'calm', 'squint', 'smile', { tells: ['wrinkles', 'spots'], hat: 'kerchief', skin: '#6E8C5A' }),
  grell: P('none', '#2E6A56', 'sly', 'glow', 'grin', { tells: ['stitches'], hat: 'cowl', prop: 'skull', skin: '#5E7A5E', eyeC: '#9EF28A' }),
  quill: P('none', '#2E6A56', 'stern', 'squint', 'neutral', { tells: ['scar', 'wrinkles'], hat: 'hood', prop: 'spyglass', weapon: 'bow', skin: '#4E7A86' }),
  // Moonveil
  elowen: P('none', '#DCDDEA', 'worried', 'half', 'smile', { tells: ['blush'], prop: 'moth' }),
  pip: P('none', '#DCDDEA', 'worried', 'wide', 'open', { tells: ['sweat'], hat: 'cap', prop: 'lantern', weapon: 'lute' }),
  nyx: P('none', '#DCDDEA', 'sly', 'half', 'smirk', { tells: ['mask'], hat: 'hood', weapon: 'daggers' }),
  selune: P('none', '#F4F0FF', 'calm', 'closed', 'smile', { hat: 'crescent', outfit: '#C8C0E0' }),
  isolde: P('none', '#DCDDEA', 'stern', 'half', 'neutral', { tells: ['scar'] }),
  vanthe: P('none', '#DCDDEA', 'sad', 'half', 'neutral', { tells: ['tear'], hat: 'cowl', weapon: 'scythe' }),
  sable: P('none', '#B8B0D8', 'angry', 'glow', 'grin', { tells: ['eyescar'], eyeC: '#E6E8FF', weapon: 'sword', skin: '#B8B0CC', hat: 'none' }),
  // Dawnwings
  aurelia: P('long', '#F1D27A', 'stern', 'open', 'neutral', { hat: 'wingedHelm', weapon: 'shield' }),
  seraphiel: P('curly', '#FBF6E8', 'worried', 'half', 'smile', { tells: ['blush'], hat: 'halo', prop: 'dove' }),
  caelum: P('swept', '#E8B84A', 'raised', 'wink', 'grin', { weapon: 'bow' }),
  lumen: P('short', '#F6E6B0', 'calm', 'closed', 'sing', { hat: 'halo', prop: 'bell' }),
  solenne: P('long', '#FFF3C4', 'stern', 'glow', 'neutral', { hat: 'sunCrown', eyeC: '#FFE49A', weapon: 'hammer' }),
  valerian: P('swept', '#D4A73A', 'raised', 'open', 'grin', { tells: ['scar'], weapon: 'spear' }),
  corvin: P('feathers', '#1E1E2A', 'sly', 'half', 'grin', { tells: ['earring'], prop: 'gem', skin: '#E8C8A8' }),
  // Hollowed
  hollis: P('none', '#2E3A34', 'stern', 'glow', 'neutral', { tells: ['stitches'], hat: 'helmet', weapon: 'sword' }),
  vesper: P('none', '#2E3A34', 'worried', 'glow', 'frown', { tells: ['stitches'], hat: 'hood', prop: 'shovel' }),
  wren: P('bob', '#3A3A44', 'calm', 'glow', 'smirk', { tells: ['earring'], hat: 'hood', weapon: 'bow' }),
  morrow: P('long', '#2A2A34', 'sly', 'glow', 'grin', { hat: 'boneCrown', prop: 'candle' }),
  graves: P('short', '#4A4A54', 'calm', 'glow', 'smile', { tells: ['stitches'], hat: 'cap' }),
  ossian: P('none', '#C8C8C8', 'calm', 'half', 'smile', { beard: 'long', beardC: '#C8C8C8', tells: ['wrinkles'], prop: 'lantern' }),
  lament: P('long', '#3A3448', 'sad', 'closed', 'sing', { tells: ['tear', 'stitches'], prop: 'lyre' }),
};

// ---- Tribe looks ----

type Species = 'human' | 'dwarf' | 'elf' | 'orc' | 'fen' | 'moth' | 'dead';
const SPECIES: Record<Tribe, Species> = {
  freeholders: 'human', ironroot: 'dwarf', thornkin: 'elf', ashborn: 'orc', fenfolk: 'fen', moonveil: 'moth', dawnwings: 'human', hollowed: 'dead',
};
const SKIN: Record<Tribe, string> = {
  freeholders: '#E8B896', ironroot: '#E3A07E', thornkin: '#F0CDAA', ashborn: '#B4583A', fenfolk: '#4E8C76', moonveil: '#E6DCF2', dawnwings: '#F4D6BA', hollowed: '#D8D8CC',
};
const ACCENT: Record<Tribe, string> = {
  freeholders: '#3D6178', thornkin: '#4F7A3A', ironroot: '#6A7178', ashborn: '#6E5440', fenfolk: '#6A3A6E', moonveil: '#5E4E8C', dawnwings: '#D4A73A', hollowed: '#3E4A44',
};
const FACE: Record<Species, string> = {
  human: 'M190 190C190 128 222 104 260 104C298 104 330 128 330 190C330 246 302 288 260 294C218 288 190 246 190 190Z',
  dwarf: 'M182 196C182 136 216 112 260 112C304 112 338 136 338 196C338 250 306 288 260 292C214 288 182 250 182 196Z',
  elf: 'M196 188C196 128 224 104 260 104C296 104 324 128 324 188C324 240 296 286 260 298C224 286 196 240 196 188Z',
  orc: 'M184 186C184 126 218 104 260 104C302 104 336 126 336 186C338 236 330 272 304 290C288 298 232 298 216 290C190 272 182 236 184 186Z',
  fen: 'M176 204C176 136 212 112 260 112C308 112 344 136 344 204C344 256 306 290 260 292C214 290 176 256 176 204Z',
  moth: 'M196 196C196 134 226 112 260 112C294 112 324 134 324 196C324 246 298 284 260 290C222 284 196 246 196 196Z',
  dead: 'M198 186C198 124 226 100 260 100C294 100 322 124 322 186C322 244 300 292 260 302C220 292 198 244 198 186Z',
};
/** Eye centres (left, right) and the head's top, by species. */
const EYE: Record<Species, { l: [number, number]; r: [number, number]; top: number; chin: number; mouth: number }> = {
  human: { l: [228, 204], r: [292, 204], top: 104, chin: 294, mouth: 262 },
  dwarf: { l: [226, 206], r: [294, 206], top: 112, chin: 292, mouth: 272 },
  elf: { l: [230, 200], r: [290, 200], top: 104, chin: 298, mouth: 262 },
  orc: { l: [228, 200], r: [292, 200], top: 104, chin: 294, mouth: 262 },
  fen: { l: [216, 178], r: [304, 178], top: 112, chin: 292, mouth: 250 },
  moth: { l: [226, 206], r: [294, 206], top: 112, chin: 290, mouth: 264 },
  dead: { l: [230, 198], r: [290, 198], top: 100, chin: 302, mouth: 266 },
};

// ---- Backdrops: each tribe's home ----

function backdrop(t: Tribe, id: string): { defs: string; art: string } {
  const g = (name: string, stops: [number, string, number?][], vertical = true) =>
    `<linearGradient id="${id}-${name}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const glow = (name: string, c: string) => `<radialGradient id="${id}-${name}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${c}" stop-opacity="0.9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  switch (t) {
    case 'ironroot':
      return {
        defs: g('sky', [[0, '#4F5C7C'], [0.45, '#9A7E86'], [0.75, '#E0A272'], [1, '#F4C07C']]) + glow('sun', '#FFE2A8') + glow('door', '#FFC664'),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/><circle cx="120" cy="300" r="170" fill="url(#${id}-sun)"/>
<path d="M0 262L48 214L84 236L128 176L160 198L178 172L232 228L286 186L330 218L372 160L410 190L452 150L494 196L520 182V446H0Z" fill="#A3A3BC" opacity="0.85"/>
<g fill="#F4EEF2" opacity="0.85"><path d="M128 176L140 192L132 190L124 196L118 188Z"/><path d="M372 160L386 178L376 176L368 182L362 172Z"/><path d="M452 150L466 166L456 164L448 170L442 162Z"/></g>
<path d="M0 312L40 274L92 296L150 244L196 286L246 262L300 296L352 248L404 284L452 256L520 278V446H0Z" fill="#6E7290"/>
<path d="M346 446L356 330L382 286L420 254L452 246L486 228L520 222V446Z" fill="#40465C"/>
<circle cx="458" cy="318" r="46" fill="url(#${id}-door)"/><path d="M440 344V318A18 18 0 0 1 476 318V344Z" fill="#FFC86B" stroke="#2C3040" stroke-width="3"/>`,
      };
    case 'freeholders':
      return {
        defs: g('sky', [[0, '#8AB8DE'], [0.6, '#E8D6A8'], [1, '#F6D9A0']]) + glow('sun', '#FFF0C0'),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/><circle cx="110" cy="150" r="150" fill="url(#${id}-sun)"/>
<g fill="#FFFFFF" opacity="0.7"><ellipse cx="380" cy="80" rx="60" ry="16"/><ellipse cx="420" cy="70" rx="40" ry="14"/><ellipse cx="120" cy="60" rx="50" ry="12"/></g>
<path d="M0 270C80 240 160 250 240 262C320 274 420 236 520 250V446H0Z" fill="#9CB25E"/>
<path d="M0 300C100 280 200 300 300 290C380 284 460 270 520 280V446H0Z" fill="#7E9A48"/>
<g stroke="#C8B060" stroke-width="3" opacity="0.6"><path d="M0 330L520 300M0 350L520 322M0 372L520 346"/></g>
<g transform="translate(440 210)"><path d="M-10 70L-6 0H6L10 70Z" fill="#E8D8B8" stroke="#5A4630" stroke-width="2"/><path d="M-8 0L8 0L0 -12Z" fill="#8E2B23"/><g stroke="#5A4630" stroke-width="4" stroke-linecap="round"><path d="M0 -4L-38 -40M0 -4L38 -40M0 -4L-36 34M0 -4L36 30"/></g></g>`,
      };
    case 'thornkin':
      return {
        defs: g('sky', [[0, '#2E4A26'], [0.5, '#5E7A3A'], [1, '#A8B868']]) + g('shaft', [[0, '#FFF6C4', 0.45], [1, '#FFF6C4', 0]]),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/>
<g fill="url(#${id}-shaft)"><path d="M300 0L360 0L260 446L180 446Z"/><path d="M420 0L450 0L380 446L340 446Z" opacity="0.6"/></g>
<g fill="#22341C"><path d="M20 0H70L64 446H30Z"/><path d="M440 0H490L500 446H450Z"/><path d="M130 0H150L148 300H136Z" opacity="0.6"/><path d="M380 0H396L398 260H384Z" opacity="0.6"/></g>
<g fill="#3E5A2A" opacity="0.9"><ellipse cx="60" cy="30" rx="110" ry="50"/><ellipse cx="460" cy="20" rx="120" ry="55"/><ellipse cx="260" cy="-10" rx="140" ry="40"/></g>
<path d="M0 360C120 330 260 350 400 330C460 322 500 330 520 334V446H0Z" fill="#2E4A22"/>
<g fill="#B9D86A" opacity="0.7"><path d="M90 120q10 -14 20 0q-10 10 -20 0Z"/><path d="M420 160q10 -14 20 0q-10 10 -20 0Z"/><path d="M200 70q8 -12 16 0q-8 8 -16 0Z"/></g>`,
      };
    case 'ashborn':
      return {
        defs: g('sky', [[0, '#2A0E0C'], [0.5, '#7A2414'], [1, '#E8602A']]) + glow('glow', '#FF9A3C'),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/><circle cx="380" cy="200" r="160" fill="url(#${id}-glow)" opacity="0.7"/>
<path d="M240 446L340 190L370 176L400 186L500 446Z" fill="#2A1614"/><path d="M340 190L370 176L400 186L384 200L356 198Z" fill="#FF7A2A"/>
<path d="M370 180C360 140 390 120 376 80" stroke="#5A4A44" stroke-width="16" fill="none" opacity="0.5" stroke-linecap="round"/>
<path d="M0 330L80 300L150 318L230 290L310 322L400 300L520 316V446H0Z" fill="#1E1010"/>
<g fill="none" stroke="#FF7A2A" stroke-width="4" stroke-linecap="round" opacity="0.85"><path d="M20 380L80 360L120 372L170 352"/><path d="M300 400L360 380L420 390L480 370"/><path d="M372 200L380 260L366 320"/></g>`,
      };
    case 'fenfolk':
      return {
        defs: g('sky', [[0, '#5E8C86'], [0.6, '#A8C8B8'], [1, '#D8E4C8']]) + g('water', [[0, '#5E8C86'], [1, '#2E5A56']]),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/>
<g fill="#FFFFFF" opacity="0.35"><ellipse cx="140" cy="250" rx="200" ry="24"/><ellipse cx="420" cy="210" rx="160" ry="18"/></g>
<path d="M0 240C100 230 200 236 300 232C400 228 470 234 520 232V250H0Z" fill="#4E7A6A" opacity="0.6"/>
<rect y="250" width="520" height="196" fill="url(#${id}-water)"/>
<g stroke="#D8E8D8" stroke-width="2" opacity="0.45"><path d="M40 290h60M160 310h80M330 300h90M420 340h60M80 360h70"/></g>
<g stroke="#2E4A2A" stroke-width="5" stroke-linecap="round"><path d="M30 446L40 210M50 446L66 230M70 446L64 250M470 446L480 200M490 446L506 226M450 446L446 240"/></g>
<g fill="#5E3A2A"><ellipse cx="40" cy="206" rx="5" ry="16"/><ellipse cx="480" cy="196" rx="5" ry="16"/></g>
<g fill="#3E7A4A"><ellipse cx="150" cy="400" rx="30" ry="9"/><ellipse cx="380" cy="420" rx="26" ry="8"/></g><circle cx="160" cy="396" r="5" fill="#F2A0C8"/>`,
      };
    case 'moonveil':
      return {
        defs: g('sky', [[0, '#14122E'], [0.6, '#3E3266'], [1, '#6E5E9C']]) + glow('moon', '#E8E0FF'),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/><circle cx="400" cy="110" r="150" fill="url(#${id}-moon)" opacity="0.5"/>
<circle cx="400" cy="110" r="58" fill="#F4F0FF"/><circle cx="384" cy="96" r="10" fill="#DCD4F0"/><circle cx="420" cy="128" r="7" fill="#DCD4F0"/>
<g fill="#FFFFFF"><circle cx="60" cy="50" r="1.8"/><circle cx="150" cy="90" r="1.4"/><circle cx="230" cy="30" r="1.6"/><circle cx="90" cy="170" r="1.2"/><circle cx="300" cy="70" r="1.3"/><circle cx="480" cy="230" r="1.5"/><circle cx="20" cy="250" r="1.3"/></g>
<path d="M0 320C40 300 70 260 90 230C110 260 120 300 160 316C200 290 230 280 260 300C300 270 340 280 380 300C420 270 470 280 520 300V446H0Z" fill="#1E1A3A"/>
<g fill="#B9FFF0" opacity="0.8"><circle cx="110" cy="200" r="3"/><circle cx="440" cy="260" r="2.5"/><circle cx="60" cy="300" r="2"/></g>`,
      };
    case 'dawnwings':
      return {
        defs: g('sky', [[0, '#7EB8E8'], [0.6, '#CFE4F4'], [1, '#FFF1C4']]) + glow('sun', '#FFF6D8'),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/><circle cx="260" cy="60" r="200" fill="url(#${id}-sun)"/>
<g stroke="#FFF6D8" stroke-width="18" opacity="0.25"><path d="M260 60L60 446M260 60L460 446M260 60L0 240M260 60L520 240"/></g>
<g transform="translate(430 120)"><path d="M-10 60L-6 -40L0 -60L6 -40L10 60Z" fill="#F6EEDC" stroke="#A88A4A" stroke-width="2"/><ellipse cx="0" cy="64" rx="34" ry="10" fill="#C8B890"/></g>
<g fill="#FFFFFF"><ellipse cx="80" cy="330" rx="120" ry="34"/><ellipse cx="200" cy="356" rx="110" ry="30"/><ellipse cx="420" cy="340" rx="140" ry="36"/><ellipse cx="300" cy="380" rx="200" ry="40"/></g>
<rect y="380" width="520" height="66" fill="#FFFFFF"/>`,
      };
    case 'hollowed':
      return {
        defs: g('sky', [[0, '#2A2638'], [0.6, '#5E5872'], [1, '#8E86A0']]) + g('mist', [[0, '#C8C4D8', 0], [0.5, '#C8C4D8', 0.45], [1, '#C8C4D8', 0]]) + glow('candle', '#FFC86B'),
        art: `<rect width="520" height="446" fill="url(#${id}-sky)"/><circle cx="100" cy="110" r="36" fill="#E8E4F0" opacity="0.7"/>
<path d="M440 446L446 260C430 230 400 220 380 200M446 300C460 260 490 250 510 230M446 260C450 230 470 210 466 180" stroke="#1E1A26" stroke-width="10" fill="none" stroke-linecap="round"/>
<path d="M0 340C120 320 260 334 380 322C450 316 500 322 520 326V446H0Z" fill="#2A2634"/>
<g fill="#3E3A4A" stroke="#1E1A26" stroke-width="2"><path d="M40 360V320A16 16 0 0 1 72 320V360Z"/><path d="M110 352V326A12 12 0 0 1 134 326V352Z"/><path d="M380 360V318A15 15 0 0 1 410 318V360Z"/></g>
<rect y="300" width="520" height="90" fill="url(#${id}-mist)"/>
<circle cx="56" cy="312" r="18" fill="url(#${id}-candle)"/><rect x="53" y="304" width="6" height="10" fill="#F2ECDC"/>`,
      };
  }
}

// ---- Back layers: wings, weapons ----

function wingsBack(t: Tribe): string {
  if (t === 'dawnwings') {
    const wing = (s: number) => `<g transform="translate(260 300) scale(${s} 1)"><path d="M40 0C90 -60 170 -120 230 -150C226 -110 214 -86 196 -70C214 -64 222 -50 218 -36C204 -40 194 -34 188 -24C200 -16 204 -4 200 8C150 4 90 10 40 20Z" fill="#FBF6E8" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M60 -10C110 -50 160 -90 210 -120M70 4C120 -20 160 -40 196 -56M80 14C120 6 160 0 196 -12" stroke="#D8C8A0" stroke-width="2" fill="none"/></g>`;
    return wing(1) + wing(-1);
  }
  if (t === 'moonveil') {
    const wing = (s: number) => `<g transform="translate(260 290) scale(${s} 1)"><path d="M30 0C70 -90 170 -130 220 -96C240 -60 200 -10 150 10C190 24 210 60 186 92C140 110 70 60 30 20Z" fill="#C9B8F0" fill-opacity="0.85" stroke="#4E3E7C" stroke-width="2.5"/>
<circle cx="150" cy="-50" r="20" fill="#F6F0FF" stroke="#7A68B8" stroke-width="2"/><circle cx="150" cy="-50" r="8" fill="#5E4E8C"/><circle cx="140" cy="60" r="12" fill="#F6F0FF" stroke="#7A68B8" stroke-width="2"/></g>`;
    return wing(1) + wing(-1);
  }
  return '';
}

const AUTO_WEAPON: Record<HeroClass, Weapon> = {
  warrior: 'sword', ranger: 'bow', rogue: 'daggers', mage: 'staff', cleric: 'mace', bard: 'lute',
  paladin: 'hammer', beastmaster: 'spear', necromancer: 'scythe', dragonslayer: 'greatsword',
};

/** The hero's weapon, slung behind (most) or held in front (daggers, lute, shield). */
function weaponArt(w: Weapon, id: string, orb: string, front: boolean): string {
  const isFront = w === 'daggers' || w === 'lute' || w === 'shield';
  if (front !== isFront) return '';
  const steel = `${id}-steel`;
  const wood = `${id}-wood`;
  switch (w) {
    case 'axe':
      return `<path d="M148 446L116 150" stroke="${OL}" stroke-width="18" stroke-linecap="round"/><path d="M148 446L116 150" stroke="url(#${wood})" stroke-width="13" stroke-linecap="round"/>
<path d="M128 164L130 252C106 248 80 256 56 274C66 244 62 208 40 186C68 170 100 164 128 164Z" fill="url(#${steel})" stroke="${OL}" stroke-width="2.5"/><path d="M40 186C62 208 66 244 56 274" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.8"/>
<path d="M48 204l7 4-6 3Z M58 240l7 3-6 4Z" fill="${OL}"/>`;
    case 'sword':
      return `<path d="M120 446L150 120" stroke="${OL}" stroke-width="20" stroke-linecap="round"/><path d="M121 440L150 124" stroke="url(#${steel})" stroke-width="15" stroke-linecap="round"/><path d="M134 300L150 124" stroke="#FFFFFF" stroke-width="2" opacity="0.7"/>
<path d="M98 330L170 340" stroke="${OL}" stroke-width="12" stroke-linecap="round"/><path d="M98 330L170 340" stroke="#C9A24A" stroke-width="7" stroke-linecap="round"/>`;
    case 'greatsword':
      return `<path d="M110 446L160 60" stroke="${OL}" stroke-width="30" stroke-linecap="round"/><path d="M111 440L160 66" stroke="url(#${steel})" stroke-width="24" stroke-linecap="round"/><path d="M130 320L160 66" stroke="#FFFFFF" stroke-width="3" opacity="0.6"/>
<path d="M82 336L178 350" stroke="${OL}" stroke-width="14" stroke-linecap="round"/><path d="M82 336L178 350" stroke="#8A7A6A" stroke-width="9" stroke-linecap="round"/>`;
    case 'hammer':
      return `<path d="M150 446L120 150" stroke="${OL}" stroke-width="16" stroke-linecap="round"/><path d="M150 446L120 150" stroke="url(#${wood})" stroke-width="11" stroke-linecap="round"/>
<rect x="70" y="110" width="100" height="62" rx="8" transform="rotate(-6 120 141)" fill="url(#${steel})" stroke="${OL}" stroke-width="3"/><path d="M80 120h80" transform="rotate(-6 120 141)" stroke="#FFFFFF" stroke-width="3" opacity="0.6"/>`;
    case 'bow':
      return `<path d="M120 80C40 180 40 330 120 430" fill="none" stroke="${OL}" stroke-width="15" stroke-linecap="round"/><path d="M120 80C40 180 40 330 120 430" fill="none" stroke="url(#${wood})" stroke-width="10" stroke-linecap="round"/>
<path d="M120 80V430" stroke="#EDE6D6" stroke-width="2"/><path d="M150 420L180 110" stroke="#6E4A28" stroke-width="5"/><path d="M174 120L182 90L188 122Z" fill="#B9BFC5" stroke="${OL}" stroke-width="2"/>`;
    case 'crossbow':
      return `<path d="M100 300L170 160" stroke="${OL}" stroke-width="18" stroke-linecap="round"/><path d="M100 300L170 160" stroke="url(#${wood})" stroke-width="12" stroke-linecap="round"/>
<path d="M110 160C140 150 190 160 210 190" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M110 160C140 150 190 160 210 190" fill="none" stroke="url(#${steel})" stroke-width="5" stroke-linecap="round"/><path d="M110 160L210 190" stroke="#EDE6D6" stroke-width="2"/>`;
    case 'staff':
      return `<path d="M410 446L430 110" stroke="${OL}" stroke-width="16" stroke-linecap="round"/><path d="M410 446L430 110" stroke="url(#${wood})" stroke-width="11" stroke-linecap="round"/>
<circle cx="432" cy="88" r="44" fill="${orb}" opacity="0.3"/><circle cx="432" cy="88" r="22" fill="${orb}" stroke="${OL}" stroke-width="3"/><circle cx="425" cy="81" r="7" fill="#FFFFFF" opacity="0.8"/>
<path d="M418 110C410 96 412 76 426 66M446 110C454 96 452 76 438 66" stroke="#6E4A28" stroke-width="5" fill="none"/>`;
    case 'mace':
      return `<path d="M150 446L126 170" stroke="${OL}" stroke-width="15" stroke-linecap="round"/><path d="M150 446L126 170" stroke="url(#${wood})" stroke-width="10" stroke-linecap="round"/>
<circle cx="124" cy="150" r="30" fill="url(#${steel})" stroke="${OL}" stroke-width="3"/><g fill="url(#${steel})" stroke="${OL}" stroke-width="2"><path d="M124 112l8 12h-16Z"/><path d="M86 150l12 -8v16Z"/><path d="M162 150l-12 -8v16Z"/></g>`;
    case 'spear':
      return `<path d="M150 446L110 40" stroke="${OL}" stroke-width="13" stroke-linecap="round"/><path d="M150 446L110 40" stroke="url(#${wood})" stroke-width="8" stroke-linecap="round"/>
<path d="M98 60L106 4L124 56Z" fill="url(#${steel})" stroke="${OL}" stroke-width="2.5"/><path d="M112 70L100 90M116 72L112 96" stroke="#C8423A" stroke-width="4" stroke-linecap="round"/>`;
    case 'scythe':
      return `<path d="M410 446L440 70" stroke="${OL}" stroke-width="15" stroke-linecap="round"/><path d="M410 446L440 70" stroke="#3A2E30" stroke-width="10" stroke-linecap="round"/>
<path d="M440 74C380 50 320 70 290 120C330 96 380 92 436 108Z" fill="url(#${steel})" stroke="${OL}" stroke-width="3"/><path d="M296 114C330 90 380 84 430 96" stroke="#FFFFFF" stroke-width="2" opacity="0.6" fill="none"/>`;
    case 'lute':
      return `<g transform="translate(360 330) rotate(-30)"><ellipse cx="0" cy="40" rx="46" ry="56" fill="url(#${wood})" stroke="${OL}" stroke-width="3"/><circle cx="0" cy="34" r="12" fill="${OL}"/><rect x="-7" y="-90" width="14" height="96" fill="#5A3A22" stroke="${OL}" stroke-width="2.5"/><path d="M-12 -98h24v14h-24Z" fill="#5A3A22" stroke="${OL}" stroke-width="2"/><path d="M-3 -84V80M3 -84V80" stroke="#EDE6D6" stroke-width="1"/></g>`;
    case 'daggers':
      return `<g transform="translate(372 352)"><path d="M-40 60L30 -40" stroke="${OL}" stroke-width="11" stroke-linecap="round"/><path d="M-36 54L30 -40" stroke="url(#${steel})" stroke-width="6" stroke-linecap="round"/><path d="M-50 40L-24 64" stroke="${OL}" stroke-width="8" stroke-linecap="round"/><path d="M-50 40L-24 64" stroke="#C9A24A" stroke-width="4" stroke-linecap="round"/></g>`;
    case 'shield':
      return `<g transform="translate(372 360)"><path d="M-62 -60H62V0C62 50 0 84 0 84C0 84 -62 50 -62 0Z" fill="url(#${steel})" stroke="${OL}" stroke-width="4"/><path d="M-50 -48H50V0C50 40 0 68 0 68C0 68 -50 40 -50 0Z" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/><circle cx="0" cy="0" r="16" fill="#C9A24A" stroke="${OL}" stroke-width="3"/></g>`;
    default:
      return '';
  }
}

// ---- The bust ----

type Outfit = 'plate' | 'leather' | 'robe' | 'holy' | 'scale' | 'fur' | 'vest';
const OUTFIT: Record<HeroClass, Outfit> = {
  warrior: 'plate', ranger: 'leather', rogue: 'leather', mage: 'robe', cleric: 'holy', bard: 'vest',
  paladin: 'holy', beastmaster: 'fur', necromancer: 'robe', dragonslayer: 'scale',
};

function bodyArt(cls: HeroClass, t: Tribe, per: Persona, id: string): string {
  const outfit = OUTFIT[cls];
  const base = per.outfit ?? (cls === 'necromancer' ? '#2E2440' : cls === 'cleric' ? '#EDE6D6' : cls === 'paladin' ? '#D8DCE0' : outfit === 'leather' ? '#6E4A2C' : outfit === 'fur' ? '#7A5A3E' : ACCENT[t]);
  const shape = 'M36 446C46 380 100 334 176 318L344 318C420 334 474 380 484 446Z';
  const grad = `<linearGradient id="${id}-cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light(base, 0.18)}"/><stop offset="0.5" stop-color="${base}"/><stop offset="1" stop-color="${dark(base, 0.45)}"/></linearGradient>`;
  let s = `<defs>${grad}</defs><path d="${shape}" fill="url(#${id}-cloth)" stroke="${OL}" stroke-width="3"/>`;
  const pauldron = (fill: string) => `<path d="M320 336C360 306 432 310 472 352C476 372 470 390 462 398C432 372 382 362 332 372Z" fill="${fill}" stroke="${OL}" stroke-width="2.5"/><path d="M332 372C382 362 432 372 462 398C458 412 450 422 442 426C412 406 374 400 338 406Z" fill="${fill}" stroke="${OL}" stroke-width="2.5"/><path d="M340 332C376 316 424 320 456 346" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.5"/>`;
  switch (outfit) {
    case 'plate':
      s += `<path d="${shape}" fill="url(#${id}-mail)" opacity="0.5"/>` + pauldron(`url(#${id}-steel)`) + `<path d="M196 318H324L312 352H208Z" fill="url(#${id}-steel)" stroke="${OL}" stroke-width="2.5"/>`;
      break;
    case 'scale':
      s += `<path d="${shape}" fill="url(#${id}-scales)" opacity="0.7"/>` + pauldron('#5A2A22') + `<path d="M380 340l12 -18 6 16 10 -12 2 18" fill="none" stroke="#2A1210" stroke-width="3"/>`;
      break;
    case 'leather':
      s += `<path d="M198 318L230 318L470 446L420 446Z" fill="${dark(base, 0.25)}" stroke="${OL}" stroke-width="2"/><path d="M206 322L462 444" stroke="${light(base, 0.4)}" stroke-width="1.5" stroke-dasharray="4 5"/>
<path d="M150 330C190 360 330 360 370 330C360 312 320 300 260 300C200 300 160 312 150 330Z" fill="${ACCENT[t]}" stroke="${OL}" stroke-width="2.5"/>`;
      break;
    case 'fur':
      s += `<path d="M120 350C140 320 200 300 260 300C320 300 380 320 400 350C380 372 330 366 300 360C280 372 240 372 220 360C190 366 140 372 120 350Z" fill="#C8B08A" stroke="${OL}" stroke-width="2.5"/>
<g stroke="#8A6A44" stroke-width="2" stroke-linecap="round" opacity="0.8"><path d="M140 350l-8 -8M170 334l-4 -10M210 324l-2 -10M310 324l2 -10M350 334l4 -10M380 350l8 -8"/></g>`;
      break;
    case 'robe':
      s += `<path d="M220 318L260 400L300 318" fill="none" stroke="#C9A24A" stroke-width="6"/><path d="M220 318L260 400L300 318" fill="none" stroke="${OL}" stroke-width="2"/>
<g fill="#E2B84A" opacity="0.8"><circle cx="140" cy="400" r="3"/><circle cx="380" cy="410" r="3"/><circle cx="420" cy="380" r="2.5"/></g>`;
      break;
    case 'holy':
      s += (cls === 'paladin' ? pauldron(`url(#${id}-steel)`) : '') + `<path d="M220 318H300L292 446H228Z" fill="#F6F0E0" stroke="${OL}" stroke-width="2.5"/><circle cx="260" cy="380" r="18" fill="#E2B84A" stroke="${OL}" stroke-width="2.5"/><path d="M260 356V404M236 380H284" stroke="#FFF3C4" stroke-width="3"/>`;
      break;
    case 'vest':
      s += `<path d="M232 318L260 446L288 318" fill="${light(base, 0.5)}" stroke="${OL}" stroke-width="2"/><g fill="#E2B84A" stroke="${OL}" stroke-width="1.5"><circle cx="258" cy="350" r="4"/><circle cx="262" cy="380" r="4"/><circle cx="266" cy="410" r="4"/></g>
<path d="M190 320C210 340 240 344 260 334C280 344 310 340 330 320" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.8"/>`;
      break;
  }
  // Moth folk wear a fluffy ruff; Fenfolk a frill of skin.
  if (t === 'moonveil') s += `<path d="M170 320C180 296 220 290 260 296C300 290 340 296 350 320C340 340 300 334 290 344C280 330 240 330 230 344C220 334 180 340 170 320Z" fill="#F6F0FF" stroke="#8E7EC0" stroke-width="2.5"/>`;
  return s;
}

/** The head: neck, ears, face, features, hair and beard, headgear and tells. */
function headArt(d: HeroDef, per: Persona, id: string): { back: string; face: string; front: string } {
  const sp = SPECIES[d.tribe];
  const e = EYE[sp];
  const skin = per.skin ?? SKIN[d.tribe];
  const eyeC = per.eyeC ?? (sp === 'dead' ? '#7FF2C9' : sp === 'fen' ? '#F2D23A' : sp === 'orc' ? '#E8A23A' : '#5A3A22');
  const face = FACE[sp];
  const defs = `<radialGradient id="${id}-skin" cx="0.42" cy="0.4" r="0.72"><stop offset="0" stop-color="${light(skin, 0.22)}"/><stop offset="0.6" stop-color="${skin}"/><stop offset="1" stop-color="${dark(skin, 0.35)}"/></radialGradient>
<clipPath id="${id}-face"><path d="${face}"/></clipPath>`;
  let back = `<defs>${defs}</defs>`;
  // Hair that falls behind the head and shoulders.
  if (per.hair === 'long' || per.hair === 'bob') {
    const len = per.hair === 'long' ? 380 : 290;
    back += `<path d="M184 170C170 230 170 ${len - 40} 180 ${len}C220 ${len + 10} 300 ${len + 10} 340 ${len}C350 ${len - 40} 350 230 336 170C330 120 300 96 260 96C220 96 190 120 184 170Z" fill="${per.hairC}" stroke="${OL}" stroke-width="2.5"/>
<g stroke="${dark(per.hairC, 0.3)}" stroke-width="2" fill="none" opacity="0.7"><path d="M196 200C190 260 192 ${len - 40} 200 ${len - 10}"/><path d="M324 200C330 260 328 ${len - 40} 320 ${len - 10}"/></g>`;
  }
  // Neck.
  back += `<path d="M226 260L224 330C240 340 280 340 296 330L294 260Z" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="2.5"/><path d="M226 300C246 310 274 310 294 300" stroke="${dark(skin, 0.3)}" stroke-width="2" fill="none" opacity="0.5"/>`;

  let f = '';
  // Ears (behind the face edge).
  if (sp === 'elf') f += `<path d="M200 200L140 150L196 234Z" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="2.5"/><path d="M320 200L380 150L324 234Z" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="2.5"/>`;
  else if (sp === 'orc') f += `<path d="M188 200L160 180L190 234Z" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="2.5"/><path d="M332 200L360 180L330 234Z" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="2.5"/>`;
  else if (sp === 'fen') f += `<g fill="${light(skin, 0.1)}" stroke="${OL}" stroke-width="2.5"><path d="M180 200L130 170L140 196L120 210L146 222L132 246L180 236Z"/><path d="M340 200L390 170L380 196L400 210L374 222L388 246L340 236Z"/></g><g stroke="${dark(skin, 0.3)}" stroke-width="2"><path d="M178 208L140 196M178 222L146 222M178 232L134 244M342 208L380 196M342 222L374 222M342 232L386 244"/></g>`;
  else if (sp !== 'moth') f += `<ellipse cx="${sp === 'dwarf' ? 182 : 190}" cy="214" rx="14" ry="20" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="2.5"/><ellipse cx="${sp === 'dwarf' ? 338 : 330}" cy="214" rx="14" ry="20" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="2.5"/>`;
  // Face, with cool shade on the right and warm rim light on the left.
  f += `<path d="${face}" fill="url(#${id}-skin)" stroke="${OL}" stroke-width="3"/>
<g clip-path="url(#${id}-face)"><path d="M262 90H360V320H262Z" fill="#3A3058" opacity="0.13"/>${sp === 'dead' ? `<path d="M200 220C214 250 230 262 240 270M320 220C306 250 290 262 280 270" stroke="${dark(skin, 0.3)}" stroke-width="10" fill="none" opacity="0.35"/>` : ''}
${sp === 'fen' ? `<g fill="${dark(skin, 0.2)}" opacity="0.6"><circle cx="240" cy="130" r="5"/><circle cx="262" cy="124" r="4"/><circle cx="284" cy="132" r="5"/><circle cx="210" cy="230" r="4"/><circle cx="310" cy="236" r="4"/></g>` : ''}
${sp === 'orc' ? `<path d="M196 178C220 166 300 166 324 178L322 190C300 180 220 180 198 190Z" fill="${dark(skin, 0.25)}" opacity="0.6"/>` : ''}</g>
<path d="${face}" fill="none" stroke="#FFC27A" stroke-width="3" opacity="0.35" clip-path="url(#${id}-face)" transform="translate(4 2)"/>`;
  // Cheeks.
  if (sp !== 'dead' && sp !== 'fen') f += `<ellipse cx="${e.l[0] - 8}" cy="${e.l[1] + 30}" rx="18" ry="10" fill="#D85A44" opacity="${per.tells?.includes('blush') ? 0.45 : 0.18}"/><ellipse cx="${e.r[0] + 8}" cy="${e.r[1] + 30}" rx="18" ry="10" fill="#D85A44" opacity="${per.tells?.includes('blush') ? 0.4 : 0.15}"/>`;
  // Nose.
  f += nose(sp, skin, e.l[1]);
  // Eyes and brows.
  f += eyesArt(sp, per, e, eyeC);
  f += browsArt(per.brow, e, sp === 'dead' || sp === 'moth' ? dark(skin, 0.5) : per.beardC ?? per.hairC);
  // Mouth.
  f += mouthArt(per.mouth, sp, e.mouth, skin);
  // Tusks.
  if (sp === 'orc') f += `<path d="M236 ${e.mouth + 6}C232 ${e.mouth - 8} 236 ${e.mouth - 18} 240 ${e.mouth - 20}C242 ${e.mouth - 10} 242 ${e.mouth - 2} 244 ${e.mouth + 6}Z" fill="#F6F0E0" stroke="${OL}" stroke-width="2"/><path d="M284 ${e.mouth + 6}C288 ${e.mouth - 8} 284 ${e.mouth - 18} 280 ${e.mouth - 20}C278 ${e.mouth - 10} 278 ${e.mouth - 2} 276 ${e.mouth + 6}Z" fill="#F6F0E0" stroke="${OL}" stroke-width="2"/>`;
  // Tells on the face.
  for (const t of per.tells ?? []) f += tellArt(t, e, skin);
  // Beard over the chin.
  if (per.beard && per.beard !== 'none') f += beardArt(per.beard, per.beardC ?? per.hairC, e, sp);

  // Hair on top, then headgear.
  // A covering hat hides the hair on top (braids still hang at the sides).
  // Heroes known for their hair don't hide it under their class's usual hat.
  const hat = per.hat ?? (SHOWN_HAIR.includes(per.hair) ? 'none' : defaultHat(d));
  const covered = COVERING.includes(hat);
  let front = covered ? (per.hair === 'braids' ? braidsOnly(per.hairC, e.top) : '') : hairFront(per.hair, per.hairC, sp, e.top);
  front += hatArt(hat, d, e.top, id);
  // Moth antennae (unless a hood covers them).
  if (sp === 'moth' && !['hood', 'cowl'].includes(hat)) {
    front += `<g fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round"><path d="M244 120C230 80 200 60 176 62"/><path d="M276 120C290 80 320 60 344 62"/></g>
<g stroke="#8E7EC0" stroke-width="2" stroke-linecap="round"><path d="M226 86l-6 -12M212 76l-4 -12M196 68l-2 -12M294 86l6 -12M308 76l4 -12M324 68l2 -12"/></g>`;
  }
  return { back, face: f, front };
}

function nose(sp: Species, skin: string, eyeY: number): string {
  const sh = dark(skin, 0.35);
  switch (sp) {
    case 'dwarf': return `<path d="M250 ${eyeY - 6}C244 ${eyeY + 12} 232 ${eyeY + 26} 238 ${eyeY + 40}C246 ${eyeY + 52} 274 ${eyeY + 52} 282 ${eyeY + 40}C288 ${eyeY + 26} 276 ${eyeY + 12} 270 ${eyeY - 6}Z" fill="${light(skin, 0.08)}" stroke="${sh}" stroke-width="2"/><ellipse cx="266" cy="${eyeY + 30}" rx="7" ry="4.5" fill="#FFFFFF" opacity="0.4"/><ellipse cx="250" cy="${eyeY + 42}" rx="5" ry="3" fill="${dark(skin, 0.5)}"/><ellipse cx="272" cy="${eyeY + 42}" rx="5" ry="3" fill="${dark(skin, 0.5)}"/>`;
    case 'orc': return `<path d="M246 ${eyeY + 10}C240 ${eyeY + 30} 244 ${eyeY + 44} 260 ${eyeY + 44}C276 ${eyeY + 44} 280 ${eyeY + 30} 274 ${eyeY + 10}" fill="${light(skin, 0.05)}" stroke="${sh}" stroke-width="2"/><ellipse cx="252" cy="${eyeY + 40}" rx="5" ry="3.5" fill="${dark(skin, 0.5)}"/><ellipse cx="268" cy="${eyeY + 40}" rx="5" ry="3.5" fill="${dark(skin, 0.5)}"/>`;
    case 'fen': return `<ellipse cx="250" cy="${eyeY + 46}" rx="3.5" ry="2.5" fill="${dark(skin, 0.5)}"/><ellipse cx="270" cy="${eyeY + 46}" rx="3.5" ry="2.5" fill="${dark(skin, 0.5)}"/>`;
    case 'moth': return `<path d="M256 ${eyeY + 34}Q260 ${eyeY + 38} 264 ${eyeY + 34}" stroke="${sh}" stroke-width="2" fill="none"/>`;
    case 'dead': return `<path d="M254 ${eyeY + 34}L258 ${eyeY + 22}L260 ${eyeY + 36}M266 ${eyeY + 34}L262 ${eyeY + 22}" stroke="${dark(skin, 0.6)}" stroke-width="2.5" fill="none"/>`;
    default: return `<path d="M258 ${eyeY + 4}C254 ${eyeY + 20} 248 ${eyeY + 30} 252 ${eyeY + 38}C256 ${eyeY + 42} 266 ${eyeY + 42} 270 ${eyeY + 38}" stroke="${sh}" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="264" cy="${eyeY + 28}" rx="4" ry="6" fill="#FFFFFF" opacity="0.25"/>`;
  }
}

function eyesArt(sp: Species, per: Persona, e: { l: [number, number]; r: [number, number] }, eyeC: string): string {
  const one = ([x, y]: [number, number], side: 'l' | 'r'): string => {
    const kind = per.eyes === 'wink' && side === 'r' ? 'closed' : per.eyes;
    if (kind === 'closed') return `<path d="M${x - 16} ${y}C${x - 8} ${y + 8} ${x + 8} ${y + 8} ${x + 16} ${y}" stroke="${OL}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M${x - 14} ${y + 2}l-4 4M${x + 14} ${y + 2}l4 4" stroke="${OL}" stroke-width="2"/>`;
    // Moth folk: big dark eyes with a sheen. Fenfolk: big round eyes with slit pupils.
    if (sp === 'moth') {
      const lid = kind === 'half' ? `<path d="M${x - 22} ${y - 2}C${x - 10} ${y - 16} ${x + 10} ${y - 16} ${x + 22} ${y - 2}L${x + 22} ${y - 18}H${x - 22}Z" fill="${per.skin ?? SKIN.moonveil}"/>` : '';
      return `<ellipse cx="${x}" cy="${y}" rx="${kind === 'wide' ? 22 : 20}" ry="${kind === 'wide' ? 17 : 14}" fill="#2A2048" stroke="${OL}" stroke-width="2.5"/><ellipse cx="${x - 6}" cy="${y - 5}" rx="6" ry="4" fill="#FFFFFF" opacity="0.85"/><ellipse cx="${x + 7}" cy="${y + 5}" rx="3" ry="2" fill="#B9A8F0" opacity="0.8"/>${lid}`;
    }
    if (sp === 'fen') {
      const lid = kind === 'half' || kind === 'squint' ? `<path d="M${x - 24} ${y - 2}C${x - 10} ${y - 12} ${x + 10} ${y - 12} ${x + 24} ${y - 2}V${y - 26}H${x - 24}Z" fill="${per.skin ?? SKIN.fenfolk}" stroke="${OL}" stroke-width="2"/>` : '';
      return `<circle cx="${x}" cy="${y}" r="24" fill="${per.skin ?? SKIN.fenfolk}" stroke="${OL}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="17" fill="${eyeC}" stroke="${OL}" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="3.5" ry="12" fill="${OL}"/><circle cx="${x - 6}" cy="${y - 6}" r="4" fill="#FFFFFF" opacity="0.9"/>${lid}`;
    }
    if (kind === 'glow' || sp === 'dead') {
      const c = kind === 'glow' ? eyeC : '#7FF2C9';
      return `<ellipse cx="${x}" cy="${y}" rx="17" ry="${per.eyes === 'half' ? 8 : 12}" fill="#120E14" stroke="${OL}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/><circle cx="${x}" cy="${y}" r="14" fill="${c}" opacity="0.25"/><circle cx="${x - 2}" cy="${y - 2}" r="2.5" fill="#FFFFFF"/>`;
    }
    const rx = kind === 'wide' ? 17 : 15;
    const ry = kind === 'wide' ? 12 : kind === 'squint' ? 5 : kind === 'half' ? 7 : 9;
    const iris = kind === 'wide' ? 6 : 7;
    let s = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#F6EEE4" stroke="${OL}" stroke-width="2"/>`;
    s += `<circle cx="${x + (side === 'l' ? 1 : -1)}" cy="${y}" r="${Math.min(iris, ry)}" fill="${eyeC}"/><circle cx="${x + (side === 'l' ? 1 : -1)}" cy="${y}" r="${Math.min(iris, ry) * 0.5}" fill="${OL}"/><circle cx="${x + 3}" cy="${y - 3}" r="2" fill="#FFFFFF"/>`;
    // Upper lid line.
    s += `<path d="M${x - rx - 2} ${y + 1}C${x - 8} ${y - ry - 5} ${x + 8} ${y - ry - 5} ${x + rx + 2} ${y + 1}" stroke="${OL}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    return s;
  };
  return one(e.l, 'l') + one(e.r, 'r');
}

function browsArt(b: Brow, e: { l: [number, number]; r: [number, number] }, c: string): string {
  // Inner and outer end heights (negative = higher), for the left brow; the right mirrors.
  const shape: Record<Brow, [number, number, number, number]> = {
    calm: [0, 0, 0, 0], angry: [10, -6, 10, -6], raised: [-8, -10, -14, -14], worried: [-10, 6, -10, 6],
    sly: [6, -2, -12, -14], stern: [6, 2, 6, 2], sad: [-12, 8, -12, 8],
  };
  const [li, lo, ri, ro] = shape[b];
  const by = (y: number) => y - 26;
  const [lx, ly] = e.l;
  const [rx, ry] = e.r;
  const w = 4.5;
  return `<g stroke="${dark(c, 0.15)}" stroke-width="${w * 2}" stroke-linecap="round" fill="none">
<path d="M${lx - 20} ${by(ly) + lo}Q${lx - 4} ${by(ly) - 8 + (lo + li) / 2} ${lx + 16} ${by(ly) + li}"/>
<path d="M${rx + 20} ${by(ry) + ro}Q${rx + 4} ${by(ry) - 8 + (ro + ri) / 2} ${rx - 16} ${by(ry) + ri}"/></g>`;
}

function mouthArt(m: Mouth, sp: Species, y: number, skin: string): string {
  const lip = dark(skin, 0.45);
  const wide = sp === 'fen' ? 40 : sp === 'orc' ? 26 : 20;
  const x0 = 260 - wide, x1 = 260 + wide;
  switch (m) {
    case 'smile': return `<path d="M${x0} ${y - 4}C${x0 + 10} ${y + 10} ${x1 - 10} ${y + 10} ${x1} ${y - 4}" stroke="${OL}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M${x0 + 8} ${y + 10}C${x0 + 16} ${y + 14} ${x1 - 16} ${y + 14} ${x1 - 8} ${y + 10}" stroke="${lip}" stroke-width="2" fill="none" opacity="0.6"/>`;
    case 'grin': case 'gap': return `<path d="M${x0} ${y - 4}C${x0 + 6} ${y + 18} ${x1 - 6} ${y + 18} ${x1} ${y - 4}Z" fill="#5A1E18" stroke="${OL}" stroke-width="3"/><path d="M${x0 + 4} ${y - 2}H${x1 - 4}V${y + 5}H${x0 + 4}Z" fill="#F6F0E4"/>${m === 'gap' ? `<rect x="258" y="${y - 2}" width="5" height="7" fill="#2A120C"/>` : ''}<path d="M${x0} ${y - 4}C${x0 + 6} ${y + 18} ${x1 - 6} ${y + 18} ${x1} ${y - 4}Z" fill="none" stroke="${OL}" stroke-width="3"/>`;
    case 'smirk': return `<path d="M${x0 + 4} ${y + 2}C${x0 + 16} ${y + 6} ${x1 - 10} ${y + 2} ${x1 + 2} ${y - 8}" stroke="${OL}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    case 'frown': return `<path d="M${x0 + 2} ${y + 6}C${x0 + 12} ${y - 6} ${x1 - 12} ${y - 6} ${x1 - 2} ${y + 6}" stroke="${OL}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    case 'neutral': return `<path d="M${x0 + 4} ${y + 2}H${x1 - 4}" stroke="${OL}" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'open': return `<ellipse cx="260" cy="${y + 4}" rx="${Math.min(14, wide - 6)}" ry="12" fill="#5A1E18" stroke="${OL}" stroke-width="3"/><path d="M${260 - 8} ${y + 10}C${256} ${y + 6} ${264} ${y + 6} ${268} ${y + 10}" fill="#D86A6A"/>`;
    case 'sing': return `<ellipse cx="260" cy="${y + 4}" rx="10" ry="14" fill="#5A1E18" stroke="${OL}" stroke-width="3"/><g fill="none" stroke="${OL}" stroke-width="2.5"><path d="M330 ${y - 40}v-20l12 -4v20"/><circle cx="326" cy="${y - 40}" r="5" fill="${OL}"/><circle cx="338" cy="${y - 44}" r="5" fill="${OL}"/></g>`;
    case 'snarl': return `<path d="M${x0} ${y - 2}C${x0 + 10} ${y - 12} ${x1 - 10} ${y - 12} ${x1} ${y - 2}C${x1 - 6} ${y + 14} ${x0 + 6} ${y + 14} ${x0} ${y - 2}Z" fill="#5A1E18" stroke="${OL}" stroke-width="3"/><path d="M${x0 + 6} ${y - 4}l5 8 5 -8 5 8 5 -8 5 8 5 -8 5 8 5 -8" fill="#F6F0E4" stroke="${OL}" stroke-width="1"/>`;
    case 'tongue': return `<path d="M${x0} ${y}C${x0 + 20} ${y + 8} ${x1 - 20} ${y + 8} ${x1} ${y - 6}" stroke="${OL}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M262 ${y + 6}C262 ${y + 24} 270 ${y + 34} 276 ${y + 40}L280 ${y + 32}L284 ${y + 44}C276 ${y + 40} 268 ${y + 30} 268 ${y + 6}Z" fill="#D85A6A" stroke="${OL}" stroke-width="2"/>`;
  }
}

function beardArt(b: Beard, c: string, e: { mouth: number; chin: number }, sp: Species): string {
  const g1 = light(c, 0.25), g2 = dark(c, 0.4);
  const y = e.mouth;
  const stache = `<path d="M214 ${y - 12}C226 ${y - 26} 248 ${y - 28} 260 ${y - 18}C272 ${y - 28} 294 ${y - 26} 306 ${y - 12}C312 ${y - 4} 318 ${y + 2} 326 ${y}C318 ${y + 14} 300 ${y + 16} 286 ${y + 8}C276 ${y + 4} 266 ${y} 260 ${y - 4}C254 ${y} 244 ${y + 4} 234 ${y + 8}C220 ${y + 16} 202 ${y + 14} 194 ${y}C202 ${y + 2} 208 ${y - 4} 214 ${y - 12}Z" fill="${g1}" stroke="${OL}" stroke-width="2"/>`;
  const strands = (n: number) => `<g stroke="${g2}" stroke-width="2" fill="none" opacity="0.6">${Array.from({ length: n }, (_, i) => { const x = 210 + (i * 100) / (n - 1); return `<path d="M${x} ${y + 20}C${x - 4} ${y + 60} ${x} ${y + 100} ${x + (x < 260 ? 8 : -8)} ${y + 130}"/>`; }).join('')}</g>`;
  switch (b) {
    case 'full': case 'braided': case 'singed': case 'moss': {
      const main = `<path d="M186 ${y - 40}C176 ${y + 10} 182 ${y + 66} 204 ${y + 104}C220 ${y + 132} 240 ${y + 150} 260 ${y + 158}C280 ${y + 150} 300 ${y + 132} 316 ${y + 104}C338 ${y + 66} 344 ${y + 10} 334 ${y - 40}C322 ${y - 10} 300 ${y + 6} 260 ${y + 8}C220 ${y + 6} 198 ${y - 10} 186 ${y - 40}Z" fill="${c}" stroke="${OL}" stroke-width="2.5"/>`;
      let s = main + strands(6);
      if (b === 'braided') s += `<g stroke="${OL}" stroke-width="1.5"><ellipse cx="236" cy="${y + 130}" rx="9" ry="8" fill="${c}"/><ellipse cx="236" cy="${y + 144}" rx="8" ry="7" fill="${g2}"/><ellipse cx="284" cy="${y + 130}" rx="9" ry="8" fill="${c}"/><ellipse cx="284" cy="${y + 144}" rx="8" ry="7" fill="${g2}"/></g><rect x="226" y="${y + 134}" width="20" height="7" rx="2" fill="#C9A24A" stroke="${OL}"/><rect x="274" y="${y + 134}" width="20" height="7" rx="2" fill="#C9A24A" stroke="${OL}"/>`;
      if (b === 'singed') s += `<path d="M204 ${y + 104}l8 -10 6 12 8 -12 6 14 8 -14 6 16 8 -16 6 14 8 -12 6 12 8 -10" fill="none" stroke="#2A1A14" stroke-width="5"/><path d="M300 ${y + 120}C290 ${y + 100} 310 ${y + 90} 300 ${y + 70}" stroke="#9A9A9A" stroke-width="3" fill="none" opacity="0.5"/>`;
      if (b === 'moss') s += `<g fill="#8AB04A">${Array.from({ length: 7 }, (_, i) => `<circle cx="${214 + i * 15}" cy="${y + 40 + (i % 3) * 22}" r="5"/>`).join('')}</g>`;
      return s + (sp === 'dwarf' || b !== 'moss' ? stache : '');
    }
    case 'forked':
      return `<path d="M190 ${y - 36}C186 ${y + 10} 200 ${y + 50} 226 ${y + 70}L240 ${y + 120}L258 ${y + 74}L280 ${y + 120}L294 ${y + 70}C320 ${y + 50} 334 ${y + 10} 330 ${y - 36}C318 ${y - 6} 296 ${y + 8} 260 ${y + 10}C224 ${y + 8} 202 ${y - 6} 190 ${y - 36}Z" fill="${c}" stroke="${OL}" stroke-width="2.5"/>` + stache;
    case 'goatee':
      return `<path d="M244 ${y + 12}C244 ${y + 40} 252 ${y + 60} 260 ${y + 70}C268 ${y + 60} 276 ${y + 40} 276 ${y + 12}C268 ${y + 18} 252 ${y + 18} 244 ${y + 12}Z" fill="${c}" stroke="${OL}" stroke-width="2"/><path d="M232 ${y - 6}C244 ${y - 14} 254 ${y - 12} 260 ${y - 8}C266 ${y - 12} 276 ${y - 14} 288 ${y - 6}" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    case 'stubble':
      return `<g fill="${g2}" opacity="0.45">${Array.from({ length: 40 }, (_, i) => `<circle cx="${206 + ((i * 37) % 108)}" cy="${y - 4 + ((i * 53) % 34)}" r="1.4"/>`).join('')}</g>`;
    case 'long':
      return `<path d="M210 ${y - 10}C206 ${y + 40} 224 ${y + 120} 260 ${y + 160}C296 ${y + 120} 314 ${y + 40} 310 ${y - 10}C296 ${y + 6} 280 ${y + 10} 260 ${y + 10}C240 ${y + 10} 224 ${y + 6} 210 ${y - 10}Z" fill="${c}" stroke="${OL}" stroke-width="2" opacity="0.92"/>` + strands(4) + stache;
    default:
      return '';
  }
}

function hairFront(h: Hair, c: string, _sp: Species, top: number): string {
  const g2 = dark(c, 0.35), g1 = light(c, 0.25);
  const cap = (extra = '') => `<path d="M188 ${top + 76}C184 ${top + 20} 220 ${top - 10} 260 ${top - 10}C300 ${top - 10} 336 ${top + 20} 332 ${top + 76}C320 ${top + 50} 300 ${top + 40} 276 ${top + 44}L266 ${top + 30}L256 ${top + 46}C236 ${top + 40} 214 ${top + 46} 200 ${top + 66}Z" fill="${c}" stroke="${OL}" stroke-width="2.5"/><path d="M206 ${top + 30}C226 ${top + 6} 260 ${top} 290 ${top + 10}" stroke="${g1}" stroke-width="5" fill="none" opacity="0.6" stroke-linecap="round"/>${extra}`;
  switch (h) {
    case 'none': return '';
    case 'short': case 'bob': case 'long': return cap();
    case 'swept': return `<path d="M188 ${top + 70}C180 ${top + 10} 230 ${top - 18} 290 ${top - 8}C330 ${top} 350 ${top + 30} 334 ${top + 70}C320 ${top + 40} 290 ${top + 30} 250 ${top + 40}C230 ${top + 44} 206 ${top + 52} 188 ${top + 70}Z" fill="${c}" stroke="${OL}" stroke-width="2.5"/><path d="M210 ${top + 30}C240 ${top + 10} 290 ${top + 6} 320 ${top + 26}" stroke="${g1}" stroke-width="5" fill="none" opacity="0.6"/>`;
    case 'messy': case 'wild': {
      const spikes = h === 'wild' ? 22 : 12;
      return `<path d="M186 ${top + 74}L176 ${top + 40}L196 ${top + 30}L190 ${top}L216 ${top + 8}L222 ${top - spikes}L244 ${top - 2}L260 ${top - spikes - 6}L276 ${top - 2}L300 ${top - spikes}L304 ${top + 10}L330 ${top + 2}L326 ${top + 32}L344 ${top + 42}L334 ${top + 76}C318 ${top + 50} 290 ${top + 40} 260 ${top + 46}C230 ${top + 40} 204 ${top + 50} 186 ${top + 74}Z" fill="${c}" stroke="${OL}" stroke-width="2.5"/>`;
    }
    case 'mohawk': return `<path d="M244 ${top + 30}L236 ${top - 30}L252 ${top - 16}L256 ${top - 50}L266 ${top - 20}L280 ${top - 40}L278 ${top + 30}Z" fill="${c}" stroke="${OL}" stroke-width="2.5"/>`;
    case 'topknot': return `<path d="M232 ${top + 6}C240 ${top - 4} 280 ${top - 4} 288 ${top + 6}" stroke="${c}" stroke-width="10" fill="none"/><ellipse cx="260" cy="${top - 22}" rx="20" ry="18" fill="${c}" stroke="${OL}" stroke-width="2.5"/><rect x="248" y="${top - 6}" width="24" height="8" rx="3" fill="#C9A24A" stroke="${OL}" stroke-width="1.5"/>`;
    case 'bun': return cap(`<circle cx="260" cy="${top - 18}" r="22" fill="${c}" stroke="${OL}" stroke-width="2.5"/><path d="M246 ${top - 26}C254 ${top - 34} 266 ${top - 34} 274 ${top - 26}" stroke="${g1}" stroke-width="3" fill="none"/>`);
    case 'braids': return cap(`<g stroke="${OL}" stroke-width="2">${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${198 - i}" cy="${top + 110 + i * 26}" rx="13" ry="14" fill="${i % 2 ? g2 : c}"/><ellipse cx="${322 + i}" cy="${top + 110 + i * 26}" rx="13" ry="14" fill="${i % 2 ? g2 : c}"/>`).join('')}</g><g fill="#C9A24A" stroke="${OL}" stroke-width="1.5"><rect x="186" y="${top + 236}" width="22" height="8" rx="3"/><rect x="314" y="${top + 236}" width="22" height="8" rx="3"/></g>`);
    case 'curly': return `<g fill="${c}" stroke="${OL}" stroke-width="2.5">${[[196, 60], [206, 30], [230, 12], [260, 4], [290, 12], [314, 30], [324, 60], [214, 50], [304, 50]].map(([x, y]) => `<circle cx="${x}" cy="${top + y}" r="22"/>`).join('')}</g><g fill="none" stroke="${g1}" stroke-width="3" opacity="0.6"><path d="M220 ${top + 10}a10 10 0 0 1 16 0M270 ${top + 2}a10 10 0 0 1 16 0"/></g>`;
    case 'leafy': return cap(`<g fill="#7AA84A" stroke="${OL}" stroke-width="2">${[[190, 40, -40], [212, 10, -20], [250, -6, 0], [292, 4, 20], [326, 34, 40]].map(([x, y, r]) => `<path transform="translate(${x} ${top + y}) rotate(${r})" d="M0 0C-10 -16 -6 -30 0 -38C6 -30 10 -16 0 0Z"/>`).join('')}</g>`);
    case 'flame': return `<path d="M190 ${top + 70}C176 ${top + 30} 196 ${top} 210 ${top - 20}C212 ${top} 222 ${top + 6} 228 ${top - 6}C228 ${top - 34} 248 ${top - 50} 260 ${top - 70}C266 ${top - 44} 286 ${top - 36} 290 ${top - 10}C296 ${top - 4} 306 ${top - 14} 310 ${top - 26}C326 ${top} 344 ${top + 30} 330 ${top + 70}C310 ${top + 44} 290 ${top + 40} 260 ${top + 44}C230 ${top + 40} 206 ${top + 46} 190 ${top + 70}Z" fill="#FF7A2A" stroke="${OL}" stroke-width="2.5"/><path d="M220 ${top + 30}C226 ${top + 4} 244 ${top - 14} 260 ${top - 40}C266 ${top - 10} 284 ${top} 300 ${top + 24}" fill="#FFD27A" opacity="0.85"/>`;
    case 'feathers': return `<g stroke="${OL}" stroke-width="2.5">${[[188, 70, -50], [200, 40, -35], [220, 18, -18], [248, 6, -5], [276, 6, 8], [302, 18, 22], [322, 40, 36], [334, 70, 50]].map(([x, y, r]) => `<path transform="translate(${x} ${top + y}) rotate(${r})" d="M0 0C-12 -20 -10 -44 0 -58C10 -44 12 -20 0 0Z" fill="${c}"/>`).join('')}</g><g stroke="#5E5E8A" stroke-width="1.5">${[220, 260, 300].map((x) => `<path d="M${x} ${top + 10}V${top - 30}"/>`).join('')}</g>`;
  }
}

/** Hair worth showing off. */
const SHOWN_HAIR: Hair[] = ['mohawk', 'topknot', 'flame', 'wild', 'feathers', 'swept', 'messy', 'bun'];

/** Hats that cover the whole top of the head. */
const COVERING: Hat[] = ['hood', 'cowl', 'helmet', 'horned', 'hornedBroken', 'wingedHelm', 'dragonhelm', 'wolfpelt', 'boarpelt', 'kerchief', 'mushroomHat', 'wizard', 'trophyHat', 'featherCap', 'cap', 'bandana'];

function braidsOnly(c: string, top: number): string {
  const g2 = dark(c, 0.35);
  return `<g stroke="${OL}" stroke-width="2">${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${198 - i}" cy="${top + 110 + i * 26}" rx="13" ry="14" fill="${i % 2 ? g2 : c}"/><ellipse cx="${322 + i}" cy="${top + 110 + i * 26}" rx="13" ry="14" fill="${i % 2 ? g2 : c}"/>`).join('')}</g><g fill="#C9A24A" stroke="${OL}" stroke-width="1.5"><rect x="186" y="${top + 236}" width="22" height="8" rx="3"/><rect x="314" y="${top + 236}" width="22" height="8" rx="3"/></g>`;
}

function defaultHat(d: HeroDef): Hat {
  const sp = SPECIES[d.tribe];
  switch (d.heroClass) {
    case 'warrior': return sp === 'dwarf' ? 'horned' : 'helmet';
    case 'ranger': return 'hood';
    case 'rogue': return 'hood';
    case 'mage': return sp === 'moth' || sp === 'dead' ? 'none' : 'wizard';
    case 'cleric': return 'circlet';
    case 'bard': return 'featherCap';
    case 'paladin': return 'wingedHelm';
    case 'beastmaster': return 'wolfpelt';
    case 'necromancer': return 'cowl';
    case 'dragonslayer': return 'dragonhelm';
  }
}

function hatArt(hat: Hat, d: HeroDef, top: number, id: string): string {
  const acc = ACCENT[d.tribe];
  const steel = `url(#${id}-steel)`;
  const helmetDome = `<path d="M180 ${top + 56}C180 ${top - 4} 218 ${top - 30} 260 ${top - 30}C302 ${top - 30} 340 ${top - 4} 340 ${top + 56}Z" fill="${steel}" stroke="${OL}" stroke-width="3"/><path d="M200 ${top + 40}C202 ${top + 8} 222 ${top - 14} 248 ${top - 22}" stroke="#FFFFFF" stroke-width="5" opacity="0.5" fill="none" stroke-linecap="round"/>
<path d="M172 ${top + 54}C230 ${top + 42} 290 ${top + 42} 348 ${top + 54}L346 ${top + 80}C290 ${top + 68} 230 ${top + 68} 174 ${top + 80}Z" fill="${steel}" stroke="${OL}" stroke-width="3"/>`;
  const horn = (s: number, broken: boolean) => `<g transform="translate(260 0) scale(${s} 1)"><path d="M-70 ${top + 30}C-100 ${top + 26} -128 ${top + 10} -140 ${top - 20}C-148 ${top - 40} -144 ${top - 62} -132 ${top - 74}${broken ? `L-126 ${top - 56}L-118 ${top - 60}L-112 ${top - 44}` : `C-130 ${top - 46} -118 ${top - 22} -94 ${top - 6}`}C-82 ${top + 2} -72 ${top + 6} -64 ${top + 8}Z" fill="#E9DCC0" stroke="${OL}" stroke-width="2.5"/><path d="M-90 ${top + 22}C-96 ${top + 30} -98 ${top + 36} -96 ${top + 42}M-110 ${top + 10}C-118 ${top + 18} -122 ${top + 26} -120 ${top + 32}" stroke="#9A845A" stroke-width="2" fill="none"/></g>`;
  switch (hat) {
    case 'none': return '';
    case 'helmet': return helmetDome + `<path d="M260 ${top - 30}V${top + 50}" stroke="${OL}" stroke-width="3"/>`;
    case 'horned': return horn(1, false) + horn(-1, false) + helmetDome;
    case 'hornedBroken': return horn(1, false) + horn(-1, true) + helmetDome + `<path d="M248 ${top + 64}L258 ${top + 48}L264 ${top + 56}L268 ${top + 50}L276 ${top + 64}Z" fill="#C9A24A" stroke="${OL}" stroke-width="1.5"/>`;
    case 'hood': case 'cowl': {
      const c = hat === 'cowl' ? '#1E1A26' : d.tribe === 'fenfolk' ? '#6A3A6E' : dark(acc, 0.1);
      return `<path d="M168 ${top + 190}C150 ${top + 100} 170 ${top - 10} 260 ${top - 34}C350 ${top - 10} 370 ${top + 100} 352 ${top + 190}C340 ${top + 120} 330 ${top + 50} 260 ${top + 30}C190 ${top + 50} 180 ${top + 120} 168 ${top + 190}Z" fill="${c}" stroke="${OL}" stroke-width="3"/><path d="M190 ${top + 120}C196 ${top + 60} 220 ${top + 30} 260 ${top + 22}" stroke="${light(c, 0.25)}" stroke-width="4" fill="none" opacity="0.6"/>`;
    }
    case 'wizard': return `<path d="M160 ${top + 50}C200 ${top + 30} 320 ${top + 30} 360 ${top + 50}C340 ${top + 66} 180 ${top + 66} 160 ${top + 50}Z" fill="${acc}" stroke="${OL}" stroke-width="3"/><path d="M206 ${top + 44}L270 ${top - 120}C290 ${top - 130} 320 ${top - 120} 330 ${top - 100}C310 ${top - 104} 296 ${top - 100} 290 ${top - 90}L316 ${top + 44}Z" fill="${acc}" stroke="${OL}" stroke-width="3"/><path d="M210 ${top + 30}C240 ${top + 22} 290 ${top + 22} 314 ${top + 30}" stroke="#C9A24A" stroke-width="6" fill="none"/><path d="M270 ${top - 30}l4 8 9 1-7 6 2 9-8 -5-8 5 2 -9-7 -6 9 -1Z" fill="#F1D27A"/>`;
    case 'featherCap': return `<path d="M180 ${top + 50}C180 ${top - 6} 230 ${top - 24} 270 ${top - 20}C320 ${top - 16} 346 ${top + 14} 344 ${top + 50}C300 ${top + 36} 220 ${top + 36} 180 ${top + 50}Z" fill="${acc}" stroke="${OL}" stroke-width="3"/><path d="M300 ${top - 4}C340 ${top - 60} 380 ${top - 80} 410 ${top - 110}C396 ${top - 70} 370 ${top - 30} 320 ${top + 4}Z" fill="#C8423A" stroke="${OL}" stroke-width="2.5"/><path d="M306 ${top}C340 ${top - 40} 370 ${top - 70} 400 ${top - 100}" stroke="#F6D0C0" stroke-width="2" fill="none"/>`;
    case 'cap': return `<path d="M184 ${top + 46}C184 ${top - 2} 226 ${top - 16} 262 ${top - 16}C302 ${top - 16} 336 ${top} 336 ${top + 40}C300 ${top + 30} 220 ${top + 34} 184 ${top + 46}Z" fill="${d.tribe === 'moonveil' ? '#5E4E8C' : '#6E5A3E'}" stroke="${OL}" stroke-width="3"/><path d="M180 ${top + 46}C220 ${top + 30} 300 ${top + 28} 352 ${top + 48}C340 ${top + 60} 300 ${top + 54} 260 ${top + 54}C230 ${top + 54} 200 ${top + 58} 180 ${top + 46}Z" fill="${dark('#6E5A3E', 0.2)}" stroke="${OL}" stroke-width="2.5"/>`;
    case 'circlet': return `<path d="M190 ${top + 54}C230 ${top + 44} 290 ${top + 44} 330 ${top + 54}" stroke="${OL}" stroke-width="9" fill="none"/><path d="M190 ${top + 54}C230 ${top + 44} 290 ${top + 44} 330 ${top + 54}" stroke="#E2B84A" stroke-width="5" fill="none"/><path d="M252 ${top + 48}L260 ${top + 30}L268 ${top + 48}Z" fill="#E2B84A" stroke="${OL}" stroke-width="2"/><circle cx="260" cy="${top + 44}" r="5" fill="${d.tribe === 'ashborn' ? '#FF7A2A' : '#7FD9E6'}" stroke="${OL}" stroke-width="1.5"/>`;
    case 'tiara': return `<g transform="rotate(-10 260 ${top + 20})"><path d="M206 ${top + 34}L218 ${top}L236 ${top + 22}L260 ${top - 14}L284 ${top + 22}L302 ${top}L314 ${top + 34}Z" fill="#E2B84A" stroke="${OL}" stroke-width="2.5"/><circle cx="260" cy="${top + 14}" r="6" fill="#C8423A" stroke="${OL}" stroke-width="1.5"/></g>`;
    case 'halo': return `<ellipse cx="260" cy="${top - 36}" rx="70" ry="16" fill="none" stroke="#FFE49A" stroke-width="9" opacity="0.9"/><ellipse cx="260" cy="${top - 36}" rx="70" ry="16" fill="none" stroke="#FFFFFF" stroke-width="3"/>`;
    case 'wingedHelm': return helmetDome + `<g fill="#FBF6E8" stroke="${OL}" stroke-width="2.5"><path d="M180 ${top + 30}C150 ${top} 140 ${top - 30} 150 ${top - 60}C164 ${top - 30} 176 ${top - 14} 196 ${top}Z"/><path d="M340 ${top + 30}C370 ${top} 380 ${top - 30} 370 ${top - 60}C356 ${top - 30} 344 ${top - 14} 324 ${top}Z"/></g><circle cx="260" cy="${top + 66}" r="7" fill="#E2B84A" stroke="${OL}" stroke-width="2"/>`;
    case 'wolfpelt': case 'boarpelt': {
      const fur = hat === 'wolfpelt' ? '#7E848A' : '#6E4A2C';
      return `<path d="M164 ${top + 150}C150 ${top + 60} 180 ${top - 20} 260 ${top - 26}C340 ${top - 20} 370 ${top + 60} 356 ${top + 150}C340 ${top + 90} 320 ${top + 40} 260 ${top + 34}C200 ${top + 40} 180 ${top + 90} 164 ${top + 150}Z" fill="${fur}" stroke="${OL}" stroke-width="3"/>
<path d="M200 ${top + 4}L186 ${top - 40}L220 ${top - 12}Z M320 ${top + 4}L334 ${top - 40}L300 ${top - 12}Z" fill="${dark(fur, 0.2)}" stroke="${OL}" stroke-width="2.5"/>
<path d="M216 ${top + 30}C230 ${top + 10} 290 ${top + 10} 304 ${top + 30}C290 ${top + 44} 230 ${top + 44} 216 ${top + 30}Z" fill="${dark(fur, 0.15)}" stroke="${OL}" stroke-width="2"/><circle cx="240" cy="${top + 22}" r="4" fill="#E8C86A"/><circle cx="280" cy="${top + 22}" r="4" fill="#E8C86A"/>${hat === 'boarpelt' ? `<path d="M244 ${top + 40}C240 ${top + 54} 246 ${top + 60} 252 ${top + 56}M276 ${top + 40}C280 ${top + 54} 274 ${top + 60} 268 ${top + 56}" stroke="#F6F0E0" stroke-width="5" fill="none" stroke-linecap="round"/>` : ''}`;
    }
    case 'dragonhelm': return helmetDome.replaceAll(steel, '#5A4A40') + `<g fill="#2E2626" stroke="${OL}" stroke-width="2.5"><path d="M190 ${top + 20}C160 ${top} 150 ${top - 40} 164 ${top - 70}C172 ${top - 40} 184 ${top - 20} 206 ${top - 6}Z"/><path d="M330 ${top + 20}C360 ${top} 370 ${top - 40} 356 ${top - 70}C348 ${top - 40} 336 ${top - 20} 314 ${top - 6}Z"/></g><path d="M220 ${top - 20}l10 -16 10 14 10 -18 10 18 10 -18 10 14 10 -14" fill="none" stroke="#8E2B23" stroke-width="4"/>`;
    case 'flowerCrown': return `<path d="M190 ${top + 50}C230 ${top + 36} 290 ${top + 36} 330 ${top + 50}" stroke="#4E7A3A" stroke-width="7" fill="none"/>${[[196, 46, '#F2A0C8'], [226, 38, '#FFF3C4'], [260, 34, '#C8A0F0'], [294, 38, '#F2A0C8'], [324, 46, '#FFF3C4']].map(([x, y, c]) => `<g transform="translate(${x} ${top + Number(y)})">${[0, 72, 144, 216, 288].map((r) => `<ellipse rx="5" ry="9" transform="rotate(${r}) translate(0 -7)" fill="${c}" stroke="${OL}" stroke-width="1"/>`).join('')}<circle r="4" fill="#E2B84A"/></g>`).join('')}`;
    case 'mushroomHat': return `<path d="M150 ${top + 40}C150 ${top - 50} 370 ${top - 50} 370 ${top + 40}C330 ${top + 56} 190 ${top + 56} 150 ${top + 40}Z" fill="#C8423A" stroke="${OL}" stroke-width="3"/><g fill="#F6F0E0" stroke="${OL}" stroke-width="1.5"><circle cx="200" cy="${top + 4}" r="10"/><circle cx="250" cy="${top - 18}" r="13"/><circle cx="310" cy="${top - 4}" r="11"/><circle cx="340" cy="${top + 24}" r="7"/></g>`;
    case 'crescent': return `<path d="M200 ${top + 50}C230 ${top + 40} 290 ${top + 40} 320 ${top + 50}" stroke="#C8C0E0" stroke-width="6" fill="none"/><path d="M260 ${top - 56}A36 36 0 1 0 290 ${top + 4}A28 28 0 1 1 260 ${top - 56}Z" fill="#F4F0FF" stroke="${OL}" stroke-width="2.5"/>`;
    case 'sunCrown': return `<g stroke="#E2B84A" stroke-width="6" stroke-linecap="round">${[-60, -40, -20, 0, 20, 40, 60].map((a) => `<path d="M${260 + Math.sin((a * Math.PI) / 180) * 70} ${top + 40 - Math.cos((a * Math.PI) / 180) * 70}L${260 + Math.sin((a * Math.PI) / 180) * 104} ${top + 40 - Math.cos((a * Math.PI) / 180) * 104}"/>`).join('')}</g><path d="M190 ${top + 50}C230 ${top + 40} 290 ${top + 40} 330 ${top + 50}" stroke="#E2B84A" stroke-width="8" fill="none"/>`;
    case 'kerchief': return `<path d="M180 ${top + 70}C176 ${top} 220 ${top - 20} 260 ${top - 20}C300 ${top - 20} 344 ${top} 340 ${top + 70}C320 ${top + 40} 200 ${top + 40} 180 ${top + 70}Z" fill="#8E2B4A" stroke="${OL}" stroke-width="3"/><g fill="#F6F0E0">${[[210, 20], [240, 6], [280, 6], [310, 20], [260, 30]].map(([x, y]) => `<circle cx="${x}" cy="${top + y}" r="4"/>`).join('')}</g>`;
    case 'shellCrown': return `<path d="M200 ${top + 40}C230 ${top + 30} 290 ${top + 30} 320 ${top + 40}" stroke="#E8D8C8" stroke-width="6" fill="none"/><path d="M230 ${top + 34}C224 ${top - 10} 296 ${top - 10} 290 ${top + 34}Z" fill="#F2C8B0" stroke="${OL}" stroke-width="2.5"/><path d="M260 ${top + 30}V${top - 2}M246 ${top + 30}L240 ${top + 4}M274 ${top + 30}L280 ${top + 4}" stroke="#C88A6A" stroke-width="2"/>`;
    case 'trophyHat': return `<path d="M150 ${top + 46}C190 ${top + 30} 330 ${top + 30} 370 ${top + 46}C340 ${top + 60} 180 ${top + 60} 150 ${top + 46}Z" fill="#6E4A28" stroke="${OL}" stroke-width="3"/><path d="M204 ${top + 40}C200 ${top - 30} 320 ${top - 30} 316 ${top + 40}Z" fill="#7A5232" stroke="${OL}" stroke-width="3"/><path d="M206 ${top + 26}H314" stroke="#3A2414" stroke-width="7"/><path d="M296 ${top + 20}C330 ${top - 20} 340 ${top - 50} 330 ${top - 70}C320 ${top - 40} 300 ${top - 20} 284 ${top - 4}Z" fill="#4E8C76" stroke="${OL}" stroke-width="2"/>`;
    case 'boneCrown': return `<g fill="#EEE8DA" stroke="${OL}" stroke-width="2.5"><path d="M196 ${top + 46}L204 ${top - 6}L222 ${top + 30}L236 ${top - 24}L250 ${top + 26}L260 ${top - 36}L270 ${top + 26}L284 ${top - 24}L298 ${top + 30}L316 ${top - 6}L324 ${top + 46}Z"/></g><circle cx="260" cy="${top + 24}" r="6" fill="#7FF2C9" stroke="${OL}" stroke-width="1.5"/>`;
    case 'bandana': return `<path d="M184 ${top + 60}C184 ${top} 336 ${top} 336 ${top + 60}C300 ${top + 46} 220 ${top + 46} 184 ${top + 60}Z" fill="#8E2B23" stroke="${OL}" stroke-width="3"/>`;
  }
}

function tellArt(t: Tell, e: { l: [number, number]; r: [number, number]; mouth: number }, skin: string): string {
  const [lx, ly] = e.l, [rx, ry] = e.r;
  switch (t) {
    case 'scar': return `<path d="M${rx + 6} ${ry + 26}L${rx + 22} ${ry + 52}" stroke="${light(skin, 0.35)}" stroke-width="5" stroke-linecap="round"/><path d="M${rx + 6} ${ry + 26}L${rx + 22} ${ry + 52}" stroke="${dark(skin, 0.35)}" stroke-width="1.5"/>`;
    case 'eyescar': return `<path d="M${lx - 14} ${ly - 34}C${lx - 8} ${ly - 10} ${lx - 2} ${ly + 10} ${lx + 8} ${ly + 32}" stroke="${light(skin, 0.35)}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M${lx - 14} ${ly - 34}C${lx - 8} ${ly - 10} ${lx - 2} ${ly + 10} ${lx + 8} ${ly + 32}" stroke="${dark(skin, 0.35)}" stroke-width="1.5" fill="none"/>`;
    case 'claws': return `<g stroke="${dark(skin, 0.3)}" stroke-width="3" stroke-linecap="round"><path d="M${rx - 6} ${ry - 30}L${rx + 14} ${ry + 30}M${rx + 4} ${ry - 32}L${rx + 24} ${ry + 24}M${rx + 14} ${ry - 30}L${rx + 30} ${ry + 14}"/></g>`;
    case 'freckles': return `<g fill="${dark(skin, 0.3)}" opacity="0.7">${[[-14, 24], [-4, 28], [-10, 34], [6, 24]].flatMap(([dx, dy]) => [`<circle cx="${lx + dx}" cy="${ly + dy}" r="2"/>`, `<circle cx="${rx - dx}" cy="${ry + dy}" r="2"/>`]).join('')}</g>`;
    case 'warpaint': return `<path d="M${lx - 20} ${ly + 16}L${lx + 14} ${ly + 22}L${lx - 18} ${ly + 30}Z M${rx + 20} ${ry + 16}L${rx - 14} ${ry + 22}L${rx + 18} ${ry + 30}Z" fill="#3D6EB8" opacity="0.75"/>`;
    case 'stripes': return `<g stroke="#8E2B23" stroke-width="5" stroke-linecap="round" opacity="0.7"><path d="M${lx - 20} ${ly + 14}L${lx + 4} ${ly + 20}M${lx - 18} ${ly + 26}L${lx + 2} ${ly + 30}M${rx + 20} ${ry + 14}L${rx - 4} ${ry + 20}M${rx + 18} ${ry + 26}L${rx - 2} ${ry + 30}"/></g>`;
    case 'rune': return `<g stroke="#7FD9E6" stroke-width="3" fill="none" stroke-linecap="round"><path d="M252 ${ly - 52}l8 12 8 -12M260 ${ly - 40}v12"/></g><g stroke="#7FD9E6" stroke-width="8" opacity="0.2"><path d="M252 ${ly - 52}l8 12 8 -12"/></g>`;
    case 'earring': return `<circle cx="${rx + 46}" cy="${ry + 40}" r="7" fill="none" stroke="#E2B84A" stroke-width="3"/>`;
    case 'nosering': return `<path d="M254 ${ly + 44}A8 8 0 0 0 266 ${ly + 44}" stroke="#E2B84A" stroke-width="3" fill="none"/>`;
    case 'stitches': return `<path d="M${lx - 24} ${ly + 30}L${lx + 6} ${ly + 50}" stroke="${dark(skin, 0.5)}" stroke-width="2"/><g stroke="${dark(skin, 0.6)}" stroke-width="2">${[0, 1, 2, 3].map((i) => `<path d="M${lx - 22 + i * 8} ${ly + 26 + i * 6}l6 10"/>`).join('')}</g>`;
    case 'goggles': return `<g><path d="M190 ${ly - 34}H330" stroke="#3A2414" stroke-width="8"/><circle cx="${lx}" cy="${ly - 34}" r="16" fill="#7FD9E6" fill-opacity="0.5" stroke="#8A6A3E" stroke-width="5"/><circle cx="${rx}" cy="${ry - 34}" r="16" fill="#7FD9E6" fill-opacity="0.5" stroke="#8A6A3E" stroke-width="5"/></g>`;
    case 'monocle': return `<circle cx="${rx}" cy="${ry}" r="20" fill="#C8E4F0" fill-opacity="0.25" stroke="#C9A24A" stroke-width="4"/><path d="M${rx + 18} ${ry + 8}C${rx + 30} ${ry + 40} ${rx + 20} ${ry + 70} ${rx + 30} ${ry + 100}" stroke="#C9A24A" stroke-width="1.5" fill="none"/>`;
    case 'bandage': return `<path d="M${lx - 30} ${ly - 46}L${rx + 30} ${ry - 56}L${rx + 30} ${ry - 40}L${lx - 30} ${ly - 30}Z" fill="#EDE6D6" stroke="${OL}" stroke-width="2"/><path d="M${lx} ${ly - 44}L${lx + 6} ${ly - 36}" stroke="#C8423A" stroke-width="3"/>`;
    case 'beauty': return `<circle cx="${rx + 14}" cy="${ry + 34}" r="3" fill="${OL}"/>`;
    case 'wrinkles': return `<g stroke="${dark(skin, 0.3)}" stroke-width="2" fill="none" opacity="0.6"><path d="M${lx - 26} ${ly + 2}l-8 -4M${lx - 26} ${ly + 8}l-8 2M${rx + 26} ${ry + 2}l8 -4M${rx + 26} ${ry + 8}l8 2M236 ${ly - 48}h48M244 ${ly - 40}h32"/></g>`;
    case 'tear': return `<path d="M${lx + 2} ${ly + 12}C${lx} ${ly + 30} ${lx + 4} ${ly + 44} ${lx - 2} ${ly + 56}" stroke="#7FD9E6" stroke-width="3" fill="none" opacity="0.8"/>`;
    case 'soot': return `<g fill="#2A2420" opacity="0.35"><ellipse cx="${lx - 10}" cy="${ly + 34}" rx="16" ry="8"/><ellipse cx="${rx + 14}" cy="${ry - 40}" rx="12" ry="6"/></g>`;
    case 'mask': return `<path d="M190 ${ly - 6}C200 ${ly - 22} 320 ${ly - 22} 330 ${ly - 6}C326 ${ly + 18} 290 ${ly + 22} 262 ${ly + 8}C234 ${ly + 22} 194 ${ly + 18} 190 ${ly - 6}Z" fill="#2A2048" fill-opacity="0.85" stroke="${OL}" stroke-width="2"/><ellipse cx="${lx}" cy="${ly}" rx="12" ry="7" fill="#B9A8F0"/><ellipse cx="${rx}" cy="${ry}" rx="12" ry="7" fill="#B9A8F0"/>`;
    case 'spots': return `<g fill="#B9FFF0" opacity="0.8">${[[-30, -20], [-34, 10], [30, -24], [36, 6], [0, -60]].map(([dx, dy], i) => `<circle cx="${(i % 2 ? rx : lx) + dx * 0.6}" cy="${ly + dy}" r="3"/>`).join('')}</g>`;
    case 'burn': return `<path d="M${rx - 10} ${ry - 44}C${rx + 20} ${ry - 50} ${rx + 40} ${ry - 20} ${rx + 30} ${ry + 30}C${rx + 10} ${ry + 20} ${rx} ${ry - 10} ${rx - 10} ${ry - 44}Z" fill="#8E3A2A" opacity="0.55"/>`;
    case 'ash': return `<path d="M248 ${ly - 52}C252 ${ly - 44} 268 ${ly - 44} 272 ${ly - 52}C266 ${ly - 36} 254 ${ly - 36} 248 ${ly - 52}Z" fill="#2A2420" opacity="0.7"/><g fill="#FF9A3C">${[[-26, 30], [30, 34]].map(([dx, dy]) => `<circle cx="${260 + dx * 2}" cy="${ly + dy}" r="2.5"/>`).join('')}</g>`;
    case 'tattoo': return `<g stroke="#2E4A6A" stroke-width="3" fill="none" opacity="0.75"><path d="M${rx + 16} ${ry - 20}c10 6 10 20 0 26c-10 6 -10 20 0 26"/></g>`;
    case 'sweat': return `<path d="M${rx + 40} ${ry - 40}C${rx + 34} ${ry - 28} ${rx + 36} ${ry - 18} ${rx + 42} ${ry - 18}C${rx + 48} ${ry - 18} ${rx + 48} ${ry - 28} ${rx + 40} ${ry - 40}Z" fill="#B9E4F8" stroke="${OL}" stroke-width="1.5"/>`;
    default: return '';
  }
}

/** The hero's prop, held at the shoulder or by the face. */
function propArt(p: Prop): string {
  switch (p) {
    case 'none': return '';
    case 'pipe': return `<path d="M296 300L344 270" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M296 300L344 270" stroke="#7A5232" stroke-width="4.5" stroke-linecap="round"/><path d="M338 254H362V270C362 280 338 280 338 270Z" fill="#6E4628" stroke="${OL}" stroke-width="2"/><circle cx="350" cy="254" r="4" fill="#FF9A3C"/><path d="M352 246C344 234 358 224 350 212C342 200 356 192 350 180" fill="none" stroke="#EDE6DA" stroke-width="2.5" opacity="0.5" stroke-linecap="round"/>`;
    case 'lantern': return `<g transform="translate(400 330)"><circle r="50" fill="#FFC86B" opacity="0.3"/><path d="M0 -54V-40" stroke="${OL}" stroke-width="3"/><rect x="-20" y="-40" width="40" height="52" rx="6" fill="#FFD27A" stroke="#5A3A22" stroke-width="4"/><path d="M-20 -26H20M-20 -2H20" stroke="#5A3A22" stroke-width="2"/><path d="M0 -20C-6 -10 6 -4 0 4C-4 -2 -2 -10 0 -20Z" fill="#FF9A3C"/><path d="M-24 12H24" stroke="#5A3A22" stroke-width="5"/></g>`;
    case 'coin': return `<g transform="translate(396 350)"><ellipse rx="22" ry="22" fill="#E2B84A" stroke="${OL}" stroke-width="3"/><ellipse rx="14" ry="14" fill="none" stroke="#A07A20" stroke-width="2"/><path d="M-6 -6l6 12 6 -12" stroke="#A07A20" stroke-width="2.5" fill="none"/><path d="M-30 20C-20 30 10 36 20 24" stroke="${OL}" stroke-width="10" stroke-linecap="round"/></g>`;
    case 'rune': return `<g transform="translate(400 340)"><circle r="40" fill="#7FD9E6" opacity="0.25"/><path d="M-22 -16L0 -30L22 -16L18 20L0 30L-18 20Z" fill="#8A9097" stroke="${OL}" stroke-width="3"/><path d="M-8 -12l8 12 8 -12M0 0v16" stroke="#7FD9E6" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
    case 'bomb': return `<g transform="translate(400 340)"><circle r="26" fill="#2A2A30" stroke="${OL}" stroke-width="3"/><circle cx="-8" cy="-8" r="6" fill="#FFFFFF" opacity="0.4"/><rect x="-7" y="-36" width="14" height="10" fill="#6E6A60" stroke="${OL}" stroke-width="2"/><path d="M0 -36C4 -50 16 -50 18 -62" stroke="#8A6A3E" stroke-width="3" fill="none"/><circle cx="18" cy="-64" r="6" fill="#FFD27A"/><circle cx="18" cy="-64" r="12" fill="#FF9A3C" opacity="0.4"/></g>`;
    case 'flower': return `<g transform="translate(398 350)"><path d="M0 0V60" stroke="#4E7A3A" stroke-width="5"/>${[0, 60, 120, 180, 240, 300].map((r) => `<ellipse rx="9" ry="16" transform="rotate(${r}) translate(0 -14)" fill="#F2A0C8" stroke="${OL}" stroke-width="2"/>`).join('')}<circle r="8" fill="#E2B84A" stroke="${OL}" stroke-width="2"/></g>`;
    case 'mushroom': return `<g transform="translate(400 350)"><path d="M-8 0V34H8V0" fill="#F6F0E0" stroke="${OL}" stroke-width="2.5"/><path d="M-34 4C-34 -30 34 -30 34 4Z" fill="#C8423A" stroke="${OL}" stroke-width="3"/><g fill="#F6F0E0"><circle cx="-14" cy="-10" r="5"/><circle cx="10" cy="-14" r="6"/><circle cx="22" cy="-2" r="4"/></g><g fill="#B9F07A" opacity="0.8"><circle cx="-30" cy="-30" r="3"/><circle cx="30" cy="-40" r="2.5"/><circle cx="0" cy="-48" r="2"/></g></g>`;
    case 'gem': return `<g transform="translate(398 344)"><circle r="40" fill="#B9FFF0" opacity="0.25"/><path d="M-20 -8L-10 -22H10L20 -8L0 22Z" fill="#7FD9E6" stroke="${OL}" stroke-width="3"/><path d="M-20 -8H20M-10 -22L0 22L10 -22" stroke="#FFFFFF" stroke-width="1.5" opacity="0.7" fill="none"/></g>`;
    case 'skull': return `<g transform="translate(400 344)"><circle r="40" fill="#9EF28A" opacity="0.2"/><path d="M-22 4C-26 -26 26 -26 22 4C22 12 16 16 14 22H-14C-16 16 -22 12 -22 4Z" fill="#EEE8DA" stroke="${OL}" stroke-width="3"/><circle cx="-9" cy="-2" r="6" fill="#2E7A4A"/><circle cx="9" cy="-2" r="6" fill="#2E7A4A"/><path d="M-6 22V14M0 22V14M6 22V14" stroke="${OL}" stroke-width="2"/></g>`;
    case 'candle': return `<g transform="translate(404 350)"><circle cy="-40" r="34" fill="#9EF2C9" opacity="0.25"/><rect x="-10" y="-20" width="20" height="50" fill="#EEE8DA" stroke="${OL}" stroke-width="2.5"/><path d="M0 -24C-8 -36 4 -46 0 -56C10 -46 8 -32 0 -24Z" fill="#7FF2C9" stroke="${OL}" stroke-width="1.5"/></g>`;
    case 'moth': return `<g transform="translate(396 330)"><circle r="40" fill="#B9FFF0" opacity="0.2"/><path d="M0 0C-24 -26 -42 -10 -30 8C-22 18 -8 10 0 4C8 10 22 18 30 8C42 -10 24 -26 0 0Z" fill="#C9B8F0" stroke="#4E3E7C" stroke-width="2.5"/><path d="M0 -6V14" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M-2 -6C-6 -16 -12 -20 -16 -20M2 -6C6 -16 12 -20 16 -20" stroke="${OL}" stroke-width="1.5" fill="none"/></g>`;
    case 'dove': return `<g transform="translate(410 300)"><path d="M-30 10C-20 -10 10 -14 24 -4L40 -12L34 4C30 20 0 28 -30 10Z" fill="#FBF6E8" stroke="${OL}" stroke-width="2.5"/><path d="M-6 0C0 -30 20 -36 30 -30C20 -24 10 -12 6 2Z" fill="#FFFFFF" stroke="${OL}" stroke-width="2"/><circle cx="20" cy="-6" r="2" fill="${OL}"/></g>`;
    case 'drum': return `<g transform="translate(396 370)"><ellipse cx="0" cy="-20" rx="44" ry="14" fill="#E8D8B8" stroke="${OL}" stroke-width="3"/><path d="M-44 -20V24C-44 34 44 34 44 24V-20" fill="#8E3A2A" stroke="${OL}" stroke-width="3"/><path d="M-44 -10L-22 24L0 -10L22 24L44 -10" stroke="#E2B84A" stroke-width="3" fill="none"/><path d="M-40 -60L-6 -24M40 -60L6 -24" stroke="#6E4A28" stroke-width="6" stroke-linecap="round"/></g>`;
    case 'conch': return `<g transform="translate(398 346)"><path d="M-30 10C-34 -20 0 -40 26 -24C40 -14 30 10 10 18C0 22 -20 22 -30 10Z" fill="#F2C8B0" stroke="${OL}" stroke-width="3"/><path d="M-20 4C-10 -14 10 -20 20 -12M-12 12C0 2 10 -2 18 4" stroke="#C88A6A" stroke-width="2.5" fill="none"/></g>`;
    case 'pearl': return `<g transform="translate(400 336)"><circle r="44" fill="#B9E4F8" opacity="0.25"/><circle r="22" fill="#F4F0FF" stroke="${OL}" stroke-width="3"/><circle cx="-7" cy="-7" r="7" fill="#FFFFFF"/><path d="M-34 30C-20 20 20 20 34 30" stroke="${OL}" stroke-width="10" stroke-linecap="round"/></g>`;
    case 'spyglass': return `<g transform="translate(390 350) rotate(-30)"><rect x="-50" y="-10" width="60" height="20" rx="3" fill="#C9A24A" stroke="${OL}" stroke-width="3"/><rect x="8" y="-13" width="40" height="26" rx="3" fill="#8A6A3E" stroke="${OL}" stroke-width="3"/><circle cx="50" cy="0" r="12" fill="#7FD9E6" stroke="${OL}" stroke-width="3"/></g>`;
    case 'tooth': return `<g transform="translate(260 340)"><path d="M-60 -20C-30 10 30 10 60 -20" stroke="#6E4A28" stroke-width="3" fill="none"/><path d="M-10 0L0 46L10 0Z" fill="#F6F0E0" stroke="${OL}" stroke-width="2.5"/></g>`;
    case 'wrench': return `<g transform="translate(400 350) rotate(30)"><rect x="-6" y="-10" width="12" height="70" rx="4" fill="#9AA1A8" stroke="${OL}" stroke-width="2.5"/><path d="M-18 -30A20 20 0 1 0 18 -30L8 -20V-10H-8V-20Z" fill="#9AA1A8" stroke="${OL}" stroke-width="2.5"/></g>`;
    case 'flame': return `<g transform="translate(400 340)"><circle r="50" fill="#FF9A3C" opacity="0.3"/><path d="M0 30C-30 30 -30 0 -16 -14C-14 -4 -6 0 -4 -10C-4 -30 10 -40 12 -56C24 -36 34 -10 26 10C22 22 12 30 0 30Z" fill="#FF7A2A" stroke="${OL}" stroke-width="2.5"/><path d="M0 24C-14 24 -14 8 -6 0C-4 6 2 6 4 -4C14 6 16 24 0 24Z" fill="#FFD27A"/></g>`;
    case 'book': return `<g transform="translate(396 356) rotate(-10)"><path d="M-40 -26H0V30H-40Z" fill="#8E2B23" stroke="${OL}" stroke-width="3"/><path d="M0 -26H40V30H0Z" fill="#A03A2A" stroke="${OL}" stroke-width="3"/><path d="M-34 -20H-4V24H-34ZM4 -20H34V24H4Z" fill="#F6F0E0"/></g>`;
    case 'bell': return `<g transform="translate(400 330)"><path d="M-24 20C-24 -10 -16 -30 0 -30C16 -30 24 -10 24 20Z" fill="#E2B84A" stroke="${OL}" stroke-width="3"/><path d="M-30 20H30" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><circle cy="28" r="6" fill="#A07A20" stroke="${OL}" stroke-width="2"/><path d="M34 -10q10 -6 14 -18M38 4q12 0 20 -8" stroke="#FFF3C4" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    case 'lyre': return `<g transform="translate(400 346)"><path d="M-26 30C-40 -10 -30 -40 -16 -44M26 30C40 -10 30 -40 16 -44" stroke="#C9A24A" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-26 30H26M-16 -30H16" stroke="#8A6A3E" stroke-width="6"/><path d="M-10 -30V30M0 -30V30M10 -30V30" stroke="#EDE6D6" stroke-width="1.5"/></g>`;
    case 'chains': return `<g fill="none" stroke="#6A7178" stroke-width="7">${[0, 1, 2, 3].map((i) => `<ellipse cx="${360 + i * 24}" cy="${380 + i * 14}" rx="14" ry="9" transform="rotate(30 ${360 + i * 24} ${380 + i * 14})"/>`).join('')}</g><rect x="330" y="356" width="40" height="26" rx="4" fill="#4A4E56" stroke="${OL}" stroke-width="3"/>`;
    case 'shovel': return `<g transform="translate(410 300) rotate(15)"><path d="M0 -60V60" stroke="#6E4A28" stroke-width="9" stroke-linecap="round"/><path d="M-18 60H18L14 110C6 120 -6 120 -14 110Z" fill="#8A9097" stroke="${OL}" stroke-width="3"/></g>`;
    case 'feather': return `<path d="M380 410C400 360 420 320 450 290C440 330 420 370 392 412Z" fill="#FBF6E8" stroke="${OL}" stroke-width="2.5"/>`;
  }
}

/** Beastmasters' animals peek in at the bottom corner. */
function petArt(pet: string | undefined): string {
  if (!pet) return '';
  const fur: Record<string, [string, string]> = { pet_wolf: ['#8A6A4A', '#5A4030'], pet_boar: ['#6E5034', '#4A3424'], pet_toad: ['#6E9E48', '#4E7A34'], pet_bonehound: ['#E6E0CC', '#B0A890'], pet_moonwolf: ['#B8B0E0', '#7A72AA'] };
  const [a, b] = fur[pet] ?? fur.pet_wolf;
  if (pet === 'pet_toad') return `<g transform="translate(80 400)"><ellipse cx="0" cy="0" rx="60" ry="42" fill="${a}" stroke="${OL}" stroke-width="3"/><circle cx="-26" cy="-34" r="16" fill="${a}" stroke="${OL}" stroke-width="3"/><circle cx="26" cy="-34" r="16" fill="${a}" stroke="${OL}" stroke-width="3"/><circle cx="-26" cy="-34" r="7" fill="#F2D23A"/><circle cx="26" cy="-34" r="7" fill="#F2D23A"/><path d="M-30 0C-10 14 10 14 30 0" stroke="${OL}" stroke-width="3" fill="none"/><g fill="${b}"><circle cx="-10" cy="-14" r="5"/><circle cx="16" cy="-10" r="4"/></g></g>`;
  const eye = pet === 'pet_bonehound' ? '#7FF2C9' : pet === 'pet_moonwolf' ? '#B9FFF0' : '#E8C86A';
  const tusk = pet === 'pet_boar' ? `<path d="M30 30C40 20 44 10 42 0M-30 30C-40 20 -44 10 -42 0" stroke="#F6F0E0" stroke-width="7" fill="none" stroke-linecap="round"/>` : '';
  return `<g transform="translate(82 384)"><path d="M-46 -30L-40 -80L-14 -48Z M46 -30L40 -80L14 -48Z" fill="${b}" stroke="${OL}" stroke-width="3"/><path d="M-60 70C-70 0 -40 -50 0 -50C40 -50 70 0 60 70Z" fill="${a}" stroke="${OL}" stroke-width="3"/>
<path d="M-26 20C-26 50 26 50 26 20C20 40 -20 40 -26 20Z" fill="${light(a, 0.3)}" stroke="${OL}" stroke-width="2"/><ellipse cx="0" cy="22" rx="12" ry="8" fill="${OL}"/><circle cx="-22" cy="-10" r="7" fill="${eye}" stroke="${OL}" stroke-width="2"/><circle cx="22" cy="-10" r="7" fill="${eye}" stroke="${OL}" stroke-width="2"/>${tusk}</g>`;
}

/** Shared gradients for steel, wood, chain mail and scales. */
function sharedDefs(id: string): string {
  return `<linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="#F2F5F7"/><stop offset="0.35" stop-color="#A9B0B6"/><stop offset="1" stop-color="#4B5157"/></linearGradient>
<linearGradient id="${id}-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9A7048"/><stop offset="0.5" stop-color="#6E4A2C"/><stop offset="1" stop-color="#3E2816"/></linearGradient>
<pattern id="${id}-mail" width="10" height="8" patternUnits="userSpaceOnUse"><path d="M0 8A5 5 0 0 1 10 8M-5 4A5 5 0 0 1 5 4M5 4A5 5 0 0 1 15 4" fill="none" stroke="#24282C" stroke-width="1.4"/></pattern>
<pattern id="${id}-scales" width="16" height="12" patternUnits="userSpaceOnUse"><path d="M0 12A8 8 0 0 1 16 12M-8 6A8 8 0 0 1 8 6M8 6A8 8 0 0 1 24 6" fill="none" stroke="#2A1210" stroke-width="2"/></pattern>
<radialGradient id="${id}-vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#140E0A" stop-opacity="0"/><stop offset="1" stop-color="#140E0A" stop-opacity="0.6"/></radialGradient>
<filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.1"/></feComponentTransfer></filter>`;
}

const ORB: Record<Tribe, string> = { freeholders: '#FFE9A3', thornkin: '#B9F07A', ironroot: '#7FD9E6', ashborn: '#FF9A3C', fenfolk: '#7FC4E8', moonveil: '#B9FFF0', dawnwings: '#FFF3C4', hollowed: '#7FF2C9' };

/**
 * The portrait as SVG markup (no outer <svg>): 520 x 446, ready to place in a card.
 * `silhouette` draws the hero as a dark shape over their home (secret heroes).
 */
export function portraitArt(d: HeroDef, opts: { silhouette?: boolean } = {}): string {
  const id = `pt-${d.id}${opts.silhouette ? '-s' : ''}`;
  const per = PERSONA[d.id] ?? P('short', '#6E4A28', 'calm', 'open', 'smile');
  const bd = backdrop(d.tribe, id);
  const w = per.weapon && per.weapon !== 'auto' ? per.weapon : AUTO_WEAPON[d.heroClass];
  const head = headArt(d, per, id);
  const figure = `${wingsBack(d.tribe)}${weaponArt(w, id, ORB[d.tribe], false)}${head.back}${bodyArt(d.heroClass, d.tribe, per, id)}${head.face}${head.front}${weaponArt(w, id, ORB[d.tribe], true)}${propArt(per.prop ?? 'none')}${petArt(d.pet)}`;
  const shadow = `<filter id="${id}-sil"><feColorMatrix type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 0.94 0"/></filter>`;
  return `<defs>${sharedDefs(id)}${bd.defs}${shadow}</defs>${bd.art}
<g stroke-linejoin="round" stroke-linecap="round"${opts.silhouette ? ` filter="url(#${id}-sil)"` : ''}>${figure}</g>
<rect width="520" height="446" fill="url(#${id}-vig)"/><rect width="520" height="446" filter="url(#${id}-grain)"/>`;
}

/** A standalone portrait SVG (for places that only want the picture). */
export function portraitOnlySvg(d: HeroDef, opts: { silhouette?: boolean } = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 446" preserveAspectRatio="xMidYMid slice">${portraitArt(d, opts)}</svg>`;
}

export const HAS_PERSONA = (id: string) => !!PERSONA[id] && !!HERO_BY_ID[id];

/**
 * The hero's head for their map sprite: the same face as the card (hair, beard, hat, tells and
 * expression), shrunk to sprite size with thicker outlines so it reads on the map. `back` (long hair,
 * neck) goes behind the body; `front` (face, hair, headgear) in front of it.
 */
export function spriteHead(d: HeroDef, headY: number): { back: string; front: string } {
  const id = `sh-${d.id}`;
  const per = PERSONA[d.id] ?? P('short', '#6E4A28', 'calm', 'open', 'smile');
  const head = headArt(d, per, id);
  const thick = (svg: string) => svg.replace(/stroke-width="([\d.]+)"/g, (_, w: string) => `stroke-width="${(parseFloat(w) * 3.2).toFixed(1)}"`);
  const place = (svg: string) => `<g transform="translate(0 ${headY}) scale(0.17) translate(-260 -200)">${thick(svg)}</g>`;
  return { back: `<defs>${sharedDefs(id)}</defs>${place(head.back)}`, front: place(head.face + head.front) };
}
