import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet } from 'react-native';

import { IMAGES } from '../game/images';
import type { Spawn } from '../game/types';

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
  if (spawn.kind === 'golden') return IMAGES.faceGolden;
  return IMAGES.face;
}

/**
 * One face or bomb sliding across the play area.
 *
 * The horizontal slide is a single linear animation started on mount, matching
 * the timing the rules engine assumes. Knocking one down does not stop that
 * slide; it adds a downward fall on top of it, exactly as the original did.
 */
export function Face({ spawn, size, areaWidth, areaHeight, top, onTap }: Props) {
  const translateX = useRef(new Animated.Value(-size)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Time already spent in flight, so a re-mount does not restart the slide.
    const elapsed = Date.now() - spawn.startedAt;
    const remaining = Math.max(0, spawn.travelMs - elapsed);
    const distance = areaWidth + size;
    translateX.setValue(-size + (elapsed / spawn.travelMs) * distance);

    const slide = Animated.timing(translateX, {
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
    const fall = Animated.timing(translateY, {
      toValue: areaHeight,
      duration: spawn.travelMs / 2,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    fall.start();
    return () => fall.stop();
  }, [spawn.killed, areaHeight]);

  return (
    <Animated.View
      pointerEvents={spawn.killed ? 'none' : 'auto'}
      style={[styles.container, { top, width: size, height: size, transform: [{ translateX }, { translateY }] }]}
    >
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
