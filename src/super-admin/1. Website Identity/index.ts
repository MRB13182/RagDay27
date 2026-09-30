/**
 * SUPER ADMIN - 1. Website Identity
 *
 * This configuration file provides editable identity and branding values for the website.
 * The Super Admin modifies values directly in this source code file.
 *
 * Editable Fields:
 * - Website Name (text)
 * - Website Subtitle (text)
 * - Footer Text (text)
 * - Website Logo (image)
 * - Favicon (image)
 */

export interface WebsiteIdentityConfig {
  /** Website Name (text) */
  websiteName: string;
  /** Website Subtitle (text) */
  websiteSubtitle: string;
  /** Footer Text (text) */
  footerText: string;
  /** Website Logo (image - URL, asset path, or data URI) */
  websiteLogo: string;
  /** Favicon (image - URL, asset path, or data URI) */
  favicon: string;
}

export const websiteIdentityConfig: WebsiteIdentityConfig = {
  websiteName: 'Rag Day 27 (RD27)',
  websiteSubtitle: 'Annual Grand Farewell & Batch 27 Celebration',
  footerText: '© 2027 Rag Day 27 (RD27) Committee. All Rights Reserved. Crafted for Batch 27.',
  websiteLogo: '',
  favicon: '',
};

export default websiteIdentityConfig;
