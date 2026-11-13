# Dawson's Discovery World 3D — development log

Completed changes and how each was tested, newest first. Each checkpoint says what was verified, how, and on what (desktop
browser vs. a real iPhone). The routine and rules are in `CLAUDE.md`; unfinished work is in `NEXT_TASKS.md`; measurements
are in `PERFORMANCE_LOG.md`.

## Checkpoint: build 44 automatic world shadow checks
- **New physical evidence:** build 43 passed both simple preflight probes on
  the Pixel, with zero GL errors, retained 1536×1536 Basic map, game AA=true
  canvas and exact 64×32 HalfFloat/four-sample/depth startup buffer. It then
  reset at the first real local view (5, 0), before a world batch completed.
  Initialization order is not a sufficient fix; the buffer alone is not enough
  to reproduce this Basic failure.
- Add explicit `worldprobe=1` to the Basic/preflight trial. At that same first
  local view, separate world shadow depth casting from world color rendering.
  r187 honors the existing sun.shadow.camera layer 1 independently of main
  camera layers, so an unused camera layer can gather the same lights and cast
  actual world geometry with zero world color draws. No library patch or
  replacement surface material is used.
- Test static, instanced and skinned casters, splitting cutout/displaced meshes
  where present; then test all casters. Freeze the complete depth map, draw the
  original surface shaders with receiving off, enable receiving per standard,
  physical, custom, instanced, skinned and fur group, then all surfaces. Finally
  submit the original combined cast/color draw. Fence every submitted batch.
- Reports record per-step completion, enabled counts, actual shadow/color draws
  and GL errors. Actual receiving draws are counted separately from all color
  draws; a group with zero draws does not establish support. Refresh
  snapshots before each step to include newly loaded meshes. Restore cast and
  receive flags, callbacks, light layer masks, render target, update flags and
  info settings in finally, including after loss. Keep light.castShadow and
  shader defines unchanged; receiveShadow is a runtime uniform.
- Trial startup errors now offer the same copyable report as context loss. The
  hub stores these results separately. Preserve pre-change HTML in
  `../backups/3D_build44_index.html`. Normal Android remains shadow-free; normal
  iPhone and all other explicit trial profiles retain their settings.
- **Validation:** small actual-renderer tests prove zero world color draws in
  depth steps, zero depth draws in frozen-map surface steps, identical final
  rendered pixels after restoration, and cleanup during loss. Full-game focused
  validation and measurements are recorded in PERFORMANCE_LOG.md. Physical
  world-check results and the full gameplay suite remain pending; keep draft.

## Checkpoint: build 43 canvas-first shadow initialization
- **New physical evidence:** build 42 resets at `Warming local view at 5, 0`.
  Report: Basic sampling, AA=true, high-performance preference, one local pass
  attempted and zero completed batches. No wide passes ran. GPU pacing and
  removing the wide shadow volumes are not a sufficient fix.
- The working small scene first allocates/draws its Basic map on the canvas;
  the game first enters a 64×32 HalfFloat, four-sample target with a depth
  texture. Canvas attributes and world materials/complexity also differ, so
  the exact failing condition is still unproved.
- Add explicit `preflight=1` to the Basic/local trial. Drain earlier queued
  startup work, move the actual sun into a temporary two-mesh scene, draw on
  the actual game canvas, then draw in the exact warmup target. Fence each
  draw and retain the same sun.shadow.map for the game. Compile/warm the full
  scene afterward. This tests initialization order and records which simple
  stages completed without changing quality or silently lowering canvas options.
- Share the unchanged target constructor between the checks and the existing
  three warmup call sites, preserving their original buffer options. Restore
  light parents/positions, render target and shadow update flags in finally;
  dispose the temporary meshes/material/target, retaining only the shadow map.
- The report contains per-probe framebuffer settings, completion flags, GL
  errors and map size/comparison. The hub records this trial separately. The
  previous no-preflight comparison remains available. Normal Android retains
  the confirmed shadow-free profile, and original iPhone defaults remain.
- Preserve pre-change HTML in `../backups/3D_build43_index.html`.
- **Validation:** actual map reuse, framebuffer draws, cleanup on context loss,
  full-game configuration and focused checks are recorded in PERFORMANCE_LOG.md.
  Physical canvas-first behavior and the full gameplay suite remain pending;
  keep the fork PR draft and do not claim a confirmed GPU driver root cause.

## Checkpoint: build 42 bounded Basic shadow startup
- **Physical evidence:** the Pixel 10 Pro XL draws the minimal scene with Basic
  at 512×512 and 1536×1536. PCF at 1536 resets before its first shadow draw's
  completion fence signals. Report: ANGLE / Imagination PowerVR D-Series
  DXT-48-1536, Chrome 157.0.8103.50, Android 17.0.0. This reproduces one failing
  filtered path without the game's assets/effects/warmup. It does not identify
  a specific ANGLE vs native-driver instruction or explain every full-game reset.
- The original Basic full-game trial also failed. Change its startup only:
  warm shadows in 11 local views (including spawn, park, creature area and the
  original indoor/underground/sky/castle views), then retain all five wide color
  rehearsals without widening or updating their shadow maps. Keep all graphics
  categories, live shadow casting and the 1536×1536 mobile Basic map.
- Each of the 16 submitted startup batches waits for a GPU fence asynchronously;
  no gl.finish or blocking wait. Defer newly loaded-object rehearsals and the
  15-second start fallback until these batches finish, preventing interleaving
  draws. Restore temporary visibility, detached agents, render targets and sun
  state in finally, including on loss. Stop rendering after context loss.
- Explicit Basic-shadow profiles use the new startup; `warmup=original` retains
  the failed comparison path. Regular Android keeps the confirmed shadow-free
  settings, and regular iPhone retains its original filtered shadow settings.
- Trial error screens offer Copy graphics report, including the last submitted
  stage (not an asserted GPU cause), accepted canvas request and GPU identity.
  Results remain manual and game progress is untouched. Preserve pre-change HTML
  in `../backups/3D_build42_index.html`.
- **Validation:** focused checks and desktop/software measurements are recorded
  in PERFORMANCE_LOG.md. Physical full-game validation and the full gameplay
  smoke suite are pending; keep the fork PR draft.

## Checkpoint: build 41 small physical-device shadow diagnostic
- **New physical evidence:** the full-detail BasicShadowMap trial also resets
  the Pixel 10 Pro XL. Its screenshot shows our context-loss handler, not a
  browser diagnosis of low memory. Basic sampling is not a verified fix.
- Both installed r187 Basic and PCF still allocate native unsigned-integer depth
  textures. The game also rehearses wide whole-world shadow views during
  startup. Neither the shared depth path nor startup workload has been isolated
  as the cause; don't attribute the reset to memory, hardware limits or PCF alone.
- Add a self-contained `shadow-check.html` using the same pinned Three.js,
  one cube, one floor, one shadow-casting light, a fixed 384×256 picture and no
  game assets, environment generation, effects or whole-world rehearsal.
  Comparisons change only map size (512 → 1536) then sampling (Basic → PCF).
- The report includes browser/GPU details, accepted canvas options, allocation
  size, last submission stage and a GPU fence confirming completion of the first
  shadow draw. Context loss preserves the report without guessing its cause.
  Copying is manual; no report is sent automatically and no game storage is used.
- Keep the physically verified shadow-free Android game unchanged. Correct its
  misleading memory wording. Preserve pre-change HTML in
  `../backups/3D_build41_index.html`; cache the new document separately.
- **Validation:** focused browser checks and measurements recorded in
  `PERFORMANCE_LOG.md`. Physical small-scene result and full gameplay smoke
  suite remain pending; keep the fork PR draft.

## Checkpoint: build 40 alternate shadow implementation
- **Requested:** make shadows work on the Pixel 10 Pro XL, rather than treating
  shadow rendering as a hardware limitation.
- **Implementation investigation:** installed Three.js r187 PCF uses a
  `sampler2DShadow` with hardware depth comparison and linear filtering.
  BasicShadowMap uses `sampler2D`, nearest depth sampling and shader comparison.
  Add `?graphics=full-basic-shadows` and the isolated
  `?graphics=safe&restore=shadows&shadow=basic` trial. Keep original map size,
  warmup, shadow casters and other rendering features intact. No library
  downgrade, scene simplification or reduction in shadow-map resolution.
- **Verified (desktop, software rendering):** a pixel comparison finds 85
  genuinely shadow-darkened pixels (maximum channel-average darkening 94),
  a 1536×1536 depth map and zero GL errors. The full game starts with all seven
  categories active. Its allocated shadow map is 1536×1536, comparison is null,
  filters are nearest, and all 60 active directional shadow sampler uniforms
  have type SAMPLER_2D. A screenshot shows real character/scenery shadows.
- The checks page records the new full-detail alternative separately. The normal
  Android profile remains the physically verified shadow-free one. Pre-change
  HTML is preserved in `../backups/3D_build40_index.html`.
- **Pending:** physical Pixel validation; the original driver/shader failure
  has not been conclusively isolated to hardware comparison.

## Checkpoint: build 39 confirmed Android default
- **Physical Pixel confirmation:** the user reports full detail without shadow
  maps opens and plays. The isolated shadow trial failed.
- Promote the exact verified profile to the normal Android URL. Keep all six
  restored categories and freeze the profile as in the successful trial; shadow
  maps and light shadow casting remain disabled from startup. Explicit safe
  mode and the original non-Android profile remain available.
- Regular game canvas requests retain compatible fallback; explicit diagnostic
  trials still fail visibly if their requested options are rejected. Game saves
  and bundled portraits are unchanged. Pre-change HTML is preserved in
  `../backups/3D_build39_index.html`.
- **Verified (desktop, software rendering):** the normal Android URL starts
  with all six restored categories active, no trial UI and zero shadow maps.
  Quality changes cannot turn shadows back on. Explicit safe mode, default
  canvas fallback, strict trial rejection, profile filtering, local results
  persistence/export and game-save isolation also pass.
- The precise shader/driver operation within the shadow path remains unknown;
  the verified workaround is shadow-map rendering off, not lower hardware capability.

## Checkpoint: build 38 shadow-free full-detail trial
- **Physical Pixel report:** the isolated shadow trial broke the game.
- **Next trial:** `?graphics=full-no-shadows` restores resolution, detailed
  scenery, fur, effects, canvas antialiasing and the high-performance request
  together, with shadow maps disabled. This named preset cannot be overridden
  by an extra `restore=shadows` argument. Shadow maps and light shadow casting
  are disabled from startup, before any rendering or shader warmup.
- The checks page records this combined trial separately and skips shadows in
  its next-check suggestion. The normal working Android default is unchanged.
  Pre-change HTML is saved in `../backups/3D_build38_index.html`.
- **Verified (desktop, software rendering):** the combined profile starts with
  all six requested categories active and shadow rendering off. Switching
  quality levels 5 → 0 leaves shadow-map rendering off, every light's shadow
  casting off, and zero allocated shadow maps. Profile filtering, conflict
  handling, result persistence/export and game-save isolation pass.
- The exact failing operation within the shadow path and the new combination's
  behavior on the physical Pixel are still pending.

## Checkpoint: build 37 individual graphics trials
- **Requested:** restore the graphics features individually after the physical
  Pixel successfully ran build 36's lighter rendering profile.
- **Implementation:** independent restoration flags for resolution, shadows,
  scenery, fur, post-processing, canvas antialiasing and graphics preference.
  Trial links explicitly use the safe baseline and retain normal gameplay and
  speech. Automatic quality cannot change the other features during a trial.
  Canvas-request trials fail visibly if rejected, with no silent fallback.
- **Test page:** `graphics-tests.html` offers each trial, records local
  Worked/Slow/Failed results, and prepares a report for manual copying. A return
  link appears only in explicit trial URLs, including on the error screen.
  Normal game defaults and the game-save key are unchanged. Pre-change HTML is
  preserved in `../backups/3D_build37_index.html`.
- **Offline helper:** cache game and diagnostic documents separately; the old
  navigate handler would have overwritten the offline game with the test page.
  Cache the test page/profile module and retain unrelated application caches.
- **Verified (desktop, software rendering):** the baseline and all seven real-game
  trials start with exactly the selected graphics category active, visible
  portraits and no uncaught JavaScript errors. The profile matrix, test-page
  navigation/results/export, save isolation and explicit rejection of canvas
  requests pass. The offline navigation test preserves the game, offline checks
  and unrelated application caches, including upgrade from the legacy helper
  when the checks page is the first page opened after deployment.
- Physical feature-by-feature results and combination testing are pending.

## Checkpoint: build 36 Android profile and bundled portraits
- **Physical Pixel report:** after a Chrome restart, the light
  `?test&graphics=compatible` build opens and gameplay works, but the character
  selection pictures are missing. The previous full-effects build reported
  `Web page caused context loss and was blocked`.
- **Rendering profile:** Android now selects the working lighter configuration
  independently of automated test mode: procedural scenery, no shell fur,
  no shadow map, no post-processing and lower resolution. Speech, learning
  activities, saves and all gameplay stay enabled. `?graphics=safe` forces this
  profile on any platform; `?graphics=full` restores the full rendering path.
- **Portrait fix:** bundle three PNGs rendered from the real character models,
  remove runtime canvas readback and ignore the old portrait cache. Pictures are
  present on the first visit even if the old cache contains blank PNGs. The
  original pre-change build is preserved in `../backups/3D_build36_index.html`.
- **Verified (desktop, software rendering):** `test:android` passes on an Android
  user agent with no test flag, explicit safe mode and full-profile opt-in.
  Checks cover nonblank image pixels, the old blank-cache case, saved creature,
  crown, wand, pets, discoveries and star bits, speech delivery to a mocked browser
  speech API, character selection, actual touch walking and portrait/landscape
  resizing. This does not establish audible speech or GPU behavior on the Pixel.
- **Pending:** physical verification of the new regular build, exact isolation
  of the original GPU reset, and the full gameplay smoke suite.

## Checkpoint: build 35 Android test branch
- **Reported:** Pixel 10 Pro / Chrome cannot create the game's WebGL context;
  the standalone WebGL 2 cube works on the same phone.
- **Proposed fix:** retry WebGL 2 startup without canvas antialiasing using the
  default and then low-power graphics preference. Capture browser creation errors.
  `?graphics=compatible` starts with the simpler request directly.
- **Test setup:** rebuilt the offline `index.html`, preserved the original as
  `../backups/3D_build35_index.html`, added `npm run test:renderer`, and documented
  test URLs and branch-based Pages publishing in `ANDROID_TESTING.md`.
- **Verified (desktop, software rendering):** seven renderer cases pass, including
  actual pixel rendering, unavailable antialiasing, a low-power-only context,
  diagnostic errors and listener cleanup. The original build, updated default
  build and explicit compatible build start and accept the Play button without
  uncaught JavaScript errors in light test mode.
- **Additional startup checks passed (desktop, software rendering):** the full
  game starts after simulated antialiasing rejection, and the explicit compatible
  build starts with the normal post-processing effects enabled. All seven
  renderer cases and five game-startup scenarios in `test:renderer` passed.
- **Pending:** physical Pixel verification and the full gameplay smoke suite.

## Checkpoint: build 34c (user request)
- **Removed the big pink wall** at x -1.5, by the train at the start of the playhouse (requested with a screenshot). It was the old left edge of the world. The world now continues left and the train runs through there, so it only blocked the view.
  - It was scenery only (no collision, nothing referenced it).
  - **Verified (desktop):** the view by the train is clear; walking left from x 1 reaches x -14 with no errors.

## Checkpoint: build 34b (urgent fix)
- **"Squished" picture on iPhone (reported with a screenshot):** when the phone turned, Safari could still report the upright size. The game then drew a tall picture and stretched it across the wide screen, so it looked blocky, zoomed in and too wide.
  - **Fix:** the picture is now sized from the canvas's real size on screen. It is rechecked every frame (a cheap comparison) and on orientation and visual-viewport changes.
  - **Reproduced and verified (desktop):** the browser was made to report the stale upright size after turning. Build 34 drew 292×633 onto an 844×390 screen; 34b draws 633×292.
- **Measuring scripts** are now kept in `tests/perf/` (`ba`, `walknew`, `train`, `soak`, `sweep`, `house2`, `movers`, `chunkchk`), so later sessions can reuse them. Run them from `discovery-world/3d` with the html file as the argument.

## Checkpoint: build 34
- **Express train:** picture trips longer than about 280 m speed up to 36 m/s (was always 20). The whole line takes about 42 s of game time, down from about 68 s. Short trips are unchanged.
- **Verified (desktop, `tests/perf/train.cjs`, before → after):**
  - trip home → 🌈: top speed 20 → 36 m/s, long tasks 1 (50 ms) → 0;
  - whole line 🌈 → ❄️: long tasks 0 → 0;
  - frames where you were within 25 m of an area that had not finished building: 0 → 0, on both trips.
  - On a phone each frame moves the train less and builds the same amount, so streaming has more margin there than on the test machine.

## Checkpoint: build 33
- **First real iPhone report (build 26):** no freezes, house about 134 ms, start-up 7 s. A flat 30 fps cap (most likely Low Power Mode), but the graphics were stuck at the lowest level.
  - **Fixed:** the stale level is forgotten (new key), and quality steps back up when capped with room to spare (frame work < 9 ms for 20 s).
- **Crown bug (introduced in build 25):** the crown, your shadow and the PAW hint were filed into scenery slices and hidden far from where they were made.
  - **Fixed:** they are marked dynamic.
  - **New test:** checks that no mover sits in a slice.
- **Luna gives a magic wand** (saved).
- **To verify next:** the iPhone report after this build. Expect a graphics level below 5 and frame work in ms. Ask for Low Power Mode off, to see the uncapped fps.

## Checkpoint: build 32
- **Added:**
  - Bolt the robot, Hoppy the frog and Kiwi the parrot (6 pals in all).
  - The secret tunnel Woods ↔ Toy Town.
- **Verified (desktop):** all three befriend and follow; 0 new shaders; the tunnel works both ways and builds the destination on arrival.
- **Tests:** map and station pictures are found by emoji; Biscuit is tapped from his left.
- **Full test:** the result is recorded in the commit after this entry.

## Checkpoint: build 31

**Added**
- **❄️ Frosty Peaks** (x -272 to -404) has 9 activities:
  - a sledding hill: climb the steps, tap the sled, slide down (it reuses the slide ride);
  - a snowman to build in 5 taps;
  - snowball toss at a target;
  - a slippery ice pond you glide across;
  - an igloo that glows warm;
  - northern lights;
  - waddling penguins;
  - Pebble the penguin pal;
  - falling snow.
- **Gems:** 2 more (14 total).
- **Train:** extended to x -402, with a ❄️ station.
- **🐾 My Pets panel:** shows each befriended friend. Tap to bring it along (💖) or send it home (🏠); friends not met yet show as ❓.
- **Followers:** they now walk in front of the path, each in its own spot, so they no longer overlap the workshop pets or each other.

**Verified (desktop)**
- **Bug sweep** over the whole world, both ways: never stuck, no console errors. The only detours were the intended slides, lift and ball pit.
- **Walk into Frosty Peaks:** 0 long tasks, 0 new shader programs.
- **Activities:** all 10 tappables run without errors.
- **Sled:** slides from y 4.5 at x -332 to the ground at x -345.
- **Ice:** you glide 2.1 m after letting go.
- **Pets panel:** toggles following.

## Checkpoint: build 30 (merged as #37)
- **Train:** runs the whole world with 17 stations, a picture strip and automatic trips; no teleport turn-arounds or pop-ins.
- **New regions:** 🏖️ Sunny Seaside and 🌲 Whispering Woods.
- **Pets:** Pinchy and Rusty.
- **Fixes:** left-side gems couldn't be collected; reloading lost progress in the new areas.
- **Full test:** 147/147.

## Checkpoint: build 29b (merged as #36)
- **Freezes fixed:** entering the house (2.9 s → 0), the Dino Kingdom and the castle (four 1–2.7 s stalls → 0). Causes: shader and driver rehearsal into the wrong kind of buffer, too few rehearsal spots, and late creatures.
- **New neighbourhoods:** four streamed neighbourhoods to the right with 23 activities, the 🗺️ map and 🏠 home.
