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
import defaultJerseyBg from '../assets/images/jersey-background.png';
import defaultJerseyOne from '../assets/images/jersey-one.png';

// The optional event jersey image is loaded from admin settings at runtime.
// Use a bundled asset as the build-safe fallback when that Pic file is absent.
import { getSavedSuperAdminText, getSuperAdminImageUrl } from './superAdminTextSettings';
import { safeStorage } from './safeStorage';
import { parseSafeDate } from './dateUtils';

// 01. Website Identity
import websiteNameRaw from '../super-admin/01. website-identity/Text/web name.txt?raw';
import websiteHeaderRaw from '../super-admin/01. website-identity/Text/web header.txt?raw';
import footerTextRaw from '../super-admin/01. website-identity/Text/web footer.txt?raw';
import websiteLogoPic from '../super-admin/01. website-identity/Pic/logo.png';
import websiteFaviconPic from '../super-admin/01. website-identity/Pic/favicon.png';

// 02. Event Settings (including Event Countdown)
import eventNameRaw from '../super-admin/02. event-settings/Text/Event name.txt?raw';
import eventCardRaw from '../super-admin/02. event-settings/Text/Event card.txt?raw';
import eventDateRaw from '../super-admin/02. event-settings/Text/Event date.txt?raw';
import countdownEnableDisableRaw from '../super-admin/02. event-settings/Text/Countedown enable disable.txt?raw';
import eventFeesRaw from '../super-admin/02. event-settings/Text/Fees.txt?raw';
import venueRawText from '../super-admin/02. event-settings/Text/Venue.txt?raw';

// 03. Registration Settings (Text/ is the sole canonical location)
import sectionSettingsRaw from '../super-admin/03. reg-settings/Text/Section settings.txt?raw';
import paymentNumberSCRaw from '../super-admin/03. reg-settings/Text/Payment number SC.txt?raw';
import paymentNumberBSRaw from '../super-admin/03. reg-settings/Text/Payment number BS.txt?raw';
import paymentNumberHURaw from '../super-admin/03. reg-settings/Text/Payment number HU.txt?raw';
import lastRegistrationDateRaw from '../super-admin/03. reg-settings/Text/Last Registration date.txt?raw';
import registrationToggleRaw from '../super-admin/03. reg-settings/Text/Countdown enable disable.txt?raw';
import backJerseyPic from '../super-admin/03. reg-settings/Pic/back jersey preview.png';

// 05. Important Notice
import noticeBoardRaw from '../super-admin/04. important-notice/Text/Notice Board.txt?raw';
import popupNoticeRaw from '../super-admin/04. important-notice/Text/Popup Notice.txt?raw';
import noticeEnableDisableRaw from '../super-admin/04. important-notice/Text/Enable Disable.txt?raw';

// 06. Logo Related — branding only; jersey showcase is managed in Section 02.
import logoPic06 from '../super-admin/06. logo-related/Pic/logo.png';
import faviconPic06 from '../super-admin/06. logo-related/Pic/favicon.png';
// 02. Event Settings — jersey showcase content.
import eventJerseyDesignPic02 from '../super-admin/02. event-settings/Pic/jersey-design.png';
import jerseyDesignRaw02 from '../super-admin/02. event-settings/Text/Jersey design.txt?raw';

// ============================================================================
// 1. HELPERS & PARSERS
// ============================================================================

function parsePaymentNumberFile(rawText: string): {
  maleBkash: string;
  maleNagad: string;
  groups: Record<string, { bkash: string; nagad: string }>;
} {
  let maleBkash = '';
  let maleNagad = '';
  const groups: Record<string, { bkash: string; nagad: string }> = {
    Science: { bkash: '', nagad: '' },
    'Business Studies': { bkash: '', nagad: '' },
    Humanities: { bkash: '', nagad: '' },
  };
  for (const line of rawText.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    const legacy = line.match(/^male\s*(bkash|nagad)[:\s]+(.+)$/i);
    if (legacy) {
      const provider = legacy[1].toLowerCase();
      const value = legacy[2].trim();
      if (provider === 'bkash') maleBkash = value;
      if (provider === 'nagad') maleNagad = value;
      continue;
    }
    const match = line.match(/^(science|business studies|commerce|humanities|arts)\s+(bkash|nagad)[:\s]+(.+)$/i);
    if (match) {
      const group = /science/i.test(match[1]) ? 'Science' : /business|commerce/i.test(match[1]) ? 'Business Studies' : 'Humanities';
      groups[group][match[2].toLowerCase() as 'bkash' | 'nagad'] = match[3].trim();
    }
  }
  return { maleBkash, maleNagad, groups };
}

export function parseEventCardsContent(rawText: string): EventCard[] {
  const colorPalette = ['indigo', 'cyan', 'emerald', 'amber', 'rose', 'purple', 'blue'];
  const iconPalette = ['calendar', 'shirt', 'credit-card', 'award', 'sparkles', 'map-pin', 'clock'];

  const lines = rawText.split(/\r?\n/);
  const cards: EventCard[] = [];

  let currentTitle = '';
  let currentDescLines: string[] = [];
  let currentVisible = true;
  let cardCount = 0;

  const pushCurrentCard = () => {
    if (currentTitle) {
      cardCount++;
      const colorIndex = (cardCount - 1) % colorPalette.length;

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
        visible: currentVisible,
      });
      currentTitle = '';
      currentDescLines = [];
      currentVisible = true;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const titleMatch = line.match(/^title[:]\s*(.+)$/i);
    const descMatch = line.match(/^description[:]\s*(.+)$/i);
    const visibleMatch = line.match(/^visible[:]\s*(.+)$/i);

    if (titleMatch) {
      pushCurrentCard();
      currentTitle = titleMatch[1].trim();
    } else if (descMatch) {
      currentDescLines.push(descMatch[1].trim());
    } else if (visibleMatch && currentTitle) {
      currentVisible = !/^(false|0|no|hide|hidden|disable|disabled)$/i.test(visibleMatch[1].trim());
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
// 2. MALE-ONLY SECTIONS & CATEGORIES RESOLVER
// ============================================================================

export type RegistrationSectionConfig = Record<
  string,
  Record<string, Array<{ value: string; label: string; enabled?: boolean; sort_order?: number }>>
>;

export interface SectionCategory {
  id: string;
  name: string;
  sections: string[];
}

export interface MaleSectionSettings {
  categories: SectionCategory[];
}

export const DEFAULT_MALE_SECTION_CATEGORIES: SectionCategory[] = [
  { id: 'cat-science', name: 'Science', sections: ['ScB1', 'ScB2', 'ScB3'] },
  { id: 'cat-business-studies', name: 'Business Studies', sections: ['BsB1', 'BsB2'] },
  { id: 'cat-humanities', name: 'Humanities', sections: ['HuB1', 'HuB2'] },
];

function cloneDefaultCategories(): SectionCategory[] {
  return DEFAULT_MALE_SECTION_CATEGORIES.map(cat => ({
    ...cat,
    sections: [...cat.sections],
  }));
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const val of values) {
    const clean = val.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function parseMaleSectionSettings(rawInput?: string): MaleSectionSettings {
  const fileContent = String(sectionSettingsRaw || '').trim();
  const rawSetting = typeof rawInput === 'string'
    ? rawInput.trim()
    : getSavedSuperAdminText('03. reg-settings/Text/Section settings.txt', fileContent).trim();

  if (!rawSetting) {
    return { categories: [] };
  }

  try {
    if (rawSetting.startsWith('{')) {
      const parsed = JSON.parse(rawSetting) as Record<string, unknown>;
      if (Array.isArray(parsed.categories)) {
        const seenCats = new Set<string>();
        const categories: SectionCategory[] = [];
        parsed.categories.forEach((rawCat, idx) => {
          if (!rawCat || typeof rawCat !== 'object') return;
          const catObj = rawCat as Record<string, unknown>;
          const name = typeof catObj.name === 'string' ? catObj.name.trim() : '';
          if (!name || seenCats.has(name.toLowerCase())) return;
          seenCats.add(name.toLowerCase());
          const rawSections = Array.isArray(catObj.sections)
            ? catObj.sections.filter((s): s is string => typeof s === 'string')
            : [];
          categories.push({
            id: typeof catObj.id === 'string' && catObj.id.trim() ? catObj.id.trim() : `cat-${idx + 1}`,
            name,
            sections: dedupeStrings(rawSections),
          });
        });
        return { categories };
      }

      // Legacy object format { male: { science: [{ value }] } }
      if (parsed.male && typeof parsed.male === 'object') {
        const maleObj = parsed.male as Record<string, Array<{ value?: string; enabled?: boolean; sort_order?: number }>>;
        const categories: SectionCategory[] = [];
        Object.entries(maleObj).forEach(([key, items], idx) => {
          if (!Array.isArray(items)) return;
          const prettyName = key
            .split('_')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          const sections = dedupeStrings(
            items
              .filter(item => item && item.enabled !== false && item.value)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map(item => String(item.value || ''))
          );
          categories.push({ id: `cat-${idx + 1}`, name: prettyName, sections });
        });
        if (categories.length > 0) return { categories };
      }
    }

    // Plain text parser — strictly parses Male Sections only
    const lines = rawSetting.split(/\r?\n/);
    let scope: 'male' | 'female' | null = null;
    const categories: SectionCategory[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^male\s*sections?:/i.test(trimmed)) {
        scope = 'male';
        continue;
      }
      if (/^female\s*sections?:/i.test(trimmed)) {
        scope = 'female';
        continue;
      }
      if (scope === 'female') continue;

      const matchGroup = trimmed.match(/^([^:]+):\s*(.+)$/);
      if (matchGroup) {
        const name = matchGroup[1].trim();
        const rest = matchGroup[2].trim();
        const parenMatch = rest.match(/\(([^)]+)\)/);
        const listStr = parenMatch ? parenMatch[1] : rest;
        const sections = dedupeStrings(listStr.split(/[,;]+/));
        if (name) {
          categories.push({
            id: `cat-${categories.length + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name,
            sections,
          });
        }
      }
    }

    if (categories.length > 0) {
      return { categories };
    }
  } catch {
    // Fall back to default male categories on parse error
  }

  return { categories: cloneDefaultCategories() };
}

export function getMaleSectionSettings(): MaleSectionSettings {
  return parseMaleSectionSettings();
}

export function getConfiguredCategories(): string[] {
  const { categories } = getMaleSectionSettings();
  return categories.map(cat => cat.name);
}

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
  // Strictly Male-Only sections system
  if (gender !== 'male') return [];

  const target = group.trim().toLowerCase();
  if (!target) return [];

  const { categories } = getMaleSectionSettings();
  const exact = categories.find(cat => cat.name.trim().toLowerCase() === target);
  if (exact) return exact.sections;

  const fuzzy = categories.find(cat => {
    const name = cat.name.trim().toLowerCase();
    return (
      (target.includes('science') && name.includes('science')) ||
      ((target.includes('business') || target.includes('commerce')) && (name.includes('business') || name.includes('commerce'))) ||
      ((target.includes('humanities') || target.includes('arts')) && (name.includes('humanities') || name.includes('arts')))
    );
  });

  if (fuzzy) return fuzzy.sections;
  return [];
}

// ============================================================================
// 3. EXPORTED CONFIGURATION OBJECTS WITH DYNAMIC RESOLUTION
// ============================================================================

export function getWebsiteIdentityConfig() {
  try {
    const name = getSavedSuperAdminText('01. website-identity/Text/web name.txt', String(websiteNameRaw || '').trim()) || 'NIC 27';
    const subtitle = getSavedSuperAdminText('01. website-identity/Text/web header.txt', String(websiteHeaderRaw || '').trim()) || 'Annual Grand Farewell & Batch 27 Celebration';
    const footer = getSavedSuperAdminText('01. website-identity/Text/web footer.txt', String(footerTextRaw || '').trim()) || '© 2027 Rag Day 27 Committee. All Rights Reserved.';
    const logo = getSuperAdminImageUrl('01. website-identity/Pic/logo.png', websiteLogoPic || logoPic06 || defaultLogo);
    const favicon = getSuperAdminImageUrl('01. website-identity/Pic/favicon.png', websiteFaviconPic || faviconPic06 || defaultFavicon);

    return {
      websiteName: name,
      websiteSubtitle: subtitle,
      footerText: footer,
      websiteLogo: logo,
      favicon: favicon,
    };
  } catch {
    return {
      websiteName: 'NIC 27',
      websiteSubtitle: 'Annual Grand Farewell & Batch 27 Celebration',
      footerText: '© 2027 Rag Day 27 Committee. All Rights Reserved.',
      websiteLogo: defaultLogo,
      favicon: defaultFavicon,
    };
  }
}

export function getEventSettingsConfig() {
  const name = getSavedSuperAdminText('02. event-settings/Text/Event name.txt', eventNameRaw.trim()) || 'RAG DAY of NIC 27';
  const cardRaw = getSavedSuperAdminText('02. event-settings/Text/Event card.txt', eventCardRaw.trim());
  const venue = getSavedSuperAdminText('02. event-settings/Text/Venue.txt', venueRawText.trim()) || 'Central Amphitheatre';
  const jersey = getSuperAdminImageUrl('02. event-settings/Pic/jersey-design.png', eventJerseyDesignPic02 || defaultMaleJersey);
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
  try {
    const toggleContent = String(registrationToggleRaw || '').trim();
    const regToggle = getSavedSuperAdminText('03. reg-settings/Text/Countdown enable disable.txt', toggleContent).toLowerCase().trim();
    const manualOverride = safeStorage.getItem('rd27_manual_reg_override');

    // Manual admin control overrides automatic schedule
    if (manualOverride === 'enable' || /^(manual_enable|force_enable|force_open)$/i.test(regToggle)) {
      return { isOpen: true, isAuto: false, reason: 'manual_enabled' };
    }
    if (manualOverride === 'disable' || /^(disable|disabled|close|closed|manual_disable|force_disable)$/i.test(regToggle)) {
      return { isOpen: false, isAuto: false, reason: 'manual_disabled' };
    }

    // Automatic schedule check
    const lastDateContent = String(lastRegistrationDateRaw || '').trim();
    const deadlineStr = getSavedSuperAdminText(
      '03. reg-settings/Text/Last Registration date.txt',
      lastDateContent
    ) || '2027-01-25T23:59:59';

    const deadlineDate = parseSafeDate(deadlineStr);

    if (deadlineDate && Date.now() > deadlineDate.getTime()) {
      return { isOpen: false, isAuto: true, reason: 'after_end' };
    }
  } catch {
    // Fallback to open active registration if config parsing fails.
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
  // The three group-specific files are the only payment-number sources.
  const legacyPayments = { maleBkash: '', maleNagad: '', groups: { Science: { bkash: '', nagad: '' }, 'Business Studies': { bkash: '', nagad: '' }, Humanities: { bkash: '', nagad: '' } } };
  const parseGroupFile = (path: string, bundled: string, groupName: string) => {
    const raw = getSavedSuperAdminText(path, bundled.trim());
    const values = { bkash: '', nagad: '' };
    for (const line of raw.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
      const match = line.match(/^(?:(?:Science|Business Studies|Humanities)\s+)?(bkash|nagad)[:\s]+(.+)$/i);
      if (match) values[match[1].toLowerCase() as 'bkash' | 'nagad'] = match[2].trim();
    }
    const oldValue = legacyPayments.groups[groupName];
    return {
      bkash: values.bkash || oldValue?.bkash || '',
      nagad: values.nagad || oldValue?.nagad || '',
    };
  };
  const payments = {
    ...legacyPayments,
    groups: {
      Science: parseGroupFile('03. reg-settings/Text/Payment number SC.txt', paymentNumberSCRaw, 'Science'),
      'Business Studies': parseGroupFile('03. reg-settings/Text/Payment number BS.txt', paymentNumberBSRaw, 'Business Studies'),
      Humanities: parseGroupFile('03. reg-settings/Text/Payment number HU.txt', paymentNumberHURaw, 'Humanities'),
    },
  };
  const openState = calculateRegistrationOpenState();
  const jersey = getSuperAdminImageUrl('02. event-settings/Pic/jersey-design.png', eventJerseyDesignPic02 || defaultMaleJersey);
  const backJersey = getSuperAdminImageUrl('03. reg-settings/Pic/back jersey preview.png', backJerseyPic || defaultJerseyBg);

  const customFee = getSavedSuperAdminText('02. event-settings/Text/Fees.txt', String(eventFeesRaw || '').trim() || '500 BDT').trim() || '500 BDT';

  return {
    registrationOpen: openState.isOpen,
    registrationOpenReason: openState.reason,
    registrationIsAuto: openState.isAuto,
    registrationFee: customFee || '500 BDT',
    malePaymentNumber: payments.maleBkash,
    maleBkashNumber: payments.maleBkash,
    maleNagadNumber: payments.maleNagad,
    groupPaymentNumbers: payments.groups,
    maleJerseyDesign: jersey || defaultMaleJersey,
    jerseyPreviewBackground: backJersey || defaultJerseyBg,
    maleInvitationSignature: 'Executive Convener (Boys Wing)',
  };
}

export function getCountdownSettingsConfig() {
  try {
    const eventDate = getSavedSuperAdminText('02. event-settings/Text/Event date.txt', String(eventDateRaw || '').trim()) || '2027-02-01T10:00:00';

    const lastDateContent = String(lastRegistrationDateRaw || '').trim();
    const deadline = getSavedSuperAdminText('03. reg-settings/Text/Last Registration date.txt', lastDateContent) || '2027-01-25T23:59:59';

    const enableRaw = getSavedSuperAdminText('02. event-settings/Text/Countedown enable disable.txt', String(countdownEnableDisableRaw || '').trim()).toLowerCase();
    const isCountdownEnabled = !/^(disable|disabled)$/i.test(enableRaw);
    const registrationToggle = getSavedSuperAdminText('03. reg-settings/Text/Countdown enable disable.txt', String(registrationToggleRaw || '').trim()).toLowerCase();
    const registrationCountdownEnabled = !/^(disable|disabled)$/i.test(registrationToggle);

    return {
      eventDate,
      registrationDeadline: deadline,
      countdownEnabled: isCountdownEnabled,
      registrationCountdownEnabled,
    };
  } catch {
    return {
      eventDate: '2027-02-01T10:00:00',
      registrationDeadline: '2027-01-25T23:59:59',
      countdownEnabled: true,
      registrationCountdownEnabled: true,
    };
  }
}

export interface HeaderNoticeItem {
  id: string;
  text: string;
  enabled?: boolean;
}

export interface HeaderNoticeConfig {
  enabled: boolean;
  notices: HeaderNoticeItem[];
}

export interface PopupNoticeItem {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
}

export interface PopupNoticeConfig {
  enabled: boolean;
  intervalSeconds: number;
  items: PopupNoticeItem[];
}

function parseBooleanLike(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const clean = value.trim().toLowerCase();
    if (/^(false|0|no|off|disable|disabled)$/.test(clean)) return false;
    if (/^(true|1|yes|on|enable|enabled)$/.test(clean)) return true;
  }
  return fallback;
}

function isLegacyNoticeBoardEnabled(): boolean {
  const enableRaw = getSavedSuperAdminText(
    '04. important-notice/Text/Enable Disable.txt',
    String(noticeEnableDisableRaw || '').trim()
  ).trim().toLowerCase();
  if (!enableRaw) return false;
  return !/^(disable|disabled|false|0|off|no)$/i.test(enableRaw);
}

export function parseHeaderNoticeConfig(rawInput?: string): HeaderNoticeConfig {
  const rawText = typeof rawInput === 'string'
    ? rawInput.trim()
    : getSavedSuperAdminText('05. important-notice/Text/Notice Board.txt', String(noticeBoardRaw || '').trim()).trim();

  if (!rawText) {
    return { enabled: false, notices: [] };
  }

  if (rawText.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawText) as {
        enabled?: unknown;
        notices?: Array<{ id?: unknown; text?: unknown; enabled?: unknown }>;
      };
      const enabled = parseBooleanLike(parsed.enabled, isLegacyNoticeBoardEnabled());
      const notices: HeaderNoticeItem[] = Array.isArray(parsed.notices)
        ? parsed.notices
            .map((item, idx) => ({
              id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : `header-${idx + 1}`,
              text: typeof item?.text === 'string' ? item.text.trim() : '',
              enabled: parseBooleanLike(item?.enabled, true),
            }))
            .filter(item => item.text.length > 0)
        : [];
      return { enabled, notices };
    } catch {
      // Fallback to plain text parsing below
    }
  }

  if (/^(disable|disabled|false|0|off)$/i.test(rawText)) {
    return { enabled: false, notices: [] };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return {
    enabled: isLegacyNoticeBoardEnabled(),
    notices: lines.map((text, idx) => ({
      id: `header-${idx + 1}`,
      text,
      enabled: true,
    })),
  };
}

export function getHeaderNoticesConfig(): HeaderNoticeConfig {
  return parseHeaderNoticeConfig();
}

export function parsePopupNoticeConfig(rawInput?: string, legacyEnabled?: boolean): PopupNoticeConfig {
  const enableRaw = getSavedSuperAdminText(
    '05. important-notice/Text/Enable Disable.txt',
    String(noticeEnableDisableRaw || '').trim()
  ).toLowerCase().trim();
  const fallbackEnabled = typeof legacyEnabled === 'boolean'
    ? legacyEnabled
    : !/^(disable|disabled)$/i.test(enableRaw);

  const rawText = typeof rawInput === 'string'
    ? rawInput.trim()
    : getSavedSuperAdminText('05. important-notice/Text/Popup Notice.txt', String(popupNoticeRaw || '').trim()).trim();

  if (!rawText) {
    return { enabled: false, intervalSeconds: 3, items: [] };
  }

  if (rawText.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawText) as {
        enabled?: unknown;
        intervalSeconds?: unknown;
        items?: Array<{ id?: unknown; title?: unknown; message?: unknown; enabled?: unknown }>;
      };
      const enabled = typeof parsed.enabled === 'boolean' ? parsed.enabled : fallbackEnabled;
      const rawInterval = Number(parsed.intervalSeconds);
      const intervalSeconds = Number.isFinite(rawInterval)
        ? Math.min(60, Math.max(1, Math.round(rawInterval)))
        : 3;

      const items: PopupNoticeItem[] = Array.isArray(parsed.items)
        ? parsed.items
            .map((item, idx) => ({
              id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : `popup-${idx + 1}`,
              title: typeof item?.title === 'string' ? item.title.trim() : '',
              message: typeof item?.message === 'string' ? item.message.trim() : '',
              enabled: item?.enabled !== false,
            }))
            .filter(item => item.title.length > 0 || item.message.length > 0)
        : [];

      return { enabled, intervalSeconds, items };
    } catch {
      // Fallback to plain text parsing below
    }
  }

  return {
    enabled: fallbackEnabled,
    intervalSeconds: 3,
    items: [
      {
        id: 'popup-1',
        title: 'Important Notice',
        message: rawText,
        enabled: true,
      },
    ],
  };
}

export function getPopupNoticesConfig(): PopupNoticeConfig {
  return parsePopupNoticeConfig();
}

export function getImportantNoticeConfig() {
  try {
    const headerConfig = getHeaderNoticesConfig();
    const popupConfig = getPopupNoticesConfig();
    const activeHeaderNotices = headerConfig.enabled
      ? headerConfig.notices.filter(item => item.enabled !== false && item.text.trim())
      : [];
    const activePopupItems = popupConfig.enabled
      ? popupConfig.items.filter(item => item.enabled !== false && (item.title.trim() || item.message.trim()))
      : [];

    return {
      noticeEnabled: Boolean(headerConfig.enabled) && activeHeaderNotices.length > 0,
      headerNotices: {
        enabled: Boolean(headerConfig.enabled),
        notices: activeHeaderNotices,
      },
      popupEnabled: Boolean(popupConfig.enabled) && activePopupItems.length > 0,
      popupNotices: {
        ...popupConfig,
        items: activePopupItems,
      },
      popupTitle: activePopupItems[0]?.title || 'Important Notice',
      popupMessage: activePopupItems[0]?.message || '',
      noticeContent: activeHeaderNotices.map(n => n.text).join('  •  '),
      closeButtonText: 'I Understand',
    };
  } catch {
    return {
      noticeEnabled: false,
      headerNotices: { enabled: false, notices: [] as HeaderNoticeItem[] },
      popupEnabled: false,
      popupNotices: { enabled: false, intervalSeconds: 3, items: [] as PopupNoticeItem[] },
      popupTitle: 'Important Notice',
      popupMessage: '',
      noticeContent: '',
      closeButtonText: 'I Understand',
    };
  }
}

// 06. Logo Related — branding only.
export const logoRelatedConfig = {
  get websiteLogo() { return getWebsiteIdentityConfig().websiteLogo; },
  get favicon() { return getWebsiteIdentityConfig().favicon; },
  get registrationJerseyBackPreview() { return getRegistrationSettingsConfig().jerseyPreviewBackground; },
  get maleJersey() { return getRegistrationSettingsConfig().maleJerseyDesign; },
  get eventJersey() { return getEventSettingsConfig().eventJersey; },
};

// 02. Event Settings — sole source of public jersey showcase cards.
export function getJerseyShowcaseCards(): JerseyDesignCard[] {
  const fallbackImage = eventJerseyDesignPic02 || getEventSettingsConfig().eventJersey || defaultJerseyOne;
  try {
    const raw = getSavedSuperAdminText(
      '02. event-settings/Text/Jersey design.txt',
      String(jerseyDesignRaw02 || '').trim()
    );
    const cards = parseJerseyDesignContent(raw, fallbackImage);

    return cards.map(card => {
      // Each card uses the named image asset from Section 02 when configured.
      const filename = (card.imageFilename || 'jersey-design.png').split('/').pop() || 'jersey-design.png';
      const knownSection02Assets: Record<string, string> = {
        'jersey-design.png': getSuperAdminImageUrl(
          '02. event-settings/Pic/jersey-design.png',
          eventJerseyDesignPic02
        ),
      };
      return {
        ...card,
        image: knownSection02Assets[filename] || fallbackImage,
      };
    });
  } catch {
    return [
      {
        id: 'jersey-design-card-1',
        title: 'Official Rag Day Jersey',
        description: 'Custom Squad Kit with Personalized Back Name & Number Print Included',
        image: fallbackImage,
        imageFilename: 'jersey-design.png',
      },
    ];
  }
}

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
  get groupPaymentNumbers() { return getRegistrationSettingsConfig().groupPaymentNumbers; },
  get maleJerseyDesign() { return getRegistrationSettingsConfig().maleJerseyDesign; },
  get jerseyPreviewBackground() { return getRegistrationSettingsConfig().jerseyPreviewBackground; },
  get maleInvitationSignature() { return getRegistrationSettingsConfig().maleInvitationSignature; },
};

// 02. Event Settings (Countdown Compatibility Reader)
export const countdownSettingsConfig = {
  get eventDate() { return getCountdownSettingsConfig().eventDate; },
  get registrationDeadline() { return getCountdownSettingsConfig().registrationDeadline; },
  get countdownEnabled() { return getCountdownSettingsConfig().countdownEnabled; },
};

// 05. Important Notice
export const importantNoticeConfig = {
  get noticeEnabled() { return getImportantNoticeConfig().noticeEnabled; },
  get headerNotices() { return getImportantNoticeConfig().headerNotices; },
  get popupEnabled() { return getImportantNoticeConfig().popupEnabled; },
  get popupNotices() { return getImportantNoticeConfig().popupNotices; },
  get popupTitle() { return getImportantNoticeConfig().popupTitle; },
  get popupMessage() { return getImportantNoticeConfig().popupMessage; },
  get noticeContent() { return getImportantNoticeConfig().noticeContent; },
  get closeButtonText() { return getImportantNoticeConfig().closeButtonText; },
};


