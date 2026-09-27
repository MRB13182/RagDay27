import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { translateBackendError } from './registrations';

/**
 * Maps a public.registrations database row to InvitationRecord
 */
export function mapRowToInvitation(row: any): InvitationRecord {
  const regNoNum = row.registration_no;
  const regNoFormatted = regNoNum
    ? String(regNoNum).startsWith('RD27')
      ? String(regNoNum)
      : `RD27-${String(regNoNum).padStart(3, '0')}`
    : 'Pending';

  return {
    dbId: row.id,
    registrationNo: regNoFormatted,
    name: row.student_name || 'Student',
    roll: row.roll || '',
    id: row.student_id || '',
    group: row.group_name || '',
    section: row.section_name || '',
    status: (row.status as InvitationStatus) || 'pending',
    gender: (row.gender as any) || 'male',
    photoUrl: row.student_photo || '',
    contactNumber: row.sender_number || '',
    jerseyName: row.jersey_name || '',
    jerseyNumber: row.jersey_number || '',
    jerseySize: row.jersey_size || 'L',
    paymentMethod: row.payment_method,
    amount: row.registration_fee ?? 500,
    rejectionReason: row.rejection_reason || undefined,
    senderNumber: row.sender_number || undefined,
    paymentTime: row.payment_time || undefined,
    transactionId: row.transaction_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Loads the registrations list for Admin from public.registrations.
 */
export async function getRegistrationList(): Promise<{
  success: boolean;
  data: InvitationRecord[];
  error?: any;
  errorMessage?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        data: [],
        error,
        errorMessage: translateBackendError(error),
      };
    }

    const records = (data || []).map(mapRowToInvitation);
    return { success: true, data: records };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}

/**
 * Approves a registration in public.registrations.
 */
export async function approveRegistration(
  regIdOrNo: string
): Promise<{ success: boolean; data?: any; error?: any; errorMessage?: string }> {
  try {
    let query = supabase
      .from('registrations')
      .update({
        status: 'approved',
        rejection_reason: null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Check if UUID or registration_no
    if (regIdOrNo.includes('-') && regIdOrNo.length > 20) {
      query = query.eq('id', regIdOrNo);
    } else {
      const numeric = parseInt(regIdOrNo.replace(/\D/g, ''), 10);
      if (!isNaN(numeric)) {
        query = query.eq('registration_no', numeric);
      } else {
        query = query.eq('id', regIdOrNo);
      }
    }

    const { data, error } = await query.select();

    if (error) {
      return {
        success: false,
        error,
        errorMessage: translateBackendError(error),
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}

/**
 * Rejects a registration in public.registrations with required reason.
 */
export async function rejectRegistration(
  regIdOrNo: string,
  reason: string
): Promise<{ success: boolean; data?: any; error?: any; errorMessage?: string }> {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    return {
      success: false,
      errorMessage: 'A rejection reason is strictly required before rejecting this registration.',
    };
  }

  try {
    let query = supabase
      .from('registrations')
      .update({
        status: 'rejected',
        rejection_reason: cleanReason,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (regIdOrNo.includes('-') && regIdOrNo.length > 20) {
      query = query.eq('id', regIdOrNo);
    } else {
      const numeric = parseInt(regIdOrNo.replace(/\D/g, ''), 10);
      if (!isNaN(numeric)) {
        query = query.eq('registration_no', numeric);
      } else {
        query = query.eq('id', regIdOrNo);
      }
    }

    const { data, error } = await query.select();

    if (error) {
      return {
        success: false,
        error,
        errorMessage: translateBackendError(error),
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}

/**
 * Deletes a registration record from public.registrations.
 */
export async function deleteRegistration(
  regIdOrNo: string
): Promise<{ success: boolean; data?: any; error?: any; errorMessage?: string }> {
  try {
    let query = supabase.from('registrations').delete();

    if (regIdOrNo.includes('-') && regIdOrNo.length > 20) {
      query = query.eq('id', regIdOrNo);
    } else {
      const numeric = parseInt(regIdOrNo.replace(/\D/g, ''), 10);
      if (!isNaN(numeric)) {
        query = query.eq('registration_no', numeric);
      } else {
        query = query.eq('id', regIdOrNo);
      }
    }

    const { error } = await query;

    if (error) {
      return {
        success: false,
        error,
        errorMessage: translateBackendError(error),
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}

/**
 * Updates editable fields of a registration in public.registrations.
 */
export async function updateRegistrationDetails(
  regIdOrNo: string,
  updates: Partial<InvitationRecord>
): Promise<{ success: boolean; data?: any; error?: any; errorMessage?: string }> {
  try {
    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbPayload.student_name = updates.name;
    if (updates.roll !== undefined) dbPayload.roll = updates.roll;
    if (updates.id !== undefined) dbPayload.student_id = updates.id;
    if (updates.gender !== undefined) dbPayload.gender = updates.gender;
    if (updates.group !== undefined) dbPayload.group_name = updates.group;
    if (updates.section !== undefined) dbPayload.section_name = updates.section;
    if (updates.jerseyName !== undefined) dbPayload.jersey_name = updates.jerseyName;
    if (updates.jerseyNumber !== undefined) dbPayload.jersey_number = updates.jerseyNumber;
    if (updates.jerseySize !== undefined) dbPayload.jersey_size = updates.jerseySize;
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.rejectionReason !== undefined) dbPayload.rejection_reason = updates.rejectionReason;

    let query = supabase.from('registrations').update(dbPayload);

    if (regIdOrNo.includes('-') && regIdOrNo.length > 20) {
      query = query.eq('id', regIdOrNo);
    } else {
      const numeric = parseInt(regIdOrNo.replace(/\D/g, ''), 10);
      if (!isNaN(numeric)) {
        query = query.eq('registration_no', numeric);
      } else {
        query = query.eq('id', regIdOrNo);
      }
    }

    const { data, error } = await query.select();

    if (error) {
      return {
        success: false,
        error,
        errorMessage: translateBackendError(error),
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}
