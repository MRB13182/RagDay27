import type { InvitationRecord } from '../types';
import { supabase } from '../lib/supabase';

export function mapRowToInvitation(row: any): InvitationRecord {
  const rawGender = String(row?.gender || '').trim().toLowerCase();
  const rawStatus = String(row?.status || '').trim().toLowerCase();
  return {
    id: row?.id,
    dbId: row?.id,
    sl_no: row?.sl_no,
    registration_no: row?.registration_no || '',
    full_name: row?.full_name || '',
    class_roll: row?.class_roll || '',
    student_id: row?.student_id || '',
    contact_mobile_number: row?.contact_mobile_number || '',
    academic_group: row?.academic_group || '',
    academic_section: row?.academic_section || '',
    student_photo: row?.student_photo ?? null,
    send_method: row?.send_method === 'nagad' ? 'nagad' : 'bkash',
    sender_mobile_no: row?.sender_mobile_no || '',
    payment_time: row?.payment_time || '',
    transaction_id: row?.transaction_id || undefined,
    jersey_back_name: row?.jersey_back_name || '',
    jersey_number: row?.jersey_number || '',
    jersey_size: row?.jersey_size || 'L',
    gender: rawGender === 'female' ? 'female' : 'male',
    status: rawStatus === 'approved' || rawStatus === 'rejected' ? (rawStatus as 'approved' | 'rejected') : 'pending',
    reject_reason: row?.reject_reason || undefined,
    approved_by: row?.approved_by ?? null,
    rejected_by: row?.rejected_by ?? null,
    approved_at: row?.approved_at ?? null,
    rejected_at: row?.rejected_at ?? null,
    created_at: row?.created_at || '',
    updated_at: row?.updated_at || '',
    hidden_from_web: row?.hidden_from_web ?? false,
    hidden_by: row?.hidden_by ?? null,
    hidden_at: row?.hidden_at ?? null,
  };
}

/**
 * Authoritative admin registration list.
 *
 * IMPORTANT:
 * - Never query public.registrations directly from the browser for admin data.
 * - The RPC is the single admin data-access boundary.
 * - The RPC validates the authenticated Supabase user and derives the admin role
 *   from public.admins, then returns only that role's rows.
 */
export async function getRegistrationList(adminRole?: 'male_admin' | 'female_admin' | null): Promise<{
  success: boolean;
  data: InvitationRecord[];
  error?: any;
  errorMessage?: string;
}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return {
        success: false,
        data: [],
        error: sessionError,
        errorMessage: sessionError.message,
      };
    }

    if (!sessionData.session?.user) {
      return {
        success: false,
        data: [],
        errorMessage: 'Admin authentication session is missing. Please sign in again.',
      };
    }

    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_admin_registrations', {
      p_passcode: null,
    });

    if (rpcErr) {
      return {
        success: false,
        data: [],
        error: rpcErr,
        errorMessage: String(rpcErr.message || 'Unable to load registrations from the admin database function.'),
      };
    }

    if (!Array.isArray(rpcData)) {
      return {
        success: false,
        data: [],
        errorMessage: 'Admin database function returned an invalid registration list.',
      };
    }

    const mapped = rpcData.map(mapRowToInvitation);

    // Defense-in-depth: the database RPC is authoritative. Keep the UI role
    // filter as a sanity check, but never use it as the security boundary.
    const scoped = adminRole
      ? mapped.filter(r => r.gender === (adminRole === 'male_admin' ? 'male' : 'female'))
      : mapped;

    return {
      success: true,
      data: scoped,
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      error,
      errorMessage: String(error?.message || 'Unable to load registrations from database.'),
    };
  }
}

export async function approveRegistration(registrationId: string) {
  try {
    const passcode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rd27_admin_passcode') : null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationId);

    if (isUuid) {
      const { data, error } = await supabase.rpc('approve_registration', {
        p_registration_id: registrationId,
        p_passcode: passcode,
      });
      if (!error && data) return { success: true, data: mapRowToInvitation(data) };
      return { success: false, error, errorMessage: String(error?.message || 'Unable to approve registration.') };
    }

    return { success: false, errorMessage: 'Invalid registration identifier.' };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to approve registration.') };
  }
}

export async function rejectRegistration(registrationId: string, reason: string) {
  const cleanReason = reason.trim();
  if (!cleanReason) return { success: false, errorMessage: 'A rejection reason is required.' };
  try {
    const passcode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rd27_admin_passcode') : null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationId);

    if (isUuid) {
      const { data, error } = await supabase.rpc('reject_registration', {
        p_registration_id: registrationId,
        p_reason: cleanReason,
        p_passcode: passcode,
      });
      if (!error && data) return { success: true, data: mapRowToInvitation(data) };
      return { success: false, error, errorMessage: String(error?.message || 'Unable to reject registration.') };
    }

    return { success: false, errorMessage: 'Invalid registration identifier.' };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to reject registration.') };
  }
}

export async function deleteRegistration(registrationId: string) {
  try {
    const passcode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rd27_admin_passcode') : null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationId);

    if (isUuid) {
      const { data, error } = await supabase.rpc('hide_registration_from_web', {
        p_registration_id: registrationId,
        p_passcode: passcode,
      });
      if (!error && data) return { success: true, data: mapRowToInvitation(data) };
      return { success: false, error, errorMessage: String(error?.message || 'Unable to hide registration.') };
    }

    return { success: false, errorMessage: 'Invalid registration identifier.' };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to hide registration.') };
  }
}
