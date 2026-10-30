import registry from '../../games.json';

export type Skill = 'world' | 'memory' | 'logic' | 'colors' | 'reading' | 'numbers';

export interface Game {
  slug: string;
  title: string;
  emoji: string;
  tagline: string;
  skills: Skill[];
  ages: string;
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
};
