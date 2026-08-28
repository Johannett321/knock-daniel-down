import { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import {
  loadSounds,
  playMusic,
  resumeMusic,
  setMusicEnabled,
  setSoundEnabled,
  unloadSounds,
} from './src/game/audio';
import { MAX_PLAY_WIDTH } from './src/game/constants';
import { getMusicEnabled, getSoundEnabled } from './src/game/storage';
import { GameScreen } from './src/screens/GameScreen';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StoreScreen } from './src/screens/StoreScreen';

type Screen = 'loading' | 'menu' | 'game' | 'store' | 'settings';

/**
 * There are only five screens and every move between them is a plain
 * replacement, so the app tracks the current one in state rather than pulling
 * in a navigation library. This also keeps the web build free of any routing
 * configuration — it is a game, not a site.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');

  useEffect(() => {
    loadSounds();
    // The saved toggles are applied once, here, rather than checked on each play.
    void getSoundEnabled().then(setSoundEnabled);
    void getMusicEnabled().then(setMusicEnabled);
    return unloadSounds;
  }, []);

  /**
   * Music follows the screen: one track for a run, another for everything
   * around it. Settings and credits are menu screens, so the menu loop simply
   * carries on across them rather than restarting each time.
   */
  useEffect(() => {
    if (screen === 'loading') return;
    playMusic(screen === 'game' ? 'game' : 'menu');
  }, [screen]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar hidden />
      {/*
        On a phone this fills the screen. In a desktop browser it becomes a
        centred, phone-shaped column, because a game built around faces
        crossing a narrow screen does not work stretched to 2000px wide.
      */}
      {/*
        This hook is only for the web: browsers refuse to start audio until
        the page has been interacted with, so if the splash times out on its
        own the menu loop never gets going. Returning false observes the
        gesture without claiming it, which `onTouchStart` cannot do here —
        react-native-web does not fire that one for a mouse. On native the
        music is already playing and this does nothing.
      */}
      <View
        style={styles.frame}
        onStartShouldSetResponder={() => {
          resumeMusic();
          return false;
        }}
      >
        {screen === 'loading' && <LoadingScreen onDone={() => setScreen('menu')} />}
        {screen === 'menu' && (
          <MenuScreen
            onPlay={() => setScreen('game')}
            onStore={() => setScreen('store')}
            onSettings={() => setScreen('settings')}
          />
        )}
        {screen === 'game' && <GameScreen onExit={() => setScreen('menu')} />}
        {screen === 'store' && <StoreScreen onBack={() => setScreen('menu')} />}
        {screen === 'settings' && <SettingsScreen onBack={() => setScreen('menu')} />}
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
