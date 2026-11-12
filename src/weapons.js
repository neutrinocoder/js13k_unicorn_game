// Weapons found in the field. There are two batches of 25: one for the underworld and a far
// stronger one for heaven. Each batch has five sets of five (one weapon of every rarity): four
// that belong to a land, and one that turns up anywhere in that realm. Foes drop them, and the
// higher the danger, the better the odds of a rare one. Two of the same weapon merge into one
// that is a star stronger. You begin with nothing in your hands.
import { G } from './state.js';
import { BIOME_LIST } from './world.js';
import { mix, rgba, pick, TAU } from './util.js';

export const RARITY = [
  { id: 'common', name: 'Common', col: '#cfd3dc' },
  { id: 'uncommon', name: 'Uncommon', col: '#5fe07a' },
  { id: 'rare', name: 'Rare', col: '#4ea8ff' },
  { id: 'epic', name: 'Epic', col: '#c06bff' },
  { id: 'legendary', name: 'Legendary', col: '#ffb02e' },
];

export const REALMS = [
  { id: 'under', name: 'The Underworld' },
  { id: 'heaven', name: 'Heaven' },
];

// land: the land whose foes drop the set. A set with no land turns up anywhere in its realm.
export const SETS = [
  { id: 'shadow', realm: 'under', name: 'Everywhere below', theme: 'Shadow' },
  { id: 'lust', realm: 'under', land: 'lust', name: 'Lust', theme: 'Storm' },
  { id: 'gluttony', realm: 'under', land: 'gluttony', name: 'Gluttony', theme: 'Venom' },
  { id: 'heresy', realm: 'under', land: 'heresy', name: 'Heresy', theme: 'Flame' },
  { id: 'treachery', realm: 'under', land: 'treachery', name: 'Treachery', theme: 'Frost' },
  { id: 'olympian', realm: 'heaven', name: 'Everywhere above', theme: 'The Gods' },
  { id: 'citadel', realm: 'heaven', land: 'olympus', name: 'White Citadel', theme: 'Wisdom' },
  { id: 'gold', realm: 'heaven', land: 'gold', name: 'Golden Fields', theme: 'Sun' },
  { id: 'silver', realm: 'heaven', land: 'silver', name: 'Silver Peaks', theme: 'War' },
  { id: 'mist', realm: 'heaven', land: 'mist', name: 'Cloudlands', theme: 'Sea' },
];
const SET_BY_ID = {};
for (const s of SETS) SET_BY_ID[s.id] = s;
export const setById = id => SET_BY_ID[id];

// Damage a second each rarity is built around, before the hero's own upgrades. Common and
// uncommon weapons are modest; epic and legendary ones are devastating. A common weapon of
// heaven is the equal of a rare one from the underworld.
const POWER = { under: [7, 10, 17, 40, 75], heaven: [17, 26, 45, 110, 220] };

export const MAX_STARS = 5;
export const SLOTS = 3;

// Empty hands: no weapon at all. Attacking falls back on the recoil blast.
export const HANDS = {
  id: 'hands', name: 'Bare hands', rar: -1, kind: 'none', shape: 'none', dmg: 0, cd: 1,
  col: ['#f2d6ff', '#a64dff', '#2a0b45'], glow: '#a64dff',
  pal: ['#2a0b45', '#4a1580', '#7a2ad0', '#a64dff', '#d07aff', '#ff6ad5', '#f2d6ff'],
};

// kind: lash and melee swing in an arc; shot fires projectiles; beam burns energy; lob is thrown.
// k: strength for its rarity (1 = a plain melee weapon; ranged and area weapons trade some away).
// hits: how many of a volley's shots are expected to land. col: light, mid, dark.
// fx: burn and venom are a share of the weapon's damage each second; chill is seconds of slowness.
export const ARMS = [
  // ======== THE UNDERWORLD ========
  // ---- Shadow: found anywhere below
  { id: 'lash', name: 'Shadow Lash', set: 'shadow', rar: 0, kind: 'lash', shape: 'lash', cd: 0.2, reach: 125,
    col: ['#f2d6ff', '#a64dff', '#2a0b45'], glow: '#a64dff', pal: ['#2a0b45', '#4a1580', '#7a2ad0', '#a64dff', '#d07aff', '#ff6ad5', '#f2d6ff'],
    text: 'A lash of shadow-fire, like the one that burns where your halo was.' },
  { id: 'wraithblade', name: 'Wraith Blade', set: 'shadow', rar: 1, kind: 'melee', shape: 'sword', len: 20, cd: 0.21, reach: 120,
    col: ['#e6dcff', '#8a6bd6', '#241a3a'], glow: '#b49cff', trim: '#8a6bd6',
    text: 'A sword that is half smoke. Light and quick.' },
  { id: 'soullantern', name: 'Soul Lantern', set: 'shadow', rar: 2, kind: 'shot', shape: 'staff', len: 22, k: 0.75, cd: 0.2, speed: 620, life: 1.5, pkind: 'orb', homing: 1, r: 7, wood: '#3a2e4a',
    col: ['#e8fbff', '#6fd0ff', '#1a2a4e'], glow: '#8fe0ff',
    text: 'Looses lost souls that drift after your foes and will not let them go.' },
  { id: 'oar', name: "Charon's Oar", set: 'shadow', rar: 3, kind: 'melee', shape: 'club', len: 25, k: 0.95, cd: 0.42, reach: 152, arc: 1.3, kb: 520, wave: { dmg: 0.5, speed: 700, life: 0.5 },
    col: ['#d8cfc0', '#8a7a66', '#3a2e24'], glow: '#8fe0ff',
    text: 'The oar of the ferryman. Each great sweep sends a wave of the Styx rolling ahead.' },
  { id: 'bident', name: 'Bident of Hades', short: 'Bident', set: 'shadow', rar: 4, kind: 'melee', shape: 'trident', prongs: 2, len: 30, cd: 0.28, reach: 180, arc: 0.7, chain: 3, fx: { burn: 0.25 }, wood: '#2a1a30',
    col: ['#d8f4ff', '#3a6aff', '#0c1030'], glow: '#6a9aff',
    text: 'The two-pronged spear of the Lord of the Dead. Blue fire leaps from every foe it strikes to the next.' },

  // ---- Lust: weapons of the storm
  { id: 'thornwhip', name: 'Thorn Whip', set: 'lust', rar: 0, kind: 'lash', shape: 'lash', cd: 0.2, reach: 142,
    col: ['#ffc8ee', '#e0479e', '#1f4a1a'], glow: '#ff8ad8', pal: ['#1f4a1a', '#3d7a2a', '#6fae3a', '#e0479e', '#ff8ad8', '#ffc8ee', '#ffffff'],
    text: 'A lash of rose briars. Quick, with a long reach.' },
  { id: 'galefan', name: 'Gale Fan', set: 'lust', rar: 1, kind: 'shot', shape: 'fan', len: 13, k: 0.9, hits: 2, cd: 0.3, n: 3, spread: 0.55, speed: 780, life: 0.42, pkind: 'wind', pierce: 2, r: 9,
    col: ['#ffe6f6', '#ff8ad8', '#8a2a6a'], glow: '#ffc0ea',
    text: 'Throws three blades of wind that cut through foes at close range.' },
  { id: 'tempestbow', name: 'Tempest Bow', set: 'lust', rar: 2, kind: 'shot', shape: 'bow', len: 10, k: 0.8, cd: 0.32, speed: 1150, life: 0.9, pkind: 'arrow', pierce: 2, r: 5,
    col: ['#ffd6f2', '#c0388f', '#5c1550'], glow: '#ff8ad8',
    text: 'Arrows as fast as the storm. Each one flies through up to three foes.' },
  { id: 'cycloneglaive', name: 'Cyclone Glaive', set: 'lust', rar: 3, kind: 'melee', shape: 'glaive', len: 28, k: 0.9, cd: 0.28, reach: 150, arc: 1.4, wave: { dmg: 0.5, speed: 760, life: 0.45 },
    col: ['#fff0fa', '#ff6ac4', '#5c1550'], glow: '#ff9ae0',
    text: 'A sweeping polearm. Every swing throws a crescent of wind.' },
  { id: 'heartseeker', name: 'Heartseeker', set: 'lust', rar: 4, kind: 'shot', shape: 'bow', len: 11, k: 0.85, cd: 0.3, n: 3, spread: 0.5, speed: 900, life: 1.4, pkind: 'arrow', homing: 1, pierce: 1, r: 5,
    col: ['#fff4d0', '#ff4ac0', '#7a0f55'], glow: '#ff6ad0',
    text: 'The bow of Queen Semiramis. Three arrows with every shot, and each one hunts its own target.' },

  // ---- Gluttony: weapons of venom
  { id: 'boneclub', name: 'Bone Club', set: 'gluttony', rar: 0, kind: 'melee', shape: 'club', len: 17, k: 1.1, cd: 0.36, reach: 108, kb: 420,
    col: ['#f2ead6', '#c9b98f', '#6b5a3a'], glow: '#d8f5b0',
    text: 'A heavy bone that sends foes flying.' },
  { id: 'acidflask', name: 'Acid Flask', set: 'gluttony', rar: 1, kind: 'lob', shape: 'flask', len: 8, k: 0.75, cd: 0.55, boom: 85, fx: { venom: 0.25 },
    col: ['#e6ffb0', '#9dff4a', '#2f5a1a'], glow: '#b6ff6b',
    text: 'A thrown flask that bursts and poisons everything it splashes.' },
  { id: 'fang', name: "Cerberus' Fang", set: 'gluttony', rar: 2, kind: 'melee', shape: 'dagger', len: 11, k: 0.9, cd: 0.12, reach: 95, kb: 120, fx: { venom: 0.25 },
    col: ['#f6f2e0', '#b6ff6b', '#24391a'], glow: '#9dff4a',
    text: 'Strikes faster than any other weapon, and every bite poisons.' },
  { id: 'plaguescythe', name: 'Plague Scythe', set: 'gluttony', rar: 3, kind: 'melee', shape: 'scythe', len: 26, k: 0.9, cd: 0.34, reach: 155, arc: 1.6, fx: { venom: 0.25 },
    col: ['#d8f5b0', '#6fae3a', '#182013'], glow: '#9dff4a',
    text: 'One huge sweep reaps a whole crowd and leaves it poisoned.' },
  { id: 'devourer', name: 'The Devourer', set: 'gluttony', rar: 4, kind: 'lash', shape: 'lash', k: 0.9, cd: 0.2, reach: 185, fx: { venom: 0.25 }, leech: 10,
    col: ['#d8f5b0', '#6fae3a', '#0f1b0f'], glow: '#b6ff6b', pal: ['#0f1b0f', '#24391a', '#4f8a35', '#6fae3a', '#9dff4a', '#d8f5b0', '#ffffff'],
    text: 'The living tongue of the Great Worm. Enormous reach, deadly poison, and it heals you 1 health for every 10 foes it eats.' },

  // ---- Heresy: weapons of flame
  { id: 'cinderblade', name: 'Cinder Blade', set: 'heresy', rar: 0, kind: 'melee', shape: 'sword', len: 20, k: 0.9, cd: 0.22, reach: 118, fx: { burn: 0.2 },
    col: ['#ffd29a', '#c2481a', '#2a0f08'], glow: '#ff8a1a',
    text: 'A sword still glowing from the forge. It sets foes alight.' },
  { id: 'emberwand', name: 'Ember Wand', set: 'heresy', rar: 1, kind: 'shot', shape: 'wand', len: 12, k: 0.75, cd: 0.26, speed: 820, life: 0.9, pkind: 'fire', r: 7, fx: { burn: 0.2 },
    col: ['#ffe36b', '#ff8a1a', '#5a2410'], glow: '#ffb347',
    text: 'Shoots fireballs that leave foes burning.' },
  { id: 'magmamaul', name: 'Magma Maul', set: 'heresy', rar: 2, kind: 'melee', shape: 'hammer', len: 19, k: 0.9, cd: 0.5, reach: 118, kb: 460, boom: 64, fx: { burn: 0.15 },
    col: ['#ffb347', '#7a3820', '#2a0f08'], glow: '#ff5a1f',
    text: 'Slow and crushing. Every blow that lands bursts in a ring of fire.' },
  { id: 'infernostaff', name: 'Inferno Staff', set: 'heresy', rar: 3, kind: 'shot', shape: 'staff', len: 24, k: 0.7, cd: 0.45, speed: 700, life: 1.1, pkind: 'fire', r: 10, boom: 95, fx: { burn: 0.2 },
    col: ['#fff2a0', '#ff5a1f', '#3a0c05'], glow: '#ff7a2a',
    text: 'Hurls great fireballs that explode among your foes.' },
  { id: 'phlegethon', name: 'Phlegethon, the River of Fire', short: 'Phlegethon', set: 'heresy', rar: 4, kind: 'melee', shape: 'great', len: 27, k: 0.9, cd: 0.3, reach: 155, arc: 1.4, fx: { burn: 0.25 }, wave: { dmg: 0.5, speed: 820, life: 0.5 }, flame: 1,
    col: ['#fff6c4', '#ff6a1a', '#4a0a04'], glow: '#ffa02e',
    text: 'A greatsword of living flame. Each swing sends a wave of fire ahead of it.' },

  // ---- Treachery: weapons of frost
  { id: 'icespear', name: 'Icicle Spear', set: 'treachery', rar: 0, kind: 'melee', shape: 'spear', len: 30, cd: 0.26, reach: 170, arc: 0.55, wood: '#7fc4f0',
    col: ['#f2fcff', '#a8ecff', '#47638c'], glow: '#a8ecff',
    text: 'An icicle as long as a lance. Narrow, but it reaches far.' },
  { id: 'frostshards', name: 'Frost Shards', set: 'treachery', rar: 1, kind: 'shot', shape: 'wand', len: 12, k: 0.75, cd: 0.24, n: 2, spread: 0.16, speed: 900, life: 0.8, pkind: 'shard', r: 5, fx: { chill: 1.6 },
    col: ['#e6f8ff', '#6fc6ff', '#24406a'], glow: '#bfeaff',
    text: 'Two shards of ice with every flick. Chilled foes move at half speed.' },
  { id: 'glacieraxe', name: 'Glacier Axe', set: 'treachery', rar: 2, kind: 'melee', shape: 'axe', len: 19, cd: 0.36, reach: 122, kb: 380, fx: { chill: 2.5 },
    col: ['#f2fcff', '#7fc4f0', '#24406a'], glow: '#8fd8ff',
    text: 'A heavy axe of blue ice that freezes what it cuts.' },
  { id: 'rimelance', name: 'Rimelance', set: 'treachery', rar: 3, kind: 'beam', shape: 'staff', len: 24, k: 1.2, cd: 0.08, drain: 40, fx: { chill: 1.2 }, wood: '#47638c',
    col: ['#ffffff', '#8fe8ff', '#1a3358'], glow: '#8fe8ff',
    text: 'A beam of killing cold that pierces everything in its path. It uses energy while it fires.' },
  { id: 'cocytus', name: 'Cocytus, the Frozen Tear', short: 'Cocytus', set: 'treachery', rar: 4, kind: 'shot', shape: 'staff', len: 24, k: 1, hits: 2.5, cd: 0.16, n: 5, spread: 0.7, speed: 950, life: 0.55, pkind: 'shard', r: 5, fx: { chill: 3 }, wood: '#2a4a8a',
    col: ['#ffffff', '#b8f0ff', '#2a4a8a'], glow: '#d0f6ff',
    text: 'A blizzard in your hand: a storm of ice shards that freezes all before you.' },

  // ======== HEAVEN ========
  // ---- The Gods: found anywhere above
  { id: 'xiphos', name: 'Bronze Xiphos', set: 'olympian', rar: 0, kind: 'melee', shape: 'sword', len: 20, cd: 0.2, reach: 122,
    col: ['#ffe9b0', '#c8901a', '#6a4410'], glow: '#ffe28a',
    text: 'The short sword of the temple guards. Light and quick.' },
  { id: 'huntressbow', name: 'Bow of the Huntress', set: 'olympian', rar: 1, kind: 'shot', shape: 'bow', len: 10, k: 0.8, cd: 0.28, speed: 1250, life: 0.9, pkind: 'arrow', pierce: 1, r: 5,
    col: ['#f4f7fd', '#b8c2d6', '#4c556a'], glow: '#e8f0ff',
    text: 'Silver arrows that fly straight and far.' },
  { id: 'starfall', name: 'Starfall', set: 'olympian', rar: 2, kind: 'shot', shape: 'wand', len: 12, k: 0.7, cd: 0.11, speed: 760, life: 1.3, pkind: 'star', homing: 1, r: 6, jitter: 0.12,
    col: ['#fff6c4', '#ffe14a', '#9c6414'], glow: '#ffe14a',
    text: 'A stream of stars that seek out your foes on their own.' },
  { id: 'forgehammer', name: 'Hammer of Hephaestus', short: 'Forge Hammer', set: 'olympian', rar: 3, kind: 'melee', shape: 'hammer', len: 21, k: 0.9, cd: 0.46, reach: 125, kb: 480, boom: 90, fx: { burn: 0.2 },
    col: ['#ffe9b0', '#c8901a', '#5a2a10'], glow: '#ffb347',
    text: 'The hammer that forged the thunderbolts. Every blow bursts like the heart of a forge.' },
  { id: 'thunderbolt', name: 'Thunderbolt of Zeus', short: 'Thunderbolt', set: 'olympian', rar: 4, kind: 'shot', shape: 'bolt', len: 24, k: 0.8, cd: 0.22, speed: 1500, life: 0.7, pkind: 'bolt', r: 7, chain: 3,
    col: ['#ffffff', '#fff27a', '#8a9aff'], glow: '#fff27a',
    text: 'The weapon that cast you down. Its lightning leaps from foe to foe.' },

  // ---- The White Citadel: weapons of wisdom
  { id: 'marblejavelin', name: 'Marble Javelin', set: 'citadel', rar: 0, kind: 'melee', shape: 'spear', len: 30, cd: 0.26, reach: 172, arc: 0.55, wood: '#e4e6f0',
    col: ['#ffffff', '#e4e6f0', '#9aa2bc'], glow: '#ffffff',
    text: 'A spear of white stone, light as a reed. Narrow, but it reaches far.' },
  { id: 'owlfan', name: 'Owl-Feather Fan', set: 'citadel', rar: 1, kind: 'shot', shape: 'fan', len: 13, k: 0.9, hits: 2, cd: 0.3, n: 3, spread: 0.5, speed: 820, life: 0.5, pkind: 'wind', pierce: 2, r: 9,
    col: ['#ffffff', '#cdd6e2', '#6f7a8e'], glow: '#e8f0ff',
    text: 'Three feathers of wind with every wave, cutting through all in their way.' },
  { id: 'strategistbow', name: "Strategist's Bow", set: 'citadel', rar: 2, kind: 'shot', shape: 'bow', len: 10, k: 0.8, cd: 0.3, speed: 1250, life: 0.9, pkind: 'arrow', pierce: 3, r: 5,
    col: ['#fff6c4', '#e4e6f0', '#8a94b0'], glow: '#fff3b0',
    text: 'One arrow, placed perfectly, through a whole rank of foes.' },
  { id: 'athenaspear', name: 'Spear of Athena', set: 'citadel', rar: 3, kind: 'melee', shape: 'spear', len: 32, k: 0.9, cd: 0.26, reach: 185, arc: 0.6, wave: { dmg: 0.5, speed: 840, life: 0.55 }, wood: '#f4c24a',
    col: ['#fff6c4', '#f4c24a', '#8a94b0'], glow: '#ffe9a8',
    text: 'The spear of the grey-eyed goddess. Every thrust flies on as a lance of light.' },
  { id: 'pallas', name: 'Pallas, the Grey-Eyed Blade', short: 'Pallas', set: 'citadel', rar: 4, kind: 'melee', shape: 'great', len: 28, k: 0.85, cd: 0.28, reach: 165, arc: 1.5, chain: 2, wave: { dmg: 0.5, speed: 860, life: 0.5 }, flame: 1, trim: '#f4c24a',
    col: ['#ffffff', '#c4d8ff', '#5a6a9a'], glow: '#cfe0ff',
    text: 'A greatsword of pure thought. It cuts in a wave of light, and its lightning finds whoever is left.' },

  // ---- The Golden Fields: weapons of the sun
  { id: 'sundagger', name: 'Sunlit Dagger', set: 'gold', rar: 0, kind: 'melee', shape: 'dagger', len: 11, k: 0.9, cd: 0.12, reach: 96, kb: 120, fx: { burn: 0.2 },
    col: ['#fffbe0', '#ffc531', '#94600e'], glow: '#ffe36b',
    text: 'A sliver of noon. Very fast, and it leaves foes burning.' },
  { id: 'dawnwand', name: 'Dawn Wand', set: 'gold', rar: 1, kind: 'shot', shape: 'wand', len: 12, k: 0.75, cd: 0.24, speed: 860, life: 0.9, pkind: 'fire', r: 7, fx: { burn: 0.2 },
    col: ['#fffbe0', '#ffb020', '#94600e'], glow: '#ffd34a',
    text: 'Throws sparks of sunrise that set foes alight.' },
  { id: 'gildedbow', name: 'Gilded Bow', set: 'gold', rar: 2, kind: 'shot', shape: 'bow', len: 10, k: 0.75, cd: 0.28, n: 2, spread: 0.2, speed: 950, life: 1.3, pkind: 'arrow', homing: 1, r: 5,
    col: ['#fffbe0', '#ffc531', '#94600e'], glow: '#ffe36b',
    text: 'Two golden arrows with every shot, and neither one misses.' },
  { id: 'solarstaff', name: 'Solar Staff', set: 'gold', rar: 3, kind: 'shot', shape: 'staff', len: 24, k: 0.7, cd: 0.42, speed: 720, life: 1.1, pkind: 'fire', r: 11, boom: 105, fx: { burn: 0.25 }, wood: '#c8901a',
    col: ['#ffffff', '#ffc531', '#b04a0a'], glow: '#ffd34a',
    text: 'Hurls small suns that burst among your foes.' },
  { id: 'helios', name: "Helios, the Sun's Own Lash", short: 'Helios', set: 'gold', rar: 4, kind: 'lash', shape: 'lash', k: 0.85, cd: 0.2, reach: 195, fx: { burn: 0.3 }, wave: { dmg: 0.4, speed: 880, life: 0.5 },
    col: ['#fff6c4', '#ffc531', '#7a3a06'], glow: '#ffd34a', pal: ['#7a3a06', '#c8701a', '#ffa020', '#ffc531', '#ffe36b', '#fff6c4', '#ffffff'],
    text: 'The reins of the sun chariot. A lash of daylight with enormous reach, and every crack of it throws fire.' },

  // ---- The Silver Peaks: weapons of war
  { id: 'silvermace', name: 'Silver Mace', set: 'silver', rar: 0, kind: 'melee', shape: 'club', len: 17, k: 1.1, cd: 0.36, reach: 110, kb: 440,
    col: ['#ffffff', '#b8c2d6', '#4c556a'], glow: '#e8f0ff',
    text: 'A soldier of the forge-halls carries one. Heavy, and it sends foes flying.' },
  { id: 'legionaxe', name: 'Legion Axe', set: 'silver', rar: 1, kind: 'melee', shape: 'axe', len: 19, cd: 0.34, reach: 122, kb: 380, wood: '#6a3a2a',
    col: ['#f4f7fd', '#aebad4', '#4c556a'], glow: '#e8f0ff',
    text: 'The plain, brutal axe of the war-god’s legions.' },
  { id: 'moonglaive', name: 'Moonsilver Glaive', set: 'silver', rar: 2, kind: 'melee', shape: 'glaive', len: 28, k: 0.9, cd: 0.28, reach: 152, arc: 1.4, wave: { dmg: 0.5, speed: 780, life: 0.45 },
    col: ['#ffffff', '#c3cde0', '#55617e'], glow: '#dfe6f4',
    text: 'A sweeping blade of moonsilver. Every swing throws a crescent of cold light.' },
  { id: 'crescentscythe', name: 'Crescent Scythe', set: 'silver', rar: 3, kind: 'melee', shape: 'scythe', len: 26, k: 0.95, cd: 0.32, reach: 160, arc: 1.6, fx: { chill: 2 },
    col: ['#ffffff', '#9ab8ff', '#2a3458'], glow: '#b8c8ff',
    text: 'The new moon on a pole. One vast sweep, and everything it touches slows to a crawl.' },
  { id: 'aresspear', name: 'Spear of Ares', set: 'silver', rar: 4, kind: 'melee', shape: 'spear', len: 32, k: 0.8, cd: 0.2, reach: 190, arc: 0.6, boom: 80, fx: { burn: 0.2 }, wave: { dmg: 0.4, speed: 900, life: 0.5 }, wood: '#3a1a1a',
    col: ['#ffd0c0', '#e0402a', '#4a0a0a'], glow: '#ff5a3a',
    text: 'War itself, on a shaft of ash. It strikes like a storm of spears, and every hit bursts.' },

  // ---- The Cloudlands: weapons of the sea
  { id: 'seaglass', name: 'Sea-Glass Shards', set: 'mist', rar: 0, kind: 'shot', shape: 'wand', len: 12, k: 0.75, cd: 0.24, n: 2, spread: 0.16, speed: 900, life: 0.8, pkind: 'shard', r: 5, fx: { chill: 1.2 },
    col: ['#eafcff', '#7fd0d8', '#2a5a6a'], glow: '#aef0f0',
    text: 'Two shards of sea-glass with every flick. They chill what they cut.' },
  { id: 'tideflask', name: 'Tide Flask', set: 'mist', rar: 1, kind: 'lob', shape: 'flask', len: 8, k: 0.75, cd: 0.5, boom: 90, fx: { chill: 2 },
    col: ['#eafcff', '#3fb8ff', '#1a4a8a'], glow: '#7fd0ff',
    text: 'A bottled wave. It bursts where it lands and leaves foes half frozen.' },
  { id: 'riptideaxe', name: 'Riptide Axe', set: 'mist', rar: 2, kind: 'melee', shape: 'axe', len: 19, k: 0.9, cd: 0.34, reach: 124, kb: 400, wave: { dmg: 0.5, speed: 760, life: 0.45 },
    col: ['#d8f4ff', '#3fb8d8', '#1a4a6a'], glow: '#7fd0ff',
    text: 'An axe that pulls the tide behind it. Every swing sends a wave ahead.' },
  { id: 'trident', name: 'Trident of the Tides', short: 'Trident', set: 'mist', rar: 3, kind: 'melee', shape: 'trident', len: 30, k: 0.9, cd: 0.3, reach: 175, arc: 0.7, wave: { dmg: 0.5, speed: 800, life: 0.55 }, wood: '#c8901a',
    col: ['#d8f4ff', '#3fb8d8', '#1a4a6a'], glow: '#7fd0ff',
    text: 'The fork of a sea-god. Long thrusts, and each one sends a wave rolling ahead.' },
  { id: 'maelstrom', name: 'Maelstrom, Heart of the Sea', short: 'Maelstrom', set: 'mist', rar: 4, kind: 'beam', shape: 'staff', len: 24, k: 1.2, cd: 0.08, drain: 34, fx: { chill: 1.5 }, wood: '#1a4a6a',
    col: ['#ffffff', '#3fd8ff', '#0a3a6a'], glow: '#5fe0ff',
    text: 'A whole ocean poured through one point. Its beam drowns everything in its path. It uses energy while it fires.' },
];

// Work out each weapon's damage from the power of its rarity and realm.
const BY_ID = {};
for (const w of ARMS) {
  const realm = SET_BY_ID[w.set].realm, power = POWER[realm][w.rar];
  w.realm = realm;
  w.power = power;
  w.dmg = power * (w.k || 1) * w.cd / (w.hits || w.n || 1);
  if (w.fx) for (const f of ['burn', 'venom']) if (w.fx[f]) w.fx[f] *= power;
  BY_ID[w.id] = w;
}
export const armById = id => BY_ID[id] || null;
export const shortName = def => def.short || def.name;
export const rarityOf = def => (def.rar < 0 ? { id: 'none', name: 'None', col: '#c9a8ff' } : RARITY[def.rar]);
export const armsOf = (set, rar) => ARMS.find(w => w.set === set && w.rar === rar);

// Seven colours from dark to white, for a weapon's swing, beam and lash.
export function palOf(def) {
  if (!def.pal) {
    const [a, b, c] = def.col;
    def.pal = [c, mix(c, b, 0.5), b, mix(b, a, 0.5), a, mix(a, '#ffffff', 0.5), '#ffffff'];
  }
  return def.pal;
}

// ---------- The arsenal: what you carry ----------
const fresh = () => ({ v: 2, inv: {}, slots: [null, null, null], cur: 0, seen: {}, dry: 0, leech: 0 });
const NONE = fresh();
const EMPTY = { def: HANDS, lv: 1, key: null };

export function arms() {
  const s = G.save;
  if (!s) return NONE;
  if (!s.arms) s.arms = fresh();
  return s.arms;
}
export const keyOf = (id, lv = 1) => id + ':' + lv;
export function parseKey(key) {
  const [id, lv] = key.split(':');
  return { def: armById(id), lv: +lv || 1, key };
}
export const countOf = key => arms().inv[key] || 0;
const usable = key => !!key && !!parseKey(key).def && countOf(key) > 0;

// The weapon in your hand, or empty hands.
export function current() {
  const a = arms(), key = a.slots[a.cur];
  return usable(key) ? parseKey(key) : EMPTY;
}
export const slotArm = i => { const key = arms().slots[i]; return usable(key) ? parseKey(key) : null; };
export const hasWeapons = () => Object.keys(arms().inv).some(usable);

// Damage of one hit, before the hero's own upgrades.
export const armDmg = (def, lv) => def.dmg * (1 + 0.25 * (lv - 1));

// Pick up a weapon. It goes into an empty slot if there is one.
export function addWeapon(id, lv = 1) {
  const a = arms(), key = keyOf(id, lv), isNew = !a.seen[id];
  a.inv[key] = (a.inv[key] || 0) + 1;
  a.seen[id] = 1;
  if (!a.slots.includes(key)) {
    const free = a.slots.findIndex(k => !usable(k));
    if (free >= 0) {
      a.slots[free] = key;
      // a weapon found with empty hands goes straight into them
      if (current().def.rar < 0) a.cur = free;
    }
  }
  return { key, isNew };
}

export const canMerge = key => countOf(key) >= 2 && parseKey(key).lv < MAX_STARS;

// Two of the same weapon become one that is a star stronger. Returns the new key, or null.
export function merge(key) {
  if (!canMerge(key)) return null;
  const a = arms(), { def, lv } = parseKey(key), up = keyOf(def.id, lv + 1);
  a.inv[key] -= 2;
  if (a.inv[key] <= 0) delete a.inv[key];
  a.inv[up] = (a.inv[up] || 0) + 1;
  // a merged weapon that was in your hand stays in your hand, stronger
  const at = a.slots.indexOf(key);
  if (at >= 0) {
    if (a.slots.includes(up)) { if (!usable(key)) a.slots[at] = null; }
    else a.slots[at] = up;
  }
  return up;
}

export function mergeAll() {
  let n = 0, again = true;
  while (again) {
    again = false;
    for (const key of Object.keys(arms().inv)) while (merge(key)) { n++; again = true; }
  }
  return n;
}

// Put a weapon in a slot. If it is already in another slot, the two swap.
export function equip(slot, key) {
  const a = arms();
  if (!usable(key)) return;
  const other = a.slots.indexOf(key);
  if (other >= 0 && other !== slot) a.slots[other] = a.slots[slot];
  a.slots[slot] = key;
}

// How strong a weapon is, for sorting: its power with its stars.
export const might = w => w.def.power * (1 + 0.25 * (w.lv - 1));

// Everything you carry, strongest first.
export function owned() {
  const list = Object.keys(arms().inv).filter(usable).map(parseKey);
  list.sort((x, y) => might(y) - might(x) || y.def.rar - x.def.rar || x.def.name.localeCompare(y.def.name));
  return list;
}

// ---------- Drops ----------
// Chance of each rarity at a danger level, in percent. Values in between are blended.
const ODDS = [
  [1, [78, 18, 3.5, 0.45, 0.05]],
  [4, [55, 29, 12.5, 3, 0.5]],
  [8, [32, 32, 24, 10, 2]],
  [12, [20, 28, 30, 17, 5]],
  [18, [9, 21, 33, 27, 10]],
  [30, [3, 10, 27, 38, 22]],
];
export function rarityOdds(danger) {
  const d = Math.max(1, danger);
  let lo = ODDS[0], hi = ODDS[ODDS.length - 1];
  for (let i = 0; i < ODDS.length - 1; i++) if (d >= ODDS[i][0] && d <= ODDS[i + 1][0]) { lo = ODDS[i]; hi = ODDS[i + 1]; break; }
  if (d >= hi[0]) lo = hi;
  const k = hi[0] === lo[0] ? 0 : (d - lo[0]) / (hi[0] - lo[0]);
  const w = lo[1].map((v, i) => v + (hi[1][i] - v) * k), sum = w.reduce((s, v) => s + v, 0);
  return w.map(v => v / sum);
}
export function rollRarity(danger) {
  const odds = rarityOdds(danger);
  let r = Math.random();
  for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r <= 0) return i; }
  return 0;
}

const HEAVENS = ['olympus', 'zeus', 'gold', 'silver', 'mist'];
// What drops in a land (by biome number): its realm, its own set if it has one, and the set that
// turns up everywhere in that realm.
export function dropsIn(biome) {
  const land = BIOME_LIST[biome], realm = HEAVENS.includes(land) ? 'heaven' : 'under';
  return { realm, own: SETS.find(s => s.land === land) || null, wide: SETS.find(s => s.realm === realm && !s.land) };
}
export function rollWeapon(biome, danger) {
  const d = dropsIn(biome), rar = rollRarity(danger);
  let set;
  // a land with its own set mostly drops that; lands without one drop from all over their realm
  if (d.own) set = Math.random() < 0.75 ? d.own : d.wide;
  else set = Math.random() < 0.4 ? d.wide : pick(SETS.filter(s => s.realm === d.realm && s.land));
  return armsOf(set.id, rar);
}

// How likely a fallen foe is to leave a weapon behind.
const TOUGH = { brute: 0.26, angel: 0.22, spitter: 0.15, seraph: 0.15, ophan: 0.15, bat: 0.07, cherub: 0.07 };
export const dropChance = e => TOUGH[e.type] || 0.11;

// The weapon each great foe carries.
const BOSS_LOOT = {
  cerberus: 'fang', storm: 'tempestbow', heretic: 'magmamaul', titan: 'glacieraxe', hades: 'bident',
  ares: 'crescentscythe', apollo: 'solarstaff', athena: 'athenaspear', poseidon: 'trident', zeus: 'thunderbolt',
};
export const bossLoot = id => BOSS_LOOT[id] || 'lash';

// Bring an older save up to date.
export function fixArsenal(s) {
  const give = id => { s.arms.inv[keyOf(id)] = (s.arms.inv[keyOf(id)] || 0) + 1; s.arms.seen[id] = 1; };
  if (s.arms) {
    const old = s.arms;
    s.arms = { ...fresh(), ...old, v: 2 };
    // the Shadow Lash used to be a starter you always had; now it is a weapon like any other
    if (old.v !== 2 && (old.slots || []).includes('lash:1') && !s.arms.inv['lash:1']) give('lash');
    return;
  }
  // saves from before weapons were found in the field: make an arsenal from what they owned
  s.arms = fresh();
  const u = s.up || {}, r = s.rewards || {}, b = s.bosses || {};
  give('lash');
  if (u.stars > 0) give('starfall');
  if (u.beam > 0) give('rimelance');
  for (const id in b) if (b[id]) give(bossLoot(id));
  if (r.cerberus && !u.luck) u.luck = 1;
  if (r.hades && !u.fortune) u.fortune = 1;
  const keys = Object.keys(s.arms.inv).map(parseKey).sort((x, y) => might(y) - might(x)).map(w => w.key);
  s.arms.slots = [keys[0] || null, keys[1] || null, keys[2] || null];
}

// ---------- Words for the arsenal screen ----------
const KIND = { lash: 'Whip', melee: 'Melee', shot: 'Ranged', beam: 'Beam', lob: 'Thrown' };
const round1 = n => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toString();
export const kindName = def => KIND[def.kind];
export const speedName = def => (def.kind === 'beam' ? 'constant' : def.cd <= 0.15 ? 'very fast' : def.cd <= 0.24 ? 'fast' : def.cd <= 0.34 ? 'steady' : 'slow');
// "12.5", or "4.2 × 3" for a volley, or damage a second for a beam.
export function dmgText(def, lv, mul = 1) {
  const d = armDmg(def, lv) * mul, n = def.n || 1;
  return def.kind === 'beam' ? `${round1(d / def.cd)} a second` : n > 1 ? `${round1(d)} × ${n}` : round1(d);
}
export function traits(def) {
  const t = [], f = def.fx || {};
  if (f.burn) t.push('Burns');
  if (f.venom) t.push('Poisons');
  if (f.chill) t.push('Chills');
  if (def.chain) t.push('Chain lightning');
  if (def.boom) t.push('Explodes');
  if (def.homing) t.push('Homing');
  if (def.pierce) t.push('Pierces');
  if (def.wave) t.push('Throws a wave');
  if (def.leech) t.push('Heals you');
  return t;
}
export const stars = lv => '★'.repeat(lv) + '☆'.repeat(MAX_STARS - lv);

// ---------- Drawing ----------
const INK = '#150d22';
function stick(ctx, x0, x1, w, col) {
  ctx.lineCap = 'round';
  for (const [c, lw] of [[INK, w + 1.4], [col, w]]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.stroke();
  }
}
function solid(ctx, fill, lw = 0.9) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function metal(ctx, c, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.55, c[1]);
  g.addColorStop(1, c[2]);
  return g;
}
function shine(ctx, x, y, r, col, a) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Draw a weapon with its grip at the origin, pointing along +x. s scales it (1 = held in the hand).
export function drawArm(ctx, def, s = 1) {
  const c = def.col, B = def.len || 20, trim = def.trim || '#f4c24a', wood = def.wood || '#5a3a26';
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (def.shape) {
    case 'sword': case 'great': case 'dagger': {
      const k = def.shape === 'great' ? 1.55 : 1;
      if (def.flame) shine(ctx, B * 0.6, 0, B * 0.75, def.glow, 0.55);
      ctx.beginPath();
      ctx.moveTo(3, -1.8 * k); ctx.lineTo(B - 4 * k, -1.5 * k); ctx.lineTo(B, 0); ctx.lineTo(B - 4 * k, 1.5 * k); ctx.lineTo(3, 1.8 * k);
      ctx.closePath();
      solid(ctx, metal(ctx, c, -2 * k, 2 * k));
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(4.4, -0.3); ctx.lineTo(B - 5 * k, -0.3); ctx.stroke();
      ctx.beginPath(); ctx.rect(1.6, -3.6 * k, 1.8, 7.2 * k); solid(ctx, trim);
      stick(ctx, -3.4, 1.2, 1.9, wood);
      ctx.beginPath(); ctx.arc(-4.3, 0, 1.4, 0, TAU); solid(ctx, trim);
      break;
    }
    case 'club': {
      stick(ctx, -3, 6, 2, wood);
      ctx.beginPath();
      ctx.moveTo(5, -1.5); ctx.quadraticCurveTo(B * 0.7, -4.8, B, -3.2); ctx.quadraticCurveTo(B + 2.6, 0, B, 3.2); ctx.quadraticCurveTo(B * 0.7, 4.8, 5, 1.5);
      ctx.closePath();
      solid(ctx, metal(ctx, c, -4.5, 4.5));
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      for (const [x, y] of [[B - 5, -1.8], [B - 2, 0.8], [B - 8, 1.4]]) { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, TAU); ctx.fill(); }
      break;
    }
    case 'hammer': {
      stick(ctx, -3, B - 2, 1.9, wood);
      shine(ctx, B - 2.5, 0, 11, def.glow, 0.4);
      ctx.beginPath(); ctx.rect(B - 6, -5.6, 7, 11.2); solid(ctx, metal(ctx, c, -5.6, 5.6));
      ctx.fillStyle = trim;
      ctx.fillRect(B - 3.2, -5.2, 1.4, 10.4);
      break;
    }
    case 'axe': {
      stick(ctx, -3, B, 1.8, wood);
      ctx.beginPath();
      ctx.moveTo(B - 6, -0.6); ctx.lineTo(B - 9.5, -8); ctx.quadraticCurveTo(B - 3.5, -12, B + 2.5, -8); ctx.lineTo(B - 1, -0.6);
      ctx.closePath();
      solid(ctx, metal(ctx, c, -11, 0));
      ctx.beginPath(); ctx.moveTo(B - 5, 0.6); ctx.lineTo(B - 3.5, 4.2); ctx.lineTo(B - 2, 0.6); ctx.closePath(); solid(ctx, c[1]);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(B - 8.4, -8.2); ctx.quadraticCurveTo(B - 3.5, -11, B + 1.6, -8.2); ctx.stroke();
      break;
    }
    case 'scythe': {
      stick(ctx, -4, B, 1.7, wood);
      ctx.beginPath();
      ctx.moveTo(B + 0.6, 0.4); ctx.quadraticCurveTo(B + 1.5, -10.5, B - 14, -13.5); ctx.quadraticCurveTo(B - 5, -8.5, B - 3.6, 0.2);
      ctx.closePath();
      solid(ctx, metal(ctx, c, -13.5, 0));
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(B, -2); ctx.quadraticCurveTo(B - 0.5, -9.5, B - 11.5, -12.6); ctx.stroke();
      break;
    }
    case 'spear': {
      stick(ctx, -6, B - 6, 1.6, wood);
      ctx.beginPath(); ctx.moveTo(B - 8, 0); ctx.lineTo(B - 4.5, -2.5); ctx.lineTo(B + 1.5, 0); ctx.lineTo(B - 4.5, 2.5); ctx.closePath();
      solid(ctx, metal(ctx, c, -2.5, 2.5));
      ctx.fillStyle = trim;
      ctx.fillRect(B - 9.6, -1.3, 1.5, 2.6);
      break;
    }
    case 'trident': {
      stick(ctx, -6, B - 7, 1.7, wood);
      for (const [col, lw] of [[INK, 2.8], [c[1], 1.6], [c[0], 0.6]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        for (const dy of def.prongs === 2 ? [-3.4, 3.4] : [-4.4, 0, 4.4]) {
          ctx.beginPath();
          ctx.moveTo(B - 7.5, dy * 0.25);
          ctx.quadraticCurveTo(B - 6, dy, B - 3, dy);
          ctx.lineTo(B + (dy && def.prongs !== 2 ? 0 : 2.2), dy);
          ctx.stroke();
        }
      }
      ctx.fillStyle = trim;
      ctx.fillRect(B - 9.4, -1.4, 1.6, 2.8);
      break;
    }
    case 'glaive': {
      stick(ctx, -6, B - 8, 1.7, wood);
      ctx.beginPath();
      ctx.moveTo(B - 9, 1.1); ctx.lineTo(B - 9, -1.3); ctx.quadraticCurveTo(B - 3, -6.5, B + 3, -2.2); ctx.quadraticCurveTo(B - 2, 0.8, B - 9, 1.1);
      ctx.closePath();
      solid(ctx, metal(ctx, c, -6, 1));
      ctx.fillStyle = trim;
      ctx.fillRect(B - 10.6, -1.4, 1.6, 2.8);
      break;
    }
    case 'bow': {
      for (const [col, lw] of [[INK, 3], [c[1], 1.8], [c[0], 0.6]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(-2.5, -B); ctx.quadraticCurveTo(6, 0, -2.5, B); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-2.5, -B); ctx.lineTo(-2.5, B); ctx.stroke();
      ctx.fillStyle = trim;
      ctx.fillRect(0.6, -1.6, 1.9, 3.2);
      for (const y of [-B, B]) { ctx.beginPath(); ctx.arc(-2.5, y, 0.9, 0, TAU); ctx.fill(); }
      break;
    }
    case 'wand': {
      stick(ctx, -3, B - 2, 1.5, c[2]);
      ctx.fillStyle = trim;
      ctx.fillRect(B - 3.6, -1.2, 1.3, 2.4);
      shine(ctx, B, 0, 8, def.glow, 0.7);
      ctx.beginPath(); ctx.arc(B, 0, 2.2, 0, TAU); solid(ctx, c[0], 0.7);
      break;
    }
    case 'staff': {
      stick(ctx, -5, B - 4, 1.7, wood);
      ctx.strokeStyle = trim;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(B - 0.5, 0, 4.2, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
      shine(ctx, B - 0.5, 0, 11, def.glow, 0.75);
      ctx.beginPath(); ctx.arc(B - 0.5, 0, 2.9, 0, TAU); solid(ctx, c[0], 0.7);
      ctx.fillStyle = c[1];
      ctx.beginPath(); ctx.arc(B - 0.1, 0.4, 1.6, 0, TAU); ctx.fill();
      break;
    }
    case 'fan': {
      for (let i = -2; i <= 2; i++) {
        const a = i * 0.33;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, B, a - 0.175, a + 0.175); ctx.closePath();
        solid(ctx, i % 2 ? c[0] : c[1], 0.7);
      }
      ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, TAU); solid(ctx, trim, 0.7);
      break;
    }
    case 'flask': {
      ctx.beginPath(); ctx.rect(-1.4, -1.4, 3, 2.8); solid(ctx, 'rgba(230,240,255,.8)', 0.7);
      ctx.beginPath(); ctx.rect(-3, -1.1, 1.8, 2.2); solid(ctx, '#8a6a4a', 0.7);
      shine(ctx, 5, 0, 10, def.glow, 0.5);
      ctx.beginPath(); ctx.arc(5, 0, 4.6, 0, TAU); solid(ctx, c[1]);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(3.6, -1.8, 1.2, 0, TAU); ctx.fill();
      break;
    }
    case 'bolt': {
      shine(ctx, B * 0.45, 0, B * 0.7, def.glow, 0.6);
      ctx.beginPath();
      ctx.moveTo(-6, 0.6); ctx.lineTo(3, -3.4); ctx.lineTo(2.2, -0.8); ctx.lineTo(11, -3.6); ctx.lineTo(10, -0.8); ctx.lineTo(B, 0.4);
      ctx.lineTo(8.6, 2.8); ctx.lineTo(9.6, 0.4); ctx.lineTo(0.8, 3.2); ctx.lineTo(1.6, 0.8);
      ctx.closePath();
      ctx.fillStyle = metal(ctx, ['#ffffff', c[1], c[1]], -3.6, 3.2);
      ctx.fill();
      ctx.strokeStyle = c[2];
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
    }
  }
  // the finest weapons glimmer at the tip
  if (def.rar >= 3 && def.shape !== 'bow' && def.shape !== 'fan' && def.shape !== 'flask') shine(ctx, B, 0, 6, def.glow, 0.45);
  ctx.restore();
}

// A weapon drawn to fit a square of the given size, centred on x, y.
export function weaponIcon(ctx, def, x, y, size = 32) {
  ctx.save();
  ctx.translate(x, y);
  if (def.shape === 'lash') {
    const k = size / 34;
    ctx.lineCap = 'round';
    palOf(def).slice(1).forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2.2 * k;
      ctx.beginPath(); ctx.arc(-4 * k, 8 * k, (10 + i * 2) * k, -1.9, -0.2); ctx.stroke();
    });
  } else if (def.shape === 'bow') {
    const s = size / (def.len * 2 + 3);
    ctx.rotate(-0.5);
    ctx.translate(-1.5 * s, 0);
    drawArm(ctx, def, s);
  } else if (def.shape === 'fan') {
    const s = size / (def.len * 1.25);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-def.len * 0.55 * s, 0);
    drawArm(ctx, def, s);
  } else if (def.shape === 'flask') {
    const s = size / 15;
    ctx.rotate(Math.PI / 2 - 0.3);
    ctx.translate(-3.4 * s, 0);
    drawArm(ctx, def, s);
  } else {
    const s = size * 1.25 / (def.len + 7);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(-(def.len - 5) / 2 * s, 0);
    drawArm(ctx, def, s);
  }
  ctx.restore();
}

// A picture of a weapon for the arsenal screen, made once and kept.
const ICONS = {};
export function iconUrl(def) {
  if (!ICONS[def.id]) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    weaponIcon(cv.getContext('2d'), def, 48, 48, 68);
    ICONS[def.id] = cv.toDataURL();
  }
  return ICONS[def.id];
}
