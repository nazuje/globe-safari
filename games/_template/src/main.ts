import '@playroom/kit/kit.css';
import './style.css';
import { burst, canSpeak, homeButton, speak } from '@playroom/kit';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

byId('topbar').prepend(homeButton());

byId('cheer').addEventListener('click', (event) => {
  if (!(event instanceof MouseEvent)) return;
  burst(event.clientX, event.clientY);
  if (canSpeak()) speak('Hooray!');
});
