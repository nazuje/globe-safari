# Voice tool

Generates Slovenian speech clips ahead of time with the Piper "Artur" voice. Tablets may have no Slovenian system voice, so the clips ship inside each game and play through the kit's `say()`. See "Add a language to a game" in the [root README](../../README.md) for how a game uses them.

Generating is a job for your Mac, not for CI. The clips are committed, so `npm test`, `npm run build` and the deploy need none of this.

## Setup

Once per machine. You need [uv](https://docs.astral.sh/uv/), ffmpeg and espeak-ng:

```sh
brew install uv ffmpeg espeak-ng
npm run voice:setup
```

This creates `scripts/voice/.venv` from the pinned `requirements.txt`, then downloads the 63 MB model into `scripts/voice/model/` and checks its checksum. Both folders are gitignored. Never commit the model.

## Commands

```sh
npm run voice                       # every game with src/lang/sl.ts
npm run voice -- yum-yum-monster    # one game
npm run voice:words                 # every word and its stress, for a person to scan
npm run voice:words -- yum-yum-monster
npm run voice:fix -- tukaj tˈuːkaj  # add or change a fix, then regenerate
```

`npm run voice` is safe to run any time. It reads each game's lines, makes only the clips that are missing, removes clips nothing uses any more, and rewrites the game's manifest.

## What goes in and comes out

A game declares its lines in `games/<slug>/src/lang/sl.ts`:

- `spokenLines(): string[]`, required: every line the game can say, including every counted combination.
- `slowLines(): string[]`, optional: lines that also need a slow recording, such as a word read out slowly. These are generated at `SLOW_LENGTH_SCALE` and played by `say(text, { slow: true })`. A recording can't change speed when it plays, so this is how slow speech works in Slovenian.

Node imports that file directly and strips the types, so there is no build step and no new dependency. It works with the games' import style, including imports from `@playroom/kit`, because the workspace link leads outside `node_modules`. The file can't import CSS, assets or JSON.

Out come:

- `games/<slug>/public/voice/sl/<hash>.mp3`: Vite copies these into the built game.
- `games/<slug>/src/lang/sl.clips.json`: the manifest, mapping each line to its file. It lives in `src/` rather than next to the clips so the game can import it, which makes it part of the bundle and available before the first line, with no fetch to wait for or fail.

The hash covers the text, the phonemes, the speed, the voice and the audio settings. So a pronunciation fix regenerates only the lines containing that word, and changing a setting regenerates everything.

Commit the MP3s and the manifest together.

## Settings

`config.mjs` holds everything about how the voice sounds, in one place. `LENGTH_SCALE` is the default speed, where bigger is slower: it is `1.12` for now, with `1.3` the other candidate. Changing it and running `npm run voice` regenerates every clip.

Audio processing matches the settings first tuned by ear: silence trimmed from both ends with `silenceremove` at -45 dB (the second trim runs on reversed audio), then `loudnorm=I=-16:TP=-1.5`, then 22050 Hz mono 56k MP3. Clips of a second or two come out a little under -16 LUFS, because loudness measurement needs longer audio. They still sound even.

## Fixing pronunciation

Slovenian stress can't be worked out from spelling, and espeak gets some words wrong. Run `npm run voice:words` and scan the list. The stressed vowel is capitalized (`tUkaj`), followed by the IPA that was used, and words already fixed say `(fixed)`. Words with no written vowel at the stress, such as `vrt`, show the IPA only.

`pronunciation.json` maps a written word to its IPA. A fix applies to that whole word in any capitalization, never to part of a longer word, so `tukaj` leaves `tukajle` alone. Each grammatical form is its own word and needs its own entry.

To write a fix, copy what espeak produced and move the stress mark `ˈ` to just before the stressed vowel. Long vowels carry `ː`. Compare `tukˈaːj` from espeak with the fixed `tˈuːkaj`. A sound the voice doesn't know stops the run with an error rather than quietly leaving a gap in the clip.

The fix can't be patched into espeak's output, because espeak merges small words: `v hiši` comes back as one word. So a line is cut around its fixed words, espeak reads the pieces between them, and the fixes go in at the joins.

## Why the pipeline goes through Homebrew's espeak-ng

Piper normally turns text into phonemes itself, using a bundled copy of espeak-ng. On macOS that bundled copy is broken: it looks for its data at a path from the machine that built it. The `espeakng-loader` package has the same problem.

So this tool splits the work. `phonemize.py` calls Homebrew's espeak-ng through `phonemizer-fork` to get phonemes, and `synth.py` uses Piper only to turn those phonemes into audio, skipping its own text handling. `espeakng-loader` still appears in `requirements.txt` as a dependency of `phonemizer-fork`, but nothing uses it.

The library is expected at `/opt/homebrew/lib/libespeak-ng.dylib`. If yours is elsewhere, as on an Intel Mac, set `ESPEAK_LIBRARY`.

## Files

| File | What it does |
| --- | --- |
| `voice.mjs` | The commands: reads lines, plans the work, runs ffmpeg, writes clips and manifests |
| `lib.mjs` | The decisions, as plain functions. `lib.test.mjs` tests them as part of `npm test` |
| `lines.mjs` | Reads a game's `sl.ts`. The site build uses it too |
| `config.mjs` | Voice, speed and audio settings |
| `pronunciation.json` | Word fixes |
| `phonemize.py` | Text to IPA, through espeak-ng |
| `synth.py` | IPA to WAV, through Piper |
| `setup.sh` | One-time setup |

## Credit

Voice: [Piper "Artur"](https://huggingface.co/rhasspy/piper-voices/tree/main/sl/sl_SI/artur/medium), trained on the [Artur dataset](https://huggingface.co/datasets/ppisljar/artur_studio_tts/) by ppisljar, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
