import type { InvitationRecord, RegistrationFormData } from '../types';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../lib/supabase';

const API_PATH = `${SUPABASE_URL}/functions/v1/registration-edit-session`;

let activeSessionToken: string | null = null;

async function request(action: string, body: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };
  if (activeSessionToken) {
    headers['x-edit-token'] = activeSessionToken;
  }

  const response = await fetch(API_PATH, {
    method: 'POST',
    credentials: 'include',
    headers,
    cache: 'no-store',
    body: JSON.stringify({
      action,
      ...(activeSessionToken ? { session_token: activeSessionToken } : {}),
      ...body,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Registration edit request failed.');
  }
  return data;
}

export interface RegistrationEditState {
  registration_no: string;
  edit_count: number;
  edit_locked: boolean;
  edit_deadline: string;
  record: InvitationRecord;
}

export async function verifyRegistrationForEdit(registrationNo: string, studentName: string) {
  try {
    const reg = registrationNo.trim().toUpperCase();
    const name = studentName.trim();
    if (!/^RD27-\d+$/i.test(reg) || !name) {
      throw new Error('Enter a valid Registration Number and Student Name.');
    }
    const result = await request('verify', { registration_no: reg, student_name: name });
    if (result.token) {
      activeSessionToken = result.token;
    }
    return { success: true, data: result.state as RegistrationEditState };
  } catch (error: any) {
    return { success: false, errorMessage: error?.message || 'Registration verification failed.' };
  }
}

export async function saveRegistrationEdit(form: Pick<RegistrationFormData,
  'full_name' | 'class_roll' | 'student_id' | 'contact_mobile_number' |
  'academic_group' | 'academic_section' | 'student_photo' | 'send_method' |
  'sender_mobile_no' | 'payment_time' | 'transaction_id' |
  'jersey_back_name' | 'jersey_number' | 'jersey_size'
>) {
  try {
    const jerseyNo = String(form.jersey_number || '').trim();
    if (!/^\d{1,3}$/.test(jerseyNo)) throw new Error('Jersey Number must contain 1–3 digits.');
    const result = await request('save', { registration: {
      full_name: form.full_name.trim(), class_roll: form.class_roll.trim(),
      student_id: form.student_id.trim(), contact_mobile_number: form.contact_mobile_number.trim(),
      academic_group: form.academic_group.trim(), academic_section: form.academic_section.trim(),
      student_photo: form.student_photo ?? null, send_method: form.send_method,
      sender_mobile_no: form.sender_mobile_no.trim(), payment_time: form.payment_time.trim(),
      transaction_id: form.transaction_id.trim() || null, jersey_back_name: form.jersey_back_name.trim(),
      jersey_number: jerseyNo, jersey_size: form.jersey_size,
    }});
    if (result.success) {
      activeSessionToken = null;
    }
    return { success: true, data: result.record as InvitationRecord };
  } catch (error: any) {
    return { success: false, errorMessage: error?.message || 'Unable to save registration changes.' };
  }
}

export function clearEditSessionToken() {
  activeSessionToken = null;
}

export async function setServerRegistrationOpenStatus(passcode: string, isOpen: boolean) {
  try {
    return await request('set_registration_open', { passcode, is_open: isOpen });
  } catch (error: any) {
    return { success: false, errorMessage: error?.message || 'Unable to update registration open status on server.' };
  }
}

export async function getEditPolicy() {
  return await request('policy') as { deadline: string; can_edit: boolean };
}

export async function updateEditDeadline(passcode: string, deadline: string) {
  try {
    return await request('deadline', { passcode, deadline });
  } catch (error: any) {
    return { success: false, errorMessage: error?.message || 'Unable to update deadline.' };
  }
}

export async function setRegistrationIndividualEditLock(passcode: string, registrationNo: string, locked: boolean) {
  try {
    return await request('lock', { passcode, registration_no: registrationNo, locked });
  } catch (error: any) {
    return { success: false, errorMessage: error?.message || 'Unable to update individual lock.' };
  }
}

export async function getRegistrationEditMetadata(passcode: string) {
  const result = await request('metadata', { passcode });
  return Array.isArray(result.records) ? result.records : [];
}
