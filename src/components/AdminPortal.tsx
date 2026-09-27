import React, { useEffect, useMemo, useState, useRef } from 'react';
import type { InvitationRecord, InvitationStatus, SiteContentRow, AdminProfile, EventCard } from '../types';
import {
  getCurrentAdminProfile,
  signInAdmin,
  signOutAdmin,
  fetchAdminsFromSupabase,
  saveAdminProfileToSupabase,
  deleteAdminProfileFromSupabase,
} from '../lib/supabase';
import { uploadBrandingAsset } from '../services/storage';
import { generateRegistrationListPDF, generateInvitationCardPDF } from '../utils/pdfGenerator';
import { DEFAULT_SECTIONS } from '../data/mockData';
import {
  X, Lock, LogIn, LogOut, Search, Check, XCircle,
  Trash2, Download, Save, Plus, Eye, EyeOff, Upload,
  Sliders, FileText, CheckCircle2, AlertTriangle, Sparkles,
  CreditCard, ShieldCheck, QrCode, ImageIcon
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

type Tab = 'registrations' | 'site' | 'pdf' | 'sections' | 'admins';

const GROUPS = ['Science', 'Business Studies', 'Humanities'];

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  invitations,
  onUpdateStatus,
  onDeleteRegistration,
  siteContent,
  onSaveSiteContent,
  websiteSettings,
}) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<Tab>('registrations');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus>('all');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deletingRegNo, setDeletingRegNo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [draft, setDraft] = useState<SiteContentRow | null>(null);
  const [adminRows, setAdminRows] = useState<AdminProfile[]>([]);
  const [adminDraft, setAdminDraft] = useState<AdminProfile | null>(null);
  const [adminError, setAdminError] = useState('');

  // File input refs for image uploads
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const heroBgInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLoginError('');
    void getCurrentAdminProfile().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    if (siteContent) {
      const cloned = JSON.parse(JSON.stringify(siteContent));
      if (!Array.isArray(cloned.sections_json) || cloned.sections_json.length === 0) {
        cloned.sections_json = DEFAULT_SECTIONS;
      }
      setDraft(cloned);
    }
  }, [siteContent]);

  useEffect(() => {
    if (admin?.role === 'super_admin') {
      void fetchAdminsFromSupabase()
        .then(setAdminRows)
        .catch((e: any) => setAdminError(e?.message || 'Unable to load admins.'));
    }
  }, [admin?.role]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const scopedRows = useMemo(() => {
    let rows = invitations;
    if (admin?.role === 'male_admin') rows = rows.filter(r => r.gender === 'male');
    if (admin?.role === 'female_admin') rows = rows.filter(r => r.gender === 'female');
    if (statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(r =>
        [
          r.registrationNo,
          r.name,
          r.roll,
          r.id,
          r.group,
          r.section,
          r.jerseyName,
          r.jerseyNumber,
          r.senderNumber,
          r.transactionId,
        ].some(v => String(v || '').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [admin?.role, invitations, statusFilter, query]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const profile = await signInAdmin(passcode);
      setAdmin(profile);
      setPasscode('');
    } catch (e: any) {
      setLoginError(e?.message || 'Invalid admin passcode.');
    }
  };

  const logout = async () => {
    await signOutAdmin();
    setAdmin(null);
  };

  const updateSite = (patch: Partial<SiteContentRow>) =>
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));

  const updateBlocks = (patch: Record<string, any>) =>
    setDraft(prev =>
      prev
        ? {
            ...prev,
            content_blocks_json: {
              ...(prev.content_blocks_json || {}),
              ...patch,
            },
          }
        : prev
    );

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await onSaveSiteContent(draft);
      showToast('Changes saved to database successfully!');
    } catch (err: any) {
      showToast(err?.message || 'Error saving changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAsset = async (
    file: File,
    field: 'logo' | 'banner' | 'favicon' | 'hero_background'
  ) => {
    if (!file) return;
    setUploadingField(field);

    // 1. Immediately create a DataURL preview so UI & website update instantly
    const reader = new FileReader();
    reader.onload = async e => {
      const dataUrl = e.target?.result as string;
      updateSite({ [field]: dataUrl });

      // 2. Concurrently upload to Supabase storage bucket
      try {
        const folder =
          field === 'logo'
            ? 'logos'
            : field === 'favicon'
            ? 'favicons'
            : 'banners';
        const res = await uploadBrandingAsset(file, folder);
        if (res.success && res.publicUrl) {
          updateSite({ [field]: res.publicUrl });
        }
      } catch (err) {
        console.warn(`Supabase storage upload notice for ${field}:`, err);
      } finally {
        setUploadingField(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAdminDraft = async () => {
    if (!adminDraft?.auth_user_id.trim()) {
      setAdminError('A real Supabase Auth user UUID is required.');
      return;
    }
    if (!adminDraft.full_name.trim()) {
      setAdminError('Full name is required.');
      return;
    }
    try {
      const saved = await saveAdminProfileToSupabase({
        ...adminDraft,
        auth_user_id: adminDraft.auth_user_id.trim(),
        full_name: adminDraft.full_name.trim(),
        username: adminDraft.username?.trim() || null,
        updated_at: new Date().toISOString(),
      });
      setAdminRows(prev => [
        ...prev.filter(x => x.auth_user_id !== saved.auth_user_id),
        saved,
      ].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setAdminDraft(null);
      setAdminError('');
      showToast('Admin linked successfully.');
    } catch (e: any) {
      setAdminError(e?.message || 'Unable to save admin.');
    }
  };

  const setCard = (index: number, patch: Partial<EventCard>) => {
    if (!draft) return;
    const cards = Array.isArray(draft.cards_json) ? [...draft.cards_json] : [];
    cards[index] = { ...(cards[index] as any), ...patch };
    updateSite({ cards_json: cards });
  };

  const addCard = () =>
    updateSite({
      cards_json: [
        ...((draft?.cards_json as any[]) || []),
        {
          id: crypto.randomUUID(),
          icon: 'sparkles',
          title: 'New Card',
          description: '',
          subDetail: '',
          customColor: 'indigo',
          order: ((draft?.cards_json as any[]) || []).length + 1,
          visible: true,
        },
      ],
    });

  const removeCard = (index: number) =>
    updateSite({
      cards_json: ((draft?.cards_json as any[]) || [])
        .filter((_, i) => i !== index)
        .map((c: any, i) => ({ ...c, order: i + 1 })),
    });

  // Sections management
  const sections = Array.isArray(draft?.sections_json) && draft?.sections_json.length > 0
    ? (draft?.sections_json as any[])
    : DEFAULT_SECTIONS;

  const setSection = (index: number, patch: Partial<any>) => {
    if (!draft) return;
    const next = [...sections];
    next[index] = { ...next[index], ...patch };
    updateSite({ sections_json: next });
  };

  const addSection = (gender: 'male' | 'female', group: string) => {
    if (!draft) return;
    const prefix = group === 'Science' ? 'Sc' : group === 'Business Studies' ? 'Bs' : 'Hu';
    const letter = gender === 'male' ? 'B' : 'G';
    const used = sections.map((s: any) => String(s.code || ''));
    let nextNum = 1;
    while (used.includes(`${prefix}${letter}${nextNum}`)) {
      nextNum++;
    }
    const newCode = `${prefix}${letter}${nextNum}`;

    updateSite({
      sections_json: [
        ...sections,
        {
          id: crypto.randomUUID(),
          group,
          gender,
          code: newCode,
          displayName: newCode,
          active: true,
          sortOrder: sections.length + 1,
        },
      ],
    });
    showToast(`Added section ${newCode}. Click "Save Changes" to persist.`);
  };

  const removeSection = (index: number) => {
    updateSite({
      sections_json: sections
        .filter((_, i) => i !== index)
        .map((s: any, i) => ({ ...s, sortOrder: i + 1 })),
    });
  };

  const statusAction = async (row: InvitationRecord, status: InvitationStatus) => {
    if (status === 'rejected') {
      setRejecting(row.registrationNo);
      setRejectReason('');
      return;
    }
    await onUpdateStatus(row.registrationNo, status);
  };

  const confirmReject = async () => {
    if (!rejecting || !rejectReason.trim()) return;
    await onUpdateStatus(rejecting, 'rejected', rejectReason.trim());
    setRejecting(null);
    setRejectReason('');
    showToast(`Registration ${rejecting} marked as rejected.`);
  };

  const exportPdf = () => {
    const pdf = (siteContent?.content_blocks_json as any)?.pdf || {};
    generateRegistrationListPDF(
      scopedRows,
      {
        pdfLogo: pdf.logo || siteContent?.logo || '',
        pdfHeader: pdf.title || 'RAG DAY 27 (RD27)',
        pdfSubHeader: pdf.subtitle || 'Official Registration Ledger',
        watermarkLogo: pdf.watermarkLogo || 'RD27 OFFICIAL',
        watermarkOpacity: 0.08,
        footerText: pdf.footerText || '',
        signatureArea: pdf.signatureText || 'Executive Convener',
        signatureTitle: pdf.signatureTitle || 'Authorized Rag Day 2027 Committee',
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
      admin?.role === 'male_admin'
        ? 'male_admin'
        : admin?.role === 'female_admin'
        ? 'female_admin'
        : 'super_admin'
    );
  };

  // PDF settings extracted helper
  const pdfConfig = (draft?.content_blocks_json as any)?.pdf || {};
  const updatePdfConfig = (patch: Record<string, any>) => {
    updateBlocks({
      pdf: {
        ...((draft?.content_blocks_json as any)?.pdf || {}),
        ...patch,
      },
    });
  };

  // Payment settings extracted helper
  const paymentConfig = (draft?.content_blocks_json as any)?.payment || {};
  const updatePaymentConfig = (patch: Record<string, any>) => {
    updateBlocks({
      payment: {
        ...((draft?.content_blocks_json as any)?.payment || {}),
        ...patch,
      },
    });
  };

  const roleTitle =
    admin?.role === 'super_admin'
      ? 'Super Admin'
      : admin?.role === 'male_admin'
      ? 'Male Admin'
      : 'Female Admin';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/75 backdrop-blur-md overflow-auto text-slate-900">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[300] bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-2xl border border-slate-700 animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {!admin ? (
        /* ================================================================ */
        /* 1. ADMIN LOGIN PAGE (Clean Passcode Input Only)                  */
        /* ================================================================ */
        <div className="min-h-full grid place-items-center p-4">
          <form
            onSubmit={login}
            className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl space-y-5 border border-slate-100"
          >
            <button
              type="button"
              onClick={onClose}
              className="float-right p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pt-2 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">Admin Sign In</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter your designated administrator passcode to access the management portal.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Admin Passcode
              </label>
              <div className="relative">
                <input
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="Enter administrator passcode..."
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 pl-4 pr-11 py-3 text-sm font-mono focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  title={showPasscode ? 'Hide password' : 'Show password'}
                >
                  {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 p-3 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </form>
        </div>
      ) : (
        /* ================================================================ */
        /* ADMIN PORTAL MAIN INTERFACE                                      */
        /* ================================================================ */
        <div className="min-h-full max-w-7xl mx-auto bg-slate-50 text-slate-900 pb-16">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-slate-950 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 grid place-items-center font-black text-sm">
                27
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  RagDay27 Administration
                </div>
                <h1 className="text-base sm:text-lg font-black">{roleTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 sm:px-6 py-2.5">
            <button
              onClick={() => setTab('registrations')}
              className={
                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ' +
                (tab === 'registrations'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100')
              }
            >
              <span>Registrations</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  tab === 'registrations' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {scopedRows.length}
              </span>
            </button>

            {admin.role === 'super_admin' && (
              <>
                <button
                  onClick={() => setTab('site')}
                  className={
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ' +
                    (tab === 'site'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100')
                  }
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Site Content</span>
                </button>
                <button
                  onClick={() => setTab('pdf')}
                  className={
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ' +
                    (tab === 'pdf'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100')
                  }
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Settings</span>
                </button>
                <button
                  onClick={() => setTab('sections')}
                  className={
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ' +
                    (tab === 'sections'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100')
                  }
                >
                  <span>Sections</span>
                </button>
                <button
                  onClick={() => setTab('admins')}
                  className={
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ' +
                    (tab === 'admins'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100')
                  }
                >
                  <span>Admins</span>
                </button>
              </>
            )}
          </nav>

          {/* ================================================================ */}
          {/* TAB 1: REGISTRATIONS MANAGEMENT (Complete 14-field display)       */}
          {/* ================================================================ */}
          {tab === 'registrations' && (
            <section className="p-4 sm:p-6 space-y-4">
              {/* Filter and Action Header */}
              <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="all">All Registrations</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search name, reg no, roll, id, trx..."
                      className="rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs w-48 sm:w-64 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportPdf}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Ledger PDF</span>
                  </button>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid gap-4">
                {scopedRows.map(row => (
                  <article
                    key={row.registrationNo}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    {/* Header Row: Name, Reg No, Gender & Status */}
                    <div className="flex flex-wrap gap-3 justify-between items-start pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base sm:text-lg font-black text-indigo-600">
                            {row.registrationNo}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              row.gender === 'male'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-pink-50 text-pink-700 border border-pink-200'
                            }`}
                          >
                            {row.gender}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">{row.name}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                            row.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : row.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                    </div>

                    {/* ALL 14 FIELDS DISPLAYED CLEARLY */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Roll</div>
                        <div className="font-semibold text-slate-900 truncate">{row.roll || 'N/A'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Student ID</div>
                        <div className="font-semibold text-slate-900 truncate">{row.id || 'N/A'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Group</div>
                        <div className="font-semibold text-slate-900 truncate">{row.group || 'N/A'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Section</div>
                        <div className="font-semibold text-slate-900 truncate">{row.section || 'N/A'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Jersey Name</div>
                        <div className="font-bold text-indigo-600 truncate">{row.jerseyName || 'N/A'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Jersey Number</div>
                        <div className="font-bold text-slate-900 truncate">#{row.jerseyNumber || '27'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Jersey Size</div>
                        <div className="font-bold text-slate-900 truncate">{row.jerseySize || 'L'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Sender Number</div>
                        <div className="font-semibold text-slate-900 truncate font-mono">
                          {row.senderNumber || 'N/A'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Payment Time</div>
                        <div className="font-semibold text-slate-900 truncate">{row.paymentTime || 'N/A'}</div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 col-span-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Transaction ID</div>
                        <div className="font-bold font-mono text-indigo-700 truncate">
                          {row.transactionId || 'N/A'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 col-span-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Registration Date</div>
                        <div className="font-semibold text-slate-700 truncate">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : row.issuedAt || 'Confirmed'}
                        </div>
                      </div>
                    </div>

                    {/* Rejected Box Notice (if status === 'rejected') */}
                    {row.status === 'rejected' && (
                      <div className="mt-3.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        <div className="font-black text-rose-700 flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>Rejected by Admin</span>
                        </div>
                        <div className="mt-1 font-semibold text-rose-900">
                          <span className="font-bold text-rose-700">Reason: </span>
                          {row.rejectionReason || 'No specific rejection reason provided.'}
                        </div>
                      </div>
                    )}

                    {/* Actions: ✓ Approve, ✕ Reject, 🗑 Delete */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void statusAction(row, 'approved')}
                        disabled={row.status === 'approved'}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          row.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 opacity-60 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{row.status === 'approved' ? 'Approved' : 'Approve'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void statusAction(row, 'rejected')}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      {onDeleteRegistration && (
                        <button
                          type="button"
                          onClick={() => setDeletingRegNo(row.registrationNo)}
                          className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {scopedRows.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
                  No registrations found matching the current scope and filter.
                </div>
              )}
            </section>
          )}

          {/* ================================================================ */}
          {/* TAB 2: SUPER ADMIN SITE SETTINGS (Upload Fields & Forms)         */}
          {/* ================================================================ */}
          {tab === 'site' && admin.role === 'super_admin' && draft && (
            <section className="p-4 sm:p-6 space-y-6">
              {/* Header with Save Button */}
              <div className="flex flex-wrap gap-3 justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Site Settings & Content</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure official branding, event parameters, and payment gateways.
                  </p>
                </div>
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* 1. VISUAL BRANDING (UPLOAD FIELDS INSTEAD OF RAW URLS) */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="font-black text-slate-900">Visual Branding & Assets</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload official logos and banners. Previews update immediately.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Upload Logo */}
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-800 block">Upload Logo</span>
                    <div className="w-full h-28 rounded-xl border border-dashed border-slate-300 bg-white grid place-items-center overflow-hidden relative">
                      {draft.logo ? (
                        <img src={draft.logo} alt="Site Logo" className="max-h-full max-w-full object-contain p-2" />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                          <span className="text-[11px] block mt-1">No Logo</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAsset(file, 'logo');
                      }}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingField === 'logo'}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === 'logo' ? 'Uploading...' : 'Upload Logo'}</span>
                      </button>
                      {draft.logo && (
                        <button
                          type="button"
                          onClick={() => updateSite({ logo: null })}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="Remove logo"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Favicon */}
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-800 block">Upload Favicon</span>
                    <div className="w-full h-28 rounded-xl border border-dashed border-slate-300 bg-white grid place-items-center overflow-hidden relative">
                      {draft.favicon ? (
                        <img src={draft.favicon} alt="Favicon" className="w-12 h-12 object-contain p-1" />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                          <span className="text-[11px] block mt-1">No Favicon</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={faviconInputRef}
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAsset(file, 'favicon');
                      }}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploadingField === 'favicon'}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === 'favicon' ? 'Uploading...' : 'Upload Favicon'}</span>
                      </button>
                      {draft.favicon && (
                        <button
                          type="button"
                          onClick={() => updateSite({ favicon: null })}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="Remove favicon"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Banner */}
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-800 block">Upload Banner</span>
                    <div className="w-full h-28 rounded-xl border border-dashed border-slate-300 bg-white grid place-items-center overflow-hidden relative">
                      {draft.banner ? (
                        <img src={draft.banner} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                          <span className="text-[11px] block mt-1">No Banner</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={bannerInputRef}
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAsset(file, 'banner');
                      }}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadingField === 'banner'}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === 'banner' ? 'Uploading...' : 'Upload Banner'}</span>
                      </button>
                      {draft.banner && (
                        <button
                          type="button"
                          onClick={() => updateSite({ banner: null })}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="Remove banner"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Hero Background */}
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-800 block">Upload Hero Background</span>
                    <div className="w-full h-28 rounded-xl border border-dashed border-slate-300 bg-white grid place-items-center overflow-hidden relative">
                      {draft.hero_background ? (
                        <img src={draft.hero_background} alt="Hero Background" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                          <span className="text-[11px] block mt-1">Default Gradient</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={heroBgInputRef}
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAsset(file, 'hero_background');
                      }}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => heroBgInputRef.current?.click()}
                        disabled={uploadingField === 'hero_background'}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === 'hero_background' ? 'Uploading...' : 'Upload Image'}</span>
                      </button>
                      {draft.hero_background && (
                        <button
                          type="button"
                          onClick={() => updateSite({ hero_background: null })}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                          title="Clear hero background"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. GENERAL EVENT DETAILS FORM */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="font-black text-slate-900">General Event Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-xs font-bold text-slate-700">
                    Website Name
                    <input
                      value={draft.website_name || ''}
                      onChange={e => updateSite({ website_name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Event Name
                    <input
                      value={draft.event_name || ''}
                      onChange={e => updateSite({ event_name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Hero Title
                    <input
                      value={draft.hero_title || ''}
                      onChange={e => updateSite({ hero_title: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Hero Subtitle
                    <textarea
                      value={draft.hero_subtitle || ''}
                      onChange={e => updateSite({ hero_subtitle: e.target.value })}
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Event Date
                    <input
                      type="date"
                      value={draft.event_date || ''}
                      onChange={e => updateSite({ event_date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Event Time
                    <input
                      type="time"
                      value={(draft.event_time || '').slice(0, 5)}
                      onChange={e => updateSite({ event_time: e.target.value + ':00' })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Venue
                    <input
                      value={draft.venue || ''}
                      onChange={e => updateSite({ venue: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Last Registration Date
                    <input
                      type="date"
                      value={(draft.content_blocks_json as any)?.registrationDeadline || ''}
                      onChange={e => updateBlocks({ registrationDeadline: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* 3. PAYMENT SETTINGS (PROPER FORM SYSTEM - NO RAW JSON) */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-black text-slate-900">Payment Gateway Settings</h3>
                    <p className="text-xs text-slate-500">
                      Configure bKash, Nagad, fee amounts, and student checkout instructions.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <label className="text-xs font-bold text-slate-700">
                    Registration Fee Amount
                    <input
                      type="number"
                      value={draft.registration_fee || paymentConfig.registrationFee || 500}
                      onChange={e => {
                        const val = Number(e.target.value);
                        updateSite({ registration_fee: val });
                        updatePaymentConfig({ registrationFee: val });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>

                  <label className="text-xs font-bold text-slate-700">
                    Currency Symbol / Code
                    <input
                      type="text"
                      value={paymentConfig.currency || 'BDT'}
                      onChange={e => updatePaymentConfig({ currency: e.target.value })}
                      placeholder="e.g. BDT"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                </div>

                {/* bKash Configuration */}
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                      bKash Gateway
                    </span>
                    <label className="inline-flex items-center cursor-pointer gap-2">
                      <input
                        type="checkbox"
                        checked={paymentConfig.bkashEnabled ?? true}
                        onChange={e => updatePaymentConfig({ bkashEnabled: e.target.checked })}
                        className="rounded text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-xs font-semibold text-slate-600">
                        {paymentConfig.bkashEnabled ?? true ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs text-slate-600">
                      Male Students bKash Number
                      <input
                        type="text"
                        value={paymentConfig.maleBkashNumber || '01712-345678'}
                        onChange={e => updatePaymentConfig({ maleBkashNumber: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
                      />
                    </label>
                    <label className="text-xs text-slate-600">
                      Female Students bKash Number
                      <input
                        type="text"
                        value={paymentConfig.femaleBkashNumber || '01812-345678'}
                        onChange={e => updatePaymentConfig({ femaleBkashNumber: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
                      />
                    </label>
                  </div>
                </div>

                {/* Nagad Configuration */}
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      Nagad Gateway
                    </span>
                    <label className="inline-flex items-center cursor-pointer gap-2">
                      <input
                        type="checkbox"
                        checked={paymentConfig.nagadEnabled ?? true}
                        onChange={e => updatePaymentConfig({ nagadEnabled: e.target.checked })}
                        className="rounded text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-xs font-semibold text-slate-600">
                        {paymentConfig.nagadEnabled ?? true ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs text-slate-600">
                      Male Students Nagad Number
                      <input
                        type="text"
                        value={paymentConfig.maleNagadNumber || '01912-345678'}
                        onChange={e => updatePaymentConfig({ maleNagadNumber: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
                      />
                    </label>
                    <label className="text-xs text-slate-600">
                      Female Students Nagad Number
                      <input
                        type="text"
                        value={paymentConfig.femaleNagadNumber || '01612-345678'}
                        onChange={e => updatePaymentConfig({ femaleNagadNumber: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
                      />
                    </label>
                  </div>
                </div>

                {/* Payment Instructions */}
                <label className="block text-xs font-bold text-slate-700">
                  Payment Instructions for Students
                  <textarea
                    value={paymentConfig.instructions || ''}
                    onChange={e => updatePaymentConfig({ instructions: e.target.value })}
                    rows={2}
                    placeholder="e.g. Please send the exact amount as Personal / Send Money. Keep TrxID for verification."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal focus:border-indigo-500 focus:outline-none text-xs"
                  />
                </label>
              </div>

              {/* 4. QUICK INFORMATION CARDS */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-black text-slate-900">Quick Information Cards</h3>
                    <p className="text-xs text-slate-500">Highlights displayed on the event landing page.</p>
                  </div>
                  <button
                    onClick={addCard}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Card</span>
                  </button>
                </div>
                <div className="grid gap-3">
                  {((draft.cards_json as any[]) || []).map((c: any, i: number) => (
                    <div
                      key={c.id || i}
                      className="grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center rounded-xl bg-slate-50 p-2.5 border border-slate-200"
                    >
                      <input
                        value={c.title || ''}
                        onChange={e => setCard(i, { title: e.target.value })}
                        placeholder="Card Title"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold"
                      />
                      <input
                        value={c.description || ''}
                        onChange={e => setCard(i, { description: e.target.value })}
                        placeholder="Description"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        value={c.subDetail || ''}
                        onChange={e => setCard(i, { subDetail: e.target.value })}
                        placeholder="Sub Detail"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500"
                      />
                      <button
                        onClick={() => setCard(i, { visible: c.visible === false })}
                        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                        title={c.visible === false ? 'Hidden' : 'Visible'}
                      >
                        {c.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => removeCard(i)}
                        className="p-2 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600"
                        title="Delete card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Save Changes Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </section>
          )}

          {/* ================================================================ */}
          {/* TAB 3: PDF SETTINGS (Requirement 7: New dedicated tab)            */}
          {/* ================================================================ */}
          {tab === 'pdf' && admin.role === 'super_admin' && draft && (
            <section className="p-4 sm:p-6 space-y-6">
              {/* Header with Save Button */}
              <div className="flex flex-wrap gap-3 justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900">PDF Settings & Ledger Layout</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize the layout, header, signatures, and watermark of invitation passes and ledger PDFs.
                  </p>
                </div>
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>

              {/* PDF Settings Grid */}
              <div className="grid lg:grid-cols-12 gap-6">
                {/* Left Column: Toggles and Text Controls */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Toggles Panel */}
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-3.5">
                    <h3 className="font-black text-sm text-slate-900 border-b pb-2">Component Visibility Toggles</h3>

                    {/* Header Logo */}
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Header Logo</span>
                        <span className="text-[11px] text-slate-500">Show official badge/logo at top of PDF pass</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdfConfig.headerLogoEnabled ?? true}
                          onChange={e => updatePdfConfig({ headerLogoEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between py-1 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Footer</span>
                        <span className="text-[11px] text-slate-500">Display official footer text at bottom</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdfConfig.footerEnabled ?? true}
                          onChange={e => updatePdfConfig({ footerEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* Student Photo */}
                    <div className="flex items-center justify-between py-1 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Student Photo</span>
                        <span className="text-[11px] text-slate-500">Include student avatar/photo in invitation card</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdfConfig.studentPhotoEnabled ?? true}
                          onChange={e => updatePdfConfig({ studentPhotoEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* Signature */}
                    <div className="flex items-center justify-between py-1 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Signature Area</span>
                        <span className="text-[11px] text-slate-500">Display convener signature block</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdfConfig.signatureEnabled ?? true}
                          onChange={e => updatePdfConfig({ signatureEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* Watermark */}
                    <div className="flex items-center justify-between py-1 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Watermark</span>
                        <span className="text-[11px] text-slate-500">Render security watermark behind document</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pdfConfig.watermarkEnabled ?? true}
                          onChange={e => updatePdfConfig({ watermarkEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Custom Texts Panel */}
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                    <h3 className="font-black text-sm text-slate-900 border-b pb-2">Custom Text Customization</h3>

                    <label className="block text-xs font-bold text-slate-700">
                      Custom Signature Text
                      <input
                        type="text"
                        value={pdfConfig.signatureText || 'Executive Convener'}
                        onChange={e => updatePdfConfig({ signatureText: e.target.value })}
                        placeholder="e.g. Executive Convener"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal focus:border-indigo-500 focus:outline-none"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700">
                      Custom Signature Sub-Title
                      <input
                        type="text"
                        value={pdfConfig.signatureTitle || 'Authorized Rag Day 2027 Committee'}
                        onChange={e => updatePdfConfig({ signatureTitle: e.target.value })}
                        placeholder="e.g. Authorized Rag Day 2027 Committee"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal focus:border-indigo-500 focus:outline-none"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700">
                      Custom Footer Text
                      <textarea
                        value={
                          pdfConfig.footerText ||
                          'RD27 Rag Day 2027 Official Record · Unauthorized duplication prohibited.'
                        }
                        onChange={e => updatePdfConfig({ footerText: e.target.value })}
                        rows={2}
                        placeholder="Enter custom footer note..."
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal focus:border-indigo-500 focus:outline-none"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700">
                      Watermark Text
                      <input
                        type="text"
                        value={pdfConfig.watermarkLogo || 'RD27 OFFICIAL'}
                        onChange={e => updatePdfConfig({ watermarkLogo: e.target.value })}
                        placeholder="e.g. RD27 OFFICIAL"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal focus:border-indigo-500 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>

                {/* Right Column: PDF LIVE PREVIEW */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-black text-sm text-slate-900">Live PDF Preview</h3>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Interactive Mockup
                      </span>
                    </div>

                    {/* Staged Pass Preview Card */}
                    <div className="rounded-2xl border border-slate-800 bg-[#0F172A] text-white p-5 shadow-xl relative overflow-hidden space-y-4">
                      {/* Watermark Overlay (if enabled) */}
                      {(pdfConfig.watermarkEnabled ?? true) && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none opacity-5">
                          <span className="text-4xl sm:text-5xl font-black rotate-[-25deg] uppercase tracking-widest text-white">
                            {pdfConfig.watermarkLogo || 'RD27 OFFICIAL'}
                          </span>
                        </div>
                      )}

                      {/* Header Logo & Title */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
                        <div className="flex items-center gap-3">
                          {(pdfConfig.headerLogoEnabled ?? true) && (
                            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20">
                              {draft.logo ? (
                                <img src={draft.logo} alt="Header Logo" className="w-full h-full object-contain" />
                              ) : (
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                              )}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-black text-white tracking-wide">
                              {draft.event_name || 'Rag Day 27 (RD27)'}
                            </div>
                            <div className="text-[10px] text-cyan-400 font-semibold">
                              Official Invitation Pass
                            </div>
                          </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                          Approved
                        </div>
                      </div>

                      {/* Student Body (with Photo toggle) */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 relative z-10">
                        {(pdfConfig.studentPhotoEnabled ?? true) && (
                          <div className="w-12 h-12 rounded-xl bg-indigo-600/60 border border-white/20 flex items-center justify-center font-bold text-white shrink-0">
                            JD
                          </div>
                        )}
                        <div className="text-xs space-y-0.5">
                          <div className="font-extrabold text-white">Sample Student: John Doe</div>
                          <div className="text-[11px] text-slate-300 font-mono">
                            Reg: RD27-042 · Roll: 1024 · Sec: ScB1
                          </div>
                          <div className="text-[10px] text-cyan-300">
                            Jersey: STRIKER #27 (Size L)
                          </div>
                        </div>
                      </div>

                      {/* Signature Area (if enabled) */}
                      {(pdfConfig.signatureEnabled ?? true) && (
                        <div className="flex justify-end pt-1 relative z-10">
                          <div className="text-right border-t border-white/20 pt-1.5 w-44">
                            <div className="font-mono text-xs font-bold text-slate-200">
                              {pdfConfig.signatureText || 'Executive Convener'}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {pdfConfig.signatureTitle || 'Authorized Rag Day 2027 Committee'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer (if enabled) */}
                      {(pdfConfig.footerEnabled ?? true) && (
                        <div className="text-[9px] text-slate-400 text-center pt-2 border-t border-white/10 relative z-10 leading-snug">
                          {pdfConfig.footerText ||
                            'RD27 Rag Day 2027 Official Record · Unauthorized duplication prohibited.'}
                        </div>
                      )}
                    </div>

                    {/* Test Button & Save Settings */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const sampleRecord: InvitationRecord = {
                            registrationNo: 'RD27-042',
                            name: 'John Doe',
                            roll: '1024',
                            id: '2027-SC-042',
                            group: 'Science',
                            section: 'ScB1',
                            status: 'approved',
                            gender: 'male',
                            photoUrl: '',
                            jerseyName: 'STRIKER',
                            jerseyNumber: '27',
                            jerseySize: 'L',
                            senderNumber: '01700-000000',
                            paymentTime: '10:30 AM',
                            transactionId: 'TXN-PREVIEW-99',
                            createdAt: new Date().toISOString(),
                          };
                          generateInvitationCardPDF(
                            sampleRecord,
                            {
                              pdfLogo: draft.logo || '',
                              pdfHeader: draft.event_name || 'RAG DAY 27',
                              pdfSubHeader: 'Official Registration Pass',
                              watermarkLogo: pdfConfig.watermarkLogo || 'RD27 OFFICIAL',
                              watermarkOpacity: (pdfConfig.watermarkEnabled ?? true) ? 0.08 : 0,
                              footerText: (pdfConfig.footerEnabled ?? true) ? (pdfConfig.footerText || '') : '',
                              signatureArea: (pdfConfig.signatureEnabled ?? true) ? (pdfConfig.signatureText || '') : '',
                              signatureTitle: (pdfConfig.signatureEnabled ?? true) ? (pdfConfig.signatureTitle || '') : '',
                              approvalText: '',
                              invitationCardTitle: draft.event_name ? `${draft.event_name} - PASS` : 'RD27 PASS',
                              customNotes: '',
                            } as any,
                            websiteSettings
                          );
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Test Download Sample PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void save()}
                        disabled={saving}
                        className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================ */}
          {/* TAB 4: SECTION MANAGEMENT (Requirement 9: Add/Edit/Delete/Hide)  */}
          {/* ================================================================ */}
          {tab === 'sections' && admin.role === 'super_admin' && draft && (
            <section className="p-4 sm:p-6 space-y-6">
              {/* Header with Save Button */}
              <div className="flex flex-wrap gap-3 justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Academic Section Management</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure classroom sections for Science, Business Studies, and Humanities. Changes update
                    registration immediately.
                  </p>
                </div>
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* Sections Catalog by Group & Gender */}
              {GROUPS.flatMap(group =>
                ['male', 'female'].map(gender => ({ group, gender: gender as any }))
              ).map(({ group, gender }) => {
                const categoryRows = sections
                  .map((s: any, i: number) => ({ ...s, __index: i }))
                  .filter(s => s.group === group && s.gender === gender);

                return (
                  <div key={group + gender} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                          }`}
                        />
                        <h3 className="font-extrabold text-sm text-slate-900">
                          {group} · {gender === 'male' ? 'Male (Boys)' : 'Female (Girls)'}
                        </h3>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          ({categoryRows.length} sections)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => addSection(gender, group)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Section</span>
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                      {categoryRows.map((s: any) => (
                        <div
                          key={s.id || s.__index}
                          className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all ${
                            s.active === false
                              ? 'bg-slate-100/80 border-slate-300 opacity-60'
                              : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <input
                            value={s.code || ''}
                            onChange={e =>
                              setSection(s.__index, {
                                code: e.target.value.toUpperCase(),
                                displayName: e.target.value.toUpperCase(),
                              })
                            }
                            placeholder="Code"
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 uppercase focus:border-indigo-500 focus:outline-none"
                          />

                          <div className="flex items-center gap-1">
                            {/* Hide / Show Toggle Button */}
                            <button
                              type="button"
                              onClick={() => setSection(s.__index, { active: s.active === false })}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                s.active === false
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={s.active === false ? 'Section is Hidden (Click to show)' : 'Section is Active (Click to hide)'}
                            >
                              {s.active === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => removeSection(s.__index)}
                              className="p-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors"
                              title="Delete section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => void save()}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </section>
          )}

          {/* ================================================================ */}
          {/* TAB 5: ADMIN IDENTITY MANAGEMENT                                 */}
          {/* ================================================================ */}
          {tab === 'admins' && admin.role === 'super_admin' && (
            <section className="p-4 sm:p-6 space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Admin Identity Management</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Link Supabase Auth users to administrator roles or manage active system accounts.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAdminDraft({
                        auth_user_id: '',
                        username: '',
                        full_name: '',
                        role: 'male_admin',
                        active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                      setAdminError('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Admin Link</span>
                  </button>
                </div>
                {adminError && (
                  <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 p-3 text-xs">
                    {adminError}
                  </div>
                )}
              </div>

              {adminDraft && (
                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm grid md:grid-cols-2 gap-4">
                  <label className="text-xs font-bold text-slate-700">
                    Auth User ID
                    <input
                      value={adminDraft.auth_user_id}
                      onChange={e => setAdminDraft({ ...adminDraft, auth_user_id: e.target.value })}
                      placeholder="e.g. 753bf88a-..."
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Username
                    <input
                      value={adminDraft.username || ''}
                      onChange={e => setAdminDraft({ ...adminDraft, username: e.target.value })}
                      placeholder="e.g. boysadmin"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Full Name
                    <input
                      value={adminDraft.full_name}
                      onChange={e => setAdminDraft({ ...adminDraft, full_name: e.target.value })}
                      placeholder="e.g. Admin Name"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Role
                    <select
                      value={adminDraft.role}
                      onChange={e => setAdminDraft({ ...adminDraft, role: e.target.value as any })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="male_admin">Male Admin</option>
                      <option value="female_admin">Female Admin</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={adminDraft.active}
                      onChange={e => setAdminDraft({ ...adminDraft, active: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Active Account</span>
                  </label>
                  <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setAdminDraft(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void saveAdminDraft()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-200 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Link</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {adminRows.map(a => (
                  <article
                    key={a.auth_user_id}
                    className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-wrap gap-3 items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{a.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono break-all">{a.auth_user_id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {a.username || 'No username'} · <span className="font-semibold uppercase">{a.role}</span> ·{' '}
                        {a.active ? (
                          <span className="text-emerald-600 font-semibold">Active</span>
                        ) : (
                          <span className="text-slate-400">Disabled</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAdminDraft({ ...a })}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          void (async () => {
                            try {
                              await deleteAdminProfileFromSupabase(a.auth_user_id);
                              setAdminRows(prev => prev.filter(x => x.auth_user_id !== a.auth_user_id));
                              showToast('Admin link removed.');
                            } catch (e: any) {
                              setAdminError(e?.message || 'Unable to remove admin link.');
                            }
                          })()
                        }
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* REJECTION REASON MODAL (Requirement 4: Reason strictly required) */}
      {/* ================================================================ */}
      {rejecting && (
        <div className="fixed inset-0 z-[250] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Reject Registration</h3>
              <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                {rejecting}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Please enter the official reason for rejecting this registration. The student will see this reason in their portal. <strong className="text-rose-600">Rejection reason is strictly required.</strong>
            </p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid Transaction ID, payment reference not found in bKash ledger..."
              className="mt-3 w-full min-h-28 rounded-xl border border-slate-300 p-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none placeholder:text-slate-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejecting(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmReject()}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-200 flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DELETE CONFIRMATION MODAL                                        */}
      {/* ================================================================ */}
      {deletingRegNo && (
        <div className="fixed inset-0 z-[250] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Delete Registration</h3>
                <span className="font-mono text-xs font-bold text-slate-500">{deletingRegNo}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete registration <strong>{deletingRegNo}</strong> from the database? This action will remove the record from both Supabase and website.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRegNo(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteRegistration && deletingRegNo) {
                    await onDeleteRegistration(deletingRegNo);
                    showToast(`Registration ${deletingRegNo} deleted.`);
                    setDeletingRegNo(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
