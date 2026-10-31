import { describe, expect, it } from 'vitest';
import type { Grid } from './grid.ts';
import { boltDistance, cameraFacing, gapToBeam, laserCharge, sensorState, sweepBeam } from './hazards.ts';
import type { Camera, Laser, Sensor } from './level.ts';

const sensor: Sensor = { tiles: [], period: 4, on: 1.5, warn: 0.8, offset: 0 };
const camera: Camera = { mount: { x: 0, y: 0 }, from: { x: 0, y: 0 }, aim: 0, sweep: 1, period: 6, offset: 0, half: 0.3, range: 3 };
const bolt: Laser = {
  kind: 'bolt',
  mount: { x: 0, y: 0 },
  from: { x: 0.5, y: 0.5 },
  aim: 0,
  period: 4,
  offset: 0,
  charge: 0.9,
  speed: 4,
  range: 4,
  sweep: 0,
  on: 0,
};
const beam: Laser = { ...bolt, kind: 'sweep', sweep: 1, on: 2, period: 5 };
const open: Grid = { width: 9, height: 1, cells: new Uint8Array(9) };

describe('sensor rhythm', () => {
  it('goes on, off, warns, then on again', () => {
    expect(sensorState(sensor, 1)).toBe('on');
    expect(sensorState(sensor, 2)).toBe('off');
    expect(sensorState(sensor, 3.5)).toBe('warn');
    expect(sensorState(sensor, 4.1)).toBe('on');
  });

  it('always warns before it goes on', () => {
    let last = sensorState(sensor, 0);
    for (let t = 0; t < 40; t += 0.01) {
      const now = sensorState(sensor, t);
      if (now === 'on' && last !== 'on') expect(last).toBe('warn');
      last = now;
    }
  });
});

describe('cameras', () => {
  it('swings to one side, stays, then swings back', () => {
    expect(cameraFacing(camera, 0)).toBeCloseTo(-1);
    expect(cameraFacing(camera, 1.5)).toBeCloseTo(1);
    expect(cameraFacing(camera, 2.8)).toBeCloseTo(1);
    expect(cameraFacing(camera, 4.5)).toBeCloseTo(-1);
    expect(cameraFacing(camera, 5.9)).toBeCloseTo(-1);
  });
});

describe('lasers', () => {
  it('charges up fully before every shot', () => {
    expect(laserCharge(bolt, 2)).toBe(0);
    expect(laserCharge(bolt, 3.5)).toBeGreaterThan(0);
    expect(laserCharge(bolt, 3.99)).toBeGreaterThan(0.95);
  });

  it('never has a bolt in the air without having charged', () => {
    for (let t = bolt.period; t < 30; t += 0.01) {
      if (boltDistance(bolt, t) === 0) expect(laserCharge(bolt, t - 0.02)).toBeGreaterThan(0.9);
    }
  });

  it('flies, then stops at its range', () => {
    expect(boltDistance(bolt, 0.5)).toBeCloseTo(2);
    expect(boltDistance(bolt, 1.5)).toBeNull();
  });

  it('sweeps a beam, then rests', () => {
    expect(sweepBeam(beam, open, 0)?.angle).toBeCloseTo(-1);
    expect(sweepBeam(beam, open, 1)?.angle).toBeCloseTo(0);
    expect(sweepBeam(beam, open, 3)).toBeNull();
  });

  it('measures the gap to a beam, stopping at its tip', () => {
    const line = { angle: 0, length: 2 };
    expect(gapToBeam({ x: 0, y: 0 }, line, { x: 1, y: 0.5 })).toBeCloseTo(0.5);
    expect(gapToBeam({ x: 0, y: 0 }, line, { x: 3, y: 0 })).toBeCloseTo(1);
  });
});
