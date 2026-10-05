/**
 * SUPER ADMIN CONFIGURATION LOADER
 *
 * Loads configurations directly from src/super-admin/ Text & Pic folders.
 * Safe fallback handling guarantees zero build or transform errors.
 */

import type { EventCard, JerseyDesignCard } from '../types';
import defaultLogo from '../assets/images/logo.png';
import defaultFavicon from '../assets/images/favicon.png';
import defaultMaleJersey from '../assets/images/male-jersey.png';
import defaultFemaleJersey from '../assets/images/female-jersey.png';
import defaultJerseyBg from '../assets/images/jersey-background.png';
import defaultJerseyOne from '../assets/images/jersey-one.png';

import eventJerseyPic from '../super-admin/02. event-settings/Pic/jersey.png';
import { getSavedSuperAdminText, getSuperAdminImageUrl } from './superAdminTextSettings';

// 01. Website Identity
import websiteNameRaw from '../super-admin/01. website-identity/Text/web name.txt?raw';
import websiteHeaderRaw from '../super-admin/01. website-identity/Text/web header.txt?raw';
import footerTextRaw from '../super-admin/01. website-identity/Text/web footer.txt?raw';

// 02. Event Settings
import eventNameRaw from '../super-admin/02. event-settings/Text/Event name.txt?raw';
import eventCardRaw from '../super-admin/02. event-settings/Text/Event card.txt?raw';
import eventDateRaw from '../super-admin/02. event-settings/Text/Event date.txt?raw';
import venueRawText from '../super-admin/02. event-settings/Text/Venue.txt?raw';

// 03. Registration Settings
import sectionSettingsRaw from '../super-admin/03. reg-settings/Text/Section settings.txt?raw';
import paymentNumberRaw from '../super-admin/03. reg-settings/Text/Payment number.txt?raw';
import lastRegistrationDateRaw from '../super-admin/03. reg-settings/Text/Last registration date countdown.txt?raw';
import registrationToggleRaw from '../super-admin/03. reg-settings/Text/Enable Disable.txt?raw';

// 04. Countdown Settings
import countdownEventRaw from '../super-admin/04. countdown-settings/Text/Countdown of Event.txt?raw';
import countdownEnableDisableRaw from '../super-admin/04. countdown-settings/Text/Enable Disable.txt?raw';

// 05. Important Notice
import noticeBoardRaw from '../super-admin/05. important-notice/Text/Notice Board.txt?raw';
import popupNoticeRaw from '../super-admin/05. important-notice/Text/Popup Notice.txt?raw';
import noticeEnableDisableRaw from '../super-admin/05. important-notice/Text/Enable Disable.txt?raw';

// ============================================================================
// 1. HELPERS & PARSERS
// ============================================================================

function parsePaymentNumberFile(rawText: string): {
  maleBkash: string;
  maleNagad: string;
  femaleBkash: string;
  femaleNagad: string;
} {
  let maleBkash = '01712-345678';
  let maleNagad = '01712-345678';
  let femaleBkash = '01812-345678';
  let femaleNagad = '01812-345678';

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const mb = line.match(/^male\s*bkash[:\s]+(.+)$/i);
    if (mb) maleBkash = mb[1].trim();

    const mn = line.match(/^male\s*nagad[:\s]+(.+)$/i);
    if (mn) maleNagad = mn[1].trim();

    const fb = line.match(/^female\s*bkash[:\s]+(.+)$/i);
    if (fb) femaleBkash = fb[1].trim();

    const fn = line.match(/^female\s*nagad[:\s]+(.+)$/i);
    if (fn) femaleNagad = fn[1].trim();
  }

  return { maleBkash, maleNagad, femaleBkash, femaleNagad };
}

export function parseEventCardsContent(rawText: string): EventCard[] {
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

export function parseJerseyDesignContent(
  rawText: string,
  imageGlob?: Record<string, any>
): JerseyDesignCard[] {
  if (!rawText || !rawText.trim()) {
    return [
      {
        id: 'jersey-design-card-1',
        title: 'Official Rag Day Jersey',
        description: 'Custom Squad Kit with Personalized Back Name & Number Print Included',
        image: defaultJerseyOne,
        imageFilename: 'jersey-one.png',
      },
    ];
  }

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
      cards.push({
        id: `jersey-design-card-${cardCount}`,
        title: currentTitle || 'Official Rag Day Jersey',
        description: currentDescLines.join(' ').trim(),
        image: defaultJerseyOne,
        imageFilename: currentImageFilename || 'jersey-one.png',
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
  return cards.length > 0 ? cards : [
    {
      id: 'jersey-design-card-1',
      title: 'Official Rag Day Jersey',
      description: 'Custom Squad Kit with Personalized Back Name & Number Print Included',
      image: defaultJerseyOne,
      imageFilename: 'jersey-one.png',
    },
  ];
}

export function getAssetByFilename(glob: Record<string, any>, filename: string): string {
  if (!glob || typeof glob !== 'object') return defaultJerseyOne;
  const values = Object.values(glob);
  if (values.length === 0) return defaultJerseyOne;
  const first = values[0];
  return typeof first === 'string' ? first : first?.default || defaultJerseyOne;
}

// ============================================================================
// 2. SECTIONS RESOLVER
// ============================================================================

export type RegistrationSectionConfig = Record<
  string,
  Record<string, Array<{ value: string; label: string; enabled?: boolean; sort_order?: number }>>
>;

export function getConfiguredSections(gender: 'male' | 'female', group: string): string[] {
  try {
    const rawSetting = getSavedSuperAdminText(
      '03. reg-settings/Text/Section settings.txt',
      sectionSettingsRaw.trim()
    );

    // If setting is JSON formatted
    if (rawSetting.startsWith('{')) {
      const config = JSON.parse(rawSetting) as RegistrationSectionConfig;
      const genderConfig = config[gender] || {};
      const key = group.trim().toLowerCase().replace(/\s+/g, '_');
      const sections = (genderConfig[key] || [])
        .filter(item => item && item.enabled !== false && item.value)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(item => item.value.trim())
        .filter(Boolean);

      if (sections.length > 0) return sections;
    } else {
      // Parse plain text representation:
      // e.g. "Science: SCB (ScB1, ScB2, ScB3, ScB4, ScB5)"
      const lines = rawSetting.split(/\r?\n/);
      let currentGenderScope: 'male' | 'female' | null = null;
      const groupLower = group.trim().toLowerCase();

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^male\s*sections?:/i.test(trimmed)) {
          currentGenderScope = 'male';
          continue;
        }
        if (/^female\s*sections?:/i.test(trimmed)) {
          currentGenderScope = 'female';
          continue;
        }

        if (currentGenderScope === gender || !currentGenderScope) {
          const matchGroup = trimmed.match(/^([^:]+):\s*(.+)$/i);
          if (matchGroup) {
            const grpName = matchGroup[1].trim().toLowerCase();
            const rest = matchGroup[2].trim();
            if (
              (groupLower.includes('science') && grpName.includes('science')) ||
              (groupLower.includes('business') && grpName.includes('business')) ||
              (groupLower.includes('humanities') && grpName.includes('humanities'))
            ) {
              const parenMatch = rest.match(/\(([^)]+)\)/);
              const listStr = parenMatch ? parenMatch[1] : rest;
              const extracted = listStr
                .split(/[,;]+/)
                .map(s => s.trim())
                .filter(Boolean);
              if (extracted.length > 0) return extracted;
            }
          }
        }
      }
    }
  } catch {
    // Fallback to defaults below
  }

  if (gender === 'male') {
    if (/science/i.test(group)) return ['ScB1', 'ScB2', 'ScB3', 'ScB4', 'ScB5'];
    if (/business/i.test(group)) return ['BsB1', 'BsB2', 'BsB3', 'BsB4', 'BsB5'];
    if (/humanities/i.test(group)) return ['HuB1', 'HuB2', 'HuB3', 'HuB4', 'HuB5'];
  } else {
    if (/science/i.test(group)) return ['ScG1', 'ScG2', 'ScG3', 'ScG4', 'ScG5'];
    if (/business/i.test(group)) return ['BsG1', 'BsG2', 'BsG3', 'BsG4', 'BsG5'];
    if (/humanities/i.test(group)) return ['HuG1', 'HuG2', 'HuG3', 'HuG4', 'HuG5'];
  }
  return [];
}

// ============================================================================
// ============================================================================
// 3. EXPORTED CONFIGURATION OBJECTS WITH DYNAMIC RESOLUTION
// ============================================================================

export function getWebsiteIdentityConfig() {
  const name = getSavedSuperAdminText('01. website-identity/Text/web name.txt', websiteNameRaw.trim()) || 'NIC 27';
  const subtitle = getSavedSuperAdminText('01. website-identity/Text/web header.txt', websiteHeaderRaw.trim()) || 'Annual Grand Farewell & Batch 27 Celebration';
  const footer = getSavedSuperAdminText('01. website-identity/Text/web footer.txt', footerTextRaw.trim()) || '© 2027 Rag Day 27 Committee. All Rights Reserved.';
  const logo = getSuperAdminImageUrl('01. website-identity/Pic/logo.png', defaultLogo);
  const favicon = getSuperAdminImageUrl('01. website-identity/Pic/favicon.png', defaultFavicon);

  return {
    websiteName: name,
    websiteSubtitle: subtitle,
    footerText: footer,
    websiteLogo: logo,
    favicon: favicon,
  };
}

export function getEventSettingsConfig() {
  const name = getSavedSuperAdminText('02. event-settings/Text/Event name.txt', eventNameRaw.trim()) || 'RAG DAY of NIC 27';
  const cardRaw = getSavedSuperAdminText('02. event-settings/Text/Event card.txt', eventCardRaw.trim());
  const venue = getSavedSuperAdminText('02. event-settings/Text/Venue.txt', venueRawText.trim()) || 'Central Amphitheatre';
  const jersey = getSuperAdminImageUrl('02. event-settings/Pic/jersey.png', eventJerseyPic);
  const parsedCards = parseEventCardsContent(cardRaw);

  return {
    eventName: name,
    eventDescription: 'Celebrate our journey together with us.',
    welcomeMessage: 'Welcome to the official Rag Day 27 Portal!',
    eventCardLayout: 'two-column' as const,
    eventJersey: jersey,
    eventCardsContent: parsedCards.length > 0 ? parsedCards : [
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
    ],
    importantInstructions: 'Please transfer the exact registration fee before submitting.',
    cardImages: [] as string[],
    venue,
  };
}

export function getRegistrationSettingsConfig() {
  const paymentRaw = getSavedSuperAdminText('03. reg-settings/Text/Payment number.txt', paymentNumberRaw.trim());
  const regToggle = getSavedSuperAdminText('03. reg-settings/Text/Enable Disable.txt', registrationToggleRaw.trim()).toLowerCase();
  const payments = parsePaymentNumberFile(paymentRaw);
  const isRegistrationOpen = !/^(disable|disabled|close|closed)$/i.test(regToggle);
  const jersey = getSuperAdminImageUrl('02. event-settings/Pic/jersey.png', eventJerseyPic);
  const backJersey = getSuperAdminImageUrl('03. reg-settings/Pic/back jersey preview.png', defaultJerseyBg);

  return {
    registrationOpen: isRegistrationOpen,
    registrationFee: '500 BDT',
    malePaymentNumber: payments.maleBkash,
    maleBkashNumber: payments.maleBkash,
    maleNagadNumber: payments.maleNagad,
    femalePaymentNumber: payments.femaleBkash,
    femaleBkashNumber: payments.femaleBkash,
    femaleNagadNumber: payments.femaleNagad,
    maleJerseyDesign: jersey || defaultMaleJersey,
    femaleJerseyDesign: defaultFemaleJersey,
    jerseyPreviewBackground: backJersey || defaultJerseyBg,
    maleInvitationSignature: 'Executive Convener (Boys Wing)',
    femaleInvitationSignature: 'Executive Convener (Girls Wing)',
  };
}

export function getCountdownSettingsConfig() {
  const eventDate = getSavedSuperAdminText('04. countdown-settings/Text/Countdown of Event.txt', countdownEventRaw.trim() || eventDateRaw.trim()) || '2026-11-20T10:00:00';
  const deadline = getSavedSuperAdminText('03. reg-settings/Text/Last registration date countdown.txt', lastRegistrationDateRaw.trim()) || '2026-11-01T23:59:59';
  const enableRaw = getSavedSuperAdminText('04. countdown-settings/Text/Enable Disable.txt', countdownEnableDisableRaw.trim()).toLowerCase();
  const isCountdownEnabled = !/^(disable|disabled)$/i.test(enableRaw);

  return {
    eventDate,
    registrationDeadline: deadline,
    countdownEnabled: isCountdownEnabled,
  };
}

export function getImportantNoticeConfig() {
  const noticeBoard = getSavedSuperAdminText('05. important-notice/Text/Notice Board.txt', noticeBoardRaw.trim()) || 'Official Batch 27 Registration is now OPEN.';
  const popupNotice = getSavedSuperAdminText('05. important-notice/Text/Popup Notice.txt', popupNoticeRaw.trim()) || 'Welcome Batch 27! Registration is open.';
  const enableRaw = getSavedSuperAdminText('05. important-notice/Text/Enable Disable.txt', noticeEnableDisableRaw.trim()).toLowerCase();
  const isNoticeEnabled = !/^(disable|disabled)$/i.test(enableRaw);

  return {
    noticeEnabled: isNoticeEnabled,
    popupEnabled: false,
    popupTitle: 'IMPORTANT NOTICE FOR RAG DAY 27',
    popupMessage: popupNotice,
    noticeContent: noticeBoard,
    closeButtonText: 'I Understand',
  };
}

// 06. Logo Related & Jersey Design
export const logoRelatedConfig = {
  get websiteLogo() { return getWebsiteIdentityConfig().websiteLogo; },
  get favicon() { return getWebsiteIdentityConfig().favicon; },
  get registrationJerseyBackPreview() { return getRegistrationSettingsConfig().jerseyPreviewBackground; },
  get maleJersey() { return getRegistrationSettingsConfig().maleJerseyDesign; },
  get femaleJersey() { return defaultFemaleJersey; },
  get eventJersey() { return getEventSettingsConfig().eventJersey; },
  get jerseyDesignCards(): JerseyDesignCard[] {
    const jerseyImg = getEventSettingsConfig().eventJersey;
    return [
      {
        id: 'jersey-design-card-1',
        title: 'Official Rag Day Jersey',
        description: 'Custom Squad Kit with Personalized Back Name & Number Print Included',
        image: jerseyImg || defaultJerseyOne,
        imageFilename: 'jersey.png',
      },
    ];
  },
};

// 01. Website Identity
export const websiteIdentityConfig = {
  get websiteName() { return getWebsiteIdentityConfig().websiteName; },
  get websiteSubtitle() { return getWebsiteIdentityConfig().websiteSubtitle; },
  get footerText() { return getWebsiteIdentityConfig().footerText; },
  get websiteLogo() { return getWebsiteIdentityConfig().websiteLogo; },
  get favicon() { return getWebsiteIdentityConfig().favicon; },
};

// 02. Event Settings
export const eventSettingsConfig = {
  get eventName() { return getEventSettingsConfig().eventName; },
  get eventDescription() { return getEventSettingsConfig().eventDescription; },
  get welcomeMessage() { return getEventSettingsConfig().welcomeMessage; },
  get eventCardLayout() { return getEventSettingsConfig().eventCardLayout; },
  get eventJersey() { return getEventSettingsConfig().eventJersey; },
  get eventCardsContent() { return getEventSettingsConfig().eventCardsContent; },
  get importantInstructions() { return getEventSettingsConfig().importantInstructions; },
  get cardImages() { return getEventSettingsConfig().cardImages; },
  get venue() { return getEventSettingsConfig().venue; },
};

// 03. Registration Settings
export const registrationSettingsConfig = {
  get registrationOpen() { return getRegistrationSettingsConfig().registrationOpen; },
  get registrationFee() { return getRegistrationSettingsConfig().registrationFee; },
  get malePaymentNumber() { return getRegistrationSettingsConfig().malePaymentNumber; },
  get maleBkashNumber() { return getRegistrationSettingsConfig().maleBkashNumber; },
  get maleNagadNumber() { return getRegistrationSettingsConfig().maleNagadNumber; },
  get femalePaymentNumber() { return getRegistrationSettingsConfig().femalePaymentNumber; },
  get femaleBkashNumber() { return getRegistrationSettingsConfig().femaleBkashNumber; },
  get femaleNagadNumber() { return getRegistrationSettingsConfig().femaleNagadNumber; },
  get maleJerseyDesign() { return getRegistrationSettingsConfig().maleJerseyDesign; },
  get femaleJerseyDesign() { return getRegistrationSettingsConfig().femaleJerseyDesign; },
  get jerseyPreviewBackground() { return getRegistrationSettingsConfig().jerseyPreviewBackground; },
  get maleInvitationSignature() { return getRegistrationSettingsConfig().maleInvitationSignature; },
  get femaleInvitationSignature() { return getRegistrationSettingsConfig().femaleInvitationSignature; },
};

// 04. Countdown Settings
export const countdownSettingsConfig = {
  get eventDate() { return getCountdownSettingsConfig().eventDate; },
  get registrationDeadline() { return getCountdownSettingsConfig().registrationDeadline; },
  get countdownEnabled() { return getCountdownSettingsConfig().countdownEnabled; },
};

// 05. Important Notice
export const importantNoticeConfig = {
  get noticeEnabled() { return getImportantNoticeConfig().noticeEnabled; },
  get popupEnabled() { return getImportantNoticeConfig().popupEnabled; },
  get popupTitle() { return getImportantNoticeConfig().popupTitle; },
  get popupMessage() { return getImportantNoticeConfig().popupMessage; },
  get noticeContent() { return getImportantNoticeConfig().noticeContent; },
  get closeButtonText() { return getImportantNoticeConfig().closeButtonText; },
};

