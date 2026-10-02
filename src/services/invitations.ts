import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { mapRowToInvitation, getLocalRegistrations } from './admin';

export async function getPublicInvitation(
  registration_no: string | number
): Promise<{
  success: boolean;
  data: InvitationRecord | null;
  error?: any;
  errorMessage?: string;
}> {
  const value = String(registration_no).trim().toUpperCase();
  if (!value) return { success: false, data: null, errorMessage: 'Registration number is required.' };

  // First check local registry for instant lookup
  const localList = getLocalRegistrations();
  const localMatch = localList.find(
    r =>
      (r.registration_no && r.registration_no.toUpperCase() === value) ||
      (r.id && r.id.toUpperCase() === value)
  );

  if (localMatch && !localMatch.hidden_from_web) {
    if (localMatch.status === 'approved') {
      return { success: true, data: localMatch };
    }
    return {
      success: true,
      data: {
        ...localMatch,
        reject_reason: localMatch.reject_reason,
      },
    };
  }

  const { data, error } = await supabase.rpc('lookup_invitation_card', {
    p_registration_no: value,
    p_student_name: null,
  });

  if (error) {
    return { success: false, data: null, error, errorMessage: error.message };
  }

  if (!data?.found) {
    return {
      success: false,
      data: null,
      errorMessage: data?.status === 'hidden_or_not_found'
        ? 'No public registration was found.'
        : 'No registration found.',
    };
  }

  if (data.status === 'pending' || data.status === 'rejected') {
    return {
      success: true,
      data: {
        id: undefined,
        dbId: undefined,
        registration_no: data.registration_no,
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
