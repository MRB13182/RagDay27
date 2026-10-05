import { supabase } from './supabase';

export interface EditableSuperAdminTextFile {
  id: string;
  label: string;
  path: string;
  defaultValue: string;
}

export const EDITABLE_SUPER_ADMIN_TEXT_FILES: EditableSuperAdminTextFile[] = [
  { id: 'website-name', label: 'Web name', path: '01. website-identity/Text/web name.txt', defaultValue: 'NIC 27' },
  { id: 'web-header', label: 'Web header', path: '01. website-identity/Text/web header.txt', defaultValue: 'Annual Grand Farewell & Batch 27 Celebration' },
  { id: 'web-footer', label: 'Web footer', path: '01. website-identity/Text/web footer.txt', defaultValue: '© 2027 Rag Day 27 Committee. All Rights Reserved.' },
  { id: 'event-name', label: 'Event name', path: '02. event-settings/Text/Event name.txt', defaultValue: 'RAG DAY of NIC 27' },
  { id: 'event-card', label: 'Event card', path: '02. event-settings/Text/Event card.txt', defaultValue: '' },
  { id: 'event-date', label: 'Event date', path: '02. event-settings/Text/Event date.txt', defaultValue: '' },
  { id: 'venue', label: 'Venue', path: '02. event-settings/Text/Venue.txt', defaultValue: 'Central Amphitheatre' },
  { id: 'section-settings', label: 'Section settings', path: '03. reg-settings/Text/Section settings.txt', defaultValue: '' },
  { id: 'payment-number', label: 'Payment number', path: '03. reg-settings/Text/Payment number.txt', defaultValue: '' },
  { id: 'last-registration-date', label: 'Last registration date countdown', path: '03. reg-settings/Text/Last registration date countdown.txt', defaultValue: '' },
  { id: 'registration-enable-disable', label: 'Registration enable / disable', path: '03. reg-settings/Text/Enable Disable.txt', defaultValue: 'enable' },
  { id: 'event-countdown', label: 'Countdown of Event', path: '04. countdown-settings/Text/Countdown of Event.txt', defaultValue: '' },
  { id: 'countdown-enable-disable', label: 'Countdown enable / disable', path: '04. countdown-settings/Text/Enable Disable.txt', defaultValue: 'enable' },
  { id: 'notice-board', label: 'Notice Board', path: '05. important-notice/Text/Notice Board.txt', defaultValue: '' },
  { id: 'popup-notice', label: 'Popup Notice', path: '05. important-notice/Text/Popup Notice.txt', defaultValue: '' },
  { id: 'notice-enable-disable', label: 'Notice enable / disable', path: '05. important-notice/Text/Enable Disable.txt', defaultValue: 'enable' },
];

export async function saveEditableSuperAdminText(path: string, content: string): Promise<void> {
  const { error } = await supabase.rpc('save_super_admin_text', {
    p_path: path,
    p_content: content,
  });

  if (error) throw new Error(error.message || 'Unable to save Super Admin configuration.');
}

export async function saveEditableSuperAdminImage(path: string, file: File): Promise<void> {
  const normalizedPath = path.replace(/^src\/super-admin\//, '').replace(/^\/+/, '');
  const { error } = await supabase.storage
    .from('uploads')
    .upload(`super-admin/${normalizedPath}`, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) throw new Error(error.message || 'Unable to upload Super Admin image.');
}
