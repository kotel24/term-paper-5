import gsap from 'gsap';
import { ICON } from './icons';
import { FEEDS, SPEEDS } from '../model/machine';
import type { Ctx, PanelApi } from '../scenario/types';

interface PpeOption {
  id: string;
  title: string;
  icon: string;
  action?: string;
  wrongTitle?: string;
  wrong?: string;
}

const PPE: PpeOption[] = [
  { id: 'goggles', title: 'Надеть защитные очки', icon: ICON.goggles, action: 'goggles' },
  {
    id: 'glovesOn',
    title: 'Надеть рабочие перчатки',
    icon: ICON.glove,
    wrongTitle: 'В перчатках работать запрещено',
    wrong: 'Вращающееся сверло захватывает перчатку и затягивает руку. На сверлильных станках работают без перчаток и рукавиц.',
  },
  { id: 'cuffs', title: 'Застегнуть спецовку и манжеты', icon: ICON.cuff, action: 'cuffs' },
  {
    id: 'watch',
    title: 'Оставить часы и браслет',
    icon: ICON.watch,
    wrongTitle: 'Украшения снимают',
    wrong: 'Часы, браслеты и кольца цепляются за вращающиеся части и затягивают руку. Перед работой их снимают.',
  },
  { id: 'hair', title: 'Убрать волосы под головной убор', icon: ICON.cap, action: 'hair' },
  {
    id: 'scarf',
    title: 'Повязать шарф',
    icon: ICON.scarf,
    wrongTitle: 'Никаких свисающих концов',
    wrong: 'Шарф, галстук или шнурки наматываются на шпиндель. Спецодежда должна быть без свободных концов.',
  },
  { id: 'glovesOff', title: 'Снять перчатки', icon: ICON.hand, action: 'gloves' },
  {
    id: 'music',
    title: 'Надеть наушники с музыкой',
    icon: ICON.headphones,
    wrongTitle: 'Нужно слышать станок',
    wrong: 'Музыка заглушает изменение звука станка и сигналы коллег. Допускаются только противошумные наушники.',
  },
];

export function ppePanel(_ctx: Ctx, api: PanelApi): { close(): void } {
  const root = document.createElement('div');
  root.className = 'ppe-grid';
  for (const o of PPE) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ppe-card';
    b.innerHTML = `<span class="pc-icon">${o.icon}</span><span class="pc-title">${o.title}</span><span class="pc-mark"></span>`;
    if (o.action && api.isDone(o.action)) b.classList.add('ok');
    b.addEventListener('click', async () => {
      if (b.classList.contains('ok') || b.classList.contains('busy')) return;
      if (o.action) {
        b.classList.add('ok', 'busy');
        b.querySelector('.pc-mark')!.innerHTML = ICON.check;
        gsap.fromTo(b, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' });
        await api.complete(o.action);
        b.classList.remove('busy');
      } else {
        b.classList.add('bad');
        b.querySelector('.pc-mark')!.innerHTML = ICON.cross;
        gsap.fromTo(b, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.25)' });
        api.mistake(o.wrongTitle!, o.wrong!);
      }
    });
    root.appendChild(b);
  }
  return mount(root);
}

function fmt(v: number): string {
  return String(v).replace('.', ',');
}

export function modesPanel(_ctx: Ctx, api: PanelApi): { close(): void } {
  const root = document.createElement('div');
  root.className = 'modes';
  root.innerHTML = `
    <div class="task">
      <div class="task-row"><span>Сверло</span><b>Ø12 мм, Р6М5</b></div>
      <div class="task-row"><span>Материал</span><b>Сталь 45</b></div>
      <div class="task-row"><span>Скорость резания</span><b>v = 25 м/мин</b></div>
      <div class="task-row"><span>Рекомендуемая подача</span><b>s = 0,18 мм/об</b></div>
    </div>
    <div class="formula">n = <span class="frac"><i>1000 · v</i><i>π · D</i></span> = <span class="frac"><i>1000 · 25</i><i>3,14 · 12</i></span> ≈ <b>663 об/мин</b></div>
    <div class="row-title">Частота вращения, об/мин <span class="row-state" data-for="speed"></span></div>
    <div class="chips" data-row="speed">${SPEEDS.map((v) => `<button type="button" data-v="${v}">${fmt(v)}</button>`).join('')}</div>
    <div class="row-title">Подача, мм/об <span class="row-state" data-for="feed"></span></div>
    <div class="chips locked" data-row="feed">${FEEDS.map((v) => `<button type="button" data-v="${v}">${fmt(v)}</button>`).join('')}</div>
  `;
  const speedRow = root.querySelector('[data-row="speed"]') as HTMLElement;
  const feedRow = root.querySelector('[data-row="feed"]') as HTMLElement;

  const mark = (row: HTMLElement, v: number) => {
    row.querySelectorAll('button').forEach((b) => b.classList.toggle('ok', Number(b.dataset.v) === v));
    row.classList.add('done');
  };

  if (api.isDone('speed')) {
    mark(speedRow, 500);
    feedRow.classList.remove('locked');
  }
  if (api.isDone('feed')) mark(feedRow, 0.14);

  let busy = false;
  speedRow.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || busy || speedRow.classList.contains('done')) return;
    const v = Number(b.dataset.v);
    if (v === 500) {
      busy = true;
      mark(speedRow, v);
      gsap.fromTo(b, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      await api.complete('speed');
      feedRow.classList.remove('locked');
      feedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      gsap.fromTo(feedRow.children, { y: 8, opacity: 0.3 }, { y: 0, opacity: 1, stagger: 0.03, duration: 0.3 });
      busy = false;
      return;
    }
    flashBad(b);
    if (v > 663) {
      api.mistake('Частота выше расчётной', `Ступень ${fmt(v)} об/мин больше расчётных 663 об/мин. Скорость резания превысит допустимую, сверло перегреется, затупится и может сломаться.`);
    } else {
      api.mistake('Частота слишком мала', `На ступени ${fmt(v)} об/мин сверло режет неэффективно и быстрее изнашивается. Выбирают ближайшую к расчётной меньшую ступень.`);
    }
  });

  feedRow.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || busy || feedRow.classList.contains('locked') || feedRow.classList.contains('done')) return;
    const v = Number(b.dataset.v);
    if (v === 0.14) {
      busy = true;
      mark(feedRow, v);
      gsap.fromTo(b, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      await api.complete('feed');
      busy = false;
      return;
    }
    flashBad(b);
    if (v > 0.18) {
      api.mistake('Подача больше рекомендуемой', `Подача ${fmt(v)} мм/об перегружает сверло Ø12: растёт осевая сила, сверло может сломаться, а обломки разлетаются.`);
    } else {
      api.mistake('Подача слишком мала', `При подаче ${fmt(v)} мм/об сверло трётся, а не режет, и быстро тупится. Выберите ближайшее к 0,18 меньшее значение.`);
    }
  });

  return mount(root);
}

function flashBad(b: HTMLElement): void {
  b.classList.add('bad');
  gsap.fromTo(b, { x: -5 }, { x: 0, duration: 0.45, ease: 'elastic.out(1.2, 0.25)' });
  setTimeout(() => b.classList.remove('bad'), 1400);
}

function mount(root: HTMLElement): { close(): void } {
  const slot = document.getElementById('panelSlot')!;
  slot.innerHTML = '';
  slot.appendChild(root);
  gsap.fromTo(root.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.4, ease: 'power2.out' });
  return {
    close() {
      gsap.to(root, {
        opacity: 0,
        height: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => root.remove(),
      });
    },
  };
}
