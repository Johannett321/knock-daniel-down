import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { GOLD_RING_COUNT, GOLD_RING_MS, GOLD_RING_REACH, GOLD_RING_STAGGER } from '../game/constants';

type Props = {
  /** Where the face was hit, in play-area coordinates. */
  x: number;
  y: number;
  /** How big the face was, so the rings scale with it. */
  size: number;
};

/**
 * Rings thrown outwards where a golden face was hit.
 *
 * This replaces a wash of gold over the whole play area. That version read as
 * the screen glitching rather than as a reward — it blanked everything every
 * tenth face — and toning it down far enough to stop doing that left nothing
 * worth seeing. Putting the whole effect at the point of contact makes it
 * bigger and louder than the tint ever was while leaving the rest of the play
 * area alone.
 *
 * Rings leave in turn rather than together, which reads as one shockwave
 * rolling out instead of a single fat circle. As with the diamond shower, one
 * animated value drives all of them, so it stays on the native driver.
 *
 * Mount it with a key that changes per hit so it replays.
 */
export function GoldenRings({ x, y, size }: Props) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: GOLD_RING_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const base = size * GOLD_RING_REACH;
  const core = size * 0.9;

  /** Each ring's slice of the animation, offset so they leave one after another. */
  const rings = useMemo(
    () =>
      Array.from({ length: GOLD_RING_COUNT }, (_, index) => {
        const start = index * GOLD_RING_STAGGER;
        return { key: index, start, end: Math.min(1, start + (1 - GOLD_RING_STAGGER)) };
      }),
    [],
  );

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { left: x, top: y }]}>
      {/* A bright disc at the moment of contact, for the rings to roll out of. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.core,
          {
            width: core,
            height: core,
            borderRadius: core / 2,
            marginLeft: -core / 2,
            marginTop: -core / 2,
            opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0, 0] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 1.2] }) }],
          },
        ]}
      />

      {rings.map((ring) => (
        <Animated.View
          key={ring.key}
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: base,
              height: base,
              borderRadius: base / 2,
              marginLeft: -base / 2,
              marginTop: -base / 2,
              // Held at nothing until this ring's turn, then out and gone.
              opacity: t.interpolate({
                inputRange: [0, ring.start, ring.start + 0.05, ring.end, 1],
                outputRange: [0, 0, 0.95, 0, 0],
              }),
              transform: [
                {
                  scale: t.interpolate({
                    inputRange: [0, ring.start, ring.end, 1],
                    outputRange: [0.2, 0.2, 1, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 10,
    borderColor: '#ffb020',
  },
  core: {
    position: 'absolute',
    backgroundColor: '#ffd24d',
  },
});
