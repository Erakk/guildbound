// Spell icons (drawn in a 34 x 34 box) and spell-card portraits.

import type { Rarity, SpellDef } from '../core/types';

const ICON: Record<string, string> = {
  fortune: '<circle cx="15" cy="19" r="10" fill="none" stroke="#F2D26A" stroke-width="2"/><circle cx="15" cy="19" r="6" fill="none" stroke="#F2D26A" stroke-width="1.4"/><path d="M27 3L28.4 6.6L32 8L28.4 9.4L27 13L25.6 9.4L22 8L25.6 6.6Z" fill="#FFF3C4"/>',
  harvest: '<path d="M17 31V9" stroke="#E2C46A" stroke-width="2" stroke-linecap="round"/><path d="M17 12C13 10 12 6 13 4C16 5 18 8 17 12ZM17 12C21 10 22 6 21 4C18 5 16 8 17 12ZM17 19C13 17 11 13 12 11C15 12 17 15 17 19ZM17 19C21 17 23 13 22 11C19 12 17 15 17 19ZM17 26C13 24 11 20 12 18C15 19 17 22 17 26ZM17 26C21 24 23 20 22 18C19 19 17 22 17 26Z" fill="none" stroke="#E2C46A" stroke-width="1.6" stroke-linejoin="round"/>',
  insight: '<path d="M4 9C9 7 14 8 17 11C20 8 25 7 30 9V27C25 25 20 26 17 29C14 26 9 25 4 27Z" fill="none" stroke="#B9D8FF" stroke-width="2" stroke-linejoin="round"/><path d="M17 11V29" stroke="#B9D8FF" stroke-width="1.6"/><path d="M8 14H13M8 18H13M21 14H26M21 18H26" stroke="#B9D8FF" stroke-width="1.4" stroke-linecap="round"/>',
  heal_rain: '<path d="M8 14a7 7 0 0 1 13-3a6 6 0 1 1 3 11H10a5 5 0 0 1-2-8Z" fill="none" stroke="#C6F2CF" stroke-width="2"/><path d="M12 26l-2 4M18 26l-2 4M24 26l-2 4" stroke="#C6F2CF" stroke-width="2" stroke-linecap="round"/>',
  lightning: '<path d="M19 4L9 19h7l-3 11 12-16h-7l3-10Z" fill="none" stroke="#FFE9A3" stroke-width="2" stroke-linejoin="round"/>',
  reveal: '<path d="M3 17C8 9 26 9 31 17C26 25 8 25 3 17Z" fill="none" stroke="#FFE9A3" stroke-width="2"/><circle cx="17" cy="17" r="5" fill="none" stroke="#FFE9A3" stroke-width="2"/><circle cx="17" cy="17" r="1.8" fill="#FFE9A3"/>',
  haste: '<path d="M5 12H17M3 17H19M5 22H17" stroke="#FFD36A" stroke-width="2" stroke-linecap="round"/><path d="M20 8L30 17L20 26" fill="none" stroke="#FFD36A" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>',
  entangle: '<path d="M8 30C8 20 16 18 14 10C12 6 8 6 8 10" fill="none" stroke="#9FD67A" stroke-width="2" stroke-linecap="round"/><path d="M22 30C22 22 28 18 26 12C25 8 21 8 22 12" fill="none" stroke="#9FD67A" stroke-width="2" stroke-linecap="round"/><path d="M14 21C18 18 20 23 24 20" stroke="#9FD67A" stroke-width="2" fill="none"/><path d="M12 15l-4 -2M24 17l4 -2" stroke="#9FD67A" stroke-width="2" stroke-linecap="round"/>',
  frost: '<g stroke="#BFE8FF" stroke-width="2" stroke-linecap="round" fill="none"><path d="M17 4V30M5.7 10.5L28.3 23.5M5.7 23.5L28.3 10.5"/><path d="M13 7L17 10L21 7M13 27L17 24L21 27"/></g>',
  ward: '<path d="M17 4L28 8V16C28 24 17 30 17 30C17 30 6 24 6 16V8Z" fill="none" stroke="#FFF6D8" stroke-width="2" stroke-linejoin="round"/><path d="M17 11L18.8 15.2L23 15.6L19.8 18.4L20.8 22.6L17 20.4L13.2 22.6L14.2 18.4L11 15.6L15.2 15.2Z" fill="#FFF6D8"/>',
  fireball: '<path d="M17 30C10 30 6 25 7 19C8 14 12 13 12 8C16 10 17 14 17 14C18 10 21 7 21 4C26 9 28 14 28 19C28 25 24 30 17 30Z" fill="none" stroke="#FF9A4A" stroke-width="2" stroke-linejoin="round"/><circle cx="17" cy="22" r="4" fill="#FFD27A"/>',
  barrier: '<path d="M17 4L28 10V24L17 30L6 24V10Z" fill="none" stroke="#D8CFB8" stroke-width="2" stroke-linejoin="round"/><path d="M17 4V30M6 10L28 24M28 10L6 24" stroke="#D8CFB8" stroke-width="1" opacity="0.6"/>',
  rally: '<path d="M9 30V4" stroke="#F08A5A" stroke-width="2" stroke-linecap="round"/><path d="M9 5H27L23 11L27 17H9" fill="none" stroke="#F08A5A" stroke-width="2" stroke-linejoin="round"/>',
  meteor: '<circle cx="22" cy="22" r="7" fill="none" stroke="#FF7A3A" stroke-width="2"/><circle cx="22" cy="22" r="2.5" fill="#FFB27A"/><path d="M4 4L16 16M9 3L18 12M3 9L12 18" stroke="#FFB27A" stroke-width="2" stroke-linecap="round"/>',
  second_wind: '<path d="M17 30V14" stroke="#FFF3C4" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="9" r="4" fill="none" stroke="#FFF3C4" stroke-width="2"/><path d="M17 18C12 14 7 15 4 12M17 18C22 14 27 15 30 12M17 22C13 20 9 21 7 19M17 22C21 20 25 21 27 19" fill="none" stroke="#FFF3C4" stroke-width="1.8" stroke-linecap="round"/>',
};

/** A spell's colour on the map (targeting ring and cast effect). */
export const SPELL_COLOR: Record<string, number> = {
  fortune: 0xf2d26a, harvest: 0xe2c46a, insight: 0xb9d8ff,
  heal_rain: 0x9fe0b0, lightning: 0xfff3a0, reveal: 0xffe9a3, haste: 0xffd36a, entangle: 0x7fbe5a, frost: 0xbfe8ff,
  ward: 0xfff6d8, fireball: 0xff8a3c, barrier: 0xd8cfb8, rally: 0xf08a5a, meteor: 0xff6a2a, second_wind: 0xfff3c4,
  keg: 0xffa040,
};

export function spellIcon(id: string, size = 32): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 34 34" aria-hidden="true">${ICON[id] ?? ''}</svg>`;
}

const BG: Record<Rarity, [string, string]> = {
  common: ['#4A4E5E', '#1E2030'],
  uncommon: ['#3E6A4A', '#16261C'],
  rare: ['#3E5E8E', '#141E34'],
  epic: ['#6E4A9A', '#22163A'],
  legendary: ['#A0782E', '#3A2410'],
};

/** Card art: the spell's sigil glowing over a rarity-coloured backdrop. */
export function spellPortraitSvg(sp: SpellDef): string {
  const [a, b] = BG[sp.rarity];
  const id = `sg-${sp.id}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 86" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="${id}" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
<rect width="100" height="86" fill="url(#${id})"/>
<circle cx="50" cy="43" r="30" fill="none" stroke="#F6E9C9" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="3 4"/>
<circle cx="50" cy="43" r="22" fill="#F6E9C9" fill-opacity="0.08"/>
<g transform="translate(27 20) scale(1.35)">${ICON[sp.id] ?? ''}</g>
</svg>`;
}
