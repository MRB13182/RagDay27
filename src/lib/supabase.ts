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
// ADMIN SESSION
// ============================================================================

const ADMIN_SESSION_KEY = 'rd27_admin_session';

/**
 * Current final architecture:
 *   - male_admin
 *   - female_admin
 *
 * NOTE:
 * These passcodes are legacy application-level login values.
 * Supabase Auth remains the preferred secure authentication mechanism.
 */
export const ADMIN_PASSCODES: Record<
  string,
  {
    role: 'super_admin' | 'male_admin' | 'female_admin';
    full_name: string;
    username: string;
  }
> = {
  'rdnic27.com': {
    role: 'super_admin',
    full_name: 'Super Administrator',
    username: 'superadmin',
  },
  'rdnicboy.27': {
    role: 'male_admin',
    full_name: 'Male Administrator (Boys)',
    username: 'maleadmin',
  },
  'rdnic.girl27': {
    role: 'female_admin',
    full_name: 'Female Administrator (Girls)',
    username: 'femaleadmin',
  },
};

/**
 * Sign in an admin.
 */
export async function signInAdmin(
  passcodeOrEmail: string,
  password?: string
): Promise<AdminProfile> {
  const cleanInput = (passcodeOrEmail || '').trim();
  const cleanPass = (password || '').trim();

  /**
   * 1. Legacy passcode login.
   */
  const matched =
    ADMIN_PASSCODES[cleanInput] ||
    (cleanPass
      ? ADMIN_PASSCODES[cleanPass]
      : undefined);

  if (matched) {
    const profile: AdminProfile = {
      id: `admin-${matched.role}`,
      auth_user_id: `passcode-${matched.role}`,
      username: matched.username,
      full_name: matched.full_name,
      role: matched.role,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify(profile)
      );
    } catch {
      // Ignore.
    }

    return profile;
  }

  /**
   * 2. Supabase Auth.
   */
  if (cleanInput.includes('@') && cleanPass) {
    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: cleanInput,
        password: cleanPass,
      });

      if (authError) {
        throw authError;
      }

      if (!authData?.user) {
        throw new Error('Supabase authentication failed.');
      }

      const user = authData.user;

      const {
        data: adminRecord,
        error: adminError,
      } = await supabase
        .from('admins')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (adminError) {
        throw adminError;
      }

      if (!adminRecord || !adminRecord.active) {
        throw new Error(
          'Authenticated user is not an active RagDay27 administrator.'
        );
      }

      const profile: AdminProfile = {
        id: adminRecord.id,
        auth_user_id: adminRecord.auth_user_id,
        username: adminRecord.username ?? null,
        full_name: adminRecord.full_name,
        role: adminRecord.role,
        active: adminRecord.active,
        created_at:
          adminRecord.created_at ||
          new Date().toISOString(),
        updated_at:
          adminRecord.updated_at ||
          new Date().toISOString(),
      };

      try {
        localStorage.setItem(
          ADMIN_SESSION_KEY,
          JSON.stringify(profile)
        );
      } catch {
        // Ignore.
      }

      return profile;
    } catch {
      // Continue to final error.
    }
  }

  throw new Error(
    'Invalid administrator credentials.'
  );
}

/**
 * Sign out current admin.
 */
export async function signOutAdmin(): Promise<void> {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // Ignore.
  }

  await supabase.auth.signOut().catch(() => {});
}

/**
 * Get current admin profile.
 */
export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  /**
   * 1. Cached legacy/session profile.
   */
  try {
    const cached =
      localStorage.getItem(ADMIN_SESSION_KEY);

    if (cached) {
      const parsed = JSON.parse(cached);

      if (
        parsed &&
        parsed.role &&
        parsed.active
      ) {
        return parsed;
      }
    }
  } catch {
    // Ignore.
  }

  /**
   * 2. Supabase Auth session.
   */
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const {
      data: adminRecord,
      error,
    } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (
      error ||
      !adminRecord ||
      !adminRecord.active
    ) {
      return null;
    }

    return {
      id: adminRecord.id,
      auth_user_id: adminRecord.auth_user_id,
      username: adminRecord.username ?? null,
      full_name: adminRecord.full_name,
      role: adminRecord.role,
      active: adminRecord.active,
      created_at: adminRecord.created_at,
      updated_at: adminRecord.updated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch admins from Supabase.
 *
 * IMPORTANT:
 * No fake/legacy fallback admin list is returned.
 * Database is the source of truth.
 */
export async function fetchAdminsFromSupabase(): Promise<AdminProfile[]> {
  try {
    const {
      data,
      error,
    } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      auth_user_id: row.auth_user_id,
      username: row.username ?? null,
      full_name: row.full_name,
      role: row.role,
      active: row.active,
      created_at:
        row.created_at ||
        new Date().toISOString(),
      updated_at:
        row.updated_at ||
        new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Save/update admin profile in Supabase.
 */
export async function saveAdminProfileToSupabase(
  profile: Partial<AdminProfile> & {
    auth_user_id: string;
  }
): Promise<AdminProfile> {
  const payload = {
    auth_user_id: profile.auth_user_id,
    full_name:
      profile.full_name || 'Admin',
    role:
      profile.role === 'female_admin'
        ? 'female_admin'
        : 'male_admin',
    active:
      profile.active ?? true,
    updated_at: new Date().toISOString(),
  };

  const {
    data,
    error,
  } = await supabase
    .from('admins')
    .upsert(payload, {
      onConflict: 'auth_user_id',
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Unable to save admin profile: ${error.message}`
    );
  }

  return {
    id: data.id,
    auth_user_id: data.auth_user_id,
    username: data.username ?? null,
    full_name: data.full_name,
    role: data.role,
    active: data.active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Delete admin profile.
 */
export async function deleteAdminProfileFromSupabase(
  authUserId: string
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('admins')
    .delete()
    .eq('auth_user_id', authUserId);

  if (error) {
    throw new Error(
      `Unable to delete admin profile: ${error.message}`
    );
  }
}
