/**
 * Browser-safe storage helpers.
 *
 * Storage getters, setItem, and JSON parsing can throw in private browsing,
 * embedded WebViews, sandboxed frames, or when quota is exceeded.
 * Always fall back safely to in-memory storage without crashing the app.
 */
const memoryStore: Record<string, string> = {};
const PROBE_KEY = '__rd27_storage_probe__';
const APP_KEY_PREFIXES = ['rd27_', 'super_admin_'];

function getStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const store = window[kind];
    if (!store || typeof store.getItem !== 'function' || typeof store.setItem !== 'function') {
      return null;
    }
    // Probe read/write to detect Safari Private / WebView SecurityError or QuotaExceededError early.
    try {
      store.setItem(PROBE_KEY, '1');
      store.removeItem(PROBE_KEY);
    } catch {
      return store; // Read-only may still work; write failures are caught in setItem.
    }
    return store;
  } catch {
    return null;
  }
}

function getStorageReadOnly(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const store = window[kind];
    if (!store || typeof store.getItem !== 'function') return null;
    return store;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name || '';
  const code = (error as { code?: number }).code;
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
}

function pruneOversizedAppEntries(store: Storage): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith('super_admin_img_') && !k.startsWith('super_admin_img_remote_')) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      try {
        store.removeItem(k);
      } catch {
        // Ignore individual removal failures.
      }
    }
  } catch {
    // Ignore enumeration errors.
  }
}

export function clearCorruptAppStorage(): void {
  for (const key of Object.keys(memoryStore)) {
    if (APP_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
      delete memoryStore[key];
    }
  }

  for (const kind of ['sessionStorage', 'localStorage'] as const) {
    const store = getStorageReadOnly(kind);
    if (!store) continue;
    try {
      const keysToCheck: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && APP_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
          keysToCheck.push(key);
        }
      }
      for (const key of keysToCheck) {
        try {
          const val = store.getItem(key);
          if (val === null) continue;
          const trimmed = val.trim();
          // Evict obviously truncated JSON blobs or legacy sensitive keys if any remain.
          if (
            key === 'rd27_admin_role' ||
            key === 'rd27_admin_passcode' ||
            ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (() => {
              try {
                JSON.parse(trimmed);
                return false;
              } catch {
                return true;
              }
            })())
          ) {
            store.removeItem(key);
          }
        } catch {
          try {
            store.removeItem(key);
          } catch {
            // Ignore cleanup failure.
          }
        }
      }
    } catch {
      // Ignore restricted storage iteration.
    }
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    for (const kind of ['sessionStorage', 'localStorage'] as const) {
      try {
        const value = getStorageReadOnly(kind)?.getItem(key);
        if (value !== null && value !== undefined) return value;
      } catch {
        // Continue to the next storage provider or in-memory fallback.
      }
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  },

  setItem(key: string, value: string): void {
    memoryStore[key] = value;
    for (const kind of ['sessionStorage', 'localStorage'] as const) {
      const store = getStorage(kind);
      if (!store) continue;
      try {
        store.setItem(key, value);
      } catch (error) {
        if (isQuotaError(error)) {
          pruneOversizedAppEntries(store);
          try {
            store.setItem(key, value);
          } catch {
            // Persistence is best-effort; in-memory state remains usable.
          }
        }
      }
    }
  },

  removeItem(key: string): void {
    delete memoryStore[key];
    for (const kind of ['sessionStorage', 'localStorage'] as const) {
      try {
        getStorageReadOnly(kind)?.removeItem(key);
      } catch {
        // Continue clearing other storage providers.
      }
    }
  },

  getJSON<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
    const raw = this.getItem(key);
    if (raw === null) return fallback;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (validate && !validate(parsed)) {
        this.removeItem(key);
        return fallback;
      }
      return parsed as T;
    } catch {
      // Evict malformed persisted JSON so subsequent loads recover automatically.
      this.removeItem(key);
      return fallback;
    }
  },
};

/**
 * Storage adapter passed to Supabase client so GoTrue never accesses
 * window.localStorage directly inside restricted WebViews or Private Mode.
 */
export const safeSupabaseStorage = {
  getItem(key: string): string | null {
    return safeStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    safeStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    safeStorage.removeItem(key);
  },
};

