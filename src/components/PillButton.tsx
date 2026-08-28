import { useRef } from 'react';
import { Animated, ImageBackground, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { playSound } from '../game/audio';
import {
  BUTTON_HOVER_LIFT,
  BUTTON_HOVER_MS,
  BUTTON_HOVER_SCALE,
  BUTTON_PRESS_SCALE,
} from '../game/constants';
import { IMAGES } from '../game/images';

type Props = {
  label: string;
  onPress: () => void;
  /** A disabled button dims and stops responding, but still reads clearly. */
  disabled?: boolean;
  width?: number;
  height?: number;
  fontSize?: number;
  style?: ViewStyle;
};

/**
 * The game's menu button: the original pill artwork with a label on top.
 *
 * Pressing it plays the same squash-and-release the 2017 build used, except
 * that there the navigation was chained onto the end of the animation. Here
 * the press fires immediately and the animation is purely decorative, so the
 * UI never feels like it is lagging behind the tap.
 *
 * The click is played from here rather than by each caller, so every button
 * in the game sounds the same without anyone having to remember.
 */
export function PillButton({
  label,
  onPress,
  disabled = false,
  width = 200,
  height = 60,
  fontSize = 20,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  /**
   * Whether the pointer is still over the button, so releasing a press
   * settles back to the hover size rather than dropping all the way to rest
   * while the cursor is sitting on it.
   */
  const hovered = useRef(false);

  const pop = (to: number) =>
    Animated.timing(scale, { toValue: to, duration: 100, useNativeDriver: true }).start();

  const setLift = (to: number) =>
    Animated.timing(lift, {
      toValue: to,
      duration: BUTTON_HOVER_MS,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      // Hover only ever fires on the web; on a touchscreen these never run.
      onHoverIn={() => {
        hovered.current = true;
        pop(BUTTON_HOVER_SCALE);
        setLift(-BUTTON_HOVER_LIFT);
      }}
      onHoverOut={() => {
        hovered.current = false;
        pop(1);
        setLift(0);
      }}
      onPressIn={() => {
        // On the press, not the release: the sound should land with the
        // finger, the same way the squash does.
        playSound('button');
        pop(BUTTON_PRESS_SCALE);
      }}
      onPressOut={() => pop(hovered.current ? BUTTON_HOVER_SCALE : 1)}
      onPress={onPress}
      style={[styles.pressable, style]}
    >
      <Animated.View
        style={{ transform: [{ scale }, { translateY: lift }], opacity: disabled ? 0.45 : 1 }}
      >
        <ImageBackground
          source={IMAGES.button}
          resizeMode="stretch"
          style={[styles.background, { width, height }]}
        >
          <Text style={[styles.label, { fontSize }]} numberOfLines={1}>
            {label}
          </Text>
        </ImageBackground>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    // Web only; ignored on iOS and Android.
    cursor: 'pointer',
  },
  background: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
