import { createClient } from '@supabase/supabase-js';
import type { AdminProfile } from '../types';

// Environment variables for Supabase
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://rqjlrbteaqjpgwkeomro.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_BcoEceXY8X9BxifFSMRjoA_neWVF9wb';

// Central Supabase Client (browser-safe publishable/anon key only)
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Storage Bucket Name
export const STORAGE_BUCKET = 'uploads';

// ============================================================================
// ADMIN AUTHENTICATION & IDENTITY HELPERS (Backed by public.admins table)
// ============================================================================

/**
 * Sign in an admin using Supabase Auth, then verify active role in the admins table.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminProfile> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData?.user) {
    throw new Error(authError?.message || 'Invalid email or password.');
  }

  const user = authData.user;

  // Verify membership in public.admins table
  const { data: adminRecord, error: adminError } = await supabase
    .from('admins')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (adminError || !adminRecord) {
    await supabase.auth.signOut();
    throw new Error('Access denied: Your account is not configured as an active administrator.');
  }

  if (!adminRecord.active) {
    await supabase.auth.signOut();
    throw new Error('Access denied: Your administrator account has been disabled.');
  }

  return {
    id: adminRecord.id,
    auth_user_id: adminRecord.auth_user_id,
    username: adminRecord.username,
    full_name: adminRecord.full_name,
    role: adminRecord.role,
    active: adminRecord.active,
    created_at: adminRecord.created_at || new Date().toISOString(),
    updated_at: adminRecord.updated_at || new Date().toISOString(),
  };
}

/**
 * Sign out the currently authenticated admin.
 */
export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Retrieve the current admin profile from the admins table based on active session.
 */
export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: adminRecord, error } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (error || !adminRecord || !adminRecord.active) {
      return null;
    }

    return {
      id: adminRecord.id,
      auth_user_id: adminRecord.auth_user_id,
      username: adminRecord.username,
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
 * Fetch all admin links (for Super Admin management).
 */
export async function fetchAdminsFromSupabase(): Promise<AdminProfile[]> {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch admin list.');
  }

  return (data || []).map(row => ({
    id: row.id,
    auth_user_id: row.auth_user_id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Save or update an admin record in public.admins.
 */
export async function saveAdminProfileToSupabase(profile: Partial<AdminProfile> & { auth_user_id: string }): Promise<AdminProfile> {
  const payload = {
    auth_user_id: profile.auth_user_id,
    username: profile.username || null,
    full_name: profile.full_name || 'Admin',
    role: profile.role || 'male_admin',
    active: profile.active ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('admins')
    .upsert(payload, { onConflict: 'auth_user_id' })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save admin record.');
  }

  return {
    id: data.id,
    auth_user_id: data.auth_user_id,
    username: data.username,
    full_name: data.full_name,
    role: data.role,
    active: data.active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Remove an admin record from public.admins.
 */
export async function deleteAdminProfileFromSupabase(authUserId: string): Promise<void> {
  const { error } = await supabase
    .from('admins')
    .delete()
    .eq('auth_user_id', authUserId);

  if (error) {
    throw new Error(error.message || 'Failed to delete admin profile.');
  }
}
