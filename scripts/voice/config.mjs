// The one place for how the Slovenian voice sounds. Changing anything here
// changes every clip's name, so the next `npm run voice` regenerates them all.

export const VOICE = 'sl_SI-artur-medium';

/** Speech speed. Bigger is slower. The choice is between 1.12 and 1.3. */
export const LENGTH_SCALE = 1.12;

/** For lines a game declares in slowLines(), such as a word read out slowly. */
export const SLOW_LENGTH_SCALE = 1.9;

const TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB';

/** Trims silence at both ends (the second trim runs on the reversed audio), then evens out the loudness. */
export const AUDIO_FILTER = `${TRIM},areverse,${TRIM},areverse,loudnorm=I=-16:TP=-1.5`;

export const MP3_ARGS = ['-ar', '22050', '-ac', '1', '-b:a', '56k'];
