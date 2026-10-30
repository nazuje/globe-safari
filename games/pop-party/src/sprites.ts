import { COLORS } from './world.ts';

const BUBBLE_SIZE = 192;
const EMOJI_SIZE = 112;
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

type Sprite = HTMLCanvasElement;

function canvas(size: number): { sprite: Sprite; ctx: CanvasRenderingContext2D } {
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas');
  return { sprite, ctx };
}

function gloss(ctx: CanvasRenderingContext2D, rim: string): void {
  const middle = BUBBLE_SIZE / 2;
  const radius = middle - 4;

  ctx.lineWidth = 5;
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.arc(middle, middle, radius - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(middle - radius * 0.38, middle - radius * 0.44, radius * 0.27, radius * 0.17, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(middle + radius * 0.5, middle + radius * 0.46, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function colorBubble(color: string): Sprite {
  const { sprite, ctx } = canvas(BUBBLE_SIZE);
  const middle = BUBBLE_SIZE / 2;
  const fill = ctx.createRadialGradient(middle - 24, middle - 30, 8, middle, middle, middle);
  fill.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  fill.addColorStop(0.55, `${color}aa`);
  fill.addColorStop(1, color);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(middle, middle, middle - 4, 0, Math.PI * 2);
  ctx.fill();
  gloss(ctx, 'rgba(255, 255, 255, 0.8)');
  return sprite;
}

const STRIPES = ['#ff6b6b', '#ffb020', '#ffe14d', '#3ecf8e', '#4cb8ff', '#8b5cf6', '#ff7ac6'];

function rainbowBubble(): Sprite {
  const { sprite, ctx } = canvas(BUBBLE_SIZE);
  const middle = BUBBLE_SIZE / 2;
  const slice = (Math.PI * 2) / STRIPES.length;
  STRIPES.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(middle, middle);
    ctx.arc(middle, middle, middle - 4, index * slice, (index + 1) * slice + 0.02);
    ctx.closePath();
    ctx.fill();
  });
  const shine = ctx.createRadialGradient(middle, middle, 0, middle, middle, middle);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  shine.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
  shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(middle, middle, middle - 4, 0, Math.PI * 2);
  ctx.fill();
  gloss(ctx, 'rgba(255, 255, 255, 0.9)');
  return sprite;
}

function emojiSprite(emoji: string): Sprite {
  const { sprite, ctx } = canvas(EMOJI_SIZE);
  ctx.font = `${EMOJI_SIZE * 0.8}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  const box = ctx.measureText(emoji);
  ctx.fillText(emoji, EMOJI_SIZE / 2, EMOJI_SIZE / 2 + (box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2);
  return sprite;
}

/** Drawing an image is far cheaper than drawing text, so every bubble and emoji is painted once and reused. */
export class Sprites {
  readonly colors: Sprite[] = COLORS.map(colorBubble);
  readonly gold: Sprite = colorBubble('#ffc21a');
  readonly sleepy: Sprite = colorBubble('#b7a6f5');
  readonly toot: Sprite = colorBubble('#9ccc3c');
  readonly rainbow: Sprite = rainbowBubble();
  private readonly emojis = new Map<string, Sprite>();
  private readonly shadows = new Map<string, Sprite>();

  emoji(emoji: string): Sprite {
    let sprite = this.emojis.get(emoji);
    if (!sprite) {
      sprite = emojiSprite(emoji);
      this.emojis.set(emoji, sprite);
    }
    return sprite;
  }

  /** The friend's outline, for its empty place on the shelf. */
  shadow(emoji: string): Sprite {
    let sprite = this.shadows.get(emoji);
    if (!sprite) {
      const { sprite: fresh, ctx } = canvas(EMOJI_SIZE);
      ctx.drawImage(this.emoji(emoji), 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(0, 0, EMOJI_SIZE, EMOJI_SIZE);
      sprite = fresh;
      this.shadows.set(emoji, sprite);
    }
    return sprite;
  }
}
