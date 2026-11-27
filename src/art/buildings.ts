// Small painted building icons for the Town screen (viewBox 0 0 120 96, ground at y = 86).
// Level 0 draws an empty plot with stakes; higher levels add banners.

const OL = '#2A1A10';

const BODY: Record<string, string> = {
  townhall: `<path d="M22 86V44H98V86Z" fill="#D3C8AA" stroke="${OL}" stroke-width="2"/><path d="M16 46L60 14L104 46Z" fill="#5E6A78" stroke="${OL}" stroke-width="2"/>
<path d="M50 86V30H70V86" fill="#C9BE9E" stroke="${OL}" stroke-width="2"/><path d="M46 32L60 4L74 32Z" fill="#4E5A68" stroke="${OL}" stroke-width="2"/><circle cx="60" cy="42" r="6" fill="#F6EBD0" stroke="${OL}" stroke-width="1.5"/>
<path d="M54 86V66A6 6 0 0 1 66 66V86Z" fill="#6E4A28" stroke="${OL}" stroke-width="1.5"/><rect x="30" y="56" width="10" height="12" rx="5" fill="#F6C46A" stroke="${OL}"/><rect x="80" y="56" width="10" height="12" rx="5" fill="#F6C46A" stroke="${OL}"/>`,
  guildhall: `<path d="M16 86V54H104V86Z" fill="#C9BE9E" stroke="${OL}" stroke-width="2"/><path d="M12 56V34H108V56Z" fill="#F2E6CC" stroke="${OL}" stroke-width="2"/>
<path d="M12 45H108M36 34V56M60 34V56M84 34V56" stroke="#5A3A22" stroke-width="3"/><path d="M6 36L60 8L114 36Z" fill="#9A4A30" stroke="${OL}" stroke-width="2"/>
<path d="M50 86V66A10 10 0 0 1 70 66V86Z" fill="#6E4A28" stroke="${OL}" stroke-width="1.5"/><path d="M52 18H68V28C68 34 60 38 60 38C60 38 52 34 52 28Z" fill="#3D6178" stroke="#C9A24A" stroke-width="1.5"/>`,
  tavern: `<path d="M20 86V44H100V86Z" fill="#F2E6CC" stroke="${OL}" stroke-width="2"/><path d="M20 64H100M46 44V86M74 44V86" stroke="#5A3A22" stroke-width="3"/>
<path d="M12 46C30 14 90 14 108 46Z" fill="#D8B566" stroke="#6E5028" stroke-width="2"/><rect x="28" y="50" width="12" height="11" rx="2" fill="#FFC86B" stroke="${OL}"/><rect x="80" y="50" width="12" height="11" rx="2" fill="#FFC86B" stroke="${OL}"/>
<path d="M54 86V68H66V86Z" fill="#6E4A28" stroke="${OL}" stroke-width="1.5"/><path d="M100 54H112" stroke="${OL}" stroke-width="2"/><rect x="104" y="56" width="12" height="12" rx="2" fill="#7A5232" stroke="${OL}"/><path d="M108 59H112V65H108Z" fill="#F6E9C9"/>`,
  weaponsmith: `<circle cx="44" cy="70" r="26" fill="#FF9A3C" opacity="0.35"/><path d="M18 86V46H102V86Z" fill="#BDB092" stroke="${OL}" stroke-width="2"/><path d="M12 48L60 20L108 48Z" fill="#4A4E56" stroke="${OL}" stroke-width="2"/>
<path d="M82 34V14H94V40" fill="#BDB092" stroke="${OL}" stroke-width="2"/><path d="M26 86V58H62V86Z" fill="#1E140E"/><path d="M30 86V72C36 64 50 64 56 72V86Z" fill="#FF8A3C"/>
<path d="M72 80H96L92 74H76Z" fill="#3A3F45" stroke="${OL}"/><path d="M76 58L90 72M90 58L76 72" stroke="#E6EAED" stroke-width="3" stroke-linecap="round"/>`,
  armorer: `<path d="M18 86V46H102V86Z" fill="#BDB092" stroke="${OL}" stroke-width="2"/><path d="M12 48L60 20L108 48Z" fill="#5E6A78" stroke="${OL}" stroke-width="2"/>
<path d="M28 86V60H52V86Z" fill="#6E4A28" stroke="${OL}" stroke-width="1.5"/><path d="M66 56H92V70C92 80 79 86 79 86C79 86 66 80 66 70Z" fill="#3D6178" stroke="${OL}" stroke-width="2"/><path d="M79 60V80M70 68H88" stroke="#F6E9C9" stroke-width="2"/>`,
  temple: `<path d="M20 86V44H88V86Z" fill="#E6DCC4" stroke="${OL}" stroke-width="2"/><path d="M14 46L54 18L94 46Z" fill="#7A8A9A" stroke="${OL}" stroke-width="2"/>
<circle cx="54" cy="36" r="7" fill="#F6E2A4" stroke="${OL}" stroke-width="1.5"/><path d="M88 86V30H104V86Z" fill="#E6DCC4" stroke="${OL}" stroke-width="2"/><path d="M85 32L96 8L107 32Z" fill="#7A8A9A" stroke="${OL}" stroke-width="2"/>
<path d="M46 86V66A8 8 0 0 1 62 66V86Z" fill="#5A3A22" stroke="${OL}" stroke-width="1.5"/><circle cx="96" cy="4" r="3" fill="none" stroke="#C9A24A" stroke-width="1.5"/>`,
  market: `<g><path d="M14 86V60M44 86V60" stroke="#6E4A28" stroke-width="3"/><path d="M8 62L29 48L50 62Z" fill="#C8423A" stroke="${OL}" stroke-width="1.5"/><rect x="14" y="74" width="30" height="12" fill="#9A6A3E" stroke="${OL}"/><circle cx="22" cy="72" r="3" fill="#D84A3A"/><circle cx="32" cy="72" r="3" fill="#E8C23A"/></g>
<g><path d="M60 86V56M92 86V56" stroke="#6E4A28" stroke-width="3"/><path d="M54 58L76 42L98 58Z" fill="#3D6178" stroke="${OL}" stroke-width="1.5"/><rect x="60" y="72" width="32" height="14" fill="#9A6A3E" stroke="${OL}"/><rect x="66" y="64" width="8" height="8" fill="#C9A24A"/><rect x="78" y="66" width="8" height="6" fill="#8E3A2A"/></g>
<path d="M100 86V70H112V86Z" fill="#B9875A" stroke="${OL}"/>`,
  magetower: `<path d="M76 86V56H98V86Z" fill="#BDB092" stroke="${OL}" stroke-width="2"/><path d="M72 58L87 44L102 58Z" fill="#5E4E8C" stroke="${OL}" stroke-width="2"/>
<path d="M42 86V30H74V86Z" fill="#D3C8AA" stroke="${OL}" stroke-width="2"/><path d="M38 32L58 4L78 32Z" fill="#5E4E8C" stroke="${OL}" stroke-width="2"/><path d="M42 32H74" stroke="#C9A24A" stroke-width="2"/>
<rect x="53" y="40" width="10" height="14" rx="5" fill="#B9FFF0" stroke="${OL}" stroke-width="1.5"/><path d="M52 86V70A6 6 0 0 1 64 70V86Z" fill="#5A3A22" stroke="${OL}" stroke-width="1.5"/>
<path d="M58 10L59.6 13.6L63 14L60.4 16.4L61 20L58 18.2L55 20L55.6 16.4L53 14L56.4 13.6Z" fill="#F1D27A"/><circle cx="30" cy="26" r="2.2" fill="#B9FFF0"/><circle cx="90" cy="30" r="1.8" fill="#B9FFF0"/><circle cx="24" cy="44" r="1.4" fill="#B9FFF0"/>`,
  stables: `<path d="M14 86V48H74V86Z" fill="#9A4A30" stroke="${OL}" stroke-width="2"/><path d="M8 50L44 24L80 50Z" fill="#6E4A28" stroke="${OL}" stroke-width="2"/>
<path d="M28 86V60H60V86Z" fill="#5A3A22" stroke="${OL}" stroke-width="1.5"/><path d="M28 60L60 86M60 60L28 86" stroke="#D8B566" stroke-width="2.5"/><path d="M28 60H60V86H28Z" fill="none" stroke="#D8B566" stroke-width="2.5"/>
<rect x="38" y="34" width="12" height="10" fill="#2A1A10" stroke="${OL}"/><path d="M74 86V62H106V86" fill="none" stroke="#8A6236" stroke-width="3"/><path d="M74 70H106M74 78H106" stroke="#8A6236" stroke-width="2.5"/>
<path d="M86 86C84 74 86 62 92 54L90 46L96 50C104 50 108 56 106 62L100 62L98 70C98 76 100 82 100 86Z" fill="#8A5A34" stroke="${OL}" stroke-width="2"/><circle cx="99" cy="55" r="1.6" fill="${OL}"/>
<path d="M92 54C90 60 88 66 88 72" stroke="#3A2414" stroke-width="3" fill="none"/><ellipse cx="22" cy="80" rx="9" ry="6" fill="#E2B84A" stroke="${OL}" stroke-width="1.5"/>`,
};

const PLOT = `<path d="M14 86H106" stroke="#7A9650" stroke-width="6"/><path d="M20 86V70M100 86V70M20 74H100" stroke="#8A6236" stroke-width="3"/><path d="M60 86V56" stroke="#6E4A28" stroke-width="3"/><rect x="36" y="44" width="48" height="16" rx="3" fill="#E9DCBD" stroke="#6E4A28" stroke-width="2"/><text x="60" y="56" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="11" fill="#3B2A1C">+ BUILD</text>`;

export function buildingSvg(id: string, level: number): string {
  const inner = level > 0 ? BODY[id] ?? '' : PLOT;
  const flags = level >= 3 ? `<path d="M10 30V10" stroke="${OL}" stroke-width="2"/><path d="M10 10H22L18 15L22 20H10Z" fill="#8E2B23" stroke="#C9A24A"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96"><ellipse cx="60" cy="88" rx="54" ry="6" fill="#000" opacity="0.2"/>${inner}${flags}</svg>`;
}
