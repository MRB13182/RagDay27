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
// ADMIN SESSION — Supabase Auth only
// ============================================================================

export async function signInAdmin(
  usernameOrEmail: string,
  password: string
): Promise<AdminProfile> {
  const cleanInput = usernameOrEmail.trim();
  const cleanPassword = password.trim();

  if (!cleanInput || !cleanPassword) {
    throw new Error('Username and password are required.');
  }

  // Supabase Auth accepts email/phone identifiers. The username labels are UI
  // identifiers only; authorization is always resolved from auth.uid() ->
  // public.admins after successful authentication.
  if (!cleanInput.includes('@') && !/^\+?[0-9]{8,15}$/.test(cleanInput)) {
    throw new Error(
      'The Supabase Auth login identifier is not configured for this admin username.'
    );
  }

  const credentials = cleanInput.includes('@')
    ? { email: cleanInput }
    : { phone: cleanInput };

  const { data, error } = await supabase.auth.signInWithPassword({
    ...credentials,
    password: cleanPassword,
  } as Parameters<typeof supabase.auth.signInWithPassword>[0]);

  if (error || !data.user) {
    throw error || new Error('Supabase authentication failed.');
  }

  const { data: adminRecord, error: adminError } = await supabase
    .from('admins')
    .select('id, auth_user_id, full_name, role, active, created_at, updated_at')
    .eq('auth_user_id', data.user.id)
    .eq('active', true)
    .maybeSingle();

  if (adminError) {
    await supabase.auth.signOut();
    throw adminError;
  }

  if (!adminRecord || !['male_admin', 'female_admin'].includes(adminRecord.role)) {
    await supabase.auth.signOut();
    throw new Error('Authenticated user is not an active RagDay27 administrator.');
  }

  return {
    id: adminRecord.id,
    auth_user_id: adminRecord.auth_user_id,
    username: null,
    full_name: adminRecord.full_name,
    role: adminRecord.role as 'male_admin' | 'female_admin',
    active: adminRecord.active,
    created_at: adminRecord.created_at,
    updated_at: adminRecord.updated_at,
  };
}

export async function signOutAdmin(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  const { data: { session }, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) return null;

  const { data: adminRecord, error } = await supabase
    .from('admins')
    .select('id, auth_user_id, full_name, role, active, created_at, updated_at')
    .eq('auth_user_id', session.user.id)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  if (!adminRecord || !['male_admin', 'female_admin'].includes(adminRecord.role)) {
    return null;
  }

  return {
    id: adminRecord.id,
    auth_user_id: adminRecord.auth_user_id,
    username: null,
    full_name: adminRecord.full_name,
    role: adminRecord.role as 'male_admin' | 'female_admin',
    active: adminRecord.active,
    created_at: adminRecord.created_at,
    updated_at: adminRecord.updated_at,
  };
}
