import type { Text } from './en.ts';

export const sl: Text = {
  title: 'Smešni orkester',
  description: 'Tapni šest smešnih glasbenikov, zaženi orkester, posnemi pesem in podivjaj.',
  home: 'Nazaj v igralnico',
  names: {
    frog: 'Žaba',
    robot: 'Robot',
    dino: 'Dinozaver',
    cat: 'Muca',
    alien: 'Vesoljček',
    chicken: 'Kokoš',
  },
  styles: {
    march: 'Koračnica',
    disco: 'Disko',
    lullaby: 'Uspavanka',
    robot: 'Robot',
    circus: 'Cirkus',
  },
  play: 'Igraj',
  pause: 'Ustavi',
  record: 'Snemaj',
  recording: 'Snemam',
  clear: 'Pobriši pesem',
  say: {
    name: (name) => `${name}!`,
    cheers: ['Hura!', 'Bravo!', 'Juhu!', 'Super!'],
    record: 'Snemamo!',
    listen: 'Poslušaj svoj orkester!',
    egg: 'Poglej, jajček!',
    friend: 'Nov prijatelj!',
    solo: 'Čas za solo!',
    crowd: 'Publika nori!',
  },
};

/** Every line the game can say in Slovenian. */
export function spokenLines(): string[] {
  const { names, styles, say } = sl;
  const { name, cheers, ...lines } = say;
  return [
    ...new Set([
      ...Object.values(names).map(name),
      ...Object.values(styles).map(name),
      ...cheers,
      ...Object.values(lines),
    ]),
  ];
}
