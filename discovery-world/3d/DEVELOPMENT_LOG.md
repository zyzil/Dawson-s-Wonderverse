# Dawson's Discovery World 3D — development log

Completed changes and how each was tested, newest first. Each checkpoint says what was verified, how, and on what (desktop
browser vs. a real iPhone). The routine and rules are in `CLAUDE.md`; unfinished work is in `NEXT_TASKS.md`; measurements
are in `PERFORMANCE_LOG.md`.

## Checkpoint: build 48 classic colour-packed Basic shadow candidate
- **New phone result:** build 47 completed all 13 probes at spawn, both
  underground views and the sky view (four complete views), with nine local
  warmup batches. At (406,0) castle, eight probes completed before instanced
  scenery receiving reset: one receiving/feature draw, zero shadow updates,
  one uniform-bone character draw, zero bone-texture draws. The castle's depth,
  nonreceiving, standard, physical and custom checks passed. Earlier groups
  with zero actual draws remain unproved; this is not a definitive driver cause.
- Add opt-in `shadowstorage=rgba` for the Basic receiver-shader mode, retaining
  `bones=uniform` in its phone link. The guarded r187 adapter allocates an RGBA8
  nearest-filter shadow target with a 24-bit depth renderbuffer and no depth
  texture. Built-in MeshDepthMaterial uses RGBADepthPacking, including its
  cutout/displacement variants. Receiving shaders decode r187's packed component
  order before the original Basic depth comparison. WebGLLights already binds
  the colour texture when no depth texture exists. Keep original geometry,
  GPU instancing, bone uniforms, materials, casts/receives and 1536 map size.
- Packed/native mode changes reallocate maps, invalidate/reselect cached shader
  variants and select separate depth materials. Rig caches still work. Native
  modes keep their original depth texture and shader branch. Unsupported point
  shadow lights, non-Basic maps or custom depth materials stop explicitly in
  this opt-in mode; the game uses the supported directional built-in path.
  No dependency files are edited. Preserve previous HTML in
  `../backups/3D_build48_index.html`.
- Preflight reports identify actual shadow storage; world probes count packed
  feature draws and include up to three instanced receiver descriptors, using
  CPU metadata only. Existing report/history, save and offline keys survive.
  Keep Android's verified shadow-free and iPhone's original defaults.
- Focused shader/pixel proof: 121 draws across physical/shared materials,
  coloured instancing, animated 1/3-bone skins, actual fur and cutout casters,
  including fresh packed initialization and native/packed rollback. Maximum
  channel difference 0; animation changes 371 channels. Actual sampler binding
  points to the colour map in packed mode; the framebuffer has a depth
  renderbuffer, no depth texture and nonuniform encoded colour depth. GL error 0.
- Full-game, cleanup and timing results are in PERFORMANCE_LOG.md. Physical
  compatibility and the full gameplay suite remain pending; keep the fork PR draft.

## Checkpoint: build 47 uniform bone palette shadow candidate
- **Physical evidence:** build 46 completed all casting, the nonreceiver surface
  check, physical receivers (19 draws) and instanced receivers (1 draw), then
  lost the context on skinned-body receiving (1 actual receiving/feature draw,
  frozen depth map). Standard/custom groups with zero draws remain unproved;
  fur was not reached. This narrows this run, not a confirmed driver diagnosis.
- Add explicit `bones=uniform` only for the Basic receiver-shader trial. The
  pinned ESM adapter replaces bone texelFetch with an array of mat4 uniforms.
  Keep the normal skinning weights, bind transforms, normals, animation, fur
  materials and all shadow behavior. Both depth and color passes use palettes.
  Cache rig size and refresh shared-material variants on mode/rig changes.
- Reserve 128 vertex uniform vectors for other shader data, cap at 64 bones,
  and stop with an explicit rig/limit error if a rig cannot fit; do not silently
  drop animation or switch a receiver back to the failing texture combination.
  Cache correctly sized Float32Array views per skeleton with a WeakMap, updating
  if the normal texture path replaces the backing array. No per-frame CPU
  skinning, new geometry or per-draw GPU queries are introduced.
- Probe reports add uniform/texture bone draw counts and largest submitted rig
  for this mode. The hub retains all previous comparisons and save keys. Normal
  Android stays full-detail/shadow-free; iPhone retains its original settings.
  Preserve the previous HTML in `../backups/3D_build47_index.html`.
- Animated pixel/shader test: 99 draw observations including shared materials
  with 1/3-bone rigs, nonidentity bone transforms, real fur shells and mode
  rollback, including a fresh uniform-only draw before texture allocation.
  Maximum channel difference 0 against bone textures; poses change
  371 channels. Uniform programs expose boneMatrices and no boneTexture;
  real receivers keep directional shadow samplers. GL error is zero.
- Full-game, cleanup, default and performance results are in PERFORMANCE_LOG.md.
  Physical confirmation and the full gameplay suite remain pending; keep draft.

## Checkpoint: build 46 receiver-specific shadow shader variants
- **New physical result:** build 45 reset at the starting view (5,0), aspect
  0.5428921569, after all depth casting checks passed. The failed color batch
  had 42 color draws and zero receiving draws (`surfaces: shadow receiving off`).
  The earlier build 44 run completed that step, so do not treat underground as
  a reliable or unique trigger. Mesh arrival timing/aspect also differ.
- Installed r187 WebGLPrograms enables shadow shader chunks whenever renderer
  shadows and a casting light exist, independently of object.receiveShadow.
  WebGLRenderer still has active shadow samplers to bind when that uniform is
  false. Thus the prior runtime-off probe did not eliminate compiled shadow
  code or bindings; native sampling/driver specialization remains unisolated.
- Add opt-in `shadowcode=receivers` for Basic shadows. A guarded esbuild adapter
  modifies the pinned npm ESM renderer: include the shadow feature only for
  actual receivers, retain the effective flag/mode in material program metadata,
  and select the correct cached variant when receiving or mode changes. Shared
  materials remain shared; shader variants use the existing shadow-feature cache
  bit. Actual receivers and depth casting retain their original functionality.
- The adapter requires exactly Three.js 0.187.0 and one exact match at each of
  three sites, and fails a build if it is not applied exactly once. It never
  edits node_modules. The standalone original tiny check remains unadapted.
- Existing world probes with the new mode count draws whose selected program
  includes the shadow feature, without extra per-draw GPU queries. Runtime-off
  surface probes now require zero such draws. Preserve onAfterRender callbacks
  as well as the earlier state snapshots. Old modes and normal Android/iPhone
  graphics are unchanged; full detail, AA and 1536 shadow size stay enabled in
  this explicit trial. Preserve HTML in `../backups/3D_build46_index.html`.
- **Focused proof:** actual compiled uniforms disappear for nonreceivers and
  remain for receivers; shared/custom/skinned materials, receiving toggles and
  mode rollback produce identical pixels across 54 draw observations. The full
  game uses the reported aspect in its new browser case; detailed validation
  and timing are recorded in PERFORMANCE_LOG.md. The physical fix, exact driver
  cause and full gameplay suite remain pending; keep draft and normal Android
  on its verified shadow-free configuration.

## Checkpoint: build 45 underground and remaining local-view diagnostics
- **Physical build 44 result:** all 13 starting-view probes passed. Actual depth
  draws: static 100, instanced 2, skinned 1, all casters 103. Receiving draws:
  physical 19, instanced 1, skinned 1; standard, custom and fur had zero receiving
  draws and remain unproved. The original combined draw passed. Six subsequent
  local batches completed, then (20, -6), the first underground view, reset.
- Add explicit `worldprobe=areas`: retain the starting-view checks, preserving
  the successful setup sequence, and check (20, -6), (45, -6), (54, 9.5),
  (406, 0), (2010, 0) before their normal local draw. Avoid repeating checks in
  the three house views already passed on the phone. No rendering/shader path
  or quality settings are replaced by this diagnostic extension.
- Include view coordinates and camera aspect in each full check report and
  phase label. Keep full details for the latest view, plus compact per-view
  completion/count/restoration history, so a later failure preserves the earlier
  successes without duplicating every probe. The old `worldprobe=1` still checks
  only the starting view; normal profiles never run these checks.
- Verify in a portrait browser: earlier desktop landscape results did not match
  the phone's narrow visible area. Actual per-probe draw counts remain necessary;
  a globally enabled group outside the view is not a verified group.
- Preserve pre-change HTML in `../backups/3D_build45_index.html`. The hub records
  this run separately; saves are untouched. A small renderer test now completes
  one view then loses context in another, verifying that first-view history and
  state restoration survive. Successful two-view checks retain identical output.
- Focused validation and timings are in PERFORMANCE_LOG.md. Physical area-check
  results and the full gameplay suite remain pending; keep the fork PR draft and
  normal Android on its confirmed shadow-free settings.

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
