import * as THREE from 'three';

type Mat = THREE.Material | THREE.Material[];

export class Highlighter {
  private originals = new Map<THREE.Mesh, Mat>();
  private clones = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  private color = new THREE.Color(0xffb300);
  private level = 0;
  private boost = 0;

  set(objects: THREE.Object3D[], color = 0xffb300): void {
    this.clear();
    this.color.set(color);
    for (const root of objects) {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || this.originals.has(m) || o.name === 'chips' || o.parent?.name === 'chips') return;
        this.originals.set(m, m.material);
        m.material = Array.isArray(m.material) ? m.material.map((x) => this.cloneOf(x)) : this.cloneOf(m.material);
      });
    }
  }

  emphasize(): void {
    this.boost = 1;
  }

  private cloneOf(src: THREE.Material): THREE.Material {
    const std = src as THREE.MeshStandardMaterial;
    if (!std.isMeshStandardMaterial) return src;
    let c = this.clones.get(src);
    if (!c) {
      c = std.clone();
      c.emissive = this.color.clone();
      c.emissiveMap = null;
      this.clones.set(src, c);
    }
    return c;
  }

  update(t: number, dt: number): void {
    if (!this.clones.size) return;
    this.boost = Math.max(0, this.boost - dt * 0.6);
    this.level = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(t * 5.5)) + this.boost * 0.8;
    for (const c of this.clones.values()) c.emissiveIntensity = this.level;
  }

  clear(): void {
    for (const [m, mat] of this.originals) m.material = mat;
    this.originals.clear();
    for (const c of this.clones.values()) c.dispose();
    this.clones.clear();
    this.boost = 0;
  }
}
