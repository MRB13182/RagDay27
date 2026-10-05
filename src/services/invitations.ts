import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { mapRowToInvitation } from './admin';

export async function getPublicInvitation(
  registration_no: string | number,
  student_name: string
): Promise<{
  success: boolean;
  data: InvitationRecord | null;
  error?: any;
  errorMessage?: string;
}> {
  const cleanReg = String(registration_no || '').trim().toUpperCase();
  const cleanName = String(student_name || '').trim();

  if (!cleanReg) {
    return { success: false, data: null, errorMessage: 'Registration number is required.' };
  }

  if (!cleanName) {
    return { success: false, data: null, errorMessage: 'Student name is required.' };
  }

  if (!/^[A-Z0-9-]+$/i.test(cleanReg)) {
    return { success: false, data: null, errorMessage: 'Invalid registration number.' };
  }

  // Canonical format is RD27-01. Accept compact RD27-1 as user input.
  let queryRegNo = cleanReg;
  const matchShort = cleanReg.match(/^(RD27-)(\d{1,2})$/i);
  if (matchShort) {
    queryRegNo = `${matchShort[1]}${matchShort[2].padStart(2, '0')}`;
  }

  // Attempt RPC with both parameters
  let { data, error } = await supabase.rpc('lookup_invitation_card', {
    p_registration_no: queryRegNo,
    p_student_name: cleanName,
  });

  // Backward compatibility fallback if database has not yet been migrated to 2-arg signature
  if (error && error.code === 'PGRST202') {
    const fallback = await supabase.rpc('lookup_invitation_card', {
      p_registration_no: queryRegNo,
    });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { success: false, data: null, error, errorMessage: error.message };
  }

  if (!data?.found) {
    return {
      success: false,
      data: null,
      errorMessage: data?.status === 'name_mismatch'
        ? 'Student Name does not match the registration record.'
        : data?.status === 'hidden_or_not_found'
        ? 'No public registration was found.'
        : 'No registration found for this Registration Number.',
    };
  }

  // Database verification: Name must match exactly (case-insensitive)
  const recordName = String(data.full_name || '').trim().toLowerCase();
  if (recordName !== cleanName.toLowerCase()) {
    return {
      success: false,
      data: null,
      errorMessage: 'Student Name does not match the registration record.',
    };
  }

  return processFoundData(data, queryRegNo);
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

export async function searchPublicStudent(searchTerm: string) {
  const clean = searchTerm.trim();
  if (!clean) return { success: true, data: [] as InvitationRecord[] };

  // Public lookup intentionally requires the exact registration number.
  const result = await getPublicInvitation(clean);
  return result.success && result.data ? { success: true, data: [result.data] } : {
    success: false,
    data: [] as InvitationRecord[],
    error: result.error,
    errorMessage: result.errorMessage,
  };
}
