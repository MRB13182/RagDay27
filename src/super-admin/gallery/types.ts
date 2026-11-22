export type GalleryMediaType = 'image' | 'video';

export interface GalleryMedia {
  id: string;
  type: GalleryMediaType;
  title: string;
  caption: string;
  image_url: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}