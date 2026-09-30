/**
 * SUPER ADMIN - 4. Countdown Settings
 *
 * This configuration file provides editable countdown date and toggle values for the website.
 * The Super Admin modifies values directly in this source code file.
 *
 * Editable Fields:
 * - Event Date (datetime)
 * - Registration Deadline (datetime)
 * - Countdown Enable / Disable (toggle)
 */

export interface CountdownSettingsConfig {
  /** Event Date (datetime string, e.g. '2027-11-27T10:00:00') */
  eventDate: string;
  /** Registration Deadline (datetime string, e.g. '2027-10-31T23:59:59') */
  registrationDeadline: string;
  /** Countdown Enable / Disable (toggle) */
  countdownEnabled: boolean;
}

export const countdownSettingsConfig: CountdownSettingsConfig = {
  eventDate: '2027-11-27T10:00:00',
  registrationDeadline: '2027-10-31T23:59:59',
  countdownEnabled: true,
};

export default countdownSettingsConfig;
