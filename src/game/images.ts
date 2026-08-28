/**
 * Every image the game uses, in one place, so screens import a name rather
 * than a relative path. Everything here is the original 2017 artwork apart
 * from the two power-up icons.
 */
export const IMAGES = {
  logo: require('../../assets/images/logo.png'),
  loadingLogo: require('../../assets/images/loading_logo.png'),
  loadingFull: require('../../assets/images/loading_full.png'),

  menuBackground: require('../../assets/images/background_menu.png'),
  gameBackground: require('../../assets/images/background1.png'),
  gameBackgroundAlt: require('../../assets/images/background2.png'),

  button: require('../../assets/images/button.png'),

  face: require('../../assets/images/daniel_face.png'),
  faceGolden: require('../../assets/images/daniel_face_golden.png'),
  faceDiamond: require('../../assets/images/daniel_face_diamond.png'),
  faceMexican: require('../../assets/images/mexican_head.png'),
  faceDead: require('../../assets/images/death_face.png'),
  faceSmile: require('../../assets/images/smile_daniel.png'),

  bomb: require('../../assets/images/bomb.png'),
  diamond: require('../../assets/images/diamond.png'),
  cactus: require('../../assets/images/cactus.png'),
  fartGas: require('../../assets/images/fartgas.png'),

  powerUpFart: require('../../assets/images/fart.png'),
  powerUpNoBombs: require('../../assets/images/no-bomb.png'),
} as const;
