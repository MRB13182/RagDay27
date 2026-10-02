import { supabase } from '../lib/supabase';
import type { InvitationRecord } from '../types';
import { mapRowToInvitation, getStoredRegistrations } from './admin';

/**
 * Look up an approved invitation card from public.registrations
 */
export async function getPublicInvitation(
  registration_no: string | number
): Promise<{
  success: boolean;
  data: InvitationRecord | null;
  error?: any;
  errorMessage?: string;
}> {
  const rawStr = String(registration_no).trim();

  try {
    let query = supabase
      .from('registrations')
      .select('*')
      .eq('status', 'approved');

    if (rawStr.toUpperCase().startsWith('RDB27') || rawStr.toUpperCase().startsWith('RDG27') || rawStr.toUpperCase().startsWith('RD27')) {
      query = query.eq('registration_no', rawStr);
    } else {
      query = query.or(`registration_no.eq.${rawStr},student_id.eq.${rawStr},class_roll.eq.${rawStr}`);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      const record = mapRowToInvitation(data);
      return {
        success: true,
        data: record,
      };
    }
  } catch {}

  // Fallback to local store
  const stored = getStoredRegistrations();
  const match = stored.find(
    r =>
      r.status === 'approved' &&
      (r.registration_no.toUpperCase() === rawStr.toUpperCase() ||
        r.class_roll === rawStr ||
        r.student_id === rawStr)
  );

  if (match) {
    return { success: true, data: match };
  }

  return {
    success: false,
    data: null,
    errorMessage: 'No approved registration found for this registration number.',
  };
}

/**
 * Searches registrations in public.registrations by:
 * registration_no, full_name, student_id, class_roll (Requirement 13)
 */
export async function searchPublicStudent(
  searchTerm: string
): Promise<{
  success: boolean;
  data: any[];
  error?: any;
  errorMessage?: string;
}> {
  const clean = searchTerm.trim();
  if (!clean) {
    return { success: true, data: [] };
  }

  try {
    let query = supabase
      .from('registrations')
      .select('id, sl_no, registration_no, full_name, class_roll, student_id, contact_mobile_number, academic_group, academic_section, student_photo, send_method, sender_mobile_no, payment_time, transaction_id, jersey_back_name, jersey_number, jersey_size, gender, status, reject_reason');

    query = query.or(`registration_no.ilike.%${clean}%,student_id.ilike.%${clean}%,class_roll.ilike.%${clean}%,full_name.ilike.%${clean}%`);

    const { data, error } = await query.limit(10);

    if (!error && data && data.length > 0) {
      return {
        success: true,
        data: data.map(mapRowToInvitation),
      };
    }
  } catch {}

  // Fallback to local store
  const stored = getStoredRegistrations();
  const lower = clean.toLowerCase();
  const matched = stored
    .filter(
      r =>
        (r.registration_no || '').toLowerCase().includes(lower) ||
        (r.full_name || '').toLowerCase().includes(lower) ||
        (r.class_roll || '').toLowerCase().includes(lower) ||
        (r.student_id || '').toLowerCase().includes(lower)
    );

  return {
    success: true,
    data: matched,
  };
}
