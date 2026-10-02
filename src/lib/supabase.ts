import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdminProfile } from '../types';

/**
 * ============================================================================
 * RAG DAY 27 — SUPABASE CLIENT
 * ============================================================================
 * Current Supabase Project:
 * https://xulkacnjqjnluhmbqbcu.supabase.co
 *
 * IMPORTANT:
 * - Never use the old rqjlrbteaqjpgwkeomro project.
 * - Browser/client code must only use the publishable key.
 * - No service_role or secret key belongs here.
 * ============================================================================
 */

const SUPABASE_PROJECT_URL =
  'https://xulkacnjqjnluhmbqbcu.supabase.co';

const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_fQRP801i7hVZYFEz7oMMNg_uvZyZsVX';

/**
 * Environment variables may override the constants above,
 * but only when they point to the CURRENT RagDay27 Supabase project.
 */
const ENV_SUPABASE_URL =
  typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_SUPABASE_URL
    : undefined;

const ENV_SUPABASE_KEY =
  typeof import.meta !== 'undefined'
    ? (
        import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env?.VITE_SUPABASE_ANON_KEY
      )
    : undefined;

/**
 * Prevent accidental use of an old Supabase project.
 */
function resolveSupabaseUrl(): string {
  const candidate = (ENV_SUPABASE_URL || SUPABASE_PROJECT_URL).trim();

  if (
    candidate === SUPABASE_PROJECT_URL ||
    candidate.startsWith(`${SUPABASE_PROJECT_URL}/`)
  ) {
    return candidate.replace(/\/+$/, '');
  }

  // Force current production project if an outdated/mismatched URL is found.
  return SUPABASE_PROJECT_URL;
}

/**
 * Resolve the browser-safe publishable key.
 */
function resolveSupabaseKey(): string {
  const candidate = (ENV_SUPABASE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim();

  // Never use an obviously invalid placeholder.
  if (!candidate || candidate === 'YOUR_SUPABASE_PUBLISHABLE_KEY') {
    return DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  }

  return candidate;
}

const STORAGE_CUSTOM_URL_KEY = 'rd27_custom_supabase_url';
const STORAGE_CUSTOM_KEY_KEY = 'rd27_custom_supabase_key';

/**
 * Returns current Supabase connection configuration.
 *
 * Existing localStorage overrides are supported, but an override is accepted
 * only when it points to the current RagDay27 project.
 */
export function getSupabaseConfig(): {
  url: string;
  key: string;
  isCustom: boolean;
} {
  try {
    const customUrl = localStorage.getItem(STORAGE_CUSTOM_URL_KEY);
    const customKey = localStorage.getItem(STORAGE_CUSTOM_KEY_KEY);

    if (customUrl && customKey) {
      const cleanUrl = customUrl.trim().replace(/\/+$/, '');

      if (cleanUrl === SUPABASE_PROJECT_URL) {
        return {
          url: cleanUrl,
          key: customKey.trim(),
          isCustom: true,
        };
      }

      // Remove stale/old project override.
      localStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
      localStorage.removeItem(STORAGE_CUSTOM_KEY_KEY);
    }
  } catch {
    // Ignore localStorage errors.
  }

  return {
    url: resolveSupabaseUrl(),
    key: resolveSupabaseKey(),
    isCustom: false,
  };
}

const currentConfig = getSupabaseConfig();

export const SUPABASE_URL = currentConfig.url;
export const SUPABASE_PUBLISHABLE_KEY = currentConfig.key;

/**
 * Create a browser-safe Supabase client.
 */
function createClientInstance(
  url: string,
  key: string
): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Central Supabase client.
 */
export let supabase = createClientInstance(
  currentConfig.url,
  currentConfig.key
);

/**
 * Set custom Supabase config.
 *
 * For safety, only the current RagDay27 project is accepted.
 */
export function setSupabaseConfig(
  url: string,
  key: string
): void {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = key.trim();

  if (cleanUrl !== SUPABASE_PROJECT_URL) {
    throw new Error(
      'Only the current RagDay27 Supabase project is allowed.'
    );
  }

  if (!cleanKey) {
    throw new Error('A valid Supabase publishable key is required.');
  }

  try {
    localStorage.setItem(
      STORAGE_CUSTOM_URL_KEY,
      cleanUrl
    );
    localStorage.setItem(
      STORAGE_CUSTOM_KEY_KEY,
      cleanKey
    );
  } catch {
    // Ignore localStorage errors.
  }

  supabase = createClientInstance(cleanUrl, cleanKey);
}

/**
 * Reset to the official RagDay27 Supabase project.
 */
export function resetSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
    localStorage.removeItem(STORAGE_CUSTOM_KEY_KEY);
  } catch {
    // Ignore localStorage errors.
  }

  supabase = createClientInstance(
    SUPABASE_PROJECT_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
}

/**
 * Storage bucket.
 */
export const STORAGE_BUCKET = 'uploads';

export interface SupabaseHealthCheckResult {
  connected: boolean;
  registrationsTable: boolean;
  siteContentTable: boolean;
  adminsTable: boolean;
  storageBucket: boolean;
  details: {
    registrationsCount?: number;
    siteContentFound?: boolean;
    adminsFound?: boolean;
    storageAccessible?: boolean;
    error?: string;
  };
}

/**
 * Tests the CURRENT Supabase project.
 *
 * NOTE:
 * site_content is no longer part of the final architecture,
 * therefore absence of that table is NOT treated as a connection failure.
 */
export async function testSupabaseConnection(): Promise<SupabaseHealthCheckResult> {
  const result: SupabaseHealthCheckResult = {
    connected: false,
    registrationsTable: false,
    siteContentTable: false,
    adminsTable: false,
    storageBucket: false,
    details: {},
  };

  try {
    /**
     * 1. registrations
     */
    try {
      const {
        data,
        error,
        count,
      } = await supabase
        .from('registrations')
        .select('*', {
          count: 'exact',
          head: true,
        });

      void data;

      if (!error) {
        result.connected = true;
        result.registrationsTable = true;
        result.details.registrationsCount = count ?? 0;
      } else {
        result.details.error =
          error.message ||
          'Unable to access registrations table.';
      }
    } catch (error: any) {
      result.details.error =
        error?.message ||
        'Unable to access registrations table.';
    }

    /**
     * 2. admins
     */
    try {
      const { error } = await supabase
        .from('admins')
        .select('id', { head: true });

      if (!error) {
        result.connected = true;
        result.adminsTable = true;
        result.details.adminsFound = true;
      }
    } catch {
      // Ignore.
    }

    /**
     * 3. uploads storage
     */
    try {
      const {
        data: buckets,
        error,
      } = await supabase.storage.listBuckets();

      if (!error && Array.isArray(buckets)) {
        result.connected = true;
        result.storageBucket = buckets.some(
          bucket =>
            bucket.name === STORAGE_BUCKET ||
            bucket.id === STORAGE_BUCKET
        );
        result.details.storageAccessible = true;
      }
    } catch {
      // Ignore.
    }

    /**
     * 4. site_content
     *
     * Final architecture does NOT require site_content.
     * We only test it optionally and never mark the connection as failed.
     */
    try {
      const { error } = await supabase
        .from('site_content')
        .select('id')
        .eq('id', 'current')
        .maybeSingle();

      if (!error) {
        result.siteContentTable = true;
      }
    } catch {
      // Optional legacy table — ignore.
    }

    return result;
  } catch (err: any) {
    result.details.error =
      err?.message ||
      'Supabase connection test failed.';

    return result;
  }
}

// ============================================================================
// ADMIN PASSCODE SESSION — production admin portal
// ============================================================================

export type AdminRole = 'male_admin' | 'female_admin';

const ADMIN_ROLE_STORAGE_KEY = 'admin_role';

const ENV_MALE_ADMIN_PASSCODE =
  typeof import.meta !== 'undefined'
    ? String(import.meta.env?.VITE_MALE_ADMIN_PASSCODE || '').trim()
    : '';
const ENV_FEMALE_ADMIN_PASSCODE =
  typeof import.meta !== 'undefined'
    ? String(import.meta.env?.VITE_FEMALE_ADMIN_PASSCODE || '').trim()
    : '';

function adminProfileForRole(role: AdminRole): AdminProfile {
  const now = new Date().toISOString();
  return {
    auth_user_id: `passcode:${role}`,
    username: null,
    full_name: role === 'male_admin' ? 'Male Admin' : 'Female Admin',
    role,
    active: true,
    created_at: now,
    updated_at: now,
  };
}

export function getStoredAdminRole(): AdminRole | null {
  try {
    const value = localStorage.getItem(ADMIN_ROLE_STORAGE_KEY);
    return value === 'male_admin' || value === 'female_admin' ? value : null;
  } catch {
    return null;
  }
}

export async function signInAdmin(passcode: string): Promise<AdminProfile> {
  const cleanPasscode = passcode.trim();
  if (!cleanPasscode) throw new Error('Admin Passcode is required.');

  if (cleanPasscode === ENV_MALE_ADMIN_PASSCODE && ENV_MALE_ADMIN_PASSCODE) {
    localStorage.setItem(ADMIN_ROLE_STORAGE_KEY, 'male_admin');
    return adminProfileForRole('male_admin');
  }

  if (cleanPasscode === ENV_FEMALE_ADMIN_PASSCODE && ENV_FEMALE_ADMIN_PASSCODE) {
    localStorage.setItem(ADMIN_ROLE_STORAGE_KEY, 'female_admin');
    return adminProfileForRole('female_admin');
  }

  throw new Error('Invalid Admin Passcode');
}

export async function signOutAdmin(): Promise<void> {
  localStorage.removeItem(ADMIN_ROLE_STORAGE_KEY);
}

