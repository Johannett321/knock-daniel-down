import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_FACE_IDS } from './faces';

/**
 * Saved state: the best score, the diamond balance, the two audio toggles,
 * the power-up inventory and which heads have been unlocked.
 *
 * The original app wrote one plain-text file per value and treated any read
 * failure as "0". That contract is kept here: a read never throws and never
 * returns undefined, so callers can use the result directly. On web this is
 * backed by localStorage, on iOS and Android by the native key-value store.
 */

const KEY_BEST_SCORE = 'bestScore';
const KEY_DIAMONDS = 'diamonds';
const KEY_SOUND = 'soundEnabled';
const KEY_MUSIC = 'musicEnabled';
const KEY_FART_STOCK = 'fartStock';
const KEY_NO_BOMBS_STOCK = 'noBombsStock';
const KEY_UNLOCKED_FACES = 'unlockedFaces';

async function readNumber(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

async function writeNumber(key: string, value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch {
    // Persistence is best-effort; a failed write must not interrupt a run.
  }
}

export const getBestScore = () => readNumber(KEY_BEST_SCORE);
export const setBestScore = (value: number) => writeNumber(KEY_BEST_SCORE, value);
export const resetBestScore = () => writeNumber(KEY_BEST_SCORE, 0);

export const getDiamonds = () => readNumber(KEY_DIAMONDS);
export const setDiamonds = (value: number) => writeNumber(KEY_DIAMONDS, value);

/**
 * The audio toggles are the values that do not default to the empty case:
 * both are on until the player explicitly turns them off, so a first run has
 * sound and music.
 */
async function readEnabled(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) !== 'false';
  } catch {
    return true;
  }
}

async function writeEnabled(key: string, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, String(enabled));
  } catch {
    // See writeNumber.
  }
}

export const getSoundEnabled = () => readEnabled(KEY_SOUND);
export const saveSoundEnabled = (enabled: boolean) => writeEnabled(KEY_SOUND, enabled);

export const getMusicEnabled = () => readEnabled(KEY_MUSIC);
export const saveMusicEnabled = (enabled: boolean) => writeEnabled(KEY_MUSIC, enabled);

/**
 * The power-up inventory.
 *
 * Power-ups used to be bought mid-run, one use at a time. They are stock now:
 * bought in the store between runs and spent during one, so these counts are
 * the same kind of value as the diamond balance and read back as `0` when
 * missing, like everything else here.
 */
export const getFartStock = () => readNumber(KEY_FART_STOCK);
export const setFartStock = (value: number) => writeNumber(KEY_FART_STOCK, value);

export const getNoBombsStock = () => readNumber(KEY_NO_BOMBS_STOCK);
export const setNoBombsStock = (value: number) => writeNumber(KEY_NO_BOMBS_STOCK, value);

/**
 * Which heads have been bought.
 *
 * The free ones are always included, so a missing, empty or corrupt value
 * still leaves the player with the heads the game has always had rather than
 * with a run that cannot spawn anything.
 */
export async function getUnlockedFaces(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_UNLOCKED_FACES);
    if (raw === null) return [...FREE_FACE_IDS];
    const parsed: unknown = JSON.parse(raw);
    const saved = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    return [...new Set([...FREE_FACE_IDS, ...saved])];
  } catch {
    return [...FREE_FACE_IDS];
  }
}

export async function setUnlockedFaces(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_UNLOCKED_FACES, JSON.stringify([...new Set(ids)]));
  } catch {
    // See writeNumber.
  }
}
