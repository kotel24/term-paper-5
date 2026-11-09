import gsap from 'gsap';

export const ABORT = Symbol('abort');

let generation = 0;
const live = new Set<gsap.core.Animation>();

export function abortAnims(): void {
  generation += 1;
  for (const a of [...live]) a.kill();
  live.clear();
}

export function play(anim: gsap.core.Animation): Promise<void> {
  const g = generation;
  live.add(anim);
  return new Promise((resolve, reject) => {
    const settle = (ok: boolean) => {
      live.delete(anim);
      if (ok && g === generation) resolve();
      else reject(ABORT);
    };
    anim.eventCallback('onComplete', () => settle(true));
    anim.eventCallback('onInterrupt', () => settle(false));
  });
}

export function to(target: object, vars: gsap.TweenVars): Promise<void> {
  return play(gsap.to(target, vars));
}

export function wait(seconds: number): Promise<void> {
  return play(gsap.delayedCall(seconds, () => {}));
}
