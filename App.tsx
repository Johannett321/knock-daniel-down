import { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { loadSounds, unloadSounds } from './src/game/audio';
import { MAX_PLAY_WIDTH } from './src/game/constants';
import { CreditsScreen } from './src/screens/CreditsScreen';
import { GameScreen } from './src/screens/GameScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { MenuScreen } from './src/screens/MenuScreen';

type Screen = 'loading' | 'menu' | 'game' | 'credits';

/**
 * There are only four screens and every move between them is a plain
 * replacement, so the app tracks the current one in state rather than pulling
 * in a navigation library. This also keeps the web build free of any routing
 * configuration — it is a game, not a site.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');

  useEffect(() => {
    loadSounds();
    return unloadSounds;
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {/*
        On a phone this fills the screen. In a desktop browser it becomes a
        centred, phone-shaped column, because a game built around faces
        crossing a narrow screen does not work stretched to 2000px wide.
      */}
      <View style={styles.frame}>
        {screen === 'loading' && <LoadingScreen onDone={() => setScreen('menu')} />}
        {screen === 'menu' && (
          <MenuScreen onPlay={() => setScreen('game')} onCredits={() => setScreen('credits')} />
        )}
        {screen === 'game' && <GameScreen onExit={() => setScreen('menu')} />}
        {screen === 'credits' && <CreditsScreen onBack={() => setScreen('menu')} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? MAX_PLAY_WIDTH : undefined,
    overflow: 'hidden',
  },
});
