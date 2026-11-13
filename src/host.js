// The game's link to the site that hosts it. On Poki this talks to the Poki SDK (loaded by the
// page before the game); anywhere else every call here quietly does nothing.
const sdk = () => window.PokiSDK || null;
let playing = false, inBreak = false;

// Start the host's SDK. Resolves either way, so a failure never blocks the game.
export function hostInit() {
  const s = sdk();
  if (!s) return Promise.resolve();
  try { return s.init().catch(() => {}); } catch (e) { return Promise.resolve(); }
}

// Everything is loaded and the title screen is up.
export function hostLoaded() {
  try { const s = sdk(); if (s) s.gameLoadingFinished(); } catch (e) {}
}

// Tell the host whether the player is in the thick of play. Repeats are ignored, so the host
// never hears "started" twice in a row, and nothing is sent while an advert is showing.
export function hostPlaying(on) {
  if (inBreak || on === playing) return;
  playing = on;
  try { const s = sdk(); if (s) (on ? s.gameplayStart() : s.gameplayStop()); } catch (e) {}
}

export const inAdBreak = () => inBreak;

// A natural pause on the way back into play (a new game, a continue, rising after a fall). The
// host may show an advert here. Sound is hushed and input ignored until it is over, then `then` runs.
export function adBreak(hush, then) {
  const s = sdk();
  if (!s) { then(); return; }
  if (inBreak) return;
  hostPlaying(false);
  inBreak = true;
  hush(true);
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    inBreak = false;
    hush(false);
    then();
  };
  try { s.commercialBreak(() => {}).then(go, go); } catch (e) { go(); }
}
