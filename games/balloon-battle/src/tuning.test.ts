import { describe, expect, it } from 'vitest';
import { airForTap, balloonScale, COMEBACK_MAX, comebackBoost, LEVELS, levelInfo, pumpHz } from './tuning.ts';

describe('tuning', () => {
  it('fills a balloon in the same time at each level’s own speed', () => {
    const seconds = LEVELS.map((level) => level.tapsToFill / level.tapsPerSecond);
    expect(Math.max(...seconds) - Math.min(...seconds)).toBeLessThan(0.01);
  });

  it('gives little players the most air per tap', () => {
    expect(airForTap('little', 0, 0)).toBeGreaterThan(airForTap('big', 0, 0));
    expect(airForTap('big', 0, 0)).toBeGreaterThan(airForTap('grownup', 0, 0));
  });

  it('helps only the player who is behind', () => {
    expect(comebackBoost(0.5, 0.5)).toBe(1);
    expect(comebackBoost(0.8, 0.2)).toBe(1);
    expect(comebackBoost(0.2, 0.3)).toBeGreaterThan(1);
  });

  it('keeps the help small however far behind', () => {
    expect(comebackBoost(0, 1)).toBe(1 + COMEBACK_MAX);
    expect(airForTap('big', 0, 1)).toBeCloseTo((1 + COMEBACK_MAX) / levelInfo('big').tapsToFill);
  });

  it('rises in pitch as the balloon fills', () => {
    expect(pumpHz(0.5)).toBeGreaterThan(pumpHz(0));
    expect(pumpHz(1)).toBeGreaterThan(pumpHz(0.5));
    expect(pumpHz(2)).toBe(pumpHz(1));
  });

  it('draws a small balloon that grows to full size', () => {
    expect(balloonScale(0)).toBeGreaterThan(0);
    expect(balloonScale(1)).toBe(1);
  });
});
