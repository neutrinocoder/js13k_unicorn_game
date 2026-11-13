# Angel Ascent

You were the brightest angel of Olympus, until Zeus grew afraid of you and cast you down. Fight through the circles of the underworld, defeat Hades, then climb back to the heavens to face Ares, Apollo, Athena, Poseidon and Zeus himself.

An open-world action platformer in plain JavaScript, Canvas 2D and Web Audio. All artwork, music and sound are made in code. There are no libraries and nothing to install to play.

## Play

Serve this folder with any static web server and open it in a browser, for example:

```sh
python -m http.server 5173
```

Then open `http://localhost:5173`.

- **Keyboard and mouse:** A/D to move, W or Space to jump, mouse to aim, left click to attack, right click to blast. The full list is under Controls on the title screen.
- **Phones and tablets:** on-screen controls appear by themselves: a thumb-stick on the left and buttons on the right. Attacks aim at the nearest foe.

Progress is saved in the browser.

## What is where

| Path | What it is |
| :--- | :--- |
| `index.html`, `style.css` | The page and its styles |
| `src/` | The game, one module for each part (`main.js` starts it) |
| `fonts/` | The three fonts the game uses (SIL Open Font Licence), so nothing is fetched from outside |
| `stamp.py` | Writes a version stamp for every module into `index.html` |
| `tools/` | The Poki build |
| `classic/` | The original 13 KB js13k game, Unicorn Ascent, and (at the top level) its own build and tests |

## Working on the game

Edit the files in `src/`. Before committing, run:

```sh
python stamp.py
```

It gives every module an address that changes when the file does, so a browser never mixes old and new files.

The developer console (the backtick key) has cheats for testing: `help` lists them. It is not part of the Poki build.

## The Poki build

```sh
npm ci
python tools/poki_build.py
```

`npm ci` installs the minifier and is only needed once. The build writes `build/poki/` and `build/angel-ascent-poki.zip`; upload either to the [Poki Inspector](https://inspector.poki.dev) to test, then to Poki for Developers.

Compared with the game as it runs from this folder, the Poki build:

- loads the Poki SDK and reports to it (`src/host.js`): loading finished, play started and stopped, and a commercial break before a new game, a continue, and rising after a fall;
- has no developer console or cheats, and no link to the classic version;
- makes no request to anywhere but Poki;
- is minified.

Outside Poki the SDK is absent and `src/host.js` does nothing, so the same code runs everywhere.

## The classic version

`classic/index.html` is the readable source of the original js13k entry. `npm run build` minifies it to `dist/index.html` and packs `unicorn-ascent.zip` (it must stay under 13,312 bytes); `npm run check` tests the source and the build.
