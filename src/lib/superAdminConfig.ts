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

import type { EventCard } from '../types';

// ============================================================================
// 1. RAW TEXT IMPORTS (Vite ?raw)
// ============================================================================

// 01. Website Identity
import websiteNameRaw from '../super-admin/01. website-identity/text/website-name.txt?raw';
import websiteSubtitleRaw from '../super-admin/01. website-identity/text/website-subtitle.txt?raw';
import footerTextRaw from '../super-admin/01. website-identity/text/footer-text.txt?raw';

// 02. Event Settings
import eventNameRaw from '../super-admin/02. event-settings/text/event-name.txt?raw';
import eventDescriptionRaw from '../super-admin/02. event-settings/text/event-description.txt?raw';
import welcomeMessageRaw from '../super-admin/02. event-settings/text/welcome-message.txt?raw';
import eventCardLayoutRaw from '../super-admin/02. event-settings/text/event-card-layout.txt?raw';
import eventCardsContentRaw from '../super-admin/02. event-settings/text/event-cards-content.txt?raw';
import importantInstructionsRaw from '../super-admin/02. event-settings/text/important-instructions.txt?raw';

// 03. Registration Settings
import registrationOpenCloseRaw from '../super-admin/03. registration-settings/text/registration-open-close.txt?raw';
import registrationFeeRaw from '../super-admin/03. registration-settings/text/registration-fee.txt?raw';
import malePaymentRaw from '../super-admin/03. registration-settings/text/payment-way/male.txt?raw';
import femalePaymentRaw from '../super-admin/03. registration-settings/text/payment-way/female.txt?raw';
import maleSignatureRaw from '../super-admin/03. registration-settings/text/male-signature.txt?raw';
import femaleSignatureRaw from '../super-admin/03. registration-settings/text/female-signature.txt?raw';

// 04. Countdown Settings
import eventDateRaw from '../super-admin/04. countdown-settings/text/event-date.txt?raw';
import registrationDeadlineRaw from '../super-admin/04. countdown-settings/text/registration-deadline.txt?raw';
import countdownEnableDisableRaw from '../super-admin/04. countdown-settings/text/countdown-enable-disable.txt?raw';

// 05. Important Notice
import noticeEnableDisableRaw from '../super-admin/05. important-notice/text/notice-enable-disable.txt?raw';
import popupEnableDisableRaw from '../super-admin/05. important-notice/text/popup-enable-disable.txt?raw';
import popupTitleRaw from '../super-admin/05. important-notice/text/popup-title.txt?raw';
import popupMessageRaw from '../super-admin/05. important-notice/text/popup-message.txt?raw';
import noticeContentRaw from '../super-admin/05. important-notice/text/notice-content.txt?raw';
import closeButtonTextRaw from '../super-admin/05. important-notice/text/close-button-text.txt?raw';

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

// ============================================================================
// 4. DERIVED CONFIGURATION OBJECTS
// ============================================================================

// 01. Website Identity
export const websiteIdentityConfig = {
  websiteName: websiteNameRaw.trim() || 'Rag Day 27 (RD27)',
  websiteSubtitle: websiteSubtitleRaw.trim() || 'Annual Grand Farewell & Batch 27 Celebration',
  footerText: footerTextRaw.trim() || '© 2027 Rag Day 27 (RD27) Committee. All Rights Reserved. Crafted for Batch 27.',
  websiteLogo: getFirstImageFromGlob(logoImagesGlob),
  favicon: getFirstImageFromGlob(faviconImagesGlob),
};

// 02. Event Settings
const parsedLayout = eventCardLayoutRaw.trim().toLowerCase() === 'one-column' ? 'one-column' : 'two-column';
const parsedCards = parseEventCardsContent(eventCardsContentRaw);

export const eventSettingsConfig = {
  eventName: eventNameRaw.trim() || 'RAG DAY 27 (RD27) GRAND CELEBRATION',
  eventDescription: eventDescriptionRaw.trim() || 'Celebrate our journey together with the official batch 27 grand gathering.',
  welcomeMessage: welcomeMessageRaw.trim() || 'Welcome to the official Rag Day 27 Portal!',
  eventCardLayout: parsedLayout,
  eventCardsContent: parsedCards,
  importantInstructions: importantInstructionsRaw.trim() || 'Please transfer the exact registration fee before submitting.',
  cardImages: getAllImagesFromGlob(eventCardImagesGlob),
};

// 03. Registration Settings
const malePayment = parsePaymentWayFile(malePaymentRaw);
const femalePayment = parsePaymentWayFile(femalePaymentRaw);
const regOpenClean = registrationOpenCloseRaw.trim().toLowerCase();
const isRegistrationOpen = regOpenClean !== 'close' && regOpenClean !== 'closed';

export const registrationSettingsConfig = {
  registrationOpen: isRegistrationOpen,
  registrationFee: registrationFeeRaw.trim() || '500 BDT',
  malePaymentNumber: malePayment.bkash || malePayment.nagad || '01712-345678',
  maleBkashNumber: malePayment.bkash || '01712-345678',
  maleNagadNumber: malePayment.nagad || malePayment.bkash || '01712-345678',
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
  eventDate: eventDateRaw.trim() || '2027-11-27T10:00:00',
  registrationDeadline: registrationDeadlineRaw.trim() || '2027-10-31T23:59:59',
  countdownEnabled: isCountdownEnabled,
};

// 05. Important Notice
const noticeEnableClean = noticeEnableDisableRaw.trim().toLowerCase();
const popupEnableClean = popupEnableDisableRaw.trim().toLowerCase();

export const importantNoticeConfig = {
  noticeEnabled: noticeEnableClean !== 'disable' && noticeEnableClean !== 'disabled',
  popupEnabled: popupEnableClean === 'enable' || popupEnableClean === 'enabled',
  popupTitle: popupTitleRaw.trim() || 'IMPORTANT NOTICE FOR RAG DAY 27',
  popupMessage: popupMessageRaw.trim() || 'Welcome Batch 27! Registration is open.',
  noticeContent: noticeContentRaw.trim() || 'Official Batch 27 Registration is now OPEN.',
  closeButtonText: closeButtonTextRaw.trim() || 'I Understand',
};
