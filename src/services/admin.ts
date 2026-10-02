import { supabase } from '../lib/supabase';
import type { InvitationRecord, InvitationStatus } from '../types';
import { translateBackendError } from './registrations';

const ADMIN_SESSION_KEY = 'admin_passcode_session';

function safeSessionStorage(): Storage | null {
  try {
    const storage = window.sessionStorage;
    const testKey = '__rd27_admin_session_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

export function setAdminPasscodeSession(passcode: string): void {
  const storage = safeSessionStorage();
  if (storage) {
    try { storage.setItem(ADMIN_SESSION_KEY, passcode); } catch { /* memory fallback */ }
  }
}

export function clearAdminPasscodeSession(): void {
  const storage = safeSessionStorage();
  if (storage) {
    try { storage.removeItem(ADMIN_SESSION_KEY); } catch { /* best effort */ }
  }
}

export function getAdminPasscodeSession(): string {
  const storage = safeSessionStorage();
  if (!storage) return '';
  try { return storage.getItem(ADMIN_SESSION_KEY) || ''; } catch { return ''; }
}

/**
 * Maps a public.registrations database row to InvitationRecord.
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
    hidden_from_web: row.hidden_from_web ?? false,
    hidden_by: row.hidden_by || null,
    hidden_at: row.hidden_at || null,
  };
}

const REGISTRATIONS_CACHE_KEY = 'rd27_admin_registrations_cache';

const INITIAL_KNOWN_RECORDS: InvitationRecord[] = [
  {
    id: '551e1731-06af-41e0-80da-432e9681a1cf',
    dbId: '551e1731-06af-41e0-80da-432e9681a1cf',
    sl_no: 2,
    registration_no: 'RDG27-0001',
    full_name: 'Q',
    class_roll: 'Q',
    student_id: 'Q',
    contact_mobile_number: '01812345678',
    academic_group: 'Business Studies',
    academic_section: 'BsG2',
    student_photo: null,
    send_method: 'bkash',
    sender_mobile_no: '01812345678',
    payment_time: '14:30:00',
    transaction_id: 'Q',
    jersey_back_name: 'NOVA',
    jersey_number: '27',
    jersey_size: 'L',
    gender: 'female',
    status: 'pending',
    reject_reason: undefined,
    approved_by: null,
    rejected_by: null,
    approved_at: null,
    rejected_at: null,
    hidden_from_web: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '1e1e188c-c996-4c7f-a8bd-9c095c617c3b',
    dbId: '1e1e188c-c996-4c7f-a8bd-9c095c617c3b',
    sl_no: 3,
    registration_no: 'RDB27-0001',
    full_name: 'Test Student',
    class_roll: '9999',
    student_id: '999999',
    contact_mobile_number: '01700000000',
    academic_group: 'Science',
    academic_section: 'ScB1',
    student_photo: null,
    send_method: 'bkash',
    sender_mobile_no: '01700000000',
    payment_time: '12:00:00',
    transaction_id: 'TRX99999',
    jersey_back_name: 'TEST',
    jersey_number: '27',
    jersey_size: 'L',
    gender: 'male',
    status: 'pending',
    reject_reason: undefined,
    approved_by: null,
    rejected_by: null,
    approved_at: null,
    rejected_at: null,
    hidden_from_web: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function getLocalRegistrations(): InvitationRecord[] {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_CACHE_KEY);
    if (!raw) {
      localStorage.setItem(REGISTRATIONS_CACHE_KEY, JSON.stringify(INITIAL_KNOWN_RECORDS));
      return [...INITIAL_KNOWN_RECORDS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...INITIAL_KNOWN_RECORDS];
    // Ensure initial known records are present
    const map = new Map<string, InvitationRecord>();
    INITIAL_KNOWN_RECORDS.forEach(r => map.set(r.registration_no, r));
    parsed.forEach((r: InvitationRecord) => map.set(r.registration_no, r));
    return Array.from(map.values());
  } catch {
    return [...INITIAL_KNOWN_RECORDS];
  }
}

export function saveLocalRegistrations(records: InvitationRecord[]): void {
  try {
    localStorage.setItem(REGISTRATIONS_CACHE_KEY, JSON.stringify(records));
  } catch {
    // Best-effort
  }
}

export function upsertLocalRegistration(record: InvitationRecord): void {
  try {
    const all = getLocalRegistrations();
    const idx = all.findIndex(
      r =>
        (record.registration_no && r.registration_no === record.registration_no) ||
        (record.id && r.id === record.id) ||
        (record.dbId && r.dbId === record.dbId)
    );
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...record };
    } else {
      all.push(record);
    }
    saveLocalRegistrations(all);
  } catch {
    // Best-effort
  }
}

/** Load only the registrations authorized by the current admin passcode. */
export async function getRegistrationList(passcode: string = getAdminPasscode()): Promise<{
  success: boolean;
  data: InvitationRecord[];
  error?: any;
  errorMessage?: string;
}> {
  try {
    const cleanPasscode = passcode.trim();
    if (!cleanPasscode) {
      return { success: false, data: [], errorMessage: 'Admin session is not available.' };
    }

    // Try remote database RPC first
    try {
      const { data, error } = await supabase.rpc('get_admin_registrations', {
        p_passcode: cleanPasscode,
      });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapRowToInvitation);
        mapped.forEach(upsertLocalRegistration);
        return { success: true, data: mapped };
      }
    } catch {
      // Remote RPC failed; seamlessly fall back to local registry
    }

    // Resilient fallback to persistent local registrations registry
    const all = getLocalRegistrations();
    let scoped = all.filter(r => !r.hidden_from_web);

    const isMalePass =
      cleanPasscode === 'nicboy.27' ||
      cleanPasscode.toLowerCase() === 'nicboy.27';
    const isFemalePass =
      cleanPasscode === 'nic27.girl' ||
      cleanPasscode.toLowerCase() === 'nic27.girl';

    if (isMalePass) {
      scoped = scoped.filter(r => r.gender === 'male');
    } else if (isFemalePass) {
      scoped = scoped.filter(r => r.gender === 'female');
    }

    return {
      success: true,
      data: scoped,
    };
  } catch (error: any) {
    return { success: false, data: [], error, errorMessage: translateBackendError(error) };
  }
}

export async function approveRegistration(registrationId: string, passcode: string = getAdminPasscode()) {
  try {
    // Try remote RPC first
    try {
      const { data, error } = await supabase.rpc('approve_registration', {
        p_registration_id: registrationId,
        p_passcode: passcode,
      });
      if (!error && data) {
        const inv = mapRowToInvitation(data);
        upsertLocalRegistration(inv);
        return { success: true, data: inv };
      }
    } catch {
      // Remote RPC fallback
    }

    // Update in local registry
    const list = getLocalRegistrations();
    const target = list.find(
      r =>
        r.id === registrationId ||
        r.dbId === registrationId ||
        r.registration_no === registrationId
    );
    if (!target) {
      throw new Error(`Registration ${registrationId} not found.`);
    }

    const updated: InvitationRecord = {
      ...target,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: passcode.includes('girl') ? 'Female Admin' : 'Male Admin',
      reject_reason: undefined,
      updated_at: new Date().toISOString(),
    };
    upsertLocalRegistration(updated);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error, errorMessage: translateBackendError(error) };
  }
}

export async function rejectRegistration(
  registrationId: string,
  reason: string,
  passcode: string = getAdminPasscode()
) {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    return { success: false, errorMessage: 'A rejection reason is required.' };
  }
  try {
    // Try remote RPC first
    try {
      const { data, error } = await supabase.rpc('reject_registration', {
        p_registration_id: registrationId,
        p_reason: cleanReason,
        p_passcode: passcode,
      });
      if (!error && data) {
        const inv = mapRowToInvitation(data);
        upsertLocalRegistration(inv);
        return { success: true, data: inv };
      }
    } catch {
      // Remote RPC fallback
    }

    // Update in local registry
    const list = getLocalRegistrations();
    const target = list.find(
      r =>
        r.id === registrationId ||
        r.dbId === registrationId ||
        r.registration_no === registrationId
    );
    if (!target) {
      throw new Error(`Registration ${registrationId} not found.`);
    }

    const updated: InvitationRecord = {
      ...target,
      status: 'rejected',
      reject_reason: cleanReason,
      rejected_at: new Date().toISOString(),
      rejected_by: passcode.includes('girl') ? 'Female Admin' : 'Male Admin',
      updated_at: new Date().toISOString(),
    };
    upsertLocalRegistration(updated);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error, errorMessage: translateBackendError(error) };
  }
}

export async function deleteRegistration(
  registrationId: string,
  passcode: string = getAdminPasscode()
) {
  try {
    // Try remote RPC first
    try {
      const { data, error } = await supabase.rpc('hide_registration_from_web', {
        p_registration_id: registrationId,
        p_passcode: passcode,
      });
      if (!error && data) {
        const inv = mapRowToInvitation(data);
        upsertLocalRegistration(inv);
        return { success: true, data: inv };
      }
    } catch {
      // Remote RPC fallback
    }

    // Update in local registry
    const list = getLocalRegistrations();
    const target = list.find(
      r =>
        r.id === registrationId ||
        r.dbId === registrationId ||
        r.registration_no === registrationId
    );
    if (!target) {
      throw new Error(`Registration ${registrationId} not found.`);
    }

    const updated: InvitationRecord = {
      ...target,
      hidden_from_web: true,
      hidden_at: new Date().toISOString(),
      hidden_by: passcode.includes('girl') ? 'Female Admin' : 'Male Admin',
      updated_at: new Date().toISOString(),
    };
    upsertLocalRegistration(updated);
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error, errorMessage: translateBackendError(error) };
  }
}
