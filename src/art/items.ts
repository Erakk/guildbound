// Item icons for the backpack and the shops (viewBox 0 0 48 48). The metal shows the tier: dull iron,
// bright steel, blue-white mithril. Named gear gets gold fittings and a glow in the colour of its magic.

import type { ItemDef, Stats } from '../core/types';

const OL = '#1B140E';
const METAL = ['', '#A8ADB3', '#D9E0E6', '#A6E6F2'];
const METAL_D = ['', '#6E747A', '#98A2AC', '#5EA8C0'];
const WOOD = '#8A5A30';
const WOOD_D = '#5E3A1E';
const LEATHER = '#8A5A34';
const GOLD = '#E2B84A';

const P = (d: string, fill: string, w = 1.8) => `<path d="${d}" fill="${fill}" stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const L = (d: string, c: string, w: number) => `<path d="${d}" stroke="${OL}" stroke-width="${w + 2.6}" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const shine = (d: string) => `<path d="${d}" stroke="#FFF" stroke-opacity="0.55" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;

const MAGIC: Partial<Record<keyof Stats, string>> = { might: '#FF8A4A', finesse: '#9CE86A', arcana: '#8ADCFF', vigor: '#FF6A6A', resolve: '#F1D27A' };

/** The strongest stat an item gives, for gem and glow colours. */
function mainStat(d: ItemDef): keyof Stats | undefined {
  let best: keyof Stats | undefined;
  for (const [k, v] of Object.entries(d.stats)) if (v! > 0 && (!best || v! > (d.stats[best] ?? 0))) best = k as keyof Stats;
  return best;
}

function art(d: ItemDef): string {
  const t = Math.max(1, Math.min(3, d.tier));
  const m = METAL[t];
  const md = METAL_D[t];
  const fit = d.named ? GOLD : t === 3 ? '#C9A24A' : '#7A5A34';
  const gem = MAGIC[mainStat(d) ?? 'arcana'] ?? '#8ADCFF';
  switch (d.kind) {
    case 'sword':
      return P('M11 37L33 9L38 10L37 15L13 39Z', m) + P('M33 9L38 10L37 15Z', md, 1.2) + shine('M14 35L33 12') + L('M8 30L18 40', fit, 3) + L('M6 42L13 35', WOOD_D, 3.4) + `<circle cx="5.5" cy="42.5" r="2.6" fill="${fit}" stroke="${OL}" stroke-width="1.4"/>`;
    case 'greatsword':
      return P('M12 34L37 6L43 5L42 11L15 37Z', m) + shine('M15 32L38 8') + L('M7 27L20 40', fit, 3.4) + L('M4 44L13 35', WOOD_D, 3.6) + `<circle cx="3.8" cy="44.2" r="2.6" fill="${fit}" stroke="${OL}" stroke-width="1.4"/>`;
    case 'dagger':
      return P('M16 32L32 14L36 13L35 17L19 35Z', m) + shine('M19 31L32 16') + L('M13 28L21 36', fit, 2.6) + L('M10 39L16 33', WOOD_D, 3.2) + `<circle cx="9" cy="40" r="2.2" fill="${fit}" stroke="${OL}" stroke-width="1.2"/>`;
    case 'axe':
      return L('M12 42L34 10', WOOD, 3.4) + P('M28 8C34 4 42 8 44 16C40 16 36 18 33 22L27 16C29 14 29 10 28 8Z', m) + shine('M31 9C36 7 40 10 42 14') + P('M27 16L33 22L30 24L25 18Z', md, 1.2);
    case 'mace':
      return L('M12 42L30 16', WOOD, 3.4) + P('M26 8L30 5L34 9L38 8L39 13L43 16L39 20L40 25L35 25L32 29L29 25L24 25L25 20L21 16L25 13Z', m) + `<circle cx="32" cy="16" r="3.4" fill="${md}" stroke="${OL}" stroke-width="1.2"/>` + L('M10 40L14 44', fit, 2.6);
    case 'warhammer':
      return L('M10 44L32 14', WOOD, 3.6) + P('M24 6L38 16L33 23L19 13Z', m) + P('M38 16L42 13L36 9L33 11Z', md, 1.2) + shine('M25 9L35 16') + L('M8 42L12 46', fit, 2.6);
    case 'wand':
      return L('M12 40L32 14', WOOD, 2.6) + L('M14 38L18 33', fit, 2.6) + `<circle cx="34" cy="12" r="8" fill="${gem}" opacity="0.3"/>` + P('M34 6L38 12L34 18L30 12Z', gem, 1.4) + shine('M33 9L35 12');
    case 'staff':
      return L('M10 46L34 12', WOOD, 3.2) + P('M30 14C28 8 32 4 36 4C40 4 42 8 40 12C38 16 34 16 30 14Z', 'none', 1.8).replace('fill="none"', `fill="${WOOD_D}"`) + `<circle cx="35" cy="9" r="9" fill="${gem}" opacity="0.3"/><circle cx="35" cy="9" r="4.6" fill="${gem}" stroke="${OL}" stroke-width="1.4"/>` + shine('M33.5 7.5L35 6.5');
    case 'bow':
      return `<path d="M14 6C30 12 36 30 32 44" fill="none" stroke="${OL}" stroke-width="5.6" stroke-linecap="round"/><path d="M14 6C30 12 36 30 32 44" fill="none" stroke="${WOOD}" stroke-width="3" stroke-linecap="round"/>` + `<path d="M14 6L32 44" stroke="#E8E0D0" stroke-width="1"/>` + L('M24 22L28 28', fit, 2.8) + (t > 1 ? `<path d="M15 7L19 9M31 41L33 37" stroke="${m}" stroke-width="2"/>` : '');
    case 'shield':
      return P('M10 8H38V22C38 34 24 42 24 42C24 42 10 34 10 22Z', d.named ? '#3D6178' : t === 1 ? '#7A5232' : t === 2 ? '#3D6178' : '#2E4A6E') + `<path d="M10 8H38V22C38 34 24 42 24 42C24 42 10 34 10 22Z" fill="none" stroke="${m}" stroke-width="2.6"/>` + `<circle cx="24" cy="22" r="5" fill="${d.named ? GOLD : m}" stroke="${OL}" stroke-width="1.4"/>` + shine('M14 12H22');
    case 'tome':
      return P('M9 10C9 8 11 7 13 7H38V39H13C11 39 9 38 9 36Z', t === 1 ? '#6E4A2A' : t === 2 ? '#4A3A6E' : '#2E4A6E') + P('M12 36H38V41H13C11 41 10 40 10 38Z', '#F2E6CC', 1.4) + `<path d="M17 7V39" stroke="${OL}" stroke-width="1.4"/>` + `<circle cx="28" cy="22" r="5.5" fill="none" stroke="${gem}" stroke-width="1.8"/><path d="M28 17V27M23 22H33" stroke="${gem}" stroke-width="1.4"/>` + P('M36 18H40V26H36Z', fit, 1.2);
    case 'quiver':
      return L('M20 10L18 4M26 10L27 3M32 11L35 5', WOOD, 1.6) + `<path d="M17 4l2-3l1 3M26 3l1-3l1 3M34 5l2-3l0.6 3.4" fill="#E8E0D0" stroke="${OL}" stroke-width="0.8"/>` + P('M14 12L36 10L34 42C30 44 20 44 18 42Z', LEATHER) + `<path d="M15 20L35 18M16 32L34 30" stroke="${fit}" stroke-width="2"/>` + shine('M18 15L19 38');
    case 'robe':
      return P('M16 6L22 5C23 8 25 8 26 5L32 6L38 14L34 18L37 43H11L14 18L10 14Z', t === 3 ? '#3E3A78' : t === 2 ? '#5A4A8A' : '#6E5E9E') + `<path d="M24 9V43" stroke="${OL}" stroke-width="1.2"/>` + `<path d="M12 40H36" stroke="#E2B84A" stroke-width="2.4"/><path d="M19 9L24 15L29 9" fill="none" stroke="#E2B84A" stroke-width="1.6"/>` + shine('M17 10L15 16');
    case 'light':
      return P('M14 8L20 6C22 9 26 9 28 6L34 8L40 16L35 20L34 42H14L13 20L8 16Z', t === 3 ? '#3A3048' : LEATHER) + `<path d="M24 10V42" stroke="${OL}" stroke-width="1.2"/>` + `<path d="M20 16h1M27 16h1M20 24h1M27 24h1M20 32h1M27 32h1" stroke="${fit}" stroke-width="2.4" stroke-linecap="round"/>` + shine('M16 12L14 18');
    case 'medium':
      return P('M14 8L20 6C22 9 26 9 28 6L34 8L41 18L36 21L35 42H13L12 21L7 18Z', m) + `<path d="M14 14H34M13 20H35M13 26H35M13 32H35M13 38H35" stroke="${md}" stroke-width="1.4" stroke-dasharray="2 2"/>` + shine('M16 11L14 17');
    case 'heavy':
      return P('M12 10C16 6 32 6 36 10L40 22L36 24L35 42H13L12 24L8 22Z', m) + P('M15 24C20 26 28 26 33 24L33 42H15Z', md, 1.4) + `<path d="M24 10V24" stroke="${md}" stroke-width="2"/>` + shine('M15 12C17 10 21 9 23 9') + `<circle cx="10" cy="18" r="1.6" fill="${fit}"/><circle cx="38" cy="18" r="1.6" fill="${fit}"/>`;
    case 'ring':
      return `<ellipse cx="24" cy="28" rx="12" ry="11" fill="none" stroke="${OL}" stroke-width="7"/><ellipse cx="24" cy="28" rx="12" ry="11" fill="none" stroke="${['', '#C98A4A', '#D9DEE2', GOLD][t]}" stroke-width="4"/>` + `<circle cx="24" cy="15" r="7" fill="${gem}" opacity="0.35"/>` + P('M24 9L29 15L24 21L19 15Z', gem, 1.4) + shine('M15 24C15 21 17 19 19 18');
    case 'amulet':
      return `<path d="M12 6C14 18 20 22 24 24C28 22 34 18 36 6" fill="none" stroke="${OL}" stroke-width="3.6"/><path d="M12 6C14 18 20 22 24 24C28 22 34 18 36 6" fill="none" stroke="${['', '#C9B898', '#7FA35A', '#8ADCFF'][t]}" stroke-width="1.6" stroke-dasharray="2 1.4"/>` + `<circle cx="24" cy="32" r="10" fill="${gem}" opacity="0.3"/>` + P('M24 22L32 30L24 42L16 30Z', gem) + P('M24 22L32 30L24 32L16 30Z', '#FFF', 0.8).replace('fill="#FFF"', 'fill="#FFF" fill-opacity="0.35"');
    case 'feather':
      return `<circle cx="26" cy="20" r="14" fill="#FF8A3C" opacity="0.25"/>` + P('M12 42C14 30 22 12 38 6C38 18 30 32 16 40Z', '#E0582A') + P('M16 38C20 28 28 16 36 9C34 18 28 28 18 36Z', '#FFB23A', 1) + `<path d="M12 42L34 10" stroke="${OL}" stroke-width="1.4"/>`;
    case 'crown':
      return `<circle cx="24" cy="26" r="18" fill="${GOLD}" opacity="0.2"/>` + P('M8 34L10 14L17 22L24 10L31 22L38 14L40 34Z', GOLD) + P('M8 34H40V39H8Z', '#C9A24A', 1.6) + `<circle cx="24" cy="18" r="2.6" fill="#D84A3A" stroke="${OL}" stroke-width="1"/><circle cx="15" cy="30" r="2" fill="#5EA6D8" stroke="${OL}" stroke-width="0.8"/><circle cx="33" cy="30" r="2" fill="#7FA35A" stroke="${OL}" stroke-width="0.8"/>` + shine('M12 20L13 30');
    default:
      return P('M14 14H34V34H14Z', m);
  }
}

/** An item's icon as a complete SVG. */
export function itemIconSvg(d: ItemDef): string {
  const glow = d.named ? `<circle cx="24" cy="24" r="22" fill="${MAGIC[mainStat(d) ?? 'resolve'] ?? GOLD}" opacity="0.18"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${glow}${art(d)}</svg>`;
}

/** The slot's empty-outline icon, for an empty slot on the paper doll. */
export const SLOT_ICON: Record<string, string> = {
  main: '<svg viewBox="0 0 48 48"><path d="M11 37L33 9L38 10L37 15L13 39ZM8 30L18 40M6 42L13 35" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  off: '<svg viewBox="0 0 48 48"><path d="M10 8H38V22C38 34 24 42 24 42C24 42 10 34 10 22Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  armor: '<svg viewBox="0 0 48 48"><path d="M14 8L20 6C22 9 26 9 28 6L34 8L40 16L35 20L34 42H14L13 20L8 16Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  jewelry: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="28" rx="12" ry="11" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M24 9L29 15L24 21L19 15Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};
