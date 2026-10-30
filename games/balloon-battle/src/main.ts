import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, useClips } from '@playroom/kit';
import { byId, onTap } from './dom.ts';
import { setFxLayer } from './fx.ts';
import { Game } from './game.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { redrawCaption, sayAgain, setCaption } from './voice.ts';

useClips(clips);

const home = homeButton();
const title = byId('title');
const repeat = byId('repeat');
const seats = byId('seats');
const change = byId('change');

function drawPage(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  title.textContent = words.title;
  home.setAttribute('aria-label', words.homeLabel);
  repeat.setAttribute('aria-label', words.repeatLabel);
  repeat.hidden = !canSpeak();
  change.setAttribute('aria-label', words.changePlayers);
  change.title = words.changePlayers;
  if (!game) return;
  change.hidden = !game.canChangePlayers;
  seats.textContent = game.opposite ? '⬆️⬇️' : '⬆️⬆️';
  const seatLabel = game.opposite ? words.sitOpposite : words.sitSideBySide;
  seats.setAttribute('aria-label', seatLabel);
  seats.title = seatLabel;
  redrawCaption();
}

/** Pinching, double-tap zoom, long-press menus and text selection all get in the way of mashing a screen. */
function blockBrowserGestures(): void {
  for (const type of ['contextmenu', 'selectstart', 'dragstart', 'dblclick', 'gesturestart', 'gesturechange']) {
    document.addEventListener(type, (event) => event.preventDefault());
  }
  // Older iPads can ignore touch-action for a pinch. This has to be non-passive to cancel anything.
  document.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
}

setFxLayer(byId('fx'));
setCaption(byId('spoken'));
byId('topbar').prepend(home);
repeat.after(languageButton(['en', 'sl']));
blockBrowserGestures();

const game: Game = new Game(byId('arena'), {
  hub: byId('hub'),
  seats,
  change,
  onChange: () => drawPage(),
});

onTap(repeat, sayAgain);
window.addEventListener('resize', () => game.applyLayout());
onLanguageChange(() => {
  drawPage();
  game.drawAll();
});
drawPage();
