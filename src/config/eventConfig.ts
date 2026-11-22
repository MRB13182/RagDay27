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
  getJerseyShowcaseCards,
  getWebsiteIdentityConfig,
  getEventSettingsConfig,
  getRegistrationSettingsConfig,
  getCountdownSettingsConfig,
  getImportantNoticeConfig,
  getConfiguredSections,
  getConfiguredCategories,
  getMaleSectionSettings,
  parseMaleSectionSettings,
  getHeaderNoticesConfig,
  parseHeaderNoticeConfig,
  getPopupNoticesConfig,
  parsePopupNoticeConfig,
  calculateRegistrationOpenState,
  setManualRegistrationOverride,
  type HeaderNoticeItem,
  type HeaderNoticeConfig,
  type PopupNoticeItem,
  type PopupNoticeConfig,
  type SectionCategory,
  type MaleSectionSettings,
} from '../lib/superAdminConfig';

export {
  DEPARTMENT_SOCIAL_CONTACTS,
  resolveConfiguredSocialUrl,
  type DepartmentKey,
  type DepartmentSocialLinks,
} from './socialContactsConfig';
