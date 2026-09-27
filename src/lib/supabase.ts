import { createClient } from '@supabase/supabase-js';
import type { AdminProfile } from '../types';

// Environment variables for Supabase
export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://rqjlrbteaqjpgwkeomro.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
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
// ADMIN PASSCODES & ROLES
// Super admin passcode : rdnic27.com
// Male admin passcode  : rdnicboy.27
// Female admin passcode: rdnic.girl27
// ============================================================================
export const ADMIN_PASSCODES: Record<
  string,
  { role: 'super_admin' | 'male_admin' | 'female_admin'; full_name: string; username: string }
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

const ADMIN_SESSION_KEY = 'rd27_admin_session';

/**
 * Sign in an admin using either a dedicated Passcode or Supabase Auth.
 */
export async function signInAdmin(passcodeOrEmail: string, password?: string): Promise<AdminProfile> {
  const cleanInput = (passcodeOrEmail || '').trim();
  const cleanPass = (password || '').trim();

  // 1. Direct match on user-provided passcodes (rdnic27.com, rdnicboy.27, rdnic.girl27)
  const matched = ADMIN_PASSCODES[cleanInput] || (cleanPass ? ADMIN_PASSCODES[cleanPass] : undefined);
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
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(profile));
    } catch {}
    return profile;
  }

  // 2. Supabase Auth fallback if email & password format provided
  if (cleanInput.includes('@') && cleanPass) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanInput,
        password: cleanPass,
      });

      if (!authError && authData?.user) {
        const user = authData.user;
        const { data: adminRecord } = await supabase
          .from('admins')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (adminRecord && adminRecord.active) {
          const profile: AdminProfile = {
            id: adminRecord.id,
            auth_user_id: adminRecord.auth_user_id,
            username: adminRecord.username,
            full_name: adminRecord.full_name,
            role: adminRecord.role,
            active: adminRecord.active,
            created_at: adminRecord.created_at || new Date().toISOString(),
            updated_at: adminRecord.updated_at || new Date().toISOString(),
          };
          try {
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(profile));
          } catch {}
          return profile;
        }
      }
    } catch {
      // Fall through to error
    }
  }

  throw new Error('Invalid passcode. Please enter a valid administrator passcode.');
}

/**
 * Sign out the currently authenticated admin.
 */
export async function signOutAdmin(): Promise<void> {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {}
  await supabase.auth.signOut().catch(() => {});
}

/**
 * Retrieve the current admin profile based on active session or stored passcode session.
 */
export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  try {
    const cached = localStorage.getItem(ADMIN_SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.role && parsed.active) {
        return parsed;
      }
    }
  } catch {}

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
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map(row => ({
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
  } catch {}

  // Active admin roles configured for RagDay27
  return [
    {
      id: 'admin-super',
      auth_user_id: 'rdnic27.com',
      username: 'superadmin',
      full_name: 'Super Administrator',
      role: 'super_admin',
      active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'admin-male',
      auth_user_id: 'rdnicboy.27',
      username: 'maleadmin',
      full_name: 'Male Administrator (Boys)',
      role: 'male_admin',
      active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'admin-female',
      auth_user_id: 'rdnic.girl27',
      username: 'femaleadmin',
      full_name: 'Female Administrator (Girls)',
      role: 'female_admin',
      active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    },
  ];
}

/**
 * Save or update an admin record in public.admins.
 */
export async function saveAdminProfileToSupabase(
  profile: Partial<AdminProfile> & { auth_user_id: string }
): Promise<AdminProfile> {
  const payload = {
    auth_user_id: profile.auth_user_id,
    username: profile.username || null,
    full_name: profile.full_name || 'Admin',
    role: profile.role || 'male_admin',
    active: profile.active ?? true,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('admins')
      .upsert(payload, { onConflict: 'auth_user_id' })
      .select()
      .single();

    if (!error && data) {
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
  } catch {}

  // Fallback representation if table permissions are restricted
  return {
    id: `admin-${profile.role || 'role'}`,
    auth_user_id: profile.auth_user_id,
    username: profile.username || null,
    full_name: profile.full_name || 'Admin',
    role: profile.role || 'male_admin',
    active: profile.active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Remove an admin record from public.admins.
 */
export async function deleteAdminProfileFromSupabase(authUserId: string): Promise<void> {
  try {
    await supabase.from('admins').delete().eq('auth_user_id', authUserId);
  } catch {}
}
