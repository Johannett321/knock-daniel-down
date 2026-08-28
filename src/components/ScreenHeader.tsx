import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { playSound } from '../game/audio';

type Props = {
  title: string;
  onBack: () => void;
};

/**
 * The bar at the top of the two menu sub-screens.
 *
 * Both screens had their own copy of this; it lives here so the back button
 * sits in the same place with the same hit area on each of them.
 */
export function ScreenHeader({ title, onBack }: Props) {
  /** Web only: nothing hovers on a touchscreen. */
  const [hovered, setHovered] = useState(false);

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => playSound('button')}
        onPress={onBack}
        style={({ pressed }) => [styles.backHit, pressed && styles.backPressed]}
      >
        <Text style={[styles.backText, hovered && styles.backHovered]}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    backgroundColor: '#ffb74d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backHit: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 16,
    justifyContent: 'center',
    zIndex: 1,
    cursor: 'pointer',
  },
  backPressed: {
    opacity: 0.6,
  },
  backText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  backHovered: {
    // A nudge in the direction it takes you, which is clearer on a bar this
    // colour than trying to brighten white text on orange.
    transform: [{ translateX: -3 }],
    opacity: 0.85,
  },
});
