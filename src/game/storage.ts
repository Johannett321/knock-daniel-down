import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Saved state: the best score, the diamond balance, and the Extra Hard toggle.
 *
 * The original app wrote one plain-text file per value and treated any read
 * failure as "0". That contract is kept here: a read never throws and never
 * returns undefined, so callers can use the result directly. On web this is
 * backed by localStorage, on iOS and Android by the native key-value store.
 */

const KEY_BEST_SCORE = 'bestScore';
const KEY_DIAMONDS = 'diamonds';
const KEY_HARD_MODE = 'extraHardMode';

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

export async function isHardMode(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_HARD_MODE)) === 'true';
  } catch {
    return false;
  }
}

export async function setHardMode(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_HARD_MODE, String(enabled));
  } catch {
    // See writeNumber.
  }
}
