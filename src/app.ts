import * as THREE from 'three';
import gsap from 'gsap';
import { Machine } from './model/machine';
import { ViewerStage } from './core/viewer';
import { disposeTree, visibleInTree, type Stage, type View } from './core/stage';
import { Chips } from './fx/chips';
import { Highlighter } from './fx/highlight';
import { Hud } from './ui/hud';
import { Hotspots } from './ui/hotspots';
import { ICON } from './ui/icons';
import { sfx } from './audio/sfx';
import { STEPS, VIEWS } from './scenario/steps';
import { Trainer } from './scenario/trainer';
import { abortAnims } from './core/anim';
import type { Ctx, MachineState, Target } from './scenario/types';
import type { ARStage, Surface } from './ar/arStage';

const $ = (id: string) => document.getElementById(id)!;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function initialState(): MachineState {
  return { power: false, keyInChuck: false, spinning: false, coasting: false, guardClosed: false, speedIndex: 3, feedIndex: 5 };
}

function targetsOf(m: Machine): Record<string, Target> {
  return {
    guard: { obj: m.guard, offset: V(0, -0.1, 0) },
    ground: { obj: m.groundBolt },
    switch: { obj: m.mainSwitch },
    stopBtn: { obj: m.btnStop },
    startBtn: { obj: m.btnStart },
    vise: { obj: m.vise, offset: V(0, 0.08, 0) },
    workpiece: { obj: m.workpiece, offset: V(0, 0.03, 0) },
    viseHandle: { obj: m.viseHandle },
    drill: { obj: m.drill, offset: V(0, -0.08, 0) },
    chuck: { obj: m.spindle, offset: V(0, -0.09, 0) },
    key: { obj: m.key, offset: V(0, 0, 0.079) },
    handwheel: { obj: m.handwheel, offset: V(0.05, 0, 0) },
    brush: { obj: m.brush },
    chips: { obj: m.chipsSpot },
  };
}

interface Session {
  stage: Stage;
  machine: Machine;
  chips: Chips;
  trainer: Trainer | null;
  highlighter: Highlighter;
  hotspots: Hotspots;
  ctx: Ctx | null;
}

export class App {
  private hud = new Hud();
  private stageHost = $('stage');
  private s: Session | null = null;
  private mode: '3d' | 'ar' | null = null;
  private idleSpin: gsap.core.Tween | null = null;
  private frameHook: ((dt: number, t: number) => void) | null = null;
  private surface: Surface = 'table';
  private run = 0;
  private finishTimer = 0;
  private pickBound = new WeakSet<HTMLCanvasElement>();

  constructor() {
    this.hud.show(false);
    this.hud.onMenu = () => this.openMenu();
    this.hud.onCardResize((h) => {
      if (!document.body.classList.contains('on-start')) this.s?.stage.setBottomInset(h);
    });
    window.addEventListener('resize', () => this.applySideInset());
    $('start3d').addEventListener('click', () => {
      sfx.unlock();
      void this.begin3d();
    });
    $('startAr').addEventListener('click', () => {
      sfx.unlock();
      void this.beginAr();
    });
    $('menuClose').addEventListener('click', () => this.closeMenu());
    $('menu').addEventListener('click', (e) => {
      if (e.target === $('menu')) this.closeMenu();
    });
    $('mSound').addEventListener('click', () => this.toggleSound());
    $('mRestart').addEventListener('click', () => {
      this.hideMenu();
      this.restart();
    });
    $('mHome').addEventListener('click', () => {
      this.hideMenu();
      this.home();
    });
    $('mView').addEventListener('click', () => {
      this.closeMenu();
      this.s?.ctx?.focus('overview', 1.4);
    });
    $('scanBack').addEventListener('click', () => this.home());
    $('scanSurface').addEventListener('click', () => this.toggleSurface());
    $('mSurface').addEventListener('click', () => this.toggleSurface());
    this.loadSound();
    this.renderSoundState();
    this.loadSurface();
    this.renderSurfaceState();
    this.bootPreview();
    this.introAnimation();
    this.mountFrameLoop();
  }

  private applySideInset(): void {
    const s = this.s;
    if (!s) return;
    const wide = window.innerWidth >= 900;
    const onStart = document.body.classList.contains('on-start');
    s.stage.setTopInset(onStart ? 0 : 60);
    s.stage.setLeftInset(!wide ? 0 : onStart ? Math.min(window.innerWidth * 0.42, 620) : 432);
    s.stage.setBottomInset(onStart ? (wide ? 0 : $('start').querySelector('.start-inner')!.getBoundingClientRect().height * 0.55) : this.hud.cardInset());
  }

  private introAnimation(): void {
    const tl = gsap.timeline({ delay: 0.15 });
    tl.from('.st-badge', { y: 16, opacity: 0, duration: 0.5, ease: 'power3.out' })
      .from('.st-title', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3')
      .from('.st-sub', { y: 18, opacity: 0, duration: 0.5, ease: 'power3.out' }, '-=0.35')
      .from('.st-steps li', { x: -14, opacity: 0, stagger: 0.05, duration: 0.35, ease: 'power2.out' }, '-=0.25')
      .from('.st-actions .btn', { y: 16, opacity: 0, stagger: 0.08, duration: 0.45, ease: 'back.out(1.8)' }, '-=0.2')
      .from('.st-note', { opacity: 0, duration: 0.4 }, '-=0.2');
    const settle = () => gsap.set('.st-badge, .st-title, .st-sub, .st-steps li, .st-actions .btn, .st-note', { clearProps: 'opacity,transform' });
    tl.eventCallback('onComplete', settle);
    setTimeout(settle, 4000);
  }

  private makeSession(stage: Stage): Session {
    const machine = new Machine();
    const init = initialState();
    machine.speedDial.rotation.z = machine.speedAngle(init.speedIndex);
    machine.feedDial.rotation.z = machine.feedAngle(init.feedIndex);
    const chips = new Chips();
    machine.root.add(chips.group);
    stage.content.add(machine.root);
    return { stage, machine, chips, trainer: null, highlighter: new Highlighter(), hotspots: new Hotspots(this.hud.hotspotLayer, stage), ctx: null };
  }

  private mountFrameLoop(): void {
    this.frameHook = (dt, t) => {
      const s = this.s;
      if (!s) return;
      s.machine.update(dt);
      s.chips.update(dt);
      s.highlighter.update(t, dt);
      s.hotspots.update();
      s.trainer?.tick(dt);
      this.hud.watchCard(dt);
    };
  }

  private boot3d(): ViewerStage {
    const stage = new ViewerStage(this.stageHost);
    this.s = this.makeSession(stage);
    stage.onFrame((dt, t) => this.frameHook?.(dt, t));
    stage.focus(VIEWS.overview, 0);
    void stage.start();
    return stage;
  }

  private bootPreview(): void {
    this.startIdleOrbit(this.boot3d());
    document.body.classList.add('on-start');
    this.applySideInset();
  }

  private startIdleOrbit(stage: ViewerStage): void {
    this.idleSpin?.kill();
    const p = { a: 0 };
    const r = 4;
    const target = new THREE.Vector3(0.3, 1.0, 0.2);
    const view: View = { pos: [0, 2.05, 0], target: [target.x, target.y, target.z] };
    this.idleSpin = gsap.to(p, {
      a: Math.PI * 2,
      duration: 60,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        const a = p.a + 0.6;
        view.pos[0] = target.x + Math.sin(a) * r;
        view.pos[2] = target.z + Math.cos(a) * r;
        stage.focus(view, 0);
      },
    });
  }

  private ctxFor(s: Session): Ctx {
    return {
      m: s.machine,
      stage: s.stage,
      sfx,
      chips: s.chips,
      hud: this.hud,
      state: initialState(),
      focus: (view, dur) => {
        const v = VIEWS[view];
        if (v) s.stage.focus(v, dur);
      },
      isDone: () => false,
    };
  }

  private startTrainer(from = 0): void {
    const s = this.s!;
    const ctx = this.ctxFor(s);
    s.ctx = ctx;
    const trainer = new Trainer(STEPS, ctx, this.hud, s.hotspots, s.highlighter, targetsOf(s.machine));
    s.trainer = trainer;
    trainer.onFinish = () => {
      sfx.stopLoops();
      clearTimeout(this.finishTimer);
      this.finishTimer = window.setTimeout(() => {
        this.hud.finish(trainer.result(), () => this.restart(), () => this.home());
      }, 900);
    };
    this.bindPicking(s.stage);
    this.hud.show(true);
    this.applySideInset();
    void trainer.start(from);
  }

  private bindPicking(stage: Stage): void {
    const canvas = stage.renderer.domElement;
    if (this.pickBound.has(canvas)) return;
    this.pickBound.add(canvas);
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downT = 0;
    canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
    });
    canvas.addEventListener('pointerup', (e) => {
      const s = this.s;
      if (!s || s.stage !== stage || !s.trainer) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8 || performance.now() - downT > 450) return;
      if (!stage.isVisible()) return;
      const rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, stage.camera);
      const hits = ray.intersectObject(s.machine.root, true).filter((h) => (h.object as THREE.Mesh).isMesh && visibleInTree(h.object));
      if (!hits.length) return;
      s.trainer.objectTapped(s.trainer.targetOf(hits[0].object) ?? '');
    });
  }

  private hideStart(): Promise<void> {
    const el = $('start');
    document.body.classList.remove('on-start');
    return new Promise((r) => {
      gsap.to(el, {
        opacity: 0,
        y: -20,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          el.classList.add('hidden');
          r();
        },
      });
    });
  }

  private showStart(): void {
    const el = $('start');
    el.classList.remove('hidden');
    document.body.classList.add('on-start');
    gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
  }

  private fastForwardStep(): number {
    const n = Number(new URLSearchParams(location.search).get('step'));
    return Number.isInteger(n) && n >= 1 && n <= STEPS.length ? n - 1 : 0;
  }

  private async begin3d(): Promise<void> {
    if (this.mode) return;
    this.mode = '3d';
    const run = ++this.run;
    this.idleSpin?.kill();
    this.idleSpin = null;
    await this.hideStart();
    if (run !== this.run) return;
    this.startTrainer(this.fastForwardStep());
  }

  private async beginAr(): Promise<void> {
    if (this.mode) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.hud.toast('Камера доступна только по HTTPS. Откройте тренажёр по защищённой ссылке.', 'warn');
      return;
    }
    this.mode = 'ar';
    const run = ++this.run;
    this.idleSpin?.kill();
    this.idleSpin = null;
    await this.hideStart();
    if (run !== this.run) return;
    const loading = $('loading');
    loading.classList.remove('hidden');
    gsap.fromTo(loading, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    this.teardown();
    const { ARStage } = await import('./ar/arStage');
    if (run !== this.run) return;
    const stage = new ARStage(this.stageHost, './targets/marker.mind', this.surface);
    const s = this.makeSession(stage);
    this.s = s;
    stage.onFrame((dt, t) => this.frameHook?.(dt, t));
    const scan = $('scan');
    stage.onTracking((v) => {
      if (this.s?.stage !== stage) return;
      scan.classList.toggle('hidden', v);
      document.body.classList.toggle('tracking', v);
      if (v && !this.s.trainer) this.startTrainer(0);
    });
    try {
      await stage.start();
      if (run !== this.run) return;
      gsap.to(loading, { opacity: 0, duration: 0.3, onComplete: () => loading.classList.add('hidden') });
      scan.classList.remove('hidden');
      gsap.fromTo(scan, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      document.body.classList.add('ar');
    } catch (err) {
      if (run !== this.run) return;
      console.error(err);
      gsap.killTweensOf(loading);
      loading.classList.add('hidden');
      this.teardown();
      this.hud.toast('Не удалось запустить камеру. Открываем 3D-режим.', 'warn');
      this.mode = '3d';
      this.boot3d();
      this.startTrainer(0);
    }
  }

  private stopSession(s: Session): void {
    clearTimeout(this.finishTimer);
    s.trainer?.stop();
    s.trainer = null;
    s.hotspots.clear();
    s.highlighter.clear();
    s.chips.clear();
    sfx.stopLoops();
    abortAnims();
    gsap.globalTimeline.timeScale(1);
    this.hud.reset();
  }

  private teardown(): void {
    const s = this.s;
    if (!s) return;
    this.stopSession(s);
    s.stage.dispose();
    this.s = null;
    this.hud.show(false);
    document.body.classList.remove('ar', 'tracking');
    $('scan').classList.add('hidden');
  }

  private restart(): void {
    const s = this.s;
    if (!s || !this.mode) return;
    this.run++;
    if (this.mode === 'ar') {
      this.stopSession(s);
      s.stage.content.remove(s.machine.root);
      disposeTree(s.machine.root);
      this.s = this.makeSession(s.stage);
      if (s.stage.isVisible()) this.startTrainer(0);
      else this.hud.show(false);
      return;
    }
    this.teardown();
    this.boot3d();
    this.startTrainer(0);
  }

  private home(): void {
    this.run++;
    gsap.killTweensOf([$('start'), $('loading'), $('scan')]);
    $('loading').classList.add('hidden');
    this.teardown();
    this.mode = null;
    this.bootPreview();
    this.showStart();
  }

  private openMenu(): void {
    const el = $('menu');
    gsap.killTweensOf(el);
    el.classList.remove('hidden');
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(el.querySelector('.menu-box'), { y: 30, scale: 0.97 }, { y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.6)' });
    $('mView').classList.toggle('hidden', this.mode !== '3d');
  }

  private hideMenu(): void {
    const el = $('menu');
    gsap.killTweensOf([el, el.querySelector('.menu-box')]);
    gsap.set(el, { opacity: 0 });
    el.classList.add('hidden');
  }

  private closeMenu(): void {
    const el = $('menu');
    gsap.to(el, { opacity: 0, duration: 0.2, onComplete: () => el.classList.add('hidden') });
  }

  private toggleSound(): void {
    sfx.muted = !sfx.muted;
    if (sfx.muted) sfx.stopLoops();
    try {
      localStorage.setItem('muted', sfx.muted ? '1' : '0');
    } catch {
      void 0;
    }
    this.renderSoundState();
  }

  private loadSound(): void {
    try {
      sfx.muted = localStorage.getItem('muted') === '1';
    } catch {
      sfx.muted = false;
    }
  }

  private renderSoundState(): void {
    $('mSound').innerHTML = `${sfx.muted ? ICON.mute : ICON.sound}<span>${sfx.muted ? 'Звук выключен' : 'Звук включён'}</span>`;
  }

  private loadSurface(): void {
    try {
      this.surface = localStorage.getItem('surface') === 'wall' ? 'wall' : 'table';
    } catch {
      this.surface = 'table';
    }
  }

  private toggleSurface(): void {
    this.surface = this.surface === 'table' ? 'wall' : 'table';
    try {
      localStorage.setItem('surface', this.surface);
    } catch {
      void 0;
    }
    const stage = this.s?.stage;
    if (stage?.kind === 'ar') (stage as ARStage).setSurface(this.surface);
    this.renderSurfaceState();
  }

  private renderSurfaceState(): void {
    const wall = this.surface === 'wall';
    const label = wall ? 'Маркер на стене или экране' : 'Маркер на столе';
    $('mSurface').innerHTML = `${ICON.cube}<span>${label}</span>`;
    $('scanSurface').textContent = label;
  }
}
