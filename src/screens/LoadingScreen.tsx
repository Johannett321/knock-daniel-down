import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { IMAGES } from '../game/images';

type Props = { onDone: () => void };

/**
 * The splash sequence, in three beats: the studio logo fades up and away, the
 * title card appears on black, and then the portrait behind it is revealed.
 *
 * The original chained this through four levels of nested animation callbacks.
 * Here it is one declarative sequence, and a tap anywhere skips it.
 */
export function LoadingScreen({ onDone }: Props) {
  const studio = useRef(new Animated.Value(0)).current;
  const titleCard = useRef(new Animated.Value(0)).current;
  const portrait = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.timing(studio, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(studio, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(titleCard, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(portrait, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.delay(900),
    ]);
    sequence.start(({ finished: completed }) => {
      if (completed) finish();
    });
    return () => sequence.stop();
  }, []);

  return (
    <View style={styles.root} onTouchStart={finish}>
      <Animated.Image
        source={IMAGES.loadingLogo}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { opacity: titleCard }]}
      />
      <Animated.Image
        source={IMAGES.loadingFull}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { opacity: portrait }]}
      />
      <Animated.Image
        source={IMAGES.studioLogo}
        resizeMode="contain"
        style={[styles.studio, { opacity: studio }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studio: {
    width: '70%',
    height: 80,
  },
});
