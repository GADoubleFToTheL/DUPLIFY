import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

/**
 * Umgebungslicht für glänzendes Plastik – prozedural erzeugt, also ohne Download (offline).
 */
export function roomEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  let tex = envCache.get(renderer);
  if (!tex) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    tex = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    envCache.set(renderer, tex);
  }
  return tex;
}
