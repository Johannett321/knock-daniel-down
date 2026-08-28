import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { MUSIC_VOLUME } from './constants';

/**
 * The game's sound effects, held as long-lived players so a hit can be
 * replayed instantly by seeking back to the start.
 *
 * Every call here is best-effort. Browsers refuse to play audio before the
 * page has had a user gesture, and a silent game is much better than a crash,
 * so failures are swallowed rather than surfaced.
 *
 * The knock-down has three recordings rather than one. It is the sound the
 * player hears more than any other, and a single sample repeated on every tap
 * turns into a rattle within a few seconds.
 *
 * The two music tracks are held the same way but loop, sit at a lower volume,
 * and are switched by screen rather than fired off by an event.
 */

const SOURCES = {
  death2: require('../../assets/sounds/death_effect2.m4a'),
  death3: require('../../assets/sounds/death_effect3.m4a'),
  death4: require('../../assets/sounds/death_effect4.m4a'),
  goldenDeath: require('../../assets/sounds/golden_hit.m4a'),
  diamondDeath: require('../../assets/sounds/diamond_death1.m4a'),
  diamondDeathBig: require('../../assets/sounds/diamond_death2.m4a'),
  mexicanDeath: require('../../assets/sounds/cowboy.m4a'),
  button: require('../../assets/sounds/button_sound.m4a'),
  fail: require('../../assets/sounds/fail.wav'),
  revive: require('../../assets/sounds/revive.wav'),
  fart: require('../../assets/sounds/fart_effect.mp3'),
} as const;

export type SoundName = keyof typeof SOURCES;

/** The knock-down recordings, picked between on every hit. */
const DEATH_VARIATIONS: SoundName[] = ['death2', 'death3', 'death4'];

/** The two looping tracks: one for the menus, one for a run. */
const MUSIC_SOURCES = {
  menu: require('../../assets/sounds/loop_menu_music.mp3'),
  game: require('../../assets/sounds/game_music.m4a'),
} as const;

export type MusicName = keyof typeof MUSIC_SOURCES;

const players = new Map<SoundName, AudioPlayer>();
const musicPlayers = new Map<MusicName, AudioPlayer>();

/**
 * Whether effects are audible. The players stay loaded when sound is off, so
 * the settings toggle takes effect on the very next tap with nothing to
 * reload. The persisted value is applied once at startup in `App.tsx`.
 */
let soundEnabled = true;

export function setSoundEnabled(value: boolean): void {
  soundEnabled = value;
}

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

  for (const name of Object.keys(MUSIC_SOURCES) as MusicName[]) {
    try {
      const player = createAudioPlayer(MUSIC_SOURCES[name]);
      player.loop = true;
      // Music sits under the effects; the hits have to stay on top of it.
      player.volume = MUSIC_VOLUME;
      musicPlayers.set(name, player);
    } catch {
      // As above: a track that fails to load simply never plays.
    }
  }
}

/**
 * Whether the browser will let audio start at all.
 *
 * On the web `play()` is refused until the page has been interacted with, and
 * expo-audio drops the resulting promise without catching it — so the
 * rejection escapes as an unhandled error that nothing here can intercept.
 * Asking first is the only way to stay quiet about it. Native has no such
 * rule and no `userActivation`, so it always passes.
 */
function audioAllowed(): boolean {
  const activation = (globalThis as { navigator?: { userActivation?: { hasBeenActive: boolean } } })
    .navigator?.userActivation;
  return activation === undefined || activation.hasBeenActive;
}

function start(player: AudioPlayer): void {
  if (!audioAllowed()) return;
  try {
    Promise.resolve(player.play()).catch(() => {});
  } catch {
    // See the note at the top of the file.
  }
}

export function playSound(name: SoundName): void {
  if (!soundEnabled) return;
  const player = players.get(name);
  if (!player) return;
  try {
    // Restart from the beginning so rapid taps retrigger the effect.
    Promise.resolve(player.seekTo(0)).catch(() => {});
  } catch {
    // See the note at the top of the file.
  }
  start(player);
}

/** Which variation played last, so the next hit never repeats it. */
let lastDeath = -1;

/**
 * Play a knock-down, varying the recording each time.
 *
 * Picking at random alone would still repeat one in four hits, which is
 * exactly what this is meant to avoid, so a repeat is nudged to its
 * neighbour instead.
 */
export function playDeathSound(): void {
  let index = Math.floor(Math.random() * DEATH_VARIATIONS.length);
  if (index === lastDeath) index = (index + 1) % DEATH_VARIATIONS.length;
  lastDeath = index;
  playSound(DEATH_VARIATIONS[index]);
}

/**
 * Which track the game wants playing, whether or not it actually is. Keeping
 * it lets the music toggle pick straight back up where it left off.
 */
let wantedMusic: MusicName | null = null;
let musicEnabled = true;

/**
 * Switch the looping music, or pass `null` for silence.
 *
 * Calling this with the track that is already playing does nothing, so the
 * screens can each just say what they want without checking first. On the web
 * the first call may be refused outright — browsers block audio until the
 * page has been interacted with — but every later one lands, so the music
 * starts as soon as the player touches anything.
 */
export function playMusic(name: MusicName | null): void {
  wantedMusic = name;
  for (const [key, player] of musicPlayers) {
    try {
      if (key === name && musicEnabled) {
        if (!player.playing) start(player);
      } else if (player.playing) {
        player.pause();
      }
    } catch {
      // See the note at the top of the file.
    }
  }
}

/**
 * Try again to start whatever track the current screen asked for.
 *
 * This exists for the web, where the very first attempt is refused if the
 * splash timed out without anyone touching the screen. Wiring it to the first
 * touch anywhere means the music comes in the moment the player does
 * something, instead of staying silent until they change screens. On iOS and
 * Android the track is already playing and this does nothing.
 */
export function resumeMusic(): void {
  if (!musicEnabled || wantedMusic === null) return;
  const player = musicPlayers.get(wantedMusic);
  if (!player || player.playing) return;
  start(player);
}

export function setMusicEnabled(value: boolean): void {
  musicEnabled = value;
  // Re-applied rather than toggled, so turning it back on resumes the track
  // the current screen asked for.
  playMusic(wantedMusic);
}

export function unloadSounds(): void {
  for (const player of [...players.values(), ...musicPlayers.values()]) {
    try {
      player.remove();
    } catch {
      // Nothing useful to do if teardown fails.
    }
  }
  players.clear();
  musicPlayers.clear();
}
