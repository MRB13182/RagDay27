import {
  InvitationRecord,
  EventCard,
  WebsiteSettings,
  BrandingSettings,
  PdfSettings,
  PaymentSettings,
  JerseyShowcaseSettings,
} from '../types';
import defaultWhiteJersey from '../assets/images/white_hero_jersey_1790359567080.jpg';
import darkHeroJersey from '../assets/images/hero_white_kit_1790359583250.jpg';

export const INITIAL_INVITATIONS: InvitationRecord[] = [];

export const DEFAULT_EVENT_CARDS: EventCard[] = [
  {
    id: 'card-1',
    icon: 'calendar',
    title: 'Event Date',
    description: 'November 27, 2027',
    subDetail: 'Saturday, 10:00 AM – 11:30 PM',
    customColor: 'indigo',
    order: 1,
    visible: true,
  },
  {
    id: 'card-2',
    icon: 'map-pin',
    title: 'Venue',
    description: 'Central Amphitheatre',
    subDetail: 'Grand Plaza & Campus Grounds',
    customColor: 'cyan',
    order: 2,
    visible: true,
  },
  {
    id: 'card-3',
    icon: 'credit-card',
    title: 'Registration Fee',
    description: '500 BDT',
    subDetail: 'Includes Custom Jersey, Food & VIP Pass',
    customColor: 'emerald',
    order: 3,
    visible: true,
  },
  {
    id: 'card-4',
    icon: 'clock',
    title: 'Last Registration Date',
    description: 'October 31, 2027',
    subDetail: 'Strict deadline for custom jersey print',
    customColor: 'amber',
    order: 4,
    visible: true,
  },
];

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  eventName: 'Rag Day 27 (RD27)',
  eventDescription: 'A tribute to our shared stories, late-night campus laughs, and timeless bond. Join us for the ultimate celebration featuring custom jerseys, grand gala feast, and live musical nostalgia.',
  eventDate: 'November 27, 2027',
  eventTime: '10:00 AM – 11:30 PM',
  eventDay: 27,
  eventMonth: 'November',
  eventYear: 2027,
  venue: 'Central Amphitheatre',
  registrationFee: '500 BDT',
  lastRegDate: 'October 31, 2027',
  footerText: 'Official Batch 2027 Committee · Executive Administration',
  copyrightText: '© 2027 RD27. All Rights Reserved.',
  bannerText: 'Official Batch 27 Registration Portal · Please confirm custom jersey before October 31',
  bannerActive: true,
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  registrationFee: 500,
  currency: 'BDT',
  bkashEnabled: true,
  nagadEnabled: true,
  maleBkashNumber: '01712-345678',
  maleNagadNumber: '01912-345678',
  femaleBkashNumber: '01812-345678',
  femaleNagadNumber: '01612-345678',
  instructions: 'Please send the exact amount as Personal / Send Money. Keep TrxID for verification.',
  paymentInstructions: 'Please send the exact amount as Personal / Send Money. Keep TrxID for verification.',
};

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  websiteLogo: '',
  favicon: '',
  heroBanner: '',
  heroBackground: '',
  jerseyFrontImage: '',
  jerseyBackImage: '',
  invitationCardBackground: '',
  footerLogo: '',
};

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  pdfLogo: '',
  pdfHeader: 'RAG DAY 27 (RD27)',
  pdfSubHeader: 'Official Registration Ledger',
  watermarkLogo: 'RD27 OFFICIAL',
  watermarkOpacity: 0.08,
  footerText: 'RD27 Rag Day 2027 Official Record · Unauthorized duplication prohibited.',
  signatureArea: 'Executive Convener',
  signatureTitle: 'Authorized Rag Day 2027 Committee',
  approvalText: 'Verified and approved by Batch 27 Executive Committee. Gate entry strictly subject to verification.',
  invitationCardTitle: 'RAG DAY 2027 - OFFICIAL INVITATION PASS',
  customNotes: 'Please present your printed pass or digital PDF at entry checkpoint for barcode scanning.',
};

export const DEFAULT_JERSEY_SHOWCASE_SETTINGS: JerseyShowcaseSettings = {
  enabled: true,
  sectionOrder: 'showcase_first', // Hero -> Jersey Showcase -> Event Cards -> Register -> Footer
  jerseys: [
    {
      id: 'jersey-1',
      name: 'Official Catalyst White Jersey',
      badgeText: 'Signature Batch Edition',
      tagText: 'RD27',
      frontImage: defaultWhiteJersey,
      backImage: defaultWhiteJersey,
      subtitle: 'Custom Squad Kit',
      title: 'Back Name & Number Print Included',
      badge1: 'Custom Fit',
      badge1Sub: 'Sizes S to 4XL',
      badge2: '100% Cotton & Mesh',
    },
    {
      id: 'jersey-2',
      name: 'Cyber Glass Studio Edition',
      badgeText: 'Premium Edition',
      tagText: 'Batch 2027',
      frontImage: darkHeroJersey,
      backImage: darkHeroJersey,
      subtitle: 'Official Rag Day Jersey',
      title: 'Personalized Name & Batch Print',
      badge1: 'Breathable Knit',
      badge1Sub: 'Athletic Cut',
      badge2: 'Sublimation Print',
    },
  ],
};
