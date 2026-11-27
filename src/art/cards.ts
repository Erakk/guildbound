// Card art, in the style of the final card design: a frame of the tribe's own material (iron,
// oak and brass, bark, obsidian, verdigris, moon-silver, white gold, bone) with rivets and corner
// brackets, the tribe's emblem and the class badge, the painted portrait, a rarity ribbon and a
// parchment panel. Every card is 560 x 784 (5:7, the pack's shape).
//
// The art has no text: names, stars, levels and descriptions are laid over it as HTML, so they
// stay crisp and use the game's fonts. Each card image is drawn once and cached as an image URL.

import { HERO_BY_ID } from '../core/data/heroes';
import type { HeroClass, HeroDef, Rarity, SpellDef, Tribe } from '../core/types';
import { portraitArt } from './portraits';
import { spellIcon } from './spells';

export const CARD_W = 560;
export const CARD_H = 784;
const OL = '#1E2226';

interface Material { frame: [string, string, string, string]; inner: string; rivet: [string, string, string]; plate: [string, string]; line: string; glow?: string }

export const MATERIAL: Record<Tribe | 'arcane', Material> = {
  ironroot: { frame: ['#B7BDC3', '#6C737A', '#9AA1A8', '#4C5258'], inner: '#2A2018', rivet: ['#F1F3F5', '#8D949B', '#3A3F44'], plate: ['#565C63', '#2A2E33'], line: '#9AA1A8' },
  freeholders: { frame: ['#D8A868', '#7A5232', '#B88850', '#4A2E1A'], inner: '#2A1E14', rivet: ['#FFF1C4', '#E2B84A', '#7A5A20'], plate: ['#6E4A2C', '#3A2414'], line: '#E2B84A' },
  thornkin: { frame: ['#9AAA5A', '#4A5A26', '#7A8A3E', '#2A3416'], inner: '#1E2414', rivet: ['#E8F0B0', '#8AB04A', '#3E5A1E'], plate: ['#4A5A2A', '#232E14'], line: '#B9D86A' },
  ashborn: { frame: ['#6A4A40', '#241818', '#4A2E28', '#140C0C'], inner: '#1E1210', rivet: ['#FFD27A', '#FF7A2A', '#6A2A14'], plate: ['#3A2420', '#160E0C'], line: '#FF7A2A', glow: '#FF7A2A' },
  fenfolk: { frame: ['#8AD0B8', '#2E6A5A', '#5EA890', '#1E4A40'], inner: '#14221E', rivet: ['#E0FFF4', '#6EB8A0', '#1E4A40'], plate: ['#2E5A50', '#16302A'], line: '#8AD0B8' },
  moonveil: { frame: ['#EEE8FA', '#8E86B0', '#C8C0E0', '#5E5680'], inner: '#1A1630', rivet: ['#FFFFFF', '#C8C0E0', '#5E5680'], plate: ['#4E4676', '#221E3E'], line: '#DCD4F0', glow: '#B9A8F0' },
  dawnwings: { frame: ['#FFF8E0', '#D4A73A', '#F1D27A', '#A07A20'], inner: '#2A2214', rivet: ['#FFFFFF', '#F1D27A', '#8A6A20'], plate: ['#A07A30', '#5A4010'], line: '#FFF1C4' },
  hollowed: { frame: ['#E0D8C8', '#6E6A62', '#ACA494', '#3E3A34'], inner: '#1A1820', rivet: ['#F6F0E0', '#ACA494', '#3E3A34'], plate: ['#4A4652', '#24222A'], line: '#7FF2C9', glow: '#7FF2C9' },
  arcane: { frame: ['#C8D4F0', '#4E5A8E', '#8E9AC8', '#2A3260'], inner: '#161A2E', rivet: ['#FFFFFF', '#9EB0E8', '#2A3260'], plate: ['#2E3666', '#161A36'], line: '#9EB0E8', glow: '#9EB0E8' },
};

const RIBBON: Record<Rarity, [string, string, string]> = {
  common: ['#D3D8DD', '#9097A0', '#6A7179'],
  uncommon: ['#E8B88A', '#A86B3C', '#6E4220'],
  rare: ['#F4F8FB', '#C3CBD2', '#7E8890'],
  epic: ['#FFF1B0', '#D4A73A', '#8A6A20'],
  legendary: ['#E8D4FF', '#B58AE0', '#6E4A9A'],
};

/** The tribe emblem (drawn in a 56 px circle centred on 0,0). */
const EMBLEM: Record<Tribe, string> = {
  ironroot: '<path d="M-20 14L-6 -10L2 2L8 -6L20 14Z" fill="none" stroke="#F2E6CC" stroke-width="3" stroke-linejoin="round"/><path d="M-6 -10L-2 -4L-10 -3Z" fill="#F2E6CC"/>',
  freeholders: '<g stroke="#F2E6CC" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M0 18V-14"/><path d="M0 -4C-8 -8 -10 -16 -8 -20M0 -4C8 -8 10 -16 8 -20M0 6C-8 2 -12 -6 -10 -10M0 6C8 2 12 -6 10 -10"/></g>',
  thornkin: '<path d="M0 18C-18 6 -16 -14 0 -20C16 -14 18 6 0 18Z" fill="none" stroke="#F2E6CC" stroke-width="3"/><path d="M0 18V-14M0 0L-8 -6M0 8L8 2" stroke="#F2E6CC" stroke-width="2"/>',
  ashborn: '<path d="M0 20C-16 20 -16 4 -8 -4C-6 4 -2 4 -2 -4C-2 -14 6 -18 8 -24C14 -12 18 0 14 10C12 16 6 20 0 20Z" fill="none" stroke="#F2E6CC" stroke-width="3" stroke-linejoin="round"/>',
  fenfolk: '<path d="M-20 4C-14 -4 -6 -4 0 4C6 12 14 12 20 4M-20 -8C-14 -16 -6 -16 0 -8C6 0 14 0 20 -8" fill="none" stroke="#F2E6CC" stroke-width="3" stroke-linecap="round"/>',
  moonveil: '<path d="M4 -20A20 20 0 1 0 16 12A16 16 0 1 1 4 -20Z" fill="none" stroke="#F2E6CC" stroke-width="3"/><circle cx="12" cy="-8" r="2" fill="#F2E6CC"/>',
  dawnwings: '<path d="M0 10C-10 -2 -18 -4 -22 -14C-12 -12 -6 -8 0 -2C6 -8 12 -12 22 -14C18 -4 10 -2 0 10Z" fill="none" stroke="#F2E6CC" stroke-width="2.5" stroke-linejoin="round"/><circle cx="0" cy="-12" r="5" fill="none" stroke="#F2E6CC" stroke-width="2.5"/>',
  hollowed: '<path d="M-12 2C-14 -18 14 -18 12 2C12 8 8 10 6 14H-6C-8 10 -12 8 -12 2Z" fill="none" stroke="#F2E6CC" stroke-width="3"/><circle cx="-5" cy="-2" r="3" fill="#F2E6CC"/><circle cx="5" cy="-2" r="3" fill="#F2E6CC"/>',
};

/** The class badge (in a shield centred on 0,0). */
const CLASS_BADGE: Record<HeroClass | 'spell', string> = {
  warrior: '<g stroke="#F2E6CC" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M-12 14L12 -16"/><path d="M12 14L-12 -16"/></g><g fill="#F2E6CC"><path d="M6 -18C14 -22 20 -16 18 -8L10 -12Z"/><path d="M-6 -18C-14 -22 -20 -16 -18 -8L-10 -12Z"/></g>',
  ranger: '<path d="M-10 -18C-22 -4 -22 4 -10 18" fill="none" stroke="#F2E6CC" stroke-width="2.6"/><path d="M-10 -18V18M-14 0H18M12 -5L18 0L12 5" stroke="#F2E6CC" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  rogue: '<path d="M0 -20L5 6H-5Z" fill="#F2E6CC"/><path d="M-10 6H10M0 6V18" stroke="#F2E6CC" stroke-width="3" stroke-linecap="round"/>',
  mage: '<path d="M0 -18L5 -5L18 -4L8 4L11 17L0 10L-11 17L-8 4L-18 -4L-5 -5Z" fill="none" stroke="#F2E6CC" stroke-width="2.4" stroke-linejoin="round"/>',
  cleric: '<circle r="7" fill="none" stroke="#F2E6CC" stroke-width="2.4"/><g stroke="#F2E6CC" stroke-width="2.4" stroke-linecap="round"><path d="M0 -18V-11M0 11V18M-18 0H-11M11 0H18M-12 -12l4 4M12 12l-4 -4M12 -12l-4 4M-12 12l4 -4"/></g>',
  bard: '<path d="M-6 12V-14L12 -18V8" fill="none" stroke="#F2E6CC" stroke-width="2.6"/><circle cx="-10" cy="12" r="5" fill="#F2E6CC"/><circle cx="8" cy="8" r="5" fill="#F2E6CC"/>',
  paladin: '<path d="M-14 -16H14V0C14 12 0 20 0 20C0 20 -14 12 -14 0Z" fill="none" stroke="#F2E6CC" stroke-width="2.4"/><path d="M0 -10V12M-8 -2H8" stroke="#F2E6CC" stroke-width="2.4"/>',
  beastmaster: '<ellipse cx="0" cy="8" rx="9" ry="7" fill="#F2E6CC"/><g fill="#F2E6CC"><circle cx="-12" cy="-4" r="4"/><circle cx="12" cy="-4" r="4"/><circle cx="-5" cy="-13" r="4"/><circle cx="5" cy="-13" r="4"/></g>',
  necromancer: '<path d="M-12 2C-14 -18 14 -18 12 2C12 8 8 10 6 14H-6C-8 10 -12 8 -12 2Z" fill="none" stroke="#F2E6CC" stroke-width="2.4"/><circle cx="-5" cy="-2" r="3" fill="#F2E6CC"/><circle cx="5" cy="-2" r="3" fill="#F2E6CC"/>',
  dragonslayer: '<path d="M-14 16C-10 2 -4 -10 6 -20M-6 18C-2 6 4 -4 14 -12M4 18C8 10 12 4 18 0" fill="none" stroke="#F2E6CC" stroke-width="2.8" stroke-linecap="round"/>',
  spell: '<path d="M0 -18L4 -4L18 0L4 4L0 18L-4 4L-18 0L-4 -4Z" fill="none" stroke="#F2E6CC" stroke-width="2.4" stroke-linejoin="round"/>',
};

function frame(m: Material, id: string, rarity: Rarity, emblem: string, badge: string, portrait: string): string {
  const [r0, r1, r2] = RIBBON[rarity];
  const gem = rarity === 'epic' || rarity === 'legendary';
  const corner = (d: string) => `<path d="${d}" stroke="${OL}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${m.rivet[0]}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  return `<defs>
<linearGradient id="${id}-fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.frame[0]}"/><stop offset="0.35" stop-color="${m.frame[1]}"/><stop offset="0.6" stop-color="${m.frame[2]}"/><stop offset="1" stop-color="${m.frame[3]}"/></linearGradient>
<linearGradient id="${id}-pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.plate[0]}"/><stop offset="1" stop-color="${m.plate[1]}"/></linearGradient>
<linearGradient id="${id}-rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${r0}"/><stop offset="0.5" stop-color="${r1}"/><stop offset="1" stop-color="${r2}"/></linearGradient>
<radialGradient id="${id}-rv" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="${m.rivet[0]}"/><stop offset="0.5" stop-color="${m.rivet[1]}"/><stop offset="1" stop-color="${m.rivet[2]}"/></radialGradient>
<linearGradient id="${id}-foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B58AE0" stop-opacity="0.35"/><stop offset="0.3" stop-color="#5EC4C9" stop-opacity="0.25"/><stop offset="0.55" stop-color="#F1D27A" stop-opacity="0.3"/><stop offset="0.8" stop-color="#E98AB8" stop-opacity="0.25"/><stop offset="1" stop-color="#B58AE0" stop-opacity="0.35"/></linearGradient>
<filter id="${id}-brush" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.2"/></feComponentTransfer></filter>
<filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer></filter>
<clipPath id="${id}-fc"><rect x="4" y="4" width="552" height="776" rx="28"/></clipPath>
<clipPath id="${id}-pc"><path d="M40 520V164Q40 108 96 108H464Q520 108 520 164V520Z"/></clipPath>
</defs>
<rect x="4" y="4" width="552" height="776" rx="28" fill="url(#${id}-fr)" stroke="${OL}" stroke-width="3"/>
<rect x="4" y="4" width="552" height="776" rx="28" filter="url(#${id}-brush)" clip-path="url(#${id}-fc)"/>
${rarity === 'legendary' ? `<rect x="4" y="4" width="552" height="776" rx="28" fill="url(#${id}-foil)"/>` : ''}
${m.glow ? `<rect x="8" y="8" width="544" height="768" rx="25" fill="none" stroke="${m.glow}" stroke-width="2" opacity="0.6"/>` : ''}
<rect x="22" y="22" width="516" height="740" rx="18" fill="${m.inner}" stroke="${OL}" stroke-width="3"/>
<rect x="25" y="25" width="510" height="734" rx="16" fill="none" stroke="${m.line}" stroke-width="1" opacity="0.55"/>
${corner('M14 76V34Q14 14 34 14H76')}${corner('M546 76V34Q546 14 526 14H484')}${corner('M14 708V750Q14 770 34 770H76')}${corner('M546 708V750Q546 770 526 770H484')}
<g fill="url(#${id}-rv)" stroke="${OL}" stroke-width="1">${[180, 320, 460, 600].map((y) => `<circle cx="13" cy="${y}" r="4.5"/><circle cx="547" cy="${y}" r="4.5"/>`).join('')}<circle cx="200" cy="13" r="4.5"/><circle cx="360" cy="13" r="4.5"/><circle cx="200" cy="771" r="4.5"/><circle cx="360" cy="771" r="4.5"/></g>
<g clip-path="url(#${id}-pc)"><g transform="translate(40 108) scale(0.923)">${portrait}</g></g>
<path d="M40 520V164Q40 108 96 108H464Q520 108 520 164V520Z" fill="none" stroke="${OL}" stroke-width="7"/>
<path d="M40 520V164Q40 108 96 108H464Q520 108 520 164V520Z" fill="none" stroke="${m.line}" stroke-width="2"/>
<g fill="url(#${id}-rv)" stroke="${OL}" stroke-width="0.8"><circle cx="58" cy="126" r="4"/><circle cx="502" cy="126" r="4"/><circle cx="46" cy="512" r="4"/><circle cx="514" cy="512" r="4"/></g>
<path d="M108 30H452L474 62L452 94H108L86 62Z" fill="url(#${id}-pl)" stroke="${OL}" stroke-width="2.5"/>
<path d="M112 35H448L466 62L448 89H112L94 62Z" fill="none" stroke="${m.line}" stroke-width="1.2" opacity="0.8"/>
<circle cx="62" cy="62" r="36" fill="url(#${id}-fr)" stroke="${OL}" stroke-width="2.5"/><circle cx="62" cy="62" r="28" fill="${m.plate[0]}" stroke="${OL}" stroke-width="2"/>
<g transform="translate(62 62)">${emblem}</g>
<path d="M472 32H524V66C524 84 498 96 498 96C498 96 472 84 472 66Z" fill="${m.plate[0]}" stroke="${OL}" stroke-width="2.5"/>
<path d="M476 36H520V65C520 80 498 90 498 90C498 90 476 80 476 65Z" fill="none" stroke="${m.line}" stroke-width="1.2"/>
<g transform="translate(498 62) scale(0.95)">${badge}</g>
<path d="M146 506H414L432 522L414 538H146L128 522Z" fill="url(#${id}-rb)" stroke="${OL}" stroke-width="2"/>
<path d="M128 522L110 512L118 522L110 532Z M432 522L450 512L442 522L450 532Z" fill="${r2}" stroke="${OL}" stroke-width="1.5"/>
${gem ? `<g stroke="${OL}" stroke-width="2" fill="${r1}"><path d="M106 522l8 -10 8 10 -8 10Z"/><path d="M438 522l8 -10 8 10 -8 10Z"/><path d="M280 78l8 -10 8 10 -8 10Z" transform="translate(0 -46)"/></g>` : ''}
<rect x="40" y="636" width="480" height="114" rx="10" fill="#E9DCBD" stroke="#8A7A5C" stroke-width="1.5"/>
<rect x="40" y="636" width="480" height="114" rx="10" filter="url(#${id}-grain)"/>`;
}

/** The full card art for a hero (no text). */
export function heroCardArtSvg(d: HeroDef, opts: { silhouette?: boolean } = {}): string {
  const id = `cd-${d.id}${opts.silhouette ? '-s' : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}">${frame(MATERIAL[d.tribe], id, d.rarity, EMBLEM[d.tribe], CLASS_BADGE[d.heroClass], portraitArt(d, opts))}</svg>`;
}

const SPELL_BG: Record<Rarity, [string, string]> = {
  common: ['#5A5E70', '#1E2030'], uncommon: ['#4E7A5A', '#16261C'], rare: ['#4E6E9E', '#141E34'], epic: ['#7E5AAA', '#22163A'], legendary: ['#B0883E', '#3A2410'],
};

/** The full card art for a spell (no text): its sigil glowing in a circle of runes. */
export function spellCardArtSvg(sp: SpellDef, opts: { locked?: boolean } = {}): string {
  const id = `cs-${sp.id}${opts.locked ? '-l' : ''}`;
  const [a, b] = SPELL_BG[sp.rarity];
  // The sigil, enlarged: swap the icon's own <svg> tag for one placed in the card.
  const icon = spellIcon(sp.id, 34).replace(/^<svg[^>]*>/, '<svg x="140" y="102" width="240" height="240" viewBox="0 0 34 34">');
  const art = `<defs><radialGradient id="${id}-bg" cx="0.5" cy="0.48" r="0.7"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
<radialGradient id="${id}-gl" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F6E9C9" stop-opacity="0.35"/><stop offset="1" stop-color="#F6E9C9" stop-opacity="0"/></radialGradient></defs>
<rect width="520" height="446" fill="url(#${id}-bg)"/><circle cx="260" cy="222" r="200" fill="url(#${id}-gl)"/>
<circle cx="260" cy="222" r="170" fill="none" stroke="#F6E9C9" stroke-opacity="0.3" stroke-width="3" stroke-dasharray="8 10"/>
<circle cx="260" cy="222" r="136" fill="none" stroke="#F6E9C9" stroke-opacity="0.18" stroke-width="2"/>
<g fill="#F6E9C9" opacity="0.5">${Array.from({ length: 12 }, (_, i) => { const t = (i / 12) * Math.PI * 2; return `<circle cx="${260 + Math.cos(t) * 154}" cy="${222 + Math.sin(t) * 154}" r="4"/>`; }).join('')}</g>
${opts.locked
    // Not found yet: a question mark instead of the sigil, so the card gives nothing away.
    ? '<path d="M222 176C222 136 298 132 298 176C298 206 260 206 260 246" fill="none" stroke="#F6E9C9" stroke-opacity="0.45" stroke-width="22" stroke-linecap="round"/><circle cx="260" cy="292" r="13" fill="#F6E9C9" fill-opacity="0.45"/>'
    : icon}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}">${frame(MATERIAL.arcane, id, sp.rarity, CLASS_BADGE.spell, CLASS_BADGE.spell, art)}</svg>`;
}

// ---- Image cache: each card's art is drawn once ----

const urls = new Map<string, string>();

function cached(key: string, make: () => string): string {
  let u = urls.get(key);
  if (!u) {
    u = typeof URL !== 'undefined' && typeof Blob !== 'undefined' && URL.createObjectURL
      ? URL.createObjectURL(new Blob([make()], { type: 'image/svg+xml' }))
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(make())}`;
    urls.set(key, u);
  }
  return u;
}

export function heroCardArtUrl(d: HeroDef, silhouette = false): string {
  return cached(`h:${d.id}:${silhouette ? 1 : 0}`, () => heroCardArtSvg(d, { silhouette }));
}

export function spellCardArtUrl(sp: SpellDef, locked = false): string {
  return cached(`s:${sp.id}:${locked ? 1 : 0}`, () => spellCardArtSvg(sp, { locked }));
}

/** "NO. 014 · IRONROOT HALL": the card's number in the set. */
export function cardNumber(d: HeroDef): number {
  return Object.keys(HERO_BY_ID).indexOf(d.id) + 1;
}

export const HALL: Record<Tribe, string> = {
  ironroot: 'IRONROOT HALL', freeholders: 'THE FREEHOLDS', thornkin: 'THE THORNWOOD', ashborn: 'THE ASHLANDS',
  fenfolk: 'THE FENS', moonveil: 'THE SILVER COURT', dawnwings: 'THE HIGH EYRIES', hollowed: 'THE BARROWS',
};
