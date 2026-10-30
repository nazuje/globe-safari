import { slCount } from '@playroom/kit';
import { CHARACTERS } from '../characters.ts';
import { LEVELS } from '../tuning.ts';
import type { Text } from './en.ts';

export const sl: Text = {
  title: 'Balonski dvoboj',
  description:
    'Tekma v tapkanju za dva, od 3. do 9. leta. Napihni balon, da poči! Tudi malčki in odrasli se pomerijo enakovredno.',
  homeLabel: 'Nazaj v Igralnico',
  repeatLabel: 'Povej še enkrat',
  sitOpposite: 'Sedita si nasproti. Tapni, da bosta sedela drug ob drugem',
  sitSideBySide: 'Sedita drug ob drugem. Tapni, da bosta sedela nasproti',
  changePlayers: 'Izberi nove igralce',
  start: 'Začni',
  rematch: 'Še enkrat',
  playerLabel: (number) => `${number}. igralec`,
  winsLabel: (wins) => `${wins} ${slCount(wins, { one: 'zmaga', two: 'zmagi', few: 'zmage', many: 'zmag' })}`,

  // "Za male" is about the setting, so no word here has to agree with a boy or a girl.
  levels: {
    little: { label: 'Za male', ages: '3–4 leta' },
    big: { label: 'Za velike', ages: '5–7 let' },
    grownup: { label: 'Za odrasle', ages: 'od 8 let' },
  },
  names: {
    dino: 'Dinozaver',
    unicorn: 'Samorog',
    kitten: 'Muca',
    robot: 'Robot',
    frog: 'Žaba',
    tractor: 'Traktor',
    crown: 'Krona',
    octopus: 'Hobotnica',
  },

  pickFriend: 'Izberi si prijatelja!',
  pickLevel: 'Izberi velikost!',
  pressGo: 'Pritisni veliki gumb!',
  countdown: ['Ena!', 'Dve!', 'Tri!'],
  go: 'Gremo!',
  wins: (name) => `${name} zmaga!`,
  goldRound: 'Zlati baloni!',
  again: 'Še enkrat?',
  newFriends: 'Dva nova prijatelja!',
};

/** Every line the game can say in Slovenian. */
export function spokenLines(): string[] {
  const names = CHARACTERS.map(({ id }) => sl.names[id]);
  return [
    ...names.map((name) => `${name}!`),
    ...names.map(sl.wins),
    ...LEVELS.map(({ id }) => `${sl.levels[id].label}!`),
    ...sl.countdown,
    sl.pickFriend,
    sl.pickLevel,
    sl.pressGo,
    sl.go,
    sl.goldRound,
    sl.again,
    sl.newFriends,
  ];
}
