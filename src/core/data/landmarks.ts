// Landmarks and hazards: what makes one trail different from the next.
//
// A landmark is a set piece beside the trail: every hand-made area has a signature one (the broken mill on
// Old Mill Road, the Elder Tree in Elderwood), and longer trips and the generated far rings add landmarks
// of their biome. The party gets something small out of passing it, and some tribes get more.
//
// A hazard is a stretch of the trail itself: mud, brambles, a ford, snowdrifts, fog. It slows the party
// or wears on it for a while, the seasons change it, and some tribes shrug it off.

import type { Biome, Material, Tribe } from '../types';
import type { Season } from '../time';

export type LandmarkEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'morale'; amount: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'mats'; mat: Material; amount: number }
  | { kind: 'warn'; amount: number }
  | { kind: 'xp'; amount: number }
  | { kind: 'mana'; amount: number }
  | { kind: 'atk'; amount: number };

export interface LandmarkDef {
  id: string;
  name: string;
  /** Which picture to draw (see art/landmarks). */
  art: string;
  /** On the plate: what it is. */
  text: string;
  /** Told when the party passes it. */
  pass: string;
  effect: LandmarkEffect;
  /** On the plate afterwards: what came of it. */
  outcome: string;
  /** A tribe that gets more out of it. */
  tribe?: { tribe: Tribe; pass: string; effect: LandmarkEffect; outcome: string };
  shout?: string;
}

const L = (id: string, name: string, art: string, text: string, pass: string, effect: LandmarkEffect, outcome: string, extra: Partial<LandmarkDef> = {}): LandmarkDef =>
  ({ id, name, art, text, pass, effect, outcome, ...extra });

/** Each hand-made area's own landmark. */
export const AREA_LANDMARKS: Record<string, LandmarkDef> = {
  greenhollow: L('pasture', 'Sheep pasture', 'pasture', 'A shepherd and his flock. Friendly faces.', 'The sheep scattered as the party passed. The shepherd laughed and waved them on with a skin of milk.', { kind: 'heal', amount: 0.1 }, 'Milk and a wave', { shout: 'Baa!' }),
  oldmill: L('mill', 'The broken mill', 'mill', 'The miller\'s family still lives in the loft. They see a long way.', 'The miller\'s daughter leaned out of the loft: "Bandits by the bend!" The party was ready for them.', { kind: 'warn', amount: 0.15 }, 'Warned of bandits ahead', { shout: 'Thanks!' }),
  brackenwood: L('struckoak', 'Lightning-struck oak', 'oak', 'Split in two by a storm. Good dry firewood.', 'The party gathered dry wood from the split oak.', { kind: 'mats', mat: 'wood', amount: 3 }, 'Dry firewood', {
    tribe: { tribe: 'thornkin', pass: 'The Thornkin laid their hands on the old oak and spoke to it. Something in the forest eased.', effect: { kind: 'heal', amount: 0.2 }, outcome: 'The oak remembered the Thornkin' } }),
  saltshore: L('whalebones', 'Whale bones', 'bones', 'A great whale, long dead, bleached by the sea.', 'Among the whale bones: a lump of ambergris, worth good gold in town.', { kind: 'gold', amount: 8 }, 'Ambergris'),
  reedwater: L('beaverdam', 'Beaver dam', 'dam', 'A dam across the stream, busy with beavers.', 'The party crossed on the beavers\' dam, dry-footed, and took a few loose logs.', { kind: 'mats', mat: 'wood', amount: 2 }, 'A dry crossing', {
    tribe: { tribe: 'fenfolk', pass: 'The Fenfolk chatted with the beavers. The beavers showed them a shortcut, and the whole party cheered up.', effect: { kind: 'morale', amount: 12 }, outcome: 'Friends among the beavers' } }),
  watchtower: L('towertop', 'The tower\'s lookout', 'tower', 'From the top you can see the whole south road.', 'A hero climbed the lookout and spotted what waited ahead.', { kind: 'warn', amount: 0.15 }, 'The way ahead, spotted', { shout: 'I see them!' }),
  cinderreach: L('lavafalls', 'Lava falls', 'lavafall', 'Molten rock pouring over a black cliff.', 'Heat rolled off the lava falls. The party gave them a wide berth, and learned the land a little.', { kind: 'xp', amount: 10 }, 'A lesson in heat', {
    tribe: { tribe: 'ashborn', pass: 'The Ashborn stood in the heat of the falls and came back burning bright.', effect: { kind: 'atk', amount: 0.08 }, outcome: 'Ashborn fire, rekindled' } }),
  foothill: L('mineshaft', 'Old mine shaft', 'mine', 'An abandoned shaft. There\'s still ore in the walls.', 'The party chipped ore from the old shaft\'s walls.', { kind: 'mats', mat: 'iron', amount: 3 }, 'Ore from the old shaft'),
  ironspine: L('waystone', 'Ironroot waystone', 'runestone', 'A rune-cut stone marking the old dwarf roads.', 'The party rested at the waystone.', { kind: 'heal', amount: 0.1 }, 'A rest at the waystone', {
    tribe: { tribe: 'ironroot', pass: 'The Ironroot read the runes aloud: a blessing for travellers, and every wound eased.', effect: { kind: 'heal', amount: 0.3 }, outcome: 'The runes blessed the party' } }),
  frostpine: L('icefall', 'Frozen waterfall', 'waterfall', 'A waterfall caught in ice mid-fall.', 'The party stopped to stare at the frozen falls. Spirits lifted.', { kind: 'morale', amount: 8 }, 'A sight worth the cold'),
  elderwood: L('eldertree', 'The Elder Tree', 'oak', 'The oldest tree in the forest. The Thornkin say it listens.', 'The party rested in the Elder Tree\'s shade.', { kind: 'heal', amount: 0.15 }, 'Rest in the shade', {
    tribe: { tribe: 'thornkin', pass: 'The Thornkin sang to the Elder Tree, and it sang back. Every wound in the party closed.', effect: { kind: 'heal', amount: 0.4 }, outcome: 'The Elder Tree\'s blessing' } }),
  wolfden: L('denrock', 'Den rock', 'cairn', 'A rock the wolves howl from. Fresh tracks everywhere.', 'From the den rock, the party worked out where the pack would strike.', { kind: 'warn', amount: 0.12 }, 'The pack\'s ambush, read'),
  saltglass: L('wreck', 'Old shipwreck', 'wreck', 'A merchant ship on the rocks, long picked over. Long, but not quite.', 'The swimmers found a forgotten strongbox in the wreck\'s hold.', { kind: 'gold', amount: 12 }, 'A forgotten strongbox'),
  fen: L('whisperstones', 'Whispering stones', 'stones', 'Stones in the mist that whisper names.', 'The stones whispered to the Guildmaster: power, freely given.', { kind: 'mana', amount: 40 }, 'Mana from the mist', {
    tribe: { tribe: 'fenfolk', pass: 'The stones whispered the names of Fenfolk heroes of old. Their descendants stood taller.', effect: { kind: 'morale', amount: 15 }, outcome: 'Names of the old heroes' } }),
  abbey: L('belltower', 'The drowned bell tower', 'bell', 'The abbey\'s bell tower, leaning out of the marsh.', 'The bell tolled once as the party passed. Nobody had touched it. They learned something about the dead here.', { kind: 'xp', amount: 12 }, 'The bell tolled', { shout: 'Who rang that?' }),
  barrow: L('kingscairn', 'King\'s cairn', 'cairn', 'A tall cairn over an old king. Nobody robs this one.', 'The party paid its respects at the king\'s cairn.', { kind: 'morale', amount: 6 }, 'Respects paid', {
    tribe: { tribe: 'hollowed', pass: 'The Hollowed knew this king\'s name. They spoke it, and the cairn seemed to answer.', effect: { kind: 'xp', amount: 20 }, outcome: 'An old king remembered' } }),
  gloaming: L('moonpool', 'Moonpool', 'pool', 'A still pool that shows the moon even at noon.', 'The Guildmaster\'s power drank from the moonpool.', { kind: 'mana', amount: 40 }, 'Moonlight in a pool', {
    tribe: { tribe: 'moonveil', pass: 'The Moonveil bathed in the moonpool and came out shining.', effect: { kind: 'heal', amount: 0.3 }, outcome: 'Moonveil, renewed' } }),
  warrens: L('gobtotem', 'Goblin totem', 'totem', 'A totem of skulls and feathers. The goblins pray to it.', 'The party knocked the totem down. The goblins ahead saw, and lost heart.', { kind: 'warn', amount: 0.2 }, 'Totem toppled', { shout: 'Timber!' }),
  spires: L('floatgarden', 'Floating rock garden', 'floatrock', 'Boulders drifting in the air, wrapped in vines.', 'Between the floating rocks the air hummed with power.', { kind: 'mana', amount: 35 }, 'Air full of power'),
  deepdelve: L('dwarfdoor', 'Dwarven door', 'door', 'A stone door in the mountain, ajar for a hundred years.', 'Behind the dwarven door: an old forge store, still stocked.', { kind: 'mats', mat: 'iron', amount: 5 }, 'An old forge store'),
  glacier: L('icearch', 'The Glacier Gate', 'arch', 'An arch of ancient ice at the top of the world.', 'Under the Glacier Gate the party felt very small, and learned something from it.', { kind: 'xp', amount: 15 }, 'Very small, very wise'),
  stormcliff: L('stormrod', 'Lightning-scarred pillar', 'pillar', 'A stone pillar glassy from a thousand strikes.', 'Static crackled on every blade near the pillar. The party hits harder now.', { kind: 'atk', amount: 0.06 }, 'Charged blades'),
  kingsroad: L('kingstatue', 'Fallen king\'s statue', 'statue', 'A king of the Marches, face-down by his own road.', 'The party set the old king\'s head upright. Small things lift spirits.', { kind: 'morale', amount: 10 }, 'The king looks up again'),
  hollowoaks: L('hollowhum', 'The humming hollow', 'oak', 'A hollow oak that hums like a choir.', 'The humming filled the Guildmaster with power.', { kind: 'mana', amount: 35 }, 'A humming in the bones'),
  shoals: L('shoallight', 'Ruined lighthouse', 'lighthouse', 'A lighthouse on a sandbar, its lamp long dark.', 'From the lighthouse gallery the swimmers spotted what lurked in the shallows.', { kind: 'warn', amount: 0.15 }, 'The shallows, spotted'),
  piratesrest: L('lookout', 'Smugglers\' lookout', 'tower', 'A lookout post, and a loose stone where smugglers hide coin.', 'Behind the loose stone: a smuggler\'s purse.', { kind: 'gold', amount: 12 }, 'A smuggler\'s purse'),
  reef: L('coralarch', 'Coral arch', 'arch', 'A great arch of living coral.', 'Sea herbs grew thick on the coral arch.', { kind: 'mats', mat: 'herbs', amount: 4 }, 'Sea herbs'),
  drownedcoast: L('cliffhouse', 'Lighthouse on the cliffs', 'lighthouse', 'The keeper still lights the lamp, though no ships come.', 'The old keeper told them what the tide had brought in.', { kind: 'warn', amount: 0.15 }, 'The keeper\'s warning'),
  witchlight: L('witchhut', 'Witch\'s hut', 'hut', 'A hut on chicken legs. Nobody home. Probably.', 'The witch left tea brewing. It did the Guildmaster a world of good.', { kind: 'mana', amount: 50 }, 'Witch\'s tea'),
  mirewood: L('sleepingtroll', 'Sleeping troll', 'troll', 'A troll asleep in the mud. Please don\'t wake it.', 'The party tiptoed past the sleeping troll. Nobody breathed. They learned a lot about being quiet.', { kind: 'xp', amount: 12 }, 'Tiptoed past', { shout: 'Shhh!' }),
  cairnmoor: L('cairnring', 'Ring of cairns', 'stones', 'Cairns in a circle, every one opened from the inside.', 'The party studied the opened cairns and learned how the dead were raised.', { kind: 'xp', amount: 15 }, 'How the dead were raised'),
  steppe: L('milestone', 'Lone milestone', 'milestone', '"Greyford, 40 leagues." Someone has added rude words.', 'The party read the rude words on the milestone and laughed all the way to the next fight.', { kind: 'morale', amount: 10 }, 'A good laugh'),
  thornback: L('ogrepot', 'Ogre\'s cooking pot', 'pot', 'A pot big enough to bathe in. Something is still in it.', 'In the bottom of the ogre\'s pot: coins, rings and buttons.', { kind: 'gold', amount: 10 }, 'Coins in the pot', { shout: 'Ew.' }),
  emberrift: L('eggshells', 'Wyrm eggshells', 'nest', 'Shells of hatched dragon eggs, hard as steel.', 'Dragon eggshell makes fine armour plates. The party took what it could carry.', { kind: 'mats', mat: 'hides', amount: 4 }, 'Eggshell plates'),
  ashfall: L('coldaltar', 'A cold altar', 'altar', 'A cultist altar, the fire out. For now.', 'Ash on the altar showed where the cultists went. The party knew what to expect.', { kind: 'warn', amount: 0.15 }, 'The cultists\' trail'),
  crags: L('wyrmnest', 'Abandoned wyrm nest', 'nest', 'A wyrmling nest, empty. The young ones hoard shiny things.', 'The wyrmlings\' hoard: buttons, spoons and real gold.', { kind: 'gold', amount: 14 }, 'A wyrmling hoard'),
};

/** Landmarks any area of a biome can have (the far rings, and a second one on longer trips). */
export const BIOME_LANDMARKS: Record<Biome, LandmarkDef[]> = {
  plains: [L('p_milestone', 'Old milestone', 'milestone', 'A mossy milestone. The town carved on it no longer exists.', 'The party rested against the old milestone.', { kind: 'heal', amount: 0.1 }, 'A short rest'), L('p_windmill', 'Windmill', 'mill', 'A windmill still turning, its miller long gone.', 'Flour sacks in the windmill: a tidy sum in town.', { kind: 'gold', amount: 6 }, 'Flour to sell')],
  farm: [L('f_scarecrow', 'Scarecrow', 'statue', 'A scarecrow in a knight\'s old helmet.', 'The party saluted the scarecrow knight. It felt right.', { kind: 'morale', amount: 6 }, 'Saluted'), L('f_mill', 'Watermill', 'mill', 'A watermill, its wheel creaking.', 'The miller paid the party to scare off whatever was in his barn.', { kind: 'gold', amount: 8 }, 'The miller\'s coin')],
  forest: [L('fo_oak', 'Great oak', 'oak', 'An oak older than the guild.', 'The party rested under the great oak.', { kind: 'heal', amount: 0.12 }, 'Shade and rest'), L('fo_shrine', 'Moss-covered statue', 'statue', 'A statue of a forgotten forest god.', 'The party left a flower at the statue\'s feet.', { kind: 'morale', amount: 8 }, 'A flower left')],
  marsh: [L('m_dam', 'Beaver dam', 'dam', 'A dam across the stream.', 'A dry crossing on the dam, and a few loose logs.', { kind: 'mats', mat: 'wood', amount: 2 }, 'A dry crossing'), L('m_stones', 'Sunken stones', 'stones', 'Standing stones half under the water.', 'The stones hummed with old power.', { kind: 'mana', amount: 30 }, 'Old power')],
  hills: [L('h_cairn', 'Hill cairn', 'cairn', 'A cairn on the hilltop, looking far.', 'From the cairn the party could see the next ambush coming.', { kind: 'warn', amount: 0.12 }, 'Ambush spotted'), L('h_tower', 'Beacon tower', 'tower', 'An old beacon tower.', 'The beacon\'s store still held some coin.', { kind: 'gold', amount: 8 }, 'Beacon store')],
  barrow: [L('b_cairn', 'Opened grave', 'cairn', 'An open grave, its stone pushed aside.', 'The party studied the grave and learned how the dead walk here.', { kind: 'xp', amount: 12 }, 'Studied the dead'), L('b_stones', 'Stone circle', 'stones', 'A ring of standing stones.', 'The circle hummed with power.', { kind: 'mana', amount: 30 }, 'Power in the circle')],
  coast: [L('c_light', 'Lighthouse', 'lighthouse', 'A lighthouse on the rocks.', 'From the gallery, the keeper pointed out what lay ahead.', { kind: 'warn', amount: 0.12 }, 'Danger spotted'), L('c_wreck', 'Wreck on the beach', 'wreck', 'A broken hull on the sand.', 'A purse in the wreck\'s cabin.', { kind: 'gold', amount: 10 }, 'A purse')],
  sea: [L('s_wreck', 'Sunken wreck', 'wreck', 'A ship under the waves.', 'The swimmers found coin in the wreck.', { kind: 'gold', amount: 12 }, 'Sunken coin'), L('s_arch', 'Coral arch', 'arch', 'Living coral in an arch.', 'Sea herbs from the coral.', { kind: 'mats', mat: 'herbs', amount: 4 }, 'Sea herbs')],
  mountain: [L('mo_door', 'Sealed dwarf door', 'door', 'A rune-sealed door in the cliff.', 'Behind the door: an old ore store.', { kind: 'mats', mat: 'iron', amount: 4 }, 'An ore store'), L('mo_mine', 'Mine entrance', 'mine', 'A mine, abandoned in a hurry.', 'Ore left in the carts.', { kind: 'mats', mat: 'stone', amount: 4 }, 'Ore in the carts')],
  snow: [L('sn_fall', 'Frozen waterfall', 'waterfall', 'A waterfall caught in the ice.', 'The party stopped to stare.', { kind: 'morale', amount: 8 }, 'A sight to see'), L('sn_arch', 'Ice arch', 'arch', 'An arch of blue ice.', 'Under the arch, the cold seemed to teach them something.', { kind: 'xp', amount: 12 }, 'A cold lesson')],
  badlands: [L('ba_fall', 'Lava falls', 'lavafall', 'Fire pouring over a cliff.', 'The heat hardened the party\'s resolve.', { kind: 'xp', amount: 12 }, 'Hardened'), L('ba_bones', 'Giant\'s bones', 'bones', 'The bones of something enormous.', 'A ring on a finger bone the size of a door.', { kind: 'gold', amount: 12 }, 'A giant\'s ring')],
  haunted: [L('ha_pool', 'Still pool', 'pool', 'A pool that reflects the wrong sky.', 'The Guildmaster drew power from the pool.', { kind: 'mana', amount: 40 }, 'Power from the pool'), L('ha_hut', 'Abandoned hut', 'hut', 'A hut with the door open and the fire lit.', 'Somebody\'s tea, still warm. The party drank it.', { kind: 'heal', amount: 0.15 }, 'Someone\'s tea')],
  sky: [L('sk_rocks', 'Drifting boulders', 'floatrock', 'Boulders hanging in the air.', 'The air between them crackled with power.', { kind: 'mana', amount: 35 }, 'Crackling air'), L('sk_pillar', 'Storm pillar', 'pillar', 'A pillar struck by lightning, still humming.', 'Blades crackle near the pillar. The party hits harder now.', { kind: 'atk', amount: 0.05 }, 'Charged blades')],
  ruins: [L('r_statue', 'Toppled statue', 'statue', 'A hero of old, face in the dirt.', 'The party set the statue upright.', { kind: 'morale', amount: 8 }, 'Set upright'), L('r_tower', 'Broken tower', 'tower', 'A tower with one wall left.', 'From the top, the way ahead was clear.', { kind: 'warn', amount: 0.12 }, 'The way ahead')],
};

/** Every landmark by id. */
export const LANDMARK_BY_ID: Record<string, LandmarkDef> = Object.fromEntries(
  [...Object.values(AREA_LANDMARKS), ...Object.values(BIOME_LANDMARKS).flat()].map((d) => [d.id, d]),
);

// ---- Hazards ----

export type HazardKind = 'mud' | 'brambles' | 'bog' | 'ford' | 'ice' | 'scree' | 'snowdrift' | 'heat' | 'fog' | 'rubble' | 'gusts';

export interface HazardDef {
  name: string;
  /** On the plate. */
  text: string;
  /** Told when the party reaches it. */
  enter: string;
  /** Walking speed while on it. */
  speed: number;
  /** Damage per second to each hero (fraction of max health) while on it. */
  hurt?: number;
  /** No resting while walking on it. */
  noRest?: boolean;
  /** One knock for a random hero on entering (fraction of max health). */
  knock?: number;
  /** Monsters standing in it hit this much harder. */
  ambush?: number;
  /** A tribe that doesn't mind it at all. */
  tribe?: Tribe;
}

export const HAZARDS: Record<HazardKind, HazardDef> = {
  mud: { name: 'Muddy ground', text: 'Slow going. Freeholders know these roads.', enter: 'The trail turned to mud. Slow going.', speed: 0.6, tribe: 'freeholders' },
  brambles: { name: 'Bramble thicket', text: 'Thorns scratch everyone but the Thornkin.', enter: 'Brambles closed over the trail. Everyone got scratched.', speed: 0.8, hurt: 0.006, tribe: 'thornkin' },
  bog: { name: 'Sucking bog', text: 'Very slow, except for Fenfolk.', enter: 'The ground sucked at every boot.', speed: 0.5, tribe: 'fenfolk' },
  ford: { name: 'River ford', text: 'Wading across: slow, and cold.', enter: 'The party waded the ford, packs held high.', speed: 0.65, tribe: 'fenfolk' },
  ice: { name: 'Frozen ford', text: 'The river froze: quick going on the ice.', enter: 'The river had frozen. The party slid across in no time.', speed: 1.3 },
  scree: { name: 'Scree slope', text: 'Loose rock: slow, and stones fall.', enter: 'Loose scree. A stone came bouncing down the slope.', speed: 0.75, knock: 0.1, tribe: 'ironroot' },
  snowdrift: { name: 'Snowdrifts', text: 'Deep snow: very slow, no rest.', enter: 'Snow up to the knees.', speed: 0.55, noRest: true, tribe: 'ironroot' },
  heat: { name: 'Lava field', text: 'Heat haze: no rest, a little burning. Ashborn thrive.', enter: 'Heat shimmered off the black rock.', speed: 0.85, hurt: 0.004, noRest: true, tribe: 'ashborn' },
  fog: { name: 'Fog bank', text: 'Monsters in the fog strike harder.', enter: 'Fog rolled over the trail. Shapes moved in it.', speed: 0.9, ambush: 0.2, tribe: 'moonveil' },
  rubble: { name: 'Rubble', text: 'Fallen stone everywhere: slow climbing.', enter: 'The party climbed over fallen stone.', speed: 0.7, tribe: 'ironroot' },
  gusts: { name: 'Wind gusts', text: 'Strong winds: slow, unless you have wings.', enter: 'The wind howled across the trail.', speed: 0.7, tribe: 'dawnwings' },
};

/** The hazard a trail in this biome has, in this season (null: none this time). */
export function hazardFor(biome: Biome, season: Season): HazardKind | null {
  switch (biome) {
    case 'plains': return season === 'winter' ? 'snowdrift' : season === 'summer' ? null : 'mud';
    case 'farm': return season === 'winter' ? 'snowdrift' : season === 'summer' ? null : 'mud';
    case 'forest': return 'brambles';
    case 'marsh': return season === 'winter' ? 'ice' : 'bog';
    case 'coast': return season === 'winter' ? 'ice' : 'ford';
    case 'sea': return 'gusts';
    case 'hills': return season === 'winter' ? 'snowdrift' : 'scree';
    case 'mountain': return season === 'winter' ? 'snowdrift' : 'scree';
    case 'snow': return 'snowdrift';
    case 'badlands': return 'heat';
    case 'barrow': return 'fog';
    case 'haunted': return 'fog';
    case 'ruins': return 'rubble';
    case 'sky': return 'gusts';
  }
}
