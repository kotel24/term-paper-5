import gsap from 'gsap';
import { ICON } from './icons';
import { play } from '../core/anim';
import { fmtNum } from '../model/kit';
import { CUT } from '../scenario/cutting';

export type ItemState = 'todo' | 'active' | 'done';
export type ToastKind = 'ok' | 'warn' | 'info';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface FinishData {
  time: number;
  errors: number;
  hints: number;
  steps: { title: string; errors: number; hints: number }[];
  log: { step: string; title: string; message: string }[];
}

export class Hud {
  readonly root = $('hud');
  readonly hotspotLayer = $('hotspots');
  readonly panelSlot = $('panelSlot');
  private card = $('card');
  private checklist = $('checklist');
  private hintBox = $('hintBox');
  private whyBox = $('whyBox');
  private nextBtn = $<HTMLButtonElement>('nextBtn');
  private hintBtn = $<HTMLButtonElement>('hintBtn');
  private progressEl = $('progress');
  private items: HTMLLIElement[] = [];
  private labels: string[] = [];
  private nextHandler: (() => void) | null = null;
  private resizeListeners: ((h: number) => void)[] = [];
  private lastInset = -1;
  private insetTimer = 0;
  private bannerTl: gsap.core.Timeline | null = null;
  private dangerClose: (() => void) | null = null;
  private gaugeOut: gsap.core.Tween | null = null;

  onHint: () => void = () => {};
  onMenu: () => void = () => {};

  constructor() {
    this.nextBtn.addEventListener('click', () => {
      const h = this.nextHandler;
      this.nextHandler = null;
      this.nextBtn.disabled = true;
      h?.();
    });
    this.hintBtn.addEventListener('click', () => this.onHint());
    $('menuBtn').addEventListener('click', () => this.onMenu());
    $('collapseBtn').addEventListener('click', () => {
      this.card.classList.toggle('collapsed');
      this.emitResize();
    });
    new ResizeObserver(() => this.emitResize()).observe(this.card);
  }

  onCardResize(fn: (h: number) => void): void {
    this.resizeListeners.push(fn);
  }

  cardInset(): number {
    return this.root.classList.contains('hidden') || window.innerWidth >= 900 ? 0 : this.card.offsetHeight + 16;
  }

  private emitResize(): void {
    const h = this.cardInset();
    this.lastInset = h;
    for (const f of this.resizeListeners) f(h);
  }

  watchCard(dt: number): void {
    this.insetTimer += dt;
    if (this.insetTimer < 0.3) return;
    this.insetTimer = 0;
    if (Math.abs(this.cardInset() - this.lastInset) > 4) this.emitResize();
  }

  show(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
    this.emitResize();
  }

  initProgress(total: number): void {
    this.progressEl.innerHTML = Array.from({ length: total }, () => '<i><b></b></i>').join('');
  }

  setProgress(current: number, fraction: number): void {
    [...this.progressEl.children].forEach((el, i) => {
      const b = el.firstElementChild as HTMLElement;
      const f = i < current ? 1 : i === current ? fraction : 0;
      b.style.transform = `scaleX(${f})`;
      el.classList.toggle('current', i === current);
      el.classList.toggle('done', i < current);
    });
  }

  setStep(index: number, total: number, title: string, text: string): void {
    $('tbStep').textContent = `Шаг ${index + 1} из ${total}`;
    $('cardNum').textContent = String(index + 1);
    $('cardTitle').textContent = title;
    $('cardText').textContent = text;
    this.card.classList.remove('collapsed', 'why-mode');
    this.whyBox.classList.add('hidden');
    this.hintBox.classList.add('hidden');
    this.hintBtn.disabled = false;
    this.nextBtn.disabled = true;
    this.nextBtn.textContent = 'Далее';
    this.nextHandler = null;
    gsap.fromTo(this.card, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
  }

  setChecklist(labels: string[]): void {
    this.checklist.innerHTML = '';
    this.labels = labels;
    this.items = labels.map((_, i) => {
      const li = document.createElement('li');
      li.dataset.hidden = '';
      li.innerHTML = `<span class="ck">${ICON.check}</span><span class="lb">Действие ${i + 1}</span>`;
      this.checklist.appendChild(li);
      return li;
    });
  }

  revealItem(i: number): void {
    const li = this.items[i];
    if (!li || li.dataset.hidden === undefined) return;
    delete li.dataset.hidden;
    li.querySelector('.lb')!.textContent = this.labels[i];
  }

  setItemState(i: number, s: ItemState): void {
    const li = this.items[i];
    if (!li) return;
    const was = li.dataset.state;
    li.dataset.state = s;
    if (s === 'done') this.revealItem(i);
    if (s === 'done' && was !== 'done') {
      gsap.fromTo(li, { backgroundColor: 'rgba(58,211,122,0.28)' }, { backgroundColor: 'rgba(58,211,122,0)', duration: 1.2 });
    }
  }

  setHint(text: string | null): void {
    if (!text) {
      this.hintBox.classList.add('hidden');
      return;
    }
    this.hintBox.innerHTML = `${ICON.bulb}<span>${esc(text)}</span>`;
    this.hintBox.classList.remove('hidden');
    gsap.fromTo(this.hintBox, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.35 });
  }

  showWhy(bullets: string[], last: boolean, onNext: () => void): void {
    this.hintBox.classList.add('hidden');
    this.whyBox.innerHTML = `<h3>${ICON.shield}Почему это важно</h3><ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
    this.whyBox.classList.remove('hidden');
    this.card.classList.add('why-mode');
    this.card.classList.remove('collapsed');
    gsap.fromTo(this.whyBox.querySelectorAll('li, h3'), { opacity: 0, x: -12 }, { opacity: 1, x: 0, stagger: 0.12, duration: 0.4, ease: 'power2.out' });
    this.hintBtn.disabled = true;
    this.nextBtn.textContent = last ? 'Завершить' : 'Следующий шаг';
    this.nextBtn.disabled = false;
    this.nextHandler = onNext;
    gsap.fromTo(this.nextBtn, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  }

  setStats(time: number, errors: number, hints: number): void {
    $('stTime').textContent = fmtTime(time);
    $('stErr').textContent = String(errors);
    $('stHint').textContent = String(hints);
  }

  bumpStat(id: 'stErr' | 'stHint'): void {
    gsap.fromTo($(id).parentElement!, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  }

  toast(text: string, kind: ToastKind = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `${kind === 'ok' ? ICON.check : kind === 'warn' ? ICON.warn : ICON.info}<span>${esc(text)}</span>`;
    const box = $('toasts');
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild!.remove();
    gsap.fromTo(el, { y: -16, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' });
    gsap.to(el, { opacity: 0, y: -10, duration: 0.4, delay: 3.2, onComplete: () => el.remove() });
  }

  banner(index: number, title: string): Promise<void> {
    const el = $('banner');
    el.innerHTML = `<div class="bn-num">Шаг ${index + 1}</div><div class="bn-title">${esc(title)}</div><div class="bn-line"></div>`;
    el.classList.remove('hidden');
    this.bannerTl?.kill();
    const tl = gsap.timeline();
    this.bannerTl = tl;
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    tl.fromTo(el.querySelector('.bn-num'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0.05);
    tl.fromTo(el.querySelector('.bn-title'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.15);
    tl.fromTo(el.querySelector('.bn-line'), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.2);
    tl.to(el, { opacity: 0, duration: 0.35 }, 1.5);
    return new Promise((r) => {
      const finish = () => {
        if (this.bannerTl !== tl) return r();
        this.bannerTl = null;
        el.classList.add('hidden');
        r();
      };
      tl.eventCallback('onComplete', finish);
      tl.eventCallback('onInterrupt', finish);
    });
  }

  burst(x: number, y: number): void {
    const el = document.createElement('div');
    el.className = 'burst';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerHTML = `<span class="br-ring"></span><span class="br-core">${ICON.check}</span>${Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join('')}`;
    this.hotspotLayer.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  danger(title: string, message: string): Promise<void> {
    const el = $('alert');
    $('alertTitle').textContent = title;
    $('alertText').textContent = message;
    gsap.killTweensOf(el);
    el.classList.remove('hidden');
    const box = el.querySelector('.alert-box')!;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(box, { scale: 0.85, y: 20 }, { scale: 1, y: 0, duration: 0.45, ease: 'back.out(2)' });
    gsap.fromTo(box, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)', delay: 0.1 });
    return new Promise((resolve) => {
      const btn = $('alertOk');
      const close = () => {
        btn.removeEventListener('click', close);
        this.dangerClose = null;
        gsap.to(el, { opacity: 0, duration: 0.2, onComplete: () => el.classList.add('hidden') });
        resolve();
      };
      this.dangerClose = close;
      btn.addEventListener('click', close);
    });
  }

  dismissDanger(): void {
    this.dangerClose?.();
  }

  progress(label: string, seconds: number): Promise<void> {
    const el = $('pill');
    gsap.killTweensOf(el);
    el.innerHTML = `<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="pl-bg"/><circle cx="18" cy="18" r="15" class="pl-fg"/></svg><span>${esc(label)}</span>`;
    el.classList.remove('hidden');
    const fg = el.querySelector('.pl-fg') as SVGCircleElement;
    const len = 2 * Math.PI * 15;
    fg.style.strokeDasharray = `${len}`;
    gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
    const run = gsap.fromTo(fg, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: seconds, ease: 'none' });
    return play(run).then(
      () => {
        gsap.to(el, { opacity: 0, duration: 0.25, onComplete: () => el.classList.add('hidden') });
      },
      (err: unknown) => {
        gsap.killTweensOf(el);
        el.classList.add('hidden');
        throw err;
      },
    );
  }

  gauge(show: boolean, depthMm: number): void {
    const el = $('gauge');
    if (!show) {
      this.gaugeOut?.kill();
      this.gaugeOut = gsap.to(el, {
        opacity: 0,
        duration: 0.4,
        delay: 0.6,
        onComplete: () => {
          this.gaugeOut = null;
          el.classList.add('hidden');
        },
      });
      return;
    }
    if (el.classList.contains('hidden')) {
      el.innerHTML = `<div class="gg-row"><span>Глубина</span><b></b></div><div class="gg-bar"><i></i></div><div class="gg-row sub"><span>n = ${CUT.speed} об/мин</span><span>s = ${fmtNum(CUT.feed)} мм/об</span></div>`;
      el.classList.remove('hidden');
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }
    if (this.gaugeOut) {
      this.gaugeOut.kill();
      this.gaugeOut = null;
      gsap.set(el, { opacity: 1 });
    }
    const pct = Math.min(100, (depthMm / CUT.depthMm) * 100);
    el.querySelector('b')!.textContent = `${depthMm.toFixed(1).replace('.', ',')} / ${CUT.depthMm} мм`;
    el.querySelector<HTMLElement>('.gg-bar i')!.style.width = `${pct}%`;
  }

  finish(data: FinishData, onRestart: () => void, onHome: () => void): void {
    const el = $('finish');
    const verdict =
      data.errors === 0
        ? { cls: 'ok', word: 'Допущен к работе', note: 'Порядок подготовки и сверления выполнен без нарушений.' }
        : data.errors <= 2
          ? { cls: 'warn', word: 'Допущен с замечаниями', note: 'Разберите нарушения ниже и повторите соответствующие шаги.' }
          : { cls: 'bad', word: 'Не допущен', note: 'Нарушений слишком много. Пройдите обучение заново.' };
    const debrief = data.log.length
      ? `<h2 class="fin-h">Разбор нарушений</h2>
         <ol class="fin-log">${data.log
           .map(
             (e) => `<li>
               <span class="fl-step">${esc(e.step)}</span>
               <b>${esc(e.title)}</b>
               <p>${esc(e.message)}</p>
             </li>`,
           )
           .join('')}</ol>`
      : '<p class="fin-clean">Нарушений не зафиксировано.</p>';
    el.innerHTML = `
      <div class="fin-box">
        <div class="fin-verdict ${verdict.cls}"><b>${esc(verdict.word)}</b><span>${esc(verdict.note)}</span></div>
        <h1>Протокол обучения</h1>
        <p class="fin-sub">Вертикально-сверлильный станок 2Н135 · подготовка и сверление отверстия</p>
        <div class="fin-stats">
          <div><b>${fmtTime(data.time)}</b><span>время</span></div>
          <div class="${data.errors ? 'bad' : 'good'}"><b>${data.errors}</b><span>нарушений</span></div>
          <div><b>${data.hints}</b><span>подсказок</span></div>
        </div>
        <h2 class="fin-h">Этапы</h2>
        <ol class="fin-steps">${data.steps.map((s) => `<li><span>${esc(s.title)}</span><em class="${s.errors ? 'bad' : 'good'}">${s.errors ? `${s.errors} наруш.` : ICON.check}</em></li>`).join('')}</ol>
        ${debrief}
        <div class="fin-actions">
          <button class="btn ghost" id="finHome">В меню</button>
          <button class="btn primary" id="finAgain">Пройти ещё раз</button>
        </div>
      </div>`;
    el.classList.remove('hidden');
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    gsap.fromTo(el.querySelector('.fin-verdict'), { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.1 });
    gsap.fromTo(el.querySelectorAll('.fin-stats > div, .fin-steps li, .fin-log li'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, delay: 0.3 });
    $('finAgain').addEventListener('click', () => {
      el.classList.add('hidden');
      onRestart();
    });
    $('finHome').addEventListener('click', () => {
      el.classList.add('hidden');
      onHome();
    });
  }

  hideFinish(): void {
    $('finish').classList.add('hidden');
  }

  reset(): void {
    this.dismissDanger();
    this.hideFinish();
    this.bannerTl?.kill();
    this.bannerTl = null;
    this.gaugeOut = null;
    this.panelSlot.innerHTML = '';
    for (const id of ['alert', 'banner', 'pill', 'gauge']) {
      const el = $(id);
      gsap.killTweensOf(el);
      el.classList.add('hidden');
    }
    const toasts = $('toasts');
    gsap.killTweensOf(toasts.children);
    toasts.innerHTML = '';
    $('tbStep').textContent = '';
    $('cardNum').textContent = '';
    $('cardTitle').textContent = '';
    $('cardText').textContent = '';
    this.checklist.innerHTML = '';
    this.items = [];
    this.progressEl.innerHTML = '';
    gsap.killTweensOf(this.card);
    gsap.set(this.card, { opacity: 0 });
    this.card.classList.remove('why-mode', 'collapsed');
    this.whyBox.classList.add('hidden');
    this.hintBox.classList.add('hidden');
    this.nextHandler = null;
    this.nextBtn.disabled = true;
    this.nextBtn.textContent = 'Далее';
    this.hintBtn.disabled = false;
  }
}
