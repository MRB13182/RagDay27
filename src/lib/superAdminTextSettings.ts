import { supabase, isSupabaseConfigured, getStoredSuperAdminPasscode, STORAGE_BUCKET } from './supabase';
import { safeStorage } from './safeStorage';

export interface EditableSuperAdminTextFile {
  id: string;
  category: string;
  label: string;
  path: string;
  defaultValue: string;
}

export const EDITABLE_SUPER_ADMIN_TEXT_FILES: EditableSuperAdminTextFile[] = [
  { id: 'website-name', category: '01. Website Identity', label: 'Web name (web name.txt)', path: '01. website-identity/Text/web name.txt', defaultValue: 'NIC 27' },
  { id: 'web-header', category: '01. Website Identity', label: 'Web header (web header.txt)', path: '01. website-identity/Text/web header.txt', defaultValue: 'Annual Grand Farewell & Batch 27 Celebration' },
  { id: 'web-footer', category: '01. Website Identity', label: 'Web footer (web footer.txt)', path: '01. website-identity/Text/web footer.txt', defaultValue: '© 2027 Rag Day 27 Committee. All Rights Reserved.<span class="footer-divider">•</span>Crafted with ❤️ by<a href="https://moshiurr.ai.studio/certificates" target="_blank" rel="noopener noreferrer">MD. Moshiur Rahman</a>for Batch 27' },
  { id: 'event-name', category: '02. Event Settings', label: 'Event name (Event name.txt)', path: '02. event-settings/Text/Event name.txt', defaultValue: 'RAG DAY of NIC 27' },
  { id: 'event-card', category: '02. Event Settings', label: 'Event card (Event card.txt)', path: '02. event-settings/Text/Event card.txt', defaultValue: 'Title: Registration Start\nDescription: Registration starts from October 10. Complete your enrollment before time.\n\nTitle: Registration FEE\nDescription: 500 BDT for your all-inclusive batch pass.' },
  { id: 'event-date', category: '02. Event Settings', label: 'Event date (Event date.txt)', path: '02. event-settings/Text/Event date.txt', defaultValue: '2027-02-01T10:00:00' },
  { id: 'event-countdown-enable-disable', category: '02. Event Settings', label: 'Event countdown enable / disable (Countedown enable disable.txt)', path: '02. event-settings/Text/Countedown enable disable.txt', defaultValue: 'enable' },
  { id: 'event-fees', category: '02. Event Settings', label: 'Event fee (Fees.txt)', path: '02. event-settings/Text/Fees.txt', defaultValue: '500 BDT' },
  { id: 'jersey-design', category: '02. Event Settings', label: 'Jersey showcase design (Jersey design.txt)', path: '02. event-settings/Text/Jersey design.txt', defaultValue: 'Title: Official Rag Day Jersey\nDescription: Custom Squad Kit with Personalized Back Name & Number Print Included\nImage: jersey-design.png' },
  { id: 'venue', category: '02. Event Settings', label: 'Venue (Venue.txt)', path: '02. event-settings/Text/Venue.txt', defaultValue: 'Central Amphitheatre' },
  { id: 'section-settings', category: '03. Registration Settings', label: 'Section settings (Section settings.txt)', path: '03. reg-settings/Text/Section settings.txt', defaultValue: 'Male Sections:\nScience: SCB (ScB1, ScB2, ScB3)\nBusiness Studies: BSB (BsB1, BsB2)\nHumanities: HUB (HuB1, HuB2)' },
  { id: 'payment-number-sc', category: '03. Registration Settings', label: 'Payment Number SC (Science)', path: '03. reg-settings/Text/Payment number SC.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-bs', category: '03. Registration Settings', label: 'Payment Number BS (Business Studies)', path: '03. reg-settings/Text/Payment number BS.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-hu', category: '03. Registration Settings', label: 'Payment Number HU (Humanities)', path: '03. reg-settings/Text/Payment number HU.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'last-registration-date', category: '03. Registration Settings', label: 'Last registration date countdown (Last Registration date.txt)', path: '03. reg-settings/Text/Last Registration date.txt', defaultValue: '2027-01-25T23:59:59' },
  { id: 'registration-enable-disable', category: '03. Registration Settings', label: 'Registration countdown enable / disable (Countdown enable disable.txt)', path: '03. reg-settings/Text/Countdown enable disable.txt', defaultValue: 'enable' },
  { id: 'notice-board', category: '04. Important Notice', label: 'Notice Board (Notice Board.txt)', path: '04. important-notice/Text/Notice Board.txt', defaultValue: '{"enabled":false,"notices":[{"id":"header-1","text":"Official Batch 27 Registration is now OPEN.","enabled":true}]}' },
  { id: 'popup-notice', category: '04. Important Notice', label: 'Popup Notice (Popup Notice.txt)', path: '04. important-notice/Text/Popup Notice.txt', defaultValue: 'Welcome Batch NIC 27! Registration is now OPEN.' },
  { id: 'notice-enable-disable', category: '04. Important Notice', label: 'Notice enable / disable (Enable Disable.txt)', path: '04. important-notice/Text/Enable Disable.txt', defaultValue: 'disable' },
];

const MAX_BRAND_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

function getLocalItem(key: string): string | null {
  return safeStorage.getItem(key);
}

function setLocalItem(key: string, value: string): void {
  safeStorage.setItem(key, value);
}

function dispatchConfigUpdated(detail?: Record<string, unknown>): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('superadmin-config-updated', { detail }));
    }
  } catch {
    // Optional browser event dispatch guard
  }
}

export function normalizeSuperAdminPath(path: string): string {
  return path.replace(/^src\/super-admin\//, '').replace(/^\/+/, '');
}

export function getSavedSuperAdminText(path: string, fallback: string): string {
  const safeFallback = typeof fallback === 'string' ? fallback : '';
  try {
    const normalizedPath = normalizeSuperAdminPath(path);
    const stored = getLocalItem(`super_admin_${normalizedPath}`);
    if (typeof stored === 'string') return stored;
    return safeFallback;
  } catch {
    return safeFallback;
  }
}

function canonicalizeLegacySettingPath(normalizedPath: string): string {
  if (normalizedPath.startsWith('03. reg-settings/') && !normalizedPath.startsWith('03. reg-settings/Text/') && !normalizedPath.startsWith('03. reg-settings/Pic/')) {
    return normalizedPath.replace('03. reg-settings/', '03. reg-settings/Text/');
  }
  const lower = normalizedPath.toLowerCase();
  if (lower === '04. important-notice/text/notice board.txt' || lower === '04. important-notice/text/notice-content.txt') {
    return '04. important-notice/Text/Notice Board.txt';
  }
  if (lower === '04. important-notice/text/popup notice.txt' || lower === '04. important-notice/text/popup-message.txt') {
    return '04. important-notice/Text/Popup Notice.txt';
  }
  if (lower === '04. important-notice/text/enable disable.txt' || lower === '04. important-notice/text/notice-enable-disable.txt') {
    return '04. important-notice/Text/Enable Disable.txt';
  }
  return normalizedPath;
}

function formatWriteError(error: any, fallback: string): string {
  const code = String(error?.code || '');
  const message = String(error?.message || fallback);
  if (code === 'PGRST202' || /could not find the function/i.test(message)) {
    return 'Database Super Admin security migration is not installed yet. Please run the latest SQL migration in Supabase.';
  }
  if (code === '42501' || /unauthorized/i.test(message)) {
    return 'Super Admin session is unauthorized or expired. Please sign in again.';
  }
  return message || fallback;
}

export async function loadRemoteSuperAdminSettings(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    let rows: Array<{ key?: string; value?: string; setting_key?: string; setting_value?: string }> = [];

    const rpcResult = await supabase.rpc('get_site_settings');
    if (!rpcResult.error && Array.isArray(rpcResult.data)) {
      rows = rpcResult.data;
    } else {
      const tableResult = await supabase.from('site_settings').select('key, value');
      if (!tableResult.error && Array.isArray(tableResult.data)) {
        rows = tableResult.data;
      }
    }

    if (rows.length === 0) return false;

    const exactKeys = new Set(
      rows
        .map(row => normalizeSuperAdminPath(String(row.key ?? row.setting_key ?? '')))
        .filter(Boolean)
    );

    let changed = false;
    for (const row of rows) {
      const rawKey = row.key ?? row.setting_key ?? '';
      const rawValue = row.value ?? row.setting_value;
      if (!rawKey || typeof rawValue !== 'string') continue;

      if (rawKey.startsWith('img:')) {
        const imgPath = normalizeSuperAdminPath(rawKey.slice(4));
        const remoteImgKey = `super_admin_img_remote_${imgPath}`;
        if (getLocalItem(remoteImgKey) !== rawValue) {
          setLocalItem(remoteImgKey, rawValue);
          safeStorage.removeItem(`super_admin_img_${imgPath}`);
          changed = true;
        }
        continue;
      }

      const rawNormalized = normalizeSuperAdminPath(rawKey);
      const normalizedPath = canonicalizeLegacySettingPath(rawNormalized);
      // Do not allow an older legacy key alias to overwrite an explicit canonical key present in DB
      if (normalizedPath !== rawNormalized && exactKeys.has(normalizedPath)) {
        continue;
      }
      const storageKey = `super_admin_${normalizedPath}`;
      if (getLocalItem(storageKey) !== rawValue) {
        setLocalItem(storageKey, rawValue);
        changed = true;
      }
    }

    if (changed) {
      dispatchConfigUpdated({ source: 'remote-sync' });
    }
    return true;
  } catch {
    return false;
  }
}

export async function saveEditableSuperAdminText(path: string, content: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase backend is not configured. Changes cannot be saved to the database.');
  }

  const passcode = getStoredSuperAdminPasscode();
  if (!passcode) {
    throw new Error('Super Admin session is locked or expired. Please sign in again.');
  }

  const normalizedPath = normalizeSuperAdminPath(path);
  const { error } = await supabase.rpc('save_super_admin_text', {
    p_path: normalizedPath,
    p_content: content,
    p_passcode: passcode,
  });

  if (error) {
    throw new Error(formatWriteError(error, `Failed to save ${normalizedPath} to database.`));
  }

  if (!normalizedPath.startsWith('img:')) {
    setLocalItem(`super_admin_${normalizedPath}`, content);
  }
  dispatchConfigUpdated({ path: normalizedPath, content });
}

export async function saveEditableSuperAdminBatch(
  entries: Array<{ path: string; content: string }>
): Promise<void> {
  if (entries.length === 0) return;

  if (!isSupabaseConfigured) {
    throw new Error('Supabase backend is not configured. Changes cannot be saved to the database.');
  }

  const passcode = getStoredSuperAdminPasscode();
  if (!passcode) {
    throw new Error('Super Admin session is locked or expired. Please sign in again.');
  }

  const normalizedEntries = entries.map(entry => ({
    path: normalizeSuperAdminPath(entry.path),
    content: entry.content,
  }));

  const { error } = await supabase.rpc('save_super_admin_settings_batch', {
    p_entries: normalizedEntries,
    p_passcode: passcode,
  });

  if (error) {
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message || '')) {
      for (const entry of normalizedEntries) {
        await saveEditableSuperAdminText(entry.path, entry.content);
      }
      return;
    }
    throw new Error(formatWriteError(error, 'Unable to save settings to database.'));
  }

  for (const entry of normalizedEntries) {
    setLocalItem(`super_admin_${entry.path}`, entry.content);
  }
  dispatchConfigUpdated({ source: 'superadmin-batch' });
}

export function getSuperAdminImageUrl(path: string, defaultFallback: string): string {
  try {
    const normalizedPath = normalizeSuperAdminPath(path);
    return (
      getLocalItem(`super_admin_img_remote_${normalizedPath}`) ||
      getLocalItem(`super_admin_img_${normalizedPath}`) ||
      defaultFallback
    );
  } catch {
    return defaultFallback;
  }
}

export async function saveEditableSuperAdminImage(path: string, file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase backend is not configured. Image upload requires database storage.');
  }

  const passcode = getStoredSuperAdminPasscode();
  if (!passcode) {
    throw new Error('Super Admin session is locked or expired. Please sign in again.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only valid image files (PNG, JPG, WebP, SVG, ICO) are supported.');
  }
  if (file.size > MAX_BRAND_IMAGE_BYTES) {
    throw new Error('Image file must be 10 MB or smaller.');
  }

  const normalizedPath = normalizeSuperAdminPath(path);
  const storagePath = `super-admin/${normalizedPath}`;

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type || 'image/png',
    cacheControl: '60',
  });

  if (uploadError) {
    throw new Error(uploadError.message || 'Unable to upload image to Supabase Storage.');
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    throw new Error('Storage upload succeeded, but no public URL was returned.');
  }

  const versionedUrl = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

  // Persist URL to site_settings DB so all visitors/devices immediately receive the updated asset
  await saveEditableSuperAdminText(`img:${normalizedPath}`, versionedUrl);

  setLocalItem(`super_admin_img_remote_${normalizedPath}`, versionedUrl);
  safeStorage.removeItem(`super_admin_img_${normalizedPath}`);
  dispatchConfigUpdated({ imagePath: normalizedPath, url: versionedUrl });

  return versionedUrl;
}
