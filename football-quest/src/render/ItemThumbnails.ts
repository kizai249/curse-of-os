import * as THREE from 'three';
import type { Logger } from '../core/Logger';
import type { ItemDefinition } from '../domain/types';
import { createItemModel, isSharedGeometry } from './models';

const SIZE = 192;

/**
 * Renders each collectible's 3D model once into a PNG data URL for the 2D UI,
 * so inventory art matches the in-world models. Uses a short-lived WebGL context.
 */
export function generateThumbnails(items: readonly ItemDefinition[], logger: Logger): Map<string, string> {
  const out = new Map<string, string>();
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#445566', 1.4));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(2, 3, 4);
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(0, 0.5, 3.2);
    camera.lookAt(0, 0, 0);
    for (const item of items) {
      const model = createItemModel(item.modelKey, item.color);
      model.rotation.y = -0.5;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const centre = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      model.position.sub(centre);
      model.scale.multiplyScalar(1.6 / size);
      model.position.multiplyScalar(1.6 / size);
      scene.add(model);
      renderer.render(scene, camera);
      out.set(item.id, renderer.domElement.toDataURL('image/png'));
      scene.remove(model);
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (!isSharedGeometry(m.geometry)) m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
    }
  } catch (err) {
    logger.warn('Thumbnail generation failed; using fallback icons', err);
  } finally {
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
  return out;
}
