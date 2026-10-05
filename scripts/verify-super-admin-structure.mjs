import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const base = path.join(root, 'src', 'super-admin');
const manifestPath = path.join(base, '.structure.json');

if (!fs.existsSync(manifestPath)) {
  throw new Error('Protected super-admin manifest is missing.');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const missingDirs = (manifest.requiredDirectories || []).filter((p) => {
  const target = path.join(base, p);
  return !fs.existsSync(target) || !fs.statSync(target).isDirectory();
});

const missingFiles = (manifest.requiredFiles || []).filter((p) => {
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
