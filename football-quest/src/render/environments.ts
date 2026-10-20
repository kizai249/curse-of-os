/**
 * Scene builders for the two location kinds. Pure construction — no per-frame logic.
 * Heavy repeated geometry (crowd, palms, flags) is instanced to keep draw calls low on phones.
 */
import * as THREE from 'three';
import { FANZONE_RING_RADIUS, landmarkAngle } from '../config/locations';
import { LANDMARKS, TEAMS, type CityDefinition, type VenueDefinition } from '../config/tournament';
import { createLandmark } from './landmarks';
import { mat, mesh } from './models';

const UP = new THREE.Vector3(0, 1, 0);

/** Canvas-texture sign. Arabic shaping and RTL are handled by the browser's canvas text engine. */
export function textSign(text: string, width: number, height: number, bg: string, fg: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  const scale = 128;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = canvas.height * 0.55;
    ctx.font = `900 ${size}px Tajawal, "Noto Sans Arabic", sans-serif`;
    while (ctx.measureText(text).width > canvas.width * 0.92 && size > 10) {
      size -= 4;
      ctx.font = `900 ${size}px Tajawal, "Noto Sans Arabic", sans-serif`;
    }
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex }));
}

function palms(scene: THREE.Scene, positions: readonly [number, number][]): void {
  const leavesPerPalm = 7;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.55, 9, 8), mat('#7a5230', { roughness: 0.9 }), positions.length);
  const leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 5, 4, 1, true), mat('#2f7d32', { roughness: 0.8, side: THREE.DoubleSide }), positions.length * leavesPerPalm);
  const d = new THREE.Object3D();
  positions.forEach(([px, pz], i) => {
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
  });
  scene.add(trunks, leaves);
}

function ring(count: number, radius: number, jitter = 0): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + 0.3;
    const r = radius + (i % 3) * jitter;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

function sandGround(scene: THREE.Scene, color = '#c9a16b'): void {
  const sand = mesh(new THREE.CircleGeometry(90, 48), mat(color, { roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.castShadow = false;
  sand.receiveShadow = true;
  scene.add(sand);
}

// ── Stadium ────────────────────────────────────────────────────────────────

function goal(z: number, side: number): THREE.Group {
  const g = new THREE.Group();
  const postMat = mat('#ffffff', { roughness: 0.3 });
  const w = 7.3, h = 2.44;
  for (const x of [-w / 2, w / 2]) g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 10), postMat, x, h / 2, 0));
  const bar = mesh(new THREE.CylinderGeometry(0.08, 0.08, w, 10), postMat, 0, h, 0);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  const net = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.6, 14, 6, 3), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.35 }));
  net.position.set(0, h / 2, side * 0.8);
  g.add(net);
  g.position.z = z;
  return g;
}

export function buildStadium(scene: THREE.Scene, venue: VenueDefinition): void {
  sandGround(scene);
  const [lower, upper, roof] = venue.palette;

  const stripeW = 4;
  for (let i = -6; i < 6; i++) {
    const stripe = mesh(new THREE.PlaneGeometry(stripeW, 48), mat(i % 2 === 0 ? '#2e8b47' : '#36a052', { roughness: 0.95 }));
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i * stripeW + stripeW / 2, 0.01, 0);
    stripe.castShadow = false;
    stripe.receiveShadow = true;
    scene.add(stripe);
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: '#f2f2f2' });
  const addLine = (w: number, d: number, x: number, z: number) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, 0.02, z);
    scene.add(l);
  };
  addLine(48, 0.2, 0, -24); addLine(48, 0.2, 0, 24);
  addLine(0.2, 48, -24, 0); addLine(0.2, 48, 24, 0);
  addLine(48, 0.2, 0, 0);
  const circle = new THREE.Mesh(new THREE.RingGeometry(5.8, 6, 48), lineMat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.02;
  scene.add(circle);
  for (const s of [-1, 1]) {
    addLine(16, 0.2, 0, s * 17); addLine(0.2, 7, -8, s * 20.5); addLine(0.2, 7, 8, s * 20.5);
    scene.add(goal(s * 24, s));
  }

  // Two-tier stands in the venue palette; fans are one InstancedMesh in tournament + home colours.
  const tierMats = [mat(lower, { roughness: 0.9 }), mat(upper, { roughness: 0.9 })];
  const fanColors = ['#006c35', '#ffffff', '#ffd166', lower, upper].map((c) => new THREE.Color(c));
  const sides = 4, tiers = 4, perTier = 14;
  const crowd = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.7, 0.6), mat('#ffffff', { roughness: 0.8 }), sides * tiers * perTier);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let side = 0; side < sides; side++) {
    const rot = (side * Math.PI) / 2;
    for (let tier = 0; tier < tiers; tier++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(56, 1.2, 2.5), tierMats[tier < 2 ? 0 : 1]!);
      step.position.set(0, 0.6 + tier * 1.2, -31 - tier * 2.5).applyAxisAngle(UP, rot);
      step.rotation.y = rot;
      step.receiveShadow = true;
      scene.add(step);
      for (let c = 0; c < perTier; c++) {
        dummy.position.set(-26 + c * 4, 1.5 + tier * 1.2, -31 - tier * 2.5).applyAxisAngle(UP, rot);
        dummy.rotation.set(0, rot, 0);
        dummy.updateMatrix();
        crowd.setMatrixAt(idx, dummy.matrix);
        crowd.setColorAt(idx, fanColors[(c * 3 + tier + side) % fanColors.length]!);
        idx++;
      }
    }
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(58, 0.4, 9), mat(roof, { roughness: 0.6, metalness: 0.2 }));
    roofMesh.position.set(0, 7.6, -35).applyAxisAngle(UP, rot);
    roofMesh.rotation.y = rot;
    scene.add(roofMesh);
  }
  scene.add(crowd);

  // Venue name board behind the north goal, facing the pitch.
  const sign = textSign(venue.nameAr, 26, 2.6, '#0b1430', '#ffd166');
  sign.position.set(0, 5.4, -29.4);
  scene.add(sign);

  const poleMat = mat('#8d99ae', { metalness: 0.6, roughness: 0.4 });
  for (const [x, z] of [[-34, -34], [34, -34], [-34, 34], [34, 34]] as const) {
    scene.add(mesh(new THREE.CylinderGeometry(0.3, 0.45, 22, 8), poleMat, x, 11, z));
    const lamp = mesh(new THREE.BoxGeometry(4, 2, 0.6), mat('#ffffff', { emissive: '#fff6d5', emissiveIntensity: 2 }), x, 22.5, z);
    lamp.lookAt(0, 0, 0);
    scene.add(lamp);
  }
  palms(scene, ring(10, 50, 6));
}

// ── City fan zone ──────────────────────────────────────────────────────────

export function buildFanZone(scene: THREE.Scene, city: CityDefinition): void {
  sandGround(scene, '#cfa874');
  // Paved plaza with a decorative star pattern ring (Najdi/Hijazi-inspired geometric motif).
  const plaza = mesh(new THREE.CircleGeometry(21, 64), mat('#e9dcc3', { roughness: 0.9 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  plaza.castShadow = false;
  plaza.receiveShadow = true;
  scene.add(plaza);
  const motif = mesh(new THREE.RingGeometry(6.5, 7.2, 8), mat(city.accent, { roughness: 0.6 }));
  motif.rotation.x = -Math.PI / 2;
  motif.position.y = 0.02;
  motif.castShadow = false;
  scene.add(motif);
  const centre = mesh(new THREE.CircleGeometry(2.2, 8), mat('#006c35'));
  centre.rotation.x = -Math.PI / 2;
  centre.position.y = 0.03;
  centre.castShadow = false;
  scene.add(centre);

  if (city.coastal) {
    const sea = mesh(new THREE.PlaneGeometry(200, 70), mat('#1e6fa8', { roughness: 0.15, metalness: 0.35 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.0, -62);
    sea.castShadow = false;
    scene.add(sea);
  }

  // Landmarks on a ring, facing the plaza centre; matching discovery points sit in front of them.
  const landmarks = LANDMARKS.filter((l) => l.cityId === city.id);
  landmarks.forEach((l, i) => {
    const a = landmarkAngle(i, landmarks.length);
    const model = createLandmark(l.model);
    model.position.set(Math.cos(a) * FANZONE_RING_RADIUS, 0, Math.sin(a) * FANZONE_RING_RADIUS);
    model.lookAt(0, 0, 0);
    scene.add(model);
    const sign = textSign(l.nameAr, 6, 0.9, '#0b1430', '#ffd166');
    sign.position.set(Math.cos(a) * (FANZONE_RING_RADIUS - 3.4), 2.2, Math.sin(a) * (FANZONE_RING_RADIUS - 3.4));
    sign.lookAt(0, 2.2, 0);
    scene.add(sign);
  });

  // Big fan-zone screen showing the host city and dates.
  const screen = textSign(`${city.nameAr} ترحب بجماهير آسيا`, 12, 3, '#006c35', '#ffffff');
  screen.position.set(0, 4.5, -20);
  scene.add(screen);
  scene.add(mesh(new THREE.BoxGeometry(12.6, 0.4, 0.6), mat('#222222'), 0, 2.8, -20.1));
  for (const x of [-5.5, 5.5]) scene.add(mesh(new THREE.BoxGeometry(0.4, 3, 0.4), mat('#222222'), x, 1.5, -20.1));

  // Flags of all 24 teams on poles around the plaza (instanced cloth in flag colours).
  const flagCount = TEAMS.length;
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 5, 6), mat('#cfd8dc', { metalness: 0.6 }), flagCount);
  const cloth = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1, 0.04), mat('#ffffff', { roughness: 0.7 }), flagCount * 2);
  const d = new THREE.Object3D();
  TEAMS.forEach((t, i) => {
    const a = (i / flagCount) * Math.PI * 2;
    const x = Math.cos(a) * 20.5, z = Math.sin(a) * 20.5;
    d.position.set(x, 2.5, z); d.rotation.set(0, -a, 0); d.updateMatrix();
    poles.setMatrixAt(i, d.matrix);
    // two-band flag: primary on top, secondary below
    for (let b = 0; b < 2; b++) {
      d.position.set(x, 4.55 - b * 0.5, z); d.rotation.set(0, -a + Math.PI / 2, 0); d.translateX(0.8); d.scale.set(1, 0.5, 1); d.updateMatrix();
      cloth.setMatrixAt(i * 2 + b, d.matrix);
      cloth.setColorAt(i * 2 + b, new THREE.Color(t.colors[b]!));
      d.scale.set(1, 1, 1);
    }
  });
  scene.add(poles, cloth);
  palms(scene, ring(14, 28, 4));
}
