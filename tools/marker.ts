import { Compiler } from 'mind-ar/dist/mindar-image.prod.js';

const W = 1654;
const H = 2339;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#ffc21a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#111';
  for (let i = -h; i < w + h; i += h * 1.4) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h * 0.7, y + h);
    ctx.lineTo(x + i + h * 1.4, y);
    ctx.lineTo(x + i + h * 0.7, y);
    ctx.fill();
  }
  ctx.restore();
}

function scatter(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, y: number, w: number, h: number, n: number): void {
  const inks = ['#111', '#2c3a33', '#6b7d72', '#c9a100', '#8a9a90'];
  for (let i = 0; i < n; i++) {
    const cx = x + rnd() * w;
    const cy = y + rnd() * h;
    const s = 10 + rnd() * 46;
    ctx.fillStyle = inks[Math.floor(rnd() * inks.length)];
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 3 + rnd() * 5;
    const kind = Math.floor(rnd() * 5);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rnd() * Math.PI);
    ctx.beginPath();
    if (kind === 0) {
      ctx.rect(-s / 2, -s / 2, s, s * (0.4 + rnd()));
      ctx.fill();
    } else if (kind === 1) {
      ctx.moveTo(0, -s / 2);
      ctx.lineTo(s / 2, s / 2);
      ctx.lineTo(-s / 2, s / 2);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 2) {
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === 3) {
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.moveTo(0, -s / 2);
      ctx.lineTo(0, s / 2);
      ctx.stroke();
    } else {
      ctx.rect(-s / 2, -s / 4, s, s / 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function machine(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  const body = '#5f8f7a';
  const dark = '#1d2622';
  const steel = '#b9c2c7';
  const r = (px: number, py: number, pw: number, ph: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + px * k, y + py * k, pw * k, ph * k);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + px * k, y + py * k, pw * k, ph * k);
  };
  r(-160, 700, 420, 70, body);
  r(-40, 60, 90, 650, body);
  r(-110, 0, 250, 150, body);
  r(-90, 150, 210, 170, body);
  r(-40, 330, 60, 60, steel);
  r(-22, 390, 24, 90, '#333');
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(x - 22 * k, y + 480 * k);
  ctx.lineTo(x + 2 * k, y + 480 * k);
  ctx.lineTo(x - 10 * k, y + 520 * k);
  ctx.fill();
  r(-150, 540, 300, 40, body);
  r(-20, 580, 40, 120, body);
  r(-60, 500, 120, 40, '#4b6b5d');
  ctx.fillStyle = '#d32f2f';
  ctx.beginPath();
  ctx.arc(x + 90 * k, y + 210 * k, 16 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e9d52';
  ctx.beginPath();
  ctx.arc(x + 90 * k, y + 260 * k, 16 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 7;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(x + 165 * k, y + 230 * k);
    ctx.lineTo(x + (165 + Math.cos(a) * 70) * k, y + (230 + Math.sin(a) * 70) * k);
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(x + (165 + Math.cos(a) * 70) * k, y + (230 + Math.sin(a) * 70) * k, 11 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 70 * k, y + 20 * k, 120 * k, 40 * k);
  ctx.fillStyle = dark;
  ctx.font = `bold ${30 * k}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('2Н135', x - 10 * k, y + 52 * k);
}

function blocks(ctx: CanvasRenderingContext2D, rnd: () => number, x: number, y: number, size: number, n: number): void {
  const c = size / n;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#111';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const corner = (i < 3 && j < 3) || (i >= n - 3 && j < 3) || (i < 3 && j >= n - 3);
      if (corner) continue;
      if (rnd() > 0.5) ctx.fillRect(x + i * c, y + j * c, c, c);
    }
  }
  for (const [i, j] of [[0, 0], [n - 3, 0], [0, n - 3]]) {
    ctx.fillRect(x + i * c, y + j * c, c * 3, c * 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + (i + 0.6) * c, y + (j + 0.6) * c, c * 1.8, c * 1.8);
    ctx.fillStyle = '#111';
    ctx.fillRect(x + (i + 1.1) * c, y + (j + 1.1) * c, c * 0.8, c * 0.8);
  }
}

function draw(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const rnd = rng(2135);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  scatter(ctx, rnd, 60, 60, W - 120, H - 120, 520);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillRect(160, 560, W - 320, 1180);

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, 360);
  hazard(ctx, 0, 360, W, 70);
  ctx.fillStyle = '#ffc21a';
  ctx.font = 'bold 150px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ТРЕНАЖЁР', 90, 190);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 118px system-ui, sans-serif';
  ctx.fillText('2Н135', 90, 315);
  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillStyle = '#c8cdd1';
  ctx.textAlign = 'right';
  ctx.fillText('ОХРАНА ТРУДА', W - 90, 150);
  ctx.fillText('AR-МАРКЕР', W - 90, 210);
  ctx.fillText('ВЕРТИКАЛЬНО-СВЕРЛИЛЬНЫЙ', W - 90, 270);

  machine(ctx, W / 2 - 40, 620, 1.35);

  ctx.textAlign = 'left';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillStyle = '#111';
  const rules = ['1  СИЗ', '2  ОСМОТР', '3  ТИСКИ', '4  СВЕРЛО', '5  РЕЖИМЫ', '6  ПУСК', '7  СВЕРЛЕНИЕ'];
  rules.forEach((t, i) => {
    ctx.fillStyle = i % 2 ? '#111' : '#2c3a33';
    ctx.fillText(t, 200, 700 + i * 150);
  });

  hazard(ctx, 0, H - 520, W, 70);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, H - 450, W, 450);
  blocks(ctx, rnd, W - 420, H - 400, 330, 21);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 60px system-ui, sans-serif';
  ctx.fillText('Наведите камеру', 90, H - 300);
  ctx.fillText('на этот плакат', 90, H - 220);
  ctx.font = '500 36px system-ui, sans-serif';
  ctx.fillStyle = '#c8cdd1';
  ctx.fillText('Плакат должен целиком попасть в кадр', 90, H - 140);

  ctx.strokeStyle = '#111';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, W - 18, H - 18);
  return cv;
}

async function main(): Promise<void> {
  const status = document.getElementById('status')!;
  const out = document.getElementById('out')!;
  const cv = draw();
  out.appendChild(cv);

  const png = await new Promise<Blob>((r) => cv.toBlob((b) => r(b!), 'image/png'));
  const small = document.createElement('canvas');
  small.width = 827;
  small.height = Math.round((827 * H) / W);
  small.getContext('2d')!.drawImage(cv, 0, 0, small.width, small.height);
  const img = new Image();
  img.src = small.toDataURL('image/png');
  await img.decode();

  status.textContent = 'Компиляция маркера: 0%';
  const compiler = new Compiler();
  await compiler.compileImageTargets([img], (p: number) => {
    status.textContent = `Компиляция маркера: ${p.toFixed(0)}%`;
  });
  const data: Uint8Array = await compiler.exportData();

  await fetch('/__save?name=marker.png', { method: 'POST', body: png });
  await fetch('/__save?name=marker.mind', { method: 'POST', body: data });
  status.textContent = `Готово: marker.png (${(png.size / 1024).toFixed(0)} КБ), marker.mind (${(data.byteLength / 1024).toFixed(0)} КБ)`;
  document.body.dataset.done = '1';
}

main().catch((e) => {
  document.getElementById('status')!.textContent = `Ошибка: ${e}`;
  document.body.dataset.done = 'error';
});
