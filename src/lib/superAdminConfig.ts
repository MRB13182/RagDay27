/**
 * SUPER ADMIN CONFIGURATION LOADER
 *
 * Loads and parses code-based configurations directly from:
 * super-admin/
 * ├── 01. website-identity/
 * ├── 02. event-settings/
 * ├── 03. registration-settings/
 * ├── 04. countdown-settings/
 * └── 05. important-notice/
 *
 * Text values are loaded from .txt files.
 * Images are loaded from image folders.
 * No database content management. No image URLs in text files.
 */

import type { EventCard, JerseyDesignCard } from '../types';
// Dynamic registration section configuration
import sectionsConfigRaw from '../super-admin/03. registration-settings/text/sections/sections.json?raw';


// ============================================================================
// 1. RAW TEXT IMPORTS (Vite ?raw)
// ============================================================================

// 01. Website Identity
import websiteNameRaw from '../super-admin/01. website-identity/Text/web name.txt?raw';
import websiteSubtitleRaw from '../super-admin/01. website-identity/Text/web header.txt?raw';
import footerTextRaw from '../super-admin/01. website-identity/Text/web footer.txt?raw';

// 02. Event Settings
import eventNameRaw from '../super-admin/02. event-settings/Text/Event name.txt?raw';
import eventDescriptionRaw from '../super-admin/02. event-settings/text/event-description.txt?raw';
import welcomeMessageRaw from '../super-admin/02. event-settings/text/welcome-message.txt?raw';
import eventCardLayoutRaw from '../super-admin/02. event-settings/text/event-card-layout.txt?raw';
import eventCardsContentRaw from '../super-admin/02. event-settings/Text/Event card.txt?raw';
import importantInstructionsRaw from '../super-admin/02. event-settings/text/important-instructions.txt?raw';

// 03. Registration Settings
import registrationOpenCloseRaw from '../super-admin/03. registration-settings/text/registration-open-close.txt?raw';
import registrationFeeRaw from '../super-admin/03. registration-settings/text/registration-fee.txt?raw';
import malePaymentRaw from '../super-admin/03. registration-settings/text/payment-way/male.txt?raw';
import femalePaymentRaw from '../super-admin/03. registration-settings/text/payment-way/female.txt?raw';
import maleSignatureRaw from '../super-admin/03. registration-settings/text/male-signature.txt?raw';
import femaleSignatureRaw from '../super-admin/03. registration-settings/text/female-signature.txt?raw';

// 04. Countdown Settings
import eventDateRaw from '../super-admin/02. event-settings/Text/Event date.txt?raw';
import registrationDeadlineRaw from '../super-admin/03. reg-settings/Text/Last registration date countdown.txt?raw';
import countdownEnableDisableRaw from '../super-admin/04. countdown-settings/Text/Enable Disable.txt?raw';

// 05. Important Notice
import noticeEnableDisableRaw from '../super-admin/05. important-notice/Text/Enable Disable.txt?raw';
import popupEnableDisableRaw from '../super-admin/05. important-notice/text/popup-enable-disable.txt?raw';
import popupTitleRaw from '../super-admin/05. important-notice/text/popup-title.txt?raw';
import popupMessageRaw from '../super-admin/05. important-notice/Text/Popup Notice.txt?raw';
import noticeContentRaw from '../super-admin/05. important-notice/Text/Notice Board.txt?raw';
import closeButtonTextRaw from '../super-admin/05. important-notice/text/close-button-text.txt?raw';

// 06. Logo Related & Jersey Design
import jerseyDesignRaw from '../super-admin/06. logo-related/text/jersey-design.txt?raw';


// 01. Website Identity (new editable file locations)
import websiteNameEditableRaw from '../super-admin/01. website-identity/Text/web name.txt?raw';
import websiteHeaderEditableRaw from '../super-admin/01. website-identity/Text/web header.txt?raw';
import footerEditableRaw from '../super-admin/01. website-identity/Text/web footer.txt?raw';

// 02. Event Settings (new editable file locations)
import eventCardEditableRaw from '../super-admin/02. event-settings/Text/Event card.txt?raw';
import eventDateEditableRaw from '../super-admin/02. event-settings/Text/Event date.txt?raw';
import venueEditableRaw from '../super-admin/02. event-settings/Text/Venue.txt?raw';

// 03. Registration Settings (new editable file locations)
import sectionSettingsEditableRaw from '../super-admin/03. reg-settings/Text/Section settings.txt?raw';
import paymentNumberEditableRaw from '../super-admin/03. reg-settings/Text/Payment number.txt?raw';
import lastRegistrationEditableRaw from '../super-admin/03. reg-settings/Text/Last registration date countdown.txt?raw';
import registrationToggleEditableRaw from '../super-admin/03. reg-settings/Text/Enable Disable.txt?raw';

// 04. Countdown Settings (new editable file locations)
import countdownEventEditableRaw from '../super-admin/04. countdown-settings/Text/Countdown of Event.txt?raw';

// 05. Important Notice (new editable file locations)
import noticeBoardEditableRaw from '../super-admin/05. important-notice/Text/Notice Board.txt?raw';
import popupNoticeEditableRaw from '../super-admin/05. important-notice/Text/Popup Notice.txt?raw';

// ============================================================================
// 2. IMAGE FOLDERS IMPORTS (Vite import.meta.glob)
// ============================================================================

const logoImagesGlob = import.meta.glob(
  '../super-admin/01. website-identity/images/logo/*',
  { eager: true }
);

const faviconImagesGlob = import.meta.glob(
  '../super-admin/01. website-identity/images/favicon/*',
  { eager: true }
);

const eventCardImagesGlob = import.meta.glob(
  '../super-admin/02. event-settings/images/event-card-images/*',
  { eager: true }
);

const maleJerseyGlob = import.meta.glob([
  '../super-admin/03. registration-settings/images/male-jersey/*',
  '../super-admin/03. registration-settings/images/male-jersey-design/*',
], { eager: true });

const femaleJerseyGlob = import.meta.glob([
  '../super-admin/03. registration-settings/images/female-jersey/*',
  '../super-admin/03. registration-settings/images/female-jersey-design/*',
], { eager: true });

const jerseyBgGlob = import.meta.glob([
  '../super-admin/03. registration-settings/images/jersey-preview/*',
  '../super-admin/03. registration-settings/images/jersey-preview-background/*',
], { eager: true });

// 06. Logo-Related Image Globs
const logoRelatedWebsiteLogoGlob = import.meta.glob([
  '../super-admin/06. logo-related/images/website-logo/*',
  '../super-admin/06. logo-related/images/logo/*',
  '../super-admin/06. logo-related/logo.*',
  '../super-admin/06. logo-related/*logo*.*',
], { eager: true });

const logoRelatedFaviconGlob = import.meta.glob([
  '../super-admin/06. logo-related/images/favicon/*',
  '../super-admin/06. logo-related/favicon.*',
  '../super-admin/06. logo-related/*favicon*.*',
], { eager: true });

const logoRelatedJerseyBackPreviewGlob = import.meta.glob([
  '../super-admin/06. logo-related/images/jersey-back-preview/*',
  '../super-admin/06. logo-related/jersey-back-preview.*',
], { eager: true });

const logoRelatedMaleJerseyGlob = import.meta.glob([
  '../super-admin/06. logo-related/images/male-jersey/*',
  '../super-admin/06. logo-related/male-jersey.*',
], { eager: true });

const logoRelatedFemaleJerseyGlob = import.meta.glob([
  '../super-admin/06. logo-related/images/female-jersey/*',
  '../super-admin/06. logo-related/female-jersey.*',
], { eager: true });

const logoRelatedJerseyDesignGlob = import.meta.glob([
  '../super-admin/06. logo-related/images/jersey-design/*',
  '../super-admin/06. logo-related/jersey design.*',
  '../super-admin/06. logo-related/jersey-design.*',
  '../super-admin/06. logo-related/*jersey*.*',
], { eager: true });

/**
 * Extracts first image URL from a Vite import.meta.glob record if present
 */
function getFirstImageFromGlob(glob: Record<string, any>): string {
  const keys = Object.keys(glob).sort();
  if (keys.length === 0) return '';
  const item = glob[keys[0]];
  if (typeof item === 'string') return item;
  return item?.default || '';
}

/**
 * Extracts all image URLs from a Vite import.meta.glob record in sorted order
 */
function getAllImagesFromGlob(glob: Record<string, any>): string[] {
  const sortedKeys = Object.keys(glob).sort();
  return sortedKeys.map(key => {
    const item = glob[key];
    if (typeof item === 'string') return item;
    return item?.default || '';
  }).filter(Boolean);
}

/**
 * Finds an image asset by matching its filename (case-insensitive basename)
 * e.g. "jersey-one.png" -> matching imported module URL
 */
export function getAssetByFilename(glob: Record<string, any>, filename: string): string {
  if (!filename || !filename.trim()) {
    const all = getAllImagesFromGlob(glob);
    return all[0] || '';
  }
  const target = filename.trim().toLowerCase();
  const targetClean = target.replace(/[-_\s]/g, '');

  for (const [path, mod] of Object.entries(glob)) {
    const base = path.split('/').pop()?.toLowerCase() || '';
    const baseClean = base.replace(/[-_\s]/g, '');
    if (base === target || baseClean === targetClean || baseClean.includes(targetClean) || targetClean.includes(baseClean)) {
      if (typeof mod === 'string') return mod;
      return (mod as any)?.default || '';
    }
  }

  // Fallback to first image in glob if any
  const all = getAllImagesFromGlob(glob);
  return all[0] || '';
}

// ============================================================================
// 3. PARSERS FOR SPECIAL TEXT FORMATS
// ============================================================================

/**
 * Parses payment-way files (male.txt / female.txt)
 * Format:
 * Bkash:
 * 01XXXXXXXXX
 *
 * Nagad:
 * 01XXXXXXXXX
 */
function parsePaymentWayFile(rawText: string): { bkash: string; nagad: string } {
  let bkash = '';
  let nagad = '';
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^bkash[:]?$/i.test(line) && lines[i + 1]) {
      bkash = lines[i + 1].trim();
    } else if (/^bkash[:]?\s*(.+)/i.test(line)) {
      bkash = line.replace(/^bkash[:]?\s*/i, '').trim();
    }

    if (/^nagad[:]?$/i.test(line) && lines[i + 1]) {
      nagad = lines[i + 1].trim();
    } else if (/^nagad[:]?\s*(.+)/i.test(line)) {
      nagad = line.replace(/^nagad[:]?\s*/i, '').trim();
    }
  }

  return { bkash, nagad };
}

/**
 * Parses event-cards-content.txt into glassmorphism event cards.
 * Supports unlimited card creation in format:
 * Title: <Title>
 * Description: <Description>
 */
export function parseEventCardsContent(rawText: string): EventCard[] {
  const cardImages = getAllImagesFromGlob(eventCardImagesGlob);
  const colorPalette = ['indigo', 'cyan', 'emerald', 'amber', 'rose', 'purple', 'blue'];
  const iconPalette = ['calendar', 'shirt', 'credit-card', 'award', 'sparkles', 'map-pin', 'clock'];

  const lines = rawText.split(/\r?\n/);
  const cards: EventCard[] = [];

  let currentTitle = '';
  let currentDescLines: string[] = [];
  let cardCount = 0;

  const pushCurrentCard = () => {
    if (currentTitle) {
      cardCount++;
      const colorIndex = (cardCount - 1) % colorPalette.length;
      const iconIndex = (cardCount - 1) % iconPalette.length;

      cards.push({
        id: `event-card-${cardCount}`,
        title: currentTitle,
        description: currentDescLines.join(' ').trim(),
        icon: iconPalette[iconIndex],
        customColor: colorPalette[colorIndex],
        order: cardCount,
        visible: true,
      });
      currentTitle = '';
      currentDescLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const titleMatch = line.match(/^title[:]\s*(.+)$/i);
    const descMatch = line.match(/^description[:]\s*(.+)$/i);

    if (titleMatch) {
      pushCurrentCard();
      currentTitle = titleMatch[1].trim();
    } else if (descMatch) {
      currentDescLines.push(descMatch[1].trim());
    } else if (currentTitle) {
      currentDescLines.push(line);
    }
  }

  pushCurrentCard();

  return cards;
}

/**
 * Parses jersey-design.txt into dynamic JerseyDesignCard items.
 * Supports unlimited card creation in format:
 * Card:
 * Title: <Title>
 * Description: <Description>
 * Image: <filename.png>
 */
export function parseJerseyDesignContent(
  rawText: string,
  imageGlob: Record<string, any>
): JerseyDesignCard[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const cards: JerseyDesignCard[] = [];

  let currentTitle = '';
  let currentDescLines: string[] = [];
  let currentImageFilename = '';
  let cardCount = 0;
  let inCardBlock = false;

  const pushCurrentCard = () => {
    if (inCardBlock && (currentTitle || currentDescLines.length > 0 || currentImageFilename)) {
      cardCount++;
      const resolvedImg = getAssetByFilename(imageGlob, currentImageFilename);
      cards.push({
        id: `jersey-design-card-${cardCount}`,
        title: currentTitle || 'Official Rag Day Jersey',
        description: currentDescLines.join(' ').trim(),
        image: resolvedImg,
        imageFilename: currentImageFilename,
      });
      currentTitle = '';
      currentDescLines = [];
      currentImageFilename = '';
      inCardBlock = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for "Card:" block marker
    if (/^card[:]?$/i.test(line)) {
      pushCurrentCard();
      inCardBlock = true;
      continue;
    }

    const titleMatch = line.match(/^title[:]\s*(.+)$/i);
    const descMatch = line.match(/^description[:]\s*(.+)$/i);
    const imageMatch = line.match(/^image[:]\s*(.+)$/i);

    if (titleMatch) {
      if (!inCardBlock) inCardBlock = true;
      currentTitle = titleMatch[1].trim();
    } else if (descMatch) {
      if (!inCardBlock) inCardBlock = true;
      currentDescLines.push(descMatch[1].trim());
    } else if (imageMatch) {
      if (!inCardBlock) inCardBlock = true;
      currentImageFilename = imageMatch[1].trim();
    } else if (inCardBlock && currentTitle) {
      currentDescLines.push(line);
    }
  }

  pushCurrentCard();
  return cards;
}

// ============================================================================

export type RegistrationSectionConfig = Record<string, Record<string, Array<{ value: string; label: string; enabled?: boolean; sort_order?: number }>>>;

export function getConfiguredSections(gender: 'male' | 'female', group: string): string[] {
  try {
    const config = JSON.parse(sectionsConfigRaw) as RegistrationSectionConfig;
    const genderConfig = config[gender] || {};
    const key = group.trim().toLowerCase().replace(/\s+/g, '_');
    return (genderConfig[key] || [])
      .filter(item => item && item.enabled !== false && item.value)
      .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(item => item.value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// 4. DERIVED CONFIGURATION OBJECTS
// ============================================================================

// 06. Logo Related & Jersey Design
export const logoRelatedConfig = {
  websiteLogo: getFirstImageFromGlob(logoRelatedWebsiteLogoGlob),
  favicon: getFirstImageFromGlob(logoRelatedFaviconGlob),
  registrationJerseyBackPreview: getFirstImageFromGlob(logoRelatedJerseyBackPreviewGlob),
  maleJersey: getFirstImageFromGlob(logoRelatedMaleJerseyGlob),
  femaleJersey: getFirstImageFromGlob(logoRelatedFemaleJerseyGlob),
  jerseyDesignCards: parseJerseyDesignContent(jerseyDesignRaw, logoRelatedJerseyDesignGlob),
};

// 01. Website Identity
export const websiteIdentityConfig = {
  websiteName: websiteNameEditableRaw.trim() || 'Rag Day 27 (RD27)',
  websiteSubtitle: websiteHeaderEditableRaw.trim() || 'Annual Grand Farewell & Batch 27 Celebration',
  footerText: footerEditableRaw.trim() || '© 2027 Rag Day 27 (RD27) Committee. All Rights Reserved.',
  websiteLogo: logoRelatedConfig.websiteLogo || getFirstImageFromGlob(logoImagesGlob),
  favicon: logoRelatedConfig.favicon || getFirstImageFromGlob(faviconImagesGlob),
};

// 02. Event Settings
const parsedLayout = eventCardLayoutRaw.trim().toLowerCase() === 'one-column' ? 'one-column' : 'two-column';
const parsedCards = parseEventCardsContent(eventCardEditableRaw.trim() || eventCardsContentRaw);
const venueRaw = venueEditableRaw.trim();

export const eventSettingsConfig = {
  eventName: eventNameRaw.trim() || 'RAG DAY 27 (RD27) GRAND CELEBRATION',
  eventDescription: eventDescriptionRaw.trim() || 'Celebrate our journey together with the official batch 27 grand gathering.',
  welcomeMessage: welcomeMessageRaw.trim() || 'Welcome to the official Rag Day 27 Portal!',
  eventCardLayout: parsedLayout,
  eventCardsContent: parsedCards,
  importantInstructions: importantInstructionsRaw.trim() || 'Please transfer the exact registration fee before submitting.',
  cardImages: getAllImagesFromGlob(eventCardImagesGlob),
  venue: venueRaw || 'Central Amphitheatre',
};

// 03. Registration Settings
const combinedPayment = parsePaymentWayFile(paymentNumberEditableRaw.trim() || malePaymentRaw || femalePaymentRaw);
const malePayment = parsePaymentWayFile(malePaymentRaw);
const femalePayment = parsePaymentWayFile(femalePaymentRaw);
const regOpenClean = registrationToggleEditableRaw.trim() || registrationOpenCloseRaw.trim();
const isRegistrationOpen = !/^(disable|disabled|close|closed)$/i.test(regOpenClean);

export const registrationSettingsConfig = {
  registrationOpen: isRegistrationOpen,
  registrationFee: registrationFeeRaw.trim() || '500 BDT',
  malePaymentNumber: combinedPayment.bkash || malePayment.bkash || '01712-345678',
  maleBkashNumber: combinedPayment.bkash || malePayment.bkash || '01712-345678',
  maleNagadNumber: combinedPayment.nagad || malePayment.nagad || '01712-345678',
  femalePaymentNumber: femalePayment.bkash || femalePayment.nagad || '01812-345678',
  femaleBkashNumber: femalePayment.bkash || '01812-345678',
  femaleNagadNumber: femalePayment.nagad || femalePayment.bkash || '01812-345678',
  maleJerseyDesign: getFirstImageFromGlob(maleJerseyGlob),
  femaleJerseyDesign: getFirstImageFromGlob(femaleJerseyGlob),
  jerseyPreviewBackground: getFirstImageFromGlob(jerseyBgGlob),
  maleInvitationSignature: maleSignatureRaw.trim() || 'Executive Convener (Boys Wing)',
  femaleInvitationSignature: femaleSignatureRaw.trim() || 'Executive Convener (Girls Wing)',
};

// 04. Countdown Settings
const countdownEnableClean = countdownEnableDisableRaw.trim().toLowerCase();
const isCountdownEnabled = countdownEnableClean !== 'disable' && countdownEnableClean !== 'disabled';

export const countdownSettingsConfig = {
  eventDate: eventDateEditableRaw.trim() || '2027-11-27T10:00:00',
  registrationDeadline: lastRegistrationEditableRaw.trim() || '2027-10-31T23:59:59',
  countdownEnabled: isCountdownEnabled,
};

// 05. Important Notice
const noticeEnableClean = noticeEnableDisableRaw.trim().toLowerCase();
const popupEnableClean = popupEnableDisableRaw.trim().toLowerCase();

export const importantNoticeConfig = {
  noticeEnabled: noticeEnableClean !== 'disable' && noticeEnableClean !== 'disabled',
  popupEnabled: popupEnableClean === 'enable' || popupEnableClean === 'enabled',
  popupTitle: popupTitleRaw.trim() || 'IMPORTANT NOTICE FOR RAG DAY 27',
  popupMessage: popupNoticeEditableRaw.trim() || popupMessageRaw.trim() || 'Welcome Batch 27! Registration is open.',
  noticeContent: noticeBoardEditableRaw.trim() || noticeContentRaw.trim() || 'Official Batch 27 Registration is now OPEN.',
  closeButtonText: closeButtonTextRaw.trim() || 'I Understand',
};
