# Dawson's Discovery World 3D — performance log

Rule: the game must never get slower. Measure before and after every change on identical scenarios and add a row here.
**Desktop numbers come from a software-rendered browser and are NOT iPhone numbers.** Only the in-game report from the
real iPhone (⚙️ → Performance Test → Copy Test Results) counts as an iPhone measurement.

## Build 45 underground and later local-view diagnostics

- Physical build 44 result: all starting-view probes completed with zero GL
  errors, followed by six completed local batches. The first underground view
  (20, -6) reset. Standard/custom/fur had zero starting-view receiving draws,
  so those groups were not proved. This is not a confirmed completed shadow fix.
- Explicit `worldprobe=areas` preserves the initial check sequence, then checks
  both underground views and the remaining sky/castle views. It adds loading
  work only to this diagnostic. Normal profiles and the starting-only comparison
  keep their rendering behavior. No extra per-frame work is introduced.
- Desktop/software rendering, portrait 390×844 at scale factor 2: all **78**
  probes complete with zero GL errors across six views, each aspect 0.4621:
  (5,0), (20,-6), (45,-6), (54,9.5), (406,0), (2010,0). Each view restores state,
  completes its normal local draw, and subsequent wide color warmup completes.
  All original graphics categories, map resolution and sampler types remain.
- Total receiving draw submissions in those views: 21, 19, 20, 37, 50, 6.
  Standard/custom/fur have zero submissions in several narrow views, explicitly
  visible in the reports. Positive submissions are not a rendered-pixel test of
  each material; these checks establish submitted work and GPU completion.
- Portrait startup, rotating through the app's real landscape prompt, and
  tapping Play takes 69.8 s in the focused run. Build 44's earlier landscape
  starting-only run was 59.2 s; these different scenarios are not a throughput
  comparison or physical phone speed claim. The first portrait test completed
  loading but correctly encountered the rotate overlay; verification now follows
  the real rotation flow rather than bypassing it.
- A small actual-renderer test completes one view then loses context in a
  second view. Earlier completion history survives, the later probe remains
  incomplete, and flags/callbacks/light masks/targets restore. Two successful
  views retain identical rendered pixels. Full-game reports preserve the latest
  detailed view and compact completed-view history after a simulated reset.
- Profile/control/save-isolation, strict canvas rejection, portrait startup,
  rotation, actual depth/receiving draw counts, map/sampler state, copied error
  reports and offline cache migration pass focused checks. The full gameplay
  suite, longer performance measurement and physical area-check results remain
  pending. Keep the fork PR draft and the confirmed shadow-free Android default.

## Build 44 automatic world shadow checks

- **Physical result:** both build 43 simple probes passed on the Pixel with
  zero GL errors, the original 1536 Basic map and the exact HDR/MSAA/depth
  startup target. The first actual world draw still reset. Initialization order
  did not fix the failure; this evidence shifts diagnosis to the real world
  casting/material paths without asserting a specific GPU instruction.
- The opt-in `worldprobe=1` diagnostic adds startup work deliberately; it is
  never enabled by normal profiles. In desktop/software rendering (844×390,
  scale factor 2), the final run reaches Play in 59.2 s including all checks
  (ordinary build 43 Basic/preflight trial: 44.2 s). Normal Android without the
  diagnostic reaches Play in 43.0 s in its focused run (previous run 38.9 s).
  These single runs are not physical phone timing or a throughput comparison.
- Actual full-world instrumentation verifies 13 completed checks with zero GL
  errors. Depth-only checks submit **zero world color draws**: static opaque
  casters 100 shadow draws, instanced opaque 2, skinned opaque 8, all casters
  110. No cutout/displaced caster group was present in this scene snapshot.
- Frozen-map checks submit **zero shadow depth draws**, with 299 total color
  draws each. Actual receiving draws: off 0, standard surfaces 0, physical
  surfaces 31, custom surfaces 1, instanced scenery 2, skinned bodies 7, fur 35,
  all receiving 76. The zero standard-surface count is explicitly not evidence
  of support for that group. Original combined draw: 110 depth and 299 color
  draws. Both enabled-object counts and actual draw counts are reported.
- Temporary callbacks, flags and light layers restore after each diagnostic
  run. A small real-renderer fixture produces **identical rendered pixels**
  before/after successful checks, exercises static/cutout/instanced/skinned and
  fur-like groups, and verifies cleanup/report incompletion when losing the
  context during a receiving step. The full game retains all original graphics
  features and visible shadows after the checks; its normal 16 startup batches
  complete. Framebuffers, map size and sampler types remain unchanged.
- Focused profile/default, strict canvas request, portraits, quality guard,
  hub persistence/export, copied failure report and offline migration checks
  pass. No diagnostic draws, snapshots or per-draw callbacks run in normal
  profiles. The full gameplay suite, longer performance tests and physical
  world-check results remain pending. Keep draft and the verified shadow-free
  normal Android game; this diagnostic is not a claimed completed shadow fix.

## Build 43 canvas-first shadow initialization

- Physical build 42 report: context loss on the first local view (5, 0), one
  attempted pass, zero completed batches, AA=true and high-performance canvas
  preference. Pacing/bounding the startup work was not a sufficient fix.
- Add two simple fenced draws only to the explicit `preflight=1` Basic trial:
  initialize the actual sun's map on the game canvas, then exercise the same
  two meshes in the exact HDR/four-sample/depth-texture warmup target. Keep the
  map for gameplay, without changing quality, effects or antialiasing.
- Focused desktop/software-rendered full-game run: 44.2 s through Play at
  844×390, device scale 2; build 42's comparable focused run was 43.9 s (its
  other recorded run was 46.6 s). These single-run timings do not establish a
  phone speed change. The normal Android game reaches Play in 38.9 s (previous
  focused run 39.1 s). No new per-frame work is introduced by the trial.
- Actual draw instrumentation verifies the first map is allocated on the
  canvas, then reused in a 64×32 HalfFloat target with samples=4 and a depth
  texture. Both GPU fences signal, both GL error checks return zero, map size
  stays 1536×1536 and its compare function is null. All 16 subsequent local
  startup batches also complete; no wide shadow pass runs. All seven graphics
  features, nearest depth sampling and plain SAMPLER_2D shadow uniforms remain
  active. The screenshot shows real creature/scenery shadows.
- Small actual-renderer checks exercise both full and light warmup targets and
  simulated loss during the second draw. Light parents/positions, render target
  and shadow update flags are restored, temporary resources are disposed and
  the same shadow map is retained. The failed probe remains incomplete in the
  report. Full-game copied reports, graphics controls, saves/portraits/quality
  guards and offline migration pass their focused checks.
- Normal profiles do not execute the extra draws. Their shared target factory
  preserves the exact options formerly repeated at all three warmup call sites.
  Scene warmup coverage is retained; build 42's five-view shader coverage check
  found zero new programs on first entry. Physical canvas-first validation,
  longer performance checks and the full gameplay suite remain pending. Keep
  the fork PR draft and the normal Android shadow-free configuration.

## Build 42 bounded Basic shadow startup

- **Physical evidence:** Basic shadows at 512 and 1536 work in the small scene
  on the Pixel 10 Pro XL. Filtered PCF at 1536 resets before its GPU fence
  signals. Reported stack: ANGLE / PowerVR D-Series DXT-48-1536, Chrome
  157.0.8103.50, Android 17.0.0. The full Basic game with original warmup also
  failed. No physical full-game timing or bounded-startup result is available.
- **Focused desktop/software checks:** the new full-detail Basic game reaches
  Play in 43.9 s; the previous Basic HTML in the same focused runner takes
  62.6 s. A separate five-view before/after run takes 40.0 / 46.6 s to Play.
  This spread does not establish a startup improvement or regression. The
  normal shadow-free Android game reaches Play in 39.1 s in the focused run.
- Actual depth-camera instrumentation sees 11 local startup passes, each with
  width 26 world units, and no wide shadow pass. All 16 GPU completion fences
  signal before play. Color/material rehearsal remains enabled. The full game
  retains all seven graphics categories, a 1536×1536 nearest-sampled Basic map,
  plain SAMPLER_2D shadow uniforms and visible creature/scenery shadows.
- Before/after shader coverage (`tests/perf/shadow-startup.cjs`, both HTML files,
  Android identity, 844×390 viewport at scale factor 2): **zero new programs in
  all five views on both builds**: park, creatures, castle, house, castle rooms.
  Thus this check finds no deferred shader compilation caused by the local
  shadow rehearsal. Three-frame wall times (old/new ms): park 4349/3482,
  creatures 7395/6694, castle 7894/7146, house 5488/5660, castle rooms 2793/2730.
  These short software-rendered samples have differing draw counts from moving
  creatures and alternate-frame shadow cadence; they are not stable throughput
  measurements or evidence of physical phone speed. Longer frame-rate/freeze
  measurement remains pending before promoting the experimental preset.
- Real GPU-fence completion and context-loss cancellation pass in a small
  renderer test. The game preserves a readable last-submission report after
  simulated context loss. Default profiles, strict canvas trials, quality guards,
  portraits and hub controls pass. Offline migration also keeps diagnostics and
  the game separate. The full gameplay smoke suite remains pending; keep draft.
- Regular Android shadow-free graphics and iPhone filtered-shadow settings are
  not promoted or changed by this experimental Basic preset.

## Build 41 small shadow diagnostic

- Physical Pixel 10 Pro XL: the user reports the full-detail BasicShadowMap
  trial also resets. The screenshot contains our generic context-loss message;
  it does not establish a memory shortage. No physical timing was supplied.
- The new standalone diagnostic fixes its drawing buffer at 384×256 regardless
  of device pixel density. It has one cube, one floor and one shadow-casting
  light, without game assets, environment generation, effects or all-world
  rehearsal. It is approximately 531 KB including the pinned renderer.
- Desktop Chromium/software rendering verifies actual darker shadow pixels in
  all three configurations: Basic 512×512, Basic 1536×1536 and PCF 1536×1536.
  Each comparison finds 141 pixels darkened by more than 20 average RGB levels
  in a 192×128 readback. The GPU completion fence signals and GL error is zero.
  This confirms the intended test output, not behavior on the physical Pixel.
- The normal Android game starts through Play in 46.8 s in one focused desktop
  run (previous recorded build 39 run: 45.4 s). This variation is not evidence
  of a phone regression. Comparing the entire generated HTML to the build 40
  backup proves it differs **only** by the context-loss message: all game
  rendering, startup work, assets and normal graphics profiles are identical.
- Focused checks pass for actual shadow pixels, simulated context loss and
  readable reports, save isolation, the default Android game and quality
  guards, graphics hub controls, and legacy-to-current offline cache migration
  including the new diagnostic. The full gameplay smoke suite is still pending;
  this milestone remains a draft diagnostic in the fork.

## Build 40 alternate shadow sampling

- Desktop Chromium / software rendering, Android user agent, 844×390 touch
  viewport at scale factor 2: full detail with BasicShadowMap starts through
  Play in 59.9 s, with all seven categories active and the original 1536×1536
  mobile shadow map. This single run is not a physical Pixel measurement.
- The isolated rendered-pixel test confirms visible shadow darkening and no
  GL errors. Compiled game shaders use plain SAMPLER_2D shadow uniforms and
  nearest depth sampling instead of hardware-comparison shadow samplers.
- Normal defaults and workload remain unchanged. The explicit trial changes
  the shadow-sampling method without reducing map size or disabling existing
  casters/warmup. Physical behavior and long-run speed remain to be verified.

## Build 39 confirmed Android default

- Physical Pixel 10 Pro: the user confirms the combined full-detail profile
  without shadow maps works. No physical frame-rate measurement was supplied.
- Desktop Chromium/software rendering, 844×390 touch viewport, scale factor 2:
  the normal Android URL starts through Play in 45.4 s with all six restored
  categories active; the explicit lighter baseline starts in 22.1 s. These
  single-run startup timings do not establish phone speed or a regression.
- Normal Android uses the same fixed rendering profile the Pixel verified.
  Shadow maps remain disabled and unallocated through quality changes. Canvas
  fallback is retained for unsupported preferred options, while diagnostic
  trials remain strict. Longer physical sessions remain to be measured.

## Build 38 full detail without shadow maps

- Physical Pixel report: the isolated shadow-only trial failed. This identifies
  one failing rendering path; no physical frame-rate or loading time was supplied.
- Desktop Chromium / software rendering, Android user agent, 844×390 touch
  viewport at device scale factor 2: the combined shadow-free preset starts
  through Play in 52.7 s, with resolution, detailed scenery, fur, post-processing,
  canvas antialiasing and the high-performance request active. There are no
  uncaught JavaScript errors; portraits are present.
- Shadow-map rendering and light shadow casting remain off through quality
  changes, with zero allocated shadow maps. This is a requested experimental
  profile; normal Android defaults are unchanged. Physical combination testing
  remains pending.

## Build 37 independent graphics checks

Desktop Chromium / software rendering, Android user agent, 844×390 touch
viewport at device scale factor 2. Startup through tapping Play, single runs:

| Trial | Time | Restored category |
|---|---:|---|
| Working baseline | 25.4 s | None |
| Resolution | 26.2 s | Pixel ratio 1.5 instead of 0.8 |
| Shadows | 26.5 s | Shadow-map drawing |
| Scenery | 28.4 s | Detailed models/textures |
| Fur | 38.3 s | Shell-fur layers |
| Effects | 42.9 s | HDR post-processing / offscreen antialiasing |
| Canvas antialiasing | 26.6 s | Canvas antialiasing |
| Graphics preference | 28.2 s | High-performance request |

These are software-rendered startup timings with shader-cache variability, not
physical Pixel performance measurements. Heavier trial workloads are explicitly
requested experiments; normal defaults are unchanged. The tests verify that
every other category stays off during each isolated trial. Physical results and
tested combinations are needed before restoring default Android features.

## Build 36 Android rendering profile

- Physical Pixel 10 Pro: the previous `?test&graphics=compatible` build opens
  after restarting Chrome and gameplay works; the portrait boxes are blank.
  The full-effects build reset graphics and was blocked by Chrome. No physical
  frame-rate or loading measurement was supplied.
- Desktop Chromium, software rendering, 844×390 touch viewport: `test:android`
  completed startup plus portrait/save/speech/selection/walking/rotation checks
  in 35.2 s for automatic Android mode, 31.7 s for explicit safe mode, and 55.3 s
  for the full-profile opt-in. These are end-to-end test durations, not frame-rate
  benchmarks or comparable physical-device performance results.
- Safe mode has no shell-fur layers, shadow-map drawing, or post-processing
  buffers. It does not adapt back into heavier graphics during play. Bundled
  character PNGs add about 93 KB before data-URL encoding and remove the three
  runtime portrait renders, canvas readbacks and localStorage writes.

## Build 35 test branch: focused startup measurements

Desktop Chromium with software rendering, 844×390 touch viewport. Single runs
of the light `?test` build, timed through startup and tapping Play:

| Build | Startup through Play |
|---|---:|
| Saved original build 34c | 47.3 s |
| Updated build, original graphics request | 34.0 s |
| Updated build, `?graphics=compatible` | 31.8 s |
| Updated build, simulated antialiasing rejection | 29.5 s |

An additional compatible-mode startup with normal post-processing effects enabled
(without `?test`) passed in 45.6 s. All five startup scenarios and seven renderer
cases passed.

These measurements show successful startup, not a reliable speed comparison:
shader-cache and software-rendering variability affect the timings. No claim of
improved phone performance is made. The default path keeps the original context
attributes when they work; the new work runs once during startup. Full gameplay
performance measurements and physical Pixel/iPhone measurements remain pending.

## How to measure (from `discovery-world/3d`)
Prefix every command with `NODE_PATH=$(npm root -g)`, e.g. `NODE_PATH=$(npm root -g) node tests/perf/ba.cjs index.html`.

| Script | What it measures |
|---|---|
| `node tests/perf/ba.cjs OLD.html NEW.html` | Loading, script ms per frame, triangles, draw calls and long tasks (park, creatures, castle); house in and out; walk into new areas; map jump; per-district cost; memory |
| `node tests/perf/train.cjs FILE.html` | Train trips (top speed, seat jumps, long tasks, unbuilt-district frames) |
| `node tests/perf/walknew.cjs FILE.html` | Long tasks on a walk through the Dino Kingdom |
| `node tests/perf/soak.cjs FILE.html` | 60 map trips; geometry, program, texture, tap and heap counts must stay flat |
| `node tests/perf/sweep.cjs FILE.html` | Walks the whole world both ways (stuck spots, console errors) |
| `node tests/perf/house2.cjs FILE.html` | Entering and leaving the house |
| `node tests/perf/chunkchk.cjs FILE.html` | Nothing that moves sits inside a scenery chunk |

Keep the previous build's file (`../backups/3D_buildNN_index.html`) to compare against.

## Baseline: build 34 (desktop, software rendering, iPhone-sized screen, `tests/perf/ba.cjs`)
| View | Script ms/frame | Triangles | Draw calls | Long tasks |
|---|---|---|---|---|
| Park | 13.8 | 735k | 244 | 0 |
| Creature area | 11.3 | 713k | 165 | 0 |
| Castle | 15.3 | 289k | 351 | 0 |
| Trail district | – | 295k | 73 | – |
| Toy Town | – | 127k | 97 | – |
| Lab Garden | – | 290k | 94 | – |
| Art Plaza | – | 106k | 76 | – |

- **Other measurements:**
  - house in and out: 0 long tasks;
  - walking into new areas: 0;
  - map jump: 0.
- **Loading:** 27.0 s on this machine.
- **Memory:** heap 121 MB, 1518 geometries, 169 textures, 101 shader programs.
- **Train (build 34):** 0 long tasks on both full trips; 0 frames near an unbuilt district.

## Real iPhone reports
- **Build 26:**
  - no freezes over 250 ms; worst frame 128 ms;
  - house transitions about 134 ms; start-up 7 s;
  - a flat 30 fps (likely Low Power Mode), with graphics stuck at the lowest level (fixed in build 33);
  - voice: 0 sentences started (sound status unknown; now reported).
- **Build 33/34:** not yet received.

## Known performance problems
- Loading is long because of the whole-world rehearsal (see NEXT_TASKS).
- The park and creature area are the heaviest views; the castle has the most draw calls.
