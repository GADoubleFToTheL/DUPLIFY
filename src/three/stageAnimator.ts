import * as THREE from 'three';
import type { Placement } from '../core/types';
import { dampedWobble, easeInCubic, easeInQuad, easeOutBack, easeOutCubic, clamp01 } from './easing';
import { createPlacedPart, placementOrigin, placementRotation } from './partFactory';

export type StagePhase = 'preview' | 'build' | 'done';

export interface CameraGoal {
  key: string;
  target: THREE.Vector3;
  distance: number;
  azimuth: number;
  polar: number;
}

export interface StageCallbacks {
  /** Ein Teil ist gelandet (für Klick-Ton und Sternchen). */
  onLanded?: (step: number, index: number, top: THREE.Vector3) => void;
}

const DROP = 6;
const T_APPEAR = 0.38;
const T_HOVER = 0.3;
const T_FALL = 0.4;
const T_SQUASH = 0.55;
const T_TOTAL = T_APPEAR + T_HOVER + T_FALL + T_SQUASH;
const T_LAND = T_APPEAR + T_HOVER + T_FALL;
const T_LIFT = 0.45;
const T_SCATTER = 0.85;
const STAGGER = 0.16;

interface Drop {
  start: number;
  step: number;
  landed: boolean;
}

/**
 * Steuert die Bau-Animation: Einflug, Geisterstein, Landung mit Federn,
 * Zurück (Abheben), Vorschau-Drehteller, „Los!“-Explosion und Party.
 */
export class StageAnimator {
  readonly pivot = new THREE.Group();
  readonly callbacks: StageCallbacks = {};
  readonly bounds: THREE.Box3;
  readonly center: THREE.Vector3;
  private readonly objects: THREE.Group[];
  private readonly ghosts: THREE.Group[];
  private readonly home: { pos: THREE.Vector3; rotY: number }[];
  private readonly boxes: THREE.Box3[];
  private readonly ghostMats = new Set<THREE.MeshStandardMaterial>();
  private readonly scatterDir: THREE.Vector3[];
  private readonly stepOf: number[];
  private drops = new Map<number, Drop>();
  private lifts = new Map<number, number>();
  private scatterStart: number | null = null;
  private partyStart: number | null = null;
  private lastAzimuth = 0.55;
  phase: StagePhase = 'preview';
  step = -1;

  constructor(
    readonly placements: readonly Placement[],
    readonly steps: readonly (readonly number[])[],
  ) {
    this.objects = placements.map((p, i) => createPlacedPart(p, i));
    this.ghosts = placements.map((p, i) => createPlacedPart(p, i, { ghost: true }));
    this.home = placements.map((p) => ({ pos: placementOrigin(p), rotY: placementRotation(p) }));
    this.stepOf = new Array(placements.length).fill(0);
    steps.forEach((s, k) => s.forEach((i) => (this.stepOf[i] = k)));
    for (const o of this.objects) this.pivot.add(o);
    for (const g of this.ghosts) {
      g.visible = false;
      g.traverse((c) => {
        const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && m.transparent) this.ghostMats.add(m);
      });
      this.pivot.add(g);
    }
    this.pivot.updateMatrixWorld(true);
    this.boxes = this.objects.map((o) => new THREE.Box3().setFromObject(o));
    this.bounds = new THREE.Box3();
    for (const b of this.boxes) this.bounds.union(b);
    if (this.boxes.length === 0) this.bounds.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
    this.center = this.bounds.getCenter(new THREE.Vector3());
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    this.scatterDir = this.home.map(({ pos }) => {
      const d = new THREE.Vector3(pos.x - this.center.x, 0, pos.z - this.center.z);
      if (d.lengthSq() < 0.01) d.set(rnd() - 0.5, 0, rnd() - 0.5);
      d.normalize().multiplyScalar(3 + rnd() * 4);
      d.y = 2 + rnd() * 4;
      return d;
    });
    this.applyStatic();
  }

  get stepCount(): number {
    return this.steps.length;
  }

  /** Wechselt Phase/Schritt. `now` = Uhrzeit der Szene in Sekunden. */
  goTo(phase: StagePhase, step: number, now: number): void {
    const prevPhase = this.phase;
    const prevStep = this.step;
    this.finishRunning();
    this.phase = phase;
    this.step = step;
    this.partyStart = null;
    if (phase === 'preview') {
      this.scatterStart = null;
      this.applyStatic();
      return;
    }
    if (phase === 'done') {
      this.scatterStart = null;
      this.pivot.rotation.y = 0;
      this.applyStatic();
      this.partyStart = now;
      return;
    }
    // Bauen
    let delay = 0;
    if (prevPhase === 'preview') {
      this.scatterStart = now;
      delay = T_SCATTER;
    } else {
      this.scatterStart = null;
      this.pivot.rotation.y = 0;
    }
    if (prevPhase === 'build' && step === prevStep - 1) {
      // Zurück: Teile des späteren Schritts heben ab, aktueller Schritt fällt nochmal.
      for (const i of this.steps[prevStep] ?? []) this.lifts.set(i, now);
      delay = 0.25;
    }
    this.applyBuildVisibility();
    (this.steps[step] ?? []).forEach((i, k) => {
      this.drops.set(i, { start: now + delay + k * STAGGER, step, landed: false });
      this.objects[i].visible = false;
    });
  }

  private finishRunning(): void {
    for (const [i] of this.drops) this.setHome(i);
    for (const [i] of this.lifts) this.objects[i].visible = false;
    this.drops.clear();
    this.lifts.clear();
    for (const g of this.ghosts) g.visible = false;
  }

  private setHome(i: number): void {
    const o = this.objects[i];
    const h = this.home[i];
    o.position.copy(h.pos);
    o.rotation.set(0, h.rotY, 0);
    o.scale.set(1, 1, 1);
    o.visible = true;
  }

  private applyStatic(): void {
    for (let i = 0; i < this.objects.length; i++) this.setHome(i);
  }

  private applyBuildVisibility(): void {
    for (let i = 0; i < this.objects.length; i++) {
      if (this.lifts.has(i)) continue;
      if (this.scatterStart !== null) continue;
      if (this.stepOf[i] < this.step) this.setHome(i);
      else this.objects[i].visible = false;
    }
  }

  update(t: number, dt: number): void {
    // Vorschau: Drehteller
    if (this.phase === 'preview') this.pivot.rotation.y += dt * 0.55;

    // „Los!“: alle Teile fliegen weg
    if (this.scatterStart !== null) {
      const p = (t - this.scatterStart) / T_SCATTER;
      if (p >= 1) {
        this.scatterStart = null;
        this.pivot.rotation.y = 0;
        this.applyBuildVisibility();
      } else {
        for (let i = 0; i < this.objects.length; i++) {
          if (this.drops.has(i) && t >= this.drops.get(i)!.start) continue;
          const o = this.objects[i];
          const h = this.home[i];
          const d = this.scatterDir[i];
          const e = easeOutCubic(p);
          o.visible = true;
          o.position.set(h.pos.x + d.x * e, h.pos.y + d.y * Math.sin(p * Math.PI * 0.8), h.pos.z + d.z * e);
          o.rotation.set(p * 3 * (i % 2 ? 1 : -1), h.rotY + p * 4, 0);
          const s = Math.max(0.001, 1 - easeInCubic(p));
          o.scale.set(s, s, s);
        }
      }
    }

    // Abheben
    for (const [i, start] of this.lifts) {
      const p = (t - start) / T_LIFT;
      const o = this.objects[i];
      const h = this.home[i];
      if (p >= 1) {
        o.visible = false;
        this.lifts.delete(i);
        continue;
      }
      o.visible = true;
      o.position.set(h.pos.x, h.pos.y + easeInCubic(p) * DROP, h.pos.z);
      const s = Math.max(0.001, 1 - easeInQuad(p));
      o.scale.set(s, s, s);
    }

    // Einflug + Landung
    const pulse = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(t * 6.5));
    for (const m of this.ghostMats) m.opacity = pulse;
    for (const [i, d] of this.drops) {
      const tau = t - d.start;
      const o = this.objects[i];
      const g = this.ghosts[i];
      const h = this.home[i];
      if (tau < 0) {
        o.visible = false;
        g.visible = false;
        continue;
      }
      g.visible = tau < T_LAND;
      g.position.copy(h.pos);
      g.rotation.set(0, h.rotY, 0);
      o.visible = true;
      if (tau < T_APPEAR) {
        const p = tau / T_APPEAR;
        const s = Math.max(0.001, easeOutBack(p));
        o.scale.set(s, s, s);
        o.position.set(h.pos.x, h.pos.y + DROP + (1 - p) * 1.2, h.pos.z);
        o.rotation.set(0, h.rotY + (1 - easeOutCubic(p)) * Math.PI * 0.75, 0);
      } else if (tau < T_APPEAR + T_HOVER) {
        const p = (tau - T_APPEAR) / T_HOVER;
        o.scale.set(1, 1, 1);
        o.rotation.set(0, h.rotY, Math.sin(p * Math.PI * 2) * 0.06);
        o.position.set(h.pos.x, h.pos.y + DROP + Math.sin(p * Math.PI) * 0.3, h.pos.z);
      } else if (tau < T_LAND) {
        const p = (tau - T_APPEAR - T_HOVER) / T_FALL;
        o.rotation.set(0, h.rotY, 0);
        o.position.set(h.pos.x, h.pos.y + DROP * (1 - easeInQuad(p)), h.pos.z);
        o.scale.set(1, 1 + 0.08 * p, 1);
      } else if (tau < T_TOTAL) {
        if (!d.landed) {
          d.landed = true;
          const top = new THREE.Vector3();
          this.boxes[i].getCenter(top);
          top.y = this.boxes[i].max.y;
          this.callbacks.onLanded?.(d.step, i, top);
        }
        const q = (tau - T_LAND) / T_SQUASH;
        const w = dampedWobble(q);
        o.position.copy(h.pos);
        o.rotation.set(0, h.rotY, 0);
        o.scale.set(1 + 0.09 * w, 1 - 0.17 * w, 1 + 0.09 * w);
      } else {
        if (!d.landed) {
          d.landed = true;
          this.callbacks.onLanded?.(d.step, i, h.pos.clone());
        }
        this.setHome(i);
        g.visible = false;
        this.drops.delete(i);
      }
    }

    // Party
    if (this.partyStart !== null) {
      const tau = t - this.partyStart;
      const jump = tau < 1.6 ? Math.abs(Math.sin(tau * 7)) * 0.7 * (1 - tau / 1.6) : 0;
      this.pivot.position.y = jump;
      const spin = clamp01((tau - 0.5) / 1.8);
      this.pivot.rotation.y = (spin < 1 ? easeInOutSpin(spin) : 1) * Math.PI * 2;
      if (tau > 2.4) this.pivot.rotation.y = 0;
    } else {
      this.pivot.position.y = 0;
    }
  }

  /** Wohin die Kamera schauen soll. */
  cameraGoal(fov: number): CameraGoal {
    const size = this.bounds.getSize(new THREE.Vector3());
    const c = this.center;
    const radiusXZ = Math.max(size.x, size.z) / 2 + 1;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const sphere = this.bounds.getBoundingSphere(new THREE.Sphere());
    const fitAll = Math.max(8, (sphere.radius + 0.6) / Math.sin(THREE.MathUtils.degToRad(fov / 2)));
    if (this.phase !== 'build') {
      return {
        key: `${this.phase}`,
        target: new THREE.Vector3(c.x, size.y * 0.45, c.z),
        distance: fitAll,
        azimuth: 0.55,
        polar: 1.12,
      };
    }
    const idx = this.steps[this.step] ?? [];
    const focus = new THREE.Vector3();
    let top = 0;
    for (const i of idx) {
      focus.add(this.boxes[i].getCenter(new THREE.Vector3()));
      top = Math.max(top, this.boxes[i].max.y);
    }
    if (idx.length) focus.divideScalar(idx.length);
    const tall = size.y > 7;
    const targetY = tall ? Math.max(1.5, top - 1.6) : Math.max(1, size.y * 0.4);
    const target = new THREE.Vector3(c.x, targetY, c.z);
    const distance = Math.min(fitAll, Math.max(10, (radiusXZ * 1.45) / tanHalf));
    const polar = 1.08;
    const azimuth = this.pickAzimuth(target, distance, polar, focus);
    return { key: `build:${this.step}`, target, distance, azimuth, polar };
  }

  /** Wählt einen Blickwinkel, aus dem das neue Teil nicht verdeckt ist. */
  private pickAzimuth(target: THREE.Vector3, distance: number, polar: number, focus: THREE.Vector3): number {
    const placed = this.boxes.filter((_, i) => this.stepOf[i] < this.step);
    const blocked = (az: number) => {
      const camPos = new THREE.Vector3(
        target.x + distance * Math.sin(polar) * Math.sin(az),
        target.y + distance * Math.cos(polar),
        target.z + distance * Math.sin(polar) * Math.cos(az),
      );
      const dir = focus.clone().sub(camPos);
      const len = dir.length();
      const ray = new THREE.Ray(camPos, dir.normalize());
      const hit = new THREE.Vector3();
      return placed.some((b) => {
        if (b.containsPoint(focus)) return false;
        const p = ray.intersectBox(b, hit);
        return p !== null && camPos.distanceTo(hit) < len - 0.4;
      });
    };
    const base = this.lastAzimuth;
    const candidates = [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.2, -2.2, Math.PI].map((d) => base + d);
    const pick = candidates.find((az) => !blocked(az)) ?? base;
    this.lastAzimuth = pick;
    return pick;
  }

  /** Alle Kinder (für Animationen wie Blinzeln). */
  get root(): THREE.Group {
    return this.pivot;
  }
}

function easeInOutSpin(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
