// The tutorial: the first fifteen minutes, one main system at a time, with the starter party.
// Each step is checked against the game state (plus a few flags the game sets when the player
// does something), and the reward of one step leads into the next.

import { BUILDING_BY_ID } from './data/buildings';
import { HERO_BY_ID } from './data/heroes';
import { partyHeroes } from './state';
import type { GameState, Material, Rarity } from './types';
import { MATERIALS } from './types';
import { REGION_BY_ID, REGIONS } from './data/world';
import { canReach, holdNeed, holdOf, secured } from './hold';

/** Where each material turns up, for hints. */
const SOURCE: Record<Material, string> = {
  wood: 'wood from plains, farms, forests and coasts',
  stone: 'stone from hills, mountains, ruins and barrows',
  iron: 'iron from hills, mountains, ruins and the badlands',
  herbs: 'herbs from plains, marshes and haunted woods',
  hides: 'hides from farms, forests, marshes and coasts',
};

/** Where the guide's "Take me there" goes: usually the step's screen, but the last step follows the party. */
export function stepScreen(step: TutorialStep, s: GameState): TutorialStep['screen'] {
  if (step.id === 'alone') {
    if (s.reports.length) return 'guild';
    if (s.expeditions.length) return 'expedition';
  }
  return step.screen;
}

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  /** The screen this step happens on (its tab gets a highlight). */
  screen: 'guild' | 'heroes' | 'party' | 'map' | 'expedition' | 'town' | 'packs';
  done: (s: GameState) => boolean;
}

/** The gear the first trip brings home: one good sword. The rest comes from the smiths and the Marches. */
export const STARTER_GEAR = ['sword_1'];

const RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
const flag = (s: GameState, f: string) => !!s.tutorial.flags[f];
const equipped = (s: GameState, itemId: string) => s.roster.some((h) => Object.values(h.gear).some((uid) => s.items.find((i) => i.uid === uid)?.defId === itemId));

export const TUTORIAL: TutorialStep[] = [
  { id: 'cards', screen: 'heroes', title: 'Your first heroes',
    text: 'Five heroes have answered the guild\'s call, one from each of five tribes. Open the Heroes screen and click a card to read it: rarity, tribe, class, stars, stats and personality.',
    done: (s) => flag(s, 'heroOpened') },
  { id: 'party', screen: 'party', title: 'Form the party',
    text: 'On the Party screen (the War Table in the Guild Hall), drag heroes between slots, set each one to the front or back row, and pick a Captain. The Captain decides at crossroads. Change anything to continue.',
    done: (s) => flag(s, 'partyEdited') },
  { id: 'send', screen: 'map', title: 'The first expedition',
    text: 'Open the Map (or click the Town Gate) and send the party to Greenhollow, the meadows outside town.',
    done: (s) => s.expeditions.length > 0 || flag(s, 'claimed') },
  { id: 'watch', screen: 'expedition', title: 'Lend a hand',
    text: 'The party fights on its own, but you can help. Beside the trail is an abandoned campfire: click it and choose what the party does there. If you don\'t, the Captain decides when they get there. This trip can\'t be lost.',
    done: (s) => flag(s, 'glint') || s.reports.length > 0 || flag(s, 'claimed') },
  { id: 'report', screen: 'guild', title: 'Back home',
    text: 'When the party is back, read the report in the Guild Hall and collect the rewards. (On the Watch screen you can speed up time with the ×4 and ×16 buttons.)',
    done: (s) => flag(s, 'claimed') },
  { id: 'equip', screen: 'heroes', title: 'Gear up',
    text: 'The party found an Iron Sword on the road. Open a fighter (Brannoc is a Warrior) and drag the sword from the backpack onto the weapon slot, or double-click it.',
    done: (s) => STARTER_GEAR.every((id) => equipped(s, id)) },
  { id: 'build', screen: 'town', title: 'Build the Tavern',
    text: 'In Town, click the empty Tavern plot and build it. Buildings take time and gold and materials; this first one takes about 10 seconds. Its welcome gift is a card pack.',
    done: (s) => (s.buildings.tavern ?? 0) >= 1 },
  { id: 'pack', screen: 'packs', title: 'Open a pack',
    text: 'The Tavern\'s welcome gift is a Novice Pack, and this one holds a new Rare hero. Open it in the Tavern. Novice Packs mostly train the heroes you have: copies raise their stars, drills raise their level. Packs are put together from pieces found on expeditions.',
    done: (s) => flag(s, 'packOpened') },
  { id: 'swap', screen: 'party', title: 'A new recruit',
    text: 'Put your new Rare hero in the party. Later, duplicates of a hero become copies: with enough copies, some training, gold and materials from their homeland, a hero gains a star, and every star raises their level cap. At 3 stars they unlock their signature ability.',
    done: (s) => partyHeroes(s, 0).some((h) => RANK[HERO_BY_ID[h.defId].rarity] >= RANK.rare) },
  { id: 'scout', screen: 'map', title: 'Scout new land',
    text: 'Parties only go where scouts have been. Lyra (a Ranger) and Ssiv (a Rogue) can scout: pick an unscouted area next to Greenhollow on the Map and send one of them. A scout takes up the guild\'s one outing, just like a party, so the party waits at home until the scout is back. Land further out opens up once the guild has a firm hold on the land next to it: every trip there that comes home builds it.',
    done: (s) => s.scouting.length > 0 || s.explored.length > 1 },
  { id: 'alone', screen: 'map', title: 'On your own',
    text: 'You know the basics. Once the scout is back, send the party out once more, wherever you like, and collect the report when they are back.',
    done: (s) => flag(s, 'claimed2') },
];

/** The current step, or null when the tutorial is over. */
export function currentStep(s: GameState): TutorialStep | null {
  return s.tutorial.done ? null : TUTORIAL[s.tutorial.step] ?? null;
}

/** Moves past every finished step, applying each new step's gifts. Returns the steps finished. */
export function advanceTutorial(s: GameState): string[] {
  const finished: string[] = [];
  while (!s.tutorial.done) {
    const step = TUTORIAL[s.tutorial.step];
    if (!step || !step.done(s)) break;
    finished.push(step.title);
    s.tutorial.step += 1;
    enter(s);
  }
  return finished;
}

/** Gifts that come with a step. */
function enter(s: GameState) {
  const step = TUTORIAL[s.tutorial.step];
  if (!step) {
    s.tutorial.done = true;
    return;
  }
  // Only a pack opened from here on counts.
  if (step.id === 'pack') s.tutorial.flags.packOpened = false;
  if (step.id === 'pack' && !s.tutorial.flags.giftGiven) {
    s.tutorial.flags.giftGiven = true;
    s.tutorial.flags.giftPack = true;
    s.packs.novice += 1;
  }
}

/** Skips the rest. Returning players still get the starter gear and the gift pack. */
export function skipTutorial(s: GameState, addItem: (id: string) => void) {
  if (!s.tutorial.flags.gearGiven) {
    s.tutorial.flags.gearGiven = true;
    for (const id of STARTER_GEAR) addItem(id);
  }
  if (!s.tutorial.flags.giftGiven) {
    s.tutorial.flags.giftGiven = true;
    s.tutorial.flags.giftPack = true;
    s.packs.novice += 1;
  }
  s.tutorial.done = true;
  s.tutorial.skipped = true;
}

/** Goals shown after the tutorial until they are met. */
export function nextGoals(s: GameState): string[] {
  const goals: string[] = [];
  const lvl = (id: string) => s.buildings[id] ?? 0;
  if (s.explored.length < 4 && !s.scouting.length) goals.push('Send a scout (a Ranger, Rogue or Beastmaster) from the Map to map new land. Parties only go where scouts have been.');
  // Nowhere new to scout: say how to push the frontier out.
  if (!s.scouting.length && !REGIONS.some((r) => !s.explored.includes(r.id) && !r.siege && canReach(s, r))) {
    const best = s.explored.map((id) => REGION_BY_ID[id]).filter((r) => r && !secured(s, r.id)).sort((a, b) => holdNeed(a) - holdOf(s, a.id) - (holdNeed(b) - holdOf(s, b.id)))[0];
    goals.push(`Every area scouts can reach is on the map. Secure one to push further${best ? `: ${best.name} needs ${holdNeed(best) - holdOf(s, best.id)} more hold` : ''}. Every trip that comes home adds hold; clearing every monster group, a site or the area's trouble adds more.`);
  }
  if (lvl('weaponsmith') < 1) goals.push('Build the Weaponsmith in Town for better weapons.');
  // The Town Hall caps every other building: say what it still needs, and where that comes from.
  const th = lvl('townhall') || 1;
  if (th < 5) {
    const cost = BUILDING_BY_ID.townhall.cost(th + 1);
    const short = MATERIALS.filter((m) => (cost[m] ?? 0) > s.materials[m]);
    goals.push(`Raise the Town Hall to level ${th + 1}, so other buildings can grow too.${short.length
      ? ` Still short of ${short.map((m) => `${(cost[m] ?? 0) - s.materials[m]} ${m}`).join(' and ')}: look for ${short.map((m) => SOURCE[m]).join(', and ')}.${lvl('market') ? ' The Market sells them too.' : ' A Market (it needs no stone) sells them too.'}`
      : (cost.gold ?? 0) > s.gold ? ` It needs ${Math.ceil((cost.gold ?? 0) - s.gold)} more gold.` : ' You can afford it now.'}`);
  }
  if (lvl('magetower') < 1 && s.tripsCompleted >= 4) goals.push('Build the Mage Tower to open the spellbook: blessings for gold, materials and XP, and later battle magic.');
  if (th >= 3 && lvl('guildhall') < 3) goals.push('Raise the Guild Hall to level 3 to lead a second party.');
  return goals.slice(0, 3);
}
