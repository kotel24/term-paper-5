import * as THREE from 'three';
import gsap from 'gsap';
import { M } from '../model/materials';
import {
  AX,
  AZ,
  CHUCK_LEN,
  DRILL_INSERT,
  FEED_CONTACT,
  FEEDS,
  SPEEDS,
  TABLE_TOP,
  WORK_BOTTOM_IN_VISE,
  WORK_THICK,
  WORK_TOP,
} from '../model/machine';
import { fly, OMEGA, play, press, shake, spin, to, turnDial } from './anim';
import type { Ctx, Step, Views } from './types';
import { modesPanel, ppePanel } from '../ui/panels';

export const VIEWS: Views = {
  overview: { pos: [1.9, 1.75, 2.5], target: [0.3, 1.05, 0.2] },
  guard: { pos: [0.5, 1.35, 0.95], target: [0, 1.17, 0.3] },
  ground: { pos: [0.8, 0.55, 1.3], target: [0.25, 0.14, 0.56] },
  switch: { pos: [-0.95, 1.3, 0.55], target: [-0.2, 1.1, -0.1] },
  controls: { pos: [0.1, 1.8, 1.3], target: [-0.03, 1.62, 0.5] },
  inspect: { pos: [-0.75, 1.4, 2.15], target: [0.05, 0.85, 0.25] },
  table: { pos: [1.0, 1.45, 1.4], target: [0.4, 0.8, 0.3] },
  vise: { pos: [0.4, 1.12, 0.9], target: [0.02, 0.85, 0.34] },
  cart: { pos: [1.35, 1.35, 1.25], target: [0.8, 0.78, 0.25] },
  chuck: { pos: [0.45, 1.3, 0.95], target: [0.06, 1.15, 0.35] },
  dials: { pos: [0.15, 1.9, 1.2], target: [0.05, 1.74, 0.45] },
  front: { pos: [0.6, 1.45, 1.6], target: [0.0, 1.25, 0.35] },
  drill: { pos: [0.5, 1.08, 0.95], target: [0.02, 0.93, 0.3] },
  clean: { pos: [0.75, 1.55, 1.55], target: [0.45, 0.8, 0.3] },
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const E = (x = 0, y = 0, z = 0) => new THREE.Euler(x, y, z);

async function startSpindle(ctx: Ctx): Promise<void> {
  await press(ctx, ctx.m.btnStart);
  ctx.state.spinning = true;
  await spin(ctx, OMEGA, 1.6, 'power2.in');
}

async function stopSpindle(ctx: Ctx, coast: number): Promise<void> {
  await press(ctx, ctx.m.btnStop);
  ctx.state.coasting = true;
  await spin(ctx, 0, coast, 'power2.out');
  ctx.m.omega = 0;
  ctx.sfx.setMotor(0);
  ctx.state.spinning = false;
  ctx.state.coasting = false;
}

async function drillHole(ctx: Ctx): Promise<void> {
  const { m, chips, sfx, hud } = ctx;
  ctx.focus('drill', 1.0);
  await to({ d: 0 }, {
    d: FEED_CONTACT - 0.003,
    duration: 1.3,
    ease: 'power1.inOut',
    onUpdate: function (this: gsap.core.Tween) {
      m.setQuill((this.targets()[0] as { d: number }).d);
    },
  });
  const origin = V(AX, WORK_TOP, AZ);
  const total = WORK_THICK + 0.009;
  const p = { d: -0.003 };
  let last = 0;
  let acc = 0;
  let broke = false;
  hud.gauge(true, 0);
  await to(p, {
    d: total,
    duration: 6,
    ease: 'none',
    onUpdate: function (this: gsap.core.Tween) {
      m.setQuill(FEED_CONTACT + p.d);
      const depth = THREE.MathUtils.clamp(p.d, 0, WORK_THICK);
      m.plug.scale.y = Math.max(0.001, 1 - depth / WORK_THICK);
      const cutting = p.d > 0 && p.d < WORK_THICK + 0.003;
      const now = this.time();
      const dt = Math.max(0, now - last);
      last = now;
      if (cutting) {
        acc += dt * 30;
        while (acc > 1) {
          acc -= 1;
          chips.spawn(origin);
        }
      }
      sfx.setDrill(cutting ? 0.75 + Math.random() * 0.2 : 0);
      if (!broke && p.d >= WORK_THICK) {
        broke = true;
        m.plug.visible = false;
        sfx.metal();
      }
      hud.gauge(true, depth * 1000);
    },
  });
  sfx.setDrill(0);
  hud.gauge(false, WORK_THICK * 1000);
}

async function retract(ctx: Ctx): Promise<void> {
  const m = ctx.m;
  const p = { d: m.quillOffset };
  await to(p, { d: 0, duration: 1.4, ease: 'power2.inOut', onUpdate: () => m.setQuill(p.d) });
  ctx.sfx.clunk();
}

async function sweepChips(ctx: Ctx): Promise<void> {
  const { m, chips, sfx } = ctx;
  ctx.focus('vise', 1.0);
  const home = m.brush.position.clone();
  const homeRot = m.brush.rotation.clone();
  const y = WORK_TOP + 0.004;
  await fly(m.brush, m.root, V(AX - 0.2, y + 0.03, AZ + 0.05), E(0, 0, 0), 1.0, 0.2);
  const strokes = [AZ + 0.05, AZ - 0.02, AZ + 0.11];
  const sweeping = chips.sweep(2.6);
  for (const z of strokes) {
    m.brush.position.set(AX - 0.2, y + 0.03, z);
    sfx.sweep();
    await to(m.brush.position, { x: AX + 0.22, y, duration: 0.7, ease: 'power1.inOut' });
    await to(m.brush.position, { y: y + 0.03, duration: 0.12 });
  }
  await sweeping;
  await fly(m.brush, m.root, home, homeRot, 1.0, 0.2);
}

export const STEPS: Step[] = [
  {
    id: 'ppe',
    title: 'Средства индивидуальной защиты',
    intro: 'Вращающийся шпиндель затягивает всё свободное: край одежды, волосы, перчатку. Выберите, как подготовиться к работе.',
    view: 'overview',
    ordered: false,
    actions: [
      { id: 'goggles', label: 'Надеть защитные очки', hint: 'Стружка и осколки сверла летят в лицо. Нужна защита глаз.' },
      { id: 'cuffs', label: 'Застегнуть одежду и манжеты', hint: 'Свободные рукава захватываются патроном.' },
      { id: 'hair', label: 'Убрать волосы под головной убор', hint: 'Длинные волосы наматываются на шпиндель.' },
      { id: 'gloves', label: 'Снять перчатки', hint: 'На сверлильном станке в перчатках не работают.' },
    ],
    panel: ppePanel,
    why: [
      'Затягивание в зону вращения — основная причина тяжёлых травм на сверлильных станках: всё происходит за доли секунды.',
      'Перчатку сверло захватывает вместе с пальцами, поэтому работать в перчатках и рукавицах запрещено.',
      'Защитные очки обязательны: витая стружка и обломки сверла отлетают с большой скоростью.',
    ],
  },
  {
    id: 'inspect',
    title: 'Осмотр станка',
    intro: 'Перед включением проверьте исправность станка. Нажимайте на отмеченные элементы в любом порядке.',
    view: 'inspect',
    ordered: false,
    actions: [
      {
        id: 'guard',
        label: 'Ограждение патрона на месте и исправно',
        hint: 'Прозрачный экран вокруг патрона. Он должен свободно поворачиваться и не иметь трещин.',
        target: 'guard',
        hotspot: 'Ограждение патрона',
        view: 'guard',
        run: async (ctx) => {
          const g = ctx.m.guard;
          const open = g.rotation.y;
          await to(g.rotation, { y: 0, duration: 0.9, ease: 'power2.inOut' });
          ctx.sfx.clunk();
          await ctx.wait(0.35);
          await to(g.rotation, { y: open, duration: 0.9, ease: 'power2.inOut' });
          ctx.hud.toast('Ограждение целое, поворачивается свободно', 'ok');
        },
      },
      {
        id: 'ground',
        label: 'Заземление подключено',
        hint: 'Жёлто-зелёный провод у основания станка. Проверьте, что болт затянут.',
        target: 'ground',
        hotspot: 'Заземление',
        view: 'ground',
        run: async (ctx) => {
          const b = ctx.m.groundBolt;
          ctx.sfx.ratchet(4, 0.4);
          await to(b.rotation, { keyframes: [{ y: 0.3, duration: 0.2 }, { y: -0.1, duration: 0.2 }, { y: 0, duration: 0.15 }] });
          M.wire.emissive.set(0x3dff7a);
          await to(M.wire, { keyframes: [{ emissiveIntensity: 0.9, duration: 0.25 }, { emissiveIntensity: 0.1, duration: 0.25 }, { emissiveIntensity: 0.9, duration: 0.25 }, { emissiveIntensity: 0, duration: 0.4 }] });
          ctx.hud.toast('Провод заземления подключён, болт затянут', 'ok');
        },
      },
      {
        id: 'switch',
        label: 'Вводной выключатель включается',
        hint: 'Поворотный выключатель на левой стороне колонны. Включите его — загорится лампа «Сеть».',
        target: 'switch',
        hotspot: 'Вводной выключатель',
        view: 'switch',
        run: async (ctx) => {
          const h = ctx.m.mainSwitch.getObjectByName('switchHandle')!;
          await to(h.rotation, { x: -Math.PI / 2, duration: 0.35, ease: 'back.out(2)' });
          ctx.sfx.clunk();
          ctx.state.power = true;
          ctx.focus('controls', 0.9);
          await ctx.wait(0.7);
          await to(M.lamp, { keyframes: [{ emissiveIntensity: 1.6, duration: 0.06 }, { emissiveIntensity: 0.2, duration: 0.06 }, { emissiveIntensity: 2.2, duration: 0.2 }] });
          ctx.sfx.click();
          ctx.hud.toast('Напряжение подано — горит лампа «Сеть»', 'ok');
        },
      },
      {
        id: 'stop',
        label: 'Кнопка «Стоп» исправна',
        hint: 'Красная грибовидная кнопка на пульте. Нажмите её, она не должна западать.',
        target: 'stopBtn',
        hotspot: 'Кнопка «Стоп»',
        view: 'controls',
        run: async (ctx) => {
          await press(ctx, ctx.m.btnStop);
          ctx.hud.toast('Кнопка «Стоп» срабатывает и не западает', 'ok');
        },
      },
    ],
    why: [
      'Ограждение патрона задерживает стружку и не даёт случайно коснуться вращающегося сверла.',
      'Без заземления пробой изоляции делает корпус станка опасным: удар током при касании.',
      'Неисправная кнопка «Стоп» — запрет на работу: в аварии станок нужно остановить мгновенно.',
    ],
  },
  {
    id: 'clamp',
    title: 'Закрепление заготовки',
    intro: 'Заготовку нельзя держать руками. Установите машинные тиски на стол и надёжно зажмите в них деталь.',
    view: 'table',
    outro: 'vise',
    ordered: true,
    actions: [
      {
        id: 'vise',
        label: 'Установить тиски на стол станка',
        hint: 'Тиски стоят на тумбочке справа от станка.',
        target: 'vise',
        hotspot: 'Тиски',
        view: 'table',
        run: async (ctx) => {
          ctx.sfx.whoosh();
          await fly(ctx.m.vise, ctx.m.root, V(AX, TABLE_TOP + 0.004, AZ), E(), 1.4, 0.25);
          await to(ctx.m.vise.position, { y: TABLE_TOP, duration: 0.12, ease: 'power2.in' });
          ctx.sfx.clunk();
        },
      },
      {
        id: 'work',
        label: 'Уложить заготовку на подкладки',
        hint: 'Стальная пластина лежит на тумбочке. Её кладут на параллельные подкладки между губками.',
        target: 'workpiece',
        hotspot: 'Заготовка',
        view: 'table',
        run: async (ctx) => {
          ctx.focus('vise', 1.2);
          ctx.sfx.whoosh();
          await fly(ctx.m.workpiece, ctx.m.vise, V(0, WORK_BOTTOM_IN_VISE + 0.003, 0), E(), 1.2, 0.14);
          await to(ctx.m.workpiece.position, { y: WORK_BOTTOM_IN_VISE, duration: 0.1, ease: 'power2.in' });
          ctx.sfx.metal();
        },
      },
      {
        id: 'clamp',
        label: 'Зажать заготовку рукояткой тисков',
        hint: 'Вращайте рукоятку винта тисков, пока подвижная губка не прижмёт деталь.',
        target: 'viseHandle',
        hotspot: 'Рукоятка тисков',
        view: 'vise',
        run: async (ctx) => {
          const { m, sfx } = ctx;
          sfx.ratchet(14, 1.4);
          const tl = gsap.timeline();
          tl.to(m.viseJaw.position, { z: 0.035, duration: 1.4, ease: 'power1.inOut' }, 0);
          tl.to(m.viseHandle.rotation, { z: m.viseHandle.rotation.z - Math.PI * 5, duration: 1.4, ease: 'power1.inOut' }, 0);
          await play(tl);
          await to(m.viseHandle.rotation, { z: m.viseHandle.rotation.z - Math.PI / 3, duration: 0.3, ease: 'power3.out' });
          sfx.clunk();
          await shake(m.workpiece, 0.0015, 0.2);
          ctx.hud.toast('Заготовка зажата неподвижно', 'ok');
        },
      },
    ],
    traps: [
      {
        id: 'hold',
        target: 'workpiece',
        offset: V(0.04, 0.03, 0.05),
        hotspot: 'Придержать заготовку рукой',
        title: 'Заготовку не держат руками',
        message: 'Если сверло заест, деталь вырвется из рук и начнёт вращаться вместе со сверлом. Острые кромки наносят тяжёлые травмы. Заготовку всегда закрепляют в тисках или приспособлении.',
        active: (ctx) => ctx.isDone('work') && !ctx.isDone('clamp'),
      },
    ],
    why: [
      'Незакреплённая деталь при заедании сверла проворачивается и бьёт по руке.',
      'Подкладки под деталью нужны, чтобы при выходе сверло не повредило тиски.',
      'Тиски стоят так, чтобы место отверстия было точно под осью шпинделя.',
    ],
  },
  {
    id: 'tool',
    title: 'Установка сверла',
    intro: 'Установите сверло Ø12 мм в патрон, затяните патрон ключом и обязательно выньте ключ.',
    view: 'chuck',
    ordered: true,
    actions: [
      {
        id: 'drill',
        label: 'Вставить сверло Ø12 в патрон',
        hint: 'Сверло стоит в деревянной подставке на тумбочке.',
        target: 'drill',
        hotspot: 'Сверло Ø12',
        view: 'cart',
        run: async (ctx) => {
          ctx.focus('chuck', 1.4);
          ctx.sfx.whoosh();
          await fly(ctx.m.drill, ctx.m.spindle, V(0, -CHUCK_LEN + DRILL_INSERT - 0.02, 0), E(), 1.5, 0.3);
          await to(ctx.m.drill.position, { y: -CHUCK_LEN + DRILL_INSERT, duration: 0.4, ease: 'power2.out' });
          ctx.sfx.metal();
        },
      },
      {
        id: 'tighten',
        label: 'Затянуть патрон ключом',
        hint: 'Ключ висит на держателе справа на корпусе. Вставьте его в отверстие патрона.',
        target: 'chuck',
        hotspot: 'Затянуть ключом',
        view: 'chuck',
        run: async (ctx) => {
          const { m, sfx } = ctx;
          sfx.whoosh();
          await fly(m.key, m.spindle, V(0, -0.03, 0.036), E(), 1.0, 0.08);
          ctx.state.keyInChuck = true;
          sfx.ratchet(16, 1.6);
          const j = { o: 1 };
          const tl = gsap.timeline();
          tl.to(m.key.rotation, { z: m.key.rotation.z + Math.PI * 4, duration: 1.6, ease: 'power1.inOut' }, 0);
          tl.to(m.chuckSleeve.rotation, { y: m.chuckSleeve.rotation.y - Math.PI * 0.7, duration: 1.6, ease: 'power1.inOut' }, 0);
          tl.to(j, { o: 0, duration: 1.5, ease: 'power2.out', onUpdate: () => m.setJaws(j.o) }, 0);
          await play(tl);
          sfx.clunk();
        },
      },
      {
        id: 'removeKey',
        label: 'Вынуть ключ из патрона',
        hint: 'Ключ остался в патроне. Верните его на держатель до пуска станка.',
        target: 'key',
        hotspot: 'Вынуть ключ',
        view: 'chuck',
        run: async (ctx) => {
          ctx.sfx.whoosh();
          await fly(ctx.m.key, ctx.m.keyHolder, V(0, 0, 0), E(-Math.PI / 2), 1.0, 0.1);
          ctx.state.keyInChuck = false;
          ctx.sfx.metal();
          ctx.hud.toast('Ключ на держателе — пуск безопасен', 'ok');
        },
      },
    ],
    traps: [
      {
        id: 'startWithKey',
        target: 'startBtn',
        hotspot: 'Пуск',
        title: 'Ключ остался в патроне!',
        message: 'При пуске ключ вылетает из патрона с большой скоростью и травмирует вас или окружающих. Ключ вынимают сразу после затяжки и только потом нажимают «Пуск».',
        active: (ctx) => ctx.state.keyInChuck,
        run: async (ctx) => {
          await shake(ctx.m.key, 0.003, 0.35);
        },
      },
    ],
    why: [
      'Оставленный в патроне ключ — одна из самых частых причин травм у сверлильщиков.',
      'Сверло должно быть зажато на всю длину хвостовика, иначе оно проворачивается и ломается.',
      'Правило: «затянул — вынул — повесил на место».',
    ],
  },
  {
    id: 'modes',
    title: 'Режимы резания',
    intro: 'Рассчитайте частоту вращения и выберите подачу для сверления стали 45 сверлом Ø12 мм.',
    view: 'dials',
    ordered: true,
    actions: [
      {
        id: 'speed',
        label: 'Выставить частоту вращения шпинделя',
        hint: 'n = 1000·v / (π·D) = 1000·25 / (3,14·12) ≈ 663 об/мин. Нужна ближайшая меньшая ступень станка.',
        run: async (ctx) => {
          ctx.focus('dials', 0.8);
          const target = SPEEDS.indexOf(500);
          await turnDial(ctx, ctx.m.speedDial, ctx.state.speedIndex, target, (i) => ctx.m.speedAngle(i));
          ctx.state.speedIndex = target;
        },
      },
      {
        id: 'feed',
        label: 'Выставить подачу',
        hint: 'Рекомендуемая подача 0,18 мм/об. Выберите ближайшее меньшее значение из ряда станка.',
        run: async (ctx) => {
          ctx.focus('dials', 0.8);
          const target = FEEDS.indexOf(0.14);
          await turnDial(ctx, ctx.m.feedDial, ctx.state.feedIndex, target, (i) => ctx.m.feedAngle(i));
          ctx.state.feedIndex = target;
        },
      },
    ],
    panel: modesPanel,
    why: [
      'Завышенная частота перегревает и тупит сверло, а завышенная подача ломает его. Обломки разлетаются.',
      'Из ряда станка выбирают ближайшую меньшую ступень, чтобы не превысить допустимую скорость резания.',
      'Скорости и подачи переключают только при остановленном шпинделе.',
    ],
  },
  {
    id: 'trial',
    title: 'Пробный пуск',
    intro: 'Закройте ограждение и включите станок без нагрузки. Убедитесь, что нет биения сверла и посторонних шумов.',
    view: 'front',
    ordered: true,
    actions: [
      {
        id: 'guardDown',
        label: 'Опустить ограждение патрона',
        hint: 'Поверните прозрачный экран так, чтобы он закрыл патрон спереди.',
        target: 'guard',
        hotspot: 'Ограждение',
        view: 'chuck',
        run: async (ctx) => {
          await to(ctx.m.guard.rotation, { y: 0, duration: 1.0, ease: 'power2.inOut' });
          ctx.sfx.clunk();
          ctx.state.guardClosed = true;
        },
      },
      {
        id: 'start',
        label: 'Нажать «Пуск»',
        hint: 'Зелёная кнопка на пульте управления.',
        target: 'startBtn',
        hotspot: 'Пуск',
        view: 'front',
        run: startSpindle,
      },
      {
        id: 'check',
        label: 'Проверить холостой ход: биение и шум',
        hint: 'Понаблюдайте за вращением несколько секунд.',
        auto: true,
        view: 'chuck',
        run: async (ctx) => {
          ctx.focus('chuck', 1.0);
          await ctx.hud.progress('Наблюдаем за вращением…', 3.2);
          ctx.hud.toast('Биения нет, работа ровная, без стука', 'ok');
        },
      },
      {
        id: 'stop',
        label: 'Нажать «Стоп»',
        hint: 'Красная кнопка-грибок на пульте.',
        target: 'stopBtn',
        hotspot: 'Стоп',
        view: 'front',
        run: (ctx) => stopSpindle(ctx, 2.4),
      },
    ],
    traps: [
      {
        id: 'touchChuck',
        target: 'chuck',
        offset: V(0.05, -0.1, 0.05),
        hotspot: 'Проверить биение рукой',
        title: 'Не касайтесь вращающихся частей',
        message: 'Патрон и сверло захватывают пальцы и перчатку мгновенно. Биение оценивают на глаз, а точно — индикатором на остановленном станке.',
        active: (ctx) => ctx.state.spinning,
      },
    ],
    why: [
      'Пробный пуск без нагрузки выявляет биение сверла, плохой зажим и неисправности до начала работы.',
      'Ограждение закрывают до пуска: разлетающаяся стружка и обломки задерживаются экраном.',
      'При постороннем шуме или вибрации станок сразу останавливают и сообщают мастеру.',
    ],
  },
  {
    id: 'work',
    title: 'Сверление отверстия',
    intro: 'Просверлите сквозное отверстие плавной подачей, отведите сверло, остановите станок и уберите стружку щёткой.',
    view: 'front',
    ordered: true,
    actions: [
      {
        id: 'start',
        label: 'Нажать «Пуск»',
        hint: 'Зелёная кнопка на пульте управления.',
        target: 'startBtn',
        hotspot: 'Пуск',
        view: 'front',
        run: startSpindle,
      },
      {
        id: 'drill',
        label: 'Просверлить отверстие штурвалом подачи',
        hint: 'Штурвал с тремя рукоятками справа на корпусе. Подавайте плавно, особенно на выходе сверла.',
        target: 'handwheel',
        hotspot: 'Штурвал подачи',
        view: 'front',
        run: drillHole,
      },
      {
        id: 'retract',
        label: 'Отвести сверло вверх',
        hint: 'Вращайте штурвал в обратную сторону, пока сверло не выйдет из отверстия.',
        target: 'handwheel',
        hotspot: 'Отвести сверло',
        view: 'front',
        run: retract,
      },
      {
        id: 'stop',
        label: 'Нажать «Стоп» и дождаться остановки',
        hint: 'Красная кнопка-грибок. Шпиндель ещё несколько секунд вращается по инерции.',
        target: 'stopBtn',
        hotspot: 'Стоп',
        view: 'front',
        run: async (ctx) => {
          await stopSpindle(ctx, 3.2);
          ctx.hud.toast('Шпиндель полностью остановлен', 'ok');
        },
      },
      {
        id: 'clean',
        label: 'Убрать стружку щёткой',
        hint: 'Щётка-смётка лежит на тумбочке. Стружку убирают только инструментом.',
        target: 'brush',
        hotspot: 'Щётка',
        view: 'clean',
        run: sweepChips,
      },
    ],
    traps: [
      {
        id: 'chipsHand',
        target: 'chips',
        offset: V(0.02, 0.01, 0.06),
        hotspot: 'Смахнуть стружку рукой',
        title: 'Стружку рукой не убирают',
        message: 'Витая стальная стружка острая, как лезвие, и горячая после резания. Убирают её щёткой или крючком и только при остановленном шпинделе.',
        active: (ctx) => ctx.isDone('drill') && !ctx.isDone('clean'),
      },
      {
        id: 'brake',
        target: 'chuck',
        offset: V(0.05, -0.1, 0.05),
        hotspot: 'Притормозить патрон рукой',
        title: 'Шпиндель рукой не тормозят',
        message: 'Патрон, вращающийся по инерции, затягивает руку и одежду. После «Стоп» дождитесь полной остановки шпинделя.',
        active: (ctx) => ctx.state.coasting,
      },
    ],
    why: [
      'На выходе сверла подачу уменьшают, иначе сверло «подхватывает» и ломает.',
      'Отводят сверло до остановки станка, чтобы оно не заклинило в отверстии.',
      'Стружку убирают щёткой только после полной остановки шпинделя, руками — никогда.',
    ],
  },
];
