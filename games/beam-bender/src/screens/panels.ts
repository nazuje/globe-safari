import { burst } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { BONUS_LEVELS, LEVELS, WORLDS, type Level, type WorldId } from '../rules/levels.ts';
import { isDone, isOpen, nextLevel, totalStars, type Progress } from '../rules/progress.ts';
import { pickSound } from '../sounds.ts';
import { button, calm, element } from '../ui.ts';
import type { WinReport } from './play.ts';

const WORLD_ART: Record<WorldId, string> = { mirrors: '🪞', blocks: '🧱', splitters: '✨', colors: '🌈', double: '🔷', switches: '🔘', portals: '🌀', mix: '🏆', bonus: '💎' };
/** Long enough for a held finger to lift, or a mashing hand to stop, before a button can go. */
const RETRY_AFTER_MS = 350;
const NEXT_AFTER_MS = 800;

/** A big button that ignores taps until a mashing hand has had time to lift. */
function armedButton(className: string, label: string, afterMs: number, onPress: () => void): HTMLButtonElement {
  const made = button(className);
  made.textContent = label;
  let armed = false;
  window.setTimeout(() => {
    armed = true;
    made.classList.add('armed');
  }, afterMs);
  made.addEventListener('click', () => {
    if (!armed) return;
    pickSound();
    onPress();
  });
  return made;
}

export interface MapOptions {
  progress: Progress;
  onLevel: (id: number) => void;
}

function levelTile(level: Level, { progress, onLevel }: MapOptions, next: number | null): HTMLButtonElement {
  const open = isOpen(progress, level.id);
  const tile = button(level.id === next ? 'tile tile-next' : 'tile');
  tile.dataset.level = String(level.id);
  tile.dataset.open = String(open);
  tile.dataset.done = String(isDone(progress, level.id));
  tile.setAttribute('aria-label', open ? text().level(level.id) : text().locked(level.id));
  const number = element('span', 'tile-number');
  number.textContent = open ? String(level.id) : '🔒';
  const stars = element('span', 'tile-stars');
  const earned = progress.stars[level.id] ?? 0;
  stars.textContent = open ? '★'.repeat(earned) + '☆'.repeat(3 - earned) : '';
  tile.append(number, stars);
  tile.addEventListener('click', () => {
    if (!open) return;
    pickSound();
    onLevel(level.id);
  });
  if (!open) tile.classList.add('tile-shut');
  return tile;
}

function worldBlock(world: WorldId, levels: readonly Level[], options: MapOptions, next: number | null): HTMLElement {
  const block = element('section', 'world');
  const heading = element('h2', 'world-name');
  heading.textContent = `${WORLD_ART[world]} ${text().worlds[world]}`;
  const grid = element('div', 'world-grid');
  grid.append(...levels.map((level) => levelTile(level, options, next)));
  block.append(heading, grid);
  return block;
}

/** Every world on one scrolling sheet. */
export function showMap(host: HTMLElement, options: MapOptions): () => void {
  const panel = element('div', 'map');
  const score = element('p', 'map-score');
  const sheet = element('div', 'map-sheet');
  const next = nextLevel(options.progress);
  score.textContent = `★ ${totalStars(options.progress)}`;
  sheet.append(score);
  for (const world of WORLDS) sheet.append(worldBlock(world, LEVELS.filter((level) => level.world === world), options, next));
  if (options.progress.found.length > 0) sheet.append(worldBlock('bonus', BONUS_LEVELS, options, next));
  panel.append(sheet);
  host.append(panel);
  sheet.querySelector('.tile-next')?.scrollIntoView({ block: 'center' });
  return () => panel.remove();
}

export interface WonOptions {
  report: WinReport;
  bonus: number | null;
  onNext: (() => void) | null;
  onBonus: (() => void) | null;
  onAgain: () => void;
  onMap: () => void;
}

export function showWon(host: HTMLElement, { report, onNext, onBonus, onAgain, onMap }: WonOptions): () => void {
  const panel = element('div', 'card');
  panel.dataset.stars = String(report.stars);
  const stars = element('div', 'card-stars');
  for (let star = 1; star <= 3; star += 1) {
    const mark = element('span', star <= report.stars ? 'star star-on' : 'star');
    mark.textContent = '★';
    mark.style.setProperty('--delay', `${star * 0.16}s`);
    stars.append(mark);
  }
  const line = element('p', 'card-line');
  line.textContent = text()[`stars${report.stars}` as 'stars1' | 'stars2' | 'stars3'];
  const small = element('p', 'card-small');
  small.textContent = report.hinted ? text().hintOnlyStar : text().result(report.moves, report.level.par);
  const row = element('div', 'card-row');
  row.append(armedButton('card-btn card-small-btn', '🔄', NEXT_AFTER_MS, onAgain), armedButton('card-btn card-small-btn', '🗺️', NEXT_AFTER_MS, onMap));
  row.children[0]?.setAttribute('aria-label', text().retry);
  row.children[1]?.setAttribute('aria-label', text().levels);
  panel.append(stars, line, small);
  if (onBonus) panel.append(armedButton('card-btn card-bonus', `💎 ${text().worlds.bonus}`, NEXT_AFTER_MS, onBonus));
  if (onNext) {
    const next = armedButton('card-btn card-main', `${text().next} ▶`, NEXT_AFTER_MS, onNext);
    next.dataset.action = 'next';
    panel.append(next);
  }
  panel.append(row);
  host.append(panel);
  if (!calm()) {
    const box = stars.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2, 26);
  }
  return () => panel.remove();
}

export interface LostOptions {
  line: string;
  canSkip: boolean;
  onRetry: () => void;
  onSkip: () => void;
}

export function showLost(host: HTMLElement, { line, canSkip, onRetry, onSkip }: LostOptions): () => void {
  const panel = element('div', 'card card-lost');
  const face = element('div', 'card-face');
  face.textContent = '🫠';
  const words = element('p', 'card-line');
  words.textContent = line;
  const again = armedButton('card-btn card-main', `🔄 ${text().retry}`, RETRY_AFTER_MS, onRetry);
  again.dataset.action = 'try-again';
  panel.append(face, words, again);
  if (canSkip) {
    const skip = armedButton('card-btn card-skip', `${text().skip} ⏭️`, RETRY_AFTER_MS, onSkip);
    skip.dataset.action = 'skip';
    panel.append(skip);
  }
  host.append(panel);
  return () => panel.remove();
}

