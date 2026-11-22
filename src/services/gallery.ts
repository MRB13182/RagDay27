import {
  supabase,
  isSupabaseConfigured,
  STORAGE_BUCKET,
  getStoredSuperAdminPasscode,
} from '../lib/supabase';
import { safeRandomId } from '../lib/browserUtils';
import type { GalleryMedia, GalleryMediaType } from '../super-admin/gallery/types';

export type { GalleryMedia, GalleryMediaType };

const EVENT = 'rd27-gallery-change';
export const MAX_GALLERY_FILE_BYTES = 150 * 1024 * 1024;

function emitGalleryChange(): void {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.dispatchEvent === 'function' &&
      typeof CustomEvent !== 'undefined'
    ) {
      window.dispatchEvent(new CustomEvent(EVENT));
    }
  } catch {
    // Ignore event dispatch failures in restricted frames
  }
}

function inferMediaType(row: any): GalleryMediaType {
  if (row?.media_type === 'video' || row?.type === 'video') return 'video';
  if (typeof row?.mime_type === 'string' && row.mime_type.startsWith('video/')) return 'video';
  if (typeof row?.image_url === 'string' && /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(row.image_url)) {
    return 'video';
  }
  return 'image';
}

function mapGalleryRow(row: any, index = 0): GalleryMedia {
  return {
    id: String(row.id),
    type: inferMediaType(row),
    title: String(row.title || 'Untitled media'),
    caption: String(row.caption || ''),
    image_url: String(row.image_url || ''),
    storage_path: String(row.storage_path || ''),
    mime_type: String(row.mime_type || ''),
    file_size: Number(row.file_size || 0),
    enabled: row.is_published !== false,
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index + 1,
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function formatGalleryError(error: any, fallback: string): string {
  const code = String(error?.code || '');
  const message = String(error?.message || fallback);
  if (code === 'PGRST202' || /could not find the function/i.test(message)) {
    return 'Gallery database functions are not installed yet. Please apply the latest Supabase SQL migration.';
  }
  if (code === '42501' || /unauthorized/i.test(message)) {
    return 'Super Admin session is unauthorized or expired. Please sign in again.';
  }
  return message || fallback;
}

function requireSuperAdminSession(): string {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase backend is not configured.');
  }
  const passcode = getStoredSuperAdminPasscode();
  if (!passcode) {
    throw new Error('Super Admin session is locked or expired. Please sign in again.');
  }
  return passcode;
}

function getSafeExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 8) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'video/mp4') return 'mp4';
  if (file.type === 'video/webm') return 'webm';
  return file.type.startsWith('video/') ? 'mp4' : 'jpg';
}

export async function getPublishedGalleryMedia(): Promise<GalleryMedia[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message || 'Unable to load gallery media.');
  }

  return Array.isArray(data) ? data.map((row, idx) => mapGalleryRow(row, idx)) : [];
}

export async function listSuperAdminGalleryMedia(): Promise<GalleryMedia[]> {
  const passcode = requireSuperAdminSession();

  const { data, error } = await supabase.rpc('super_admin_list_gallery', {
    p_passcode: passcode,
  });

  if (error) {
    throw new Error(formatGalleryError(error, 'Unable to load gallery items from database.'));
  }

  return Array.isArray(data) ? data.map((row, idx) => mapGalleryRow(row, idx)) : [];
}

export async function uploadGalleryMediaItem(
  file: File,
  title?: string,
  caption?: string,
  sortOrder?: number
): Promise<GalleryMedia> {
  const passcode = requireSuperAdminSession();

  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    throw new Error('Only image and video files are supported.');
  }
  if (file.size > MAX_GALLERY_FILE_BYTES) {
    throw new Error('Each media file must be 150 MB or smaller.');
  }

  const ext = getSafeExtension(file);
  const storagePath = `gallery/${Date.now()}-${safeRandomId('media')}.${ext}`;
  const mediaType: GalleryMediaType = file.type.startsWith('video/') ? 'video' : 'image';
  const cleanTitle = (title || '').trim() || file.name.replace(/\.[^.]+$/, '') || 'Rag Day Memory';
  const cleanCaption = (caption || '').trim();

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
    upsert: false,
    contentType: file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
  });

  if (uploadError) {
    throw new Error(uploadError.message || 'Unable to upload file to Supabase Storage.');
  }

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw new Error('Upload completed, but public URL could not be generated.');
  }

  const { data, error: rpcError } = await supabase.rpc('super_admin_save_gallery_item', {
    p_passcode: passcode,
    p_id: null,
    p_title: cleanTitle,
    p_caption: cleanCaption,
    p_image_url: publicUrl,
    p_storage_path: storagePath,
    p_media_type: mediaType,
    p_mime_type: file.type || '',
    p_file_size: file.size || 0,
    p_is_published: true,
    p_sort_order: typeof sortOrder === 'number' ? sortOrder : null,
  });

  if (rpcError || !data) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw new Error(formatGalleryError(rpcError, 'Unable to save gallery metadata to database.'));
  }

  emitGalleryChange();
  return mapGalleryRow(data);
}

export async function updateGalleryMediaItem(
  item: GalleryMedia,
  updates: {
    title?: string;
    caption?: string;
    enabled?: boolean;
    replacementFile?: File | null;
  }
): Promise<GalleryMedia> {
  const passcode = requireSuperAdminSession();

  let imageUrl = item.image_url;
  let storagePath = item.storage_path;
  let mediaType: GalleryMediaType = item.type;
  let mimeType = item.mime_type;
  let fileSize = item.file_size;
  let uploadedReplacementPath: string | null = null;

  const replacement = updates.replacementFile;
  if (replacement) {
    if (!replacement.type.startsWith('image/') && !replacement.type.startsWith('video/')) {
      throw new Error('Replacement file must be an image or video.');
    }
    if (replacement.size > MAX_GALLERY_FILE_BYTES) {
      throw new Error('Replacement file must be 150 MB or smaller.');
    }

    const ext = getSafeExtension(replacement);
    const nextPath = `gallery/${Date.now()}-${safeRandomId('media')}.${ext}`;
    const nextType: GalleryMediaType = replacement.type.startsWith('video/') ? 'video' : 'image';

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(nextPath, replacement, {
        upsert: false,
        contentType: replacement.type || (nextType === 'video' ? 'video/mp4' : 'image/jpeg'),
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Unable to upload replacement media.');
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(nextPath);
    if (!urlData?.publicUrl) {
      await supabase.storage.from(STORAGE_BUCKET).remove([nextPath]).catch(() => undefined);
      throw new Error('Replacement uploaded, but public URL could not be generated.');
    }

    uploadedReplacementPath = nextPath;
    imageUrl = urlData.publicUrl;
    storagePath = nextPath;
    mediaType = nextType;
    mimeType = replacement.type || '';
    fileSize = replacement.size || 0;
  }

  const nextTitle = (updates.title ?? item.title).trim() || item.title;
  const nextCaption = (updates.caption ?? item.caption).trim();
  const nextPublished = typeof updates.enabled === 'boolean' ? updates.enabled : item.enabled;

  const { data, error } = await supabase.rpc('super_admin_save_gallery_item', {
    p_passcode: passcode,
    p_id: item.id,
    p_title: nextTitle,
    p_caption: nextCaption,
    p_image_url: imageUrl,
    p_storage_path: storagePath,
    p_media_type: mediaType,
    p_mime_type: mimeType,
    p_file_size: fileSize,
    p_is_published: nextPublished,
    p_sort_order: item.sort_order,
  });

  if (error || !data) {
    if (uploadedReplacementPath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([uploadedReplacementPath]).catch(() => undefined);
    }
    throw new Error(formatGalleryError(error, 'Unable to update gallery item.'));
  }

  if (uploadedReplacementPath && item.storage_path && item.storage_path !== uploadedReplacementPath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([item.storage_path]).catch(() => undefined);
  }

  emitGalleryChange();
  return mapGalleryRow(data);
}

export async function reorderGalleryMediaItems(orderedIds: string[]): Promise<void> {
  const passcode = requireSuperAdminSession();

  const { error } = await supabase.rpc('super_admin_reorder_gallery', {
    p_passcode: passcode,
    p_ids: orderedIds,
  });

  if (error) {
    throw new Error(formatGalleryError(error, 'Unable to reorder gallery items.'));
  }

  emitGalleryChange();
}

export async function deleteGalleryMediaItem(id: string): Promise<void> {
  const passcode = requireSuperAdminSession();

  const { data: deletedStoragePath, error } = await supabase.rpc('super_admin_delete_gallery_item', {
    p_passcode: passcode,
    p_id: id,
  });

  if (error) {
    throw new Error(formatGalleryError(error, 'Unable to delete gallery item.'));
  }

  if (typeof deletedStoragePath === 'string' && deletedStoragePath.trim()) {
    await supabase.storage.from(STORAGE_BUCKET).remove([deletedStoragePath.trim()]).catch(() => undefined);
  }

  emitGalleryChange();
}

export function subscribeToGalleryChanges(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  window.addEventListener(EVENT, callback);
  return () => {
    try {
      window.removeEventListener(EVENT, callback);
    } catch {
      // Ignore listener removal errors
    }
  };
}
