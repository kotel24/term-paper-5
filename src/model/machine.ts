import * as THREE from 'three';
import { M, DRILL_MAT, DRILL_TIP_MAT } from './materials';
import { box, canvasTexture, cyl, group, hexBolt, mesh, put, rbox, sphere, tube } from './kit';

export const AX = 0;
export const AZ = 0.3;
export const BASE_TOP = 0.12;
export const TABLE_TOP = 0.78;
export const QUILL_Y = 1.3;
export const SLEEVE_LEN = 0.08;
export const CHUCK_LEN = 0.11;
export const DRILL_R = 0.006;
export const HOLE_R = 0.0062;
export const DRILL_SHANK = 0.06;
export const DRILL_BODY = 0.09;
export const DRILL_POINT = DRILL_R * 0.6;
export const DRILL_LEN = DRILL_SHANK + DRILL_BODY + DRILL_POINT;
export const DRILL_INSERT = 0.035;
export const WORK_THICK = 0.025;
export const WORK_BOTTOM_IN_VISE = 0.065;
export const WORK_TOP = TABLE_TOP + WORK_BOTTOM_IN_VISE + WORK_THICK;
export const TIP_Y0 = QUILL_Y - SLEEVE_LEN - CHUCK_LEN + DRILL_INSERT - DRILL_LEN;
export const FEED_CONTACT = TIP_Y0 - WORK_TOP;
export const FEED_TOTAL = FEED_CONTACT + WORK_THICK + 0.006;
export const MM_PER_REV = 0.12246;
export const JAW_OPEN = 0.055;

export const SPEEDS = [31.5, 45, 63, 90, 125, 180, 250, 355, 500, 710, 1000, 1400];
export const FEEDS = [0.1, 0.14, 0.2, 0.28, 0.4, 0.56, 0.8, 1.12, 1.6];

function fmt(v: number): string {
  return String(v).replace('.', ',');
}

function dialTexture(values: number[], title: string, accent: string): THREE.CanvasTexture {
  return canvasTexture(512, 512, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 40, c, c, c);
    g.addColorStop(0, '#2c3033');
    g.addColorStop(1, '#141618');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, c - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9ced3';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(c, c, c - 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    values.forEach((v, i) => {
      const a = (i / values.length) * Math.PI * 2;
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(a);
      ctx.fillStyle = accent;
      ctx.fillRect(-4, -c + 18, 8, 26);
      ctx.fillStyle = '#f2f4f5';
      ctx.font = `bold ${values.length > 10 ? 40 : 46}px Arial`;
      ctx.fillText(fmt(v), 0, -c + 78);
      ctx.restore();
    });
    ctx.fillStyle = '#9aa3aa';
    ctx.font = 'bold 30px Arial';
    ctx.fillText(title, c, c + 120);
  });
}

function panelTexture(): THREE.CanvasTexture {
  return canvasTexture(260, 340, (ctx, w, h) => {
    ctx.fillStyle = '#1b1d1f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6e767d';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#f2f4f5';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('СЕТЬ', w / 2, 118);
    ctx.fillText('ПУСК', w * 0.27, 300);
    ctx.fillText('СТОП', w * 0.73, 300);
  });
}

function plateTexture(): THREE.CanvasTexture {
  return canvasTexture(512, 180, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d9dde1');
    g.addColorStop(1, '#9ea5ab');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3b4247';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#1e2428';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 96px Arial';
    ctx.fillText('2Н135', w / 2, h / 2 - 8);
    ctx.font = 'bold 26px Arial';
    ctx.fillText('СТАНОК ВЕРТИКАЛЬНО-СВЕРЛИЛЬНЫЙ', w / 2, h - 30);
  });
}

function groundSignTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w) => {
    ctx.fillStyle = '#f2f4f5';
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2 - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 26);
    ctx.lineTo(64, 64);
    ctx.moveTo(36, 64);
    ctx.lineTo(92, 64);
    ctx.moveTo(46, 80);
    ctx.lineTo(82, 80);
    ctx.moveTo(56, 96);
    ctx.lineTo(72, 96);
    ctx.stroke();
  });
}

function switchTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w) => {
    ctx.fillStyle = '#f2b705';
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', w / 2, 22);
    ctx.fillText('I', w - 22, w / 2);
  });
}

function limbTexture(): THREE.CanvasTexture {
  const t = canvasTexture(1024, 64, (ctx, w, h) => {
    ctx.fillStyle = '#c9ced3';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1a1c1e';
    for (let i = 0; i < 120; i++) {
      const x = (i / 120) * w;
      ctx.fillRect(x, 0, 2, i % 10 === 0 ? h * 0.7 : h * 0.4);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function twistDrillGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const flute = Math.pow(Math.max(0, Math.cos(2 * a)), 3);
    const r = DRILL_R * (1 - 0.55 * flute);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: DRILL_BODY, steps: 48, bevelEnabled: false, curveSegments: 1 });
  const pos = geo.attributes.position;
  const lead = 0.055;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = (z / lead) * Math.PI * 2;
    pos.setXY(i, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
  }
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export class Machine {
  readonly root = group('machine');
  quill!: THREE.Group;
  spindle!: THREE.Group;
  chuckSleeve!: THREE.Mesh;
  jaws: THREE.Mesh[] = [];
  guard!: THREE.Group;
  handwheel!: THREE.Group;
  speedDial!: THREE.Group;
  feedDial!: THREE.Group;
  btnStart!: THREE.Group;
  btnStop!: THREE.Group;
  lamp!: THREE.Mesh;
  mainSwitch!: THREE.Group;
  controlPanel!: THREE.Group;
  groundBolt!: THREE.Group;
  groundWire!: THREE.Mesh;
  vise!: THREE.Group;
  viseJaw!: THREE.Group;
  viseHandle!: THREE.Group;
  workpiece!: THREE.Group;
  plug!: THREE.Mesh;
  drill!: THREE.Group;
  drillHolder!: THREE.Object3D;
  key!: THREE.Group;
  keyHolder!: THREE.Object3D;
  brush!: THREE.Group;
  chipsSpot!: THREE.Object3D;
  cartTop!: THREE.Object3D;

  omega = 0;
  quillOffset = 0;

  constructor() {
    this.buildBase();
    this.buildColumn();
    this.buildTable();
    this.buildHead();
    this.buildQuill();
    this.buildControls();
    this.buildGround();
    this.buildCart();
    this.buildVise();
    this.buildWorkpiece();
    this.buildDrill();
    this.buildKey();
    this.buildBrush();
    this.chipsSpot = put(this.root, new THREE.Object3D(), AX + 0.03, WORK_TOP + 0.01, AZ + 0.02);
    this.setJaws(1);
  }

  update(dt: number): void {
    this.spindle.rotation.y -= this.omega * dt;
  }

  setQuill(offset: number): void {
    this.quillOffset = offset;
    this.quill.position.y = QUILL_Y - offset;
    this.handwheel.rotation.x = -(offset / MM_PER_REV) * Math.PI * 2;
  }

  tipWorldY(): number {
    return TIP_Y0 - this.quillOffset;
  }

  setJaws(open: number): void {
    const r = DRILL_R + 0.0035 + open * 0.008;
    this.jaws.forEach((j, i) => {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      j.position.set(Math.sin(a) * r, j.position.y, Math.cos(a) * r);
    });
  }

  setLamp(on: boolean): void {
    M.lamp.emissiveIntensity = on ? 2.2 : 0;
  }

  speedAngle(i: number): number {
    return (i / SPEEDS.length) * Math.PI * 2;
  }

  feedAngle(i: number): number {
    return (i / FEEDS.length) * Math.PI * 2;
  }

  private buildBase(): void {
    const r = this.root;
    put(r, rbox(0.62, 0.12, 0.98, 0.02, M.paintBase), 0, 0.06, 0.14);
    put(r, rbox(0.66, 0.02, 1.02, 0.008, M.paintBase), 0, 0.01, 0.14);
    for (const x of [-0.1, 0.1]) {
      put(r, box(0.022, 0.003, 0.6, M.slot), x, BASE_TOP + 0.0005, 0.3);
    }
    const pump = group('pump');
    put(pump, cyl(0.05, 0.05, 0.1, M.paintDark, 24), 0, 0.05, 0);
    put(pump, cyl(0.055, 0.055, 0.02, M.steelDark, 24), 0, 0.105, 0);
    put(pump, rbox(0.06, 0.05, 0.05, 0.008, M.paintDark), 0.06, 0.03, 0);
    put(r, pump, 0.18, BASE_TOP, -0.2);
    for (const [x, z] of [[-0.27, -0.3], [0.27, -0.3], [-0.27, 0.58], [0.27, 0.58]]) {
      put(r, hexBolt(0.018, 0.02, M.oxide), x, BASE_TOP + 0.01, z);
    }
  }

  private buildColumn(): void {
    const r = this.root;
    put(r, rbox(0.27, 1.86, 0.27, 0.03, M.paint), 0, BASE_TOP + 0.93, -0.135);
    for (const x of [-0.085, 0.085]) {
      put(r, box(0.05, 1.8, 0.024, M.machined), x, BASE_TOP + 0.92, 0.01);
    }
    put(r, box(0.02, 1.2, 0.012, M.oxide), 0, 0.95, 0.01);
    put(r, tube([
      new THREE.Vector3(0.1, 0.13, -0.29),
      new THREE.Vector3(0.1, 0.6, -0.285),
      new THREE.Vector3(0.1, 1.6, -0.285),
      new THREE.Vector3(0.05, 2.02, -0.25),
    ], 0.012, M.hose), 0, 0, 0);
    const cab = group('cabinet');
    put(cab, rbox(0.08, 0.42, 0.22, 0.01, M.paintDark), 0, 0, 0);
    put(cab, box(0.004, 0.36, 0.17, M.paint), -0.041, 0, 0);
    put(r, cab, -0.175, 1.05, -0.135);
    this.mainSwitch = group('mainSwitch');
    const plate = cyl(0.035, 0.035, 0.006, new THREE.MeshStandardMaterial({ map: switchTexture(), roughness: 0.5 }), 32);
    plate.rotation.z = Math.PI / 2;
    plate.rotation.x = Math.PI / 2;
    this.mainSwitch.add(plate);
    const handle = group('switchHandle');
    const bar = rbox(0.012, 0.055, 0.016, 0.005, M.red);
    handle.add(bar);
    put(handle, cyl(0.012, 0.012, 0.012, M.red, 16), 0, 0, 0).rotation.z = Math.PI / 2;
    handle.position.x = -0.01;
    handle.name = 'switchHandle';
    this.mainSwitch.add(handle);
    put(r, this.mainSwitch, -0.218, 1.12, -0.135);
  }

  private buildTable(): void {
    const r = this.root;
    const t = group('table');
    put(t, rbox(0.34, 0.34, 0.16, 0.02, M.paint), 0, TABLE_TOP - 0.06 - 0.17, 0.1);
    const wedge = new THREE.Shape();
    wedge.moveTo(0, 0);
    wedge.lineTo(0.3, 0);
    wedge.lineTo(0, -0.22);
    wedge.lineTo(0, 0);
    const wg = new THREE.ExtrudeGeometry(wedge, { depth: 0.08, bevelEnabled: false });
    wg.rotateY(-Math.PI / 2);
    wg.translate(0.04, 0, 0);
    put(t, mesh(wg, M.paint), 0, TABLE_TOP - 0.06, 0.17);
    put(t, rbox(0.5, 0.06, 0.45, 0.012, M.paint), AX, TABLE_TOP - 0.03, AZ);
    put(t, box(0.49, 0.004, 0.44, M.machined), AX, TABLE_TOP - 0.002, AZ);
    for (const x of [-0.12, 0, 0.12]) {
      put(t, box(0.02, 0.002, 0.442, M.slot), x, TABLE_TOP + 0.0005, AZ);
    }
    const crank = group('tableCrank');
    put(crank, cyl(0.02, 0.02, 0.05, M.machined, 20), 0.025, 0, 0).rotation.z = Math.PI / 2;
    put(crank, box(0.012, 0.012, 0.1, M.oxide), 0.055, 0, 0.04);
    put(crank, cyl(0.012, 0.012, 0.06, M.bakelite, 16), 0.085, 0, 0.09).rotation.z = Math.PI / 2;
    put(t, crank, 0.17, TABLE_TOP - 0.2, 0.12);
    r.add(t);
  }

  private buildHead(): void {
    const r = this.root;
    const head = group('head');
    put(head, rbox(0.42, 0.5, 0.55, 0.035, M.paint), 0, 1.61, 0.245);
    put(head, rbox(0.37, 0.27, 0.72, 0.04, M.paint), 0, 1.99, 0.08);
    put(head, rbox(0.39, 0.02, 0.74, 0.008, M.paintDark), 0, 1.865, 0.08);
    put(head, cyl(0.078, 0.085, 0.07, M.paint, 40), AX, QUILL_Y + 0.035, AZ);
    put(head, cyl(0.07, 0.07, 0.012, M.machined, 40), AX, QUILL_Y + 0.006, AZ);
    const motor = group('motor');
    put(motor, cyl(0.125, 0.125, 0.3, M.paintDark, 40), 0, 0.15, 0);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const fin = put(motor, box(0.012, 0.26, 0.022, M.paintDark), Math.sin(a) * 0.13, 0.14, Math.cos(a) * 0.13);
      fin.rotation.y = a;
    }
    put(motor, cyl(0.14, 0.14, 0.03, M.paint, 40), 0, 0.015, 0);
    put(motor, cyl(0.12, 0.13, 0.06, M.black, 40), 0, 0.33, 0);
    put(motor, cyl(0.1, 0.1, 0.004, M.slot, 40), 0, 0.362, 0);
    put(motor, rbox(0.1, 0.09, 0.07, 0.01, M.paintDark), 0.13, 0.16, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(motor, hexBolt(0.01, 0.015, M.oxide), Math.sin(a) * 0.135, 0.035, Math.cos(a) * 0.135);
    }
    put(head, motor, 0, 2.125, -0.14);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.053), new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.35, metalness: 0.6 }));
    put(head, plate, 0.0, 1.8, 0.5215);
    const sight = cyl(0.018, 0.018, 0.006, new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.1, metalness: 0.2, emissive: 0x400000 }), 24);
    sight.rotation.z = Math.PI / 2;
    put(head, sight, 0.212, 1.72, 0.1);
    const hose = tube([
      new THREE.Vector3(-0.16, 1.4, 0.4),
      new THREE.Vector3(-0.17, 1.3, 0.44),
      new THREE.Vector3(-0.12, 1.14, 0.42),
      new THREE.Vector3(-0.06, 1.04, AZ + 0.07),
    ], 0.009, M.hose);
    head.add(hose);
    const nozzle = cyl(0.004, 0.009, 0.03, M.steel, 16);
    nozzle.position.set(-0.045, 1.025, AZ + 0.055);
    nozzle.rotation.set(0.4, 0, 0.9);
    head.add(nozzle);
    put(head, cyl(0.02, 0.02, 0.03, M.steelDark, 16), -0.16, 1.405, 0.4);
    const lampArm = tube([
      new THREE.Vector3(-0.21, 1.72, 0.3),
      new THREE.Vector3(-0.33, 1.8, 0.35),
      new THREE.Vector3(-0.3, 1.7, 0.52),
      new THREE.Vector3(-0.2, 1.62, 0.58),
    ], 0.008, M.black);
    head.add(lampArm);
    const shade = cyl(0.025, 0.055, 0.07, M.paintDark, 24, true);
    shade.position.set(-0.19, 1.59, 0.585);
    shade.rotation.z = -0.5;
    head.add(shade);
    put(head, sphere(0.022, new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0.6 })), -0.19, 1.575, 0.585);
    this.keyHolder = put(head, new THREE.Object3D(), 0.19, 1.405, 0.53);
    put(head, rbox(0.03, 0.03, 0.03, 0.006, M.oxide), 0.19, 1.395, 0.525);
    r.add(head);

    this.handwheel = group('handwheel');
    const hub = cyl(0.045, 0.045, 0.05, M.machined, 32);
    hub.rotation.z = Math.PI / 2;
    this.handwheel.add(hub);
    const limb = cyl(0.056, 0.056, 0.022, new THREE.MeshStandardMaterial({ map: limbTexture(), roughness: 0.3, metalness: 0.8 }), 48);
    limb.rotation.z = Math.PI / 2;
    limb.position.x = -0.03;
    this.handwheel.add(limb);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const arm = group();
      const spoke = put(arm, cyl(0.009, 0.012, 0.19, M.machined, 16), 0, 0.1, 0);
      spoke.castShadow = true;
      put(arm, sphere(0.024, M.bakelite), 0, 0.2, 0);
      arm.position.x = 0.03;
      arm.rotation.x = a;
      this.handwheel.add(arm);
    }
    put(r, this.handwheel, 0.235, 1.56, AZ - 0.02);
  }

  private buildQuill(): void {
    this.quill = group('quill');
    put(this.quill, cyl(0.042, 0.042, 0.36, M.machined, 40), 0, 0.18 - SLEEVE_LEN, 0);
    this.spindle = group('spindle');
    this.spindle.position.y = -SLEEVE_LEN;
    this.quill.add(this.spindle);
    put(this.spindle, cyl(0.03, 0.036, 0.02, M.steelDark, 32), 0, -0.01, 0);
    put(this.spindle, cyl(0.042, 0.042, 0.04, M.steel, 40), 0, -0.04, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const hole = cyl(0.0045, 0.0045, 0.004, M.slot, 12);
      hole.rotation.x = Math.PI / 2;
      hole.rotation.y = a;
      put(this.spindle, hole, Math.sin(a) * 0.041, -0.03, Math.cos(a) * 0.041);
    }
    this.chuckSleeve = put(this.spindle, cyl(0.047, 0.047, 0.055, M.chuck, 48), 0, -0.0875, 0);
    put(this.spindle, cyl(0.047, 0.047, 0.004, M.steel, 48), 0, -0.058, 0);
    put(this.spindle, cyl(0.03, 0.044, 0.007, M.steel, 40), 0, -0.1135, 0);
    for (let i = 0; i < 3; i++) {
      const jaw = box(0.007, 0.022, 0.007, M.oxide);
      jaw.position.y = -CHUCK_LEN - 0.004;
      this.jaws.push(jaw);
      this.spindle.add(jaw);
    }
    this.guard = group('guard');
    const shield = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.19, 40, 1, true, -Math.PI / 2, Math.PI), M.guard);
    shield.castShadow = false;
    shield.position.y = -0.105;
    this.guard.add(shield);
    const top = mesh(new THREE.TorusGeometry(0.078, 0.005, 8, 40, Math.PI), M.yellow);
    top.rotation.set(Math.PI / 2, 0, 0);
    top.position.y = -0.012;
    this.guard.add(top);
    const bottom = mesh(new THREE.TorusGeometry(0.078, 0.006, 8, 40, Math.PI), M.hazard);
    bottom.rotation.set(Math.PI / 2, 0, 0);
    bottom.position.y = -0.198;
    this.guard.add(bottom);
    for (const s of [-1, 1]) {
      put(this.guard, box(0.006, 0.19, 0.012, M.yellow), s * 0.078, -0.105, 0);
    }
    put(this.guard, cyl(0.05, 0.05, 0.014, M.oxide, 32), 0, -0.004, 0);
    this.guard.rotation.y = Math.PI * 0.82;
    this.quill.add(this.guard);
    put(this.root, this.quill, AX, QUILL_Y, AZ);
  }

  private buildControls(): void {
    const panel = group('panel');
    put(panel, box(0.13, 0.17, 0.006, new THREE.MeshStandardMaterial({ map: panelTexture(), roughness: 0.6 })), 0, 0, 0);
    this.btnStart = group('btnStart');
    put(this.btnStart, cyl(0.02, 0.02, 0.008, M.steelDark, 24), 0, 0, 0).rotation.x = Math.PI / 2;
    const g = put(this.btnStart, cyl(0.014, 0.014, 0.014, M.green, 24), 0, 0, 0.01);
    g.rotation.x = Math.PI / 2;
    put(panel, this.btnStart, -0.035, -0.03, 0.004);
    this.btnStop = group('btnStop');
    put(this.btnStop, cyl(0.02, 0.02, 0.008, M.steelDark, 24), 0, 0, 0).rotation.x = Math.PI / 2;
    put(this.btnStop, cyl(0.01, 0.01, 0.012, M.red, 16), 0, 0, 0.008).rotation.x = Math.PI / 2;
    const mush = mesh(new THREE.SphereGeometry(0.022, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.red);
    mush.rotation.x = Math.PI / 2;
    mush.scale.set(1, 0.45, 1);
    mush.position.z = 0.013;
    this.btnStop.add(mush);
    put(panel, this.btnStop, 0.035, -0.03, 0.004);
    this.lamp = mesh(new THREE.SphereGeometry(0.012, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.lamp);
    this.lamp.rotation.x = Math.PI / 2;
    put(panel, this.lamp, 0, 0.055, 0.004);
    put(panel, cyl(0.016, 0.016, 0.006, M.steelDark, 20), 0, 0.055, 0.002).rotation.x = Math.PI / 2;
    this.controlPanel = panel;
    put(this.root, panel, -0.12, 1.66, 0.523);

    this.speedDial = group('speedDial');
    const sd = mesh(new THREE.CircleGeometry(0.075, 64), new THREE.MeshStandardMaterial({ map: dialTexture(SPEEDS, 'об/мин', '#ffc21a'), roughness: 0.4, metalness: 0.2 }));
    this.speedDial.add(sd);
    put(this.speedDial, cyl(0.022, 0.026, 0.02, M.machined, 32), 0, 0, 0.01).rotation.x = Math.PI / 2;
    const lever = put(this.speedDial, box(0.012, 0.05, 0.012, M.machined), 0, -0.035, 0.022);
    lever.castShadow = true;
    put(this.speedDial, sphere(0.013, M.bakelite), 0, -0.062, 0.024);
    put(this.root, this.speedDial, 0.0, 1.995, 0.443);
    const sp = mesh(new THREE.ConeGeometry(0.009, 0.018, 3), M.red);
    sp.rotation.z = Math.PI;
    put(this.root, sp, 0.0, 1.995 + 0.087, 0.445);

    this.feedDial = group('feedDial');
    const fd = mesh(new THREE.CircleGeometry(0.058, 64), new THREE.MeshStandardMaterial({ map: dialTexture(FEEDS, 'мм/об', '#4fc3f7'), roughness: 0.4, metalness: 0.2 }));
    this.feedDial.add(fd);
    put(this.feedDial, cyl(0.018, 0.022, 0.018, M.machined, 32), 0, 0, 0.009).rotation.x = Math.PI / 2;
    put(this.feedDial, box(0.01, 0.04, 0.01, M.machined), 0, -0.028, 0.02);
    put(this.feedDial, sphere(0.011, M.bakelite), 0, -0.05, 0.022);
    put(this.root, this.feedDial, 0.11, 1.63, 0.5225);
    const fp = mesh(new THREE.ConeGeometry(0.008, 0.016, 3), M.red);
    fp.rotation.z = Math.PI;
    put(this.root, fp, 0.11, 1.63 + 0.068, 0.524);
  }

  private buildGround(): void {
    this.groundBolt = group('groundBolt');
    put(this.groundBolt, cyl(0.018, 0.018, 0.006, M.steel, 24), 0, 0.003, 0);
    put(this.groundBolt, hexBolt(0.012, 0.014, M.steel), 0, 0.013, 0);
    put(this.groundBolt, box(0.03, 0.003, 0.014, M.steel), 0.018, 0.007, 0);
    put(this.root, this.groundBolt, 0.24, BASE_TOP, 0.56);
    this.groundWire = tube([
      new THREE.Vector3(0.265, BASE_TOP + 0.008, 0.56),
      new THREE.Vector3(0.3, BASE_TOP + 0.02, 0.6),
      new THREE.Vector3(0.34, 0.07, 0.66),
      new THREE.Vector3(0.37, 0.006, 0.76),
      new THREE.Vector3(0.42, 0.006, 1.1),
      new THREE.Vector3(0.5, 0.006, 1.6),
    ], 0.007, M.wire, 96);
    (M.wire.map as THREE.Texture).repeat.set(6, 1);
    this.root.add(this.groundWire);
    const sign = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), new THREE.MeshStandardMaterial({ map: groundSignTexture(), roughness: 0.5 }));
    put(this.root, sign, 0.22, 0.06, 0.631);
  }

  private buildCart(): void {
    const cart = group('cart');
    put(cart, rbox(0.44, 0.68, 0.4, 0.015, M.cart), 0, 0.38, 0);
    put(cart, rbox(0.46, 0.02, 0.42, 0.006, M.cartTop), 0, 0.73, 0);
    for (const [i, y] of [0.6, 0.4, 0.2].entries()) {
      put(cart, rbox(0.4, 0.17, 0.01, 0.004, i === 0 ? M.hazard : M.cart), 0, y, 0.2);
      put(cart, box(0.12, 0.012, 0.012, M.machined), 0, y + 0.05, 0.212);
    }
    for (const [x, z] of [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]]) {
      put(cart, cyl(0.025, 0.025, 0.02, M.rubber, 16), x, 0.025, z).rotation.x = Math.PI / 2;
      put(cart, box(0.02, 0.03, 0.02, M.steelDark), x, 0.045, z);
    }
    const block = put(cart, rbox(0.06, 0.04, 0.06, 0.006, M.wood), 0.13, 0.76, -0.12);
    block.name = 'drillBlock';
    put(cart, cyl(0.0068, 0.0068, 0.002, M.slot, 16), 0.13, 0.7805, -0.12);
    put(this.root, cart, 0.82, 0, 0.3);
    this.cartTop = put(this.root, new THREE.Object3D(), 0.82, 0.74, 0.3);
    this.drillHolder = put(this.root, new THREE.Object3D(), 0.95, 0.745, 0.18);
  }

  private buildVise(): void {
    const v = group('vise');
    put(v, rbox(0.17, 0.02, 0.3, 0.004, M.paintDark), 0, 0.01, 0.045);
    for (const x of [-0.065, 0.065]) {
      put(v, box(0.02, 0.03, 0.27, M.machined), x, 0.035, 0.06);
    }
    put(v, rbox(0.17, 0.07, 0.05, 0.006, M.paintDark), 0, 0.055, -0.06);
    put(v, box(0.15, 0.035, 0.004, M.oxide), 0, 0.068, -0.037);
    put(v, rbox(0.12, 0.05, 0.02, 0.004, M.paintDark), 0, 0.035, 0.195);
    for (const z of [-0.028, 0.028]) {
      put(v, box(0.15, 0.045, 0.006, M.steel), 0, 0.0425, z);
    }
    this.viseJaw = group('viseJaw');
    put(this.viseJaw, rbox(0.17, 0.06, 0.045, 0.006, M.paintDark), 0, 0.05, 0.0245);
    put(this.viseJaw, box(0.15, 0.035, 0.004, M.oxide), 0, 0.068, 0.002);
    const rod = put(this.viseJaw, cyl(0.009, 0.009, 0.2, M.machined, 16), 0, 0.035, 0.14);
    rod.rotation.x = Math.PI / 2;
    this.viseHandle = group('viseHandle');
    const hub = cyl(0.016, 0.016, 0.03, M.machined, 20);
    hub.rotation.x = Math.PI / 2;
    this.viseHandle.add(hub);
    const bar = cyl(0.006, 0.006, 0.17, M.steel, 12);
    bar.rotation.z = Math.PI / 2;
    this.viseHandle.add(bar);
    for (const s of [-1, 1]) put(this.viseHandle, sphere(0.011, M.bakelite), s * 0.085, 0, 0);
    put(this.viseJaw, this.viseHandle, 0, 0.035, 0.245);
    this.viseJaw.position.z = 0.035 + JAW_OPEN;
    v.add(this.viseJaw);
    this.vise = v;
    put(this.root, v, 0.72, 0.74, 0.28);
  }

  private buildWorkpiece(): void {
    const w = group('workpiece');
    const shape = new THREE.Shape();
    shape.moveTo(-0.06, -0.035);
    shape.lineTo(0.06, -0.035);
    shape.lineTo(0.06, 0.035);
    shape.lineTo(-0.06, 0.035);
    shape.lineTo(-0.06, -0.035);
    const hole = new THREE.Path();
    hole.absarc(0, 0, HOLE_R, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const bev = 0.0012;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: WORK_THICK - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 48 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, bev, 0);
    w.add(mesh(geo, [M.stock, M.stockSide]));
    const plugGeo = new THREE.CylinderGeometry(HOLE_R, HOLE_R, WORK_THICK - 0.0004, 32);
    plugGeo.translate(0, (WORK_THICK - 0.0004) / 2, 0);
    this.plug = mesh(plugGeo, M.stock);
    w.add(this.plug);
    this.workpiece = w;
    w.rotation.y = 0.35;
    put(this.root, w, 0.95, 0.74, 0.4);
  }

  private buildDrill(): void {
    const d = group('drill');
    put(d, cyl(DRILL_R, DRILL_R, DRILL_SHANK, M.steel, 24), 0, -DRILL_SHANK / 2, 0);
    const body = mesh(twistDrillGeometry(), DRILL_MAT);
    body.position.y = -DRILL_SHANK;
    d.add(body);
    const point = cyl(DRILL_R * 0.95, 0.0004, DRILL_POINT, DRILL_TIP_MAT, 24);
    point.position.y = -DRILL_SHANK - DRILL_BODY - DRILL_POINT / 2;
    d.add(point);
    this.drill = d;
    d.rotation.x = Math.PI;
    this.drillHolder.add(d);
    d.position.set(0, 0.01, 0);
  }

  private buildKey(): void {
    const k = group('key');
    const pinion = cyl(0.0085, 0.0085, 0.01, M.steel, 12);
    pinion.rotation.x = Math.PI / 2;
    pinion.position.z = 0.004;
    k.add(pinion);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      put(k, box(0.003, 0.003, 0.01, M.steel), Math.cos(a) * 0.009, Math.sin(a) * 0.009, 0.004);
    }
    const shaft = cyl(0.0055, 0.0055, 0.07, M.steel, 16);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.044;
    k.add(shaft);
    const bar = cyl(0.006, 0.006, 0.11, M.steel, 16);
    bar.rotation.z = Math.PI / 2;
    bar.position.z = 0.079;
    k.add(bar);
    for (const s of [-1, 1]) put(k, sphere(0.0065, M.steel, 12), s * 0.055, 0, 0.079);
    this.key = k;
    k.rotation.x = -Math.PI / 2;
    this.keyHolder.add(k);
  }

  private buildBrush(): void {
    const b = group('brush');
    put(b, rbox(0.1, 0.022, 0.04, 0.006, M.wood), 0, 0.03, 0);
    put(b, box(0.094, 0.022, 0.034, M.bristle), 0, 0.009, 0);
    const handle = put(b, cyl(0.009, 0.011, 0.16, M.wood, 16), 0.12, 0.034, 0);
    handle.rotation.z = Math.PI / 2 - 0.12;
    this.brush = b;
    put(this.root, b, 0.86, 0.74, 0.29);
  }
}
