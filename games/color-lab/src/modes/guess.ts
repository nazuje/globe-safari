import { button, el, wait } from '../dom.ts';
import { Beaker, SWIRL_MS } from '../beaker.ts';
import { tin } from '../pots.ts';
import { capitalize, COLORS } from '../mix.ts';
import type { ColorId } from '../mix.ts';
import { guessChoices, questionAnswer, questionSentence } from '../rounds.ts';
import type { Question } from '../rounds.ts';
import type { Turn } from '../round.ts';
import { say } from '../screen.ts';

const TILT_MS = 420;
/** The second paint starts while the first is still running, so the pour feels like one event. */
const SECOND_POUR_MS = 750;
const POUR_MS = 1050;

interface Side {
  pot: HTMLElement;
  stream: HTMLElement;
}

function pourSide(color: ColorId, side: 'left' | 'right', stage: HTMLElement): Side {
  const pot = el('div', `stage-pot stage-pot-${side}`);
  pot.append(tin(color), el('span', 'pot-label', capitalize(COLORS[color].name)));
  const stream = el('div', `stream stream-${side}`);
  stream.style.background = COLORS[color].hex;
  stage.append(stream, pot);
  return { pot, stream };
}

function blob(color: ColorId, onTap: (choice: HTMLButtonElement) => void): HTMLButtonElement {
  const choice = el('button', 'choice');
  choice.type = 'button';
  const paint = el('span', 'blob');
  paint.style.setProperty('--paint', COLORS[color].hex);
  choice.append(paint, el('span', 'choice-label', capitalize(COLORS[color].name)));
  choice.addEventListener('click', () => onTap(choice));
  return choice;
}

/** Tilt, pour one, pour the other, right the pots, then stir. */
async function pourAndSwirl(left: Side, right: Side, beaker: Beaker, question: Question): Promise<void> {
  const hexA = COLORS[question.a].hex;
  const hexB = COLORS[question.b].hex;
  left.pot.classList.add('tipped');
  right.pot.classList.add('tipped');
  await wait(TILT_MS);

  beaker.setBubbling(true);
  left.stream.classList.add('flowing');
  beaker.addBand(hexA, 38);
  await wait(SECOND_POUR_MS);
  right.stream.classList.add('flowing');
  beaker.addBand(hexB, 76);
  await wait(POUR_MS - SECOND_POUR_MS);
  left.stream.classList.remove('flowing');
  await wait(SECOND_POUR_MS);
  right.stream.classList.remove('flowing');
  left.pot.classList.remove('tipped');
  right.pot.classList.remove('tipped');
  await wait(250);

  await beaker.swirl([hexA, hexB], COLORS[questionAnswer(question)].hex, SWIRL_MS);
  beaker.setBubbling(false);
}

export function playGuess(question: Question, turn: Turn): void {
  const { area, signal } = turn;
  const answer = questionAnswer(question);
  let picked: ColorId | null = null;

  const stage = el('div', 'stage');
  const left = pourSide(question.a, 'left', stage);
  const right = pourSide(question.b, 'right', stage);
  const beaker = new Beaker();
  beaker.setLabel('An empty beaker');
  stage.append(el('div', 'bench'), beaker.element);

  const panel = el('div', 'panel');
  const message = el('p', 'message', `${capitalize(COLORS[question.a].name)} + ${COLORS[question.b].name} = ?`);
  const choices = el('div', 'choices');
  const actions = el('div', 'actions');

  const options = guessChoices(question, Math.random).map((color) => {
    const choice = blob(color, (tapped) => {
      picked = color;
      for (const option of options) option.choice.classList.toggle('picked', option.choice === tapped);
      pour.disabled = false;
      say(COLORS[color].name);
    });
    return { color, choice };
  });
  choices.append(...options.map((option) => option.choice));

  const pour = button('btn btn-coral btn-big', 'Pour! 💧', () => {
    void runPour();
  });
  pour.disabled = true;
  actions.append(pour);
  panel.append(message, choices, actions);
  const layout = el('div', 'play-guess');
  layout.append(stage, panel);
  area.append(layout);

  async function runPour(): Promise<void> {
    pour.disabled = true;
    pour.hidden = true;
    for (const option of options) option.choice.disabled = true;
    message.textContent = '';

    await pourAndSwirl(left, right, beaker, question);
    if (signal.aborted) return;

    const guessedRight = picked === answer;
    const sentence = questionSentence(question);
    const line = guessedRight ? `Yes! ${sentence}` : `Ooh, surprise! ${sentence}`;
    beaker.setLabel(`A beaker of ${COLORS[answer].name} paint`);
    beaker.celebrate();
    message.textContent = line;
    message.classList.add('message-big');
    for (const option of options) {
      option.choice.classList.toggle('correct', option.color === answer);
    }
    if (guessedRight) turn.win(beaker.element);
    say(line);
    actions.append(turn.finish());
  }

  say(`${capitalize(COLORS[question.a].name)} and ${COLORS[question.b].name}. What color will they make?`);
}
