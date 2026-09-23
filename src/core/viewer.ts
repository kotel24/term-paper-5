import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { canvasTexture } from '../model/kit';
import { makeEnvironment, makeLights, now, type FrameFn, type Stage, type View } from './stage';

function floorTexture(): THREE.CanvasTexture {
  const t = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#6b6f72';
    ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(30,32,34,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

function zoneTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const b = 44;
    ctx.fillStyle = '#f2b705';
    ctx.fillRect(0, 0, w, b);
    ctx.fillRect(0, h - b, w, b);
    ctx.fillRect(0, 0, b, h);
    ctx.fillRect(w - b, 0, b, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, b);
    ctx.rect(0, h - b, w, b);
    ctx.rect(0, 0, b, h);
    ctx.rect(w - b, 0, b, h);
    ctx.clip();
    ctx.fillStyle = '#171717';
    for (let x = -h; x < w + h; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 45, 0);
      ctx.lineTo(x + 45 + h, h);
      ctx.lineTo(x + h, h);
      ctx.fill();
    }
    ctx.restore();
  });
}

export class ViewerStage implements Stage {
  readonly kind = '3d' as const;
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.02, 60);
  readonly scene = new THREE.Scene();
  readonly content = new THREE.Group();
  readonly dom: HTMLElement;
  private controls: OrbitControls;
  private frames: FrameFn[] = [];
  private last = now();
  private tween: gsap.core.Tween | null = null;
  private inset = 0;
  private leftInset = 0;
  private topInset = 0;
  private leftTarget = 0;
  private lastView: View | null = null;
  private refocus: gsap.core.Tween | null = null;
  private ro: ResizeObserver;

  constructor(container: HTMLElement) {
    this.dom = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.classList.add('stage-canvas');

    this.scene.background = new THREE.Color(0x1b2024);
    this.scene.fog = new THREE.Fog(0x1b2024, 6, 14);
    this.scene.environment = makeEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.55;
    const lights = makeLights();
    this.scene.add(lights.group);
    this.scene.add(this.content);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.92, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.material.map!.repeat.set(8, 8);
    this.scene.add(floor);
    const zone = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.0),
      new THREE.MeshStandardMaterial({ map: zoneTexture(), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(0.3, 0.001, 0.25);
    zone.receiveShadow = true;
    this.scene.add(zone);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.enablePan = true;
    this.controls.addEventListener('start', () => {
      this.tween?.kill();
      this.tween = null;
      this.lastView = null;
    });
    this.camera.position.set(2.6, 2.3, 3.4);
    this.controls.target.set(0.25, 1.0, 0.2);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  async start(): Promise<void> {
    this.last = now();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private tick(): void {
    const t = now();
    const dt = Math.min(0.05, t - this.last);
    this.last = t;
    this.controls.update();
    for (const f of this.frames) f(dt, t);
    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const w = this.dom.clientWidth || window.innerWidth;
    const h = this.dom.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyOffset(w, h);
  }

  private applyOffset(w: number, h: number): void {
    const shift = Math.round((this.inset - this.topInset) * 0.5);
    const side = Math.round(this.leftInset * 0.5);
    if (shift !== 0 || side > 0) this.camera.setViewOffset(w, h, -side, shift, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  setBottomInset(px: number): void {
    const cap = (this.dom.clientHeight || window.innerHeight) * 0.45;
    const next = Math.min(px, cap);
    const changed = Math.abs(next - this.inset) > 30;
    this.inset = next;
    this.applyOffset(this.dom.clientWidth || window.innerWidth, this.dom.clientHeight || window.innerHeight);
    if (changed && this.lastView) {
      const v = this.lastView;
      this.refocus?.kill();
      this.refocus = gsap.delayedCall(0.25, () => {
        if (this.lastView === v) this.focus(v, this.tween ? 1 : 0.8);
      });
    }
  }

  setTopInset(px: number): void {
    this.topInset = px;
    this.applyOffset(this.dom.clientWidth || window.innerWidth, this.dom.clientHeight || window.innerHeight);
  }

  setLeftInset(px: number): void {
    const apply = () => this.applyOffset(this.dom.clientWidth || window.innerWidth, this.dom.clientHeight || window.innerHeight);
    const changed = Math.abs(px - this.leftTarget) > 30;
    this.leftTarget = px;
    gsap.killTweensOf(this, 'leftInset');
    if (changed && this.lastView) this.focus(this.lastView, 0.9);
    gsap.to(this, { leftInset: px, duration: 0.9, ease: 'power2.inOut', onUpdate: apply });
  }

  focus(view: View, duration = 1.4): void {
    this.lastView = view;
    const target = new THREE.Vector3(...view.target);
    const offset = new THREE.Vector3(...view.pos).sub(target);
    const h = this.dom.clientHeight || window.innerHeight;
    const w = this.dom.clientWidth || window.innerWidth;
    const aspect = Math.max(0.3, w - this.leftTarget) / h;
    const free = Math.max(0.4, (h - this.inset - this.topInset) / h);
    const vertical = Math.sqrt(1 / free);
    const horizontal = aspect < 1.2 ? THREE.MathUtils.clamp(1.2 / aspect, 1, 2.1) * 0.92 : 1;
    offset.multiplyScalar(Math.max(1, horizontal * vertical));
    const endPos = target.clone().add(offset);
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startOff = startPos.clone().sub(startTarget);
    const endOff = offset.clone();
    const s0 = new THREE.Spherical().setFromVector3(startOff);
    const s1 = new THREE.Spherical().setFromVector3(endOff);
    let dTheta = s1.theta - s0.theta;
    if (dTheta > Math.PI) dTheta -= Math.PI * 2;
    if (dTheta < -Math.PI) dTheta += Math.PI * 2;
    this.tween?.kill();
    if (duration <= 0) {
      this.controls.target.copy(target);
      this.camera.position.copy(endPos);
      return;
    }
    const p = { t: 0 };
    const sph = new THREE.Spherical();
    this.tween = gsap.to(p, {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const k = p.t;
        this.controls.target.lerpVectors(startTarget, target, k);
        sph.set(
          THREE.MathUtils.lerp(s0.radius, s1.radius, k),
          THREE.MathUtils.lerp(s0.phi, s1.phi, k),
          s0.theta + dTheta * k,
        );
        this.camera.position.setFromSpherical(sph).add(this.controls.target);
      },
      onComplete: () => {
        this.tween = null;
      },
    });
  }

  onFrame(fn: FrameFn): void {
    this.frames.push(fn);
  }

  isVisible(): boolean {
    return true;
  }

  dispose(): void {
    this.tween?.kill();
    this.refocus?.kill();
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
