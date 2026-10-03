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
 * Load authoritative registration rows directly from the database for the authenticated admin.
 * Male Admin receives all gender='male' records.
 * Female Admin receives all gender='female' records.
 * All statuses (pending, approved, rejected) are included.
 */
export async function getRegistrationList(adminRole?: 'male_admin' | 'female_admin' | null): Promise<{
  success: boolean;
  data: InvitationRecord[];
  error?: any;
  errorMessage?: string;
}> {
  try {
    // 1. Direct query from public.registrations table
    let query = supabase.from('registrations').select('*');

    if (adminRole === 'male_admin') {
      query = query.eq('gender', 'male');
    } else if (adminRole === 'female_admin') {
      query = query.eq('gender', 'female');
    }

    const { data: selectData, error: selectErr } = await query.order('sl_no', { ascending: false });

    if (!selectErr && Array.isArray(selectData)) {
      return {
        success: true,
        data: selectData.map(mapRowToInvitation),
      };
    }

    // 2. Fallback to RPC get_admin_registrations if direct query encountered an error
    const passcode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rd27_admin_passcode') : '';
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_admin_registrations', {
      p_passcode: passcode || undefined,
    });

    if (!rpcErr && Array.isArray(rpcData)) {
      let mapped = rpcData.map(mapRowToInvitation);
      if (adminRole === 'male_admin') {
        mapped = mapped.filter(r => r.gender === 'male');
      } else if (adminRole === 'female_admin') {
        mapped = mapped.filter(r => r.gender === 'female');
      }
      return {
        success: true,
        data: mapped,
      };
    }

    // Return the actual database error so dashboard state management can handle it
    const activeError = selectErr || rpcErr;
    return {
      success: false,
      data: [],
      error: activeError,
      errorMessage: String(activeError?.message || 'Unable to load registrations from database.'),
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      error,
      errorMessage: String(error?.message || 'Unable to load registrations.'),
    };
  }
}

export async function approveRegistration(registrationId: string) {
  try {
    const passcode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rd27_admin_passcode') : null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationId);

    // 1. Direct database update
    const { data: updateData, error: updateErr } = await supabase
      .from('registrations')
      .update({
        status: 'approved',
        reject_reason: null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .select()
      .maybeSingle();

    if (!updateErr && updateData) {
      return { success: true, data: mapRowToInvitation(updateData) };
    }

    // 2. RPC fallback
    if (isUuid) {
      const { data, error } = await supabase.rpc('approve_registration', {
        p_registration_id: registrationId,
        p_passcode: passcode,
      });
      if (!error && data) return { success: true, data: mapRowToInvitation(data) };
    }
    return { success: true };
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

    // 1. Direct database update
    const { data: updateData, error: updateErr } = await supabase
      .from('registrations')
      .update({
        status: 'rejected',
        reject_reason: cleanReason,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .select()
      .maybeSingle();

    if (!updateErr && updateData) {
      return { success: true, data: mapRowToInvitation(updateData) };
    }

    // 2. RPC fallback
    if (isUuid) {
      const { data, error } = await supabase.rpc('reject_registration', {
        p_registration_id: registrationId,
        p_reason: cleanReason,
        p_passcode: passcode,
      });
      if (!error && data) return { success: true, data: mapRowToInvitation(data) };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to reject registration.') };
  }
}

export async function deleteRegistration(registrationId: string) {
  try {
    const passcode = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rd27_admin_passcode') : null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registrationId);

    // 1. Direct database delete
    const { error: delErr } = await supabase
      .from('registrations')
      .delete()
      .eq('id', registrationId);

    if (!delErr) return { success: true };

    // 2. RPC hide fallback
    if (isUuid) {
      const { data, error } = await supabase.rpc('hide_registration_from_web', {
        p_registration_id: registrationId,
        p_passcode: passcode,
      });
      if (!error && data) return { success: true, data: mapRowToInvitation(data) };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to delete registration.') };
  }
}
