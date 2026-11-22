import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdminProfile } from '../types';

const ENV_SUPABASE_URL =
  typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
const ENV_SUPABASE_KEY =
  typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
    : undefined;

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url.trim(), key.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Missing public backend configuration must never stop the entire React app
 * from mounting. Public pages can render using the bundled event configuration;
 * database-dependent actions fail explicitly until Vercel env vars are added.
 */
const PLACEHOLDER_VALUES = new Set([
  '',
  'YOUR_SUPABASE_PUBLISHABLE_KEY',
  'YOUR_SUPABASE_ANON_KEY',
  'undefined',
  'null',
]);

export const SUPABASE_URL = String(ENV_SUPABASE_URL || '').trim().replace(/\/+$/, '');
export const SUPABASE_PUBLISHABLE_KEY = String(ENV_SUPABASE_KEY || '').trim();
export const isSupabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  !PLACEHOLDER_VALUES.has(SUPABASE_PUBLISHABLE_KEY);

const supabaseClient = isSupabaseConfigured
  ? createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

function createUnavailableQuery(message: string) {
  const result = { data: null, error: { message, code: 'RD27_BACKEND_NOT_CONFIGURED' } };
  const query: any = {
    select: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    eq: () => query,
    neq: () => query,
    is: () => query,
    in: () => query,
    gt: () => query,
    gte: () => query,
    lt: () => query,
    lte: () => query,
    like: () => query,
    ilike: () => query,
    order: () => query,
    limit: () => query,
    range: () => query,
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

const unavailableBackendMessage =
  'The Rag Day portal is open, but its database connection is not configured yet. Please contact the organizers.';

function createUnavailableClient(): any {
  return {
    from: () => createUnavailableQuery(unavailableBackendMessage),
    rpc: async () => ({ data: null, error: { message: unavailableBackendMessage, code: 'RD27_BACKEND_NOT_CONFIGURED' } }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: unavailableBackendMessage, code: 'RD27_BACKEND_NOT_CONFIGURED' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: null, error: { message: unavailableBackendMessage, code: 'RD27_BACKEND_NOT_CONFIGURED' } }),
        list: async () => ({ data: [], error: { message: unavailableBackendMessage, code: 'RD27_BACKEND_NOT_CONFIGURED' } }),
      }),
    },
    auth: {
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}

export const supabase: SupabaseClient = (supabaseClient || createUnavailableClient()) as SupabaseClient;

import { safeStorage } from './safeStorage';

export const STORAGE_BUCKET = 'uploads';

export type AdminRole = 'male_admin';
export type PortalAuthResult =
  | { kind: 'male_admin'; profile: AdminProfile }
  | { kind: 'super_admin' };

// In-memory active session credentials only (NEVER persisted to localStorage or sessionStorage)
let activeSessionRole: AdminRole | null = null;
let activeSessionPasscode: string | null = null;
let activeSuperAdminPasscode: string | null = null;

function buildMaleAdminProfile(adminId?: string): AdminProfile {
  return {
    id: adminId || 'passcode:male_admin',
    auth_user_id: `passcode:${adminId || 'male_admin'}`,
    username: null,
    full_name: 'Male Admin',
    role: 'male_admin',
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  if (!activeSessionRole || !activeSessionPasscode) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('verify_admin_passcode', {
      p_passcode: activeSessionPasscode,
    });
    if (error || !data || data.role !== activeSessionRole) {
      activeSessionRole = null;
      activeSessionPasscode = null;
      return null;
    }

    return buildMaleAdminProfile(data.admin_id);
  } catch {
    activeSessionRole = null;
    activeSessionPasscode = null;
    return null;
  }
}

export async function signInPortalAdmin(passcode: string): Promise<PortalAuthResult> {
  const cleanPasscode = passcode.trim();
  if (!cleanPasscode) {
    throw new Error('Admin passcode is required.');
  }
  if (!isSupabaseConfigured) {
    throw new Error(unavailableBackendMessage);
  }

  // 1. Check Male Admin / Admin table RPC first
  const { data: adminData, error: adminError } = await supabase.rpc('verify_admin_passcode', {
    p_passcode: cleanPasscode,
  });

  if (!adminError && adminData?.role === 'male_admin') {
    activeSessionRole = 'male_admin';
    activeSessionPasscode = cleanPasscode;
    activeSuperAdminPasscode = null;
    safeStorage.removeItem('rd27_admin_role');
    safeStorage.removeItem('rd27_admin_passcode');
    return { kind: 'male_admin', profile: buildMaleAdminProfile(adminData.admin_id) };
  }

  if (!adminError && adminData?.role === 'super_admin') {
    activeSessionRole = null;
    activeSessionPasscode = null;
    activeSuperAdminPasscode = cleanPasscode;
    safeStorage.removeItem('rd27_admin_role');
    safeStorage.removeItem('rd27_admin_passcode');
    return { kind: 'super_admin' };
  }

  // 2. Check dedicated Super Admin server-side RPC
  const { data: superData, error: superError } = await supabase.rpc('verify_super_admin_passcode', {
    p_passcode: cleanPasscode,
  });

  if (!superError && superData?.authorized) {
    activeSessionRole = null;
    activeSessionPasscode = null;
    activeSuperAdminPasscode = cleanPasscode;
    safeStorage.removeItem('rd27_admin_role');
    safeStorage.removeItem('rd27_admin_passcode');
    return { kind: 'super_admin' };
  }

  if (superError && (superError.code === 'PGRST202' || /could not find the function/i.test(superError.message || ''))) {
    // Only if verify_admin_passcode also didn't recognize the code and Super Admin RPC is absent
    throw new Error('Invalid Admin Passcode');
  }

  throw new Error('Invalid Admin Passcode');
}

export async function signInAdmin(passcode: string): Promise<AdminProfile> {
  const result = await signInPortalAdmin(passcode);
  if (result.kind !== 'male_admin') {
    activeSuperAdminPasscode = null;
    throw new Error('Invalid Admin Passcode');
  }
  return result.profile;
}

export function getAdminPasscodeForGallery(): string | null {
  return activeSessionRole === 'male_admin' ? activeSessionPasscode : null;
}

export async function signOutAdmin(): Promise<void> {
  activeSessionRole = null;
  activeSessionPasscode = null;
  safeStorage.removeItem('rd27_admin_role');
  safeStorage.removeItem('rd27_admin_passcode');
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore offline signOut
  }
}

export async function signOutSuperAdmin(): Promise<void> {
  activeSuperAdminPasscode = null;
  safeStorage.removeItem('rd27_admin_role');
  safeStorage.removeItem('rd27_admin_passcode');
}

export function getStoredAdminRole(): AdminRole | null {
  return activeSessionRole;
}

export function getStoredAdminPasscode(): string | null {
  return activeSessionPasscode;
}

export function getStoredSuperAdminPasscode(): string | null {
  return activeSuperAdminPasscode;
}

