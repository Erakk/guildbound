// Procedural SVG art for heroes and enemies. Each figure is drawn with its feet at (0, 0),
// about 95 units tall, with a dark outline so it reads at small sizes on the map.
// Heroes are composed from tribe features + class gear, so every hero gets a distinct silhouette.

import { HERO_BY_ID } from '../core/data/heroes';
import { spriteHead } from './portraits';
import { MONSTER_ART } from './monsters';
import { ENEMY_BY_ID } from '../core/data/world';
import type { HeroClass, HeroDef, Tribe } from '../core/types';

const OL = '#1B140E';

interface Palette { skin: string; accent: string; accentDark: string; hair: string; eye: string; orb: string }

const PAL: Record<Tribe, Palette> = {
  freeholders: { skin: '#E8B896', accent: '#3D6178', accentDark: '#2A4456', hair: '#6E4A28', eye: OL, orb: '#FFE9A3' },
  thornkin: { skin: '#F0CDAA', accent: '#4F7A3A', accentDark: '#2F5A2E', hair: '#E8C86A', eye: '#2E5A2E', orb: '#B9F07A' },
  ironroot: { skin: '#E3A07E', accent: '#8A9097', accentDark: '#5E646B', hair: '#B0532A', eye: OL, orb: '#7FD9E6' },
  ashborn: { skin: '#B4583A', accent: '#6E5440', accentDark: '#4A3424', hair: '#2A1A14', eye: '#FFD27A', orb: '#FF9A3C' },
  fenfolk: { skin: '#4E8C76', accent: '#6A3A6E', accentDark: '#3E2A44', hair: '#2E6A56', eye: '#F2D23A', orb: '#7FC4E8' },
  moonveil: { skin: '#EADFF4', accent: '#5E4E8C', accentDark: '#3E3266', hair: '#DCDDEA', eye: '#7A4EC0', orb: '#B9FFF0' },
  dawnwings: { skin: '#F4D6BA', accent: '#D4A73A', accentDark: '#A07A20', hair: '#F1D27A', eye: OL, orb: '#FFF3C4' },
  hollowed: { skin: '#EEE8DA', accent: '#3E4A44', accentDark: '#2A322E', hair: '#2E3A34', eye: '#7FF2C9', orb: '#7FF2C9' },
};

function wings(t: Tribe): string {
  if (t === 'dawnwings') {
    return `<path d="M-8 -50C-30 -74 -54 -70 -60 -50C-54 -52 -50 -48 -52 -42C-46 -44 -42 -40 -44 -34C-34 -36 -18 -38 -8 -40Z" fill="#FBF6E8" stroke="${OL}" stroke-width="2"/>
<path d="M8 -50C30 -74 54 -70 60 -50C54 -52 50 -48 52 -42C46 -44 42 -40 44 -34C34 -36 18 -38 8 -40Z" fill="#FBF6E8" stroke="${OL}" stroke-width="2"/>
<path d="M-20 -56C-30 -58 -40 -56 -46 -50M20 -56C30 -58 40 -56 46 -50" stroke="#C9A24A" stroke-width="1.2" fill="none"/>`;
  }
  if (t === 'moonveil') {
    return `<path d="M-4 -50C-30 -82 -50 -64 -42 -42C-34 -32 -16 -36 -4 -44Z" fill="#C9B8F0" fill-opacity="0.8" stroke="#5E4E8C" stroke-width="1.8"/>
<path d="M4 -50C30 -82 50 -64 42 -42C34 -32 16 -36 4 -44Z" fill="#C9B8F0" fill-opacity="0.8" stroke="#5E4E8C" stroke-width="1.8"/>
<circle cx="-28" cy="-58" r="3" fill="#F6F0FF"/><circle cx="28" cy="-58" r="3" fill="#F6F0FF"/>`;
  }
  return '';
}

function tail(t: Tribe, p: Palette): string {
  return t === 'fenfolk' ? `<path d="M-6 -14C-24 -14 -40 -8 -48 0C-38 -2 -24 -4 -6 -6Z" fill="${p.skin}" stroke="${OL}" stroke-width="2"/>` : '';
}

function legs(cls: HeroClass, t: Tribe, p: Palette): string {
  if (cls === 'mage' || cls === 'cleric' || cls === 'necromancer') return '';
  const short = t === 'ironroot';
  const top = short ? -13 : cls === 'ranger' ? -26 : cls === 'beastmaster' ? -22 : -18;
  const col = t === 'fenfolk' ? p.skin : t === 'ashborn' ? '#8E4A36' : t === 'hollowed' ? '#EEE8DA' : '#5A4030';
  const w = short ? 9 : 6;
  return `<path d="M-${w} ${top}V0M${w} ${top}V0" stroke="${OL}" stroke-width="${short ? 11 : 7}" stroke-linecap="round"/>
<path d="M-${w} ${top}V-1M${w} ${top}V-1" stroke="${col}" stroke-width="${short ? 8 : 4}" stroke-linecap="round"/>`;
}

function cape(cls: HeroClass, p: Palette): string {
  if (cls === 'ranger') return `<path d="M-14 -52L-20 -8L20 -8L14 -52Z" fill="${p.accentDark}" stroke="${OL}" stroke-width="2"/>`;
  if (cls === 'rogue') return `<path d="M-13 -48L-18 -10L18 -10L13 -48Z" fill="#2E2626" stroke="${OL}" stroke-width="2"/>`;
  if (cls === 'paladin') return `<path d="M-16 -46L-24 -4L24 -4L16 -46Z" fill="#F2ECDC" stroke="${OL}" stroke-width="2"/><path d="M-22 -8H22" stroke="#C9A24A" stroke-width="2.5"/>`;
  if (cls === 'dragonslayer') return `<path d="M-16 -46C-24 -30 -28 -14 -26 -2L26 -2C28 -14 24 -30 16 -46Z" fill="#8E2B23" stroke="${OL}" stroke-width="2"/><path d="M-24 -6l4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4 4 -4 4 4" stroke="${OL}" stroke-width="1.2" fill="none"/>`;
  if (cls === 'beastmaster') return `<path d="M-15 -50L-20 -12L20 -12L15 -50Z" fill="#7A5A3E" stroke="${OL}" stroke-width="2"/>`;
  if (cls === 'necromancer') return `<path d="M-14 -46L-22 2L-14 -4L-8 2L0 -4L8 2L14 -4L22 2L14 -46Z" fill="#1E1A26" stroke="${OL}" stroke-width="2"/>`;
  return '';
}

function body(cls: HeroClass, t: Tribe, p: Palette): string {
  const metal = t === 'dawnwings' ? '#D4A73A' : t === 'ashborn' ? '#6E5440' : t === 'hollowed' ? '#4E5A54' : '#8A9097';
  switch (cls) {
    case 'warrior': {
      const w = t === 'ironroot' ? 24 : t === 'ashborn' ? 23 : 19;
      const chest = t === 'ashborn'
        ? `<path d="M-${w} -10C-${w + 2} -32 -${w - 6} -46 0 -46C${w - 6} -46 ${w + 2} -32 ${w} -10Z" fill="${p.skin}" stroke="${OL}" stroke-width="2"/><path d="M-8 -40C-4 -36 4 -36 8 -40M-6 -30C-2 -28 2 -28 6 -30" stroke="#7A3424" stroke-width="1.5" fill="none"/><path d="M-${w} -18H${w}L${w - 2} -8H-${w - 2}Z" fill="${p.accent}" stroke="${OL}" stroke-width="1.6"/>`
        : `<path d="M-${w} -10C-${w + 2} -32 -${w - 6} -46 0 -46C${w - 6} -46 ${w + 2} -32 ${w} -10Z" fill="${metal}" stroke="${OL}" stroke-width="2"/><path d="M-7 -42H7V-12H-7Z" fill="${t === 'ironroot' ? '#5A3A22' : p.accent}" stroke="${OL}" stroke-width="1.2"/><rect x="-${w}" y="-20" width="${w * 2}" height="5" fill="#5A3A22" stroke="${OL}" stroke-width="1.2"/>`;
      return chest;
    }
    case 'rogue':
      return `<path d="M-11 -12C-13 -36 -8 -46 0 -46C8 -46 13 -36 11 -12Z" fill="#4A3A30" stroke="${OL}" stroke-width="2"/><path d="M-9 -42C-2 -38 6 -40 11 -44L9 -36C4 -32 -2 -32 -9 -36Z" fill="${p.accent}" stroke="${OL}" stroke-width="1.3"/>`;
    case 'ranger':
      return `<path d="M-10 -24C-12 -44 -8 -52 0 -52C8 -52 12 -44 10 -24Z" fill="${p.accent}" stroke="${OL}" stroke-width="2"/><rect x="-10" y="-31" width="20" height="4" fill="#5A3A22"/>`;
    case 'mage':
      return `<path d="M-16 0C-12 -28 -10 -46 0 -48C10 -46 12 -28 16 0C8 3 -8 3 -16 0Z" fill="${p.accent}" stroke="${OL}" stroke-width="2"/><path d="M-14 -4C-6 -1 6 -1 14 -4" stroke="#C9A24A" stroke-width="1.5" fill="none"/><circle cx="-5" cy="-22" r="1.3" fill="#F1D27A"/><circle cx="5" cy="-30" r="1.3" fill="#F1D27A"/>`;
    case 'cleric':
      return `<path d="M-16 0L-12 -40C-6 -48 6 -48 12 -40L16 0Z" fill="#EDE6D6" stroke="${OL}" stroke-width="2"/><path d="M-5 -44H5V-2H-5Z" fill="${p.accent}" stroke="${OL}" stroke-width="1.2"/><circle cx="0" cy="-30" r="2.5" fill="#E2B84A"/>`;
    case 'bard':
      return `<path d="M-12 -12C-13 -36 -9 -46 0 -46C9 -46 13 -36 12 -12Z" fill="${p.accent}" stroke="${OL}" stroke-width="2"/><path d="M-12 -14H12" stroke="#C9A24A" stroke-width="2"/><path d="M-6 -44L0 -36L6 -44" stroke="#C9A24A" stroke-width="1.5" fill="none"/>`;
    case 'paladin': {
      const w = t === 'ironroot' ? 23 : 19;
      return `<path d="M-${w} -10C-${w + 2} -32 -${w - 6} -46 0 -46C${w - 6} -46 ${w + 2} -32 ${w} -10Z" fill="#D8DCE0" stroke="${OL}" stroke-width="2"/><path d="M-8 -42H8V-6L0 0L-8 -6Z" fill="#F6F0E0" stroke="${OL}" stroke-width="1.4"/><circle cx="0" cy="-28" r="4.5" fill="#E2B84A" stroke="${OL}" stroke-width="1"/><path d="M0 -36V-20M-8 -28H8" stroke="#E2B84A" stroke-width="1.5"/>`;
    }
    case 'beastmaster':
      return `<path d="M-11 -18C-13 -40 -8 -50 0 -50C8 -50 13 -40 11 -18Z" fill="#8A6A44" stroke="${OL}" stroke-width="2"/><path d="M-14 -48C-8 -42 8 -42 14 -48C12 -40 8 -38 0 -38C-8 -38 -12 -40 -14 -48Z" fill="#C8B08A" stroke="${OL}" stroke-width="1.5"/><path d="M-11 -24H11" stroke="#4A3424" stroke-width="3"/><circle cx="0" cy="-24" r="2" fill="#C9A24A"/>`;
    case 'necromancer':
      return `<path d="M-16 0C-12 -28 -10 -46 0 -48C10 -46 12 -28 16 0C8 3 -8 3 -16 0Z" fill="#2E2440" stroke="${OL}" stroke-width="2"/><path d="M-3 -46V-2M3 -46V-2" stroke="#EEE8DA" stroke-width="1.2"/><circle cx="0" cy="-30" r="3.5" fill="#EEE8DA" stroke="${OL}" stroke-width="1"/><circle cx="-1.2" cy="-30.5" r="0.8" fill="${OL}"/><circle cx="1.2" cy="-30.5" r="0.8" fill="${OL}"/>`;
    case 'dragonslayer': {
      const w = t === 'ironroot' ? 24 : 21;
      return `<path d="M-${w} -10C-${w + 2} -32 -${w - 6} -46 0 -46C${w - 6} -46 ${w + 2} -32 ${w} -10Z" fill="#6A5A4A" stroke="${OL}" stroke-width="2"/><path d="M-14 -38q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0M-16 -30q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0M-16 -22q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0" stroke="#3E3226" stroke-width="1.3" fill="none"/><rect x="-${w}" y="-16" width="${w * 2}" height="5" fill="#3A2414" stroke="${OL}" stroke-width="1.2"/><circle cx="0" cy="-13.5" r="2.5" fill="#C9A24A"/>`;
    }
  }
}

function weapon(cls: HeroClass, t: Tribe, p: Palette): string {
  switch (cls) {
    case 'warrior':
      if (t === 'ironroot' || t === 'ashborn') {
        return `<path d="M20 -6L28 -72" stroke="${OL}" stroke-width="6.5" stroke-linecap="round"/><path d="M20 -6L28 -72" stroke="#9A6A3E" stroke-width="3.5" stroke-linecap="round"/><path d="M27 -74C40 -82 52 -74 54 -60C46 -60 40 -58 33 -52Z" fill="#C9CED3" stroke="${OL}" stroke-width="2"/>`;
      }
      return `<path d="M16 -14L24 -64" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><path d="M16 -14L24 -64" stroke="#E6EAED" stroke-width="2.2" stroke-linecap="round"/><path d="M12 -22L22 -20" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>
<path d="M-30 -40H-12V-24C-12 -14 -21 -8 -21 -8C-21 -8 -30 -14 -30 -24Z" fill="${t === 'dawnwings' ? '#FBF6E8' : p.accent}" stroke="${OL}" stroke-width="2"/><circle cx="-21" cy="-27" r="3.5" fill="#E2B84A"/>`;
    case 'ranger':
      return `<path d="M-24 -88C-42 -62 -42 -24 -24 2" fill="none" stroke="${OL}" stroke-width="5.5" stroke-linecap="round"/><path d="M-24 -88C-42 -62 -42 -24 -24 2" fill="none" stroke="#9A6A3E" stroke-width="3" stroke-linecap="round"/><path d="M-24 -88V2" stroke="#EDE6D6" stroke-width="1"/>`;
    case 'rogue':
      return `<path d="M12 -28L30 -34M10 -18L28 -16" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M14 -29L30 -34M12 -18L28 -16" stroke="#DDE2E6" stroke-width="2" stroke-linecap="round"/>`;
    case 'mage':
      return `<path d="M18 2L22 -66" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><path d="M18 2L22 -66" stroke="#6E5440" stroke-width="2.2" stroke-linecap="round"/><circle cx="22" cy="-70" r="11" fill="${p.orb}" opacity="0.3"/><circle cx="22" cy="-70" r="5.5" fill="${p.orb}" stroke="${OL}" stroke-width="1.5"/>`;
    case 'cleric':
      return `<path d="M16 -8L23 -50" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M16 -8L23 -50" stroke="#8A5A34" stroke-width="2.6" stroke-linecap="round"/><circle cx="23" cy="-53" r="6" fill="#9AA1A8" stroke="${OL}" stroke-width="1.8"/>
<circle cx="-18" cy="-26" r="12" fill="#C9A24A" stroke="${OL}" stroke-width="2"/><circle cx="-18" cy="-26" r="4" fill="#FFF3C4"/>`;
    case 'bard':
      return `<path d="M-20 -14C-30 -14 -32 -28 -22 -32C-16 -34 -10 -28 -12 -22Z" fill="#B07A45" stroke="${OL}" stroke-width="1.8"/><path d="M-14 -26L8 -48" stroke="${OL}" stroke-width="3.5" stroke-linecap="round"/><path d="M-14 -26L8 -48" stroke="#6E4A28" stroke-width="1.8"/><circle cx="-20" cy="-22" r="2.5" fill="${OL}"/>`;
    case 'paladin':
      return `<path d="M16 -10L24 -56" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M16 -10L24 -56" stroke="#8A5A34" stroke-width="2.6" stroke-linecap="round"/><path d="M19 -54L29 -60L31 -50L23 -46Z" fill="#E2B84A" stroke="${OL}" stroke-width="1.6"/>
<path d="M-34 -44H-10V-26C-10 -14 -22 -6 -22 -6C-22 -6 -34 -14 -34 -26Z" fill="#F2ECDC" stroke="${OL}" stroke-width="2"/><circle cx="-22" cy="-30" r="5" fill="#E2B84A" stroke="${OL}" stroke-width="1"/><path d="M-22 -40V-20M-31 -30H-13" stroke="#E2B84A" stroke-width="1.4"/>`;
    case 'beastmaster':
      return `<path d="M14 4L28 -80" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><path d="M14 4L28 -80" stroke="#8A6A3E" stroke-width="2.2" stroke-linecap="round"/><path d="M26 -78L30 -96L34 -78Z" fill="#C9CED3" stroke="${OL}" stroke-width="1.6"/><path d="M25 -70L21 -64M27 -68L25 -61" stroke="#C8423A" stroke-width="2" stroke-linecap="round"/>`;
    case 'necromancer':
      return `<path d="M18 2L22 -64" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><path d="M18 2L22 -64" stroke="#4A3A30" stroke-width="2.2" stroke-linecap="round"/><circle cx="22" cy="-72" r="13" fill="#7FF2A0" opacity="0.28"/><path d="M15 -72C15 -80 29 -80 29 -72C29 -68 27 -66 26 -64H18C17 -66 15 -68 15 -72Z" fill="#EEE8DA" stroke="${OL}" stroke-width="1.6"/><circle cx="19" cy="-72" r="2" fill="#2E7A4A"/><circle cx="25" cy="-72" r="2" fill="#2E7A4A"/>`;
    case 'dragonslayer':
      return `<path d="M-6 -30L34 -92" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M-4 -33L34 -92" stroke="#E6EAED" stroke-width="5.5" stroke-linecap="round"/><path d="M0 -38L34 -92" stroke="#B9BFC5" stroke-width="1.2"/><path d="M-12 -38L4 -26" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M-12 -38L4 -26" stroke="#C9A24A" stroke-width="2" stroke-linecap="round"/><path d="M-10 -22L-16 -14" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>`;
  }
}

export function heroBody(d: HeroDef): string {
  const p = PAL[d.tribe];
  const cls = d.heroClass;
  // The head is the card portrait's, shrunk: every hero's own face, hair, hat and look on the map too.
  const head = spriteHead(d, d.tribe === 'ironroot' ? -60 : -62);
  return `<g stroke-linejoin="round">${wings(d.tribe)}${tail(d.tribe, p)}${cape(cls, p)}${cls === 'ranger' ? weapon(cls, d.tribe, p) : ''}${head.back}${legs(cls, d.tribe, p)}${body(cls, d.tribe, p)}${head.front}${cls === 'ranger' ? '' : weapon(cls, d.tribe, p)}</g>`;
}

// ---- Enemies ----

const GOB = `<path d="M-5 -10V0M5 -10V0" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M-5 -10V-1M5 -10V-1" stroke="#7FA040" stroke-width="2.6" stroke-linecap="round"/>
<path d="M-10 -8L-12 -30C-8 -36 8 -36 12 -30L10 -8L6 -12L2 -8L-2 -12L-6 -8Z" fill="#7A5A34" stroke="${OL}" stroke-width="2"/>
<path d="M-10 -44L-32 -54L-13 -36Z" fill="#8DB04A" stroke="${OL}" stroke-width="2"/><path d="M10 -44L32 -54L13 -36Z" fill="#8DB04A" stroke="${OL}" stroke-width="2"/>
<ellipse cx="0" cy="-42" rx="12.5" ry="11.5" fill="#8DB04A" stroke="${OL}" stroke-width="2"/>
<circle cx="-5" cy="-45" r="3" fill="#F2D23A" stroke="${OL}" stroke-width="1"/><circle cx="5" cy="-45" r="3" fill="#F2D23A" stroke="${OL}" stroke-width="1"/><circle cx="-5" cy="-45" r="1.2" fill="#C8423A"/><circle cx="5" cy="-45" r="1.2" fill="#C8423A"/>
<path d="M-7 -36C-3 -33 3 -33 7 -36" stroke="${OL}" stroke-width="1.5" fill="none"/>`;

const ENEMY_ART: Record<string, string> = {
  goblin: `<path d="M15 2L21 -72" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><path d="M15 2L21 -72" stroke="#8A6A3E" stroke-width="2.2" stroke-linecap="round"/><path d="M17 -72L21 -86L25 -72Z" fill="#B9BFC5" stroke="${OL}" stroke-width="1.6"/>${GOB}`,
  goblin_archer: `${GOB}<path d="M-18 -54C-30 -38 -30 -16 -18 -4" stroke="${OL}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M-18 -54C-30 -38 -30 -16 -18 -4" stroke="#8A6A3E" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M-18 -54V-4" stroke="#E8E0D0" stroke-width="1"/>`,
  goblin_shaman: `<circle cx="17" cy="-60" r="14" fill="#9FF07A" opacity="0.3"/><path d="M14 2L17 -56" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><path d="M14 2L17 -56" stroke="#6E5440" stroke-width="2.2" stroke-linecap="round"/><circle cx="17" cy="-60" r="5" fill="#9FF07A" stroke="${OL}" stroke-width="1.5"/>${GOB}<path d="M-10 -46A10 9 0 0 1 10 -46V-40H-10Z" fill="#EEE8DA" stroke="${OL}" stroke-width="1.5"/><circle cx="-4.5" cy="-44" r="2" fill="${OL}"/><circle cx="4.5" cy="-44" r="2" fill="${OL}"/><path d="M-8 -54l-4 -10 6 6M8 -54l4 -10 -6 6" stroke="#C8423A" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  wolf: `<path d="M-26 -28C-40 -32 -46 -42 -44 -50C-38 -40 -30 -38 -22 -34Z" fill="#6E7378" stroke="${OL}" stroke-width="2"/>
<path d="M-20 -18L-23 0M-10 -16L-8 0M14 -18L12 0M23 -20L26 0" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M-20 -18L-23 -1M-10 -16L-8 -1M14 -18L12 -1M23 -20L26 -1" stroke="#5E6368" stroke-width="4" stroke-linecap="round"/>
<path d="M-28 -24C-28 -36 -12 -42 6 -40C18 -40 26 -34 28 -26C26 -18 16 -16 0 -16C-14 -16 -26 -16 -28 -24Z" fill="#7E848A" stroke="${OL}" stroke-width="2"/>
<path d="M-22 -36C-10 -42 8 -42 20 -38" stroke="#4E5358" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M22 -32C26 -44 36 -48 44 -42C48 -38 52 -34 56 -30C50 -26 42 -24 34 -24C28 -24 24 -26 22 -32Z" fill="#8A9097" stroke="${OL}" stroke-width="2"/>
<path d="M30 -44L32 -54L37 -46Z" fill="#6E7378" stroke="${OL}" stroke-width="1.6"/><circle cx="40" cy="-38" r="2.4" fill="#E8423A"/><circle cx="55" cy="-31" r="2" fill="${OL}"/>`,
  boar: `<path d="M-18 -16L-20 0M-6 -14L-6 0M10 -14L10 0M20 -16L22 0" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M-18 -16L-20 -1M-6 -14L-6 -1M10 -14L10 -1M20 -16L22 -1" stroke="#4A3424" stroke-width="4" stroke-linecap="round"/>
<path d="M-30 -22C-30 -40 -10 -46 8 -44C24 -44 34 -36 34 -24C32 -14 20 -12 0 -12C-18 -12 -30 -12 -30 -22Z" fill="#6E5034" stroke="${OL}" stroke-width="2"/>
<path d="M-24 -40l4 -8 4 6 4 -8 4 6 4 -8 4 6 4 -6" stroke="${OL}" stroke-width="1.5" fill="#4A3424"/>
<path d="M28 -34C38 -38 48 -34 50 -26C46 -20 38 -18 30 -20Z" fill="#7A5A3E" stroke="${OL}" stroke-width="2"/><ellipse cx="49" cy="-26" rx="3" ry="4" fill="#C9A08A" stroke="${OL}" stroke-width="1"/>
<path d="M40 -22C44 -26 46 -32 44 -36" stroke="#F6F0E0" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="36" cy="-32" r="1.8" fill="#E8423A"/>`,
  spider: `<g stroke="${OL}" stroke-width="3" fill="none" stroke-linecap="round"><path d="M-8 -20L-30 -34L-40 -4M-8 -16L-34 -20L-44 4M8 -20L30 -34L40 -4M8 -16L34 -20L44 4M-6 -12L-22 -6L-28 6M6 -12L22 -6L28 6"/></g>
<g stroke="#3A2E2A" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M-8 -20L-30 -34L-40 -4M8 -20L30 -34L40 -4"/></g>
<ellipse cx="0" cy="-28" rx="18" ry="15" fill="#3A2E2A" stroke="${OL}" stroke-width="2"/><path d="M-8 -34L0 -26L8 -34M-6 -24L0 -18L6 -24" stroke="#C8423A" stroke-width="1.8" fill="none"/>
<ellipse cx="0" cy="-12" rx="10" ry="8" fill="#4A3C36" stroke="${OL}" stroke-width="2"/><circle cx="-4" cy="-13" r="1.8" fill="#E8423A"/><circle cx="4" cy="-13" r="1.8" fill="#E8423A"/><circle cx="-1.5" cy="-9" r="1.2" fill="#E8423A"/><circle cx="1.5" cy="-9" r="1.2" fill="#E8423A"/>`,
  bandit: `<path d="M-6 -16V0M6 -16V0" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M-6 -16V-1M6 -16V-1" stroke="#3A3430" stroke-width="4" stroke-linecap="round"/>
<path d="M-13 -12C-14 -36 -9 -46 0 -46C9 -46 14 -36 13 -12Z" fill="#6E3A2A" stroke="${OL}" stroke-width="2"/><path d="M-13 -20H13" stroke="#2A1A10" stroke-width="3"/>
<circle cx="0" cy="-56" r="10.5" fill="#D8A07E" stroke="${OL}" stroke-width="2"/><path d="M-10 -54H10V-48C4 -46 -4 -46 -10 -48Z" fill="#2E2626" stroke="${OL}" stroke-width="1.2"/>
<path d="M-12 -58C-12 -70 12 -70 12 -58C8 -62 -8 -62 -12 -58Z" fill="#4A3A30" stroke="${OL}" stroke-width="1.5"/><circle cx="-4" cy="-57" r="1.6" fill="${OL}"/><circle cx="4" cy="-57" r="1.6" fill="${OL}"/>
<path d="M12 -24L28 -40" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M14 -26L28 -40" stroke="#DDE2E6" stroke-width="2" stroke-linecap="round"/>`,
  bandit_xbow: `<path d="M-6 -16V0M6 -16V0" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M-6 -16V-1M6 -16V-1" stroke="#3A3430" stroke-width="4" stroke-linecap="round"/>
<path d="M-13 -12C-14 -36 -9 -46 0 -46C9 -46 14 -36 13 -12Z" fill="#5A4A2A" stroke="${OL}" stroke-width="2"/>
<circle cx="0" cy="-56" r="10.5" fill="#D8A07E" stroke="${OL}" stroke-width="2"/><path d="M-13 -58C-13 -70 13 -70 13 -58L16 -56H-16Z" fill="#3A3430" stroke="${OL}" stroke-width="1.5"/><circle cx="-4" cy="-54" r="1.6" fill="${OL}"/><circle cx="4" cy="-54" r="1.6" fill="${OL}"/>
<path d="M6 -32H34" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M6 -32H34" stroke="#6E4A28" stroke-width="2"/><path d="M28 -42C34 -38 34 -26 28 -22" stroke="${OL}" stroke-width="3" fill="none"/>`,
  skeleton: `<path d="M-12 -52L-16 -10L-10 -14L-6 -6L0 -12L6 -6L10 -14L16 -10L12 -52Z" fill="#8E2B23" stroke="${OL}" stroke-width="1.8"/>
<path d="M-5 -20V0M5 -20V0" stroke="${OL}" stroke-width="5.5" stroke-linecap="round"/><path d="M-5 -20V-1M5 -20V-1" stroke="#EEE8DA" stroke-width="3" stroke-linecap="round"/>
<path d="M0 -24V-48" stroke="${OL}" stroke-width="4"/><path d="M0 -24V-48" stroke="#EEE8DA" stroke-width="2"/>
<g fill="none" stroke="${OL}" stroke-width="4" stroke-linecap="round"><path d="M-10 -44C-4 -40 4 -40 10 -44M-10 -38C-4 -34 4 -34 10 -38M-9 -32C-4 -29 4 -29 9 -32"/></g>
<g fill="none" stroke="#EEE8DA" stroke-width="2" stroke-linecap="round"><path d="M-10 -44C-4 -40 4 -40 10 -44M-10 -38C-4 -34 4 -34 10 -38M-9 -32C-4 -29 4 -29 9 -32"/></g>
<path d="M26 -8L32 -62" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M26 -8L32 -62" stroke="#B0703A" stroke-width="2.6" stroke-linecap="round"/>
<path d="M-20 -42A12 12 0 1 0 -14 -20L-20 -30Z" fill="#7A5A34" stroke="${OL}" stroke-width="2"/>
<circle cx="0" cy="-60" r="11" fill="#EEE8DA" stroke="${OL}" stroke-width="2"/><ellipse cx="-4.5" cy="-61" rx="3.2" ry="3.6" fill="${OL}"/><ellipse cx="4.5" cy="-61" rx="3.2" ry="3.6" fill="${OL}"/><circle cx="-4.5" cy="-61" r="1.5" fill="#7FD9FF"/><circle cx="4.5" cy="-61" r="1.5" fill="#7FD9FF"/>`,
  lurker: `<path d="M-34 0C-38 -30 -24 -58 0 -60C24 -58 38 -30 34 0Z" fill="#4E6448" stroke="${OL}" stroke-width="2.5"/>
<path d="M-20 -8C-22 -30 -12 -44 4 -44C18 -42 22 -28 20 -8" fill="#6E8460"/>
<g fill="#7FA35A" stroke="${OL}" stroke-width="1"><circle cx="-22" cy="-46" r="6"/><circle cx="14" cy="-54" r="5"/><circle cx="26" cy="-30" r="4"/></g>
<path d="M-30 -16C-44 -12 -48 0 -44 4M30 -16C44 -12 48 0 44 4" stroke="${OL}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M-30 -16C-44 -12 -48 0 -44 4M30 -16C44 -12 48 0 44 4" stroke="#4E6448" stroke-width="5" stroke-linecap="round" fill="none"/>
<circle cx="-8" cy="-40" r="3.5" fill="#F2D23A" stroke="${OL}" stroke-width="1"/><circle cx="8" cy="-40" r="3.5" fill="#F2D23A" stroke="${OL}" stroke-width="1"/>
<path d="M-12 -28C-4 -22 4 -22 12 -28" stroke="${OL}" stroke-width="2" fill="none"/><path d="M-8 -26l2 4M0 -24l0 4M8 -26l-2 4" stroke="#F6F0E0" stroke-width="1.8"/>`,
};

// More monster families. Base colours here are what regional variants swap (see data/world.ts).
Object.assign(ENEMY_ART, {
  crab: `<path d="M-16 -8L-26 0M-10 -6L-16 4M10 -6L16 4M16 -8L26 0" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>
<path d="M-16 -8L-26 0M-10 -6L-16 4M10 -6L16 4M16 -8L26 0" stroke="#C8583A" stroke-width="2" stroke-linecap="round"/>
<ellipse cx="0" cy="-20" rx="26" ry="16" fill="#D8643E" stroke="${OL}" stroke-width="2.2"/>
<path d="M-18 -26C-8 -32 8 -32 18 -26" stroke="#F09A6A" stroke-width="2" fill="none"/>
<path d="M-22 -28C-34 -40 -40 -48 -36 -56C-30 -54 -26 -48 -24 -42C-20 -48 -16 -50 -12 -48C-12 -40 -16 -34 -22 -28Z" fill="#D8643E" stroke="${OL}" stroke-width="2"/>
<path d="M22 -28C34 -40 40 -48 36 -56C30 -54 26 -48 24 -42C20 -48 16 -50 12 -48C12 -40 16 -34 22 -28Z" fill="#D8643E" stroke="${OL}" stroke-width="2"/>
<path d="M-6 -34V-44M6 -34V-44" stroke="${OL}" stroke-width="2"/><circle cx="-6" cy="-46" r="3" fill="#1B140E"/><circle cx="6" cy="-46" r="3" fill="#1B140E"/>
<path d="M-12 -40C-6 -46 6 -46 12 -40L10 -32H-10Z" fill="#9AA1A8" stroke="${OL}" stroke-width="1.5"/>`,
  ghoul: `<path d="M-6 -14L-10 0M6 -14L10 0" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="M-6 -14L-10 -1M6 -14L10 -1" stroke="#8A9A80" stroke-width="3" stroke-linecap="round"/>
<path d="M-14 -12C-20 -30 -12 -46 4 -48C18 -46 20 -30 14 -12Z" fill="#8A9A80" stroke="${OL}" stroke-width="2"/>
<path d="M-8 -34C-2 -30 4 -30 10 -34M-6 -26C0 -22 6 -22 10 -26" stroke="#5E6E56" stroke-width="1.5" fill="none"/>
<path d="M-12 -40C-24 -34 -30 -22 -30 -8" stroke="${OL}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M-12 -40C-24 -34 -30 -22 -30 -8" stroke="#8A9A80" stroke-width="3" stroke-linecap="round" fill="none"/>
<path d="M-34 -8l4 -6 2 7 3 -6" stroke="${OL}" stroke-width="2" fill="none"/>
<path d="M14 -40C26 -36 30 -24 28 -10" stroke="${OL}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M14 -40C26 -36 30 -24 28 -10" stroke="#8A9A80" stroke-width="3" stroke-linecap="round" fill="none"/>
<ellipse cx="6" cy="-54" rx="11" ry="10" fill="#9AAA8E" stroke="${OL}" stroke-width="2"/>
<circle cx="2" cy="-56" r="2.5" fill="#F2E27A"/><circle cx="10" cy="-56" r="2.5" fill="#F2E27A"/>
<path d="M0 -48L2 -44L4 -48L6 -44L8 -48L10 -44" stroke="${OL}" stroke-width="1.4" fill="#F6F0E0"/>`,
  wraith: `<path d="M-18 -4C-14 -24 -14 -50 0 -62C14 -50 14 -24 18 -4L12 -10L6 -2L0 -10L-6 -2L-12 -10Z" fill="#C9C4DC" fill-opacity="0.85" stroke="${OL}" stroke-width="2"/>
<path d="M-10 -10C-8 -26 -8 -44 0 -54C8 -44 8 -26 10 -10" fill="#8E88B0" fill-opacity="0.6"/>
<path d="M-12 -46C-22 -42 -28 -34 -30 -24M12 -46C22 -42 28 -34 30 -24" stroke="#C9C4DC" stroke-width="5" stroke-linecap="round" fill="none"/>
<path d="M-8 -56C-4 -64 4 -64 8 -56C8 -50 4 -46 0 -46C-4 -46 -8 -50 -8 -56Z" fill="#1B140E"/>
<circle cx="-3.5" cy="-55" r="2" fill="#7FF2C9"/><circle cx="3.5" cy="-55" r="2" fill="#7FF2C9"/>
<circle cx="0" cy="-40" r="22" fill="#7FF2C9" opacity="0.12"/>`,
  wisp: `<circle cx="0" cy="-44" r="22" fill="#7FF2C9" opacity="0.25"/><circle cx="0" cy="-44" r="13" fill="#7FF2C9" opacity="0.5"/>
<path d="M0 -60C8 -54 12 -46 8 -38C4 -32 -4 -32 -8 -38C-12 -46 -8 -54 0 -60Z" fill="#B9FFF0" stroke="${OL}" stroke-width="1.6"/>
<path d="M-4 -34C-6 -26 -2 -20 -6 -14M4 -34C6 -24 2 -18 6 -12" stroke="#7FF2C9" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="-3" cy="-46" r="1.8" fill="#1B140E"/><circle cx="3" cy="-46" r="1.8" fill="#1B140E"/>`,
  imp: `<path d="M-6 -46C-20 -62 -36 -58 -38 -46C-32 -48 -30 -42 -32 -38C-26 -40 -22 -36 -22 -32C-16 -36 -10 -40 -6 -42Z" fill="#7A2A20" stroke="${OL}" stroke-width="1.8"/>
<path d="M6 -46C20 -62 36 -58 38 -46C32 -48 30 -42 32 -38C26 -40 22 -36 22 -32C16 -36 10 -40 6 -42Z" fill="#7A2A20" stroke="${OL}" stroke-width="1.8"/>
<path d="M6 -26C18 -20 22 -10 16 -2C14 2 20 4 22 0" stroke="${OL}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M6 -26C18 -20 22 -10 16 -2C14 2 20 4 22 0" stroke="#C8402A" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="0" cy="-34" r="20" fill="#FF7A3A" opacity="0.25"/>
<ellipse cx="0" cy="-34" rx="11" ry="13" fill="#D2452E" stroke="${OL}" stroke-width="2"/>
<path d="M-8 -60C-10 -70 -4 -74 -2 -82C2 -74 6 -78 6 -86C12 -76 12 -66 8 -60Z" fill="#FFB04A" stroke="${OL}" stroke-width="1.5"/>
<circle cx="0" cy="-52" r="10" fill="#E0553A" stroke="${OL}" stroke-width="2"/>
<path d="M-8 -58L-12 -68L-5 -61Z M8 -58L12 -68L5 -61Z" fill="#2A1A14" stroke="${OL}" stroke-width="1"/>
<circle cx="-4" cy="-53" r="2" fill="#FFE49A"/><circle cx="4" cy="-53" r="2" fill="#FFE49A"/>
<path d="M-12 -30L-24 -56" stroke="${OL}" stroke-width="3.5" stroke-linecap="round"/><path d="M-28 -60L-26 -54L-22 -58L-20 -52L-25 -56Z" fill="#3A3F45" stroke="${OL}" stroke-width="1"/>`,
  yeti: `<rect x="-20" y="-16" width="14" height="16" rx="5" fill="#E6EEF2" stroke="${OL}" stroke-width="2.2"/><rect x="6" y="-16" width="14" height="16" rx="5" fill="#E6EEF2" stroke="${OL}" stroke-width="2.2"/>
<path d="M-28 -12C-36 -40 -24 -74 0 -76C24 -74 36 -40 28 -12Z" fill="#F4F8FA" stroke="${OL}" stroke-width="2.5"/>
<path d="M-20 -30l4 6 4 -6 4 6 4 -6 4 6 4 -6 4 6" stroke="#B0C0CA" stroke-width="1.5" fill="none"/>
<path d="M-26 -56C-40 -44 -44 -24 -40 -8" stroke="${OL}" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M-26 -56C-40 -44 -44 -24 -40 -8" stroke="#F4F8FA" stroke-width="9" stroke-linecap="round" fill="none"/>
<path d="M26 -56C40 -44 44 -24 40 -8" stroke="${OL}" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M26 -56C40 -44 44 -24 40 -8" stroke="#F4F8FA" stroke-width="9" stroke-linecap="round" fill="none"/>
<path d="M-12 -66C-12 -56 12 -56 12 -66C10 -52 -10 -52 -12 -66Z" fill="#7EA4B4" stroke="${OL}" stroke-width="1.5"/>
<circle cx="-5" cy="-64" r="2" fill="#1B140E"/><circle cx="5" cy="-64" r="2" fill="#1B140E"/>
<path d="M-6 -56L-4 -60L-2 -56M2 -56L4 -60L6 -56" stroke="${OL}" stroke-width="1" fill="#F6F0E0"/>`,
  troll: `<rect x="-22" y="-14" width="16" height="14" rx="4" fill="#5E6E44" stroke="${OL}" stroke-width="2.5"/><rect x="8" y="-14" width="16" height="14" rx="4" fill="#5E6E44" stroke="${OL}" stroke-width="2.5"/>
<path d="M34 -6L52 -74" stroke="${OL}" stroke-width="14" stroke-linecap="round"/><path d="M34 -6L52 -74" stroke="#7A5232" stroke-width="10" stroke-linecap="round"/>
<path d="M-30 -10C-42 -40 -32 -84 0 -88C32 -88 44 -52 36 -10Z" fill="#6E7E52" stroke="${OL}" stroke-width="2.5"/>
<path d="M-14 -16C-16 -40 -6 -56 8 -56C22 -56 26 -36 20 -16Z" fill="#8E9C6A"/>
<path d="M-26 -66C-40 -50 -44 -24 -40 -6" stroke="${OL}" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M-26 -66C-40 -50 -44 -24 -40 -6" stroke="#6E7E52" stroke-width="11" stroke-linecap="round" fill="none"/>
<path d="M28 -66C38 -50 40 -30 36 -12" stroke="${OL}" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M28 -66C38 -50 40 -30 36 -12" stroke="#6E7E52" stroke-width="11" stroke-linecap="round" fill="none"/>
<g fill="#4E7A34" stroke="${OL}" stroke-width="1"><circle cx="-20" cy="-78" r="6"/><circle cx="-12" cy="-84" r="5"/><circle cx="22" cy="-76" r="6"/></g>
<circle cx="8" cy="-80" r="13" fill="#7E8E5E" stroke="${OL}" stroke-width="2"/>
<circle cx="3" cy="-82" r="2" fill="#F0A03A"/><circle cx="13" cy="-82" r="2" fill="#F0A03A"/>
<path d="M2 -72L4 -78L6 -72Z M10 -72L12 -78L14 -72Z" fill="#F6F0E0" stroke="${OL}" stroke-width="1"/>`,
  golem: `<rect x="-22" y="-18" width="16" height="18" rx="2" fill="#8A8676" stroke="${OL}" stroke-width="2.5"/><rect x="6" y="-18" width="16" height="18" rx="2" fill="#8A8676" stroke="${OL}" stroke-width="2.5"/>
<path d="M-30 -16L-34 -70L34 -70L30 -16Z" fill="#A6A08A" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M-28 -44H28M0 -70V-16" stroke="#6E6A5A" stroke-width="2"/>
<g stroke="#7FD9E6" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M-16 -60l6 8 6 -8M-10 -52v8"/><path d="M8 -30h12M14 -36v12"/></g>
<rect x="-46" y="-66" width="14" height="40" rx="4" fill="#9A947E" stroke="${OL}" stroke-width="2.2"/><rect x="32" y="-66" width="14" height="40" rx="4" fill="#9A947E" stroke="${OL}" stroke-width="2.2"/>
<rect x="-14" y="-90" width="28" height="22" rx="3" fill="#B0AA94" stroke="${OL}" stroke-width="2.2"/>
<rect x="-9" y="-84" width="6" height="4" fill="#7FF2FF"/><rect x="3" y="-84" width="6" height="4" fill="#7FF2FF"/>`,
  whelp: `<path d="M-10 -48C-20 -74 -42 -84 -50 -70C-44 -70 -42 -64 -46 -58C-40 -60 -36 -56 -38 -50C-30 -52 -22 -48 -14 -42Z" fill="#B8462A" stroke="${OL}" stroke-width="2"/>
<path d="M4 -48C10 -76 30 -88 40 -76C34 -74 34 -68 38 -62C32 -62 30 -58 32 -52C24 -54 16 -50 8 -42Z" fill="#B8462A" stroke="${OL}" stroke-width="2"/>
<path d="M-16 -16C-28 -12 -40 -18 -44 -28C-40 -26 -36 -26 -34 -30C-30 -22 -24 -20 -16 -22Z" fill="#D87A2E" stroke="${OL}" stroke-width="2"/>
<path d="M-10 -12V0M8 -12V0" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M-10 -12V-1M8 -12V-1" stroke="#C8682A" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="0" cy="-26" rx="17" ry="16" fill="#D87A2E" stroke="${OL}" stroke-width="2"/><ellipse cx="2" cy="-22" rx="9" ry="10" fill="#F2C86A"/>
<path d="M8 -36C12 -46 16 -50 22 -52" stroke="${OL}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M8 -36C12 -46 16 -50 22 -52" stroke="#D87A2E" stroke-width="7" stroke-linecap="round" fill="none"/>
<path d="M16 -56C22 -64 34 -62 40 -54C36 -50 30 -48 22 -48C18 -48 14 -52 16 -56Z" fill="#E08A3A" stroke="${OL}" stroke-width="2"/>
<path d="M18 -60L14 -70L22 -62Z M24 -62L24 -72L28 -62Z" fill="#F6E9C9" stroke="${OL}" stroke-width="1.2"/>
<circle cx="26" cy="-56" r="2" fill="#FFE49A" stroke="${OL}" stroke-width="0.8"/>`,
});

// The Goblin Fortress: riders, bombers, the Ironguard, the warlord and the gate itself.
const GOB_TORSO = GOB.split('\n').slice(1).join('\n');
ENEMY_ART.wolf_rider = `${ENEMY_ART.wolf}<g transform="translate(-4 -30) scale(0.85)">${GOB_TORSO}</g>
<path d="M14 -40L36 -96" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M14 -40L36 -96" stroke="#8A6A3E" stroke-width="2" stroke-linecap="round"/><path d="M33 -94L39 -106L40 -92Z" fill="#B9BFC5" stroke="${OL}" stroke-width="1.4"/>`;
ENEMY_ART.goblin_bomber = `${GOB}<path d="M-9 -30L9 -14" stroke="#5A3A22" stroke-width="3"/><circle cx="-3" cy="-23" r="2.5" fill="#2A2A2E"/><circle cx="4" cy="-17" r="2.5" fill="#2A2A2E"/>
<path d="M10 -30L16 -52" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M10 -30L16 -52" stroke="#7FA040" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="17" cy="-60" r="8.5" fill="#2A2A2E" stroke="${OL}" stroke-width="2"/><circle cx="14" cy="-63" r="2" fill="#6A6A72"/><path d="M21 -66Q25 -74 31 -72" stroke="#8A6A3E" stroke-width="2" fill="none"/><circle cx="31" cy="-72" r="3.5" fill="#FFB23A"/><circle cx="31" cy="-72" r="1.5" fill="#FFF3C4"/>`;
ENEMY_ART.ironguard = `${GOB}<path d="M-11 -10L-12 -31C-8 -36 8 -36 12 -31L11 -10Z" fill="#6A7078" stroke="${OL}" stroke-width="2"/><path d="M-11 -20H11" stroke="#4A4E56" stroke-width="2"/>
<path d="M-14 -46C-14 -62 14 -62 14 -46Z" fill="#7A8088" stroke="${OL}" stroke-width="2"/><path d="M-14 -47H14" stroke="#4A4E56" stroke-width="2.5"/><path d="M0 -60V-68" stroke="#8E2B23" stroke-width="4" stroke-linecap="round"/>
<path d="M-32 -42H-12V-22C-12 -13 -22 -8 -22 -8C-22 -8 -32 -13 -32 -22Z" fill="#8E2B23" stroke="${OL}" stroke-width="2"/><circle cx="-22" cy="-27" r="3.5" fill="#C9A24A" stroke="${OL}"/>
<path d="M14 -4L20 -60" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/><path d="M14 -4L20 -60" stroke="#6E4A28" stroke-width="2.2" stroke-linecap="round"/><path d="M18 -60C28 -66 36 -58 34 -46C28 -48 23 -48 19 -44Z" fill="#B9BFC5" stroke="${OL}" stroke-width="1.6"/>`;
ENEMY_ART.warlord = `<g transform="scale(1.35)"><path d="M-15 -40L-24 -2L24 -2L15 -40Z" fill="#8E2B23" stroke="${OL}" stroke-width="2"/>${GOB}
<path d="M-11 -10L-12 -30C-8 -35 8 -35 12 -30L11 -10Z" fill="#4A4E56" stroke="${OL}" stroke-width="2"/>
<path d="M-15 -34C-8 -27 8 -27 15 -34C13 -25 6 -23 0 -23C-6 -23 -13 -25 -15 -34Z" fill="#8A6A44" stroke="${OL}" stroke-width="1.5"/>
<path d="M-13 -48C-13 -61 13 -61 13 -48Z" fill="#3A3E46" stroke="${OL}" stroke-width="2"/>
<path d="M-12 -53C-24 -57 -29 -67 -25 -76C-21 -67 -16 -63 -9 -59Z M12 -53C24 -57 29 -67 25 -76C21 -67 16 -63 9 -59Z" fill="#EDE2C8" stroke="${OL}" stroke-width="1.6"/>
<path d="M14 -6L18 -44" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M14 -6L18 -44" stroke="#5A3A22" stroke-width="2.6" stroke-linecap="round"/><path d="M14 -42L36 -51L38 -33L18 -29Z" fill="#C9CED3" stroke="${OL}" stroke-width="1.8"/><path d="M20 -36L34 -41" stroke="#8E2B23" stroke-width="1.5"/></g>`;
ENEMY_ART.gate = `<path d="M-34 0V-78C-34 -100 34 -100 34 -78V0Z" fill="#7A5232" stroke="${OL}" stroke-width="2.5"/>
<path d="M-17 0V-95M0 0V-99M17 0V-95" stroke="#5A3A22" stroke-width="2"/><path d="M-34 -70H34M-34 -24H34" stroke="#4A4E56" stroke-width="6"/>
<g fill="#9AA1A8"><circle cx="-26" cy="-70" r="2"/><circle cx="-8" cy="-70" r="2"/><circle cx="8" cy="-70" r="2"/><circle cx="26" cy="-70" r="2"/><circle cx="-26" cy="-24" r="2"/><circle cx="-8" cy="-24" r="2"/><circle cx="8" cy="-24" r="2"/><circle cx="26" cy="-24" r="2"/></g>
<circle cx="0" cy="-48" r="9" fill="#EEE8DA" stroke="${OL}" stroke-width="1.5"/><circle cx="-3.5" cy="-49" r="2.2" fill="${OL}"/><circle cx="3.5" cy="-49" r="2.2" fill="${OL}"/><path d="M-4 -42H4" stroke="${OL}" stroke-width="1.5"/>`;

// Large battles: tombs and their king, cages, the Bandit King, and freed prisoners.
const CROWN = (y: number) => `<path d="M-11 ${y}L-11 ${y - 10}L-5 ${y - 4}L0 ${y - 12}L5 ${y - 4}L11 ${y - 10}L11 ${y}Z" fill="#E2B84A" stroke="${OL}" stroke-width="1.5"/><circle cx="0" cy="${y - 4}" r="1.8" fill="#C8423A"/>`;
ENEMY_ART.tomb = `<path d="M-36 0V-50L0 -76L36 -50V0Z" fill="#8E8A7A" stroke="${OL}" stroke-width="2.5"/>
<path d="M-42 -48L0 -80L42 -48" stroke="#6E6A5E" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M-15 0V-30A15 15 0 0 1 15 -30V0Z" fill="#7FF2C9" fill-opacity="0.85" stroke="${OL}" stroke-width="2"/>
<circle cx="0" cy="-56" r="5" fill="#7FF2C9"/><path d="M-26 -20L-20 -30M24 -12L30 -22M-28 -40L-22 -44" stroke="#5E5A4E" stroke-width="1.5"/>`;
ENEMY_ART.barrow_king = `<g transform="scale(1.3)"><path d="M-16 -46L-24 -2L24 -2L16 -46Z" fill="#3E4A44" stroke="${OL}" stroke-width="2"/>${ENEMY_ART.skeleton}${CROWN(-68)}
<path d="M18 -4L24 -70" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M18 -4L24 -70" stroke="#9AA1A8" stroke-width="2.6" stroke-linecap="round"/><path d="M12 -22L28 -26" stroke="#C9A24A" stroke-width="3" stroke-linecap="round"/></g>`;
ENEMY_ART.cage = `<path d="M-30 0V-62H30V0Z" fill="#2A1E14" fill-opacity="0.35"/>
<circle cx="0" cy="-34" r="7" fill="#E3B08E" stroke="${OL}" stroke-width="1.5"/><path d="M-8 -2V-24C-8 -28 8 -28 8 -24V-2Z" fill="#8A7A5A" stroke="${OL}" stroke-width="1.5"/>
<path d="M-32 0H32M-32 -64H32" stroke="#5A3A22" stroke-width="6" stroke-linecap="round"/>
<path d="M-28 0V-64M-14 0V-64M0 0V-64M14 0V-64M28 0V-64" stroke="#7A5232" stroke-width="4"/>
<path d="M-28 0V-64M-14 0V-64M0 0V-64M14 0V-64M28 0V-64" stroke="${OL}" stroke-width="1" opacity="0.6"/>`;
ENEMY_ART.bandit_king = `<g transform="scale(1.3)"><path d="M-14 -46L-22 -2L22 -2L14 -46Z" fill="#8E2B23" stroke="${OL}" stroke-width="2"/>${ENEMY_ART.bandit}${CROWN(-66)}</g>`;

// The Cinder Legion: walking fire, and its lord in obsidian.
ENEMY_ART.fire_elemental = `<ellipse cx="0" cy="-2" rx="20" ry="5" fill="#FF6A2A" opacity="0.4"/>
<path d="M-18 0C-24 -20 -14 -30 -18 -48C-10 -42 -6 -50 -6 -64C2 -54 6 -62 4 -76C14 -62 20 -52 14 -40C22 -42 24 -30 18 0Z" fill="#E8502A" stroke="${OL}" stroke-width="2"/>
<path d="M-10 0C-14 -16 -6 -24 -8 -38C-2 -32 2 -40 2 -50C8 -40 12 -32 8 -24C14 -26 14 -14 10 0Z" fill="#FFB23A"/>
<path d="M-4 0C-6 -10 0 -16 0 -26C4 -18 6 -12 4 0Z" fill="#FFF3A0"/>
<circle cx="-5" cy="-40" r="2.8" fill="#FFF3A0" stroke="${OL}" stroke-width="1"/><circle cx="5" cy="-40" r="2.8" fill="#FFF3A0" stroke="${OL}" stroke-width="1"/>`;
ENEMY_ART.cinder_lord = `<g transform="scale(1.35)"><ellipse cx="0" cy="-2" rx="26" ry="6" fill="#FF6A2A" opacity="0.45"/>
<path d="M-22 0C-30 -24 -18 -40 -22 -58C-12 -50 -8 -60 -6 -74C4 -62 8 -72 6 -84C16 -70 24 -58 16 -44C26 -46 28 -32 22 0Z" fill="#E8502A" stroke="${OL}" stroke-width="2"/>
<path d="M-14 -6L-16 -34C-10 -40 10 -40 16 -34L14 -6Z" fill="#2A2226" stroke="${OL}" stroke-width="2"/><path d="M-14 -22H14M0 -38V-6" stroke="#FF9A3C" stroke-width="1.5"/>
<path d="M-12 -52L-20 -66L-8 -58Z M12 -52L20 -66L8 -58Z" fill="#2A2226" stroke="${OL}" stroke-width="1.5"/>
<circle cx="-5" cy="-50" r="3" fill="#FFF3A0" stroke="${OL}" stroke-width="1"/><circle cx="5" cy="-50" r="3" fill="#FFF3A0" stroke="${OL}" stroke-width="1"/>
<path d="M20 -8L28 -60" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M20 -8L28 -60" stroke="#2A2226" stroke-width="2.6"/><path d="M24 -58L32 -74L36 -58Z" fill="#FF9A3C" stroke="${OL}" stroke-width="1.5"/></g>`;

// The Deep Marches: bigger cousins of familiar shapes.
ENEMY_ART.drake = `<g transform="scale(1.3)">${ENEMY_ART.whelp}</g>`;
ENEMY_ART.titan = `<g transform="scale(1.1)">${ENEMY_ART.golem}</g>`;
ENEMY_ART.leviathan = `<g transform="scale(1.35)">${ENEMY_ART.lurker}</g>`;
ENEMY_ART.alpha = `<g transform="translate(-8 0) scale(1.2)">${ENEMY_ART.wolf}<g transform="translate(37 0)">${CROWN(-45)}</g></g>`;

// Dragonmaw's blood altars.
ENEMY_ART.altar = `<ellipse cx="0" cy="-2" rx="32" ry="7" fill="#000" opacity="0.25"/>
<path d="M-26 0V-26H26V0Z" fill="#5A5460" stroke="${OL}" stroke-width="2.5"/><path d="M-31 -25H31V-34H-31Z" fill="#6E6874" stroke="${OL}" stroke-width="2.5"/>
<path d="M-9 -6L0 -21L9 -6Z" stroke="#E8423A" stroke-width="2.5" fill="none"/><path d="M0 -15V-9" stroke="#E8423A" stroke-width="2.5"/>
<path d="M-16 -34C-20 -46 -10 -50 -12 -62C-4 -54 0 -60 0 -72C8 -62 14 -52 10 -42C16 -44 18 -38 16 -34Z" fill="#C8243A" stroke="${OL}" stroke-width="1.5"/>
<path d="M-7 -34C-9 -42 -3 -46 -2 -53C2 -47 7 -43 5 -34Z" fill="#FF8A6A"/><circle cx="-22" cy="-30" r="3" fill="#E8C86A"/><circle cx="22" cy="-30" r="3" fill="#E8C86A"/>`;

// The elder dragon: wide wings, a long neck, fire in its jaws.
ENEMY_ART.dragon = `<g transform="translate(-8 0)">
<path d="M-30 -20C-50 -14 -60 -4 -64 6C-54 0 -44 -2 -30 -8Z" fill="#8E2B23" stroke="${OL}" stroke-width="2"/>
<path d="M-6 -48C-30 -96 -58 -100 -62 -86C-50 -82 -48 -74 -52 -66C-42 -70 -36 -62 -40 -54C-30 -58 -22 -52 -24 -44Z" fill="#5A1E18" stroke="${OL}" stroke-width="2"/>
<path d="M-22 -14L-24 0M-8 -12L-6 0M14 -12L16 0M26 -14L30 0" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M-22 -14L-24 -1M-8 -12L-6 -1M14 -12L16 -1M26 -14L30 -1" stroke="#6E2A20" stroke-width="5" stroke-linecap="round"/>
<path d="M-36 -22C-36 -44 -10 -52 14 -50C34 -48 42 -36 40 -22C36 -10 20 -8 0 -8C-20 -8 -36 -10 -36 -22Z" fill="#A8342A" stroke="${OL}" stroke-width="2.5"/>
<path d="M-26 -14C-10 -10 14 -10 32 -16" stroke="#E8C86A" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M-24 -46l4 -8 4 6 4 -9 4 7 4 -9 4 7 4 -8 4 6" stroke="${OL}" stroke-width="1.4" fill="#6E2A20"/>
<path d="M28 -40C40 -60 46 -74 40 -88" stroke="${OL}" stroke-width="16" stroke-linecap="round" fill="none"/><path d="M28 -40C40 -60 46 -74 40 -88" stroke="#A8342A" stroke-width="11" stroke-linecap="round" fill="none"/>
<path d="M34 -94C44 -102 60 -100 66 -90C62 -84 54 -82 44 -82C38 -82 32 -88 34 -94Z" fill="#A8342A" stroke="${OL}" stroke-width="2"/>
<path d="M38 -96L28 -106L42 -99Z M46 -98L44 -106L51 -98Z" fill="#EDE2C8" stroke="${OL}" stroke-width="1.2"/>
<circle cx="52" cy="-93" r="2.5" fill="#FFD27A"/><circle cx="68" cy="-86" r="6" fill="#FF9A3C" opacity="0.75"/><circle cx="68" cy="-86" r="2.5" fill="#FFF3A0"/>
<path d="M4 -46C-6 -92 -36 -102 -42 -90C-30 -86 -30 -78 -34 -70C-24 -74 -18 -66 -22 -58C-12 -62 -4 -56 -6 -48Z" fill="#7A2A20" stroke="${OL}" stroke-width="2"/>
</g>`;
// Kalvorax, the Elder Wyrm of Dragonmaw: the elder dragon in black and gold (the sprite frame has no room to grow).
ENEMY_ART.elder_wyrm = ENEMY_ART.dragon;

// The heart of a fae gloom: a twisted stump around a pulsing crystal.
ENEMY_ART.gloom_heart = `<ellipse cx="0" cy="-4" rx="36" ry="9" fill="#3E2A5E" opacity="0.5"/>
<path d="M-30 0C-26 -20 -34 -40 -22 -58C-18 -44 -12 -40 -8 -46C-8 -64 0 -80 6 -88C8 -70 14 -60 22 -66C20 -50 30 -36 30 0Z" fill="#2E2440" stroke="${OL}" stroke-width="2.5"/>
<path d="M-22 -58L-34 -72M6 -88L-2 -100M22 -66L36 -78M30 -30L44 -38" stroke="#2E2440" stroke-width="4" stroke-linecap="round"/>
<circle cx="0" cy="-34" r="18" fill="#B98AF0" opacity="0.35"/>
<path d="M0 -50L10 -34L0 -18L-10 -34Z" fill="#D8B8F0" stroke="${OL}" stroke-width="2"/><path d="M0 -46L5 -34L0 -22" fill="#F6F0FF"/>
<circle cx="-14" cy="-12" r="2.5" fill="#B9FFF0"/><circle cx="16" cy="-20" r="2" fill="#B9FFF0"/>`;

// Beastmasters' companions: tinted beasts, plus a toad.
ENEMY_ART.toad = `<path d="M-24 -4C-34 -2 -38 -10 -30 -16L-18 -18Z" fill="#5E8A3E" stroke="${OL}" stroke-width="2"/>
<ellipse cx="0" cy="-20" rx="28" ry="19" fill="#6E9E48" stroke="${OL}" stroke-width="2"/><ellipse cx="5" cy="-12" rx="17" ry="8" fill="#D8D49A"/>
<circle cx="-10" cy="-29" r="4" fill="#4E7A34"/><circle cx="-19" cy="-19" r="3" fill="#4E7A34"/><circle cx="1" cy="-33" r="2.6" fill="#4E7A34"/>
<circle cx="15" cy="-36" r="7.5" fill="#6E9E48" stroke="${OL}" stroke-width="2"/><circle cx="17" cy="-37" r="3.4" fill="#F2D23A" stroke="${OL}" stroke-width="1"/><path d="M17 -39.5V-34.5" stroke="${OL}" stroke-width="1.6"/>
<path d="M10 -21C18 -16 26 -18 28 -23" stroke="${OL}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 -6L24 0H6Z" fill="#5E8A3E" stroke="${OL}" stroke-width="2"/>`;

// The painted monsters replace the first, flat set (structures such as gates and tombs stay as they are).
Object.assign(ENEMY_ART, MONSTER_ART);

// Trail encounters: a merchant's wagon, nests, and a cutpurse with the party's purse.
ENEMY_ART.wagon = `<ellipse cx="0" cy="0" rx="52" ry="7" fill="#000" fill-opacity="0.18"/>
<path d="M44 -26L62 -18" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M44 -26L62 -18" stroke="#8A5A32" stroke-width="2.6" stroke-linecap="round"/>
<path d="M-40 -42C-40 -88 40 -88 40 -42Z" fill="#EDE2C8" stroke="${OL}" stroke-width="2.5"/>
<path d="M-20 -42C-22 -78 -14 -82 -10 -82M10 -82C14 -82 22 -78 20 -42" stroke="#C8B894" stroke-width="2.5" fill="none"/>
<path d="M-34 -58H34" stroke="#B83A2A" stroke-width="5"/>
<rect x="-46" y="-44" width="92" height="24" rx="3" fill="#8A5A32" stroke="${OL}" stroke-width="2.5"/>
<path d="M-46 -32H46M-24 -44V-20M0 -44V-20M24 -44V-20" stroke="#6A4224" stroke-width="1.5"/>
<g><circle cx="-28" cy="-12" r="13" fill="#6A4224" stroke="${OL}" stroke-width="2.5"/><circle cx="-28" cy="-12" r="3" fill="${OL}"/><path d="M-28 -24V0M-40 -12H-16M-36 -20L-20 -4M-36 -4L-20 -20" stroke="#4A2E18" stroke-width="1.6"/></g>
<g><circle cx="28" cy="-12" r="13" fill="#6A4224" stroke="${OL}" stroke-width="2.5"/><circle cx="28" cy="-12" r="3" fill="${OL}"/><path d="M28 -24V0M16 -12H40M20 -20L36 -4M20 -4L36 -20" stroke="#4A2E18" stroke-width="1.6"/></g>
<circle cx="-30" cy="-50" r="5" fill="#E2B84A" stroke="${OL}" stroke-width="1.2"/><circle cx="-22" cy="-52" r="4" fill="#9CB25E" stroke="${OL}" stroke-width="1.2"/>`;
ENEMY_ART.spider_nest = `<ellipse cx="0" cy="0" rx="50" ry="8" fill="#000" fill-opacity="0.2"/>
<path d="M-46 0C-46 -44 -22 -66 0 -66C22 -66 46 -44 46 0Z" fill="#D8D4CC" fill-opacity="0.92" stroke="${OL}" stroke-width="2.5"/>
<path d="M0 -66V0M-30 -50L30 0M30 -50L-30 0M-46 -16H46M-40 -36H40" stroke="#A8A49C" stroke-width="1.3" fill="none"/>
<ellipse cx="0" cy="-16" rx="14" ry="10" fill="#2A221C" stroke="${OL}" stroke-width="2"/>
<g fill="#F2ECD0" stroke="${OL}" stroke-width="1.2"><ellipse cx="-24" cy="-34" rx="6" ry="7"/><ellipse cx="-14" cy="-44" rx="5" ry="6"/><ellipse cx="20" cy="-30" rx="6" ry="7"/><ellipse cx="26" cy="-42" rx="5" ry="6"/></g>
<path d="M-60 -60L-46 -40M60 -64L44 -40M-58 -10L-44 -14M58 -8L44 -12" stroke="#C8C4BC" stroke-width="1.2"/>`;
ENEMY_ART.burrow = `<ellipse cx="0" cy="0" rx="54" ry="8" fill="#000" fill-opacity="0.2"/>
<path d="M-50 0C-42 -34 -18 -48 0 -48C18 -48 42 -34 50 0Z" fill="#7A5A3A" stroke="${OL}" stroke-width="2.5"/>
<path d="M-34 -22C-26 -30 -12 -34 -4 -34M14 -36C24 -34 34 -26 38 -18" stroke="#5E4428" stroke-width="2" fill="none"/>
<ellipse cx="0" cy="-12" rx="20" ry="13" fill="#1E1610" stroke="${OL}" stroke-width="2"/>
<circle cx="-6" cy="-14" r="2" fill="#E8423A"/><circle cx="5" cy="-14" r="2" fill="#E8423A"/>
<path d="M30 -30V-84" stroke="${OL}" stroke-width="4" stroke-linecap="round"/><path d="M30 -30V-84" stroke="#8A6A44" stroke-width="2" stroke-linecap="round"/>
<path d="M30 -84L54 -78L46 -70L54 -62L30 -60Z" fill="#B83A2A" stroke="${OL}" stroke-width="2"/>
<path d="M-40 -4L-24 -8M-30 -10L-26 -2" stroke="#EEE8DA" stroke-width="3" stroke-linecap="round"/>`;
ENEMY_ART.mimic = `<ellipse cx="0" cy="0" rx="40" ry="7" fill="#000" fill-opacity="0.22"/>
<path d="M-34 -4V-30H34V-4Z" fill="#8A5A32" stroke="${OL}" stroke-width="2.5"/>
<path d="M-34 -18H34M-20 -30V-4M20 -30V-4" stroke="#5A3A20" stroke-width="2"/>
<path d="M-30 -30L-24 -22L-18 -30L-12 -22L-6 -30L0 -22L6 -30L12 -22L18 -30L24 -22L30 -30Z" fill="#F2ECD0" stroke="${OL}" stroke-width="1.5"/>
<path d="M-26 -30C-20 -18 10 -14 22 -26" fill="#C8423A" stroke="${OL}" stroke-width="1.5"/>
<path d="M-36 -32L-30 -76H30L36 -32Z" fill="#9A6A3A" stroke="${OL}" stroke-width="2.5"/>
<path d="M-32 -46H32M-20 -76V-32M20 -76V-32" stroke="#5A3A20" stroke-width="2"/>
<path d="M-30 -34L-24 -42L-18 -34L-12 -42L-6 -34L0 -42L6 -34L12 -42L18 -34L24 -42L30 -34Z" fill="#F2ECD0" stroke="${OL}" stroke-width="1.5"/>
<circle cx="-12" cy="-60" r="6" fill="#F2D23A" stroke="${OL}" stroke-width="1.5"/><circle cx="12" cy="-60" r="6" fill="#F2D23A" stroke="${OL}" stroke-width="1.5"/>
<path d="M-12 -64V-56M12 -64V-56" stroke="${OL}" stroke-width="2.2"/>
<path d="M-6 -2L-10 6M6 -2L10 6M-24 -2L-30 6M24 -2L30 6" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>`;
ENEMY_ART.stag = `<ellipse cx="0" cy="0" rx="34" ry="6" fill="#000" fill-opacity="0.2"/>
<path d="M-24 -30L-26 0M-14 -30L-12 0M16 -30L14 0M24 -30L26 0" stroke="${OL}" stroke-width="5" stroke-linecap="round"/>
<path d="M-24 -30L-26 0M-14 -30L-12 0M16 -30L14 0M24 -30L26 0" stroke="#F2EEE4" stroke-width="2.6" stroke-linecap="round"/>
<ellipse cx="0" cy="-38" rx="32" ry="14" fill="#F2EEE4" stroke="${OL}" stroke-width="2.5"/>
<path d="M-30 -40C-36 -38 -38 -44 -34 -48" stroke="${OL}" stroke-width="2" fill="none"/>
<path d="M22 -44L32 -66L44 -62L38 -42Z" fill="#F2EEE4" stroke="${OL}" stroke-width="2.5"/>
<path d="M38 -66L46 -60L50 -56L44 -54Z" fill="#E8E2D4" stroke="${OL}" stroke-width="2"/>
<circle cx="40" cy="-62" r="2" fill="${OL}"/>
<path d="M36 -68C34 -80 26 -86 22 -94M30 -78L22 -80M36 -68C40 -82 48 -88 54 -96M46 -84L54 -82" stroke="#E2B84A" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="-6" cy="-46" r="3" fill="#FFF3A0" opacity="0.8"/><circle cx="10" cy="-32" r="2" fill="#FFF3A0" opacity="0.8"/>`;
ENEMY_ART.cutpurse = `${ENEMY_ART.bandit ?? ''}<g transform="translate(22 -34)"><path d="M-9 0C-13 -12 -6 -18 0 -18C6 -18 13 -12 9 0Z" fill="#C9A24A" stroke="${OL}" stroke-width="2"/><path d="M-5 -18L5 -18" stroke="${OL}" stroke-width="2.4"/><circle cx="-2" cy="-8" r="2.4" fill="#FFF3A0"/></g>`;

const PET_ART: Record<string, { sprite: string; tint?: Record<string, string> }> = {
  pet_wolf: { sprite: 'wolf', tint: { '#7E848A': '#8A6A4A', '#8A9097': '#9A7A5A', '#6E7378': '#6E5034', '#5E6368': '#5A4030', '#4E5358': '#C8423A', '#E8423A': '#2A1A10' } },
  pet_boar: { sprite: 'boar', tint: { '#E8423A': '#2A1A10', '#4A3424': '#C8423A' } },
  pet_toad: { sprite: 'toad' },
  pet_bonehound: { sprite: 'wolf', tint: { '#7E848A': '#E6E0CC', '#8A9097': '#EEE8DA', '#6E7378': '#C8C0A8', '#5E6368': '#B0A890', '#4E5358': '#8A8270', '#E8423A': '#7FF2C9' } },
  pet_moonwolf: { sprite: 'wolf', tint: { '#7E848A': '#B8B0E0', '#8A9097': '#CCC6F0', '#6E7378': '#8E86C0', '#5E6368': '#7A72AA', '#4E5358': '#5E4E8C', '#E8423A': '#B9FFF0' } },
};

export function enemyBody(sprite: string, tint?: Record<string, string>): string {
  let art = ENEMY_ART[sprite] ?? ENEMY_ART.goblin;
  if (tint) for (const [from, to] of Object.entries(tint)) art = art.split(from).join(to);
  return `<g stroke-linejoin="round">${art}</g>`;
}

/** Full SVG for a sprite key ("hero:brannoc" or an enemy sprite name). */
export function spriteSvg(key: string, size = 128): string {
  const enemy = ENEMY_BY_ID[key];
  const pet = PET_ART[key];
  const inner = key.startsWith('hero:') ? heroBody(HERO_BY_ID[key.slice(5)]) : enemy ? enemyBody(enemy.sprite, enemy.tint) : pet ? enemyBody(pet.sprite, pet.tint) : enemyBody(key);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 0.875}" viewBox="-64 -104 128 112">${inner}</svg>`;
}

const TRIBE_BG: Record<Tribe, [string, string]> = {
  freeholders: ['#E7D9A4', '#9CB25E'],
  thornkin: ['#C4D49C', '#4F7A3A'],
  ironroot: ['#B7C0CA', '#5E646B'],
  ashborn: ['#E9A272', '#7A3A28'],
  fenfolk: ['#A9C8B8', '#3E6E5E'],
  moonveil: ['#9C8AC0', '#2E2846'],
  dawnwings: ['#FFF1C4', '#E0B45A'],
  hollowed: ['#6E6888', '#24202E'],
};

/** Card portrait: the hero's figure, zoomed in, over a tribe-coloured backdrop. */
export function portraitSvg(d: HeroDef, opts: { silhouette?: boolean } = {}): string {
  const [a, b] = opts.silhouette ? ['#5A4A38', '#2A1E14'] : TRIBE_BG[d.tribe];
  const id = `pg-${d.id}${opts.silhouette ? '-sil' : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -108 100 86" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect x="-50" y="-108" width="100" height="86" fill="url(#${id})"/>
<ellipse cx="0" cy="-22" rx="60" ry="14" fill="#000" opacity="0.18"/>
${opts.silhouette ? `<filter id="${id}-f"><feColorMatrix type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0 0.04  0 0 0 0.92 0"/></filter><g filter="url(#${id}-f)">` : '<g>'}
${d.pet ? `<g transform="translate(-30 -20) scale(0.55)">${spriteInner(d.pet)}</g>` : ''}
${heroBody(d)}
</g>
</svg>`;
}

/** A pet's body (feet at 0, 0), for heroes who bring one. */
export function petBody(key: string): string {
  return spriteInner(key);
}

function spriteInner(key: string): string {
  const pet = PET_ART[key];
  return pet ? enemyBody(pet.sprite, pet.tint) : enemyBody(key);
}
