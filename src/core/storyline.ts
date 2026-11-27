// Which chapter of an area's story the next trip there plays (see data/stories).

import { storyFor, STORY_BIOMES_EXCLUDED, type StoryDef } from './data/stories';
import { ENEMY_BY_ID, REGION_BY_ID } from './data/world';
import { PLAIN_AREAS } from './sim/expedition';
import type { GameState } from './types';

/** The area's story, if it has one. */
export function areaStory(regionId: string): StoryDef | null {
  const r = REGION_BY_ID[regionId];
  if (!r || r.siege || r.requires || PLAIN_AREAS.has(r.id) || STORY_BIOMES_EXCLUDED.includes(r.biome)) return null;
  return storyFor(ENEMY_BY_ID[r.enemyPool[0].id]?.family ?? '');
}

/** The next chapter (1-3), or null when there's no story or it's all told. Waits for the tutorial. */
export function storyChapter(s: GameState, regionId: string): number | null {
  if (!s.tutorial.done || !areaStory(regionId)) return null;
  const done = s.stories?.[regionId] ?? 0;
  return done >= 3 ? null : done + 1;
}
