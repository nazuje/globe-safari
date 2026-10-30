import { burst } from '@playroom/kit';
import { make } from './dom.ts';

let layer: HTMLElement = document.body;

/** Everything here flies over both halves in one layer that ignores touches, so it can never block a tap. */
export function setFxLayer(element: HTMLElement): void {
  layer = element;
}

export function isCalm(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function removeAfter(element: HTMLElement, animation: Animation): void {
  animation.finished.catch(() => undefined).finally(() => element.remove());
}

const PLAIN_COLORS = ['#ff6b6b', '#ffc93c', '#3ecf8e', '#4cb8ff', '#8b5cf6', '#ff9f43', '#ff7ac6'];
const GOLD_COLORS = ['#ffd700', '#ffe680', '#f5b800', '#fff3b0', '#e8a800'];

const CONFETTI = { plain: 170, gold: 320, calm: 14 };
const FLIGHT_MS = 2100;

function confettiPiece(x: number, y: number, color: string, big: boolean): void {
  const size = (big ? 14 : 10) + Math.random() * 14;
  const piece = make('i', 'confetti');
  piece.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size * 0.6}px;background:${color}`;
  const angle = Math.random() * Math.PI * 2;
  const reach = (0.25 + Math.random() * 0.75) * Math.max(window.innerWidth, window.innerHeight) * 0.7;
  const dx = Math.cos(angle) * reach;
  const dy = Math.sin(angle) * reach;
  const spin = Math.round(Math.random() * 1400 - 700);
  layer.append(piece);
  const animation = piece.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1, easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)' },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin * 0.6}deg) scale(1)`, opacity: 1, offset: 0.4, easing: 'ease-in' },
      { transform: `translate(${dx * 1.15}px, ${dy + window.innerHeight * 0.7}px) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
    ],
    { duration: FLIGHT_MS * (0.75 + Math.random() * 0.5), fill: 'forwards' },
  );
  removeAfter(piece, animation);
}

/** The big bang. A calm screen gets a few gentle stars instead. */
export function confetti(x: number, y: number, gold: boolean): void {
  if (isCalm()) {
    burst(x, y, CONFETTI.calm);
    return;
  }
  const colors = gold ? GOLD_COLORS : PLAIN_COLORS;
  const count = gold ? CONFETTI.gold : CONFETTI.plain;
  for (let i = 0; i < count; i++) confettiPiece(x, y, colors[i % colors.length], gold);
  burst(x, y, gold ? 40 : 24);
}

const MOST_PUFFS = 30;

/** A little puff of air where a finger landed. */
export function puff(x: number, y: number): void {
  if (isCalm() || layer.childElementCount > MOST_PUFFS) return;
  const piece = make('span', 'puff', '💨');
  piece.style.cssText = `left:${x}px;top:${y}px`;
  layer.append(piece);
  const dx = Math.random() * 40 - 20;
  const animation = piece.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0.9 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% - 44px)) scale(1.2)`, opacity: 0 },
    ],
    { duration: 380, easing: 'ease-out', fill: 'forwards' },
  );
  removeAfter(piece, animation);
}

/** A laugh rising from a character that has fallen over. */
export function giggle(x: number, y: number): void {
  const count = isCalm() ? 1 : 5;
  for (let i = 0; i < count; i++) {
    const piece = make('span', 'giggle', '😂');
    piece.style.cssText = `left:${x + (i - 2) * 26}px;top:${y}px`;
    layer.append(piece);
    const animation = piece.animate(
      [
        { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, -30px) scale(1)', opacity: 1, offset: 0.2 },
        { transform: `translate(-50%, -${120 + i * 16}px) scale(1.1) rotate(${(i - 2) * 12}deg)`, opacity: 0 },
      ],
      { duration: 1300, delay: i * 130, fill: 'both' },
    );
    removeAfter(piece, animation);
  }
}

const BIRD_FLIGHT_MS = 3600;

/** The mischievous bird crosses the whole screen. It only looks at the balloons: it changes nothing. */
export function flyBird(onOverhead: () => void): void {
  const fromLeft = Math.random() < 0.5;
  const bird = make('span', 'bird', '🐦');
  bird.style.top = `${28 + Math.random() * 40}%`;
  layer.append(bird);
  // The emoji faces left, so a bird flying right needs flipping.
  const facing = fromLeft ? 'scaleX(-1)' : 'scaleX(1)';
  const width = window.innerWidth;
  const [start, end] = fromLeft ? [-80, width + 80] : [width + 80, -80];
  const hop = (share: number, lift: number, angle = 0): Keyframe => ({
    transform: `translate(${start + (end - start) * share}px, ${lift}px) rotate(${angle}deg) ${facing}`,
  });
  const animation = isCalm()
    ? bird.animate(
        [
          { transform: `translate(${width / 2}px, 0)`, opacity: 0 },
          { transform: `translate(${width / 2}px, 0)`, opacity: 1 },
          { transform: `translate(${width / 2}px, 0)`, opacity: 0 },
        ],
        { duration: 1500 },
      )
    : bird.animate(
        [hop(0, 0), hop(0.2, -40, -8), hop(0.35, 20, 8), hop(0.5, -50, -8), hop(0.65, 15, 8), hop(0.8, -40, -8), hop(1, 0)],
        { duration: BIRD_FLIGHT_MS, easing: 'ease-in-out' },
      );
  setTimeout(onOverhead, 1300);
  removeAfter(bird, animation);
}

/** The balloon escapes round the screen, losing air, instead of popping. */
export function sputterAway(from: DOMRect, color: string, ms: number): void {
  const size = Math.min(from.width, 160);
  const balloon = make('span', 'runaway');
  balloon.style.cssText = `width:${size}px;height:${size}px;background:${color}`;
  layer.append(balloon);
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  if (isCalm()) {
    removeAfter(
      balloon,
      balloon.animate(
        [
          { transform: `translate(${startX}px, ${startY}px) scale(1)` },
          { transform: `translate(${startX}px, ${startY}px) scale(0.1)`, opacity: 0 },
        ],
        { duration: 1000, fill: 'forwards' },
      ),
    );
    return;
  }
  const hops = 9;
  const frames: Keyframe[] = [{ transform: `translate(${startX}px, ${startY}px) rotate(0deg) scale(1)` }];
  for (let hop = 1; hop <= hops; hop++) {
    const x = Math.random() * (window.innerWidth - size * 0.5);
    const y = Math.random() * (window.innerHeight - size * 0.5);
    const shrink = 1 - (hop / hops) * 0.85;
    frames.push({ transform: `translate(${x}px, ${y}px) rotate(${hop * 200}deg) scale(${shrink})` });
  }
  frames.push({ transform: `translate(50vw, 110vh) rotate(${hops * 240}deg) scale(0.1)`, opacity: 0 });
  removeAfter(balloon, balloon.animate(frames, { duration: ms, easing: 'ease-in-out', fill: 'forwards' }));
}
