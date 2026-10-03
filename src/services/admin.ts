import type { InvitationRecord } from '../types';
import { supabase } from '../lib/supabase';

export function mapRowToInvitation(row: any): InvitationRecord {
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
    gender: row?.gender === 'female' ? 'female' : 'male',
    status: row?.status === 'approved' || row?.status === 'rejected' ? row.status : 'pending',
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

/** Load authoritative registration rows for the authenticated admin. */
export async function getRegistrationList(): Promise<{
  success: boolean;
  data: InvitationRecord[];
  error?: any;
  errorMessage?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_admin_registrations', {});
    if (error) throw error;
    return {
      success: true,
      data: Array.isArray(data) ? data.map(mapRowToInvitation) : [],
    };
  } catch (error:any) {
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
    const { data, error } = await supabase.rpc('approve_registration', {
      p_registration_id: registrationId,
      p_passcode: null,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the approved registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to approve registration.') };
  }
}

export async function rejectRegistration(registrationId: string, reason: string) {
  const cleanReason = reason.trim();
  if (!cleanReason) return { success: false, errorMessage: 'A rejection reason is required.' };
  try {
    const { data, error } = await supabase.rpc('reject_registration', {
      p_registration_id: registrationId,
      p_reason: cleanReason,
      p_passcode: null,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the rejected registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to reject registration.') };
  }
}

export async function deleteRegistration(registrationId: string) {
  try {
    const { data, error } = await supabase.rpc('hide_registration_from_web', {
      p_registration_id: registrationId,
      p_passcode: null,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the hidden registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to hide registration.') };
  }
}
