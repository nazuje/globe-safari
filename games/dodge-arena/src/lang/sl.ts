import { slCount } from '@playroom/kit';
import type { Text } from './en.ts';

const SECONDS_ACC = { one: 'sekundo', two: 'sekundi', few: 'sekunde', many: 'sekund' };

export const sl: Text = {
  title: 'Izmikaj se!',
  description: 'Tridimenzionalna igra preživetja v neonski areni, ki lebdi v vesolju. Izmikaj se meteorjem, skalam, žarkom in sluzi ter premagaj svoj najboljši čas. Za otroke od 6 do 12 let.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  menu: 'Meni',
  stagesLabel: 'Izzivi',
  no3d: 'Ta naprava ne zmore prikazati arene. Poskusi na drugi tablici ali računalniku!',
  greet: 'Izmikaj se!',
  howTo: 'Drži prst in teci. Pritisni gumb za skok.',
  pickStage: 'Izberi stopnjo!',
  endless: 'Brez konca',
  challenge: 'Izzivi',
  best: 'Najboljši čas',
  leap: 'Skok',
  stage: (n) => `Stopnja ${n}`,
  surviveFor: (n) => `Zdrži ${n} ${slCount(n, SECONDS_ACC)}`,
  locked: 'Zaklenjeno',
  retry: 'Še enkrat',
  next: 'Naslednja stopnja',
  skip: 'Preskoči stopnjo',
  stars: 'Zvezdice',
  bonk: 'BUM!',
  lastedLabel: 'Tvoj čas',
  seconds: 'sekund',
  lastHeart: 'Zadnji srček!',
  newBest: 'Nov rekord!',
  greatRun: 'Odličen tek!',
  almost: 'Skoraj! Poskusi še enkrat!',
  stageDone: 'Stopnja končana!',
  allStars: 'Tri zvezdice!',
  faster: 'Hitreje!',
  teach: {
    meteor: 'Meteor! Beži iz sence.',
    boulder: 'Skala! Umakni se s proge.',
    beam: 'Žarek! Preskoči ga ali se umakni.',
    ring: 'Val! Skoči, ko pride do tebe.',
    bar: 'Vrtljivi drog! Ne stopi v krog.',
    slime: 'Sluz! Beži, kmalu poči.',
  },
  waves: {
    storm: 'Meteorska nevihta!',
    bowling: 'Kegljanje s skalami!',
    disco: 'Laserski disko!',
    ripple: 'Zabava z valovi!',
    soup: 'Sluzasta juha!',
  },
  surprises: {
    heart: 'Srček!',
    slow: 'Počasni posnetek!',
    golden: 'Zlati val!',
    ufo: 'Prijazen leteči krožnik!',
  },
};

/** Every line the game can say in Slovenian. */
export function spokenLines(): string[] {
  return [
    sl.greet,
    sl.howTo,
    sl.pickStage,
    sl.lastHeart,
    sl.newBest,
    sl.greatRun,
    sl.almost,
    sl.stageDone,
    sl.allStars,
    sl.faster,
    ...Object.values(sl.teach),
    ...Object.values(sl.waves),
    ...Object.values(sl.surprises),
  ];
}
