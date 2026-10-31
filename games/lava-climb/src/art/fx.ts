interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  color: string;
}

const MOST = 90;

/** Little bits of dust, smoke and sparkle, in world units. */
export class Bits {
  private readonly bits: Bit[] = [];

  add(bit: Partial<Bit> & { x: number; y: number; color: string }): void {
    if (this.bits.length >= MOST) this.bits.shift();
    this.bits.push({ vx: 0, vy: 0, gravity: 0, age: 0, life: 0.5, size: 2, grow: 0, ...bit });
  }

  spray(x: number, y: number, count: number, color: string, speed: number, gravity: number, size = 2): void {
    for (let at = 0; at < count; at += 1) {
      const angle = Math.random() * Math.PI * 2;
      this.add({ x, y, color, gravity, size, vx: Math.cos(angle) * speed * Math.random(), vy: Math.sin(angle) * speed * Math.random(), life: 0.3 + Math.random() * 0.3 });
    }
  }

  smoke(x: number, y: number): void {
    this.add({ x: x + (Math.random() - 0.5) * 10, y, color: '#4a4650', vx: (Math.random() - 0.5) * 18, vy: -34 - Math.random() * 30, size: 3, grow: 9, life: 0.7 });
  }

  clear(): void {
    this.bits.length = 0;
  }

  update(seconds: number): void {
    for (let at = this.bits.length - 1; at >= 0; at -= 1) {
      const bit = this.bits[at]!;
      bit.age += seconds;
      if (bit.age >= bit.life) {
        this.bits.splice(at, 1);
        continue;
      }
      bit.vy += bit.gravity * seconds;
      bit.x += bit.vx * seconds;
      bit.y += bit.vy * seconds;
      bit.size += bit.grow * seconds;
    }
  }

  draw(c: CanvasRenderingContext2D): void {
    for (const bit of this.bits) {
      c.globalAlpha = 1 - bit.age / bit.life;
      c.fillStyle = bit.color;
      c.beginPath();
      c.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
}
