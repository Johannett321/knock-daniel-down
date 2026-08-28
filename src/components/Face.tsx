import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet } from 'react-native';

import {
  HIT_FALL_MAX_MS,
  HIT_FALL_MIN_MS,
  HIT_KNOCKBACK_RATIO,
  HIT_POP_HEIGHT_RATIO,
  HIT_POP_MS,
  HIT_PUNCH_MS,
  HIT_PUNCH_SCALE,
  HIT_SPIN_DEGREES,
} from '../game/constants';
import { faceById } from '../game/faces';
import { IMAGES } from '../game/images';
import type { Spawn } from '../game/types';
import { LightRays } from './LightRays';

type Props = {
  spawn: Spawn;
  size: number;
  areaWidth: number;
  areaHeight: number;
  top: number;
  onTap: (spawn: Spawn) => void;
};

function imageFor(spawn: Spawn) {
  if (spawn.killed) return IMAGES.faceDead;
  if (spawn.kind === 'bomb') return IMAGES.bomb;
  // The head was chosen from what the player owns when the face spawned; the
  // fallback only matters if saved data names a head that no longer exists.
  return faceById(spawn.faceId)?.image ?? IMAGES.face;
}

/**
 * One face or bomb sliding across the play area.
 *
 * The horizontal slide is a single linear animation started on mount, matching
 * the timing the rules engine assumes. Knocking one down never touches that
 * slide — the hit is layered on top of it, so the rules can go on working out
 * where anything is from arithmetic alone.
 *
 * That hit is four animations running together, and all of them are transforms
 * so the whole thing stays on the native driver:
 *
 *   - a punch outwards and back, which is what registers as contact;
 *   - a kick up out of the lane, then a fall under gravity;
 *   - a shove onwards, so the tap reads as having landed from behind;
 *   - a tumble, in a direction picked when the face spawned.
 */
export function Face({ spawn, size, areaWidth, areaHeight, top, onTap }: Props) {
  const slideX = useRef(new Animated.Value(-size)).current;
  const knockbackX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const punch = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  /** Which way this one tumbles. Fixed per face, so it never looks scripted. */
  const spinDirection = useRef(Math.random() < 0.5 ? -1 : 1).current;

  // The slide and the shove are independent, so they are summed rather than
  // stacked as two transform entries.
  const translateX = useMemo(() => Animated.add(slideX, knockbackX), [slideX, knockbackX]);
  const rotate = useMemo(
    () =>
      spin.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${spinDirection * HIT_SPIN_DEGREES}deg`],
      }),
    [spin, spinDirection],
  );

  useEffect(() => {
    // Time already spent in flight, so a re-mount does not restart the slide.
    const elapsed = Date.now() - spawn.startedAt;
    const remaining = Math.max(0, spawn.travelMs - elapsed);
    const distance = areaWidth + size;
    slideX.setValue(-size + (elapsed / spawn.travelMs) * distance);

    const slide = Animated.timing(slideX, {
      toValue: areaWidth,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    slide.start();
    return () => slide.stop();
  }, [spawn.id, areaWidth, size]);

  useEffect(() => {
    if (!spawn.killed) return;

    // Clamped at both ends: fast runs should not turn the hit into a blur,
    // and slow ones should not leave it floating. Either way the whole thing
    // finishes inside the `travelMs` the rules engine waits before dropping
    // the spawn.
    const fallMs = Math.min(
      HIT_FALL_MAX_MS,
      Math.max(HIT_FALL_MIN_MS, spawn.travelMs / 2),
    );

    const hit = Animated.parallel([
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -size * HIT_POP_HEIGHT_RATIO,
          duration: HIT_POP_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: areaHeight,
          duration: fallMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(punch, {
          toValue: HIT_PUNCH_SCALE,
          duration: HIT_PUNCH_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(punch, {
          toValue: 1,
          duration: HIT_PUNCH_MS * 2,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(knockbackX, {
        toValue: size * HIT_KNOCKBACK_RATIO,
        duration: HIT_POP_MS + 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(spin, {
        toValue: 1,
        duration: HIT_POP_MS + fallMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);

    hit.start();
    return () => hit.stop();
  }, [spawn.killed, areaHeight, size]);

  return (
    <Animated.View
      pointerEvents={spawn.killed ? 'none' : 'auto'}
      style={[
        styles.container,
        {
          top,
          width: size,
          height: size,
          // Translate first, then rotate and scale about the face's own centre.
          transform: [{ translateX }, { translateY }, { rotate }, { scale: punch }],
        },
      ]}
    >
      {/*
        Behind the pressable, so it cannot swallow the tap the way the
        full-bleed effects would, and gone the moment the head is hit.
      */}
      {spawn.kind === 'diamond' && !spawn.killed && <LightRays size={size} />}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spawn.kind === 'bomb' ? 'Bomb' : 'Face'}
        // Both handlers are wired on purpose. On iOS and Android `onPressIn`
        // fires on touch-down, which is what a tap-to-hit game needs. On the
        // web that handler does not fire — react-native-web routes presses
        // through a click handler — so `onPress` is what lands there. Acting
        // twice is harmless: knocking down an already-dead face is a no-op.
        onPressIn={() => onTap(spawn)}
        onPress={() => onTap(spawn)}
        style={styles.pressable}
      >
        <Image source={imageFor(spawn)} style={styles.image} resizeMode="contain" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
  },
  pressable: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
