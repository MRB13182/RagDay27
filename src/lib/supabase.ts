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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('admins')
    .select('id, auth_user_id, full_name, role, active, created_at, updated_at')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (error || !data || (data.role !== 'male_admin' && data.role !== 'female_admin')) {
    return null;
  }

  return {
    id: data.id,
    auth_user_id: data.auth_user_id,
    username: null,
    full_name: data.full_name,
    role: data.role as AdminRole,
    active: data.active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function signInAdmin(passcode: string): Promise<AdminProfile> {
  const cleanPasscode = passcode.trim();
  if (!cleanPasscode) throw new Error('Admin passcode is required.');

  const { data, error } = await supabase.rpc('verify_admin_passcode', {
    p_passcode: cleanPasscode,
  });

  if (error || !data || (data.role !== 'male_admin' && data.role !== 'female_admin')) {
    throw new Error('Invalid Admin Passcode');
  }

  return {
    auth_user_id: `passcode:${data.admin_id}`,
    username: null,
    full_name: data.role === 'male_admin' ? 'Male Admin' : 'Female Admin',
    role: data.role,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

export function getStoredAdminRole(): AdminRole | null {
  return null;
}
