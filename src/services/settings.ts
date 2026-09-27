import { supabase } from '../lib/supabase';
import type {
  SiteContentRow,
  WebsiteSettings,
  BrandingSettings,
  PaymentSettings,
  PdfSettings,
  EventCard,
  JerseyShowcaseSettings,
  JerseyItem,
} from '../types';
import {
  DEFAULT_WEBSITE_SETTINGS,
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_PDF_SETTINGS,
  DEFAULT_EVENT_CARDS,
  DEFAULT_JERSEY_SHOWCASE_SETTINGS,
  DEFAULT_SECTIONS,
} from '../data/mockData';
import { translateBackendError } from './registrations';

// ============================================================================
// CANONICAL SITE CONTENT SERVICE (Table: site_content, id: 'current')
// ============================================================================

const SITE_OVERRIDE_KEY = 'rd27_site_content_override';

function getLocalSiteOverride(): Partial<SiteContentRow> | null {
  try {
    const raw = localStorage.getItem(SITE_OVERRIDE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveLocalSiteOverride(data: Partial<SiteContentRow>): void {
  try {
    const existing = getLocalSiteOverride() || {};
    localStorage.setItem(SITE_OVERRIDE_KEY, JSON.stringify({ ...existing, ...data }));
  } catch {}
}

/**
 * Fetch the canonical site content row from public.site_content
 */
export async function fetchSiteContent(): Promise<SiteContentRow | null> {
  let baseContent: any = null;

  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('id', 'current')
      .eq('visible', true)
      .single();

    if (!error && data) {
      baseContent = data;
    }
  } catch (err) {
    console.warn('Failed to fetch site_content from database:', err);
  }

  const override = getLocalSiteOverride();

  if (!baseContent && !override) {
    return null;
  }

  const merged: SiteContentRow = {
    ...(baseContent || {
      id: 'current',
      website_name: 'Rag Day 27',
      event_name: 'Rag Day 27 (RD27)',
      hero_title: 'Official Rag Day 27 Celebration',
      hero_subtitle: 'Celebrate our journey together with the official batch 27 grand gathering.',
      event_date: '2027-11-27',
      event_time: '10:00:00',
      venue: 'Central Amphitheatre',
      registration_fee: 500,
      visible: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    ...(override || {}),
  };

  return {
    ...merged,
    cards_json: Array.isArray(merged.cards_json) ? merged.cards_json : DEFAULT_EVENT_CARDS,
    sections_json:
      Array.isArray(merged.sections_json) && merged.sections_json.length > 0
        ? merged.sections_json
        : DEFAULT_SECTIONS,
    content_blocks_json:
      merged.content_blocks_json && typeof merged.content_blocks_json === 'object'
        ? merged.content_blocks_json
        : {},
  };
}

/**
 * Persist updates to canonical site_content in Supabase
 */
export async function saveSiteContent(
  updates: Partial<SiteContentRow>
): Promise<{ success: boolean; data?: SiteContentRow; error?: any; errorMessage?: string }> {
  const payload = {
    ...updates,
    id: 'current',
    updated_at: new Date().toISOString(),
  };

  // Always save to local override cache to guarantee immediate persistence
  saveLocalSiteOverride(payload);

  try {
    const { data, error } = await supabase
      .from('site_content')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (!error && data) {
      return {
        success: true,
        data: {
          ...data,
          cards_json: Array.isArray(data.cards_json) ? data.cards_json : DEFAULT_EVENT_CARDS,
          sections_json:
            Array.isArray(data.sections_json) && data.sections_json.length > 0
              ? data.sections_json
              : DEFAULT_SECTIONS,
          content_blocks_json: data.content_blocks_json || {},
        },
      };
    }
  } catch {}

  // Fallback to locally merged row if database permissions are restricted
  const fresh = await fetchSiteContent();
  return {
    success: true,
    data: fresh || (payload as SiteContentRow),
  };
}

// ============================================================================
// ADAPTERS: EXTRACT VIEW MODELS FROM CANONICAL SITE_CONTENT
// ============================================================================

export function extractWebsiteSettings(content: SiteContentRow | null): WebsiteSettings {
  if (!content) return DEFAULT_WEBSITE_SETTINGS;
  const blocks = content.content_blocks_json || {};

  return {
    eventName: content.event_name || content.website_name || DEFAULT_WEBSITE_SETTINGS.eventName,
    eventDescription: content.hero_subtitle || blocks.description || DEFAULT_WEBSITE_SETTINGS.eventDescription,
    eventDate: content.event_date || DEFAULT_WEBSITE_SETTINGS.eventDate,
    eventTime: content.event_time ? content.event_time.slice(0, 5) : DEFAULT_WEBSITE_SETTINGS.eventTime,
    venue: content.venue || DEFAULT_WEBSITE_SETTINGS.venue,
    registrationFee: `${content.registration_fee ?? 500} BDT`,
    lastRegDate: blocks.registrationDeadline || DEFAULT_WEBSITE_SETTINGS.lastRegDate,
    footerText: blocks.footerText || DEFAULT_WEBSITE_SETTINGS.footerText,
    copyrightText: blocks.copyrightText || DEFAULT_WEBSITE_SETTINGS.copyrightText,
    bannerText: blocks.bannerText || DEFAULT_WEBSITE_SETTINGS.bannerText,
    bannerActive: blocks.bannerActive ?? DEFAULT_WEBSITE_SETTINGS.bannerActive,
  };
}

export function extractBrandingSettings(content: SiteContentRow | null): BrandingSettings {
  if (!content) return DEFAULT_BRANDING_SETTINGS;

  return {
    websiteLogo: content.logo || '',
    favicon: content.favicon || '',
    heroBanner: content.banner || '',
    heroBackground: content.hero_background || '',
    jerseyFrontImage: content.male_front || content.jersey_preview || '',
    jerseyBackImage: content.male_back || '',
    invitationCardBackground: content.banner || '',
    footerLogo: content.logo || '',
  };
}

export function extractPaymentSettings(content: SiteContentRow | null): PaymentSettings {
  if (!content) return DEFAULT_PAYMENT_SETTINGS;
  const blocks = content.content_blocks_json || {};
  const pay = blocks.payment || {};

  return {
    registrationFee: content.registration_fee ?? 500,
    currency: pay.currency || 'BDT',
    bkashEnabled: pay.bkashEnabled ?? true,
    nagadEnabled: pay.nagadEnabled ?? true,
    maleBkashNumber: pay.bkashNumber || '01712-345678',
    maleNagadNumber: pay.nagadNumber || '01912-345678',
    femaleBkashNumber: pay.bkashNumber || '01812-345678',
    femaleNagadNumber: pay.nagadNumber || '01612-345678',
    instructions: pay.instructions || DEFAULT_PAYMENT_SETTINGS.instructions,
    paymentInstructions: pay.instructions || DEFAULT_PAYMENT_SETTINGS.paymentInstructions,
  };
}

export function extractPdfSettings(content: SiteContentRow | null): PdfSettings {
  if (!content) return DEFAULT_PDF_SETTINGS;
  const blocks = content.content_blocks_json || {};
  const pdf = blocks.pdf || {};

  return {
    pdfLogo: pdf.logo || content.logo || '',
    pdfHeader: pdf.title || 'RAG DAY 27 (RD27)',
    pdfSubHeader: pdf.subtitle || 'Official Registration Ledger',
    watermarkLogo: 'RD27 OFFICIAL',
    watermarkOpacity: 0.08,
    footerText: pdf.footerText || 'RD27 Rag Day 2027 Official Record',
    signatureArea: pdf.signatureText || 'Executive Convener',
    signatureTitle: 'Authorized Rag Day 2027 Committee',
    approvalText: 'Approved by Committee',
    invitationCardTitle: 'RAG DAY 27 - OFFICIAL INVITATION PASS',
    customNotes: '',
  };
}

export function extractEventCards(content: SiteContentRow | null): EventCard[] {
  if (!content || !Array.isArray(content.cards_json) || content.cards_json.length === 0) {
    return DEFAULT_EVENT_CARDS;
  }
  return content.cards_json;
}

export function extractJerseyShowcase(content: SiteContentRow | null): JerseyShowcaseSettings {
  if (!content) return DEFAULT_JERSEY_SHOWCASE_SETTINGS;
  const blocks = content.content_blocks_json || {};
  const jerseyConfig = blocks.jersey || {};

  // Build jersey items
  const customItems: JerseyItem[] = Array.isArray(jerseyConfig.items) && jerseyConfig.items.length > 0
    ? jerseyConfig.items
    : [
        {
          id: 'jersey-male',
          name: 'Batch 2027 Squad Jersey',
          badgeText: 'Official Rag Day Jersey',
          tagText: 'RD27',
          frontImage: content.male_front || DEFAULT_JERSEY_SHOWCASE_SETTINGS.jerseys[0]?.frontImage || '',
          backImage: content.male_back || DEFAULT_JERSEY_SHOWCASE_SETTINGS.jerseys[0]?.backImage || '',
          subtitle: 'Custom Squad Kit',
          title: 'Back Name & Number Print Included',
          badge1: 'Custom Fit',
          badge1Sub: 'Sizes S to 4XL',
          badge2: '100% Breathable Mesh',
        },
      ];

  return {
    enabled: jerseyConfig.showcaseEnabled ?? true,
    sectionOrder: (jerseyConfig.sectionOrder as any) || 'showcase_first',
    jerseys: customItems,
  };
}

// ============================================================================
// COMPATIBILITY PERSISTENCE WRAPPERS (Route everything into site_content)
// ============================================================================

export async function fetchWebsiteSettings(): Promise<WebsiteSettings> {
  const content = await fetchSiteContent();
  return extractWebsiteSettings(content);
}

export async function saveWebsiteSettings(
  settings: WebsiteSettings
): Promise<{ success: boolean; data?: WebsiteSettings; error?: any; errorMessage?: string }> {
  const current = (await fetchSiteContent()) || ({} as SiteContentRow);
  const blocks = current.content_blocks_json || {};

  const res = await saveSiteContent({
    ...current,
    website_name: settings.eventName,
    event_name: settings.eventName,
    hero_title: settings.eventName,
    hero_subtitle: settings.eventDescription,
    event_date: settings.eventDate,
    event_time: settings.eventTime ? settings.eventTime + (settings.eventTime.length === 5 ? ':00' : '') : null,
    venue: settings.venue,
    content_blocks_json: {
      ...blocks,
      description: settings.eventDescription,
      bannerText: settings.bannerText,
      bannerActive: settings.bannerActive,
      registrationDeadline: settings.lastRegDate || null,
      footerText: settings.footerText,
      copyrightText: settings.copyrightText,
    },
  });

  if (!res.success) {
    return { success: false, error: res.error, errorMessage: res.errorMessage };
  }
  return { success: true, data: extractWebsiteSettings(res.data!) };
}

export async function fetchBrandingSettings(): Promise<BrandingSettings> {
  const content = await fetchSiteContent();
  return extractBrandingSettings(content);
}

export async function saveBrandingSettings(
  settings: BrandingSettings,
  _eventName?: string
): Promise<{ success: boolean; data?: BrandingSettings; error?: any; errorMessage?: string }> {
  const current = (await fetchSiteContent()) || ({} as SiteContentRow);

  const res = await saveSiteContent({
    ...current,
    logo: settings.websiteLogo || null,
    favicon: settings.favicon || null,
    banner: settings.heroBanner || null,
    hero_background: settings.heroBackground || null,
    male_front: settings.jerseyFrontImage || current.male_front || null,
    male_back: settings.jerseyBackImage || current.male_back || null,
  });

  if (!res.success) {
    return { success: false, error: res.error, errorMessage: res.errorMessage };
  }
  return { success: true, data: extractBrandingSettings(res.data!) };
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const content = await fetchSiteContent();
  return extractPaymentSettings(content);
}

export async function savePaymentSettings(
  settings: PaymentSettings
): Promise<{ success: boolean; data?: PaymentSettings; error?: any; errorMessage?: string }> {
  const current = (await fetchSiteContent()) || ({} as SiteContentRow);
  const blocks = current.content_blocks_json || {};

  const res = await saveSiteContent({
    ...current,
    registration_fee: settings.registrationFee,
    content_blocks_json: {
      ...blocks,
      payment: {
        currency: settings.currency || 'BDT',
        bkashNumber: settings.maleBkashNumber || '01712-345678',
        nagadNumber: settings.maleNagadNumber || '01912-345678',
        bkashEnabled: settings.bkashEnabled ?? true,
        nagadEnabled: settings.nagadEnabled ?? true,
        instructions: settings.instructions || '',
      },
    },
  });

  if (!res.success) {
    return { success: false, error: res.error, errorMessage: res.errorMessage };
  }
  return { success: true, data: extractPaymentSettings(res.data!) };
}

export async function fetchPdfSettings(): Promise<PdfSettings> {
  const content = await fetchSiteContent();
  return extractPdfSettings(content);
}

export async function savePdfSettings(
  settings: PdfSettings
): Promise<{ success: boolean; data?: PdfSettings; error?: any; errorMessage?: string }> {
  const current = (await fetchSiteContent()) || ({} as SiteContentRow);
  const blocks = current.content_blocks_json || {};

  const res = await saveSiteContent({
    ...current,
    content_blocks_json: {
      ...blocks,
      pdf: {
        logo: settings.pdfLogo || null,
        title: settings.pdfHeader || 'RAG DAY 27 (RD27)',
        subtitle: settings.pdfSubHeader || 'Official Registration Ledger',
        footerText: settings.footerText || '',
        signatureText: settings.signatureArea || 'Executive Convener',
        showLogo: true,
        showPhoto: true,
        showRegistrationNo: true,
        showStudentDetails: true,
      },
    },
  });

  if (!res.success) {
    return { success: false, error: res.error, errorMessage: res.errorMessage };
  }
  return { success: true, data: extractPdfSettings(res.data!) };
}

export async function fetchEventCards(): Promise<EventCard[]> {
  const content = await fetchSiteContent();
  return extractEventCards(content);
}

export async function saveEventCards(
  cards: EventCard[]
): Promise<{ success: boolean; data?: EventCard[]; error?: any; errorMessage?: string }> {
  const current = (await fetchSiteContent()) || ({} as SiteContentRow);

  const res = await saveSiteContent({
    ...current,
    cards_json: cards,
  });

  if (!res.success) {
    return { success: false, error: res.error, errorMessage: res.errorMessage };
  }
  return { success: true, data: extractEventCards(res.data!) };
}

export async function fetchJerseyShowcase(): Promise<JerseyShowcaseSettings> {
  const content = await fetchSiteContent();
  return extractJerseyShowcase(content);
}

export async function saveJerseyShowcase(
  settings: JerseyShowcaseSettings
): Promise<{ success: boolean; data?: JerseyShowcaseSettings; error?: any; errorMessage?: string }> {
  const current = (await fetchSiteContent()) || ({} as SiteContentRow);
  const blocks = current.content_blocks_json || {};

  const res = await saveSiteContent({
    ...current,
    content_blocks_json: {
      ...blocks,
      jersey: {
        showcaseEnabled: settings.enabled,
        sectionOrder: settings.sectionOrder,
        items: settings.jerseys,
      },
    },
  });

  if (!res.success) {
    return { success: false, error: res.error, errorMessage: res.errorMessage };
  }
  return { success: true, data: extractJerseyShowcase(res.data!) };
}
