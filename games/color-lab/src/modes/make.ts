import { button, el, replayClass } from '../dom.ts';
import { Beaker, fillFor } from '../beaker.ts';
import { flyDrop, potButton } from '../pots.ts';
import { COLORS, mix, PAINTS, recipeText, sameColor, totalParts } from '../mix.ts';
import type { Paint, Parts } from '../mix.ts';
import { hintLine, MAKE_CAPACITY, recipePaints, targetRequest } from '../rounds.ts';
import type { Target } from '../rounds.ts';
import type { Turn } from '../round.ts';
import { say } from '../screen.ts';

function requestCard(target: Target): HTMLElement {
  const card = button('request', '', () => say(targetRequest(target)));
  const swatch = el('span', 'swatch');
  swatch.style.setProperty('--paint', COLORS[target.color].hex);
  card.append(
    el('span', 'who', target.who),
    el('span', 'bubble-text', `“${targetRequest(target)}”`),
    swatch,
  );
  return card;
}

export function playMake(target: Target, turn: Turn): void {
  const { area, signal } = turn;
  let parts: Parts = {};
  let mixed = false;
  let finished = false;

  const beaker = new Beaker();
  beaker.setLabel('An empty beaker');
  const message = el('p', 'message', 'Tap the paints!');
  const recipe = el('p', 'small-print');
  const pots = el('div', 'pots');
  const actions = el('div', 'actions');

  const potFor = new Map<Paint, HTMLButtonElement>();
  for (const paint of PAINTS) {
    const pot = potButton(paint, (tapped) => {
      addPaint(paint, tapped);
    });
    potFor.set(paint, pot);
    pots.append(pot);
  }

  const emptyBtn = button('btn', '🫙 Empty', () => {
    void clearBeaker();
  });
  const mixBtn = button('btn btn-grape btn-big', 'Mix! 🌀', () => {
    void runMix();
  });
  const hintBtn = button('btn btn-sun', '💡 Hint', () => {
    void showHint();
  });
  hintBtn.hidden = true;
  actions.append(emptyBtn, hintBtn, mixBtn);

  function refresh(): void {
    const count = totalParts(parts);
    emptyBtn.disabled = count === 0;
    mixBtn.disabled = count === 0 || mixed;
    recipe.textContent = recipeText(parts);
  }

  function addPaint(paint: Paint, pot: HTMLButtonElement): void {
    if (finished) return;
    if (totalParts(parts) >= MAKE_CAPACITY) {
      beaker.wiggle();
      say('The beaker is full! Tap Mix.');
      return;
    }
    clearHints();
    const partsBelow = totalParts(parts);
    parts = { ...parts, [paint]: (parts[paint] ?? 0) + 1 };
    mixed = false;
    const hex = COLORS[paint].hex;
    flyDrop(pot, beaker.element, hex);
    beaker.addBand(hex, fillFor(partsBelow + 1), partsBelow);
    say(paint);
    refresh();
  }

  async function clearBeaker(): Promise<void> {
    parts = {};
    mixed = false;
    clearHints();
    refresh();
    message.textContent = 'Tap the paints!';
    beaker.setLabel('An empty beaker');
    await beaker.empty();
  }

  function clearHints(): void {
    for (const pot of potFor.values()) pot.classList.remove('hinted');
  }

  async function showHint(): Promise<void> {
    const line = `Let's start fresh. ${hintLine(target)}`;
    await clearBeaker();
    for (const paint of recipePaints(target.recipe)) potFor.get(paint)?.classList.add('hinted');
    message.textContent = hintLine(target);
    say(line);
  }

  async function runMix(): Promise<void> {
    const made = mix(parts);
    if (!made) return;
    const colors = PAINTS.filter((paint) => (parts[paint] ?? 0) > 0).map((paint) => COLORS[paint].hex);
    mixed = true;
    for (const control of [mixBtn, emptyBtn, hintBtn]) control.disabled = true;
    for (const pot of potFor.values()) pot.disabled = true;
    message.textContent = '';

    await beaker.swirl(colors, COLORS[made].hex);
    if (signal.aborted) return;

    for (const pot of potFor.values()) pot.disabled = false;
    beaker.setLabel(`A beaker of ${COLORS[made].name} paint`);

    if (sameColor(made, target.color)) {
      finished = true;
      const line = `You made ${COLORS[target.color].name}! Thank you!`;
      for (const pot of potFor.values()) pot.disabled = true;
      beaker.celebrate();
      message.textContent = line;
      turn.win(beaker.element);
      say(line);
      actions.replaceChildren(turn.finish());
      return;
    }

    const line = `Ooh, that made ${COLORS[made].name}! Try again!`;
    beaker.wiggle();
    replayClass(message, 'wiggle');
    message.textContent = line;
    hintBtn.hidden = false;
    hintBtn.disabled = false;
    refresh();
    say(line);
  }

  const layout = el('div', 'play-make');
  const left = el('div', 'bench-wrap');
  left.append(beaker.element, el('div', 'bench'));
  const right = el('div', 'panel');
  right.append(message, recipe, pots, actions);
  layout.append(requestCard(target), left, right);
  area.append(layout);
  refresh();
  say(targetRequest(target));
}

