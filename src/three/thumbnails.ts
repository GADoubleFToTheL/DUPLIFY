import * as THREE from 'three';
import type { Placement } from '../core/types';
import { roomEnvironment } from './environment';
import { MAT } from './materials';
import { createCreationGroup } from './partFactory';

/**
 * Vorschaubilder über EINEN geteilten Offscreen-Renderer.
 * So entstehen auf dem iPad nicht zu viele WebGL-Kontexte.
 */
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

export interface ThumbOptions {
  size?: number;
  /** Blickwinkel um die Hochachse (Bogenmaß, 0 = von vorne). */
  yaw?: number;
  /** Blick von oben (Bogenmaß). */
  pitch?: number;
}

function setup(): { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  if (!renderer || !scene || !camera) {
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.environment = roomEnvironment(renderer);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xbfdfff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.25);
    sun.position.set(4, 9, 6);
    scene.add(sun);
    camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
  }
  return { renderer, scene, camera };
}

function renderNow(placements: readonly Placement[], opts: ThumbOptions): string {
  const { renderer, scene, camera } = setup();
  const size = opts.size ?? 256;
  renderer.setSize(size, size, false);
  const group = createCreationGroup(placements);
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const dims = box.getSize(new THREE.Vector3());
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), MAT.shadow());
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(dims.x * 1.5 + 1, dims.z * 1.5 + 1, 1);
  shadow.position.set(center.x, box.min.y + 0.01, center.z);
  group.add(shadow);
  scene.add(group);

  const yaw = opts.yaw ?? -0.6;
  const pitch = opts.pitch ?? 0.42;
  const dir = new THREE.Vector3(Math.sin(-yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const radius = Math.max(0.8, box.getBoundingSphere(new THREE.Sphere()).radius);
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.02;
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = dist / 50;
  camera.far = dist * 4;
  camera.updateProjectionMatrix();
  camera.lookAt(center);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(group);
  shadow.geometry.dispose();
  return url;
}

/** Rendert (einmalig, danach aus dem Zwischenspeicher) ein Vorschaubild als Data-URL. */
export function renderThumbnail(key: string, placements: readonly Placement[], opts: ThumbOptions = {}): Promise<string> {
  const fullKey = `${key}@${opts.size ?? 256}`;
  const hit = cache.get(fullKey);
  if (hit) return Promise.resolve(hit);
  const running = pending.get(fullKey);
  if (running) return running;
  const job = queue
    .then(() => new Promise((r) => setTimeout(r, 0)))
    .then(() => {
      const url = renderNow(placements, opts);
      cache.set(fullKey, url);
      pending.delete(fullKey);
      return url;
    });
  queue = job.catch(() => undefined);
  pending.set(fullKey, job);
  return job;
}

export function cachedThumbnail(key: string, size = 256): string | undefined {
  return cache.get(`${key}@${size}`);
}
