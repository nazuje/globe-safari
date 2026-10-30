import { canSpeak, say, stopSpeaking } from '@playroom/kit';
import { text } from './lang/index.ts';

/*
 * This game says a word slowly and then normally, so it needs its own rates and
 * lines that wait their turn. This file is the game's one place for speech.
 */
const RATE = { word: 0.75, slow: 0.45, normal: 0.95 } as const;
const PITCH = 1.1;

export function letterSound(letter: string): string {
  return text().letterSound(letter);
}

interface Part {
  text: string;
  rate: number;
  /** Slovenian plays a recording, so saying a word slowly needs its slow recording. */
  slow?: boolean;
}

function sayInOrder(parts: readonly Part[]): void {
  if (!canSpeak()) return;
  stopSpeaking();
  for (const { text: line, rate, slow } of parts) void say(line, { rate, pitch: PITCH, queue: true, slow });
}

/** A Slovenian letter is a very short recording, so it uses the slow one to be heard clearly. */
function letterPart(letter: string): Part {
  return { text: letterSound(letter), rate: RATE.normal, slow: true };
}

export function sayWord(word: string): void {
  sayInOrder([{ text: word, rate: RATE.word }]);
}

export function sayLine(line: string): void {
  sayInOrder([{ text: line, rate: RATE.normal }]);
}

/** A letter, then optionally a kind line such as "Try another one!". */
export function sayLetter(letter: string, line?: string): void {
  const parts = [letterPart(letter)];
  if (line) parts.push({ text: line, rate: RATE.normal });
  sayInOrder(parts);
}

/** The last letter, then the finished word slowly, then normally, then any happy lines. */
export function sayWin(lastLetter: string, word: string, lines: readonly string[]): void {
  sayInOrder([
    letterPart(lastLetter),
    { text: word, rate: RATE.slow, slow: true },
    { text: word, rate: RATE.normal },
    ...lines.map((line) => ({ text: line, rate: RATE.normal })),
  ]);
}
