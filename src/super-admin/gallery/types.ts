export type GalleryMediaType = 'image' | 'video';
export interface GalleryMedia {
  id: string;
  type: GalleryMediaType;
  title: string;
  caption: string;
  filename: string;
  mime_type: string;
  blob: Blob;
  enabled: boolean;
  sort_order: number;
  created_at: string;
}