/** What a spawned object is. Bombs must not be tapped; faces must be. */
export type SpawnKind = 'normal' | 'golden' | 'diamond' | 'mexican' | 'bomb';

/**
 * One object crossing the screen.
 *
 * Movement is linear and fully described by `startedAt` and `travelMs`, so the
 * game can work out where anything is at any moment without reading it back
 * out of the animation. That is what lets the visual movement run on the
 * native driver while the rules run in JavaScript.
 */
export type Spawn = {
  id: number;
  kind: SpawnKind;
  /** 0 = centre, 1 = bottom, 2 = top. Lanes 1 and 2 unlock as the score rises. */
  lane: number;
  /** Which head from the catalogue this one wears. Bombs ignore it. */
  faceId: string;
  /** Diamonds paid out when knocked down. Only ever set on a diamond head. */
  reward: number;
  /** Timestamp at which it began crossing. */
  startedAt: number;
  /** How long its crossing takes, in milliseconds. */
  travelMs: number;
  /** Set once it has been knocked down; it then falls away and stops scoring. */
  killed: boolean;
  /** Timestamp of the knock-down, used to clean the spawn up afterwards. */
  killedAt: number;
};

/** Everything about the run in progress. */
export type RunState = {
  score: number;
  diamonds: number;
  bestScore: number;
  faceTravelMs: number;
  spawnIntervalMs: number;
  /** Rises by one each time it is used, and resets when a new run starts. */
  revivePrice: number;
  /**
   * Power-ups in hand. Bought in the store between runs and spent here, so
   * these are written straight back to storage as they are used.
   */
  fartStock: number;
  noBombsStock: number;
  lost: boolean;
  /** Timestamps until which each power-up is active. */
  fartUntil: number;
  noBombsUntil: number;
};
