import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { translateBackendError } from './registrations';

/**
 * Maps a public.registrations database row to InvitationRecord
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
  };
}

export const REGISTRATIONS_STORAGE_KEY = 'rd27_registrations_store';

export function getStoredRegistrations(): InvitationRecord[] {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredRegistrations(records: InvitationRecord[]): void {
  try {
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * Loads the registrations list for Admin from public.registrations.
 * Falls back to locally synchronized registrations if table access is restricted.
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

    if (!error && data) {
      const records = data.map(mapRowToInvitation);
      saveStoredRegistrations(records);
      return { success: true, data: records };
    }

    // Fallback to local synced registrations
    const localRecords = getStoredRegistrations();
    return { success: true, data: localRecords };
  } catch (err: any) {
    const localRecords = getStoredRegistrations();
    return {
      success: true,
      data: localRecords,
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
        reject_reason: null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (regIdOrNo.includes('-') && regIdOrNo.length > 20) {
      query = query.eq('id', regIdOrNo);
    } else {
      query = query.eq('registration_no', regIdOrNo);
    }

    const { error } = await query;
    if (error) {
      console.warn('Supabase approve note:', error.message);
    }
  } catch {}

  // Update in local store
  const list = getStoredRegistrations();
  const updated = list.map(item => {
    if (
      item.id === regIdOrNo ||
      item.dbId === regIdOrNo ||
      item.registration_no === regIdOrNo
    ) {
      return {
        ...item,
        status: 'approved' as InvitationStatus,
        reject_reason: undefined,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });
  saveStoredRegistrations(updated);

  return { success: true };
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
        reject_reason: cleanReason,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (regIdOrNo.includes('-') && regIdOrNo.length > 20) {
      query = query.eq('id', regIdOrNo);
    } else {
      query = query.eq('registration_no', regIdOrNo);
    }

    const { error } = await query;
    if (error) {
      console.warn('Supabase reject note:', error.message);
    }
  } catch {}

  // Update in local store
  const list = getStoredRegistrations();
  const updated = list.map(item => {
    if (
      item.id === regIdOrNo ||
      item.dbId === regIdOrNo ||
      item.registration_no === regIdOrNo
    ) {
      return {
        ...item,
        status: 'rejected' as InvitationStatus,
        reject_reason: cleanReason,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });
  saveStoredRegistrations(updated);

  return { success: true };
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
      query = query.eq('registration_no', regIdOrNo);
    }

    const { error } = await query;
    if (error) {
      console.warn('Supabase delete note:', error.message);
    }
  } catch {}

  // Update in local store
  const list = getStoredRegistrations();
  const updated = list.filter(
    item =>
      item.id !== regIdOrNo &&
      item.dbId !== regIdOrNo &&
      item.registration_no !== regIdOrNo
  );
  saveStoredRegistrations(updated);

  return { success: true };
}

/**
 * Syncs any local registrations to Supabase public.registrations.
 */
export async function syncLocalRegistrationsToSupabase(): Promise<{
  success: boolean;
  syncedCount: number;
  errorCount: number;
  message: string;
}> {
  const localList = getStoredRegistrations();
  if (localList.length === 0) {
    return { success: true, syncedCount: 0, errorCount: 0, message: 'No local registrations to sync.' };
  }

  let synced = 0;
  let errors = 0;

  for (const item of localList) {
    try {
      const payload: any = {
        registration_no: item.registration_no,
        full_name: item.full_name,
        class_roll: item.class_roll,
        student_id: item.student_id,
        contact_mobile_number: item.contact_mobile_number,
        academic_group: item.academic_group,
        academic_section: item.academic_section,
        student_photo: item.student_photo || null,
        send_method: item.send_method,
        sender_mobile_no: item.sender_mobile_no,
        payment_time: item.payment_time,
        transaction_id: item.transaction_id || null,
        jersey_back_name: item.jersey_back_name,
        jersey_number: item.jersey_number,
        jersey_size: item.jersey_size,
        gender: item.gender,
        status: item.status || 'pending',
        reject_reason: item.reject_reason || null,
      };

      const { error } = await supabase
        .from('registrations')
        .upsert(payload, { onConflict: 'registration_no' });

      if (!error) synced++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return {
    success: synced > 0 || errors === 0,
    syncedCount: synced,
    errorCount: errors,
    message: `Sync completed: ${synced} pushed to Supabase, ${errors} skipped or failed.`,
  };
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
    if (updates.full_name !== undefined) dbPayload.full_name = updates.full_name;
    if (updates.class_roll !== undefined) dbPayload.class_roll = updates.class_roll;
    if (updates.student_id !== undefined) dbPayload.student_id = updates.student_id;
    if (updates.contact_mobile_number !== undefined) dbPayload.contact_mobile_number = updates.contact_mobile_number;
    if (updates.academic_group !== undefined) dbPayload.academic_group = updates.academic_group;
    if (updates.academic_section !== undefined) dbPayload.academic_section = updates.academic_section;
    if (updates.student_photo !== undefined) dbPayload.student_photo = updates.student_photo;
    if (updates.send_method !== undefined) dbPayload.send_method = updates.send_method;
    if (updates.sender_mobile_no !== undefined) dbPayload.sender_mobile_no = updates.sender_mobile_no;
    if (updates.payment_time !== undefined) dbPayload.payment_time = updates.payment_time;
    if (updates.transaction_id !== undefined) dbPayload.transaction_id = updates.transaction_id;
    if (updates.jersey_back_name !== undefined) dbPayload.jersey_back_name = updates.jersey_back_name;
    if (updates.jersey_number !== undefined) dbPayload.jersey_number = updates.jersey_number;
    if (updates.jersey_size !== undefined) dbPayload.jersey_size = updates.jersey_size;
    if (updates.gender !== undefined) dbPayload.gender = updates.gender;
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.reject_reason !== undefined) dbPayload.reject_reason = updates.reject_reason;

    let query = supabase.from('registrations').update(dbPayload);

    if (regIdOrNo.includes('-') && regIdOrNo.length > 20) {
      query = query.eq('id', regIdOrNo);
    } else {
      query = query.eq('registration_no', regIdOrNo);
    }

    await query;
  } catch {}

  // Update in local store
  const list = getStoredRegistrations();
  const updated = list.map(item => {
    if (
      item.id === regIdOrNo ||
      item.dbId === regIdOrNo ||
      item.registration_no === regIdOrNo
    ) {
      return {
        ...item,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });
  saveStoredRegistrations(updated);

  return { success: true };
}
