import * as THREE from 'three';
import gsap from 'gsap';
import { M } from '../model/materials';
import { AX, AZ, TABLE_TOP, WORK_TOP } from '../model/machine';

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private pitch: number, private turns: number) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * Math.PI * 2;
    const grow = 0.6 + 0.4 * t;
    return target.set(Math.cos(a) * this.r * grow, (t - 0.5) * this.pitch * this.turns, Math.sin(a) * this.r * grow);
  }
}

type ChipState = 'off' | 'fly' | 'rest';

interface Chip {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  state: ChipState;
  size: number;
}

const VISE_TOP = TABLE_TOP + 0.09;

function surfaceY(x: number, z: number): number {
  const dx = Math.abs(x - AX);
  const dz = z - AZ;
  if (dx < 0.06 && Math.abs(dz) < 0.035) return WORK_TOP;
  if (dx < 0.085 && dz > -0.085 && dz < 0.084) return VISE_TOP;
  if (dx < 0.085 && dz > -0.105 && dz < 0.195) return TABLE_TOP + 0.02;
  if (dx < 0.25 && Math.abs(dz) < 0.225) return TABLE_TOP;
  if (dx < 0.31 && z > -0.35 && z < 0.63) return 0.12;
  return 0.0;
}

export class Chips {
  readonly group = new THREE.Group();
  private pool: Chip[] = [];
  private cursor = 0;

  constructor(count = 160) {
    this.group.name = 'chips';
    const geos = [
      new THREE.TubeGeometry(new Helix(0.0035, 0.0022, 3.2), 48, 0.00065, 5),
      new THREE.TubeGeometry(new Helix(0.0045, 0.003, 2.4), 40, 0.0008, 5),
      new THREE.TubeGeometry(new Helix(0.0028, 0.0016, 4.5), 60, 0.0006, 5),
      new THREE.TubeGeometry(new Helix(0.005, 0.004, 1.6), 32, 0.0009, 5),
    ];
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geos[i % geos.length], M.chip[i % M.chip.length]);
      mesh.castShadow = true;
      mesh.visible = false;
      this.group.add(mesh);
      this.pool.push({ mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), state: 'off', size: 1 });
    }
  }

  get resting(): number {
    return this.pool.filter((c) => c.state !== 'off').length;
  }

  spawn(origin: THREE.Vector3, spindleDir = -1): void {
    const c = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    gsap.killTweensOf(c.mesh.scale);
    gsap.killTweensOf(c.mesh.position);
    const a = Math.random() * Math.PI * 2;
    const r = 0.006;
    c.mesh.position.set(origin.x + Math.cos(a) * r, origin.y + 0.002, origin.z + Math.sin(a) * r);
    const tang = 0.12 + Math.random() * 0.25;
    const rad = 0.08 + Math.random() * 0.2;
    c.vel.set(
      Math.cos(a) * rad - Math.sin(a) * tang * spindleDir,
      0.35 + Math.random() * 0.45,
      Math.sin(a) * rad + Math.cos(a) * tang * spindleDir,
    );
    c.spin.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
    c.size = 0.7 + Math.random() * 0.8;
    c.mesh.scale.setScalar(0.01);
    gsap.to(c.mesh.scale, { x: c.size, y: c.size, z: c.size, duration: 0.25, ease: 'power2.out' });
    c.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.mesh.visible = true;
    c.state = 'fly';
  }

  update(dt: number): void {
    for (const c of this.pool) {
      if (c.state !== 'fly') continue;
      c.vel.y -= 9.8 * dt;
      c.vel.multiplyScalar(1 - 0.6 * dt);
      const p = c.mesh.position;
      p.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += c.spin.x * dt;
      c.mesh.rotation.y += c.spin.y * dt;
      c.mesh.rotation.z += c.spin.z * dt;
      const floor = surfaceY(p.x, p.z) + 0.002 * c.size;
      if (p.y <= floor && c.vel.y < 0) {
        p.y = floor;
        if (Math.abs(c.vel.y) > 0.6) {
          c.vel.y *= -0.25;
          c.vel.x *= 0.5;
          c.vel.z *= 0.5;
          c.spin.multiplyScalar(0.4);
        } else {
          c.state = 'rest';
          c.mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        }
      }
    }
  }

  sweep(duration: number): Promise<void> {
    const active = this.pool.filter((c) => c.state !== 'off');
    active.sort((a, b) => a.mesh.position.x - b.mesh.position.x);
    const tl = gsap.timeline();
    active.forEach((c, i) => {
      c.state = 'rest';
      const delay = (i / Math.max(1, active.length)) * duration * 0.7;
      const p = c.mesh.position;
      tl.to(p, { x: p.x + 0.25 + Math.random() * 0.1, z: p.z + (Math.random() - 0.5) * 0.08, duration: duration * 0.35, ease: 'power2.in' }, delay);
      tl.to(c.mesh.scale, {
        x: 0.001,
        y: 0.001,
        z: 0.001,
        duration: duration * 0.3,
        ease: 'power1.in',
        onComplete: () => {
          c.state = 'off';
          c.mesh.visible = false;
        },
      }, delay + duration * 0.1);
    });
    return new Promise((res) => {
      tl.eventCallback('onComplete', () => res());
      if (!active.length) res();
    });
  }

  clear(): void {
    for (const c of this.pool) {
      gsap.killTweensOf(c.mesh.scale);
      gsap.killTweensOf(c.mesh.position);
      c.state = 'off';
      c.mesh.visible = false;
    }
  }
}
