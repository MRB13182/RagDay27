import { supabase, isSupabaseConfigured } from './supabase';
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
  { id: 'event-date', category: '02. Event Settings', label: 'Event date (Event date.txt)', path: '02. event-settings/Text/Event date.txt', defaultValue: '2026-11-20T10:00:00' },
  { id: 'jersey-design', category: '02. Event Settings', label: 'Jersey showcase design (Jersey design.txt)', path: '02. event-settings/Text/Jersey design.txt', defaultValue: 'Title: Official Rag Day Jersey\\nDescription: Custom Squad Kit with Personalized Back Name & Number Print Included\\nImage: jersey-design.png' },
  { id: 'venue', category: '02. Event Settings', label: 'Venue (Venue.txt)', path: '02. event-settings/Text/Venue.txt', defaultValue: 'Central Amphitheatre' },
  { id: 'section-settings', category: '03. Registration Settings', label: 'Section settings (Section settings.txt)', path: '03. reg-settings/Text/Section settings.txt', defaultValue: 'Male Sections:\nScience: SCB (ScB1, ScB2, ScB3)\nBusiness Studies: BSB (BsB1, BsB2)\nHumanities: HUB (HuB1, HuB2)' },
  { id: 'payment-number-sc', category: '03. Registration Settings', label: 'Payment Number SC (Science)', path: '03. reg-settings/Text/Payment number SC.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-bs', category: '03. Registration Settings', label: 'Payment Number BS (Business Studies)', path: '03. reg-settings/Text/Payment number BS.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-hu', category: '03. Registration Settings', label: 'Payment Number HU (Humanities)', path: '03. reg-settings/Text/Payment number HU.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-legacy', category: '03. Registration Settings', label: 'Legacy payment number (Payment number.txt)', path: '03. reg-settings/Text/Payment number.txt', defaultValue: 'Male Bkash: 01712-345678\nMale Nagad: 01712-345678\nFemale Bkash: 01812-345678\nFemale Nagad: 01812-345678' },
  { id: 'last-registration-date', category: '03. Registration Settings', label: 'Last registration date countdown (Last registration date countdown.txt)', path: '03. reg-settings/Text/Last registration date countdown.txt', defaultValue: '2026-11-01T23:59:59' },
  { id: 'registration-enable-disable', category: '03. Registration Settings', label: 'Registration enable / disable (Enable Disable.txt)', path: '03. reg-settings/Text/Enable Disable.txt', defaultValue: 'enable' },
  { id: 'event-countdown', category: '04. Countdown Settings', label: 'Countdown of Event (Countdown of Event.txt)', path: '04. countdown-settings/Text/Countdown of Event.txt', defaultValue: '2027-02-01T10:00:00' },
  { id: 'countdown-enable-disable', category: '04. Countdown Settings', label: 'Countdown enable / disable (Enable Disable.txt)', path: '04. countdown-settings/Text/Enable Disable.txt', defaultValue: 'enable' },
  { id: 'notice-board', category: '05. Important Notice', label: 'Notice Board (Notice Board.txt)', path: '05. important-notice/Text/Notice Board.txt', defaultValue: 'Official Batch 27 Registration is now OPEN.' },
  { id: 'popup-notice', category: '05. Important Notice', label: 'Popup Notice (Popup Notice.txt)', path: '05. important-notice/Text/Popup Notice.txt', defaultValue: 'Welcome Batch NIC 27! Registration is now OPEN.' },
  { id: 'notice-enable-disable', category: '05. Important Notice', label: 'Notice enable / disable (Enable Disable.txt)', path: '05. important-notice/Text/Enable Disable.txt', defaultValue: 'disable' },
];

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
    // Configuration persistence should not fail because an optional event API is unavailable.
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

function mirrorRegSettingsPath(normalizedPath: string, content: string): void {
  if (normalizedPath.startsWith('03. reg-settings/Text/')) {
    const altPath = normalizedPath.replace('03. reg-settings/Text/', '03. reg-settings/');
    setLocalItem(`super_admin_${altPath}`, content);
  } else if (normalizedPath.startsWith('03. reg-settings/')) {
    const altPath = normalizedPath.replace('03. reg-settings/', '03. reg-settings/Text/');
    setLocalItem(`super_admin_${altPath}`, content);
  }
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

    let changed = false;
    for (const row of rows) {
      const rawKey = row.key ?? row.setting_key ?? '';
      const rawValue = row.value ?? row.setting_value;
      if (!rawKey || typeof rawValue !== 'string') continue;

      const normalizedPath = normalizeSuperAdminPath(rawKey);
      const storageKey = `super_admin_${normalizedPath}`;
      if (getLocalItem(storageKey) !== rawValue) {
        setLocalItem(storageKey, rawValue);
        mirrorRegSettingsPath(normalizedPath, rawValue);
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
  const normalizedPath = normalizeSuperAdminPath(path);
  setLocalItem(`super_admin_${normalizedPath}`, content);
  mirrorRegSettingsPath(normalizedPath, content);
  dispatchConfigUpdated({ path: normalizedPath, content });

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase.rpc('save_super_admin_text', {
      p_path: normalizedPath,
      p_content: content,
    });
    if (error) {
      if (error.code === 'PGRST202' || /could not find the function/i.test(error.message || '')) {
        const { error: upsertError } = await supabase
          .from('site_settings')
          .upsert({ key: normalizedPath, value: content, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (upsertError) {
          console.warn('Super Admin site_settings fallback unavailable:', upsertError.message);
        }
      } else {
        console.warn('Super Admin RPC error:', error.message);
      }
    }
  } catch {
    // Graceful fallback to client storage when database is unreachable.
  }
}

export function getSuperAdminImageUrl(path: string, defaultFallback: string): string {
  try {
    const normalizedPath = normalizeSuperAdminPath(path);
    return getLocalItem(`super_admin_img_remote_${normalizedPath}`)
      || getLocalItem(`super_admin_img_${normalizedPath}`)
      || defaultFallback;
  } catch {
    return defaultFallback;
  }
}

export async function saveEditableSuperAdminImage(path: string, file: File): Promise<string> {
  const normalizedPath = normalizeSuperAdminPath(path);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  setLocalItem(`super_admin_img_${normalizedPath}`, dataUrl);
  dispatchConfigUpdated({ imagePath: normalizedPath, url: dataUrl });

  try {
    const { error } = await supabase.storage.from('uploads').upload(`super-admin/${normalizedPath}`, file, {
      upsert: true,
      contentType: file.type || 'image/png',
    });
    if (!error) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(`super-admin/${normalizedPath}`);
      if (data?.publicUrl) {
        setLocalItem(`super_admin_img_remote_${normalizedPath}`, data.publicUrl);
        return data.publicUrl;
      }
    }
  } catch {
    // Storage offline or bucket not found.
  }
  return dataUrl;
}
