// HTML overlays: shop, dialogue, toasts and screens.
import { G } from './state.js';
import { SHOP, stats, shopLocked } from './items.js';
import { SITES } from './world.js';
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
  'Buy something, or stop dripping rainbow on my floor.',
  'The dead have no use for coin. The dead are wrong.',
];
let shopCtx = null;

export function openShop(o, onClose) {
  shopCtx = { o, onClose };
  G.scene = 'shop';
  $('shop-title').textContent = o.name || 'Merchant';
  $('shop-quote').textContent = '“' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '”';
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
    if (it.id === 'stars') { G.save.weapon = 2; toast('Starfall ready — press 3.'); }
    if (it.id === 'beam') { G.save.weapon = 3; toast('Rainbow Lance ready — press 4.'); }
  }
  sfx('buy');
  renderShop();
  shopCtx.o.bought = true;
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
