import { supabase, STORAGE_BUCKET } from '../lib/supabase';
import { translateBackendError } from './registrations';

/**
 * Generic file upload to Supabase Storage bucket `uploads`
 * Returns the public URL and file path
 */
export async function uploadFileToStorage(
  file: File | Blob,
  folder: string = 'media',
  customFileName?: string
): Promise<{
  success: boolean;
  publicUrl: string;
  storagePath: string;
  error?: any;
  errorMessage?: string;
}> {
  try {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
    const cleanFileName = customFileName
      ? `${customFileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${cleanExt}`
      : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;

    const storagePath = `${folder}/${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload error from Supabase:', error.message);
      return {
        success: false,
        publicUrl: '',
        storagePath: '',
        error,
        errorMessage: translateBackendError(error),
      };
    }

    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data?.path || storagePath);

    return {
      success: true,
      publicUrl: publicData.publicUrl,
      storagePath: data?.path || storagePath,
    };
  } catch (err: any) {
    return {
      success: false,
      publicUrl: '',
      storagePath: '',
      error: err,
      errorMessage: translateBackendError(err),
    };
  }
}

/**
 * Uploads a student photo to `uploads/students/`
 * Returns a storage path saved in the canonical `student_photo` column.
 */
export async function uploadStudentPhoto(
  file: File | Blob,
  studentRollOrId?: string
): Promise<{
  success: boolean;
  storagePath: string;
  publicUrl: string;
  errorMessage?: string;
}> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const cleanId = (studentRollOrId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const prefix = cleanId
    ? `student_${cleanId}_${timestamp}_${randomSuffix}`
    : `student_${timestamp}_${randomSuffix}`;
  const res = await uploadFileToStorage(file, 'students', prefix);
  return {
    success: res.success,
    storagePath: res.storagePath,
    publicUrl: res.publicUrl,
    errorMessage: res.errorMessage,
  };
}

/**
 * Resolves a stored student photo (storage path, relative path, full URL, or data URI)
 * to a full public URL ready to be displayed in <img> tags.
 */
export function resolveStudentPhotoUrl(photo: string | null | undefined): string | null {
  if (!photo || typeof photo !== 'string') return null;
  const trimmed = photo.trim();
  if (!trimmed) return null;

  // Already a full URL or data URI
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Remove leading slashes
  let cleanPath = trimmed.replace(/^\/+/, '');

  // Strip bucket name prefix if present
  if (cleanPath.startsWith(`${STORAGE_BUCKET}/`)) {
    cleanPath = cleanPath.substring(STORAGE_BUCKET.length + 1);
  }

  // Default to students/ folder if it's a bare filename starting with student_
  if (!cleanPath.includes('/') && cleanPath.startsWith('student_')) {
    cleanPath = `students/${cleanPath}`;
  }

  try {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(cleanPath);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}
