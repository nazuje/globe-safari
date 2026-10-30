import { burst, speak } from '@playroom/kit';
import { friendSvg, levelPicture, silhouetteSvg } from './art.ts';
import { byId, wait } from './dom.ts';
import { text } from './lang/index.ts';
import { LEVELS, type LevelId, type Round } from './rounds.ts';
import { STICKERS, type Sticker } from './stickers.ts';

export function drawTitleFriends(): void {
  const crew = (['triangle', 'circle', 'square'] as const).map((shape) => {
    const color = shape === 'circle' ? 'red' : shape === 'square' ? 'blue' : 'green';
    return `<span class="crew-friend">${friendSvg({ shape, color })}</span>`;
  });
  byId('crew').innerHTML = crew.join('');
}

export function drawLevelPicker(selected: LevelId, onPick: (level: LevelId) => void): void {
  const buttons = LEVELS.map((level) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-btn';
    button.innerHTML = levelPicture(level.id);
    button.setAttribute('aria-label', text().levelLabel(level.id));
    button.setAttribute('aria-pressed', String(level.id === selected));
    button.addEventListener('click', () => onPick(level.id));
    return button;
  });
  byId('levels').replaceChildren(...buttons);
  byId('level-note').textContent = text().levelLabel(selected);
}

const STICKER_POP_MS = 1900;
const NEXT_BUTTON_MS = 2900;

export async function runParty(round: Round, prize: Sticker, isNew: boolean): Promise<void> {
  const crowd = byId('party-crowd');
  const reveal = byId('party-sticker');
  const next = byId('next');
  crowd.innerHTML = round.questions
    .map(({ friend }, i) => `<span class="party-friend" style="--i:${i}">${friendSvg(friend)}</span>`)
    .join('');
  reveal.hidden = true;
  next.hidden = true;
  speak(text().partyLine);

  [0.25, 0.75, 0.5].forEach((across, i) => {
    window.setTimeout(() => burst(window.innerWidth * across, window.innerHeight * 0.3), i * 320);
  });

  await wait(STICKER_POP_MS);
  reveal.innerHTML = `<span class="sticker">${friendSvg(prize.friend, prize.accessory)}</span>`;
  reveal.hidden = false;
  speak(isNew ? text().newStickerLine : text().oldStickerLine);
  await wait(NEXT_BUTTON_MS - STICKER_POP_MS);
  next.hidden = false;
}

export function drawBook(collected: readonly string[]): void {
  const have = new Set(collected);
  const slots = STICKERS.map((item) => {
    if (!have.has(item.id)) {
      const empty = document.createElement('span');
      empty.className = 'book-slot empty';
      empty.innerHTML = silhouetteSvg(item.friend.shape);
      return empty;
    }
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'book-slot sticker';
    slot.innerHTML = friendSvg(item.friend, item.accessory);
    const line = text().stickerLine(item);
    slot.setAttribute('aria-label', line);
    slot.addEventListener('click', () => {
      speak(line);
      slot.classList.remove('wiggle');
      void slot.offsetWidth;
      slot.classList.add('wiggle');
    });
    return slot;
  });
  byId('book-grid').replaceChildren(...slots);
  byId('book-count').textContent = text().stickerCount(collected.length, STICKERS.length);
}
