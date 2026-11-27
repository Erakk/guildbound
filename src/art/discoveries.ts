// Discovery icons for the trip map (viewBox -40 -60 80 70, ground at y = 0). Drawn as SVG and turned into
// textures by the trip view, like the unit sprites.

const OL = '#1B140E';
const P = (d: string, fill: string, w = 2) => `<path d="${d}" fill="${fill}" stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const C = (x: number, y: number, r: number, fill: string, w = 1.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${OL}" stroke-width="${w}"/>`;
const shadow = (rx = 26) => `<ellipse cx="0" cy="2" rx="${rx}" ry="6" fill="#000" opacity="0.25"/>`;

const ART: Record<string, string> = {
  beehive: shadow(18) + P('M-2 -30 V-46', '#5A3A22', 3) + P('M-14 -6 C-18 -18 -12 -30 0 -30 C12 -30 18 -18 14 -6 C10 0 -10 0 -14 -6Z', '#E2B84A')
    + `<path d="M-15 -12 H15 M-14 -20 H14" stroke="#A9853F" stroke-width="2"/>` + P('M-3 -8 h6 v6 h-6Z', '#3A2414', 1.2)
    + C(14, -36, 2.4, '#F1D27A', 1) + C(-12, -40, 2.2, '#F1D27A', 1) + `<path d="M12 -38 l-3 -2 M16 -38 l3 -2 M-14 -42 l-3 -2 M-10 -42 l3 -2" stroke="${OL}" stroke-width="1"/>`,
  fairyring: shadow(30) + [[-24, -2], [-12, -8], [4, -9], [18, -6], [26, 0], [-18, 4], [12, 4]].map(([x, y]) => P(`M${x - 5} ${y} q5 -10 10 0 Z`, '#D84A3A', 1.4) + `<rect x="${x - 1.5}" y="${y}" width="3" height="4" fill="#F2E6CC"/>` + `<circle cx="${x - 2}" cy="${y - 4}" r="1" fill="#FFF"/>`).join('')
    + `<circle cx="0" cy="-20" r="16" fill="#B9FFF0" opacity="0.25"/>` + [[-8, -26], [6, -32], [10, -18], [-4, -14]].map(([x, y]) => `<path d="M${x} ${y - 3} l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1z" fill="#FFF"/>`).join(''),
  orevein: shadow(28) + P('M-26 0 L-20 -24 L-6 -34 L12 -30 L26 -14 L24 0Z', '#8A8676') + P('M-6 -34 L12 -30 L26 -14 L8 -18Z', '#9A947E', 1.4)
    + `<path d="M-16 -16 L-6 -20 L2 -12 M6 -24 L14 -18" stroke="#C98A4A" stroke-width="3" stroke-linecap="round"/>` + C(-6, -20, 2.6, '#E0A06A', 1) + C(14, -18, 2.4, '#E0A06A', 1)
    + P('M18 -40 L30 -28', '#7A5232', 3) + P('M14 -44 L24 -42 L22 -36Z', '#9AA1A8', 1.4),
  campfire: shadow(22) + P('M-16 -2 L14 -10 M-14 -10 L16 -2', '#6E4A28', 5) + `<path d="M-8 -6 C-12 -18 -4 -24 0 -34 C4 -24 12 -18 8 -6Z" fill="#FF9A3C" stroke="${OL}" stroke-width="1.6"/><path d="M-3 -7 C-5 -14 -1 -18 0 -24 C2 -18 5 -14 3 -7Z" fill="#FFE29A"/>`
    + P('M14 -4 C18 -12 30 -12 32 -4Z', '#8E6A4A', 1.4) + P('M-34 -2 C-30 -10 -20 -10 -18 -2Z', '#6E5A8A', 1.4),
  gravegoods: shadow(30) + P('M-28 0 C-24 -22 24 -22 28 0Z', '#7E9A5A') + `<path d="M-20 -4 C-16 -14 16 -14 20 -4" stroke="#5E7A3A" stroke-width="1.6" fill="none"/>`
    + P('M-4 -18 V-44 M-12 -36 H4', '#9A947E', 4) + P('M10 -8 h12 v-8 h-12Z', '#8A6A3E', 1.4) + C(16, -18, 3, '#E2B84A', 1) + C(-16, -10, 2.4, '#EEE8DA', 1),
  wisp: shadow(14) + P('M0 0 V-22', '#5A3A22', 2.4) + `<circle cx="0" cy="-34" r="18" fill="#7FF2C9" opacity="0.28"/>` + P('M0 -46 C7 -42 9 -36 7 -30 C5 -24 2 -23 0 -23 C-4 -23 -8 -26 -8 -31 C-8 -36 -5 -38 -4 -41 C-3 -36 -1 -35 0 -37 C-1 -40 -1 -43 0 -46Z', '#B9FFF0', 1.4)
    + `<circle cx="-2" cy="-31" r="1.2" fill="${OL}"/><circle cx="2.5" cy="-31" r="1.2" fill="${OL}"/>`,
  bottle: shadow(18) + P('M-18 -6 C-18 -14 10 -16 14 -12 L22 -14 L24 -8 L16 -6 C10 -2 -18 2 -18 -6Z', '#7FB8A8') + P('M22 -14 L26 -15 L27 -9 L24 -8Z', '#8A5A30', 1.2)
    + `<path d="M-12 -10 C-4 -12 4 -12 10 -10" stroke="#FFF" stroke-opacity="0.6" stroke-width="1.6" fill="none"/>` + P('M-8 -9 h12 v-3 h-12Z', '#F2E6CC', 1),
  frozen: shadow(26) + P('M-24 0 L-22 -30 L-6 -40 L14 -38 L24 -26 L22 0Z', '#BFE4F2') + `<path d="M-22 -30 L-6 -40 L14 -38 L24 -26" fill="none" stroke="#FFF" stroke-width="2" opacity="0.7"/>`
    + P('M-10 -24 C-10 -32 4 -32 4 -24 C4 -18 -10 -18 -10 -24Z', '#E8B896', 1.4) + P('M-12 -18 h18 v14 h-18Z', '#6E4A28', 1.4) + P('M6 -14 h10 v12 h-10Z', '#8A5A34', 1.4) + `<path d="M-4 -26 h2 M0 -26 h2" stroke="${OL}" stroke-width="1.4"/>`,
  stones: shadow(32) + P('M-28 0 L-26 -26 L-18 -28 L-16 0Z', '#9A947E') + P('M-6 0 L-8 -44 L4 -48 L8 0Z', '#A6A08A') + P('M16 0 L16 -30 L26 -32 L28 0Z', '#9A947E')
    + `<path d="M-3 -38 l4 4 l-4 4 M-2 -24 h5 M-22 -18 l3 -3 M20 -20 h4" stroke="#7FF2FF" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  tracks: shadow(30) + [[-24, -2], [-10, -8], [4, -2], [18, -8]].map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="4" ry="5" fill="#3A2414" opacity="0.75"/><circle cx="-4" cy="-6" r="1.6" fill="#3A2414" opacity="0.75"/><circle cx="0" cy="-8" r="1.6" fill="#3A2414" opacity="0.75"/><circle cx="4" cy="-6" r="1.6" fill="#3A2414" opacity="0.75"/></g>`).join('')
    + P('M20 -30 L24 -44 L28 -30Z', '#8A6A3E', 1.4) + `<path d="M24 -30 V-16" stroke="${OL}" stroke-width="1.4"/>`,
  cart: shadow(30) + P('M-26 -12 L18 -12 L22 -26 L-24 -26Z', '#9A6A3E') + `<circle cx="-14" cy="-4" r="9" fill="none" stroke="${OL}" stroke-width="3.4"/><circle cx="-14" cy="-4" r="9" fill="none" stroke="#7A5232" stroke-width="1.8"/>`
    + `<ellipse cx="16" cy="-2" rx="4" ry="9" fill="none" stroke="${OL}" stroke-width="3" transform="rotate(70 16 -2)"/>` + P('M-20 -26 q4 -10 12 -8 q6 -4 10 2Z', '#E0C090', 1.4) + P('M22 -26 L34 -32', '#6E4A28', 3),
  mushrooms: shadow(24) + [[-14, 0, 1], [2, -2, 1.3], [16, 0, 0.9]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})"><circle cx="0" cy="-12" r="12" fill="#9CFFE6" opacity="0.25"/>${P('M-2 0 V-10 H2 V0Z', '#F2E6CC', 1.2)}${P('M-10 -9 C-10 -20 10 -20 10 -9Z', '#5EB8A8', 1.4)}<circle cx="-4" cy="-14" r="1.6" fill="#E6FFF6"/><circle cx="3" cy="-15" r="1.3" fill="#E6FFF6"/></g>`).join(''),
  spring: shadow(26) + P('M-26 0 L-22 -20 L-8 -28 L8 -26 L20 -16 L24 0Z', '#9A947E') + P('M-6 -18 C-8 -10 -10 -6 -12 0 L12 0 C8 -6 6 -12 6 -18Z', '#7EC4E8', 1.4)
    + `<path d="M-2 -16 V-4 M2 -14 V-2" stroke="#E6F6FF" stroke-width="1.4"/>` + `<ellipse cx="0" cy="2" rx="18" ry="4" fill="#7EC4E8" stroke="${OL}" stroke-width="1.4"/>`,
  stash: shadow(22) + P('M-16 0 C-16 -6 16 -6 16 0Z', '#8A6A4A') + P('M-10 -4 L-6 -24 L10 -24 L14 -4Z', '#9A947E') + `<path d="M-2 -20 L6 -10 M6 -20 L-2 -10" stroke="#8E2B23" stroke-width="2.6" stroke-linecap="round"/>`
    + P('M18 -2 L30 -26', '#7A5232', 2.6) + P('M24 -30 L34 -28 L30 -20Z', '#9AA1A8', 1.2),
  embervent: shadow(26) + P('M-24 0 L-16 -12 L-4 -10 L6 -16 L20 -8 L24 0Z', '#4A3430') + `<path d="M-14 -6 L-2 -8 L6 -12 L16 -6" stroke="#FF6A2A" stroke-width="2.4" fill="none"/>`
    + `<circle cx="0" cy="-20" r="14" fill="#FF8A3C" opacity="0.25"/>` + `<path d="M-4 -12 q-4 -8 0 -14 q4 -6 0 -12 M4 -14 q-3 -6 0 -10" stroke="#FFB23A" stroke-width="2" fill="none" opacity="0.8"/>`,
  crabpot: shadow(22) + P('M-16 0 L-14 -22 C-14 -28 14 -28 14 -22 L16 0Z', '#B89A6A') + `<path d="M-14 -16 H14 M-15 -8 H15 M-6 -26 V0 M6 -26 V0" stroke="#7A5A34" stroke-width="1.6"/>`
    + `<g transform="translate(20 -6) scale(0.5)">${P('M-12 0 C-14 -10 14 -10 12 0Z', '#C8502E', 2)}${C(-6, -10, 2, '#F6EBD0', 1)}${C(6, -10, 2, '#F6EBD0', 1)}</g>` + P('M-18 -24 C-20 -34 -10 -40 -6 -36', 'none', 1.6),
  nest: shadow(28) + P('M-28 0 L-24 -26 L-10 -38 L10 -36 L26 -20 L28 0Z', '#8A8676') + P('M-12 -38 C-16 -48 14 -50 12 -38 C8 -34 -8 -34 -12 -38Z', '#8A6A3E', 1.6)
    + `<path d="M-10 -42 L10 -40 M-8 -45 L8 -45" stroke="#5A3A22" stroke-width="1.4"/>` + C(-2, -46, 3, '#E2B84A', 1) + C(5, -44, 2.4, '#C9CED4', 1) + `<path d="M14 -52 q4 -4 8 0 q4 -4 8 0" stroke="${OL}" stroke-width="1.8" fill="none"/>`,
};

/** A discovery's icon as a complete SVG (80 × 70). */
export function discoverySvg(id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140" viewBox="-40 -60 80 70">${ART[id] ?? ART.campfire}</svg>`;
}
