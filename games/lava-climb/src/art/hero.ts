export interface Pose {
  /** Middle of the hero's feet, in world units. */
  x: number;
  y: number;
  facing: 1 | -1;
  vx: number;
  vy: number;
  ground: boolean;
  sliding: boolean;
  dashing: boolean;
  /** 0 is unharmed. Above that the hero is singed, and the number counts up the seconds. */
  singed: number;
  bonked: boolean;
  time: number;
}

const BODY = '#4ff0c8';
const BODY_DARK = '#17a98c';
const OUTLINE = '#0d1a2b';
const SCARF = '#ff4fa3';
const SOOT = '#2a2730';

function scarf(c: CanvasRenderingContext2D, pose: Pose): void {
  const trail = -Math.sign(pose.vx || pose.facing);
  const lift = Math.max(-6, Math.min(6, pose.vy * 0.015));
  const flap = Math.sin(pose.time * 18) * 1.6;
  c.strokeStyle = SCARF;
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -7);
  c.quadraticCurveTo(trail * 6, -8 + lift + flap, trail * 11, -6 + lift * 1.6 - flap);
  c.stroke();
  c.fillStyle = SCARF;
  c.fillRect(-6, -8.5, 12, 3);
}

function legs(c: CanvasRenderingContext2D, pose: Pose): void {
  const running = pose.ground && Math.abs(pose.vx) > 20;
  const swing = running ? Math.sin(pose.time * 26) * 3 : 0;
  const tuck = pose.ground ? 0 : -2;
  c.fillStyle = OUTLINE;
  c.fillRect(-5 + swing, -3 + tuck, 4, 3);
  c.fillRect(1 - swing, -3 + tuck, 4, 3);
}

function eyes(c: CanvasRenderingContext2D, pose: Pose): void {
  const shocked = pose.singed > 0;
  const blink = !shocked && Math.sin(pose.time * 1.7) > 0.985;
  const look = shocked ? 0 : pose.facing * 1.2;
  const up = !shocked && pose.vy < -60 ? -1 : 0;
  const radius = shocked ? 3.6 : 2.7;
  for (const side of [-3.2, 3.2]) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.ellipse(side + look * 0.7, -11.5, radius, blink ? 0.4 : radius, 0, 0, Math.PI * 2);
    c.fill();
    if (blink) continue;
    c.fillStyle = OUTLINE;
    c.beginPath();
    c.arc(side + look, -11.5 + up, shocked ? 1 : 1.5, 0, Math.PI * 2);
    c.fill();
  }
}

function mouth(c: CanvasRenderingContext2D, pose: Pose): void {
  c.fillStyle = pose.singed > 0 ? '#ff5a5a' : OUTLINE;
  c.beginPath();
  if (pose.singed > 0) c.ellipse(pose.facing * 0.5, -5.4, 2.2, 2.8, 0, 0, Math.PI * 2);
  else c.ellipse(pose.facing * 1, -6.2, 1.5, 0.8, 0, 0, Math.PI * 2);
  c.fill();
}

function bonkStars(c: CanvasRenderingContext2D, pose: Pose): void {
  c.fillStyle = '#ffe14a';
  for (let at = 0; at < 3; at += 1) {
    const angle = pose.time * 8 + (at * Math.PI * 2) / 3;
    c.beginPath();
    c.arc(Math.cos(angle) * 9, -19 + Math.sin(angle) * 2.5, 1.9, 0, Math.PI * 2);
    c.fill();
  }
}

/** A round little climber in a pink scarf, drawn in world units with the feet at the origin. */
export function drawHero(c: CanvasRenderingContext2D, pose: Pose): void {
  const shake = pose.singed > 0 ? Math.sin(pose.time * 60) * 0.7 : 0;
  const stretch = pose.dashing ? 0.8 : pose.ground ? 1 : Math.max(0.86, Math.min(1.18, 1 + Math.abs(pose.vy) / 1800));
  c.save();
  c.translate(pose.x + shake, pose.y);
  if (pose.sliding) c.rotate(pose.facing * 0.1);
  c.scale((1 / stretch) * 1.28, stretch * 1.28);
  legs(c, pose);
  c.fillStyle = OUTLINE;
  c.beginPath();
  c.ellipse(0, -9.5, 8.2, 8.4, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = pose.singed > 0 ? SOOT : BODY;
  c.beginPath();
  c.ellipse(0, -9.5, 7, 7.2, 0, 0, Math.PI * 2);
  c.fill();
  if (pose.singed === 0) {
    c.fillStyle = BODY_DARK;
    c.beginPath();
    c.ellipse(0, -4.6, 6, 2.2, 0, 0, Math.PI * 2);
    c.fill();
  }
  scarf(c, pose);
  eyes(c, pose);
  mouth(c, pose);
  if (pose.singed > 0 && pose.bonked) bonkStars(c, pose);
  c.restore();
}
