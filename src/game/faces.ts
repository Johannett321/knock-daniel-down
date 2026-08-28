import type { ImageSourcePropType } from 'react-native';

import { IMAGES } from './images';

/**
 * Which kind of spawn a head is used for. Normal heads are drawn at random
 * from everything the player has unlocked; the golden and diamond ones are
 * what those rarer spawns look like.
 */
export type FaceRole = 'normal' | 'golden' | 'diamond' | 'mexican';

export type FaceSkin = {
  id: string;
  name: string;
  /** A one-line description, shown on the store card. */
  blurb: string;
  /** What it costs in diamonds. Zero means it is there from the first run. */
  price: number;
  role: FaceRole;
  image: ImageSourcePropType;
};

/**
 * Every head in the game.
 *
 * There are two for now and both are free, which is exactly how the game has
 * always behaved — this only makes that behaviour something the store can
 * describe. Adding a head later is one entry here: give it a price and a
 * role, and it becomes buyable, and starts appearing in runs once bought.
 * Nothing else needs to change.
 */
export const FACE_CATALOGUE: FaceSkin[] = [
  {
    id: 'classic',
    name: 'Classic Daniel',
    blurb: 'The original. Worth one point.',
    price: 0,
    role: 'normal',
    image: IMAGES.face,
  },
  {
    id: 'golden',
    name: 'Golden Daniel',
    blurb: 'Rare. Worth five points.',
    price: 0,
    role: 'golden',
    image: IMAGES.faceGolden,
  },
  {
    id: 'diamond',
    name: 'Diamond Daniel',
    blurb: 'Very rare, and the only source of diamonds.',
    price: 0,
    role: 'diamond',
    image: IMAGES.faceDiamond,
  },
  {
    id: 'mexican',
    name: 'Mexican Daniel',
    blurb: 'Worth fifteen points. Bursts with cacti.',
    price: 50,
    role: 'mexican',
    image: IMAGES.faceMexican,
  },
];

/** The heads a brand-new player already owns. */
export const FREE_FACE_IDS = FACE_CATALOGUE.filter((face) => face.price === 0).map(
  (face) => face.id,
);

export function faceById(id: string): FaceSkin | undefined {
  return FACE_CATALOGUE.find((face) => face.id === id);
}

/**
 * The heads available for a role, given what the player owns.
 *
 * An empty result is meaningful: a role whose heads are all purchasable
 * simply does not spawn until one is bought, which is what makes buying one
 * worth doing. The fallback is only for roles that have a free head — if
 * saved data somehow leaves one of those with nothing, the free head stands
 * in, because a run with no ordinary face to spawn is not a run.
 */
export function unlockedFacesFor(role: FaceRole, unlocked: string[]): FaceSkin[] {
  const forRole = FACE_CATALOGUE.filter((face) => face.role === role);
  const owned = forRole.filter((face) => face.price === 0 || unlocked.includes(face.id));
  if (owned.length > 0) return owned;
  return forRole.filter((face) => face.price === 0).slice(0, 1);
}
