// Wandelt alle Duplo-Teile der LDraw-Bibliothek in kompakte 3D-Dateien und einen Katalog um.
//
//   npm run ldraw -- /pfad/zu/complete.zip
//   npm run ldraw -- --names     (nur die deutschen Namen im Katalog neu übersetzen)
//
// Quelle: https://library.ldraw.org/library/updates/complete.zip (LDraw.org Parts Library, CC BY 4.0)
// Ausgabe:
//   public/ldraw/parts/<id>.dpl        Geometrie je Teil, gzip-gepackt (siehe writeBin)
//   src/core/parts/ldraw-catalog.json  Maße, Noppen, Namen, Kategorien
//   public/ldraw/CREDITS.txt           Autorinnen und Autoren (Namensnennung nach CC BY 4.0)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, strFromU8, strToU8, unzipSync } from 'fflate';
import * as THREE from 'three';
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js';
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js';
import { translateName, categorize, classify } from './names.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_PARTS = resolve(ROOT, 'public/ldraw/parts');
const OUT_CATALOG = resolve(ROOT, 'src/core/parts/ldraw-catalog.json');
const OUT_CREDITS = resolve(ROOT, 'public/ldraw/CREDITS.txt');

function writeCatalog(parts, generated = new Date().toISOString().slice(0, 10)) {
  writeFileSync(
    OUT_CATALOG,
    JSON.stringify({ source: 'LDraw.org Parts Library', license: 'CC BY 4.0', generated, parts }, null, 0).replace(/\},\{/g, '},\n{'),
  );
}

if (process.argv[2] === '--names') {
  const { parts, generated } = JSON.parse(readFileSync(OUT_CATALOG, 'utf8'));
  for (const p of parts) p.de = translateName(p.en);
  writeCatalog(parts, generated);
  console.log(`Namen neu übersetzt: ${parts.length} Teile`);
  process.exit(0);
}

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Bitte Pfad zur LDraw complete.zip angeben: npm run ldraw -- /pfad/complete.zip');
  process.exit(1);
}

// ---------- Bibliothek laden ----------
console.log('Entpacke', zipPath);
const raw = unzipSync(readFileSync(zipPath), {
  filter: (f) => f.name.startsWith('ldraw/parts/') || f.name.startsWith('ldraw/p/') || f.name === 'ldraw/LDConfig.ldr',
});
const lib = new Map();
for (const [name, data] of Object.entries(raw)) lib.set(name.toLowerCase(), data);
const textCache = new Map();
function text(path) {
  let t = textCache.get(path);
  if (t === undefined) {
    t = strFromU8(lib.get(path));
    textCache.set(path, t);
  }
  return t;
}
const normRef = (ref) => ref.trim().replace(/\\/g, '/').toLowerCase();
function resolveRef(ref) {
  const r = normRef(ref);
  for (const base of ['ldraw/parts/', 'ldraw/p/', '']) if (lib.has(base + r)) return base + r;
  return null;
}

// Farbtabelle (Code → Hex) und die !COLOUR-Zeilen für den Loader
const ldconfig = text('ldraw/ldconfig.ldr');
const colourLines = ldconfig.split(/\r?\n/).filter((l) => l.trim().startsWith('0 !COLOUR'));
const colourHex = new Map();
for (const l of colourLines) {
  const m = l.match(/CODE\s+(\d+)\s+VALUE\s+#([0-9A-Fa-f]{6})/);
  if (m) colourHex.set(Number(m[1]), m[2].toUpperCase());
}

// ---------- Duplo-Teile finden ----------
const duplo = [];
for (const path of lib.keys()) {
  const m = path.match(/^ldraw\/parts\/([^/]+)\.dat$/);
  if (!m) continue;
  const first = text(path).split(/\r?\n/, 1)[0].replace(/^0\s+/, '').trim();
  if (!/^Duplo\b/.test(first)) continue; // ohne ~Hilfsdateien, =Aliase, _Farbvarianten
  duplo.push({ id: m[1], path, en: first.replace(/\s+/g, ' ') });
}
duplo.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

// Zusammengesetzte Teile: Türrahmen mit Tür bzw. Fenster (so wie sie im Set liegen).
// Einsatz: Scharnier rechts in der Öffnung, vorne bündig.
const INSERT = '1 COLOR 68 72 -37 1 0 0 0 1 0 0 0 1';
const VIRTUAL = [
  { id: 'x-door', en: 'Duplo Door Frame 2 x 4 x 3 with Door', lines: ['1 16 0 0 0 1 0 0 0 1 0 0 0 1 4253c01.dat', `${INSERT.replace('COLOR', '16')} 18816.dat`] },
  { id: 'x-window', en: 'Duplo Window Frame 2 x 4 x 3 with Window', lines: ['1 16 0 0 0 1 0 0 0 1 0 0 0 1 4253c01.dat', `${INSERT.replace('COLOR', '15')} 90265.dat`] },
];
for (const v of VIRTUAL) {
  const path = `${v.id}.dat`;
  lib.set(path, strToU8([`0 ${v.en}`, '0 Author: Duplify (zusammengesetzt aus LDraw-Teilen)', ...v.lines].join('\n')));
  // Grundfläche vom Rahmen (Noppen) – der Türgriff ragt etwas nach vorne.
  duplo.push({ id: v.id, path, en: v.en, studFootprint: true });
}
console.log('Duplo-Teile:', duplo.length);

// ---------- Hilfen ----------
function lines(path) {
  return text(path).split(/\r?\n/);
}
function closure(path, out = new Map(), authors = new Set()) {
  for (const l of lines(path)) {
    const t = l.trim();
    const a = t.match(/^0\s+Author:\s*(.+)$/i);
    if (a) authors.add(a[1].trim());
    if (!t.startsWith('1 ')) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 15) continue;
    const ref = normRef(parts.slice(14).join(' '));
    if (out.has(ref)) continue;
    const p = resolveRef(ref);
    if (!p) continue;
    out.set(ref, p);
    closure(p, out, authors);
  }
  return { files: out, authors };
}

const STUD_TOP = /^(stud7a?|stud20|stud28a?)\.dat$/;
const STUD_TUBE = /^(stud8a?|stud8s2)\.dat$/;

/** Durchläuft ein Teil mit Matrizen und sammelt Noppen, Röhren und Eckpunkte (LDraw-Koordinaten). */
function analyze(path) {
  const studs = [];
  const tubes = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const walk = (p, M, depth) => {
    if (depth > 30) return;
    for (const l of lines(p)) {
      const t = l.trim().split(/\s+/);
      if (t[0] === '1' && t.length >= 15) {
        const v = t.slice(2, 14).map(Number);
        const m = new THREE.Matrix4().set(v[3], v[4], v[5], v[0], v[6], v[7], v[8], v[1], v[9], v[10], v[11], v[2], 0, 0, 0, 1);
        const M2 = M.clone().multiply(m);
        const ref = normRef(t.slice(14).join(' '));
        const base = ref.split('/').pop();
        if (STUD_TOP.test(base) || STUD_TUBE.test(base)) {
          const pos = new THREE.Vector3(0, 0, 0).applyMatrix4(M2);
          const up = new THREE.Vector3(0, -1, 0).transformDirection(M2);
          (STUD_TOP.test(base) ? studs : tubes).push({ pos, up });
        }
        const sub = resolveRef(ref);
        if (sub) walk(sub, M2, depth + 1);
      } else if ((t[0] === '3' && t.length >= 11) || (t[0] === '4' && t.length >= 14)) {
        const k = t[0] === '3' ? 3 : 4;
        for (let i = 0; i < k; i++) {
          const pt = new THREE.Vector3(Number(t[2 + i * 3]), Number(t[3 + i * 3]), Number(t[4 + i * 3])).applyMatrix4(M);
          min[0] = Math.min(min[0], pt.x);
          min[1] = Math.min(min[1], pt.y);
          min[2] = Math.min(min[2], pt.z);
          max[0] = Math.max(max[0], pt.x);
          max[1] = Math.max(max[1], pt.y);
          max[2] = Math.max(max[2], pt.z);
        }
      }
    }
  };
  walk(path, new THREE.Matrix4(), 0);
  return { studs, tubes, min, max };
}

/**
 * Maße im App-Raster: 1 Noppe = 40 LDU, 1 Halb-Ebene = 24 LDU.
 * App-Koordinaten entstehen durch 180°-Drehung um die z-Achse: x' = -x, y' = -y.
 */
function deriveMetrics(part, info) {
  const upStuds = info.studs.filter((s) => s.up.y < -0.9); // in LDraw zeigt „oben“ nach −y
  let topY = upStuds.length ? Math.min(...upStuds.map((s) => s.pos.y)) : info.min[1];
  const topStuds = upStuds.filter((s) => Math.abs(s.pos.y - topY) < 2);
  const bottomY = info.max[1];
  if (!upStuds.length) topY = info.min[1];
  const h = Math.max(1, Math.round((bottomY - topY) / 24));

  const wheeled = /\b(Car Base|Wheel|Tyre|Truck Base|Train Base|Vehicle Base|Chassis)\b/i.test(part.en);
  const baseplate = /\bBaseplate\b/i.test(part.en);
  // Raster an den Noppen ausrichten (Noppen sitzen in Feld-Mitten)
  const refX = topStuds.length ? topStuds[0].pos.x : info.min[0] + 20;
  const refZ = topStuds.length ? topStuds[0].pos.z : info.min[2] + 20;
  const tol = 9;
  let x0;
  let x1;
  let z0;
  let z1;
  if ((wheeled || part.studFootprint) && topStuds.length) {
    x0 = Math.min(...topStuds.map((s) => s.pos.x)) - 20;
    x1 = Math.max(...topStuds.map((s) => s.pos.x)) + 20;
    z0 = Math.min(...topStuds.map((s) => s.pos.z)) - 20;
    z1 = Math.max(...topStuds.map((s) => s.pos.z)) + 20;
  } else {
    const snapLo = (v, ref) => ref - 20 + Math.floor((v + tol - (ref - 20)) / 40) * 40;
    const snapHi = (v, ref) => ref - 20 + Math.ceil((v - tol - (ref - 20)) / 40) * 40;
    x0 = snapLo(info.min[0], refX);
    x1 = snapHi(info.max[0], refX);
    z0 = snapLo(info.min[2], refZ);
    z1 = snapHi(info.max[2], refZ);
    for (const s of topStuds) {
      x0 = Math.min(x0, s.pos.x - 20);
      x1 = Math.max(x1, s.pos.x + 20);
      z0 = Math.min(z0, s.pos.z - 20);
      z1 = Math.max(z1, s.pos.z + 20);
    }
  }
  const w = Math.max(1, Math.round((x1 - x0) / 40));
  const l = Math.max(1, Math.round((z1 - z0) / 40));
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  // Noppen-Felder in App-Koordinaten (x gespiegelt durch die Drehung)
  const cells = new Set();
  for (const s of topStuds) {
    const ax = -(s.pos.x - cx);
    const az = s.pos.z - cz;
    const lx = Math.round((ax + (w * 40) / 2 - 20) / 40);
    const lz = Math.round((az + (l * 40) / 2 - 20) / 40);
    if (lx >= 0 && lx < w && lz >= 0 && lz < l) cells.add(`${lx},${lz}`);
  }
  const studs = [...cells].map((c) => c.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const allStuds = studs.length === w * l;
  return {
    w,
    l,
    h,
    cx,
    cz,
    bottomY,
    studs: allStuds ? 'all' : studs,
    tubes: info.tubes.length,
    ground: wheeled || baseplate,
  };
}

// ---------- Geometrie über LDrawLoader ----------
const loader = new LDrawLoader();
loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
loader.smoothNormals = true;
// Unterteile direkt aus der Zip-Datei liefern statt sie per HTTP zu laden.
loader.partsCache.parseCache.fetchData = async (fileName) => {
  const p = resolveRef(fileName) ?? resolveRef(String(fileName).replace(/^(parts|p|models)\//i, ''));
  if (!p) throw new Error(`Unterteil fehlt: ${fileName}`);
  return text(p);
};

function mainModel(part) {
  return [...colourLines, `1 16 0 0 0 1 0 0 0 1 0 0 0 1 ${part.id}.dat`].join('\n');
}

function parseAsync(model) {
  return new Promise((res, rej) => loader.parse(model, res, rej));
}

/** Sammelt Dreiecke je Farbcode, transformiert in App-Koordinaten (LDU, noch nicht skaliert). */
function collect(group, m) {
  group.updateMatrixWorld(true);
  const byCode = new Map();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  group.traverse((obj) => {
    if (!obj.isMesh) return;
    const g = obj.geometry;
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const idx = g.index;
    nm.getNormalMatrix(obj.matrixWorld);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const groups = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex ?? 0];
      const code = mat?.userData?.code !== undefined ? Number(mat.userData.code) : 16;
      const hex = code === 16 ? null : (colourHex.get(code) ?? (mat?.color ? mat.color.getHexString().toUpperCase() : 'CCCCCC'));
      const key = code === 16 ? 'main' : hex;
      let bucket = byCode.get(key);
      if (!bucket) byCode.set(key, (bucket = { hex, verts: [] }));
      for (let i = gr.start; i < gr.start + gr.count; i++) {
        const vi = idx ? idx.getX(i) : i;
        v.fromBufferAttribute(pos, vi).applyMatrix4(obj.matrixWorld);
        if (nor) n.fromBufferAttribute(nor, vi).applyMatrix3(nm).normalize();
        else n.set(0, 1, 0);
        // App-Koordinaten: x' = -(x - cx), y' = bottom - y, z' = z - cz
        bucket.verts.push(-(v.x - m.cx), m.bottomY - v.y, v.z - m.cz, -n.x, -n.y, n.z);
      }
    }
  });
  return byCode;
}

/**
 * Binärformat (little endian, Abschnitte auf 4 Byte ausgerichtet):
 *   u32 Magic 'DPL1' · u32 Gruppenzahl
 *   je Gruppe: u32 Farbe (0xRRGGBB, 0xFFFFFFFF = Teilfarbe) · u32 Eckpunkte · u32 Indizes
 *   je Gruppe: Int16 Positionen (¼ LDU) · Int8 Normalen (×127) · Uint16/Uint32 Indizes
 */
function writeBin(byCode) {
  const groups = [];
  for (const { hex, verts } of byCode.values()) {
    const map = new Map();
    const pos = [];
    const nor = [];
    const index = [];
    for (let i = 0; i < verts.length; i += 6) {
      const px = Math.round(verts[i] * 4);
      const py = Math.round(verts[i + 1] * 4);
      const pz = Math.round(verts[i + 2] * 4);
      const nx = Math.round(verts[i + 3] * 127);
      const ny = Math.round(verts[i + 4] * 127);
      const nz = Math.round(verts[i + 5] * 127);
      const key = `${px},${py},${pz},${nx},${ny},${nz}`;
      let k = map.get(key);
      if (k === undefined) {
        k = pos.length / 3;
        map.set(key, k);
        pos.push(px, py, pz);
        nor.push(nx, ny, nz);
      }
      index.push(k);
    }
    // degenerierte Dreiecke entfernen
    const clean = [];
    for (let i = 0; i < index.length; i += 3) {
      const [a, b, c] = [index[i], index[i + 1], index[i + 2]];
      if (a !== b && b !== c && a !== c) clean.push(a, b, c);
    }
    if (clean.length) groups.push({ color: hex === null ? 0xffffffff : parseInt(hex, 16), pos, nor, index: clean });
  }
  const pad = (n) => (n + 3) & ~3;
  let size = 8 + groups.length * 12;
  for (const g of groups) {
    const vc = g.pos.length / 3;
    size += pad(vc * 6) + pad(vc * 3) + pad(g.index.length * (vc > 65535 ? 4 : 2));
  }
  const buf = new ArrayBuffer(size);
  const dv = new DataView(buf);
  dv.setUint32(0, 0x314c5044, true); // 'DPL1'
  dv.setUint32(4, groups.length, true);
  let o = 8;
  for (const g of groups) {
    dv.setUint32(o, g.color >>> 0, true);
    dv.setUint32(o + 4, g.pos.length / 3, true);
    dv.setUint32(o + 8, g.index.length, true);
    o += 12;
  }
  for (const g of groups) {
    const vc = g.pos.length / 3;
    new Int16Array(buf, o, g.pos.length).set(g.pos);
    o += pad(vc * 6);
    new Int8Array(buf, o, g.nor.length).set(g.nor);
    o += pad(vc * 3);
    if (vc > 65535) new Uint32Array(buf, o, g.index.length).set(g.index);
    else new Uint16Array(buf, o, g.index.length).set(g.index);
    o += pad(g.index.length * (vc > 65535 ? 4 : 2));
  }
  return {
    bytes: new Uint8Array(buf),
    tris: groups.reduce((s, g) => s + g.index.length / 3, 0),
    main: groups.some((g) => g.color === 0xffffffff),
    fixed: groups.filter((g) => g.color !== 0xffffffff).map((g) => g.color.toString(16).padStart(6, '0')),
  };
}

// ---------- Los ----------
rmSync(OUT_PARTS, { recursive: true, force: true });
mkdirSync(OUT_PARTS, { recursive: true });
const catalog = [];
const allAuthors = new Map();
let done = 0;
for (const part of duplo) {
  try {
    const { files, authors } = closure(part.path);
    const firstLines = lines(part.path);
    const auth = firstLines.find((l) => /^0\s+Author:/i.test(l.trim()));
    if (auth) authors.add(auth.trim().replace(/^0\s+Author:\s*/i, ''));
    const metrics = deriveMetrics(part, analyze(part.path));
    void files;
    const group = await parseAsync(mainModel(part));
    const { bytes, tris, fixed, main } = writeBin(collect(group, metrics));
    if (tris === 0) {
      console.warn('  ohne Flächen, übersprungen:', part.id);
      continue;
    }
    const packed = gzipSync(bytes, { level: 9 });
    writeFileSync(resolve(OUT_PARTS, `${part.id}.dpl`), packed);
    const cat = categorize(part.en);
    catalog.push({
      id: part.id,
      en: part.en,
      de: translateName(part.en),
      cat,
      kind: classify(part.en, metrics),
      w: metrics.w,
      l: metrics.l,
      h: metrics.h,
      studs: metrics.studs,
      tubes: metrics.tubes,
      ground: metrics.ground || undefined,
      printed: /\bPattern\b/i.test(part.en) || /p\d+/.test(part.id) || undefined,
      fixed: fixed.length ? fixed : undefined,
      noMain: main ? undefined : true,
      tris,
      kb: Math.round(packed.length / 102.4) / 10,
    });
    for (const a of authors) allAuthors.set(a, (allAuthors.get(a) ?? 0) + 1);
  } catch (e) {
    console.warn('  Fehler bei', part.id, e?.message ?? e);
  }
  if (++done % 50 === 0) console.log(`  ${done}/${duplo.length}`);
}

writeCatalog(catalog);
const credits = [
  'Duplify – 3D-Modelle der Duplo-Teile',
  '',
  'Quelle: LDraw.org Parts Library (https://library.ldraw.org)',
  'Lizenz: Creative Commons Attribution 4.0 (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/',
  'Änderungen: in ein kompaktes Binärformat umgewandelt und gedreht/verschoben.',
  'LEGO® und DUPLO® sind Marken der LEGO Gruppe; Duplify ist nicht mit LEGO verbunden.',
  '',
  'Autorinnen und Autoren der verwendeten Teile:',
  ...[...allAuthors.keys()].sort((a, b) => a.localeCompare(b)),
  '',
];
writeFileSync(OUT_CREDITS, credits.join('\n'));
const totalKb = catalog.reduce((s, p) => s + p.kb, 0);
console.log(`Fertig: ${catalog.length} Teile, ${(totalKb / 1024).toFixed(1)} MB, ${allAuthors.size} Autor:innen`);
