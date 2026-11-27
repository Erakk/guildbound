// Area stories: a little chain over three visits to an area, tied to its hold.
//   1. The plea: someone on the road asks for help. Come home from that trip and the guild takes it on.
//   2. The trail: a lookout or a den of the area's monsters, tougher than most. Clear it.
//   3. The leader: a named chief with guards. Bring them down and the area is all but secured (+3 hold).
// The story follows the area's main monster family; the people asking come from its kind of land.

import type { Biome } from '../types';

export interface StoryDef {
  /** Who asks, and what for (chapter 1). */
  plea: string;
  /** The place to clear (chapter 2), and the chief (chapter 3). */
  lookout: string;
  chief: string;
  /** What the chapter titles say on the Map. */
  titles: [string, string, string];
}

const BY_FAMILY: Record<string, StoryDef> = {
  Goblins: {
    plea: 'A farmer flagged the party down: goblins have been raiding the fields at night, and the watch won\'t come out this far.',
    lookout: 'the goblins\' lookout post', chief: 'Chief Gutsplitter',
    titles: ['The farmer\'s plea', 'The goblin lookout', 'Chief Gutsplitter'],
  },
  Bandits: {
    plea: 'A miller\'s daughter caught up with the party: bandits took the grain carts, and next time they\'ll take more.',
    lookout: 'the bandits\' lookout', chief: 'One-Eye Varrick, the bandit captain',
    titles: ['The stolen grain', 'The bandits\' lookout', 'One-Eye Varrick'],
  },
  Beasts: {
    plea: 'A shepherd was waiting by the road: something big has been taking the flock, one a night.',
    lookout: 'a den full of bones', chief: 'the Old Grey, leader of the pack',
    titles: ['The shepherd\'s flock', 'The den of bones', 'The Old Grey'],
  },
  Undead: {
    plea: 'A gravedigger met the party, shaking: the dead in the old yard won\'t stay down.',
    lookout: 'an open grave, still crawling', chief: 'the Restless Knight',
    titles: ['The gravedigger\'s fear', 'The open grave', 'The Restless Knight'],
  },
  'Sea and reef': {
    plea: 'A fisherwoman mending nets called out: the crabs have taken the cove, and the boats can\'t land.',
    lookout: 'the crab-held cove', chief: 'the Crab Lord in his barnacled shell',
    titles: ['The fisherwoman\'s cove', 'The crab-held cove', 'The Crab Lord'],
  },
  'Swamp horrors': {
    plea: 'A reed-cutter waved from a punt: something in the deep water has been pulling people under.',
    lookout: 'the drowned hollow', chief: 'the Mother of the Mire',
    titles: ['The reed-cutter\'s warning', 'The drowned hollow', 'The Mother of the Mire'],
  },
  'Trolls and giants': {
    plea: 'A woodcutter limped up: a troll has taken the pass, and the toll is a cow a week.',
    lookout: 'the troll\'s larder', chief: 'Grumhold the Toll-Taker',
    titles: ['The woodcutter\'s toll', 'The troll\'s larder', 'Grumhold the Toll-Taker'],
  },
};

const GENERIC: StoryDef = {
  plea: 'A local stopped the party on the road: the monsters here have grown bold, and someone has to do something.',
  lookout: 'their lookout', chief: 'their leader',
  titles: ['A plea for help', 'The lookout', 'The leader'],
};

export function storyFor(family: string): StoryDef {
  return BY_FAMILY[family] ?? GENERIC;
}

/** Hold for each chapter finished. */
export const STORY_HOLD = [0, 1, 1, 3];

/** Where a story can happen: not on the first trip's meadows, sieges, or the sea and the sky. */
export const STORY_BIOMES_EXCLUDED: Biome[] = ['sea', 'sky'];
