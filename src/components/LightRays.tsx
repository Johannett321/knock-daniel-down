import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { RAY_COUNT, RAY_SPIN_MS, RAY_PULSE_MS } from '../game/constants';

type Props = {
  /** The face this sits behind; the rays are sized from it. */
  size: number;
};

/**
 * The halo behind a diamond head: a wheel of tapered rays that turns slowly
 * and breathes, so the rarest thing on screen announces itself before it is
 * close enough to read.
 *
 * Rays are plain views rotated into place rather than an image, which keeps
 * the whole thing on the native driver and costs nothing to retint. It is
 * purely decorative and must never take a touch — it sits behind the face's
 * own pressable, and is marked `none` besides.
 */
export function LightRays({ size }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const turning = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: RAY_SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: RAY_PULSE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: RAY_PULSE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    turning.start();
    breathing.start();
    return () => {
      turning.stop();
      breathing.stop();
    };
  }, []);

  const rays = useMemo(
    () => Array.from({ length: RAY_COUNT }, (_, index) => (index * 360) / RAY_COUNT),
    [],
  );

  const reach = size * 1.5;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        {
          width: reach,
          height: reach,
          left: (size - reach) / 2,
          top: (size - reach) / 2,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] }),
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) },
          ],
        },
      ]}
    >
      {rays.map((angle) => (
        <View
          key={angle}
          pointerEvents="none"
          style={[
            styles.ray,
            {
              width: reach * 0.05,
              height: reach / 2,
              // Order matters: turn the frame first, then push the ray out
              // along it. Translating first would move the ray and then spin
              // it where it stands, which fans them all to one side instead
              // of spacing them around the wheel.
              transform: [{ rotate: `${angle}deg` }, { translateY: -reach / 4 }],
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    backgroundColor: '#8ed8ff',
    borderRadius: 999,
  },
});
