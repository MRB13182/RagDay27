import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { mapRowToInvitation } from './admin';

export async function getPublicInvitation(
  registration_no: string | number,
  studentName: string
): Promise<{
  success: boolean;
  data: InvitationRecord | null;
  error?: any;
  errorMessage?: string;
}> {
  const value = String(registration_no).trim().toUpperCase();
  // Registration number is the sole lookup key. The name field is retained in the function signature for compatibility.
  if (!/^[A-Z0-9-]+$/i.test(value)) {
    return { success: false, data: null, errorMessage: 'Invalid registration number.' };
  }

  // Accept compact input such as RD27-1 and normalize it to the database's four-digit storage format.
  let queryRegNo = value;
  const matchShort = value.match(/^(RD27-)(\\d{1,3})$/i);
  if (matchShort) {
    queryRegNo = `${matchShort[1]}${matchShort[2].padStart(4, '0')}`;
  }

  const { data, error } = await supabase.rpc('lookup_invitation_card', {
    p_registration_no: queryRegNo,
    p_student_name: null,
  });

  if (error) {
    return { success: false, data: null, error, errorMessage: error.message };
  }

  if (!data?.found) {
    // If not found with padded queryRegNo and queryRegNo !== value, try with original value
    if (queryRegNo !== value) {
      const retry = await supabase.rpc('lookup_invitation_card', {
        p_registration_no: value,
        p_student_name: null,
      });
      if (!retry.error && retry.data?.found) {
        return processFoundData(retry.data, value);
      }
    }

    return {
      success: false,
      data: null,
      errorMessage: data?.status === 'hidden_or_not_found'
        ? 'No public registration was found.'
        : 'No registration found.',
    };
  }

  return processFoundData(data, value);
}

function processFoundData(data: any, originalRegNo: string): {
  success: boolean;
  data: InvitationRecord | null;
  errorMessage?: string;
} {
  if (data.status === 'pending' || data.status === 'rejected') {
    return {
      success: true,
      data: {
        id: undefined,
        dbId: undefined,
        registration_no: data.registration_no || originalRegNo,
        full_name: data.full_name || '',
        class_roll: '',
        student_id: '',
        contact_mobile_number: '',
        academic_group: '',
        academic_section: '',
        student_photo: null,
        send_method: 'bkash',
        sender_mobile_no: '',
        payment_time: '',
        transaction_id: undefined,
        jersey_back_name: '',
        jersey_number: '',
        jersey_size: 'L',
        gender: 'male',
        status: data.status as InvitationStatus,
        reject_reason: data.reject_reason || undefined,
        rejected_at: data.rejected_at || null,
        approved_by: null,
        rejected_by: null,
        approved_at: null,
        created_at: '',
        updated_at: '',
      },
    };
  }

  return { success: true, data: mapRowToInvitation(data) };
}

export async function searchPublicStudent(searchTerm: string, studentName = '') {
  const clean = searchTerm.trim();
  if (!clean) return { success: true, data: [] as InvitationRecord[] };

  // Public lookup intentionally requires the exact registration number.
  const result = await getPublicInvitation(clean, studentName);
  return result.success && result.data ? { success: true, data: [result.data] } : {
    success: false,
    data: [] as InvitationRecord[],
    error: result.error,
    errorMessage: result.errorMessage,
  };
}
