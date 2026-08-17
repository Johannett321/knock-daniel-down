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

Four screens, switched by a `useState` in `App.tsx`. No navigation library, no deep linking, no routing config. `App.tsx` also constrains the app to a 480px-wide centred column on web, so the game is phone-shaped in a desktop browser.

- `LoadingScreen` (splash, skippable by tapping) → `MenuScreen` → `GameScreen` / `CreditsScreen`
- `CreditsScreen` is the settings screen too — it holds the Extra Hard toggle and the reset-score button, as it did in the original.

All tuning lives in `src/game/constants.ts`. Changing how the game feels should not require touching anything else.

### GameScreen

The largest file and where all the game logic lives.

**Movement is analytic.** Faces cross linearly, so position derives from `startedAt` and `travelMs`. Nothing reads a position back out of `Animated`. This is what lets the visual slide use the native driver while the rules run in JS on a 50 ms tick (`TICK_MS`). Do not replace this with animation-value listeners.

**The run lives in refs, not state.** The spawn timer and the rules tick read and write the run many times a second; going through `useState` would act on stale values. `run` (a `RunState` ref) and `spawns` (a `Spawn[]` ref) are the source of truth, and `repaint()` — a `useReducer` counter — forces a render when something user-visible changes. New game state that timers touch belongs in a ref, not `useState`.

**Difficulty** ramps in `knockDown`: both `faceTravelMs` and `spawnIntervalMs` drop by `DIFFICULTY_STEP_MS` per kill, floored at 800/500 ms.

**Diamonds are earned, never bought.** Golden faces award `GOLDEN_FACE_DIAMONDS`. They pay for the two power-ups and for `Continue`, whose price rises by one per use and resets on restart.

### Two gotchas that will bite

**Presses are wired twice on purpose.** `Face` passes both `onPressIn` and `onPress`. On native, `onPressIn` fires on touch-down, which a tap-to-hit game needs. On web that handler does not fire — react-native-web routes presses through a click handler — so `onPress` is what works there. `knockDown` ignores an already-killed spawn, so double-firing is harmless. Removing either handler silently breaks one platform.

**Full-bleed decorative layers must render before the faces.** The fart gas and golden flash cover the whole play area. In front of the faces they swallow every tap: on web, `pointerEvents="none"` on the wrapper is not inherited by a child `Image`. They are rendered before the faces both for this reason and to match the original z-order.

### Persistence

`src/game/storage.ts` wraps `@react-native-async-storage/async-storage` (localStorage on web, native key-value store on iOS/Android). Three keys: `bestScore`, `diamonds`, `extraHardMode`. Reads never throw and never return undefined — a missing or unparseable value reads as `0` / `false`, matching the contract the original file-backed storage had. Keep that if you touch it.

### Audio

`src/game/audio.ts` holds five long-lived `expo-audio` players, replayed by seeking to 0. Every call is best-effort and swallows failures, because browsers block playback until the page has had a user gesture and a silent game beats a crash.

## Constraints to respect

- **No payments, ever.** The 2017 version had Google Play billing; it was removed deliberately as part of open-sourcing. Do not reintroduce a store, IAP, or the `com.android.vending.BILLING` permission.
- **No analytics, ads, crash reporting, or telemetry.** The app makes no network requests of its own. Adding an SDK that phones home contradicts a documented promise in the README.
- **Assets are not MIT-licensed.** `assets/` holds photographs of a real person (a co-author). Do not add new likenesses of anyone, and keep the licence note in the README and LICENSE accurate.
