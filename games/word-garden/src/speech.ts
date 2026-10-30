import { canSpeak, say, stopSpeaking } from '@playroom/kit';

/*
 * This game says a word slowly and then normally, so it needs its own rates and
 * lines that wait their turn. This file is the game's one place for speech.
 */
const RATE = { word: 0.75, slow: 0.45, normal: 0.95 } as const;
const PITCH = 1.1;

/**
 * What to hand the voice for a lone letter. Capitals nudge most voices into
 * saying the letter's name. "a" alone often comes out as "uh", so it is spelled
 * by sound. Add a line here to tune any letter that sounds wrong.
 */
const LETTER_SOUNDS: Record<string, string> = { a: 'ay' };

export function letterSound(letter: string): string {
  return LETTER_SOUNDS[letter] ?? letter.toUpperCase();
}

function sayInOrder(parts: readonly { text: string; rate: number }[]): void {
  if (!canSpeak()) return;
  stopSpeaking();
  for (const { text, rate } of parts) void say(text, { rate, pitch: PITCH, queue: true });
}

export function sayWord(word: string): void {
  sayInOrder([{ text: word, rate: RATE.word }]);
}

export function sayLine(line: string): void {
  sayInOrder([{ text: line, rate: RATE.normal }]);
}

/** A letter, then optionally a kind line such as "Try another one!". */
export function sayLetter(letter: string, line?: string): void {
  const parts = [{ text: letterSound(letter), rate: RATE.normal }];
  if (line) parts.push({ text: line, rate: RATE.normal });
  sayInOrder(parts);
}

/** The last letter, then the finished word slowly, then normally, then any happy lines. */
export function sayWin(lastLetter: string, word: string, lines: readonly string[]): void {
  sayInOrder([
    { text: letterSound(lastLetter), rate: RATE.normal },
    { text: word, rate: RATE.slow },
    { text: word, rate: RATE.normal },
    ...lines.map((text) => ({ text, rate: RATE.normal })),
  ]);
}
