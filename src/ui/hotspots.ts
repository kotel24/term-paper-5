import * as THREE from 'three';
import type { Stage } from '../core/stage';

export interface HotspotSpec {
  id: string;
  obj: THREE.Object3D;
  offset?: THREE.Vector3;
  label: string;
  icon?: string;
}

interface Item {
  spec: HotspotSpec;
  el: HTMLButtonElement;
  x: number;
  y: number;
}

const v = new THREE.Vector3();

export class Hotspots {
  private items: Item[] = [];
  private onTap: (id: string) => void = () => {};

  constructor(private layer: HTMLElement, private stage: Stage) {}

  show(specs: HotspotSpec[], onTap: (id: string) => void): void {
    this.onTap = onTap;
    const keep = new Set(specs.map((s) => s.id));
    for (const it of this.items) {
      if (!keep.has(it.spec.id)) this.removeEl(it.el);
    }
    const prev = new Map(this.items.filter((it) => keep.has(it.spec.id)).map((it) => [it.spec.id, it]));
    this.items = specs.map((spec) => {
      const old = prev.get(spec.id);
      if (old) {
        old.spec = spec;
        old.el.querySelector('.hs-label')!.textContent = spec.label;
        return old;
      }
      const el = document.createElement('button');
      el.className = 'hotspot';
      el.type = 'button';
      el.innerHTML = `<span class="hs-ring"></span><span class="hs-arrow"></span><span class="hs-dot">${spec.icon ?? ''}</span><span class="hs-label"></span>`;
      el.querySelector('.hs-label')!.textContent = spec.label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onTap(spec.id);
      });
      this.layer.appendChild(el);
      requestAnimationFrame(() => el.classList.add('in'));
      return { spec, el, x: -999, y: -999 };
    });
    this.update();
  }

  private removeEl(el: HTMLElement): void {
    el.classList.remove('in');
    el.classList.add('out');
    el.style.pointerEvents = 'none';
    setTimeout(() => el.remove(), 350);
  }

  clear(): void {
    for (const it of this.items) this.removeEl(it.el);
    this.items = [];
  }

  emphasize(id?: string): void {
    for (const it of this.items) {
      if (id && it.spec.id !== id) continue;
      it.el.classList.remove('emph');
      void it.el.offsetWidth;
      it.el.classList.add('emph');
    }
  }

  screenPos(obj: THREE.Object3D, offset?: THREE.Vector3): { x: number; y: number; ok: boolean } {
    const cam = this.stage.camera;
    const rect = this.layer.getBoundingClientRect();
    if (offset) v.copy(offset);
    else v.set(0, 0, 0);
    obj.localToWorld(v);
    v.project(cam);
    const ok = v.z < 1 && v.z > -1;
    return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, ok };
  }

  private safeArea(w: number, h: number): { l: number; t: number; r: number; b: number } {
    const m = 30;
    const bar = document.querySelector('.topbar')?.getBoundingClientRect();
    const card = document.getElementById('card');
    const cr = card && card.offsetParent ? card.getBoundingClientRect() : null;
    const wide = w >= 900;
    return {
      l: (wide && cr ? cr.right : 0) + m,
      t: (bar ? bar.bottom : 0) + m,
      r: w - m,
      b: (!wide && cr ? Math.min(h, cr.top) : h) - m,
    };
  }

  update(): void {
    if (!this.items.length) return;
    const visible = this.stage.isVisible();
    const w = this.layer.clientWidth;
    const h = this.layer.clientHeight;
    const a = this.safeArea(w, h);
    for (const it of this.items) {
      const p = this.screenPos(it.spec.obj, it.spec.offset);
      const show = visible && p.ok;
      it.el.classList.toggle('hidden', !show);
      if (!show) continue;
      const x = Math.min(a.r, Math.max(a.l, p.x));
      const y = Math.min(a.b, Math.max(a.t, p.y));
      const edge = x !== p.x || y !== p.y;
      it.el.classList.toggle('edge', edge);
      if (edge) it.el.style.setProperty('--ang', `${Math.atan2(p.y - y, p.x - x).toFixed(3)}rad`);
      it.x = x;
      it.y = y;
      it.el.classList.toggle('flip', x > w - 170);
      it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
    const placed: { x: number; y: number }[] = [];
    for (const it of this.items) {
      let ly = 0;
      for (let guard = 0; guard < 6; guard++) {
        const hit = placed.some((q) => Math.abs(q.x - it.x) < 170 && Math.abs(q.y - (it.y + ly)) < 34);
        if (!hit) break;
        ly += 36;
      }
      placed.push({ x: it.x, y: it.y + ly });
      it.el.style.setProperty('--ly', `${ly}px`);
    }
  }
}
