import '@playroom/kit/kit.css';
import './style.css';
import { getLanguage, homeButton, languageButton, onLanguageChange, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { type MemberId, PLAYERS, TINY } from './band.ts';
import { Conductor, type Cue, type Timed } from './conductor.ts';
import { cleanFans, type Fans } from './director.ts';
import { byId, el, onTap } from './dom.ts';
import { Engine } from './engine.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { Loop } from './pattern.ts';
import { Meter, StageView } from './view.ts';

interface Saved extends Partial<Fans> {
  loop?: unknown;
}

const SAVE_KEY = 'silly-band';
/** The band's wake-up call. It only books notes ahead; the audio clock decides when they sound. */
const PUMP_MS = 40;
/** A name is skipped if another line has just been said, and said on a later tap. */
const NAME_QUIET_MS = 1100;
/** Stops a finger bouncing on ▶ from switching the band straight back off. */
const PLAY_GUARD_MS = 350;
const HINT_MEMBER: MemberId = 'cat';
const TAPS_BEFORE_PLAY_NUDGE = 6;
const BEATS_BEFORE_RECORD_NUDGE = 32;

useClips(clips);

const saved = store.get<Saved | null>(SAVE_KEY, null);
const engine = new Engine();
const conductor = new Conductor(Math.random, cleanFans(saved), Loop.load(saved?.loop, PLAYERS));
const view = new StageView({ tapMember, tapTiny });
const meter = new Meter();
const introduced = new Set<MemberId>();
const cues: Timed<Cue>[] = [];

const title = byId('title');
const clearButton = el('button', 'clear-btn', '🧹');
const playButton = bigButton('btn btn-leaf', 'play');
const recordButton = bigButton('btn btn-coral', 'record');
const wildButton = bigButton('btn btn-grape', 'wild');
const home = homeButton();

let pump: number | null = null;
let lastLineAt = 0;
let lastPlayTap = 0;
let tapCount = 0;
let beatsPlayed = 0;
let audienceDrawn = 0;

interface BigButton {
  button: HTMLButtonElement;
  icon: HTMLElement;
  label: HTMLElement;
}

function bigButton(className: string, id: string): BigButton {
  const button = el('button', `${className} big-btn`);
  button.type = 'button';
  button.id = id;
  const icon = el('span', 'big-icon');
  icon.setAttribute('aria-hidden', 'true');
  const label = el('span', 'big-label');
  button.append(icon, label);
  return { button, icon, label };
}

function save(): void {
  const { audience, tiny } = conductor.director.fans;
  store.set(SAVE_KEY, { audience, tiny, loop: conductor.loop.save() });
}

function say(line: string): void {
  lastLineAt = performance.now();
  speak(line);
}

function cheer(): void {
  const { cheers } = text().say;
  say(cheers[Math.floor(Math.random() * cheers.length)] ?? cheers[0] ?? '');
}

function nudge(button: BigButton | null): void {
  for (const each of [playButton, recordButton, wildButton]) each.button.classList.toggle('nudge', each === button);
}

/** Book the next moment's notes. Called on a timer, but every note lands by the audio clock. */
function pumpNotes(): void {
  if (document.hidden) return;
  const { notes, cues: fresh } = conductor.tick(engine.now);
  for (const { at, item } of notes) engine.play(item, conductor.style.id, at);
  cues.push(...fresh);
}

function ensurePump(): void {
  pump ??= window.setInterval(pumpNotes, PUMP_MS);
}

function playCue(cue: Cue): void {
  switch (cue.kind) {
    case 'member':
      view.react(cue.member);
      break;
    case 'tiny':
      view.hopAllTiny();
      break;
    case 'beat':
      if (!conductor.playing) break;
      view.beat();
      if (++beatsPlayed === BEATS_BEFORE_RECORD_NUDGE && conductor.loop.size === 0) nudge(recordButton);
      break;
    case 'solo':
      view.spotlight(cue.member);
      if (cue.member) say(text().say.solo);
      else cheer();
      break;
    case 'crowd':
      view.crowdWild(cue.wild);
      if (cue.wild) say(text().say.crowd);
      break;
    case 'egg':
      if (cue.stage === 'laid') {
        view.layEgg();
        view.react('chicken');
        say(text().say.egg);
      } else {
        view.crackEgg();
      }
      break;
    case 'hatch':
      view.hatchEgg();
      if (!cue.friend) break;
      view.drawTiny(conductor.director.fans.tiny, true);
      say(text().say.friend);
      save();
      break;
    case 'recorded':
      if (cue.notes > 0) say(text().say.listen);
      drawControls();
      save();
      nudge(wildButton);
      break;
  }
}

function drawMeter(): void {
  const { recording, playing, loop } = conductor;
  const mode = recording ? 'take' : playing && loop.size > 0 ? 'song' : 'off';
  meter.draw(mode === 'off' ? 0 : conductor.progress(engine.now), mode);
}

function frame(): void {
  const now = engine.now;
  while (cues[0] && cues[0].at <= now) {
    const next = cues.shift();
    if (next) playCue(next.item);
  }
  const { audience } = conductor.director.fans;
  if (audience !== audienceDrawn) {
    view.drawCrowd(audience);
    if (audienceDrawn > 0) save();
    audienceDrawn = audience;
  }
  drawMeter();
  requestAnimationFrame(frame);
}

function drawControls(): void {
  const t = text();
  const { playing, recording, style, loop } = conductor;
  playButton.icon.textContent = playing ? '⏸️' : '▶️';
  playButton.label.textContent = playing ? t.pause : t.play;
  playButton.button.setAttribute('aria-pressed', String(playing));
  recordButton.icon.textContent = '🔴';
  recordButton.label.textContent = recording ? t.recording : t.record;
  recordButton.button.classList.toggle('is-recording', recording);
  recordButton.button.setAttribute('aria-pressed', String(recording));
  wildButton.icon.textContent = '✨';
  wildButton.label.textContent = t.styles[style.id];
  clearButton.hidden = loop.size === 0;
}

function drawWords(): void {
  const t = text();
  document.documentElement.lang = getLanguage();
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.description);
  title.textContent = t.title;
  home.setAttribute('aria-label', t.home);
  clearButton.setAttribute('aria-label', t.clear);
  clearButton.title = t.clear;
  view.setNames(t.names);
  drawControls();
}

function drawStyle(): void {
  const { id, emoji } = conductor.style;
  view.setStyle(id, emoji);
  drawControls();
}

function stopBand(): void {
  conductor.stop();
  cues.length = 0;
  view.clearEffects();
  drawControls();
}

/** The page is going away, or the band was hushed: nothing may keep sounding. */
function hush(): void {
  stopBand();
  engine.sleep();
  stopSpeaking();
  save();
  if (pump !== null) window.clearInterval(pump);
  pump = null;
}

function firstTapDone(): void {
  tapCount += 1;
  view.hideHint();
  if (tapCount === TAPS_BEFORE_PLAY_NUDGE && !conductor.playing && beatsPlayed === 0) nudge(playButton);
}

function tapPlayer(player: MemberId | typeof TINY): void {
  engine.wake();
  ensurePump();
  const played = conductor.tap(player, engine.now);
  if (played) engine.play(played.item, conductor.style.id, played.at);
  firstTapDone();
}

function tapMember(member: MemberId): void {
  // The picture moves first, in this very tap. The note may wait a moment for the beat.
  view.react(member);
  tapPlayer(member);
  if (introduced.has(member) || performance.now() - lastLineAt < NAME_QUIET_MS) return;
  introduced.add(member);
  say(text().say.name(text().names[member]));
}

function tapTiny(): void {
  tapPlayer(TINY);
}

function tapPlay(): void {
  const moment = performance.now();
  if (moment - lastPlayTap < PLAY_GUARD_MS) return;
  lastPlayTap = moment;
  engine.wake();
  ensurePump();
  nudge(null);
  if (conductor.playing) {
    stopBand();
    engine.silence();
    return;
  }
  conductor.start(engine.now);
  pumpNotes();
  drawControls();
}

function tapRecord(): void {
  if (conductor.recording) return;
  engine.wake();
  ensurePump();
  nudge(null);
  conductor.record(engine.now);
  engine.play({ voice: 'sparkle', midi: 84 }, conductor.style.id, engine.now);
  say(text().say.record);
  pumpNotes();
  drawControls();
}

function tapWild(): void {
  engine.wake();
  ensurePump();
  nudge(null);
  conductor.wild(engine.now);
  engine.play({ voice: 'whoosh', midi: 0 }, conductor.style.id, engine.now);
  say(text().say.name(text().styles[conductor.style.id]));
  drawStyle();
  pumpNotes();
}

function tapClear(): void {
  conductor.loop.clear();
  save();
  drawControls();
}

function build(): void {
  byId('topbar').prepend(home);
  clearButton.type = 'button';
  clearButton.hidden = true;
  clearButton.addEventListener('click', tapClear);
  const language = languageButton(['en', 'sl']);
  language.classList.add('topbar-end');
  byId('topbar').append(clearButton, language);

  const controls = el('div', 'controls');
  controls.append(playButton.button, recordButton.button, wildButton.button);
  onTap(playButton.button, tapPlay);
  onTap(recordButton.button, tapRecord);
  onTap(wildButton.button, tapWild);
  byId('app').append(view.stage, view.crowd, meter.element, controls);
}

function wakeOnTap(event: Event): void {
  // A tap on 🏠 is leaving, so it must not stir the sound it has just hushed.
  if (event.target instanceof Node && home.contains(event.target)) return;
  engine.wake();
}

function listen(): void {
  // iOS doesn't count pointerdown as a tap, so these wake the sound too.
  for (const type of ['pointerdown', 'touchend', 'click']) {
    document.addEventListener(type, wakeOnTap, { capture: true, passive: true });
  }
  document.addEventListener('gesturestart', (event) => event.preventDefault());
  home.addEventListener('pointerdown', hush);
  home.addEventListener('click', hush);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hush();
  });
  window.addEventListener('pagehide', hush);
  onLanguageChange(drawWords);
}

build();
listen();
drawWords();
drawStyle();
view.drawTiny(conductor.director.fans.tiny);
view.showHint(HINT_MEMBER);
requestAnimationFrame(frame);
