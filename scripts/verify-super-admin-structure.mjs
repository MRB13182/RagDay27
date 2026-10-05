import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'src', 'super-admin');
const manifestPath = path.join(base, '.structure.json');

if (!fs.existsSync(manifestPath)) {
  throw new Error('Protected super-admin manifest is missing.');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const checkPaths = [
  '01. website-identity/Text/web name.txt',
  '01. website-identity/Text/web header.txt',
  '01. website-identity/Text/web footer.txt',
  '02. event-settings/Pic/jersey.png',
  '02. event-settings/Text/Event name.txt',
  '02. event-settings/Text/Event card.txt',
  '02. event-settings/Text/Event date.txt',
  '02. event-settings/Text/Venue.txt',
  '03. reg-settings/Pic/back jersey preview.png',
  '03. reg-settings/Text/Section settings.txt',
  '03. reg-settings/Text/Payment number.txt',
  '03. reg-settings/Text/Last registration date countdown.txt',
  '03. reg-settings/Text/Enable Disable.txt',
  '04. countdown-settings/Text/Countdown of Event.txt',
  '04. countdown-settings/Text/Enable Disable.txt',
  '05. important-notice/Text/Notice Board.txt',
  '05. important-notice/Text/Popup Notice.txt',
  '05. important-notice/Text/Enable Disable.txt'
];

const missingDirs = (manifest.requiredDirectories || []).filter((p) => {
  const target = path.join(base, p);
  return !fs.existsSync(target) || !fs.statSync(target).isDirectory();
});

const missingFiles = [...new Set([...(manifest.requiredFiles || []), ...checkPaths])].filter((p) => {
  const target = path.join(base, p);
  return !fs.existsSync(target) || !fs.statSync(target).isFile();
});

if (missingDirs.length || missingFiles.length) {
  console.error('Protected src/super-admin structure is incomplete.');
  if (missingDirs.length) console.error('Missing directories:', missingDirs.join(', '));
  if (missingFiles.length) console.error('Missing files:', missingFiles.join(', '));
  process.exit(1);
}

console.log('Protected src/super-admin structure: OK');
