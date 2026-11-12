// HTML overlays: shop, dialogue, toasts and screens.
import { G } from './state.js';
import { SHOP, stats, shopLocked, ARMOURS, armourKnown, armourOwned } from './items.js';
import { SITES, BIOMES, BIOME_LIST, T, levelAt, HEAVEN_LVL } from './world.js';
import { arms, owned, slotArm, SLOTS, equip, merge, mergeAll, canMerge, countOf, parseKey, current, rarityOf, iconUrl, ARMS, SETS, REALMS, RARITY, MAX_STARS, rarityOdds, shortName, dropsIn, setById, armsOf, dmgText, kindName, speedName, traits } from './weapons.js';
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
  $('shop-face').textContent = o.type === 'armourer' ? '⚒️' : '⚱️';
  $('shop').classList.toggle('smith', o.type === 'armourer');
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

// Little diamonds showing how far an upgrade has been taken.
const pips = (lv, max, cls = '') => `<span class="pips ${cls}">${Array.from({ length: max }, (_, i) => `<i${i < lv ? ' class="on"' : ''}></i>`).join('')}</span>`;
function shelf(box, title) {
  const h = document.createElement('h4');
  h.className = 'shop-head';
  h.textContent = title;
  box.appendChild(h);
}

function renderShop() {
  const inf = G.save.dev && G.save.dev.infGems;
  $('shop-gems').textContent = inf ? '∞' : G.save.gems.toLocaleString();
  const box = $('shop-items');
  box.innerHTML = '';
  // the armourer sells armour and nothing else
  if (shopCtx.o.type === 'armourer') { renderArmours(box, inf); return; }
  const open = SHOP.filter(it => !shopLocked(it));
  const shelves = [
    ['Supplies and training', open.filter(it => !it.unlock)],
    ['Spoils of the great foes', open.filter(it => it.unlock)],
    ['Not yet for sale', SHOP.filter(shopLocked)],
  ];
  for (const [title, list] of shelves) {
    if (!list.length) continue;
    shelf(box, title);
    for (const it of list) {
      if (shopLocked(it)) {
        const card = document.createElement('div');
        const boss = SITES.find(x => x.id === it.unlock);
        card.className = 'item locked';
        card.innerHTML = `<span class="icon">${it.icon}</span><span class="info"><b>${it.name}</b><small>${it.desc}</small><em>Defeat ${boss ? boss.name : 'a great foe'} to unlock</em></span><span class="price lock">🔒</span>`;
        box.appendChild(card);
        continue;
      }
      const lv = level(it), max = it.consumable ? 3 : it.max, done = lv >= max, cost = it.cost(lv), afford = inf || G.save.gems >= cost;
      const card = document.createElement('button');
      card.className = 'item' + (done ? ' done' : afford ? '' : ' poor');
      card.disabled = done;
      const note = it.consumable ? `<em>Carrying ${lv} of 3</em>` : max > 1 ? pips(lv, max) : '';
      card.innerHTML = `<span class="icon">${it.icon}</span><span class="info"><b>${it.name}</b><small>${it.desc}</small>${note}</span><span class="price">${done ? (it.consumable ? 'Full' : max > 1 ? 'Maxed' : 'Owned') : '<i></i>' + cost}</span>`;
      card.onclick = () => buy(it);
      box.appendChild(card);
    }
  }
}

// Armour of every land: on sale once the land's boss has fallen; bought once, worn one at a time.
function renderArmours(box, inf) {
  const known = ARMOURS.filter(armourKnown);
  const shelves = [['Forged and ready', known], ['Not yet forged', ARMOURS.filter(a => !armourKnown(a))]];
  for (const [title, list] of shelves) {
    if (!list.length) continue;
    shelf(box, title);
    for (const a of list) {
      const land = BIOMES[a.land].name, m = a.look.metal;
      const tile = `<span class="icon metal" style="background:linear-gradient(140deg,${m[0]},${m[1]} 55%,${m[2]})">${a.icon}</span>`;
      const shields = pips(a.pips, a.pips, 'sh');
      if (!armourKnown(a)) {
        const boss = SITES.find(x => x.id === a.boss);
        const card = document.createElement('div');
        card.className = 'item locked';
        card.innerHTML = `${tile}<span class="info"><b>${a.name}</b>${shields}<small>${a.perk}</small><em>Defeat ${boss ? boss.name : 'its guardian'} to unlock</em></span><span class="price lock">🔒</span>`;
        box.appendChild(card);
        continue;
      }
      const owned = armourOwned(a), on = G.save.armour === a.id, afford = inf || G.save.gems >= a.cost;
      const card = document.createElement('button');
      card.className = 'item armour' + (on ? ' worn' : '') + (owned ? ' mine' : afford ? '' : ' poor');
      const note = on ? 'Wearing it · click to take off' : owned ? 'Owned · click to wear' : 'Armour of ' + land;
      card.innerHTML = `${tile}<span class="info"><b>${a.name}</b>${shields}<small>${a.perk}</small><em>${note}</em></span><span class="price">${on ? 'Worn' : owned ? 'Wear' : '<i></i>' + a.cost}</span>`;
      card.onclick = () => armourClick(a);
      box.appendChild(card);
    }
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
let arsSel = null, arsTab = 'w', arsClose = null;

export function openArsenal(onClose) {
  arsClose = onClose;
  const first = owned()[0];
  arsSel = current().key || (first ? first.key : null);
  arsTab = 'w';
  G.scene = 'arsenal';
  $('ars-mergeall').onclick = () => {
    const n = mergeAll();
    if (!n) return;
    sfx('buy');
    toast(n === 1 ? 'Merged 1 pair.' : `Merged ${n} pairs.`);
    if (!countOf(arsSel || '')) { const best = owned()[0]; arsSel = best ? best.key : null; }
    renderArsenal();
  };
  $('ars-tab-w').onclick = () => { arsTab = 'w'; sfx('ui'); renderArsenal(); };
  $('ars-tab-c').onclick = () => { arsTab = 'c'; sfx('ui'); renderArsenal(); };
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
const filled = lv => '★'.repeat(lv);
const starRow = lv => `<span class="stars">${filled(lv)}<i>${'★'.repeat(MAX_STARS - lv)}</i></span>`;
const whereFound = def => { const st = setById(def.set); return st.land ? `Dropped by foes in ${st.land === 'olympus' ? 'the ' : ''}${st.name}.` : def.realm === 'heaven' ? 'Dropped by foes anywhere in heaven.' : 'Dropped by foes anywhere in the underworld.'; };

function renderArsenal(flash) {
  const A = arms(), S = stats(), p = G.player, list = owned();
  $('ars-tab-w').classList.toggle('on', arsTab === 'w');
  $('ars-tab-c').classList.toggle('on', arsTab === 'c');
  $('ars-main').classList.toggle('hidden', arsTab !== 'w');
  $('ars-codex').classList.toggle('hidden', arsTab !== 'c');
  $('ars-count').textContent = `${ARMS.filter(w => A.seen[w.id]).length}/${ARMS.length}`;
  if (arsTab === 'c') { renderCodex(A); return; }
  if (arsSel && !countOf(arsSel)) arsSel = list[0] ? list[0].key : null;

  // the three weapons you carry
  const row = $('ars-slots');
  row.innerHTML = '';
  for (let i = 0; i < SLOTS; i++) {
    const w = slotArm(i), b = document.createElement('button');
    b.className = 'aslot' + (A.cur === i && w ? ' cur' : '') + (w && w.key === arsSel ? ' sel' : '') + (w ? '' : ' empty');
    if (w) {
      const R = rarityOf(w.def);
      b.style.setProperty('--rc', R.col);
      b.innerHTML = `<kbd>${i + 1}</kbd><span class="art"><img src="${iconUrl(w.def)}" alt=""></span><span class="nm"><b>${shortName(w.def)}</b>${starRow(w.lv)}<small>${A.cur === i ? 'In your hand' : R.name}</small></span>`;
      b.onclick = () => { arsSel = w.key; A.cur = i; sfx('ui'); renderArsenal(); };
    } else {
      b.innerHTML = `<kbd>${i + 1}</kbd><span class="art"></span><span class="nm"><b>Empty</b><small>Pick a weapon, then a slot</small></span>`;
      b.disabled = true;
    }
    row.appendChild(b);
  }

  // everything you have found
  const box = $('ars-items');
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<p class="ars-none"><b>Your hands are empty.</b>Defeat a foe and it will leave a weapon behind. Until then, your blast is all you have: click to fire it.</p>';
  }
  for (const w of list) {
    const R = rarityOf(w.def), n = countOf(w.key), at = A.slots.indexOf(w.key);
    const t = document.createElement('button');
    t.className = 'tile' + (w.key === arsSel ? ' sel' : '') + (canMerge(w.key) ? ' ready' : '') + (w.key === flash ? ' flash' : '') + (w.def.realm === 'heaven' ? ' holy' : '');
    t.style.setProperty('--rc', R.col);
    t.title = w.def.name;
    t.innerHTML = `<img src="${iconUrl(w.def)}" alt=""><span class="st">${filled(w.lv)}</span>${n > 1 ? `<span class="n">×${n}</span>` : ''}${at >= 0 ? `<span class="sl">${at + 1}</span>` : ''}`;
    t.onclick = () => { arsSel = w.key; sfx('ui'); renderArsenal(); };
    box.appendChild(t);
  }
  $('ars-mergeall').disabled = !list.some(w => canMerge(w.key));

  // what is likely to drop where you stand
  const B = BIOMES[BIOME_LIST[G.biome]], base = B.heaven ? HEAVEN_LVL : levelAt(Math.round((p.x + p.w / 2) / T), Math.round((p.y + p.h / 2) / T));
  const odds = rarityOdds(base + S.fortune), d = dropsIn(G.biome);
  $('ars-odds').innerHTML = `<h4>Drops here <span>${B.name} · Danger ${base}${S.fortune ? ' +' + S.fortune : ''}</span></h4>` +
    `<div class="bar">${RARITY.map((r, i) => `<i style="flex:${Math.max(odds[i], 0.012)};background:${r.col}" title="${r.name} ${pct(odds[i])}"></i>`).join('')}</div>` +
    `<div class="legend">${RARITY.map((r, i) => `<span style="color:${r.col}">${r.name} <b>${pct(odds[i])}</b></span>`).join('')}</div>` +
    `<p>${d.own ? `Foes here mostly drop the ${d.own.theme} weapons of ${d.own.land === 'olympus' ? 'the ' : ''}${d.own.name}.` : d.realm === 'heaven' ? 'Weapons from all over heaven turn up here.' : 'Weapons from every circle wash up here.'} The greater the danger, the finer the weapon.${d.realm === 'heaven' ? ' The weapons of heaven far outmatch those of the underworld.' : ''}</p>`;

  renderDetail(A, S, flash);
}

// The chosen weapon, large, with what it does and what you can do with it.
function renderDetail(A, S, flash) {
  const el = $('ars-detail');
  if (!arsSel) {
    el.innerHTML = '<div class="d-empty"><span>⚔</span><p>Weapons you find appear here.</p></div>';
    return;
  }
  const w = parseKey(arsSel), def = w.def, R = rarityOf(def), n = countOf(w.key), at = A.slots.indexOf(w.key), st = setById(def.set);
  const realm = REALMS.find(r => r.id === def.realm).name;
  el.style.setProperty('--rc', R.col);
  el.innerHTML =
    `<div class="d-art${w.key === flash ? ' flash' : ''}"><img src="${iconUrl(def)}" alt=""></div>` +
    `<h3>${def.name}</h3>` +
    `<p class="d-sub"><span class="pill">${R.name}</span><span>${realm} · ${st.theme}</span></p>` +
    `<p class="d-stars">${starRow(w.lv)}<small>${n > 1 ? `You have ${n}` : 'You have 1'}</small></p>` +
    `<dl class="d-stats"><dt>Damage</dt><dd>${dmgText(def, w.lv, S.wdmg)}</dd><dt>Speed</dt><dd>${speedName(def)}</dd><dt>Kind</dt><dd>${kindName(def)}</dd></dl>` +
    (traits(def).length ? `<p class="d-chips">${traits(def).map(t => `<span>${t}</span>`).join('')}</p>` : '') +
    `<p class="d-text">${def.text}</p>` +
    `<div class="d-equip"><span>Carry in slot</span></div>` +
    `<button class="merge"></button>` +
    `<p class="d-where">${whereFound(def)}</p>`;
  const eq = el.querySelector('.d-equip');
  for (let i = 0; i < SLOTS; i++) {
    const b = document.createElement('button');
    b.className = 'mini' + (at === i ? ' on' : '');
    b.textContent = i + 1;
    b.title = at === i ? 'It is in this slot' : 'Put it in slot ' + (i + 1);
    b.onclick = () => { equip(i, w.key); A.cur = i; sfx('ui'); renderArsenal(); };
    eq.appendChild(b);
  }
  const mg = el.querySelector('.merge'), can = canMerge(w.key);
  mg.disabled = !can;
  mg.classList.toggle('go', can);
  mg.innerHTML = w.lv >= MAX_STARS ? 'Fully merged' : can
    ? `Merge two into ${filled(w.lv + 1)}<small>Damage ${dmgText(def, w.lv, S.wdmg)} → ${dmgText(def, w.lv + 1, S.wdmg)}</small>`
    : `Merge<small>Find one more ${shortName(def)} ${filled(w.lv)} to make ${filled(w.lv + 1)}</small>`;
  mg.onclick = () => {
    const up = merge(w.key);
    if (!up) return;
    sfx('buy');
    arsSel = up;
    renderArsenal(up);
  };
}

// Every weapon there is, in two batches: found ones shown, the rest still a mystery.
function renderCodex(A) {
  let html = '';
  for (const realm of REALMS) {
    const sets = SETS.filter(x => x.realm === realm.id), all = ARMS.filter(w => w.realm === realm.id);
    html += `<h4 class="${realm.id}">${realm.name}<span>${all.filter(w => A.seen[w.id]).length} of ${all.length} found</span></h4><div class="codex"><span></span>` +
      RARITY.map(r => `<span class="h" style="color:${r.col}">${r.name}</span>`).join('');
    for (const st of sets) {
      html += `<span class="set">${st.name}<small>${st.theme}</small></span>`;
      for (let r = 0; r < 5; r++) {
        const def = armsOf(st.id, r);
        html += A.seen[def.id]
          ? `<span class="cell yes" style="--rc:${RARITY[r].col}" title="${def.text}"><img src="${iconUrl(def)}" alt="">${shortName(def)}</span>`
          : `<span class="cell no" style="--rc:${RARITY[r].col}" title="Not found yet. ${whereFound(def)}">?</span>`;
      }
    }
    html += '</div>';
  }
  $('ars-codex').innerHTML = html + '<p class="codex-note">A common weapon of heaven is a match for a rare one from the underworld.</p>';
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
  $('dlg-count').textContent = lines.length > 1 ? `1 / ${lines.length}` : '';
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
  $('dlg-count').textContent = `${dlg.i + 1} / ${dlg.lines.length}`;
}
