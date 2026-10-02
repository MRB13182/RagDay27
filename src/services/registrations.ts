import { supabase } from '../lib/supabase';
import type { RegistrationFormData, InvitationRecord, GroupItem, SectionItem } from '../types';
import { DEFAULT_SECTIONS } from '../data/mockData';
import { mapRowToInvitation } from './admin';

export function formatPaymentTimeToPostgres(timeStr: string): string {
  const clean = timeStr.trim();
  if (!clean) throw new Error('Payment time is required.');
  const ampm = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = Number(ampm[1]), m = Number(ampm[2]), s = Number(ampm[3] || 0);
    if (h < 1 || h > 12 || m > 59 || s > 59) throw new Error('Invalid payment time.');
    if (ampm[4].toLowerCase() === 'pm' && h < 12) h += 12;
    if (ampm[4].toLowerCase() === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  const h24 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!h24) throw new Error('Invalid payment time format.');
  const h = Number(h24[1]), m = Number(h24[2]), s = Number(h24[3] || 0);
  if (h > 23 || m > 59 || s > 59) throw new Error('Invalid payment time.');
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function translateBackendError(error: any): string {
  if (!error) return 'Database request failed.';
  const message = String(error.message || error.details || error.hint || error);
  const code = String(error.code || '');
  if (/DUPLICATE_REGISTRATION/i.test(message) || code === '23505') return 'A registration already exists for this Student ID or Name + Class Roll.';
  if (/REQUIRED_FIELD_MISSING/i.test(message)) return 'Please complete all required registration fields.';
  if (/INVALID_PAYMENT_METHOD/i.test(message)) return 'Payment method must be bKash or Nagad.';
  if (/INVALID_JERSEY_NUMBER/i.test(message)) return 'Jersey number must be exactly two digits (00–99).';
  if (/INVALID_JERSEY_NAME/i.test(message)) return 'Jersey back name must be 1–14 characters.';
  if (/INVALID_JERSEY_SIZE/i.test(message)) return 'Invalid jersey size.';
  if (/REJECTED_REGISTRATION_NOT_FOUND/i.test(message)) return 'The previous rejected registration could not be recovered.';
  if (/permission denied|unauthorized|not allowed|ADMIN_ACCESS_REQUIRED/i.test(message) || code === '42501') return 'You are not authorized to perform this action.';
  return message;
}

export async function fetchGroups(): Promise<GroupItem[]> {
  return [
    { id: 'group-science', name: 'Science', active: true, sort_order: 1 },
    { id: 'group-business', name: 'Business Studies', active: true, sort_order: 2 },
    { id: 'group-humanities', name: 'Humanities', active: true, sort_order: 3 },
  ];
}

export async function fetchSections(groupNameOrId?: string, gender?: 'male' | 'female'): Promise<SectionItem[]> {
  let sections = [...((DEFAULT_SECTIONS || []) as any[])];
  if (groupNameOrId) {
    const clean = groupNameOrId.replace(/^group-/, '').trim().toLowerCase();
    sections = sections.filter(s => {
      const group = String(s.group || s.group_name || '').trim().toLowerCase();
      return group === clean || group.replace(/\s+/g,'-') === clean;
    });
  }
  if (gender) sections = sections.filter(s => String(s.gender || '').toLowerCase() === gender);
  return sections.map((s,index)=>({
    id: s.id || `sec-${index}`,
    group_id: s.group || s.group_name || 'Science',
    gender: s.gender === 'female' ? 'female' : 'male',
    code: s.code || s.displayName || `SEC${index+1}`,
    display_name: s.displayName || s.code || `SEC${index+1}`,
    active: s.active !== false,
    sort_order: s.sortOrder || index+1
  }));
}

export async function checkDuplicateRegistration(studentId: string, fullName: string, classRoll: string): Promise<InvitationRecord | null> {
  const { data, error } = await supabase.rpc('find_registration_duplicate', {
    p_student_id: studentId.trim(),
    p_full_name: fullName.trim(),
    p_class_roll: classRoll.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapRowToInvitation(row) : null;
}

export async function createRegistration(form: RegistrationFormData, existingRegNo?: string, existingDbId?: string): Promise<{success:boolean; data?:InvitationRecord; error?:any; errorMessage?:string}> {
  try {
    const payload = {
      p_full_name: form.full_name.trim(),
      p_class_roll: form.class_roll.trim(),
      p_student_id: form.student_id.trim(),
      p_contact_mobile_number: form.contact_mobile_number.trim(),
      p_academic_group: form.academic_group.trim(),
      p_academic_section: form.academic_section.trim(),
      p_student_photo: form.student_photo || null,
      p_send_method: form.send_method,
      p_sender_mobile_no: form.sender_mobile_no.trim(),
      p_payment_time: formatPaymentTimeToPostgres(form.payment_time),
      p_transaction_id: form.transaction_id?.trim() || null,
      p_jersey_back_name: form.jersey_back_name.trim(),
      p_jersey_number: form.jersey_number.trim(),
      p_jersey_size: form.jersey_size,
      p_gender: form.gender,
    };

    const result = existingRegNo || existingDbId
      ? await supabase.rpc('resubmit_rejected_registration', { p_registration_id: existingDbId || '', ...payload })
      : await supabase.rpc('create_registration', payload);

    if (result.error) return { success:false, error:result.error, errorMessage:translateBackendError(result.error) };
    if (!result.data) return { success:false, errorMessage:'Supabase did not return the saved registration.' };
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row?.id || !row?.registration_no || row?.sl_no === undefined || row?.sl_no === null) return { success:false, errorMessage:'Supabase returned an incomplete registration record.' };
    return { success:true, data:mapRowToInvitation(row) };
  } catch (error:any) {
    return { success:false, error, errorMessage:translateBackendError(error) };
  }
}