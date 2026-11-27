import type { Biome, Material, Tribe } from '../types';

// Secret paths: with 3 or more heroes of a tribe in the party, trips through that tribe's home
// terrain turn up a side path nobody else can find. Map abilities change where a party can go,
// not how strong it is, so these pay out in loot, healing and stories.

export type SecretKind = 'village' | 'elfpath' | 'seam' | 'lava' | 'wreck' | 'spiritgate' | 'eyrie' | 'crypt';

export interface SecretPath {
  kind: SecretKind;
  tribe: Tribe;
  /** Short name for the map ("a sunken wreck"). */
  label: string;
  biomes: Biome[];
  /** "A crossroads: <sign>." */
  sign: string;
  /** "<names> <take>." */
  take: string;
  /** Told on arrival. */
  arrive: string;
  /** Gold per danger tier. */
  gold: number;
  materials: [Material, number][];
  /** Chance of an item. */
  item: number;
  /** Health restored to everyone (share of max). */
  heal?: number;
  /** Refills the Guildmaster's mana. */
  mana?: boolean;
  /** Undead guards wake when the party enters. */
  guards?: boolean;
}

export const SECRET_PATHS: SecretPath[] = [
  { kind: 'village', tribe: 'freeholders', label: 'a hidden village', biomes: ['plains', 'farm', 'hills'], sign: 'a cart track to a village that isn\'t on any map',
    take: 'knew the way: farm folk always do', arrive: 'The village welcomed fellow Freeholders with bread, beds and a fair trade.',
    gold: 16, materials: [['herbs', 3], ['hides', 2]], item: 0.45, heal: 0.35 },
  { kind: 'elfpath', tribe: 'thornkin', label: 'an elf-path', biomes: ['forest', 'snow'], sign: 'an elf-path only Thornkin eyes can see',
    take: 'parted the brambles and led the way', arrive: 'At the end of the elf-path: an old Thornkin cache, untouched for a century.',
    gold: 20, materials: [['wood', 5]], item: 0.55 },
  { kind: 'seam', tribe: 'ironroot', label: 'an ore seam', biomes: ['mountain', 'hills', 'ruins'], sign: 'a crack in the rock that smells of ore',
    take: 'sniffed the air and started tunnelling', arrive: 'The Ironroot opened a rich seam of ore. Everybody carried as much as they could.',
    gold: 10, materials: [['iron', 7], ['stone', 5]], item: 0.3 },
  { kind: 'lava', tribe: 'ashborn', label: 'a lava path', biomes: ['badlands'], sign: 'a path across cooling lava',
    take: 'strode out onto the lava as if it were a meadow', arrive: 'Across the lava field: a fire-opal cache and a forge-cooled blade.',
    gold: 26, materials: [['iron', 4]], item: 0.6 },
  { kind: 'wreck', tribe: 'fenfolk', label: 'a sunken wreck', biomes: ['marsh', 'coast', 'sea'], sign: 'the dark shape of a sunken wreck under the water',
    take: 'dived in without a second thought', arrive: 'The Fenfolk came up from the wreck with a dripping strongbox.',
    gold: 28, materials: [['hides', 2]], item: 0.55 },
  { kind: 'spiritgate', tribe: 'moonveil', label: 'a spirit gate', biomes: ['haunted', 'forest', 'ruins'], sign: 'a shimmer in the air: a spirit gate',
    take: 'sang the gate open', arrive: 'Beyond the spirit gate: a moonlit glade. Wounds closed, and the Guildmaster felt the magic flow again.',
    gold: 14, materials: [['herbs', 4]], item: 0.4, heal: 0.5, mana: true },
  { kind: 'eyrie', tribe: 'dawnwings', label: 'a cliff-top eyrie', biomes: ['mountain', 'snow', 'sky', 'hills'], sign: 'a cliff-top eyrie only fliers can reach',
    take: 'spread their wings and flew up the cliff', arrive: 'The eyrie held a griffin\'s hoard of shiny things, and the griffin was out.',
    gold: 24, materials: [['stone', 2]], item: 0.6 },
  { kind: 'crypt', tribe: 'hollowed', label: 'a sealed crypt', biomes: ['barrow', 'haunted', 'ruins'], sign: 'a sealed crypt whose dead still keep watch',
    take: 'knocked on the crypt door, politely', arrive: 'The crypt guardians let the Hollowed pass, but not everyone with them. Swords out!',
    gold: 32, materials: [['stone', 3]], item: 0.55, guards: true },
];

export const SECRET_BY_KIND: Record<SecretKind, SecretPath> = Object.fromEntries(SECRET_PATHS.map((p) => [p.kind, p])) as Record<SecretKind, SecretPath>;

/** Freeholders move faster on these (roads and farm tracks). */
export const ROAD_BIOMES: Biome[] = ['plains', 'farm'];
/** Thornkin move unseen through these. */
export const FOREST_BIOMES: Biome[] = ['forest', 'snow'];
