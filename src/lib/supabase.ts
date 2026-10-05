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

function resolveSupabaseUrl(): string {
  const candidate = String(ENV_SUPABASE_URL || '').trim();
  if (!candidate) {
    throw new Error('VITE_SUPABASE_URL is not configured.');
  }
  return candidate.replace(/\/+$/, '');
}

function resolveSupabaseKey(): string {
  const candidate = String(ENV_SUPABASE_KEY || '').trim();
  if (!candidate) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY is not configured.');
  }
  return candidate;
}

export const SUPABASE_URL = resolveSupabaseUrl();
export const SUPABASE_PUBLISHABLE_KEY = resolveSupabaseKey();
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const STORAGE_BUCKET = 'uploads';

export type AdminRole = 'male_admin' | 'female_admin';

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  if (typeof sessionStorage === 'undefined') return null;

  const storedRole = sessionStorage.getItem('rd27_admin_role');
  const storedPasscode = sessionStorage.getItem('rd27_admin_passcode');

  if (storedRole !== 'male_admin' && storedRole !== 'female_admin') return null;
  if (!storedPasscode) return null;

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
    const role = sessionStorage.getItem('rd27_admin_role');
    if (role === 'male_admin' || role === 'female_admin') return role;
  }
  return null;
}
