import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { translateBackendError } from './registrations';

const ADMIN_SESSION_KEY = 'admin_passcode_session';

export function setAdminPasscodeSession(passcode: string): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, passcode);
}

export function clearAdminPasscodeSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

function getAdminPasscode(): string {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) || '';
}

/**
 * Maps a public.registrations database row to InvitationRecord.
 */
export function mapRowToInvitation(row: any): InvitationRecord {
  const regNoNum = row.registration_no;
  const isFemale = row.gender === 'female';
  const prefix = isFemale ? 'RDG27' : 'RDB27';

  let regNoFormatted = 'Pending';
  if (regNoNum) {
    const str = String(regNoNum);
    if (str.startsWith('RDB27-') || str.startsWith('RDG27-') || str.startsWith('RD27-')) {
      regNoFormatted = str;
    } else {
      regNoFormatted = `${prefix}-${str.padStart(4, '0')}`;
    }
  }

  return {
    id: row.id,
    dbId: row.id,
    sl_no: row.sl_no !== undefined && row.sl_no !== null ? Number(row.sl_no) : undefined,
    registration_no: regNoFormatted,
    full_name: row.full_name || '',
    class_roll: row.class_roll || '',
    student_id: row.student_id || '',
    contact_mobile_number: row.contact_mobile_number || '',
    academic_group: row.academic_group || '',
    academic_section: row.academic_section || '',
    student_photo: row.student_photo || null,
    send_method: (row.send_method || 'bkash') as 'bkash' | 'nagad',
    sender_mobile_no: row.sender_mobile_no || '',
    payment_time: row.payment_time || '12:00:00',
    transaction_id: row.transaction_id || undefined,
    jersey_back_name: row.jersey_back_name || '',
    jersey_number: row.jersey_number || '',
    jersey_size: row.jersey_size || 'L',
    gender: (row.gender as any) || 'male',
    status: (row.status as InvitationStatus) || 'pending',
    reject_reason: row.reject_reason || undefined,
    approved_by: row.approved_by || null,
    rejected_by: row.rejected_by || null,
    approved_at: row.approved_at || null,
    rejected_at: row.rejected_at || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    hidden_from_web: row.hidden_from_web ?? false,
    hidden_by: row.hidden_by || null,
    hidden_at: row.hidden_at || null,
  };
}

/** Load only the registrations authorized by the current admin passcode. */
export async function getRegistrationList(passcode: string = getAdminPasscode()): Promise<{
  success: boolean;
  data: InvitationRecord[];
  error?: any;
  errorMessage?: string;
}> {
  try {
    const cleanPasscode = passcode.trim();
    if (!cleanPasscode) {
      return { success: false, data: [], errorMessage: 'Admin session is not available.' };
    }

    const { data, error } = await supabase.rpc('get_admin_registrations', {
      p_passcode: cleanPasscode,
    });

    if (error) throw error;
    return {
      success: true,
      data: (Array.isArray(data) ? data : data ? [data] : []).map(mapRowToInvitation),
    };
  } catch (error:any) {
    return { success: false, data: [], error, errorMessage: translateBackendError(error) };
  }
}

export async function approveRegistration(registrationId: string, passcode: string = getAdminPasscode()) {
  try {
    const { data, error } = await supabase.rpc('approve_registration', {
      p_registration_id: registrationId,
      p_passcode: passcode,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the approved registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: translateBackendError(error) };
  }
}

export async function rejectRegistration(
  registrationId: string,
  reason: string,
  passcode: string = getAdminPasscode()
) {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    return { success: false, errorMessage: 'A rejection reason is required.' };
  }
  try {
    const { data, error } = await supabase.rpc('reject_registration', {
      p_registration_id: registrationId,
      p_reason: cleanReason,
      p_passcode: passcode,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the rejected registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: translateBackendError(error) };
  }
}

export async function deleteRegistration(
  registrationId: string,
  passcode: string = getAdminPasscode()
) {
  try {
    const { data, error } = await supabase.rpc('hide_registration_from_web', {
      p_registration_id: registrationId,
      p_passcode: passcode,
    });
    if (error) throw error;
    if (!data) throw new Error('Database did not return the hidden registration.');
    return { success: true, data: mapRowToInvitation(data) };
  } catch (error:any) {
    return { success: false, error, errorMessage: translateBackendError(error) };
  }
}
