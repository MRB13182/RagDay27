import { createClient } from '@supabase/supabase-js';
import {
  InvitationRecord, InvitationStatus, WebsiteSettings, BrandingSettings,
  PaymentSettings, PdfSettings, EventCard, JerseyShowcaseSettings, AdminFileItem
} from '../types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rqjlrbteaqjpgwkeomro.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BcoEceXY8X9BxifFSMRjoA_neWVF9wb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const STORAGE_BUCKET = 'student-photos';

export interface SupabaseHealthStatus {
  connected:boolean; projectUrl:string; projectId:string;
  registrationsTable:boolean; eventSettingsTable:boolean; brandingSettingsTable:boolean;
  paymentSettingsTable:boolean; pdfSettingsTable:boolean; eventCardsTable:boolean;
  jerseyShowcaseTable:boolean; adminFilesTable:boolean; storageBucket:boolean;
  registrationCount:number; errorMessage?:string;
}

function dbError(error:any, fallback='Database request failed'): never {
  throw new Error(error?.message || fallback);
}

export async function uploadFileToStorage(
  file: File | Blob,
  folder: 'logos'|'banners'|'jerseys'|'students'|'certificates'|'invitations'|'resumes'|'projects'|'files',
  customFileName?: string
): Promise<string> {
  if (file instanceof File) {
    if (file.size > 10 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (folder === 'students' || folder === 'jerseys' || folder === 'logos' || folder === 'banners') {
      if (!allowed.slice(0,3).includes(file.type)) throw new Error('INVALID_FILE_TYPE');
    }
  }
  const ext = file instanceof File ? (file.name.split('.').pop() || 'bin').toLowerCase() : 'bin';
  const clean = customFileName ? customFileName.replace(/[^a-zA-Z0-9_-]/g,'_') + '.' + ext : crypto.randomUUID()+'.'+ext;
  const bucket = folder === 'students' ? 'student-photos'
    : folder === 'jerseys' ? 'jerseys'
    : folder === 'invitations' ? 'invitation-cards'
    : folder === 'files' || folder === 'certificates' || folder === 'resumes' || folder === 'projects' ? 'branding'
    : 'branding';
  const path = `${folder}/${clean}`;
  const {data,error}=await supabase.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file instanceof File ? file.type : undefined});
  if(error) dbError(error,'Storage upload failed');
  if(bucket==='student-photos'||bucket==='invitation-cards'||bucket==='pdf-assets'||bucket==='exports') return data.path;
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

export async function uploadStudentPhoto(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('INVALID_PHOTO_TYPE');
  if(file.size>5*1024*1024) throw new Error('PHOTO_TOO_LARGE');
  return uploadFileToStorage(file,'students');
}

export function getNextAvailableRegistrationNumber(_records:InvitationRecord[]):string{
  throw new Error('Registration number is generated atomically by Supabase.');
}
export function getNextSerialNumber(records:InvitationRecord[]):number{return records.length+1;}

function formatRegNo(n:number|string){return `RD27-${String(n).padStart(3,'0')}`;}
function mapRow(row:any):InvitationRecord{
  return {
    dbId:row.id, registrationNo:formatRegNo(row.registration_no), name:row.student_name||'', roll:row.roll||'',
    id:row.student_id||'', group:row.groups?.name||row.group_name||'', section:row.sections?.code||row.section||'',
    status:row.status, gender:row.gender, photoUrl:row.student_photo_path||'', contactNumber:row.contact_number||'',
    jerseyName:row.jersey_name||'', jerseyNumber:row.jersey_number||'', jerseySize:row.jersey_size||'',
    paymentMethod:row.payment_method, amount:Number(row.registration_fee||0), senderNumber:row.sender_number||'',
    paymentTime:row.payment_time||'', transactionId:row.transaction_id||undefined,
    rejectionReason:row.rejection_reason||undefined,
    issuedAt:row.approved_at?new Date(row.approved_at).toLocaleDateString('en-US'):undefined,
    createdAt:row.created_at, updatedAt:row.updated_at,
  };
}

async function getRegistrationRow(regNo:string){
  const n=Number(String(regNo).replace(/^RD27-/i,''));
  if(!Number.isInteger(n)) throw new Error('INVALID_REGISTRATION_NUMBER');
  const {data,error}=await supabase.from('registrations').select('*, groups(name), sections(code)').eq('registration_no',n).single();
  if(error) dbError(error,'Registration not found');
  return data;
}

export async function saveRegistrationToSupabase(rec:InvitationRecord){
  try{
    const {data:g,error:ge}=await supabase.from('groups').select('id').eq('name',rec.group).eq('active',true).single();
    if(ge||!g) dbError(ge,'Invalid group');
    const {data:s,error:se}=await supabase.from('sections').select('id').eq('group_id',g.id).eq('gender',rec.gender).eq('code',rec.section).eq('active',true).single();
    if(se||!s) dbError(se,'Invalid section');
    const {data,error}=await supabase.rpc('create_registration',{
      p_student_name:rec.name,p_gender:rec.gender,p_roll:rec.roll,p_student_id:rec.id,p_group_id:g.id,p_section_id:s.id,
      p_jersey_name:rec.jerseyName,p_jersey_number:rec.jerseyNumber,p_jersey_size:rec.jerseySize,
      p_sender_number:rec.senderNumber,p_payment_method:rec.paymentMethod,p_payment_time:rec.paymentTime,
      p_transaction_id:rec.transactionId||null,p_student_photo_path:rec.photoUrl||null,p_contact_number:rec.contactNumber||null
    });
    if(error) dbError(error,'Registration failed');
    const row=Array.isArray(data)?data[0]:data;
    return {success:true,data:mapRow(row)};
  }catch(e:any){return {success:false,error:e?.message||'Registration failed'};}
}

export async function fetchRegistrationsFromSupabase(){
  const {data,error}=await supabase
    .from('registrations')
    .select('*, groups(name), sections(code)')
    .order('registration_no',{ascending:true});
  if(error) return {data:[] as InvitationRecord[],fromDb:false,error:error.message};
  return {data:(data||[]).map(mapRow),fromDb:true};
}

export async function updateRegistrationStatusInSupabase(regNo:string,status:InvitationStatus,reason?:string){
  try{
    const row=await getRegistrationRow(regNo);
    if(status==='approved'){const {data,error}=await supabase.rpc('approve_registration',{p_registration_id:row.id});if(error)return {success:false,error:error.message};return {success:true,data:mapRow(data)};}
    if(status==='rejected'){const {data,error}=await supabase.rpc('reject_registration',{p_registration_id:row.id,p_reason:reason||''});if(error)return {success:false,error:error.message};return {success:true,data:mapRow(data)};}
    return {success:false,error:'INVALID_STATUS'};
  }catch(e:any){return {success:false,error:e.message};}
}

export async function updateRegistrationDetailsInSupabase(regNo:string,updates:Partial<InvitationRecord>){
  try{
    const row=await getRegistrationRow(regNo);
    const {data,error}=await supabase.rpc('admin_update_registration',{
      p_registration_id:row.id,p_student_name:updates.name??null,p_roll:updates.roll??null,p_student_id:updates.id??null,
      p_group_id:null,p_section_id:null,p_gender:null,p_jersey_name:updates.jerseyName??null,p_jersey_number:updates.jerseyNumber??null,
      p_jersey_size:updates.jerseySize??null,p_sender_number:updates.senderNumber??null,p_payment_method:updates.paymentMethod??null,
      p_payment_time:updates.paymentTime??null,p_transaction_id:updates.transactionId??null,p_student_photo_path:updates.photoUrl??null
    });
    if(error)return {success:false,error:error.message};
    return {success:true,data:data?mapRow(data):undefined};
  }catch(e:any){return {success:false,error:e.message};}
}

export async function resetRegistrationSequence(){
  const {data,error}=await supabase.rpc('reset_registration_sequence');
  return {success:!error,error:error?.message,data};
}

export async function getAdminExportData(gender?:'male'|'female'){
  const {data,error}=await supabase.rpc('get_admin_export_data',{p_gender:gender||null});
  if(error)return {data:[] as any[],error:error.message};
  return {data:data||[],error:undefined};
}

export async function getPublicStudent(query:string){
  const {data,error}=await supabase.rpc('search_public_student',{p_query:query});
  return {data:data||[],error:error?.message};
}

export async function getPublicInvitation(registrationNo:string){
  const n=Number(String(registrationNo).replace(/^RD27-/i,''));
  if(!Number.isInteger(n))return {data:[],error:'INVALID_REGISTRATION_NUMBER'};
  const {data,error}=await supabase.rpc('get_public_invitation',{p_registration_no:n});
  return {data:data||[],error:error?.message};
}


export async function deleteRegistrationFromSupabase(regNo:string){
  try{const row=await getRegistrationRow(regNo);const {error}=await supabase.rpc('delete_registration',{p_registration_id:row.id});return {success:!error,error:error?.message};}
  catch(e:any){return {success:false,error:e.message};}
}

async function singleton(table:string){const {data,error}=await supabase.from(table).select('*').eq('id','current').maybeSingle();if(error)throw error;return data;}

export async function fetchEventSettingsFromSupabase():Promise<WebsiteSettings|null>{
  try{const d=await singleton('website_settings');if(!d)return null;const dt=d.event_date?new Date(d.event_date+'T00:00:00'):null;return {
    eventName:d.event_name||d.website_name,eventDescription:d.hero_subtitle||'',eventDate:d.event_date||'',
    eventTime:d.event_time||'',eventDay:dt?dt.getDate():undefined,eventMonth:dt?dt.toLocaleString('en-US',{month:'long'}):undefined,
    eventYear:dt?dt.getFullYear():undefined,venue:d.venue||'',registrationFee:d.registration_fee_display||'',
    lastRegDate:d.registration_deadline?new Date(d.registration_deadline).toLocaleDateString('en-US'): '',
    footerText:'',copyrightText:'',bannerText:d.banner_text||'',bannerActive:d.banner_active??true
  };}catch{return null;}
}
export async function saveEventSettingsToSupabase(s:WebsiteSettings){
  const eventDate = s.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(s.eventDate)
    ? s.eventDate
    : (s.eventYear && s.eventMonth && s.eventDay ? new Date(`${s.eventMonth} ${s.eventDay}, ${s.eventYear}`).toISOString().slice(0,10) : null);
  const eventTime = s.eventTime || null;
  const deadline = s.lastRegDate ? new Date(s.lastRegDate + 'T23:59:59+06:00').toISOString() : null;
  const {data,error}=await supabase.rpc('update_website_settings',{
    p_website_name:s.eventName,p_event_name:s.eventName,p_event_date:eventDate,p_event_time:eventTime,
    p_registration_deadline:deadline,p_registration_open:true,p_registration_fee_display:s.registrationFee,
    p_banner_active:s.bannerActive,p_banner_text:s.bannerText,p_hero_title:s.eventName,p_hero_subtitle:s.eventDescription,p_venue:s.venue
  });
  return {success:!error,error:error?.message,data};
}

export async function fetchBrandingSettingsFromSupabase(){try{const d=await singleton('branding_settings');return d?{websiteLogo:d.logo_path||'',favicon:d.favicon_path||'',heroBanner:d.banner_path||'',heroBackground:d.hero_background_path||'',jerseyFrontImage:'',jerseyBackImage:'',invitationCardBackground:'',footerLogo:d.footer_logo_path||''}:null;}catch{return null;}}
export async function saveBrandingSettingsToSupabase(s:BrandingSettings){
  const {data,error}=await supabase.rpc('update_branding_settings',{
    p_website_name:'Rag Day 27 (RD27)',p_logo_path:s.websiteLogo||null,p_favicon_path:s.favicon||null,
    p_banner_path:s.heroBanner||null,p_hero_background_path:s.heroBackground||null,
    p_footer_logo_path:s.footerLogo||null,p_footer_text:null
  });
  return {success:!error,error:error?.message,data};
}
export async function fetchPaymentSettingsFromSupabase(){try{const d=await singleton('payment_settings');return d?{registrationFee:Number(d.registration_fee),currency:d.currency,bkashEnabled:d.bkash_enabled,nagadEnabled:d.nagad_enabled,maleBkashNumber:d.bkash_number||'',maleNagadNumber:d.nagad_number||'',femaleBkashNumber:d.bkash_number||'',femaleNagadNumber:d.nagad_number||'',instructions:'',paymentInstructions:''}:null;}catch{return null;}}
export async function savePaymentSettingsToSupabase(s:PaymentSettings){
  const {data,error}=await supabase.rpc('update_payment_settings',{
    p_registration_fee:s.registrationFee,p_currency:s.currency,
    p_bkash_number:s.maleBkashNumber||s.femaleBkashNumber||null,
    p_nagad_number:s.maleNagadNumber||s.femaleNagadNumber||null,
    p_bkash_enabled:s.bkashEnabled,p_nagad_enabled:s.nagadEnabled
  });
  return {success:!error,error:error?.message,data};
}
export async function fetchPdfSettingsFromSupabase():Promise<PdfSettings|null>{try{const d=await singleton('pdf_settings');if(!d)return null;return {pdfLogo:d.logo_path||'',pdfHeader:d.pdf_title||'RAG DAY 27',pdfSubHeader:d.pdf_subtitle||'',watermarkLogo:'RD27 OFFICIAL',watermarkOpacity:.08,footerText:d.footer_text||'',signatureArea:d.signature_text||'',signatureTitle:'',approvalText:'APPROVED & VERIFIED',invitationCardTitle:'RAG DAY 2027 - OFFICIAL INVITATION PASS',customNotes:''};}catch{return null;}}
export async function savePdfSettingsToSupabase(s:PdfSettings){
  const {data,error}=await supabase.rpc('update_pdf_settings',{
    p_pdf_title:s.pdfHeader,p_pdf_subtitle:s.pdfSubHeader,p_logo_path:s.pdfLogo||null,
    p_footer_text:s.footerText,p_signature_text:s.signatureArea,p_background_image_path:null,
    p_show_logo:true,p_show_photo:true,p_show_registration_no:true,p_show_student_details:true
  });
  return {success:!error,error:error?.message,data};
}
export async function fetchEventCardsFromSupabase(){const {data,error}=await supabase.from('event_cards').select('*').eq('active',true).order('sort_order');if(error)return null;return (data||[]).map((c:any)=>({id:c.id,icon:c.icon||'calendar',title:c.title,description:c.description||'',subDetail:'',customColor:'indigo',order:c.sort_order,visible:c.visible}));}
export async function saveEventCardsToSupabase(cards:EventCard[]){
  for(const c of cards){
    const {error}=await supabase.rpc('upsert_event_card',{
      p_id:c.id,p_title:c.title,p_description:c.description,p_icon:c.icon,
      p_sort_order:c.order,p_visible:c.visible,p_active:true
    });
    if(error)return {success:false,error:error.message};
  }
  return {success:true};
}
export async function fetchJerseyShowcaseFromSupabase(){const {data,error}=await supabase.from('jersey_showcase').select('*').eq('id','current').maybeSingle();if(error||!data)return null;return {enabled:data.enabled,sectionOrder:data.section_order,jerseys:Array.isArray(data.jerseys)?data.jerseys:[]};}
export async function saveJerseyShowcaseToSupabase(s:JerseyShowcaseSettings){
  const {data,error}=await supabase.rpc('update_jersey_showcase',{
    p_enabled:s.enabled,p_section_order:s.sectionOrder,p_jerseys:s.jerseys
  });
  return {success:!error,error:error?.message,data};
}
export async function fetchAdminFilesFromSupabase(category?:string){let q=supabase.from('admin_files').select('*').order('created_at',{ascending:false});if(category)q=q.eq('category',category);const {data,error}=await q;if(error)return [];return (data||[]).map((d:any)=>({id:d.id,category:d.category,title:d.title,description:d.description||'',fileUrl:d.file_url,fileName:d.file_name||'',fileSize:d.file_size||'',fileType:d.file_type||'',uploadedAt:d.created_at}));}
export async function saveAdminFileToSupabase(f:AdminFileItem){const {error}=await supabase.from('admin_files').upsert({id:f.id,category:f.category,title:f.title,description:f.description||null,file_url:f.fileUrl,file_name:f.fileName||null,file_size:f.fileSize||null,file_type:f.fileType||null,updated_at:new Date().toISOString(),updated_by:null});return {success:!error,error:error?.message};}
export async function deleteAdminFileFromSupabase(id:string){const {error}=await supabase.from('admin_files').delete().eq('id',id);return {success:!error,error:error?.message};}

export async function checkSupabaseHealth():Promise<SupabaseHealthStatus>{
  const h:any={connected:false,projectUrl:SUPABASE_URL,projectId:'rqjlrbteaqjpgwkeomro',registrationsTable:false,eventSettingsTable:false,brandingSettingsTable:false,paymentSettingsTable:false,pdfSettingsTable:false,eventCardsTable:false,jerseyShowcaseTable:false,adminFilesTable:false,storageBucket:false,registrationCount:0};
  try{
    const results=await Promise.all([
      supabase.from('registrations').select('id',{count:'exact',head:true}),
      supabase.from('website_settings').select('id').eq('id','current').maybeSingle(),
      supabase.from('branding_settings').select('id').eq('id','current').maybeSingle(),
      supabase.from('payment_settings').select('id').eq('id','current').maybeSingle(),
      supabase.from('pdf_settings').select('id').eq('id','current').maybeSingle(),
      supabase.from('event_cards').select('id').limit(1),
      supabase.from('jersey_showcase').select('id').eq('id','current').maybeSingle(),
      supabase.from('admin_files').select('id').limit(1),
      supabase.storage.listBuckets()
    ]);
    h.connected=true;h.registrationsTable=!results[0].error;h.registrationCount=results[0].count||0;h.eventSettingsTable=!results[1].error;h.brandingSettingsTable=!results[2].error;h.paymentSettingsTable=!results[3].error;h.pdfSettingsTable=!results[4].error;h.eventCardsTable=!results[5].error;h.jerseyShowcaseTable=!results[6].error;h.adminFilesTable=!results[7].error;h.storageBucket=!!results[8].data?.some((b:any)=>b.id==='student-photos');return h;
  }catch(e:any){h.errorMessage=e?.message||'Health check failed';return h;}
}

export const COMPLETE_SUPABASE_SCHEMA_SQL = 'See supabase_schema.sql in this repository for the authoritative production schema.';
