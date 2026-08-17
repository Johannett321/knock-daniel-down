import { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, View } from 'react-native';

import { PillButton } from '../components/PillButton';
import { IMAGES } from '../game/images';

type Props = {
  onPlay: () => void;
  onCredits: () => void;
};

/**
 * The main menu. There were three buttons here originally; the middle one
 * opened the diamond store, which no longer exists.
 */
export function MenuScreen({ onPlay, onCredits }: Props) {
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <ImageBackground source={IMAGES.menuBackground} resizeMode="cover" style={styles.root}>
      <View style={styles.logoBox}>
        <Image source={IMAGES.logo} resizeMode="contain" style={styles.logo} />
      </View>

      <View style={styles.buttons}>
        <Animated.View style={{ transform: [{ scaleX: breathe }] }}>
          <PillButton label="PLAY" onPress={onPlay} />
        </Animated.View>
        <PillButton label="CREDITS" onPress={onCredits} style={styles.spaced} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '85%',
    height: '70%',
  },
  buttons: {
    flex: 1,
    alignItems: 'center',
  },
  spaced: {
    marginTop: 12,
  },
});
