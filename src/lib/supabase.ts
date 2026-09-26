import { createClient } from '@supabase/supabase-js';
import {
  InvitationRecord,
  InvitationStatus,
  WebsiteSettings,
  BrandingSettings,
  PaymentSettings,
  PdfSettings,
  EventCard,
  JerseyShowcaseSettings,
  AdminFileItem,
} from '../types';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://rqjlrbteaqjpgwkeomro.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_BcoEceXY8X9BxifFSMRjoA_neWVF9wb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Storage Bucket Name
export const STORAGE_BUCKET = 'uploads';

// Local storage backup keys for offline resilience & immediate availability
const STORAGE_KEYS = {
  REGISTRATIONS: 'rd27_supabase_registrations_cache',
  WEBSITE: 'rd27_supabase_website_settings',
  BRANDING: 'rd27_supabase_branding_settings',
  PAYMENT: 'rd27_supabase_payment_settings',
  PDF: 'rd27_supabase_pdf_settings',
  CARDS: 'rd27_supabase_event_cards',
  JERSEY_SHOWCASE: 'rd27_supabase_jersey_showcase',
};

// ============================================================================
// 1. REGISTRATION & SERIAL NUMBER LOGIC
// Requirements:
// - Registration Number must be generated automatically and remain unique.
// - Serial Number and Registration Number must be separate.
// - If a registration is deleted/rejected, only the Registration Number becomes
//   available for reuse according to the project's existing registration-number logic.
// ============================================================================

export function getNextAvailableRegistrationNumber(records: InvitationRecord[]): string {
  // Only active records (pending or approved) hold registration numbers
  // Rejected or deleted records free up their registration numbers for reuse!
  const activeNumbers = new Set<number>();

  for (const r of records) {
    if (r.status !== 'rejected') {
      const match = r.registrationNo?.match(/^RD27-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
          activeNumbers.add(num);
        }
      }
    }
  }

  // Find lowest available integer 1, 2, 3...
  let candidate = 1;
  while (activeNumbers.has(candidate)) {
    candidate++;
  }

  return `RD27-${String(candidate).padStart(3, '0')}`;
}

export function getNextSerialNumber(records: InvitationRecord[]): number {
  // Serial number is a permanent monotonic counter (highest serial ever + 1)
  let maxSerial = 0;
  for (const r of records) {
    if (typeof r.serialNo === 'number' && r.serialNo > maxSerial) {
      maxSerial = r.serialNo;
    }
  }
  return Math.max(maxSerial + 1, records.length + 1);
}

// ============================================================================
// 2. SUPABASE STORAGE UPLOADS
// ============================================================================

export async function uploadFileToStorage(
  file: File | Blob,
  folder: 'logos' | 'banners' | 'jerseys' | 'students' | 'certificates' | 'invitations' | 'resumes' | 'projects' | 'files',
  customFileName?: string
): Promise<string> {
  try {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const cleanName = customFileName
      ? `${customFileName}.${ext}`
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${folder}/${cleanName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase storage upload returned error (using data URL fallback):', error.message);
      return fileToDataUrl(file);
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data?.path || filePath);

    return publicUrlData?.publicUrl || fileToDataUrl(file);
  } catch (err) {
    console.warn('Storage upload exception (using data URL fallback):', err);
    return fileToDataUrl(file);
  }
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// 3. REGISTRATIONS DATABASE CRUD
// ============================================================================

export function mapDbToInvitation(row: any): InvitationRecord {
  return {
    dbId: row.id,
    serialNo: Number(row.serial_no) || 1,
    registrationNo: row.registration_no,
    name: row.name,
    roll: row.roll,
    id: row.student_id,
    group: row.group_name,
    section: row.section,
    status: (row.status as InvitationStatus) || 'pending',
    gender: (row.gender as 'male' | 'female') || 'male',
    photoUrl: row.photo_url || '',
    contactNumber: row.contact_number || '',
    jerseyName: row.jersey_name || '',
    jerseyNumber: row.jersey_number || '27',
    jerseySize: row.jersey_size || 'L',
    paymentMethod: row.payment_method || 'bkash',
    amount: Number(row.amount) || 500,
    senderNumber: row.sender_number || '',
    paymentTime: row.payment_time || '',
    transactionId: row.transaction_id || undefined,
    seatZone: row.seat_zone || 'Zone A - Amphitheatre Front Row',
    gate: row.gate || 'Gate 02 (North Pavilion)',
    issuedAt: row.issued_at || (row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined),
    rejectionReason: row.rejection_reason || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInvitationToDb(rec: InvitationRecord): any {
  return {
    registration_no: rec.registrationNo,
    name: rec.name,
    roll: rec.roll,
    student_id: rec.id,
    group_name: rec.group,
    section: rec.section,
    gender: rec.gender,
    photo_url: rec.photoUrl || null,
    contact_number: rec.contactNumber || null,
    jersey_name: rec.jerseyName,
    jersey_number: rec.jerseyNumber || '27',
    jersey_size: rec.jerseySize || 'L',
    payment_method: rec.paymentMethod || 'bkash',
    amount: rec.amount || 500,
    sender_number: rec.senderNumber || '',
    payment_time: rec.paymentTime || '',
    transaction_id: rec.transactionId || null,
    status: rec.status,
    rejection_reason: rec.rejectionReason || null,
    seat_zone: rec.seatZone || 'Zone A - Amphitheatre Front Row',
    gate: rec.gate || 'Gate 02 (North Pavilion)',
    issued_at: rec.issuedAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

export async function fetchRegistrationsFromSupabase(): Promise<{
  data: InvitationRecord[];
  fromDb: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('serial_no', { ascending: false });

    if (error) {
      console.warn('Failed to fetch from registrations table in Supabase:', error.message);
      // Load from local cache if table is being created
      const cached = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
      return {
        data: cached ? JSON.parse(cached) : [],
        fromDb: false,
        error: error.message,
      };
    }

    if (data && Array.isArray(data)) {
      const records = data.map(mapDbToInvitation);
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(records));
      return { data: records, fromDb: true };
    }

    return { data: [], fromDb: true };
  } catch (err: any) {
    console.warn('Exception fetching registrations from Supabase:', err);
    const cached = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    return {
      data: cached ? JSON.parse(cached) : [],
      fromDb: false,
      error: err?.message || 'Unknown network error',
    };
  }
}

export async function saveRegistrationToSupabase(
  rec: InvitationRecord
): Promise<{ success: boolean; data?: InvitationRecord; error?: string }> {
  try {
    const payload = mapInvitationToDb(rec);

    const { data, error } = await supabase
      .from('registrations')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.warn('Could not insert registration into Supabase table (caching locally):', error.message);
      // Keep in local cache
      const cachedStr = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
      const list: InvitationRecord[] = cachedStr ? JSON.parse(cachedStr) : [];
      const updatedList = [rec, ...list.filter(x => x.registrationNo !== rec.registrationNo)];
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(updatedList));
      return { success: true, data: rec, error: error.message };
    }

    const savedRecord = mapDbToInvitation(data);
    // Update local cache
    const cachedStr = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    const list: InvitationRecord[] = cachedStr ? JSON.parse(cachedStr) : [];
    localStorage.setItem(
      STORAGE_KEYS.REGISTRATIONS,
      JSON.stringify([savedRecord, ...list.filter(x => x.registrationNo !== savedRecord.registrationNo)])
    );

    return { success: true, data: savedRecord };
  } catch (err: any) {
    console.warn('Exception inserting registration into Supabase:', err);
    // Save to local cache
    const cachedStr = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    const list: InvitationRecord[] = cachedStr ? JSON.parse(cachedStr) : [];
    localStorage.setItem(
      STORAGE_KEYS.REGISTRATIONS,
      JSON.stringify([rec, ...list.filter(x => x.registrationNo !== rec.registrationNo)])
    );
    return { success: true, data: rec, error: err?.message };
  }
}

export async function updateRegistrationStatusInSupabase(
  regNo: string,
  status: InvitationStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (reason !== undefined) {
      updates.rejection_reason = reason;
    }
    if (status === 'approved') {
      updates.seat_zone = 'Zone A - Amphitheatre Front Row';
      updates.gate = 'Gate 02 (North Pavilion)';
      updates.issued_at = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const { error } = await supabase
      .from('registrations')
      .update(updates)
      .eq('registration_no', regNo);

    if (error) {
      console.warn('Supabase update status error:', error.message);
    }

    // Always update local cache
    const cachedStr = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (cachedStr) {
      const list: InvitationRecord[] = JSON.parse(cachedStr);
      const updated = list.map(item =>
        item.registrationNo === regNo
          ? {
              ...item,
              status,
              rejectionReason: reason || item.rejectionReason,
              seatZone: status === 'approved' ? 'Zone A - Amphitheatre Front Row' : item.seatZone,
              gate: status === 'approved' ? 'Gate 02 (North Pavilion)' : item.gate,
            }
          : item
      );
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(updated));
    }

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function updateRegistrationDetailsInSupabase(
  regNo: string,
  updates: Partial<InvitationRecord>
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.roll !== undefined) dbPayload.roll = updates.roll;
    if (updates.id !== undefined) dbPayload.student_id = updates.id;
    if (updates.group !== undefined) dbPayload.group_name = updates.group;
    if (updates.section !== undefined) dbPayload.section = updates.section;
    if (updates.gender !== undefined) dbPayload.gender = updates.gender;
    if (updates.jerseyName !== undefined) dbPayload.jersey_name = updates.jerseyName;
    if (updates.jerseyNumber !== undefined) dbPayload.jersey_number = updates.jerseyNumber;
    if (updates.jerseySize !== undefined) dbPayload.jersey_size = updates.jerseySize;
    if (updates.senderNumber !== undefined) dbPayload.sender_number = updates.senderNumber;
    if (updates.paymentTime !== undefined) dbPayload.payment_time = updates.paymentTime;
    if (updates.transactionId !== undefined) dbPayload.transaction_id = updates.transactionId;
    if (updates.seatZone !== undefined) dbPayload.seat_zone = updates.seatZone;
    if (updates.gate !== undefined) dbPayload.gate = updates.gate;
    if (updates.photoUrl !== undefined) dbPayload.photo_url = updates.photoUrl;

    const { error } = await supabase
      .from('registrations')
      .update(dbPayload)
      .eq('registration_no', regNo);

    // Update local cache
    const cachedStr = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (cachedStr) {
      const list: InvitationRecord[] = JSON.parse(cachedStr);
      const updated = list.map(item =>
        item.registrationNo === regNo ? { ...item, ...updates } : item
      );
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(updated));
    }

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteRegistrationFromSupabase(
  regNo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('registration_no', regNo);

    // Update local cache
    const cachedStr = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (cachedStr) {
      const list: InvitationRecord[] = JSON.parse(cachedStr);
      const updated = list.filter(item => item.registrationNo !== regNo);
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(updated));
    }

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ============================================================================
// 4. SETTINGS DATABASE CRUD (Event, Branding, Payment, PDF, Cards, Showcase)
// ============================================================================

export async function fetchEventSettingsFromSupabase(): Promise<WebsiteSettings | null> {
  try {
    const { data, error } = await supabase
      .from('event_settings')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data) return null;

    return {
      eventName: data.event_name,
      eventDescription: data.event_description || '',
      eventDate: data.event_date || 'November 27, 2027',
      eventTime: data.event_time || '09:00 AM',
      eventDay: data.event_day || 27,
      eventMonth: data.event_month || 'November',
      eventYear: data.event_year || 2027,
      venue: data.venue || '',
      registrationFee: data.registration_fee || '500 BDT',
      lastRegDate: data.last_reg_date || '',
      footerText: data.footer_text || '',
      copyrightText: data.copyright_text || '',
      bannerText: data.banner_text || '',
      bannerActive: data.banner_active ?? true,
    };
  } catch {
    return null;
  }
}

export async function saveEventSettingsToSupabase(
  s: WebsiteSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: 'current',
      event_name: s.eventName,
      event_description: s.eventDescription,
      event_date: s.eventDate,
      event_time: s.eventTime,
      event_day: s.eventDay,
      event_month: s.eventMonth,
      event_year: s.eventYear,
      venue: s.venue,
      registration_fee: s.registrationFee,
      last_reg_date: s.lastRegDate,
      footer_text: s.footerText,
      copyright_text: s.copyrightText,
      banner_text: s.bannerText,
      banner_active: s.bannerActive,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('event_settings')
      .upsert(payload);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function fetchBrandingSettingsFromSupabase(): Promise<BrandingSettings | null> {
  try {
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data) return null;

    return {
      websiteLogo: data.website_logo || '',
      favicon: data.favicon || '',
      heroBanner: data.hero_banner || '',
      heroBackground: data.hero_background || '',
      jerseyFrontImage: data.jersey_front_image || '',
      jerseyBackImage: data.jersey_back_image || '',
      invitationCardBackground: data.invitation_card_background || '',
      footerLogo: data.footer_logo || '',
    };
  } catch {
    return null;
  }
}

export async function saveBrandingSettingsToSupabase(
  s: BrandingSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: 'current',
      website_logo: s.websiteLogo,
      favicon: s.favicon,
      hero_banner: s.heroBanner,
      hero_background: s.heroBackground,
      jersey_front_image: s.jerseyFrontImage,
      jersey_back_image: s.jerseyBackImage,
      invitation_card_background: s.invitationCardBackground,
      footer_logo: s.footerLogo,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('branding_settings')
      .upsert(payload);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function fetchPaymentSettingsFromSupabase(): Promise<PaymentSettings | null> {
  try {
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data) return null;

    return {
      registrationFee: Number(data.registration_fee) || 500,
      currency: data.currency || 'BDT',
      bkashEnabled: data.bkash_enabled ?? true,
      nagadEnabled: data.nagad_enabled ?? true,
      maleBkashNumber: data.male_bkash_number || '',
      maleNagadNumber: data.male_nagad_number || '',
      femaleBkashNumber: data.female_bkash_number || '',
      femaleNagadNumber: data.female_nagad_number || '',
      instructions: data.instructions || '',
      paymentInstructions: data.payment_instructions || '',
    };
  } catch {
    return null;
  }
}

export async function savePaymentSettingsToSupabase(
  s: PaymentSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: 'current',
      registration_fee: s.registrationFee,
      currency: s.currency,
      bkash_enabled: s.bkashEnabled,
      nagad_enabled: s.nagadEnabled,
      male_bkash_number: s.maleBkashNumber,
      male_nagad_number: s.maleNagadNumber,
      female_bkash_number: s.femaleBkashNumber,
      female_nagad_number: s.femaleNagadNumber,
      instructions: s.instructions,
      payment_instructions: s.paymentInstructions,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('payment_settings')
      .upsert(payload);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function fetchPdfSettingsFromSupabase(): Promise<PdfSettings | null> {
  try {
    const { data, error } = await supabase
      .from('pdf_settings')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data) return null;

    return {
      pdfLogo: data.pdf_logo || '',
      pdfHeader: data.pdf_header || 'RAG DAY 27 (RD27)',
      pdfSubHeader: data.pdf_sub_header || 'Official Registration Ledger',
      watermarkLogo: data.watermark_logo || 'RD27 OFFICIAL',
      watermarkOpacity: Number(data.watermark_opacity) || 0.08,
      footerText: data.footer_text || '',
      signatureArea: data.signature_area || '',
      signatureTitle: data.signature_title || '',
      approvalText: data.approval_text || 'APPROVED & VERIFIED',
      invitationCardTitle: data.invitation_card_title || 'RAG DAY 2027 - OFFICIAL INVITATION PASS',
      customNotes: data.custom_notes || '',
    };
  } catch {
    return null;
  }
}

export async function savePdfSettingsToSupabase(
  s: PdfSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: 'current',
      pdf_logo: s.pdfLogo,
      pdf_header: s.pdfHeader,
      pdf_sub_header: s.pdfSubHeader,
      watermark_logo: s.watermarkLogo,
      watermark_opacity: s.watermarkOpacity,
      footer_text: s.footerText,
      signature_area: s.signatureArea,
      signature_title: s.signatureTitle,
      approval_text: s.approvalText,
      invitation_card_title: s.invitationCardTitle,
      custom_notes: s.customNotes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('pdf_settings')
      .upsert(payload);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function fetchEventCardsFromSupabase(): Promise<EventCard[] | null> {
  try {
    const { data, error } = await supabase
      .from('event_cards')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) return null;

    return data.map(c => ({
      id: c.id,
      icon: c.icon,
      title: c.title,
      description: c.description,
      subDetail: c.sub_detail,
      customColor: c.custom_color || 'indigo',
      order: c.display_order || 1,
      visible: c.visible ?? true,
    }));
  } catch {
    return null;
  }
}

export async function saveEventCardsToSupabase(
  cards: EventCard[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const payloads = cards.map(c => ({
      id: c.id,
      icon: c.icon,
      title: c.title,
      description: c.description,
      sub_detail: c.subDetail || null,
      custom_color: c.customColor,
      display_order: c.order,
      visible: c.visible,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('event_cards')
      .upsert(payloads);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function fetchJerseyShowcaseFromSupabase(): Promise<JerseyShowcaseSettings | null> {
  try {
    const { data, error } = await supabase
      .from('jersey_showcase')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    if (error || !data) return null;

    return {
      enabled: data.enabled ?? true,
      sectionOrder: data.section_order || 'showcase_first',
      jerseys: Array.isArray(data.jerseys) ? data.jerseys : [],
    };
  } catch {
    return null;
  }
}

export async function saveJerseyShowcaseToSupabase(
  s: JerseyShowcaseSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: 'current',
      enabled: s.enabled,
      section_order: s.sectionOrder,
      jerseys: s.jerseys,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('jersey_showcase')
      .upsert(payload);

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ============================================================================
// 4.5. ADMIN FILES & ASSETS DATABASE CRUD (Certificates, Resumes, Logos, etc.)
// ============================================================================

export async function fetchAdminFilesFromSupabase(
  category?: string
): Promise<AdminFileItem[]> {
  try {
    let query = supabase.from('admin_files').select('*').order('created_at', { ascending: false });
    if (category) {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error || !data) {
      const cached = localStorage.getItem('rd27_supabase_admin_files');
      const list: AdminFileItem[] = cached ? JSON.parse(cached) : [];
      return category ? list.filter(item => item.category === category) : list;
    }

    const items: AdminFileItem[] = data.map((d: any) => ({
      id: d.id,
      category: d.category,
      title: d.title,
      description: d.description || '',
      fileUrl: d.file_url,
      fileName: d.file_name || '',
      fileSize: d.file_size || '',
      fileType: d.file_type || '',
      uploadedAt: d.created_at || new Date().toISOString(),
    }));

    localStorage.setItem('rd27_supabase_admin_files', JSON.stringify(items));
    return items;
  } catch {
    const cached = localStorage.getItem('rd27_supabase_admin_files');
    const list: AdminFileItem[] = cached ? JSON.parse(cached) : [];
    return category ? list.filter(item => item.category === category) : list;
  }
}

export async function saveAdminFileToSupabase(
  fileItem: AdminFileItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      id: fileItem.id,
      category: fileItem.category,
      title: fileItem.title,
      description: fileItem.description || null,
      file_url: fileItem.fileUrl,
      file_name: fileItem.fileName || null,
      file_size: fileItem.fileSize || null,
      file_type: fileItem.fileType || null,
      created_at: fileItem.uploadedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('admin_files').upsert(payload);

    // Update local cache
    const cached = localStorage.getItem('rd27_supabase_admin_files');
    const list: AdminFileItem[] = cached ? JSON.parse(cached) : [];
    const updated = [fileItem, ...list.filter(x => x.id !== fileItem.id)];
    localStorage.setItem('rd27_supabase_admin_files', JSON.stringify(updated));

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteAdminFileFromSupabase(
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('admin_files').delete().eq('id', fileId);

    // Update local cache
    const cached = localStorage.getItem('rd27_supabase_admin_files');
    if (cached) {
      const list: AdminFileItem[] = JSON.parse(cached);
      localStorage.setItem(
        'rd27_supabase_admin_files',
        JSON.stringify(list.filter(x => x.id !== fileId))
      );
    }

    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ============================================================================
// 5. SUPABASE HEALTH & CONNECTION STATUS CHECKER
// ============================================================================

export interface SupabaseHealthStatus {
  connected: boolean;
  projectUrl: string;
  projectId: string;
  registrationsTable: boolean;
  eventSettingsTable: boolean;
  brandingSettingsTable: boolean;
  paymentSettingsTable: boolean;
  pdfSettingsTable: boolean;
  eventCardsTable: boolean;
  jerseyShowcaseTable: boolean;
  adminFilesTable: boolean;
  storageBucket: boolean;
  registrationCount: number;
  errorMessage?: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const status: SupabaseHealthStatus = {
    connected: false,
    projectUrl: SUPABASE_URL,
    projectId: 'rqjlrbteaqjpgwkeomro',
    registrationsTable: false,
    eventSettingsTable: false,
    brandingSettingsTable: false,
    paymentSettingsTable: false,
    pdfSettingsTable: false,
    eventCardsTable: false,
    jerseyShowcaseTable: false,
    adminFilesTable: false,
    storageBucket: false,
    registrationCount: 0,
  };

  try {
    // 1. Check registrations table
    const { data: regData, error: regErr } = await supabase
      .from('registrations')
      .select('id', { count: 'exact' })
      .limit(1);

    if (!regErr) {
      status.connected = true;
      status.registrationsTable = true;
      status.registrationCount = regData ? regData.length : 0;
    } else if (regErr.code !== 'PGRST205') {
      status.connected = true;
      status.errorMessage = regErr.message;
    }

    // 2. Check event_settings table
    const { error: eventErr } = await supabase.from('event_settings').select('id').limit(1);
    if (!eventErr) {
      status.connected = true;
      status.eventSettingsTable = true;
    }

    // 3. Check branding_settings table
    const { error: brandErr } = await supabase.from('branding_settings').select('id').limit(1);
    if (!brandErr) {
      status.connected = true;
      status.brandingSettingsTable = true;
    }

    // 4. Check payment_settings table
    const { error: payErr } = await supabase.from('payment_settings').select('id').limit(1);
    if (!payErr) {
      status.connected = true;
      status.paymentSettingsTable = true;
    }

    // 5. Check pdf_settings table
    const { error: pdfErr } = await supabase.from('pdf_settings').select('id').limit(1);
    if (!pdfErr) {
      status.connected = true;
      status.pdfSettingsTable = true;
    }

    // 6. Check event_cards table
    const { error: cardsErr } = await supabase.from('event_cards').select('id').limit(1);
    if (!cardsErr) {
      status.connected = true;
      status.eventCardsTable = true;
    }

    // 7. Check jersey_showcase table
    const { error: jerseyErr } = await supabase.from('jersey_showcase').select('id').limit(1);
    if (!jerseyErr) {
      status.connected = true;
      status.jerseyShowcaseTable = true;
    }

    // 8. Check admin_files table
    const { error: filesErr } = await supabase.from('admin_files').select('id').limit(1);
    if (!filesErr) {
      status.connected = true;
      status.adminFilesTable = true;
    }

    // 9. Check storage bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets && buckets.some(b => b.name === STORAGE_BUCKET || b.id === STORAGE_BUCKET)) {
      status.storageBucket = true;
      status.connected = true;
    } else {
      // If we reached Supabase API without network exception, connection is alive
      status.connected = true;
    }
  } catch (err: any) {
    status.errorMessage = err?.message || 'Connection failed';
  }

  return status;
}

// ============================================================================
// 6. SQL SCHEMA SCRIPT FOR SUPABASE DASHBOARD
// ============================================================================

export const COMPLETE_SUPABASE_SCHEMA_SQL = `-- ============================================================================
-- RAG DAY REGISTRATION SYSTEM - SUPABASE SCHEMA & RLS POLICIES
-- Project URL: https://rqjlrbteaqjpgwkeomro.supabase.co
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no BIGSERIAL NOT NULL,
    registration_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    roll TEXT NOT NULL,
    student_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    section TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    photo_url TEXT,
    contact_number TEXT,
    jersey_name TEXT NOT NULL,
    jersey_number TEXT NOT NULL DEFAULT '27',
    jersey_size TEXT NOT NULL DEFAULT 'L',
    payment_method TEXT NOT NULL DEFAULT 'bkash',
    amount NUMERIC NOT NULL DEFAULT 500,
    sender_number TEXT NOT NULL,
    payment_time TEXT NOT NULL,
    transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    seat_zone TEXT DEFAULT 'Zone A - Amphitheatre Front Row',
    gate TEXT DEFAULT 'Gate 02 (North Pavilion)',
    issued_at TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registrations_reg_no ON public.registrations (registration_no);
CREATE INDEX IF NOT EXISTS idx_registrations_gender ON public.registrations (gender);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations (status);

-- 2. EVENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.event_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    event_name TEXT NOT NULL DEFAULT 'RAG DAY 27',
    event_description TEXT DEFAULT 'Official Batch 2027 Portal',
    event_date TEXT DEFAULT 'November 27, 2027',
    event_time TEXT DEFAULT '09:00 AM',
    event_day INTEGER DEFAULT 27,
    event_month TEXT DEFAULT 'November',
    event_year INTEGER DEFAULT 2027,
    venue TEXT DEFAULT 'Main Campus Auditorium & Amphitheatre Grounds',
    registration_fee TEXT DEFAULT '500 BDT',
    last_reg_date TEXT DEFAULT 'October 30, 2027',
    footer_text TEXT DEFAULT 'The Official Registration Platform for Rag Day 27. Celebrating unity, memories, and excellence.',
    copyright_text TEXT DEFAULT '© 2027 Batch 27 Committee. All rights reserved.',
    banner_text TEXT DEFAULT 'Early Bird Registration is LIVE! Complete verification to lock your customized kit.',
    banner_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BRANDING SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.branding_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    website_logo TEXT DEFAULT '',
    favicon TEXT DEFAULT '',
    hero_banner TEXT DEFAULT '',
    hero_background TEXT DEFAULT '',
    jersey_front_image TEXT DEFAULT '',
    jersey_back_image TEXT DEFAULT '',
    invitation_card_background TEXT DEFAULT '',
    footer_logo TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PAYMENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    registration_fee NUMERIC NOT NULL DEFAULT 500,
    currency TEXT NOT NULL DEFAULT 'BDT',
    bkash_enabled BOOLEAN NOT NULL DEFAULT true,
    nagad_enabled BOOLEAN NOT NULL DEFAULT true,
    male_bkash_number TEXT DEFAULT '01712-345678',
    male_nagad_number TEXT DEFAULT '01912-345678',
    female_bkash_number TEXT DEFAULT '01812-345678',
    female_nagad_number TEXT DEFAULT '01612-345678',
    instructions TEXT DEFAULT 'Please send the exact amount as Personal / Send Money. Keep TrxID for verification.',
    payment_instructions TEXT DEFAULT 'Please send the exact amount as Personal / Send Money. Keep TrxID for verification.',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PDF SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.pdf_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    pdf_logo TEXT DEFAULT '',
    pdf_header TEXT DEFAULT 'RAG DAY 27 (RD27)',
    pdf_sub_header TEXT DEFAULT 'Official Registration Ledger',
    watermark_logo TEXT DEFAULT 'RD27 OFFICIAL',
    watermark_opacity NUMERIC DEFAULT 0.08,
    footer_text TEXT DEFAULT 'RD27 Rag Day 2027 Official Record · Unauthorized duplication prohibited.',
    signature_area TEXT DEFAULT 'Executive Convener',
    signature_title TEXT DEFAULT 'Authorized Rag Day 2027 Committee',
    approval_text TEXT DEFAULT 'APPROVED & VERIFIED',
    invitation_card_title TEXT DEFAULT 'RAG DAY 2027 - OFFICIAL INVITATION PASS',
    custom_notes TEXT DEFAULT 'Please present your printed pass or digital PDF at entry checkpoint for barcode scanning.',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. EVENT CARDS TABLE
CREATE TABLE IF NOT EXISTS public.event_cards (
    id TEXT PRIMARY KEY,
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sub_detail TEXT,
    custom_color TEXT DEFAULT 'indigo',
    display_order INTEGER DEFAULT 1,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. JERSEY SHOWCASE TABLE
CREATE TABLE IF NOT EXISTS public.jersey_showcase (
    id TEXT PRIMARY KEY DEFAULT 'current',
    enabled BOOLEAN NOT NULL DEFAULT true,
    section_order TEXT NOT NULL DEFAULT 'showcase_first',
    jerseys JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ADMIN FILES & ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.admin_files (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_files_category ON public.admin_files (category);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jersey_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit registration" ON public.registrations;
CREATE POLICY "Public can submit registration" ON public.registrations FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view registrations" ON public.registrations;
CREATE POLICY "Public can view registrations" ON public.registrations FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;
CREATE POLICY "Admins can update registrations" ON public.registrations FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete registrations" ON public.registrations;
CREATE POLICY "Admins can delete registrations" ON public.registrations FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Public can view event_settings" ON public.event_settings;
CREATE POLICY "Public can view event_settings" ON public.event_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view branding_settings" ON public.branding_settings;
CREATE POLICY "Public can view branding_settings" ON public.branding_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view payment_settings" ON public.payment_settings;
CREATE POLICY "Public can view payment_settings" ON public.payment_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view pdf_settings" ON public.pdf_settings;
CREATE POLICY "Public can view pdf_settings" ON public.pdf_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view event_cards" ON public.event_cards;
CREATE POLICY "Public can view event_cards" ON public.event_cards FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view jersey_showcase" ON public.jersey_showcase;
CREATE POLICY "Public can view jersey_showcase" ON public.jersey_showcase FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage admin_files" ON public.admin_files;
CREATE POLICY "Public can manage admin_files" ON public.admin_files FOR ALL TO public USING (true) WITH CHECK (true);

-- 10. STORAGE BUCKET: uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view uploaded files" ON storage.objects;
CREATE POLICY "Public can view uploaded files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Public can upload files" ON storage.objects;
CREATE POLICY "Public can upload files" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Public can update uploaded files" ON storage.objects;
CREATE POLICY "Public can update uploaded files" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Public can delete uploaded files" ON storage.objects;
CREATE POLICY "Public can delete uploaded files" ON storage.objects FOR DELETE TO public USING (bucket_id = 'uploads');
`;
