import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { translateBackendError } from './registrations';
import { mapRowToInvitation, getStoredRegistrations } from './admin';

/**
 * Look up an approved invitation card from public.registrations
 */
export async function getPublicInvitation(
  registrationNo: string | number
): Promise<{
  success: boolean;
  data: InvitationRecord | null;
  error?: any;
  errorMessage?: string;
}> {
  const rawStr = String(registrationNo).trim();
  const numericMatch = rawStr.match(/\d+/);
  const numericRegNo = numericMatch ? parseInt(numericMatch[0], 10) : null;

  try {
    let query = supabase
      .from('registrations')
      .select('*')
      .eq('status', 'approved');

    if (numericRegNo !== null && !isNaN(numericRegNo)) {
      query = query.eq('registration_no', numericRegNo);
    } else {
      query = query.or(`student_id.eq.${rawStr},roll.eq.${rawStr}`);
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
      (r.registrationNo.toUpperCase() === rawStr.toUpperCase() ||
        (numericRegNo !== null && r.registrationNo.includes(String(numericRegNo))) ||
        r.roll === rawStr ||
        r.id === rawStr)
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
 * Searches registrations in public.registrations by roll, student ID, or registration number.
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

  const numericMatch = clean.match(/\d+/);
  const numericRegNo = numericMatch ? parseInt(numericMatch[0], 10) : null;

  try {
    let query = supabase
      .from('registrations')
      .select('id, registration_no, student_name, roll, student_id, gender, group_name, section_name, jersey_name, jersey_number, jersey_size, student_photo, status, rejection_reason');

    const isRegPrefix =
      clean.toUpperCase().startsWith('RDB27') ||
      clean.toUpperCase().startsWith('RDG27') ||
      clean.toUpperCase().startsWith('RD27');

    if (isRegPrefix && numericRegNo !== null) {
      query = query.or(
        `registration_no.eq.${numericRegNo},student_id.eq.${clean},roll.eq.${clean},student_name.ilike.%${clean}%`
      );
    } else {
      query = query.or(`roll.eq.${clean},student_id.eq.${clean},student_name.ilike.%${clean}%`);
    }

    const { data, error } = await query.limit(10);

    if (!error && data && data.length > 0) {
      return {
        success: true,
        data,
      };
    }
  } catch {}

  // Fallback to local store
  const stored = getStoredRegistrations();
  const lower = clean.toLowerCase();
  const matched = stored
    .filter(
      r =>
        r.registrationNo.toLowerCase().includes(lower) ||
        r.name.toLowerCase().includes(lower) ||
        r.roll.toLowerCase().includes(lower) ||
        r.id.toLowerCase().includes(lower)
    )
    .map(r => ({
      registration_no: r.registrationNo,
      student_name: r.name,
      roll: r.roll,
      student_id: r.id,
      gender: r.gender,
      group_name: r.group,
      section_name: r.section,
      status: r.status,
      rejection_reason: r.rejectionReason,
    }));

  return {
    success: true,
    data: matched,
  };
}
