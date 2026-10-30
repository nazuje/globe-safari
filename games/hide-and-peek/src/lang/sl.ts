import { slCount, type SlNoun } from '@playroom/kit';
import { cluesFor } from '../clues.ts';
import { activeSpots, FRIENDS, LEVELS, SCENES } from '../scenes.ts';
import type { FriendId, LandmarkId, SceneId, SpotId, Text } from './en.ts';

interface FriendForms {
  /** "Kje je zajček?" */
  nom: string;
  /** "Skrij zajčka!" Animate, so it is not the same as the nominative. */
  acc: string;
}

const FRIEND_FORMS: Record<FriendId, FriendForms> = {
  bunny: { nom: 'zajček', acc: 'zajčka' },
  bear: { nom: 'medvedek', acc: 'medvedka' },
  panda: { nom: 'panda', acc: 'pando' },
  fox: { nom: 'lisička', acc: 'lisičko' },
};

const SCENE_NAMES: Record<SceneId, string> = {
  bedroom: 'Spalnica',
  garden: 'Vrt',
  kitchen: 'Kuhinja',
  farm: 'Kmetija',
};

interface SpotForms {
  nom: string;
  /** After "zraven": "zraven postelje". */
  gen: string;
  /** After "pod" and "nad" when the line says where to look, which is a direction: "Poglej pod posteljo!" */
  acc: string;
  /** Where the friend really is, with the word that suits this hiding place: "za zaveso", "v omari". */
  at: string;
}

const SPOT_FORMS: Record<SpotId, SpotForms> = {
  curtain: { nom: 'zavesa', gen: 'zavese', acc: 'zaveso', at: 'za zaveso' },
  plant: { nom: 'roža', gen: 'rože', acc: 'rožo', at: 'za rožo' },
  wardrobe: { nom: 'omara', gen: 'omare', acc: 'omaro', at: 'v omari' },
  bed: { nom: 'postelja', gen: 'postelje', acc: 'posteljo', at: 'v postelji' },
  tent: { nom: 'šotor', gen: 'šotora', acc: 'šotor', at: 'v šotoru' },
  chest: { nom: 'skrinja', gen: 'skrinje', acc: 'skrinjo', at: 'v skrinji' },
  box: { nom: 'škatla', gen: 'škatle', acc: 'škatlo', at: 'v škatli' },
  basket: { nom: 'košara', gen: 'košare', acc: 'košaro', at: 'v košari' },
  pillow: { nom: 'blazina', gen: 'blazine', acc: 'blazino', at: 'pod blazino' },
  bush: { nom: 'grm', gen: 'grma', acc: 'grm', at: 'v grmu' },
  shed: { nom: 'lopa', gen: 'lope', acc: 'lopo', at: 'v lopi' },
  flowers: { nom: 'rože', gen: 'rož', acc: 'rože', at: 'med rožami' },
  log: { nom: 'deblo', gen: 'debla', acc: 'deblo', at: 'za deblom' },
  rock: { nom: 'kamen', gen: 'kamna', acc: 'kamen', at: 'za kamnom' },
  pot: { nom: 'lonec', gen: 'lonca', acc: 'lonec', at: 'v loncu' },
  mushroom: { nom: 'goba', gen: 'gobe', acc: 'gobo', at: 'pod gobo' },
  bucket: { nom: 'vedro', gen: 'vedra', acc: 'vedro', at: 'v vedru' },
  cupboard: { nom: 'omarica', gen: 'omarice', acc: 'omarico', at: 'v omarici' },
  fridge: { nom: 'hladilnik', gen: 'hladilnika', acc: 'hladilnik', at: 'v hladilniku' },
  oven: { nom: 'pečica', gen: 'pečice', acc: 'pečico', at: 'v pečici' },
  table: { nom: 'miza', gen: 'mize', acc: 'mizo', at: 'na mizi' },
  bag: { nom: 'torba', gen: 'torbe', acc: 'torbo', at: 'v torbi' },
  doghouse: { nom: 'pasja hišica', gen: 'pasje hišice', acc: 'pasjo hišico', at: 'v pasji hišici' },
  hay: { nom: 'seno', gen: 'sena', acc: 'seno', at: 'v senu' },
  barrel: { nom: 'sod', gen: 'soda', acc: 'sod', at: 'v sodu' },
  truck: { nom: 'tovornjak', gen: 'tovornjaka', acc: 'tovornjak', at: 'v tovornjaku' },
  corn: { nom: 'koruza', gen: 'koruze', acc: 'koruzo', at: 'v koruzi' },
};

/**
 * The whole phrase, because a landmark's word never changes. "pri" takes the
 * locative; "pod" takes the accusative here, since the line sends you there.
 * "Zmaj" the kite behaves as animate: "spuščati zmaja", so "pod zmaja".
 */
const LANDMARK_CLUES: Record<LandmarkId, string> = {
  window: 'pri oknu',
  clock: 'pod uro',
  door: 'pri vratih',
  tree: 'pod drevo',
  kite: 'pod zmaja',
  gate: 'pri vratih',
  barn: 'pri hlevu',
  tractor: 'pri traktorju',
  fence: 'pri ograji',
};

// Only "many" is ever used, since the levels are 6, 8 and 9. slCount still keeps it right.
const HIDING_PLACE: SlNoun = {
  gender: 'n',
  one: 'skrivališče',
  two: 'skrivališči',
  few: 'skrivališča',
  many: 'skrivališč',
};

function capitalized(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const sl: Text = {
  title: 'Skrij in poišči',
  description:
    'Skrivalnice za malčke in odrasle, ki si podajajo tablico. Krepijo spomin, besede za položaj in menjavanje.',
  backHome: 'Nazaj v igralnico',
  stars: 'Zvezdice',
  sayAgain: 'Povej še enkrat',
  levelsLabel: 'Za odrasle: koliko skrivališč',
  spotCount: (n) => `${n} ${slCount(n, HIDING_PLACE)}`,
  startOverLabel: 'Za odrasle: začni znova',
  startOver: 'Začni znova',

  eyesShut: 'Oči zaprte!',
  ready: 'Skrito!',
  hereICome: 'Grem iskat!',
  next: 'Naprej!',
  hooray: 'Hura!',
  playAgain: 'Še enkrat!',

  friendName: (friend) => capitalized(FRIEND_FORMS[friend].nom),
  sceneName: (scene) => SCENE_NAMES[scene],
  spotName: (spot) => capitalized(SPOT_FORMS[spot].nom),

  whoHides: 'Kdo se skrije?',
  wherePlay: 'Kje se igrava?',
  closeEyes: (swapped) => (swapped ? 'Zdaj pa obratno! ' : '') + 'Zapri oči!',
  hideFriend: (friend) => `Skrij ${FRIEND_FORMS[friend].acc}! Izberi skrivališče!`,
  hidden: 'Hi hi! Zdaj tapni gumb!',
  pass: 'Podaj naprej! Pazi, grem iskat!',
  whereIs: (friend) => `Kje je ${FRIEND_FORMS[friend].nom}? Tapni in poglej!`,
  // "Našel si" would give away the child's gender, so the reveal says where the friend is instead.
  found: (friend, spot) => `Kuku! ${capitalized(FRIEND_FORMS[friend].nom)} je ${SPOT_FORMS[spot].at}!`,
  end: 'Bravo obema! Vsi so najdeni!',

  landmarkClue: (landmark) => LANDMARK_CLUES[landmark.id],
  neighborClue: (neighbor, spot) => {
    const forms = SPOT_FORMS[spot];
    return { nextTo: `zraven ${forms.gen}`, under: `pod ${forms.acc}`, above: `nad ${forms.acc}` }[neighbor];
  },
  rows: ['zgoraj', 'na sredini', 'spodaj'],
  look: (clue) => `Poglej ${clue}!`,
  warmer: 'Toplo! Topleje!',
  seeWiggle: 'Glej, kako miga!',
  surprises: {
    sleepy: 'Tiho! Muca spi!',
    sock: 'Smrdljiva nogavica!',
    notMe: 'Nisem jaz!',
    teddy: 'Živjo, medo!',
    quack: 'Ga ga!',
    shoe: 'Smešen copat!',
    notHere: 'Ni tukaj!',
    boing: 'Hop hop!',
    turtle: 'Živjo, želva!',
    snail: 'Živjo, polž!',
    ribbit: 'Rega rega!',
    flap: 'Frfotam, frfotam!',
    buzz: 'Brenčim, brenčim!',
    wiggle: 'Migam, migam!',
    tweet: 'Čiv čiv!',
    cookie: 'Njam, piškot!',
    banana: 'Smešna banana!',
    spoons: 'Same žlice!',
    cheese: 'Smrdljiv sir!',
    crunch: 'Hrust hrust!',
    sour: 'Joj, kislo!',
    peep: 'Čiv čiv!',
    oink: 'Rok rok!',
    baa: 'Be be!',
    moo: 'Mu mu!',
    maa: 'Me me!',
  },

  /**
   * Each joke can meet each clue, which would be thousands of whole sentences to
   * record. So the two are separate clips, and a joke and a clue play one after the other.
   */
  speakInParts: true,
};

function clueLines(): string[] {
  return SCENES.flatMap((scene) =>
    LEVELS.flatMap((level) => {
      const spots = activeSpots(scene, level.id);
      return spots.flatMap((hidden) => cluesFor(scene, spots, hidden, sl).map((clue) => sl.look(clue.phrase)));
    }),
  );
}

function foundLines(): string[] {
  return FRIENDS.flatMap((friend) =>
    SCENES.flatMap((scene) => scene.spots.map((spot) => sl.found(friend.id, spot.id))),
  );
}

/** Every line the game can say in Slovenian. Longer sentences arrive here in the parts they are spoken in. */
export function spokenLines(): string[] {
  return [
    sl.whoHides,
    sl.wherePlay,
    sl.closeEyes(false),
    sl.closeEyes(true),
    sl.hidden,
    sl.pass,
    sl.end,
    sl.warmer,
    sl.seeWiggle,
    ...Object.values(sl.surprises),
    ...FRIENDS.flatMap((friend) => [sl.hideFriend(friend.id), sl.whereIs(friend.id)]),
    ...clueLines(),
    ...foundLines(),
  ];
}
