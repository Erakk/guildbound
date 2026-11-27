// Discoveries: the things a party comes across beside the trail, in place of the old glints. Each is a small
// decision. The Guildmaster can make it by clicking the discovery; if nobody does by the time the party
// walks past, the Captain decides in their own way (a greedy Captain digs up the stash, a careful one
// rests by the spring, a steady one may simply walk on). What each option does is in the simulation
// (see applyDiscovery); here is what the player reads.

import type { Biome, HeroClass, Personality, Focus } from '../types';

/** What kind of choice an option is: the Captain picks the one that suits their personality. */
export type Lean = 'greedy' | 'careful' | 'bold' | 'kind' | 'curious';

export interface DiscoveryOption {
  label: string;
  /** What it does, in a few words. */
  text: string;
  lean: Lean[];
  /** Classes that make this option work better (said on the button). */
  helps?: HeroClass[];
  helpText?: string;
}

export interface DiscoveryDef {
  id: string;
  name: string;
  /** One line on the plate over it. */
  text: string;
  biomes: Biome[] | 'all';
  options: DiscoveryOption[];
}

const ALL = 'all' as const;

export const DISCOVERIES: DiscoveryDef[] = [
  { id: 'beehive', name: 'Wild beehive', text: 'Honey heals. Angry bees sting whoever is nearest.', biomes: ['plains', 'farm', 'forest'], options: [
    { label: 'Smoke out the honey', text: 'Heals the party a quarter, and a few herbs', lean: ['careful', 'kind'] },
    { label: 'Kick it at the monsters ahead', text: 'The next monster group takes a beating from the bees', lean: ['bold'] },
  ] },
  { id: 'fairyring', name: 'Fairy ring', text: 'Old magic in a circle of mushrooms. It gives, and it takes.', biomes: ['forest', 'plains', 'haunted', 'sky'], options: [
    { label: 'Step inside', text: 'A random blessing for half a minute: gold, harvest or learning', lean: ['curious', 'bold'] },
    { label: 'Leave a coin for the fae', text: 'Costs a little gold; full mana and lifted spirits', lean: ['kind', 'careful'] },
  ] },
  { id: 'orevein', name: 'Ore vein', text: 'Iron in the rock, if someone swings a pick.', biomes: ['hills', 'mountain', 'badlands', 'ruins', 'barrow'], options: [
    { label: 'Dig it out', text: 'Iron and stone for the guild (the party waits a while)', lean: ['greedy', 'careful'], helps: ['warrior', 'dragonslayer'], helpText: 'faster with a Warrior or Dragonslayer' },
    { label: 'Mark it on the guild\'s map', text: 'Adds 1 to the guild\'s hold on this area', lean: ['curious'] },
  ] },
  { id: 'campfire', name: 'Abandoned campfire', text: 'Still warm. Someone left in a hurry.', biomes: ALL, options: [
    { label: 'Rest a moment', text: 'Heals the party by a third', lean: ['careful', 'kind'] },
    { label: 'Search the bedrolls', text: 'Gold and maybe an item, but the owners may come back', lean: ['greedy', 'curious'], helps: ['rogue'], helpText: 'a Rogue keeps watch' },
  ] },
  { id: 'gravegoods', name: 'Grave mound', text: 'Grave goods for the taking. The dead may mind.', biomes: ['barrow', 'haunted', 'hills', 'ruins'], options: [
    { label: 'Take the grave goods', text: 'Gold and a pack piece, and the dead rise to fight', lean: ['greedy', 'bold'] },
    { label: 'Pay respects', text: 'Lifts spirits and teaches the party something', lean: ['kind', 'careful'], helps: ['cleric', 'paladin', 'necromancer'], helpText: 'heals too with a Cleric, Paladin or Necromancer' },
  ] },
  { id: 'wisp', name: 'Will-o\'-wisp lantern', text: 'A little light that wants to be followed.', biomes: ['marsh', 'haunted', 'forest'], options: [
    { label: 'Follow it', text: 'It leads to treasure, through stinging bog water', lean: ['curious', 'bold'] },
    { label: 'Catch it in a jar', text: 'Half the Guildmaster\'s mana back', lean: ['careful'] },
  ] },
  { id: 'bottle', name: 'Message in a bottle', text: 'Washed up with the tide, sealed with wax.', biomes: ['coast', 'sea'], options: [
    { label: 'Read it', text: 'A treasure map: a chest turns up just off the trail', lean: ['curious', 'kind'] },
    { label: 'Sell the bottle', text: 'A little gold from a collector in town', lean: ['greedy'] },
  ] },
  { id: 'frozen', name: 'Frozen adventurer', text: 'An unlucky traveller, pack frozen to their back.', biomes: ['snow', 'mountain'], options: [
    { label: 'Thaw out the pack', text: 'An item from the pack (the party waits a while)', lean: ['careful', 'curious'], helps: ['mage'], helpText: 'quick with a Mage' },
    { label: 'Take the purse', text: 'Gold, quickly', lean: ['greedy', 'bold'] },
  ] },
  { id: 'stones', name: 'Standing stones', text: 'Runes no one has read in a long time.', biomes: ['plains', 'hills', 'barrow', 'sky', 'ruins'], options: [
    { label: 'Read the runes', text: 'Experience; with a scholar, a blessing of learning too', lean: ['curious'], helps: ['mage', 'cleric', 'bard'], helpText: 'a blessing with a Mage, Cleric or Bard' },
    { label: 'Touch the tallest stone', text: 'The party hits 8% harder for the rest of the trip', lean: ['bold'] },
  ] },
  { id: 'tracks', name: 'Fresh tracks', text: 'Something big passed this way, not long ago.', biomes: ['forest', 'plains', 'snow', 'hills', 'farm'], options: [
    { label: 'Follow the tracks', text: 'Hunt the beasts: a fight, hides and a bounty', lean: ['bold', 'greedy'], helps: ['ranger', 'beastmaster'], helpText: 'a Ranger or Beastmaster strikes first' },
    { label: 'Steer clear', text: 'The next monster group is one smaller', lean: ['careful'] },
  ] },
  { id: 'cart', name: 'Overturned cart', text: 'A farmer\'s cart, a wheel in the ditch.', biomes: ['plains', 'farm', 'coast'], options: [
    { label: 'Right the cart', text: 'The farmer pays what they can, and spirits lift', lean: ['kind', 'careful'] },
    { label: 'Salvage it', text: 'Wood and hides for the guild', lean: ['greedy'] },
  ] },
  { id: 'mushrooms', name: 'Glowing mushrooms', text: 'Food, medicine or poison. Hard to say which.', biomes: ['forest', 'marsh', 'haunted'], options: [
    { label: 'Taste one', text: 'Heals a lot, or brings strange visions (and a stomach ache)', lean: ['bold', 'curious'] },
    { label: 'Pick them for the herbalist', text: 'Herbs for the guild', lean: ['careful', 'greedy'] },
  ] },
  { id: 'spring', name: 'Clear spring', text: 'Cold water running from the rock.', biomes: ['hills', 'mountain', 'plains', 'ruins', 'snow'], options: [
    { label: 'Drink and rest', text: 'Heals a fifth, and some mana back', lean: ['careful', 'kind'] },
    { label: 'Toss in a coin', text: 'Costs a little gold; Fortune smiles for half a minute', lean: ['curious'] },
  ] },
  { id: 'stash', name: 'Bandit stash', text: 'A cross scratched on a stone. Something is buried here.', biomes: ['plains', 'hills', 'badlands', 'farm'], options: [
    { label: 'Dig it up', text: 'A good haul of gold, if the bandits don\'t come back for it', lean: ['greedy', 'bold'], helps: ['rogue'], helpText: 'a Rogue covers the tracks' },
    { label: 'Tell the town watch', text: 'Adds 1 to the guild\'s hold on this area', lean: ['kind', 'careful'] },
  ] },
  { id: 'embervent', name: 'Ember vent', text: 'Heat rising from a crack in the rock.', biomes: ['badlands'], options: [
    { label: 'Temper the blades', text: 'The party hits 10% harder for the rest of the trip', lean: ['bold'] },
    { label: 'Gather obsidian', text: 'Stone and iron for the guild', lean: ['greedy', 'careful'] },
  ] },
  { id: 'crabpot', name: 'Crab pot', text: 'Someone\'s catch, left on the rocks.', biomes: ['coast', 'sea'], options: [
    { label: 'Cook the catch', text: 'Heals the party a quarter, and spirits lift', lean: ['careful', 'kind'] },
    { label: 'Sell it in town', text: 'A little gold', lean: ['greedy'] },
  ] },
  { id: 'nest', name: 'Eagle\'s nest', text: 'High on a ledge, glinting with stolen things.', biomes: ['mountain', 'hills', 'sky'], options: [
    { label: 'Climb up', text: 'Gold and a pack piece; someone may fall', lean: ['bold', 'greedy'], helps: ['ranger', 'rogue'], helpText: 'safe with a Ranger or Rogue' },
  ] },
];

/** The night camp halfway through a long trip (not found by chance, so it isn't in the list above or the journal). */
export const NIGHT_CAMP: DiscoveryDef = {
  id: 'nightcamp', name: 'Camp for the night', text: 'The party makes camp by the trail. How do they spend the evening?', biomes: [], options: [
    { label: 'Rest well', text: 'Heals the party by half, and fills the mana', lean: ['careful', 'kind'], helps: ['cleric', 'bard'], helpText: 'a Cleric or Bard tends the fire' },
    { label: 'Keep watch', text: 'Something prowls the camp: fight it for its loot', lean: ['bold', 'greedy'], helps: ['ranger', 'beastmaster'], helpText: 'a Ranger sees it coming' },
    { label: 'Tell stories', text: 'Spirits up, and +15% experience for the trip', lean: ['curious', 'kind'], helps: ['bard'], helpText: 'a Bard tells them best' },
  ],
};

export const DISCOVERY_BY_ID: Record<string, DiscoveryDef> = Object.fromEntries([...DISCOVERIES, NIGHT_CAMP].map((d) => [d.id, d]));

/** The kind of choice each personality makes, in order of preference. A steady Captain walks on unless it's careful. */
export const LEANS: Record<Personality, Lean[]> = {
  greedy: ['greedy', 'bold'],
  reckless: ['bold', 'greedy'],
  gloryhound: ['bold', 'greedy'],
  curious: ['curious', 'bold'],
  protective: ['kind', 'careful'],
  cowardly: ['careful'],
  shy: ['careful', 'kind'],
  steady: ['careful'],
};

/** What each focus turns up more of: Gather finds ore and herbs, Treasure finds caches, Hunt finds tracks and nests. */
export const FOCUS_FINDS: Partial<Record<Focus, string[]>> = {
  gather: ['orevein', 'mushrooms', 'beehive', 'crabpot', 'spring', 'embervent'],
  treasure: ['stash', 'gravegoods', 'bottle', 'frozen', 'nest', 'cart'],
  hunt: ['tracks', 'nest', 'beehive', 'crabpot', 'wisp'],
};

/** How likely a discovery is on a trip with this focus (three times as likely when it suits the focus). */
export function discoveryWeight(d: DiscoveryDef, focus: Focus): number {
  return FOCUS_FINDS[focus]?.includes(d.id) ? 3 : 1;
}

export function discoveriesFor(biome: Biome): DiscoveryDef[] {
  return DISCOVERIES.filter((d) => d.biomes === 'all' || d.biomes.includes(biome));
}
