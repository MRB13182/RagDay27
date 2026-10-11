import type { InvitationRecord } from '../types';
import { supabase, getStoredAdminPasscode } from '../lib/supabase';
import { toNullableUuid } from './registrations';
import { resolveStudentPhotoUrl } from './storage';

export function mapRowToInvitation(row: any): InvitationRecord {
  const rawGender = String(row?.gender || '').trim().toLowerCase();
  const rawStatus = String(row?.status || '').trim().toLowerCase();
  const validUuid = toNullableUuid(row?.id) || row?.id || undefined;
  return {
    id: validUuid,
    dbId: validUuid,
    sl_no: row?.sl_no,
    registration_no: row?.registration_no || '',
    full_name: row?.full_name || '',
    class_roll: row?.class_roll || '',
    student_id: row?.student_id || '',
    contact_mobile_number: row?.contact_mobile_number || '',
    academic_group: row?.academic_group || '',
    academic_section: row?.academic_section || '',
    student_photo: resolveStudentPhotoUrl(row?.student_photo) ?? null,
    send_method: row?.send_method === 'nagad' ? 'nagad' : 'bkash',
    sender_mobile_no: row?.sender_mobile_no || '',
    payment_time: row?.payment_time || '',
    transaction_id: row?.transaction_id || undefined,
    jersey_back_name: row?.jersey_back_name || '',
    jersey_number: row?.jersey_number || '',
    jersey_size: row?.jersey_size || 'L',
    gender: rawGender === 'female' ? 'female' : 'male',
    status: rawStatus === 'approved' || rawStatus === 'rejected' ? rawStatus : 'pending',
    reject_reason: row?.reject_reason || undefined,
    approved_by: toNullableUuid(row?.approved_by),
    rejected_by: toNullableUuid(row?.rejected_by),
    approved_at: row?.approved_at ?? null,
    rejected_at: row?.rejected_at ?? null,
    created_at: row?.created_at || '',
    updated_at: row?.updated_at || '',
    hidden_from_web: row?.hidden_from_web ?? false,
    hidden_by: toNullableUuid(row?.hidden_by),
    hidden_at: row?.hidden_at ?? null,
  };
}

export async function getRegistrationList(): Promise<{ success: boolean; data: InvitationRecord[]; error?: any; errorMessage?: string }> {
  try {
    const passcode = getStoredAdminPasscode();

    if (!passcode) {
      return { success: false, data: [], errorMessage: 'Admin passcode session is missing. Please sign in again.' };
    }

    const { data, error } = await supabase.rpc('get_admin_registrations', { p_passcode: passcode });
    if (error) {
      return { success: false, data: [], error, errorMessage: String(error.message || 'Unable to load registrations from the admin database function.') };
    }

    if (!Array.isArray(data)) {
      return { success: false, data: [], errorMessage: 'Admin database function returned an invalid registration list.' };
    }

    return { success: true, data: data.map(mapRowToInvitation) };
  } catch (error: any) {
    return { success: false, data: [], error, errorMessage: String(error?.message || 'Unable to load registrations from database.') };
  }
}

function cleanRegistrationNo(value: string): string {
  const clean = value.trim().toUpperCase();
  const short = clean.match(/^(RD27-)(\d{1,})$/i);
  return short ? `${short[1]}${short[2].padStart(2, '0')}` : clean;
}

export async function approveRegistration(registrationNo: string): Promise<{
  success: boolean;
  data?: InvitationRecord;
  error?: any;
  errorMessage?: string;
}> {
  const passcode = getStoredAdminPasscode();
  const regNo = cleanRegistrationNo(registrationNo);

  if (!passcode) return { success: false, errorMessage: 'Admin passcode session is missing. Please sign in again.' };
  if (!/^RD27-\d+$/i.test(regNo)) return { success: false, errorMessage: 'Invalid registration number.' };

  try {
    let result = await supabase.rpc('approve_registration', {
      p_passcode: passcode,
      p_registration_no: regNo,
    });

    if (result.error && result.error.code === 'PGRST202') {
      result = await supabase.rpc('approve_registration', {
        p_registration_no: regNo,
        p_passcode: passcode,
      });
    }

    if (result.error) {
      return {
        success: false,
        error: result.error,
        errorMessage: String(result.error.message || 'Unable to approve registration.')
      };
    }

    if (!result.data) {
      return {
        success: false,
        errorMessage: 'Database did not return the updated registration record.'
      };
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    const mapped = mapRowToInvitation(row);
    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to approve registration.') };
  }
}

export async function rejectRegistration(
  registrationNo: string,
  reason: string
): Promise<{
  success: boolean;
  data?: InvitationRecord;
  error?: any;
  errorMessage?: string;
}> {
  const cleanReason = reason.trim();
  const passcode = getStoredAdminPasscode();
  const regNo = cleanRegistrationNo(registrationNo);

  if (!cleanReason) return { success: false, errorMessage: 'A rejection reason is required.' };
  if (!passcode) return { success: false, errorMessage: 'Admin passcode session is missing. Please sign in again.' };
  if (!/^RD27-\d+$/i.test(regNo)) return { success: false, errorMessage: 'Invalid registration number.' };

  try {
    let result = await supabase.rpc('reject_registration', {
      p_passcode: passcode,
      p_registration_no: regNo,
      p_reason: cleanReason,
    });

    if (result.error && result.error.code === 'PGRST202') {
      result = await supabase.rpc('reject_registration', {
        p_passcode: passcode,
        p_reason: cleanReason,
        p_registration_no: regNo,
      });
    }

    if (result.error) {
      return {
        success: false,
        error: result.error,
        errorMessage: String(result.error.message || 'Unable to reject registration.')
      };
    }

    if (!result.data) {
      return {
        success: false,
        errorMessage: 'Database did not return the updated registration record.'
      };
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    const mapped = mapRowToInvitation(row);
    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to reject registration.') };
  }
}

export async function deleteRegistration(registrationNo: string) {
  const passcode = getStoredAdminPasscode();
  const regNo = cleanRegistrationNo(registrationNo);

  if (!passcode) return { success: false, errorMessage: 'Admin passcode session is missing. Please sign in again.' };
  if (!/^RD27-\d+$/i.test(regNo)) return { success: false, errorMessage: 'Invalid registration number.' };

  try {
    let result = await supabase.rpc('hide_registration_from_web', {
      p_passcode: passcode,
      p_registration_no: regNo,
    });

    if (result.error && result.error.code === 'PGRST202') {
      result = await supabase.rpc('hide_registration_from_web', {
        p_registration_no: regNo,
        p_passcode: passcode,
      });
    }

    if (result.error) return { success: false, error: result.error, errorMessage: String(result.error.message || 'Unable to hide registration from web.') };
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return { success: true, data: row ? mapRowToInvitation(row) : undefined };
  } catch (error: any) {
    return { success: false, error, errorMessage: String(error?.message || 'Unable to hide registration from web.') };
  }
}
