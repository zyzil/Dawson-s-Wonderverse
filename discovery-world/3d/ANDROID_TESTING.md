# Pixel 10 Pro test branch

## Current result and compiled receiver-shader trial (build 46)

Build 45 reset earlier than the prior run: all four real-world casting checks
passed, then starting-view surfaces reset with **zero receiving draws**. The
reported camera aspect is 0.5428921568627451. This step passed in build 44;
view aspect and newly loaded meshes vary, so the failure is not established as
underground-specific or purely deterministic.

Three.js r187's runtime `receiveShadow=false` leaves shadow code and active
samplers in the compiled program. This new opt-in mode removes those shader
features for nonreceivers and keeps them for true receivers:

<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-basic-shadows&preflight=1&worldprobe=areas&shadowcode=receivers&trial=1&build=46>.

It preserves original surface materials, real shadow casting/receiving, full
resolution, 1536 map size and antialiasing. The existing preflight and six-view
checks run with the new variants. If it resets, use **Copy graphics report**.
`shadowFeatureDraws` records how many color draws selected a program with the
compiled shadow feature; it must be zero for the runtime-off surface probes.
This metadata is not a per-material rendered-pixel test. Actual active sampler
removal and pixel preservation are verified separately in the desktop tests.

The build uses three guarded substitutions in the pinned npm Three.js 0.187.0
ESM renderer and tracks effective flags/mode to select cached programs correctly
for shared materials and runtime changes. It fails closed on dependency drift;
node_modules stays untouched. Omit `shadowcode=receivers` for the original path.
Normal Android retains its confirmed shadow-free profile. This is a candidate
compatibility change, not a claimed completed phone fix. Force-stop Chrome first
if the prior reset left graphics blocked.

## Current physical result and area checks (build 45)

Build 44 completed all 13 starting-view checks on the Pixel, including the
combined world draw. Six local views then completed. The next view, underground
at **(20, -6)**, reset before its GPU fence signaled. Starting-view receiving draw
submissions included physical surfaces, instanced scenery and a skinned body;
standard, custom and fur had zero receiving draws and remain unproved.

Run the extended area diagnostic:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-basic-shadows&preflight=1&worldprobe=areas&trial=1&build=45>.

It preserves the initial check sequence, then separates casting and receiving
at both underground views and the remaining sky/castle views before their normal
local draw. This may load more slowly. If it resets, use **Copy graphics report**.
The latest `worldShadowCheck` includes its coordinates and aspect; the compact
`worldShadowChecks` history preserves completed views, probe counts and state
restoration even if a later view fails.

The new browser check uses portrait orientation, closer to the phone's visible
area. Actual draw counts still determine coverage; completion with zero receiving
draws is not proof of support for that material group. The stage labels name the
submitted view/category, not a specific GPU instruction. The exact cause remains
unknown, and this run is diagnostic rather than a claimed phone fix.

`worldprobe=1` retains build 44's starting-view-only checks. Normal Android stays
on the confirmed shadow-free profile; saves are unchanged. Force-stop Chrome
before the next check if the previous reset left graphics blocked.

## Current result and automatic world checks (build 44)

On the physical Pixel, **both build 43 simple probes passed**: on the game's
canvas and in its exact HDR antialiased startup buffer, zero GL errors and a
retained 1536×1536 Basic shadow map. The first actual world view still reset.
Initializing the map first did not solve this failure. The buffer alone does
not reproduce it with simple meshes.

Run the world-specific check:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-basic-shadows&preflight=1&worldprobe=1&trial=1&build=44>.

One run checks actual depth casting from static, instanced and skinned meshes,
with cutout/displaced groups where present. These checks use a separate main
camera layer, while the existing shadow-camera layers still see world casters;
no world surface colors are drawn. It then freezes the full depth map and tests
the original world shaders with receiving off and enabled per material/geometry
group, including fur. The final check combines all casters and receivers.
Every submitted step waits for GPU completion before continuing.

If it resets, use **Copy graphics report**. `worldShadowCheck.probes` contains
completed steps, the pending step and actual depth/color draw counts. A group
with zero actual draws has not been proved to work. The stage identifies the
submitted category, not a specific GPU instruction or defective mesh.

Temporary flags and layers restore even after failure; no saves are modified.
If all checks pass, normal warmup and play continue with all original features.
This diagnostic may load more slowly. The normal Android game remains on the
confirmed shadow-free profile, and omitting `worldprobe=1` preserves the earlier
comparison. Force-stop Chrome first if a prior reset left graphics blocked.

## Current failure and targeted trial (build 43)

The physical build 42 Basic/local-startup trial **also failed**, at the first
local view (5, 0), before any batch's GPU completion fence signaled. The accepted
canvas had antialiasing enabled and the high-performance preference. Wide shadow
volumes had not run; avoiding them did not solve the reset.

The game first allocates/draws its shadow map while inside an HDR four-sample
buffer with a depth texture. The successful small check starts on the canvas.
Build 43 tests that initialization order and narrows the remaining differences:

<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-basic-shadows&preflight=1&trial=1&build=43>.

It uses the game's actual canvas request and actual sun/map. First drain prior
GPU work, draw two simple meshes to the canvas, then to the same 64×32 HDR/MSAA/
depth target used by startup. Wait for GPU completion after each draw and keep
that map for the full game. The scene, resolution, effects and antialiasing are
preserved. This is an unconfirmed workaround, not a claim of a fixed driver bug.

If it resets, use **Copy graphics report**. `preflight.probes` shows whether
simple canvas shadows and simple offscreen shadows completed before the full
world draw. The report's stage is the last submitted work, not an asserted GPU
instruction. Force-stop Chrome first if a prior reset left graphics blocked.

The earlier comparison omits `preflight=1`. Normal Android settings stay on the
confirmed shadow-free profile. All reports are manual; game saves are untouched.

## Current phone evidence and game trial (build 42)

The Pixel 10 Pro XL draws the small scene with Basic shadows at **both 512 and
1536**. The game-size **filtered PCF** comparison resets. Its report identifies
ANGLE / Imagination Technologies PowerVR D-Series DXT-48-1536, Chrome
157.0.8103.50, Android 17.0.0. The shadow draw was submitted but its completion
fence had not signaled when context loss occurred. A phone capability limit or
memory shortage has not been established.

The earlier Basic full game also reset, so avoiding PCF is not yet a complete
fix. Try the revised full-game startup:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-basic-shadows&trial=1&build=42>.

This keeps full detail, the original 1536×1536 mobile map and Basic sampling.
Startup rehearses shadows in local views and waits asynchronously for each
batch to finish on the GPU. The wide scenery/material rehearsals still run,
without stretching the shadow camera across the world. Normal game defaults
stay on the physically confirmed shadow-free Android profile.

Look for character and scenery shadows, walk around, and try the house. If it
resets, use **Copy graphics report** on the error screen. The reported stage is
the last submitted work, not proof of which GPU instruction failed. Force-stop
Chrome first if a previous reset left graphics blocked.

For the old Basic startup comparison, add `warmup=original`. Local-startup
results have a separate result field on the checks page. Reports are copied
manually, and no game saves or results are sent anywhere automatically.

## Current result and next check (build 41)

The physical Pixel 10 Pro XL reset with the full-detail BasicShadowMap game
trial too. Both shadow methods share a native depth-texture path. The screenshot
shows a context-loss notification, and its old memory suggestion was only our
app's guess; build 41 removes that suggestion. This does not prove a memory
problem or establish the exact driver operation that failed.

Open the small scene:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/shadow-check.html?build=41>.

Look for a rotating pink block and a dark floor shadow. Use **Copy report** and
paste it into the chat with whether the shadow was visible. The scene uses
Three.js r187, a 512×512 Basic shadow map and fixed 384×256 drawing buffer,
without game assets, PMREM, post-processing or whole-world rehearsal. Its
report includes GPU/browser details and a fence checking GPU completion of the
first shadow draw. Completion alone does not prove a visible shadow; desktop
pixel comparisons verify the expected output separately.

If it works, the page offers a 1536×1536 Basic comparison (only size changes),
then 1536×1536 PCF (only sampling changes). After a graphics reset, force-stop
Chrome before another check if it reports graphics are blocked.

The report stays on the page until you copy it. This diagnostic does not read
or write game progress. It is bundled offline and cached separately from the
game. Normal Android settings stay on the physically confirmed shadow-free
profile. A game fix still needs the phone's result; the minimal scene isolates
renderer/driver failures from the larger game's workload.

## Alternative shadow implementation (build 40)

Failure of the existing shadow path does not establish a hardware limit.
The full-detail alternative below also failed on the physical Pixel. The installed Three.js r187 implementation uses
hardware depth comparison (`sampler2DShadow`, comparison enabled and linear
filtering) for PCF shadows. BasicShadowMap instead uses a regular depth sampler,
nearest filtering and comparison in the fragment shader. This is a different
sampling path, not a reduction in shadow-map resolution.

Try full detail with the alternative method:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-basic-shadows&trial=1&build=40>.

For an isolated comparison with the previously failed shadow-only trial:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=safe&restore=shadows&shadow=basic&trial=1&build=40>.

Both keep the original 1536×1536 mobile shadow map and the original warmup logic.
The full-detail trial restores all other graphics categories. Basic shadows have
harder edges than the filtered PCF method. The normal Android link keeps the
physically confirmed shadow-free configuration until this alternative passes
on the phone. The exact original failure remains a hypothesis about this path,
not a confirmed hardware-comparison bug.

The desktop test checks real shadow-darkened pixels, actual allocated map size,
the depth texture's comparison/filter settings and compiled shadow sampler types.
Its result cannot substitute for a physical Pixel test.

## Confirmed result and normal Android default (build 39)

The physical Pixel 10 Pro confirms full detail without shadow maps opens and
plays. The isolated shadow trial fails. The normal Android URL now selects the
confirmed shadow-free profile: resolution, detailed scenery, fur, effects and
canvas antialiasing restored; shadow-map rendering and light shadow casting off
from startup. Normal canvas requests retain fallback if their preferred options
are unsupported. Explicit trials still fail visibly rather than hiding rejection.

Play using the normal URL:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/>.
`?graphics=safe` remains the lighter fallback. The iPhone/non-Android default keeps
the original full profile including shadows. This is an Android compatibility
workaround for the observed failure, not a hardware capability limit.

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

The now-confirmed combined profile restores all six other graphics categories and keeps
shadow maps disabled:
<https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full-no-shadows&trial=1&build=38>.

This explicit preset disables shadow-map rendering and shadow-casting lights
from startup; quality controls cannot re-enable them. It ignores a conflicting
`restore=shadows` parameter. Build 39 promotes the phone-verified combination to
the normal Android default.
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

Passing separately does not establish that every combination will work. The
shadow-free combination is now physically verified; future changes still need
combination testing before becoming defaults. All checks use normal gameplay,
speech and saves; they do not use automated test mode.

The service worker caches the checks page separately so visiting it cannot
replace the offline game. The checks page and graphics-profile module are also
available offline after the new service worker finishes installing.

## Open the test build

In the fork's **Settings → Pages**, select **Deploy from a branch**, then
`android-webgl-fallback` and `/ (root)`. Save and wait for deployment.

For the `zyzil/Dawson-s-Wonderverse` fork, open:

- Normal game (automatically uses full detail without shadow maps on Android):
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/>
- Force the lighter profile on any device:
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=safe>
- Explicitly opt into the original full rendering profile for debugging:
  <https://zyzil.github.io/Dawson-s-Wonderverse/discovery-world/3d/?graphics=full>

The explicit safe profile uses procedural scenery, no shell fur, no real-time
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
CHROMIUM_PATH=/usr/bin/chromium npm run test:shadow-pixels
CHROMIUM_PATH=/usr/bin/chromium npm run test:shadow-check
CHROMIUM_PATH=/usr/bin/chromium npm run test:gpu-work
CHROMIUM_PATH=/usr/bin/chromium npm run test:shadow-preflight
CHROMIUM_PATH=/usr/bin/chromium npm run test:shadow-world
CHROMIUM_PATH=/usr/bin/chromium npm run test:receiver-programs
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
