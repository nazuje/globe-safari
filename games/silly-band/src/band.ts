export const MEMBER_IDS = ['frog', 'robot', 'dino', 'cat', 'alien', 'chicken'] as const;
export type MemberId = (typeof MEMBER_IDS)[number];

/** The tiny hatched friends all share this player's name in a recording. */
export const TINY = 'tiny';
export type Player = MemberId | typeof TINY;
export const PLAYERS: readonly string[] = [...MEMBER_IDS, TINY];

export type Job = 'bass' | 'voice' | 'drum' | 'melody' | 'sparkle' | 'clap';
export type Dance = 'stretch' | 'stomp' | 'wobble' | 'mouth' | 'spin' | 'flap';

export interface Member {
  id: MemberId;
  job: Job;
  dance: Dance;
  /** Shows what it plays. */
  badge: string;
  /** What flies out of it on a tap. */
  puff: string;
  color: string;
}

export const MEMBERS: Record<MemberId, Member> = {
  frog: { id: 'frog', job: 'bass', dance: 'stretch', badge: '🎸', puff: '🎵', color: '#3ecf8e' },
  robot: { id: 'robot', job: 'voice', dance: 'wobble', badge: '🎤', puff: '⚡', color: '#4cb8ff' },
  dino: { id: 'dino', job: 'drum', dance: 'stomp', badge: '🥁', puff: '💥', color: '#ff9f43' },
  cat: { id: 'cat', job: 'melody', dance: 'mouth', badge: '🎹', puff: '🎶', color: '#ff7eb6' },
  alien: { id: 'alien', job: 'sparkle', dance: 'spin', badge: '🔔', puff: '✨', color: '#b08cff' },
  chicken: { id: 'chicken', job: 'clap', dance: 'flap', badge: '👏', puff: '🪶', color: '#ffc93c' },
};

/** Who can hatch from an egg, in the order they might appear. */
export const TINY_FRIENDS = ['🐥', '🐞', '🐢', '🦔', '🐙', '🦄', '🐌', '🐧'];
export const MAX_TINY = 6;

/** The audience. A wide mix, because every child should spot a favorite. */
export const CROWD = ['🐻', '🐰', '🦊', '🐼', '🦁', '🐨', '🐷', '🐵', '🐯', '🐮', '🐶', '🦄', '🐧', '🐲'];
