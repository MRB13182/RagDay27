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
  if (/REJECTED_REGISTRATION_RECOVERY_REQUIRED/i.test(message)) return 'A rejected registration with these exact student details already exists. Please use the Register Again recovery flow.';
  if (/REJECTED_REGISTRATION_PROOF_FAILED/i.test(message)) return 'The recovery details do not exactly match the original rejected registration.';
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

export async function checkDuplicateRegistration(
  studentId: string,
  fullName: string,
  classRoll: string,
  academicGroup: string,
  academicSection: string
): Promise<InvitationRecord | null> {
  const { data, error } = await supabase.rpc('find_registration_duplicate', {
    p_student_id: studentId.trim(),
    p_full_name: fullName.trim(),
    p_class_roll: classRoll.trim(),
    p_academic_group: academicGroup.trim(),
    p_academic_section: academicSection.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapRowToInvitation(row) : null;
}

// Database is the sole authority for registration numbering.
// Registration numbers are global across both genders: RD27-01, RD27-02, RD27-03, ...
export function formatRegistrationNumber(seq: number): string {
  return `RD27-${String(seq).padStart(2, '0')}`;
}

export function resetRegistrationCounters() {
  // Database is the sole source of truth for numbering.
}

export function syncRegistrationCounters(_activeRecords: { sl_no?: number; registration_no?: string }[]) {
  // Database is the sole source of truth for numbering.
}

export function toNullableUuid(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s || s === '""' || s === "''" || s === 'null' || s === 'undefined') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

/**
 * Identifies registration form fields that are referenced in a rejection reason.
 * Returns a Set of field names: 'full_name', 'class_roll', 'student_id',
 * 'contact_mobile_number', 'academic_group', 'academic_section', 'student_photo',
 * 'send_method', 'sender_mobile_no', 'payment_time', 'transaction_id', 'payment_amount'.
 * If the reason is general or unclear, returns an empty Set (no guessing).
 */
export function detectFlaggedFields(reason?: string | null): Set<string> {
  const flagged = new Set<string>();
  if (!reason || !reason.trim()) return flagged;

  const text = reason.toLowerCase();

  // Composite 1: Invalid Student Information (flags name, roll, student ID)
  if (text.includes('invalid student information') || text.includes('student information')) {
    flagged.add('full_name');
    flagged.add('class_roll');
    flagged.add('student_id');
  }

  // Composite 2: Incorrect Payment Information (flags payment method, sender number, payment time, transaction ID)
  if (text.includes('incorrect payment information') || text.includes('payment information')) {
    flagged.add('send_method');
    flagged.add('sender_mobile_no');
    flagged.add('payment_time');
    flagged.add('transaction_id');
  }

  // Full Name
  if (
    text.includes('full name') ||
    text.includes('student name') ||
    /\bfull\s*name\b/i.test(text) ||
    (/\bname\b/i.test(text) && !text.includes('jersey'))
  ) {
    flagged.add('full_name');
  }

  // Class Roll
  if (
    text.includes('class roll') ||
    text.includes('roll number') ||
    text.includes('roll no') ||
    /\bclass\s*roll\b/i.test(text) ||
    /\broll\b/i.test(text)
  ) {
    flagged.add('class_roll');
  }

  // Student ID
  if (
    text.includes('student id') ||
    text.includes('college id') ||
    /\b(student|college)\s*id\b/i.test(text)
  ) {
    flagged.add('student_id');
  }

  // Contact Mobile Number
  if (
    text.includes('contact mobile') ||
    text.includes('contact number') ||
    text.includes('contact phone') ||
    text.includes('contact no')
  ) {
    flagged.add('contact_mobile_number');
  }

  // Academic Group
  if (
    text.includes('academic group') ||
    text.includes('group selection') ||
    /\b(academic\s+)?group\b/i.test(text)
  ) {
    flagged.add('academic_group');
  }

  // Academic Section
  if (
    text.includes('academic section') ||
    text.includes('section selection') ||
    /\b(academic\s+)?section\b/i.test(text)
  ) {
    flagged.add('academic_section');
  }

  // Student Photo
  if (
    text.includes('student photo') ||
    text.includes('photo') ||
    text.includes('picture') ||
    text.includes('image')
  ) {
    flagged.add('student_photo');
  }

  // Send Method
  if (
    text.includes('send method') ||
    text.includes('payment method') ||
    text.includes('bkash') ||
    text.includes('nagad')
  ) {
    flagged.add('send_method');
  }

  // Sender Mobile Number
  if (
    text.includes('sender mobile') ||
    text.includes('sender number') ||
    text.includes('sender phone') ||
    text.includes('sender no')
  ) {
    flagged.add('sender_mobile_no');
  }

  // Payment Time
  if (
    text.includes('payment time') ||
    text.includes('transaction time')
  ) {
    flagged.add('payment_time');
  }

  // Transaction ID
  if (
    text.includes('transaction id') ||
    text.includes('trx id') ||
    text.includes('txid')
  ) {
    flagged.add('transaction_id');
  }

  // Incomplete Payment
  if (
    text.includes('incomplete payment') ||
    text.includes('less than required fee') ||
    text.includes('payment amount')
  ) {
    flagged.add('payment_amount');
  }

  return flagged;
}

export async function createRegistration(
  form: RegistrationFormData,
  existingRegNo?: string,
  existingDbId?: string,
  recoveryProof?: {
    studentId: string;
    fullName: string;
    classRoll: string;
    academicGroup: string;
    academicSection: string;
  },
  _currentActiveRecords: { sl_no?: number; registration_no?: string }[] = []
): Promise<{success:boolean; data?:InvitationRecord; error?:any; errorMessage?:string}> {
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

    // Safe UUID conversion: Never pass an empty string to a UUID column
    let targetDbId = toNullableUuid(existingDbId);
    if (!targetDbId && existingRegNo) {
      try {
        const [bRes, gRes] = await Promise.all([
          supabase.rpc('get_admin_registrations', { p_passcode: 'nic27.boy' }),
          supabase.rpc('get_admin_registrations', { p_passcode: 'nic27.girl' }),
        ]);
        const all = [...(bRes.data || []), ...(gRes.data || [])];
        const match = all.find(
          r => r.registration_no?.toUpperCase() === existingRegNo.trim().toUpperCase()
        );
        if (match?.id) {
          targetDbId = toNullableUuid(match.id);
        }
      } catch (err) {
        console.warn('Could not resolve registration uuid by reg no:', err);
      }
    }

    const result = targetDbId
      ? await supabase.rpc('resubmit_rejected_registration', {
          p_registration_id: targetDbId,
          p_original_student_id: recoveryProof?.studentId || form.student_id.trim(),
          p_original_full_name: recoveryProof?.fullName || form.full_name.trim(),
          p_original_class_roll: recoveryProof?.classRoll || form.class_roll.trim(),
          p_original_academic_group: recoveryProof?.academicGroup || form.academic_group.trim(),
          p_original_academic_section: recoveryProof?.academicSection || form.academic_section.trim(),
          ...payload,
        })
      : await supabase.rpc('create_registration', payload);

    if (result.error) {
      return {
        success:false,
        error:result.error,
        errorMessage:translateBackendError(result.error)
      };
    }
    if (!result.data) {
      return { success:false, errorMessage:'Supabase did not return the saved registration.' };
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row?.id || !row?.registration_no || row?.sl_no === undefined || row?.sl_no === null) {
      return { success:false, errorMessage:'Supabase returned an incomplete registration record.' };
    }

    // Never calculate or overwrite registration numbers in the browser.
    return { success:true, data:mapRowToInvitation(row) };
  } catch (error:any) {
    return { success:false, error, errorMessage:translateBackendError(error) };
  }
}

