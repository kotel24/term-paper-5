import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], name = ''): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = name;
  return m;
}

export function rbox(w: number, h: number, d: number, r: number, mat: THREE.Material): THREE.Mesh {
  return mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat);
}

export function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function cyl(rTop: number, rBottom: number, h: number, mat: THREE.Material | THREE.Material[], seg = 32, open = false): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open), mat);
}

export function sphere(r: number, mat: THREE.Material, seg = 20): THREE.Mesh {
  return mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
}

export function put<T extends THREE.Object3D>(parent: THREE.Object3D, obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}

export function group(name = ''): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function hexBolt(r: number, h: number, mat: THREE.Material): THREE.Mesh {
  return cyl(r, r, h, mat, 6);
}

export function tube(points: THREE.Vector3[], r: number, mat: THREE.Material, seg = 64): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(new THREE.TubeGeometry(curve, seg, r, 10, false), mat);
}
