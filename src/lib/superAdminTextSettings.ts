import { supabase } from './supabase';
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
  { id: 'jersey-design-image', category: '02. Event Settings', label: 'Jersey showcase image (jersey-design.png)', path: '02. event-settings/Pic/jersey-design.png', defaultValue: '' },
  { id: 'event-name', category: '02. Event Settings', label: 'Event name (Event name.txt)', path: '02. event-settings/Text/Event name.txt', defaultValue: 'RAG DAY of NIC 27' },
  { id: 'event-card', category: '02. Event Settings', label: 'Event card (Event card.txt)', path: '02. event-settings/Text/Event card.txt', defaultValue: 'Title: Registration Start\nDescription: Registration starts from October 10. Complete your enrollment before time.\n\nTitle: Registration FEE\nDescription: 500 BDT for your all-inclusive batch pass.' },
  { id: 'event-date', category: '02. Event Settings', label: 'Event date (Event date.txt)', path: '02. event-settings/Text/Event date.txt', defaultValue: '2026-11-20T10:00:00' },
  { id: 'jersey-design', category: '02. Event Settings', label: 'Jersey showcase design (Jersey design.txt)', path: '02. event-settings/Text/Jersey design.txt', defaultValue: 'Title: Official Rag Day Jersey\\nDescription: Custom Squad Kit with Personalized Back Name & Number Print Included\\nImage: jersey-design.png' },
  { id: 'venue', category: '02. Event Settings', label: 'Venue (Venue.txt)', path: '02. event-settings/Text/Venue.txt', defaultValue: 'Central Amphitheatre' },
  { id: 'section-settings', category: '03. Registration Settings', label: 'Section settings (Section settings.txt)', path: '03. reg-settings/Text/Section settings.txt', defaultValue: 'Male Sections:\nScience: SCB (ScB1, ScB2, ScB3, ScB4, ScB5)\nBusiness Studies: BSB (BsB1, BsB2, BsB3, BsB4, BsB5)\nHumanities: HUB (HuB1, HuB2, HuB3, HuB4, HuB5)\n\nFemale Sections:\nScience: SCG (ScG1, ScG2, ScG3, ScG4, ScG5)\nBusiness Studies: BSG (BsG1, BsG2, BsG3, BsG4, BsG5)\nHumanities: HUG (HuG1, HuG2, HuG3, HuG4, HuG5)' },
  { id: 'payment-number-sc', category: '03. Registration Settings', label: 'Payment Number SC (Science)', path: '03. reg-settings/Text/Payment number SC.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-bs', category: '03. Registration Settings', label: 'Payment Number BS (Business Studies)', path: '03. reg-settings/Text/Payment number BS.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-hu', category: '03. Registration Settings', label: 'Payment Number HU (Humanities)', path: '03. reg-settings/Text/Payment number HU.txt', defaultValue: 'Bkash: 01712-345678\nNagad: 01712-345678' },
  { id: 'payment-number-legacy', category: '03. Registration Settings', label: 'Legacy payment number (Payment number.txt)', path: '03. reg-settings/Text/Payment number.txt', defaultValue: 'Male Bkash: 01712-345678\nMale Nagad: 01712-345678\nFemale Bkash: 01812-345678\nFemale Nagad: 01812-345678' },
  { id: 'last-registration-date', category: '03. Registration Settings', label: 'Last registration date countdown (Last registration date countdown.txt)', path: '03. reg-settings/Text/Last registration date countdown.txt', defaultValue: '2026-11-01T23:59:59' },
  { id: 'registration-enable-disable', category: '03. Registration Settings', label: 'Registration enable / disable (Enable Disable.txt)', path: '03. reg-settings/Text/Enable Disable.txt', defaultValue: 'enable' },
  { id: 'event-countdown', category: '04. Countdown Settings', label: 'Countdown of Event (Countdown of Event.txt)', path: '04. countdown-settings/Text/Countdown of Event.txt', defaultValue: '2026-11-20T10:00:00' },
  { id: 'countdown-enable-disable', category: '04. Countdown Settings', label: 'Countdown enable / disable (Enable Disable.txt)', path: '04. countdown-settings/Text/Enable Disable.txt', defaultValue: 'enable' },
  { id: 'notice-board', category: '05. Important Notice', label: 'Notice Board (Notice Board.txt)', path: '05. important-notice/Text/Notice Board.txt', defaultValue: 'Official Batch 27 Registration is now OPEN.' },
  { id: 'popup-notice', category: '05. Important Notice', label: 'Popup Notice (Popup Notice.txt)', path: '05. important-notice/Text/Popup Notice.txt', defaultValue: 'IMPORTANT NOTICE FOR RAG DAY 27\n\nWelcome Batch 27! Registration is open.' },
  { id: 'notice-enable-disable', category: '05. Important Notice', label: 'Notice enable / disable (Enable Disable.txt)', path: '05. important-notice/Text/Enable Disable.txt', defaultValue: 'enable' },
];

function getLocalItem(key: string): string | null {
  return safeStorage.getItem(key);
}

function setLocalItem(key: string, value: string): void {
  safeStorage.setItem(key, value);
}

export function getSavedSuperAdminText(path: string, fallback: string): string {
  const stored = getLocalItem(`super_admin_${path}`);
  if (fallback !== undefined && fallback !== null && fallback.trim() !== '') return fallback;
  if (stored !== null && stored.trim() !== '') return stored;
  return fallback || '';
}

export async function saveEditableSuperAdminText(path: string, content: string): Promise<void> {
  const normalizedPath = path.replace(/^src\/super-admin\//, '').replace(/^\/+/, '');
  setLocalItem(`super_admin_${normalizedPath}`, content);
  if (normalizedPath.startsWith('03. reg-settings/Text/')) {
    const altPath = normalizedPath.replace('03. reg-settings/Text/', '03. reg-settings/');
    setLocalItem(`super_admin_${altPath}`, content);
  } else if (normalizedPath.startsWith('03. reg-settings/')) {
    const altPath = normalizedPath.replace('03. reg-settings/', '03. reg-settings/Text/');
    setLocalItem(`super_admin_${altPath}`, content);
  }
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('superadmin-config-updated', { detail: { path: normalizedPath, content } }));
    }
  } catch {
    // Configuration persistence should not fail because an optional event API is unavailable.
  }

  try {
    const { error } = await supabase.rpc('save_super_admin_text', {
      p_path: normalizedPath,
      p_content: content,
    });
    if (error && error.code !== 'PGRST202') console.warn('Super Admin RPC error:', error.message);
  } catch {
    // Graceful fallback to client storage.
  }
}

export function getSuperAdminImageUrl(path: string, defaultFallback: string): string {
  const normalizedPath = path.replace(/^src\/super-admin\//, '').replace(/^\/+/, '');
  return getLocalItem(`super_admin_img_remote_${normalizedPath}`)
    || getLocalItem(`super_admin_img_${normalizedPath}`)
    || defaultFallback;
}

export async function saveEditableSuperAdminImage(path: string, file: File): Promise<string> {
  const normalizedPath = path.replace(/^src\/super-admin\//, '').replace(/^\/+/, '');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  setLocalItem(`super_admin_img_${normalizedPath}`, dataUrl);
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('superadmin-config-updated', { detail: { imagePath: normalizedPath, url: dataUrl } }));
    }
  } catch {
    // Local previews are optional.
  }

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
