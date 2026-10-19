import * as THREE from 'three';

/**
 * Fixed-size particle pool rendered as a single Points draw call.
 * No allocations per burst — dead slots are recycled.
 */
export class ParticlePool {
  readonly object: THREE.Points;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly velocities: Float32Array;
  private readonly life: Float32Array;
  private cursor = 0;
  private alive = 0;

  constructor(private readonly capacity: number) {
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.object = new THREE.Points(geo, material);
    this.object.frustumCulled = false;
    this.positions.fill(-9999);
  }

  burst(origin: THREE.Vector3, color: THREE.Color, count: number, speed = 5): void {
    const n = Math.min(count, this.capacity);
    for (let i = 0; i < n; i++) {
      const slot = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      const theta = Math.random() * Math.PI * 2;
      const up = 0.3 + Math.random() * 0.9;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.positions.set([origin.x, origin.y, origin.z], slot * 3);
      this.velocities.set([Math.cos(theta) * s * 0.6, up * s, Math.sin(theta) * s * 0.6], slot * 3);
      const tint = color.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.3);
      this.colors.set([tint.r, tint.g, tint.b], slot * 3);
      const l = 0.6 + Math.random() * 0.6;
      if (this.life[slot]! <= 0) this.alive++;
      this.life[slot] = l;
    }
  }

  update(dt: number): void {
    if (this.alive === 0) return;
    const gravity = 9;
    for (let i = 0; i < this.capacity; i++) {
      const l = this.life[i]!;
      if (l <= 0) continue;
      const nl = l - dt;
      const k = i * 3;
      if (nl <= 0) {
        this.life[i] = 0;
        this.alive--;
        this.positions[k + 1] = -9999;
        continue;
      }
      this.life[i] = nl;
      this.velocities[k + 1]! -= gravity * dt;
      this.positions[k]! += this.velocities[k]! * dt;
      this.positions[k + 1]! += this.velocities[k + 1]! * dt;
      this.positions[k + 2]! += this.velocities[k + 2]! * dt;
    }
    const geo = this.object.geometry;
    geo.getAttribute('position').needsUpdate = true;
    geo.getAttribute('color').needsUpdate = true;
  }

  dispose(): void {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}
