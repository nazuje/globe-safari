import type { Text } from './en.ts';

export const sl: Text = {
  title: 'Mehurčkova zabava',
  description: 'Tapni mehurčke in poglej, kdo pade ven. Igriva zabava za otroke od 3 do 7 let, za enega ali dva.',
  home: 'Nazaj na igre',
  sayAgain: 'Povej še enkrat',
  shelf: (found, total) => `Mehurčki za pokanje. Prijatelji na polici: ${found} od ${total}.`,
  popThem: 'Pokaj mehurčke!',
  cheers: ['Hura!', 'Juhu!', 'Bravo!', 'Super!', 'Zabava!'],
  sneeze: 'Apči!',
  // After a sneeze Slovenians say the same words as when clinking glasses.
  blessYou: 'Na zdravje!',
  oops: 'Ups, oprosti!',
  rain: 'Dež mehurčkov!',
  everyone: 'Vsi prijatelji so tukaj!',
  friends: {
    kitten: 'Muca!',
    puppy: 'Kuža!',
    dinosaur: 'Dinozaver!',
    rocket: 'Raketa!',
    crown: 'Krona!',
    donut: 'Krof!',
    duck: 'Raca!',
    robot: 'Robot!',
    unicorn: 'Samorog!',
    tractor: 'Traktor!',
    butterfly: 'Metulj!',
    frog: 'Žaba!',
    fireTruck: 'Gasilski avto!',
    iceCream: 'Sladoled!',
    octopus: 'Hobotnica!',
    helicopter: 'Helikopter!',
    bunny: 'Zajček!',
    ball: 'Žoga!',
    penguin: 'Pingvin!',
    rainbow: 'Mavrica!',
    lion: 'Lev!',
    turtle: 'Želva!',
    ladybug: 'Pikapolonica!',
    elephant: 'Slon!',
    dragon: 'Zmaj!',
    saucer: 'Leteči krožnik!',
    alien: 'Vesoljček!',
    peacock: 'Pav!',
    diamond: 'Diamant!',
    trophy: 'Zlati pokal!',
  },
};

/** Every line the game can say in Slovenian. */
export function spokenLines(): string[] {
  return [sl.popThem, ...sl.cheers, sl.sneeze, sl.blessYou, sl.oops, sl.rain, sl.everyone, ...Object.values(sl.friends)];
}
