/**
 * SUPER ADMIN - 3. Registration Settings
 *
 * This configuration file provides editable registration, payment, jersey,
 * and signature values for the website.
 * The Super Admin modifies values directly in this source code file.
 *
 * Editable Fields:
 * - Registration Open / Close (toggle)
 * - Registration Fee (text)
 * - Male Payment Number (text)
 * - Female Payment Number (text)
 * - Male Jersey Design (image)
 * - Female Jersey Design (image)
 * - Jersey Preview Background (image)
 * - Male Invitation Signature (text)
 * - Female Invitation Signature (text)
 */

export interface RegistrationSettingsConfig {
  /** Registration Open / Close (toggle) */
  registrationOpen: boolean;
  /** Registration Fee (text) */
  registrationFee: string;
  /** Male Payment Number (text) */
  malePaymentNumber: string;
  /** Female Payment Number (text) */
  femalePaymentNumber: string;
  /** Male Jersey Design (image - URL, asset path, or data URI) */
  maleJerseyDesign: string;
  /** Female Jersey Design (image - URL, asset path, or data URI) */
  femaleJerseyDesign: string;
  /** Jersey Preview Background (image - URL, asset path, or data URI) */
  jerseyPreviewBackground: string;
  /** Male Invitation Signature (text) */
  maleInvitationSignature: string;
  /** Female Invitation Signature (text) */
  femaleInvitationSignature: string;
}

export const registrationSettingsConfig: RegistrationSettingsConfig = {
  registrationOpen: true,
  registrationFee: '500 BDT',
  malePaymentNumber: '01712-345678',
  femalePaymentNumber: '01812-345678',
  maleJerseyDesign: '',
  femaleJerseyDesign: '',
  jerseyPreviewBackground: '',
  maleInvitationSignature: 'Executive Convener (Boys Wing)',
  femaleInvitationSignature: 'Executive Convener (Girls Wing)',
};

export default registrationSettingsConfig;
