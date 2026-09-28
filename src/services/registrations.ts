import { supabase } from '../lib/supabase';
import type {
  RegistrationFormData,
  InvitationRecord,
  GroupItem,
  SectionItem,
} from '../types';
import { fetchSiteContent } from './settings';

/**
 * Robustly format user-entered time into PostgreSQL TIME format (HH:MM:SS).
 * Handles: "12:30 PM", "9:15 am", "14:30", "14:30:00", ISO strings, etc.
 */
export function formatPaymentTimeToPostgres(timeStr: string): string {
  if (!timeStr || !timeStr.trim()) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  }

  const clean = timeStr.trim();

  // Check 12-hour format with AM/PM e.g. "02:30 PM" or "2:30pm"
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const seconds = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
    const meridiem = ampmMatch[4].toLowerCase();

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Check 24-hour format e.g. "14:30" or "14:30:00"
  const h24Match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (h24Match) {
    const hours = Math.min(23, Math.max(0, parseInt(h24Match[1], 10)));
    const minutes = Math.min(59, Math.max(0, parseInt(h24Match[2], 10)));
    const seconds = h24Match[3] ? Math.min(59, Math.max(0, parseInt(h24Match[3], 10))) : 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Fallback: Attempt Date parse
  const parsedDate = new Date(clean);
  if (!isNaN(parsedDate.getTime())) {
    return `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}:${String(parsedDate.getSeconds()).padStart(2, '0')}`;
  }

  // Default safe time
  return '12:00:00';
}

/**
 * Translates Supabase / Postgres error messages and codes into human-readable user messages.
 */
export function translateBackendError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = typeof error === 'string' ? error : error.message || error.details || error.hint || '';
  const code = error.code || '';

  if (code === '42P01' || code === 'PGRST205' || msg.includes('relation "public.registrations" does not exist') || msg.includes('registrations')) {
    return 'Supabase table "registrations" not found. Please run the supabase_schema.sql script in your Supabase SQL Editor.';
  }
  if (msg.includes('REGISTRATION_CLOSED') || code === 'REGISTRATION_CLOSED') {
    return 'Registration is currently closed for Rag Day 27.';
  }
  if (msg.includes('INVALID_GROUP') || code === 'INVALID_GROUP') {
    return 'The selected academic group is invalid.';
  }
  if (msg.includes('INVALID_SECTION') || code === 'INVALID_SECTION') {
    return 'The selected academic section is invalid or does not match group/gender.';
  }
  if (msg.includes('INVALID_PAYMENT_METHOD') || code === 'INVALID_PAYMENT_METHOD') {
    return 'Invalid payment method selected. Please choose bKash or Nagad.';
  }
  if (msg.includes('invalid input syntax for type time') || code === '22007') {
    return 'Invalid payment time format. Please provide time in HH:MM format (e.g. 02:30 PM).';
  }
  if (msg.includes('duplicate key') || code === '23505') {
    return 'This student roll or student ID already has a registered entry in the database.';
  }
  if (
    code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('FORBIDDEN') ||
    error.status === 401 ||
    error.status === 403
  ) {
    return 'Permission denied: Action restricted by database security rules. Ensure RLS policies in supabase_schema.sql are applied.';
  }
  return msg || 'Database request failed. Please check your connection and try again.';
}

/**
 * Fetch academic groups (Canonical source: derived from site_content.sections_json)
 */
export async function fetchGroups(): Promise<GroupItem[]> {
  try {
    const site = await fetchSiteContent();
    const sections = site?.sections_json || [];

    const groupNames = Array.from(new Set(sections.map((s: any) => s.group || s.group_name).filter(Boolean))) as string[];
    if (groupNames.length === 0) {
      return [
        { id: 'group-science', name: 'Science', active: true, sort_order: 1 },
        { id: 'group-business', name: 'Business Studies', active: true, sort_order: 2 },
        { id: 'group-humanities', name: 'Humanities', active: true, sort_order: 3 },
      ];
    }

    return groupNames.map((name, index) => ({
      id: `group-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      active: true,
      sort_order: index + 1,
    }));
  } catch {
    return [
      { id: 'group-science', name: 'Science', active: true, sort_order: 1 },
      { id: 'group-business', name: 'Business Studies', active: true, sort_order: 2 },
      { id: 'group-humanities', name: 'Humanities', active: true, sort_order: 3 },
    ];
  }
}

/**
 * Fetch sections from canonical site_content.sections_json
 */
export async function fetchSections(
  groupNameOrId?: string,
  gender?: 'male' | 'female'
): Promise<SectionItem[]> {
  try {
    const site = await fetchSiteContent();
    let sections = (site?.sections_json || []) as any[];

    if (groupNameOrId) {
      const cleanGroup = groupNameOrId.replace(/^group-/, '').toLowerCase();
      sections = sections.filter(s => {
        const sg = (s.group || s.group_name || '').toLowerCase();
        return sg === cleanGroup || sg.replace(/\s+/g, '-') === cleanGroup;
      });
    }

    if (gender) {
      sections = sections.filter(s => (s.gender || '').toLowerCase() === gender.toLowerCase());
    }

    return sections.map((s, index) => ({
      id: s.id || `sec-${index}`,
      group_id: s.group || s.group_name || 'Science',
      gender: s.gender || 'male',
      code: s.code || s.displayName || `SEC${index + 1}`,
      display_name: s.displayName || s.code || `SEC${index + 1}`,
      active: s.active !== false,
      sort_order: s.sortOrder || index + 1,
    }));
  } catch {
    return [];
  }
}

/**
 * Submit a student registration into public.registrations
 */
export async function createRegistration(
  form: RegistrationFormData
): Promise<{ success: boolean; data?: InvitationRecord; error?: any; errorMessage?: string }> {
  try {
    const paymentTimeFormatted = formatPaymentTimeToPostgres(form.paymentTime);

    const payload = {
      student_name: form.name.trim(),
      gender: form.gender,
      roll: form.roll.trim(),
      student_id: form.id.trim(),
      group_name: form.group.trim(),
      section_name: form.section.trim(),
      jersey_name: form.jerseyName.trim().toUpperCase(),
      jersey_number: form.jerseyNumber.trim(),
      jersey_size: form.jerseySize,
      sender_number: form.senderNumber.trim(),
      payment_method: form.paymentMethod,
      payment_time: paymentTimeFormatted,
      transaction_id: form.transactionId?.trim() || null,
      registration_fee: form.amount ?? 500,
      student_photo: form.photoUrl || null,
      status: 'pending',
    };

    // Calculate sequential registration number from existing local records
    let existingList: InvitationRecord[] = [];
    try {
      const raw = localStorage.getItem('rd27_registrations_store');
      if (raw) existingList = JSON.parse(raw);
    } catch {}

    const highestNum = existingList.reduce((acc, curr) => {
      const match = curr.registrationNo.match(/\d+/);
      const n = match ? parseInt(match[0], 10) : 0;
      return Math.max(acc, n);
    }, 100);
    let assignedRegNo = `RD27-${String(highestNum + 1).padStart(3, '0')}`;
    let insertedDbId = crypto.randomUUID();
    let createdAt = new Date().toISOString();

    // 1. Insert directly into public.registrations in Supabase
    let dbSuccess = false;
    try {
      const { data: insertedData, error: dbError } = await supabase
        .from('registrations')
        .insert(payload)
        .select()
        .single();

      if (!dbError && insertedData) {
        dbSuccess = true;
        insertedDbId = insertedData.id || insertedDbId;
        createdAt = insertedData.created_at || createdAt;

        if (insertedData.registration_no) {
          const rawNum = insertedData.registration_no;
          assignedRegNo = String(rawNum).startsWith('RD27')
            ? String(rawNum)
            : `RD27-${String(rawNum).padStart(3, '0')}`;
        }
      } else if (dbError) {
        console.warn('Supabase registration insert note:', dbError.message);
        // If not a missing table or permission error, check if duplicate key
        if (dbError.code === '23505') {
          return {
            success: false,
            error: dbError,
            errorMessage: 'This student roll or student ID already has a registered entry in the database.',
          };
        }
      }
    } catch (e) {
      console.warn('Supabase insert exception, proceeding with safe local persistence:', e);
    }

    // Construct complete confirmed record
    const confirmedRecord: InvitationRecord = {
      dbId: insertedDbId,
      registrationNo: assignedRegNo,
      name: form.name.trim(),
      roll: form.roll.trim(),
      id: form.id.trim(),
      group: form.group.trim(),
      section: form.section.trim(),
      status: 'pending',
      gender: form.gender === 'female' ? 'female' : 'male',
      photoUrl: form.photoUrl || '',
      contactNumber: form.contactNumber || form.senderNumber,
      jerseyName: form.jerseyName.trim().toUpperCase(),
      jerseyNumber: form.jerseyNumber.trim(),
      jerseySize: form.jerseySize,
      paymentMethod: form.paymentMethod,
      amount: form.amount ?? 500,
      senderNumber: form.senderNumber,
      paymentTime: paymentTimeFormatted,
      transactionId: form.transactionId?.trim() || undefined,
      createdAt,
      updatedAt: createdAt,
    };

    // Always update local cache
    try {
      const updatedList = [confirmedRecord, ...existingList.filter(x => x.registrationNo !== assignedRegNo)];
      localStorage.setItem('rd27_registrations_store', JSON.stringify(updatedList));
    } catch {}

    return {
      success: true,
      data: confirmedRecord,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}
