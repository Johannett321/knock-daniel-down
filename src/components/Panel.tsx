import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

type Props = {
  /** Small orange heading above the card. Omit it for an unlabelled card. */
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * A titled card on the dark menu background.
 *
 * The settings and credits screens are both lists of small groups, and this
 * keeps those groups looking the same on each.
 */
export function Panel({ title, children, style }: Props) {
  return (
    <View style={styles.wrapper}>
      {title !== undefined && <Text style={styles.title}>{title.toUpperCase()}</Text>}
      <View style={[styles.card, style]}>{children}</View>
    </View>
  );
}

/** A divider between rows inside a panel. */
export function PanelDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 18,
  },
  title: {
    color: '#ffb74d',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
