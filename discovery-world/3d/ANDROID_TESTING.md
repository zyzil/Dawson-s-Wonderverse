# Pixel 10 Pro test branch

The `android-webgl-fallback` branch contains the Android rendering profile and
bundled character pictures. On the physical Pixel 10 Pro, the WebGL 2 cube works;
the original effects-heavy game fails with context loss and a Chrome graphics
block. After restarting Chrome, `?test&graphics=compatible` opens and gameplay
works, but the character selection pictures are blank. This identifies a working
lighter path, not the exact GPU operation responsible for the original reset.

Build 36 uses that lighter rendering profile on Android without enabling automated
test mode: speech, learning games, normal saves and gameplay remain active.
Character pictures are rendered from the game's models ahead of time and embedded
in the offline HTML; the phone does not have to draw or cache them itself.

## Shadow-free full-detail test (build 38)

The physical Pixel 10 Pro failed the shadow-only trial. This identifies at least
one failing rendering path, not the exact shader/driver operation or whether
every other feature will work together.

The next combined trial restores all six other graphics categories and keeps
shadow maps disabled:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-no-shadows&trial=1&build=38>.

This explicit preset disables shadow-map rendering and shadow-casting lights
from startup; quality controls cannot re-enable them. It ignores a conflicting
`restore=shadows` parameter. Normal Android defaults remain on the previously
working safe profile until the combined trial passes on the physical phone.
The checks page offers a separate result field for this combined trial and
skips the known failing shadow category when choosing the next individual check.

After a graphics-reset failure, force-stop Chrome before testing another link
so a lingering browser block does not invalidate the next result.

## Restore individual features (build 37)

Open the [graphics checks page](https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/graphics-tests.html?build=37).
It starts with resolution, then offers shadows, detailed scenery, fur, effects,
canvas antialiasing and the high-performance graphics request. Each link starts
from the working safe profile and restores exactly one named category. None of
the trial results automatically changes the normal game's settings.

Walk around in each trial, use the “Graphics checks” link at the top to return,
and record Worked, Slow or Failed. The page remembers these diagnostic results
separately from the saved game. “Copy results” prepares text for pasting into the
chat; it does not send anything automatically. If Chrome blocks WebGL again,
force-stop Chrome and reopen the checks page before another trial.

The direct first check is:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=safe&restore=resolution&trial=1&build=37>.
Other named checks use `restore=shadows`, `scenery`, `fur`, `effects`, `antialias`
or `power`. Effects include the original HDR post-processing pipeline and its
4× antialiasing buffer. Canvas antialiasing is a separate check. In the two
canvas-request checks, rejected settings fail visibly rather than falling back
and making the feature appear supported. The browser's accepted preference is
a hint, not a measurement of which hardware the browser selected.

Passing separately does not establish that every combination will work. Once
the physical Pixel results identify working features, test the chosen combination
before changing the normal Android default. All checks use normal gameplay,
speech and saves; they do not use automated test mode.

The service worker caches the checks page separately so visiting it cannot
replace the offline game. The checks page and graphics-profile module are also
available offline after the new service worker finishes installing.

## Open the test build

In the fork's **Settings → Pages**, select **Deploy from a branch**, then
`android-webgl-fallback` and `/ (root)`. Save and wait for deployment.

For the `zyzil/Dawson-s-Wonderverse` fork, open:

- Normal game (automatically uses the lighter profile on Android):
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/>
- Force the lighter profile on any device:
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=safe>
- Explicitly opt into the original full rendering profile for debugging:
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full>

The Android/safe profile uses procedural scenery, no shell fur, no real-time
shadow map, no post-processing effects, lower resolution, and a non-antialiased
canvas with the default graphics preference. The low-power preference is tried
if context creation fails. The original full profile remains the default on
other platforms. `?graphics=compatible` still forces the simpler canvas request,
and Android also uses the safe profile with that URL. All attempts use WebGL 2;
Three.js r187 does not support WebGL 1.

If the test fails, send the exact new error, Chrome version, and Android version.
If it loads, check walking, jumping, turning the phone, and reopening the game.
The fork is hosted on a separate origin, so it has separate saves from the
original site. Testing on the fork does not copy or erase the original saves.

## Change and publish the test branch

From the fork checkout:

```sh
git switch android-webgl-fallback
cd discovery-world/3d
npm ci
# Edit files in src/, then rebuild the self-contained game:
npm run build
git add src index.html
git commit -m "Update Android test build"
git push origin android-webgl-fallback
```

GitHub Pages publishes the committed `index.html`; editing only `src/` does not
change the live game. No build workflow or secrets are needed for branch-based
Pages deployment. Wait for the Pages deployment after each push, then reload.

## Focused regression tests

`npm run test:renderer` uses Playwright and the project's installed Three.js to
verify renderer retries, real pixel rendering, explicit compatible mode, useful
errors when WebGL 2 is unavailable, and full game startup. It serves files over
localhost. Playwright must be available in the Node environment, as for the
existing smoke test. Set `CHROMIUM_PATH` if using an installed Chromium binary.

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:renderer
CHROMIUM_PATH=/usr/bin/chromium npm run test:android
CHROMIUM_PATH=/usr/bin/chromium npm run test:graphics
CHROMIUM_PATH=/usr/bin/chromium npm run test:graphics-offline
```

The Android suite checks portrait image pixels, old blank portrait-cache recovery,
save preservation, speech delivery to the browser API, character selection,
walking, rotation, the Android default and the explicit full-profile opt-in.
These are desktop tests with software rendering, not a substitute for verifying
the new build on the physical Pixel. The full gameplay smoke suite is separate.

To regenerate the bundled portraits after changing character models:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tools/render_portraits.cjs
npm run build
```
