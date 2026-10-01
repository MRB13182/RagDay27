export type GenderType = 'choose_one' | 'male' | 'female';

export type JerseySize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';

export type PaymentMethod = 'bkash' | 'nagad';

export type InvitationStatus = 'pending' | 'approved' | 'rejected';

export interface RegistrationFormData {
  gender: GenderType;
  name: string;
  roll: string;
  id: string;
  group: string;
  section: string;
  contactNumber: string;
  photoUrl: string | null;
  photoFile?: File | null;
  photoBlob?: Blob | null;
  amount: number;
  paymentMethod: PaymentMethod;
  senderNumber: string;
  paymentTime: string;
  transactionId: string;
  jerseyName: string;
  jerseyNumber: string;
  jerseySize: JerseySize;
}

export interface InvitationRecord {
  dbId?: string;
  serialNo?: number;
  registrationNo: string;
  name: string;
  roll: string;
  id: string; // Student ID
  group: string;
  section: string;
  status: InvitationStatus;
  gender: 'male' | 'female';
  photoUrl: string;
  contactNumber?: string;
  jerseyName: string;
  jerseyNumber: string;
  jerseySize: string;
  paymentMethod?: PaymentMethod;
  amount?: number;
  seatZone?: string;
  gate?: string;
  issuedAt?: string;
  rejectionReason?: string;
  senderNumber?: string;
  paymentTime?: string;
  transactionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface JerseyShowcaseSettings {
  enabled: boolean;
  sectionOrder: SectionOrder; // 'showcase_first': Hero -> Jersey Showcase -> Event Cards -> Register; 'cards_first': Hero -> Event Cards -> Jersey Showcase -> Register
  jerseys: JerseyItem[];
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
  p_student_name: string;
  p_gender: 'male' | 'female';
  p_roll: string;
  p_student_id: string;
  p_group_id: string;
  p_section_id: string;
  p_jersey_name: string;
  p_jersey_number: string;
  p_jersey_size: string;
  p_sender_number: string;
  p_payment_method: string;
  p_payment_time: string;
  p_transaction_id?: string | null;
  p_student_photo_path?: string | null;
  p_contact_number: string;
}

export interface SiteContentRow {
  id: string;
  logo: string | null;
  favicon: string | null;
  banner: string | null;
  hero_background: string | null;
  male_front: string | null;
  male_back: string | null;
  female_front: string | null;
  female_back: string | null;
  jersey_preview: string | null;
  website_name: string | null;
  event_name: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  registration_fee: number | null;
  cards_json: EventCard[];
  sections_json: any[];
  content_blocks_json: {
    pdf?: {
      logo?: string | null;
      title?: string;
      subtitle?: string;
      showLogo?: boolean;
      showPhoto?: boolean;
      footerText?: string;
      signatureText?: string;
      showRegistrationNo?: boolean;
      showStudentDetails?: boolean;
    };
    jersey?: {
      items?: any[];
      sectionOrder?: string;
      showcaseEnabled?: boolean;
    };
    payment?: {
      currency?: string;
      bkashNumber?: string;
      nagadNumber?: string;
      bkashEnabled?: boolean;
      nagadEnabled?: boolean;
      instructions?: string;
    };
    bannerText?: string;
    footerText?: string;
    description?: string;
    bannerActive?: boolean;
    copyrightText?: string;
    dynamicSections?: any[];
    registrationOpen?: boolean;
    registrationDeadline?: string | null;
  };
  visible: boolean;
  sort_order: number;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminProfile {
  id?: string;
  auth_user_id: string;
  username: string | null;
  full_name: string;
  role: 'super_admin' | 'male_admin' | 'female_admin';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicStudentResult {
  registration_no: string | number;
  name?: string;
  student_name?: string;
  status: InvitationStatus;
  rejection_reason?: string;
  gender?: string;
  roll?: string;
  student_id?: string;
}

