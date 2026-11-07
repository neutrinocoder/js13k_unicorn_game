// Shop catalogue and the player stats derived from upgrades.
import { G } from './state.js';

export const SHOP = [
  { id: 'potion', name: 'Ambrosia', icon: '🍯', desc: 'Drink with H to restore 3 health. Carry up to 3.', consumable: 1, cost: () => 30 },
  { id: 'heart', name: 'Heart of Olympus', icon: '❤️', desc: '+1 maximum health.', max: 6, cost: l => 45 + l * 45 },
  { id: 'tail', name: 'Prismatic Tail', icon: '🌈', desc: 'Tail whip and stars deal more damage.', max: 5, cost: l => 35 + l * 40 },
  { id: 'reach', name: 'Comet Tail', icon: '☄️', desc: 'Tail whip reaches 15% further.', max: 3, cost: l => 55 + l * 50 },
  { id: 'blast', name: 'Overcharged Horn', icon: '💥', desc: 'Blast recharges 20% faster and hits harder.', max: 3, cost: l => 60 + l * 60 },
  { id: 'triple', name: 'Zephyr Charm', icon: '🪶', desc: 'Jump a third time in mid-air.', max: 1, cost: () => 120 },
  { id: 'wings', name: 'Pegasus Wings', icon: '🕊️', desc: 'Hold Jump while falling to glide.', max: 1, cost: () => 180 },
  { id: 'stars', name: 'Starfall', icon: '⭐', desc: 'New weapon (3): rapid homing stars.', max: 1, cost: () => 150 },
  { id: 'beam', name: 'Rainbow Lance', icon: '🔆', desc: 'New weapon (4): a piercing beam that drains energy.', max: 1, cost: () => 260 },
  { id: 'magnet', name: 'Lodestone Mane', icon: '🧲', desc: 'Pull gems in from further away.', max: 2, cost: l => 40 + l * 40 },
  { id: 'bubble', name: 'Sea-Foam Pearl', icon: '🫧', desc: 'Bubbles charge 30% faster.', max: 2, cost: l => 70 + l * 70 },
  { id: 'lantern', name: 'Horn Lantern', icon: '🏮', desc: 'Your horn lights the dark further.', max: 2, cost: l => 45 + l * 45 },
  { id: 'hooves', name: 'Bronze Hooves', icon: '🐎', desc: 'Dashing through enemies hurts them.', max: 1, cost: () => 110 },
];

export const WEAPONS = [
  { id: 'whip', name: 'Tail Whip', key: '1' },
  { id: 'blast', name: 'Recoil Blast', key: '2' },
  { id: 'stars', name: 'Starfall', key: '3', need: 'stars' },
  { id: 'beam', name: 'Rainbow Lance', key: '4', need: 'beam' },
];

export const ownsWeapon = i => !WEAPONS[i].need || G.save.up[WEAPONS[i].need] > 0;

export function stats() {
  const u = G.save.up;
  return {
    maxHp: 6 + u.heart,
    whipDmg: 2 + u.tail * 1.5,
    reach: 125 * (1 + 0.15 * u.reach),
    blastCd: 1.1 * Math.pow(0.8, u.blast),
    blastDmg: 6 + u.blast * 3,
    jumps: 2 + u.triple,
    glide: u.wings > 0,
    bubbleT: 10 * Math.pow(0.7, u.bubble),
    magnet: 80 + u.magnet * 90,
    light: 330 + u.lantern * 120,
    hooves: u.hooves > 0,
    starDmg: 1 + u.tail * 0.4,
    beamDmg: 1.6 + u.tail * 0.5,
  };
}
