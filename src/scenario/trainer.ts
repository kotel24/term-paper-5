import gsap from 'gsap';
import type * as THREE from 'three';
import type { Hud } from '../ui/hud';
import type { Hotspots, HotspotSpec } from '../ui/hotspots';
import type { Highlighter } from '../fx/highlight';
import type { Action, Ctx, Step, Target, Trap } from './types';
import { ICON } from '../ui/icons';

interface StepStats {
  errors: number;
  hints: number;
}

export class Trainer {
  private index = -1;
  private done = new Set<string>();
  private busy = false;
  private finished = false;
  private panel: { close(): void } | null = null;
  private stats: StepStats[];
  private errors = 0;
  private hints = 0;
  private wrongStreak = 0;
  private startedAt = 0;
  private elapsed = 0;
  private hotspotKey = '';
  private syncTimer = 0;
  private alive = true;
  private dangerOpen = false;
  onFinish: () => void = () => {};

  constructor(
    private steps: Step[],
    private ctx: Ctx,
    private hud: Hud,
    private hotspots: Hotspots,
    private highlighter: Highlighter,
    private targets: Record<string, Target>,
  ) {
    this.stats = steps.map(() => ({ errors: 0, hints: 0 }));
    ctx.isDone = (id) => this.done.has(id);
    hud.onHint = () => this.hint();
    hud.initProgress(steps.length);
  }

  get step(): Step {
    return this.steps[this.index];
  }

  async start(from = 0): Promise<void> {
    this.startedAt = performance.now();
    if (from > 0) await this.fastForward(from);
    await this.enter(from);
  }

  stop(): void {
    this.alive = false;
    this.panel?.close();
    this.hotspots.clear();
    this.highlighter.clear();
  }

  private async fastForward(to: number): Promise<void> {
    const ctx = this.ctx;
    ctx.sfx.muted = true;
    gsap.globalTimeline.timeScale(40);
    for (let i = 0; i < to; i++) {
      this.index = i;
      this.done.clear();
      for (const a of this.steps[i].actions) {
        await a.run?.(ctx);
        this.done.add(a.id);
      }
    }
    ctx.chips.clear();
    gsap.globalTimeline.timeScale(1);
    ctx.sfx.muted = false;
  }

  private async enter(i: number): Promise<void> {
    if (!this.alive) return;
    this.index = i;
    this.done.clear();
    this.busy = true;
    this.wrongStreak = 0;
    const s = this.step;
    this.hud.setProgress(i, 0);
    this.hotspots.clear();
    this.highlighter.clear();
    this.ctx.focus(s.view, 1.6);
    await this.hud.banner(i, s.title);
    if (!this.alive) return;
    this.hud.setStep(i, this.steps.length, s.title, s.intro);
    this.hud.setChecklist(s.actions.map((a) => a.label));
    this.busy = false;
    if (s.panel) {
      this.panel = s.panel(this.ctx, {
        complete: (id) => this.completeFromPanel(id),
        mistake: (t, m) => void this.mistake(t, m),
        isDone: (id) => this.done.has(id),
      });
    }
    this.refresh();
  }

  private available(): Action[] {
    const s = this.step;
    const rest = s.actions.filter((a) => !this.done.has(a.id));
    if (!rest.length) return [];
    return s.ordered ? [rest[0]] : rest;
  }

  private activeTraps(): Trap[] {
    return (this.step?.traps ?? []).filter((t) => t.active(this.ctx));
  }

  private refresh(): void {
    if (!this.alive || this.finished) return;
    const s = this.step;
    const avail = this.available();
    s.actions.forEach((a, i) => {
      this.hud.setItemState(i, this.done.has(a.id) ? 'done' : avail.includes(a) && !this.busy ? 'active' : 'todo');
    });
    this.hud.setProgress(this.index, this.done.size / s.actions.length);
    if (this.busy) {
      this.highlighter.clear();
    } else {
      const objs = avail.filter((a) => a.target).map((a) => this.targets[a.target!].obj);
      this.highlighter.set(objs);
      if (s.ordered && avail[0] && avail[0].target && avail[0].view) this.ctx.focus(avail[0].view, 1.3);
      const auto = avail.find((a) => a.auto);
      if (auto) void this.perform(auto);
    }
    this.syncHotspots(true);
  }

  private syncHotspots(force = false): void {
    const specs: HotspotSpec[] = [];
    if (!this.busy && !this.finished) {
      for (const a of this.available()) {
        if (!a.target || a.auto) continue;
        const t = this.targets[a.target];
        specs.push({ id: `a:${a.id}`, obj: t.obj, offset: t.offset, label: a.hotspot ?? a.label, icon: ICON.check });
      }
    }
    if (!this.finished) {
      for (const tr of this.activeTraps()) {
        const t = this.targets[tr.target];
        specs.push({ id: `t:${tr.id}`, obj: t.obj, offset: tr.offset ?? t.offset, label: tr.hotspot, icon: ICON.check });
      }
    }
    const key = specs.map((s) => s.id).join('|');
    if (!force && key === this.hotspotKey) return;
    this.hotspotKey = key;
    this.hotspots.show(specs, (id) => this.onHotspot(id));
  }

  tick(dt: number): void {
    if (!this.alive) return;
    if (!this.finished && this.startedAt) {
      this.elapsed = (performance.now() - this.startedAt) / 1000;
      this.hud.setStats(this.elapsed, this.errors, this.hints);
    }
    this.syncTimer += dt;
    if (this.syncTimer > 0.15 && this.index >= 0) {
      this.syncTimer = 0;
      this.syncHotspots();
    }
  }

  private onHotspot(id: string): void {
    if (id.startsWith('t:')) {
      const trap = this.step.traps?.find((t) => `t:${t.id}` === id);
      if (trap) void this.triggerTrap(trap);
      return;
    }
    const a = this.step.actions.find((x) => `a:${x.id}` === id);
    if (a && !this.busy && this.available().includes(a)) {
      const t = this.targets[a.target!];
      const p = this.hotspots.screenPos(t.obj, t.offset);
      this.hud.burst(p.x, p.y);
      void this.perform(a);
    }
  }

  objectTapped(name: string): void {
    if (this.busy || this.finished || this.index < 0 || this.dangerOpen) return;
    const trap = this.activeTraps().find((t) => t.target === name);
    if (trap) {
      void this.triggerTrap(trap);
      return;
    }
    const a = this.available().find((x) => x.target === name && !x.auto);
    if (a) {
      const t = this.targets[name];
      const p = this.hotspots.screenPos(t.obj, t.offset);
      this.hud.burst(p.x, p.y);
      void this.perform(a);
      return;
    }
    this.ctx.sfx.tap();
    this.wrongStreak++;
    if (this.wrongStreak >= 2) {
      this.wrongStreak = 0;
      this.hud.toast('Подсказка: нажмите на подсвеченный элемент', 'info');
      this.showHint(false);
    } else {
      this.hud.toast('Сейчас нужно другое действие — смотрите список на карточке', 'info');
    }
  }

  private async perform(a: Action): Promise<void> {
    this.busy = true;
    this.wrongStreak = 0;
    this.hud.setHint(null);
    this.refresh();
    try {
      await a.run?.(this.ctx);
    } finally {
      this.busy = false;
    }
    if (!this.alive) return;
    this.done.add(a.id);
    this.ctx.sfx.success();
    this.afterAction();
  }

  private async completeFromPanel(id: string): Promise<void> {
    const a = this.step.actions.find((x) => x.id === id);
    if (!a || this.done.has(id)) return;
    this.busy = true;
    this.hud.setHint(null);
    this.refresh();
    try {
      await a.run?.(this.ctx);
    } finally {
      this.busy = false;
    }
    if (!this.alive) return;
    this.done.add(id);
    this.ctx.sfx.success();
    this.afterAction();
  }

  private afterAction(): void {
    if (this.done.size >= this.step.actions.length) {
      void this.completeStep();
    } else {
      this.refresh();
    }
  }

  private async completeStep(): Promise<void> {
    const s = this.step;
    this.refresh();
    this.hotspots.clear();
    this.highlighter.clear();
    this.hotspotKey = '';
    this.hud.setProgress(this.index, 1);
    this.ctx.sfx.done();
    this.panel?.close();
    this.panel = null;
    this.ctx.focus(s.outro ?? s.view, 1.4);
    const last = this.index === this.steps.length - 1;
    this.busy = true;
    this.hud.showWhy(s.why, last, () => {
      this.busy = false;
      if (last) this.finish();
      else void this.enter(this.index + 1);
    });
  }

  private finish(): void {
    this.finished = true;
    this.hud.setProgress(this.steps.length, 0);
    this.hotspots.clear();
    this.highlighter.clear();
    this.ctx.focus('overview', 2);
    this.onFinish();
  }

  result() {
    return {
      time: this.elapsed,
      errors: this.errors,
      hints: this.hints,
      steps: this.steps.map((s, i) => ({ title: s.title, errors: this.stats[i].errors, hints: this.stats[i].hints })),
    };
  }

  private async triggerTrap(trap: Trap): Promise<void> {
    if (this.dangerOpen) return;
    void trap.run?.(this.ctx);
    await this.mistake(trap.title, trap.message);
  }

  private async mistake(title: string, message: string): Promise<void> {
    if (this.dangerOpen) return;
    this.dangerOpen = true;
    this.errors++;
    this.stats[this.index].errors++;
    this.hud.bumpStat('stErr');
    this.ctx.sfx.error();
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    await this.hud.danger(title, message);
    this.dangerOpen = false;
  }

  hint(): void {
    if (this.finished || this.index < 0) return;
    const avail = this.available();
    if (!avail.length) return;
    this.hints++;
    this.stats[this.index].hints++;
    this.hud.bumpStat('stHint');
    this.showHint(true);
  }

  private showHint(focus: boolean): void {
    const a = this.available()[0];
    if (!a) return;
    this.hud.setHint(a.hint);
    this.hotspots.emphasize(`a:${a.id}`);
    this.highlighter.emphasize();
    if (focus && a.view) this.ctx.focus(a.view, 1.1);
  }

  targetOf(obj: THREE.Object3D): string | null {
    let o: THREE.Object3D | null = obj;
    while (o) {
      for (const [name, t] of Object.entries(this.targets)) if (t.obj === o) return name;
      o = o.parent;
    }
    return null;
  }
}
