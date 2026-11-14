import * as THREE from 'three';
import type { Placement } from '../core/types';
import { roomEnvironment } from './environment';
import { preloadModels } from './ldrawGeometry';
import { MAT } from './materials';
import { createCreationGroup, modelFilesFor } from './partFactory';

/**
 * Vorschaubilder über EINEN geteilten Offscreen-Renderer.
 * So entstehen auf dem iPad nicht zu viele WebGL-Kontexte.
 */
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
const cache = new Map<string, string>();

interface Job {
  fullKey: string;
  placements: readonly Placement[];
  opts: ThumbOptions;
  promise: Promise<string>;
  resolve: (url: string) => void;
  reject: (e: unknown) => void;
  /** Wie viele Anfragen noch auf das Bild warten (0 → überspringen). */
  waiters: number;
  started: boolean;
}

const jobs = new Map<string, Job>();
/** Wartende Aufträge: der zuletzt angefragte kommt zuerst dran (beim schnellen Scrollen zählt, was gerade sichtbar ist). */
const stack: Job[] = [];
let pumping = false;

/** Ein Vorschaubild wurde nicht mehr gebraucht und deshalb nicht gerendert. */
export class ThumbnailCancelled extends Error {
  constructor() {
    super('Vorschaubild nicht mehr gebraucht');
  }
}

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

/**
 * Rendert (einmalig, danach aus dem Zwischenspeicher) ein Vorschaubild als Data-URL.
 * Mit `signal` lässt sich die Anfrage zurückziehen; wartet niemand mehr, wird das Bild übersprungen.
 */
export function renderThumbnail(key: string, placements: readonly Placement[], opts: ThumbOptions = {}, signal?: AbortSignal): Promise<string> {
  const fullKey = `${key}@${opts.size ?? 256}`;
  const hit = cache.get(fullKey);
  if (hit) return Promise.resolve(hit);
  let job = jobs.get(fullKey);
  if (!job) {
    let resolve!: (url: string) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<string>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    job = { fullKey, placements, opts, promise, resolve, reject, waiters: 0, started: false };
    jobs.set(fullKey, job);
  }
  if (!job.started) {
    // Nach oben auf den Stapel: zuletzt angefragt = zuerst gerendert.
    const i = stack.indexOf(job);
    if (i >= 0) stack.splice(i, 1);
    stack.push(job);
  }
  job.waiters++;
  if (signal) {
    const j = job;
    signal.addEventListener('abort', () => j.waiters--, { once: true });
  }
  void pump();
  return job.promise;
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (stack.length) {
      const job = stack.pop()!;
      if (job.waiters <= 0) {
        jobs.delete(job.fullKey);
        job.reject(new ThumbnailCancelled());
        continue;
      }
      job.started = true;
      try {
        await preloadModels(modelFilesFor(job.placements));
        await new Promise((r) => setTimeout(r, 0));
        const url = renderNow(job.placements, job.opts);
        cache.set(job.fullKey, url);
        job.resolve(url);
      } catch (e) {
        job.reject(e);
      } finally {
        jobs.delete(job.fullKey);
      }
    }
  } finally {
    pumping = false;
  }
}

export function cachedThumbnail(key: string, size = 256): string | undefined {
  return cache.get(`${key}@${size}`);
}
