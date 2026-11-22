import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'src', 'super-admin');

const files = [
  ['01. website-identity/Text/web name.txt', '01. website-identity/text/website-name.txt'],
  ['01. website-identity/Text/web header.txt', '01. website-identity/text/website-subtitle.txt'],
  ['01. website-identity/Text/web footer.txt', '01. website-identity/text/footer-text.txt'],
  ['02. event-settings/Text/Event name.txt', '02. event-settings/text/event-name.txt'],
  ['02. event-settings/Text/Event card.txt', '02. event-settings/text/event-cards-content.txt'],
  ['02. event-settings/Text/Event date.txt', null],
  ['02. event-settings/Text/Event countdown.txt', null],
  ['02. event-settings/Text/Countdown enable disable.txt', null],
  ['02. event-settings/Text/Jersey design.txt', null],
  ['02. event-settings/Text/Venue.txt', null],
  ['03. reg-settings/Text/Section settings.txt', null],
  ['03. reg-settings/Text/Payment number.txt', '03. registration-settings/text/payment-way/male.txt'],
  ['03. reg-settings/Text/Payment number SC.txt', null],
  ['03. reg-settings/Text/Payment number BS.txt', null],
  ['03. reg-settings/Text/Payment number HU.txt', null],
  ['03. reg-settings/Text/Last registration date countdown.txt', null],
  ['03. reg-settings/Text/Enable Disable.txt', '03. registration-settings/text/registration-open-close.txt'],
  ['05. important-notice/Text/Notice Board.txt', '05. important-notice/text/notice-content.txt'],
  ['05. important-notice/Text/Popup Notice.txt', '05. important-notice/text/popup-message.txt'],
  ['05. important-notice/Text/Enable Disable.txt', '05. important-notice/text/notice-enable-disable.txt'],
];

for (const [target, source] of files) {
  const targetPath = path.join(base, target);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (fs.existsSync(targetPath)) continue;
  if (source) {
    const sourcePath = path.join(base, source);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      continue;
    }
  }
  fs.writeFileSync(targetPath, '', 'utf8');
}
