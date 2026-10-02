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

const currentConfig = {
  url: resolveSupabaseUrl(),
  key: resolveSupabaseKey(),
};

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
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
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
 // ============================================================================
// ADMIN PASSCODE SESSION — production admin portal
// ============================================================================

export type AdminRole = 'male_admin' | 'female_admin';

const ADMIN_ROLE_STORAGE_KEY = 'admin_role';

function safeSessionStorage(): Storage | null {
  try {
    const storage = window.sessionStorage;
    const testKey = '__rd27_session_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

function safeGetSessionValue(key: string): string | null {
  const storage = safeSessionStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionValue(key: string, value: string): boolean {
  const storage = safeSessionStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveSessionValue(key: string): void {
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Best-effort cleanup only.
  }
}

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
  const value = safeGetSessionValue(ADMIN_ROLE_STORAGE_KEY);
  return value === 'male_admin' || value === 'female_admin' ? value : null;
}

export const MALE_ADMIN_PASSCODE = 'nicboy.27';
export const FEMALE_ADMIN_PASSCODE = 'nic27.girl';

export async function signInAdmin(passcode: string): Promise<AdminProfile> {
  const cleanPasscode = passcode.trim();
  if (!cleanPasscode) throw new Error('Admin Passcode is required.');

  const envMale = typeof import.meta !== 'undefined'
    ? String(import.meta.env?.VITE_MALE_ADMIN_PASSCODE || '').trim()
    : '';
  const envFemale = typeof import.meta !== 'undefined'
    ? String(import.meta.env?.VITE_FEMALE_ADMIN_PASSCODE || '').trim()
    : '';

  let role: AdminRole | null = null;

  if (
    cleanPasscode === MALE_ADMIN_PASSCODE ||
    cleanPasscode.toLowerCase() === 'nicboy.27' ||
    (envMale && cleanPasscode === envMale)
  ) {
    role = 'male_admin';
  } else if (
    cleanPasscode === FEMALE_ADMIN_PASSCODE ||
    cleanPasscode.toLowerCase() === 'nic27.girl' ||
    (envFemale && cleanPasscode === envFemale)
  ) {
    role = 'female_admin';
  } else {
    try {
      const { data, error } = await supabase.rpc('verify_admin_passcode', {
        p_passcode: cleanPasscode,
      });
      if (!error && (data?.role === 'male_admin' || data?.role === 'female_admin')) {
        role = data.role;
      }
    } catch {
      // Fall through to invalid passcode check
    }
  }

  if (!role) {
    throw new Error('Invalid Admin Passcode');
  }

  safeSetSessionValue(ADMIN_ROLE_STORAGE_KEY, role);
  return adminProfileForRole(role);
}
export async function signOutAdmin(): Promise<void> {
  safeRemoveSessionValue(ADMIN_ROLE_STORAGE_KEY);
}
