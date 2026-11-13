import * as THREE from 'three';
import { getPart, type PartDef } from '../core/parts/catalog';
import { footprintSize } from '../core/grid';
import { hashNumbers } from '../core/rng';
import type { ColorId, Placement } from '../core/types';
import { HALF } from '../core/units';
import {
  FRAME_OPENING,
  VEHICLE,
  archGeometry,
  boxGeometry,
  brickGeometry,
  capsuleGeometry,
  circleGeometry,
  coneGeometry,
  curvedGeometry,
  cylinderGeometry,
  frameGeometry,
  heartGeometry,
  heightOf,
  hubGeometry,
  seesawBaseGeometry,
  seesawPlankGeometry,
  slopeGeometry,
  smileGeometry,
  sphereGeometry,
  starGeometry,
  vehicleGeometry,
  wheelGeometry,
} from './geometry';
import { MAT, flat, ghost, photoMaterial, plastic, plasticLight } from './materials';

export type AnimKind = 'blink' | 'sway' | 'wave' | 'wag' | 'wheel' | 'bob';

export interface PartObjectOptions {
  /** Durchsichtiger Zielplatz-Stein. */
  ghost?: boolean;
  /** Für zufällige Details (Haarfarbe, Tierart …). */
  seed?: number;
}

const SHIRTS: ColorId[] = ['rot', 'blau', 'gelb', 'gruen', 'orange', 'lila', 'hellblau', 'pink'];
const PANTS = ['#3256a8', '#5c6370', '#6b4a2b', '#2b2f36'];
const HAIR = ['#5a3416', '#f2c14e', '#1f1a17', '#c4572a', '#8a5a2b'];

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function tag(obj: THREE.Object3D, anim: AnimKind, phase: number): THREE.Object3D {
  obj.userData.anim = anim;
  obj.userData.phase = phase;
  return obj;
}

/** Ein Augenpaar auf einer Fläche (zeigt nach +z, Ursprung = Flächenmitte). */
function eyes(spacing: number, r: number, phase: number): THREE.Group {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * spacing, 0, 0);
    eye.add(mesh(circleGeometry(r), MAT.eyeWhite()));
    const pupil = mesh(circleGeometry(r * 0.5), MAT.pupil());
    pupil.position.set(-sx * r * 0.12, -r * 0.12, 0.004);
    eye.add(pupil);
    const shine = mesh(circleGeometry(r * 0.16, 12), MAT.eyeWhite());
    shine.position.set(-sx * r * 0.12 + r * 0.16, r * 0.08, 0.008);
    eye.add(shine);
    g.add(eye);
  }
  tag(g, 'blink', phase);
  return g;
}

function addEyesBothSides(group: THREE.Group, def: PartDef, y: number, spacing: number, r: number, phase: number) {
  const front = eyes(spacing, r, phase);
  front.position.set(0, y, def.l / 2 + 0.002);
  group.add(front);
  const back = eyes(spacing, r, phase + 1.3);
  back.position.set(0, y, -def.l / 2 - 0.002);
  back.rotation.y = Math.PI;
  group.add(back);
}

function addPicture(group: THREE.Group, def: PartDef, color: ColorId | null, seed: number) {
  const H = heightOf(def);
  const which = seed % 3;
  const icon = which === 0 ? starGeometry(0.3) : which === 1 ? heartGeometry(0.28) : circleGeometry(0.26);
  const iconMat = which === 1 ? flat('#ff4d6d') : which === 0 ? flat('#ffc61a', { roughness: 0.3 }) : flat('#ff8a1f');
  const card = color === 'weiss' ? flat('#ffe9a8') : MAT.white();
  for (const side of [1, -1]) {
    const sticker = new THREE.Group();
    sticker.position.set(0, H / 2, side * (def.l / 2 + 0.003));
    if (side < 0) sticker.rotation.y = Math.PI;
    sticker.add(mesh(boxGeometry(Math.min(1.5, def.w - 0.4), H * 0.72, 0.004, 0.0015), card));
    const m = mesh(icon, iconMat);
    m.position.z = 0.006;
    sticker.add(m);
    group.add(sticker);
  }
}

function buildBody(def: PartDef, color: ColorId | null, opts: PartObjectOptions, seed: number): THREE.Group {
  const g = new THREE.Group();
  const ghostMode = !!opts.ghost;
  const mat = ghostMode ? ghost(color) : plastic(color);
  const H = heightOf(def);
  const phase = (seed % 1000) / 97;

  switch (def.kind) {
    case 'brick':
      g.add(mesh(brickGeometry(def), mat));
      break;
    case 'slope':
      g.add(mesh(slopeGeometry(def), mat));
      break;
    case 'curved':
      g.add(mesh(curvedGeometry(def), mat));
      break;
    case 'arch':
      g.add(mesh(archGeometry(def), mat));
      break;
    case 'frame': {
      g.add(mesh(frameGeometry(def), mat));
      if (ghostMode) break;
      const { halfW, bottom, topGap } = FRAME_OPENING;
      const openH = H - topGap - bottom;
      if (def.id === 'door') {
        const panel = mesh(boxGeometry(halfW * 2 - 0.08, openH - 0.06, 0.16, 0.04), plasticLight(color, 0.35));
        panel.position.set(0, bottom + openH / 2, 0.12);
        g.add(panel);
        const port = mesh(circleGeometry(0.34), MAT.glass());
        port.position.set(0, bottom + openH * 0.72, 0.21);
        g.add(port);
        const knob = mesh(sphereGeometry(0.11), MAT.gold());
        knob.position.set(halfW - 0.36, bottom + openH * 0.42, 0.24);
        g.add(knob);
      } else {
        const glass = mesh(boxGeometry(halfW * 2 - 0.04, openH - 0.04, 0.04, 0.01), MAT.glass());
        glass.position.set(0, bottom + openH / 2, 0);
        g.add(glass);
        const barMat = plasticLight(color, 0.5);
        const vbar = mesh(boxGeometry(0.12, openH, 0.14, 0.03), barMat);
        vbar.position.set(0, bottom + openH / 2, 0.02);
        g.add(vbar);
        const hbar = mesh(boxGeometry(halfW * 2, 0.12, 0.14, 0.03), barMat);
        hbar.position.set(0, bottom + openH / 2, 0.02);
        g.add(hbar);
      }
      break;
    }
    case 'vehicle': {
      g.add(mesh(vehicleGeometry(def), mat));
      if (ghostMode) break;
      const v = def.id.startsWith('car') ? VEHICLE.car : VEHICLE.wagon;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const wheel = new THREE.Group();
          wheel.position.set(sx * (def.w / 2 - v.inset), v.wheelR, sz * (def.l / 2 - 0.1));
          wheel.add(mesh(wheelGeometry(v.wheelR, v.wheelW), MAT.tire()));
          wheel.add(mesh(hubGeometry(v.wheelR, v.wheelW), MAT.hub()));
          tag(wheel, 'wheel', phase);
          g.add(wheel);
        }
      }
      if (!def.id.startsWith('car')) {
        for (const sx of [-1, 1]) {
          const hook = mesh(cylinderGeometry(0.1, 0.1, 0.35, 10), MAT.black());
          hook.rotation.z = Math.PI / 2;
          hook.position.set(sx * (def.w / 2 + 0.1), v.baseBottom + 0.15, 0);
          g.add(hook);
        }
      }
      break;
    }
    case 'deco':
      if (def.id === 'flower') buildFlower(g, color, ghostMode, phase);
      else if (def.id === 'figure') buildFigure(g, ghostMode, seed, phase);
      else if (def.id === 'animal') buildAnimal(g, ghostMode, seed, phase);
      else if (def.id === 'seesaw') {
        g.add(mesh(seesawBaseGeometry(def), ghostMode ? mat : plasticLight(color, 0.15)));
        g.add(mesh(seesawPlankGeometry(def), mat));
      } else buildCustom(g, def, ghostMode, seed);
      break;
  }
  return g;
}

function buildFlower(g: THREE.Group, color: ColorId | null, ghostMode: boolean, phase: number) {
  const base = mesh(boxGeometry(1.9, 0.2, 1.9, 0.08), ghostMode ? ghost('gruen') : MAT.leaf());
  base.position.y = 0.38;
  g.add(base);
  const stem = new THREE.Group();
  stem.position.y = 0.42;
  tag(stem, 'sway', phase);
  g.add(stem);
  const stalk = mesh(cylinderGeometry(0.07, 0.08, 0.8, 10), ghostMode ? ghost('gruen') : MAT.stem());
  stalk.position.y = 0.4;
  stem.add(stalk);
  if (!ghostMode) {
    for (const sx of [-1, 1]) {
      const leaf = mesh(sphereGeometry(0.22, 12, 8), MAT.leaf());
      leaf.scale.set(1.4, 0.4, 0.8);
      leaf.position.set(sx * 0.22, 0.35, 0);
      leaf.rotation.z = sx * 0.5;
      stem.add(leaf);
    }
  }
  const head = new THREE.Group();
  head.position.y = 0.98;
  stem.add(head);
  const petalMat = ghostMode ? ghost(color) : plastic(color);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = mesh(sphereGeometry(0.23, 14, 10), petalMat);
    petal.scale.set(1, 1, 0.42);
    petal.position.set(Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0);
    head.add(petal);
  }
  const center = mesh(sphereGeometry(0.17, 14, 10), ghostMode ? petalMat : color === 'gelb' ? plastic('orange') : MAT.gold());
  center.scale.set(1, 1, 0.6);
  center.position.z = 0.06;
  head.add(center);
}

function buildFigure(g: THREE.Group, ghostMode: boolean, seed: number, phase: number) {
  const shirt = ghostMode ? ghost('blau') : plastic(SHIRTS[seed % SHIRTS.length]);
  const pants = ghostMode ? ghost('blau') : flat(PANTS[(seed >>> 3) % PANTS.length]);
  const skin = ghostMode ? ghost('beige') : MAT.skin();
  for (const sx of [-1, 1]) {
    const leg = mesh(boxGeometry(0.42, 0.95, 0.5, 0.12), pants);
    leg.position.set(sx * 0.25, 0.475, 0);
    g.add(leg);
  }
  const torso = mesh(boxGeometry(1.1, 1.0, 0.62, 0.22), shirt);
  torso.position.y = 1.45;
  g.add(torso);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.66, 1.82, 0);
    const sleeve = mesh(capsuleGeometry(0.13, 0.5), shirt);
    sleeve.position.y = -0.33;
    arm.add(sleeve);
    const hand = mesh(sphereGeometry(0.14, 12, 8), skin);
    hand.position.y = -0.72;
    arm.add(hand);
    arm.rotation.z = sx * 0.12;
    if (sx > 0) tag(arm, 'wave', phase);
    g.add(arm);
  }
  const head = new THREE.Group();
  head.position.y = 2.42;
  g.add(head);
  head.add(mesh(sphereGeometry(0.48, 24, 16), skin));
  if (!ghostMode) {
    const hair = mesh(sphereGeometry(0.51, 24, 12), flat(HAIR[(seed >>> 5) % HAIR.length], { roughness: 0.7 }));
    hair.scale.set(1, 0.62, 1);
    hair.position.set(0, 0.16, -0.04);
    head.add(hair);
    for (const sx of [-1, 1]) {
      const e = mesh(sphereGeometry(0.065, 10, 8), MAT.pupil());
      e.position.set(sx * 0.17, 0.02, 0.44);
      head.add(e);
      const cheek = mesh(circleGeometry(0.08, 12), MAT.cheek());
      cheek.position.set(sx * 0.29, -0.1, 0.405);
      cheek.rotation.y = sx * 0.55;
      head.add(cheek);
    }
    const smile = mesh(smileGeometry(0.15, 0.028), MAT.pupil());
    smile.position.set(0, -0.08, 0.445);
    head.add(smile);
  }
}

const ANIMALS = [
  { body: '#a0673a', ears: 'floppy' },
  { body: '#f0a23a', ears: 'pointy' },
  { body: '#f4f1ea', ears: 'long' },
  { body: '#8c8c8c', ears: 'pointy' },
] as const;

function buildAnimal(g: THREE.Group, ghostMode: boolean, seed: number, phase: number) {
  const kind = ANIMALS[seed % ANIMALS.length];
  const fur = ghostMode ? ghost('braun') : flat(kind.body, { roughness: 0.55 });
  const body = mesh(capsuleGeometry(0.46, 1.05), fur);
  body.rotation.z = Math.PI / 2;
  body.position.set(-0.15, 1.05, 0);
  g.add(body);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = mesh(cylinderGeometry(0.14, 0.13, 0.7, 10), fur);
      leg.position.set(-0.15 + sx * 0.55, 0.35, sz * 0.28);
      g.add(leg);
    }
  }
  const head = new THREE.Group();
  head.position.set(0.95, 1.62, 0);
  g.add(head);
  head.add(mesh(sphereGeometry(0.44, 20, 14), fur));
  const snout = mesh(sphereGeometry(0.22, 14, 10), fur);
  snout.scale.set(1.1, 0.8, 1);
  snout.position.set(0.36, -0.1, 0);
  head.add(snout);
  if (!ghostMode) {
    const nose = mesh(sphereGeometry(0.07, 10, 8), MAT.pupil());
    nose.position.set(0.58, -0.04, 0);
    head.add(nose);
    for (const sz of [-1, 1]) {
      const e = mesh(sphereGeometry(0.06, 10, 8), MAT.pupil());
      e.position.set(0.3, 0.13, sz * 0.24);
      head.add(e);
      let ear: THREE.Mesh;
      if (kind.ears === 'floppy') {
        ear = mesh(sphereGeometry(0.18, 12, 8), flat('#6b4022'));
        ear.scale.set(0.6, 1.4, 0.4);
        ear.position.set(-0.05, 0.05, sz * 0.42);
      } else if (kind.ears === 'pointy') {
        ear = mesh(coneGeometry(0.15, 0.32), fur);
        ear.position.set(-0.05, 0.42, sz * 0.24);
      } else {
        ear = mesh(capsuleGeometry(0.1, 0.5), fur);
        ear.position.set(-0.1, 0.62, sz * 0.15);
        ear.rotation.x = sz * 0.15;
      }
      head.add(ear);
    }
  }
  const tail = new THREE.Group();
  tail.position.set(-0.85, 1.2, 0);
  const t = mesh(capsuleGeometry(0.08, 0.38), fur);
  t.position.set(-0.12, 0.18, 0);
  t.rotation.z = 0.8;
  tail.add(t);
  tag(tail, 'wag', phase);
  g.add(tail);
}

function buildCustom(g: THREE.Group, def: PartDef, ghostMode: boolean, seed: number) {
  const H = heightOf(def);
  const pastel = ['#ffd6e8', '#d6f0ff', '#e6ffd6', '#fff1c2', '#eadcff'][seed % 5];
  const mat = ghostMode ? ghost('weiss') : flat(pastel, { roughness: 0.5 });
  const box = mesh(boxGeometry(def.w - 0.06, H - 0.04, def.l - 0.06, 0.1), mat);
  box.position.y = H / 2;
  g.add(box);
  if (ghostMode) return;
  if (def.photo) {
    const size = Math.min(def.w - 0.3, H - 0.3);
    const plane = mesh(new THREE.PlaneGeometry(size, size), photoMaterial(def.photo));
    plane.position.set(0, H / 2, def.l / 2 - 0.02);
    g.add(plane);
  } else {
    const ribbon = flat('#ff5b8a', { roughness: 0.4 });
    const a = mesh(boxGeometry(0.22, H + 0.02, def.l + 0.02, 0.03), ribbon);
    a.position.y = H / 2;
    g.add(a);
    const b = mesh(boxGeometry(def.w + 0.02, H + 0.02, 0.22, 0.03), ribbon);
    b.position.y = H / 2;
    g.add(b);
  }
}

/** Baut das 3D-Objekt eines Teils (lokal: Mitte unten, unrotiert). */
export function createPartModel(
  partId: string,
  color: ColorId | null,
  print: Placement['print'],
  opts: PartObjectOptions = {},
): THREE.Group {
  const def = getPart(partId);
  const seed = opts.seed ?? 0;
  const g = buildBody(def, color, opts, seed);
  if (!opts.ghost) {
    if (print === 'eyes') {
      if (def.kind === 'curved') addEyesBothSides(g, def, heightOf(def) * 0.45, 0.62, 0.28, seed / 7);
      else addEyesBothSides(g, def, heightOf(def) * 0.52, Math.min(0.95, def.w * 0.24), 0.33, seed / 7);
    } else if (print === 'picture') {
      addPicture(g, def, color, seed);
    }
  }
  g.userData.partId = partId;
  return g;
}

/** Weltposition der Teil-Mitte (unten) für eine Platzierung. */
export function placementOrigin(p: Placement): THREE.Vector3 {
  const def = getPart(p.part);
  const { w, l } = footprintSize(def, p.rot);
  return new THREE.Vector3(p.x + w / 2, p.y * HALF, p.z + l / 2);
}

export function placementRotation(p: Placement): number {
  return (-p.rot * Math.PI) / 2;
}

/** Fertig positioniertes Teil für eine Platzierung. */
export function createPlacedPart(p: Placement, index = 0, opts: PartObjectOptions = {}): THREE.Group {
  const seed = opts.seed ?? hashNumbers(index, p.x * 31 + p.z, p.y);
  const model = createPartModel(p.part, p.color, p.print, { ...opts, seed });
  const holder = new THREE.Group();
  holder.add(model);
  holder.position.copy(placementOrigin(p));
  holder.rotation.y = placementRotation(p);
  holder.userData.index = index;
  return holder;
}

/** Ganzes Bauwerk als Gruppe. */
export function createCreationGroup(placements: readonly Placement[]): THREE.Group {
  const g = new THREE.Group();
  placements.forEach((p, i) => g.add(createPlacedPart(p, i)));
  return g;
}
