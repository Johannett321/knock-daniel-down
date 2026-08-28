import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Panel, PanelDivider } from '../components/Panel';
import { PillButton } from '../components/PillButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { setMusicEnabled, setSoundEnabled } from '../game/audio';
import { APP_VERSION, LANE_2_UNLOCK_SCORE, LANE_3_UNLOCK_SCORE } from '../game/constants';
import { IMAGES } from '../game/images';
import {
  getBestScore,
  getDiamonds,
  getMusicEnabled,
  getSoundEnabled,
  resetBestScore,
  saveMusicEnabled,
  saveSoundEnabled,
} from '../game/storage';

type Props = { onBack: () => void };

/** Who made the game, and what they did. */
const PEOPLE = [
  { name: 'Johan Svartdal', role: 'Code and design' },
  { name: 'Daniel Opsahl Martinsen', role: 'The face' },
];

/**
 * Settings: the audio toggles, saved progress, and the credits.
 *
 * The 2017 build called this screen "Credits" and hid the settings at the
 * bottom of it. This is the same pairing the other way round — the credits
 * are a section you scroll to, and the menu button says what the screen is
 * mostly for.
 */
export function SettingsScreen({ onBack }: Props) {
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [bestScore, setBestScoreState] = useState(0);
  const [diamonds, setDiamondsState] = useState(0);
  /** Resetting is destructive and silent, so it takes a second press. */
  const [confirming, setConfirming] = useState(false);
  const [justReset, setJustReset] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [soundOn, musicOn, best, gems] = await Promise.all([
        getSoundEnabled(),
        getMusicEnabled(),
        getBestScore(),
        getDiamonds(),
      ]);
      if (cancelled) return;
      setSound(soundOn);
      setMusic(musicOn);
      setBestScoreState(best);
      setDiamondsState(gems);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Both are applied to the live players first, so the change is audible
  // immediately rather than on the next launch.
  const toggleSound = (value: boolean) => {
    setSound(value);
    setSoundEnabled(value);
    void saveSoundEnabled(value);
  };

  const toggleMusic = (value: boolean) => {
    setMusic(value);
    setMusicEnabled(value);
    void saveMusicEnabled(value);
  };

  const onResetPress = () => {
    if (!confirming) {
      setConfirming(true);
      setJustReset(false);
      return;
    }
    void resetBestScore();
    setBestScoreState(0);
    setConfirming(false);
    setJustReset(true);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Audio">
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Sound effects</Text>
              <Text style={styles.rowHint}>Hits, misses and the fart.</Text>
            </View>
            <Switch
              value={sound}
              onValueChange={toggleSound}
              accessibilityLabel="Sound effects"
              trackColor={{ true: '#ffb74d', false: 'rgba(255, 255, 255, 0.2)' }}
              thumbColor="#ffffff"
            />
          </View>
          <PanelDivider />
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Music</Text>
              <Text style={styles.rowHint}>Loops on the menus and during a run.</Text>
            </View>
            <Switch
              value={music}
              onValueChange={toggleMusic}
              accessibilityLabel="Music"
              trackColor={{ true: '#ffb74d', false: 'rgba(255, 255, 255, 0.2)' }}
              thumbColor="#ffffff"
            />
          </View>
        </Panel>

        <Panel title="Progress">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Best score</Text>
            <Text style={styles.rowValue}>{bestScore}</Text>
          </View>
          <PanelDivider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Diamonds</Text>
            <View style={styles.diamondValue}>
              <Image source={IMAGES.diamond} style={styles.diamondIcon} resizeMode="contain" />
              <Text style={styles.rowValue}>{diamonds}</Text>
            </View>
          </View>
        </Panel>

        <View style={styles.resetBox}>
          <PillButton
            label={confirming ? 'TAP AGAIN TO CONFIRM' : 'RESET BEST SCORE'}
            onPress={onResetPress}
            width={260}
            fontSize={confirming ? 13 : 15}
          />
          <Text style={styles.note}>
            {confirming
              ? 'This clears your best score. Diamonds are kept.'
              : justReset
                ? 'Best score cleared.'
                : 'Diamonds are never reset — they are earned, not bought.'}
          </Text>
        </View>

        <Panel title="How it gets harder">
          <View style={styles.block}>
            <Text style={styles.rowHint}>
              Every knock-down makes the faces cross faster and arrive sooner. A second lane
              opens at {LANE_2_UNLOCK_SCORE} points and a third at {LANE_3_UNLOCK_SCORE}.
            </Text>
          </View>
        </Panel>

        <Panel title="Made by">
          {PEOPLE.map((person, index) => (
            <View key={person.name}>
              {index > 0 && <PanelDivider />}
              <View style={styles.block}>
                <Text style={styles.rowLabel}>{person.name}</Text>
                <Text style={styles.personRole}>{person.role}</Text>
              </View>
            </View>
          ))}
        </Panel>

        <Panel title="Artwork and sound">
          <View style={styles.block}>
            <Text style={styles.rowHint}>
              Every face, background and sound effect is from the original 2017 build. The
              photographs are of Daniel, used with his involvement in that project.
            </Text>
          </View>
        </Panel>

        <Panel title="No payments, no tracking">
          <View style={styles.block}>
            <Text style={styles.rowHint}>
              Diamonds used to be sold for real money. They are earned by knocking down golden
              faces now. The game has no ads, no analytics and no crash reporting, and makes no
              network requests of its own.
            </Text>
          </View>
        </Panel>

        <View style={styles.footer}>
          <Image source={IMAGES.faceSmile} resizeMode="contain" style={styles.smile} />
          <Text style={styles.version}>Version {APP_VERSION}</Text>
          <Text style={styles.footnote}>
            Everything you do is stored on this device only. Source code under the MIT licence;
            the artwork is not.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#12100e',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  block: {
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 17,
  },
  rowHint: {
    color: '#9b948c',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  rowValue: {
    color: '#ffb74d',
    fontSize: 20,
    fontWeight: '800',
  },
  diamondValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diamondIcon: {
    width: 18,
    height: 18,
  },
  resetBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  note: {
    color: '#9b948c',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  personRole: {
    color: '#ffb74d',
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 4,
  },
  smile: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  version: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  footnote: {
    color: '#6f6a64',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
