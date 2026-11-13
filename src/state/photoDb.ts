import { createStore, del, get, set } from 'idb-keyval';

const store = typeof indexedDB !== 'undefined' ? createStore('duplify-photos', 'photos') : undefined;

/** Verkleinert ein Foto (max. 1280 px) und speichert es als JPEG in IndexedDB. */
export async function savePhoto(file: Blob, maxSize = 1280): Promise<string> {
  const blob = await shrink(file, maxSize);
  const id = `photo-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await set(id, blob, store);
  return id;
}

export async function loadPhoto(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, store);
}

export async function deletePhoto(id: string): Promise<void> {
  await del(id, store);
}

export async function shrink(file: Blob, maxSize: number, type = 'image/jpeg', quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), type, quality));
}

/** Kleines Foto als Data-URL (für eigene Teile im Bestand). */
export async function toSmallDataUrl(file: Blob, maxSize = 256): Promise<string> {
  const blob = await shrink(file, maxSize, 'image/jpeg', 0.8);
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
