/**
 * EVENT CONFIGURATION (SOURCE OF TRUTH: src/super-admin/)
 * Re-exports dynamic configurations directly loaded from src/super-admin/ Text & Pic folders.
 */
export {
  websiteIdentityConfig,
  eventSettingsConfig,
  registrationSettingsConfig,
  countdownSettingsConfig,
  importantNoticeConfig,
  logoRelatedConfig,
  getWebsiteIdentityConfig,
  getEventSettingsConfig,
  getRegistrationSettingsConfig,
  getCountdownSettingsConfig,
  getImportantNoticeConfig,
  getConfiguredSections,
  calculateRegistrationOpenState,
  setManualRegistrationOverride,
} from '../lib/superAdminConfig';

