import { supabase } from '../lib/supabase';
import type { InvitationRecord, RegistrationFormData } from '../types';

export interface RegistrationEditState {
  registration_no: string;
  edit_count: number;
  edit_locked: boolean;
  edit_deadline: string;
  rejected_editable_fields: string[];
  record: InvitationRecord;
}

const normalizeRegistrationNo = (value: string) => {
  const clean = value.trim().toUpperCase();
  const short = clean.match(/^(RD27-)(\\d+)$/);
  return short ? `${short[1]}${short[2].padStart(2, '0')}` : clean;
};

export async function verifyRegistrationForEdit(
  registrationNo: string,
  studentName: string
): Promise<{ success: boolean; data?: RegistrationEditState; errorMessage?: string }> {
  const regNo = normalizeRegistrationNo(registrationNo);
  const name = studentName.trim();
  if (!/^RD27-\\d+$/i.test(regNo) || !name) {
    return { success: false, errorMessage: 'Enter a valid Registration Number and Student Name.' };
  }

  const { data, error } = await supabase.rpc('verify_registration_edit', {
    p_registration_no: regNo,
    p_student_name: name,
  });
  if (error) return { success: false, errorMessage: error.message };
  if (!data?.success || !data?.record) {
    return { success: false, errorMessage: data?.message || 'Registration verification failed.' };
  }
  return { success: true, data: data as RegistrationEditState };
}

export async function saveRegistrationEdit(
  form: Pick<RegistrationFormData,
    'full_name' | 'class_roll' | 'student_id' | 'contact_mobile_number' |
    'academic_group' | 'academic_section' | 'student_photo' | 'send_method' |
    'sender_mobile_no' | 'payment_time' | 'transaction_id' |
    'jersey_back_name' | 'jersey_number' | 'jersey_size'
  >
): Promise<{ success: boolean; data?: InvitationRecord; errorMessage?: string }> {
  const cleanNumber = String(form.jersey_number || '').trim();
  if (!/^\\d{1,3}$/.test(cleanNumber)) {
    return { success: false, errorMessage: 'Jersey Number must contain 1–3 digits.' };
  }
  const { data, error } = await supabase.rpc('save_registration_edit', {
    p_full_name: form.full_name.trim(),
    p_class_roll: form.class_roll.trim(),
    p_student_id: form.student_id.trim(),
    p_contact_mobile_number: form.contact_mobile_number.trim(),
    p_academic_group: form.academic_group.trim(),
    p_academic_section: form.academic_section.trim(),
    p_student_photo: form.student_photo || null,
    p_send_method: form.send_method,
    p_sender_mobile_no: form.sender_mobile_no.trim(),
    p_payment_time: form.payment_time.trim(),
    p_transaction_id: form.transaction_id.trim() || null,
    p_jersey_back_name: form.jersey_back_name.trim(),
    p_jersey_number: cleanNumber,
    p_jersey_size: form.jersey_size,
  });
  if (error) return { success: false, errorMessage: error.message };
  if (!data?.success || !data?.record) {
    return { success: false, errorMessage: data?.message || 'Registration update failed.' };
  }
  return { success: true, data: data.record as InvitationRecord };
}

export async function getEditPolicy(): Promise<{
  deadline: string;
  can_edit: boolean;
}> {
  const { data, error } = await supabase.rpc('get_registration_edit_policy');
  if (error) throw error;
  return data as { deadline: string; can_edit: boolean };
}

export async function updateEditDeadline(
  passcode: string,
  deadline: string
): Promise<{ success: boolean; errorMessage?: string }> {
  const { data, error } = await supabase.rpc('set_registration_edit_deadline', {
    p_passcode: passcode,
    p_deadline: deadline,
  });
  if (error) return { success: false, errorMessage: error.message };
  return data as { success: boolean; errorMessage?: string };
}

export async function setRegistrationIndividualEditLock(
  passcode: string,
  registrationNo: string,
  locked: boolean
): Promise<{ success: boolean; errorMessage?: string }> {
  const { data, error } = await supabase.rpc('set_registration_edit_lock', {
    p_passcode: passcode,
    p_registration_no: normalizeRegistrationNo(registrationNo),
    p_locked: locked,
  });
  if (error) return { success: false, errorMessage: error.message };
  return data as { success: boolean; errorMessage?: string };
}

export async function getRegistrationEditMetadata(passcode: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_registration_edit_metadata', {
    p_passcode: passcode,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
