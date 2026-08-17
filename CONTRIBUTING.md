# Contributing

Thanks for taking a look. This is a small game with a small surface area, so there is not much ceremony here.

## Setting up

```bash
npm install
npm start
```

Press <kbd>w</kbd> for the browser, <kbd>i</kbd> for the iOS simulator, <kbd>a</kbd> for Android. The browser needs no native tooling and is the quickest way to iterate; the game logic is identical on all three.

Before opening a pull request:

```bash
npm run typecheck
```

TypeScript runs in strict mode and should stay clean.

## Testing a change

There is no automated test suite. The game is short enough to check by hand, and a change is worth playing through before submitting:

- A face that escapes the right edge ends the run.
- Tapping a bomb ends the run. Bombs only appear above 15 points.
- A golden face gives 5 points and 1 diamond.
- The best score, diamond balance and Extra Hard flag survive a reload.
- Both power-ups spend a diamond, last 10 seconds, and re-enable afterwards.
- Continue costs one more diamond each time it is used within a run, and resets on restart.

If you change anything about spawning, movement or scoring, please check it on the web build *and* at least one native target. They share all of the logic, but not all of the event handling — see below.

## Things worth knowing

**Presses are wired twice, deliberately.** `Face` passes both `onPressIn` and `onPress`. On iOS and Android `onPressIn` fires on touch-down, which is what a tap-to-hit game wants. On the web that handler does not fire at all, because react-native-web routes presses through a click handler, so `onPress` is what lands there. Knocking down an already-dead face is a no-op, so handling both is safe. Removing either one breaks a platform.

**Full-bleed layers must stay behind the faces.** The fart gas and the golden flash cover the whole play area. Rendered in front, they swallow every tap — on the web, `pointerEvents="none"` on the wrapper is not inherited by a child image the way you would expect. They are rendered before the faces for this reason, which also matches the original layout.

**Positions are computed, not read.** Movement is linear, so a face's position follows from `startedAt` and `travelMs`. Please keep it that way rather than reading values back out of `Animated`; it is what allows the animation to use the native driver.

**The run lives in refs.** `GameScreen` holds the run in a ref and calls `repaint()` when something user-visible changes. If you add state that the spawn timer or the rules tick needs to read, put it in the ref rather than in `useState`, or you will act on stale values.

## Tuning the game

Difficulty, odds, prices, durations and unlock thresholds are all in `src/game/constants.ts`. Changing the feel of the game should not require touching anything else.

## Taking new screenshots

The images in `docs/screenshots/` are real captures of the web build at a 420×860 viewport. Run `npm run web`, size the window to roughly a phone, and capture the menu, a run in progress, the game over screen and the credits screen.

## Artwork

The photographs in `assets/` are of a real person and are not covered by the MIT licence — see the note at the end of the README. Please do not add new likenesses of anyone, and if you are forking this for your own game, swap the assets out.
