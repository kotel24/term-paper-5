import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Vec3 = [number, number, number];

export interface View {
  pos: Vec3;
  target: Vec3;
}

export type FrameFn = (dt: number, t: number) => void;

export interface Stage {
  readonly kind: '3d' | 'ar';
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly scene: THREE.Scene;
  readonly content: THREE.Group;
  readonly dom: HTMLElement;
  start(): Promise<void>;
  focus(view: View, duration?: number): void;
  onFrame(fn: FrameFn): void;
  isVisible(): boolean;
  setBottomInset(px: number): void;
  setLeftInset(px: number): void;
  setTopInset(px: number): void;
  dispose(): void;
}

export function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

export interface Lights {
  key: THREE.DirectionalLight;
  group: THREE.Group;
}

export function makeLights(): Lights {
  const group = new THREE.Group();
  group.name = 'lights';
  const hemi = new THREE.HemisphereLight(0xdfe9f3, 0x3a3228, 0.9);
  group.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4e2, 2.4);
  key.position.set(1.6, 3.4, 2.2);
  key.target.position.set(0.25, 0.9, 0.25);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const c = key.shadow.camera;
  c.left = -1.3;
  c.right = 1.3;
  c.top = 1.5;
  c.bottom = -1.3;
  c.near = 0.5;
  c.far = 7;
  group.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.7);
  fill.position.set(-2.2, 1.8, 1.2);
  group.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8);
  rim.position.set(-0.5, 2.5, -2.5);
  group.add(rim);
  return { key, group };
}

export function now(): number {
  return performance.now() / 1000;
}
