/**
 * SUPER ADMIN - 5. Important Notice
 *
 * This configuration file provides editable notice banner and popup modal values for the website.
 * The Super Admin modifies values directly in this source code file.
 *
 * Editable Fields:
 * - Notice Enable / Disable (toggle)
 * - Popup Enable / Disable (toggle)
 * - Popup Title (text)
 * - Popup Message (text)
 * - Notice Content (text)
 * - Close Button Text (text)
 */

export interface ImportantNoticeConfig {
  /** Notice Enable / Disable (toggle) */
  noticeEnabled: boolean;
  /** Popup Enable / Disable (toggle) */
  popupEnabled: boolean;
  /** Popup Title (text) */
  popupTitle: string;
  /** Popup Message (text) */
  popupMessage: string;
  /** Notice Content (text) */
  noticeContent: string;
  /** Close Button Text (text) */
  closeButtonText: string;
}

export const importantNoticeConfig: ImportantNoticeConfig = {
  noticeEnabled: true,
  popupEnabled: false,
  popupTitle: 'IMPORTANT NOTICE FOR RAG DAY 27',
  popupMessage:
    'Welcome Batch 27! Registration is open. Please keep your Registration Number safe after submitting your registration, as you will need it to download your official invitation card once verified.',
  noticeContent:
    'Official Batch 27 Registration is now OPEN · Custom squad kit prints are limited · Retain your transaction ID',
  closeButtonText: 'I Understand',
};

export default importantNoticeConfig;
