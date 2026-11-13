// One shared game-state object, imported by every module.
export const G = {
  t: 0,
  scene: 'title',
  W: 960,
  H: 540,
  scale: 1,
  cam: { x: 0, y: 0, shake: 0 },
  player: null,
  enemies: [],
  projs: [],
  parts: [],
  pickups: [],
  floaters: [],
  effects: [],
  bubbles: [],
  boss: null,
  chunks: new Map(),
  save: null,
  biome: 0,
  bg: null,
  announce: { title: '', sub: '', t: 0 },
  hitstop: 0,
  flash: 0,
  fade: 0,
  windForce: 0,
  near: null,
  map: { x: 0, y: 0, zoom: 2, drag: null },
  // touch: on-screen controls are in use. hud: how much the HUD is shrunk to fit a small screen.
  touch: false,
  hud: 1,
};

export const SAVE_KEY = 'unicornAscent.adventure.v1';

export function newSave() {
  return {
    v: 1,
    mapV: 5,
    gems: 0,
    up: { heart: 0, tail: 0, reach: 0, blast: 0, triple: 0, wings: 0, stars: 0, beam: 0, magnet: 0, bubble: 0, lantern: 0, hooves: 0, bombs: 0, fly: 0, might: 0, swift: 0, luck: 0, fortune: 0,
      constellation: 0, icarus: 0, forge: 0, apple: 0, aegis: 0, lens: 0, talaria: 0, ichor: 0, phoenix: 0, midas: 0 },
    rewards: {},
    armour: null,
    armours: {},
    potions: 1,
    hp: 6,
    x: 18 * 32,
    y: -40,
    spawn: { x: 18 * 32, y: -40, id: 'town' },
    shrines: { town: 1 },
    chests: {},
    bosses: {},
    explored: {},
    mods: {},
    // weapons found ("id:stars" -> how many), the three you carry, and which is in your hand
    arms: { v: 2, inv: {}, slots: [null, null, null], cur: 0, seen: {}, dry: 0, leech: 0 },
    talked: 0,
    won: 0,
    stats: { kills: 0, time: 0, deaths: 0, gemsEarned: 0 },
  };
}
