import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageBackground, StyleSheet, View } from 'react-native';

import { PillButton } from '../components/PillButton';
import {
  MENU_BUTTON_STAGGER_MS,
  MENU_POP_MS,
  MENU_POP_OVERSHOOT,
  MENU_LOGO_DROP_MS,
} from '../game/constants';
import { IMAGES } from '../game/images';

type Props = {
  onPlay: () => void;
  onStore: () => void;
  onSettings: () => void;
};

/**
 * The main menu. There were three buttons here originally; the middle one
 * opened the diamond store, and a store — one that takes diamonds and not
 * money — has taken its place.
 *
 * Everything on the screen arrives rather than simply being there: the logo
 * drops in and settles, then each button balloons up in turn.
 */
export function MenuScreen({ onPlay, onStore, onSettings }: Props) {
  const breathe = useRef(new Animated.Value(1)).current;
  const logo = useRef(new Animated.Value(0)).current;
  /** One per button, in the order they appear. */
  const pops = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const entrance = Animated.sequence([
      Animated.timing(logo, {
        toValue: 1,
        duration: MENU_LOGO_DROP_MS,
        // A back-out curve: it overshoots and settles, the way something
        // dropped on a spring does.
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.stagger(
        MENU_BUTTON_STAGGER_MS,
        pops.map((pop) =>
          Animated.spring(pop, {
            toValue: 1,
            // Low friction and low tension is what makes it read as a balloon
            // rather than a slide: it arrives fast, overshoots, and wobbles.
            friction: 4,
            tension: 70,
            useNativeDriver: true,
          }),
        ),
      ),
    ]);
    entrance.start();

    // The idle breathe on PLAY only starts once everything has landed, so it
    // does not fight the entrance.
    const idle = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );
    const idleTimer = setTimeout(
      () => idle.start(),
      MENU_LOGO_DROP_MS + MENU_BUTTON_STAGGER_MS * pops.length + MENU_POP_MS,
    );

    return () => {
      entrance.stop();
      idle.stop();
      clearTimeout(idleTimer);
    };
  }, []);

  /** Scale, offset and fade for a button that is ballooning into place. */
  const popStyle = (index: number) => ({
    opacity: pops[index],
    transform: [
      { scale: pops[index].interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
      {
        translateY: pops[index].interpolate({
          inputRange: [0, 1],
          outputRange: [MENU_POP_OVERSHOOT, 0],
        }),
      },
    ],
  });

  return (
    <ImageBackground source={IMAGES.menuBackground} resizeMode="cover" style={styles.root}>
      <View style={styles.logoBox}>
        <Animated.Image
          source={IMAGES.logo}
          resizeMode="contain"
          style={[
            styles.logo,
            {
              opacity: logo,
              transform: [
                { translateY: logo.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) },
                { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
              ],
            },
          ]}
        />
      </View>

      <View style={styles.buttons}>
        <Animated.View style={popStyle(0)}>
          <Animated.View style={{ transform: [{ scaleX: breathe }] }}>
            <PillButton label="PLAY" onPress={onPlay} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.spaced, popStyle(1)]}>
          <PillButton label="STORE" onPress={onStore} />
        </Animated.View>
        <Animated.View style={[styles.spaced, popStyle(2)]}>
          <PillButton label="SETTINGS" onPress={onSettings} />
        </Animated.View>
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
