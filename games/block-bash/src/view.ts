const IDLE_TURN_SPEED = 0.2;
const TURN_REACH = 0.55;
const TILT = 0.26;
const FRAME_ROOM = 1.18;

export interface Framing {
  distance: number;
  height: number;
  lookY: number;
}

/** A slow sway around the front, so faces and flat pictures always stay in view. */
export const swayAngle = (seconds: number): number => Math.sin(seconds * IDLE_TURN_SPEED) * TURN_REACH;

/** How far back the camera sits so the structure and the table both fit on this screen. */
export function frameStructure(height: number, tableHalf: number, aspect: number, fovDegrees: number): Framing {
  const tan = Math.tan((fovDegrees * Math.PI) / 360);
  const lookY = height * 0.42 - 0.4;
  const fitsTall = (height * 0.62 + 1.6) / tan;
  const fitsWide = (tableHalf * 1.2) / (tan * aspect);
  const distance = Math.max(fitsTall, fitsWide, 7) * FRAME_ROOM + tableHalf * 0.5;
  return { distance, height: lookY + distance * Math.sin(TILT), lookY };
}
