import * as THREE from 'three';
import { colorHex } from '../core/colors';
import type { ColorId } from '../core/types';

const cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

/** Glänzendes Plastik in einer Bausteinfarbe. */
export function plastic(color: ColorId | null): THREE.MeshStandardMaterial {
  return cached(`plastic:${color}`, () => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex(color)),
      roughness: 0.28,
      metalness: 0,
      envMapIntensity: 0.75,
    });
    return m;
  });
}

/** Etwas hellere Variante (z. B. Türblatt). */
export function plasticLight(color: ColorId | null, amount = 0.3): THREE.MeshStandardMaterial {
  return cached(`plasticLight:${color}:${amount}`, () => {
    const c = new THREE.Color(colorHex(color)).lerp(new THREE.Color('#ffffff'), amount);
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0 });
  });
}

/** Feste Farbe eines Originalmodells (Aufdruck, Reifen …). */
export function fixedPlastic(hex: string): THREE.MeshStandardMaterial {
  return cached(`fixed:${hex}`, () => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.3, metalness: 0 }));
}

/** Durchsichtiger „Geisterstein“ für den Zielplatz. */
export function ghost(color: ColorId | null): THREE.MeshStandardMaterial {
  return cached(`ghost:${color}`, () => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex(color)).lerp(new THREE.Color('#ffffff'), 0.35),
      roughness: 0.4,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      emissive: new THREE.Color(colorHex(color)),
      emissiveIntensity: 0.25,
    });
    return m;
  });
}

export function flat(hex: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return cached(`flat:${hex}:${JSON.stringify(opts)}`, () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, ...opts }));
}

export const MAT = {
  eyeWhite: () => flat('#ffffff', { roughness: 0.25 }),
  pupil: () => flat('#1b1f2a', { roughness: 0.2 }),
  tire: () => flat('#2b2f36', { roughness: 0.85 }),
  hub: () => flat('#d9dde3', { roughness: 0.35, metalness: 0.2 }),
  glass: () =>
    cached(
      'glass',
      () =>
        new THREE.MeshStandardMaterial({
          color: '#bfe6ff',
          roughness: 0.05,
          metalness: 0,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        }),
    ),
  stem: () => flat('#3fae49'),
  leaf: () => flat('#5cc85a'),
  skin: () => flat('#f6c9a0', { roughness: 0.6 }),
  cheek: () => flat('#ff9db0', { roughness: 0.7, transparent: true, opacity: 0.8 }),
  gold: () => flat('#ffd23f', { roughness: 0.3, metalness: 0.1 }),
  white: () => flat('#ffffff'),
  black: () => flat('#1b1f2a'),
  shadow: () =>
    cached('blobShadow', () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, 'rgba(30,50,80,0.45)');
      g.addColorStop(1, 'rgba(30,50,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(canvas);
      return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    }),
};

const photoCache = new Map<string, THREE.MeshStandardMaterial>();
/** Material mit Foto (für eigene Teile). */
export function photoMaterial(dataUrl: string): THREE.MeshStandardMaterial {
  let m = photoCache.get(dataUrl);
  if (!m) {
    const tex = new THREE.TextureLoader().load(dataUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    photoCache.set(dataUrl, m);
  }
  return m;
}
