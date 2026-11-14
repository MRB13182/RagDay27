export type DepartmentKey = 'Science' | 'Business Studies' | 'Humanities';

export interface DepartmentSocialLinks {
  department: DepartmentKey;
  shortLabel: string;
  whatsappUrl: string;
  instagramUrl: string;
}

const PLACEHOLDER_PATTERN = /^(#|https?:\/\/example\.com|your[_-]|todo|placeholder|none|null|undefined)$/i;

/**
 * Normalizes and validates an external social contact URL.
 * Returns a safe https/http URL string when configured, or null if blank/invalid.
 */
export function resolveConfiguredSocialUrl(rawUrl: string | undefined | null): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) return null;

  const candidate = /^(wa\.me\/|api\.whatsapp\.com\/)/i.test(trimmed)
    ? `https://${trimmed}`
    : trimmed;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (!parsed.hostname || parsed.hostname === 'example.com') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

const readEnvString = (key: string): string => {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    return typeof env?.[key] === 'string' ? env[key]!.trim() : '';
  } catch {
    return '';
  }
};

/**
 * Centralized department-wise WhatsApp & Instagram link configuration.
 * Update each department's URLs here directly or via VITE_* environment variables.
 * Unconfigured entries intentionally remain empty so icons display an unavailable state
 * instead of redirecting students to the wrong department's profile.
 */
export const DEPARTMENT_SOCIAL_CONTACTS: readonly DepartmentSocialLinks[] = [
  {
    department: 'Science',
    shortLabel: 'SC',
    whatsappUrl: readEnvString('VITE_SCIENCE_WHATSAPP_URL') || '',
    instagramUrl: readEnvString('VITE_SCIENCE_INSTAGRAM_URL') || '',
  },
  {
    department: 'Business Studies',
    shortLabel: 'BS',
    whatsappUrl: readEnvString('VITE_BUSINESS_WHATSAPP_URL') || '',
    instagramUrl: readEnvString('VITE_BUSINESS_INSTAGRAM_URL') || '',
  },
  {
    department: 'Humanities',
    shortLabel: 'HU',
    whatsappUrl: readEnvString('VITE_HUMANITIES_WHATSAPP_URL') || '',
    instagramUrl: readEnvString('VITE_HUMANITIES_INSTAGRAM_URL') || '',
  },
];
