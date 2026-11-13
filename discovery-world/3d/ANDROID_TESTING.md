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
