import { supabase } from '../lib/supabase';
import { uploadFileToStorage } from './storage';
import type { GalleryItem } from '../components/GallerySection';

export async function getPublicGalleryItems(): Promise<GalleryItem[]> {
  const {data,error}=await supabase.from('gallery_items').select('id,title,caption,image_url,created_at').eq('is_published',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
  if(error){console.warn('Gallery could not be loaded:',error.message);return [];}
  return (data||[]) as GalleryItem[];
}
export async function getAdminGalleryItems(): Promise<GalleryItem[]> {
  const {data,error}=await supabase.rpc('admin_list_gallery');
  if(error)throw new Error(error.message);
  return (data||[]) as GalleryItem[];
}
export async function saveGalleryItem(file:File,title:string,caption:string,existingId?:string):Promise<void>{
  const upload=await uploadFileToStorage(file,'gallery');
  if(!upload.success)throw new Error(upload.errorMessage||'Image upload failed.');
  const {error}=await supabase.rpc('admin_save_gallery_item',{p_id:existingId||null,p_title:title.trim(),p_caption:caption.trim()||null,p_image_url:upload.publicUrl,p_storage_path:upload.storagePath});
  if(error)throw new Error(error.message);
}
export async function updateGalleryDetails(id:string,title:string,caption:string):Promise<void>{
 const {error}=await supabase.rpc('admin_update_gallery_item',{p_id:id,p_title:title.trim(),p_caption:caption.trim()||null});if(error)throw new Error(error.message);
}
export async function deleteGalleryItem(id:string):Promise<void>{const {error}=await supabase.rpc('admin_delete_gallery_item',{p_id:id});if(error)throw new Error(error.message);}
