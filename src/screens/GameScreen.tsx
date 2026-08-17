import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Face } from '../components/Face';
import { PillButton } from '../components/PillButton';
import { playSound } from '../game/audio';
import {
  BACKGROUND_RESTORE_SCORE,
  BACKGROUND_SWITCH_SCORE,
  BOMB_MIN_SCORE,
  BOMB_ODDS,
  DIFFICULTY_STEP_MS,
  FACE_SIZE_RATIO,
  GOLDEN_FACE_DIAMONDS,
  GOLDEN_FACE_ODDS,
  GOLDEN_FACE_POINTS,
  INITIAL_FACE_TRAVEL_MS,
  INITIAL_SPAWN_INTERVAL_MS,
  LANE_2_UNLOCK_SCORE,
  LANE_3_UNLOCK_SCORE,
  MAX_FACE_SIZE,
  MIN_FACE_TRAVEL_MS,
  MIN_SPAWN_INTERVAL_MS,
  NORMAL_FACE_POINTS,
  POWER_UP_COST,
  POWER_UP_DURATION_MS,
  TICK_MS,
} from '../game/constants';
import { IMAGES } from '../game/images';
import { getBestScore, getDiamonds, isHardMode, setBestScore, setDiamonds } from '../game/storage';
import type { RunState, Spawn, SpawnKind } from '../game/types';

type Props = { onExit: () => void };

/** Where a lane sits vertically. Only lane 0 is used outside Extra Hard. */
function laneTop(lane: number, height: number, size: number): number {
  if (lane === 1) return Math.max(0, height - size - 16);
  if (lane === 2) return 16;
  return Math.max(0, (height - size) / 2);
}

function freshRun(bestScore: number, diamonds: number): RunState {
  return {
    score: 0,
    diamonds,
    bestScore,
    faceTravelMs: INITIAL_FACE_TRAVEL_MS,
    spawnIntervalMs: INITIAL_SPAWN_INTERVAL_MS,
    revivePrice: 1,
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
  const run = useRef<RunState>(freshRun(0, 0));
  const spawns = useRef<Spawn[]>([]);
  const nextId = useRef(0);
  const hardMode = useRef(false);

  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [, repaint] = useReducer((n: number) => n + 1, 0);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);

  const scoreScale = useRef(new Animated.Value(1)).current;
  const goldenFlash = useRef(new Animated.Value(0)).current;
  const gasOpacity = useRef(new Animated.Value(0)).current;
  const loseOpacity = useRef(new Animated.Value(0)).current;

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

  const flashGold = useCallback(() => {
    goldenFlash.setValue(1);
    Animated.timing(goldenFlash, { toValue: 0, duration: 1000, useNativeDriver: true }).start();
  }, [goldenFlash]);

  const knockDown = useCallback(
    (spawn: Spawn) => {
      if (spawn.killed) return;
      spawn.killed = true;
      spawn.killedAt = Date.now();

      const state = run.current;
      if (spawn.kind === 'golden') {
        state.score += GOLDEN_FACE_POINTS;
        state.diamonds += GOLDEN_FACE_DIAMONDS;
        void setDiamonds(state.diamonds);
        playSound('goldenDeath');
        flashGold();
        popScore(3);
      } else {
        state.score += NORMAL_FACE_POINTS;
        playSound('death');
        popScore(2);
      }

      // Every knock-down tightens both timings a little, down to their floors.
      state.faceTravelMs = Math.max(MIN_FACE_TRAVEL_MS, state.faceTravelMs - DIFFICULTY_STEP_MS);
      state.spawnIntervalMs = Math.max(
        MIN_SPAWN_INTERVAL_MS,
        state.spawnIntervalMs - DIFFICULTY_STEP_MS,
      );
      repaint();
    },
    [flashGold, popScore],
  );

  // ------------------------------------------------------------------ losing

  const lose = useCallback(() => {
    const state = run.current;
    if (state.lost) return;
    state.lost = true;
    stopTimers();
    spawns.current = [];
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
    if (bombsAllowed && Math.random() < 1 / BOMB_ODDS) {
      kind = 'bomb';
    } else if (Math.random() < 1 / GOLDEN_FACE_ODDS) {
      kind = 'golden';
    }

    let lane = 0;
    if (hardMode.current) {
      const lanes = [0];
      if (state.score > LANE_2_UNLOCK_SCORE) lanes.push(1);
      if (state.score > LANE_3_UNLOCK_SCORE) lanes.push(2);
      lane = lanes[Math.floor(Math.random() * lanes.length)];
    }

    spawns.current.push({
      id: nextId.current++,
      kind,
      lane,
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
      if (spawn.killed) return now - spawn.killedAt < spawn.travelMs;
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
      const [best, diamonds, hard] = await Promise.all([
        getBestScore(),
        getDiamonds(),
        isHardMode(),
      ]);
      if (cancelled) return;
      run.current = freshRun(best, diamonds);
      hardMode.current = hard;
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

  const spendDiamonds = useCallback((amount: number): boolean => {
    const state = run.current;
    if (state.diamonds < amount) return false;
    state.diamonds -= amount;
    void setDiamonds(state.diamonds);
    return true;
  }, []);

  const useFart = useCallback(() => {
    const state = run.current;
    if (state.lost || Date.now() < state.fartUntil) return;
    if (!spendDiamonds(POWER_UP_COST)) return;
    state.fartUntil = Date.now() + POWER_UP_DURATION_MS;
    playSound('fart');
    repaint();
  }, [spendDiamonds]);

  const useBombRemoval = useCallback(() => {
    const state = run.current;
    if (state.lost || Date.now() < state.noBombsUntil) return;
    if (!spendDiamonds(POWER_UP_COST)) return;
    state.noBombsUntil = Date.now() + POWER_UP_DURATION_MS;
    repaint();
  }, [spendDiamonds]);

  const restart = useCallback(() => {
    run.current = freshRun(run.current.bestScore, run.current.diamonds);
    startRun();
  }, [startRun]);

  const revive = useCallback(() => {
    const state = run.current;
    if (state.diamonds < state.revivePrice) return;
    state.diamonds -= state.revivePrice;
    state.revivePrice += 1;
    void setDiamonds(state.diamonds);
    state.lost = false;
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

  const fartReady = !state.lost && now >= state.fartUntil && state.diamonds >= POWER_UP_COST;
  const bombsReady = !state.lost && now >= state.noBombsUntil && state.diamonds >= POWER_UP_COST;

  return (
    <ImageBackground source={background} resizeMode="cover" style={styles.root} onLayout={onLayout}>
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
            <PowerUpButton label="Fart" enabled={fartReady} onPress={useFart} />
            <PowerUpButton label="No bombs" enabled={bombsReady} onPress={useBombRemoval} />
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
            <Text style={styles.hint}>Knock down golden faces to earn diamonds.</Text>
          )}
          <PillButton label="RESTART" onPress={restart} width={220} fontSize={16} style={styles.loseButton} />
          <PillButton label="MENU" onPress={onExit} width={220} fontSize={16} style={styles.loseButton} />
        </Animated.View>
      )}
    </ImageBackground>
  );
}

function PowerUpButton({
  label,
  enabled,
  onPress,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.powerUp, !enabled && styles.powerUpDisabled]}
    >
      <Text style={styles.powerUpLabel}>{label}</Text>
    </Pressable>
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
  goldFlash: {
    backgroundColor: '#ffb74d',
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
    bottom: 58,
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
    gap: 10,
  },
  powerUp: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  powerUpDisabled: {
    opacity: 0.35,
  },
  powerUpLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
