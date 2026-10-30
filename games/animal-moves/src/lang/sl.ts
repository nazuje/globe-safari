import type { Text } from './en.ts';

export const sl: Text = {
  title: 'Živalski gibi',
  description: 'Igra za gibanje za otroke in odrasle: na zaslonu se pokaže žival, vsi pa skačejo, topotajo in se zibajo z njo.',
  home: 'Nazaj na igre',
  go: 'Gremo!',
  tapGo: 'Tapni gumb!',
  sayAgain: 'Povej še enkrat',
  game: 'Igra',
  animals: 'Živali',
  howManyAnimals: 'Koliko živali',
  pause: 'Premor',
  keepGoing: 'Nadaljuj',
  stopGame: 'Končaj igro',
  changeGame: 'Druga igra',
  beatOn: 'Ritem je vklopljen',
  beatOff: 'Ritem je izklopljen',
  highFive: 'Daj pet!',

  modes: {
    follow: { label: '🐸 Za mano', hint: 'Posnemaj vsako žival. Igra teče sama, ko se začne.' },
    freeze: { label: '🧊 Ples kipov', hint: 'Pleši ob ritmu. Ko utihne, postani kip.' },
    pick: { label: '👆 Ti izbereš', hint: 'Otrok tapne naslednjo žival.' },
    turn: { label: '🔄 Na vrsti si', hint: 'Otrok si izmisli gib, ti ga posnemaj.' },
  },

  // "Pripravljen?" would assume a boy, so the game just sets off.
  ready: 'Pa gremo!',
  count: ['Ena!', 'Dve!', 'Tri!'],
  freeze: 'Stoj!',
  freezeIntro: 'Ko glasba utihne, postani kip!',
  dance: (like) => `Pleši kot ${like}!`,
  pickAnimal: 'Izberi žival!',
  // "Ti si šef!" would be a boy's word, so this says what the boss does.
  picked: 'Ti odločaš!',
  whatDoesItDo: 'Kako se premika?',
  rest: 'Odpočij si!',
  // "Uspelo ti je" works for anyone, where "zmogel si" would not.
  didIt: 'Uspelo ti je! Daj pet!',

  holdStillTip: 'Ne premikaj se!',
  freezeIntroTip: 'Pleši, in ko ritem utihne, v hipu obstani.',
  danceTip: 'Vsak ples je pravi.',
  frozenTip: 'Mirno stoj, dokler se glasba ne vrne.',
  pickTip: 'Otrok odloča. Vsi drugi posnemajo.',
  turnTip: 'Otrok si izmisli gib, ti ga posnemaj!',

  // "like" stays in the nominative: "kot žaba".
  moves: {
    frog: { like: 'žaba', line: 'Skoči kot žaba!', chant: 'Hop, hop, hop!', tip: 'Majhni skoki na mestu.' },
    elephant: { like: 'slon', line: 'Topotaj kot slon!', chant: 'Bum, bum, bum!', tip: 'Težki koraki na mestu.' },
    bird: { like: 'ptica', line: 'Maši s krili kot ptica!', chant: 'Gor, dol, gor!', tip: 'Roke gor in dol, noge na tleh.' },
    penguin: { like: 'pingvin', line: 'Capljaj kot pingvin!', chant: 'Cap, cap, cap!', tip: 'Trde noge, zibaj se levo in desno.' },
    lion: { like: 'lev', line: 'Zarjovi kot lev!', chant: 'Rjov, rjov, rjov!', tip: 'Velik vesel rjov, tace gor.' },
    worm: { like: 'črv', line: 'Migaj kot črv!', chant: 'Miga, miga, miga!', tip: 'Migaj z vsem telesom, stoje ali leže.' },
    monkey: { like: 'opica', line: 'Praskaj se kot opica!', chant: 'Uh, uh, uh!', tip: 'Popraskaj se po trebuhu in po glavi.' },
    kangaroo: { like: 'kenguru', line: 'Poskakuj kot kenguru!', chant: 'Hopla, hopla, hopla!', tip: 'Mehki poskoki na mestu.' },
    bee: { like: 'čebela', line: 'Brenči kot čebela!', chant: 'Zum, zum, zum!', tip: 'Drobna, hitra krila, ostani na mestu.' },
    puppy: { like: 'kuža', line: 'Mahaj z repkom kot kuža!', chant: 'Hov, hov, hov!', tip: 'Zamigaj z ritko, kot da je rep.' },
    horse: { like: 'konj', line: 'Dirjaj na mestu kot konj!', chant: 'Klop, klop, klop!', tip: 'Kolena visoko, dirjaj na mestu.' },
    crab: { like: 'rak', line: 'Ščipaj kot rak!', chant: 'Ščip, ščip, ščip!', tip: 'Roke so škarje. Odpiraj jih in zapiraj.' },
    duck: { like: 'raca', line: 'Gagaj kot raca!', chant: 'Ga, ga, ga!', tip: 'Komolci mahajo, glasno gagaj.' },
    chicken: { like: 'kokoš', line: 'Kljuvaj kot kokoš!', chant: 'Ko, ko, ko!', tip: 'Kimaj z glavo, krila ob telesu.' },

    snake: { like: 'kača', line: 'Plazi se kot kača!', chant: 'Sik, sik, sik!', tip: 'Nizko pri tleh, lepo počasi.' },
    giraffe: { like: 'žirafa', line: 'Zibaj se kot žirafa!', chant: 'Sem in tja, sem in tja!', tip: 'Visoko in počasi, levo in desno.' },
    cat: { like: 'mačka', line: 'Pretegni se kot mačka!', chant: 'Mijav, mijav, mijav!', tip: 'Roke na tla in se počasi pretegni.' },
    ladybird: { like: 'pikapolonica', line: 'Vrti se počasi kot pikapolonica!', chant: 'Okrog in okrog!', tip: 'Zelo počasi, da se nikomur ne zvrti.' },
    mouse: { like: 'miška', line: 'Stopaj po prstih kot miška!', chant: 'Tiho, tiho, tiho!', tip: 'Tihi koraki po prstih, na mestu.' },
    fish: { like: 'riba', line: 'Plavaj kot riba!', chant: 'Blub, blub, blub!', tip: 'Roke nežno plavajo, noge mirujejo.' },
    turtle: { like: 'želva', line: 'Hodi počasi kot želva!', chant: 'Počasi, počasi, počasi!', tip: 'Najpočasnejši koraki na mestu.' },
    sloth: { like: 'lenivec', line: 'Stegni roko kot lenivec!', chant: 'Gor, gor, gor!', tip: 'Počasi stegni eno roko, nato drugo.' },
    butterfly: { like: 'metulj', line: 'Frfotaj kot metulj!', chant: 'Nežno, nežno, nežno!', tip: 'Nežne roke, lahke kot pero.' },
    owl: { like: 'sova', line: 'Obračaj glavo kot sova!', chant: 'Hu, hu, hu!', tip: 'Počasi obračaj glavo levo in desno.' },
    bear: { like: 'medved', line: 'Zazehaj kot zaspan medved!', chant: 'Zehaj, zehaj, zehaj!', tip: 'Zazehaj na široko in se počasi pretegni.' },
    bunny: { like: 'zajček', line: 'Njuhaj kot zajček!', chant: 'Njuh, njuh, njuh!', tip: 'Počepni in migaj z noskom.' },
    flamingo: { like: 'flamingo', line: 'Stoj na eni nogi kot flamingo!', chant: 'Ojoj, ojoj, ojoj!', tip: 'Eno nogo dvigni. Lahko se primeš za roko.' },
    octopus: { like: 'hobotnica', line: 'Mahaj kot hobotnica!', chant: 'Maha, maha, maha!', tip: 'Mehke roke, počasno mahanje.' },
  },
};

/** Every line the game can say in Slovenian, including the dance line for every animal. */
export function spokenLines(): string[] {
  const moves = Object.values(sl.moves);
  return [
    sl.tapGo,
    sl.ready,
    ...sl.count,
    sl.freeze,
    sl.freezeIntro,
    sl.pickAnimal,
    sl.picked,
    sl.whatDoesItDo,
    sl.rest,
    sl.didIt,
    ...moves.flatMap((move) => [move.line, move.chant, sl.dance(move.like)]),
  ];
}

/** On their own these words last a third of a second, too quick to see the big numbers, so the count is recorded slowly. */
export function slowLines(): string[] {
  return sl.count;
}
