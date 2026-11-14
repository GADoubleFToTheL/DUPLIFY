import { gunzipSync } from 'fflate';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Lädt die originalgetreuen 3D-Modelle (aus der LDraw-Bibliothek, CC BY 4.0) bei Bedarf.
 * Format siehe scripts/ldraw/convert.mjs: Positionen in ¼ LDU, 1 Noppe = 40 LDU.
 */
const SCALE = 1 / 160;

export interface LDrawGroup {
  /** null = Teilfarbe, sonst feste Farbe (#rrggbb). */
  color: string | null;
  geometry: THREE.BufferGeometry;
}

export interface LoadedModel {
  groups: LDrawGroup[];
}

const loaded = new Map<string, LoadedModel>();
const pending = new Map<string, Promise<LoadedModel | null>>();
const failed = new Set<string>();
const listeners = new Set<() => void>();

function partUrl(file: string): string {
  return `${import.meta.env?.BASE_URL ?? './'}ldraw/parts/${file}.dpl`;
}

export function decodeModel(data: Uint8Array): LoadedModel {
  const bytes = data[0] === 0x1f && data[1] === 0x8b ? gunzipSync(data) : data;
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x314c5044) throw new Error('Unbekanntes Teile-Format');
  const count = dv.getUint32(4, true);
  const heads: { color: number; vc: number; ic: number }[] = [];
  let o = 8;
  for (let i = 0; i < count; i++) {
    heads.push({ color: dv.getUint32(o, true), vc: dv.getUint32(o + 4, true), ic: dv.getUint32(o + 8, true) });
    o += 12;
  }
  const pad = (n: number) => (n + 3) & ~3;
  const groups: LDrawGroup[] = [];
  for (const h of heads) {
    const p16 = new Int16Array(buf, o, h.vc * 3);
    o += pad(h.vc * 6);
    const n8 = new Int8Array(buf, o, h.vc * 3);
    o += pad(h.vc * 3);
    const big = h.vc > 65535;
    const idx = big ? new Uint32Array(buf, o, h.ic) : new Uint16Array(buf, o, h.ic);
    o += pad(h.ic * (big ? 4 : 2));
    const pos = new Float32Array(h.vc * 3);
    for (let i = 0; i < pos.length; i++) pos[i] = p16[i] * SCALE;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(n8), 3, true));
    g.setIndex(new THREE.BufferAttribute(big ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    groups.push({ color: h.color === 0xffffffff ? null : `#${h.color.toString(16).padStart(6, '0')}`, geometry: g });
  }
  return { groups };
}

/** Schon geladenes Modell (sonst undefined). */
export function getModel(file: string): LoadedModel | undefined {
  return loaded.get(file);
}

export function isModelReady(file: string): boolean {
  return loaded.has(file) || failed.has(file);
}

export function loadModel(file: string): Promise<LoadedModel | null> {
  const hit = loaded.get(file);
  if (hit) return Promise.resolve(hit);
  if (failed.has(file)) return Promise.resolve(null);
  let p = pending.get(file);
  if (!p) {
    p = fetch(partUrl(file))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((ab) => {
        const model = decodeModel(new Uint8Array(ab));
        loaded.set(file, model);
        return model;
      })
      .catch((e) => {
        console.warn(`3D-Modell ${file} nicht geladen`, e);
        failed.add(file);
        return null;
      })
      .finally(() => {
        pending.delete(file);
        listeners.forEach((l) => l());
      });
    pending.set(file, p);
  }
  return p;
}

export async function preloadModels(files: Iterable<string>): Promise<void> {
  await Promise.all([...new Set(files)].map((f) => loadModel(f)));
}

/** true, sobald alle genannten Modelle geladen (oder endgültig fehlgeschlagen) sind. */
export function useModelsReady(files: readonly string[]): boolean {
  const key = [...new Set(files)].sort().join(',');
  const [, force] = useState(0);
  const ready = files.every((f) => isModelReady(f));
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const l = () => alive && force((n) => n + 1);
    listeners.add(l);
    void preloadModels(files);
    return () => {
      alive = false;
      listeners.delete(l);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
  return ready;
}
