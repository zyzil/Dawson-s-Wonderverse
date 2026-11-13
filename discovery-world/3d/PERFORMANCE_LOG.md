# Dawson's Discovery World 3D — performance log

Rule: the game must never get slower. Measure before and after every change on identical scenarios and add a row here.
**Desktop numbers come from a software-rendered browser and are NOT iPhone numbers.** Only the in-game report from the
real iPhone (⚙️ → Performance Test → Copy Test Results) counts as an iPhone measurement.

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
