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
  { id: 'bomb', name: 'Hellfire Bombs', key: '5', need: 'bombs' },
];

// Every boss leaves a powerup behind. The second time a power is earned it grows stronger.
export const REWARDS = {
  cerberus: { up: 'stars', name: 'Starfall', icon: '⭐', text: 'A new weapon: rapid homing stars that seek out your foes. Press 3 to use it.' },
  storm: { up: 'fly', name: 'Wings of the Storm', icon: '🪽', text: 'You can fly! Hold Jump in the air to beat your wings and climb. Flying uses wing energy (the gold bar), which refills while you stand on the ground. You still cannot pass through walls.' },
  heretic: { up: 'bombs', name: 'Hellfire Bombs', icon: '💣', text: 'A new weapon: bombs that arc through the air and burst in a huge blast that also breaks rock. Press 5 to select them, or G to throw one at any time.' },
  titan: { up: 'might', name: "Titan's Might", icon: '💪', text: 'The strength of a giant: all of your attacks deal 25% more damage.' },
  hades: { up: 'beam', name: 'Rainbow Lance', icon: '🔆', text: 'A new weapon: a piercing laser beam that burns through everything in its path. It drains energy while you fire. Press 4 to use it.' },
  ares: { up: 'might', name: 'Fury of Ares', icon: '⚔️', text: 'The fury of war: all of your attacks deal another 25% more damage.' },
  apollo: { up: 'swift', name: 'Hooves of the Sun Chariot', icon: '☀️', text: 'You run 20% faster.' },
  athena: { up: 'fly', name: "Athena's Owl Wings", icon: '🦉', text: 'Your wings grow stronger: twice the flight energy, and it refills faster.' },
  poseidon: { up: 'bombs', name: "Poseidon's Depth Charges", icon: '🌊', text: 'Your bombs blast harder and wider, and you can throw them faster.' },
  zeus: { up: 'swift', name: 'Thunder Step', icon: '⚡', text: 'You move with the speed of lightning: another 20% faster.' },
};

// Hand out a boss's powerup (once). Returns the reward to show, or null if it was already given.
export function grantReward(id) {
  const r = REWARDS[id], s = G.save;
  if (!r) return null;
  s.rewards = s.rewards || {};
  if (s.rewards[id]) return null;
  s.rewards[id] = 1;
  const u = s.up;
  if ((r.up === 'stars' || r.up === 'beam') && u[r.up] > 0) {
    // already bought in the shop in an older save: the power becomes extra strength instead
    u.might = (u.might || 0) + 1;
    return { ...r, text: `You already carry the ${r.name}, so its power flows into you instead: all of your attacks deal 25% more damage.` };
  }
  u[r.up] = (u[r.up] || 0) + 1;
  return r;
}

export const ownsWeapon = i => !WEAPONS[i].need || G.save.up[WEAPONS[i].need] > 0;

export function stats() {
  const u = G.save.up, dm = 1 + 0.25 * (u.might || 0), fly = u.fly || 0, bombs = u.bombs || 0;
  return {
    maxHp: 6 + u.heart,
    whipDmg: (2 + u.tail * 1.5) * dm,
    reach: 125 * (1 + 0.15 * u.reach),
    blastCd: 1.1 * Math.pow(0.8, u.blast),
    blastDmg: (6 + u.blast * 3) * dm,
    speed: 1 + 0.2 * (u.swift || 0),
    fly: fly > 0,
    flyMax: fly >= 2 ? 200 : 100,
    flyRegen: fly >= 2 ? 90 : 55,
    bombDmg: (bombs >= 2 ? 16 : 11) * dm,
    bombR: bombs >= 2 ? 150 : 115,
    bombCd: bombs >= 2 ? 0.45 : 0.7,
    jumps: 2 + u.triple,
    glide: u.wings > 0,
    bubbleT: 10 * Math.pow(0.7, u.bubble),
    magnet: 80 + u.magnet * 90,
    light: 330 + u.lantern * 120,
    hooves: u.hooves > 0,
    starDmg: (1 + u.tail * 0.4) * dm,
    beamDmg: (1.6 + u.tail * 0.5) * dm,
  };
}
