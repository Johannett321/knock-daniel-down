import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * The game's five sound effects, held as long-lived players so a hit can be
 * replayed instantly by seeking back to the start.
 *
 * Every call here is best-effort. Browsers refuse to play audio before the
 * page has had a user gesture, and a silent game is much better than a crash,
 * so failures are swallowed rather than surfaced.
 */

const SOURCES = {
  death: require('../../assets/sounds/death_effect.wav'),
  goldenDeath: require('../../assets/sounds/golden_death.wav'),
  fail: require('../../assets/sounds/fail.wav'),
  revive: require('../../assets/sounds/revive.wav'),
  fart: require('../../assets/sounds/fart_effect.mp3'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players = new Map<SoundName, AudioPlayer>();

export function loadSounds(): void {
  if (players.size > 0) return;

  // Sound effects should mix with whatever else is playing, not interrupt it.
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});

  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      players.set(name, createAudioPlayer(SOURCES[name]));
    } catch {
      // A sound that fails to load simply never plays.
    }
  }
}

export function playSound(name: SoundName): void {
  const player = players.get(name);
  if (!player) return;
  try {
    // Restart from the beginning so rapid taps retrigger the effect.
    Promise.resolve(player.seekTo(0)).catch(() => {});
    player.play();
  } catch {
    // See the note at the top of the file.
  }
}

export function unloadSounds(): void {
  for (const player of players.values()) {
    try {
      player.remove();
    } catch {
      // Nothing useful to do if teardown fails.
    }
  }
  players.clear();
}
