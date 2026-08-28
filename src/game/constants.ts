/**
 * Tuning values for a run.
 *
 * These mirror the original 2017 Android build so the game feels the same.
 * The one deliberate difference is the currency: diamonds used to be bought
 * with real money and are now earned by knocking down golden faces.
 */

/**
 * How long a face takes to cross the screen at the start of a run, and the
 * fastest it is ever allowed to cross.
 *
 * The crossing time is the player's reaction window, so this pair is what the
 * whole difficulty curve is really made of. Four seconds opening and an
 * 800 ms floor left a good player with nothing to push against — the floor
 * arrived after about a hundred knock-downs and the run stopped getting
 * harder from there. Half a second is about as short as a window can get and
 * still be readable across three lanes.
 */
export const INITIAL_FACE_TRAVEL_MS = 2800;
export const MIN_FACE_TRAVEL_MS = 500;

/** Gap between spawns at the start of a run, and the shortest it ever gets. */
export const INITIAL_SPAWN_INTERVAL_MS = 850;
export const MIN_SPAWN_INTERVAL_MS = 420;

/**
 * How much each timing tightens on every successful knock-down.
 *
 * These used to be a single shared step, which made the run get denser
 * without getting quicker: the spawn interval has only 500 ms of range and
 * bottomed out after 50 kills, while the crossing time has 3200 ms and was
 * barely a tenth faster by then. Faces piled up on screen but each one still
 * gave the player almost four seconds.
 *
 * Speed is the difficulty now, so the crossing time falls five times faster
 * than the gap between spawns. Both reach their floors together, at around
 * sixty knock-downs, and the number of faces on screen drifts down from
 * three to one rather than spiking to seven — they cross too quickly to pile
 * up, which is the point.
 */
export const FACE_TRAVEL_STEP_MS = 40;
export const SPAWN_INTERVAL_STEP_MS = 8;

/** How loud the looping music sits under the effects. */
export const MUSIC_VOLUME = 0.4;

/** How often the run is checked for misses and fart auto-kills. */
export const TICK_MS = 50;

/** A 1-in-N chance that a spawn is golden. */
export const GOLDEN_FACE_ODDS = 10;
/**
 * A 1-in-N chance that a spawn is a diamond head — far rarer than golden,
 * because it is the only thing in the game that pays out diamonds.
 */
export const DIAMOND_FACE_ODDS = 60;
/**
 * A 1-in-N chance that a spawn is a Mexican head, once one has been bought.
 * Rarer than golden, since it is worth three times as much, but well short of
 * the diamond head — it is a purchase, and a purchase should be seen.
 */
export const MEXICAN_FACE_ODDS = 25;
/** A 1-in-N chance that a spawn is a bomb, once the player is warmed up. */
export const BOMB_ODDS = 10;
/** Bombs stay out of the mix until the score passes this. */
export const BOMB_MIN_SCORE = 15;

export const NORMAL_FACE_POINTS = 1;
export const GOLDEN_FACE_POINTS = 5;
export const DIAMOND_FACE_POINTS = 1;
export const MEXICAN_FACE_POINTS = 15;

/**
 * What each diamond head is worth, in diamonds. There is one variation per
 * entry and they are equally likely, so the payout averages out across them —
 * widening the spread is a matter of adding to this list.
 *
 * Golden faces used to pay a diamond as well. They are worth points alone
 * now, which leaves exactly one way to earn currency.
 */
export const DIAMOND_FACE_REWARDS = [1, 2, 3] as const;

/**
 * What one of either power-up costs in the store, in diamonds.
 *
 * Power-ups are stock now rather than a mid-run purchase: they are bought
 * between runs and spent during one. The price per use is unchanged.
 */
export const POWER_UP_COST = 1;
/** How long a power-up stays active. */
export const POWER_UP_DURATION_MS = 10_000;

/** The scores at which the second and third lanes start being used. */
export const LANE_2_UNLOCK_SCORE = 20;
export const LANE_3_UNLOCK_SCORE = 50;

/**
 * The knock-down.
 *
 * Tapping a face is the whole game, so the hit is built to land rather than
 * just start a fall: the face punches outwards, is kicked up out of its lane,
 * gets shoved along its direction of travel, and tumbles on the way down. A
 * ring snaps outwards at the point of contact while all that is happening.
 */

/** How high a hit face is knocked, as a fraction of its own size. */
export const HIT_POP_HEIGHT_RATIO = 0.42;
/** How long the knock-up takes before gravity takes over. */
export const HIT_POP_MS = 150;
/**
 * How long a hit face takes to drop out of the screen, clamped from
 * `travelMs / 2`. Without the upper bound an early, slow run leaves the face
 * hanging at the top of its arc for most of a second, which reads as floaty
 * rather than heavy.
 */
export const HIT_FALL_MIN_MS = 420;
export const HIT_FALL_MAX_MS = 600;
/** The squash-and-stretch punch at the moment of contact. */
export const HIT_PUNCH_SCALE = 1.3;
export const HIT_PUNCH_MS = 70;
/** How far a hit face is shoved onwards, as a fraction of its own size. */
export const HIT_KNOCKBACK_RATIO = 0.3;
/** How far a hit face tumbles on the way down, in degrees. */
export const HIT_SPIN_DEGREES = 170;
/**
 * The rings thrown out where a golden face is hit.
 *
 * The reward used to be a wash of gold over the entire play area, which
 * blanked the screen every tenth face; dimming it far enough to stop that
 * left nothing to see. Keeping the whole effect at the point of contact means
 * it can be loud without taking the play area with it.
 */
export const GOLD_RING_COUNT = 3;
export const GOLD_RING_MS = 620;
/**
 * How wide the rings open, as a multiple of the face's size. Kept fairly
 * tight: opened much further they thin out into faint arcs that read as
 * nothing at all, and half of one falls off the screen when the face is hit
 * near an edge.
 */
export const GOLD_RING_REACH = 2.0;
/** How far apart the rings leave, as a fraction of the whole animation. */
export const GOLD_RING_STAGGER = 0.16;

/**
 * The wash that remains for a revive — a whole-screen event, where a
 * whole-screen flash is the right scale.
 */
export const GOLD_FLASH_OPACITY = 0.3;
export const GOLD_FLASH_MS = 600;

/** The impact ring: its size relative to the face, and how long it lasts. */
export const HIT_BURST_RATIO = 1.1;
export const HIT_BURST_MS = 340;

/**
 * The halo that turns behind a live diamond head, so the rarest spawn in the
 * game is recognisable from across the screen.
 */
export const RAY_COUNT = 12;
export const RAY_SPIN_MS = 7000;
export const RAY_PULSE_MS = 1100;

/**
 * The diamond payout burst. The shower scales with the reward — three
 * diamonds should look like three diamonds' worth — which is why the count is
 * per reward rather than fixed.
 */
export const DIAMOND_BURST_MS = 900;
export const DIAMOND_BURST_PER_REWARD = 7;
export const DIAMOND_BURST_RAYS = 10;
/** How far the shower travels, as a multiple of the head's size. */
export const DIAMOND_BURST_REACH = 1.15;
/** How far gravity drags the shower down over its flight, against that reach. */
export const DIAMOND_BURST_GRAVITY = 0.45;
export const DIAMOND_BURST_SCALE = 0.28;

/**
 * The cactus burst from a Mexican head. A handful rather than a shower: the
 * head is worth points, not currency, so it does not need to look like a
 * payout — and a few heavy cacti lobbed out reads better than a spray.
 */
export const CACTUS_BURST_COUNT = 6;
export const CACTUS_BURST_MS = 950;
export const CACTUS_BURST_REACH = 1.05;
export const CACTUS_BURST_GRAVITY = 0.7;
export const CACTUS_BURST_SCALE = 0.34;

/**
 * What a diamond hit does to the whole screen: a wash of blue and a shove of
 * the camera towards it.
 *
 * A full-screen effect is wrong for a golden face at one in ten — it becomes
 * the thing you see rather than the thing you did. The diamond head is one in
 * sixty and pays the only currency in the game, so it has earned the screen.
 */
export const DIAMOND_FLASH_OPACITY = 0.34;
export const DIAMOND_FLASH_MS = 460;
/**
 * The camera punch: in fast, out slow, which is what makes it land. Kept
 * modest because the zoom is centred and crops the HUD while it runs — the
 * score clips off the top if this goes much higher.
 */
export const DIAMOND_ZOOM_SCALE = 1.05;
export const DIAMOND_ZOOM_IN_MS = 90;
export const DIAMOND_ZOOM_OUT_MS = 260;

/**
 * How long a knocked-down face is kept before the rules tick drops it: long
 * enough for the whole hit to finish. This used to piggyback on `travelMs`,
 * which quietly meant the hit could only ever be as long as the fastest
 * crossing — lowering `MIN_FACE_TRAVEL_MS` would have clipped it mid-fall.
 */
export const HIT_TOTAL_MS = HIT_POP_MS + HIT_FALL_MAX_MS;

/**
 * Vertical room kept clear for the HUD. The top and bottom lanes are inset by
 * this much so faces never slide underneath the score or the power-up buttons,
 * which they would otherwise do now that both lanes are always in play.
 */
export const HUD_TOP_RESERVED = 56;
export const HUD_BOTTOM_RESERVED = 96;

/** Face size as a fraction of the play area's width. */
export const FACE_SIZE_RATIO = 0.45;
/** Upper bound on face size, so the game stays sane on a desktop browser. */
export const MAX_FACE_SIZE = 200;

/** The play area is capped at this width so the web build looks phone-shaped. */
export const MAX_PLAY_WIDTH = 480;

/**
 * The menu entrance. The logo drops and settles first, then the buttons
 * balloon up one after another — springs rather than timings, because the
 * overshoot and wobble are the whole point.
 */
export const MENU_LOGO_DROP_MS = 550;
export const MENU_BUTTON_STAGGER_MS = 110;
/** Roughly how long one button's spring takes, for scheduling what follows. */
export const MENU_POP_MS = 600;
/** How far below its resting place a button starts. */
export const MENU_POP_OVERSHOOT = 40;

/**
 * How a button reacts to a pointer.
 *
 * Hover sits between rest and press so the three states read in order: the
 * button lifts under the cursor, then squashes further when it is actually
 * pressed. Only the web ever fires these — `onHoverIn` has nothing to report
 * on a touchscreen — so this is a web nicety that costs native nothing.
 */
export const BUTTON_HOVER_SCALE = 1.05;
export const BUTTON_PRESS_SCALE = 1.1;
export const BUTTON_HOVER_LIFT = 2;
export const BUTTON_HOVER_MS = 120;

/** Shown on the settings screen. Keep in step with `version` in app.json. */
export const APP_VERSION = '2.0.0';

/** The score at which the background switches, and switches back. */
export const BACKGROUND_SWITCH_SCORE = 10;
export const BACKGROUND_RESTORE_SCORE = 20;
