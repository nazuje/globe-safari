import { speak } from '@playroom/kit';
import { bestOnLevel, friendsMet, type Saved } from './collection.ts';
import { FRIENDS, type KindId } from './kinds.ts';
import { text } from './lang/index.ts';
import { LEVELS } from './levels.ts';
import { LEVEL_ART } from './sky.ts';
import * as sounds from './sounds.ts';
import { alienArt, artIcon } from './sprites.ts';
import { element, starRow } from './ui.ts';

function friendArt(friend: KindId, size: number): HTMLCanvasElement {
  return artIcon(friend === 'cat' ? 'cat' : alienArt(friend, 'laugh'), size);
}

function friendCard(friend: KindId, saved: Saved): HTMLElement {
  const times = saved.met[friend] ?? 0;
  const card = element('div', times > 0 ? 'friend' : 'friend friend-unknown');
  card.dataset.friend = friend;
  card.dataset.met = String(times > 0);
  const art = friendArt(friend, 76);
  const name = element('span', 'friend-name');
  name.textContent = times > 0 ? text().friends[friend] : '?';
  card.setAttribute('aria-label', times > 0 ? text().friends[friend] : text().unknown);
  card.setAttribute('role', 'img');
  card.append(art, name);
  if (times > 0) {
    const count = element('span', 'friend-times');
    count.textContent = `× ${times}`;
    card.append(count);
    card.addEventListener('pointerdown', () => {
      sounds.giggleSound(Math.floor(Math.random() * 6));
      art.classList.remove('friend-laugh');
      void art.offsetWidth;
      art.classList.add('friend-laugh');
    });
  } else {
    card.addEventListener('pointerdown', () => sounds.nudgeSound());
  }
  return card;
}

function scoreRow(saved: Saved): HTMLElement {
  const rows = element('div', 'scores');
  for (const { id } of LEVELS) {
    const row = element('div', 'score-row');
    const name = element('span', 'score-name');
    name.textContent = text().levels[id];
    const best = element('span', 'score-best');
    const score = bestOnLevel(saved, id);
    best.textContent = score > 0 ? String(score) : '–';
    row.append(artIcon(LEVEL_ART[id], 40), name, starRow(saved.stars[id] ?? 0), best);
    rows.append(row);
  }
  return rows;
}

/** The book of laughing friends. Anyone not met yet is a shadow with a question mark. */
export function showFriends(host: HTMLElement, saved: Saved): () => void {
  document.body.dataset.screen = 'friends';
  const page = element('section', 'book');
  const heading = element('h2', 'book-title');
  heading.textContent = `${text().friendsTitle} ${friendsMet(saved)} / ${FRIENDS.length}`;
  const grid = element('div', 'friends');
  grid.append(...FRIENDS.map((friend) => friendCard(friend, saved)));
  page.append(heading, grid, scoreRow(saved));
  host.append(page);
  speak(text().friendsTitle);
  return () => page.remove();
}
