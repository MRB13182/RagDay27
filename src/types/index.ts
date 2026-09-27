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
  photoUrl: string | null;
  photoFile?: File | null;
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
  registrationNo: string;
  name: string;
  roll: string;
  id: string;
  group: string;
  section: string;
  status: InvitationStatus;
  gender: 'male' | 'female';
  photoUrl: string | null;
  jerseyName: string;
  jerseyNumber: string;
  jerseySize: string;
  paymentMethod?: PaymentMethod;
  amount?: number;
  rejectionReason?: string;
  senderNumber?: string;
  paymentTime?: string;
  transactionId?: string;
  createdAt?: string;
  updatedAt?: string;
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
  registration_fee: number | null;
  venue: string | null;
  cards: unknown[];
  sections: unknown[];
  content_blocks: Record<string, unknown>;
  visible: boolean;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminRole = 'super_admin' | 'male_admin' | 'female_admin';

export interface AdminProfile {
  auth_user_id: string;
  username: string | null;
  full_name: string;
  role: AdminRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  subDetail?: string;
  customColor: string;
  order: number;
  visible: boolean;
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
  badgeText: string;
  tagText: string;
  frontImage: string;
  backImage: string;
  subtitle: string;
  title: string;
  badge1: string;
  badge1Sub: string;
  badge2: string;
}

export interface JerseyShowcaseSettings {
  enabled: boolean;
  sectionOrder: SectionOrder;
  jerseys: JerseyItem[];
}