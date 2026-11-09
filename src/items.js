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
  // Wares the shopkeepers only bring out once a great foe has fallen ("unlock" names that boss).
  { id: 'constellation', name: 'Constellation', icon: '✨', desc: 'Starfall shoots one more star with every shot.', max: 2, unlock: 'cerberus', cost: l => 160 + l * 160 },
  { id: 'icarus', name: 'Icarus Feathers', icon: '🦢', desc: '+50% flight energy, and it refills faster.', max: 2, unlock: 'storm', cost: l => 150 + l * 150 },
  { id: 'forge', name: "Hephaestus' Forge", icon: '🔨', desc: 'Bombs hit 30% harder and recharge faster.', max: 3, unlock: 'heretic', cost: l => 170 + l * 150 },
  { id: 'apple', name: 'Golden Apple', icon: '🍎', desc: '+1 maximum health, beyond the Hearts of Olympus.', max: 4, unlock: 'hades', cost: l => 260 + l * 180 },
  { id: 'aegis', name: 'Aegis Shield', icon: '🛡️', desc: 'Blocks one hit completely, then recharges (30s, or 18s at level 2).', max: 2, unlock: 'hades', cost: l => 380 + l * 320 },
  { id: 'lens', name: 'Helios Lens', icon: '🔭', desc: 'Rainbow Lance burns 30% hotter and drains less energy.', max: 3, unlock: 'hades', cost: l => 240 + l * 200 },
  { id: 'talaria', name: 'Winged Sandals', icon: '👟', desc: 'Dash recharges 30% faster and keeps you safe for longer.', max: 2, unlock: 'ares', cost: l => 320 + l * 260 },
  { id: 'ichor', name: 'Chalice of Ichor', icon: '🏆', desc: 'Heal 1 health for every 10 foes you defeat (6 at level 2).', max: 2, unlock: 'apollo', cost: l => 420 + l * 380 },
  { id: 'phoenix', name: 'Phoenix Feather', icon: '🔥', desc: 'If you fall, rise again with full health. It burns away when used.', max: 1, unlock: 'athena', cost: () => 600 },
  { id: 'midas', name: "Midas' Ring", icon: '💍', desc: 'Defeated foes drop 40% more gems.', max: 2, unlock: 'poseidon', cost: l => 380 + l * 340 },
];

// One suit of armour for every land, forged by the armourers (in Limbo Market and the Olympus plaza).
// A land's armour goes on sale once its boss falls ("boss"); Limbo's needs no boss.
// Armour gives shield pips that take hits before your hearts and refill when you stay out of
// harm's way, plus a gift of its land. Only one suit can be worn at a time.
// look: metal (light, mid, dark), trim, gem, plume, and a motif drawn on the barding.
export const ARMOURS = [
  { id: 'limbo', land: 'limbo', name: "Pilgrim's Mail", icon: '🌙', pips: 1, cost: 90,
    perk: 'Spikes cannot hurt you.', haz: ['spikes'],
    look: { metal: ['#ece6ff', '#9a8fc4', '#433a68'], trim: '#c9baff', gem: '#b4a6ee', plume: '#8a6bd6', motif: 'moon' } },
  { id: 'lust', land: 'lust', boss: 'storm', name: 'Tempest Plate', icon: '🌪️', pips: 2, cost: 240,
    perk: 'Storm winds cannot push you, and thorns cannot hurt you.', haz: ['thorns'], noWind: 1,
    look: { metal: ['#ffd6f2', '#e0479e', '#5c1550'], trim: '#ff8ad8', gem: '#ff4ac0', plume: '#ff8ad8', motif: 'heart' } },
  { id: 'gluttony', land: 'gluttony', boss: 'cerberus', name: 'Bog-Hide Armour', icon: '🐸', pips: 2, cost: 240,
    perk: 'Acid cannot hurt you, and Ambrosia heals 1 more health.', haz: ['acid'], potion: 1,
    look: { metal: ['#d8f5b0', '#6fae3a', '#24391a'], trim: '#b6ff6b', gem: '#9dff4a', plume: '#4f8a35', motif: 'scales' } },
  { id: 'heresy', land: 'heresy', boss: 'heretic', name: 'Emberforged Plate', icon: '🔥', pips: 3, cost: 420,
    perk: 'Lava cannot hurt you, and your attacks deal 10% more damage.', haz: ['lava'], dmg: 0.1,
    look: { metal: ['#ffd29a', '#c2481a', '#2a0f08'], trim: '#ffb347', gem: '#ff5a1f', plume: '#ff8a1a', motif: 'flame', spikes: 1, glow: '#ff6a1a' } },
  { id: 'treachery', land: 'treachery', boss: 'titan', name: 'Rimefrost Mail', icon: '❄️', pips: 3, cost: 420,
    perk: 'You never slip on ice, icicles cannot hurt you, and the armour refills twice as fast.', haz: ['icicle'], grip: 1, regen: 2,
    look: { metal: ['#f2fcff', '#7fc4f0', '#24406a'], trim: '#a8ecff', gem: '#6fc6ff', plume: '#d9f1ff', motif: 'flake', spikes: 1 } },
  { id: 'abyss', land: 'abyss', boss: 'hades', name: 'Dread Plate of Hades', icon: '💀', pips: 4, cost: 760,
    perk: 'No hazard of the underworld can hurt you, and your attacks deal 15% more damage.', hazAll: 1, dmg: 0.15,
    look: { metal: ['#8a7a86', '#3a1820', '#0c0306'], trim: '#ff3b4a', gem: '#ff2a3a', plume: '#a0102a', motif: 'skull', spikes: 1, glow: '#ff2a3a' } },
  { id: 'olympus', land: 'olympus', boss: 'athena', name: 'White Marble Raiment', icon: '🏛️', pips: 4, cost: 900,
    perk: 'Heals you slowly: 1 health every 20 seconds.', heal: 20,
    look: { metal: ['#ffffff', '#e4e6f0', '#9aa2bc'], trim: '#f4c24a', gem: '#8fe8ff', plume: '#ffffff', motif: 'laurel' } },
  { id: 'gold', land: 'gold', boss: 'apollo', name: 'Sunforged Plate', icon: '☀️', pips: 5, cost: 1200,
    perk: 'Defeated foes drop 30% more gems.', gem: 0.3,
    look: { metal: ['#fffbe0', '#ffc531', '#94600e'], trim: '#ffffff', gem: '#ff8a1a', plume: '#ffe36b', motif: 'sun', glow: '#ffd34a' } },
  { id: 'silver', land: 'silver', boss: 'ares', name: 'Moonsilver Mail', icon: '🌒', pips: 5, cost: 1200,
    perk: 'You run 10% faster, and your dash recharges 25% faster.', speed: 0.1, dash: 0.25,
    look: { metal: ['#ffffff', '#b8c2d6', '#4c556a'], trim: '#e8f0ff', gem: '#9ab8ff', plume: '#c3cde0', motif: 'crescent', spikes: 1 } },
  { id: 'mist', land: 'mist', boss: 'poseidon', name: 'Mistweave Armour', icon: '☁️', pips: 5, cost: 1200,
    perk: '+50% flight energy, and 1 blow in 5 passes straight through you like mist.', fly: 0.5, dodge: 0.2,
    look: { metal: ['#eef6ff', '#8fa8c6', '#3c4a64'], trim: '#d8ecff', gem: '#7fd0ff', plume: '#b8c8da', motif: 'cloud', glow: '#cfe8ff' } },
  { id: 'zeus', land: 'zeus', boss: 'zeus', name: "Thunderer's Aegis", icon: '⚡', pips: 6, cost: 2200,
    perk: 'Whenever your armour takes a hit, lightning strikes every foe around you.', zap: 1,
    look: { metal: ['#fffbd0', '#8a9aff', '#1b1f45'], trim: '#fff27a', gem: '#fff27a', plume: '#8a9aff', motif: 'bolt', spikes: 1, glow: '#a8b8ff' } },
];
export const armourById = id => ARMOURS.find(a => a.id === id) || null;
// The armour being worn, if any.
export const worn = () => (G.save && armourById(G.save.armour)) || null;
// Has the boss of this armour's land fallen yet?
export const armourKnown = a => !a.boss || !!(G.save.bosses && G.save.bosses[a.boss]);
export const armourOwned = a => !!(G.save.armours && G.save.armours[a.id]);

// Shop items that are still locked behind a boss.
export const shopLocked = it => !!it.unlock && !(G.save.bosses && G.save.bosses[it.unlock]);

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
  const A = worn() || {};
  const u = G.save.up, dm = (1 + 0.25 * (u.might || 0)) * (1 + (A.dmg || 0)), fly = u.fly || 0, bombs = u.bombs || 0;
  const ic = u.icarus || 0, fg = u.forge || 0, ln = u.lens || 0;
  return {
    maxHp: 6 + u.heart + (u.apple || 0),
    whipDmg: (2 + u.tail * 1.5) * dm,
    reach: 125 * (1 + 0.15 * u.reach),
    blastCd: 1.1 * Math.pow(0.8, u.blast),
    blastDmg: (6 + u.blast * 3) * dm,
    speed: (1 + 0.2 * (u.swift || 0)) * (1 + (A.speed || 0)),
    fly: fly > 0,
    flyMax: (fly >= 2 ? 200 : 100) * (1 + 0.5 * ic) * (1 + (A.fly || 0)),
    flyRegen: (fly >= 2 ? 90 : 55) * (1 + 0.4 * ic),
    bombDmg: (bombs >= 2 ? 16 : 11) * dm * (1 + 0.3 * fg),
    bombR: bombs >= 2 ? 150 : 115,
    bombCd: (bombs >= 2 ? 0.45 : 0.7) * Math.pow(0.82, fg),
    stars: 1 + (u.constellation || 0),
    beamDrain: 42 * Math.pow(0.78, ln),
    dashCd: 0.55 * Math.pow(0.7, u.talaria || 0) * (1 - (A.dash || 0)),
    dashInv: 0.25 + 0.1 * (u.talaria || 0),
    aegis: u.aegis > 0,
    aegisCd: u.aegis >= 2 ? 18 : 30,
    ichor: u.ichor >= 2 ? 6 : u.ichor > 0 ? 10 : 0,
    gemK: 1 + 0.4 * (u.midas || 0) + (A.gem || 0),
    jumps: 2 + u.triple,
    glide: u.wings > 0,
    bubbleT: 10 * Math.pow(0.7, u.bubble),
    magnet: 80 + u.magnet * 90,
    light: 330 + u.lantern * 120,
    hooves: u.hooves > 0,
    starDmg: (1 + u.tail * 0.4) * dm,
    beamDmg: (1.6 + u.tail * 0.5) * dm * (1 + 0.3 * ln),
    // armour
    armour: A.pips || 0,
    armourRegen: 5 / (A.regen || 1),
    hazSafe: hz => !!A.hazAll || !!(A.haz && A.haz.includes(hz)),
    noWind: !!A.noWind,
    grip: !!A.grip,
    potion: 3 + (A.potion || 0),
    heal: A.heal || 0,
    dodge: A.dodge || 0,
    zap: !!A.zap,
  };
}
