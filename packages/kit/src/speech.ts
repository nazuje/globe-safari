export function canSpeak(): boolean {
  return 'speechSynthesis' in globalThis && typeof SpeechSynthesisUtterance !== 'undefined';
}

function friendlyVoice(): SpeechSynthesisVoice | undefined {
  const english = speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en'));
  return english.find((voice) => voice.localService) ?? english[0];
}

/** Reads text aloud, a little slower than normal, interrupting anything already playing. */
export function speak(text: string): void {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  const voice = friendlyVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) speechSynthesis.cancel();
}
