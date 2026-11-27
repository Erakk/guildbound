// Hidden habits: what each hero does with their time in Greyford. Nothing in the game lists these; you find
// out by watching the town. A habit is a set of favourite spots (with how much the hero likes each, and what
// they do there), how long they linger, and how fast they walk. Spots need their building: nobody drinks at
// the Tavern before it is built, so a hero whose haunts are not there yet makes do with the rest.

export type SpotId =
  | 'square' | 'well' | 'board' | 'guild' | 'steps' | 'dummy' | 'tavern' | 'barrels' | 'forge' | 'armorer' | 'market'
  | 'temple' | 'templeSteps' | 'tower' | 'towerFoot' | 'townhall' | 'stables' | 'gate' | 'outside' | 'oldTree' | 'graves' | 'southRoad';

export type Emote = 'zz' | 'ale' | 'sword' | 'hammer' | 'shield' | 'coin' | 'pray' | 'star' | 'book' | 'horse' | 'look' | 'chat' | 'music' | 'heart' | 'flower' | 'fish' | 'bandage';

export interface Habit {
  /** What the town has noticed about them (shown when you hover over them in town). */
  text: string;
  /** Favourite spots: [spot, how much they like it, what they do there (else the spot's usual)]. */
  spots: [SpotId, number, Emote?][];
  /** How long they linger at a spot, in seconds. */
  stay: [number, number];
  /** Walking speed (scene units per second). */
  pace: number;
  /** Stays out after dark instead of heading indoors. */
  nightOwl?: boolean;
}

const H = (text: string, spots: Habit['spots'], stay: Habit['stay'] = [10, 22], pace = 30, nightOwl = false): Habit => ({ text, spots, stay, pace, nightOwl });

export const HABITS: Record<string, Habit> = {
  // Ironroot
  brannoc: H('Never far from the forge. Dozes on the bench there, and claims he is listening to the anvil.', [['forge', 5, 'zz'], ['dummy', 2, 'sword'], ['square', 1]], [22, 45], 22),
  hilda: H('Reads the runes on the Temple steps and the old stones by the Mage Tower.', [['templeSteps', 3, 'book'], ['towerFoot', 2, 'book'], ['well', 1]], [14, 28], 26),
  dorrik: H('Pokes about the smithy and the gate, looking for something to blow up.', [['forge', 3, 'hammer'], ['gate', 2, 'look'], ['outside', 1, 'look'], ['dummy', 1]], [5, 12], 40),
  grimgar: H('Haggles with the armourer and the smith over every bolt.', [['armorer', 2, 'shield'], ['forge', 2, 'hammer'], ['gate', 1, 'look']], [12, 24], 28),
  varra: H('Keeps watch at the gate as if the guild were a hold under siege.', [['gate', 3, 'look'], ['steps', 2, 'chat'], ['square', 1]], [16, 30], 26),
  torvald: H('Prays at the Temple, then hits the training dummy until it begs.', [['templeSteps', 3, 'pray'], ['dummy', 2, 'sword'], ['temple', 1]], [12, 24], 26),
  bruni: H('Parks himself by the Tavern barrels and tells the same dragon story to anyone.', [['barrels', 4, 'ale'], ['forge', 2, 'hammer'], ['square', 1, 'chat']], [18, 36], 24),
  runa: H('Lives in the Mage Tower, reading. Comes out to copy the notices down, letter by letter.', [['tower', 4], ['board', 2, 'book'], ['townhall', 1, 'book']], [16, 32], 28, true),
  // Freeholders
  mirela: H('Slips into the Temple to tend the lamps, and sits alone under the old tree.', [['temple', 3], ['oldTree', 1, 'star'], ['well', 1]], [14, 28], 26),
  edric: H('Drills at the dummy every morning, then waits at the Town Hall to be noticed.', [['dummy', 3, 'sword'], ['townhall', 2, 'look'], ['gate', 1, 'look']], [12, 22], 30),
  rowan: H('Drifts around the market. Purses get lighter when Rowan drifts past.', [['market', 4, 'coin'], ['barrels', 2, 'ale'], ['square', 1, 'coin']], [8, 16], 38),
  tamsin: H('Sings at the well for coins, and wanders off after any interesting noise.', [['well', 3, 'music'], ['tavern', 2], ['board', 1, 'book'], ['square', 1, 'music'], ['outside', 1, 'look']], [6, 14], 36, true),
  gwen: H('Blesses travellers at the gate, then prays on the Temple steps.', [['gate', 2, 'pray'], ['templeSteps', 2, 'pray'], ['square', 1, 'chat']], [12, 24], 28),
  aldric: H('Holds court at the Tavern barrels. Children follow him through the square.', [['barrels', 2, 'chat'], ['townhall', 2, 'chat'], ['square', 2, 'chat'], ['dummy', 1, 'sword']], [16, 30], 24),
  marta: H('Lingers at the Town Hall as if it were hers by right, and shops like it too.', [['townhall', 3, 'look'], ['market', 2, 'coin'], ['tavern', 1]], [12, 24], 28),
  // Thornkin
  lyra: H('Climbs out past the gate to watch the treeline, or sits under the old tree.', [['oldTree', 3, 'look'], ['outside', 2, 'look'], ['gate', 1, 'look']], [12, 26], 34),
  briar: H('Never sits still: the dummy, the walls, the road out. Mostly the road out.', [['dummy', 2, 'sword'], ['outside', 2, 'look'], ['barrels', 1, 'ale'], ['southRoad', 1, 'look']], [4, 9], 44),
  faelan: H('Collects mushrooms under the old tree and argues with the Mage Tower about them.', [['oldTree', 3, 'flower'], ['towerFoot', 2, 'book'], ['graves', 1, 'flower']], [14, 26], 26),
  sylwen: H('Talks to the old tree. Possibly it answers.', [['oldTree', 4, 'flower'], ['templeSteps', 1, 'pray']], [24, 44], 22),
  tamra: H('Spends her days at the stables, and her evenings outside the walls with the wolves.', [['stables', 3, 'heart'], ['outside', 2, 'look']], [14, 28], 32, true),
  oakhewn: H('Stands under the old tree for hours. Birds nest on him.', [['oldTree', 5, 'zz'], ['graves', 1, 'flower']], [40, 80], 14),
  fenn: H('Boasts at the Tavern about the trophy he is going to take, and checks the board for it.', [['barrels', 3, 'chat'], ['board', 2, 'book'], ['armorer', 1, 'shield']], [10, 20], 32),
  // Ashborn
  kragga: H('Wrecks the training dummy. The Guild has bought eleven so far.', [['dummy', 4, 'sword'], ['barrels', 2, 'ale']], [10, 20], 34),
  urzog: H('Throws axes at the dummy and shouts the score across the square.', [['dummy', 3, 'sword'], ['square', 2, 'chat'], ['barrels', 1, 'ale']], [8, 16], 32),
  gorm: H('Drums in the square. Drums at the Tavern. Drums.', [['square', 3, 'music'], ['barrels', 2, 'music'], ['well', 1, 'music']], [16, 30], 26, true),
  ashka: H('Stares into the forge fire for omens, and tells the smith what she saw.', [['forge', 3, 'star'], ['towerFoot', 2, 'star'], ['square', 1]], [14, 28], 28),
  embermaw: H('Sleeps in the forge. The smith has stopped lighting it in the mornings.', [['forge', 5, 'zz'], ['dummy', 1, 'sword']], [40, 70], 18),
  grukk: H('Feeds his boar at the stables, then eats whatever the market sells, in that order.', [['stables', 3, 'horse'], ['market', 2, 'coin'], ['barrels', 2, 'ale']], [12, 22], 32),
  skarr: H('Works the bellows at the smithy for fun, bare-handed.', [['forge', 3, 'hammer'], ['dummy', 2, 'sword'], ['armorer', 1, 'shield']], [12, 24], 30),
  yssa: H('Prays at the Temple with her hands in a brazier.', [['templeSteps', 3, 'pray'], ['forge', 2, 'pray'], ['temple', 1]], [14, 26], 26),
  // Fenfolk
  ssiv: H('Fishes in the well, and in other people\'s pockets at the market.', [['market', 3, 'coin'], ['well', 3, 'fish'], ['tavern', 1]], [10, 20], 36),
  mudtail: H('Sits by the well, very still, for very long.', [['well', 5, 'zz'], ['square', 1]], [50, 90], 14),
  oss: H('Blesses the well every morning and waits for rain.', [['well', 4, 'pray'], ['templeSteps', 1, 'pray']], [16, 30], 24),
  ixa: H('Reads in the Mage Tower, and down by the well where it is properly damp.', [['tower', 2], ['well', 2, 'book'], ['board', 1, 'book']], [14, 26], 28, true),
  bogga: H('Lets her toad swim in the well and haggles at the market for flies.', [['well', 3, 'heart'], ['market', 2, 'coin'], ['oldTree', 1, 'zz']], [16, 30], 22),
  grell: H('Hangs about the old graves by the east wall, and the gate, and the market for odd bargains.', [['graves', 3, 'look'], ['outside', 2, 'look'], ['market', 1, 'coin']], [14, 28], 26, true),
  quill: H('Watches the road east from outside the gate, as if waiting for the tide.', [['outside', 3, 'look'], ['well', 2, 'fish']], [18, 34], 28),
  // Moonveil
  elowen: H('Comes out at dusk to watch the stars from the foot of the Mage Tower.', [['towerFoot', 3, 'star'], ['oldTree', 2, 'star'], ['tower', 1]], [16, 30], 26, true),
  pip: H('Plays tricks in the square and the market, and hides in the Tavern when caught.', [['square', 2, 'music'], ['market', 2, 'coin'], ['tavern', 2], ['board', 1, 'chat']], [5, 11], 40, true),
  nyx: H('Turns up everywhere: the Town Hall roof, the gate, the graves. Nobody sees her walk there.', [['townhall', 1, 'look'], ['gate', 1, 'look'], ['graves', 2, 'look'], ['board', 1, 'book'], ['oldTree', 1, 'look']], [5, 12], 46, true),
  selune: H('Keeps a quiet vigil in the Temple, and visits the Mage Tower to argue about dreams.', [['temple', 3], ['tower', 1], ['steps', 1, 'chat']], [16, 30], 24),
  isolde: H('Walks her wolf along the east wall, mostly after dark.', [['graves', 3, 'heart'], ['stables', 1, 'horse'], ['outside', 1, 'look']], [14, 26], 28, true),
  vanthe: H('Naps under the old tree and in the Mage Tower. Dreams count as work, she says.', [['oldTree', 2, 'zz'], ['tower', 2], ['graves', 1, 'zz']], [20, 40], 22, true),
  sable: H('Duels the training dummy by moonlight.', [['dummy', 3, 'sword'], ['gate', 1, 'look'], ['outside', 1, 'look']], [10, 20], 34, true),
  // Dawnwings
  aurelia: H('Stands guard on the Town Hall steps and at the gate, wings folded, missing nothing.', [['townhall', 2, 'look'], ['gate', 2, 'look'], ['steps', 2, 'chat']], [16, 28], 26),
  seraphiel: H('Spends nearly every hour in the Temple, praying for whoever is out on the road.', [['temple', 4], ['templeSteps', 1, 'pray']], [20, 40], 22),
  caelum: H('Perches on the Town Hall to see further, and shows off at the dummy.', [['townhall', 2, 'look'], ['dummy', 2, 'sword'], ['square', 1, 'chat']], [10, 20], 34),
  lumen: H('Sings on the Temple steps in the morning and in the square in the evening.', [['templeSteps', 3, 'music'], ['square', 2, 'music']], [16, 30], 26, true),
  solenne: H('Heals whoever asks in the Temple, and whoever does not in the square.', [['temple', 3], ['square', 2, 'chat'], ['well', 1, 'pray']], [14, 26], 26),
  valerian: H('Spars at the dummy and grooms his horse until it shines like his spear.', [['dummy', 3, 'sword'], ['stables', 2, 'horse']], [12, 22], 32),
  corvin: H('Browses the market with great interest in things that are not for sale.', [['market', 4, 'coin'], ['townhall', 1, 'look'], ['tavern', 1]], [8, 16], 38),
  // Hollowed
  hollis: H('Stands watch at the gate, day and night. He does not seem to need sleep.', [['gate', 4, 'shield'], ['steps', 1]], [30, 60], 20, true),
  vesper: H('Lurks in the shade under the old tree and by the east wall, away from everyone.', [['oldTree', 3, 'look'], ['graves', 2, 'zz']], [16, 30], 30, true),
  wren: H('Walks out past the gate to watch the hills, and practises at the dummy when she must.', [['outside', 3, 'look'], ['dummy', 1, 'sword'], ['gate', 1, 'look']], [14, 26], 30),
  morrow: H('Lectures at the Town Hall and studies in the Mage Tower. Hates both.', [['townhall', 2, 'chat'], ['tower', 2], ['graves', 1, 'book']], [16, 30], 22, true),
  graves: H('Feeds the stable dogs and tidies the old graves by the east wall.', [['stables', 2, 'heart'], ['graves', 2, 'flower']], [16, 30], 26),
  ossian: H('Tends the old graves by the east wall. Talks to them, too.', [['graves', 3, 'flower'], ['temple', 1], ['oldTree', 1, 'chat']], [20, 40], 22, true),
  lament: H('Sings quietly under the old tree. People stop to listen and do not know why they are crying.', [['oldTree', 3, 'music'], ['templeSteps', 1, 'music'], ['graves', 1, 'music']], [18, 34], 24, true),
};

/** Heroes without a habit of their own get one from their personality. */
const BY_PERSONALITY: Record<string, Habit> = {
  steady: H('Keeps to the same few places, at the same pace.', [['steps', 2, 'chat'], ['square', 2], ['well', 1]], [18, 32], 24),
  reckless: H('Never sits still for long.', [['dummy', 3, 'sword'], ['barrels', 2, 'ale'], ['outside', 1, 'look']], [6, 12], 40),
  greedy: H('Can usually be found where the money is.', [['market', 3, 'coin'], ['barrels', 1, 'ale']], [8, 16], 34),
  curious: H('Wanders all over town.', [['board', 2, 'book'], ['well', 1], ['gate', 1, 'look'], ['towerFoot', 1, 'book']], [6, 14], 36),
  shy: H('Keeps to the quiet corners.', [['oldTree', 3, 'zz'], ['temple', 1]], [20, 36], 22),
  protective: H('Keeps an eye on the gate.', [['gate', 3, 'look'], ['steps', 1]], [16, 28], 26),
  gloryhound: H('Wherever the most people are watching.', [['square', 3, 'chat'], ['dummy', 2, 'sword']], [10, 20], 32),
  cowardly: H('Stays close to the Guild Hall door.', [['guild', 2], ['steps', 2, 'look']], [10, 20], 28),
};

export function habitOf(defId: string, personality: string): Habit {
  return HABITS[defId] ?? BY_PERSONALITY[personality] ?? BY_PERSONALITY.steady;
}
