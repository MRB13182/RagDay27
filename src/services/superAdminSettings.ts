import {
  EDITABLE_SUPER_ADMIN_TEXT_FILES,
  saveEditableSuperAdminText,
  saveEditableSuperAdminImage,
  getSavedSuperAdminText,
  getSuperAdminImageUrl,
  type EditableSuperAdminTextFile,
} from '../lib/superAdminTextSettings';

export type SuperAdminTextFile = EditableSuperAdminTextFile;
export const SUPER_ADMIN_TEXT_FILES = EDITABLE_SUPER_ADMIN_TEXT_FILES;

export async function saveSuperAdminText(path: string, content: string): Promise<void> {
  return saveEditableSuperAdminText(path, content);
}

export async function saveSuperAdminImage(path: string, file: File): Promise<void> {
  await saveEditableSuperAdminImage(path, file);
}

export { getSavedSuperAdminText, getSuperAdminImageUrl };

