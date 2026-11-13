# Dawson's Discovery World 3D — performance log

Rule: the game must never get slower. Measure before and after every change on identical scenarios and add a row here.
**Desktop numbers come from a software-rendered browser and are NOT iPhone numbers.** Only the in-game report from the
real iPhone (⚙️ → Performance Test → Copy Test Results) counts as an iPhone measurement.

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
