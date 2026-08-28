import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { Face } from '../components/Face';
import { GoldenRings } from '../components/GoldenRings';
import { ParticleBurst } from '../components/ParticleBurst';
import { PillButton } from '../components/PillButton';
import { playDeathSound, playMusic, playSound } from '../game/audio';
import {
  BACKGROUND_RESTORE_SCORE,
  BACKGROUND_SWITCH_SCORE,
  BOMB_MIN_SCORE,
  BOMB_ODDS,
  FACE_SIZE_RATIO,
  FACE_TRAVEL_STEP_MS,
  CACTUS_BURST_COUNT,
  CACTUS_BURST_GRAVITY,
  CACTUS_BURST_MS,
  CACTUS_BURST_REACH,
  CACTUS_BURST_SCALE,
  DIAMOND_BURST_GRAVITY,
  DIAMOND_BURST_MS,
  DIAMOND_BURST_PER_REWARD,
  DIAMOND_BURST_RAYS,
  DIAMOND_BURST_REACH,
  DIAMOND_BURST_SCALE,
  DIAMOND_FACE_ODDS,
  DIAMOND_FACE_POINTS,
  DIAMOND_FACE_REWARDS,
  DIAMOND_FLASH_MS,
  DIAMOND_FLASH_OPACITY,
  DIAMOND_ZOOM_IN_MS,
  DIAMOND_ZOOM_OUT_MS,
  DIAMOND_ZOOM_SCALE,
  GOLDEN_FACE_ODDS,
  GOLDEN_FACE_POINTS,
  GOLD_FLASH_MS,
  GOLD_FLASH_OPACITY,
  HIT_BURST_MS,
  HIT_BURST_RATIO,
  HIT_TOTAL_MS,
  HUD_BOTTOM_RESERVED,
  HUD_TOP_RESERVED,
  INITIAL_FACE_TRAVEL_MS,
  INITIAL_SPAWN_INTERVAL_MS,
  LANE_2_UNLOCK_SCORE,
  LANE_3_UNLOCK_SCORE,
  MAX_FACE_SIZE,
  MEXICAN_FACE_ODDS,
  MEXICAN_FACE_POINTS,
  MIN_FACE_TRAVEL_MS,
  MIN_SPAWN_INTERVAL_MS,
  NORMAL_FACE_POINTS,
  POWER_UP_DURATION_MS,
  SPAWN_INTERVAL_STEP_MS,
  TICK_MS,
} from '../game/constants';
import { unlockedFacesFor, type FaceSkin } from '../game/faces';
import { IMAGES } from '../game/images';
import {
  getBestScore,
  getDiamonds,
  getFartStock,
  getNoBombsStock,
  getUnlockedFaces,
  setBestScore,
  setDiamonds,
  setFartStock,
  setNoBombsStock,
} from '../game/storage';
import type { RunState, Spawn, SpawnKind } from '../game/types';

type Props = { onExit: () => void };

/**
 * The play area, wrapped so the camera punch can scale everything at once.
 *
 * Built once at module scope, never inside the component: rebuilding it on
 * each render would make React see a new component type every repaint and
 * remount the whole play area — faces, animations and all — many times a
 * second.
 *
 * A transform never affects layout, so `onLayout` still measures the true
 * size and no face or lane moves because of it. `App.tsx` clips the frame,
 * which is what turns the scale into a zoom rather than an overflow.
 */
const AnimatedBackground = Animated.createAnimatedComponent(ImageBackground);

/**
 * The ring thrown at the point of contact, per kind of head. Deep orange is
 * the default because it reads on every background in the game; the rest are
 * tinted to whatever the head is worth.
 */
const RING_COLOURS: Partial<Record<SpawnKind, string>> & { normal: string } = {
  normal: '#ff5722',
  golden: '#ffe082',
  diamond: '#b3e5fc',
  mexican: '#66bb6a',
};

/**
 * Where a lane sits vertically. Lanes 1 and 2 open up as the score rises, and
 * both are inset far enough to stay clear of the HUD above and below them.
 */
function laneTop(lane: number, height: number, size: number): number {
  if (lane === 1) return Math.max(0, height - size - HUD_BOTTOM_RESERVED);
  if (lane === 2) return HUD_TOP_RESERVED;
  return Math.max(0, (height - size) / 2);
}

function freshRun(
  bestScore: number,
  diamonds: number,
  fartStock: number,
  noBombsStock: number,
): RunState {
  return {
    score: 0,
    diamonds,
    bestScore,
    faceTravelMs: INITIAL_FACE_TRAVEL_MS,
    spawnIntervalMs: INITIAL_SPAWN_INTERVAL_MS,
    revivePrice: 1,
    fartStock,
    noBombsStock,
    lost: false,
    fartUntil: 0,
    noBombsUntil: 0,
  };
}

export function GameScreen({ onExit }: Props) {
  /**
   * The run lives in refs rather than state. The spawn timer and the rules
   * tick both need to read and write it synchronously many times a second,
   * and going through state would mean acting on stale values. `repaint`
   * is called after any change that the player should see.
   */
  const run = useRef<RunState>(freshRun(0, 0, 0, 0));
  const spawns = useRef<Spawn[]>([]);
  const nextId = useRef(0);
  /** The heads this player owns, split by what they are used for. */
  const normalFaces = useRef<FaceSkin[]>(unlockedFacesFor('normal', []));
  const goldenFaces = useRef<FaceSkin[]>(unlockedFacesFor('golden', []));
  const diamondFaces = useRef<FaceSkin[]>(unlockedFacesFor('diamond', []));
  const mexicanFaces = useRef<FaceSkin[]>(unlockedFacesFor('mexican', []));

  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [, repaint] = useReducer((n: number) => n + 1, 0);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);

  const scoreScale = useRef(new Animated.Value(1)).current;
  const goldenFlash = useRef(new Animated.Value(0)).current;
  const gasOpacity = useRef(new Animated.Value(0)).current;
  const diamondFlash = useRef(new Animated.Value(0)).current;
  /** Scales the whole play area, so a diamond hit shoves the camera at it. */
  const cameraZoom = useRef(new Animated.Value(1)).current;
  const loseOpacity = useRef(new Animated.Value(0)).current;

  /**
   * How much of each power-up is left, 1 down to 0. These run as animations
   * rather than being recomputed on the tick, so the countdown bars stay
   * smooth on the native driver without repainting the whole screen.
   */
  const fartProgress = useRef(new Animated.Value(0)).current;
  const noBombsProgress = useRef(new Animated.Value(0)).current;

  /**
   * The ring that snaps outwards where a face was hit. It is drawn at the
   * contact point rather than parented to the face, because the face is
   * knocked away from that point immediately and the ring should not follow.
   */
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstAt = useRef({ x: 0, y: 0, color: RING_COLOURS.normal });

  /**
   * The last diamond payout, if there has been one. Keyed by `id` so the
   * burst component remounts and replays rather than being reset by hand.
   */
  const gemBurst = useRef<{ id: number; x: number; y: number; reward: number } | null>(null);

  /** The last golden hit, keyed the same way so its rings replay. */
  const goldRings = useRef<{ id: number; x: number; y: number } | null>(null);

  /** The last Mexican hit, which throws cacti. */
  const cactusBurst = useRef<{ id: number; x: number; y: number } | null>(null);

  /** Last seen power-up states, so the tick can repaint when either flips. */
  const powerUpsActive = useRef({ fart: false, noBombs: false });

  const faceSize = area ? Math.min(area.width * FACE_SIZE_RATIO, MAX_FACE_SIZE) : 0;

  const stopTimers = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    spawnTimer.current = null;
    tickTimer.current = null;
  }, []);

  // ---------------------------------------------------------------- scoring

  const popScore = useCallback(
    (to: number) => {
      scoreScale.setValue(1);
      Animated.sequence([
        Animated.timing(scoreScale, { toValue: to, duration: 100, useNativeDriver: true }),
        Animated.timing(scoreScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    },
    [scoreScale],
  );

  /**
   * A wash over the play area. Golden hits used to use this and now throw
   * rings at the point of contact instead; a revive still earns it, being a
   * whole-screen event rather than something that happens to one face.
   */
  const flashGold = useCallback(() => {
    goldenFlash.setValue(GOLD_FLASH_OPACITY);
    Animated.timing(goldenFlash, {
      toValue: 0,
      duration: GOLD_FLASH_MS,
      useNativeDriver: true,
    }).start();
  }, [goldenFlash]);

  const burst = useCallback(
    (x: number, y: number, kind: SpawnKind) => {
      burstAt.current = { x, y, color: RING_COLOURS[kind] ?? RING_COLOURS.normal };
      burstScale.setValue(0.3);
      burstOpacity.setValue(0.85);
      Animated.parallel([
        Animated.timing(burstScale, {
          toValue: 1.45,
          duration: HIT_BURST_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: HIT_BURST_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [burstOpacity, burstScale],
  );

  /**
   * The diamond payoff, over the whole screen: a blue wash and a camera
   * punch. Both are transforms or opacity, so this stays on the native driver
   * and does not touch layout — nothing here can move a face or a lane.
   */
  const diamondImpact = useCallback(() => {
    diamondFlash.setValue(DIAMOND_FLASH_OPACITY);
    Animated.timing(diamondFlash, {
      toValue: 0,
      duration: DIAMOND_FLASH_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    cameraZoom.setValue(1);
    Animated.sequence([
      Animated.timing(cameraZoom, {
        toValue: DIAMOND_ZOOM_SCALE,
        duration: DIAMOND_ZOOM_IN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cameraZoom, {
        toValue: 1,
        duration: DIAMOND_ZOOM_OUT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cameraZoom, diamondFlash]);

  const startCountdown = useCallback((value: Animated.Value) => {
    value.setValue(1);
    Animated.timing(value, {
      toValue: 0,
      duration: POWER_UP_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, []);

  const knockDown = useCallback(
    (spawn: Spawn) => {
      if (spawn.killed) return;
      spawn.killed = true;
      spawn.killedAt = Date.now();

      // Where the face was at the moment of contact, from the same arithmetic
      // the rules tick uses. Nothing is read back out of the animation.
      if (area) {
        const progress = (spawn.killedAt - spawn.startedAt) / spawn.travelMs;
        const x = -faceSize + progress * (area.width + faceSize) + faceSize / 2;
        const y = laneTop(spawn.lane, area.height, faceSize) + faceSize / 2;
        burst(x, y, spawn.kind);
        if (spawn.kind === 'diamond') {
          gemBurst.current = { id: spawn.id, x, y, reward: spawn.reward };
        } else if (spawn.kind === 'golden') {
          goldRings.current = { id: spawn.id, x, y };
        } else if (spawn.kind === 'mexican') {
          cactusBurst.current = { id: spawn.id, x, y };
        }
      }

      const state = run.current;
      if (spawn.kind === 'diamond') {
        // The only payout in the game. Golden faces are worth points alone.
        state.score += DIAMOND_FACE_POINTS;
        state.diamonds += spawn.reward;
        void setDiamonds(state.diamonds);
        playSound(spawn.reward >= DIAMOND_FACE_REWARDS.length ? 'diamondDeathBig' : 'diamondDeath');
        diamondImpact();
        popScore(3);
      } else if (spawn.kind === 'mexican') {
        state.score += MEXICAN_FACE_POINTS;
        playSound('mexicanDeath');
        popScore(3);
      } else if (spawn.kind === 'golden') {
        state.score += GOLDEN_FACE_POINTS;
        playSound('goldenDeath');
        popScore(3);
      } else {
        state.score += NORMAL_FACE_POINTS;
        playDeathSound();
        popScore(2);
      }

      // Every knock-down tightens both timings, down to their floors. The
      // crossing time is the one that matters — it is the player's reaction
      // window — so it falls much faster than the gap between spawns.
      state.faceTravelMs = Math.max(MIN_FACE_TRAVEL_MS, state.faceTravelMs - FACE_TRAVEL_STEP_MS);
      state.spawnIntervalMs = Math.max(
        MIN_SPAWN_INTERVAL_MS,
        state.spawnIntervalMs - SPAWN_INTERVAL_STEP_MS,
      );
      repaint();
    },
    [area, burst, diamondImpact, faceSize, flashGold, popScore],
  );

  // ------------------------------------------------------------------ losing

  const lose = useCallback(() => {
    const state = run.current;
    if (state.lost) return;
    state.lost = true;
    stopTimers();
    spawns.current = [];
    // The run is over, so the run's music is too — the death screen is quiet
    // apart from the fail sting. Restarting or reviving starts it again.
    playMusic(null);
    playSound('fail');

    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      void setBestScore(state.bestScore);
    }

    loseOpacity.setValue(0);
    Animated.timing(loseOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    repaint();
  }, [loseOpacity, stopTimers]);

  // ---------------------------------------------------------------- spawning

  const spawnOne = useCallback(() => {
    if (!area) return;
    const state = run.current;
    const now = Date.now();

    // Bombs only appear once the player is warmed up, and never while the
    // no-bombs power-up is running.
    const bombsAllowed = state.score > BOMB_MIN_SCORE && now >= state.noBombsUntil;
    let kind: SpawnKind = 'normal';
    let reward = 0;
    if (bombsAllowed && Math.random() < 1 / BOMB_ODDS) {
      kind = 'bomb';
    } else if (Math.random() < 1 / DIAMOND_FACE_ODDS) {
      // Rarest first, so each kind's odds are its own rather than whatever the
      // commoner ones leave over. The three payouts are equally likely once a
      // diamond head turns up.
      kind = 'diamond';
      reward = DIAMOND_FACE_REWARDS[Math.floor(Math.random() * DIAMOND_FACE_REWARDS.length)];
    } else if (
      // Only once one has been bought — an empty list is how an unowned head
      // stays out of the game.
      mexicanFaces.current.length > 0 &&
      Math.random() < 1 / MEXICAN_FACE_ODDS
    ) {
      kind = 'mexican';
    } else if (Math.random() < 1 / GOLDEN_FACE_ODDS) {
      kind = 'golden';
    }

    // The centre lane is always in play; the other two open up with the score.
    const lanes = [0];
    if (state.score >= LANE_2_UNLOCK_SCORE) lanes.push(1);
    if (state.score >= LANE_3_UNLOCK_SCORE) lanes.push(2);
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    // Bombs have their own image, so the head only matters for a face.
    const heads =
      kind === 'golden'
        ? goldenFaces.current
        : kind === 'diamond'
          ? diamondFaces.current
          : kind === 'mexican'
            ? mexicanFaces.current
            : normalFaces.current;
    const head = heads[Math.floor(Math.random() * heads.length)];

    spawns.current.push({
      id: nextId.current++,
      kind,
      lane,
      faceId: head.id,
      reward,
      startedAt: now,
      travelMs: state.faceTravelMs,
      killed: false,
      killedAt: 0,
    });
    repaint();
  }, [area]);

  const scheduleSpawn = useCallback(() => {
    spawnTimer.current = setTimeout(() => {
      if (run.current.lost) return;
      spawnOne();
      scheduleSpawn();
    }, run.current.spawnIntervalMs);
  }, [spawnOne]);

  // ------------------------------------------------------------- rules tick

  const tick = useCallback(() => {
    const state = run.current;
    if (state.lost || !area) return;

    const now = Date.now();
    const burstSize = faceSize * HIT_BURST_RATIO;
  const fartActive = now < state.fartUntil;
    const distance = area.width + faceSize;
    let missed = false;

    for (const spawn of spawns.current) {
      if (spawn.killed) continue;

      const progress = (now - spawn.startedAt) / spawn.travelMs;
      const x = -faceSize + progress * distance;

      // The fart clears faces once they reach the middle of the screen.
      if (fartActive && spawn.kind !== 'bomb' && x + faceSize >= area.width / 2) {
        knockDown(spawn);
        continue;
      }

      if (progress >= 1) {
        // A bomb leaving the screen is harmless; a face leaving is the run.
        if (spawn.kind !== 'bomb' && !fartActive) missed = true;
      }
    }

    if (missed) {
      lose();
      return;
    }

    // Drop anything that has finished falling or drifted off the right edge.
    const before = spawns.current.length;
    spawns.current = spawns.current.filter((spawn) => {
      if (spawn.killed) return now - spawn.killedAt < HIT_TOTAL_MS;
      return (now - spawn.startedAt) / spawn.travelMs < 1;
    });

    let changed = spawns.current.length !== before;

    // Fade the gas in and out as the fart starts and expires.
    if (fartActive !== powerUpsActive.current.fart) {
      powerUpsActive.current.fart = fartActive;
      Animated.timing(gasOpacity, {
        toValue: fartActive ? 1 : 0,
        duration: fartActive ? 800 : 1500,
        useNativeDriver: true,
      }).start();
      changed = true;
    }

    // Repaint when the no-bombs timer expires so its button re-enables.
    const noBombsActive = now < state.noBombsUntil;
    if (noBombsActive !== powerUpsActive.current.noBombs) {
      powerUpsActive.current.noBombs = noBombsActive;
      changed = true;
    }

    if (changed) repaint();
  }, [area, faceSize, gasOpacity, knockDown, lose]);

  // -------------------------------------------------------------- lifecycle

  const startRun = useCallback(() => {
    stopTimers();
    spawns.current = [];
    spawnOne();
    scheduleSpawn();
    tickTimer.current = setInterval(() => tick(), TICK_MS);
    repaint();
  }, [scheduleSpawn, spawnOne, stopTimers, tick]);

  // Load saved state once, before the first face is ever spawned.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [best, diamonds, fart, noBombs, faces] = await Promise.all([
        getBestScore(),
        getDiamonds(),
        getFartStock(),
        getNoBombsStock(),
        getUnlockedFaces(),
      ]);
      if (cancelled) return;
      run.current = freshRun(best, diamonds, fart, noBombs);
      normalFaces.current = unlockedFacesFor('normal', faces);
      goldenFaces.current = unlockedFacesFor('golden', faces);
      diamondFaces.current = unlockedFacesFor('diamond', faces);
      mexicanFaces.current = unlockedFacesFor('mexican', faces);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !area) return;
    startRun();
    return stopTimers;
    // Restarting on a size change would be worse than letting the run continue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, area?.width, area?.height]);

  // ------------------------------------------------------------- player acts

  const onTapSpawn = useCallback(
    (spawn: Spawn) => {
      if (run.current.lost) return;
      if (spawn.kind === 'bomb') {
        lose();
        return;
      }
      knockDown(spawn);
    },
    [knockDown, lose],
  );

  /**
   * Power-ups come out of stock bought in the store, not out of the diamond
   * balance. There is nothing to buy in here — running out means running out.
   */
  const useFart = useCallback(() => {
    const state = run.current;
    if (state.lost || Date.now() < state.fartUntil || state.fartStock < 1) return;
    state.fartStock -= 1;
    void setFartStock(state.fartStock);
    state.fartUntil = Date.now() + POWER_UP_DURATION_MS;
    startCountdown(fartProgress);
    playSound('fart');
    repaint();
  }, [fartProgress, startCountdown]);

  const useBombRemoval = useCallback(() => {
    const state = run.current;
    if (state.lost || Date.now() < state.noBombsUntil || state.noBombsStock < 1) return;
    state.noBombsStock -= 1;
    void setNoBombsStock(state.noBombsStock);
    state.noBombsUntil = Date.now() + POWER_UP_DURATION_MS;
    startCountdown(noBombsProgress);
    repaint();
  }, [noBombsProgress, startCountdown]);

  const restart = useCallback(() => {
    const previous = run.current;
    run.current = freshRun(
      previous.bestScore,
      previous.diamonds,
      previous.fartStock,
      previous.noBombsStock,
    );
    // A fresh run clears both power-ups, so their countdowns go with them.
    for (const value of [fartProgress, noBombsProgress]) {
      value.stopAnimation();
      value.setValue(0);
    }
    gemBurst.current = null;
    goldRings.current = null;
    cactusBurst.current = null;
    playMusic('game');
    startRun();
  }, [fartProgress, noBombsProgress, startRun]);

  const revive = useCallback(() => {
    const state = run.current;
    if (state.diamonds < state.revivePrice) return;
    state.diamonds -= state.revivePrice;
    state.revivePrice += 1;
    void setDiamonds(state.diamonds);
    state.lost = false;
    playMusic('game');
    playSound('revive');
    flashGold();
    startRun();
  }, [flashGold, startRun]);

  // ----------------------------------------------------------------- render

  const state = run.current;
  const now = Date.now();
  const background =
    state.score > BACKGROUND_SWITCH_SCORE && state.score < BACKGROUND_RESTORE_SCORE
      ? IMAGES.gameBackgroundAlt
      : IMAGES.gameBackground;
  const scoreColor =
    state.score > BACKGROUND_SWITCH_SCORE && state.score < BACKGROUND_RESTORE_SCORE
      ? '#ffffff'
      : '#000000';

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (area?.width !== width || area?.height !== height)) {
      setArea({ width, height });
    }
  };

  const burstSize = faceSize * HIT_BURST_RATIO;
  const fartActive = now < state.fartUntil;
  const noBombsActive = now < state.noBombsUntil;

  return (
    <AnimatedBackground
      source={background}
      resizeMode="cover"
      style={[styles.root, { transform: [{ scale: cameraZoom }] }]}
      onLayout={onLayout}
    >
      {/*
        Both effects sit behind the faces, as they did in the original layout.
        Order matters for more than looks: these are full-bleed layers, and in
        front they would sit over the play area and swallow every tap.
      */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.overlay, { opacity: gasOpacity }]}
      >
        <Image source={IMAGES.fartGas} resizeMode="cover" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.overlay, styles.goldFlash, { opacity: goldenFlash }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.overlay,
          styles.diamondFlash,
          { opacity: diamondFlash },
        ]}
      />

      {area &&
        spawns.current.map((spawn) => (
          <Face
            key={spawn.id}
            spawn={spawn}
            size={faceSize}
            areaWidth={area.width}
            areaHeight={area.height}
            top={laneTop(spawn.lane, area.height, faceSize)}
            onTap={onTapSpawn}
          />
        ))}

      {/*
        Unlike the gas and the gold flash this one may sit in front of the
        faces: it is a small view rather than a full-bleed layer, and it has
        no child image to break `pointerEvents` inheritance on the web.
      */}
      {area && goldRings.current && (
        <GoldenRings
          key={goldRings.current.id}
          x={goldRings.current.x}
          y={goldRings.current.y}
          size={faceSize}
        />
      )}

      {area && gemBurst.current && (
        <ParticleBurst
          key={`gems-${gemBurst.current.id}`}
          x={gemBurst.current.x}
          y={gemBurst.current.y}
          size={faceSize}
          image={IMAGES.diamond}
          count={Math.max(1, gemBurst.current.reward) * DIAMOND_BURST_PER_REWARD}
          reach={DIAMOND_BURST_REACH}
          gravity={DIAMOND_BURST_GRAVITY}
          durationMs={DIAMOND_BURST_MS}
          scale={DIAMOND_BURST_SCALE}
          rays={{ count: DIAMOND_BURST_RAYS, color: '#bfe9ff' }}
        />
      )}

      {area && cactusBurst.current && (
        <ParticleBurst
          key={`cacti-${cactusBurst.current.id}`}
          x={cactusBurst.current.x}
          y={cactusBurst.current.y}
          size={faceSize}
          image={IMAGES.cactus}
          count={CACTUS_BURST_COUNT}
          reach={CACTUS_BURST_REACH}
          gravity={CACTUS_BURST_GRAVITY}
          durationMs={CACTUS_BURST_MS}
          scale={CACTUS_BURST_SCALE}
        />
      )}

      {area && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.burst,
            {
              width: burstSize,
              height: burstSize,
              borderRadius: burstSize / 2,
              borderColor: burstAt.current.color,
              left: burstAt.current.x - burstSize / 2,
              top: burstAt.current.y - burstSize / 2,
              opacity: burstOpacity,
              transform: [{ scale: burstScale }],
            },
          ]}
        />
      )}

      {/* Hidden once the run ends, so it does not show through the overlay. */}
      {!state.lost && (
        <Animated.Text
          style={[styles.score, { color: scoreColor, transform: [{ scale: scoreScale }] }]}
          pointerEvents="none"
        >
          {state.score}
        </Animated.Text>
      )}

      {!state.lost && (
        <View style={styles.hud} pointerEvents="box-none">
          <View style={styles.diamondBadge} pointerEvents="none">
            <Image source={IMAGES.diamond} style={styles.diamondIcon} resizeMode="contain" />
            <Text style={styles.diamondCount}>{state.diamonds}</Text>
          </View>
          <View style={styles.powerUps}>
            <PowerUpButton
              icon={IMAGES.powerUpFart}
              label="Fart"
              active={fartActive}
              stock={state.fartStock}
              progress={fartProgress}
              onPress={useFart}
            />
            <PowerUpButton
              icon={IMAGES.powerUpNoBombs}
              label="No bombs"
              active={noBombsActive}
              stock={state.noBombsStock}
              progress={noBombsProgress}
              onPress={useBombRemoval}
            />
          </View>
        </View>
      )}

      {state.lost && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.loseMenu, { opacity: loseOpacity }]}>
          <Text style={styles.bestScore}>Best Score: {state.bestScore}</Text>
          <View style={styles.diamondBadgeDark}>
            <Image source={IMAGES.diamond} style={styles.diamondIcon} resizeMode="contain" />
            <Text style={styles.diamondCount}>{state.diamonds}</Text>
          </View>

          <Image source={IMAGES.faceSmile} style={styles.smile} resizeMode="contain" />
          <Text style={styles.loseLabel}>
            {state.score >= state.bestScore && state.score > 0 ? 'New Best!' : 'Current Score:'}
          </Text>
          <Text style={styles.loseScore}>{state.score}</Text>

          <PillButton
            label={`CONTINUE (${state.revivePrice} 💎)`}
            onPress={revive}
            disabled={state.diamonds < state.revivePrice}
            width={220}
            fontSize={16}
            style={styles.loseButton}
          />
          {state.diamonds < state.revivePrice && (
            <Text style={styles.hint}>Knock down diamond faces to earn diamonds.</Text>
          )}
          {state.fartStock === 0 && state.noBombsStock === 0 && (
            <Text style={styles.hint}>Out of power-ups — stock up in the store.</Text>
          )}
          <PillButton label="RESTART" onPress={restart} width={220} fontSize={16} style={styles.loseButton} />
          <PillButton label="MENU" onPress={onExit} width={220} fontSize={16} style={styles.loseButton} />
        </Animated.View>
      )}
    </AnimatedBackground>
  );
}

/** Width of the countdown bar, needed to anchor its scale to the left edge. */
const COUNTDOWN_WIDTH = 46;

/**
 * One power-up: its icon, how many are left, and how long it has to run.
 *
 * The original showed only a word on a dark pill, which said nothing about
 * whether the power-up was running or how close it was to expiring. Here the
 * button holds all three states — ready, out of stock, and counting down.
 */
function PowerUpButton({
  icon,
  label,
  active,
  stock,
  progress,
  onPress,
}: {
  icon: ImageSourcePropType;
  label: string;
  active: boolean;
  stock: number;
  progress: Animated.Value;
  onPress: () => void;
}) {
  const enabled = !active && stock > 0;
  /** Web only: nothing hovers on a touchscreen. */
  const [hovered, setHovered] = useState(false);

  return (
    <View style={styles.powerUp}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={active ? `${label}, running` : `${label}, ${stock} left`}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.powerUpButton,
          active && styles.powerUpButtonActive,
          !enabled && !active && styles.powerUpButtonLocked,
          enabled && hovered && !pressed && styles.powerUpButtonHovered,
          pressed && styles.powerUpButtonPressed,
        ]}
      >
        <Image source={icon} resizeMode="contain" style={styles.powerUpIcon} />
        {/* The count gives way to the countdown once the power-up is running. */}
        {!active && (
          <View style={[styles.costBadge, stock === 0 && styles.costBadgeEmpty]}>
            <Text style={styles.costText}>{stock}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.countdownTrack} pointerEvents="none">
        <Animated.View
          style={[
            styles.countdownFill,
            {
              // Scaling alone would shrink the bar towards its middle; the
              // shift keeps it pinned to the left edge as it empties.
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-COUNTDOWN_WIDTH / 2, 0],
                  }),
                },
                { scaleX: progress },
              ],
            },
          ]}
        />
      </View>

      <Text style={[styles.powerUpLabel, active && styles.powerUpLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  overlay: {
    pointerEvents: 'none',
  },
  burst: {
    position: 'absolute',
    borderWidth: 6,
  },
  goldFlash: {
    backgroundColor: '#ffb74d',
  },
  diamondFlash: {
    backgroundColor: '#4fc3f7',
  },
  score: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    fontSize: 34,
    fontWeight: '800',
  },
  hud: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
  },
  diamondBadge: {
    position: 'absolute',
    right: 12,
    bottom: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  diamondBadgeDark: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diamondIcon: {
    width: 18,
    height: 18,
  },
  diamondCount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  powerUps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  powerUp: {
    alignItems: 'center',
    width: 76,
  },
  powerUpButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  powerUpButtonActive: {
    borderColor: '#ffb74d',
    backgroundColor: 'rgba(255, 183, 77, 0.3)',
  },
  powerUpButtonLocked: {
    opacity: 0.4,
  },
  powerUpButtonHovered: {
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    transform: [{ scale: 1.07 }],
  },
  powerUpButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  powerUpIcon: {
    width: 42,
    height: 42,
  },
  costBadge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#1c1a18',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  costBadgeEmpty: {
    borderColor: 'rgba(255, 138, 128, 0.75)',
  },
  costText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    minWidth: 8,
    textAlign: 'center',
  },
  countdownTrack: {
    width: COUNTDOWN_WIDTH,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    marginTop: 7,
  },
  countdownFill: {
    width: COUNTDOWN_WIDTH,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ffb74d',
  },
  powerUpLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  powerUpLabelActive: {
    color: '#ffb74d',
  },
  loseMenu: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  bestScore: {
    position: 'absolute',
    top: 12,
    left: 12,
    color: '#ffffff',
    fontSize: 18,
  },
  smile: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  loseLabel: {
    color: '#ffffff',
    fontSize: 26,
  },
  loseScore: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '800',
    marginBottom: 12,
  },
  loseButton: {
    marginTop: 8,
  },
  hint: {
    color: '#ffd54f',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
