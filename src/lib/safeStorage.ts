/**
 * Browser-safe storage helpers.
 *
 * Storage getters can throw in private browsing, embedded contexts, and when
 * a browser blocks persistence. Keep the in-memory fallback available.
 */
const memoryStore: Record<string, string> = {};

function getStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window[kind] ?? null;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    for (const kind of ['sessionStorage', 'localStorage'] as const) {
      try {
        const value = getStorage(kind)?.getItem(key);
        if (value !== null && value !== undefined) return value;
      } catch {
        // Continue to the next storage provider or in-memory fallback.
      }
    }
    return memoryStore[key] ?? null;
  },

  setItem(key: string, value: string): void {
    memoryStore[key] = value;
    for (const kind of ['sessionStorage', 'localStorage'] as const) {
      try {
        getStorage(kind)?.setItem(key, value);
      } catch {
        // Persistence is best-effort; in-memory state remains usable.
      }
    }
  },

  removeItem(key: string): void {
    delete memoryStore[key];
    for (const kind of ['sessionStorage', 'localStorage'] as const) {
      try {
        getStorage(kind)?.removeItem(key);
      } catch {
        // Continue clearing other storage providers.
      }
    }
  },

  getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
};
