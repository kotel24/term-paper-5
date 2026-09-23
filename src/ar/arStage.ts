import * as THREE from 'three';
import type { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { makeEnvironment, makeLights, now, type FrameFn, type Lights, type Stage } from '../core/stage';

const MODEL_SCALE = 0.42;
const CENTER_X = 0.36;
const CENTER_Z = 0.15;

export class ARStage implements Stage {
  readonly kind = 'ar' as const;
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  scene!: THREE.Scene;
  readonly content = new THREE.Group();
  readonly dom: HTMLElement;
  private mind: MindARThree | null = null;
  private frames: FrameFn[] = [];
  private tracked = false;
  private last = now();
  private lights: Lights;
  private shadowScale = 0;
  private trackingListeners: ((v: boolean) => void)[] = [];
  private onResize = () => this.mind && (this.mind as unknown as { resize(): void }).resize();

  constructor(container: HTMLElement, private targetSrc: string) {
    this.dom = container;
    this.lights = makeLights();
  }

  onTracking(fn: (v: boolean) => void): void {
    this.trackingListeners.push(fn);
  }

  async start(): Promise<void> {
    const { MindARThree } = await import('mind-ar/dist/mindar-image-three.prod.js');
    const mind = new MindARThree({
      container: this.dom,
      imageTargetSrc: this.targetSrc,
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
      filterMinCF: 0.0001,
      filterBeta: 0.001,
      warmupTolerance: 3,
      missTolerance: 8,
    });
    this.mind = mind;
    this.renderer = mind.renderer;
    this.scene = mind.scene;
    this.camera = mind.camera;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.classList.add('stage-canvas');
    this.scene.environment = makeEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.6;

    const anchor = mind.addAnchor(0);
    const placement = new THREE.Group();
    placement.rotation.x = Math.PI / 2;
    placement.scale.setScalar(MODEL_SCALE);
    this.content.position.set(-CENTER_X, 0, -CENTER_Z);
    placement.add(this.content);
    anchor.group.add(placement);
    this.content.add(this.lights.group);

    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.4), new THREE.ShadowMaterial({ opacity: 0.38 }));
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.set(0.35, 0, 0.2);
    catcher.receiveShadow = true;
    this.content.add(catcher);

    anchor.onTargetFound = () => this.setTracked(true);
    anchor.onTargetLost = () => this.setTracked(false);

    await mind.start();
    window.addEventListener('resize', this.onResize);
    this.last = now();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private setTracked(v: boolean): void {
    this.tracked = v;
    for (const f of this.trackingListeners) f(v);
  }

  private tick(): void {
    const t = now();
    const dt = Math.min(0.05, t - this.last);
    this.last = t;
    if (this.tracked) this.fitShadow();
    for (const f of this.frames) f(dt, t);
    this.renderer.render(this.scene, this.camera);
  }

  private fitShadow(): void {
    this.content.updateWorldMatrix(true, false);
    const s = new THREE.Vector3().setFromMatrixScale(this.content.matrixWorld).x;
    if (Math.abs(s - this.shadowScale) / (s || 1) < 0.05) return;
    this.shadowScale = s;
    const c = this.lights.key.shadow.camera;
    c.left = -1.3 * s;
    c.right = 1.3 * s;
    c.top = 1.5 * s;
    c.bottom = -1.3 * s;
    c.near = 0.5 * s;
    c.far = 7 * s;
    c.updateProjectionMatrix();
  }

  focus(): void {}

  setBottomInset(): void {}

  setLeftInset(): void {}

  setTopInset(): void {}

  onFrame(fn: FrameFn): void {
    this.frames.push(fn);
  }

  isVisible(): boolean {
    return this.tracked;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.renderer) this.renderer.setAnimationLoop(null);
    try {
      this.mind?.stop();
    } catch {
      this.mind = null;
    }
    this.renderer?.dispose();
    this.dom.innerHTML = '';
  }
}
