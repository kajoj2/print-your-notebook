// Fonts available on the website. The typewriter ones come from fonts/ (the same as in the CLI);
// the CLI has Libertinus and New Computer Modern built in, the website ships them itself.
import specialElite from '../../../fonts/special-elite/SpecialElite-Regular.ttf?url';
import courierPrime from '../../../fonts/courier-prime/CourierPrime-Regular.ttf?url';
import courierPrimeItalic from '../../../fonts/courier-prime/CourierPrime-Italic.ttf?url';
import courierPrimeBold from '../../../fonts/courier-prime/CourierPrime-Bold.ttf?url';
import cutiveMono from '../../../fonts/cutive-mono/CutiveMono-Regular.ttf?url';
import libertinus from '../assets/fonts/LibertinusSerif-Regular.otf?url';
import newCm from '../assets/fonts/NewCM10-Regular.otf?url';

export const FONT_URLS = [
  specialElite,
  courierPrime,
  courierPrimeItalic,
  courierPrimeBold,
  cutiveMono,
  libertinus,
  newCm,
];

// Paths relative to web/, for tests in Node.
export const FONT_FILES = [
  '../fonts/special-elite/SpecialElite-Regular.ttf',
  '../fonts/courier-prime/CourierPrime-Regular.ttf',
  '../fonts/courier-prime/CourierPrime-Italic.ttf',
  '../fonts/courier-prime/CourierPrime-Bold.ttf',
  '../fonts/cutive-mono/CutiveMono-Regular.ttf',
  'src/assets/fonts/LibertinusSerif-Regular.otf',
  'src/assets/fonts/NewCM10-Regular.otf',
];
