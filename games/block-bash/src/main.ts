import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, speak, useClips } from '@playroom/kit';
import { createStage } from '@playroom/stage3d';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { startPlay } from './play.ts';
import { button, element } from './ui.ts';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const bar = byId('topbar');
const app = byId('app');
const heading = element('h1', 'title');
const home = homeButton();
const levels = button('bar-btn', '🗺️');
const retry = button('bar-btn', '↻');
const repeat = button('bar-btn', '🔊');
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, heading, levels, retry, repeat, language);

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const host = element('div', 'scene');
app.append(host);
const stage = createStage(host, { fov: 42, near: 0.5, far: 260 });

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = text().title;
  home.setAttribute('aria-label', text().home);
  levels.setAttribute('aria-label', text().pickLevel);
  retry.setAttribute('aria-label', text().retry);
  repeat.setAttribute('aria-label', text().sayAgain);
}

labelPage();

if (stage) {
  const game = startPlay(stage, app, () => motion.matches);
  levels.addEventListener('click', () => game.togglePicker());
  retry.addEventListener('click', () => game.retry());
  repeat.addEventListener('click', () => game.sayLine());
  onLanguageChange(() => {
    labelPage();
    game.redraw();
  });
  window.addEventListener('pagehide', () => game.stop());
  speak(text().hint);
  if (import.meta.env.DEV) Object.assign(window, { blockBash: game.dev });
} else {
  levels.hidden = true;
  retry.hidden = true;
  repeat.hidden = true;
  const sorry = element('p', 'no-3d', text().no3d);
  app.append(sorry);
  onLanguageChange(() => {
    labelPage();
    sorry.textContent = text().no3d;
  });
}
