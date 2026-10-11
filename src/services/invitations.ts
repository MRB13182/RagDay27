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

  // Load complete record directly from registrations table
  let fullRecord = data;
  try {
    const [bRes, gRes] = await Promise.all([
      supabase.rpc('get_admin_registrations', { p_passcode: 'nic27.boy' }),
      supabase.rpc('get_admin_registrations', { p_passcode: 'nic27.girl' }),
    ]);
    const all = [...(bRes.data || []), ...(gRes.data || [])];
    const match = all.find(
      r => r.registration_no?.toUpperCase() === queryRegNo.toUpperCase()
    );
    if (match) {
      fullRecord = {
        ...match,
        found: true,
        status: match.status,
        can_download: match.status === 'approved',
      };
    }
  } catch {
    // fallback to rpc data
  }

  return processFoundData(fullRecord, queryRegNo);
}

function processFoundData(data: any, originalRegNo: string): {
  success: boolean;
  data: InvitationRecord | null;
  errorMessage?: string;
} {
  const mapped = mapRowToInvitation(data);
  return {
    success: true,
    data: {
      ...mapped,
      registration_no: mapped.registration_no || originalRegNo,
    },
  };
}

export async function searchPublicStudent(searchTerm: string, studentName?: string) {
  const clean = searchTerm.trim();
  if (!clean) return { success: true, data: [] as InvitationRecord[] };

  if (!studentName?.trim()) {
    return { success: false, data: [] as InvitationRecord[], errorMessage: 'Student name is required.' };
  }

  // Public lookup intentionally requires the exact registration number and student name.
  const result = await getPublicInvitation(clean, studentName.trim());
  return result.success && result.data ? { success: true, data: [result.data] } : {
    success: false,
    data: [] as InvitationRecord[],
    error: result.error,
    errorMessage: result.errorMessage,
  };
}
