import * as THREE from 'three';
import gsap from 'gsap';
import type { Ctx } from './types';

export const OMEGA = 26;

export function play(anim: gsap.core.Animation): Promise<void> {
  return new Promise((resolve) => {
    anim.eventCallback('onComplete', () => resolve());
  });
}

export function to(target: object, vars: gsap.TweenVars): Promise<void> {
  return play(gsap.to(target, vars));
}

export function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    gsap.delayedCall(seconds, resolve);
  });
}

const tmpQ = new THREE.Quaternion();

export function fly(
  obj: THREE.Object3D,
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  rot: THREE.Euler,
  duration = 1.2,
  lift = 0.15,
): Promise<void> {
  obj.updateWorldMatrix(true, false);
  parent.updateWorldMatrix(true, false);
  parent.attach(obj);
  const p0 = obj.position.clone();
  const q0 = obj.quaternion.clone();
  const q1 = new THREE.Quaternion().setFromEuler(rot);
  const c = p0.clone().lerp(pos, 0.5);
  c.y = Math.max(p0.y, pos.y) + lift;
  const s = { t: 0 };
  return to(s, {
    t: 1,
    duration,
    ease: 'power2.inOut',
    onUpdate: () => {
      const t = s.t;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const d = t * t;
      obj.position.set(a * p0.x + b * c.x + d * pos.x, a * p0.y + b * c.y + d * pos.y, a * p0.z + b * c.z + d * pos.z);
      const k = THREE.MathUtils.smoothstep(t, 0.05, 0.85);
      tmpQ.slerpQuaternions(q0, q1, k);
      obj.quaternion.copy(tmpQ);
    },
  });
}

export async function press(ctx: Ctx, btn: THREE.Object3D): Promise<void> {
  ctx.sfx.click();
  const z = btn.position.z;
  await to(btn.position, { z: z - 0.006, duration: 0.09, ease: 'power2.in' });
  await to(btn.position, { z, duration: 0.22, ease: 'back.out(3)' });
}

export function spin(ctx: Ctx, target: number, duration: number, ease: string): Promise<void> {
  return to(ctx.m, {
    omega: target,
    duration,
    ease,
    onUpdate: () => ctx.sfx.setMotor(ctx.m.omega / OMEGA),
  });
}

export async function turnDial(ctx: Ctx, dial: THREE.Object3D, from: number, to_: number, angle: (i: number) => number): Promise<void> {
  const dir = Math.sign(to_ - from);
  for (let i = from; i !== to_; i += dir) {
    const next = i + dir;
    ctx.sfx.click();
    await to(dial.rotation, { z: angle(next), duration: 0.16, ease: 'back.out(2.2)' });
  }
  ctx.sfx.clunk();
}

export function shake(obj: THREE.Object3D, amount = 0.004, duration = 0.4): Promise<void> {
  const x = obj.position.x;
  return to(obj.position, {
    keyframes: [
      { x: x + amount, duration: duration / 6 },
      { x: x - amount, duration: duration / 3 },
      { x: x + amount * 0.5, duration: duration / 3 },
      { x, duration: duration / 6 },
    ],
  });
}
