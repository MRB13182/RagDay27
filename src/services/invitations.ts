import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { translateBackendError } from './registrations';
import { mapRowToInvitation } from './admin';

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
  try {
    const rawStr = String(registrationNo).trim();
    const numericMatch = rawStr.match(/\d+/);
    const numericRegNo = numericMatch ? parseInt(numericMatch[0], 10) : null;

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

    if (error) {
      return {
        success: false,
        data: null,
        error,
        errorMessage: translateBackendError(error),
      };
    }

    if (!data) {
      return {
        success: false,
        data: null,
        errorMessage: 'No approved registration found for this registration number.',
      };
    }

    const record = mapRowToInvitation(data);
    return {
      success: true,
      data: record,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
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

  try {
    const numericMatch = clean.match(/\d+/);
    const numericRegNo = numericMatch ? parseInt(numericMatch[0], 10) : null;

    let query = supabase
      .from('registrations')
      .select('registration_no, student_name, roll, student_id, gender, group_name, section_name, status, rejection_reason');

    if (clean.toUpperCase().startsWith('RD27') && numericRegNo !== null) {
      query = query.eq('registration_no', numericRegNo);
    } else {
      query = query.or(`roll.eq.${clean},student_id.eq.${clean},student_name.ilike.%${clean}%`);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      return {
        success: false,
        data: [],
        error,
        errorMessage: translateBackendError(error),
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}
