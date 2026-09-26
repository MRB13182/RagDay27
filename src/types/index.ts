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

