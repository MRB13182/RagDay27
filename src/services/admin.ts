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
        rejection_reason: null,
        approved_at: new Date().toISOString(),
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

    const { error } = await query;
    if (error) {
      console.warn('Supabase approve note:', error.message);
    }
  } catch {}

  // Update in local store
  const list = getStoredRegistrations();
  const updated = list.map(item => {
    if (
      item.dbId === regIdOrNo ||
      item.registrationNo === regIdOrNo ||
      item.registrationNo.replace(/\D/g, '') === regIdOrNo.replace(/\D/g, '')
    ) {
      return {
        ...item,
        status: 'approved' as InvitationStatus,
        rejectionReason: undefined,
        updatedAt: new Date().toISOString(),
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

    const { error } = await query;
    if (error) {
      console.warn('Supabase reject note:', error.message);
    }
  } catch {}

  // Update in local store
  const list = getStoredRegistrations();
  const updated = list.map(item => {
    if (
      item.dbId === regIdOrNo ||
      item.registrationNo === regIdOrNo ||
      item.registrationNo.replace(/\D/g, '') === regIdOrNo.replace(/\D/g, '')
    ) {
      return {
        ...item,
        status: 'rejected' as InvitationStatus,
        rejectionReason: cleanReason,
        updatedAt: new Date().toISOString(),
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
      const numeric = parseInt(regIdOrNo.replace(/\D/g, ''), 10);
      if (!isNaN(numeric)) {
        query = query.eq('registration_no', numeric);
      } else {
        query = query.eq('id', regIdOrNo);
      }
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
      item.dbId !== regIdOrNo &&
      item.registrationNo !== regIdOrNo &&
      item.registrationNo.replace(/\D/g, '') !== regIdOrNo.replace(/\D/g, '')
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
      const numericMatch = item.registrationNo.match(/\d+/);
      const regNo = numericMatch ? parseInt(numericMatch[0], 10) : undefined;

      const payload: any = {
        student_name: item.name,
        gender: item.gender,
        roll: item.roll,
        student_id: item.id,
        group_name: item.group,
        section_name: item.section,
        jersey_name: item.jerseyName,
        jersey_number: item.jerseyNumber,
        jersey_size: item.jerseySize,
        sender_number: item.senderNumber || item.contactNumber || '01700000000',
        payment_method: item.paymentMethod || 'bkash',
        payment_time: item.paymentTime || '12:00:00',
        transaction_id: item.transactionId || null,
        registration_fee: item.amount ?? 500,
        student_photo: item.photoUrl || null,
        status: item.status || 'pending',
        rejection_reason: item.rejectionReason || null,
      };

      if (regNo) payload.registration_no = regNo;

      const { error } = await supabase
        .from('registrations')
        .upsert(payload, { onConflict: 'roll' });

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

    await query;
  } catch {}

  // Update in local store
  const list = getStoredRegistrations();
  const updated = list.map(item => {
    if (
      item.dbId === regIdOrNo ||
      item.registrationNo === regIdOrNo ||
      item.registrationNo.replace(/\D/g, '') === regIdOrNo.replace(/\D/g, '')
    ) {
      return {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  saveStoredRegistrations(updated);

  return { success: true };
}
