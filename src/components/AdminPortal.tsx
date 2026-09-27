import React, { useEffect, useMemo, useState } from 'react';
import type { InvitationRecord, InvitationStatus, SiteContentRow, AdminProfile, EventCard } from '../types';
import { getCurrentAdminProfile, signInAdmin, signOutAdmin, fetchAdminsFromSupabase, saveAdminProfileToSupabase, deleteAdminProfileFromSupabase } from '../lib/supabase';
import { generateRegistrationListPDF } from '../utils/pdfGenerator';
import {
  X, Lock, LogIn, LogOut, Search, Check, XCircle,
  Trash2, Download, Save, Plus, Eye, EyeOff
} from 'lucide-react';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: InvitationRecord[];
  onUpdateStatus: (registrationNo: string, newStatus: InvitationStatus, reason?: string) => Promise<void>;
  onDeleteRegistration?: (registrationNo: string) => Promise<void>;
  onEditRegistration?: (registrationNo: string, updates: Partial<InvitationRecord>) => Promise<void>;
  siteContent: SiteContentRow | null;
  onSaveSiteContent: (content: SiteContentRow) => Promise<void>;
  websiteSettings: any;
  brandingSettings: any;
  pdfSettings: any;
  paymentSettings: any;
  eventCards: EventCard[];
  jerseyShowcaseSettings: any;
  onUpdateWebsiteSettings: (value: any) => void;
  onUpdateBrandingSettings: (value: any) => void;
  onUpdatePdfSettings: (value: any) => void;
  onUpdatePaymentSettings: (value: any) => void;
  onUpdateEventCards: (value: EventCard[]) => void;
  onUpdateJerseyShowcase: (value: any) => void;
}

type Tab = 'registrations' | 'site' | 'sections' | 'admins';

const GROUPS = ['Science','Business Studies','Humanities'];
const EMPTY_SITE = {
  content_blocks: {
    description: '',
    bannerText: '',
    bannerActive: true,
    registrationOpen: true,
    registrationDeadline: '',
    copyrightText: '© 2027 RD27. All Rights Reserved.',
    footerText: 'Official Batch 2027 Committee · Executive Administration',
    payment: { currency: 'BDT', bkashEnabled: true, nagadEnabled: true, bkashNumber: '', nagadNumber: '', instructions: '' },
    pdf: { title: 'RAG DAY 27 (RD27)', subtitle: 'Official Registration Ledger', logo: '', footerText: 'RD27 Rag Day 2027 Official Record', signatureText: 'Executive Convener', showLogo: true },
    jersey: { showcaseEnabled: true, sectionOrder: 'showcase_first', items: [] },
  },
};

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen, onClose, invitations, onUpdateStatus, onDeleteRegistration, siteContent, onSaveSiteContent,
}) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('registrations');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|InvitationStatus>('all');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SiteContentRow | null>(null);
  const [adminRows, setAdminRows] = useState<AdminProfile[]>([]);
  const [adminDraft, setAdminDraft] = useState<AdminProfile | null>(null);
  const [adminError, setAdminError] = useState('');


  useEffect(() => {
    if (!isOpen) return;
    setLoginError('');
    void getCurrentAdminProfile().then(setAdmin).catch(() => setAdmin(null));
  }, [isOpen]);

  useEffect(() => {
    if (siteContent) setDraft(JSON.parse(JSON.stringify(siteContent)));
  }, [siteContent]);

  const scopedRows = useMemo(() => {
    let rows = invitations;
    if (admin?.role === 'male_admin') rows = rows.filter(r => r.gender === 'male');
    if (admin?.role === 'female_admin') rows = rows.filter(r => r.gender === 'female');
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(r => [r.registrationNo,r.name,r.roll,r.id,r.group,r.section].some(v => String(v||'').toLowerCase().includes(q)));
    }
    return rows;
  }, [admin?.role, invitations, statusFilter, query]);

  if (!isOpen) return null;

  useEffect(() => {
    if (admin?.role !== 'super_admin') return;
    void fetchAdminsFromSupabase().then(setAdminRows).catch((e:any) => setAdminError(e?.message || 'Unable to load admins.'));
  }, [admin?.role]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try { const profile = await signInAdmin(email,password); setAdmin(profile); setEmail(''); setPassword(''); }
    catch (e:any) { setLoginError(e?.message || 'Admin sign-in failed.'); }
  };

  const logout = async () => { await signOutAdmin(); setAdmin(null); };

  const updateSite = (patch: Partial<SiteContentRow>) => setDraft(prev => prev ? { ...prev, ...patch } : prev);
  const updateBlocks = (patch: Record<string,any>) => setDraft(prev => prev ? { ...prev, content_blocks: { ...prev.content_blocks, ...patch } } : prev);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try { await onSaveSiteContent(draft); } finally { setSaving(false); }
  };

  const setCard = (index:number, patch:Partial<EventCard>) => {
    if (!draft) return;
    const cards = Array.isArray(draft.cards) ? [...draft.cards] : [];
    cards[index] = { ...(cards[index] as any), ...patch };
    updateSite({cards});
  };

  const addCard = () => updateSite({ cards: [...((draft?.cards as any[]) || []), { id: crypto.randomUUID(), icon:'sparkles', title:'New Card', description:'', subDetail:'', customColor:'indigo', order:((draft?.cards as any[]) || []).length+1, visible:true }] });
  const removeCard = (index:number) => updateSite({cards: ((draft?.cards as any[]) || []).filter((_,i)=>i!==index).map((c:any,i)=>({...c,order:i+1}))});

  const sections = Array.isArray(draft?.sections) ? (draft?.sections as any[]) : [];
  const setSection = (index:number, patch:Partial<any>) => {
    if (!draft) return;
    const next = [...sections]; next[index] = {...next[index],...patch}; updateSite({sections:next});
  };
  const addSection = (gender:'male'|'female', group:string) => {
    if (!draft) return;
    const prefix = group==='Science'?'Sc':group==='Business Studies'?'Bs':'Hu';
    const letter = gender==='male'?'B':'G';
    const used = sections.map((s:any)=>String(s.code||''));
    const n = [1,2,3,4,5].find(v=>!used.includes(prefix+letter+v));
    if (!n) return;
    updateSite({sections:[...sections,{id:crypto.randomUUID(),group,gender,code:prefix+letter+n,displayName:prefix+letter+n,active:true,sortOrder:sections.length+1}]});
  };
  const removeSection=(index:number)=>updateSite({sections:sections.filter((_,i)=>i!==index).map((s:any,i)=>({...s,sortOrder:i+1}))});

  const statusAction = async (row:InvitationRecord,status:InvitationStatus) => {
    if(status==='rejected'){ setRejecting(row.registrationNo); setRejectReason(''); return; }
    await onUpdateStatus(row.registrationNo,status);
  };

  const confirmReject = async () => {
    if (!rejecting || !rejectReason.trim()) return;
    await onUpdateStatus(rejecting,'rejected',rejectReason.trim());
    setRejecting(null); setRejectReason('');
  };

  const exportPdf = () => {
    const pdf = (siteContent?.content_blocks as any)?.pdf || {};
    generateRegistrationListPDF(
      scopedRows,
      {
        pdfLogo: pdf.logo || siteContent?.logo || '',
        pdfHeader: pdf.title || 'RAG DAY 27 (RD27)',
        pdfSubHeader: pdf.subtitle || 'Official Registration Ledger',
        watermarkLogo: 'RD27 OFFICIAL',
        watermarkOpacity: 0.08,
        footerText: pdf.footerText || '',
        signatureArea: pdf.signatureText || 'Executive Convener',
        signatureTitle: 'Authorized Rag Day 2027 Committee',
        approvalText: '',
        invitationCardTitle: 'RAG DAY 27 - OFFICIAL INVITATION PASS',
        customNotes: '',
      } as any,
      {
        eventName: siteContent?.event_name || siteContent?.website_name || 'Rag Day 27',
        eventDescription: '',
        eventDate: siteContent?.event_date || '',
        eventTime: siteContent?.event_time || '',
        venue: siteContent?.venue || '',
        registrationFee: String(siteContent?.registration_fee || 500) + ' BDT',
        lastRegDate: '',
        footerText: '',
        copyrightText: '',
        bannerText: '',
        bannerActive: false,
      },
      (admin?.role === 'male_admin' ? 'male_admin' : admin?.role === 'female_admin' ? 'female_admin' : 'super_admin')
    );
  };

  const roleTitle = admin?.role === 'super_admin' ? 'Super Admin' : admin?.role === 'male_admin' ? 'Male Admin' : 'Female Admin';

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-md overflow-auto">
      {!admin ? (
        <div className="min-h-full grid place-items-center p-4">
          <form onSubmit={login} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl space-y-4">
            <button type="button" onClick={onClose} className="float-right p-2 text-slate-400"><X className="w-5 h-5"/></button>
            <div className="pt-3 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center"><Lock className="w-7 h-7"/></div>
              <h2 className="mt-4 text-2xl font-black text-slate-900">Admin Sign In</h2>
              <p className="mt-1 text-xs text-slate-500">Use your Supabase Auth account linked to an active RagDay27 admin.</p>
            </div>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" placeholder="Admin email" required className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"/>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Password" required className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"/>
            {loginError && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 p-3 text-xs">{loginError}</div>}
            <button className="w-full rounded-xl bg-indigo-600 text-white py-3 font-bold flex items-center justify-center gap-2"><LogIn className="w-4 h-4"/> Sign In</button>
          </form>
        </div>
      ) : (
        <div className="min-h-full max-w-7xl mx-auto bg-slate-50 text-slate-900">
          <header className="sticky top-0 z-20 bg-slate-950 text-white px-4 sm:px-6 py-4 flex items-center justify-between">
            <div><div className="text-xs uppercase tracking-wider text-slate-400">RagDay27 Admin</div><h1 className="text-lg font-black">{roleTitle}</h1></div>
            <div className="flex items-center gap-2"><button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X/></button><button onClick={logout} className="p-2 rounded-lg hover:bg-white/10" title="Sign out"><LogOut/></button></div>
          </header>

          <nav className="flex gap-2 overflow-x-auto border-b bg-white px-4 sm:px-6 py-2">
            <button onClick={()=>setTab('registrations')} className={'px-3 py-2 rounded-lg text-xs font-bold '+(tab==='registrations'?'bg-indigo-100 text-indigo-700':'text-slate-500')}>Registrations</button>
            {admin.role==='super_admin' && <><button onClick={()=>setTab('site')} className={'px-3 py-2 rounded-lg text-xs font-bold '+(tab==='site'?'bg-indigo-100 text-indigo-700':'text-slate-500')}>Site Content</button><button onClick={()=>setTab('sections')} className={'px-3 py-2 rounded-lg text-xs font-bold '+(tab==='sections'?'bg-indigo-100 text-indigo-700':'text-slate-500')}>Sections</button><button onClick={()=>setTab('admins')} className={'px-3 py-2 rounded-lg text-xs font-bold '+(tab==='admins'?'bg-indigo-100 text-indigo-700':'text-slate-500')}>Admins</button></>}
          </nav>

          {tab==='registrations' && <section className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between"><div className="flex gap-2">
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="rounded-lg border px-3 py-2 text-xs"><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
              <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="rounded-lg border pl-8 pr-3 py-2 text-xs"/></div>
            </div><button onClick={exportPdf} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4"/> PDF</button></div>
            <div className="grid gap-3">{scopedRows.map(row=><article key={row.registrationNo} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-3 justify-between items-start"><div><div className="font-mono text-xs text-slate-500">Registration No</div><div className="text-lg font-black">{row.registrationNo}</div><div className="text-sm font-bold mt-1">{row.name}</div><div className="text-xs text-slate-500">{row.group} · {row.section} · {row.gender}</div></div>
              <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100">{row.status}</span></div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">{[['Roll',row.roll],['Student ID',row.id],['Jersey',row.jerseyName],['Number',row.jerseyNumber],['Size',row.jerseySize]].map(([k,v])=><div key={k as string} className="rounded-lg bg-slate-50 p-2"><div className="text-[10px] uppercase text-slate-400">{k}</div><div className="font-semibold truncate">{v}</div></div>)}</div>
              <div className="mt-3 flex flex-wrap gap-2">{row.status!=='approved' && row.status!=='rejected' && <button onClick={()=>void statusAction(row,'approved')} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"><Check className="w-4 h-4"/> Approve</button>}{row.status!=='rejected' && <button onClick={()=>void statusAction(row,'rejected')} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1"><XCircle className="w-4 h-4"/> Reject</button>}{row.status==='rejected' && onDeleteRegistration && <button onClick={()=>void onDeleteRegistration(row.registrationNo)} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1"><Trash2 className="w-4 h-4"/> Delete</button>}</div>
            </article>)}</div>
            {scopedRows.length===0 && <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">No registrations in this scope.</div>}
          </section>}

          {tab==='site' && admin.role==='super_admin' && draft && <section className="p-4 sm:p-6 space-y-5">
            <div className="flex justify-between items-center"><div><h2 className="text-xl font-black">Site Content</h2><p className="text-xs text-slate-500">Single source of truth for editable website content.</p></div><button onClick={()=>void save()} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-2"><Save className="w-4 h-4"/>{saving?'Saving...':'Save Changes'}</button></div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Website Name<input value={draft.website_name||''} onChange={e=>updateSite({website_name:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Event Name<input value={draft.event_name||''} onChange={e=>updateSite({event_name:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Hero Title<input value={draft.hero_title||''} onChange={e=>updateSite({hero_title:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Hero Subtitle<textarea value={draft.hero_subtitle||''} onChange={e=>updateSite({hero_subtitle:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Event Date<input type="date" value={draft.event_date||''} onChange={e=>updateSite({event_date:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Event Time<input type="time" value={(draft.event_time||'').slice(0,5)} onChange={e=>updateSite({event_time:e.target.value+':00'})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Registration Fee<input type="number" value={draft.registration_fee||500} onChange={e=>updateSite({registration_fee:Number(e.target.value)})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Venue<input value={draft.venue||''} onChange={e=>updateSite({venue:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Logo URL<input value={draft.logo||''} onChange={e=>updateSite({logo:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Favicon URL<input value={draft.favicon||''} onChange={e=>updateSite({favicon:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Banner URL<input value={draft.banner||''} onChange={e=>updateSite({banner:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Hero Background<input value={draft.hero_background||''} onChange={e=>updateSite({hero_background:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
            </div>

            <div className="rounded-2xl bg-white border p-4"><div className="flex justify-between items-center mb-3"><h3 className="font-black">Quick Information Cards</h3><button onClick={addCard} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"><Plus className="w-4 h-4 inline mr-1"/>Add</button></div>
              <div className="grid gap-3">{((draft.cards as any[])||[]).map((c:any,i:number)=><div key={c.id||i} className="grid md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center"><input value={c.title||''} onChange={e=>setCard(i,{title:e.target.value})} className="rounded-lg border px-2 py-2 text-xs"/><input value={c.description||''} onChange={e=>setCard(i,{description:e.target.value})} className="rounded-lg border px-2 py-2 text-xs"/><input value={c.subDetail||''} onChange={e=>setCard(i,{subDetail:e.target.value})} className="rounded-lg border px-2 py-2 text-xs"/><button onClick={()=>setCard(i,{visible:c.visible===false})} className="p-2 rounded-lg border">{c.visible===false?<EyeOff/>:<Eye/>}</button><button onClick={()=>removeCard(i)} className="p-2 rounded-lg border text-rose-600"><Trash2/></button></div>)}</div></div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Banner Text<textarea value={(draft.content_blocks as any)?.bannerText||''} onChange={e=>updateBlocks({bannerText:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Footer Text<textarea value={(draft.content_blocks as any)?.footerText||''} onChange={e=>updateBlocks({footerText:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Hero Description<textarea value={(draft.content_blocks as any)?.description||''} onChange={e=>updateBlocks({description:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
              <label className="rounded-xl bg-white border p-4 text-xs font-bold">Last Registration Date<input type="date" value={(draft.content_blocks as any)?.registrationDeadline||''} onChange={e=>updateBlocks({registrationDeadline:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
            </div>

            <div className="rounded-2xl bg-white border p-4"><h3 className="font-black mb-3">Payment + PDF JSON blocks</h3><div className="grid md:grid-cols-2 gap-4">
              <textarea value={JSON.stringify((draft.content_blocks as any)?.payment||{},null,2)} onChange={e=>{try{updateBlocks({payment:JSON.parse(e.target.value)})}catch{}}} className="min-h-48 rounded-lg border p-3 font-mono text-xs"/>
              <textarea value={JSON.stringify((draft.content_blocks as any)?.pdf||{},null,2)} onChange={e=>{try{updateBlocks({pdf:JSON.parse(e.target.value)})}catch{}}} className="min-h-48 rounded-lg border p-3 font-mono text-xs"/>
            </div></div>
          </section>}

          {tab==='sections' && admin.role==='super_admin' && <section className="p-4 sm:p-6 space-y-4"><div><h2 className="text-xl font-black">Section Catalog</h2><p className="text-xs text-slate-500">Managed inside site_content.sections; no groups/sections tables are required.</p></div>
            {GROUPS.flatMap(group=>['male','female'].map(gender=>({group,gender:gender as any}))).map(({group,gender})=>{ const rows=sections.map((s:any,i:number)=>({...s,__index:i})).filter(s=>s.group===group&&s.gender===gender); return <div key={group+gender} className="rounded-2xl bg-white border p-4"><div className="flex items-center justify-between mb-3"><h3 className="font-black">{group} · {gender}</h3><button onClick={()=>addSection(gender,group)} className="px-2 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold">Add Section</button></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{rows.map((s:any)=><div key={s.__index} className="flex items-center gap-2 rounded-lg border p-2"><input value={s.code||''} onChange={e=>setSection(s.__index,{code:e.target.value,displayName:e.target.value})} className="w-20 rounded border px-2 py-1 text-xs font-mono"/><button onClick={()=>setSection(s.__index,{active:s.active===false})} className="p-1.5 rounded border">{s.active===false?<EyeOff/>:<Eye/>}</button><button onClick={()=>removeSection(s.__index)} className="p-1.5 rounded border text-rose-600"><Trash2/></button></div>)}</div></div>})}
          </section>}

          {tab==='admins' && admin.role==='super_admin' && <section className="p-4 sm:p-6 space-y-4">
            <div className="rounded-2xl bg-white border p-5">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Admin Identity Management</h2><p className="text-sm text-slate-600 mt-1">Link an existing Supabase Auth user to an admin role. Auth accounts themselves must be created through Supabase Auth.</p></div><button onClick={()=>{setAdminDraft({auth_user_id:crypto.randomUUID(),username:'',full_name:'',role:'male_admin',active:true,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});setAdminError('');}} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"><Plus className="w-4 h-4 inline mr-1"/>Add Link</button></div>
              {adminError && <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 p-3 text-xs">{adminError}</div>}
            </div>
            {adminDraft && <div className="rounded-2xl bg-white border p-4 grid md:grid-cols-2 gap-3">
              <label className="text-xs font-bold">Auth User ID<input value={adminDraft.auth_user_id} onChange={e=>setAdminDraft({...adminDraft,auth_user_id:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"/></label>
              <label className="text-xs font-bold">Username<input value={adminDraft.username||''} onChange={e=>setAdminDraft({...adminDraft,username:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"/></label>
              <label className="text-xs font-bold">Full Name<input value={adminDraft.full_name} onChange={e=>setAdminDraft({...adminDraft,full_name:e.target.value})} className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"/></label>
              <label className="text-xs font-bold">Role<select value={adminDraft.role} onChange={e=>setAdminDraft({...adminDraft,role:e.target.value as any})} className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"><option value="super_admin">Super Admin</option><option value="male_admin">Male Admin</option><option value="female_admin">Female Admin</option></select></label>
              <label className="text-xs font-bold flex items-center gap-2"><input type="checkbox" checked={adminDraft.active} onChange={e=>setAdminDraft({...adminDraft,active:e.target.checked})}/> Active</label>
              <div className="md:col-span-2 flex justify-end gap-2"><button onClick={()=>setAdminDraft(null)} className="px-3 py-2 rounded-lg border text-xs font-bold">Cancel</button><button onClick={()=>void (async()=>{try{const saved=await saveAdminProfileToSupabase({...adminDraft,updated_at:new Date().toISOString()});setAdminRows(prev=>[...prev.filter(x=>x.auth_user_id!==saved.auth_user_id),saved].sort((a,b)=>a.created_at.localeCompare(b.created_at)));setAdminDraft(null);setAdminError('');}catch(e:any){setAdminError(e?.message||'Unable to save admin.');}})()} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold"><Save className="w-4 h-4 inline mr-1"/>Save</button></div>
            </div>}
            <div className="grid gap-3">{adminRows.map(a=><article key={a.auth_user_id} className="rounded-2xl bg-white border p-4 flex flex-wrap gap-3 items-center justify-between"><div><div className="font-bold">{a.full_name}</div><div className="text-xs text-slate-500 font-mono break-all">{a.auth_user_id}</div><div className="text-xs text-slate-500 mt-1">{a.username || 'No username'} · {a.role} · {a.active?'Active':'Disabled'}</div></div><div className="flex gap-2"><button onClick={()=>setAdminDraft({...a})} className="px-3 py-2 rounded-lg border text-xs font-bold">Edit</button><button onClick={()=>void (async()=>{try{await deleteAdminProfileFromSupabase(a.auth_user_id);setAdminRows(prev=>prev.filter(x=>x.auth_user_id!==a.auth_user_id));}catch(e:any){setAdminError(e?.message||'Unable to remove admin link.');}})()} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold">Remove</button></div></article>)}</div>
          </section>}
        </div>
      )}

      {rejecting && <div className="fixed inset-0 z-[250] grid place-items-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h3 className="font-black">Reject Registration {rejecting}</h3><textarea autoFocus value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Enter rejection reason..." className="mt-3 w-full min-h-32 rounded-xl border p-3 text-sm"/><div className="mt-3 flex justify-end gap-2"><button onClick={()=>setRejecting(null)} className="px-3 py-2 rounded-lg border text-xs font-bold">Cancel</button><button onClick={()=>void confirmReject()} disabled={!rejectReason.trim()} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">Reject</button></div></div></div>}
    </div>
  );
};