/**
 * TEMPORARY procedural models (see docs/ASSETS.md). Each collectible is built from
 * primitives with correct proportions and PBR-ish materials so final authored glTF
 * models can replace them per `ModelKey` without touching gameplay code.
 */
import * as THREE from 'three';
import type { ModelKey } from '../domain/types';

const WHITE = new THREE.Color('#f5f5f0');
const DARK = new THREE.Color('#1b1f2a');

export function mat(color: THREE.ColorRepresentation, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });
}

export function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
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

/** Shield outline shared by the 3D badge and the 2D SVG art (see ui/art.ts). */
export function shieldShape(w = 0.9, h = 1.05): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(w / 2, -h * 0.05);
  s.quadraticCurveTo(w / 2, -h * 0.38, 0, -h / 2);
  s.quadraticCurveTo(-w / 2, -h * 0.38, -w / 2, -h * 0.05);
  s.closePath();
  return s;
}

/** Team fan badge: extruded shield in flag colours with a gold rim and a ball emblem. */
function createBadge(color: string, secondary: string): THREE.Group {
  const g = new THREE.Group();
  const extrude = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
  const rim = mesh(new THREE.ExtrudeGeometry(shieldShape(1, 1.15), extrude), mat('#ffd166', { metalness: 0.8, roughness: 0.25 }));
  rim.position.z = -0.08;
  const body = mesh(new THREE.ExtrudeGeometry(shieldShape(0.88, 1.02), extrude), mat(color, { roughness: 0.4 }));
  const band = mesh(new THREE.BoxGeometry(0.88, 0.2, 0.05), mat(secondary, { roughness: 0.4 }), 0, 0.12, 0.17);
  g.add(rim, body, band);
  const emblem = createBall('#ffd166');
  emblem.scale.setScalar(0.42);
  emblem.position.set(0, -0.12, 0.2);
  g.add(emblem);
  g.position.y = 0.05;
  return g;
}

/** Player position card in team colours with a stylised silhouette. */
function createCard(color: string, secondary: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.66, 0.92, 0.04), mat(color, { metalness: 0.3, roughness: 0.35 })));
  const frame = mat('#ffd166', { metalness: 0.7, roughness: 0.3, emissive: '#ffd166', emissiveIntensity: 0.25 });
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.04, 0.05), frame, 0, 0.46, 0));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.04, 0.05), frame, 0, -0.46, 0));
  g.add(mesh(new THREE.BoxGeometry(0.66, 0.16, 0.05), mat(secondary), 0, -0.3, 0.01));
  g.add(mesh(new THREE.SphereGeometry(0.12, 16, 12), mat('#2b2b2b'), 0, 0.2, 0.04));
  g.add(mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.24, 16), mat('#2b2b2b'), 0, -0.02, 0.03));
  return g;
}

/** Landmark postcard: a framed card with a sunset band and skyline blocks. */
function createPostcard(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.1, 0.75, 0.03), mat('#fdf6e3', { roughness: 0.8 })));
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.36, 0.035), mat('#f4a261', { emissive: '#f4a261', emissiveIntensity: 0.2 }), 0, 0.12, 0.005));
  for (let i = 0; i < 5; i++) {
    const h = 0.12 + ((i * 37) % 5) * 0.05;
    g.add(mesh(new THREE.BoxGeometry(0.12, h, 0.04), mat('#0b1430'), -0.4 + i * 0.2, -0.06 + h / 2, 0.01));
  }
  g.add(mesh(new THREE.BoxGeometry(0.16, 0.2, 0.04), mat('#006c35'), 0.42, -0.22, 0.01));
  return g;
}

/** Venue visit stamp: a thick gold coin with an inner ring in the venue colour. */
function createStamp(color: string): THREE.Group {
  const g = new THREE.Group();
  const coin = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 40), mat('#ffd166', { metalness: 0.85, roughness: 0.25 }));
  coin.rotation.x = Math.PI / 2;
  const inner = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 40), mat(color, { roughness: 0.4 }));
  inner.rotation.x = Math.PI / 2;
  const ball = createBall('#ffffff');
  ball.scale.setScalar(0.4);
  ball.position.z = 0.1;
  g.add(coin, inner, ball);
  return g;
}

/** Builds the presentation model for a collectible. The only function to touch when real models arrive. */
export function createItemModel(key: ModelKey, color: string, secondary = '#ffffff'): THREE.Group {
  switch (key) {
    case 'badge': return createBadge(color, secondary);
    case 'card': return createCard(color, secondary);
    case 'postcard': return createPostcard();
    case 'stamp': return createStamp(color);
  }
}

/** Fictional mascot-style avatar: rounded body, jersey, head with headband. */
export function createAvatar(jersey = '#006c35'): THREE.Group {
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
