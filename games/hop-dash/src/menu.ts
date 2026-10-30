import { speak } from '@playroom/kit';
import { screenSettled } from './gate.ts';
import { LEVELS } from './levels.ts';
import { text } from './lang/index.ts';
import { bestKey, type Progress } from './save.ts';
import { drawRunner, STANDING } from './runnerArt.ts';
import { RUNNER_IDS, RUNNER_PITCH, type RunnerId } from './runners.ts';
import { pickSound } from './sounds.ts';
import { DIFFICULTY_IDS, type DifficultyId } from './tuning.ts';
import { button, element } from './ui.ts';
import { WORLDS } from './worlds.ts';

const SPEED_ART: Record<DifficultyId, string> = { easy: '🐢', fast: '🐇', turbo: '⚡' };
const CARD_PIXELS = 150;
const SPEED_PITCH: Record<DifficultyId, number> = { easy: 262, fast: 523, turbo: 1047 };

/** A tap handler that does nothing until the new screen has settled, so a double tap can't fall through to it. */
function settled(onTap: () => void): () => void {
  const openedAt = performance.now();
  return () => {
    if (screenSettled(openedAt, performance.now())) onTap();
  };
}

export interface RunnerOptions {
  difficulty: DifficultyId;
  onDifficulty: (difficulty: DifficultyId) => void;
  onRunner: (runner: RunnerId) => void;
}

function speedRow(options: RunnerOptions): HTMLElement {
  const row = element('div', 'speeds');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', text().speedGroup);
  const buttons = DIFFICULTY_IDS.map((difficulty) => {
    const made = button('speed-btn');
    made.dataset.speed = difficulty;
    const art = element('span', 'speed-art');
    art.textContent = SPEED_ART[difficulty];
    art.setAttribute('aria-hidden', 'true');
    const name = element('span', 'speed-name');
    name.textContent = text().speeds[difficulty].replace('!', '');
    made.append(art, name);
    made.setAttribute('aria-pressed', String(difficulty === options.difficulty));
    made.addEventListener(
      'click',
      settled(() => {
        for (const other of buttons) other.setAttribute('aria-pressed', String(other === made));
        options.onDifficulty(difficulty);
        pickSound(SPEED_PITCH[difficulty]);
        speak(text().speeds[difficulty]);
      }),
    );
    return made;
  });
  row.append(...buttons);
  return row;
}

function runnerCanvas(id: RunnerId): { canvas: HTMLCanvasElement; paint: (time: number) => void } {
  const canvas = element('canvas', 'runner-art');
  canvas.width = CARD_PIXELS * 2;
  canvas.height = CARD_PIXELS * 2;
  const ctx = canvas.getContext('2d');
  const paint = (time: number): void => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const hop = Math.abs(Math.sin(time * 2.6)) * 16;
    const pose = { ...STANDING, stride: time * 9, scaleY: 1 + Math.sin(time * 5.2) * 0.03 };
    drawRunner(ctx, id, CARD_PIXELS, CARD_PIXELS * 1.9 - hop, CARD_PIXELS * 1.55, pose);
  };
  return { canvas, paint };
}

/** Big pictures of the runners, all open from the start. */
export function showRunners(host: HTMLElement, options: RunnerOptions): () => void {
  document.body.dataset.screen = 'pick';
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screen = element('section', 'pick');
  screen.append(speedRow(options));
  const grid = element('div', 'runners');
  const painters = RUNNER_IDS.map((id) => {
    const card = button('runner-card');
    card.dataset.runner = id;
    const { canvas, paint } = runnerCanvas(id);
    const name = element('span', 'runner-name');
    name.textContent = text().runners[id].replace('!', '');
    card.append(canvas, name);
    card.setAttribute('aria-label', text().runners[id]);
    card.addEventListener(
      'click',
      settled(() => {
        pickSound(RUNNER_PITCH[id]);
        options.onRunner(id);
      }),
    );
    grid.append(card);
    return paint;
  });
  screen.append(grid);
  host.append(screen);
  let frame = 0;
  const animate = (now: number): void => {
    painters.forEach((paint, i) => paint(now / 1000 + i * 0.7));
    frame = requestAnimationFrame(animate);
  };
  if (calm) painters.forEach((paint, i) => paint(i * 0.7));
  else frame = requestAnimationFrame(animate);
  return () => {
    cancelAnimationFrame(frame);
    screen.remove();
  };
}

export interface LevelOptions {
  difficulty: DifficultyId;
  progress: Progress;
  onLevel: (index: number) => void;
}

function starRow(count: number): HTMLElement {
  const row = element('span', 'tile-stars');
  row.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const star = element('span', i < count ? 'tile-star on' : 'tile-star');
    star.textContent = '★';
    row.append(star);
  }
  return row;
}

function levelTile(index: number, options: LevelOptions, firstNew: number): HTMLButtonElement {
  const plan = LEVELS[index]!;
  const world = WORLDS[plan.world];
  const tile = button(index === firstNew ? 'level-tile level-next' : 'level-tile');
  tile.dataset.level = plan.id;
  tile.style.setProperty('--tile-top', world.sky[0]);
  tile.style.setProperty('--tile-low', world.grass);
  tile.style.setProperty('--tile-soil', world.soil);
  tile.style.setProperty('--tile-ink', world.dark ? '#fff' : 'var(--ink)');
  const art = element('span', 'tile-art');
  art.textContent = world.art;
  const stage = element('span', 'tile-stage');
  stage.textContent = index % 2 === 0 ? '1' : '2';
  const best = options.progress.best[bestKey(plan.id, options.difficulty)];
  tile.append(art, stage, starRow(best?.stars ?? 0));
  if (plan.treasure) {
    const found = options.progress.treasures.includes(plan.id);
    const mark = element('span', found ? 'tile-treasure found' : 'tile-treasure');
    mark.textContent = found ? plan.treasure : '🎁';
    tile.append(mark);
  }
  if (plan.castle) {
    const mark = element('span', 'tile-castle');
    mark.textContent = '🏰';
    tile.append(mark);
  }
  const label = best ? text().starsLabel(best.stars) : text().notPlayed;
  tile.setAttribute('aria-label', `${text().worlds[plan.world]} ${index % 2 === 0 ? 1 : 2}. ${label}`);
  tile.addEventListener(
    'click',
    settled(() => {
      pickSound(440 + index * 40);
      options.onLevel(index);
    }),
  );
  return tile;
}

function shelf(progress: Progress): HTMLElement {
  const row = element('div', 'shelf');
  const secrets = LEVELS.filter((plan) => plan.treasure);
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `${text().treasures}: ${progress.treasures.length} / ${secrets.length}`);
  for (const plan of secrets) {
    const slot = element('span', 'shelf-slot');
    const found = progress.treasures.includes(plan.id);
    if (found) slot.textContent = plan.treasure;
    else slot.classList.add('empty');
    row.append(slot);
  }
  return row;
}

/** Every level, open from the start. The next one nobody has finished gently pulses. */
export function showLevels(host: HTMLElement, options: LevelOptions): () => void {
  document.body.dataset.screen = 'levels';
  const screen = element('section', 'pick');
  const grid = element('div', 'levels');
  const firstNew = LEVELS.findIndex((plan) => !options.progress.best[bestKey(plan.id, options.difficulty)]);
  grid.append(...LEVELS.map((_, index) => levelTile(index, options, firstNew)));
  screen.append(grid, shelf(options.progress));
  host.append(screen);
  return () => screen.remove();
}
