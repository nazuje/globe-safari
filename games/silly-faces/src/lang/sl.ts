import type { Text } from './en.ts';

export const sl: Text = {
  title: 'Smešni obrazi',
  description: 'Obleci veliko ljubko bitje, požgečkaj ga, zapleši z njim in napolni steno s prijatelji. Brez ciljev in brez napačnih izbir.',

  intro: 'Živjo! Tapni me ali izberi sličico!',
  // The creature is "bitje" and has no gender, so nothing here says what it is: no "lep", no "zaspan".
  delighted: ['Ooo, to mi je všeč!', 'Kako imenitno!', 'Ja, ja, ja!', 'Joj, poglej me!', 'Hi hi, kako smešno!'],
  reactions: {
    burp: 'Ups! Oprosti!',
    sneeze: 'Apči! Ojoj!',
    toot: 'Ups! Kako nerodno!',
    giggle: 'Hi hi, to žgečka!',
    yawn: 'Joj, kako se mi spi.',
    spin: 'Juhu, vrtim se!',
    tiny: 'Kuku! Poglej, kdo je tukaj!',
    insideOut: 'Oho! Poglej mojo novo barvo!',
    float: 'Gor, gor, gor!',
  },
  shuffled: 'Kdo sem zdaj?',
  dance: 'Zaplešiva!',
  danceAll: 'Zaplešimo vsi!',
  saved: 'Klik! Še en prijatelj!',
  known: 'Ta je že na steni!',
  back: 'Spet sem tukaj!',
  takePicture: 'Slikaj me!',

  ui: {
    home: 'Nazaj v igralnico',
    creature: 'Bitje. Tapni ga!',
    again: 'Poslušaj še enkrat',
    dice: 'Premešaj vse',
    dance: 'Ples',
    camera: 'Slikaj',
    wall: 'Stena prijateljev',
    wallTitle: 'Prijatelji',
    close: 'Zapri',
    danceAll: 'Zaplešimo vsi',
    empty: 'Prazno mesto',
    friend: (n) => `Prijatelj ${n}`,
  },
  tabs: {
    body: 'Telo',
    eyes: 'Oči',
    mouth: 'Usta',
    hair: 'Lasje in rogovi',
    hat: 'Pokrivala',
    held: 'Stvari v roki',
  },
  options: {
    shape: { round: 'Okroglo', tall: 'Visoko', pear: 'Hruška', cloud: 'Puhast oblak' },
    color: { teal: 'Turkizna', coral: 'Koralna', sun: 'Rumena', grape: 'Vijolična', leaf: 'Zelena', sky: 'Modra' },
    eyes: {
      friendly: 'Dve prijazni očesi',
      one: 'Eno oko',
      three: 'Tri oči',
      googly: 'Bolščeče oči',
      sleepy: 'Zaspane oči',
      sparkly: 'Bleščeče oči',
    },
    mouth: { smile: 'Nasmeh', huge: 'Velik nasmeh', fangs: 'Podočniki', tongue: 'Iztegnjen jezik', kissy: 'Poljubček', oh: 'Mali o' },
    hair: { none: 'Brez las', tuft: 'Čopek', spikes: 'Bodice', curls: 'Kodri', bunches: 'Čopka', horns: 'Rogovi' },
    hat: {
      none: 'Brez pokrivala',
      crown: 'Krona',
      cowboy: 'Kavbojski klobuk',
      pirate: 'Piratski klobuk',
      wizard: 'Čarovniški klobuk',
      flower: 'Roža',
      helmet: 'Gradbena čelada',
      unicorn: 'Rog samoroga',
      antennae: 'Tipalki',
    },
    held: {
      none: 'Nič',
      balloon: 'Balon',
      icecream: 'Sladoled',
      wrench: 'Ključ',
      wand: 'Čarobna palica',
      teddy: 'Medvedek',
      guitar: 'Kitara',
    },
  },
};

/** Every line the game can say in Slovenian. */
export function spokenLines(): string[] {
  return [
    sl.intro,
    ...sl.delighted,
    ...Object.values(sl.reactions),
    sl.shuffled,
    sl.dance,
    sl.danceAll,
    sl.saved,
    sl.known,
    sl.back,
    sl.takePicture,
  ];
}
