import { Game } from './game';
import { App } from './ui/app';

const root = document.getElementById('app')!;
const game = new Game();
// Handy for testing from the browser console. Set before the App so screens can add to it.
const debug: Record<string, unknown> = { game };
(window as unknown as { guildbound: unknown }).guildbound = debug;
debug.app = new App(game, root);
