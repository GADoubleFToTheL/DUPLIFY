import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ColorId } from '../../core/types';
import { cachedGeometry, capsuleGeometry, circleGeometry, smileGeometry, sphereGeometry, studGeometry } from '../geometry';
import { MAT, flat } from '../materials';
import { createPartModel } from '../partFactory';
import { DIZZY_TURNS, MAX_STACK, type NoppiAction } from './brain';

/**
 * Noppi in 3D: ein kleiner roter 2x2-Baustein mit Kulleraugen, Armen und Füßen.
 * Maße in Noppen (1 = 16 mm). Ursprung: Mitte zwischen den Füßen auf dem Boden, Gesicht zeigt nach +z.
 */
const BODY_W = 2;
const BODY_H = 1.9;
const BODY_D = 1.7;
const BODY_Y0 = 0.26;
/** Oberkante des Körpers: Hier rasten Steine auf Noppis Noppen ein. */
export const NOPPI_TOP = BODY_Y0 + BODY_H;
const CENTER_Y = BODY_Y0 + BODY_H / 2;
const FRONT_Z = BODY_D / 2;
const BRICK_H = 1.2;
const EYE_Y = CENTER_Y + 0.2;
const RED = '#ff4b3e';
const RED_DARK = '#c8352b';

type Eyes = 'open' | 'happy' | 'closed';
type Mouth = 'smile' | 'open' | 'oh' | 'flat';

export type NoppiEvent = { type: 'landed'; stack: number } | { type: 'toppled' } | { type: 'dizzy' } | { type: 'peek' };

const DUR: Record<NoppiAction, number> = {
  hop: 0.75,
  flip: 1.1,
  spin: 1.0,
  dance: 2.6,
  giggle: 1.5,
  wave: 1.8,
  peekaboo: 2.1,
  greet: 1.9,
  land: 0.35,
  wobble: 1.2,
  oops: 1.6,
  dizzy: 2.8,
  wake: 1.6,
  cheer: 1.3,
  sun: 1.6,
  flower: 1.1,
};

interface Running {
  action: NoppiAction;
  t0: number;
  dur: number;
  fired?: boolean;
}

interface Falling {
  obj: THREE.Object3D;
  y: number;
  vy: number;
  x0: number;
}

interface Debris {
  obj: THREE.Object3D;
  v: THREE.Vector3;
  w: THREE.Vector3;
  age: number;
  bounces: number;
}

interface Arm {
  pivot: THREE.Group;
  limb: THREE.Mesh;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
const bump = (p: number, a: number, b: number) => (p <= a || p >= b ? 0 : Math.sin((Math.PI * (p - a)) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function rounded(key: string, w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  return cachedGeometry(`noppi:${key}`, () => new RoundedBoxGeometry(w, h, d, 4, r));
}

let zTexture: THREE.Texture | null = null;
function zzzTexture(): THREE.Texture {
  if (!zTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      g.font = '700 104px "Fredoka Variable", "Fredoka", system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 14;
      g.strokeStyle = '#ffffff';
      g.strokeText('Z', 64, 70);
      g.fillStyle = '#4b5d7a';
      g.fillText('Z', 64, 70);
    }
    zTexture = new THREE.CanvasTexture(c);
    zTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return zTexture;
}

let shadowTex: THREE.Texture | null = null;
function shadowTexture(): THREE.Texture {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(20,50,30,0.38)');
      grad.addColorStop(1, 'rgba(20,50,30,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    shadowTex = new THREE.CanvasTexture(c);
  }
  return shadowTex;
}

export class NoppiRig {
  /** Steht auf dem Boden, dreht sich um die Hochachse. */
  readonly object = new THREE.Group();
  /** Unsichtbare Fläche zum Antippen. */
  readonly hit: THREE.Mesh;
  onEvent?: (e: NoppiEvent) => void;

  private readonly hopper = new THREE.Group();
  private readonly pivot = new THREE.Group();
  private readonly squash = new THREE.Group();
  private readonly eyes: THREE.Group[] = [];
  private readonly pupils: THREE.Group[] = [];
  private readonly happyEyes: THREE.Mesh[] = [];
  private readonly sleepEyes: THREE.Mesh[] = [];
  private readonly cheeks: THREE.Mesh[] = [];
  private readonly mouths: Record<Mouth, THREE.Object3D>;
  private readonly arms: Arm[] = [];
  private readonly zzz: THREE.Sprite[] = [];
  private readonly shadow: THREE.Mesh;

  private clock = 0;
  private running: Running | null = null;
  private queue: NoppiAction[] = [];
  private sleeping = false;
  private look: THREE.Vector3 | null = null;
  private turn = 0;
  private extraTurn = 0;
  private spinVel = 0;
  private dragging = false;
  private turned = 0;
  private blinkAt = 1.5;
  private blinkT = -10;
  private stack: THREE.Object3D[] = [];
  private falling: Falling[] = [];
  private debris: Debris[] = [];
  private toppleAt = -1;
  private readonly wander = new THREE.Vector3();

  constructor(
    private readonly world: THREE.Object3D,
    private readonly reduced = false,
  ) {
    const body = flat(RED, { roughness: 0.28, envMapIntensity: 0.9 });
    const dark = flat(RED_DARK, { roughness: 0.35 });
    const ink = MAT.pupil();
    this.object.add(this.hopper);
    this.hopper.add(this.pivot);
    this.pivot.position.y = CENTER_Y;
    this.pivot.add(this.squash);
    this.squash.position.y = -CENTER_Y;
    const s = this.squash;

    // Körper mit 2x2 Noppen
    const torso = new THREE.Mesh(rounded('body', BODY_W, BODY_H, BODY_D, 0.34), body);
    torso.position.y = CENTER_Y;
    s.add(torso);
    for (const x of [-0.5, 0.5]) {
      for (const z of [-0.42, 0.42]) {
        const stud = new THREE.Mesh(studGeometry(), body);
        stud.scale.setScalar(1.12);
        stud.position.set(x, NOPPI_TOP - 0.02, z);
        s.add(stud);
      }
    }
    // Füße
    for (const sx of [-1, 1]) {
      const foot = new THREE.Mesh(rounded('foot', 0.78, 0.36, 1.0, 0.16), dark);
      foot.position.set(sx * 0.5, 0.18, 0.06);
      s.add(foot);
    }
    // Arme (Drehpunkt an der Schulter)
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * (BODY_W / 2 + 0.02), CENTER_Y + 0.32, 0.05);
      const limb = new THREE.Mesh(capsuleGeometry(0.21, 0.5), body);
      limb.position.y = -0.4;
      pivot.add(limb);
      s.add(pivot);
      this.arms.push({ pivot, limb });
    }
    // Augen
    for (const sx of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(sx * 0.46, EYE_Y, FRONT_Z);
      const white = new THREE.Mesh(sphereGeometry(0.36, 28, 20), MAT.eyeWhite());
      white.scale.set(0.9, 1.08, 0.45);
      eye.add(white);
      const pupil = new THREE.Group();
      pupil.position.z = 0.12;
      const dot = new THREE.Mesh(sphereGeometry(0.17, 20, 14), ink);
      dot.scale.set(1, 1.05, 0.5);
      pupil.add(dot);
      const shine = new THREE.Mesh(sphereGeometry(0.055, 10, 8), MAT.eyeWhite());
      shine.position.set(0.065, 0.075, 0.07);
      pupil.add(shine);
      eye.add(pupil);
      s.add(eye);
      this.eyes.push(eye);
      this.pupils.push(pupil);
      const happy = new THREE.Mesh(smileGeometry(0.17, 0.05), ink);
      happy.rotation.z = Math.PI;
      happy.position.set(sx * 0.46, EYE_Y - 0.04, FRONT_Z + 0.08);
      happy.visible = false;
      s.add(happy);
      this.happyEyes.push(happy);
      const closed = new THREE.Mesh(smileGeometry(0.17, 0.045), ink);
      closed.position.set(sx * 0.46, EYE_Y - 0.02, FRONT_Z + 0.06);
      closed.visible = false;
      s.add(closed);
      this.sleepEyes.push(closed);
      const cheek = new THREE.Mesh(circleGeometry(0.17, 20), MAT.cheek());
      cheek.position.set(sx * 0.74, CENTER_Y - 0.24, FRONT_Z + 0.006);
      s.add(cheek);
      this.cheeks.push(cheek);
    }
    // Münder
    const mouthY = CENTER_Y - 0.33;
    const smile = new THREE.Mesh(smileGeometry(0.25, 0.055), ink);
    smile.position.set(0, mouthY + 0.12, FRONT_Z + 0.02);
    const open = new THREE.Group();
    const lips = new THREE.Mesh(
      cachedGeometry('noppi:mouth', () => new THREE.CircleGeometry(0.28, 28, Math.PI, Math.PI)),
      flat('#7a1a16', { roughness: 0.6 }),
    );
    open.add(lips);
    const tongue = new THREE.Mesh(circleGeometry(0.11, 18), flat('#ff8fa3', { roughness: 0.6 }));
    tongue.position.set(0, -0.16, 0.004);
    open.add(tongue);
    open.position.set(0, mouthY + 0.12, FRONT_Z + 0.008);
    const oh = new THREE.Mesh(circleGeometry(0.13, 22), flat('#7a1a16', { roughness: 0.6 }));
    oh.scale.set(0.85, 1.1, 1);
    oh.position.set(0, mouthY, FRONT_Z + 0.008);
    const line = new THREE.Mesh(capsuleGeometry(0.035, 0.2), ink);
    line.rotation.z = Math.PI / 2;
    line.position.set(0, mouthY + 0.02, FRONT_Z + 0.02);
    this.mouths = { smile, open, oh, flat: line };
    for (const m of Object.values(this.mouths)) s.add(m);
    // Zzz beim Schlafen
    for (let i = 0; i < 3; i++) {
      const z = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTexture(), transparent: true, depthWrite: false }));
      z.visible = false;
      this.object.add(z);
      this.zzz.push(z);
    }
    // Weicher Schatten auf der Platte
    this.shadow = new THREE.Mesh(
      cachedGeometry('noppi:shadow', () => new THREE.PlaneGeometry(3.2, 2.6).rotateX(-Math.PI / 2)),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
    );
    this.shadow.position.y = 0.3;
    this.object.add(this.shadow);
    // Trefferfläche
    this.hit = new THREE.Mesh(
      cachedGeometry('noppi:hit', () => new THREE.BoxGeometry(2.9, 3.0, 2.2)),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.hit.position.y = CENTER_Y + 0.1;
    this.hopper.add(this.hit);
  }

  // ---------- Steuerung ----------

  play(action: NoppiAction): void {
    if (this.sleeping && action !== 'wake') return;
    // Kurze Reaktionen unterbrechen nichts, sondern warten kurz.
    if (this.running && (action === 'land' || action === 'wobble') && this.running.action !== 'land') {
      if (action === 'wobble') this.queue.unshift(action);
      return;
    }
    this.queue = [];
    this.running = { action, t0: this.clock, dur: DUR[action] };
  }

  /** Spielt danach noch etwas ab (z. B. erst Hoppla, dann Kichern). */
  then(action: NoppiAction): void {
    this.queue.push(action);
  }

  get busy(): boolean {
    return this.running !== null && this.running.action !== 'land';
  }

  /** Sekunden seit Beginn der laufenden Bewegung (Infinity, wenn keine läuft). */
  get actionAge(): number {
    return this.running && this.running.action !== 'land' ? this.clock - this.running.t0 : Infinity;
  }

  setSleeping(on: boolean): void {
    if (on === this.sleeping) return;
    this.sleeping = on;
    if (on) {
      this.running = null;
      this.queue = [];
    } else this.play('wake');
  }

  /** Wohin Noppi schaut (Weltkoordinaten); null = umherschauen. */
  lookAt(target: THREE.Vector3 | null): void {
    this.look = target ? (this.look ?? new THREE.Vector3()).copy(target) : null;
  }

  isHit(raycaster: THREE.Raycaster): boolean {
    return raycaster.intersectObject(this.hit, false).length > 0;
  }

  beginDrag(): void {
    this.dragging = true;
    this.spinVel = 0;
  }

  /** Mit dem Finger drehen (Winkel in Bogenmaß, Zeitspanne in Sekunden). */
  dragBy(angle: number, dt: number): void {
    this.extraTurn += angle;
    this.turned += Math.abs(angle);
    const v = dt > 0 ? angle / dt : 0;
    this.spinVel = lerp(this.spinVel, v, 0.5);
  }

  endDrag(): void {
    this.dragging = false;
  }

  /** Anzahl Steine auf dem Kopf (inkl. fallender). */
  get stackCount(): number {
    return this.stack.length + this.falling.length;
  }

  /** Lässt einen Stein auf Noppis Kopf fallen. false, wenn gerade kein Platz ist. */
  dropBrick(color: ColorId): boolean {
    if (this.sleeping || this.stackCount >= MAX_STACK || this.toppleAt >= 0) return false;
    const obj = createPartModel('brick-2x2', color, undefined);
    const y = NOPPI_TOP + this.stackCount * BRICK_H + 8;
    obj.position.set(0, y, 0);
    this.squash.add(obj);
    this.falling.push({ obj, y, vy: -2, x0: (Math.random() - 0.5) * 1.2 });
    return true;
  }

  /** Lässt den Turm auf dem Kopf nach kurzem Wackeln umfallen. */
  scheduleTopple(delay: number): void {
    this.toppleAt = this.clock + delay;
    this.play('wobble');
  }

  // ---------- Animation ----------

  update(t: number, rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    this.clock = t;
    let y = 0;
    let tilt = 0;
    let flip = 0;
    let spin = 0;
    let sy: number;
    const armZ = [-0.16, 0.16];
    const armX = [0, 0];
    const reach = [1, 1];
    let eyes: Eyes = 'open';
    let mouth: Mouth = 'smile';
    let eyeScale = 1;
    let cheek = 1;
    let swirl = false;

    const idle = this.reduced ? 0.3 : 1;
    if (this.sleeping) {
      sy = 1 + Math.sin(t * 1.8) * 0.03;
      tilt = Math.sin(t * 0.9) * 0.03;
      armZ[0] = -0.06;
      armZ[1] = 0.06;
      eyes = 'closed';
      mouth = 'flat';
    } else {
      y = (0.5 - 0.5 * Math.cos(t * 2.6)) * 0.07 * idle;
      sy = 1 + Math.sin(t * 5.2) * 0.012 * idle;
      armZ[0] = -(0.16 + Math.sin(t * 2.6) * 0.07 * idle);
      armZ[1] = 0.16 + Math.sin(t * 2.6 + 1) * 0.07 * idle;
    }

    if (!this.running && this.queue.length && !this.sleeping) {
      this.running = { action: this.queue.shift()!, t0: t, dur: 0 };
      this.running.dur = DUR[this.running.action];
    }
    const r = this.running;
    if (r) {
      const p = Math.min(1, (t - r.t0) / r.dur);
      const raise = (side: 0 | 1, amount: number, k: number) => {
        armZ[side] = lerp(armZ[side], side === 0 ? -amount : amount, k);
      };
      switch (r.action) {
        case 'hop':
        case 'cheer':
        case 'flower': {
          const big = r.action === 'hop' ? 1.5 : r.action === 'cheer' ? 0.9 : 0.5;
          const hops = r.action === 'cheer' ? 2 : 1;
          const q = (p * hops) % 1;
          const air = seg(q, 0.18, 0.8);
          const inAir = q > 0.18 && q < 0.8;
          if (inAir) y += Math.sin(Math.PI * air) * big;
          sy *= 1 - 0.2 * bump(q, 0, 0.18) - 0.15 * bump(q, 0.8, 1) + 0.08 * bump(q, 0.18, 0.8);
          const up = r.action === 'flower' ? 0.6 : 2.3;
          raise(0, up, bump(p, 0.05, 0.95));
          raise(1, up, bump(p, 0.05, 0.95));
          if (r.action === 'cheer' || r.action === 'flower') {
            eyes = 'happy';
            mouth = 'open';
          } else mouth = inAir ? 'open' : 'smile';
          break;
        }
        case 'flip': {
          const air = seg(p, 0.2, 0.82);
          const inAir = p > 0.2 && p < 0.82;
          if (inAir) y += Math.sin(Math.PI * air) * 2.6;
          flip = -2 * Math.PI * smooth(air);
          sy *= 1 - 0.22 * bump(p, 0, 0.2) - 0.16 * bump(p, 0.82, 1);
          raise(0, 2.4, bump(p, 0.1, 0.9));
          raise(1, 2.4, bump(p, 0.1, 0.9));
          mouth = inAir ? 'open' : 'smile';
          break;
        }
        case 'spin': {
          spin = 2 * Math.PI * smooth(p);
          y += Math.sin(Math.PI * p) * 0.4;
          raise(0, 1.45, bump(p, 0, 1));
          raise(1, 1.45, bump(p, 0, 1));
          mouth = p > 0.1 && p < 0.9 ? 'open' : 'smile';
          break;
        }
        case 'dance': {
          const beat = p * 6;
          y += Math.abs(Math.sin(Math.PI * beat)) * 0.32;
          tilt = Math.sin(Math.PI * beat) * 0.16;
          spin = Math.sin(Math.PI * p * 3) * 0.35;
          const k = bump(p, 0, 1) > 0 ? Math.min(1, bump(p, 0, 1) * 3) : 0;
          armZ[1] = lerp(armZ[1], 1.3 + Math.sin(Math.PI * beat * 2) * 0.9, k);
          armZ[0] = lerp(armZ[0], -(1.3 + Math.cos(Math.PI * beat * 2) * 0.9), k);
          eyes = Math.floor(beat) % 2 ? 'happy' : 'open';
          mouth = 'open';
          break;
        }
        case 'giggle': {
          tilt = Math.sin(t * 38) * 0.07 * (1 - p * 0.6);
          sy *= 1 + Math.sin(t * 26) * 0.03;
          y += bump(p, 0, 1) * 0.12;
          raise(0, 0.9, bump(p, 0, 1));
          raise(1, 0.9, bump(p, 0, 1));
          eyes = 'happy';
          mouth = 'open';
          cheek = 1.35;
          break;
        }
        case 'wave':
        case 'sun':
        case 'greet': {
          let w = p;
          if (r.action === 'greet') {
            // Fällt vom Himmel auf die Platte, dann winken
            const fall = seg(p, 0, 0.32);
            if (p < 0.32) y += 9 * (1 - fall * fall);
            sy *= 1 - 0.24 * bump(p, 0.32, 0.46);
            w = seg(p, 0.42, 1);
          }
          const k = smooth(seg(w, 0, 0.15)) * (1 - smooth(seg(w, 0.85, 1)));
          armZ[1] = lerp(armZ[1], 2.5 + Math.sin(w * Math.PI * 8) * 0.45, k);
          tilt = Math.sin(w * Math.PI * 4) * 0.05 * k;
          mouth = r.action === 'greet' && w > 0 ? 'open' : 'smile';
          if (r.action === 'sun') eyes = 'happy';
          break;
        }
        case 'peekaboo': {
          const cover = smooth(seg(p, 0, 0.22)) * (1 - smooth(seg(p, 0.6, 0.7)));
          const reveal = bump(p, 0.6, 1);
          for (const side of [0, 1] as const) {
            const sx = side === 0 ? -1 : 1;
            armX[side] = -1.45 * cover;
            armZ[side] = lerp(armZ[side], -sx * 0.4, cover) + sx * 2.2 * reveal;
            reach[side] = 1 + 0.5 * cover;
          }
          if (cover > 0.6) eyes = 'closed';
          y += bump(p, 0.62, 0.86) * 0.5;
          if (p > 0.62) {
            mouth = 'open';
            eyeScale = 1 + 0.15 * reveal;
            if (!r.fired) {
              r.fired = true;
              this.onEvent?.({ type: 'peek' });
            }
          }
          break;
        }
        case 'land': {
          sy *= 1 - 0.13 * bump(p, 0, 1);
          eyeScale = 1 - 0.3 * bump(p, 0, 1);
          mouth = 'oh';
          break;
        }
        case 'wobble': {
          tilt = Math.sin(p * Math.PI * 5) * 0.2 * (1 - 0.4 * p);
          raise(0, 1.4, bump(p, 0, 1));
          raise(1, 1.4, bump(p, 0, 1));
          mouth = 'oh';
          eyeScale = 1.1;
          break;
        }
        case 'oops': {
          if (p < 0.4) {
            mouth = 'oh';
            eyeScale = 1.2;
            raise(0, 2.0, bump(p, 0, 0.4));
            raise(1, 2.0, bump(p, 0, 0.4));
          } else {
            eyes = 'happy';
            mouth = 'open';
            cheek = 1.3;
            tilt = Math.sin(t * 34) * 0.06 * (1 - p);
            y += Math.abs(Math.sin(seg(p, 0.4, 1) * Math.PI * 2)) * 0.25;
          }
          break;
        }
        case 'dizzy': {
          swirl = true;
          tilt = Math.sin(t * 5) * 0.12 * (1 - p * 0.5);
          spin = Math.sin(t * 2.5) * 0.25 * (1 - p);
          y += Math.abs(Math.sin(t * 5)) * 0.05;
          mouth = 'oh';
          raise(0, 0.8, bump(p, 0, 1));
          raise(1, 0.8, bump(p, 0, 1));
          break;
        }
        case 'wake': {
          sy *= 1 + 0.14 * bump(p, 0, 0.6);
          raise(0, 2.6, bump(p, 0, 0.65));
          raise(1, 2.6, bump(p, 0, 0.65));
          eyes = p < 0.35 ? 'closed' : 'open';
          mouth = p < 0.5 ? 'open' : 'smile';
          break;
        }
      }
      if (p >= 1) {
        this.running = null;
        const next = this.queue.shift();
        if (next) this.running = { action: next, t0: t, dur: DUR[next] };
      }
    }

    // Blickrichtung: Körper dreht sich ein bisschen, die Augen den Rest
    // Fallende Steine ziehen den Blick an
    const fall = this.falling[0];
    const target = this.sleeping
      ? null
      : fall
        ? this.wander.set(fall.obj.position.x, fall.y, 2.5)
        : (this.look ?? this.wander.set(Math.sin(t * 0.37) * 2.5, EYE_Y + Math.sin(t * 0.61) * 0.6, 7));
    let px = 0;
    let py = 0;
    if (target) {
      const dx = target.x;
      const dy = target.y - EYE_Y;
      const dz = Math.max(0.6, target.z - FRONT_Z);
      const yaw = Math.atan2(dx, dz);
      const want = clamp(yaw * 0.5, -0.5, 0.5);
      this.turn = lerp(this.turn, want, 1 - Math.exp(-dt * 6));
      px = clamp((yaw - this.turn) * 0.22, -0.12, 0.12);
      py = clamp(Math.atan2(dy, Math.hypot(dx, dz)) * 0.3, -0.1, 0.12);
    } else this.turn = lerp(this.turn, 0, 1 - Math.exp(-dt * 3));

    // Drehen mit dem Finger, Schwung, zurückfedern, schwindelig werden
    if (!this.dragging) {
      if (Math.abs(this.spinVel) > 0.8) {
        const d = this.spinVel * dt;
        this.extraTurn += d;
        this.turned += Math.abs(d);
        this.spinVel *= Math.exp(-dt * 2.2);
      } else {
        this.spinVel = 0;
        const home = Math.round(this.extraTurn / (2 * Math.PI)) * 2 * Math.PI;
        this.extraTurn = lerp(this.extraTurn, home, 1 - Math.exp(-dt * 5));
        if (this.turned > DIZZY_TURNS * 2 * Math.PI && !this.sleeping) {
          this.turned = 0;
          this.play('dizzy');
          this.onEvent?.({ type: 'dizzy' });
        } else if (Math.abs(home - this.extraTurn) < 0.02) this.turned = 0;
      }
    }

    // Blinzeln
    if (!this.sleeping && t > this.blinkAt) {
      this.blinkT = t;
      this.blinkAt = t + 2.2 + Math.random() * 3.5;
    }
    const b = (t - this.blinkT) / 0.16;
    const blink = b >= 0 && b < 1 ? Math.abs(1 - 2 * b) : 1;

    // Pose anwenden
    this.object.rotation.y = this.turn + this.extraTurn + spin;
    this.hopper.position.y = y;
    this.shadow.scale.setScalar(Math.max(0.35, 1 - y / 5));
    this.hopper.rotation.z = tilt;
    this.pivot.rotation.x = flip;
    const sx = 1 + (1 - sy) * 0.5;
    this.squash.scale.set(sx, sy, sx);
    for (const side of [0, 1] as const) {
      const a = this.arms[side];
      a.pivot.rotation.set(armX[side], 0, armZ[side]);
      a.limb.scale.y = reach[side];
      a.limb.position.y = -0.4 * reach[side];
    }
    for (let i = 0; i < 2; i++) {
      this.eyes[i].visible = eyes === 'open';
      this.eyes[i].scale.set(eyeScale, eyeScale * blink, eyeScale);
      this.happyEyes[i].visible = eyes === 'happy';
      this.sleepEyes[i].visible = eyes === 'closed';
      this.cheeks[i].scale.setScalar(cheek);
      if (swirl) {
        const a = t * 9 + i * Math.PI;
        this.pupils[i].position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.12);
      } else this.pupils[i].position.set(px, py, 0.12);
    }
    for (const [k, m] of Object.entries(this.mouths)) m.visible = k === mouth;
    for (let i = 0; i < this.zzz.length; i++) {
      const z = this.zzz[i];
      z.visible = this.sleeping;
      if (!this.sleeping) continue;
      const ph = (t * 0.45 + i / this.zzz.length) % 1;
      z.position.set(1.0 + ph * 0.7, NOPPI_TOP + 0.4 + ph * 1.6 + this.stackCount * BRICK_H, 0.3);
      z.scale.setScalar(0.35 + ph * 0.3);
      (z.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * ph);
    }

    this.updateBricks(t, dt);
  }

  private updateBricks(t: number, dt: number): void {
    // Fallende Steine landen nacheinander auf dem Kopf
    this.falling.sort((a, b) => a.y - b.y);
    for (let i = 0; i < this.falling.length; i++) {
      const f = this.falling[i];
      const targetY = NOPPI_TOP + (this.stack.length + i) * BRICK_H;
      f.vy -= 32 * dt;
      f.y = Math.max(targetY, f.y + f.vy * dt);
      const left = clamp((f.y - targetY) / 8, 0, 1);
      f.obj.position.set(f.x0 * left, f.y, 0);
      f.obj.rotation.y = f.x0 * left * 0.8;
      if (f.y <= targetY && i === 0) {
        this.falling.shift();
        i--;
        f.obj.rotation.set(0, 0, 0);
        this.stack.push(f.obj);
        if (this.running?.action !== 'wobble') this.play('land');
        this.onEvent?.({ type: 'landed', stack: this.stack.length });
      }
    }
    // Der Turm schwankt ein bisschen – je höher, desto mehr
    for (let i = 0; i < this.stack.length; i++) {
      const o = this.stack[i];
      const sway = Math.sin(t * 2.3 + i * 0.5) * 0.008 * (i + 1);
      o.position.set(sway * 4 * (i + 1) * 0.15, NOPPI_TOP + i * BRICK_H, 0);
      o.rotation.z = sway;
    }
    // Umfallen
    if (this.toppleAt >= 0 && t >= this.toppleAt) {
      this.toppleAt = -1;
      this.topple();
    }
    // Herumfliegende Steine
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.age += dt;
      d.v.y -= 25 * dt;
      d.obj.position.addScaledVector(d.v, dt);
      d.obj.rotation.x += d.w.x * dt;
      d.obj.rotation.y += d.w.y * dt;
      d.obj.rotation.z += d.w.z * dt;
      if (d.obj.position.y < 0 && d.v.y < 0 && d.bounces < 1) {
        d.obj.position.y = 0;
        d.v.y = -d.v.y * 0.35;
        d.v.x *= 0.6;
        d.v.z *= 0.6;
        d.w.multiplyScalar(0.5);
        d.bounces++;
      }
      if (d.age > 1.3) d.obj.scale.setScalar(Math.max(0, 1 - (d.age - 1.3) / 0.35));
      if (d.age > 1.65) {
        this.world.remove(d.obj);
        this.debris.splice(i, 1);
      }
    }
  }

  private topple(): void {
    if (this.stack.length === 0) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.object.updateMatrixWorld(true);
    this.stack.forEach((obj, i) => {
      this.world.attach(obj);
      const rnd = Math.random;
      this.debris.push({
        obj,
        v: new THREE.Vector3(side * (1.4 + i * 0.55 + rnd()), 2.4 + rnd() * 2.2, (rnd() - 0.4) * 2.2),
        w: new THREE.Vector3((rnd() - 0.5) * 4, (rnd() - 0.5) * 3, -side * (2 + rnd() * 3)),
        age: -i * 0.04,
        bounces: 0,
      });
    });
    this.stack = [];
    this.play('oops');
    this.onEvent?.({ type: 'toppled' });
  }

  dispose(): void {
    for (const d of this.debris) this.world.remove(d.obj);
    this.debris = [];
    for (const z of this.zzz) (z.material as THREE.Material).dispose();
    (this.hit.material as THREE.Material).dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
