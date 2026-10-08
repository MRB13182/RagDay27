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
import { safeStorage } from './safeStorage';

// 01. Website Identity
import websiteNameRaw from '../super-admin/01. website-identity/Text/web name.txt?raw';
import websiteHeaderRaw from '../super-admin/01. website-identity/Text/web header.txt?raw';
import footerTextRaw from '../super-admin/01. website-identity/Text/web footer.txt?raw';
import websiteLogoPic from '../super-admin/01. website-identity/Pic/logo.png';
import websiteFaviconPic from '../super-admin/01. website-identity/Pic/favicon.png';

// 02. Event Settings
import eventNameRaw from '../super-admin/02. event-settings/Text/Event name.txt?raw';
import eventCardRaw from '../super-admin/02. event-settings/Text/Event card.txt?raw';
import eventDateRaw from '../super-admin/02. event-settings/Text/Event date.txt?raw';
import venueRawText from '../super-admin/02. event-settings/Text/Venue.txt?raw';

// 03. Registration Settings
import sectionSettingsRaw from '../super-admin/03. reg-settings/Text/Section settings.txt?raw';
import sectionSettingsDirectRaw from '../super-admin/03. reg-settings/Section settings.txt?raw';
import paymentNumberRaw from '../super-admin/03. reg-settings/Text/Payment number.txt?raw';
import paymentNumberDirectRaw from '../super-admin/03. reg-settings/Payment number.txt?raw';
import lastRegistrationDateRaw from '../super-admin/03. reg-settings/Text/Last registration date countdown.txt?raw';
import lastRegistrationDateDirectRaw from '../super-admin/03. reg-settings/Last registration date countdown.txt?raw';
import registrationToggleRaw from '../super-admin/03. reg-settings/Text/Enable Disable.txt?raw';
import registrationToggleDirectRaw from '../super-admin/03. reg-settings/Enable Disable.txt?raw';
import backJerseyPic from '../super-admin/03. reg-settings/Pic/back jersey preview.png';

// 04. Countdown Settings
import countdownEventRaw from '../super-admin/04. countdown-settings/Text/Countdown of Event.txt?raw';
import countdownEnableDisableRaw from '../super-admin/04. countdown-settings/Text/Enable Disable.txt?raw';

// 05. Important Notice
import noticeBoardRaw from '../super-admin/05. important-notice/Text/Notice Board.txt?raw';
import popupNoticeRaw from '../super-admin/05. important-notice/Text/Popup Notice.txt?raw';
import noticeEnableDisableRaw from '../super-admin/05. important-notice/Text/Enable Disable.txt?raw';

// 06. Logo Related
import logoPic06 from '../super-admin/06. logo-related/Pic/logo.png';
import faviconPic06 from '../super-admin/06. logo-related/Pic/favicon.png';
import jerseyDesignPic06 from '../super-admin/06. logo-related/Pic/jersey-design.png';
import jerseyDesignRaw from '../super-admin/06. logo-related/Text/jersey-design.txt?raw';

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

      // Smart contextual icon matching
      let icon = iconPalette[(cardCount - 1) % iconPalette.length];
      const lower = (currentTitle + ' ' + currentDescLines.join(' ')).toLowerCase();
      if (/fee|cost|payment|amount|price|taka|bdt|\$/i.test(lower)) {
        icon = 'credit-card';
      } else if (/start|date|deadline|schedule|calendar/i.test(lower)) {
        icon = 'calendar';
      } else if (/venue|location|place|campus|ground/i.test(lower)) {
        icon = 'map-pin';
      } else if (/jersey|kit|shirt|dress/i.test(lower)) {
        icon = 'shirt';
      } else if (/time|clock|hour/i.test(lower)) {
        icon = 'clock';
      } else if (/award|gift|prize|trophy/i.test(lower)) {
        icon = 'award';
      } else if (/music|concert|band|cultural/i.test(lower)) {
        icon = 'music';
      } else if (/batch|student|convener|users/i.test(lower)) {
        icon = 'users';
      }

      cards.push({
        id: `event-card-${cardCount}`,
        title: currentTitle,
        description: currentDescLines.join(' ').trim(),
        icon,
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
  defaultImage: string = defaultJerseyOne
): JerseyDesignCard[] {
  if (!rawText || !rawText.trim()) {
    return [
      {
        id: 'jersey-design-card-1',
        title: 'Official Rag Day Jersey',
        description: 'Custom Squad Kit with Personalized Back Name & Number Print Included',
        image: defaultImage,
        imageFilename: 'jersey-design.png',
      },
    ];
  }

  const lines = rawText.split(/\r?\n/);
  const cards: JerseyDesignCard[] = [];
  let currentTitle = '';
  let currentDescLines: string[] = [];
  let currentImageFilename = '';
  let cardCount = 0;

  const pushCurrentCard = () => {
    if (currentTitle) {
      cardCount++;
      cards.push({
        id: `jersey-design-card-${cardCount}`,
        title: currentTitle,
        description: currentDescLines.join(' ').trim(),
        image: defaultImage,
        imageFilename: currentImageFilename || 'jersey-design.png',
      });
      currentTitle = '';
      currentDescLines = [];
      currentImageFilename = '';
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^(-e\s+)?card[:\s\d]*$/i.test(line) || /^[-=]{3,}$/.test(line)) {
      pushCurrentCard();
      continue;
    }

    const titleMatch = line.match(/^title[:]\s*(.+)$/i);
    const descMatch = line.match(/^description[:]\s*(.+)$/i);
    const imageMatch = line.match(/^image[:]\s*(.+)$/i);

    if (titleMatch) {
      if (currentTitle) pushCurrentCard();
      currentTitle = titleMatch[1].trim();
    } else if (descMatch) {
      currentDescLines.push(descMatch[1].trim());
    } else if (imageMatch) {
      currentImageFilename = imageMatch[1].trim();
    } else if (currentTitle) {
      currentDescLines.push(line);
    }
  }

  pushCurrentCard();
  return cards.length > 0 ? cards : [
    {
      id: 'jersey-design-card-1',
      title: 'Official Rag Day Jersey',
      description: 'Custom Squad Kit with Personalized Back Name & Number Print Included',
      image: defaultImage,
      imageFilename: 'jersey-design.png',
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

function extractFeeFromEventCards(cardsText: string): string {
  const lines = cardsText.split(/\r?\n/);
  let isFeeCard = false;
  for (const line of lines) {
    const tMatch = line.match(/^title[:]\s*(.+)$/i);
    if (tMatch) {
      isFeeCard = /fee|cost|payment|amount|price/i.test(tMatch[1]);
      continue;
    }
    if (isFeeCard) {
      const dMatch = line.match(/^description[:]\s*(.+)$/i);
      if (dMatch) {
        const desc = dMatch[1].trim();
        const m = desc.match(/(\d[\d,]*\s*(?:\$|BDT|TK|Taka)?|(?:\$|BDT|TK|Taka)\s*\d[\d,]*)/i);
        if (m) return m[0].trim();
        return desc;
      }
    }
  }
  return '500 BDT';
}

export function getConfiguredSections(gender: 'male' | 'female', group: string): string[] {
  try {
    const fileContent = (sectionSettingsRaw || sectionSettingsDirectRaw || '').trim();
    const rawSetting = getSavedSuperAdminText(
      '03. reg-settings/Text/Section settings.txt',
      fileContent
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
    if (/science/i.test(group)) return ['ScB1', 'ScB2', 'ScB3'];
    if (/business/i.test(group)) return ['BsB1', 'BsB2'];
    if (/humanities/i.test(group)) return ['HuB1', 'HuB2'];
  } else {
    if (/science/i.test(group)) return ['ScG1', 'ScG2', 'ScG3'];
    if (/business/i.test(group)) return ['BsG1', 'BsG2'];
    if (/humanities/i.test(group)) return ['HuG1', 'HuG2'];
  }
  return [];
}

// ============================================================================
// 3. EXPORTED CONFIGURATION OBJECTS WITH DYNAMIC RESOLUTION
// ============================================================================

export function getWebsiteIdentityConfig() {
  const name = getSavedSuperAdminText('01. website-identity/Text/web name.txt', websiteNameRaw.trim()) || 'NIC 27';
  const subtitle = getSavedSuperAdminText('01. website-identity/Text/web header.txt', websiteHeaderRaw.trim()) || 'Annual Grand Farewell & Batch 27 Celebration';
  const footer = getSavedSuperAdminText('01. website-identity/Text/web footer.txt', footerTextRaw.trim()) || '© 2027 Rag Day 27 Committee. All Rights Reserved.';
  const logo = getSuperAdminImageUrl('01. website-identity/Pic/logo.png', websiteLogoPic || logoPic06 || defaultLogo);
  const favicon = getSuperAdminImageUrl('01. website-identity/Pic/favicon.png', websiteFaviconPic || faviconPic06 || defaultFavicon);

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
  const jersey = getSuperAdminImageUrl('02. event-settings/Pic/jersey.png', eventJerseyPic || jerseyDesignPic06 || defaultMaleJersey);
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

export function calculateRegistrationOpenState(): {
  isOpen: boolean;
  isAuto: boolean;
  reason: 'active' | 'before_start' | 'after_end' | 'manual_enabled' | 'manual_disabled';
} {
  const toggleContent = (registrationToggleRaw || registrationToggleDirectRaw || '').trim();
  const regToggle = getSavedSuperAdminText('03. reg-settings/Text/Enable Disable.txt', toggleContent).toLowerCase().trim();
  const manualOverride = safeStorage.getItem('rd27_manual_reg_override');

  // Manual admin control overrides automatic schedule
  if (manualOverride === 'enable' || /^(manual_enable|force_enable|force_open)$/i.test(regToggle)) {
    return { isOpen: true, isAuto: false, reason: 'manual_enabled' };
  }
  if (manualOverride === 'disable' || /^(disable|disabled|close|closed|manual_disable|force_disable)$/i.test(regToggle)) {
    return { isOpen: false, isAuto: false, reason: 'manual_disabled' };
  }

  // Automatic schedule check
  const lastDateContent = (lastRegistrationDateRaw || lastRegistrationDateDirectRaw || '').trim();
  const deadlineStr = getSavedSuperAdminText(
    '03. reg-settings/Text/Last registration date countdown.txt',
    lastDateContent
  ) || '2026-11-01T23:59:59';

  const now = new Date();
  const deadlineDate = new Date(deadlineStr);

  if (!isNaN(deadlineDate.getTime())) {
    if (now.getTime() > deadlineDate.getTime()) {
      return { isOpen: false, isAuto: true, reason: 'after_end' };
    }
  }

  return { isOpen: true, isAuto: true, reason: 'active' };
}

export function setManualRegistrationOverride(override: 'enable' | 'disable' | 'auto'): void {
  if (override === 'auto') {
    safeStorage.removeItem('rd27_manual_reg_override');
  } else {
    safeStorage.setItem('rd27_manual_reg_override', override);
  }
}

export function getRegistrationSettingsConfig() {
  const payContent = (paymentNumberRaw || paymentNumberDirectRaw || '').trim();
  const paymentRaw = getSavedSuperAdminText('03. reg-settings/Text/Payment number.txt', payContent);
  const payments = parsePaymentNumberFile(paymentRaw);
  const openState = calculateRegistrationOpenState();
  const jersey = getSuperAdminImageUrl('02. event-settings/Pic/jersey.png', eventJerseyPic || jerseyDesignPic06 || defaultMaleJersey);
  const backJersey = getSuperAdminImageUrl('03. reg-settings/Pic/back jersey preview.png', backJerseyPic || defaultJerseyBg);

  const cardRaw = getSavedSuperAdminText('02. event-settings/Text/Event card.txt', eventCardRaw.trim());
  const customFee = extractFeeFromEventCards(cardRaw);

  return {
    registrationOpen: openState.isOpen,
    registrationOpenReason: openState.reason,
    registrationIsAuto: openState.isAuto,
    registrationFee: customFee || '500 BDT',
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
  const lastDateContent = (lastRegistrationDateRaw || lastRegistrationDateDirectRaw || '').trim();
  const deadline = getSavedSuperAdminText('03. reg-settings/Text/Last registration date countdown.txt', lastDateContent) || '2026-11-01T23:59:59';
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
    popupEnabled: isNoticeEnabled && Boolean(popupNotice && popupNotice.trim()),
    popupTitle: 'Important Notice',
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
    const raw = getSavedSuperAdminText('06. logo-related/Text/jersey-design.txt', jerseyDesignRaw?.trim() || '');
    const jerseyImg = jerseyDesignPic06 || getEventSettingsConfig().eventJersey || defaultJerseyOne;
    const parsed = parseJerseyDesignContent(raw, jerseyImg);
    if (parsed.length > 0) return parsed;
    return [
      {
        id: 'jersey-design-card-1',
        title: 'Official Rag Day Jersey',
        description: 'Custom Squad Kit with Personalized Back Name & Number Print Included',
        image: jerseyImg,
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

