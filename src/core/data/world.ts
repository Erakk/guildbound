import type { Ability, Biome, EnemyDef, EnemyRole, RegionDef, SiegeKind } from '../types';
import { generateFrontier, TRAVEL_SEC } from './frontier';

type ERow = [id: string, name: string, family: string, role: EnemyRole, sprite: string, hp: number, atk: number, def: number, range: number, speed: number, rate: number, gold: number, xp: number, tint?: Record<string, string>];

// Regional variants reuse a base sprite with swapped colours.
const ASH_SKIN = { '#8DB04A': '#B0624A', '#7FA040': '#8E4A36' };
const FROST_SKIN = { '#8DB04A': '#9EC4D4', '#7FA040': '#7EA4B4', '#7A5A34': '#5E7A8A' };
const FROST_FUR = { '#7E848A': '#E6EEF2', '#8A9097': '#F4F8FA', '#6E7378': '#C6D4DC', '#5E6368': '#B0C0CA', '#4E5358': '#9EB0BC', '#E8423A': '#4AA8E8' };
const MAGMA_FUR = { '#7E848A': '#3A2A26', '#8A9097': '#4A3430', '#6E7378': '#2A1E1C', '#5E6368': '#2A1E1C', '#4E5358': '#FF7A3A', '#E8423A': '#FFD27A' };
const DROWNED = { '#EEE8DA': '#A8D0C8', '#8E2B23': '#2E5A6A', '#7FD9FF': '#B9FFE0', '#7A5A34': '#3E6A5A' };
const BANSHEE = { '#C9C4DC': '#D8B8F0', '#8E88B0': '#9A6AC8', '#7FF2C9': '#F2A8F0' };
const ICE_WRAITH = { '#C9C4DC': '#D8F0FA', '#8E88B0': '#7EB8D8', '#7FF2C9': '#B9F0FF' };
const STORM = { '#B9FFF0': '#FFF3A0', '#7FF2C9': '#FFE07A' };
const OGRE = { '#6E7E52': '#9A7458', '#8E9C6A': '#B08A6A', '#7E8E5E': '#A88062', '#4E7A34': '#6E4A28' };
const MILITIA = { '#6E3A2A': '#5E7A3A', '#2E2626': '#6E5034', '#4A3A30': '#8A6A44' };
const RIVAL = { '#6E3A2A': '#2E4A7A', '#2E2626': '#1E2A3E', '#4A3A30': '#3A4A60' };
const CULTIST = { '#6E3A2A': '#4A2E5E', '#2E2626': '#2A1A30', '#4A3A30': '#3A2448' };
// The Deep Marches' lords.
const FROST_WYRM = { '#A8342A': '#5E94C8', '#8E2B23': '#3E6A9A', '#7A2A20': '#2E5A8A', '#6E2A20': '#2E4A7A', '#5A1E18': '#1E3A5E', '#FF9A3C': '#B9F0FF', '#FFD27A': '#E6F6FF', '#FFF3A0': '#FFFFFF' };
const TITAN = { '#8A8676': '#5E5A66', '#9A947E': '#6E6A78', '#A6A08A': '#7A7684', '#B0AA94': '#86828E', '#6E6A5A': '#46424E', '#7FF2FF': '#FFB23A', '#7FD9E6': '#FF9A3C' };
const DREAD = { '#3E4A44': '#2E1E40', '#EEE8DA': '#D8D0F0', '#7FD9FF': '#C88AFF', '#E2B84A': '#B8B0D8' };
const LEVIATHAN = { '#4E6448': '#2E4E6A', '#6E8460': '#3E6A8A', '#7FA35A': '#5E94AA', '#F2D23A': '#B9FFE0' };
const ALPHA = { '#7E848A': '#4E4E58', '#8A9097': '#5E5E68', '#6E7378': '#3E3E46', '#5E6368': '#2E2E36', '#4E5358': '#E8E0D0', '#E8423A': '#FFD27A' };
const ELDER_WYRM = { '#A8342A': '#3A2E36', '#8E2B23': '#2A2028', '#7A2A20': '#241A22', '#6E2A20': '#1E161C', '#5A1E18': '#140E12', '#E8C86A': '#F2C84A', '#EDE2C8': '#F6E2A0' };
const DRAKE = { '#B8462A': '#4E7A3A', '#D87A2E': '#6E9A4A', '#C8682A': '#3E6A2E', '#E08A3A': '#8AB05A', '#F2C86A': '#D8E07A' };

const E: ERow[] = [
  ['goblin_spear', 'Goblin Spearman', 'Goblins', 'swarm', 'goblin', 34, 6, 2, 42, 95, 1.2, 4, 3],
  ['goblin_archer', 'Goblin Archer', 'Goblins', 'archer', 'goblin_archer', 26, 6, 1, 230, 90, 1.6, 5, 3],
  ['goblin_shaman', 'Goblin Shaman', 'Goblins', 'healer', 'goblin_shaman', 30, 4, 1, 200, 85, 2.0, 8, 5],
  ['ash_goblin', 'Ash Goblin', 'Goblins', 'swarm', 'goblin', 38, 7, 2, 42, 100, 1.1, 5, 4, ASH_SKIN],
  ['frost_goblin', 'Frost Goblin', 'Goblins', 'swarm', 'goblin', 40, 6, 3, 42, 90, 1.2, 5, 4, FROST_SKIN],
  ['dire_wolf', 'Dire Wolf', 'Beasts', 'beast', 'wolf', 48, 8, 3, 40, 150, 1.0, 3, 4],
  ['boar', 'Tusk Boar', 'Beasts', 'brute', 'boar', 70, 9, 5, 40, 120, 1.5, 3, 5],
  ['spider', 'Giant Spider', 'Beasts', 'skirmisher', 'spider', 40, 7, 2, 44, 130, 1.1, 4, 4],
  ['bandit', 'Bandit Cutthroat', 'Bandits', 'skirmisher', 'bandit', 46, 8, 3, 42, 105, 1.1, 9, 5],
  ['bandit_xbow', 'Bandit Crossbowman', 'Bandits', 'archer', 'bandit_xbow', 38, 9, 2, 250, 95, 2.0, 10, 5],
  ['skeleton', 'Skeleton', 'Undead', 'brute', 'skeleton', 52, 8, 4, 44, 85, 1.3, 6, 6],
  ['ghoul', 'Ghoul', 'Undead', 'skirmisher', 'ghoul', 55, 9, 3, 42, 120, 0.9, 6, 6],
  ['wraith', 'Wraith', 'Undead', 'caster', 'wraith', 40, 10, 2, 200, 95, 1.8, 8, 7],
  ['bog_lurker', 'Bog Lurker', 'Swamp horrors', 'brute', 'lurker', 80, 10, 4, 46, 75, 1.6, 7, 7],
  ['troll', 'Bog Troll', 'Trolls and giants', 'brute', 'troll', 130, 13, 6, 50, 80, 1.9, 12, 11],
  ['ogre', 'Hill Ogre', 'Trolls and giants', 'brute', 'troll', 120, 14, 5, 50, 85, 1.8, 12, 11, OGRE],
  ['wisp', "Will-o'-wisp", 'Spirits and fae', 'skirmisher', 'wisp', 26, 7, 1, 160, 140, 1.2, 5, 4],
  ['storm_wisp', 'Storm Wisp', 'Spirits and fae', 'skirmisher', 'wisp', 32, 9, 1, 170, 150, 1.2, 6, 5, STORM],
  ['banshee', 'Banshee', 'Spirits and fae', 'caster', 'wraith', 38, 9, 2, 210, 95, 1.8, 8, 7, BANSHEE],
  ['imp', 'Fire Imp', 'Fire and ash', 'caster', 'imp', 34, 9, 2, 190, 120, 1.5, 6, 6],
  ['magma_hound', 'Magma Hound', 'Fire and ash', 'beast', 'wolf', 56, 9, 4, 40, 145, 1.0, 5, 6, MAGMA_FUR],
  ['frost_wolf', 'Frost Wolf', 'Frost', 'beast', 'wolf', 54, 8, 4, 40, 150, 1.0, 4, 5, FROST_FUR],
  ['yeti', 'Yeti', 'Frost', 'brute', 'yeti', 110, 12, 5, 48, 85, 1.7, 10, 10],
  ['ice_wraith', 'Ice Wraith', 'Frost', 'caster', 'wraith', 40, 10, 2, 200, 95, 1.8, 8, 7, ICE_WRAITH],
  ['crab', 'Crab Knight', 'Sea and reef', 'brute', 'crab', 70, 8, 8, 42, 80, 1.4, 6, 6],
  ['drowned', 'Drowned Sailor', 'Sea and reef', 'brute', 'skeleton', 50, 8, 3, 44, 85, 1.3, 7, 6, DROWNED],
  ['golem', 'Rune Golem', 'Constructs', 'brute', 'golem', 140, 11, 10, 46, 70, 2.0, 14, 12],
  ['wyrmling', 'Wyrmling', 'Dragonkin', 'caster', 'whelp', 80, 13, 5, 170, 110, 1.7, 16, 14],
  ['cultist', 'Ash Cultist', 'Cultists', 'caster', 'bandit', 40, 10, 2, 200, 95, 1.7, 10, 8, CULTIST],
  // Corrupted areas: the heart of the gloom. Rooted to the spot (speed 0).
  ['gloom_heart', 'Gloom Heart', 'Spirits and fae', 'caster', 'gloom_heart', 220, 9, 6, 230, 0, 2.2, 30, 25],
  // Random events: a rival adventuring company.
  ['rival_blade', 'Rival Sellsword', 'Rivals', 'skirmisher', 'bandit', 60, 9, 5, 42, 105, 1.1, 14, 8, RIVAL],
  ['rival_bow', 'Rival Archer', 'Rivals', 'archer', 'bandit_xbow', 45, 9, 3, 240, 95, 1.8, 14, 8, RIVAL],
  // Barrow Uprising and the Bandit King's Hold.
  ['tomb', 'Barrow Tomb', 'Undead', 'brute', 'tomb', 220, 0, 8, 0, 0, 99, 0, 20],
  ['barrow_king', 'The Barrow King', 'Undead', 'brute', 'barrow_king', 600, 11, 8, 54, 85, 1.6, 180, 110],
  ['cage', 'Prisoner Cage', 'Bandits', 'brute', 'cage', 140, 0, 6, 0, 0, 99, 0, 5],
  ['bandit_king', 'The Bandit King', 'Bandits', 'skirmisher', 'bandit_king', 650, 14, 8, 50, 105, 1.3, 220, 110],
  ['militia', 'Freed Prisoner', 'Freed prisoners', 'brute', 'bandit', 60, 9, 4, 44, 100, 1.2, 0, 0, MILITIA],
  // The Cinder Legion.
  ['fire_elemental', 'Fire Elemental', 'Fire and ash', 'brute', 'fire_elemental', 90, 11, 6, 46, 90, 1.4, 12, 10],
  ['cinder_lord', 'The Cinder Lord', 'Fire and ash', 'brute', 'cinder_lord', 620, 11, 9, 60, 80, 1.7, 260, 140],
  // The skull regions' lords, and the lords of the Deep Marches.
  ['dragon', 'Elder Dragon', 'Dragonkin', 'caster', 'dragon', 1100, 20, 14, 190, 70, 2.6, 400, 300],
  ['frost_wyrm', 'Frost Wyrm', 'Dragonkin', 'caster', 'dragon', 1000, 18, 13, 190, 70, 2.6, 380, 280, FROST_WYRM],
  ['stone_titan', 'Stone Titan', 'Trolls and giants', 'brute', 'titan', 1200, 18, 16, 60, 60, 2.2, 360, 260, TITAN],
  ['dread_lord', 'The Dread Lord', 'Undead', 'caster', 'barrow_king', 850, 17, 10, 200, 85, 2.0, 360, 260, DREAD],
  ['leviathan', 'Leviathan', 'Sea and reef', 'brute', 'leviathan', 1150, 19, 12, 64, 65, 2.0, 360, 260, LEVIATHAN],
  ['alpha', 'The Grey Alpha', 'Beasts', 'beast', 'alpha', 800, 17, 9, 44, 150, 1.0, 340, 240, ALPHA],
  ['drake', 'Drake', 'Dragonkin', 'brute', 'drake', 120, 13, 7, 50, 100, 1.6, 18, 16, DRAKE],
  // The Siege of Dragonmaw.
  ['altar', 'Blood Altar', 'Cultists', 'brute', 'altar', 260, 0, 9, 0, 0, 99, 0, 25],
  ['elder_wyrm', 'Kalvorax the Elder Wyrm', 'Dragonkin', 'caster', 'elder_wyrm', 1500, 22, 15, 200, 70, 2.6, 600, 420, ELDER_WYRM],
  // The Goblin Fortress.
  ['wolf_rider', 'Goblin Wolf Rider', 'Goblins', 'skirmisher', 'wolf_rider', 60, 8, 3, 44, 165, 1.1, 7, 6],
  ['goblin_bomber', 'Goblin Bomber', 'Goblins', 'archer', 'goblin_bomber', 30, 9, 1, 190, 90, 2.4, 7, 5],
  ['ironguard', 'Goblin Ironguard', 'Goblins', 'brute', 'ironguard', 120, 11, 9, 46, 85, 1.5, 14, 12],
  ['warlord', 'Warlord Gnashgut', 'Goblins', 'brute', 'warlord', 650, 11, 8, 56, 95, 1.6, 200, 120],
  ['gate', 'Fortress Gate', 'Goblins', 'brute', 'gate', 500, 0, 12, 0, 0, 99, 0, 30],
  // Encounters on the trail: nests that keep sending out monsters, and a thief.
  ['spider_nest', 'Spider Nest', 'Beasts', 'brute', 'spider_nest', 100, 0, 5, 0, 0, 99, 6, 10],
  ['goblin_burrow', 'Goblin Burrow', 'Goblins', 'brute', 'burrow', 110, 0, 6, 0, 0, 99, 6, 10],
  ['crypt', 'Open Crypt', 'Undead', 'brute', 'tomb', 115, 0, 7, 0, 0, 99, 6, 10],
  ['cutpurse', 'Cutpurse', 'Bandits', 'skirmisher', 'cutpurse', 28, 0, 1, 0, 122, 99, 8, 4],
  ['mimic', 'Mimic', 'Mimics', 'brute', 'mimic', 110, 12, 6, 46, 70, 1.4, 10, 12],
  ['stag', 'White Stag', 'Beasts', 'beast', 'stag', 75, 0, 2, 0, 128, 99, 0, 20],
];

const EXTRA: Record<string, Partial<EnemyDef>> = {
  goblin_bomber: { splash: 55 },
  warlord: { boss: true },
  barrow_king: { boss: true },
  cinder_lord: { boss: true, splash: 60 },
  bandit_king: { boss: true },
  tomb: { structure: true },
  cage: { structure: true },
  dragon: { boss: true, splash: 80 },
  frost_wyrm: { boss: true, splash: 80 },
  stone_titan: { boss: true, splash: 50 },
  dread_lord: { boss: true, splash: 40 },
  leviathan: { boss: true, splash: 60 },
  alpha: { boss: true },
  altar: { structure: true },
  elder_wyrm: { boss: true, splash: 90 },
  gate: { structure: true },
  spider_nest: { structure: true },
  goblin_burrow: { structure: true },
  crypt: { structure: true },
};

export const ENEMIES: EnemyDef[] = E.map(([id, name, family, role, sprite, hp, atk, def, range, speed, attackRate, gold, xp, tint]) => ({
  id, name, family, role, sprite, hp, atk, def, range, speed, attackRate, gold, xp, tint, ...EXTRA[id],
}));

export const ENEMY_BY_ID: Record<string, EnemyDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

type Pool = [string, number][];
type RRow = [id: string, name: string, q: number, r: number, biome: Biome, art: string, tier: number, durationSec: number, pool: Pool, size: [number, number], groups: number, description: string, requires?: Ability];

// The Frontier Marches: rings of hex tiles around Greyford (0, 0). Ring = travel time; tier = danger.
const R: RRow[] = [
  // Ring 1 · near · 2-5 min
  ['greenhollow', 'Greenhollow', 1, -1, 'plains', 'plains', 1, 150, [['goblin_spear', 5], ['dire_wolf', 2], ['boar', 1]], [3, 4], 4, 'Rolling meadows just outside town. Goblin scouts and the odd wolf.'],
  ['oldmill', 'Old Mill Road', 1, 0, 'farm', 'farm', 1, 180, [['bandit', 4], ['bandit_xbow', 2], ['boar', 1]], [3, 4], 4, 'Farmland and a broken mill. Bandits prey on travellers here.'],
  ['brackenwood', 'Brackenwood', 0, -1, 'forest', 'forest', 2, 240, [['dire_wolf', 4], ['spider', 3], ['goblin_archer', 2]], [3, 4], 5, 'The edge of the old forest. Wolves hunt in packs; spiders wait above.'],
  ['saltshore', 'Salt Shore', -1, 0, 'coast', 'coast', 2, 220, [['crab', 4], ['bandit', 2], ['drowned', 1]], [3, 4], 5, 'Grey beaches and tide pools. Crab Knights guard their stretch of sand.'],
  ['reedwater', 'Reedwater', -1, 1, 'marsh', 'marsh', 2, 270, [['bog_lurker', 2], ['spider', 2], ['goblin_spear', 3]], [3, 4], 5, 'Reeds, pools and sucking mud. Something large moves under the water.'],
  ['watchtower', 'Old Watchtower', 0, 1, 'ruins', 'tower', 2, 250, [['skeleton', 3], ['bandit', 3], ['ghoul', 1]], [3, 4], 5, 'A broken tower on the south road. Bandits camp in it; the old garrison never left.'],
  // Ring 2 · far · 5-10 min
  ['cinderreach', 'Cinderreach', 2, 0, 'badlands', 'bad', 3, 480, [['imp', 4], ['magma_hound', 3], ['ash_goblin', 3]], [3, 5], 6, 'Black rock and lava cracks. Home of the Ashborn, and of things that like the heat.'],
  ['foothill', 'Foothill Mines', 2, -1, 'mountain', 'mine', 2, 360, [['goblin_spear', 3], ['goblin_archer', 2], ['golem', 1], ['troll', 1]], [3, 5], 6, 'Abandoned mine shafts. Goblins dig here now, and something guards the deep tunnels.'],
  ['ironspine', 'Ironspine', 2, -2, 'mountain', 'mtn', 3, 480, [['troll', 2], ['ogre', 2], ['goblin_spear', 2], ['frost_wolf', 1]], [3, 5], 6, 'The great mountains, home of the Ironroot. Trolls under the passes.'],
  ['frostpine', 'Frostpine Pass', 1, -2, 'snow', 'snowforest', 3, 450, [['frost_wolf', 4], ['yeti', 1], ['ice_wraith', 2], ['frost_goblin', 2]], [3, 5], 6, 'Snow-heavy pines and a high pass. The cold has teeth here.'],
  ['elderwood', 'Elderwood', 0, -2, 'forest', 'forest', 2, 360, [['dire_wolf', 3], ['spider', 3], ['wisp', 2], ['bandit', 1]], [4, 5], 6, 'The deep forest of the Thornkin. Lights drift between the trees at dusk.'],
  ['wolfden', 'Wolfden Hills', -1, -1, 'hills', 'hills', 2, 330, [['dire_wolf', 5], ['boar', 2], ['goblin_spear', 1]], [4, 5], 6, 'Grassy hills riddled with dens. The howling starts at sunset.'],
  ['saltglass', 'Saltglass Isles', -2, 0, 'sea', 'sea', 3, 420, [['crab', 4], ['drowned', 3], ['bog_lurker', 1]], [3, 5], 6, 'Islands across open water, only reachable by swimming. Wrecks full of treasure.', 'swim'],
  ['fen', 'Fen of Whispers', -2, 1, 'marsh', 'marsh', 2, 360, [['bog_lurker', 3], ['troll', 1], ['spider', 2], ['goblin_spear', 2]], [3, 5], 6, 'Home of the Fenfolk. The mist whispers names.'],
  ['abbey', 'Sunken Abbey', -2, 2, 'ruins', 'abbey', 3, 480, [['ghoul', 3], ['skeleton', 3], ['wraith', 2]], [3, 5], 6, 'A drowned abbey half swallowed by the marsh. The bells still ring at night.'],
  ['barrow', 'Barrow Fields', -1, 2, 'barrow', 'barrow', 3, 420, [['skeleton', 5], ['bandit', 1], ['goblin_archer', 1]], [3, 5], 6, 'Burial mounds where the dead do not rest. Grave robbers too.'],
  ['gloaming', 'The Gloaming', 0, 2, 'haunted', 'haunt', 3, 480, [['wisp', 3], ['banshee', 3], ['ghoul', 2]], [3, 5], 6, 'Twilight woods of the Moonveil. Not everything here is what it seems.'],
  ['warrens', 'Goblin Warrens', 1, 1, 'hills', 'warrens', 2, 360, [['goblin_spear', 6], ['goblin_archer', 3], ['goblin_shaman', 2], ['dire_wolf', 1]], [4, 6], 6, 'Burrows full of goblins. Big groups, shamans keeping them on their feet.'],
  // Ring 3 · distant · 10-20 min
  ['spires', 'Drifting Spires', 3, -3, 'sky', 'sky', 3, 600, [['storm_wisp', 4], ['golem', 2], ['wisp', 2]], [3, 5], 8, 'Floating islands above the peaks, home of the Dawnwings. Only fliers get up here.', 'fly'],
  ['deepdelve', 'Deepdelve', 2, -3, 'mountain', 'mine', 4, 720, [['golem', 3], ['goblin_spear', 3], ['troll', 2]], [4, 6], 9, 'Mines so deep only Ironroot tunnellers can find the way down.', 'tunnel'],
  ['glacier', 'Glacier Gate', 1, -3, 'snow', 'glacier', 3, 660, [['ice_wraith', 3], ['yeti', 2], ['frost_wolf', 3]], [3, 5], 8, 'An arch of ancient ice at the top of the world. Beyond it, colder still.'],
  ['stormcliff', 'Stormcliff', 0, -3, 'mountain', 'mtn', 4, 720, [['ogre', 3], ['troll', 2], ['golem', 1], ['storm_wisp', 2]], [4, 6], 9, 'Lightning-scarred peaks. Ogres throw boulders for fun.'],
  ['kingsroad', "Old King's Road", -1, -2, 'farm', 'farm', 3, 600, [['bandit', 4], ['bandit_xbow', 3], ['ogre', 1]], [4, 6], 8, 'The old royal road, long fallen to outlaws.'],
  ['hollowoaks', 'Hollow Oaks', -2, -1, 'forest', 'forest', 3, 630, [['wisp', 3], ['spider', 3], ['dire_wolf', 2], ['ghoul', 1]], [4, 5], 8, 'Ancient oaks, hollow and humming. The Thornkin will not camp here.'],
  ['shoals', 'Outer Shoals', -3, 0, 'sea', 'sea', 4, 720, [['crab', 3], ['drowned', 3], ['bog_lurker', 2]], [4, 6], 9, 'Reefs and sandbars far from shore. Swimmers only.', 'swim'],
  ['piratesrest', "Pirate's Rest", -3, 1, 'coast', 'coast', 3, 600, [['bandit', 4], ['bandit_xbow', 3], ['crab', 1]], [4, 6], 8, 'A smugglers\' cove with a lot of buried gold and very few honest people.'],
  ['reef', 'Drowned Reef', -3, 2, 'sea', 'reef', 4, 720, [['crab', 3], ['drowned', 4], ['bog_lurker', 2]], [4, 6], 9, 'A wrecked fleet on a coral reef. The sailors still crew it.', 'swim'],
  ['drownedcoast', 'Drowned Coast', -3, 3, 'coast', 'coast', 3, 630, [['drowned', 3], ['crab', 3], ['bandit', 1]], [4, 5], 8, 'Cliffs and shipwrecks. The tide brings in things that should stay out.'],
  ['witchlight', 'Witchlight Bog', -2, 3, 'haunted', 'haunt', 4, 720, [['wisp', 3], ['banshee', 3], ['bog_lurker', 2]], [4, 6], 9, 'A bog full of dancing lights. Follow them and you never come back.'],
  ['mirewood', 'Mirewood', -1, 3, 'marsh', 'marsh', 3, 630, [['bog_lurker', 3], ['troll', 2], ['spider', 2], ['wisp', 1]], [4, 5], 8, 'Drowned woods where trolls nap in the mud.'],
  ['cairnmoor', 'Cairn Moor', 0, 3, 'barrow', 'barrow', 4, 720, [['wraith', 3], ['skeleton', 3], ['ghoul', 2], ['cultist', 1]], [4, 6], 9, 'Standing stones and open graves. Someone is raising the dead on purpose.'],
  ['steppe', 'Howling Steppe', 1, 2, 'plains', 'plains', 3, 600, [['dire_wolf', 4], ['boar', 3], ['bandit', 2]], [4, 6], 8, 'Endless grass and endless wind. Wolf packs the size of war bands.'],
  ['thornback', 'Thornback Ridge', 2, 1, 'hills', 'hills', 3, 630, [['ogre', 2], ['troll', 1], ['goblin_spear', 3], ['goblin_shaman', 1]], [4, 6], 8, 'A spiny ridge where ogres keep goblins as servants.'],
  ['emberrift', 'Ember Rift', 3, 0, 'badlands', 'bad', 4, 720, [['magma_hound', 3], ['imp', 3], ['wyrmling', 1]], [4, 6], 9, 'A crack in the world full of fire. Young dragons come here to play.'],
  ['ashfall', 'Ashfall Waste', 3, -1, 'badlands', 'bad', 4, 720, [['imp', 3], ['cultist', 3], ['ash_goblin', 3]], [4, 6], 9, 'Grey ash to the horizon, and cultists chanting at the sky.'],
  ['crags', 'Wyrmling Crags', 3, -2, 'badlands', 'dragon', 4, 780, [['wyrmling', 3], ['imp', 2], ['cultist', 2]], [3, 5], 9, 'Black peaks and a nest of young dragons. The big one lives further out.'],
  // Ring 4 · places only one tribe can reach
  ['caldera', 'Cinder Caldera', 4, -1, 'badlands', 'bad', 4, 720, [['magma_hound', 3], ['imp', 3], ['ash_goblin', 2], ['wyrmling', 1]], [4, 6], 8, 'A crater of lava fields. Only Ashborn can walk across; the fire-opal veins are untouched.', 'lava'],
  ['veiledglade', 'The Veiled Glade', -1, 4, 'haunted', 'haunt', 4, 720, [['wisp', 3], ['storm_wisp', 2], ['banshee', 2]], [4, 6], 8, 'A glade hidden behind the Veil. Only the Moonveil can see it, let alone find the way in.', 'veil'],
  ['blightmoor', 'Blightmoor Crypts', 1, 3, 'barrow', 'barrow', 4, 720, [['skeleton', 4], ['wraith', 3], ['ghoul', 2], ['cultist', 1]], [4, 6], 8, 'Cursed ground that drains the living. The Hollowed can lead a party through, and the crypts are full.', 'cursed'],
  ['thornheart', 'Thornheart', -2, -2, 'forest', 'forest', 4, 720, [['spider', 4], ['dire_wolf', 3], ['wisp', 2]], [4, 6], 8, 'The oldest forest, thick with spiders and wolves. Only Thornkin can lead a party through unseen.', 'stealth'],
  // Skull regions (tier 5): heroes knocked out here can die for good. The design puts these in
  // rings 8-10; until those rings exist they sit in ring 4.
  ['dragonmaw', 'Dragonmaw', 4, -2, 'badlands', 'dragon', 5, 1200, [['wyrmling', 3], ['cultist', 2], ['magma_hound', 2]], [3, 5], 7, 'Black peaks above the Wyrmling Crags, and the lair of the elder dragon itself. The richest hoard in the Marches.'],
  ['bonewastes', 'The Bone Wastes', 0, 4, 'barrow', 'barrow', 5, 1080, [['wraith', 3], ['skeleton', 3], ['ghoul', 2], ['cultist', 1]], [4, 5], 8, 'A plain of bones where an old war never ended. The dead here do not stay down, and neither do they let you.'],
  ['whitesilence', 'The White Silence', 1, -4, 'snow', 'glacier', 5, 1080, [['yeti', 2], ['ice_wraith', 3], ['frost_wolf', 3]], [3, 5], 8, 'Beyond the Glacier Gate: endless white, and things that hunt by sound.'],
  // Ring 6 · the Cinder Legion, in the fire-lands east of Greyford.
  ['wyrmthrone', 'The Wyrm Throne', 9, -4, 'badlands', 'dragon', 9, 1500, [['drake', 3], ['cultist', 3], ['wyrmling', 2]], [4, 6], 2, 'The heart of the Dragonmaw range, far past the old lair: the black mountain the dragons of the Marches come from. Cultists keep blood altars at its foot, the brood nests on its slopes, and Kalvorax the Elder Wyrm sleeps on the greatest hoard in the world inside.'],
  ['cinderlegion', 'The Cinder Legion', 6, -1, 'badlands', 'bad', 6, 1200, [['imp', 3], ['magma_hound', 3], ['fire_elemental', 2], ['ash_goblin', 2]], [4, 6], 2, 'A burning plain where a legion of fire gathers around the Cinder Lord. The ground itself is catching light, and the fire keeps spreading.'],
  // Ring 4 · large battles
  ['kingsbarrow', 'The Barrow Uprising', -2, 4, 'barrow', 'barrow', 4, 1080, [['skeleton', 4], ['ghoul', 2], ['wraith', 2]], [3, 5], 3, 'An old king\'s barrow field where the dead are climbing out of their tombs. Seal the tombs before the whole field rises.'],
  ['banditking', "The Bandit King's Hold", -1, -3, 'farm', 'fort', 4, 1200, [['bandit', 4], ['bandit_xbow', 2], ['boar', 1], ['dire_wolf', 1]], [4, 6], 2, 'A stockade on the old royal road, where the Bandit King keeps his loot and his prisoners. Free them and they fight for you.'],
  ['gobfort', "Gnashgut's Fortress", 3, 1, 'hills', 'fort', 4, 1200, [['goblin_spear', 5], ['goblin_archer', 2], ['wolf_rider', 2], ['goblin_shaman', 1]], [4, 6], 2, 'A goblin fortress of stakes and stolen stone. Warlord Gnashgut rules about a hundred goblins from the keep.'],
];

/** Regions fought as sieges: camps, a gate to break, a horde, and a warlord in the keep. */
const SIEGES: Record<string, SiegeKind> = { gobfort: 'goblin_fortress', banditking: 'bandit_hold', kingsbarrow: 'barrow_uprising', cinderlegion: 'cinder_legion', wyrmthrone: 'dragonmaw' };
/** Skull regions, and the boss in each one's lair. */
const SKULLS: Record<string, string | undefined> = { dragonmaw: 'dragon', bonewastes: undefined, whitesilence: undefined, wyrmthrone: undefined };
/** How long a razed fortress takes to rebuild. */
export const FORT_REBUILD_MS = 14 * 24 * 3600 * 1000;

export function ringOf(q: number, r: number): number {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
}

const HAND_MADE: RegionDef[] = R.map(([id, name, q, r, biome, art, tier, durationSec, pool, groupSize, groups, description, requires]) => ({
  id, name, q, r, biome, art, tier, durationSec, travelSec: TRAVEL_SEC[ringOf(q, r)], groupSize, groups, description, requires, siege: SIEGES[id],
  skull: id in SKULLS || undefined, boss: SKULLS[id],
  ring: ringOf(q, r),
  enemyPool: pool.map(([eid, weight]) => ({ id: eid, weight })),
  goldPerGroup: [10 * tier, 18 * tier],
}));

/** The far Marches (rings 4-10): generated around the hand-made areas. Rings 8-10 are the Deep Marches. */
const FAR: RegionDef[] = generateFrontier(new Set(HAND_MADE.map((r) => `${r.q},${r.r}`)), new Set(HAND_MADE.map((r) => r.name))).map((f) => ({
  id: f.id, name: f.name, q: f.q, r: f.r, biome: f.biome, art: f.art, tier: f.tier, durationSec: f.durationSec, travelSec: f.travelSec,
  groupSize: f.size, groups: f.groups, description: f.description, requires: f.requires, skull: f.skull, boss: f.boss,
  ring: ringOf(f.q, f.r),
  enemyPool: f.pool.map(([eid, weight]) => ({ id: eid, weight })),
  goldPerGroup: [10 * f.tier, 18 * f.tier],
}));

export const REGIONS: RegionDef[] = [...HAND_MADE, ...FAR];

/**
 * How much stronger monsters are at a danger tier. Linear up to tier 4, then steeper: the far
 * rings are for endgame parties, and heroes keep growing past what a straight line would match.
 */
const DEEP_STEEP = 0.6;

export function tierScale(tier: number): number {
  const over = Math.max(0, tier - 4);
  // The Deep Marches (tiers 8-10) climb faster still: they are made for awakened heroes.
  const deep = Math.max(0, tier - 7);
  return 1 + 0.7 * (tier - 1) + 0.15 * over + 0.15 * over * over + DEEP_STEEP * deep * deep;
}

/**
 * Party power (heroes plus gear) at which a trip at this danger tier is comfortable: in test runs
 * a party this strong comes home every time, usually with nobody knocked out. About 15% under it
 * is risky; further under, expect retreats (and in skull areas, deaths).
 */
export const RECOMMENDED = [0, 400, 480, 800, 1100, 1300, 1600, 2000, 2800, 3500, 4200];
export function recommendedPower(tier: number): number {
  return RECOMMENDED[Math.max(1, Math.min(RECOMMENDED.length - 1, tier))];
}

export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/** Region ids explored at the start of a new game. */
export const START_EXPLORED = ['greenhollow'];

export const ABILITY_TRIBE: Record<Ability, { tribe: string; name: string; verb: string }> = {
  swim: { tribe: 'fenfolk', name: 'Fenfolk', verb: 'swim there' },
  fly: { tribe: 'dawnwings', name: 'Dawnwings', verb: 'fly there' },
  tunnel: { tribe: 'ironroot', name: 'Ironroot', verb: 'tunnel down' },
  lava: { tribe: 'ashborn', name: 'Ashborn', verb: 'cross the lava fields' },
  veil: { tribe: 'moonveil', name: 'Moonveil', verb: 'pass through the Veil' },
  cursed: { tribe: 'hollowed', name: 'Hollowed', verb: 'walk the cursed ground' },
  stealth: { tribe: 'thornkin', name: 'Thornkin', verb: 'slip through unseen' },
};

/** Map badge colour and symbol for each ability gate. */
export const ABILITY_BADGE: Record<Ability, [string, string]> = {
  swim: ['#3D6178', '≈'], fly: ['#B8963C', '^'], tunnel: ['#5F646D', '⛏'],
  lava: ['#B4583A', '▲'], veil: ['#5E4E8C', '☾'], cursed: ['#3E4A44', '✝'], stealth: ['#4F7A3A', '♣'],
};


