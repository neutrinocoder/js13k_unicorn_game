# Unicorn Ascent

You were the brightest unicorn on Olympus, until Zeus grew afraid of you and cast you down into Hell. Fight your way out of the underworld, defeat Hades, then climb back to the heavens to face Ares, Apollo, Athena, Poseidon and finally Zeus himself. You have a rainbow tail, a recoil blast and a little help from some bubbles.

The game uses JavaScript, Canvas 2D and Web Audio. All artwork and sound are made in code. You do not need to install libraries to play.

## How to play

Open `index.html` in your browser and choose Begin. You can also extract `unicorn-ascent.zip` into a folder and open the `index.html` inside it.

| Control | Action |
| :--- | :--- |
| A / D or Left / Right | Move |
| W, Up or Space | Jump. Press again in the air to double jump. |
| C or Shift | Dash with brief protection |
| Mouse | Aim |
| Left mouse button or Z | Attack. Hold to keep attacking. |
| 1 | Select the rainbow tail whip |
| 4 | Select the recoil blast |
| B or 2 | Activate charged bubbles |
| M | Mute or unmute all audio |
| Escape | Release the mouse pointer |
| Enter | Return to the title after winning |

Clicking the game captures your mouse for aiming. Aiming does not change your movement direction. Without mouse aiming, attacks follow the way you face; Up and Down aim vertically.

The tail whip hits enemies along its sweep. The blast has unlimited ammo and a one-second cooldown. Aiming the blast vertically also gives you recoil. Bubbles charge in ten seconds, shield you briefly and trap nearby enemies. You can bounce off empty bubbles too.

Checkpoints save your progress at world boundaries. The current build includes a testing shortcut: press T during play to jump straight to Hades, or restart his fight.

<details>
<summary>Stuck? Here is how the world works.</summary>

Climbing Limbo never ends. The real route starts at the portal below the starting area. It leads through Lust, Gluttony, Heresy and Treachery. Wind, mud, volcanic attacks and hail make each region different. Defeat Hades to escape.

</details>

## Build the ZIP from the readable source

Edit the root `index.html`. This is the readable source, not the minified game.

Install Node.js 22 with npm, clone or download this repository, then open a terminal in its folder and run:

```sh
npm ci
npm run build
```

`npm ci` installs the build tools using the versions in `package-lock.json`. Run it when starting from a fresh copy or after the dependencies change.

`npm run build`:

1. Converts descriptive global names to compact names, then uses Terser to minify the JavaScript.
2. Writes the smaller game to `dist/index.html`, leaving your readable source unchanged.
3. Packages it into `unicorn-ascent.zip` in the repository folder, replacing the old ZIP.

This is how the ZIP included in the repository is created. You do not need to zip anything manually. The archive contains only `index.html` at its top level. Build tools, tests and documentation are not included.

The build prints the ZIP size and remaining space. It fails if the archive is **13,312 bytes or larger**. The latest verified build is **13,077 bytes**, leaving **235 bytes** below the limit. Check the size printed after your own changes.

Do not edit `dist/index.html`; the next build overwrites it.

## Run the tests

To test the readable source, build the ZIP and test the minified version:

```sh
npm run check
```

Or run each step yourself:

```sh
npm test
npm run build
npm run test:dist
```

These tests check game logic using a simulated canvas and audio setup. Before submitting, also extract the ZIP and play it in Chrome and Firefox. Check their consoles for errors and play through the boss fight.

## Files in the repository

| File | Purpose |
| :--- | :--- |
| `index.html` | Readable game source and styles |
| `build.cjs` | Minifies, packages and checks the ZIP size |
| `source-names.json` | Maps readable global names to compact build names |
| `rename.cjs` | Renames JavaScript identifiers without changing strings or property names |
| `package.json` | Build commands and development dependencies |
| `package-lock.json` | Pins dependency versions |
| `verify.cjs` | Game regression tests |
| `dist/index.html` | Generated minified game, ignored by Git |
| `unicorn-ascent.zip` | Submission archive |

Start with `update` for movement and combat, `generate` for platforms, `tail` and `whipHits` for the whip, and `drawWorld` for rendering. `soundtrack` and `sound` generate the audio.

## Credits and release note

Quotations are from Dante's Inferno, translated by Henry Wadsworth Longfellow.