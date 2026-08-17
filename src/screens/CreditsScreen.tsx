import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { PillButton } from '../components/PillButton';
import { APP_VERSION, LANE_2_UNLOCK_SCORE, LANE_3_UNLOCK_SCORE } from '../game/constants';
import { IMAGES } from '../game/images';
import { getBestScore, isHardMode, resetBestScore, setHardMode } from '../game/storage';

type Props = { onBack: () => void };

/**
 * Credits and settings. The original called this screen "Credits" even though
 * it holds the settings too, and the name has been kept.
 */
export function CreditsScreen({ onBack }: Props) {
  const [hardMode, setHardModeState] = useState(false);
  const [bestScore, setBestScoreState] = useState(0);
  const [justReset, setJustReset] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [hard, best] = await Promise.all([isHardMode(), getBestScore()]);
      if (cancelled) return;
      setHardModeState(hard);
      setBestScoreState(best);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleHardMode = (value: boolean) => {
    setHardModeState(value);
    void setHardMode(value);
  };

  const onReset = () => {
    void resetBestScore();
    setBestScoreState(0);
    setJustReset(true);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backHit}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.topTitle}>Credits</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={IMAGES.logo} resizeMode="contain" style={styles.logo} />
        <Image source={IMAGES.studioLogo} resizeMode="contain" style={styles.studioLogo} />

        <Text style={styles.name}>Daniel Opsahl Martinsen</Text>
        <Text style={styles.name}>Johan Svartdal</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Extra hard</Text>
          <Switch value={hardMode} onValueChange={toggleHardMode} />
        </View>
        <Text style={styles.settingHint}>
          Adds a second lane at {LANE_2_UNLOCK_SCORE} points and a third at {LANE_3_UNLOCK_SCORE}.
        </Text>

        <Text style={styles.bestScore}>Best score: {bestScore}</Text>
        <PillButton label="RESET SCORE" onPress={onReset} width={220} fontSize={16} />
        {justReset && <Text style={styles.settingHint}>Best score cleared.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    height: 50,
    backgroundColor: '#ffb74d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  backHit: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  backText: {
    color: '#ffffff',
    fontSize: 18,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 6,
  },
  logo: {
    width: 260,
    height: 110,
  },
  studioLogo: {
    width: 220,
    height: 56,
    marginBottom: 8,
  },
  name: {
    color: '#111111',
    fontSize: 24,
  },
  version: {
    color: '#555555',
    fontSize: 15,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    color: '#111111',
    fontSize: 18,
  },
  settingHint: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  bestScore: {
    color: '#111111',
    fontSize: 18,
    marginTop: 8,
    marginBottom: 6,
  },
});
