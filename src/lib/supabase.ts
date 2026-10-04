import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdminProfile } from '../types';

const SUPABASE_PROJECT_URL = 'https://xulkacnjqjnluhmbqbcu.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fQRP801i7hVZYFEz7oMMNg_uvZyZsVX';

const ENV_SUPABASE_URL =
  typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
const ENV_SUPABASE_KEY =
  typeof import.meta !== 'undefined'
    ? (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)
    : undefined;

function resolveSupabaseUrl(): string {
  const candidate = (ENV_SUPABASE_URL || SUPABASE_PROJECT_URL).trim();
  return candidate === SUPABASE_PROJECT_URL || candidate.startsWith(`${SUPABASE_PROJECT_URL}/`)
    ? candidate.replace(/\/+$/, '')
    : SUPABASE_PROJECT_URL;
}

function resolveSupabaseKey(): string {
  const candidate = (ENV_SUPABASE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim();
  return candidate && candidate !== 'YOUR_SUPABASE_PUBLISHABLE_KEY'
    ? candidate
    : DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

function createClientInstance(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export const SUPABASE_URL = resolveSupabaseUrl();
export const SUPABASE_PUBLISHABLE_KEY = resolveSupabaseKey();
export let supabase = createClientInstance(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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
    const { count, error } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true });

    if (!error) {
      result.connected = true;
      result.registrationsTable = true;
      result.details.registrationsCount = count ?? 0;
    } else {
      result.details.error = error.message || 'Unable to access registrations table.';
    }

    const { error: adminError } = await supabase.from('admins').select('id', { head: true });
    if (!adminError) {
      result.connected = true;
      result.adminsTable = true;
      result.details.adminsFound = true;
    }

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (!bucketError && Array.isArray(buckets)) {
      result.connected = true;
      result.storageBucket = buckets.some(
        bucket => bucket.name === STORAGE_BUCKET || bucket.id === STORAGE_BUCKET
      );
      result.details.storageAccessible = true;
    }

    return result;
  } catch (error: any) {
    result.details.error = error?.message || 'Supabase connection test failed.';
    return result;
  }
}

export type AdminRole = 'male_admin' | 'female_admin';

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  if (typeof sessionStorage === 'undefined') return null;

  const storedRole = sessionStorage.getItem('rd27_admin_role');
  const storedPasscode = sessionStorage.getItem('rd27_admin_passcode');

  if (storedRole !== 'male_admin' && storedRole !== 'female_admin') return null;
  if (!storedPasscode) return null;

  // The admin portal uses passcode authentication, not Supabase Auth.
  // Re-validate the stored passcode directly against the same RPC used at login.
  try {
    const { data, error } = await supabase.rpc('verify_admin_passcode', {
      p_passcode: storedPasscode,
    });
    if (error || !data || data.role !== storedRole) return null;

    return {
      id: data.admin_id || `passcode:${data.role}`,
      auth_user_id: `passcode:${data.admin_id || data.role}`,
      username: null,
      full_name: data.role === 'male_admin' ? 'Male Admin' : 'Female Admin',
      role: data.role as AdminRole,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function signInAdmin(passcode: string): Promise<AdminProfile> {
  const cleanPasscode = passcode.trim();
  if (!cleanPasscode) throw new Error('Admin passcode is required.');

  const { data, error } = await supabase.rpc('verify_admin_passcode', {
    p_passcode: cleanPasscode,
  });

  if (error) {
    throw new Error(error.message || 'Unable to verify admin passcode.');
  }

  if (!data || (data.role !== 'male_admin' && data.role !== 'female_admin')) {
    throw new Error('Invalid Admin Passcode');
  }

  const profile: AdminProfile = {
    id: data.admin_id || `passcode:${data.role}`,
    auth_user_id: `passcode:${data.admin_id || data.role}`,
    username: null,
    full_name: data.role === 'male_admin' ? 'Male Admin' : 'Female Admin',
    role: data.role as AdminRole,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  sessionStorage.setItem('rd27_admin_role', data.role);
  sessionStorage.setItem('rd27_admin_passcode', cleanPasscode);

  return profile;
}

export async function signOutAdmin(): Promise<void> {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('rd27_admin_role');
    sessionStorage.removeItem('rd27_admin_passcode');
  }
  await supabase.auth.signOut();
}

export function getStoredAdminRole(): AdminRole | null {
  if (typeof sessionStorage !== 'undefined') {
    const r = sessionStorage.getItem('rd27_admin_role');
    if (r === 'male_admin' || r === 'female_admin') return r;
  }
  return null;
}
