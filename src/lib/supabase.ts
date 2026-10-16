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

import { safeStorage } from './safeStorage';

export const STORAGE_BUCKET = 'uploads';

export type AdminRole = 'male_admin' | 'female_admin';

// In-memory active session credentials only (NEVER persisted to localStorage or sessionStorage)
let activeSessionRole: AdminRole | null = null;
let activeSessionPasscode: string | null = null;

export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  // Never auto-authenticate from persistent storage without active session credentials
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
    activeSessionRole = null;
    activeSessionPasscode = null;
    return null;
  }
}

export async function signInAdmin(passcode: string): Promise<AdminProfile> {
  const cleanPasscode = passcode.trim();
  if (!cleanPasscode) throw new Error('Admin passcode is required.');

  // Enforce server-side authentication via database RPC
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

  // Keep in memory for this active session only
  activeSessionRole = data.role as AdminRole;
  activeSessionPasscode = cleanPasscode;

  // Clear any persistent storage to prevent leakage across browser restarts or other users
  safeStorage.removeItem('rd27_admin_role');
  safeStorage.removeItem('rd27_admin_passcode');

  return profile;
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

export function getStoredAdminRole(): AdminRole | null {
  return activeSessionRole;
}

export function getStoredAdminPasscode(): string | null {
  return activeSessionPasscode;
}
