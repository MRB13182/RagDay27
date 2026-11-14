import React from 'react';

/**
 * Defensive browser API wrappers for older mobile browsers and embedded WebViews.
 */

export function safeScrollToTop(): void {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    try {
      window.scrollTo(0, 0);
    } catch {
      // Ignore restricted scrolling environments.
    }
  }
}

export function safeReplaceHistory(targetUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, '', targetUrl);
    }
  } catch {
    // Ignore SecurityError in sandboxed frames or restricted WebViews.
  }
}

export async function safeCopyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to execCommand below for HTTP or restricted WebViews.
    }
  }

  if (typeof document === 'undefined' || !document.body) return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    document.body.removeChild(textarea);
    return Boolean(ok);
  } catch {
    return false;
  }
}

export function safeRandomId(prefix = 'id'): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Fallback to timestamp + Math.random when crypto.randomUUID is unavailable.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const CHUNK_RETRY_PARAM = 'rd27_chunk_retry';

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error || '');
  return /ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message
  );
}

/**
 * Lazy-loads a module with a single safe reload recovery when stale cached HTML
 * points to a removed hashed Vite chunk after a deployment.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async (): Promise<{ default: T }> => {
    try {
      const mod = await importer();
      // Clear any chunk retry marker once a chunk resolves cleanly.
      try {
        if (typeof window !== 'undefined' && window.location.search.includes(CHUNK_RETRY_PARAM)) {
          const url = new URL(window.location.href);
          if (url.searchParams.has(CHUNK_RETRY_PARAM)) {
            url.searchParams.delete(CHUNK_RETRY_PARAM);
            safeReplaceHistory(`${url.pathname}${url.search}${url.hash}`);
          }
        }
      } catch {
        // Ignore URL cleanup errors.
      }
      return mod;
    } catch (error) {
      if (isChunkLoadError(error) && typeof window !== 'undefined') {
        let alreadyRetried = false;
        try {
          alreadyRetried = window.sessionStorage?.getItem('rd27_chunk_reloaded') === '1';
        } catch {
          alreadyRetried = window.location.search.includes(CHUNK_RETRY_PARAM);
        }

        if (!alreadyRetried) {
          try {
            window.sessionStorage?.setItem('rd27_chunk_reloaded', '1');
          } catch {
            // Continue with URL-based retry guard.
          }
          try {
            const url = new URL(window.location.href);
            url.searchParams.set(CHUNK_RETRY_PARAM, String(Date.now()));
            window.location.replace(url.toString());
            return new Promise<{ default: T }>(() => {});
          } catch {
            window.location.reload();
            return new Promise<{ default: T }>(() => {});
          }
        }
      }
      throw error;
    }
  });
}
