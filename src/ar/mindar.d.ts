declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type { Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
  export interface MindARAnchor {
    group: Group;
    visible: boolean;
    onTargetFound: (() => void) | null;
    onTargetLost: (() => void) | null;
  }
  export class MindARThree {
    constructor(options: Record<string, unknown>);
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    addAnchor(index: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}
declare module 'mind-ar/dist/mindar-image.prod.js' {
  export class Compiler {
    compileImageTargets(images: HTMLImageElement[], progress: (p: number) => void): Promise<unknown>;
    exportData(): Uint8Array;
  }
}
