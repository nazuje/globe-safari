import { canSpeak, stopSpeaking } from '@playroom/kit';

/*
 * Kit's speak() has one fixed rate and cancels whatever is playing, so it can't
 * say a word slowly and then normally. This file is the game's one place for
 * speech, with its own small queue on the same browser voices.
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

function voice(): SpeechSynthesisVoice | undefined {
  const english = speechSynthesis.getVoices().filter((candidate) => candidate.lang.startsWith('en'));
  return english.find((candidate) => candidate.localService) ?? english[0];
}

function sayInOrder(parts: readonly { text: string; rate: number }[]): void {
  if (!canSpeak()) return;
  stopSpeaking();
  for (const { text, rate } of parts) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = PITCH;
    const chosen = voice();
    if (chosen) utterance.voice = chosen;
    speechSynthesis.speak(utterance);
  }
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
