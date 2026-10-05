import type { EventCard, JerseyDesignCard } from '../types';
import logoImg from '../assets/images/logo.png';
import faviconImg from '../assets/images/favicon.png';
import maleJerseyImg from '../assets/images/male-jersey.png';
import femaleJerseyImg from '../assets/images/female-jersey.png';
import jerseyBgImg from '../assets/images/jersey-background.png';
import jerseyOneImg from '../assets/images/jersey-one.png';

export const websiteIdentityConfig = {
  websiteName: 'NIC 27',
  websiteSubtitle: 'Annual Grand Farewell & Batch 27 Celebration',
  footerText: '© 2027 Rag Day 27 Committee. All Rights Reserved. • Crafted with ❤️ by MD. Moshiur Rahman for Batch 27',
  websiteLogo: logoImg,
  favicon: faviconImg,
};

export const eventSettingsConfig = {
  eventName: 'RAG DAY of NIC 27',
  eventDescription: 'Celebrate our journey together with us.',
  welcomeMessage: 'Welcome to the official Rag Day 27 Portal!',
  eventCardLayout: 'two-column' as const,
  eventCardsContent: [
    {
      id: 'event-card-1',
      title: 'Registration Start',
      description: 'Registration starts from October 10. Complete your enrollment before time.',
      icon: 'calendar',
      customColor: 'indigo',
      order: 1,
      visible: true,
    },
    {
      id: 'event-card-2',
      title: 'Registration FEE',
      description: '500 BDT for your all-inclusive batch pass.',
      icon: 'credit-card',
      customColor: 'emerald',
      order: 2,
      visible: true,
    },
    {
      id: 'event-card-3',
      title: 'Venue',
      description: 'Central Amphitheatre & Campus Plaza',
      icon: 'map-pin',
      customColor: 'cyan',
      order: 3,
      visible: true,
    },
    {
      id: 'event-card-4',
      title: 'Custom Squad Jersey',
      description: 'Official kit with personalized back name & number print included.',
      icon: 'shirt',
      customColor: 'amber',
      order: 4,
      visible: true,
    },
  ] as EventCard[],
  importantInstructions: 'Please transfer the exact registration fee to the designated wing account (Male / Female) before submitting the form. Retain your Sender Number and Transaction ID for swift approval.',
  venue: 'Central Amphitheatre',
};

export const registrationSettingsConfig = {
  registrationOpen: true,
  registrationFee: '500 BDT',
  maleBkashNumber: '01712-345678',
  maleNagadNumber: '01712-345678',
  femaleBkashNumber: '01812-345678',
  femaleNagadNumber: '01812-345678',
  maleJerseyDesign: maleJerseyImg,
  femaleJerseyDesign: femaleJerseyImg,
  jerseyPreviewBackground: jerseyBgImg,
  maleInvitationSignature: 'Executive Convener (Boys Wing)',
  femaleInvitationSignature: 'Executive Convener (Girls Wing)',
};

export const countdownSettingsConfig = {
  eventDate: '2026-11-20T10:00:00',
  registrationDeadline: '2026-11-01T23:59:59',
  countdownEnabled: true,
};

export const importantNoticeConfig = {
  noticeEnabled: true,
  popupEnabled: false,
  popupTitle: 'IMPORTANT NOTICE FOR RAG DAY 27',
  popupMessage: 'Welcome Batch 27! Registration is open. Please keep your Registration Number safe after submitting your registration, as you will need it to download your official invitation card once verified.',
  noticeContent: 'Official Batch 27 Registration is now OPEN.',
  closeButtonText: 'I Understand',
};

export const logoRelatedConfig = {
  websiteLogo: logoImg,
  favicon: faviconImg,
  maleJersey: maleJerseyImg,
  femaleJersey: femaleJerseyImg,
  jerseyDesignCards: [
    {
      id: 'jersey-design-card-1',
      title: 'Official Rag Day Jersey',
      description: 'Premium white jersey with custom Batch 27 print.',
      image: jerseyOneImg,
    },
  ] as JerseyDesignCard[],
};
