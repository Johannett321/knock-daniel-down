import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, type ImageSourcePropType } from 'react-native';

type Props = {
  /** Where the head was hit, in play-area coordinates. */
  x: number;
  y: number;
  /** How big the head was; everything here is sized from it. */
  size: number;
  /** What gets thrown. */
  image: ImageSourcePropType;
  /** How many. */
  count: number;
  /** How far they travel, as a multiple of the head's size. */
  reach: number;
  /** How far gravity drags them over the flight, against that reach. */
  gravity: number;
  durationMs: number;
  /** Each particle's size, as a fraction of the head's. */
  scale: number;
  /** An optional flash of rays behind the shower. */
  rays?: { count: number; color: string };
};

/**
 * Things thrown outwards from the point a head was hit.
 *
 * The whole burst runs off one animated value between 0 and 1, interpolated
 * per particle. That keeps it on the native driver however many are in
 * flight, and means a big shower costs no more to animate than a small one.
 *
 * It is drawn at the point of contact and does not follow the head, which is
 * knocked away from that point the instant it is hit. Mount it with a key
 * that changes per hit so it replays.
 */
export function ParticleBurst({
  x,
  y,
  size,
  image,
  count,
  reach,
  gravity,
  durationMs,
  scale,
  rays,
}: Props) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const particleSize = size * scale;
  const distance = size * reach;

  /**
   * Fixed at mount so the shower does not reshuffle on every repaint. Spread
   * evenly around the circle and then jittered, which scatters better than
   * pure randomness — that leaves gaps and clumps.
   */
  const particles = useMemo(
    () =>
      Array.from({ length: Math.max(1, count) }, (_, index) => {
        const angle = ((index + Math.random() * 0.8) / Math.max(1, count)) * Math.PI * 2;
        const travel = distance * (0.55 + Math.random() * 0.65);
        return {
          key: index,
          dx: Math.cos(angle) * travel,
          dy: Math.sin(angle) * travel,
          spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
          delay: Math.random() * 0.12,
        };
      }),
    [count, distance],
  );

  const rayAngles = useMemo(
    () =>
      rays ? Array.from({ length: rays.count }, (_, i) => (i * 360) / rays.count) : [],
    [rays?.count],
  );

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { left: x, top: y }]}>
      {/* Gone well before the shower lands. */}
      {rays &&
        rayAngles.map((angle) => (
          <Animated.View
            key={`ray-${angle}`}
            pointerEvents="none"
            style={[
              styles.ray,
              {
                width: size * 0.05,
                height: distance * 0.75,
                backgroundColor: rays.color,
                opacity: t.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.9, 0.5, 0] }),
                transform: [
                  // Radial layout: turn the frame first, then push outwards
                  // along it. The other order spins each ray where it stands.
                  { rotate: `${angle}deg` },
                  {
                    translateY: t.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-distance * 0.2, -distance * 0.75],
                    }),
                  },
                  { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                ],
              },
            ]}
          />
        ))}

      {particles.map((particle) => (
        <Animated.View
          key={particle.key}
          pointerEvents="none"
          style={[
            styles.particle,
            {
              width: particleSize,
              height: particleSize,
              marginLeft: -particleSize / 2,
              marginTop: -particleSize / 2,
              opacity: t.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.95, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dx] }) },
                {
                  // Thrown out, then pulled down: the outward travel eases off
                  // while gravity keeps adding, so each one arcs.
                  translateY: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, particle.dy + distance * gravity],
                  }),
                },
                {
                  rotate: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${particle.spin}deg`],
                  }),
                },
                {
                  scale: t.interpolate({
                    inputRange: [0, particle.delay + 0.2, 1],
                    outputRange: [0.2, 1.15, 0.75],
                  }),
                },
              ],
            },
          ]}
        >
          <Image source={image} resizeMode="contain" style={styles.image} />
        </Animated.View>
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
  ray: {
    position: 'absolute',
    borderRadius: 999,
  },
  particle: {
    position: 'absolute',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
