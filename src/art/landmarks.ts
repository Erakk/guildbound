// Landmark pictures for the trip map: set pieces beside the trail (viewBox -80 -120 160 130, ground at y = 0).
// Bigger than discoveries, and not clickable: they are scenery the party walks past.

const OL = '#1B140E';
const P = (d: string, fill: string, w = 2.2) => `<path d="${d}" fill="${fill}" stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const C = (x: number, y: number, r: number, fill: string, w = 1.8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${OL}" stroke-width="${w}"/>`;
const L = (d: string, c: string, w: number) => `<path d="${d}" stroke="${OL}" stroke-width="${w + 2.6}" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const sh = (rx = 60) => `<ellipse cx="0" cy="2" rx="${rx}" ry="12" fill="#000" opacity="0.22"/>`;
const stone = '#A9A294';
const stoneD = '#8A8274';

const sheep = (x: number, y: number, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})">${P('M-10 -4 C-14 -14 -2 -18 6 -14 C14 -16 16 -6 10 -2 C4 2 -8 2 -10 -4Z', '#F2EEE4', 1.6)}${P('M8 -12 C12 -14 16 -12 15 -8 C14 -6 10 -6 8 -8Z', '#3A3430', 1.2)}<path d="M-6 -1v5M4 -1v5" stroke="${OL}" stroke-width="2"/></g>`;

const ART: Record<string, string> = {
  pasture: sh(70) + L('M-70 -4 H70 M-70 -16 H70', '#9A6A3E', 3) + [-64, -32, 0, 32, 64].map((x) => L(`M${x} 2 V-24`, '#8A5A30', 3.4)).join('') + sheep(-40, -30, 1.1) + sheep(-6, -40, 1) + sheep(26, -32, 1.15)
    + `<g transform="translate(52 -24)">${P('M-5 0 v-16 h10 v16Z', '#6E8A4A', 1.4)}${C(0, -21, 5, '#E8B896', 1.2)}${P('M-6 -25 h12 l-3 -5 h-6Z', '#B07A45', 1.2)}${L('M8 -2 V-34 q0 -6 5 -6', '#7A5232', 2)}</g>`,
  mill: sh(56) + P('M-40 0 V-62 H30 V0Z', '#D4CAAF') + P('M-46 -60 L-5 -96 L36 -60Z', '#8A6038') + `<path d="M-40 -30 H30 M-40 -46 H30" stroke="#8A8274" stroke-width="1.4" opacity="0.6"/>` + P('M-14 0 V-24 A8 8 0 0 1 2 -24 V0Z', '#5A3A22')
    + P('M8 -52 h12 v12 h-12Z', '#333A48', 1.6) + C(42, -30, 26, 'none', 4) + `<path d="M42 -56 V-4 M16 -30 H68 M24 -48 L60 -12 M60 -48 L24 -12" stroke="#7A5232" stroke-width="3"/>` + C(42, -30, 5, '#5A3A22') + P('M14 -56 L24 -54 L22 -50Z', '#E9DCBD', 1),
  oak: sh(70) + P('M-10 0 C-8 -20 -12 -40 -6 -56 L8 -56 C12 -40 8 -20 12 0Z', '#6E4A28') + P('M-60 -60 C-74 -80 -52 -112 -24 -106 C-14 -124 22 -124 32 -106 C60 -112 76 -80 60 -60 C54 -44 -54 -44 -60 -60Z', '#4F8A3A')
    + `<path d="M-30 -92 C-20 -100 -6 -100 4 -94 M14 -88 C24 -96 38 -94 46 -84" stroke="#86B85E" stroke-width="5" fill="none" stroke-linecap="round"/>` + `<path d="M-2 -56 L-10 -78 M4 -56 L14 -80" stroke="#5A3A22" stroke-width="4"/>` + P('M-4 -28 C-4 -36 6 -36 6 -28 C6 -22 -4 -22 -4 -28Z', '#3A2414', 1.4),
  bones: sh(72) + [-50, -30, -10, 10, 30].map((x, i) => L(`M${x} 0 C${x - 6} -${30 + i * 4} ${x + 16} -${46 + i * 4} ${x + 22} -${30 + i * 2}`, '#EEE8DA', 5)).join('')
    + L('M-60 -6 C-30 -16 20 -16 54 -8', '#EEE8DA', 6) + P('M48 -8 C56 -26 78 -24 80 -10 C78 0 58 2 48 -8Z', '#EEE8DA') + `<circle cx="66" cy="-14" r="4" fill="${OL}"/>`,
  dam: sh(74) + `<path d="M-80 -4 C-40 -14 40 -14 80 -4 V8 H-80Z" fill="#5E94AA" opacity="0.7"/>` + [...Array(9)].map((_, i) => L(`M${-56 + i * 14} 2 L${-50 + i * 14} -${18 + (i % 3) * 6}`, '#8A5A30', 4)).join('')
    + P('M-60 -6 C-30 -26 30 -26 60 -6Z', '#7A5232', 2) + `<path d="M-40 -14 h20 M-6 -18 h22 M24 -14 h18" stroke="#5A3A22" stroke-width="2"/>` + `<g transform="translate(46 -26)">${P('M-8 0 C-10 -8 6 -12 10 -4 C12 2 -4 4 -8 0Z', '#8A5A34', 1.4)}${P('M-8 -2 C-16 0 -18 4 -14 6 C-10 6 -8 2 -8 -2Z', '#5A3A22', 1.2)}</g>`,
  tower: sh(48) + P('M-28 0 V-90 L-20 -96 L-12 -90 L-4 -98 L6 -90 L14 -96 L24 -90 V0Z', '#C9BE9E') + `<path d="M6 -90 V0" stroke="${stoneD}" stroke-width="10" opacity="0.4"/>` + `<path d="M-28 -60 H24 M-28 -30 H24" stroke="${stoneD}" stroke-width="1.4" opacity="0.6"/>`
    + P('M-10 0 V-18 A7 7 0 0 1 4 -18 V0Z', '#2A1E14') + P('M-6 -62 h8 v12 h-8Z', '#2A1E14', 1.4) + P('M24 -40 L40 -30 L38 -20 L24 -26Z', '#B4A988', 1.6) + P('M28 0 L36 -8 L46 -4 L44 0Z', '#B4A988', 1.6),
  lavafall: sh(70) + P('M-70 0 L-60 -86 L-30 -100 L30 -100 L62 -84 L70 0Z', '#3E3434') + P('M-14 -98 C-18 -60 -24 -30 -30 0 L28 0 C20 -30 16 -60 12 -98Z', '#FF6A2A', 2)
    + `<path d="M-6 -96 C-8 -60 -12 -30 -16 0 M4 -96 C4 -60 6 -30 10 0" stroke="#FFD27A" stroke-width="3" fill="none" opacity="0.9"/>` + `<ellipse cx="0" cy="0" rx="40" ry="8" fill="#FF9A3C" stroke="${OL}" stroke-width="2"/><circle cx="0" cy="-50" r="60" fill="#FF8A3C" opacity="0.15"/>`,
  mine: sh(64) + P('M-64 0 L-52 -60 L-20 -84 L24 -80 L56 -56 L64 0Z', '#8A8676') + P('M-24 0 V-44 C-24 -60 24 -60 24 -44 V0Z', '#1E1810') + L('M-26 0 V-46 M26 0 V-46 M-30 -48 H30', '#7A5232', 5)
    + `<path d="M-60 0 L-30 0" stroke="#4A4E56" stroke-width="3"/>` + `<g transform="translate(-44 -6)">${P('M-14 0 L-12 -14 H12 L14 0Z', '#6A7078', 1.6)}${C(-8, 2, 4, '#3A3D44', 1.2)}${C(8, 2, 4, '#3A3D44', 1.2)}${P('M-10 -14 C-6 -22 6 -22 10 -14Z', '#C98A4A', 1.2)}</g>`,
  runestone: sh(36) + P('M-20 0 L-24 -70 C-20 -92 20 -92 24 -70 L20 0Z', stone) + `<path d="M-24 -70 C-20 -92 20 -92 24 -70" fill="none" stroke="#C9C2B0" stroke-width="2"/>`
    + `<path d="M-8 -66 L0 -74 L8 -66 L0 -58Z M-6 -44 H6 M0 -50 V-32 M-8 -22 L8 -14 M8 -22 L-8 -14" stroke="#7FF2FF" stroke-width="2.4" fill="none" stroke-linecap="round"/>` + `<circle cx="0" cy="-48" r="28" fill="#7FF2FF" opacity="0.12"/>`,
  waterfall: sh(66) + P('M-66 0 L-56 -92 L-20 -104 L24 -104 L58 -90 L66 0Z', '#9AA6B4') + P('M-22 -100 C-24 -64 -26 -30 -30 0 L28 0 C24 -30 22 -64 20 -100Z', '#D8F0FA', 2)
    + `<path d="M-12 -96 V-6 M-2 -98 V-4 M8 -96 V-6" stroke="#FFF" stroke-width="3" opacity="0.8"/>` + `<path d="M-30 -20 l-4 10 M28 -24 l4 12 M-18 -60 l-3 8" stroke="#BFE4F2" stroke-width="3"/>` + `<ellipse cx="0" cy="2" rx="40" ry="8" fill="#E8F6FC" stroke="${OL}" stroke-width="2"/>`,
  wreck: sh(76) + P('M-74 -6 C-60 -30 40 -34 70 -22 L60 0 L-64 4Z', '#7A5232') + `<path d="M-64 -14 C-30 -24 30 -26 62 -18 M-58 -6 C-20 -14 30 -14 58 -8" stroke="#5A3A22" stroke-width="2" fill="none"/>`
    + L('M-10 -26 L-18 -96', '#6E4A28', 4) + P('M-16 -90 L22 -78 L-12 -50Z', '#E9DCBD', 1.8) + `<path d="M-6 -80 L10 -76" stroke="#8E2B23" stroke-width="2"/>` + P('M40 -30 L54 -50 L58 -46 L46 -28Z', '#6E4A28', 1.6) + `<path d="M-50 -10 h8 M20 -16 h10" stroke="#2A1E14" stroke-width="5"/>`,
  stones: sh(76) + [[-56, 0, 34], [-26, -4, 50], [8, -6, 58], [40, -2, 44], [64, 0, 30]].map(([x, y, h], i) => P(`M${x - 9} ${y} L${x - 10} ${y - h} L${x - 2} ${y - h - 6} L${x + 9} ${y - h + 2} L${x + 10} ${y}Z`, i % 2 ? stone : '#9A947E')).join('')
    + `<path d="M6 -50 l6 6 l-6 6 M-28 -36 h6 M38 -30 l4 -4" stroke="#B9FFF0" stroke-width="2" fill="none"/>` + `<ellipse cx="0" cy="-30" rx="70" ry="24" fill="#B9FFF0" opacity="0.08"/>`,
  bell: sh(50) + P('M-24 0 L-30 -86 L22 -96 L26 0Z', '#B9B4A8') + `<g transform="rotate(-8 0 -60)"><path d="M-28 -88 L0 -118 L28 -98Z" fill="#4C566A" stroke="${OL}" stroke-width="2.2"/></g>` + P('M-14 -84 h22 v24 h-22Z', '#2A1E14', 1.6)
    + P('M-8 -64 C-8 -78 4 -78 4 -64 L6 -60 H-10Z', '#C9A24A', 1.6) + `<path d="M-30 0 C-20 -8 20 -8 34 0" stroke="#4E86A8" stroke-width="6" opacity="0.7"/>` + `<path d="M-24 -40 H24 M-26 -20 H24" stroke="#8A8274" stroke-width="1.4" opacity="0.6"/>`,
  cairn: sh(44) + [[0, -8, 40, 16], [-4, -24, 34, 15], [3, -38, 28, 13], [-2, -51, 22, 12], [1, -63, 16, 10], [0, -73, 10, 8]].map(([x, y, w, h]) => `<ellipse cx="${x}" cy="${y}" rx="${w / 2 + 6}" ry="${h / 2 + 2}" fill="${stone}" stroke="${OL}" stroke-width="2"/>`).join('')
    + `<path d="M-2 -86 v-20 M-10 -100 h16" stroke="#7A5232" stroke-width="3"/>`,
  pool: sh(70) + `<ellipse cx="0" cy="-6" rx="66" ry="20" fill="#2E2848" stroke="${OL}" stroke-width="2.4"/><ellipse cx="0" cy="-6" rx="56" ry="14" fill="#5E4E8C"/>` + C(12, -10, 8, '#F6F0DC', 1.2) + `<circle cx="12" cy="-10" r="20" fill="#E8E4FF" opacity="0.25"/>`
    + [-56, -40, 44, 58].map((x) => L(`M${x} -6 V-30`, '#5E7A68', 2)).join('') + `<path d="M-30 -8 q8 -3 16 0 M20 -2 q8 -3 16 0" stroke="#B9B0E0" stroke-width="1.4" fill="none"/>`,
  totem: sh(34) + L('M0 2 V-92', '#7A5232', 9) + C(0, -88, 12, '#EEE8DA') + `<ellipse cx="-4" cy="-90" rx="3" ry="4" fill="${OL}"/><ellipse cx="5" cy="-90" rx="3" ry="4" fill="${OL}"/>` + P('M-16 -60 h32 v14 h-32Z', '#8E2B23', 1.6)
    + C(-10, -40, 7, '#EEE8DA', 1.4) + C(10, -40, 7, '#EEE8DA', 1.4) + P('M-6 -100 L-14 -118 L-2 -104Z M6 -100 L14 -118 L2 -104Z', '#D84A3A', 1.2) + `<path d="M-20 -60 l-8 14 M20 -60 l8 14" stroke="#E2B84A" stroke-width="3"/>`,
  floatrock: `<ellipse cx="0" cy="2" rx="50" ry="10" fill="#000" opacity="0.12"/>` + [[-40, -50, 1], [10, -90, 1.3], [44, -40, 0.8]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k})">${P('M-24 0 C-26 -14 -10 -20 0 -18 C14 -20 26 -12 24 0 C16 14 6 22 0 26 C-8 20 -18 12 -24 0Z', '#A6A08A')}${P('M-24 0 C-14 -6 14 -6 24 0', '#7FA35A', 3)}<path d="M-10 8 q-2 10 2 18 M8 6 q4 8 0 16" stroke="#5E7A3A" stroke-width="2" fill="none"/></g>`).join('')
    + `<path d="M-20 -80 l2 -4 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2z" fill="#FFF3A0"/>`,
  door: sh(66) + P('M-66 0 L-56 -84 L-20 -104 L30 -100 L60 -76 L66 0Z', '#7E7A6C') + P('M-30 0 V-56 C-30 -86 30 -86 30 -56 V0Z', '#5E5A4E', 2.4) + P('M-22 0 V-54 C-22 -76 22 -76 22 -54 V0Z', '#4A4E56', 2)
    + `<path d="M0 -76 V0" stroke="${OL}" stroke-width="2"/>` + `<path d="M-14 -50 l6 -6 l6 6 M6 -40 h10 M-12 -28 l8 8" stroke="#7FD9E6" stroke-width="2" fill="none"/>` + P('M6 -30 L30 -60 L36 -54 L14 -26Z', '#2A2620', 1.4),
  arch: sh(70) + P('M-66 0 C-70 -60 -40 -110 0 -110 C40 -110 70 -60 66 0 L40 0 C42 -50 22 -84 0 -84 C-22 -84 -42 -50 -40 0Z', '#BFE4F2') + `<path d="M-56 -40 C-50 -80 -20 -100 0 -100 M30 -94 C50 -80 58 -50 56 -20" stroke="#FFF" stroke-width="3" fill="none" opacity="0.8"/>`
    + `<path d="M-44 -86 l-3 10 M42 -80 l4 10 M-10 -108 v8" stroke="#8AC4DA" stroke-width="3"/>`,
  pillar: sh(30) + P('M-16 0 L-14 -100 L14 -100 L16 0Z', '#5E5A66') + `<path d="M-14 -100 L14 -100" stroke="#B9FFF0" stroke-width="3"/>` + `<path d="M0 -100 L-8 -80 L6 -70 L-6 -50 L8 -38" stroke="#FFF3A0" stroke-width="2.4" fill="none"/>`
    + `<circle cx="0" cy="-100" r="24" fill="#FFF3A0" opacity="0.2"/>` + `<path d="M-22 -110 l6 4 M20 -112 l-6 6" stroke="#FFF3A0" stroke-width="2"/>`,
  statue: sh(52) + P('M-30 0 h60 v-12 h-60Z', stone) + P('M-12 -12 v-34 h24 v34Z', '#9AA6A0') + P('M-16 -46 l4 -30 h24 l4 30Z', '#A6B0AA') + C(0, -84, 9, '#A6B0AA') + P('M-10 -92 h20 l-2 -6 l-4 4 l-4 -6 l-4 6 l-4 -4Z', '#C9A24A', 1.4)
    + L('M14 -70 L32 -100', '#B9C4BE', 3) + `<path d="M-16 -70 c-8 6 -10 16 -8 26" stroke="#9AA6A0" stroke-width="6" fill="none"/>`,
  lighthouse: sh(46) + P('M-22 0 L-14 -100 H14 L22 0Z', '#F2E6CC') + `<path d="M-20 -24 H20 M-17 -56 H17" stroke="#C8423A" stroke-width="12"/>` + P('M-18 -100 h36 v-8 h-36Z', '#4A4E56', 1.6) + P('M-12 -108 h24 v-18 h-24Z', '#FFE29A', 1.6)
    + P('M-16 -126 L0 -138 L16 -126Z', '#C8423A') + `<path d="M12 -116 L70 -130 M12 -114 L70 -100" stroke="#FFF3A0" stroke-width="4" opacity="0.5"/>` + P('M-40 4 C-30 -8 30 -8 40 4Z', '#8A8274'),
  hut: sh(46) + [-14, 14].map((x) => L(`M${x} 2 L${x} -22 M${x} 2 l-6 4 M${x} 2 l6 4`, '#E2B84A', 3)).join('') + P('M-30 -20 V-60 H30 V-20Z', '#8A6A44') + P('M-38 -58 L0 -92 L38 -58Z', '#5E7A3A')
    + P('M-10 -20 V-40 H6 V-20Z', '#3A2414', 1.6) + P('M12 -50 h10 v8 h-10Z', '#FFC86B', 1.4) + `<path d="M22 -82 q6 -8 0 -16 q-6 -8 2 -14" stroke="#B9FFF0" stroke-width="3" fill="none" opacity="0.6"/>`,
  troll: sh(76) + `<ellipse cx="0" cy="-6" rx="74" ry="12" fill="#5E4A2E" opacity="0.6"/>` + P('M-64 -6 C-66 -40 -20 -56 20 -52 C56 -50 72 -30 66 -6Z', '#6E7E52') + P('M30 -46 C34 -64 62 -66 70 -48 C72 -38 62 -32 50 -34Z', '#6E7E52')
    + `<path d="M50 -50 q4 4 8 0 M60 -50 q4 4 8 0" stroke="${OL}" stroke-width="2" fill="none"/>` + P('M-40 -46 C-36 -56 -20 -58 -12 -52', '#4E7A34', 3) + `<text x="20" y="-78" font-family="Cinzel, serif" font-weight="700" font-size="16" fill="#F2E6CC" stroke="${OL}" stroke-width="0.6">z Z z</text>`,
  milestone: sh(26) + P('M-14 0 V-46 C-14 -62 14 -62 14 -46 V0Z', stone) + `<path d="M-8 -40 h16 M-8 -32 h12 M-8 -24 h14" stroke="#5A4A38" stroke-width="2"/>` + `<path d="M-6 -14 l4 4 l6 -8" stroke="#C8423A" stroke-width="2" fill="none"/>` + `<path d="M-20 0 q4 -10 8 0 M12 0 q4 -8 8 0" stroke="#5E7A3A" stroke-width="2" fill="none"/>`,
  pot: sh(50) + [-26, 0, 26].map((x) => L(`M${x} 4 L${x * 0.6} -18`, '#3A2A20', 3)).join('') + P('M-44 -20 C-48 -60 48 -60 44 -20 C40 -4 -40 -4 -44 -20Z', '#3A3D44') + `<ellipse cx="0" cy="-48" rx="40" ry="10" fill="#6E8A4A" stroke="${OL}" stroke-width="2"/>`
    + C(-12, -50, 4, '#E2B84A', 1) + C(10, -48, 3, '#C9CED4', 1) + `<path d="M-30 -10 C-20 -16 -10 -6 0 -12" stroke="#FF8A3C" stroke-width="3" opacity="0.6"/>`,
  nest: sh(60) + P('M-56 -10 C-60 -36 60 -36 56 -10 C50 4 -50 4 -56 -10Z', '#7A5232') + `<path d="M-50 -18 C-20 -30 20 -30 50 -18 M-46 -10 C-20 -20 20 -20 46 -10" stroke="#5A3A22" stroke-width="2.4" fill="none"/>`
    + [[-24, -30], [0, -34], [24, -30]].map(([x, y]) => P(`M${x - 11} ${y} C${x - 12} ${y - 20} ${x + 12} ${y - 20} ${x + 11} ${y} L${x + 6} ${y - 6} L${x} ${y} L${x - 6} ${y - 6}Z`, '#E6DCC4', 1.6)).join('') + C(-8, -24, 4, '#E2B84A', 1) + C(14, -22, 3, '#E2B84A', 1),
  altar: sh(52) + P('M-40 0 V-24 H40 V0Z', '#4A3430') + P('M-46 -24 H46 V-32 H-46Z', '#3A2A26') + `<path d="M-30 -12 l10 -6 l10 6 M10 -12 l10 -6 l10 6" stroke="#8E2B23" stroke-width="2" fill="none"/>`
    + `<path d="M-6 -32 q-4 -10 2 -16 q6 -8 0 -14" stroke="#8A8274" stroke-width="3" fill="none" opacity="0.7"/>` + C(-30, -36, 4, '#2A1E14', 1) + C(30, -36, 4, '#2A1E14', 1),
};

/** A landmark's picture as a complete SVG (160 × 130 units, drawn at 2×). */
export function landmarkSvg(art: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="300" viewBox="-80 -140 160 150">${ART[art] ?? ART.cairn}</svg>`;
}
