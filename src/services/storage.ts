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
 * Returns storage path to be saved as `student_photo_path` in registration
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
  const prefix = studentRollOrId ? `student_${studentRollOrId}` : undefined;
  const res = await uploadFileToStorage(file, 'students', prefix);
  return {
    success: res.success,
    storagePath: res.storagePath,
    publicUrl: res.publicUrl,
    errorMessage: res.errorMessage,
  };
}
