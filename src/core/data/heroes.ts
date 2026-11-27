import type { HeroClass, HeroDef, Personality, Rarity, Stats, Tribe } from '../types';

// Base stats come from class + tribe + rarity, so every tribe gets the same total budget.
const CLASS_BASE: Record<HeroClass, Stats> = {
  warrior: { might: 12, finesse: 6, arcana: 3, vigor: 15, resolve: 10 },
  ranger: { might: 7, finesse: 14, arcana: 4, vigor: 10, resolve: 8 },
  rogue: { might: 8, finesse: 13, arcana: 4, vigor: 9, resolve: 7 },
  mage: { might: 3, finesse: 6, arcana: 15, vigor: 8, resolve: 9 },
  cleric: { might: 6, finesse: 5, arcana: 12, vigor: 11, resolve: 12 },
  bard: { might: 6, finesse: 9, arcana: 10, vigor: 9, resolve: 11 },
  // Prestige classes use the same budget: new options, not upgrades.
  paladin: { might: 9, finesse: 4, arcana: 8, vigor: 13, resolve: 12 },
  beastmaster: { might: 8, finesse: 11, arcana: 4, vigor: 10, resolve: 9 },
  necromancer: { might: 3, finesse: 5, arcana: 14, vigor: 9, resolve: 10 },
  dragonslayer: { might: 14, finesse: 8, arcana: 2, vigor: 12, resolve: 8 },
};

// Each tribe shifts the budget around but keeps the same sum.
const TRIBE_SHIFT: Record<Tribe, Partial<Stats>> = {
  freeholders: {},
  thornkin: { finesse: 2, vigor: -2 },
  ironroot: { vigor: 3, finesse: -2, arcana: -1 },
  ashborn: { might: 3, arcana: -2, resolve: -1 },
  fenfolk: { vigor: 2, finesse: -1, arcana: -1 },
  moonveil: { arcana: 3, might: -2, vigor: -1 },
  dawnwings: { resolve: 2, arcana: 1, finesse: -2, might: -1 },
  hollowed: { resolve: 3, vigor: 1, finesse: -2, might: -2 },
};

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.12,
  rare: 1.25,
  epic: 1.4,
  legendary: 1.6,
};

export const MAX_STARS: Record<Rarity, number> = {
  common: 3,
  uncommon: 4,
  rare: 5,
  epic: 5,
  legendary: 6,
};

function baseStats(heroClass: HeroClass, tribe: Tribe, rarity: Rarity): Stats {
  const c = CLASS_BASE[heroClass];
  const t = TRIBE_SHIFT[tribe];
  const m = RARITY_MULT[rarity];
  const out = {} as Stats;
  for (const k of Object.keys(c) as (keyof Stats)[]) {
    out[k] = Math.max(1, Math.round((c[k] + (t[k] ?? 0)) * m));
  }
  return out;
}

type Row = [id: string, name: string, title: string, tribe: Tribe, cls: HeroClass, rarity: Rarity, trait: string, signature: string, quote: string];

// Tribe gaps from the design: Thornkin and Moonveil have no Warriors, Ironroot no Mages,
// Ashborn no Clerics, Fenfolk no Rangers, Dawnwings no Rogues, Hollowed no Bards.
const ROWS: Row[] = [
  ['brannoc', 'Brannoc', 'the Unbudging', 'ironroot', 'warrior', 'common', 'Stubborn: +20% Resolve below half health', 'Stand Firm', "Mountains don't move. Neither do I."],
  ['hilda', 'Hilda', 'Runecaller', 'ironroot', 'cleric', 'uncommon', 'Rune-ward: allies near her take 10% less damage', 'Stone Blessing', 'The runes remember. So do I.'],
  ['dorrik', 'Dorrik', 'Sapper', 'ironroot', 'rogue', 'common', 'Demolitions: +30% damage to constructs and gates', 'Short Fuse', 'Stand back. Further.'],
  ['grimgar', 'Grimgar', 'Boltwright', 'ironroot', 'ranger', 'rare', 'Heavy bolts: attacks slow the target', 'Piercing Volley', 'One bolt, two goblins. Efficient.'],
  ['varra', 'Thane Varra', 'Shieldmother', 'ironroot', 'warrior', 'epic', 'Shield wall: front row takes 15% less damage', 'Hold the Hall', 'Behind me. All of you.'],

  ['mirela', 'Mirela', 'of the Lantern', 'freeholders', 'cleric', 'common', 'Steady hands: heals 10% more', 'Lantern Prayer', 'Light finds a way.'],
  ['edric', 'Sir Edric', 'the Second Son', 'freeholders', 'warrior', 'uncommon', 'Chivalry: protects the weakest ally', 'Challenge', 'For the Freeholds!'],
  ['rowan', 'Rowan', 'Quickfingers', 'freeholders', 'rogue', 'common', 'Light touch: +20% gold from chests', 'Pickpocket', "It wasn't nailed down."],
  ['tamsin', 'Tamsin', 'Songweaver', 'freeholders', 'bard', 'rare', 'Marching song: party travels 10% faster', 'Ballad of Courage', 'Every road needs a song.'],

  ['lyra', 'Lyra', 'Leafshadow', 'thornkin', 'ranger', 'common', 'Keen eyes: finds 15% more hidden things', "Hunter's Mark", 'I saw them before they saw me.'],
  ['briar', 'Briar', 'Thornstep', 'thornkin', 'rogue', 'common', 'Ambusher: first strike deals double damage', 'Bramble Trap', 'Mind the thorns.'],
  ['faelan', 'Faelan', 'Sporewise', 'thornkin', 'mage', 'uncommon', 'Rot magic: attacks spread a weak poison', 'Spore Cloud', 'The forest eats everything, eventually.'],
  ['sylwen', 'Sylwen', 'Oakheart', 'thornkin', 'cleric', 'rare', 'Regrowth: heals over time', "Grove's Embrace", 'Rest. The trees are watching.'],

  ['kragga', 'Kragga', 'Bloodtusk', 'ashborn', 'warrior', 'uncommon', 'Bloodlust: heals on every kill', 'Berserk', 'MORE!'],
  ['urzog', 'Urzog', 'the Thrower', 'ashborn', 'ranger', 'common', 'Big arm: thrown axes hit hard', 'Axe Storm', 'Catch.'],
  ['gorm', 'Gorm', 'Wardrummer', 'ashborn', 'bard', 'common', 'War drums: party attacks 10% faster', 'Thunder Beat', 'BOOM. BOOM. BOOM.'],
  ['ashka', 'Ashka', 'Cinderseer', 'ashborn', 'mage', 'rare', 'Kindling: fire spells leave burning ground', 'Ash Rain', 'Everything burns. Some things twice.'],
  ['embermaw', 'Embermaw', 'the Unchained', 'ashborn', 'warrior', 'legendary', 'Living furnace: burns enemies who strike him', 'Eruption', 'They chained me once. Once.'],

  ['ssiv', 'Ssiv', 'Reedtongue', 'fenfolk', 'rogue', 'common', 'Venom: attacks poison', 'Venom Ambush', 'Sssoft steps, sssharp teeth.'],
  ['mudtail', 'Mudtail', 'the Patient', 'fenfolk', 'warrior', 'common', 'Thick hide: regenerates slowly', 'Bog Grip', 'The swamp waits. So do I.'],
  ['oss', 'Oss', 'Tidecaller', 'fenfolk', 'cleric', 'uncommon', 'Cleansing rain: heals remove poison', 'Swamp Mist', 'Water carries all things home.'],
  ['ixa', 'Ixa', 'Deepwhisper', 'fenfolk', 'mage', 'rare', 'Undertow: spells pull enemies together', 'Drowning Grasp', 'The deep is listening.'],

  ['elowen', 'Elowen', 'Mothwing', 'moonveil', 'mage', 'common', 'Moonlit: +15% Arcana at night', 'Starfall', 'Did you hear the moths sing?'],
  ['pip', 'Pip', 'Lanternjack', 'moonveil', 'bard', 'common', 'Mischief: enemies sometimes attack each other', 'Bewilder', 'Wrong way, silly.'],
  ['nyx', 'Nyx', 'Hollowstep', 'moonveil', 'rogue', 'uncommon', 'Blink: dodges the first hit of each fight', 'Shadow Swap', 'Behind you. No, the other behind.'],
  ['selune', 'Selune', 'of the Silver Court', 'moonveil', 'cleric', 'epic', 'Dreamward: party immune to fear', 'Moonwell', 'Sleep now. I will keep watch.'],

  ['aurelia', 'Aurelia', 'Dawnmantle', 'dawnwings', 'warrior', 'epic', 'Sanctuary: party heals 10% more', 'Radiant Bulwark', 'Stand in my light.'],
  ['seraphiel', 'Seraphiel', 'the Kind', 'dawnwings', 'cleric', 'uncommon', 'Mercy: heals the weakest ally first', 'Halo of Mending', 'No one falls today.'],
  ['caelum', 'Caelum', 'Skyshot', 'dawnwings', 'ranger', 'common', 'High ground: +20% range', 'Sunlance', 'From up here, everything is a target.'],
  ['lumen', 'Lumen', 'Choirwing', 'dawnwings', 'bard', 'rare', 'Hymn: party Resolve +15%', 'Song of Dawn', 'Sing with me.'],

  ['hollis', 'Sir Hollis', 'the Oathbound', 'hollowed', 'warrior', 'common', 'Deathless: survives one killing blow per trip', 'Grave Oath', 'I swore to stand. I still stand.'],
  ['vesper', 'Vesper', 'Gravehand', 'hollowed', 'rogue', 'uncommon', 'Cold touch: attacks slow', 'Chill of the Tomb', '...'],
  ['wren', 'Wren', 'Ashwarden', 'hollowed', 'ranger', 'rare', 'Bone arrows: ignore some armor', 'Mourning Shot', 'I knew your grandfather. He missed too.'],
  ['morrow', 'Morrow', 'the Unburied', 'hollowed', 'mage', 'legendary', 'Grave tide: raises fallen foes to fight', 'Grave Tide', 'Death is a door. I hold the key.'],

  // ---- Prestige classes (unlocked by achievements) ----
  // Beastmasters: Thornkin, Ashborn, Fenfolk, Moonveil, Hollowed.
  ['tamra', 'Tamra', 'Wolfsister', 'thornkin', 'beastmaster', 'common', 'Pack bond: her wolf hits 20% harder', 'Call the Pack', "He bites. I mostly don't."],
  ['grukk', 'Grukk', 'Boar-Rider', 'ashborn', 'beastmaster', 'uncommon', 'Stampede: his boar charges the first enemy it sees', 'Tusk Charge', 'Squealer goes first. Then me.'],
  ['bogga', 'Old Bogga', 'Toadmother', 'fenfolk', 'beastmaster', 'rare', 'Big appetite: her toad heals when it wins a fight', 'Swallow Whole', 'Hungry, my sweet? Go on, then.'],
  ['graves', 'Graves', 'Kennelkeeper', 'hollowed', 'beastmaster', 'rare', 'Bone hound: his dog cannot be frightened', 'Fetch', 'Good boy. Good, dead boy.'],
  ['isolde', 'Isolde', 'Nightmane', 'moonveil', 'beastmaster', 'epic', 'Moon wolf: her wolf moves like a shadow', 'Howl at the Moon', 'We hunt when the moon says so.'],
  // Paladins: Freeholders, Ironroot, Dawnwings.
  ['gwen', 'Dame Gwen', 'of the White Road', 'freeholders', 'paladin', 'common', 'Lay on hands: heals allies next to her', 'Oath of Mercy', 'Hold the line. I have you.'],
  ['torvald', 'Torvald', 'Oathhammer', 'ironroot', 'paladin', 'uncommon', 'Rune-plate: takes 10% less damage', 'Hammer of Vows', 'An oath is stone. I am stone.'],
  ['solenne', 'Solenne', 'Lightbringer', 'dawnwings', 'paladin', 'legendary', 'Radiance: her heals also burn the undead', 'Judgement', 'The night ends where I stand.'],
  // Necromancers: Fenfolk, Moonveil, Hollowed.
  ['ossian', 'Ossian', 'the Gravekeeper', 'hollowed', 'necromancer', 'common', 'Old friends: raised dead last longer', 'Rise', 'You are not done yet. Get up.'],
  ['grell', 'Grell', 'Bogwight', 'fenfolk', 'necromancer', 'uncommon', 'Bog bodies: raises fallen foes more often', 'Mire Call', 'The swamp keeps everything. I borrow.'],
  ['vanthe', 'Vanthe', 'Dreamreaper', 'moonveil', 'necromancer', 'rare', 'Dream thread: raised dead hit harder', 'Last Dream', 'Sleep, and then wake for me.'],
  // Dragonslayers: Freeholders, Thornkin, Ironroot, Ashborn, Dawnwings.
  ['fenn', 'Fenn', 'Scalehunter', 'thornkin', 'dragonslayer', 'common', 'Trophy hunter: +gold from big kills', 'Heartseeker', 'The bigger they are, the bigger the hat.'],
  ['bruni', 'Bruni', 'Anvilheart', 'ironroot', 'dragonslayer', 'uncommon', 'Fireproof beard: takes less damage from big foes', 'Anvil Drop', 'I have hit harder things than you. Mostly anvils.'],
  ['valerian', 'Valerian', 'Sunspear', 'dawnwings', 'dragonslayer', 'rare', 'Dive: strikes from above when a fight starts', 'Falling Sun', 'Look up.'],
  ['skarr', 'Skarr', 'the Fireproof', 'ashborn', 'dragonslayer', 'epic', 'Scorched: shrugs off fire', 'Wyrmbreaker', 'Your fire tickles.'],
  ['aldric', 'Aldric', 'the Wyrmbane', 'freeholders', 'dragonslayer', 'legendary', 'Legend: the whole party is braver beside him', 'Dragonfall', 'I have done this before. Twice.'],

  // ---- Secret heroes: one per tribe, each breaking their tribe's mould. Nobody says how to find them. ----
  ['marta', 'Marta', 'the Lost Heir', 'freeholders', 'rogue', 'legendary', 'Royal blood: commoners open doors for her', 'Crown of Knives', 'Call me Your Majesty and I will cut you. Call me Marta.'],
  ['oakhewn', 'Oakhewn', 'the Bark-Knight', 'thornkin', 'warrior', 'epic', 'Living armor: grows back what is cut away', 'Rootbound Stand', 'The forest sent me. It does not send twice.'],
  ['runa', 'Runa', 'Deepglow', 'ironroot', 'mage', 'legendary', 'Rune-lit: the only Ironroot who ever learned the old letters', 'Word of the Deep', 'Stone remembers. I just read it aloud.'],
  ['yssa', 'Yssa', 'Emberpriest', 'ashborn', 'cleric', 'epic', 'Cauterize: her heals burn clean', 'Hearthfire', 'Hold still. This will hurt, and then it will not.'],
  ['quill', 'Quill', 'Tidewatcher', 'fenfolk', 'ranger', 'epic', 'Tide-eyed: sees what the water hides', 'Riptide Volley', 'I watched the sea for forty years. Now I watch you.'],
  ['sable', 'Sable', 'the Moonblade', 'moonveil', 'warrior', 'legendary', 'Eclipse: strongest when the moon is up', 'Blade of the Long Night', 'The Moonveil do not fight with swords. I am not the Moonveil you know.'],
  ['corvin', 'Corvin', 'Featherthief', 'dawnwings', 'rogue', 'epic', 'Light fingers: nobody counts feathers', 'Magpie Strike', 'Shiny? Mine.'],
  ['lament', 'Lament', 'the Last Song', 'hollowed', 'bard', 'epic', 'Dirge: the fallen are remembered in every verse', 'Song for the Fallen', 'I sang at my own funeral. Nobody else came.'],
];

/** Heroes nobody can recruit until they find their way to the guild (see core/secretHeroes). */
export const SECRET_HEROES = ['marta', 'oakhewn', 'runa', 'yssa', 'quill', 'sable', 'corvin', 'lament'];

// Personality, grudge (enemy family) and fondness (hero id) for each hero, from their character brief.
const NATURE: Record<string, [Personality, string?, string?]> = {
  brannoc: ['steady', 'Goblins', 'lyra'],
  hilda: ['protective'],
  dorrik: ['reckless', 'Goblins'],
  grimgar: ['steady'],
  varra: ['protective', undefined, 'brannoc'],
  mirela: ['shy', undefined, 'edric'],
  edric: ['protective', 'Bandits', 'mirela'],
  rowan: ['greedy'],
  tamsin: ['curious'],
  lyra: ['curious', 'Bandits', 'brannoc'],
  briar: ['reckless', 'Bandits'],
  faelan: ['curious'],
  sylwen: ['shy'],
  kragga: ['reckless', undefined, 'gorm'],
  urzog: ['gloryhound'],
  gorm: ['steady', undefined, 'kragga'],
  ashka: ['gloryhound'],
  embermaw: ['reckless', 'Undead'],
  ssiv: ['greedy', undefined, 'oss'],
  mudtail: ['steady'],
  oss: ['protective', 'Swamp horrors', 'ssiv'],
  ixa: ['curious'],
  elowen: ['shy', undefined, 'pip'],
  pip: ['cowardly', undefined, 'elowen'],
  nyx: ['curious'],
  selune: ['protective'],
  aurelia: ['protective', 'Undead', 'seraphiel'],
  seraphiel: ['shy', undefined, 'aurelia'],
  caelum: ['gloryhound'],
  lumen: ['steady'],
  hollis: ['steady', 'Bandits'],
  vesper: ['cowardly'],
  wren: ['steady', 'Beasts'],
  morrow: ['gloryhound'],
  tamra: ['curious', 'Bandits', 'lyra'],
  grukk: ['reckless', undefined, 'kragga'],
  bogga: ['protective', undefined, 'oss'],
  graves: ['steady', 'Beasts'],
  isolde: ['shy', 'Beasts'],
  gwen: ['protective', 'Undead', 'edric'],
  torvald: ['steady', 'Goblins', 'brannoc'],
  solenne: ['protective', 'Undead', 'aurelia'],
  ossian: ['steady', undefined, 'hollis'],
  grell: ['greedy'],
  vanthe: ['shy', undefined, 'selune'],
  fenn: ['gloryhound', 'Dragonkin'],
  bruni: ['steady', 'Trolls and giants'],
  valerian: ['gloryhound', 'Dragonkin', 'caelum'],
  skarr: ['reckless', 'Dragonkin'],
  aldric: ['steady', 'Dragonkin', 'gwen'],
  marta: ['greedy', 'Bandits', 'rowan'],
  oakhewn: ['protective', 'Beasts', 'sylwen'],
  runa: ['curious', undefined, 'hilda'],
  yssa: ['protective', 'Undead', 'kragga'],
  quill: ['steady', 'Sea and reef', 'ssiv'],
  sable: ['reckless', 'Spirits and fae', 'isolde'],
  corvin: ['greedy', undefined, 'caelum'],
  lament: ['shy', undefined, 'hollis'],
};

/** The animal each Beastmaster brings. */
const PETS: Record<string, string> = { tamra: 'pet_wolf', grukk: 'pet_boar', bogga: 'pet_toad', graves: 'pet_bonehound', isolde: 'pet_moonwolf' };

export const HEROES: HeroDef[] = ROWS.map(([id, name, title, tribe, heroClass, rarity, trait, signature, quote]) => ({
  id,
  name,
  title,
  tribe,
  heroClass,
  rarity,
  base: baseStats(heroClass, tribe, rarity),
  trait,
  signature,
  quote,
  personality: NATURE[id]?.[0] ?? 'steady',
  grudge: NATURE[id]?.[1],
  fond: NATURE[id]?.[2],
  pet: PETS[id],
  secret: SECRET_HEROES.includes(id) || undefined,
}));

export const PERSONALITY_TEXT: Record<Personality, string> = {
  reckless: 'Charges in before the party is ready and hits a little harder, but guards a little less.',
  cowardly: 'Hangs back when a fight starts and runs for safety when badly hurt.',
  shy: 'Keeps behind tougher allies; enemies tend to overlook them.',
  protective: 'Draws enemies away from wounded friends.',
  gloryhound: 'Goes for the biggest enemy on the field and hits it harder.',
  greedy: 'Grabs chests even mid-fight. Wants the treasure path at a crossroads.',
  curious: 'Spots extra discoveries and chests. Wants to explore every side path, and to open every chest.',
  steady: 'No quirks: follows orders exactly.',
};

export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));

export const STARTER_HEROES = ['brannoc', 'ssiv', 'lyra', 'elowen', 'mirela'];

export const TRIBE_NAMES: Record<Tribe, string> = {
  freeholders: 'Freeholders',
  thornkin: 'Thornkin',
  ironroot: 'Ironroot',
  ashborn: 'Ashborn',
  fenfolk: 'Fenfolk',
  moonveil: 'Moonveil',
  dawnwings: 'Dawnwings',
  hollowed: 'Hollowed',
};

/** What three of a tribe can do on the map, and what five of a tribe get. */
export const TRIBE_BONUS: Record<Tribe, { three: string; five: string }> = {
  freeholders: { three: 'Faster on farm roads; find hidden villages', five: '+20% gold' },
  thornkin: { three: 'Slip past monsters in forests and strike first; follow elf-paths; enter Thornheart', five: '+15% damage in forests' },
  ironroot: { three: 'Tunnel into Deepdelve; open ore seams in the hills', five: '+50% stone and iron' },
  ashborn: { three: 'Cross lava: the Cinder Caldera, and lava paths in the badlands', five: '+15% damage; heal after every fight' },
  fenfolk: { three: 'Swim to sea areas; dive to sunken wrecks', five: 'Herbs doubled' },
  moonveil: { three: 'See and enter the Veiled Glade; open spirit gates', five: '+15% spell damage and healing' },
  dawnwings: { three: 'Fly to the Drifting Spires; reach cliff-top eyries', five: '+15% healing; morale never drops below 80' },
  hollowed: { three: 'Walk the cursed ground of Blightmoor; open sealed crypts', five: 'Trips last 15% longer; +15% health' },
};

export const CLASS_NAMES: Record<HeroClass, string> = {
  warrior: 'Warrior',
  ranger: 'Ranger',
  rogue: 'Rogue',
  mage: 'Mage',
  cleric: 'Cleric',
  bard: 'Bard',
  paladin: 'Paladin',
  beastmaster: 'Beastmaster',
  necromancer: 'Necromancer',
  dragonslayer: 'Dragonslayer',
};

/** What each class does on the map, for hero pages and the Achievements screen. */
export const CLASS_TEXT: Record<HeroClass, string> = {
  warrior: 'Front-line fighter. Enemies go for warriors first.',
  ranger: 'Shoots from far back.',
  rogue: 'Quick melee with big critical hits.',
  mage: 'Ranged magic that also hits enemies near the target.',
  cleric: 'Heals the most hurt ally; weak attacks.',
  bard: 'Plays the party into battle: +10% damage for everyone.',
  paladin: 'Holy front-liner: tanks like a warrior and heals allies next to them.',
  beastmaster: 'Throws spears from mid-range while an animal companion fights beside them.',
  necromancer: 'Ranged dark magic. Raises fallen enemies to fight for the party for a while.',
  dragonslayer: 'Heavy melee. Hits big monsters 50% harder, and dragonkin twice as hard.',
};
