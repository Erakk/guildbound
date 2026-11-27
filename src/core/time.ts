// The world clock: day and night, and the seasons. Every guild shares it (it runs on the game's
// clock, so test speed moves it too). A trip keeps the time and season it left in.

export type TimeOfDay = 'day' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** One day and night every hour: 45 minutes of day, then 15 of night. */
export const DAY_CYCLE_MS = 60 * 60 * 1000;
const NIGHT_STARTS = 0.75;
/** Each season lasts a real day. */
export const SEASON_MS = 24 * 3600 * 1000;

export function timeOfDay(now: number): TimeOfDay {
  return (now % DAY_CYCLE_MS) / DAY_CYCLE_MS >= NIGHT_STARTS ? 'night' : 'day';
}

/** Milliseconds until day turns to night, or night to day. */
export function untilChange(now: number): number {
  const t = now % DAY_CYCLE_MS;
  const edge = NIGHT_STARTS * DAY_CYCLE_MS;
  return t < edge ? edge - t : DAY_CYCLE_MS - t;
}

export function season(now: number): Season {
  return SEASONS[Math.floor(now / SEASON_MS) % 4];
}

export function untilNextSeason(now: number): number {
  return SEASON_MS - (now % SEASON_MS);
}

export const SEASON_TEXT: Record<Season, { name: string; icon: string; effect: string }> = {
  spring: { name: 'Spring', icon: '❀', effect: 'Herbs grow everywhere: +50% herbs.' },
  summer: { name: 'Summer', icon: '☼', effect: 'Long days on the road: one more chest on every trip.' },
  autumn: { name: 'Autumn', icon: '❦', effect: 'Harvest time: +30% wood and hides.' },
  winter: { name: 'Winter', icon: '❄', effect: 'Frost wolves roam, and frozen streams make faster paths through marsh and coast.' },
};

export const TIME_TEXT: Record<TimeOfDay, { name: string; icon: string; effect: string }> = {
  day: { name: 'Day', icon: '☀', effect: '' },
  night: { name: 'Night', icon: '☾', effect: 'Spirits and wolves roam. Moonveil heroes are 15% stronger.' },
};
