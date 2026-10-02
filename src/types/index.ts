export type GenderType = 'choose_one' | 'male' | 'female';

export type JerseySize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';

export type SendMethod = 'bkash' | 'nagad';
export type PaymentMethod = SendMethod;

export type InvitationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Frontend Form Fields matching exact registration order:
 * 1. Full Name
 * 2. Class Roll
 * 3. Student ID
 * 4. Contact Mobile Number
 * 5. Academic Group
 * 6. Academic Section
 * 7. Student Photo
 * 8. Send Method
 * 9. Sender Mobile No
 * 10. Payment Time
 * 11. Transaction ID
 * 12. Jersey Back Name
 * 13. Jersey Number
 * 14. Jersey Size
 */
export interface RegistrationFormData {
  gender: GenderType;
  full_name: string;
  class_roll: string;
  student_id: string;
  contact_mobile_number: string;
  academic_group: string;
  academic_section: string;
  student_photo: string | null;
  photoFile?: File | null;
  photoBlob?: Blob | null;
  send_method: SendMethod;
  sender_mobile_no: string;
  payment_time: string;
  transaction_id: string;
  jersey_back_name: string;
  jersey_number: string;
  jersey_size: JerseySize;
}

/**
 * Database Registration Record with exact column names:
 * sl_no, registration_no, full_name, class_roll, student_id,
 * contact_mobile_number, academic_group, academic_section, student_photo,
 * send_method, sender_mobile_no, payment_time, transaction_id,
 * jersey_back_name, jersey_number, jersey_size, gender, status,
 * reject_reason, approved_by, rejected_by, approved_at, rejected_at,
 * created_at, updated_at
 */
export interface RegistrationRecord {
  id?: string;
  dbId?: string;
  sl_no?: number;
  registration_no: string;
  full_name: string;
  class_roll: string;
  student_id: string;
  contact_mobile_number: string;
  academic_group: string;
  academic_section: string;
  student_photo?: string | null;
  send_method: SendMethod;
  sender_mobile_no: string;
  payment_time: string;
  transaction_id?: string;
  jersey_back_name: string;
  jersey_number: string;
  jersey_size: string;
  gender: 'male' | 'female';
  status: InvitationStatus;
  reject_reason?: string;
  approved_by?: string | null;
  rejected_by?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at?: string;
  updated_at?: string;
  hidden_from_web?: boolean;
  hidden_by?: string | null;
  hidden_at?: string | null;
  recovery_original_student_id?: string;
  recovery_original_full_name?: string;
  recovery_original_class_roll?: string;
}

export type InvitationRecord = RegistrationRecord;

export interface EventCard {
  id: string;
  icon: string; // 'calendar' | 'map-pin' | 'credit-card' | 'clock' | 'sparkles' | 'award' | 'shirt' | 'users' | 'music'
  title: string;
  description: string;
  subDetail?: string;
  customColor: string; // 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue'
  order: number;
  visible: boolean;
  image?: string;
}

export interface WebsiteSettings {
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventTime: string;
  eventDay?: number;
  eventMonth?: string;
  eventYear?: number;
  venue: string;
  registrationFee: string;
  lastRegDate: string;
  footerText: string;
  copyrightText: string;
  bannerText: string;
  bannerActive: boolean;
  countdownEnabled?: boolean;
}

export interface BrandingSettings {
  websiteLogo: string;
  favicon: string;
  heroBanner: string;
  heroBackground: string;
  jerseyFrontImage: string;
  jerseyBackImage: string;
  invitationCardBackground: string;
  footerLogo: string;
}

export interface PaymentSettings {
  registrationFee: number;
  currency: string;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  maleBkashNumber: string;
  maleNagadNumber: string;
  femaleBkashNumber: string;
  femaleNagadNumber: string;
  instructions?: string;
  paymentInstructions?: string;
}

export interface PdfSettings {
  pdfLogo?: string;
  pdfHeader: string;
  pdfSubHeader: string;
  watermarkLogo: string;
  watermarkOpacity: number;
  footerText: string;
  signatureArea: string;
  signatureTitle: string;
  approvalText: string;
  invitationCardTitle: string;
  customNotes: string;
}

export type SectionOrder = 'showcase_first' | 'cards_first';

export interface JerseyItem {
  id: string;
  name: string;
  badgeText: string; // e.g. "Signature Batch Edition", "Official Rag Day Jersey", "Premium Edition"
  tagText: string; // e.g. "RD27", "RD28", "Batch 2027", "Official Edition"
  frontImage: string; // URL or base64
  backImage: string; // URL or base64
  subtitle: string; // e.g. "Custom Squad Kit"
  title: string; // e.g. "Back Name & Number Print Included"
  badge1: string; // e.g. "Custom Fit"
  badge1Sub: string; // e.g. "Sizes S to 4XL"
  badge2: string; // e.g. "100% Cotton & Mesh"
}

export interface JerseyDesignCard {
  id: string;
  title: string;
  description: string;
  image: string;
  imageFilename?: string;
}

export interface JerseyShowcaseSettings {
  enabled: boolean;
  sectionOrder: SectionOrder; // 'showcase_first': Hero -> Jersey Showcase -> Event Cards -> Register; 'cards_first': Hero -> Event Cards -> Jersey Showcase -> Register
  jerseys: JerseyItem[];
  designCards?: JerseyDesignCard[];
}

export type AdminFileCategory =
  | 'logo'
  | 'banner'
  | 'jersey'
  | 'certificate'
  | 'resume'
  | 'invitation'
  | 'project'
  | 'skill';

export interface AdminFileItem {
  id: string;
  category: AdminFileCategory;
  title: string;
  description?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  uploadedAt: string;
}

export interface GroupItem {
  id: string;
  name: string;
  active: boolean;
  sort_order?: number;
}

export interface SectionItem {
  id: string;
  group_id: string;
  gender: 'male' | 'female';
  code: string;
  display_name: string;
  active: boolean;
  sort_order?: number;
}

export interface SiteSectionItem {
  id: string;
  section_key: string;
  title: string;
  visible: boolean;
  sort_order: number;
}

export interface BackendRegistrationInput {
  full_name: string;
  class_roll: string;
  student_id: string;
  contact_mobile_number: string;
  academic_group: string;
  academic_section: string;
  student_photo?: string | null;
  send_method: SendMethod;
  sender_mobile_no: string;
  payment_time: string;
  transaction_id?: string | null;
  jersey_back_name: string;
  jersey_number: string;
  jersey_size: string;
  gender: 'male' | 'female';
  registration_no?: string;
  status?: InvitationStatus;
}

export interface AdminProfile {
  id?: string;
  auth_user_id: string;
  username: string | null;
  full_name: string;
  role: 'male_admin' | 'female_admin';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicStudentResult {
  registration_no: string;
  full_name?: string;
  class_roll?: string;
  student_id?: string;
  gender?: string;
  academic_group?: string;
  academic_section?: string;
  student_photo?: string | null;
  jersey_back_name?: string;
  jersey_number?: string;
  jersey_size?: string;
  status: InvitationStatus;
  reject_reason?: string;
}
