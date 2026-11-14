import type { GalleryMedia } from '../super-admin/gallery/types';
import { safeRandomId } from '../lib/browserUtils';

const DB_NAME = 'rd27-gallery-local-v1';
const STORE = 'media';
const VERSION = 1;
const EVENT = 'rd27-gallery-change';

function getSafeIndexedDB(): IDBFactory | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!('indexedDB' in window)) return null;
    return window.indexedDB ?? null;
  } catch {
    return null;
  }
}

function emitGalleryChange(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT));
    }
  } catch {
    // Ignore event dispatch failures on restricted WebViews.
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = getSafeIndexedDB();
    if (!idb) {
      reject(new Error('IndexedDB is unavailable in this browser.'));
      return;
    }

    try {
      const req = idb.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const store = db.createObjectStore(STORE, { keyPath: 'id' });
            store.createIndex('order', 'sort_order');
          }
        } catch (upgradeErr) {
          reject(upgradeErr instanceof Error ? upgradeErr : new Error('Cannot initialize local media storage.'));
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Cannot open local media storage.'));
      req.onblocked = () => reject(new Error('Local media storage is temporarily locked.'));
    } catch (err) {
      reject(err instanceof Error ? err : new Error('IndexedDB is unavailable in this browser.'));
    }
  });
}

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Local media operation failed.'));
  });
}

export async function getGalleryMedia(includeDisabled = false): Promise<GalleryMedia[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const rows = (await request(tx.objectStore(STORE).getAll())) as GalleryMedia[];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(x => x && (includeDisabled || x.enabled))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
  } finally {
    try {
      db.close();
    } catch {
      // Ignore close errors.
    }
  }
}

export async function putGalleryMedia(items: GalleryMedia[]): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    items.forEach(item => tx.objectStore(STORE).put(item));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not save media.'));
      tx.onabort = () => reject(tx.error || new Error('Save cancelled.'));
    });
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      throw new Error('Browser storage quota is full. Please remove large files or choose smaller uploads.');
    }
    throw e;
  } finally {
    try {
      db.close();
    } catch {
      // Ignore close errors.
    }
  }
  emitGalleryChange();
}

export async function deleteGalleryMedia(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Delete failed.'));
    });
  } finally {
    try {
      db.close();
    } catch {
      // Ignore close errors.
    }
  }
  emitGalleryChange();
}

export function createGalleryMediaId(): string {
  return safeRandomId('gallery');
}

export function subscribeToGalleryChanges(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  window.addEventListener(EVENT, callback);
  return () => {
    try {
      window.removeEventListener(EVENT, callback);
    } catch {
      // Ignore listener removal errors.
    }
  };
}
