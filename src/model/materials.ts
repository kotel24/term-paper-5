import * as THREE from 'three';
import { canvasTexture } from './kit';

function noiseTexture(base: string, spread: number, size = 256): THREE.CanvasTexture {
  const t = canvasTexture(size, size, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * spread;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function brushedTexture(): THREE.CanvasTexture {
  const t = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const v = 150 + Math.random() * 80;
      ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.fillRect(0, y, w, 1);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function knurlTexture(): THREE.CanvasTexture {
  const t = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#9aa1a8';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      ctx.fillStyle = '#5b6168';
      ctx.fillRect(x, 0, 3, h);
    }
    ctx.fillStyle = '#e8b400';
    ctx.fillRect(0, 0, 18, h);
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function stripeTexture(a: string, b: string, n: number): THREE.CanvasTexture {
  const t = canvasTexture(256, 32, (ctx, w, h) => {
    const step = w / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? b : a;
      ctx.fillRect(i * step, 0, step + 1, h);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function hazardTexture(): THREE.CanvasTexture {
  const t = canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f2b705';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#161616';
    for (let x = -h; x < w + h; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 24, h);
      ctx.lineTo(x + 24 + h, 0);
      ctx.lineTo(x + h, 0);
      ctx.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const paintRough = noiseTexture('#c8c8c8', 40);
paintRough.colorSpace = THREE.NoColorSpace;
const brushed = brushedTexture();

export const M = {
  paint: new THREE.MeshStandardMaterial({ color: 0x86a596, roughness: 0.62, metalness: 0.12, roughnessMap: paintRough }),
  paintDark: new THREE.MeshStandardMaterial({ color: 0x5c7a6c, roughness: 0.66, metalness: 0.12, roughnessMap: paintRough }),
  paintBase: new THREE.MeshStandardMaterial({ color: 0x4f6a5e, roughness: 0.72, metalness: 0.1, roughnessMap: paintRough }),
  machined: new THREE.MeshStandardMaterial({ color: 0xd4d9de, roughness: 0.32, metalness: 1, roughnessMap: brushed }),
  steel: new THREE.MeshStandardMaterial({ color: 0xc7ccd1, roughness: 0.24, metalness: 1 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x7d848b, roughness: 0.38, metalness: 1 }),
  oxide: new THREE.MeshStandardMaterial({ color: 0x2e3134, roughness: 0.34, metalness: 0.85 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.55, metalness: 0.2 }),
  bakelite: new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.22, metalness: 0.05 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.92, metalness: 0 }),
  slot: new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.8, metalness: 0.3 }),
  green: new THREE.MeshStandardMaterial({ color: 0x1f9d4a, roughness: 0.35, metalness: 0.05, emissive: 0x0b3d1c, emissiveIntensity: 0.4 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd3261f, roughness: 0.3, metalness: 0.05, emissive: 0x3d0806, emissiveIntensity: 0.4 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff3c4, roughness: 0.2, metalness: 0, emissive: 0xffd76a, emissiveIntensity: 0 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.5, metalness: 0.1 }),
  hazard: new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.55, metalness: 0.05 }),
  guard: new THREE.MeshStandardMaterial({ color: 0xcfe7ff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
  cart: new THREE.MeshStandardMaterial({ color: 0x33536f, roughness: 0.5, metalness: 0.25, roughnessMap: paintRough }),
  cartTop: new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.45, metalness: 0.7, roughnessMap: brushed }),
  wood: new THREE.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.6, metalness: 0 }),
  bristle: new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 0.95, metalness: 0 }),
  stock: new THREE.MeshStandardMaterial({ color: 0x6f757b, roughness: 0.5, metalness: 0.9, roughnessMap: paintRough }),
  stockSide: new THREE.MeshStandardMaterial({ color: 0xc2c8ce, roughness: 0.22, metalness: 1 }),
  chuck: new THREE.MeshStandardMaterial({ map: knurlTexture(), roughness: 0.3, metalness: 1 }),
  wire: new THREE.MeshStandardMaterial({ map: stripeTexture('#e7c51b', '#1f9c3a', 16), roughness: 0.5, metalness: 0, emissive: 0x000000 }),
  hose: new THREE.MeshStandardMaterial({ map: stripeTexture('#2b2b2b', '#3b3b3b', 40), roughness: 0.4, metalness: 0.3 }),
  chip: [
    new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.18, metalness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0xd8b77a, roughness: 0.2, metalness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x8c7bd0, roughness: 0.22, metalness: 1 }),
  ],
};

export const DRILL_MAT = new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.28, metalness: 0.95 });
export const DRILL_TIP_MAT = new THREE.MeshStandardMaterial({ color: 0xd6a85a, roughness: 0.25, metalness: 1 });
