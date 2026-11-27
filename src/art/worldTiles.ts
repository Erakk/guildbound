// Painted hex tiles for the world map, ported from the concept-art canvas.
// Each tile is a <g id="t-<key>"> drawn around (0, 0) with a hex radius of 66.

export const WORLD_DEFS = `<radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="0.6" stop-color="#8A6430" stop-opacity="0"/><stop offset="1" stop-color="#6E4A20" stop-opacity="0.55"/></radialGradient>
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.09"/></feComponentTransfer></filter>
<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
<linearGradient id="gPlains" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9CB7C"/><stop offset="1" stop-color="#7C984C"/></linearGradient>
<linearGradient id="gForest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E8044"/><stop offset="1" stop-color="#34502C"/></linearGradient>
<linearGradient id="gMtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9AE92"/><stop offset="1" stop-color="#7A6E58"/></linearGradient>
<linearGradient id="gMarsh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#85A07E"/><stop offset="1" stop-color="#52695A"/></linearGradient>
<linearGradient id="gWater" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FB9C4"/><stop offset="1" stop-color="#4E7F8E"/></linearGradient>
<linearGradient id="gSea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6E9CB6"/><stop offset="1" stop-color="#2E5A78"/></linearGradient>
<linearGradient id="gDeep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3F6E8A"/><stop offset="1" stop-color="#1E3E58"/></linearGradient>
<linearGradient id="gBad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C48058"/><stop offset="1" stop-color="#743A28"/></linearGradient>
<linearGradient id="gHaunt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#77709A"/><stop offset="1" stop-color="#3B3656"/></linearGradient>
<linearGradient id="gBarrow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A7AA86"/><stop offset="1" stop-color="#6C7056"/></linearGradient>
<linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF3F8"/><stop offset="1" stop-color="#A6C8DE"/></linearGradient>
<linearGradient id="gDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E4A44"/><stop offset="1" stop-color="#241A1A"/></linearGradient>
<linearGradient id="gSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F7F9"/><stop offset="1" stop-color="#C3D2DA"/></linearGradient>
<linearGradient id="gIce" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8F4FA"/><stop offset="1" stop-color="#8DB8D0"/></linearGradient>
<linearGradient id="gHills" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A3B86C"/><stop offset="1" stop-color="#667E40"/></linearGradient>
<radialGradient id="gLava" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD27A"/><stop offset="0.5" stop-color="#F0703A"/><stop offset="1" stop-color="#F0703A" stop-opacity="0"/></radialGradient>
<radialGradient id="gWisp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#C8FFF0"/><stop offset="1" stop-color="#7FF2C9" stop-opacity="0"/></radialGradient>

<clipPath id="hc"><path d="M0 -66L57.2 -33V33L0 66L-57.2 33V-33Z"/></clipPath>
<path id="hx" d="M0 -66L57.2 -33V33L0 66L-57.2 33V-33Z"/>
<path id="mhx" d="M0 -22L19 -11V11L0 22L-19 11V-11Z"/>

<g id="tr"><ellipse cx="3" cy="9" rx="10" ry="3.5" fill="#1E2A15" opacity="0.35"/><rect x="-1.5" y="3" width="3" height="6" fill="#4A3020"/><circle r="9.5" fill="#3E5C2E"/><circle cx="-3" cy="-3" r="6" fill="#5C8040"/><circle cx="2" cy="-5" r="3.2" fill="#86AA60"/></g>
<g id="pn"><ellipse cx="2" cy="8" rx="8" ry="3" fill="#2A3A40" opacity="0.3"/><rect x="-1.5" y="4" width="3" height="5" fill="#4A3020"/><path d="M0 -16L9 5H-9Z" fill="#2F4A3A"/><path d="M0 -16L9 5H2Z" fill="#203528"/><path d="M0 -16L4.5 -6L0 -8L-4.5 -6Z" fill="#F7FAFB"/><path d="M-6 -2L6 -2" stroke="#F7FAFB" stroke-width="1.5"/></g>
<g id="mt"><path d="M-26 14L0 -24L26 14Z" fill="#AA9C7E"/><path d="M0 -24L26 14H6Z" fill="#776A52"/><path d="M0 -24L-9 -11L-3 -13L2 -8L8 -12Z" fill="#F7F5F0"/><path d="M-26 14L0 -24L26 14" fill="none" stroke="#4E4232" stroke-width="1.2" stroke-linejoin="round"/></g>
<g id="rd" stroke="#4E6B5A" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M0 0V-11M4 0V-8M-4 0V-9"/></g>
<g id="dt" stroke="#2E2840" stroke-width="2" stroke-linecap="round" fill="none"><path d="M0 0V-20M0 -11L-7 -17M0 -15L6 -21M-7 -17L-9 -22"/></g>
<path id="md" d="M-14 0Q0 -15 14 0Z" fill="#B9AE8C" stroke="#5E5440" stroke-width="1.2"/>

<g id="t-plains"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gPlains)"/>
<ellipse cx="-18" cy="-18" rx="40" ry="18" fill="#D0DD94" opacity="0.5"/>
<path d="M-70 26C-30 12 10 34 70 6" stroke="#DCC690" stroke-width="7" fill="none"/>
<path d="M-70 26C-30 12 10 34 70 6" stroke="#B89F68" stroke-width="1.2" stroke-dasharray="3 6" fill="none"/>
<g stroke="#5E7A3A" stroke-width="1.6" stroke-linecap="round"><path d="M-36 -6l2 -6 2 6M18 -26l2 -6 2 6M30 32l2 -6 2 6M-14 44l2 -6 2 6M40 -2l2 -6 2 6M-46 10l2 -6 2 6"/></g>
<circle cx="-24" cy="4" r="2" fill="#F2E27A"/><circle cx="-18" cy="10" r="2" fill="#FFFFFF"/><circle cx="26" cy="-12" r="2" fill="#E98AB8"/><circle cx="8" cy="48" r="2" fill="#F2E27A"/><circle cx="-40" cy="34" r="2" fill="#FFFFFF"/>
<use href="#tr" x="-34" y="-36"/><use href="#tr" x="40" y="-30"/><use href="#tr" x="-44" y="-22"/>
<g transform="translate(12 -2)"><path d="M-10 0V-10H10V0Z" fill="#E9DAB8" stroke="#4A3020" stroke-width="1.2"/><path d="M-13 -9L0 -21L13 -9Z" fill="#A84A30" stroke="#4A3020" stroke-width="1.2"/><rect x="-2" y="-6" width="4" height="6" fill="#4A3020"/><rect x="4" y="-8" width="3" height="3" fill="#F6D27A"/></g>
</g></g>

<g id="t-farm"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="#9AAF5E"/>
<g transform="rotate(-18)" stroke="#8A7840" stroke-width="0.8">
<rect x="-64" y="-46" width="52" height="36" fill="#D9B95A"/><rect x="-8" y="-46" width="48" height="36" fill="#9CB25E"/><rect x="44" y="-46" width="30" height="36" fill="#C9C46A"/>
<rect x="-64" y="-6" width="46" height="36" fill="#B9C46E"/><rect x="-14" y="-6" width="54" height="36" fill="#E2C66E"/><rect x="44" y="-6" width="30" height="36" fill="#8FA656"/>
<rect x="-54" y="34" width="60" height="32" fill="#A7BA62"/><rect x="10" y="34" width="50" height="32" fill="#D6B456"/>
</g>
<g transform="rotate(-18)" stroke="#7A6A34" stroke-width="0.8" opacity="0.45"><path d="M-60 -40H-16M-60 -32H-16M-60 -24H-16M-60 -16H-16M-10 0H36M-10 8H36M-10 16H36M-10 24H36M14 40H56M14 48H56M14 56H56"/></g>
<path d="M-70 52C-20 30 20 40 70 -10" stroke="#DCC690" stroke-width="6" fill="none"/>
<g transform="translate(22 -14)"><ellipse cx="2" cy="11" rx="10" ry="3" fill="#3A2A18" opacity="0.3"/><path d="M-6 10L-4 -14H4L6 10Z" fill="#EDE2C8" stroke="#4A3020" stroke-width="1.2"/><path d="M-6 -14L0 -23L6 -14Z" fill="#8E3A2A" stroke="#4A3020" stroke-width="1.2"/><rect x="-1.5" y="2" width="3" height="8" fill="#4A3020"/>
<g transform="rotate(20 0 -17)"><path d="M0 -17L-16 -33" stroke="#5A3A22" stroke-width="2"/><path d="M0 -17L16 -1" stroke="#5A3A22" stroke-width="2"/><path d="M0 -17L16 -33" stroke="#5A3A22" stroke-width="2"/><path d="M0 -17L-16 -1" stroke="#5A3A22" stroke-width="2"/><path d="M-4 -21L-14 -31L-10 -35L0 -25Z M4 -13L14 -3L10 1L0 -9Z M4 -21L14 -31L18 -27L8 -17Z M-4 -13L-14 -3L-18 -7L-8 -17Z" fill="#F3EAD6" stroke="#6A5030" stroke-width="0.8"/></g>
<circle cy="-17" r="2" fill="#3A2A18"/></g>
</g></g>

<g id="t-forest"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gForest)"/>
<path d="M-60 40C-30 20 -10 30 10 10C24 -4 40 -2 60 -16" stroke="#7E9A54" stroke-width="8" fill="none" opacity="0.7"/>
<use href="#tr" x="-40" y="-44"/><use href="#tr" x="-18" y="-52"/><use href="#tr" x="6" y="-46"/><use href="#tr" x="30" y="-40"/><use href="#tr" x="-48" y="-20"/><use href="#tr" x="-26" y="-26"/><use href="#tr" x="20" y="-18"/><use href="#tr" x="44" y="-14"/><use href="#tr" x="-38" y="6"/><use href="#tr" x="-14" y="0"/><use href="#tr" x="34" y="12"/><use href="#tr" x="-46" y="30"/><use href="#tr" x="-20" y="26"/><use href="#tr" x="6" y="30"/><use href="#tr" x="30" y="38"/><use href="#tr" x="-30" y="50"/><use href="#tr" x="-4" y="54"/><use href="#tr" x="18" y="58"/><use href="#tr" x="48" y="-36"/>
</g></g>

<g id="t-snowforest"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gSnow)"/>
<path d="M-70 0C-30 -10 10 20 70 4" stroke="#B4C6D2" stroke-width="10" fill="none" opacity="0.6"/>
<use href="#pn" x="-38" y="-40"/><use href="#pn" x="-14" y="-48"/><use href="#pn" x="12" y="-42"/><use href="#pn" x="36" y="-34"/><use href="#pn" x="-46" y="-12"/><use href="#pn" x="-22" y="-18"/><use href="#pn" x="40" y="-6"/><use href="#pn" x="-30" y="22"/><use href="#pn" x="18" y="22"/><use href="#pn" x="-6" y="40"/><use href="#pn" x="34" y="44"/><use href="#pn" x="-40" y="46"/>
<g fill="#FFFFFF" opacity="0.9"><circle cx="-10" cy="-10" r="1.4"/><circle cx="22" cy="-22" r="1.2"/><circle cx="6" cy="8" r="1.3"/><circle cx="-30" cy="0" r="1.2"/></g>
</g></g>

<g id="t-mtn"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gMtn)"/>
<use href="#mt" x="-26" y="-14" transform="scale(1)"/><use href="#mt" x="24" y="-22"/><use href="#mt" x="0" y="14"/><use href="#mt" x="-40" y="30"/><use href="#mt" x="42" y="24"/>
<g transform="translate(-2 -40) scale(1.3)"><use href="#mt"/></g>
</g></g>

<g id="t-mine"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gMtn)"/>
<use href="#mt" x="-24" y="-28"/><use href="#mt" x="26" y="-30"/><use href="#mt" x="40" y="10"/>
<rect x="-70" y="10" width="140" height="60" fill="#9C9478"/>
<path d="M-16 18A14 14 0 0 1 12 18V30H-16Z" fill="#2A1E14" stroke="#5A3A22" stroke-width="3"/>
<path d="M-16 18V30M12 18V30M-18 16H14" stroke="#7A5634" stroke-width="3"/>
<g stroke="#5A4632" stroke-width="1.5"><path d="M-2 30L-40 60M8 30L-26 64"/><path d="M-12 40l8 2M-20 48l9 2M-28 56l10 2"/></g>
<g transform="translate(-30 54)"><rect x="-8" y="-6" width="16" height="8" fill="#6A4A2E" stroke="#3A2414" stroke-width="1.2"/><circle cx="-4" cy="3" r="2.5" fill="#3A2414"/><circle cx="4" cy="3" r="2.5" fill="#3A2414"/><circle cx="-2" cy="-7" r="3" fill="#8A8E94"/><circle cx="3" cy="-8" r="2.5" fill="#C9A24A"/></g>
</g></g>

<g id="t-marsh"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gMarsh)"/>
<ellipse cx="-20" cy="-20" rx="26" ry="11" fill="url(#gWater)"/><ellipse cx="22" cy="6" rx="22" ry="9" fill="url(#gWater)"/><ellipse cx="-14" cy="34" rx="28" ry="10" fill="url(#gWater)"/><ellipse cx="32" cy="-34" rx="14" ry="6" fill="url(#gWater)"/>
<g fill="none" stroke="#D8EEF2" stroke-width="1.2" opacity="0.8"><path d="M-30 -22q5 -3 10 0"/><path d="M16 5q5 -3 10 0"/><path d="M-24 33q5 -3 10 0"/></g>
<g fill="#5E8A4A"><ellipse cx="-12" cy="-18" rx="3.5" ry="2"/><ellipse cx="26" cy="9" rx="3" ry="1.8"/><ellipse cx="-4" cy="36" rx="3.5" ry="2"/></g>
<use href="#rd" x="-46" y="-8"/><use href="#rd" x="-38" y="0"/><use href="#rd" x="4" y="-24"/><use href="#rd" x="44" y="22"/><use href="#rd" x="-40" y="50"/><use href="#rd" x="14" y="48"/><use href="#rd" x="40" y="-14"/><use href="#rd" x="-2" y="16"/>
<g><use href="#dt" x="38" y="44" transform="scale(1)"/></g>
<circle cx="-30" cy="-44" r="6" fill="url(#gWisp)"/>
</g></g>

<g id="t-coast"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gPlains)"/>
<path d="M-70 -70H-6C-16 -40 4 -16 -10 10C-22 34 -6 52 -16 70H-70Z" fill="url(#gSea)"/>
<path d="M-6 -70C-16 -40 4 -16 -10 10C-22 34 -6 52 -16 70" stroke="#E8D7A8" stroke-width="9" fill="none"/>
<path d="M-12 -70C-22 -40 -2 -16 -16 10C-28 34 -12 52 -22 70" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.7"/>
<g stroke="#BFD9E4" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M-54 -40q5 -4 10 0t10 0"/><path d="M-60 0q5 -4 10 0t10 0"/><path d="M-50 40q5 -4 10 0t10 0"/></g>
<g transform="translate(-40 -14)"><path d="M-9 0H9L6 5H-6Z" fill="#7A5232" stroke="#3A2414" stroke-width="1"/><path d="M0 0V-14" stroke="#3A2414" stroke-width="1.2"/><path d="M0 -14L9 -3H0Z" fill="#F3EAD6"/></g>
<use href="#tr" x="30" y="-30"/><use href="#tr" x="40" y="10"/><use href="#tr" x="22" y="40"/>
<g transform="translate(16 -6)"><path d="M-8 0V-9H8V0Z" fill="#E9DAB8" stroke="#4A3020" stroke-width="1.1"/><path d="M-10 -8L0 -17L10 -8Z" fill="#5E7F92" stroke="#4A3020" stroke-width="1.1"/></g>
</g></g>

<g id="t-sea"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gSea)"/>
<g stroke="#BFD9E4" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.85"><path d="M-46 -30q5 -4 10 0t10 0"/><path d="M14 -44q5 -4 10 0t10 0"/><path d="M20 30q5 -4 10 0t10 0"/><path d="M-50 40q5 -4 10 0t10 0"/></g>
<path d="M-26 -10c8 -12 30 -12 34 2c4 12 -10 20 -22 18c-12 -2 -18 -10 -12 -20Z" fill="#E6D2A0" stroke="#A88A52" stroke-width="1.2"/>
<path d="M-20 -8c6 -8 22 -8 25 2c2 8 -8 13 -16 11c-8 -1 -13 -7 -9 -13Z" fill="#8EAE5C"/>
<use href="#tr" x="-8" y="-6"/>
<path d="M22 14c6 -8 20 -8 22 2c2 8 -8 12 -14 11c-8 -1 -12 -6 -8 -13Z" fill="#E6D2A0" stroke="#A88A52" stroke-width="1.2"/>
<path d="M30 12l5 5m0 -5l-5 5" stroke="#8E2B23" stroke-width="2" stroke-linecap="round"/>
<path d="M-40 18c4 -5 12 -5 13 1c1 5 -5 7 -9 6c-4 -1 -6 -4 -4 -7Z" fill="#E6D2A0" stroke="#A88A52" stroke-width="1"/>
<g fill="#FFFFFF" opacity="0.6"><circle cx="4" cy="-30" r="1.2"/><circle cx="-10" cy="36" r="1.2"/></g>
</g></g>

<g id="t-reef"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gDeep)"/>
<g fill="#4E8C8A" opacity="0.7"><ellipse cx="-20" cy="20" rx="26" ry="10"/><ellipse cx="24" cy="-16" rx="22" ry="8"/></g>
<g stroke="#9FD0D2" stroke-width="1.4" fill="none" opacity="0.8"><path d="M-40 -34q5 -4 10 0t10 0"/><path d="M10 34q5 -4 10 0t10 0"/></g>
<g transform="translate(2 4) rotate(-12)"><path d="M-22 0H20L12 9H-16Z" fill="#5A3A22" stroke="#2A1A10" stroke-width="1.2"/><path d="M-4 0V-30" stroke="#2A1A10" stroke-width="2"/><path d="M-4 -26L10 -18L-4 -12Z" fill="#CFC3A8" opacity="0.8"/><path d="M8 0L14 -10" stroke="#2A1A10" stroke-width="1.5"/></g>
<circle cx="-30" cy="-12" r="6" fill="url(#gWisp)"/>
</g></g>

<g id="t-tower"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gPlains)"/>
<path d="M-70 40C-30 26 20 50 70 30" stroke="#DCC690" stroke-width="6" fill="none"/>
<ellipse cx="4" cy="16" rx="24" ry="6" fill="#3A2A18" opacity="0.3"/>
<path d="M-12 14V-26L-8 -30L-4 -26L0 -32L4 -26L8 -28L12 -24V14Z" fill="#C9BE9E" stroke="#4E4232" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M2 14V-24L8 -28L12 -24V14Z" fill="#9C9178"/>
<rect x="-4" y="-14" width="5" height="8" rx="2.5" fill="#2A1E14"/><rect x="-4" y="2" width="6" height="12" rx="3" fill="#2A1E14"/>
<g fill="#B4A988" stroke="#4E4232" stroke-width="1"><rect x="-36" y="6" width="14" height="8"/><rect x="20" y="8" width="18" height="7"/><rect x="-30" y="-2" width="8" height="8"/></g>
<use href="#tr" x="-40" y="-36"/><use href="#tr" x="38" y="-30"/>
</g></g>

<g id="t-abbey"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gMarsh)"/>
<ellipse cx="0" cy="12" rx="52" ry="22" fill="url(#gWater)"/>
<g stroke="#D8EEF2" stroke-width="1.2" fill="none" opacity="0.7"><path d="M-30 20q5 -3 10 0"/><path d="M18 26q5 -3 10 0"/></g>
<path d="M-22 16V-14L0 -34L22 -14V16" fill="#B7AE94" stroke="#4E4232" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M0 -34L22 -14V16H6V-18Z" fill="#8E8670"/>
<path d="M-8 16V0A8 8 0 0 1 8 0V16Z" fill="#2A3A40"/>
<circle cx="0" cy="-16" r="5" fill="none" stroke="#4E4232" stroke-width="1.5"/>
<path d="M-22 -14L-26 -10M22 -14L28 -6" stroke="#4E4232" stroke-width="1.5"/>
<path d="M-28 16H28" stroke="#9FC0C8" stroke-width="3"/>
<use href="#rd" x="-40" y="-10"/><use href="#rd" x="40" y="-4"/><use href="#rd" x="-34" y="44"/>
</g></g>

<g id="t-bad"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gBad)"/>
<circle cx="4" cy="-14" r="40" fill="url(#gLava)" opacity="0.6"/>
<path d="M-34 24L-6 -24H12L40 24Z" fill="#6A4A3A" stroke="#2E1E16" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M3 -24H12L40 24H18Z" fill="#4A3228"/>
<path d="M-6 -24C-2 -28 8 -28 12 -24C8 -20 -2 -20 -6 -24Z" fill="#FFB04A"/>
<g stroke="#FF8A3C" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M2 -22L-2 -6L4 6L-2 22"/><path d="M8 -20L14 -2L10 14"/></g>
<g stroke="#E0602E" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.9"><path d="M-60 40l14 6 8 -6 16 8"/><path d="M30 44l12 -4 10 6"/><path d="M-56 -20l10 6 12 -2"/></g>
<g fill="#8C827A" opacity="0.65" filter="url(#blur2)"><circle cx="4" cy="-34" r="8"/><circle cx="12" cy="-48" r="11"/><circle cx="6" cy="-62" r="13"/></g>
<g fill="#5A3A2C"><path d="M-48 10l6 -14 6 14Z"/><path d="M44 -10l5 -12 5 12Z"/></g>
</g></g>

<g id="t-haunt"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gHaunt)"/>
<g fill="#B9B0D8" opacity="0.35" filter="url(#blur2)"><ellipse cx="-20" cy="14" rx="40" ry="8"/><ellipse cx="24" cy="-20" rx="34" ry="7"/><ellipse cx="0" cy="44" rx="44" ry="8"/></g>
<use href="#dt" x="-34" y="-20"/><use href="#dt" x="-10" y="-34"/><use href="#dt" x="22" y="-4"/><use href="#dt" x="40" y="30"/><use href="#dt" x="-28" y="34"/><use href="#dt" x="6" y="40"/><use href="#dt" x="-46" y="10"/>
<circle cx="-14" cy="0" r="7" fill="url(#gWisp)"/><circle cx="30" cy="-34" r="6" fill="url(#gWisp)"/><circle cx="12" cy="20" r="5" fill="url(#gWisp)"/>
<path d="M30 0a20 14 0 1 0 0.1 0" fill="none" stroke="#C9B8F0" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.8"/>
</g></g>

<g id="t-barrow"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gBarrow)"/>
<use href="#md" x="-30" y="-20"/><use href="#md" x="4" y="-34"/><use href="#md" x="30" y="-10"/><use href="#md" x="-14" y="10"/><use href="#md" x="20" y="24"/><use href="#md" x="-36" y="34"/><use href="#md" x="2" y="50"/>
<g fill="#8E8A78" stroke="#4E4A3C" stroke-width="1"><rect x="-4" y="-12" width="6" height="14" rx="1"/><rect x="40" y="36" width="5" height="12" rx="1"/><rect x="-50" y="2" width="5" height="11" rx="1"/></g>
<g stroke="#2A1E14" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M14 -48l4 -3 4 3M26 -52l3 -2 3 2"/></g>
<circle cx="18" cy="6" r="5" fill="url(#gWisp)"/>
</g></g>

<g id="t-hills"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gHills)"/>
<g><path d="M-70 -10C-40 -40 -10 -40 10 -10Z" fill="#B3C67C"/><path d="M-20 -10C-10 -24 0 -26 10 -10Z" fill="#8EA45E" opacity="0.7"/><path d="M-10 30C20 -4 50 -4 70 30Z" fill="#B3C67C"/><path d="M40 30C48 14 58 12 70 30Z" fill="#8EA45E" opacity="0.7"/><path d="M-70 60C-40 30 -10 30 20 60Z" fill="#A3B86C"/></g>
<g stroke="#5E7A3A" stroke-width="1.5" stroke-linecap="round"><path d="M-40 -16l2 -5 2 5M24 12l2 -5 2 5M-30 44l2 -5 2 5"/></g>
<use href="#tr" x="34" y="-40"/><use href="#tr" x="-46" y="22"/>
<g transform="translate(-8 0)"><path d="M-6 0Q0 -12 10 -8L16 -2L12 2H-6Z" fill="#6E7378" stroke="#2E3236" stroke-width="1"/><circle cx="12" cy="-4" r="1" fill="#C8423A"/></g>
</g></g>

<g id="t-warrens"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gHills)"/>
<path d="M-70 10C-40 -30 0 -36 30 -6C44 8 60 6 70 0V70H-70Z" fill="#8C9A5A"/>
<path d="M-24 8A12 12 0 0 1 0 8V16H-24Z" fill="#1E140E" stroke="#5A4632" stroke-width="2"/>
<path d="M18 22A9 9 0 0 1 36 22V28H18Z" fill="#1E140E" stroke="#5A4632" stroke-width="2"/>
<g stroke="#4A3020" stroke-width="1.5"><path d="M-30 -2V-22"/><path d="M40 6V-12"/></g>
<path d="M-30 -22L-16 -18L-30 -14Z" fill="#9BBF3A"/><path d="M40 -12L52 -9L40 -6Z" fill="#9BBF3A"/>
<g fill="#E9E1CF"><circle cx="-6" cy="30" r="2"/><circle cx="2" cy="34" r="1.6"/><path d="M-12 36l6 2" stroke="#E9E1CF" stroke-width="1.5"/></g>
<g fill="#8C827A" opacity="0.5" filter="url(#blur2)"><circle cx="-12" cy="-6" r="5"/></g>
</g></g>

<g id="t-sky"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gSky)"/>
<g fill="#FFFFFF" opacity="0.9"><ellipse cx="-30" cy="40" rx="30" ry="9"/><ellipse cx="30" cy="50" rx="34" ry="10"/><ellipse cx="-40" cy="-30" rx="22" ry="6"/></g>
<g transform="translate(-6 -2)"><path d="M-26 0H26L8 30L0 22L-8 30Z" fill="#A8977A" stroke="#5E4C34" stroke-width="1.2"/><path d="M-26 0H26" stroke="#7E9A54" stroke-width="4"/><path d="M-8 0V-26L-3 -34L2 -26V0Z" fill="#F7F2E6" stroke="#8E7A54" stroke-width="1.2"/><path d="M8 0V-16L12 -22L16 -16V0Z" fill="#F7F2E6" stroke="#8E7A54" stroke-width="1.2"/><circle cx="-3" cy="-36" r="3" fill="#FFE49A"/></g>
<g transform="translate(34 -30)"><path d="M-12 0H12L4 14L0 10L-4 14Z" fill="#A8977A" stroke="#5E4C34" stroke-width="1"/><path d="M-2 0V-12L1 -16L4 -12V0Z" fill="#F7F2E6" stroke="#8E7A54" stroke-width="1"/></g>
<g stroke="#C9A24A" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M-40 -6q4 -4 8 0q4 -4 8 0"/><path d="M30 10q3 -3 6 0q3 -3 6 0"/></g>
</g></g>

<g id="t-dragon"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gDark)"/>
<circle cx="0" cy="20" r="46" fill="url(#gLava)" opacity="0.45"/>
<g stroke="#1A1212" stroke-width="1.5" stroke-linejoin="round"><path d="M-50 40L-30 -20L-20 -6L-8 -40L4 -14L16 -34L30 0L52 40Z" fill="#3E302C"/><path d="M-8 -40L4 -14L16 -34L30 0L52 40H10Z" fill="#2A201E"/></g>
<g stroke="#FF7A3A" stroke-width="2" fill="none" stroke-linecap="round"><path d="M-10 40L-4 20L4 30L8 10"/><path d="M24 40l4 -12"/></g>
<g transform="translate(-2 -52)" fill="#140C0C"><path d="M0 0C-6 -2 -14 -8 -22 -6C-16 -2 -12 2 -6 3L0 6L6 3C12 2 16 -2 22 -6C14 -8 6 -2 0 0Z"/><path d="M0 4L2 12" stroke="#140C0C" stroke-width="1.5"/></g>
<g fill="#7A6A62" opacity="0.6" filter="url(#blur2)"><circle cx="10" cy="-30" r="8"/><circle cx="18" cy="-44" r="10"/></g>
</g></g>

<g id="t-glacier"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gIce)"/>
<g fill="#FFFFFF" opacity="0.7"><path d="M-70 -10L-40 -30L-10 -16L20 -38L50 -20L70 -30V-70H-70Z"/></g>
<g stroke="#6E9EB8" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M-50 30L-30 20L-20 34L0 24"/><path d="M14 40L30 30L44 42"/><path d="M-40 -2L-26 6"/></g>
<path d="M-18 20V-6A18 18 0 0 1 18 -6V20Z" fill="#B9DCEB" stroke="#5E8EA8" stroke-width="2"/>
<path d="M-10 20V-4A10 10 0 0 1 10 -4V20Z" fill="#2A4A5E"/>
<g fill="#E8F6FC" stroke="#7EAAC2" stroke-width="1"><path d="M-22 -6l-4 -14 6 6Z"/><path d="M22 -6l4 -14 -6 6Z"/><path d="M0 -24l-3 -10 6 0Z"/></g>
<use href="#pn" x="-44" y="44"/><use href="#pn" x="44" y="10"/>
</g></g>

<g id="t-fog"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="#E4D8BE"/>
<g fill="#F1E8D4" stroke="#CDBE9C" stroke-width="1.5"><circle cx="-26" cy="-22" r="22"/><circle cx="8" cy="-30" r="20"/><circle cx="32" cy="-6" r="22"/><circle cx="-34" cy="16" r="20"/><circle cx="-4" cy="10" r="24"/><circle cx="26" cy="32" r="20"/><circle cx="-14" cy="44" r="18"/></g>
<g stroke="#CDBE9C" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M-10 -4c6 -6 16 -2 14 6s-12 8 -14 2"/><path d="M18 20c4 -4 10 -1 9 4s-8 5 -9 1"/></g>
<text x="0" y="8" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="26" fill="#B8A67E">?</text>
</g></g>

<g id="t-town"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gPlains)"/>
<path d="M-70 30C-40 20 -20 40 0 30C20 20 50 34 70 26" stroke="#6E9EB0" stroke-width="7" fill="none"/>
<path d="M-70 30C-40 20 -20 40 0 30C20 20 50 34 70 26" stroke="#B9DCE6" stroke-width="1.5" fill="none" opacity="0.7"/>
<ellipse cx="0" cy="6" rx="42" ry="34" fill="#C9BE9E" stroke="#5E5440" stroke-width="2.5"/>
<ellipse cx="0" cy="4" rx="36" ry="28" fill="#D9CDAE"/>
<g stroke="#4A3020" stroke-width="1"><path d="M-24 6V-4H-12V6Z" fill="#E9DAB8"/><path d="M-26 -3L-18 -11L-10 -3Z" fill="#A84A30"/><path d="M10 14V4H22V14Z" fill="#E9DAB8"/><path d="M8 5L16 -3L24 5Z" fill="#A84A30"/><path d="M-20 22V14H-8V22Z" fill="#E9DAB8"/><path d="M-22 15L-14 8L-6 15Z" fill="#5E7F92"/><path d="M14 -8V-16H24V-8Z" fill="#E9DAB8"/><path d="M12 -15L19 -22L26 -15Z" fill="#A84A30"/></g>
<path d="M-8 -2V-26H8V-2Z" fill="#B7AE94" stroke="#3B2A1C" stroke-width="1.5"/>
<path d="M-10 -26L0 -36L10 -26Z" fill="#5E6A78" stroke="#3B2A1C" stroke-width="1.5"/>
<path d="M0 -36V-46" stroke="#3B2A1C" stroke-width="1.5"/><path d="M0 -46L9 -42L0 -38Z" fill="#8E2B23"/>
<rect x="-3" y="-12" width="6" height="10" rx="3" fill="#3B2A1C"/>
<g fill="#B7AE94" stroke="#3B2A1C" stroke-width="1.2"><rect x="-44" y="-2" width="8" height="14"/><rect x="36" y="-2" width="8" height="14"/><rect x="-6" y="32" width="12" height="10"/></g>
</g></g>

<g id="t-fort"><g clip-path="url(#hc)">
<rect x="-70" y="-70" width="140" height="140" fill="url(#gHills)"/>
<path d="M-70 24C-40 -2 0 -6 30 14C46 24 60 22 70 16V70H-70Z" fill="#8C9A5A"/>
<ellipse cx="2" cy="6" rx="48" ry="31" fill="#9A8460"/>
<g fill="#B7AE94" stroke="#3B2A1C" stroke-width="1"><path d="M-24 14L-16 3L-8 14Z"/><path d="M-6 24L2 13L10 24Z"/><path d="M-30 -6L-23 -15L-16 -6Z"/></g>
<circle cx="-4" cy="2" r="3" fill="#FF9A3C"/><g fill="#8C827A" opacity="0.55" filter="url(#blur2)"><circle cx="-6" cy="-8" r="5"/><circle cx="-2" cy="-18" r="6"/></g>
<rect x="8" y="-20" width="30" height="26" fill="#7A6A58" stroke="#3B2A1C" stroke-width="1.5"/><path d="M4 -20L23 -36L42 -20Z" fill="#5A3A22" stroke="#3B2A1C" stroke-width="1.5"/>
<rect x="19" y="-6" width="8" height="12" fill="#2A1E14"/><path d="M23 -36V-52" stroke="#3B2A1C" stroke-width="1.5"/><path d="M23 -52L35 -47L23 -42Z" fill="#8E2B23"/><circle cx="27" cy="-47" r="1.6" fill="#F2D23A"/>
<ellipse cx="2" cy="6" rx="48" ry="31" fill="none" stroke="#6E4A28" stroke-width="5" stroke-dasharray="3 2"/>
<rect x="-52" y="0" width="10" height="13" fill="#3B2A1C"/>
<g fill="#7A5232" stroke="#3B2A1C" stroke-width="1.2"><rect x="-44" y="-26" width="10" height="16"/><rect x="-44" y="22" width="10" height="16"/><rect x="40" y="-14" width="10" height="16"/></g>
<g fill="#8E2B23" stroke="#3B2A1C" stroke-width="1"><path d="M-46 -26L-39 -34L-32 -26Z"/><path d="M-46 22L-39 14L-32 22Z"/><path d="M38 -14L45 -22L52 -14Z"/></g>
</g></g>`;
