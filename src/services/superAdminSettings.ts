import { supabase } from '../lib/supabase';

export interface SuperAdminTextFile {
  id: string;
  label: string;
  path: string;
  initialValue: string;
  accept?: string;
}

export const SUPER_ADMIN_TEXT_FILES: SuperAdminTextFile[] = [
  { id: 'website-name', label: 'Web name', path: 'src/super-admin/01. website-identity/Text/web name.txt', initialValue: 'NIC 27' },
  { id: 'web-header', label: 'Web header', path: 'src/super-admin/01. website-identity/Text/web header.txt', initialValue: 'Annual Grand Farewell & Batch 27 Celebration' },
  { id: 'web-footer', label: 'Web footer', path: 'src/super-admin/01. website-identity/Text/web footer.txt', initialValue: '© 2027 Rag Day 27 Committee. All Rights Reserved.' },
  { id: 'event-name', label: 'Event name', path: 'src/super-admin/02. event-settings/Text/Event name.txt', initialValue: 'RAG DAY of NIC 27' },
  { id: 'event-card', label: 'Event card', path: 'src/super-admin/02. event-settings/Text/Event card.txt', initialValue: 'Title: Registration Start\nDescription: Registration starts from October 10. Complete your enrollment before time.' },
  { id: 'event-date', label: 'Event date', path: 'src/super-admin/02. event-settings/Text/Event date.txt', initialValue: '2026-11-20T10:00:00' },
  { id: 'venue', label: 'Venue', path: 'src/super-admin/02. event-settings/Text/Venue.txt', initialValue: 'Central Amphitheatre' },
  { id: 'section-settings', label: 'Section settings', path: 'src/super-admin/03. reg-settings/Text/Section settings.txt', initialValue: 'Section settings are managed by gender/group in the existing sections.json configuration.' },
  { id: 'payment-number', label: 'Payment number', path: 'src/super-admin/03. reg-settings/Text/Payment number.txt', initialValue: 'Male Bkash: 01712-345678\nMale Nagad: 01712-345678\nFemale Bkash: 01812-345678\nFemale Nagad: 01812-345678' },
  { id: 'last-registration-date', label: 'Last registration date countdown', path: 'src/super-admin/03. reg-settings/Text/Last registration date countdown.txt', initialValue: '2026-11-01T23:59:59' },
  { id: 'registration-enable-disable', label: 'Registration enable / disable', path: 'src/super-admin/03. reg-settings/Text/Enable Disable.txt', initialValue: 'enable' },
  { id: 'event-countdown', label: 'Countdown of Event', path: 'src/super-admin/04. countdown-settings/Text/Countdown of Event.txt', initialValue: '2026-11-20T10:00:00' },
  { id: 'countdown-enable-disable', label: 'Countdown enable / disable', path: 'src/super-admin/04. countdown-settings/Text/Enable Disable.txt', initialValue: 'enable' },
  { id: 'notice-board', label: 'Notice Board', path: 'src/super-admin/05. important-notice/Text/Notice Board.txt', initialValue: 'Official Batch 27 Registration is now OPEN.' },
  { id: 'popup-notice', label: 'Popup Notice', path: 'src/super-admin/05. important-notice/Text/Popup Notice.txt', initialValue: 'IMPORTANT NOTICE FOR RAG DAY 27\n\nWelcome Batch 27! Registration is open.' },
  { id: 'notice-enable-disable', label: 'Notice enable / disable', path: 'src/super-admin/05. important-notice/Text/Enable Disable.txt', initialValue: 'enable' },
];

export async function saveSuperAdminText(path: string, content: string): Promise<void> {
  if (!canEditSuperAdmin()) throw new Error('Only the protected Super Admin context may edit this configuration.');
  const { error } = await supabase.rpc('save_super_admin_text', {
    p_path: path,
    p_content: content,
  });
  if (error) throw new Error(error.message || 'Unable to save Super Admin text.');
}

export async function saveSuperAdminImage(path: string, file: File): Promise<void> {
  if (!canEditSuperAdmin()) throw new Error('Only the protected Super Admin context may edit this configuration.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._ -]/g, '_');
  const objectPath = 'super-admin/' + path.replace(/^src\/super-admin\//, '').replaceAll('\\', '/') + '/' + safeName;
  const { error } = await supabase.storage.from('uploads').upload(objectPath, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message || 'Unable to upload Super Admin image.');
}
