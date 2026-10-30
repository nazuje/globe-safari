import { burst, playSound, say, speak } from '@playroom/kit';
import { artHtml, DIGGER, itemArt, miniGrid, MOLE, skeleton, WORM } from './art.ts';
import { DINOS, itemById, PIECES, type DinoId, type Item, type Piece, type Silly } from './catalog.ts';
import { calm, dirt, friendVisit, launch, peek, showOff, sounds } from './fx.ts';
import { text } from './lang/index.ts';
import { itemLine } from './lines.ts';
import { chestMoment, eggMoment, type Moment } from './moments.ts';
import { chestPrizes, digTile, finishPatch, type Buried, type Patch, type Tile } from './patch.ts';
import { PLACES, type Place } from './places.ts';
import { addFound, has, missingBones, saveGame, type Save, type Size } from './save.ts';

const CHEST_TAPS: Record<Size, number> = { small: 8, big: 12 };
const END_DELAY_MS = 1300;
const NEXT_GUARD_MS = 900;

const SILLY_ART: Record<Silly, string> = { sock: '🧦', boot: '👢', potato: '🥔', carrot: '🥕', toot: '💨', sprout: '🌱' };

/** Which dinosaur and pieces this patch added to, for the museum card at the end. */
function bonesIn(ids: string[]): { dino: DinoId; pieces: Piece[] } | null {
  const bones = ids.filter((id) => itemById(id)?.family === 'bone');
  const first = bones[0];
  if (!first) return null;
  const dino = DINOS.find((candidate) => first.startsWith(`${candidate}-`));
  if (!dino) return null;
  const pieces = PIECES.filter((piece) => bones.includes(`${dino}-${piece}`));
  return { dino, pieces };
}

export interface PlayOptions {
  save: Save;
  patch: Patch;
  onNext(size: Size): void;
  onFound(): void;
}

export interface Play {
  element: HTMLElement;
  /** The current instruction, for the 🔊 button. */
  sayAgain(): void;
  relabel(): void;
  stop(): void;
}

/** One patch of ground, from the first tap to the tada. */
export function startPlay({ save, patch, onNext, onFound }: PlayOptions): Play {
  const place = PLACES.find((candidate) => candidate.id === patch.place) as Place;
  const element = document.createElement('section');
  element.className = 'play';

  const tray = document.createElement('div');
  tray.className = 'tray';
  const field = document.createElement('div');
  field.className = 'field';
  const grid = document.createElement('div');
  grid.className = `patch patch-${patch.size}`;
  grid.style.setProperty('--cols', String(patch.cols));
  grid.style.setProperty('--rows', String(patch.rows));
  const digger = document.createElement('div');
  digger.className = 'digger';
  digger.innerHTML = DIGGER;
  digger.setAttribute('aria-hidden', 'true');
  const finger = document.createElement('div');
  finger.className = 'finger';
  finger.textContent = '👆';
  finger.setAttribute('aria-hidden', 'true');

  const scenery = document.createElement('div');
  scenery.className = 'scenery';
  scenery.setAttribute('aria-hidden', 'true');
  scenery.innerHTML = place.scenery.map((emoji, index) => `<span class="sc sc-${index}">${emoji}</span>`).join('');

  field.append(grid);
  grid.append(finger, digger);
  element.append(scenery, tray, field);

  let stopped = false;
  let moment: Moment | null = null;
  let pendingDone = false;
  let timers: number[] = [];
  const foundHere: string[] = [];
  let endCard: HTMLElement | null = null;
  let lastTile = 0;
  /** What 🔊 repeats: the instruction for what's on screen now. */
  let instruction: () => string = () => text().dig;
  let cheerLine: () => string = () => text().cheers[0] as string;

  const later = (run: () => void, ms: number): void => {
    timers.push(window.setTimeout(() => !stopped && run(), ms));
  };

  // ---------- Tray: the silhouettes of what's in this patch ---------- //

  const slots = patch.goals.map((tileIndex) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const buried = patch.tiles[tileIndex]?.buried;
    if (buried?.kind === 'treasure') slot.innerHTML = `<div class="shadow">${itemArt(buried.id)}</div>`;
    else slot.innerHTML = '<div class="mystery">?</div>';
    tray.append(slot);
    return slot;
  });

  function fillSlot(tileIndex: number, html: string): void {
    const slot = slots[patch.goals.indexOf(tileIndex)];
    if (!slot) return;
    slot.innerHTML = html;
    slot.classList.add('filled');
  }

  // ---------- Tiles ---------- //

  const tileEls = patch.tiles.map((tile, index) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tile';
    el.dataset.left = String(tile.left);
    el.dataset.index = String(index);
    el.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      dig(index);
    });
    // Keyboards and switch controls arrive as a click with no pointer.
    el.addEventListener('click', (event) => {
      if (event.detail === 0) dig(index);
    });
    grid.append(el);
    return el;
  });

  function standDigger(el: HTMLElement): void {
    digger.style.transform = `translate(${el.offsetLeft + el.offsetWidth * 0.42}px, ${el.offsetTop + el.offsetHeight * 0.22}px)`;
  }

  function moveDigger(index: number): void {
    lastTile = index;
    standDigger(tileEls[index] as HTMLElement);
    if (calm()) return;
    digger.querySelector('.pick')?.animate(
      [{ rotate: '0deg' }, { rotate: '-55deg' }, { rotate: '20deg' }, { rotate: '0deg' }],
      { duration: 190, easing: 'ease-out' },
    );
  }

  function shake(el: HTMLElement): void {
    if (calm()) return;
    el.animate(
      [
        { transform: 'translate(-3px, 2px) scale(0.96)' },
        { transform: 'translate(3px, -1px) scale(1.01)' },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 130 },
    );
  }

  function markHint(index: number | null): void {
    if (index === null) return;
    const el = tileEls[index];
    if (!el || el.classList.contains('glint')) return;
    el.classList.add('glint');
    sounds.sparkle();
    void say(text().glint, { queue: true });
  }

  function keep(id: string): void {
    addFound(save, id);
    foundHere.push(id);
    saveGame(save);
    onFound();
  }

  function reveal(index: number, buried: Buried, el: HTMLElement): void {
    if (buried?.kind === 'treasure') {
      const item = itemById(buried.id) as Item;
      keep(buried.id);
      playSound('ding');
      if (item.family === 'gem') sounds.gem();
      if (item.family === 'bone') playSound('boing');
      if (item.id === 'rocket') {
        playSound('whoosh');
        launch(el, artHtml(item.art));
      }
      const box = el.getBoundingClientRect();
      burst(box.left + box.width / 2, box.top + box.height / 2, 12);
      speak(itemLine(item.id));
      const slot = slots[patch.goals.indexOf(index)] ?? null;
      showOff(el, artHtml(item.art), slot, () => fillSlot(index, artHtml(item.art)));
      return;
    }
    if (buried?.kind === 'friend') {
      keep(buried.id);
      const art = artHtml((itemById(buried.id) as Item).art);
      if (buried.id === 'mole') {
        sounds.yawn();
        speak(itemLine(buried.id));
        friendVisit(el, MOLE, 'friend-mole', 1900);
      } else if (buried.id === 'worm') {
        sounds.giggle();
        speak(itemLine(buried.id));
        friendVisit(el, WORM, 'friend-worm', 1700);
      } else {
        playSound('boing');
        speak(itemLine(buried.id));
        friendVisit(el, art, 'friend-wave', 1500);
      }
      return;
    }
    if (buried?.kind === 'silly') {
      const art = `<span class="emoji">${SILLY_ART[buried.id]}</span>`;
      if (buried.id === 'toot') {
        playSound('toot');
        speak(text().toot);
      } else {
        playSound(buried.id === 'sprout' ? 'boing' : 'bonk');
      }
      peek(el, art);
      return;
    }
    if (buried?.kind === 'chest') {
      openChest(index);
      return;
    }
    if (buried?.kind === 'egg') {
      openEgg(index, buried.dragon);
      return;
    }
    sounds.empty();
  }

  function playMoment(next: Moment, line: () => string): void {
    moment = next;
    instruction = line;
    element.append(next.element);
  }

  function endMoment(): void {
    moment?.stop();
    moment?.element.remove();
    moment = null;
    instruction = () => text().dig;
    if (pendingDone) later(finish, 400);
  }

  function openChest(index: number): void {
    const prizes = chestPrizes(save, patch.place);
    speak(text().chestFound);
    playSound('tada');
    playMoment(
      chestMoment(
        CHEST_TAPS[patch.size],
        prizes,
        () => {
          for (const id of prizes) keep(id);
          fillSlot(index, itemArt(prizes[0] as string));
        },
        endMoment,
      ),
      () => text().chestTap,
    );
  }

  function openEgg(index: number, dragon: string): void {
    speak(text().eggFound);
    sounds.sparkle();
    playMoment(
      eggMoment(
        dragon,
        () => {
          keep(dragon);
          fillSlot(index, itemArt(dragon));
        },
        endMoment,
      ),
      () => text().eggTap,
    );
  }

  function dig(index: number): void {
    if (stopped || moment || endCard) return;
    const el = tileEls[index] as HTMLElement;
    const tile = patch.tiles[index] as Tile;
    finger.remove();
    const result = digTile(patch, index);
    if (result.type === 'nothing') {
      shake(el);
      playSound('pop');
      return;
    }
    moveDigger(index);
    playSound('dig');
    dirt(el, place, result.type === 'open' ? 9 : 6);
    el.dataset.left = String(tile.left);
    shake(el);

    if (result.type === 'chip') {
      el.classList.add('cracked');
      return;
    }

    el.classList.remove('glint', 'cracked');
    el.setAttribute('aria-label', text().dugHere);
    reveal(index, result.buried, el);
    if (result.done) {
      pendingDone = true;
      if (!moment) later(finish, END_DELAY_MS);
    } else if (!moment) {
      markHint(result.hint);
    }
  }

  // ---------- The end of a patch ---------- //

  function celebrate(): void {
    const bones = bonesIn(foundHere);
    const dinoDone = bones !== null && missingBones(save, bones.dino).length === 0;
    if (dinoDone) sounds.roar();
    const pick = Math.floor(Math.random() * text().cheers.length);
    cheerLine = () => (dinoDone ? text().dinoDone : (text().cheers[pick] as string));
  }

  function finish(): void {
    if (endCard) return;
    pendingDone = false;
    finishPatch(save, patch);
    saveGame(save);
    playSound('tada');
    const box = field.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2, 30);
    celebrate();
    speak(cheerLine());
    endCard = buildEndCard();
    element.append(endCard);
  }

  function buildEndCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'end';
    const bones = bonesIn(foundHere);
    const nextPlace = PLACES[save.place] as Place;
    const museum = bones
      ? `<div class="end-museum">${skeleton(bones.dino, (piece) => has(save, `${bones.dino}-${piece}`), bones.pieces)}</div>`
      : '';
    const finds = foundHere
      .filter((id) => itemById(id)?.family !== 'bone')
      .slice(0, 6)
      .map((id) => `<div class="end-find">${itemArt(id)}</div>`)
      .join('');
    const other: Size = patch.size === 'small' ? 'big' : 'small';
    card.innerHTML = `
      <div class="end-card">
        <p class="end-cheer" data-line="cheer"></p>
        ${museum}
        <div class="end-finds">${finds}</div>
        <div class="end-actions">
          <button type="button" class="btn btn-sun end-next" disabled>
            <span class="end-next-place" aria-hidden="true">${nextPlace.scenery[1]}</span>
            <span data-line="next"></span>
          </button>
          <button type="button" class="btn end-other" disabled>
            ${other === 'big' ? miniGrid(5, 6) : miniGrid(4, 4)}
            <span data-line="other"></span>
          </button>
        </div>
      </div>`;
    const nextButton = card.querySelector<HTMLButtonElement>('.end-next') as HTMLButtonElement;
    const otherButton = card.querySelector<HTMLButtonElement>('.end-other') as HTMLButtonElement;
    nextButton.addEventListener('click', () => onNext(patch.size));
    otherButton.addEventListener('click', () => onNext(other));
    // Fingers still mashing the ground must not skip the celebration.
    later(() => {
      nextButton.disabled = false;
      otherButton.disabled = false;
    }, NEXT_GUARD_MS);
    labelEnd(card);
    return card;
  }

  function labelEnd(card: HTMLElement): void {
    const words = text();
    const fill = (name: string, value: string): void => {
      const target = card.querySelector(`[data-line="${name}"]`);
      if (target) target.textContent = value;
    };
    fill('cheer', cheerLine());
    fill('next', words.next);
    fill('other', patch.size === 'small' ? words.otherBig : words.otherSmall);
  }

  // ---------- Keeping the words right ---------- //

  function relabel(): void {
    const words = text();
    tileEls.forEach((el, index) => {
      el.setAttribute('aria-label', (patch.tiles[index] as Tile).left > 0 ? words.digHere : words.dugHere);
    });
    slots.forEach((slot) => slot.querySelector('.mystery')?.setAttribute('aria-label', words.mystery));
    if (endCard) labelEnd(endCard);
  }

  relabel();

  /** Puts the digger on the last tile dug and the finger on a middle tile. */
  function settle(): void {
    const middle = tileEls[Math.floor(patch.tiles.length / 2)] as HTMLElement;
    finger.style.left = `${middle.offsetLeft + middle.offsetWidth / 2}px`;
    finger.style.top = `${middle.offsetTop + middle.offsetHeight / 2}px`;
    standDigger(tileEls[lastTile] as HTMLElement);
  }

  requestAnimationFrame(settle);
  window.addEventListener('resize', settle);

  speak(text().places[patch.place]);
  if (save.patches === 0) void say(text().dig, { queue: true });

  return {
    element,
    sayAgain() {
      speak(instruction());
    },
    relabel,
    stop() {
      stopped = true;
      window.removeEventListener('resize', settle);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
      moment?.stop();
    },
  };
}
