/**
 * TEMPORARY stylised landmark replicas for the city fan zones (see docs/ASSETS.md).
 * Built from primitives at a consistent scale (~1 unit ≈ 1 m of play space, landmarks are
 * miniaturised to 6–14 units tall) so they read clearly from the follow camera on a phone.
 */
import * as THREE from 'three';
import type { LandmarkModel } from '../config/tournament';
import { mat, mesh } from './models';

const SAND = '#d9b77e';
const MUD = '#b07a4f';
const WHITE = '#f2efe8';
const SEA = '#1e6fa8';
const GLASS = '#8fb3cf';

/** Kingdom Centre: tapering tower with the parabolic opening and sky bridge near the top. */
function towerArch(): THREE.Group {
  const g = new THREE.Group();
  const w = 3.2, h = 14;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.quadraticCurveTo(w * 0.42, h * 0.75, 0.15, h);
  shape.lineTo(-0.15, h);
  shape.quadraticCurveTo(-w * 0.42, h * 0.75, -w / 2, 0);
  const hole = new THREE.Path();
  hole.moveTo(-0.9, h * 0.7);
  hole.quadraticCurveTo(0, h * 1.12, 0.9, h * 0.7);
  hole.lineTo(-0.9, h * 0.7);
  shape.holes.push(hole);
  const tower = mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false }), mat(GLASS, { metalness: 0.6, roughness: 0.2 }));
  tower.position.z = -0.8;
  g.add(tower);
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.25, 1.7), mat('#dfe7ee', { emissive: '#9fd3ff', emissiveIntensity: 0.6 }), 0, h * 0.7, 0));
  return g;
}

/** Najdi mud-brick fort (Masmak / At-Turaif): walls, round corner towers, crenellations. */
function mudFort(): THREE.Group {
  const g = new THREE.Group();
  const wall = mat(MUD, { roughness: 1 });
  g.add(mesh(new THREE.BoxGeometry(6, 3.2, 4), wall, 0, 1.6, 0));
  for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]] as const) {
    g.add(mesh(new THREE.CylinderGeometry(0.75, 0.95, 5, 10), wall, x, 2.5, z));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(new THREE.BoxGeometry(0.25, 0.4, 0.25), wall, x + Math.cos(a) * 0.65, 5.2, z + Math.sin(a) * 0.65));
    }
  }
  for (let i = -2; i <= 2; i++) g.add(mesh(new THREE.BoxGeometry(0.4, 0.45, 0.3), wall, i * 1.1, 3.4, 2.05));
  g.add(mesh(new THREE.BoxGeometry(1.2, 2, 0.2), mat('#5a3a22'), 0, 1, 2.05));
  for (const x of [-2, 2]) g.add(mesh(new THREE.BoxGeometry(0.15, 0.6, 0.12), mat('#2b1d12'), x, 2.3, 2.05));
  return g;
}

/** Entertainment-district gate: glowing arch with coloured light strips. */
function archGate(): THREE.Group {
  const g = new THREE.Group();
  const arch = mesh(new THREE.TorusGeometry(4, 0.45, 12, 40, Math.PI), mat('#7b2ff7', { emissive: '#7b2ff7', emissiveIntensity: 0.9 }));
  g.add(arch);
  const inner = mesh(new THREE.TorusGeometry(3.3, 0.18, 8, 40, Math.PI), mat('#00e5ff', { emissive: '#00e5ff', emissiveIntensity: 1.2 }));
  g.add(inner);
  for (const x of [-4, 4]) g.add(mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), mat('#222244'), x, 0.3, 0));
  return g;
}

/** Hijazi coral-stone houses with wooden rawasheen balconies. */
function coralHouses(): THREE.Group {
  const g = new THREE.Group();
  const stone = mat('#e8dcc4', { roughness: 0.95 });
  const wood = mat('#7a4a2a', { roughness: 0.8 });
  const heights = [8, 10, 7];
  heights.forEach((h, i) => {
    const x = (i - 1) * 2.6;
    g.add(mesh(new THREE.BoxGeometry(2.4, h, 2.4), stone, x, h / 2, 0));
    for (let f = 1; f < h / 2.4; f++) {
      g.add(mesh(new THREE.BoxGeometry(1.4, 1.5, 0.5), wood, x, f * 2.4, 1.4));
      for (let k = -1; k <= 1; k++) g.add(mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), mat('#4a2c18'), x + k * 0.4, f * 2.4, 1.66));
    }
  });
  return g;
}

/** King Fahd Fountain: tall translucent water jet over the sea. */
function fountain(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.2, 32), mat(SEA, { roughness: 0.2, metalness: 0.3 }), 0, 0.1, 0));
  const jet = new THREE.MeshStandardMaterial({ color: '#e6f7ff', emissive: '#bfe9ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.75 });
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.45, 13, 12, 1, true), jet, 0, 6.6, 0));
  g.add(mesh(new THREE.SphereGeometry(1.1, 16, 12), jet, 0, 13, 0));
  return g;
}

/** Waterfront promenade: sea strip, railings, lamps and palms. */
function corniche(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(9, 0.15, 3), mat(SEA, { roughness: 0.2, metalness: 0.3 }), 0, 0.05, -1));
  g.add(mesh(new THREE.BoxGeometry(9, 0.25, 1.4), mat('#c9c2b0'), 0, 0.12, 1.2));
  for (let i = -4; i <= 4; i += 2) {
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), mat('#37474f'), i, 1.4, 1.6));
    g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), mat('#fff3c4', { emissive: '#ffe08a', emissiveIntensity: 1.2 }), i, 2.75, 1.6));
  }
  for (const x of [-3, 3]) {
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 5, 8), mat('#7a5230'), x, 2.5, 0.4));
    for (let l = 0; l < 6; l++) {
      const leaf = mesh(new THREE.ConeGeometry(0.5, 2.6, 4, 1, true), mat('#2f7d32', { side: THREE.DoubleSide }), x, 5, 0.4);
      leaf.rotation.set(Math.PI / 2.6, (l / 6) * Math.PI * 2, 0, 'YXZ');
      leaf.translateY(1.1);
      g.add(leaf);
    }
  }
  return g;
}

/** White mosque with dome and minaret standing on the water. */
function waterMosque(): THREE.Group {
  const g = new THREE.Group();
  const white = mat(WHITE, { roughness: 0.5 });
  g.add(mesh(new THREE.CylinderGeometry(4, 4, 0.2, 32), mat(SEA, { roughness: 0.2, metalness: 0.3 }), 0, 0.1, 0));
  g.add(mesh(new THREE.BoxGeometry(4.5, 2.6, 4), white, 0, 1.5, 0));
  g.add(mesh(new THREE.SphereGeometry(1.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#4fb3bf', { roughness: 0.3, metalness: 0.2 }), 0, 2.8, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, 8, 12), white, 2.6, 4, -1.6));
  g.add(mesh(new THREE.ConeGeometry(0.45, 1.2, 12), mat('#4fb3bf'), 2.6, 8.6, -1.6));
  return g;
}

/** Al Khobar water tower: slender shaft with a spherical tank and viewing ring. */
function waterTower(): THREE.Group {
  const g = new THREE.Group();
  const white = mat(WHITE, { roughness: 0.4 });
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.9, 11, 16), white, 0, 5.5, 0));
  g.add(mesh(new THREE.SphereGeometry(2, 24, 18), mat('#d0e4f2', { metalness: 0.4, roughness: 0.25 }), 0, 12.4, 0));
  const ring = mesh(new THREE.TorusGeometry(2.1, 0.12, 8, 32), mat('#1e88e5', { emissive: '#1e88e5', emissiveIntensity: 0.6 }), 0, 12.4, 0);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  g.add(mesh(new THREE.ConeGeometry(0.25, 1.4, 10), white, 0, 15, 0));
  return g;
}

/** Cultural centre made of stacked, rounded "pebbles" in steel tones. */
function pebbles(): THREE.Group {
  const g = new THREE.Group();
  const steel = mat('#c9ced6', { metalness: 0.8, roughness: 0.3 });
  const stack: readonly [number, number, number, number][] = [[0, 2, 0, 2.6], [0.6, 5.4, 0.3, 1.8], [-0.4, 8, -0.2, 1.4], [0.2, 10.2, 0.1, 1]];
  for (const [x, y, z, r] of stack) {
    const p = mesh(new THREE.SphereGeometry(r, 24, 16), steel, x, y, z);
    p.scale.set(1.2, 0.85, 1);
    g.add(p);
  }
  g.add(mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.3, 32), mat('#8d6e63'), 0, 0.15, 0));
  return g;
}

/** Crescent beach: sand arc around turquoise water, with an umbrella. */
function bay(): THREE.Group {
  const g = new THREE.Group();
  const water = mesh(new THREE.CircleGeometry(4.2, 32), mat('#2bb3c0', { roughness: 0.2, metalness: 0.2 }), 0, 0.06, 0);
  water.rotation.x = -Math.PI / 2;
  g.add(water);
  const sand = mesh(new THREE.TorusGeometry(4.6, 0.9, 6, 32, Math.PI * 1.2), mat(SAND, { roughness: 1 }), 0, 0.1, 0);
  sand.rotation.x = -Math.PI / 2;
  sand.scale.z = 0.25;
  g.add(sand);
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), mat('#ffffff'), -3, 1.2, -2));
  g.add(mesh(new THREE.ConeGeometry(1.2, 0.6, 8), mat('#ef476f'), -3, 2.5, -2));
  return g;
}

export function createLandmark(model: LandmarkModel): THREE.Group {
  switch (model) {
    case 'tower_arch': return towerArch();
    case 'mud_fort': return mudFort();
    case 'arch_gate': return archGate();
    case 'coral_houses': return coralHouses();
    case 'fountain': return fountain();
    case 'corniche': return corniche();
    case 'water_mosque': return waterMosque();
    case 'water_tower': return waterTower();
    case 'pebbles': return pebbles();
    case 'bay': return bay();
  }
}
