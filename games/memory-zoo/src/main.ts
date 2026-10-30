import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, useClips } from '@playroom/kit';
import { byId } from './dom.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { startGame } from './playScreen.ts';
import { showSetup } from './setupScreen.ts';
import { redrawCaption, sayAgain, setCaption, setLine } from './voice.ts';

useClips(clips);

const app = byId('app');
const title = byId('title');
const repeat = byId('repeat');
const home = homeButton();

function goToSetup(): void {
  showSetup(app, (setup) => startGame(app, setup, goToSetup));
}

/** Everything outside the screens that carries words. */
function drawPage(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  title.textContent = words.title;
  home.setAttribute('aria-label', words.homeLabel);
  repeat.setAttribute('aria-label', words.repeatLabel);
  repeat.hidden = !canSpeak();
  redrawCaption();
}

byId('topbar').prepend(home);
repeat.after(languageButton(['en', 'sl']));
setCaption(byId('spoken'));
repeat.addEventListener('click', sayAgain);
onLanguageChange(drawPage);

goToSetup();
setLine(() => text().intro);
drawPage();
