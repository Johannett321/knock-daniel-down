/**
 * Tuning values for a run.
 *
 * These mirror the original 2017 Android build so the game feels the same.
 * The one deliberate difference is the currency: diamonds used to be bought
 * with real money and are now earned by knocking down golden faces.
 */

/** How long a face takes to cross the screen at the start of a run. */
export const INITIAL_FACE_TRAVEL_MS = 4000;
/** The fastest a face is ever allowed to cross. */
export const MIN_FACE_TRAVEL_MS = 800;

/** Gap between spawns at the start of a run. */
export const INITIAL_SPAWN_INTERVAL_MS = 1000;
/** The shortest gap between spawns. */
export const MIN_SPAWN_INTERVAL_MS = 500;

/** Both timings tighten by this much on every successful knock-down. */
export const DIFFICULTY_STEP_MS = 10;

/** How often the run is checked for misses and fart auto-kills. */
export const TICK_MS = 50;

/** A 1-in-N chance that a spawn is golden. */
export const GOLDEN_FACE_ODDS = 10;
/** A 1-in-N chance that a spawn is a bomb, once the player is warmed up. */
export const BOMB_ODDS = 10;
/** Bombs stay out of the mix until the score passes this. */
export const BOMB_MIN_SCORE = 15;

export const NORMAL_FACE_POINTS = 1;
export const GOLDEN_FACE_POINTS = 5;
/** Diamonds earned for knocking down a golden face. */
export const GOLDEN_FACE_DIAMONDS = 1;

/** What either power-up costs, in diamonds. */
export const POWER_UP_COST = 1;
/** How long a power-up stays active. */
export const POWER_UP_DURATION_MS = 10_000;

/** With Extra Hard on, these scores unlock the second and third lanes. */
export const LANE_2_UNLOCK_SCORE = 20;
export const LANE_3_UNLOCK_SCORE = 50;

/** Face size as a fraction of the play area's width. */
export const FACE_SIZE_RATIO = 0.45;
/** Upper bound on face size, so the game stays sane on a desktop browser. */
export const MAX_FACE_SIZE = 200;

/** The play area is capped at this width so the web build looks phone-shaped. */
export const MAX_PLAY_WIDTH = 480;

/** Shown on the credits screen. Keep in step with `version` in app.json. */
export const APP_VERSION = '2.0.0';

/** The score at which the background switches, and switches back. */
export const BACKGROUND_SWITCH_SCORE = 10;
export const BACKGROUND_RESTORE_SCORE = 20;
