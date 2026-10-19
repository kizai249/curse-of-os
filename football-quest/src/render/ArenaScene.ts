import * as THREE from 'three';
import { ARENA, PERFORMANCE } from '../config/balance';
import type { Logger } from '../core/Logger';
import type { DiscoveryPointDefinition, ItemDefinition, Rarity } from '../domain/types';
import type { QualityLevel } from '../persistence/saveSchema';
import { createAvatar, createBall, createItemModel, isSharedGeometry } from './models';
import { ParticlePool } from './ParticlePool';
import { PerfMonitor } from './PerfMonitor';

export const RARITY_COLORS: Readonly<Record<Rarity, string>> = {
  common: '#cfd8dc',
  rare: '#4fc3f7',
  epic: '#b388ff',
  legendary: '#ffca28',
};

/** Keep in sync with e2e/smoke.mjs, which projects point positions to tap them. */
export const CAMERA_OFFSET = new THREE.Vector3(0, 15, 14);
export const CAMERA_FOV = 55;
const CAMERA_LERP = 4;
const TAP_MAX_MOVE_PX = 12;
const POINT_HOVER_HEIGHT = 1.3;
/** Taps within this multiple of the interaction radius of a point snap to that point. */
const TAP_SNAP_FACTOR = 1.25;
/** Where the avatar stops relative to the interaction radius (inside it, beside the orb). */
const STOP_DISTANCE_FACTOR = 0.45;

interface PointView {
  readonly def: DiscoveryPointDefinition;
  readonly root: THREE.Group;
  readonly orb: THREE.Group;
  readonly beam: THREE.Mesh;
  readonly ring: THREE.Mesh;
  available: boolean;
}

export interface ArenaCallbacks {
  onNearestPointChange(pointId: string | null): void;
}

/**
 * Presentation of the virtual arena. Owns no game rules: availability comes from
 * GameSession via setPointAvailable(), collection is requested by the UI.
 */
export class ArenaScene {
  readonly perf = new PerfMonitor();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock(false);
  private readonly avatar: THREE.Group;
  private readonly target = new THREE.Vector3();
  private readonly targetMarker: THREE.Mesh;
  private readonly points = new Map<string, PointView>();
  private readonly particles = new ParticlePool(PERFORMANCE.particlePoolSize);
  private readonly sun: THREE.DirectionalLight;
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly resizeObserver: ResizeObserver;
  private readonly reveals: { obj: THREE.Object3D; t: number; duration: number; resolve: () => void }[] = [];
  private nearest: string | null = null;
  private running = false;
  private frameHandle = 0;
  private reducedMotion = false;
  private walkPhase = 0;
  private downAt: { x: number; y: number } | null = null;

  constructor(
    private readonly container: HTMLElement,
    defs: readonly DiscoveryPointDefinition[],
    private readonly callbacks: ArenaCallbacks,
    private readonly logger: Logger,
    quality: QualityLevel,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', 'ساحة الاستكشاف ثلاثية الأبعاد');

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.5, 200);
    this.scene.background = new THREE.Color('#0b1430');
    this.scene.fog = new THREE.Fog('#0b1430', 45, 95);

    this.scene.add(new THREE.HemisphereLight('#9fb8ff', '#3b2a1a', 0.9));
    this.sun = new THREE.DirectionalLight('#ffe7c2', 2.2);
    this.sun.position.set(18, 30, 10);
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.scene.add(this.sun);

    this.buildEnvironment();
    this.avatar = createAvatar();
    this.scene.add(this.avatar);
    this.avatar.position.set(0, 0, 8);
    this.target.copy(this.avatar.position);

    this.targetMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.55, 24),
      new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    this.targetMarker.rotation.x = -Math.PI / 2;
    this.targetMarker.position.y = 0.03;
    this.targetMarker.visible = false;
    this.scene.add(this.targetMarker);

    for (const def of defs) this.addPoint(def);
    this.scene.add(this.particles.object);

    this.camera.position.copy(this.avatar.position).add(CAMERA_OFFSET);
    this.camera.lookAt(this.avatar.position);

    this.setQuality(quality);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
  }

  /** Throws when WebGL is unavailable so the caller can show the fallback UI. */
  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }

  setQuality(q: QualityLevel): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PERFORMANCE.pixelRatioCap[q]));
    const shadowSize = PERFORMANCE.shadowMapSize[q];
    this.renderer.shadowMap.enabled = shadowSize > 0;
    this.sun.castShadow = shadowSize > 0;
    if (shadowSize > 0) {
      this.sun.shadow.mapSize.set(shadowSize, shadowSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => { mat.needsUpdate = true; });
    });
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  setPointAvailable(pointId: string, available: boolean): void {
    const view = this.points.get(pointId);
    if (!view || view.available === available) return;
    view.available = available;
    view.orb.visible = available;
    view.beam.visible = available;
    (view.ring.material as THREE.MeshBasicMaterial).opacity = available ? 0.9 : 0.25;
    if (!available && this.nearest === pointId) this.setNearest(null);
  }

  /** Plays the reveal: the actual item rises out of the point with a rarity-coloured burst. */
  playCollect(pointId: string, item: ItemDefinition): Promise<void> {
    const view = this.points.get(pointId);
    if (!view) return Promise.resolve();
    const origin = new THREE.Vector3(view.def.x, POINT_HOVER_HEIGHT, view.def.z);
    const color = new THREE.Color(RARITY_COLORS[item.rarity]);
    const rarityBoost = { common: 1, rare: 1.4, epic: 1.8, legendary: 2.5 }[item.rarity];
    this.particles.burst(origin, color, Math.round((this.reducedMotion ? 14 : 40) * rarityBoost));
    const model = createItemModel(item.modelKey, item.color);
    model.position.copy(origin);
    this.scene.add(model);
    return new Promise((resolve) => {
      this.reveals.push({ obj: model, t: 0, duration: this.reducedMotion ? 0.5 : 1.4, resolve });
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      this.frameHandle = requestAnimationFrame(loop);
      this.frame(Math.min(this.clock.getDelta(), 0.1));
    };
    this.frameHandle = requestAnimationFrame(loop);
  }

  /** Stops the render loop entirely (overlay screens, background tab) to save battery. */
  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.clock.stop();
  }

  dispose(): void {
    this.stop();
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('webglcontextlost', this.onContextLost);
    this.particles.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
    });
    this.renderer.dispose();
    el.remove();
  }

  // ── frame ───────────────────────────────────────────────────────────────

  private frame(dt: number): void {
    this.perf.record(dt);
    const t = this.clock.elapsedTime;
    this.updateAvatar(dt);
    for (const view of this.points.values()) {
      if (!view.available) continue;
      view.orb.rotation.y += dt * 1.2;
      view.orb.position.y = POINT_HOVER_HEIGHT + (this.reducedMotion ? 0 : Math.sin(t * 2 + view.def.x) * 0.15);
    }
    for (let i = this.reveals.length - 1; i >= 0; i--) {
      const r = this.reveals[i]!;
      r.t += dt;
      const k = Math.min(1, r.t / r.duration);
      r.obj.position.y = POINT_HOVER_HEIGHT + k * 1.8;
      r.obj.rotation.y += dt * (this.reducedMotion ? 1 : 6) * (1 - k * 0.7);
      r.obj.scale.setScalar(0.6 + Math.sin(k * Math.PI) * 0.9);
      if (k >= 1) {
        this.scene.remove(r.obj);
        r.obj.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          if (!isSharedGeometry(m.geometry)) m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        });
        this.reveals.splice(i, 1);
        r.resolve();
      }
    }
    this.particles.update(dt);
    if (this.targetMarker.visible) {
      const pulse = 1 + Math.sin(t * 6) * 0.1;
      this.targetMarker.scale.set(pulse, pulse, pulse);
    }
    const desired = this.avatar.position.clone().add(CAMERA_OFFSET);
    this.camera.position.lerp(desired, this.reducedMotion ? 1 : Math.min(1, dt * CAMERA_LERP));
    this.camera.lookAt(this.avatar.position.x, this.avatar.position.y + 1, this.avatar.position.z);
    this.renderer.render(this.scene, this.camera);
  }

  private updateAvatar(dt: number): void {
    const pos = this.avatar.position;
    const toTarget = new THREE.Vector3(this.target.x - pos.x, 0, this.target.z - pos.z);
    const dist = toTarget.length();
    const step = ARENA.walkSpeed * dt;
    if (dist > 0.05) {
      toTarget.normalize();
      pos.addScaledVector(toTarget, Math.min(step, dist));
      const heading = Math.atan2(toTarget.x, toTarget.z);
      // shortest-arc turn so the avatar never spins the long way round at ±π
      const delta = Math.atan2(Math.sin(heading - this.avatar.rotation.y), Math.cos(heading - this.avatar.rotation.y));
      this.avatar.rotation.y += delta * Math.min(1, dt * 10);
      this.walkPhase += dt * 12;
      if (!this.reducedMotion) pos.y = Math.abs(Math.sin(this.walkPhase)) * 0.12;
      const ball = this.avatar.getObjectByName('avatar-ball');
      if (ball) ball.rotation.x += step * 3;
    } else {
      pos.y = 0;
      this.targetMarker.visible = false;
    }
    let best: string | null = null;
    let bestDist: number = ARENA.interactionRadius;
    for (const view of this.points.values()) {
      if (!view.available) continue;
      const d = Math.hypot(view.def.x - pos.x, view.def.z - pos.z);
      if (d <= bestDist) { best = view.def.id; bestDist = d; }
    }
    if (best !== this.nearest) this.setNearest(best);
  }

  private setNearest(id: string | null): void {
    this.nearest = id;
    this.callbacks.onNearestPointChange(id);
  }

  // ── input ───────────────────────────────────────────────────────────────

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };

  /** Tap (not drag) → walk to that spot on the ground, clamped to the play area. */
  private readonly onPointerUp = (e: PointerEvent): void => {
    if (!this.downAt) return;
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    this.downAt = null;
    if (moved > TAP_MAX_MOVE_PX) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return;
    const b = ARENA.boundsHalfSize;
    this.target.set(THREE.MathUtils.clamp(hit.x, -b, b), 0, THREE.MathUtils.clamp(hit.z, -b, b));
    this.snapTargetToPoint();
    this.targetMarker.position.set(this.target.x, 0.03, this.target.z);
    this.targetMarker.visible = true;
  };

  /**
   * Tapping on/near a discovery point walks the avatar *to* it and stops beside it, instead of
   * overshooting — otherwise the collect button flickers away while the player is still walking.
   */
  private snapTargetToPoint(): void {
    let best: PointView | null = null;
    let bestDist = ARENA.interactionRadius * TAP_SNAP_FACTOR;
    for (const view of this.points.values()) {
      if (!view.available) continue;
      const d = Math.hypot(view.def.x - this.target.x, view.def.z - this.target.z);
      if (d < bestDist) { best = view; bestDist = d; }
    }
    if (!best) return;
    const toAvatar = new THREE.Vector3(this.avatar.position.x - best.def.x, 0, this.avatar.position.z - best.def.z);
    if (toAvatar.lengthSq() < 1e-6) toAvatar.set(0, 0, 1);
    toAvatar.normalize().multiplyScalar(ARENA.interactionRadius * STOP_DISTANCE_FACTOR);
    this.target.set(best.def.x + toAvatar.x, 0, best.def.z + toAvatar.z);
  }

  private readonly onContextLost = (e: Event): void => {
    e.preventDefault();
    this.logger.error('WebGL context lost');
  };

  private resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ── environment ─────────────────────────────────────────────────────────

  private addPoint(def: DiscoveryPointDefinition): void {
    const root = new THREE.Group();
    root.position.set(def.x, 0, def.z);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.15, 32),
      new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.6, 6, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffe8a3', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    beam.position.y = 3;
    const orb = new THREE.Group();
    const ball = createBall('#ffd166');
    ball.scale.setScalar(1.1);
    orb.add(ball);
    orb.position.y = POINT_HOVER_HEIGHT;
    root.add(ring, beam, orb);
    this.scene.add(root);
    this.points.set(def.id, { def, root, orb, beam, ring, available: true });
  }

  private buildEnvironment(): void {
    // Desert sand around the stadium
    const sand = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshStandardMaterial({ color: '#c9a16b', roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.receiveShadow = true;
    this.scene.add(sand);

    // Pitch with mowing stripes
    const stripeW = 4;
    for (let i = -6; i < 6; i++) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(stripeW, 48),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? '#2e8b47' : '#36a052', roughness: 0.95 }),
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i * stripeW + stripeW / 2, 0.01, 0);
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }

    // Field lines
    const lineMat = new THREE.MeshBasicMaterial({ color: '#f2f2f2' });
    const addLine = (w: number, d: number, x: number, z: number) => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(x, 0.02, z);
      this.scene.add(l);
    };
    addLine(48, 0.2, 0, -24); addLine(48, 0.2, 0, 24);
    addLine(0.2, 48, -24, 0); addLine(0.2, 48, 24, 0);
    addLine(48, 0.2, 0, 0);
    const circle = new THREE.Mesh(new THREE.RingGeometry(5.8, 6, 48), lineMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.02;
    this.scene.add(circle);
    for (const s of [-1, 1]) {
      addLine(16, 0.2, 0, s * 17); addLine(0.2, 7, -8, s * 20.5); addLine(0.2, 7, 8, s * 20.5);
      this.scene.add(this.createGoal(s * 24, s));
    }

    // Stands (low-poly tiers). The crowd is one InstancedMesh → one draw call for 224 blocks.
    const standMat = new THREE.MeshStandardMaterial({ color: '#2b3550', roughness: 0.9 });
    const crowdColors = ['#0f9d58', '#ffffff', '#ffd166', '#1e88e5'].map((c) => new THREE.Color(c));
    const sides = 4, tiers = 4, perTier = 14;
    const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.7, 0.6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), sides * tiers * perTier);
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let side = 0; side < sides; side++) {
      const rot = (side * Math.PI) / 2;
      for (let tier = 0; tier < tiers; tier++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(56, 1.2, 2.5), standMat);
        step.position.set(0, 0.6 + tier * 1.2, -31 - tier * 2.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        step.rotation.y = rot;
        step.receiveShadow = true;
        this.scene.add(step);
        for (let c = 0; c < perTier; c++) {
          dummy.position.set(-26 + c * 4, 1.5 + tier * 1.2, -31 - tier * 2.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
          dummy.rotation.set(0, rot, 0);
          dummy.updateMatrix();
          crowd.setMatrixAt(idx, dummy.matrix);
          crowd.setColorAt(idx, crowdColors[(c + tier + side) % crowdColors.length]!);
          idx++;
        }
      }
    }
    this.scene.add(crowd);

    // Floodlights
    const poleMat = new THREE.MeshStandardMaterial({ color: '#8d99ae', metalness: 0.6, roughness: 0.4 });
    for (const [x, z] of [[-34, -34], [34, -34], [-34, 34], [34, 34]] as const) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 22, 8), poleMat);
      pole.position.set(x, 11, z);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6d5', emissiveIntensity: 2 }));
      lamp.position.set(x, 22.5, z);
      lamp.lookAt(0, 0, 0);
      this.scene.add(pole, lamp);
    }

    // Palm trees in the sand — a nod to the local landscape (instanced: 2 draw calls total)
    const palms = 10, leavesPerPalm = 7;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.55, 9, 8), new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.9 }), palms);
    const leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 5, 4, 1, true), new THREE.MeshStandardMaterial({ color: '#2f7d32', roughness: 0.8, side: THREE.DoubleSide }), palms * leavesPerPalm);
    const d = new THREE.Object3D();
    for (let i = 0; i < palms; i++) {
      const a = (i / palms) * Math.PI * 2 + 0.3;
      const r = 50 + (i % 3) * 6;
      const px = Math.cos(a) * r, pz = Math.sin(a) * r;
      d.position.set(px, 4.5, pz);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      trunks.setMatrixAt(i, d.matrix);
      for (let l = 0; l < leavesPerPalm; l++) {
        d.position.set(px, 9, pz);
        d.rotation.set(Math.PI / 2.6, (l / leavesPerPalm) * Math.PI * 2, 0, 'YXZ');
        d.translateY(2.2);
        d.updateMatrix();
        leaves.setMatrixAt(i * leavesPerPalm + l, d.matrix);
      }
    }
    this.scene.add(trunks, leaves);
  }

  private createGoal(z: number, side: number): THREE.Group {
    const g = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
    const w = 7.3, h = 2.44;
    for (const x of [-w / 2, w / 2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 10), postMat);
      post.position.set(x, h / 2, 0);
      post.castShadow = true;
      g.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, w, 10), postMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = h;
    g.add(bar);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 1.6, 14, 6, 3),
      new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.35 }),
    );
    net.position.set(0, h / 2, side * 0.8);
    g.add(net);
    g.position.z = z;
    return g;
  }
}
