import { useRef } from 'react';
import { Animated, ImageBackground, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

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

  const pop = (to: number) =>
    Animated.timing(scale, { toValue: to, duration: 100, useNativeDriver: true }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => pop(1.1)}
      onPressOut={() => pop(1)}
      onPress={onPress}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.45 : 1 }}>
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
