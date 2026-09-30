/**
 * SUPER ADMIN - 2. Event Settings
 *
 * This configuration file provides editable event values for the website.
 * The Super Admin modifies values directly in this source code file.
 *
 * Editable Fields:
 * - Event Name (text)
 * - Event Description (text)
 * - Welcome Message (text)
 * - Event Card Layout (text)
 * - Event Cards Content (text)
 * - Important Instructions (text)
 */

export interface EventCardContentItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  subDetail?: string;
  customColor: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue' | string;
  order: number;
  visible: boolean;
}

export interface EventSettingsConfig {
  /** Event Name (text) */
  eventName: string;
  /** Event Description (text) */
  eventDescription: string;
  /** Welcome Message (text) */
  welcomeMessage: string;
  /** Event Card Layout (text - e.g. 'showcase_first' | 'cards_first' | 'grid') */
  eventCardLayout: 'showcase_first' | 'cards_first' | string;
  /** Event Cards Content (text / structured card items) */
  eventCardsContent: EventCardContentItem[];
  /** Important Instructions (text) */
  importantInstructions: string;
}

export const eventSettingsConfig: EventSettingsConfig = {
  eventName: 'RAG DAY 27 (RD27) GRAND CELEBRATION',
  eventDescription:
    'Celebrate our journey together with the official batch 27 grand gathering, featuring signature squad kit jerseys, cultural gala feast, and lifelong memories.',
  welcomeMessage:
    'Welcome to the official Rag Day 27 Portal! Complete your registration early to guarantee your custom jersey print and access to all festival segments.',
  eventCardLayout: 'showcase_first',
  eventCardsContent: [
    {
      id: 'card-1',
      icon: 'calendar',
      title: 'Grand Gala Event',
      description: 'November 27, 2027 · Central Amphitheatre',
      subDetail: 'Saturday, 10:00 AM – 11:30 PM with live concerts & segments.',
      customColor: 'indigo',
      order: 1,
      visible: true,
    },
    {
      id: 'card-2',
      icon: 'shirt',
      title: 'Custom Squad Kit',
      description: 'Batch 27 Signature Jersey',
      subDetail: 'Custom printed back name, squad number & premium mesh fabric.',
      customColor: 'cyan',
      order: 2,
      visible: true,
    },
    {
      id: 'card-3',
      icon: 'credit-card',
      title: 'Registration Fee',
      description: '500 BDT per Student',
      subDetail: 'Includes custom jersey, gala feast & VIP entry pass.',
      customColor: 'emerald',
      order: 3,
      visible: true,
    },
    {
      id: 'card-4',
      icon: 'award',
      title: 'VIP Invitation Pass',
      description: 'Digital Pass with QR Verification',
      subDetail: 'Instant high-resolution PDF download once approved by Wing Admin.',
      customColor: 'amber',
      order: 4,
      visible: true,
    },
  ],
  importantInstructions:
    'Please transfer the exact registration fee to the designated wing account (Male / Female) before submitting the form. Retain your Sender Number and Transaction ID for swift approval.',
};

export default eventSettingsConfig;
