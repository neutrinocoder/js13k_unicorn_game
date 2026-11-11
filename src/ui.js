// HTML overlays: shop, dialogue, toasts and screens.
import { G } from './state.js';
import { SHOP, stats, shopLocked, ARMOURS, armourKnown, armourOwned } from './items.js';
import { SITES, BIOMES, BIOME_LIST, T, levelAt, HEAVEN_LVL } from './world.js';
import { arms, owned, slotArm, SLOTS, equip, merge, mergeAll, canMerge, countOf, armFacts, stars, rarityOf, iconUrl, ARMS, SETS, RARITY, STARTER, rarityOdds, shortName, setOf } from './weapons.js';
import { sfx } from './audio.js';

const $ = id => document.getElementById(id);

export function show(id) { $(id).classList.remove('hidden'); }
export function hide(id) { $(id).classList.add('hidden'); }
export const isShown = id => !$(id).classList.contains('hidden');

let toastTimer = null;
export function toast(text, ms = 2600) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- Shop ----------
const QUOTES = [
  'Every soul pays the ferryman. Gems, little horse.',
  'Bright things from the upper world. Mostly unstolen.',
  'Buy something, or stop dripping shadow on my floor.',
  'The dead have no use for coin. The dead are wrong.',
];
let shopCtx = null;

const SMITH_QUOTES = [
  'Bring me the head of a monster and I will forge you its hide.',
  'Every great foe leaves something behind worth hammering.',
  'Hold still. Fold the wings. No, the other way. Angels are hard to measure.',
  'Steel from the Furies, rivets from the Styx. Very fashionable.',
];

export function openShop(o, onClose) {
  shopCtx = { o, onClose };
  G.scene = 'shop';
  $('shop-title').textContent = o.name || 'Merchant';
  const Q = o.type === 'armourer' ? SMITH_QUOTES : QUOTES;
  $('shop-quote').textContent = '“' + Q[Math.floor(Math.random() * Q.length)] + '”';
  renderShop();
  show('shop');
  sfx('ui');
}

export function closeShop() {
  if (!shopCtx) return;
  hide('shop');
  const cb = shopCtx.onClose;
  shopCtx = null;
  G.scene = 'play';
  cb && cb();
}

function level(it) {
  return it.id === 'potion' ? G.save.potions : G.save.up[it.id] || 0;
}

function renderShop() {
  const inf = G.save.dev && G.save.dev.infGems;
  $('shop-gems').textContent = inf ? '∞' : G.save.gems.toLocaleString();
  const box = $('shop-items');
  box.innerHTML = '';
  // the armourer sells armour and nothing else
  if (shopCtx.o.type === 'armourer') { renderArmours(box, inf); return; }
  // items still locked behind a boss go to the end of the list, greyed out
  const list = [...SHOP.filter(it => !shopLocked(it)), ...SHOP.filter(shopLocked)];
  for (const it of list) {
    if (shopLocked(it)) {
      const card = document.createElement('div');
      const boss = SITES.find(x => x.id === it.unlock);
      card.className = 'item locked';
      card.innerHTML = `<span class="icon">🔒</span><span class="info"><b>${it.name}</b><small>${it.desc}</small><em>Defeat ${boss ? boss.name : 'a great foe'} to unlock</em></span><span class="price">${it.icon}</span>`;
      box.appendChild(card);
      continue;
    }
    const lv = level(it), max = it.consumable ? 3 : it.max, done = lv >= max, cost = it.cost(lv), afford = inf || G.save.gems >= cost;
    const card = document.createElement('button');
    card.className = 'item' + (done ? ' done' : afford ? '' : ' poor');
    card.disabled = done;
    const pips = it.consumable ? `Carrying ${lv}/3` : max > 1 ? '◆'.repeat(lv) + '◇'.repeat(max - lv) : lv ? 'Owned' : '';
    card.innerHTML = `<span class="icon">${it.icon}</span><span class="info"><b>${it.name}</b><small>${it.desc}</small><em>${pips}</em></span><span class="price">${done ? (it.consumable ? 'Full' : 'Owned') : '<i></i>' + cost}</span>`;
    card.onclick = () => buy(it);
    box.appendChild(card);
  }
}

// Armour of every land: on sale once the land's boss has fallen; bought once, worn one at a time.
function renderArmours(box, inf) {
  for (const a of ARMOURS) {
    const land = BIOMES[a.land].name, pips = `${a.pips} armour`;
    if (!armourKnown(a)) {
      const boss = SITES.find(x => x.id === a.boss);
      const card = document.createElement('div');
      card.className = 'item locked';
      card.innerHTML = `<span class="icon">🔒</span><span class="info"><b>${a.name}</b><small>${pips}. ${a.perk}</small><em>Defeat ${boss ? boss.name : 'its guardian'} to unlock</em></span><span class="price">${a.icon}</span>`;
      box.appendChild(card);
      continue;
    }
    const owned = armourOwned(a), on = G.save.armour === a.id, afford = inf || G.save.gems >= a.cost;
    const card = document.createElement('button');
    card.className = 'item armour' + (on ? ' worn' : '') + (owned || afford ? '' : ' poor');
    const note = on ? 'Wearing it · click to take off' : owned ? 'Owned · click to wear' : 'Armour of ' + land;
    card.innerHTML = `<span class="icon">${a.icon}</span><span class="info"><b>${a.name}</b><small>${pips}. ${a.perk}</small><em>${note}</em></span><span class="price">${on ? 'Worn' : owned ? 'Wear' : '<i></i>' + a.cost}</span>`;
    card.onclick = () => armourClick(a);
    box.appendChild(card);
  }
}

function armourClick(a) {
  const s = G.save, inf = s.dev && s.dev.infGems;
  s.armours = s.armours || {};
  if (!s.armours[a.id]) {
    if (!inf && s.gems < a.cost) { sfx('deny'); toast('Not enough gems.'); return; }
    if (!inf) s.gems -= a.cost;
    s.armours[a.id] = 1;
    sfx('buy');
    toast(`${a.icon} You put on the ${a.name}.`);
  } else sfx('ui');
  s.armour = s.armour === a.id ? null : a.id;
  G.player.armour = stats().armour;
  G.player.armT = 0;
  renderShop();
  shopCtx.o.bought = true;
}

function buy(it) {
  if (shopLocked(it)) return;
  const lv = level(it), max = it.consumable ? 3 : it.max, cost = it.cost(lv);
  if (lv >= max) return;
  const inf = G.save.dev && G.save.dev.infGems;
  if (!inf && G.save.gems < cost) { sfx('deny'); toast('Not enough gems.'); return; }
  if (!inf) G.save.gems -= cost;
  if (it.id === 'potion') G.save.potions++;
  else {
    G.save.up[it.id]++;
    if (it.id === 'heart' || it.id === 'apple') G.player.hp = stats().maxHp;
    if (it.id === 'icarus') G.player.wing = stats().flyMax;
  }
  sfx('buy');
  renderShop();
  shopCtx.o.bought = true;
}

// ---------- Arsenal ----------
// The weapons you have found: pick the three you carry, and merge two of a kind into a stronger one.
let arsSlot = 0, arsClose = null;

export function openArsenal(onClose) {
  arsClose = onClose;
  arsSlot = arms().cur;
  G.scene = 'arsenal';
  $('ars-mergeall').onclick = () => {
    const n = mergeAll();
    if (!n) return;
    sfx('buy');
    toast(n === 1 ? 'Merged 1 pair.' : `Merged ${n} pairs.`);
    renderArsenal();
  };
  renderArsenal();
  show('arsenal');
  sfx('ui');
}

export function closeArsenal() {
  hide('arsenal');
  G.scene = 'play';
  const cb = arsClose;
  arsClose = null;
  cb && cb();
}

const pct = v => (v >= 0.1 ? Math.round(v * 100) : v >= 0.01 ? Math.round(v * 1000) / 10 : Math.round(v * 10000) / 100) + '%';

function renderArsenal(flash) {
  const A = arms(), S = stats(), p = G.player;
  // the three slots; the chosen one is where the next weapon you pick will go
  const row = $('ars-slots');
  row.innerHTML = '';
  for (let i = 0; i < SLOTS; i++) {
    const w = slotArm(i), b = document.createElement('button');
    b.className = 'slot' + (i === arsSlot ? ' on' : '');
    if (w) {
      const R = rarityOf(w.def);
      b.style.setProperty('--rc', R.col);
      b.innerHTML = `<kbd>${i + 1}</kbd><img src="${iconUrl(w.def)}" alt=""><span><b>${shortName(w.def)}</b><small>${R.name}${w.def.rar >= 0 ? ' · ' + stars(w.lv) : ''}</small></span>`;
    } else b.innerHTML = `<kbd>${i + 1}</kbd><i></i><span><b>Empty</b><small>Pick a weapon below</small></span>`;
    b.onclick = () => { arsSlot = i; sfx('ui'); renderArsenal(); };
    row.appendChild(b);
  }

  // what is likely to drop where you stand
  const B = BIOMES[BIOME_LIST[G.biome]], base = B.heaven ? HEAVEN_LVL : levelAt(Math.round((p.x + p.w / 2) / T), Math.round((p.y + p.h / 2) / T));
  const odds = rarityOdds(base + S.fortune), set = SETS.find(x => x.id === setOf(G.biome));
  $('ars-odds').innerHTML = `<b>${B.name} · Danger ${base}${S.fortune ? ' +' + S.fortune : ''}</b>` +
    RARITY.map((r, i) => `<span style="color:${r.col}">${r.name} ${pct(odds[i])}</span>`).join('') +
    `<em>${set ? `Foes here drop the ${set.theme} weapons of ${set.name}.` : 'Weapons from all four circles wash up here.'} More danger means finer weapons.</em>`;

  // everything you carry
  const box = $('ars-items');
  box.innerHTML = '';
  for (const w of [{ def: STARTER, lv: 1, key: 'lash:1' }, ...owned()]) {
    const R = rarityOf(w.def), n = countOf(w.key), at = A.slots.indexOf(w.key), found = w.def.rar >= 0;
    const card = document.createElement('div');
    card.className = 'item wpn' + (at >= 0 ? ' worn' : '') + (w.key === flash ? ' flash' : '');
    card.style.setProperty('--rc', R.col);
    card.innerHTML = `<img class="icon" src="${iconUrl(w.def)}" alt=""><span class="info"><b>${w.def.name}</b><small>${armFacts(w.def, w.lv, S.wdmg)}</small><small>${w.def.text}</small>` +
      `<em>${R.name}${found ? ' · ' + stars(w.lv) + ' · ×' + n : ''}${at >= 0 ? ' · slot ' + (at + 1) : ''}</em></span><span class="acts"></span>`;
    const acts = card.querySelector('.acts');
    const eq = document.createElement('button');
    eq.className = 'mini';
    eq.textContent = at === arsSlot ? 'Equipped' : 'Equip';
    eq.disabled = at === arsSlot;
    eq.onclick = () => { equip(arsSlot, w.key); A.cur = arsSlot; sfx('ui'); renderArsenal(); };
    acts.appendChild(eq);
    if (found) {
      const can = canMerge(w.key), mg = document.createElement('button');
      mg.className = 'mini' + (can ? ' go' : '');
      mg.textContent = w.lv >= 5 ? 'Max' : 'Merge';
      mg.disabled = !can;
      mg.title = w.lv >= 5 ? 'This weapon is as strong as it can be.' : 'Two of the same weapon with the same stars merge into one a star stronger (+25% damage).';
      mg.onclick = () => {
        const up = merge(w.key);
        if (!up) return;
        sfx('buy');
        toast(`${shortName(w.def)} is now ${stars(w.lv + 1)}`);
        renderArsenal(up);
      };
      acts.appendChild(mg);
    }
    box.appendChild(card);
  }
  $('ars-mergeall').disabled = !owned().some(w => canMerge(w.key));

  // the codex: five sets, five rarities
  const cx = $('ars-codex');
  let html = '<span></span>' + RARITY.map(r => `<span class="h" style="color:${r.col}">${r.name}</span>`).join('');
  for (const st of SETS) {
    html += `<span class="set">${st.name}<small>${st.theme}</small></span>`;
    for (let r = 0; r < 5; r++) {
      const def = ARMS.find(w => w.set === st.id && w.rar === r);
      html += A.seen[def.id]
        ? `<span class="cell yes" style="--rc:${RARITY[r].col}" title="${def.text}"><img src="${iconUrl(def)}" alt="">${shortName(def)}</span>`
        : `<span class="cell no" title="Not found yet. Dropped by foes in ${st.name}.">?</span>`;
    }
  }
  cx.innerHTML = html;
  $('ars-count').textContent = `${ARMS.filter(w => A.seen[w.id]).length} of ${ARMS.length} found`;
}

// ---------- Dialogue ----------
let dlg = null;
export function openDialog(name, lines, onDone, portrait = '🌿') {
  dlg = { lines, i: 0, onDone };
  G.scene = 'dialog';
  document.querySelector('#dialog .portrait').textContent = portrait;
  $('dialog').classList.toggle('reward', portrait !== '🌿');
  $('dlg-name').textContent = name;
  $('dlg-text').textContent = lines[0];
  show('dialog');
}
export function advanceDialog() {
  if (!dlg) return;
  dlg.i++;
  sfx('ui');
  if (dlg.i >= dlg.lines.length) {
    hide('dialog');
    const cb = dlg.onDone;
    dlg = null;
    G.scene = 'play';
    cb && cb();
    return;
  }
  $('dlg-text').textContent = dlg.lines[dlg.i];
}
