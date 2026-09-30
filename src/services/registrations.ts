import { supabase } from '../lib/supabase';
import type {
  RegistrationFormData,
  InvitationRecord,
  GroupItem,
  SectionItem,
} from '../types';
import { DEFAULT_SECTIONS } from '../data/mockData';

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
 * Fetch academic groups (Canonical source: DEFAULT_SECTIONS)
 */
export async function fetchGroups(): Promise<GroupItem[]> {
  return [
    { id: 'group-science', name: 'Science', active: true, sort_order: 1 },
    { id: 'group-business', name: 'Business Studies', active: true, sort_order: 2 },
    { id: 'group-humanities', name: 'Humanities', active: true, sort_order: 3 },
  ];
}

/**
 * Fetch sections from canonical DEFAULT_SECTIONS
 */
export async function fetchSections(
  groupNameOrId?: string,
  gender?: 'male' | 'female'
): Promise<SectionItem[]> {
  try {
    let sections = (DEFAULT_SECTIONS || []) as any[];

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

const MALE_COUNTER_KEY = 'rd27_seq_male_counter';
const FEMALE_COUNTER_KEY = 'rd27_seq_female_counter';

/**
 * Gets the next permanent sequence number for Male (RDB27-XXXX) or Female (RDG27-XXXX).
 * Uses a persistent high-water mark so deleted numbers are NEVER reused.
 */
export function getNextSequenceNumber(
  gender: 'male' | 'female',
  existingList: InvitationRecord[] = []
): number {
  const isFemale = gender === 'female';
  const storageKey = isFemale ? FEMALE_COUNTER_KEY : MALE_COUNTER_KEY;

  let storedHighWater = 0;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > storedHighWater) {
        storedHighWater = parsed;
      }
    }
  } catch {}

  // Also check existing registrations to ensure high-water mark is accurate
  const listHigh = existingList
    .filter(r => r.gender === gender)
    .reduce((acc, curr) => {
      const match = curr.registrationNo.match(/\d+/);
      const n = match ? parseInt(match[0], 10) : 0;
      return Math.max(acc, n);
    }, 0);

  const highest = Math.max(storedHighWater, listHigh);
  const next = highest + 1;

  // Persist the new high-water mark immediately
  try {
    localStorage.setItem(storageKey, String(next));
  } catch {}

  return next;
}

/**
 * Checks if a registration already exists in local storage or database:
 * Case 1: Student ID matches
 * Case 2: Student Name and Roll match
 */
export async function checkDuplicateRegistration(
  studentId: string,
  name: string,
  roll: string,
  existingList: InvitationRecord[] = []
): Promise<InvitationRecord | null> {
  const cleanId = studentId.trim().toLowerCase();
  const cleanName = name.trim().toLowerCase();
  const cleanRoll = roll.trim().toLowerCase();

  if (!cleanId && (!cleanName || !cleanRoll)) {
    return null;
  }

  // 1. Check in passed / local stored registrations
  const localList = existingList.length > 0 ? existingList : (() => {
    try {
      const raw = localStorage.getItem('rd27_registrations_store');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const foundLocal = (localList as InvitationRecord[]).find(r => {
    const rId = (r.id || '').trim().toLowerCase();
    const rName = (r.name || '').trim().toLowerCase();
    const rRoll = (r.roll || '').trim().toLowerCase();

    // Case 1: Student ID matches
    if (cleanId && rId === cleanId) return true;

    // Case 2: Student Name and Roll match
    if (cleanName && cleanRoll && rName === cleanName && rRoll === cleanRoll) return true;

    return false;
  });

  if (foundLocal) {
    return foundLocal;
  }

  // 2. Query Supabase
  try {
    if (cleanId) {
      const { data } = await supabase
        .from('registrations')
        .select('*')
        .ilike('student_id', cleanId)
        .maybeSingle();

      if (data) {
        return {
          dbId: data.id,
          registrationNo: data.registration_no ? `RD${data.gender === 'female' ? 'G' : 'B'}27-${String(data.registration_no).padStart(4, '0')}` : 'Pending',
          name: data.student_name,
          roll: data.roll,
          id: data.student_id,
          group: data.group_name,
          section: data.section_name,
          status: data.status,
          gender: data.gender,
          photoUrl: data.student_photo,
          jerseyName: data.jersey_name,
          jerseyNumber: data.jersey_number,
          jerseySize: data.jersey_size,
          senderNumber: data.sender_number,
          paymentTime: data.payment_time,
          transactionId: data.transaction_id,
          rejectionReason: data.rejection_reason,
        };
      }
    }

    if (cleanName && cleanRoll) {
      const { data } = await supabase
        .from('registrations')
        .select('*')
        .ilike('student_name', cleanName)
        .ilike('roll', cleanRoll)
        .maybeSingle();

      if (data) {
        return {
          dbId: data.id,
          registrationNo: data.registration_no ? `RD${data.gender === 'female' ? 'G' : 'B'}27-${String(data.registration_no).padStart(4, '0')}` : 'Pending',
          name: data.student_name,
          roll: data.roll,
          id: data.student_id,
          group: data.group_name,
          section: data.section_name,
          status: data.status,
          gender: data.gender,
          photoUrl: data.student_photo,
          jerseyName: data.jersey_name,
          jerseyNumber: data.jersey_number,
          jerseySize: data.jersey_size,
          senderNumber: data.sender_number,
          paymentTime: data.payment_time,
          transactionId: data.transaction_id,
          rejectionReason: data.rejection_reason,
        };
      }
    }
  } catch {}

  return null;
}

/**
 * Submit a student registration into public.registrations.
 * If existingRegNo is provided, updates the existing record without generating a new registration number.
 * If new, generates Male: RDB27-XXXX or Female: RDG27-XXXX.
 */
export async function createRegistration(
  form: RegistrationFormData,
  existingRegNo?: string,
  existingDbId?: string
): Promise<{ success: boolean; data?: InvitationRecord; error?: any; errorMessage?: string }> {
  try {
    const paymentTimeFormatted = formatPaymentTimeToPostgres(form.paymentTime);
    const isFemale = form.gender === 'female';
    const genderKey: 'male' | 'female' = isFemale ? 'female' : 'male';
    const prefix = isFemale ? 'RDG27' : 'RDB27';

    // Retrieve local store records
    let existingList: InvitationRecord[] = [];
    try {
      const raw = localStorage.getItem('rd27_registrations_store');
      if (raw) existingList = JSON.parse(raw);
    } catch {}

    let assignedRegNo = existingRegNo || '';
    let seqNumber = 0;

    if (assignedRegNo) {
      // Re-submission: keep the exact same registration number permanent
      const match = assignedRegNo.match(/\d+/);
      seqNumber = match ? parseInt(match[0], 10) : 0;
    } else {
      // New registration: generate permanent sequence
      seqNumber = getNextSequenceNumber(genderKey, existingList);
      assignedRegNo = `${prefix}-${String(seqNumber).padStart(4, '0')}`;
    }

    const payload: any = {
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
      rejection_reason: null, // Clear any previous rejection reason upon re-submission
    };

    let insertedDbId = existingDbId || crypto.randomUUID();
    let createdAt = new Date().toISOString();

    // 1. Database operation: Update if existing, or Insert if new
    try {
      if (existingRegNo || existingDbId) {
        // Re-submission update
        let query = supabase.from('registrations').update({
          ...payload,
          updated_at: new Date().toISOString(),
        });

        if (existingDbId) {
          query = query.eq('id', existingDbId);
        } else if (seqNumber > 0) {
          query = query.eq('registration_no', seqNumber);
        }

        const { data: updatedData, error: updateError } = await query.select().maybeSingle();
        if (!updateError && updatedData) {
          insertedDbId = updatedData.id || insertedDbId;
          createdAt = updatedData.created_at || createdAt;
        }
      } else {
        // New insert
        const { data: insertedData, error: dbError } = await supabase
          .from('registrations')
          .insert({
            ...payload,
            registration_no: seqNumber,
          })
          .select()
          .maybeSingle();

        if (!dbError && insertedData) {
          insertedDbId = insertedData.id || insertedDbId;
          createdAt = insertedData.created_at || createdAt;
        } else if (dbError) {
          console.warn('Supabase registration insert note:', dbError.message);
          if (dbError.code === '23505') {
            return {
              success: false,
              error: dbError,
              errorMessage: 'This student roll or student ID already has a registered entry in the database.',
            };
          }
        }
      }
    } catch (e) {
      console.warn('Supabase database operation notice, continuing with local persistence:', e);
    }

    // Construct confirmed record
    const confirmedRecord: InvitationRecord = {
      dbId: insertedDbId,
      registrationNo: assignedRegNo,
      name: form.name.trim(),
      roll: form.roll.trim(),
      id: form.id.trim(),
      group: form.group.trim(),
      section: form.section.trim(),
      status: 'pending',
      gender: genderKey,
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
      updatedAt: new Date().toISOString(),
    };

    // Update local registrations store
    try {
      const updatedList = [
        confirmedRecord,
        ...existingList.filter(
          x => x.registrationNo !== assignedRegNo && (x.dbId ? x.dbId !== insertedDbId : true)
        ),
      ];
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
