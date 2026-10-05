/**
 * SAFE STORAGE UTILITY
 * 
 * Provides bulletproof storage operations across mobile devices, cross-origin iframes
 * (including Google AI Studio previews), private browsing modes, Chrome, Firefox, Safari, and Edge.
 * Safely guards against:
 * DOMException: Failed to read the 'sessionStorage' property from 'Window': Access is denied for this document.
 */

const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const val = window.sessionStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Storage access blocked by browser security policy
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Storage access blocked by browser security policy
    }

    return memoryStore[key] ?? null;
  },

  setItem(key: string, value: string): void {
    memoryStore[key] = value;

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // Storage blocked
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage blocked
    }
  },

  removeItem(key: string): void {
    delete memoryStore[key];

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Storage blocked
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage blocked
    }
  },
};
