// Draws a running expedition with PixiJS. Reads the simulation each frame; never changes it.
// Player clicks become inputs sent through the Game, so live play and replays stay identical.

import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { SPELL_COLOR } from '../art/spells';
import { spriteSvg } from '../art/sprites';
import { PACKS } from '../core/data/packs';
import { SPELL_BY_ID } from '../core/data/spells';
import { Rng } from '../core/rng';
import type { Chest, Find, Sim, SimEvent, SimHazard, SimLandmark, Unit } from '../core/sim/expedition';
import { pointAt, STORY_PLATE } from '../core/sim/expedition';
import { ROOM_ORDER, ROOM_W, type Delve } from '../core/sim/delve';
import { ENCOUNTER_PLATE, SET_INFO, SET_REACH, type Encounter, type SetKind } from '../core/sim/encounters';
import { HAZARDS, LANDMARK_BY_ID } from '../core/data/landmarks';
import { landmarkSvg } from '../art/landmarks';
import { DISCOVERY_BY_ID } from '../core/data/discoveries';
import { discoverySvg } from '../art/discoveries';
import { itemIconSvg } from '../art/items';
import { ITEM_BY_ID } from '../core/data/items';
import { ENEMY_BY_ID } from '../core/data/world';
import { forkLabel } from '../core/sim/expedition';
import type { Game } from '../game';

const BIOME: Record<string, { ground: number; patch: number; path: number; pathEdge: number }> = {
  plains: { ground: 0x86a25c, patch: 0x9cb86c, path: 0xc9ad7a, pathEdge: 0xa88e5e },
  farm: { ground: 0x93aa5e, patch: 0xc9b35e, path: 0xcdb27e, pathEdge: 0xa88e5e },
  forest: { ground: 0x5e7e44, patch: 0x4e6e3a, path: 0xa88e62, pathEdge: 0x7e6a48 },
  marsh: { ground: 0x6e8a66, patch: 0x5e7e74, path: 0x9c9068, pathEdge: 0x7a7050 },
  hills: { ground: 0x8ea65e, patch: 0xa3b86c, path: 0xb39a6e, pathEdge: 0x8a7650 },
  barrow: { ground: 0x8e9270, patch: 0x7a7e60, path: 0xaea488, pathEdge: 0x8a8068 },
  coast: { ground: 0xd8c690, patch: 0xe6d6a6, path: 0xc0a878, pathEdge: 0x9e8658 },
  sea: { ground: 0xd6c48e, patch: 0x5e94aa, path: 0xc2ab7c, pathEdge: 0x9e8658 },
  mountain: { ground: 0x8e8670, patch: 0xa49a80, path: 0xb8aa88, pathEdge: 0x7a6e58 },
  snow: { ground: 0xdde6ea, patch: 0xc6d4dc, path: 0xb8c6cc, pathEdge: 0x9aaab2 },
  badlands: { ground: 0x6e4a3a, patch: 0x8c5a42, path: 0x9a7a62, pathEdge: 0x5a3a2c },
  haunted: { ground: 0x4e4a62, patch: 0x5e5874, path: 0x7a7088, pathEdge: 0x3e3a50 },
  sky: { ground: 0xc8dcea, patch: 0xe6f0f6, path: 0xb8a888, pathEdge: 0x8a7a5a },
  ruins: { ground: 0x8a9a68, patch: 0x9cac76, path: 0xb8ae92, pathEdge: 0x8a8068 },
};

const SPRITE_SCALE = 0.36;
/** Floating-text colours for pack pieces. */
const PIECE_COLOR: Record<string, string> = { novice: '#a8d878', recruit: '#f0a090', grimoire: '#9ec3f0', veteran: '#f1d27a', champion: '#d8b8f0' };
const texCache = new Map<string, Promise<Texture>>();

function svgTexture(key: string): Promise<Texture> {
  let p = texCache.get(key);
  if (!p) {
    p = (async () => {
      const svg = spriteSvg(key, 128);
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      const res = 2;
      const c = document.createElement('canvas');
      c.width = 128 * res;
      c.height = 112 * res;
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      return Texture.from(c);
    })();
    texCache.set(key, p);
  }
  return p;
}

interface UnitView {
  root: Container;
  sprite: Sprite;
  hp: Graphics;
  /** Spell effects drawn around the unit (shield, roots, haste…). */
  aura: Graphics;
  dx: number;
  dy: number;
  deadT: number;
}

interface Fx {
  obj: Container;
  life: number;
  max: number;
  vy?: number;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  /** A coin: flies with gravity and bounces once on the ground at `floor`. */
  vx?: number;
  fall?: { vy: number; floor: number };
  /** Flies to the party leader (an item from a chest), arcing up first. */
  home?: boolean;
  /** Grows and fades (a burst of light). */
  grow?: boolean;
  /** A speech bubble: rides above this unit's head, wherever it goes. */
  follow?: number;
}

export class ExpeditionView {
  app = new Application();
  world = new Container();
  private ground = new Container();
  private unitLayer = new Container();
  private fxLayer = new Container();
  private units = new Map<number, UnitView>();
  private chestGfx = new Map<number, Graphics>();
  private findGfx = new Map<number, Graphics>();
  private findPlates = new Map<number, Container>();
  private discGfx = new Map<number, Container>();
  private landmarkGfx = new Map<number, Container>();
  private forkPlates = new Map<number, Container>();
  /**
   * Plates stay hidden until the pointer is over what they describe: points on the map (and a
   * radius), and the plate they reveal (looked up each frame: some plates are replaced as the trip goes).
   */
  private hovers: { pts: { x: number; y: number }[]; r: number; plate: () => Container | null | undefined; follow: boolean }[] = [];
  private fx: Fx[] = [];
  private cam = { x: 0, y: 0 };
  private builtFor: Sim | null = null;
  private time = 0;
  armedSpell: string | null = null;
  private clickedFind = false;
  /** Where the pointer is on the map, for the spell targeting ring. */
  private aim: { x: number; y: number } | null = null;
  /** The pointer on screen: the camera pans under a still mouse, so `aim` is redone from it each frame. */
  private pointer: { x: number; y: number } | null = null;
  private landmarkPlates = new Map<number, Container>();
  private discPlates = new Map<number, Container>();
  private aimRing = new Graphics();
  /** Cinder Legion: burning ground, redrawn every frame as it spreads. */
  private fireLayer = new Graphics();
  /** Night darkness (with the party's lantern glow) and storm rain, in screen space. */
  private sky = new Graphics();
  onLog: (text: string) => void = () => {};
  /** A discovery was clicked: the Watch screen shows its choice. */
  onDiscovery: (findId: number) => void = () => {};
  private destroyed = false;

  constructor(private host: HTMLElement, private game: Game) {}

  async init() {
    await this.app.init({ resizeTo: this.host, antialias: true, background: 0x2a1e14, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }
    this.host.appendChild(this.app.canvas);
    this.world.addChild(this.ground, this.unitLayer, this.fxLayer, this.aimRing);
    this.app.stage.addChild(this.world);
    // Night and storms are drawn over the whole view; clicks pass through.
    this.sky.eventMode = 'none';
    this.app.stage.addChild(this.sky);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', (e) => {
      this.pointer = { x: e.global.x, y: e.global.y };
      this.aim = this.world.toLocal(e.global);
    });
    this.app.stage.on('pointerleave', () => {
      this.pointer = null;
      this.aim = null;
    });
    this.app.stage.on('pointertap', (e) => {
      if (this.clickedFind) {
        this.clickedFind = false;
        return;
      }
      if (!this.armedSpell) return;
      const p = this.world.toLocal(e.global);
      this.game.input({ kind: 'cast', spell: this.armedSpell, x: p.x, y: p.y });
      this.armedSpell = null;
    });
    this.app.ticker.add((t) => this.frame(t.deltaMS / 1000));
  }

  destroy() {
    this.destroyed = true;
    try {
      this.app.destroy(true, { children: true });
    } catch {
      /* not initialised yet */
    }
  }

  private build(sim: Sim) {
    this.builtFor = sim;
    this.ground.removeChildren();
    this.unitLayer.removeChildren();
    this.fxLayer.removeChildren();
    this.aimRing.clear();
    this.units.clear();
    this.chestGfx.clear();
    this.findGfx.clear();
    const pal = BIOME[sim.region.biome] ?? BIOME.plains;
    const rng = new Rng(sim.path.length * 7919 + Math.round(sim.width));
    const g = new Graphics();
    g.rect(-400, -400, sim.width + 800, sim.height + 800).fill(pal.ground);
    for (let i = 0; i < sim.width / 40; i++) {
      g.ellipse(rng.range(0, sim.width), rng.range(0, sim.height), rng.range(60, 200), rng.range(30, 90)).fill({ color: pal.patch, alpha: 0.45 });
    }
    // The trail.
    const trail = (width: number, color: number) => {
      g.moveTo(sim.path[0].x - 200, sim.path[0].y);
      for (const p of sim.path) g.lineTo(p.x, p.y);
      g.stroke({ width, color, cap: 'round', join: 'round' });
    };
    trail(58, pal.pathEdge);
    trail(46, pal.path);
    this.ground.addChild(g);
    // Scenery, kept off the trail.
    const deco = new Graphics();
    const nearPath = (x: number, y: number) => sim.path.some((p, i) => i > 0 && segDist(x, y, sim.path[i - 1], p) < 80);
    const count = Math.round(sim.width / 9);
    for (let i = 0; i < count; i++) {
      const x = rng.range(-200, sim.width + 200);
      const y = rng.range(-200, sim.height + 200);
      if (nearPath(x, y)) continue;
      const fort = sim.siege?.fort;
      if (fort && x > fort.wallX - 60 && y > fort.top - 60 && y < fort.bottom + 60) continue;
      drawScenery(deco, sim.region.biome, x, y, rng);
    }
    this.ground.addChild(deco);
    if (sim.siege?.fort) this.ground.addChild(drawFortress(sim));
    if (sim.siege?.field && sim.siege.kind === 'barrow_uprising') this.ground.addChild(drawBarrowField(sim));
    if (sim.siege?.field && sim.siege.kind === 'cinder_legion') this.ground.addChild(drawCinderField(sim));
    if (sim.siege?.field && sim.siege.kind === 'dragonmaw') this.ground.addChild(drawDragonField(sim));
    this.ground.addChild(this.fireLayer);
    // Winter: snow lies over everything but the lava fields.
    if (sim.season === 'winter' && sim.region.biome !== 'badlands') {
      const snow = new Graphics();
      snow.rect(-400, -400, sim.width + 800, sim.height + 800).fill({ color: 0xffffff, alpha: 0.3 });
      for (let i = 0; i < sim.width / 6; i++) snow.circle(rng.range(-200, sim.width + 200), rng.range(-200, sim.height + 200), rng.range(1.5, 3.5)).fill({ color: 0xffffff, alpha: 0.7 });
      this.ground.addChild(snow);
    }
    // The area's trouble: a goblin camp on the trail, a burning farm, or the gloom.
    if (sim.area.site) {
      const t = new Graphics();
      t.position.set(sim.area.site.x, sim.area.site.y - 90);
      if (sim.area.kind === 'corrupted') {
        // Gloom over the whole map, thickest around the heart.
        const fog = new Graphics();
        fog.rect(-400, -400, sim.width + 800, sim.height + 800).fill({ color: 0x3e2a5e, alpha: 0.16 });
        for (let i = 0; i < 6; i++) fog.circle(sim.area.site.x + 80 + (i - 3) * 50, sim.area.site.y + ((i * 37) % 60) - 30, 120).fill({ color: 0x5e3a8c, alpha: 0.08 });
        this.ground.addChild(fog);
      } else {
        drawSite(t, sim.area.kind === 'infested' ? 'camp' : 'raid');
        this.ground.addChild(t);
      }
    }
    // Town gate at the start of the trail.
    const gate = new Graphics();
    const s = sim.path[0];
    gate.rect(s.x - 250, s.y - 70, 40, 140).fill(0x8a6a44).stroke({ width: 3, color: 0x3a2414 });
    gate.poly([s.x - 262, s.y - 70, s.x - 230, s.y - 100, s.x - 198, s.y - 70]).fill(0x8e2b23).stroke({ width: 3, color: 0x3a2414 });
    this.ground.addChild(gate);
    for (const c of sim.chests) this.chestView(c);
    // Discoveries beside the trail: a picture, a plate, and a click opens the choice.
    for (const f of sim.finds) if (f.disc) void this.discoveryView(f);
    // Landmarks and hazards: what makes this trail its own.
    for (const hz of sim.hazards) this.hazardView(sim, hz);
    for (const lm of sim.landmarks) void this.landmarkView(lm);
    if (sim.life > 0) this.settlementView(sim);
    if (sim.delve) this.delveView(sim.delve);
    if (sim.relic) this.relicView(sim.relic);
    // The Lost Caravan: a rich wreck by the road.
    for (const c of sim.chests) {
      if (!c.lead) continue;
      const w = new Graphics();
      w.position.set(c.x + 50, c.y - 10);
      w.rotation = 0.25;
      w.rect(-40, -24, 80, 22).fill(0x6a4224).stroke({ width: 2.5, color: 0x2a1a10 });
      w.circle(-24, 0, 11).fill(0x5a3a20).stroke({ width: 2.5, color: 0x2a1a10 });
      w.moveTo(-36, -24).quadraticCurveTo(0, -64, 36, -24).fill({ color: 0xe8dcc0, alpha: 0.8 }).stroke({ width: 2, color: 0x2a1a10 });
      this.ground.addChild(w);
      const plate = makePlate('The Lost Caravan', 'A rare card: a rich wreck, an item for sure');
      plate.position.set(c.x, c.y - 100);
      this.fxLayer.addChild(plate);
      this.hover([{ x: c.x, y: c.y - 20 }], 80, () => plate);
    }
    for (const e of sim.encounters) this.encounterView(sim, e);
    for (const b of sim.ropeBridges) this.ropeView(b);
    if (sim.findSet) this.setView(sim);
    // Crossroads: a signpost where the side path leaves, and what waits at its end.
    for (const f of sim.forks) {
      if (f.kind === 'hoard') {
        // A chest's side path: a plate over the chest says what kind it is and who guards it.
        const c = sim.chests[f.chestId!];
        const story = c?.story ? STORY_PLATE[c.story] : null;
        const plate = story ? makePlate(story.title, story.text) : makePlate(CHEST_TITLE[c?.kind ?? 'chest'], c?.kind === 'crate' ? 'Unguarded: the Captain decides if it\'s worth the walk' : `Guarded${f.family ? ` by ${f.family.toLowerCase()}` : ''}${c?.kind === 'strongbox' ? '; locked (a Rogue opens it cleanly)' : c?.kind === 'ornate' ? '; holds an item' : ''}`);
        plate.position.set(f.poi.x, f.poi.y - 70);
        this.fxLayer.addChild(plate);
        this.forkPlates.set(f.id, plate);
        this.hover([f.poi], 50, () => this.forkPlates.get(f.id));
        continue;
      }
      const sign = new Graphics();
      sign.position.set(f.x, f.y - 40);
      sign.rect(-3, -34, 6, 40).fill(0x6e4a28).stroke({ width: 1.5, color: 0x2a1a10 });
      sign.poly([-22, -32, 18, -32, 26, -25, 18, -18, -22, -18]).fill(0xc9a46a).stroke({ width: 1.5, color: 0x2a1a10 });
      sign.poly([22, -14, -18, -14, -26, -7, -18, 0, 22, 0]).fill(0xb8935a).stroke({ width: 1.5, color: 0x2a1a10 });
      this.ground.addChild(sign);
      const site = new Graphics();
      site.position.set(f.poi.x, f.poi.y);
      drawSite(site, f.kind);
      this.ground.addChild(site);
      // What it is and what it does, on a little plate over it.
      const { title, text } = forkLabel(f);
      const plate = makePlate(title, text);
      plate.position.set(f.poi.x, f.poi.y - 150);
      this.fxLayer.addChild(plate);
      this.forkPlates.set(f.id, plate);
      this.hover([{ x: f.poi.x, y: f.poi.y - 40 }, { x: f.x, y: f.y - 60 }], 60, () => this.forkPlates.get(f.id));
    }
    this.cam = { ...sim.leader };
  }

  /** Registers a spot that shows a plate while the pointer is over it. */
  private hover(pts: { x: number; y: number }[], r: number, plate: () => Container | null | undefined, follow = false) {
    const entry = { pts, r, plate, follow };
    this.hovers.push(entry);
    const p = plate();
    if (p) p.visible = false;
  }

  /** Shows the one plate the pointer is over (the nearest, if spots overlap) and hides the rest. */
  private updateHovers() {
    if (this.pointer) this.aim = this.world.toLocal(this.pointer);
    const a = this.aim;
    let best: { plate: Container; d: number; at: { x: number; y: number }; follow: boolean } | null = null;
    for (const hv of this.hovers) {
      const plate = hv.plate();
      if (!plate || plate.destroyed) continue;
      plate.visible = false;
      if (!a) continue;
      for (const q of hv.pts) {
        const d = Math.hypot(a.x - q.x, a.y - q.y);
        if (d < hv.r && (!best || d < best.d)) best = { plate, d, at: q, follow: hv.follow };
      }
    }
    if (best) {
      best.plate.visible = true;
      best.plate.alpha = 1;
      if (best.follow) best.plate.position.set(best.at.x, best.at.y - 70);
      // Over the party and the monsters.
      const parent = best.plate.parent;
      if (parent && parent === this.fxLayer) parent.setChildIndex(best.plate, parent.children.length - 1);
    }
  }

  /** The dungeon below the map: stone rooms in a row, the trap corridor, the locked door and its lever, the Warden's hall. */
  private doorGfx: Graphics | null = null;
  private delveView(d: Delve) {
    const g = new Graphics();
    const n = ROOM_ORDER.length;
    const left = d.x0;
    const right = d.x0 + n * ROOM_W;
    const top = d.y0 - 230;
    const bottom = d.y0 + 230;
    // The dungeon's mouth at the end of the trail.
    const e = d.entrance;
    g.ellipse(e.x, e.y + 4, 70, 16).fill({ color: 0x000000, alpha: 0.3 });
    g.poly([e.x - 60, e.y, e.x - 60, e.y - 70, e.x - 30, e.y - 100, e.x + 30, e.y - 100, e.x + 60, e.y - 70, e.x + 60, e.y]).fill(0x8a8478).stroke({ width: 3, color: 0x2a1a10 });
    g.poly([e.x - 34, e.y, e.x - 34, e.y - 56, e.x, e.y - 76, e.x + 34, e.y - 56, e.x + 34, e.y]).fill(0x14100c);
    // Floor, flagstones and the outer wall.
    g.rect(left, top, right - left, bottom - top).fill(0x3a332c);
    for (let x = left; x < right; x += 64) g.moveTo(x, top).lineTo(x, bottom).stroke({ width: 1, color: 0x2e2822, alpha: 0.8 });
    for (let y = top; y < bottom; y += 48) g.moveTo(left, y).lineTo(right, y).stroke({ width: 1, color: 0x2e2822, alpha: 0.8 });
    g.rect(left - 30, top - 30, right - left + 60, bottom - top + 60).stroke({ width: 60, color: 0x1a1410 });
    g.rect(left, top, right - left, bottom - top).stroke({ width: 4, color: 0x5a5046 });
    // Walls between the rooms, each with a doorway on the corridor.
    for (let i = 1; i < n; i++) {
      const x = left + i * ROOM_W;
      g.rect(x - 14, top, 28, d.y0 - 80 - top).fill(0x1a1410).stroke({ width: 3, color: 0x5a5046 });
      g.rect(x - 14, d.y0 + 80, 28, bottom - d.y0 - 80).fill(0x1a1410).stroke({ width: 3, color: 0x5a5046 });
    }
    // Torches on the top wall of every room.
    for (let i = 0; i < n; i++) {
      const x = left + i * ROOM_W + ROOM_W / 2;
      g.circle(x, top + 14, 26).fill({ color: 0xff9a3c, alpha: 0.18 });
      g.rect(x - 3, top + 4, 6, 18).fill(0x6a4224);
      g.circle(x, top + 4, 6).fill(0xffb84a);
    }
    // The stairs down.
    for (let i = 0; i < 5; i++) g.rect(d.stairs.x - 40 + i * 8, d.y0 - 60 + i * 6, 40, 120 - i * 12).fill(i % 2 ? 0x5a5046 : 0x6a6056).stroke({ width: 1.5, color: 0x2a1a10 });
    for (const r of d.rooms) {
      const x0 = left + ROOM_ORDER.indexOf(r.kind) * ROOM_W;
      if (r.kind === 'traps') {
        // Pressure plates down the corridor, dart holes in the walls.
        for (let x = x0 + 60; x < x0 + ROOM_W - 40; x += 70) g.rect(x, d.y0 - 14 + ((x / 70) % 2) * 20, 26, 18).fill(0x4e463e).stroke({ width: 1.5, color: 0x2a1a10 });
        for (let x = x0 + 50; x < x0 + ROOM_W - 30; x += 46) {
          g.circle(x, top + 8, 4).fill(0x0a0806);
          g.circle(x + 20, bottom - 8, 4).fill(0x0a0806);
        }
      } else if (r.kind === 'crypt') {
        for (const [dx, dy] of [[-170, -140], [-60, -150], [140, 140], [40, 150]] as const) {
          g.rect(r.cx + dx - 34, d.y0 + dy - 18, 68, 36).fill(0x6a6056).stroke({ width: 2.5, color: 0x2a1a10 });
          g.moveTo(r.cx + dx, d.y0 + dy - 14).lineTo(r.cx + dx, d.y0 + dy + 14).moveTo(r.cx + dx - 8, d.y0 + dy - 4).lineTo(r.cx + dx + 8, d.y0 + dy - 4).stroke({ width: 2, color: 0x3a332c });
        }
      } else if (r.kind === 'warden') {
        g.rect(r.cx + 20, d.y0 - 70, 150, 140).fill(0x4e3a2e).stroke({ width: 3, color: 0x2a1a10 });
        g.rect(r.cx + 130, d.y0 - 40, 30, 80).fill(0x6a2a20).stroke({ width: 2.5, color: 0x2a1a10 });
        for (const y of [-180, 180]) g.rect(r.cx - 220, d.y0 + y - 10, 440, 20).fill({ color: 0x8e2b23, alpha: 0.6 });
      }
    }
    this.ground.addChild(g);
    // The locked door (drawn over the floor; it disappears when opened), and the lever.
    const door = new Graphics();
    const dx = d.door.x;
    door.rect(dx - 12, d.y0 - 80, 24, 160).fill(0x3e3a36).stroke({ width: 3, color: 0x1a1410 });
    for (let y = d.y0 - 70; y < d.y0 + 80; y += 22) door.moveTo(dx - 12, y).lineTo(dx + 12, y).stroke({ width: 2, color: 0x6a6056 });
    door.circle(dx, d.y0, 6).fill(0xc9a24a);
    this.ground.addChild(door);
    this.doorGfx = door;
    const lever = new Graphics();
    lever.position.set(d.door.lever.x, d.door.lever.y);
    lever.rect(-10, -6, 20, 12).fill(0x4e463e).stroke({ width: 2, color: 0x1a1410 });
    lever.moveTo(0, 0).lineTo(-12, -26).stroke({ width: 5, color: 0x6a4224 });
    lever.circle(-12, -26, 6).fill(0xb83a2a).stroke({ width: 2, color: 0x1a1410 });
    lever.eventMode = 'static';
    lever.cursor = 'pointer';
    lever.hitArea = { contains: (x: number, y: number) => x * x + (y + 12) * (y + 12) < 40 * 40 };
    lever.on('pointerdown', (ev) => {
      ev.stopPropagation();
      this.clickedFind = true;
      this.game.input({ kind: 'lever' });
    });
    this.ground.addChild(lever);
    const plate = makePlate('The lever', 'Click it to open the locked door at once');
    plate.position.set(d.door.lever.x, d.door.lever.y - 70);
    this.fxLayer.addChild(plate);
    this.hover([{ x: d.door.lever.x, y: d.door.lever.y - 12 }], 60, () => plate);
    const mouth = makePlate('The way down', 'A dungeon: five rooms, a Warden, and a vault');
    mouth.position.set(e.x, e.y - 140);
    this.fxLayer.addChild(mouth);
    this.hover([{ x: e.x, y: e.y - 40 }], 90, () => mouth);
  }

  /** Shrine of the Old Gods: standing stones round an altar, glowing. */
  private relicView(r: { x: number; y: number }) {
    const g = new Graphics();
    g.ellipse(r.x, r.y, 70, 22).fill({ color: 0xf1d27a, alpha: 0.18 });
    for (const [dx, dy] of [[-56, -6], [-28, -22], [28, -22], [56, -6]] as const) {
      g.poly([r.x + dx - 9, r.y + dy, r.x + dx - 7, r.y + dy - 54, r.x + dx + 7, r.y + dy - 58, r.x + dx + 9, r.y + dy]).fill(0x9a947e).stroke({ width: 2.5, color: 0x2a1a10 });
    }
    g.rect(r.x - 22, r.y - 22, 44, 22).fill(0xb4a988).stroke({ width: 2.5, color: 0x2a1a10 });
    g.circle(r.x, r.y - 34, 8).fill(0xfff3a0).stroke({ width: 2, color: 0xe2b84a });
    this.ground.addChild(g);
    const plate = makePlate('Shrine of the Old Gods', 'A rare card: heals the party and blesses the trip');
    plate.position.set(r.x, r.y - 110);
    this.fxLayer.addChild(plate);
    this.hover([{ x: r.x, y: r.y - 20 }], 90, () => plate);
  }

  /** The settlement at the start of the trail: houses (more as it grows), and a market stall in a town. */
  private settlementView(sim: Sim) {
    const g = new Graphics();
    const start = sim.path[0];
    const n = [0, 2, 4, 6][sim.life] ?? 0;
    const spots: [number, number][] = [[-150, -150], [-60, -170], [-170, 150], [-70, 165], [-250, -90], [-260, 80]];
    const roofs = [0x8e2b23, 0x6a4a2a, 0x8a5a32, 0x7a3a2a, 0x5e4a3a, 0x8e2b23];
    for (let i = 0; i < n; i++) {
      const [dx, dy] = spots[i];
      const x = start.x + dx;
      const y = start.y + dy;
      g.ellipse(x, y + 2, 40, 9).fill({ color: 0x000000, alpha: 0.2 });
      g.rect(x - 30, y - 40, 60, 42).fill(0xe8dcc0).stroke({ width: 2.5, color: 0x2a1a10 });
      g.poly([x - 38, y - 38, x, y - 70, x + 38, y - 38]).fill(roofs[i]).stroke({ width: 2.5, color: 0x2a1a10 });
      g.rect(x - 7, y - 20, 14, 22).fill(0x6a4224).stroke({ width: 1.5, color: 0x2a1a10 });
      g.rect(x + 12, y - 30, 10, 9).fill(sim.time === 'night' ? 0xf2d26a : 0x9ec3f0).stroke({ width: 1.5, color: 0x2a1a10 });
    }
    if (sim.life >= 3) {
      const x = start.x - 120;
      const y = start.y + 40;
      g.rect(x - 34, y - 26, 68, 26).fill(0x8a5a32).stroke({ width: 2, color: 0x2a1a10 });
      for (let i = 0; i < 4; i++) g.rect(x - 38 + i * 19, y - 46, 19, 18).fill(i % 2 ? 0xe8dcc0 : 0xb83a2a).stroke({ width: 1.5, color: 0x2a1a10 });
      g.circle(x - 16, y - 30, 6).fill(0xe2b84a);
      g.circle(x + 6, y - 30, 6).fill(0x9cb25e);
    }
    this.ground.addChild(g);
    const plate = makePlate(['', 'A hamlet', 'A village', 'A market town'][sim.life], 'It grew because the guild keeps this land safe');
    plate.position.set(start.x - 130, start.y - 220);
    this.fxLayer.addChild(plate);
    this.hover([{ x: start.x - 130, y: start.y - 40 }], 160, () => plate);
  }

  /** A find set's three markers: click one while the party is near to light it. */
  private markerGfx = new Map<number, Graphics>();
  private setView(sim: Sim) {
    const set = sim.findSet!;
    const info = SET_INFO[set.kind];
    for (const m of set.markers) {
      const g = new Graphics();
      g.position.set(m.x, m.y);
      drawMarker(g, set.kind, false);
      g.eventMode = 'static';
      g.cursor = 'pointer';
      g.hitArea = { contains: (x: number, y: number) => x * x + (y + 30) * (y + 30) < 46 * 46 };
      g.on('pointerdown', (e) => {
        e.stopPropagation();
        this.clickedFind = true;
        this.game.input({ kind: 'marker', id: m.id });
      });
      this.ground.addChild(g);
      this.markerGfx.set(m.id, g);
      const plate = makePlate(`${info.one} (${m.id + 1} of 3)`, 'Click it while the party is near. Light all three for a secret');
      plate.position.set(m.x, m.y - 100);
      this.fxLayer.addChild(plate);
      this.hover([{ x: m.x, y: m.y - 30 }], 60, () => plate);
    }
  }

  /** A gorge across the trail and a rope bridge over it. */
  private ropeView(b: { from: number; to: number; x: number; y: number; dir: { x: number; y: number } }) {
    const len = b.to - b.from;
    const g = new Graphics();
    g.position.set(b.x, b.y);
    g.rotation = Math.atan2(b.dir.y, b.dir.x);
    const gap = len / 2 - 22;
    // The gorge: dark rock falling away, with lit edges.
    g.rect(-gap, -1000, gap * 2, 2000).fill(0x2a2420);
    g.rect(-gap + 18, -1000, gap * 2 - 36, 2000).fill(0x1a1612);
    g.moveTo(-gap, -1000).lineTo(-gap, 1000).moveTo(gap, -1000).lineTo(gap, 1000).stroke({ width: 5, color: 0x8a7a64 });
    // The bridge: planks on two ropes, sagging a little.
    for (let x = -len / 2; x <= len / 2; x += 13) {
      const sag = Math.sin(((x + len / 2) / len) * Math.PI) * 6;
      g.rect(x - 4, -20 + sag, 9, 40).fill(0x9a6a3a).stroke({ width: 1.2, color: 0x2a1a10 });
    }
    for (const side of [-24, 24]) {
      g.moveTo(-len / 2, side);
      for (let x = -len / 2; x <= len / 2; x += 10) g.lineTo(x, side + Math.sin(((x + len / 2) / len) * Math.PI) * 8);
      g.stroke({ width: 3, color: 0xc8a46a });
    }
    for (const x of [-len / 2, len / 2]) for (const y of [-26, 26]) g.circle(x, y, 6).fill(0x6a4224).stroke({ width: 2, color: 0x2a1a10 });
    this.ground.addChild(g);
    const plate = makePlate('Rope bridge', 'Single file and slow across the gorge');
    plate.position.set(b.x, b.y - 90);
    this.fxLayer.addChild(plate);
    this.hover([{ x: b.x, y: b.y }], 110, () => plate);
  }

  /** An encounter's scenery (bushes for an ambush, a river and bridge for the troll) and its plate. */
  private encounterView(sim: Sim, e: Encounter) {
    if (e.kind === 'ambush') {
      // Rustling bushes where the ambushers hide.
      const g = new Graphics();
      const rng = new Rng(e.id * 97 + 13);
      for (const u of sim.units) {
        if (u.group !== e.groups[0]) continue;
        for (let i = 0; i < 3; i++) {
          const x = u.x + rng.range(-22, 22);
          const y = u.y + rng.range(-6, 10);
          g.circle(x, y - 16, rng.range(16, 22)).fill(i % 2 ? 0x4e6a34 : 0x5e7a3e).stroke({ width: 2, color: 0x2a3a1c });
        }
        g.circle(u.x + 6, u.y - 26, 3).fill(0x8e2b23);
      }
      this.ground.addChild(g);
    }
    if (e.kind === 'bridge') {
      // A river across the trail, and a plank bridge over it.
      const dir = e.dir ?? { x: 1, y: 0 };
      const g = new Graphics();
      g.position.set(e.x, e.y);
      g.rotation = Math.atan2(dir.y, dir.x);
      g.rect(-42, -1000, 84, 2000).fill({ color: 0x5e94aa, alpha: 0.92 });
      g.moveTo(-42, -1000).lineTo(-42, 1000).moveTo(42, -1000).lineTo(42, 1000).stroke({ width: 4, color: 0x3e6a7a });
      for (let y = -900; y < 900; y += 70) g.moveTo(-20, y).lineTo(-6, y + 12).stroke({ width: 2, color: 0xcfe8f2, alpha: 0.7 });
      g.rect(-64, -38, 128, 76).fill(0x8a5a32).stroke({ width: 3, color: 0x2a1a10 });
      for (let x = -48; x < 64; x += 16) g.moveTo(x, -38).lineTo(x, 38).stroke({ width: 1.5, color: 0x5a3a20 });
      g.rect(-64, -44, 128, 8).fill(0x6a4224).stroke({ width: 2, color: 0x2a1a10 });
      g.rect(-64, 36, 128, 8).fill(0x6a4224).stroke({ width: 2, color: 0x2a1a10 });
      this.ground.addChild(g);
    }
    const info = ENCOUNTER_PLATE[e.kind];
    if (!info) return;
    const plate = makePlate(info.title, info.text);
    plate.position.set(e.x, e.y - (e.kind === 'brawl' ? 130 : 110));
    this.fxLayer.addChild(plate);
    this.hover([{ x: e.x, y: e.y - 20 }], e.kind === 'brawl' ? 130 : 80, () => plate);
  }

  /** A landmark: a big picture beside the trail, and a plate saying what it is. */
  private async landmarkView(lm: SimLandmark): Promise<void> {
    const d = LANDMARK_BY_ID[lm.key];
    if (!d) return;
    const root = new Container();
    root.position.set(lm.x, lm.y);
    const art = new Sprite(await landmarkTexture(d.art));
    art.anchor.set(0.5, 140 / 150);
    art.scale.set(0.5);
    const plate = makePlate(d.name, d.text);
    plate.position.set(lm.x, lm.y - 150);
    root.addChild(art);
    this.ground.addChild(root);
    this.fxLayer.addChild(plate);
    this.landmarkGfx.set(lm.id, root);
    this.landmarkPlates.set(lm.id, plate);
    this.hover([{ x: lm.x, y: lm.y - 70 }], 80, () => this.landmarkPlates.get(lm.id));
  }

  /** A hazard painted along its stretch of trail, with a plate where it starts. */
  private hazardView(sim: Sim, hz: SimHazard) {
    const hd = HAZARDS[hz.kind];
    const g = new Graphics();
    const over = new Graphics();
    const rng = new Rng(hz.from | 0);
    for (let d = hz.from; d <= hz.to; d += 28) {
      const { p, dir } = pointAt(sim, d);
      const nx = -dir.y;
      const ny = dir.x;
      const side = (k: number) => ({ x: p.x + nx * k, y: p.y + ny * k });
      switch (hz.kind) {
        case 'mud':
        case 'bog': {
          const q = side(rng.range(-30, 30));
          g.ellipse(q.x, q.y, rng.range(18, 30), rng.range(8, 13)).fill({ color: hz.kind === 'bog' ? 0x3e4a30 : 0x6e5034, alpha: 0.75 });
          if (rng.chance(0.3)) g.circle(q.x + 6, q.y - 2, 3).stroke({ width: 1.5, color: hz.kind === 'bog' ? 0x7fa35a : 0x9a7a54 });
          break;
        }
        case 'ford':
        case 'ice': {
          const a = side(-60);
          const b = side(60);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 34, color: hz.kind === 'ice' ? 0xcfe8f2 : 0x5e94aa, alpha: 0.85 });
          if (hz.kind === 'ice' && rng.chance(0.4)) g.moveTo(p.x - 10, p.y - 4).lineTo(p.x + 12, p.y + 2).stroke({ width: 2, color: 0xffffff });
          if (hz.kind === 'ford' && rng.chance(0.35)) g.ellipse(p.x + rng.range(-20, 20), p.y + rng.range(-8, 8), 8, 5).fill(0x9a9284).stroke({ width: 1.5, color: 0x2a1a10 });
          break;
        }
        case 'brambles':
          for (const k of [-46, 46]) {
            const q = side(k + rng.range(-10, 10));
            g.circle(q.x, q.y, rng.range(12, 18)).fill(0x3e5a2e);
            g.moveTo(q.x - 14, q.y).lineTo(q.x + 14, q.y - 6).moveTo(q.x - 6, q.y - 12).lineTo(q.x + 8, q.y + 10).stroke({ width: 1.6, color: 0x2a1a10 });
            if (rng.chance(0.4)) g.circle(q.x + 4, q.y - 6, 2.4).fill(0x8e2b23);
          }
          if (rng.chance(0.4)) { const q = side(rng.range(-20, 20)); g.moveTo(q.x - 12, q.y).quadraticCurveTo(q.x, q.y - 10, q.x + 12, q.y).stroke({ width: 2.4, color: 0x4e6a34 }); }
          break;
        case 'scree':
        case 'rubble':
          for (let i = 0; i < 3; i++) {
            const q = side(rng.range(-55, 55));
            const s = hz.kind === 'rubble' ? rng.range(6, 12) : rng.range(3, 7);
            if (hz.kind === 'rubble') g.rect(q.x - s, q.y - s * 0.7, s * 2, s * 1.4).fill(0xb4a988).stroke({ width: 1.5, color: 0x4e4232 });
            else g.circle(q.x, q.y, s).fill(0x9a947e).stroke({ width: 1.2, color: 0x4e4232 });
          }
          break;
        case 'snowdrift': {
          const q = side(rng.range(-40, 40));
          g.ellipse(q.x, q.y, rng.range(26, 40), rng.range(10, 16)).fill({ color: 0xf4f8fa, alpha: 0.95 }).stroke({ width: 1.5, color: 0xb0c0ca });
          break;
        }
        case 'heat': {
          const q = side(rng.range(-40, 40));
          g.moveTo(q.x - 16, q.y).lineTo(q.x - 4, q.y - 5).lineTo(q.x + 6, q.y + 3).lineTo(q.x + 16, q.y - 2).stroke({ width: 3, color: 0xff6a2a, alpha: 0.85 });
          break;
        }
        case 'fog': {
          const q = side(rng.range(-80, 80));
          over.circle(q.x, q.y - 20, rng.range(40, 70)).fill({ color: 0xeef0f4, alpha: 0.18 });
          break;
        }
        case 'gusts': {
          const q = side(rng.range(-80, 80));
          over.moveTo(q.x - 30, q.y - 30).quadraticCurveTo(q.x, q.y - 44, q.x + 30, q.y - 30).stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
          break;
        }
      }
    }
    this.ground.addChild(g);
    this.fxLayer.addChild(over);
    const start = pointAt(sim, hz.from).p;
    const plate = makePlate(hd.name, hd.text);
    plate.position.set(start.x, start.y - 90);
    this.fxLayer.addChild(plate);
    const pts: { x: number; y: number }[] = [];
    for (let d = hz.from; d <= hz.to; d += 50) pts.push(pointAt(sim, d).p);
    // Over the stretch, the plate follows the pointer's nearest spot on it.
    this.hover(pts, 60, () => plate, true);
  }

  /** A chest on the map, drawn by kind. */
  private chestView(c: Chest): Graphics {
    const cg = new Graphics();
    cg.position.set(c.x, c.y);
    drawChest(cg, false, c.kind);
    this.ground.addChild(cg);
    this.chestGfx.set(c.id, cg);
    return cg;
  }

  /** A discovery: its picture, a plate saying what it is, and a click to choose. */
  private async discoveryView(f: Find): Promise<void> {
    const d = DISCOVERY_BY_ID[f.disc!];
    const root = new Container();
    root.position.set(f.x, f.y);
    const glow = new Graphics().ellipse(0, -4, 40, 14).fill({ color: 0xf1d27a, alpha: 0.25 }).stroke({ width: 2, color: 0xf1d27a, alpha: 0.8 });
    glow.label = 'glow';
    const art = new Sprite(await discTexture(d.id));
    art.anchor.set(0.5, 60 / 70);
    art.scale.set(0.62);
    art.label = 'art';
    const plate = makePlate(d.name, 'Click to choose what the party does');
    plate.position.set(f.x, f.y - 78);
    root.addChild(glow, art);
    this.fxLayer.addChild(plate);
    this.discPlates.set(f.id, plate);
    this.hover([{ x: f.x, y: f.y - 20 }], 50, () => this.discPlates.get(f.id));
    root.eventMode = 'static';
    root.cursor = 'pointer';
    root.hitArea = { contains: (x: number, y: number) => x * x + (y + 20) * (y + 20) < 48 * 48 };
    root.on('pointerdown', (e) => {
      e.stopPropagation();
      this.clickedFind = true;
      if (f.decided == null) this.onDiscovery(f.id);
    });
    this.fxLayer.addChild(root);
    this.discGfx.set(f.id, root);
  }

  private async unitView(u: Unit): Promise<void> {
    const root = new Container();
    const small = u.pet || u.minion;
    const shadow = new Graphics().ellipse(0, 0, u.side === 'hero' ? 26 : 24, 8).fill({ color: 0x000000, alpha: 0.3 });
    // Party members get a gold ring; their animals and raised dead a thinner green one.
    const ring = new Graphics().ellipse(0, 0, small ? 22 : 26, small ? 7 : 8)
      .stroke({ width: small ? 1.8 : 2.5, color: u.side === 'enemy' ? 0xd8423a : small ? 0x7fd99a : 0xe2b84a });
    const aura = new Graphics();
    const sprite = new Sprite(Texture.EMPTY);
    sprite.anchor.set(0.5, 104 / 112);
    // Named bosses made from ordinary monsters (a Warden, a Great beast, a chief) are drawn half again as big.
    const grand = u.boss && !ENEMY_BY_ID[u.key]?.boss ? 1.5 : 1;
    sprite.scale.set(SPRITE_SCALE * grand);
    const hp = new Graphics();
    root.addChild(shadow, aura, ring, sprite, hp);
    root.position.set(u.x, u.y);
    this.unitLayer.addChild(root);
    const view: UnitView = { root, sprite, hp, aura, dx: u.x, dy: u.y, deadT: 0 };
    this.units.set(u.id, view);
    sprite.texture = await svgTexture(u.sprite);
  }

  private frame(dt: number) {
    // A hidden tab can hand back one huge step; keep the camera and effects sane.
    dt = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.1) : 0;
    const sim = this.game.sim;
    if (!sim) return;
    if (sim !== this.builtFor) this.build(sim);
    this.time += dt;

    // Units: smooth toward simulated positions.
    for (const u of sim.units) {
      let v = this.units.get(u.id);
      if (!v) {
        void this.unitView(u);
        continue;
      }
      const away = u.gone || (u.side === 'enemy' && sim.groups[u.group]?.hidden);
      v.root.visible = !away;
      if (away) {
        v.dx = u.x;
        v.dy = u.y;
        continue;
      }
      const k = Math.min(1, dt * 12);
      v.dx += (u.x - v.dx) * k;
      v.dy += (u.y - v.dy) * k;
      v.root.position.set(v.dx, v.dy);
      v.sprite.scale.x = Math.abs(v.sprite.scale.y) * (u.facing === -1 ? -1 : 1);
      const stays = u.side === 'hero' && !u.minion; // fallen heroes and animals stay on the field
      if (!u.alive) {
        v.deadT += dt;
        v.sprite.rotation = Math.min(Math.PI / 2, v.deadT * 6) * (u.side === 'hero' ? -1 : 1);
        v.sprite.tint = 0x888888;
        v.root.alpha = stays ? 0.85 : Math.max(0, 1 - v.deadT / 2.5);
        v.hp.clear();
        v.aura.clear();
      } else {
        // Back on their feet (Second Wind, or an animal limping back).
        if (v.deadT > 0) {
          v.deadT = 0;
          v.sprite.rotation = 0;
          v.root.alpha = 1;
        }
        const tick = sim.tick;
        const slowed = (u.slowUntil ?? 0) > tick;
        v.sprite.tint = u.minion ? 0x9fffc8 : slowed ? 0xa8d8ff : 0xffffff;
        if (u.minion) v.sprite.alpha = 0.8;
        drawAura(v.aura, u, tick, this.time);
        // A small bob while moving.
        v.sprite.y = Math.sin(this.time * 9 + u.id) * 1.2;
        v.hp.clear();
        if (u.hp < u.maxHp) {
          const w = 34;
          v.hp.rect(-w / 2, -50, w, 5).fill(0x2a1e14);
          v.hp.rect(-w / 2, -50, (w * u.hp) / u.maxHp, 5).fill(u.side === 'hero' ? 0x6fcb6a : 0xd8423a);
        }
      }
      v.root.zIndex = v.dy;
    }
    this.unitLayer.sortableChildren = true;

    // Chests.
    for (const c of sim.chests) {
      const g = this.chestGfx.get(c.id) ?? this.chestView(c);
      if (g.scale.x > 1) g.scale.set(Math.max(1, g.scale.x - dt * 1.5));
      // A mimic up and fighting is drawn as the monster, not the chest.
      g.visible = !c.mimicLive;
      if (c.taken && !g.label) {
        g.label = 'open';
        g.clear();
        drawChest(g, true, c.kind);
      }
    }
    // Landmarks: once passed, the plate says what the party got out of it.
    for (const lm of sim.landmarks) {
      const v = this.landmarkGfx.get(lm.id);
      if (!v || !lm.passed || v.label === 'done') continue;
      v.label = 'done';
      this.landmarkPlates.get(lm.id)?.destroy({ children: true });
      const plate = makePlate(LANDMARK_BY_ID[lm.key]?.name ?? '', lm.outcome ?? '');
      plate.position.set(lm.x, lm.y - 150);
      plate.visible = false;
      this.fxLayer.addChild(plate);
      this.landmarkPlates.set(lm.id, plate);
    }
    // Discoveries: once decided, the plate says what came of it.
    for (const f of sim.finds) {
      if (!f.disc) continue;
      const v = this.discGfx.get(f.id);
      if (!v || f.decided == null || v.label === 'done') continue;
      v.label = 'done';
      v.cursor = 'default';
      v.eventMode = 'none';
      this.discPlates.get(f.id)?.destroy({ children: true });
      const plate = makePlate(DISCOVERY_BY_ID[f.disc].name, `${f.outcome ?? ''}${f.by === 'captain' ? ' (Captain\'s call)' : ''}`);
      plate.position.set(f.x, f.y - 78);
      plate.visible = false;
      this.fxLayer.addChild(plate);
      this.discPlates.set(f.id, plate);
      const art = v.getChildByLabel('art');
      if (art) art.alpha = 0.7;
      const glow = v.getChildByLabel('glow');
      if (glow) glow.visible = false;
    }
    this.updateHovers();
    if (sim.delve && this.doorGfx) this.doorGfx.visible = !sim.delve.door.open;
    if (sim.findSet) {
      for (const m of sim.findSet.markers) {
        const g = this.markerGfx.get(m.id);
        if (!g) continue;
        if (m.lit && g.label !== 'lit') {
          g.label = 'lit';
          g.clear();
          drawMarker(g, sim.findSet.kind, true);
          g.cursor = 'default';
        }
        const near = !m.lit && !sim.findSet.opened && Math.hypot(sim.leader.x - m.x, sim.leader.y - m.y) < SET_REACH;
        g.alpha = near ? 0.75 + 0.25 * Math.sin(this.time * 6) : 1;
      }
    }
    // Finds the player can click.
    for (const f of sim.finds) {
      if (f.disc) continue;
      let g = this.findGfx.get(f.id);
      const live = !f.taken && sim.tick <= f.expires;
      if (!g && live) {
        g = new Graphics();
        g.position.set(f.x, f.y);
        if (f.merchant) {
          // A merchant's cart with a striped awning.
          g.ellipse(0, 6, 34, 8).fill({ color: 0x000000, alpha: 0.3 });
          g.rect(-28, -22, 56, 24).fill(0x8a5a34).stroke({ width: 2, color: 0x2a1a10 });
          g.poly([-34, -22, -28, -48, 28, -48, 34, -22]).fill(0xe6d7b4).stroke({ width: 2, color: 0x2a1a10 });
          for (const x of [-22, -6, 10]) g.poly([x, -48, x + 8, -48, x + 10, -22, x + 2, -22]).fill(0x8e2b23);
          g.circle(-18, 4, 8).fill(0x5a3a22).stroke({ width: 2, color: 0x2a1a10 });
          g.circle(18, 4, 8).fill(0x5a3a22).stroke({ width: 2, color: 0x2a1a10 });
          g.circle(0, -10, 6).fill(0xe2b84a);
          g.circle(0, -18, 40).stroke({ width: 2, color: 0xf1d27a });
        } else if (f.water) {
          // A water cistern on legs.
          g.circle(0, -12, 30).fill({ color: 0x9ec3f0, alpha: 0.18 }).stroke({ width: 2, color: 0x9ec3f0 });
          g.rect(-14, -6, 4, 10).fill(0x5a3a22).rect(10, -6, 4, 10).fill(0x5a3a22);
          g.roundRect(-18, -30, 36, 26, 6).fill(0x7a5232).stroke({ width: 2, color: 0x2a1a10 });
          g.ellipse(0, -30, 18, 6).fill(0x5e94aa).stroke({ width: 1.5, color: 0x2a1a10 });
          g.rect(-18, -20, 36, 3).fill(0x4a4e56);
        } else if (f.ballista) {
          // A ballista on a wooden frame, aimed at the sky.
          g.circle(0, -14, 34).fill({ color: 0xff9a3c, alpha: 0.14 }).stroke({ width: 2, color: 0xff9a3c });
          g.ellipse(0, 4, 26, 6).fill({ color: 0x000000, alpha: 0.3 });
          g.moveTo(-18, 2).lineTo(0, -14).lineTo(18, 2).stroke({ width: 5, color: 0x5a3a22 });
          g.moveTo(-14, -6).lineTo(20, -36).stroke({ width: 5, color: 0x7a5232 });
          g.moveTo(-6, -40).quadraticCurveTo(14, -32, 26, -14).stroke({ width: 3.5, color: 0x3a2414 });
          g.moveTo(-6, -40).lineTo(2, -18).lineTo(26, -14).stroke({ width: 1.5, color: 0xe6d7b4 });
          g.moveTo(4, -22).lineTo(30, -44).stroke({ width: 2.5, color: 0xc9cdd2 });
          g.poly([30, -44, 24, -42, 28, -38]).fill(0xc9cdd2);
        } else if (f.key) {
          // The prison key on a nail.
          g.circle(0, -8, 26).fill({ color: 0xf1d27a, alpha: 0.18 }).stroke({ width: 2, color: 0xf1d27a });
          g.circle(-8, -8, 7).stroke({ width: 3.5, color: 0xc9a24a });
          g.moveTo(-1, -8).lineTo(16, -8).stroke({ width: 3.5, color: 0xc9a24a });
          g.moveTo(10, -8).lineTo(10, -1).moveTo(15, -8).lineTo(15, -2).stroke({ width: 3, color: 0xc9a24a });
        } else if (f.keg && sim.siege?.kind === 'barrow_uprising') {
          // A flask of holy water.
          g.circle(0, -12, 26).fill({ color: 0xfff3c4, alpha: 0.18 }).stroke({ width: 2, color: 0xfff3c4 });
          g.roundRect(-9, -22, 18, 22, 7).fill(0x9ec3f0).stroke({ width: 2, color: 0x2a1a10 });
          g.rect(-4, -32, 8, 11).fill(0xd8d0c0).stroke({ width: 1.5, color: 0x2a1a10 });
          g.moveTo(0, -18).lineTo(0, -6).moveTo(-5, -12).lineTo(5, -12).stroke({ width: 2, color: 0xffffff });
        } else if (f.keg) {
          // A powder keg: click it to blow it up.
          g.ellipse(0, 4, 16, 5).fill({ color: 0x000000, alpha: 0.3 });
          g.roundRect(-12, -26, 24, 30, 6).fill(0x8a5a34).stroke({ width: 2, color: 0x2a1a10 });
          g.rect(-12, -19, 24, 3).fill(0x4a4e56);
          g.rect(-12, -6, 24, 3).fill(0x4a4e56);
          g.moveTo(0, -26).quadraticCurveTo(6, -34, 10, -32).stroke({ width: 2, color: 0x3a2414 });
          g.circle(10, -32, 3).fill(0xffb23a);
          g.circle(0, -10, 28).stroke({ width: 2, color: 0xff6a3a });
        } else {
          g.poly([0, -16, 4, -4, 16, 0, 4, 4, 0, 16, -4, 4, -16, 0, -4, -4]).fill(0xffe9a3);
          g.circle(0, 0, 22).stroke({ width: 2, color: 0xffe9a3 });
        }
        g.eventMode = 'static';
        g.cursor = 'pointer';
        g.hitArea = { contains: (x: number, y: number) => x * x + y * y < 34 * 34 };
        // React on press, not tap: the glint pulses and the camera pans, so a tap can miss.
        g.on('pointerdown', (e) => {
          e.stopPropagation();
          this.clickedFind = true;
          this.game.input({ kind: 'find', findId: f.id });
        });
        this.fxLayer.addChild(g);
        this.findGfx.set(f.id, g);
        if (f.merchant) {
          const plate = makePlate('Travelling merchant', `Click the cart: an item and tonics for ${f.gold} gold`);
          plate.position.set(f.x, f.y - 72);
          this.fxLayer.addChild(plate);
          this.findPlates.set(f.id, plate);
          this.hover([f], 45, () => this.findPlates.get(f.id));
        }
      }
      if (g) {
        if (!live) {
          g.destroy();
          this.findGfx.delete(f.id);
          this.findPlates.get(f.id)?.destroy({ children: true });
          this.findPlates.delete(f.id);
          continue;
        }
        const pulse = 0.6 + 0.4 * Math.sin(this.time * 6);
        g.alpha = f.keg ? 0.85 + 0.15 * pulse : pulse;
        g.scale.set(f.keg ? 1 : 0.9 + 0.2 * pulse);
      }
    }

    // Burning ground (Cinder Legion, dragon breath): flickering patches.
    this.fireLayer.clear();
    // Dragon breath about to land: a shadow and a growing ring of warning.
    for (const b of sim.siege?.breaths ?? []) {
      const p = Math.min(1, (sim.tick - b.from) / Math.max(1, b.at - b.from));
      const blink = 0.6 + 0.4 * Math.sin(this.time * 14);
      this.fireLayer.ellipse(b.x, b.y, b.r * (0.6 + 0.4 * p), b.r * 0.45 * (0.6 + 0.4 * p)).fill({ color: 0x140a0a, alpha: 0.25 + 0.25 * p });
      this.fireLayer.circle(b.x, b.y, b.r).stroke({ width: 4, color: 0xff3a2a, alpha: 0.5 + 0.5 * blink });
      this.fireLayer.circle(b.x, b.y, b.r * p).fill({ color: 0xff6a2a, alpha: 0.22 });
    }
    for (const f of sim.siege?.fires ?? []) {
      // Breath scorch fades out over its last few seconds.
      const fade = f.until === undefined ? 1 : Math.max(0, Math.min(1, (f.until - sim.tick) / 40));
      const flicker = (0.85 + 0.15 * Math.sin(this.time * 7 + f.x)) * fade;
      this.fireLayer.circle(f.x, f.y, f.r).fill({ color: 0xe8502a, alpha: 0.32 * flicker }).stroke({ width: 3, color: 0xff9a3c, alpha: 0.6 * fade });
      this.fireLayer.circle(f.x, f.y, f.r * 0.6).fill({ color: 0xffb23a, alpha: 0.28 * flicker });
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + f.x;
        const d = f.r * 0.55;
        this.fireLayer.poly([f.x + Math.cos(a) * d - 6, f.y + Math.sin(a) * d, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - 18 * flicker, f.x + Math.cos(a) * d + 6, f.y + Math.sin(a) * d]).fill({ color: 0xfff3a0, alpha: 0.7 * fade });
      }
    }

    // Targeting ring while a spell is armed.
    this.aimRing.clear();
    const armed = this.armedSpell ? SPELL_BY_ID[this.armedSpell] : null;
    if (armed && this.aim) {
      const col = SPELL_COLOR[armed.id] ?? 0xffffff;
      this.aimRing.circle(this.aim.x, this.aim.y, armed.radius).fill({ color: col, alpha: 0.12 }).stroke({ width: 2.5, color: col, alpha: 0.85 });
    }

    // New simulation events become effects.
    for (const ev of sim.events) this.spawnFx(ev);
    sim.events.length = 0;
    this.updateFx(dt);

    // Camera follows the living party: not a wagon or a lost traveller still waiting up the trail, not one
    // who has gone, and nobody far from the leader (a hero running over to a discovery stays in, close by).
    const party = sim.units.filter((u) => u.side === 'hero' && u.alive && !u.parked && !u.gone && Math.hypot(u.x - sim.leader.x, u.y - sim.leader.y) < 500);
    const cx = party.length ? party.reduce((s, u) => s + u.x, 0) / party.length : sim.leader.x;
    const cy = party.length ? party.reduce((s, u) => s + u.y, 0) / party.length : sim.leader.y;
    // Far away (after catching up on time away): jump there instead of a long pan.
    if (Math.hypot(cx - this.cam.x, cy - this.cam.y) > 1200) this.cam = { x: cx, y: cy };
    this.cam.x += (cx - this.cam.x) * Math.min(1, dt * 3);
    this.cam.y += (cy - this.cam.y) * Math.min(1, dt * 3);
    const scale = Math.max(1, Math.min(1.6, this.app.screen.height / 560));
    this.world.scale.set(scale);
    this.world.position.set(this.app.screen.width / 2 - this.cam.x * scale, this.app.screen.height / 2 - this.cam.y * scale);

    // Night: dark all round, lantern light around the party (the camera keeps them in the middle).
    this.sky.clear();
    const { width: w, height: h } = this.app.screen;
    if (sim.time === 'night') {
      this.sky.rect(0, 0, w, h).fill({ color: 0x0a1030, alpha: 0.32 }).circle(w / 2, h / 2, 320 * scale).cut();
      this.sky.rect(0, 0, w, h).fill({ color: 0x0a1030, alpha: 0.24 }).circle(w / 2, h / 2, 210 * scale).cut();
    }
    // A storm: darker skies and slanting rain.
    if (sim.stormUntil > sim.tick) {
      this.sky.rect(0, 0, w, h).fill({ color: 0x1e2838, alpha: 0.25 });
      for (let i = 0; i < 140; i++) {
        const x = Math.random() * (w + 200) - 100;
        const y = Math.random() * h;
        this.sky.moveTo(x, y).lineTo(x - 10, y + 26);
      }
      this.sky.stroke({ width: 1.5, color: 0xb8c8dc, alpha: 0.5 });
    }
  }

  private spawnFx(ev: SimEvent) {
    switch (ev.t) {
      case 'chest': {
        // The chest pops, coins burst out and fall, a flash of light; an item flies up to the party.
        const cg = [...this.chestGfx.values()].find((g) => Math.hypot(g.x - ev.x, g.y - ev.y) < 4);
        if (cg) cg.scale.set(1.35);
        const flash = new Graphics().circle(0, 0, 30).fill({ color: 0xfff3a0, alpha: 0.55 });
        flash.position.set(ev.x, ev.y - 20);
        this.fxLayer.addChild(flash);
        this.fx.push({ obj: flash, life: 0, max: 0.5, grow: true });
        const n = Math.min(16, 6 + Math.round(ev.gold / 8));
        for (let i = 0; i < n; i++) {
          const coin = new Graphics().circle(0, 0, 5).fill(0xf2c84a).stroke({ width: 1.5, color: 0x8a6a1a });
          coin.position.set(ev.x, ev.y - 18);
          this.fxLayer.addChild(coin);
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
          const sp = 160 + Math.random() * 160;
          this.fx.push({ obj: coin, life: 0, max: 1.3 + Math.random() * 0.3, vx: Math.cos(a) * sp, fall: { vy: Math.sin(a) * sp, floor: ev.y + 10 + Math.random() * 20 } });
        }
        if (ev.item && ITEM_BY_ID[ev.item]) {
          const icon = new Sprite(Texture.EMPTY);
          icon.anchor.set(0.5);
          icon.position.set(ev.x, ev.y - 30);
          this.fxLayer.addChild(icon);
          void itemTexture(ev.item).then((t) => { if (!icon.destroyed) icon.texture = t; });
          this.fx.push({ obj: icon, life: 0, max: 1.6, from: { x: ev.x, y: ev.y - 30 }, home: true });
        }
        break;
      }
      case 'hit':
      case 'heal':
      case 'loot': {
        const color = ev.t === 'heal' ? '#9ff0b0' : ev.t === 'loot' ? '#ffe49a' : ev.onHero ? '#ff9a7a' : ev.crit ? '#ffd27a' : '#ffffff';
        const label = ev.t === 'heal' ? `+${ev.amount}` : ev.t === 'loot' ? `+${ev.gold} gold` : ev.crit ? `${ev.amount}!` : String(ev.amount);
        const txt = new Text({ text: label, style: { fontFamily: 'Alegreya Sans', fontWeight: '700', fontSize: ev.t === 'loot' || (ev.t === 'hit' && ev.crit) ? 20 : 16, fill: color, stroke: { color: '#1b140e', width: 4 } } });
        txt.anchor.set(0.5);
        txt.position.set(ev.x + (Math.random() - 0.5) * 12, ev.y);
        this.fxLayer.addChild(txt);
        this.fx.push({ obj: txt, life: 0, max: ev.t === 'loot' ? 1.6 : 0.9, vy: -40 });
        break;
      }
      case 'shot': {
        const g = new Graphics();
        const col = ev.kind === 'magic' ? 0xb9fff0 : ev.kind === 'holy' ? 0xfff3c4 : ev.kind === 'dark' ? 0x8ef0a8 : 0x3a2414;
        if (ev.kind === 'bomb') g.circle(0, 0, 6).fill(0x2a2a2e).circle(4, -5, 2.5).fill(0xffb23a);
        else if (ev.kind === 'fire') g.circle(0, 0, 9).fill({ color: 0xff6a2a, alpha: 0.85 }).circle(0, 0, 5).fill(0xfff3a0);
        else if (ev.kind === 'magic' || ev.kind === 'holy' || ev.kind === 'dark') g.circle(0, 0, 5).fill(col).circle(0, 0, 9).fill({ color: ev.kind === 'dark' ? 0x2e2440 : col, alpha: 0.45 });
        else g.moveTo(-9, 0).lineTo(9, 0).stroke({ width: 2.5, color: col });
        g.rotation = Math.atan2(ev.toY - ev.fromY, ev.toX - ev.fromX);
        g.position.set(ev.fromX, ev.fromY);
        this.fxLayer.addChild(g);
        this.fx.push({ obj: g, life: 0, max: 0.22, from: { x: ev.fromX, y: ev.fromY }, to: { x: ev.toX, y: ev.toY } });
        break;
      }
      case 'spell': {
        const g = new Graphics();
        drawSpell(g, ev.spell, ev.r);
        g.position.set(ev.x, ev.y);
        this.fxLayer.addChild(g);
        this.fx.push({ obj: g, life: 0, max: ev.spell === 'meteor' ? 1.1 : 0.8 });
        break;
      }
      case 'piece': {
        const txt = new Text({ text: `+${ev.n} ${PACKS[ev.pack].name} piece${ev.n > 1 ? 's' : ''}`, style: { fontFamily: 'Alegreya Sans', fontWeight: '700', fontSize: 18, fill: PIECE_COLOR[ev.pack], stroke: { color: '#1b140e', width: 4 } } });
        txt.anchor.set(0.5);
        txt.position.set(ev.x, ev.y);
        this.fxLayer.addChild(txt);
        this.fx.push({ obj: txt, life: 0, max: 2, vy: -30 });
        break;
      }
      case 'log':
        this.onLog(ev.text);
        break;
      case 'shout': {
        const v = this.units.get(ev.id);
        if (!v) break;
        const c = new Container();
        const txt = new Text({ text: ev.text, style: { fontFamily: 'Alegreya Sans', fontWeight: '700', fontSize: 15, fill: '#2b1f14' } });
        txt.anchor.set(0.5);
        const w = txt.width + 16;
        const bubble = new Graphics()
          .roundRect(-w / 2, -14, w, 28, 10).fill(0xf6e9c9).stroke({ width: 2, color: 0x2b1f14 })
          .poly([-6, 13, 6, 13, 0, 22]).fill(0xf6e9c9);
        c.addChild(bubble, txt);
        c.position.set(v.dx, v.dy - 78);
        this.fxLayer.addChild(c);
        // One bubble per speaker: a new line replaces the last.
        for (const old of this.fx) if (old.follow === ev.id) old.life = old.max;
        this.fx.push({ obj: c, life: 0, max: 1.8, follow: ev.id });
        break;
      }
      case 'death':
        break;
    }
  }

  private updateFx(dt: number) {
    this.fx = this.fx.filter((f) => {
      f.life += dt;
      const t = f.life / f.max;
      if (t >= 1) {
        f.obj.destroy();
        return false;
      }
      if (f.follow !== undefined) {
        // Over the speaker's head as they move, lifting a little and fading at the end.
        const v = this.units.get(f.follow);
        if (v) f.obj.position.set(v.dx, v.dy - 78 - f.life * 8);
        f.obj.alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      } else if (f.fall) {
        f.fall.vy += 700 * dt;
        f.obj.x += (f.vx ?? 0) * dt;
        f.obj.y += f.fall.vy * dt;
        if (f.obj.y > f.fall.floor && f.fall.vy > 0) {
          f.obj.y = f.fall.floor;
          f.fall.vy *= -0.35;
          f.vx = (f.vx ?? 0) * 0.5;
        }
        f.obj.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      } else if (f.grow) {
        f.obj.scale.set(1 + t * 2.5);
        f.obj.alpha = 1 - t;
      } else if (f.home && f.from) {
        // Up and over to the party, shrinking into the pack.
        const to = { x: this.cam.x, y: this.cam.y - 40 };
        const k = t * t;
        f.obj.position.set(f.from.x + (to.x - f.from.x) * k, f.from.y + (to.y - f.from.y) * k - Math.sin(t * Math.PI) * 120);
        f.obj.scale.set(t < 0.25 ? 0.4 + t * 2.4 : 1 - (t - 0.25) * 0.7);
        f.obj.alpha = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
      } else if (f.from && f.to) f.obj.position.set(f.from.x + (f.to.x - f.from.x) * t, f.from.y + (f.to.y - f.from.y) * t);
      else if (f.vy) {
        f.obj.y += f.vy * dt;
        f.obj.alpha = 1 - t * t;
      } else f.obj.alpha = 1 - t;
      return true;
    });
  }
}

function segDist(x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
}

/** The Goblin Fortress: courtyard, stake wall with towers and a gateway, tents and the keep. */
/** The foot of Dragonmaw: scorched rock, the black mountain and the glowing mouth of the wyrm's cave. */
function drawDragonField(sim: Sim): Graphics {
  const sg = sim.siege!;
  const c = sg.field!;
  const m = sg.mound!;
  const g = new Graphics();
  g.ellipse(c.x + 180, c.y, 680, 410).fill({ color: 0x2e2420, alpha: 0.55 });
  // Bones of the brood's meals.
  for (let i = 0; i < 10; i++) {
    const x = c.x - 300 + ((i * 197) % 860);
    const y = c.y - 260 + ((i * 131) % 520);
    g.moveTo(x, y).lineTo(x + 26, y - 6).stroke({ width: 4, color: 0xe6dcc4, alpha: 0.7 });
    g.circle(x, y, 4).circle(x + 26, y - 6, 4).fill({ color: 0xe6dcc4, alpha: 0.7 });
  }
  // The mountain, with the cave mouth at its foot.
  g.poly([m.x - 20, m.y + 60, m.x + 140, m.y - 300, m.x + 260, m.y - 200, m.x + 420, m.y + 60]).fill(0x221c20).stroke({ width: 3, color: 0x0e0a0c });
  g.poly([m.x + 100, m.y - 210, m.x + 140, m.y - 300, m.x + 170, m.y - 240]).fill(0x4a3a40);
  g.ellipse(m.x + 110, m.y + 10, 90, 70).fill(0x0e0808);
  g.ellipse(m.x + 110, m.y + 20, 60, 40).fill({ color: 0xff8a3c, alpha: 0.25 });
  // Gold spilling out of the cave.
  for (let i = 0; i < 14; i++) g.circle(m.x + 50 + ((i * 37) % 130), m.y + 50 + ((i * 23) % 40), 5).fill(0xe2b84a);
  return g;
}

/** The Cinder Legion: black ground cracked with lava, and the Cinder Lord's spire. */
function drawCinderField(sim: Sim): Graphics {
  const sg = sim.siege!;
  const c = sg.field!;
  const m = sg.mound!;
  const g = new Graphics();
  g.ellipse(c.x + 160, c.y, 660, 400).fill({ color: 0x2a1e1a, alpha: 0.6 });
  for (let i = 0; i < 14; i++) {
    const x = c.x - 320 + ((i * 181) % 900);
    const y = c.y - 280 + ((i * 113) % 560);
    g.moveTo(x, y).lineTo(x + 40, y + 14).lineTo(x + 70, y - 6).stroke({ width: 4, color: 0xff6a2a, alpha: 0.7 });
  }
  // The black spire.
  g.poly([m.x + 60, m.y + 40, m.x + 100, m.y - 180, m.x + 140, m.y + 40]).fill(0x1e1a1c).stroke({ width: 3, color: 0x0e0a0a });
  g.poly([m.x + 90, m.y - 120, m.x + 100, m.y - 180, m.x + 110, m.y - 120]).fill(0xff6a2a);
  g.circle(m.x + 100, m.y - 60, 40).fill({ color: 0xff6a2a, alpha: 0.12 });
  return g;
}

/** The Barrow Uprising: a field of low mounds and standing stones, and the great mound. */
function drawBarrowField(sim: Sim): Graphics {
  const sg = sim.siege!;
  const c = sg.field!;
  const m = sg.mound!;
  const g = new Graphics();
  g.ellipse(c.x + 150, c.y, 620, 380).fill({ color: 0x5e6248, alpha: 0.55 });
  for (let i = 0; i < 18; i++) {
    const x = c.x - 300 + ((i * 173) % 860);
    const y = c.y - 300 + ((i * 97) % 600);
    g.ellipse(x, y, 34, 14).fill(0x7a7e60).stroke({ width: 1.5, color: 0x4e523e });
  }
  for (const [dx, dy] of [[-330, -120], [-330, 140], [560, -260], [560, 260], [40, 330], [40, -330]]) {
    g.rect(c.x + dx - 8, c.y + dy - 44, 16, 48).fill(0x8e8a7a).stroke({ width: 1.5, color: 0x3e3a34 });
  }
  // The great mound, with a dark doorway.
  g.ellipse(m.x + 90, m.y + 10, 170, 110).fill(0x6c7056).stroke({ width: 3, color: 0x3e3a34 });
  g.ellipse(m.x + 90, m.y - 10, 120, 70).fill(0x7a7e60);
  g.roundRect(m.x + 50, m.y - 40, 40, 56, 18).fill(0x1b140e);
  g.circle(m.x + 70, m.y - 60, 30).fill({ color: 0x7ff2c9, alpha: 0.12 });
  // Green mist low over the field.
  for (let i = 0; i < 8; i++) g.circle(c.x - 200 + i * 90, c.y + ((i * 53) % 160) - 80, 90).fill({ color: 0x7ff2c9, alpha: 0.05 });
  return g;
}

function drawFortress(sim: Sim): Graphics {
  const f = sim.siege!.fort!;
  // Goblins fly red, the Bandit King blue.
  const banner = sim.siege!.kind === 'bandit_hold' ? 0x2e4a7a : 0x8e2b23;
  const g = new Graphics();
  const right = f.wallX + 900;
  // Courtyard of trampled dirt.
  g.rect(f.wallX, f.top, right - f.wallX, f.bottom - f.top).fill(0x8f7a58);
  for (let i = 0; i < 40; i++) {
    const x = f.wallX + 40 + ((i * 197) % (right - f.wallX - 80));
    const y = f.top + 30 + ((i * 131) % (f.bottom - f.top - 60));
    g.ellipse(x, y, 30 + (i % 5) * 8, 10 + (i % 3) * 4).fill({ color: 0x7a6648, alpha: 0.5 });
  }
  // The keep: a great hall with eye banners.
  const k = f.keep;
  g.rect(k.x + 60, k.y - 170, 170, 340).fill(0x6e5a46).stroke({ width: 3, color: 0x2a1a10 });
  g.rect(k.x + 70, k.y - 160, 150, 320).fill(0x5a3a22);
  for (let y = k.y - 150; y < k.y + 150; y += 30) g.moveTo(k.x + 70, y).lineTo(k.x + 220, y).stroke({ width: 1.5, color: 0x3a2414 });
  g.rect(k.x + 50, k.y - 40, 26, 80).fill(0x2a1e14).stroke({ width: 2, color: 0x1b140e });
  for (const dy of [-120, 120]) {
    g.rect(k.x + 46, k.y + dy - 30, 6, 60).fill(0x3a2414);
    g.poly([k.x + 52, k.y + dy - 30, k.x + 80, k.y + dy - 26, k.x + 80, k.y + dy + 6, k.x + 66, k.y + dy, k.x + 52, k.y + dy + 6]).fill(banner).stroke({ width: 1.5, color: 0x2a1a10 });
    g.circle(k.x + 66, k.y + dy - 12, 5).fill(0xf2d23a).circle(k.x + 66, k.y + dy - 12, 2).fill(0x1b140e);
  }
  // Tents and a campfire.
  for (const [dx, dy] of [[170, -260], [260, 250], [120, 300], [330, -320], [420, 330]]) {
    const x = f.wallX + dx;
    const y = f.gateY + dy;
    g.poly([x - 34, y + 18, x, y - 30, x + 34, y + 18]).fill(0xb7ae94).stroke({ width: 2, color: 0x3b2a1c });
    g.poly([x - 6, y + 18, x, y - 4, x + 6, y + 18]).fill(0x3b2a1c);
  }
  const fx = f.wallX + 300;
  g.circle(fx, f.gateY + 200, 16).fill(0x5a4030).circle(fx, f.gateY + 200, 9).fill(0xff9a3c).circle(fx, f.gateY + 198, 4).fill(0xfff3a0);
  // The stake wall, with a gap for the gateway.
  const stake = (y: number) => {
    g.rect(f.wallX - 8, y - 34, 16, 38).fill(0x7a5232).stroke({ width: 1.5, color: 0x2a1a10 });
    g.poly([f.wallX - 8, y - 34, f.wallX, y - 46, f.wallX + 8, y - 34]).fill(0x9a6a3e).stroke({ width: 1.5, color: 0x2a1a10 });
  };
  for (let y = f.top; y <= f.bottom; y += 15) if (Math.abs(y - f.gateY) > f.gateHalf + 6) stake(y);
  for (let x = f.wallX + 15; x < right; x += 15) {
    for (const y of [f.top, f.bottom]) {
      g.rect(x - 8, y - 34, 16, 38).fill(0x7a5232).stroke({ width: 1.5, color: 0x2a1a10 });
    }
  }
  // Gateposts with skull banners.
  for (const dy of [-f.gateHalf - 10, f.gateHalf + 10]) {
    const y = f.gateY + dy;
    g.rect(f.wallX - 14, y - 70, 28, 74).fill(0x5a3a22).stroke({ width: 2, color: 0x1b140e });
    g.poly([f.wallX - 18, y - 70, f.wallX, y - 92, f.wallX + 18, y - 70]).fill(banner).stroke({ width: 2, color: 0x1b140e });
    g.circle(f.wallX, y - 40, 7).fill(0xeee8da).stroke({ width: 1.2, color: 0x1b140e });
  }
  // Towers: wooden platforms the archers stand on.
  for (const t of f.towers) {
    g.rect(t.x - 30, t.y - 22, 60, 34).fill(0x6e4a28).stroke({ width: 2, color: 0x1b140e });
    for (let x = t.x - 30; x < t.x + 30; x += 12) g.rect(x, t.y - 30, 7, 9).fill(0x7a5232).stroke({ width: 1, color: 0x1b140e });
    g.poly([t.x - 34, t.y + 12, t.x - 24, t.y + 40, t.x - 18, t.y + 12]).fill(0x5a3a22);
    g.poly([t.x + 18, t.y + 12, t.x + 24, t.y + 40, t.x + 34, t.y + 12]).fill(0x5a3a22);
  }
  return g;
}

/** Markers for spell effects on a unit, drawn at its feet or around it. */
function drawAura(g: Graphics, u: Unit, tick: number, time: number) {
  g.clear();
  if ((u.shield ?? 0) > 0) g.ellipse(0, -18, 30, 40).fill({ color: 0xd8cfb8, alpha: 0.18 }).stroke({ width: 2, color: 0xe8e0c8, alpha: 0.7 });
  if ((u.rootUntil ?? 0) > tick) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.moveTo(Math.cos(a) * 22, Math.sin(a) * 7).quadraticCurveTo(Math.cos(a) * 12, -14, Math.cos(a) * 6, -22).stroke({ width: 2.5, color: 0x5e9a3a });
    }
  }
  if ((u.hasteUntil ?? 0) > tick) g.ellipse(0, 0, 30, 10).stroke({ width: 2, color: 0xffd36a, alpha: 0.6 + 0.3 * Math.sin(time * 12) });
  if ((u.rallyUntil ?? 0) > tick) g.ellipse(0, 2, 33, 11).stroke({ width: 2, color: 0xf08a5a, alpha: 0.75 });
  if ((u.wardUntil ?? 0) > tick) g.circle(0, -84, 5).fill({ color: 0xfff6d8, alpha: 0.85 });
}

/** The burst when a spell lands. */
function drawSpell(g: Graphics, id: string, r: number) {
  const col = SPELL_COLOR[id] ?? 0xffffff;
  g.circle(0, 0, r).fill({ color: col, alpha: 0.25 }).stroke({ width: 3, color: col });
  const rand = () => Math.random();
  switch (id) {
    case 'heal_rain':
    case 'second_wind':
      for (let i = 0; i < 14; i++) {
        const a = rand() * Math.PI * 2;
        const d = rand() * r;
        g.moveTo(Math.cos(a) * d, Math.sin(a) * d - 10).lineTo(Math.cos(a) * d - 3, Math.sin(a) * d + 4).stroke({ width: 2, color: col });
      }
      if (id === 'second_wind') g.circle(0, 0, r * 0.5).stroke({ width: 4, color: 0xffffff, alpha: 0.7 });
      break;
    case 'lightning':
    case 'meteor': {
      let x = id === 'meteor' ? -220 : 0;
      let y = -260;
      g.moveTo(x, y);
      while (y < 0) {
        x += id === 'meteor' ? 44 : (rand() - 0.5) * 40;
        y += 40;
        g.lineTo(x, Math.min(0, y));
      }
      g.stroke({ width: id === 'meteor' ? 16 : 5, color: id === 'meteor' ? 0xffb27a : 0xfff6d0 });
      if (id === 'meteor') g.circle(0, 0, r * 0.6).fill({ color: 0xffd27a, alpha: 0.5 });
      break;
    }
    case 'fireball':
      g.circle(0, 0, r * 0.55).fill({ color: 0xffd27a, alpha: 0.55 });
      break;
    case 'keg':
      g.circle(0, 0, r * 0.7).fill({ color: 0xffd27a, alpha: 0.6 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4).lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1).stroke({ width: 3, color: 0x3a2a22, alpha: 0.7 });
      }
      break;
    case 'frost':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(0, 0).lineTo(Math.cos(a) * r, Math.sin(a) * r).stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
      }
      break;
    case 'entangle':
      for (let i = 0; i < 10; i++) {
        const a = rand() * Math.PI * 2;
        const d = rand() * r;
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        g.moveTo(x - 8, y).quadraticCurveTo(x, y - 24, x + 8, y - 6).stroke({ width: 3, color: 0x5e9a3a });
      }
      break;
    case 'reveal':
      for (let i = 0; i < 3; i++) g.circle(0, 0, r * (0.3 + i * 0.25)).stroke({ width: 1.5, color: col, alpha: 0.6 });
      break;
    default:
      g.circle(0, 0, r * 0.7).stroke({ width: 2, color: col, alpha: 0.7 });
  }
}

const CHEST_TITLE: Record<string, string> = { crate: 'Crate', chest: 'Iron-bound chest', strongbox: 'Locked strongbox', ornate: 'Ornate chest' };

/** A chest, by kind: a plain crate, an iron-bound chest, a locked strongbox, or an ornate gilded one. */
function drawChest(g: Graphics, open: boolean, kind = 'chest') {
  const k = kind === 'ornate' ? 1.25 : kind === 'crate' ? 0.9 : 1;
  const body = kind === 'crate' ? 0xb07a45 : kind === 'strongbox' ? 0x5e646b : kind === 'ornate' ? 0x6e2a5e : 0x8a5a34;
  const lid = kind === 'crate' ? 0xc08a5a : kind === 'strongbox' ? 0x7a8088 : kind === 'ornate' ? 0x8e3a7a : 0x9a6a3e;
  const trim = kind === 'ornate' ? 0xf1d27a : kind === 'strongbox' ? 0x3a3d44 : 0x4a4e56;
  if (kind === 'ornate' && !open) g.circle(0, -10, 30).fill({ color: 0xf1d27a, alpha: 0.18 });
  g.ellipse(0, 6, 18 * k, 5 * k).fill({ color: 0x000000, alpha: 0.3 });
  g.rect(-14 * k, -12 * k, 28 * k, 16 * k).fill(body).stroke({ width: 2, color: 0x2a1a10 });
  if (kind !== 'crate') g.rect(-14 * k, -6 * k, 28 * k, 2.5 * k).fill(trim);
  else g.moveTo(-14 * k, -12 * k).lineTo(14 * k, 4 * k).stroke({ width: 2, color: 0x7a5232 });
  if (open) g.rect(-14 * k, -26 * k, 28 * k, 10 * k).fill(lid).stroke({ width: 2, color: 0x2a1a10 });
  else g.rect(-15 * k, -18 * k, 30 * k, 8 * k).fill(lid).stroke({ width: 2, color: 0x2a1a10 });
  if (kind === 'strongbox') g.roundRect(-4 * k, -14 * k, 8 * k, 9 * k, 2).fill(0x2a2a2e).stroke({ width: 1.5, color: 0xc9ced4 });
  else if (kind !== 'crate') g.rect(-3 * k, -14 * k, 6 * k, 7 * k).fill(0xe2b84a);
  if (open) g.circle(0, -12 * k, 5 * k).fill(0xf1d27a);
}

const landmarkCache = new Map<string, Promise<Texture>>();
function landmarkTexture(art: string): Promise<Texture> {
  let p = landmarkCache.get(art);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(landmarkSvg(art));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 300;
      c.getContext('2d')!.drawImage(img, 0, 0, 320, 300);
      return Texture.from(c);
    })();
    landmarkCache.set(art, p);
  }
  return p;
}

const itemCache = new Map<string, Promise<Texture>>();
/** An item's icon, for the one flying out of a chest. */
function itemTexture(id: string): Promise<Texture> {
  let p = itemCache.get(id);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(itemIconSvg(ITEM_BY_ID[id]));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      c.getContext('2d')!.drawImage(img, 0, 0, 64, 64);
      return Texture.from(c);
    })();
    itemCache.set(id, p);
  }
  return p;
}

const discCache = new Map<string, Promise<Texture>>();
function discTexture(id: string): Promise<Texture> {
  let p = discCache.get(id);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(discoverySvg(id));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = 140;
      c.getContext('2d')!.drawImage(img, 0, 0, 160, 140);
      return Texture.from(c);
    })();
    discCache.set(id, p);
  }
  return p;
}

function drawScenery(g: Graphics, biome: string, x: number, y: number, rng: Rng) {
  const roll = rng.next();
  const tree = (s: number, dark: number, mid: number, light: number) => {
    g.ellipse(x + 6 * s, y + 10 * s, 20 * s, 7 * s).fill({ color: 0x1f2e18, alpha: 0.3 });
    g.rect(x - 3 * s, y - 2 * s, 6 * s, 12 * s).fill(0x5a4030);
    g.circle(x, y - 10 * s, 18 * s).fill(dark);
    g.circle(x - 6 * s, y - 16 * s, 11 * s).fill(mid);
    g.circle(x + 5 * s, y - 19 * s, 6 * s).fill(light);
  };
  const rock = () => {
    g.ellipse(x, y, 14, 9).fill(0x8c8a80).stroke({ width: 2, color: 0x4e4b44 });
  };
  switch (biome) {
    case 'forest':
      if (roll < 0.85) tree(rng.range(0.9, 1.4), 0x3e5c2e, 0x557a3e, 0x6e9450);
      else rock();
      break;
    case 'plains':
    case 'hills':
      if (roll < 0.35) tree(rng.range(0.8, 1.2), 0x4e6e38, 0x66884a, 0x86aa60);
      else if (roll < 0.5) rock();
      else {
        for (let i = 0; i < 3; i++) g.moveTo(x + i * 4, y).lineTo(x + i * 4 - 2, y - 8).stroke({ width: 1.5, color: 0x5e7a3a });
        g.circle(x + 6, y - 2, 2).fill(rng.pick([0xf2e27a, 0xffffff, 0xe98ab8]));
      }
      break;
    case 'farm':
      if (roll < 0.25) g.rect(x - 40, y - 24, 80, 48).fill({ color: rng.pick([0xd9b95a, 0xb9c46e, 0xe2c66e]), alpha: 0.8 });
      else if (roll < 0.45) tree(1, 0x4e6e38, 0x66884a, 0x86aa60);
      else if (roll < 0.55) rock();
      break;
    case 'marsh':
      if (roll < 0.3) g.ellipse(x, y, rng.range(30, 70), rng.range(12, 24)).fill({ color: 0x6e9ea8, alpha: 0.8 });
      else if (roll < 0.75) for (let i = -1; i <= 1; i++) g.moveTo(x + i * 4, y).lineTo(x + i * 5, y - 14).stroke({ width: 2, color: 0x4e6b5a });
      else tree(0.8, 0x4a5a40, 0x5a6e48, 0x6e8256);
      break;
    case 'coast':
      if (roll < 0.25) g.ellipse(x, y, rng.range(40, 90), rng.range(16, 30)).fill({ color: 0x6e9eb8, alpha: 0.85 });
      else if (roll < 0.45) rock();
      else if (roll < 0.6) for (let i = 0; i < 3; i++) g.moveTo(x + i * 5, y).lineTo(x + i * 5 - 2, y - 9).stroke({ width: 1.5, color: 0x8a9a5a });
      else if (roll < 0.68) { g.rect(x - 10, y - 3, 20, 6).fill(0x7a5232).stroke({ width: 1.5, color: 0x3a2414 }); }
      break;
    case 'sea':
      if (roll < 0.55) g.ellipse(x, y, rng.range(60, 140), rng.range(30, 60)).fill({ color: 0x4e86a0, alpha: 0.9 });
      else if (roll < 0.7) tree(rng.range(0.8, 1.1), 0x4e7a3a, 0x66924a, 0x86b060);
      else if (roll < 0.8) rock();
      break;
    case 'mountain':
      if (roll < 0.35) {
        const s = rng.range(0.8, 1.6);
        g.poly([x - 40 * s, y, x, y - 60 * s, x + 40 * s, y]).fill(0xa49a80).stroke({ width: 2, color: 0x5a4e3a });
        g.poly([x, y - 60 * s, x + 40 * s, y, x + 8 * s, y]).fill(0x7a6e58);
        g.poly([x, y - 60 * s, x - 11 * s, y - 44 * s, x + 4 * s, y - 46 * s]).fill(0xf6f4ee);
      } else if (roll < 0.65) rock();
      break;
    case 'snow':
      if (roll < 0.55) {
        const s = rng.range(0.9, 1.4);
        g.ellipse(x + 4, y + 8, 14 * s, 5 * s).fill({ color: 0x5a6a74, alpha: 0.25 });
        g.poly([x, y - 34 * s, x + 16 * s, y + 4, x - 16 * s, y + 4]).fill(0x2f4a3a);
        g.poly([x, y - 34 * s, x + 16 * s, y + 4, x + 4, y + 4]).fill(0x203528);
        g.poly([x, y - 34 * s, x + 7 * s, y - 18 * s, x - 7 * s, y - 18 * s]).fill(0xf7fafb);
      } else if (roll < 0.7) g.ellipse(x, y, 30, 10).fill({ color: 0xffffff, alpha: 0.7 });
      else if (roll < 0.8) rock();
      break;
    case 'badlands':
      if (roll < 0.3) g.moveTo(x - 30, y).lineTo(x - 10, y + 6).lineTo(x + 6, y - 4).lineTo(x + 30, y + 4).stroke({ width: 3, color: 0xf07a3a });
      else if (roll < 0.55) g.poly([x - 18, y, x - 6, y - 26, x + 8, y - 20, x + 18, y]).fill(0x4a3228).stroke({ width: 2, color: 0x2a1a14 });
      else if (roll < 0.65) g.circle(x, y - 20, rng.range(10, 18)).fill({ color: 0x8c827a, alpha: 0.35 });
      break;
    case 'haunted':
      if (roll < 0.45) {
        g.moveTo(x, y).lineTo(x, y - 30).stroke({ width: 3, color: 0x2e2840 });
        g.moveTo(x, y - 16).lineTo(x - 10, y - 26).moveTo(x, y - 22).lineTo(x + 9, y - 32).stroke({ width: 2, color: 0x2e2840 });
      } else if (roll < 0.62) g.ellipse(x, y, rng.range(40, 80), 10).fill({ color: 0xb9b0d8, alpha: 0.25 });
      else if (roll < 0.7) g.circle(x, y - 18, 5).fill({ color: 0x7ff2c9, alpha: 0.7 });
      break;
    case 'sky':
      if (roll < 0.45) g.ellipse(x, y, rng.range(50, 110), rng.range(16, 30)).fill({ color: 0xffffff, alpha: 0.85 });
      else if (roll < 0.6) g.poly([x - 30, y, x + 30, y, x + 10, y + 30, x, y + 22, x - 10, y + 30]).fill(0xa8977a).stroke({ width: 1.5, color: 0x5e4c34 });
      break;
    case 'ruins':
      if (roll < 0.25) g.rect(x - 14, y - 10, 28, 10).fill(0xb4a988).stroke({ width: 1.5, color: 0x4e4232 });
      else if (roll < 0.4) g.rect(x - 5, y - 26, 10, 26).fill(0xc9be9e).stroke({ width: 1.5, color: 0x4e4232 });
      else if (roll < 0.6) tree(rng.range(0.8, 1.1), 0x4e6e38, 0x66884a, 0x86aa60);
      else if (roll < 0.7) rock();
      break;
    case 'barrow':
      if (roll < 0.4) g.ellipse(x, y, 26, 14).fill(0xb9ae8c).stroke({ width: 2, color: 0x5e5440 });
      else if (roll < 0.6) g.rect(x - 3, y - 18, 7, 18).fill(0x8e8a78).stroke({ width: 1.5, color: 0x4e4a3c });
      else if (roll < 0.75) rock();
      break;
  }
}

function drawSite(g: Graphics, kind: string) {
  g.ellipse(0, 18, 70, 18).fill({ color: 0x000000, alpha: 0.15 });
  switch (kind) {
    case 'ruins':
      g.poly([-24, 16, -24, -44, -18, -50, -12, -44, -6, -54, 0, -46, 8, -50, 14, -42, 24, -40, 24, 16]).fill(0xc9be9e).stroke({ width: 2.5, color: 0x4e4232 });
      g.poly([6, 16, 6, -46, 14, -42, 24, -40, 24, 16]).fill(0x9c9178);
      g.roundRect(-8, -24, 8, 12, 4).fill(0x2a1e14);
      g.roundRect(-8, 0, 10, 16, 5).fill(0x2a1e14);
      g.rect(-60, 4, 22, 12).fill(0xb4a988).stroke({ width: 1.5, color: 0x4e4232 });
      g.rect(36, 6, 26, 10).fill(0xb4a988).stroke({ width: 1.5, color: 0x4e4232 });
      break;
    case 'camp':
      for (const [x, y] of [[-44, 0], [34, -8]]) {
        g.poly([x - 26, y + 14, x, y - 26, x + 26, y + 14]).fill(0x8a6a44).stroke({ width: 2, color: 0x3a2414 });
        g.poly([x, y - 26, x + 26, y + 14, x + 8, y + 14]).fill(0x6e5034);
      }
      g.circle(-4, 14, 10).fill(0x3a2414);
      g.poly([-12, 12, -4, -10, 4, 12]).fill(0xff9a3c);
      g.poly([-7, 12, -4, -2, -1, 12]).fill(0xffd27a);
      g.rect(54, -40, 4, 44).fill(0x4a3020);
      g.poly([58, -40, 80, -34, 58, -28]).fill(0x8e2b23);
      break;
    case 'stranger':
      g.ellipse(0, 14, 14, 4).fill({ color: 0x000000, alpha: 0.3 });
      g.rect(-6, -6, 12, 20).fill(0x6e5a44).stroke({ width: 1.5, color: 0x2a1a10 });
      g.poly([-9, -6, -6, -28, 6, -28, 9, -6]).fill(0x8a7a5a).stroke({ width: 1.5, color: 0x2a1a10 });
      g.circle(0, -34, 7).fill(0xe3b08e).stroke({ width: 1.5, color: 0x2a1a10 });
      g.moveTo(14, 14).lineTo(18, -36).stroke({ width: 3, color: 0x6e4a28 });
      g.circle(0, -54, 9).fill(0xf6e9c9).stroke({ width: 1.5, color: 0x2a1a10 });
      g.rect(-1.5, -59, 3, 6).fill(0x8e2b23);
      g.circle(0, -50, 1.5).fill(0x8e2b23);
      break;
    case 'shrine':
      g.circle(0, -20, 40).fill({ color: 0xfff3c4, alpha: 0.25 });
      g.rect(-18, 6, 36, 10).fill(0x9c9178).stroke({ width: 2, color: 0x4e4232 });
      g.roundRect(-10, -40, 20, 46, 8).fill(0xc9be9e).stroke({ width: 2, color: 0x4e4232 });
      g.circle(0, -22, 6).fill(0xffe49a).stroke({ width: 1.5, color: 0x8a6a20 });
      g.moveTo(-30, 14).lineTo(-26, 4).stroke({ width: 2, color: 0x5e7a3a });
      g.moveTo(28, 14).lineTo(32, 2).stroke({ width: 2, color: 0x5e7a3a });
      break;
    case 'raid':
      // A farmhouse on fire.
      g.rect(-30, -24, 60, 40).fill(0xf2e6cc).stroke({ width: 2, color: 0x4e3a24 });
      g.poly([-38, -22, 0, -50, 38, -22]).fill(0x5a3a22).stroke({ width: 2, color: 0x2a1a10 });
      g.poly([-20, -34, -10, -70, 0, -40, 8, -78, 18, -36]).fill(0xff8a3c);
      g.poly([-12, -36, -6, -58, 2, -40, 8, -62, 12, -38]).fill(0xffd27a);
      g.circle(10, -96, 18).fill({ color: 0x6a625a, alpha: 0.5 });
      g.circle(24, -120, 22).fill({ color: 0x6a625a, alpha: 0.35 });
      break;
    // Secret paths (tribe map abilities).
    case 'village':
      for (const [x, s] of [[-34, 1], [22, 0.85]]) {
        g.rect(x - 18 * s, -18 * s, 36 * s, 30 * s).fill(0xf2e6cc).stroke({ width: 2, color: 0x4e3a24 });
        g.poly([x - 24 * s, -16 * s, x, -40 * s, x + 24 * s, -16 * s]).fill(0xb8863e).stroke({ width: 2, color: 0x4e3a24 });
        g.rect(x - 5 * s, -2 * s, 10 * s, 14 * s).fill(0x6e4a28);
      }
      g.rect(48, -6, 4, 22).fill(0x6e4a28);
      g.circle(50, -12, 9).fill(0x6e9a4a);
      break;
    case 'elfpath':
      g.moveTo(-36, 16).bezierCurveTo(-40, -50, 40, -50, 36, 16).stroke({ width: 7, color: 0x4f7a3a });
      g.moveTo(-36, 16).bezierCurveTo(-40, -50, 40, -50, 36, 16).stroke({ width: 2, color: 0xb9f07a, alpha: 0.7 });
      for (const [x, y] of [[-30, -20], [0, -38], [30, -20], [-14, -32], [16, -32]]) g.circle(x, y, 3).fill(0xe6ffb0);
      g.roundRect(-12, 0, 24, 16, 3).fill(0x8a5a34).stroke({ width: 2, color: 0x2a1a10 });
      break;
    case 'seam':
      g.poly([-50, 16, -40, -30, -10, -46, 20, -40, 46, -10, 50, 16]).fill(0x8a8478).stroke({ width: 2.5, color: 0x3e3a34 });
      g.poly([-8, 16, -6, -10, 8, -14, 10, 16]).fill(0x1e1a16);
      for (const [x, y] of [[-26, -18], [24, -20], [30, -2], [-30, 0]]) g.poly([x, y - 5, x + 4, y, x, y + 5, x - 4, y]).fill(0x7fd9e6);
      break;
    case 'lava':
      g.ellipse(0, 4, 62, 20).fill(0x2a1e1a);
      for (const [x1, y1, x2, y2] of [[-50, 4, -10, -6], [-20, 12, 30, 2], [10, -8, 52, 6]]) g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 4, color: 0xff7a2a });
      g.roundRect(-12, -18, 24, 18, 3).fill(0x5a3a2a).stroke({ width: 2, color: 0x1b140e });
      g.circle(0, -10, 4).fill(0xff5a5a);
      break;
    case 'wreck':
      g.ellipse(0, 6, 66, 22).fill({ color: 0x2e5a78, alpha: 0.85 });
      g.poly([-40, 6, -30, -16, 30, -16, 40, 6]).fill(0x5a3a22).stroke({ width: 2, color: 0x1b140e });
      g.rect(-2, -54, 5, 40).fill(0x4a3020);
      g.poly([3, -50, 26, -40, 3, -30]).fill(0xd8cfb8);
      g.ellipse(0, 6, 66, 22).stroke({ width: 2, color: 0x9ec3f0, alpha: 0.6 });
      break;
    case 'spiritgate':
      g.circle(0, -24, 46).fill({ color: 0xb9fff0, alpha: 0.15 });
      g.roundRect(-30, -60, 10, 76, 4).fill(0xc9c4dc).stroke({ width: 2, color: 0x5e4e8c });
      g.roundRect(20, -60, 10, 76, 4).fill(0xc9c4dc).stroke({ width: 2, color: 0x5e4e8c });
      g.moveTo(-26, -58).quadraticCurveTo(0, -84, 26, -58).stroke({ width: 6, color: 0xc9c4dc });
      g.ellipse(0, -22, 18, 36).fill({ color: 0xb9fff0, alpha: 0.45 });
      break;
    case 'eyrie':
      g.poly([-30, 16, -20, -60, 0, -76, 18, -58, 30, 16]).fill(0x9c9178).stroke({ width: 2.5, color: 0x4e4232 });
      g.ellipse(0, -76, 26, 9).fill(0x8a6a44).stroke({ width: 2, color: 0x3a2414 });
      for (const x of [-10, 0, 10]) g.circle(x, -80, 4).fill(0xffe49a);
      break;
    case 'crypt':
      g.rect(-36, -30, 72, 46).fill(0x8e8a7a).stroke({ width: 2.5, color: 0x3e3a34 });
      g.poly([-44, -28, 0, -58, 44, -28]).fill(0x6e6a5e).stroke({ width: 2.5, color: 0x3e3a34 });
      g.roundRect(-12, -14, 24, 30, 10).fill(0x1e1a16);
      g.circle(0, -38, 6).fill(0x7ff2c9, 0.8);
      break;
  }
}

/** A find-set marker by kind; lit ones glow. */
function drawMarker(g: Graphics, kind: SetKind, lit: boolean) {
  const glow = kind === 'lanterns' ? 0x9ec3f0 : kind === 'altars' ? 0xff8a3a : 0xf1d27a;
  if (lit) g.ellipse(0, -30, 40, 44).fill({ color: glow, alpha: 0.3 });
  g.ellipse(0, 0, 26, 8).fill({ color: 0x000000, alpha: 0.25 });
  switch (kind) {
    case 'stones':
      g.poly([-14, 0, -18, -58, -6, -70, 12, -64, 16, 0]).fill(0x9a947e).stroke({ width: 2.5, color: 0x2a1a10 });
      g.moveTo(-6, -48).lineTo(4, -38).moveTo(4, -52).lineTo(-4, -30).stroke({ width: 2.5, color: lit ? glow : 0x5e5a4e });
      break;
    case 'lanterns':
      g.rect(-2, -60, 4, 60).fill(0x5a3a20);
      g.rect(-10, -76, 20, 22).fill(lit ? glow : 0x4e5a64).stroke({ width: 2.5, color: 0x2a1a10 });
      g.poly([-12, -76, 0, -86, 12, -76]).fill(0x3a2a1a).stroke({ width: 2, color: 0x2a1a10 });
      break;
    case 'cairns':
      for (const [x, y, r] of [[-12, -8, 12], [12, -8, 11], [0, -26, 12], [0, -44, 9], [0, -57, 6]] as const) g.circle(x, y, r).fill(0x8a8478).stroke({ width: 2, color: 0x2a1a10 });
      if (lit) g.circle(0, -57, 4).fill(glow);
      break;
    case 'bells':
      g.rect(-16, -70, 32, 5).fill(0x5a3a20).stroke({ width: 1.5, color: 0x2a1a10 });
      g.rect(-14, -66, 4, 66).fill(0x5a3a20);
      g.rect(10, -66, 4, 66).fill(0x5a3a20);
      g.poly([-9, -36, -6, -58, 6, -58, 9, -36]).fill(lit ? glow : 0x9a7a3a).stroke({ width: 2, color: 0x2a1a10 });
      break;
    case 'altars':
      g.rect(-18, -26, 36, 26).fill(0x4a3a34).stroke({ width: 2.5, color: 0x1a1210 });
      if (lit) g.poly([-10, -26, -4, -52, 0, -38, 6, -58, 10, -26]).fill(glow);
      break;
  }
}

/** A small parchment plate with a title and a line of what it does, for things on the trail. */
function makePlate(title: string, text: string): Container {
  const c = new Container();
  const t1 = new Text({ text: title, style: { fontFamily: 'Cinzel', fontWeight: '700', fontSize: 15, fill: '#2b1f14' } });
  const t2 = new Text({ text, style: { fontFamily: 'Alegreya Sans', fontSize: 13, fill: '#5a4632' } });
  const w = Math.max(t1.width, t2.width) + 20;
  const hgt = text ? 44 : 26;
  const bg = new Graphics().roundRect(-w / 2, -hgt / 2, w, hgt, 7).fill({ color: 0xf2e6cc, alpha: 0.94 }).stroke({ width: 2, color: 0x8a6a3a });
  bg.moveTo(-6, hgt / 2).lineTo(0, hgt / 2 + 8).lineTo(6, hgt / 2).fill({ color: 0xf2e6cc, alpha: 0.94 });
  t1.anchor.set(0.5, 0);
  t1.position.set(0, -hgt / 2 + 4);
  t2.anchor.set(0.5, 0);
  t2.position.set(0, -hgt / 2 + 23);
  c.addChild(bg, t1);
  if (text) c.addChild(t2);
  return c;
}
