import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, homeButton } from '@playroom/kit';
import { button, byId, el } from './dom.ts';
import { Beaker } from './beaker.ts';
import { COLORS } from './mix.ts';
import { tin } from './pots.ts';
import { playGuess } from './modes/guess.ts';
import { playMake } from './modes/make.ts';
import { showFree } from './modes/free.ts';
import { runRound } from './round.ts';
import { pickRound, QUESTIONS, TARGETS } from './rounds.ts';
import { hush, loadProgress, say, sayAgain, showStars } from './screen.ts';

const screen = byId('screen');
const back = byId('back');
const title = byId('title');
const repeat = byId('repeat');

let leaving = new AbortController();

function enter(heading: string): AbortSignal {
  leaving.abort();
  leaving = new AbortController();
  hush();
  screen.replaceChildren();
  title.textContent = heading;
  document.body.classList.toggle('at-start', heading === 'Color Lab');
  back.hidden = heading === 'Color Lab';
  repeat.hidden = !canSpeak() || heading === 'Color Lab';
  window.scrollTo(0, 0);
  return leaving.signal;
}

function startGuess(): void {
  const signal = enter('Guess the color');
  showStars(loadProgress().stars.guess);
  runRound({
    mode: 'guess',
    root: screen,
    signal,
    deal: (level) => pickRound(QUESTIONS[level], Math.random),
    play: playGuess,
    onExit: showStart,
  });
}

function startMake(): void {
  const signal = enter('Make this color');
  showStars(loadProgress().stars.make);
  runRound({
    mode: 'make',
    root: screen,
    signal,
    deal: (level) => pickRound(TARGETS[level], Math.random),
    play: playMake,
    onExit: showStart,
  });
}

function startFree(): void {
  enter('Free paint');
  showStars(null);
  showFree(screen);
}

function guessArt(): HTMLElement {
  const art = el('span', 'mode-art');
  art.append(tin('red'), el('span', 'art-plus', '+'), tin('yellow'), el('span', 'art-plus', '= ?'));
  return art;
}

function makeArt(): HTMLElement {
  const art = el('span', 'mode-art');
  const swatch = el('span', 'swatch');
  swatch.style.setProperty('--paint', COLORS.green.hex);
  art.append(el('span', 'who', '🐸'), swatch);
  return art;
}

function freeArt(): HTMLElement {
  const art = el('span', 'mode-art');
  art.append(el('span', 'who', '🦋'), el('span', 'who', '🖌️'));
  return art;
}

function modeCard(label: string, art: HTMLElement, stars: number | null, onTap: () => void): HTMLButtonElement {
  const card = button('mode-card', '', () => {
    onTap();
  });
  card.append(art, el('span', 'mode-name', label));
  if (stars !== null) card.append(el('span', 'mode-stars', `⭐ ${stars}`));
  return card;
}

function showStart(): void {
  enter('Color Lab');
  showStars(null);
  const { stars } = loadProgress();

  const hero = new Beaker();
  hero.setLabel('A bubbling beaker of purple paint');
  hero.show(COLORS.purple.hex, 68);
  hero.setBubbling(true);
  const heroWrap = el('div', 'hero');
  heroWrap.append(hero.element, el('div', 'bench'));

  const modes = el('div', 'modes');
  modes.append(
    modeCard('Guess the color', guessArt(), stars.guess, startGuess),
    modeCard('Make this color', makeArt(), stars.make, startMake),
    modeCard('Free paint', freeArt(), null, startFree),
  );
  const listen = button('btn listen', '🔊 What can I do?', () => {
    say('Welcome to the Color Lab! Guess the color. Make this color. Or free paint. Tap a picture to start!');
  });
  listen.hidden = !canSpeak();
  screen.append(heroWrap, modes, listen);
}

byId('topbar').prepend(homeButton());
back.addEventListener('click', showStart);
repeat.addEventListener('click', sayAgain);
showStart();
