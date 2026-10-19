/**
 * TEMPORARY procedural models (see docs/ASSETS.md). Each collectible is built from
 * primitives with correct proportions and PBR-ish materials so final authored glTF
 * models can replace them per `ModelKey` without touching gameplay code.
 */
import * as THREE from 'three';
import type { ModelKey } from '../domain/types';

const WHITE = new THREE.Color('#f5f5f0');
const DARK = new THREE.Color('#1b1f2a');

function mat(color: THREE.ColorRepresentation, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

let ballGeometry: THREE.BufferGeometry | null = null;

/** Stylised football: faceted icosphere with dark faces around the 12 pentagon centres. */
function footballGeometry(): THREE.BufferGeometry {
  if (ballGeometry) return ballGeometry;
  const geo = new THREE.IcosahedronGeometry(0.5, 1); // PolyhedronGeometry is already non-indexed
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const pos = ico.getAttribute('position');
  const pentagonCentres: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    if (!pentagonCentres.some((c) => c.distanceTo(v) < 1e-3)) pentagonCentres.push(v);
  }
  const p = geo.getAttribute('position');
  const colors = new Float32Array(p.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    a.fromBufferAttribute(p, f); b.fromBufferAttribute(p, f + 1); c.fromBufferAttribute(p, f + 2);
    const centre = a.add(b).add(c).normalize();
    const dark = pentagonCentres.some((pc) => pc.dot(centre) > 0.95);
    const col = dark ? DARK : WHITE;
    for (let k = 0; k < 3; k++) col.toArray(colors, (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  ballGeometry = geo;
  return geo;
}

/** Shared geometry must survive disposal of individual models (e.g. after a reveal animation). */
export function isSharedGeometry(geo: THREE.BufferGeometry): boolean {
  return geo === ballGeometry;
}

export function createBall(accent: THREE.ColorRepresentation = '#ffffff'): THREE.Group {
  const g = new THREE.Group();
  const m = mesh(footballGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.4 }));
  g.add(m);
  // thin accent ring gives each ball item its own identity colour
  const ring = mesh(new THREE.TorusGeometry(0.505, 0.025, 6, 32), mat(accent, { emissive: accent, emissiveIntensity: 0.35 }));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

function createBoots(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = mat(color);
  const sole = mat('#222222', { roughness: 0.8 });
  const upper = mesh(new THREE.BoxGeometry(0.34, 0.28, 0.8), body, 0, 0.18, 0);
  const toe = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.34, 12, 1, false, 0, Math.PI), body, 0, 0.12, 0.4);
  toe.rotation.z = Math.PI / 2;
  const heel = mesh(new THREE.BoxGeometry(0.34, 0.42, 0.22), body, 0, 0.25, -0.3);
  const base = mesh(new THREE.BoxGeometry(0.36, 0.06, 0.98), sole, 0, 0.02, 0.04);
  g.add(upper, toe, heel, base);
  for (const z of [-0.32, -0.1, 0.15, 0.38]) for (const x of [-0.11, 0.11]) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 6), sole, x, -0.04, z));
  const swoosh = mesh(new THREE.BoxGeometry(0.36, 0.05, 0.5), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.2 }), 0, 0.2, 0.05);
  g.add(swoosh);
  g.scale.setScalar(0.9);
  return g;
}

function createGloves(color: string): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color);
  const palm = mat('#f1f1f1');
  g.add(mesh(new THREE.BoxGeometry(0.55, 0.6, 0.18), m, 0, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.45, 0.04), palm, 0, 0.02, 0.11));
  for (let i = 0; i < 4; i++) {
    const f = mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), m, -0.19 + i * 0.125, 0.48, 0);
    g.add(f);
  }
  const thumb = mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), m, 0.33, 0.05, 0.03);
  thumb.rotation.z = -0.7;
  g.add(thumb);
  g.add(mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.22, 16), mat('#222222'), 0, -0.4, 0));
  return g;
}

function createKit(color: string): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color);
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.85, 0.22), m, 0, 0, 0));
  for (const s of [-1, 1]) {
    const sleeve = mesh(new THREE.BoxGeometry(0.32, 0.26, 0.2), m, s * 0.47, 0.28, 0);
    sleeve.rotation.z = s * -0.5;
    g.add(sleeve);
  }
  g.add(mesh(new THREE.BoxGeometry(0.72, 0.08, 0.23), mat('#ffd166', { metalness: 0.4 }), 0, -0.1, 0));
  g.add(mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16, Math.PI), mat('#ffffff'), 0, 0.42, 0.06));
  return g;
}

function createScarf(color: string): THREE.Group {
  const g = new THREE.Group();
  const a = mat(color), b = mat('#ffffff');
  for (let i = 0; i < 10; i++) {
    const seg = mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 6, Math.PI / 6), i % 2 ? b : a);
    seg.rotation.z = (i * Math.PI) / 6 - Math.PI / 2;
    seg.scale.set(1, 1, 2.2);
    g.add(seg);
  }
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.16, 0.5, 0.05), a, s * 0.15, -0.65, 0.05));
  return g;
}

function createCone(color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(0.32, 0.9, 20), mat(color), 0, 0.45, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.235, 0.14, 20), mat('#ffffff'), 0, 0.45, 0));
  g.add(mesh(new THREE.BoxGeometry(0.75, 0.05, 0.75), mat(color), 0, 0.025, 0));
  g.position.y = -0.4;
  return g;
}

function createWhistle(color: string): THREE.Group {
  const g = new THREE.Group();
  const metal = mat(color, { metalness: 0.85, roughness: 0.25 });
  const body = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 24), metal);
  body.rotation.x = Math.PI / 2;
  const mouth = mesh(new THREE.BoxGeometry(0.16, 0.12, 0.45), metal, 0.25, 0.12, 0);
  mouth.rotation.y = Math.PI / 2;
  const ring = mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20), metal, -0.27, 0.1, 0);
  g.add(body, mouth, ring);
  g.scale.setScalar(1.2);
  return g;
}

function createTrophy(color: string): THREE.Group {
  const g = new THREE.Group();
  const gold = mat(color, { metalness: 0.9, roughness: 0.2, emissive: color, emissiveIntensity: 0.08 });
  const profile = [
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.12, 0.0), new THREE.Vector2(0.08, 0.15),
    new THREE.Vector2(0.06, 0.35), new THREE.Vector2(0.2, 0.45), new THREE.Vector2(0.34, 0.7),
    new THREE.Vector2(0.36, 0.95), new THREE.Vector2(0.33, 0.95), new THREE.Vector2(0.0, 0.6),
  ];
  g.add(mesh(new THREE.LatheGeometry(profile, 28), gold, 0, -0.35, 0));
  for (const s of [-1, 1]) {
    const handle = mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 16, Math.PI * 1.2), gold, s * 0.38, 0.3, 0);
    handle.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2 + Math.PI * 0.2;
    g.add(handle);
  }
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), mat('#3d2b1f', { roughness: 0.8 }), 0, -0.42, 0));
  return g;
}

function createCard(color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.62, 0.88, 0.04), mat(color, { metalness: 0.3, roughness: 0.35 })));
  const frame = mat('#ffd166', { metalness: 0.7, roughness: 0.3, emissive: '#ffd166', emissiveIntensity: 0.25 });
  g.add(mesh(new THREE.BoxGeometry(0.66, 0.04, 0.05), frame, 0, 0.44, 0));
  g.add(mesh(new THREE.BoxGeometry(0.66, 0.04, 0.05), frame, 0, -0.44, 0));
  g.add(mesh(new THREE.SphereGeometry(0.13, 16, 12), mat('#f1d3b3'), 0, 0.14, 0.04));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.24, 16), mat('#ffffff'), 0, -0.14, 0.03));
  return g;
}

/** Builds the presentation model for a collectible. The only file to touch when real models arrive. */
export function createItemModel(key: ModelKey, color: string): THREE.Group {
  switch (key) {
    case 'ball': return createBall(color);
    case 'boots': return createBoots(color);
    case 'gloves': return createGloves(color);
    case 'kit': return createKit(color);
    case 'scarf': return createScarf(color);
    case 'cone': return createCone(color);
    case 'whistle': return createWhistle(color);
    case 'trophy': return createTrophy(color);
    case 'card': return createCard(color);
  }
}

/** Fictional mascot-style avatar: rounded body, jersey, head with headband. */
export function createAvatar(jersey = '#0f9d58'): THREE.Group {
  const g = new THREE.Group();
  const skin = mat('#c68b59');
  const shirt = mat(jersey);
  g.add(mesh(new THREE.CapsuleGeometry(0.42, 0.55, 6, 16), shirt, 0, 1.0, 0));
  g.add(mesh(new THREE.SphereGeometry(0.34, 20, 16), skin, 0, 1.75, 0));
  const headband = mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 24), mat('#ffffff'), 0, 1.86, 0);
  headband.rotation.x = Math.PI / 2;
  g.add(headband);
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.CapsuleGeometry(0.12, 0.45, 4, 8), mat('#1b1f2a'), s * 0.18, 0.35, 0));
    g.add(mesh(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), skin, s * 0.52, 1.05, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.08, 0.06), mat('#ffd166'), 0, 1.15, 0.42));
  const ball = createBall('#ffd166');
  ball.scale.setScalar(0.5);
  ball.position.set(0.3, 0.13, 0.45);
  ball.name = 'avatar-ball';
  g.add(ball);
  return g;
}
