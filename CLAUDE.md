# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Knock Daniel Down" — a small arcade game. Faces slide across the screen; tap them before they exit the right edge. Originally a 2017 single-module Android app in Java; rewritten in 2026 as a React Native / Expo app targeting iOS, Android and web from one codebase. The Java version has been removed from the repository.

Expo SDK 57, React Native 0.86, React 19, TypeScript in strict mode.

## Commands

```bash
npm install          # once
npm start            # Expo dev server; then press w / i / a
npm run web          # browser only — no native tooling needed
npm run ios          # iOS simulator (needs macOS + Xcode)
npm run android      # Android emulator or attached device
npm run typecheck    # tsc --noEmit; must stay clean
```

There is no test suite and no lint config. `npm run typecheck` is the only automated check.

The web target is the fastest way to verify a change, and the only one that works without native tooling installed. It shares all game logic with native, but not all event handling — see the gotchas below.

## Architecture

Five screens, switched by a `useState` in `App.tsx`. No navigation library, no deep linking, no routing config. `App.tsx` also constrains the app to a 480px-wide centred column on web, so the game is phone-shaped in a desktop browser.

- `LoadingScreen` (splash, skippable by tapping) → `MenuScreen` → `GameScreen` / `StoreScreen` / `SettingsScreen`
- `StoreScreen` is where diamonds are spent; `SettingsScreen` holds the audio toggles, saved progress and the credits. There is no separate credits screen.
- Both sub-screens are built from `ScreenHeader` and `Panel` on a `#12100e` ground. Keep new rows inside a `Panel` rather than styling a one-off card.
- `MenuScreen` animates itself in — the logo on a back-out curve, then the buttons on staggered springs. The idle breathe on PLAY is deliberately delayed until that has finished so the two do not fight.

All tuning lives in `src/game/constants.ts`. Changing how the game feels should not require touching anything else.

### GameScreen

The largest file and where all the game logic lives.

**Movement is analytic.** Faces cross linearly, so position derives from `startedAt` and `travelMs`. Nothing reads a position back out of `Animated`. This is what lets the visual slide use the native driver while the rules run in JS on a 50 ms tick (`TICK_MS`). Do not replace this with animation-value listeners.

**The run lives in refs, not state.** The spawn timer and the rules tick read and write the run many times a second; going through `useState` would act on stale values. `run` (a `RunState` ref) and `spawns` (a `Spawn[]` ref) are the source of truth, and `repaint()` — a `useReducer` counter — forces a render when something user-visible changes. New game state that timers touch belongs in a ref, not `useState`.

**Difficulty is crossing speed.** `knockDown` drops `faceTravelMs` by `FACE_TRAVEL_STEP_MS` and `spawnIntervalMs` by `SPAWN_INTERVAL_STEP_MS`, floored at `MIN_FACE_TRAVEL_MS` / `MIN_SPAWN_INTERVAL_MS`. The two steps are deliberately different: a single shared step made the run get *denser* without getting *quicker*, because the spawn interval has a fraction of the range and bottomed out first. If a run ever feels too easy, the crossing time is the lever — the spawn gap only controls how many are on screen at once. Spawning also widens: lane 1 joins at `LANE_2_UNLOCK_SCORE` and lane 2 at `LANE_3_UNLOCK_SCORE`, always on (this used to be behind an Extra Hard toggle).

**The hit is layered on top of the slide, never in place of it.** `Face` keeps the horizontal slide untouched when a face is knocked down and runs the hit alongside it: a punch (`scale`), a kick up and a fall (`translateY`), a shove (`knockbackX`, summed with the slide via `Animated.add`), and a tumble (`rotate`). All four are transforms, so the whole hit stays on the native driver and the rules engine can still derive positions from arithmetic. `GameScreen` draws the impact ring itself, at the contact point computed from the same formula the tick uses — parenting it to the face would drag it along as the face is knocked away. Every value is in `constants.ts` under "The knock-down"; `HIT_POP_MS + HIT_FALL_MAX_MS` must stay under `MIN_FACE_TRAVEL_MS`, which is how long a dead spawn is kept around.

**The power-up HUD counts down on the native driver.** Each button owns an `Animated.Value` that runs 1 → 0 over `POWER_UP_DURATION_MS` when the power-up is used. The rules tick does not drive it — it only repaints when a power-up flips on or off, so the button can swap between its price badge and its countdown. Do not recompute the remaining time on the tick.

**Lanes are inset from the HUD.** `laneTop` keeps `HUD_TOP_RESERVED` clear at the top for the score and `HUD_BOTTOM_RESERVED` at the bottom for the power-up buttons. Without that, faces in lanes 1 and 2 slide under the HUD, and the buttons eat the taps meant for them.

**Diamonds are earned, never bought.** Diamond faces are the only source: they are the rarest spawn (`DIAMOND_FACE_ODDS`) and pay 1, 2 or 3 (`DIAMOND_FACE_REWARDS`, equally likely). Golden faces are worth points alone. Diamonds pay for store purchases and for `Continue`, whose price rises by one per use and resets on restart.

**Reward effects are sized to how rare the head is.** A golden hit (1 in 10) throws `GoldenRings` at the point of contact; a Mexican hit throws a handful of cacti; a diamond hit (1 in 60, and the only currency in the game) has earned the whole screen, so it also washes it blue and shoves the camera in via `cameraZoom`. That scale is on `AnimatedBackground`, built at **module scope** — building it inside the component would hand React a new component type every repaint and remount the entire play area, faces and animations included, many times a second.

A golden hit used to take the whole screen too. At one in ten that blanked the screen constantly and read as a glitch rather than a reward — and dimming it enough to stop that left nothing to see. The full-screen `flashGold` survives only for a revive, which genuinely is a whole-screen event. Every burst is keyed by the spawn id so remounting replays it. `ParticleBurst` is the shared thrower — diamonds and cacti are the same component with different images, counts and gravity — and it drives every particle from one animated value, so a big shower costs no more than a small one. Radial layout inside it is `rotate` **then** `translate`; the other way round spins each element where it stands and fans the lot to one side.

**The diamond face is the one thing built to be noticed.** `LightRays` turns behind it while it lives; `DiamondBurst` throws a shower at the point of contact when it is hit, scaled by the payout. Both run off a single animated value interpolated per element, so the whole effect stays on the native driver and a three-diamond hit costs no more than a one-diamond hit. Watch the transform order in either: radial layout is `rotate` **then** `translate`. The other way round moves the element and spins it where it stands, which fans everything to one side instead of spacing it around a circle.

**Power-ups are stock, not a mid-run purchase.** They are bought in `StoreScreen` and spent in `GameScreen`, which decrements the count and writes it straight back to storage. Nothing in a run may open the store — stepping out to shop mid-run would just be the old inline purchase with more steps. The in-game button shows what is left, and zero means zero.

**Heads come from a catalogue.** `src/game/faces.ts` lists every head with a price and a role; `GameScreen` picks one per spawn and stores its id on the `Spawn`. Adding a head is one entry in that file plus, if it scores differently, a `SpawnKind` and an odds/points constant.

`unlockedFacesFor` returning **an empty list is meaningful**: a role whose heads are all purchasable does not spawn until one is bought, which is what makes buying one worth anything. The free-head fallback exists only so a role that *has* a free head can never end up with nothing to spawn — do not restore the old blanket fallback, it would make every locked head spawn for free.

### Two gotchas that will bite

**Presses are wired twice on purpose.** `Face` passes both `onPressIn` and `onPress`. On native, `onPressIn` fires on touch-down, which a tap-to-hit game needs. On web that handler does not fire — react-native-web routes presses through a click handler — so `onPress` is what works there. `knockDown` ignores an already-killed spawn, so double-firing is harmless. Removing either handler silently breaks one platform.

**Full-bleed decorative layers must render before the faces.** The fart gas and golden flash cover the whole play area. In front of the faces they swallow every tap: on web, `pointerEvents="none"` on the wrapper is not inherited by a child `Image`. They are rendered before the faces both for this reason and to match the original z-order.

### Persistence

`src/game/storage.ts` wraps `@react-native-async-storage/async-storage` (localStorage on web, native key-value store on iOS/Android). Keys: `bestScore`, `diamonds`, `fartStock`, `noBombsStock`, `soundEnabled`, `musicEnabled`, `unlockedFaces`. Reads never throw and never return undefined — a missing or unparseable value reads as `0`, matching the contract the original file-backed storage had. Keep that if you touch it. Three deliberate exceptions: the two audio toggles default to `true` so a first run has sound, and `unlockedFaces` always includes the free heads so no saved state can leave a run with nothing to spawn.

### Audio

`src/game/audio.ts` holds the long-lived `expo-audio` players, replayed by seeking to 0. The button click is played inside `PillButton` and `ScreenHeader` rather than by their callers, on `onPressIn` so it lands with the finger — a new button gets it for free, and nobody has to remember.

Buttons also respond to a pointer, via `onHoverIn`/`onHoverOut` and a `cursor` style. Both are in React Native's own types and simply never fire on a touchscreen, so this is a web nicety that costs native nothing — no `Platform.OS` checks needed. Hover sits between rest and press (`BUTTON_HOVER_SCALE` < `BUTTON_PRESS_SCALE`) so the states read in order; `PillButton` tracks whether the pointer is still over it so releasing a press settles back to hover rather than all the way to rest. Three of them are knock-down recordings: `playDeathSound()` picks between them and never repeats the previous one, because it is the sound the player hears most and one sample on a loop turns into a rattle. Any new variation goes in `SOURCES` and in `DEATH_VARIATIONS`.

Sound files must be in a format every target decodes — wav, mp3, or m4a/AAC. Ogg Vorbis plays on Android and Chrome but not on iOS or Safari, and a load failure here is silent by design, so an ogg asset would simply never be heard on an iPhone. Every call is best-effort and swallows failures, because browsers block playback until the page has had a user gesture and a silent game beats a crash.

The settings toggle flips a module-level flag that `playSound` checks; the players stay loaded either way. `App.tsx` applies the persisted value once at startup.

Two more players loop the music, at `MUSIC_VOLUME`. `App.tsx` drives them off the `screen` state — one track for a run, one for everything else — so settings inherits the menu loop instead of restarting it. `GameScreen` overrides it in three places the screen state cannot see: losing calls `playMusic(null)` so the death screen is quiet, and restarting or reviving calls `playMusic('game')`.

**Web autoplay.** Browsers refuse `play()` until the page has been interacted with, and expo-audio's web build drops the rejected promise without catching it, so it escapes as an unhandled page error that nothing here can intercept. `audioAllowed()` checks `navigator.userActivation` first and simply does not call `play()` when it would be refused; `resumeMusic()`, wired to `onStartShouldSetResponder` on the app frame, picks it up on the first interaction. Note that `onTouchStart` does **not** fire for a mouse on react-native-web — that is why the responder hook is used instead.

## Constraints to respect

- **No payments, ever.** The 2017 version had Google Play billing; it was removed deliberately as part of open-sourcing. Do not reintroduce a store, IAP, or the `com.android.vending.BILLING` permission.
- **No analytics, ads, crash reporting, or telemetry.** The app makes no network requests of its own. Adding an SDK that phones home contradicts a documented promise in the README.
- **Assets are not MIT-licensed.** `assets/` holds photographs of a real person (a co-author). Do not add new likenesses of anyone, and keep the licence note in the README and LICENSE accurate.
