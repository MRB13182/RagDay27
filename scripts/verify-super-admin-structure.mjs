import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'src', 'super-admin');

const checkDirectories = [
  '01. website-identity/Pic',
  '01. website-identity/Text',
  '02. event-settings/Pic',
  '02. event-settings/Text',
  '03. reg-settings/Pic',
  '03. reg-settings/Text',
  '04. important-notice/Text',
  '06. logo-related/Pic',
  '06. logo-related/Text',
  'components',
  'gallery',
  'sections',
];

const checkPaths = [
  '01. website-identity/Pic/logo.png',
  '01. website-identity/Pic/favicon.png',
  '01. website-identity/Text/web name.txt',
  '01. website-identity/Text/web header.txt',
  '01. website-identity/Text/web footer.txt',
  '02. event-settings/Pic/jersey-design.png',
  '02. event-settings/Text/Event name.txt',
  '02. event-settings/Text/Event card.txt',
  '02. event-settings/Text/Event date.txt',
  '02. event-settings/Text/Countedown enable disable.txt',
  '02. event-settings/Text/Fees.txt',
  '02. event-settings/Text/Venue.txt',
  '02. event-settings/Text/Jersey design.txt',
  '03. reg-settings/Pic/back jersey preview.png',
  '03. reg-settings/Text/Section settings.txt',
    '03. reg-settings/Text/Payment number SC.txt',
  '03. reg-settings/Text/Payment number BS.txt',
  '03. reg-settings/Text/Payment number HU.txt',
  '03. reg-settings/Text/Last Registration date.txt',
  '03. reg-settings/Text/Countdown enable disable.txt',
  '04. important-notice/Text/Notice Board.txt',
  '04. important-notice/Text/Popup Notice.txt',
  '04. important-notice/Text/Enable Disable.txt',
  '06. logo-related/Pic/logo.png',
  '06. logo-related/Pic/favicon.png',
  '06. logo-related/Text/logo-settings.txt',
  'components/SuperAdminUI.tsx',
  'gallery/GalleryManagement.tsx',
  'gallery/types.ts',
  'sections/WebsiteIdentitySection.tsx',
  'sections/EventSettingsSection.tsx',
  'sections/RegistrationSettingsSection.tsx',
  'sections/ImportantNoticeSection.tsx',
  'sections/LogoRelatedSection.tsx',
  'sections/GallerySection.tsx',
  'SuperAdminDashboard.tsx',
  'types.ts',
  'README.md',
  '.structure.json',
];

const forbiddenLegacyPaths = [
  '04. countdown-settings',
  '03. reg-settings/Enable Disable.txt',
  '03. reg-settings/Last Registration date.txt',
  '03. reg-settings/Payment number.txt',
  '03. reg-settings/Section settings.txt',
];

const missingDirs = checkDirectories.filter((p) => {
  const target = path.join(base, p);
  return !fs.existsSync(target) || !fs.statSync(target).isDirectory();
});

const missingFiles = checkPaths.filter((p) => {
  const target = path.join(base, p);
  return !fs.existsSync(target) || !fs.statSync(target).isFile();
});

const lingeringDuplicates = forbiddenLegacyPaths.filter((p) =>
  fs.existsSync(path.join(base, p))
);

if (missingDirs.length || missingFiles.length || lingeringDuplicates.length) {
  console.error('Protected src/super-admin structure validation failed.');
  if (missingDirs.length) console.error('Missing directories:', missingDirs.join(', '));
  if (missingFiles.length) console.error('Missing files:', missingFiles.join(', '));
  if (lingeringDuplicates.length) {
    console.error('Unexpected legacy/duplicate paths found:', lingeringDuplicates.join(', '));
  }
  process.exit(1);
}

console.log('Protected src/super-admin structure: OK');
