import { el } from './dom.ts';
import { text } from './lang/index.ts';
import { surpriseFor } from './scenes.ts';
import type { Friend, Landmark, Scene, Spot } from './scenes.ts';

/** What the room should show right now. It holds no game rules; main.ts works this out. */
export interface RoomView {
  /** Empty spots standing open, each with its surprise. */
  opened: readonly string[];
  round: number;
  /** The spot the friend is peeking out of while the hider chooses, or jumping out of when found. */
  friendAt: string | null;
  found: boolean;
  /** The spot that wiggles for a stuck seeker. The others fade. */
  wiggle: string | null;
  /** What the last clue talks about, ringed so it reads with the sound off. */
  pointedAt: readonly string[];
  tappable: boolean;
}

export interface Room {
  element: HTMLElement;
  show(view: RoomView): void;
  /** The middle of a spot on screen, for the star burst. */
  centerOf(spotId: string): { x: number; y: number };
}

function landmarkElement(landmark: Landmark): HTMLElement {
  const box = el('div', `landmark${landmark.art ? ` lm-${landmark.art}` : ''}`, landmark.emoji ?? '');
  box.style.gridColumn = String(landmark.col + 1);
  box.setAttribute('aria-hidden', 'true');
  return box;
}

function spotElement(spot: Spot, order: number): HTMLButtonElement {
  const button = el('button', 'spot');
  button.type = 'button';
  button.style.gridColumn = String(spot.col + 1);
  button.style.gridRow = String(spot.row + 2);
  button.style.setProperty('--order', String(order));
  const cover = el('span', `cover art-${spot.art}`, spot.emoji ?? '');
  if (spot.tint) cover.style.setProperty('--tint', spot.tint);
  button.append(el('span', 'hollow'), el('span', 'surprise'), cover, el('span', 'who'));
  return button;
}

function showSpot(button: HTMLButtonElement, spot: Spot, scene: Scene, friend: Friend, view: RoomView): void {
  button.setAttribute('aria-label', text().spotName(spot.id));
  const isOpen = view.opened.includes(spot.id);
  const hasFriend = view.friendAt === spot.id;
  button.classList.toggle('open', isOpen || (hasFriend && view.found));
  button.classList.toggle('peeking', hasFriend && !view.found);
  button.classList.toggle('found', hasFriend && view.found);
  button.classList.toggle('wiggling', view.wiggle === spot.id);
  button.classList.toggle('faded', view.wiggle !== null && view.wiggle !== spot.id);
  button.classList.toggle('pointed', view.pointedAt.includes(spot.id));
  const surprise = button.querySelector('.surprise');
  if (surprise) surprise.textContent = isOpen ? surpriseFor(scene, spot.id, view.round).emoji : '';
  const who = button.querySelector('.who');
  // The friend is only in the page when it should be seen, so nothing can give the spot away.
  if (who) who.textContent = hasFriend ? friend.emoji : '';
}

export function createRoom(
  scene: Scene,
  spots: readonly Spot[],
  friend: Friend,
  onTap: (spot: Spot) => void,
): Room {
  const element = el('div', `room scene-${scene.id}`);
  const landmarks = new Map(scene.landmarks.map((landmark) => [landmark.id, landmarkElement(landmark)]));
  element.append(...landmarks.values());

  const buttons = new Map<string, HTMLButtonElement>(spots.map((spot, order) => [spot.id, spotElement(spot, order)]));
  for (const spot of spots) {
    const button = buttons.get(spot.id);
    if (!button) continue;
    button.addEventListener('click', () => onTap(spot));
    element.append(button);
  }

  return {
    element,
    show(view) {
      element.classList.toggle('tappable', view.tappable);
      for (const spot of spots) {
        const button = buttons.get(spot.id);
        if (button) showSpot(button, spot, scene, friend, view);
      }
      for (const [id, landmark] of landmarks) landmark.classList.toggle('pointed', view.pointedAt.includes(id));
    },
    centerOf(spotId) {
      const box = buttons.get(spotId)?.getBoundingClientRect();
      if (!box) return { x: innerWidth / 2, y: innerHeight / 2 };
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    },
  };
}
