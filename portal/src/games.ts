import type { Language } from '@playroom/kit';
import registry from '../../games.json';

export type Skill = 'world' | 'memory' | 'logic' | 'colors' | 'reading' | 'numbers' | 'moving';

export type Mode = 'solo' | 'together';

export interface Game {
  slug: string;
  title: string;
  emoji: string;
  tagline: string;
  skills: Skill[];
  ages: string;
  modes: Mode[];
  languages: Language[];
  translations?: Partial<Record<Language, { title: string; tagline: string }>>;
  color: string;
  status: 'ready' | 'coming-soon';
}

export const GAMES = registry as Game[];

export const SKILL_LABELS: Record<Skill, string> = {
  world: '🌍 World',
  memory: '🧠 Memory',
  logic: '🧩 Logic',
  colors: '🎨 Colors',
  reading: '🔤 Reading',
  numbers: '🔢 Numbers',
  moving: '🤸 Moving',
};

export const MODE_LABELS: Record<Mode, { emoji: string; label: string }> = {
  solo: { emoji: '🧒', label: 'Play alone' },
  together: { emoji: '🤝', label: 'Play together' },
};
