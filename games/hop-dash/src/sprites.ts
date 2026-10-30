/** Emoji text is slow to draw on tablets, so each one is painted once into a small hidden canvas and copied after that. */
const cache = new Map<string, HTMLCanvasElement>();
const SIZE_STEP = 6;

function paintStar(ctx: CanvasRenderingContext2D, size: number): void {
  const middle = size / 2;
  const outer = size * 0.47;
  const inner = outer * 0.52;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? inner : outer;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(middle + Math.cos(angle) * radius, middle + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd23c';
  ctx.strokeStyle = '#e39a00';
  ctx.lineWidth = size * 0.07;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = '#7a4a00';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(middle + side * size * 0.09, middle - size * 0.02, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#7a4a00';
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.arc(middle, middle + size * 0.04, size * 0.07, 0.3, Math.PI - 0.3);
  ctx.stroke();
}

function paint(art: string, pixels: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const size = Math.ceil(pixels * 1.3);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  if (art === 'star') {
    paintStar(ctx, size);
    return canvas;
  }
  ctx.font = `${pixels}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(art, size / 2, size / 2 + pixels * 0.05);
  return canvas;
}

function sprite(art: string, pixels: number): HTMLCanvasElement {
  const rounded = Math.max(SIZE_STEP, Math.round(pixels / SIZE_STEP) * SIZE_STEP);
  const key = `${art}@${rounded}`;
  let found = cache.get(key);
  if (!found) {
    found = paint(art, rounded);
    cache.set(key, found);
  }
  return found;
}

/** Draws art centred on a spot, in the canvas's current scale. */
export function stamp(ctx: CanvasRenderingContext2D, dpr: number, art: string, x: number, y: number, size: number, angle = 0): void {
  const image = sprite(art, size * dpr);
  const drawn = size * 1.3;
  if (angle === 0) {
    ctx.drawImage(image, x - drawn / 2, y - drawn / 2, drawn, drawn);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(image, -drawn / 2, -drawn / 2, drawn, drawn);
  ctx.restore();
}
