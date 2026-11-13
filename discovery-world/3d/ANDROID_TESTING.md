# Pixel 10 Pro test branch

The `android-webgl-fallback` branch contains the proposed WebGL 2 startup fix.
The Pixel can run the WebGL 2 spinning-cube test, but the original game reports
`THREE.WebGLRenderer: Error creating WebGL context.` The exact device cause
still needs verification.

## Open the test build

In the fork's **Settings → Pages**, select **Deploy from a branch**, then
`android-webgl-fallback` and `/ (root)`. Save and wait for deployment.

For the `zyzil/Dawson-s-Wonderverse` fork, open:

- Start directly with compatible graphics:
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=compatible>
- Try the original settings first, with automatic fallback:
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/>

The compatible URL disables canvas antialiasing and uses the default graphics
preference first. It then tries the low-power preference if context creation
fails. The regular URL first tries the original antialiasing/high-performance
request. All attempts use WebGL 2; Three.js r187 does not support WebGL 1.

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
```

These are desktop tests with software rendering. The Pixel test is still needed;
the full gameplay smoke suite is a separate check.
