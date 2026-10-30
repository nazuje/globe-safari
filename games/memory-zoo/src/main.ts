import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, homeButton } from '@playroom/kit';
import { byId } from './dom.ts';
import { startGame } from './playScreen.ts';
import { showSetup } from './setupScreen.ts';
import { sayAgain, setCaption, setLine } from './voice.ts';

const app = byId('app');
const repeat = byId('repeat');

function goToSetup(): void {
  showSetup(app, (setup) => startGame(app, setup, goToSetup));
}

byId('topbar').prepend(homeButton());
setCaption(byId('spoken'));
repeat.hidden = !canSpeak();
repeat.addEventListener('click', sayAgain);

goToSetup();
setLine('Find the animal pairs!');
