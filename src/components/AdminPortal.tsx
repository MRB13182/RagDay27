import React, { useState, useRef, useEffect } from 'react';
import {
  InvitationRecord,
  InvitationStatus,
  EventCard,
  WebsiteSettings,
  BrandingSettings,
  PdfSettings,
  PaymentSettings,
  JerseyShowcaseSettings,
  JerseyItem,
  SectionOrder,
  AdminFileItem,
  AdminFileCategory,
} from '../types';
import { DEFAULT_PAYMENT_SETTINGS, DEFAULT_JERSEY_SHOWCASE_SETTINGS } from '../data/mockData';
import {
  Lock,
  X,
  Menu,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Settings,
  Image as ImageIcon,
  Type,
  Users,
  LogOut,
  Save,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit,
  FileText,
  Palette,
  Layout,
  Upload,
  BarChart3,
  ExternalLink,
  Shirt,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  Filter,
  Copy,
  Wallet,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Database,
  FileSpreadsheet,
  CheckCheck,
  Cloud,
  HardDrive,
  Terminal,
  FileCode,
} from 'lucide-react';
import {
  supabase,
  uploadFileToStorage,
  checkSupabaseHealth,
  SupabaseHealthStatus,
  SUPABASE_URL,
  COMPLETE_SUPABASE_SCHEMA_SQL,
  fetchAdminFilesFromSupabase,
  saveAdminFileToSupabase,
  deleteAdminFileFromSupabase,
} from '../lib/supabase';
import { generateRegistrationListPDF } from '../utils/pdfGenerator';
import { renderCardIcon } from './EventInformationSection';
import { BkashLogo, NagadLogo } from './PaymentBrandLogos';
import { EventCountdown } from './EventCountdown';

export type AdminRole = 'super_admin' | 'male_admin' | 'female_admin' | null;

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: InvitationRecord[];
  onUpdateStatus: (registrationNo: string, newStatus: InvitationStatus, reason?: string) => void;
  onDeleteRegistration?: (registrationNo: string) => void;
  websiteSettings: WebsiteSettings;
  onUpdateWebsiteSettings: (newSettings: WebsiteSettings) => void;
  brandingSettings: BrandingSettings;
  onUpdateBrandingSettings: (newSettings: BrandingSettings) => void;
  pdfSettings: PdfSettings;
  onUpdatePdfSettings: (newSettings: PdfSettings) => void;
  paymentSettings: PaymentSettings;
  onUpdatePaymentSettings: (newSettings: PaymentSettings) => void;
  eventCards: EventCard[];
  onUpdateEventCards: (cards: EventCard[]) => void;
  jerseyShowcaseSettings?: JerseyShowcaseSettings;
  onUpdateJerseyShowcase?: (newSettings: JerseyShowcaseSettings) => void;
  onEditRegistration?: (registrationNo: string, updates: Partial<InvitationRecord>) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  invitations,
  onUpdateStatus,
  onDeleteRegistration,
  websiteSettings,
  onUpdateWebsiteSettings,
  brandingSettings,
  onUpdateBrandingSettings,
  pdfSettings,
  onUpdatePdfSettings,
  paymentSettings = DEFAULT_PAYMENT_SETTINGS,
  onUpdatePaymentSettings,
  eventCards,
  onUpdateEventCards,
  jerseyShowcaseSettings = DEFAULT_JERSEY_SHOWCASE_SETTINGS,
  onUpdateJerseyShowcase,
  onEditRegistration,
}) => {
    const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<AdminRole>(null);

  // Delete Permanently Modal State
  const [deletingRegNo, setDeletingRegNo] = useState<string | null>(null);

  // Add / Edit Card Modal
  const [editingCard, setEditingCard] = useState<EventCard | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Logo Preview Modal & Ref
  const [showLogoPreviewModal, setShowLogoPreviewModal] = useState(false);
  const headerLogoFileInputRef = u  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim(),
      password: adminPassword,
    });
    if (error || !data.user) {
      setAuthError('Invalid email or password.');
      setAuthLoading(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('role, active')
      .eq('auth_user_id', data.user.id)
      .eq('active', true)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setAuthError('This account is not authorized for the admin portal.');
      setAuthLoading(false);
      return;
    }

    setCurrentRole(profile.role as AdminRole);
    setActiveTab(profile.role === 'super_admin' ? 'overview' : 'registrations');
    setAdminEmail('');
    setAdminPassword('');
    setLocalWebsite(websiteSettings);
    setLocalBranding(brandingSettings);
    setLocalPdf(pdfSettings);
    setLocalCards(eventCards);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentRole(null);
    setAdminEmail('');
    setAdminPassword('');
    setAuthError('');
    setIsMobileDrawerOpen(false);
    onClose();
  };

  const showSaveSuccess = (message: string = 'Updated & applied instantly!') => {
    setSaveToastMessage(message);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleEventDateUpdate = (
    field: 'eventDay' | 'eventMonth' | 'eventYear' | 'eventTime',
    value: any
  ) => {
    const updated: WebsiteSettings = {
      ...localWebsite,
      [field]: value,
    };
    const day = field === 'eventDay' ? Number(value) : (updated.eventDay || 27);
    const month = field === 'eventMonth' ? String(value) : (updated.eventMonth || 'November');
    const year = field === 'eventYear' ? Number(value) : (updated.eventYear || 2027);
    updated.eventDate = `${month} ${day}, ${year}`;
    if (field === 'eventTime') {
      updated.eventTime = String(value);
    }
    setLocalWebsite(updated);
    // Instant live synchronization everywhere
    onUpdateWebsiteSettings(updated);
  };

  const handleConfirmDelete = () => {
    if (deletingRegNo) {
      if (onDeleteRegistration) {
        onDeleteRegistration(deletingRegNo);
      }
      showSaveSuccess(`Registration ${deletingRegNo} permanently deleted.`);
      setDeletingRegNo(null);
    }
  };

  const handleSaveEventSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateWebsiteSettings(localWebsite);
    showSaveSuccess('Event target date & live countdown updated!');
  };

  const handleSaveWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWebsiteSettings(localWebsite);
    showSaveSuccess('Website content updated!');
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBrandingSettings(localBranding);
    showSaveSuccess('Visual assets updated!');
  };

  const handleSavePdf = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePdfSettings(localPdf);
    showSaveSuccess('PDF document settings updated!');
  };

  const handleSavePayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdatePaymentSettings(localPayment);
    showSaveSuccess('Payment settings updated & live on registration form!');
  };

  // PDF Official Logo Handlers
  const handlePdfLogoUpload = async (file: File | null) => {
    if (!file) return;
    const publicUrl = await uploadFileToStorage(file, 'logos', 'pdf_logo');
    const updated = { ...localPdf, pdfLogo: publicUrl };
    setLocalPdf(updated);
    onUpdatePdfSettings(updated);
    showSaveSuccess('PDF official logo uploaded to Supabase Storage!');
  };

  const handleRemovePdfLogo = () => {
    const updated = { ...localPdf, pdfLogo: '' };
    setLocalPdf(updated);
    onUpdatePdfSettings(updated);
    showSaveSuccess();
  };

  // Card Operations
  const handleToggleCardVisibility = (cardId: string) => {
    const updated = localCards.map(c => (c.id === cardId ? { ...c, visible: !c.visible } : c));
    setLocalCards(updated);
    onUpdateEventCards(updated);
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = localCards.filter(c => c.id !== cardId);
    setLocalCards(updated);
    onUpdateEventCards(updated);
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localCards.length) return;
    const updated = [...localCards];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    const reordered = updated.map((c, i) => ({ ...c, order: i + 1 }));
    setLocalCards(reordered);
    onUpdateEventCards(reordered);
  };

  const handleSaveCardModal = (card: EventCard) => {
    let updated: EventCard[];
    if (isAddingCard) {
      updated = [...localCards, card];
    } else {
      updated = localCards.map(c => (c.id === card.id ? card : c));
    }
    setLocalCards(updated);
    onUpdateEventCards(updated);
    setEditingCard(null);
    setIsAddingCard(false);
  };

  // Image Upload helper for Branding
  const handleFileUpload = async (field: keyof BrandingSettings, file: File | null) => {
    if (!file) return;
    const folder = field.includes('jersey') ? 'jerseys' : field.includes('banner') ? 'banners' : 'logos';
    const publicUrl = await uploadFileToStorage(file, folder);
    const updated = {
      ...localBranding,
      [field]: publicUrl,
    };
    setLocalBranding(updated);
    onUpdateBrandingSettings(updated);
    showSaveSuccess(`${field} uploaded to Supabase Storage!`);
  };

  // Filtered registrations based on active role
  const getRoleFilteredRecords = () => {
    let list = invitations;
    if (currentRole === 'male_admin') {
      list = list.filter(r => r.gender === 'male');
    } else if (currentRole === 'female_admin') {
      list = list.filter(r => r.gender === 'female');
    }

    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    if (groupFilter !== 'all') {
      list = list.filter(r => r.group === groupFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.name.toLowerCase().includes(q) ||
          r.registrationNo.toLowerCase().includes(q) ||
          r.roll.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.jerseyName.toLowerCase().includes(q) ||
          r.section.toLowerCase().includes(q) ||
          r.group.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredRegistrations = getRoleFilteredRecords();

  // Statistics for Overview
  const totalCount = invitations.length;
  const approvedCount = invitations.filter(i => i.status === 'approved').length;
  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const rejectedCount = invitations.filter(i => i.status === 'rejected').length;
  const maleCount = invitations.filter(i => i.gender === 'male').length;
  const femaleCount = invitations.filter(i => i.gender === 'female').length;
  const scienceCount = invitations.filter(i => i.group === 'Science').length;
  const businessCount = invitations.filter(i => i.group === 'Business Studies').length;
  const humanitiesCount = invitations.filter(i => i.group === 'Humanities').length;
  const estimatedRevenue = approvedCount * (localPayment.registrationFee || 500);

  const handleDownloadPDF = () => {
    const list = getRoleFilteredRecords();
    let title = 'RD27_All_Registrations';
    if (currentRole === 'male_admin') title = 'RD27_Male_Registrations';
    if (currentRole === 'female_admin') title = 'RD27_Female_Registrations';
    generateRegistrationListPDF(list,title,currentRole || 'super_admin',localPdf,websiteSettings);
  };

  const handleDownloadExcel = async () => {
    const gender = currentRole === 'male_admin' ? 'male' : currentRole === 'female_admin' ? 'female' : undefined;
    const res = await getAdminExportData(gender);
    if (res.error) {
      showSaveSuccess(res.error);
      return;
    }
    const list = res.data;
    const headers = ['Registration No','Full Name','Gender','Roll','Student ID','Group','Section','Jersey Name','Jersey Number','Jersey Size','Contact Number','Payment Number','Payment Time','Transaction ID','Payment Method','Amount','Status','Rejection Reason','Registration Date'];
    const escapeCsv = (val:any) => val === null || val === undefined ? '""' : '"' + String(val).replace(/"/g,'""') + '"';
    const rows = list.map((r:any) => [
      escapeCsv(`RD27-${String(r.registration_no).padStart(3,'0')}`),escapeCsv(r.student_name),escapeCsv(r.gender),escapeCsv(r.roll),
      escapeCsv(r.student_id),escapeCsv(r.group_name),escapeCsv(r.section),escapeCsv(r.jersey_name),escapeCsv(r.jersey_number),
      escapeCsv(r.jersey_size),escapeCsv(r.contact_number),escapeCsv(r.sender_number),escapeCsv(r.payment_time),
      escapeCsv(r.transaction_id),escapeCsv(r.payment_method),escapeCsv(r.registration_fee),escapeCsv(r.status),
      escapeCsv(r.rejection_reason),escapeCsv(r.created_at)
    ]);
    const blob = new Blob(['\uFEFF'+[headers.join(','),...rows.map((row:any[])=>row.join(','))].join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url;
    link.download=`RD27_Registrations_${currentRole || 'super_admin'}_${Date.now()}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900 flex flex-col font-sans select-none sm:select-auto">
      {/* Hidden file input for header PDF logo */}
      <input
        type="file"
        ref={headerLogoFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={e => handlePdfLogoUpload(e.target.files?.[0] || null)}
      />

      {/* Hidden file input for settings PDF logo */}
      <input
        type="file"
        ref={settingsLogoFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={e => handlePdfLogoUpload(e.target.files?.[0] || null)}
      />

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="fixed top-5 right-5 z-[80] bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{saveToastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 1: LOGIN PASSCODE SCREEN */}
      {/* ======================================================== */}
      {!currentRole ? (
        <div className="flex-1 w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              title="Return to Website"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-indigo-500/5">
              <Lock className="w-7 h-7" />
            </div>

            <h2 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">
              Admin Committee Access
            </h2>
            <p className="text-xs text-slate-600 mt-1 mb-6">
              Sign in with your Supabase Auth admin account. Your role is loaded securely from the database.
            </p>

            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={e => {
                    setAdminEmail(e.target.value);
                    setAuthError('');
                  }}
                  autoFocus
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Admin Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password..."
                  value={adminPassword}
                  onChange={e => {
                    setAdminPassword(e.target.value);
                    setAuthError('');
                  }}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{authLoading ? 'Signing in…' : 'Sign In & Open Dashboard'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold text-center transition-colors"
              >
                Back to Public Website
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* SCREEN 2: FULL RESPONSIVE ADMIN DASHBOARD PAGE */
        /* ======================================================== */
        <div className="flex-1 w-full h-full flex flex-col bg-slate-100 overflow-hidden">
          {/* TOP HEADER BAR */}
          <header className="h-16 bg-slate-900 border-b border-slate-800 text-white px-3 sm:px-6 flex items-center justify-between shrink-0 z-30">
            {/* Left: Hamburger (mobile) + Branding & Role */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                  RD
                </div>
                <div className="hidden xs:block text-left">
                  <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 leading-tight">
                    <span>Rag Day 27</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      CMS
                    </span>
                  </h1>
                  <span className="text-[10px] text-slate-400 block leading-none">
                    Batch 2027 Console
                  </span>
                </div>
              </div>

              {/* Role Pill */}
              <div className="ml-1 sm:ml-2">
                {currentRole === 'super_admin' && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Super Admin
                  </span>
                )}
                {currentRole === 'male_admin' && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Male Admin
                  </span>
                )}
                {currentRole === 'female_admin' && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                    Female Admin
                  </span>
                )}
              </div>
            </div>

            {/* Right: PDF Official Logo Upload Area (Super Admin) + Export PDF + Exit */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* REQUIREMENT 2: SUPER ADMIN HEADER LOGO AREA */}
              {currentRole === 'super_admin' && (
                <div className="flex items-center">
                  {localPdf.pdfLogo ? (
                    <div className="flex items-center gap-1 sm:gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2 py-1 shadow-inner">
                      {/* Logo Preview Button */}
                      <button
                        type="button"
                        onClick={() => setShowLogoPreviewModal(true)}
                        className="relative group w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden bg-white border border-slate-600 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all shrink-0"
                        title="Click to Preview PDF Official Logo"
                      >
                        <img
                          src={localPdf.pdfLogo}
                          alt="Official PDF Logo"
                          className="w-full h-full object-contain p-0.5"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </button>

                      <div className="hidden md:block text-left text-xs leading-none mr-1">
                        <span className="block font-bold text-white text-[11px]">PDF Logo</span>
                        <span className="text-[9px] text-emerald-400 font-semibold">Active in PDFs</span>
                      </div>

                      {/* Replace */}
                      <button
                        type="button"
                        onClick={() => headerLogoFileInputRef.current?.click()}
                        className="p-1 sm:px-2 sm:py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Replace Official PDF Logo"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline text-[11px]">Replace</span>
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={handleRemovePdfLogo}
                        className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove Official PDF Logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => headerLogoFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 transition-all text-xs font-semibold cursor-pointer"
                      title="Upload PDF Official Logo"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Upload PDF Logo</span>
                      <span className="sm:hidden text-[11px]">Logo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Quick Download PDF Button (Tailored to current role) */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Download Official Registration PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {currentRole === 'super_admin'
                    ? 'Export All Registrations PDF'
                    : currentRole === 'male_admin'
                    ? 'Export Male Ledger PDF'
                    : 'Export Female Ledger PDF'}
                </span>
                <span className="md:hidden">PDF</span>
              </button>

              {/* Return to Site Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Back to Public Website"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">Exit to Site</span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* MAIN WORKSPACE BODY */}
          <div className="flex flex-1 overflow-hidden min-h-0 relative">
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0 justify-between select-none">
              <div className="p-4 space-y-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
                    Navigation
                  </div>

                  <nav className="space-y-1">
                    {/* 1. Dashboard Overview */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'overview'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Dashboard Overview</span>
                    </button>

                    {/* Registrations */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('registrations')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'registrations'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4" />
                        <span>Registrations</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-indigo-300 font-mono">
                        {currentRole === 'male_admin'
                          ? maleCount
                          : currentRole === 'female_admin'
                          ? femaleCount
                          : totalCount}
                      </span>
                    </button>

                    {/* Super Admin specific sections */}
                    {currentRole === 'super_admin' && (
                      <>
                        {/* Event Settings (Countdown & Date) */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('event_settings')}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'event_settings'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            <span>Event Settings</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                            {localWebsite.eventDay || 27} {String(localWebsite.eventMonth || 'Nov').substring(0, 3)}
                          </span>
                        </button>

                        {/* 2. Content Management */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('content')}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'content'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Content Management</span>
                        </button>

                        {/* 3. Website Builder */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('builder')}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'builder'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Palette className="w-4 h-4" />
                          <span>Website Builder</span>
                        </button>

                        {/* 4. Event Cards */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('cards')}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'cards'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Layout className="w-4 h-4" />
                            <span>Event Cards</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                            {localCards.length}
                          </span>
                        </button>

                        {/* Jersey Showcase Manager */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('jersey_showcase')}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'jersey_showcase'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Shirt className="w-4 h-4 text-sky-400" />
                            <span>Jersey Showcase</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                localJerseyShowcase.enabled ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                            />
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                              {localJerseyShowcase.jerseys.length}
                            </span>
                          </div>
                        </button>

                        {/* 5. Payment Settings (Admin Controlled) */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('payment')}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'payment'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-4 h-4" />
                            <span>Payment Settings</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                            {localPayment.registrationFee} {localPayment.currency}
                          </span>
                        </button>

                        {/* 6. PDF Settings */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('pdf')}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'pdf'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Settings className="w-4 h-4" />
                            <span>PDF Settings</span>
                          </div>
                          {localPdf.pdfLogo && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          )}
                        </button>

                        {/* 7. Cloud Storage & Media Uploads */}
                        <button
                          type="button"
                          onClick={() => setActiveTab('uploads')}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'uploads'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Cloud className="w-4 h-4 text-cyan-400" />
                            <span>Storage & Media</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-cyan-300 font-mono">
                            {adminFiles.length}
                          </span>
                        </button>

                        {/* 8. Supabase Database */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('database');
                            checkSupabaseHealth().then(setHealthStatus);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            activeTab === 'database'
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Database className="w-4 h-4 text-emerald-400" />
                            <span>Supabase Database</span>
                          </div>
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </button>
                      </>
                    )}
                  </nav>
                </div>
              </div>

              {/* Bottom Desk Status Card */}
              <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Batch 2027 Admin</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">Active Session</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* MOBILE DRAWER MENU */}
            {isMobileDrawerOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
                  onClick={() => setIsMobileDrawerOpen(false)}
                />

                {/* Drawer Panel */}
                <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-white h-full flex flex-col justify-between p-4 z-10 animate-slideRight">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                          RD
                        </div>
                        <div>
                          <span className="font-bold text-sm block leading-tight">RD27 Admin</span>
                          <span className="text-[10px] text-slate-400">Menu</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <nav className="space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('overview');
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                          activeTab === 'overview'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Dashboard Overview</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('registrations');
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                          activeTab === 'registrations'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4" />
                          <span>Registrations</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-indigo-300">
                          {currentRole === 'male_admin'
                            ? maleCount
                            : currentRole === 'female_admin'
                            ? femaleCount
                            : totalCount}
                        </span>
                      </button>

                      {currentRole === 'super_admin' && (
                        <>
                          <button
                            onClick={() => {
                              setActiveTab('event_settings');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'event_settings'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-indigo-400" />
                              <span>Event Settings</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                              {localWebsite.eventDay || 27} {String(localWebsite.eventMonth || 'Nov').substring(0, 3)}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('content');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'content'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            <span>Content Management</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('builder');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'builder'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Palette className="w-4 h-4" />
                            <span>Website Builder</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('cards');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'cards'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Layout className="w-4 h-4" />
                              <span>Event Cards</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800">
                              {localCards.length}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('jersey_showcase');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'jersey_showcase'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Shirt className="w-4 h-4 text-sky-400" />
                              <span>Jersey Showcase</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800">
                              {localJerseyShowcase.jerseys.length}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('payment');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'payment'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-4 h-4" />
                              <span>Payment Settings</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                              {localPayment.registrationFee} {localPayment.currency}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('pdf');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'pdf'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Settings className="w-4 h-4" />
                              <span>PDF Settings</span>
                            </div>
                            {localPdf.pdfLogo && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('uploads');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'uploads'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Cloud className="w-4 h-4 text-cyan-400" />
                              <span>Storage & Media</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-cyan-300 font-mono">
                              {adminFiles.length}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('database');
                              checkSupabaseHealth().then(setHealthStatus);
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                              activeTab === 'database'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Database className="w-4 h-4 text-emerald-400" />
                              <span>Supabase Database</span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          </button>
                        </>
                      )}
                    </nav>
                  </div>

                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Official PDF</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout from Console</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-50 min-w-0">
              {/* ======================================================== */}
              {/* SECTION 1: DASHBOARD OVERVIEW */}
              {/* ======================================================== */}
              {activeTab === 'overview' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  {/* Banner */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                    <div className="relative z-10 max-w-2xl">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 mb-3">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Batch 2027 Executive Control</span>
                      </div>
                      <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Welcome to {websiteSettings.eventName}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                        Live monitoring of student enrollments, jersey orders, academic sections, and instant generation of official PDF ledgers with verified security stamps.
                      </p>
                    </div>
                  </div>

                  {/* 4 Responsive KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                        <span>Total Registrations</span>
                        <Users className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {totalCount}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Batch 2027 students</div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                        <span>Approved Passes</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-emerald-600">
                        {approvedCount}
                      </div>
                      <div className="text-[11px] text-emerald-700/80 mt-1">
                        {totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}% of all submissions
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                        <span>Pending Review</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-amber-500">
                        {pendingCount}
                      </div>
                      <div className="text-[11px] text-amber-700/80 mt-1">Awaiting Trx verification</div>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                        <span>Disqualified</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="font-display text-2xl sm:text-3xl font-extrabold text-rose-500">
                        {rejectedCount}
                      </div>
                      <div className="text-[11px] text-rose-700/80 mt-1">Invalid payment proof</div>
                    </div>
                  </div>

                  {/* Demographic & Financial Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Gender ratio */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Gender Breakdown
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-cyan-700">Male Students</span>
                            <span>{maleCount} ({totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full"
                              style={{ width: `${totalCount > 0 ? (maleCount / totalCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-pink-700">Female Students</span>
                            <span>{femaleCount} ({totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-pink-500 rounded-full"
                              style={{ width: `${totalCount > 0 ? (femaleCount / totalCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Academic Groups */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Academic Groups
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                          <span className="font-semibold text-slate-700">Science</span>
                          <span className="font-mono font-bold text-indigo-600">{scienceCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                          <span className="font-semibold text-slate-700">Business Studies</span>
                          <span className="font-mono font-bold text-indigo-600">{businessCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                          <span className="font-semibold text-slate-700">Humanities</span>
                          <span className="font-mono font-bold text-indigo-600">{humanitiesCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial projection */}
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Verified Revenue
                        </h3>
                        <div className="font-display text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                          ৳{estimatedRevenue.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Calculated from {approvedCount} approved passes at {localPayment.registrationFee} {localPayment.currency} each.
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Official PDF Logo:</span>
                        <span className={`font-bold ${localPdf.pdfLogo ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {localPdf.pdfLogo ? 'Attached & Active' : 'None Uploaded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Shortcuts */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Fast Administrative Actions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button
                        onClick={() => setActiveTab('registrations')}
                        className="p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 text-left transition-all group cursor-pointer"
                      >
                        <Users className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="block text-xs font-bold text-slate-800">Review Students</span>
                        <span className="text-[10px] text-slate-500">Approve or reject passes</span>
                      </button>

                      <button
                        onClick={handleDownloadPDF}
                        className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition-all group cursor-pointer"
                      >
                        <Download className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="block text-xs font-bold text-slate-800">Download PDF</span>
                        <span className="text-[10px] text-slate-500">Generate formatted ledger</span>
                      </button>

                      {currentRole === 'super_admin' && (
                        <>
                          <button
                            onClick={() => setActiveTab('event_settings')}
                            className="p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 text-left transition-all group cursor-pointer"
                          >
                            <Calendar className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="block text-xs font-bold text-slate-800">Event Settings</span>
                            <span className="text-[10px] text-slate-500">
                              {localWebsite.eventDay || 27} {localWebsite.eventMonth || 'Nov'} · Countdown
                            </span>
                          </button>

                          <button
                            onClick={() => setActiveTab('payment')}
                            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition-all group cursor-pointer"
                          >
                            <CreditCard className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="block text-xs font-bold text-slate-800">Payment Settings</span>
                            <span className="text-[10px] text-slate-500">{localPayment.registrationFee} {localPayment.currency} / bKash & Nagad</span>
                          </button>

                          <button
                            onClick={() => setActiveTab('pdf')}
                            className="p-3.5 rounded-xl bg-slate-50 hover:bg-cyan-50 hover:border-cyan-200 border border-slate-200 text-left transition-all group cursor-pointer"
                          >
                            <Settings className="w-5 h-5 text-cyan-600 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="block text-xs font-bold text-slate-800">PDF Settings</span>
                            <span className="text-[10px] text-slate-500">Logo, stamp & headers</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION 2: REGISTRATIONS MANAGEMENT */}
              {/* ======================================================== */}
              {activeTab === 'registrations' && (
                <div className="space-y-4 max-w-7xl mx-auto">
                  {/* Top Bar with Search & Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search student, reg no, roll, id, jersey..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Filter */}
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="all">All Statuses ({invitations.length})</option>
                        <option value="approved">Approved ({approvedCount})</option>
                        <option value="pending">Pending ({pendingCount})</option>
                        <option value="rejected">Rejected ({rejectedCount})</option>
                      </select>

                      {/* Group Filter */}
                      <select
                        value={groupFilter}
                        onChange={e => setGroupFilter(e.target.value as any)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="all">All Groups</option>
                        <option value="Science">Science</option>
                        <option value="Business Studies">Business Studies</option>
                        <option value="Humanities">Humanities</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadExcel}
                        className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Download Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* COMPACT SINGLE-ROW REGISTRATIONS LIST (Mobile, Tablet, Desktop) */}
                  <div className="w-full rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                    {/* Header bar / mobile scroll indicator */}
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Registration Records ({filteredRegistrations.length})
                        </span>
                        <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                          Single-Row View
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 lg:hidden">
                        ← Scroll horizontally for details & actions →
                      </span>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs min-w-[1080px]">
                        <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-3 whitespace-nowrap">SL #</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Reg No</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Name</th>
                            <th className="py-3 px-3 whitespace-nowrap">Roll</th>
                            <th className="py-3 px-3 whitespace-nowrap">ID</th>
                            <th className="py-3 px-3 whitespace-nowrap">Group</th>
                            <th className="py-3 px-3 whitespace-nowrap">Section</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Payment Number</th>
                            <th className="py-3 px-3 whitespace-nowrap">Payment Time</th>
                            <th className="py-3 px-3.5 whitespace-nowrap">Transaction ID</th>
                            <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                            <th className="py-3 px-3 text-center whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredRegistrations.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="py-12 text-center text-slate-400">
                                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                No registrations match your search or filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredRegistrations.map((record, idx) => {
                              const paymentNumber = record.senderNumber || '—';
                              const paymentTime = record.paymentTime || '—';
                              const hasTrx = record.transactionId && record.transactionId.trim() !== '';

                              return (
                                <tr
                                  key={record.registrationNo}
                                  className="hover:bg-indigo-50/40 transition-colors group"
                                >
                                  {/* 0. Serial No (Separate from Registration No) */}
                                  <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                                    #{record.serialNo || idx + 1}
                                  </td>

                                  {/* 1. Reg No */}
                                  <td className="py-3 px-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">
                                    {record.registrationNo}
                                  </td>

                                  {/* 2. Name */}
                                  <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                                    {record.name}
                                  </td>

                                  {/* 3. Roll */}
                                  <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                                    Roll: {record.roll}
                                  </td>

                                  {/* 4. ID */}
                                  <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                    ID: {record.id}
                                  </td>

                                  {/* 5. Group */}
                                  <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                                    {record.group}
                                  </td>

                                  {/* 6. Section */}
                                  <td className="py-3 px-3 font-mono font-bold text-indigo-600 whitespace-nowrap">
                                    {record.section}
                                  </td>

                                  {/* 7. Payment Number */}
                                  <td className="py-3 px-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                                    {paymentNumber}
                                  </td>

                                  {/* 8. Payment Time */}
                                  <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                    {paymentTime}
                                  </td>

                                  {/* 9. Transaction ID (Optional) */}
                                  <td className="py-3 px-3.5 whitespace-nowrap">
                                    {hasTrx ? (
                                      <span className="font-mono text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded text-[11px] font-semibold border border-indigo-100">
                                        {record.transactionId}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono text-xs">—</span>
                                    )}
                                  </td>

                                  {/* 10. Status Display (Compact Badge) */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {record.status === 'approved' && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/25">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Approved
                                      </span>
                                    )}
                                    {record.status === 'pending' && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/25">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        Pending
                                      </span>
                                    )}
                                    {record.status === 'rejected' && (
                                      <div className="inline-flex flex-col items-center gap-0.5">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 border border-rose-500/25">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                          Rejected
                                        </span>
                                        {record.rejectionReason && (
                                          <span
                                            className="text-[10px] text-rose-600 font-medium max-w-[150px] truncate"
                                            title={record.rejectionReason}
                                          >
                                            Reason: {record.rejectionReason}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* 11. Actions (3 Glassmorphism Action Icons) */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {/* Approve: Glassmorphism Green Icon */}
                                      <button
                                        type="button"
                                        onClick={() => onUpdateStatus(record.registrationNo, 'approved')}
                                        title="Approve Registration"
                                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50 active:scale-95 shadow-[0_2px_8px_rgba(16,185,129,0.18)] hover:shadow-[0_4px_12px_rgba(16,185,129,0.30)] backdrop-blur-md transition-all duration-200 cursor-pointer"
                                      >
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                      </button>

                                      {/* Reject: Glassmorphism Red Icon */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRejectingRegNo(record.registrationNo);
                                          setRejectionReason(record.rejectionReason || 'Payment verification failed');
                                        }}
                                        title="Reject Registration"
                                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/15 text-rose-600 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50 active:scale-95 shadow-[0_2px_8px_rgba(244,63,94,0.18)] hover:shadow-[0_4px_12px_rgba(244,63,94,0.30)] backdrop-blur-md transition-all duration-200 cursor-pointer"
                                      >
                                        <X className="w-4 h-4 stroke-[2.5]" />
                                      </button>

                                      {/* Edit: Glassmorphism Indigo Icon */}
                                      <button
                                        type="button"
                                        onClick={() => setEditingRegistration({ ...record })}
                                        title="Edit Registration Details"
                                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 hover:bg-indigo-500/25 hover:border-indigo-500/50 active:scale-95 shadow-[0_2px_8px_rgba(99,102,241,0.18)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.30)] backdrop-blur-md transition-all duration-200 cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5 stroke-[2.2]" />
                                      </button>

                                      {/* Delete: Glassmorphism Gray Icon (Only available after rejection) */}
                                      {record.status === 'rejected' ? (
                                        <button
                                          type="button"
                                          onClick={() => setDeletingRegNo(record.registrationNo)}
                                          title="Delete Permanently (Enabled because status is Rejected)"
                                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-500/15 text-slate-700 hover:text-rose-600 hover:bg-rose-500/20 hover:border-rose-400/40 active:scale-95 border border-slate-400/30 shadow-[0_2px_8px_rgba(100,116,139,0.15)] hover:shadow-[0_4px_12px_rgba(244,63,94,0.22)] backdrop-blur-md transition-all duration-200 cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4 stroke-[2]" />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled
                                          title="Delete only available after rejection"
                                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/50 text-slate-300 border border-slate-200/50 opacity-40 cursor-not-allowed backdrop-blur-sm"
                                        >
                                          <Trash2 className="w-4 h-4 stroke-[1.8]" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION: EVENT SETTINGS & LIVE COUNTDOWN (Super Admin) */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'event_settings' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-display text-lg font-extrabold text-slate-900">
                          Event Settings
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure Event Date (Day, Month, Year, and Time). The Hero Section countdown calculates and updates dynamically.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveEventSettings}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Event Settings</span>
                    </button>
                  </div>

                  {/* Main Event Date Form Card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                        Event Date
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Select the official Event Day, Month, Year, and optional Time. Changes update the Hero Section live countdown instantly without page refresh.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 1. Event Day */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                          Day <span className="text-indigo-600">*</span>
                        </label>
                        <select
                          value={localWebsite.eventDay || 27}
                          onChange={e => handleEventDateUpdate('eventDay', parseInt(e.target.value, 10))}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>
                              Day {d < 10 ? `0${d}` : d}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Day of the month (1-31)</p>
                      </div>

                      {/* 2. Event Month */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                          Month <span className="text-indigo-600">*</span>
                        </label>
                        <select
                          value={localWebsite.eventMonth || 'November'}
                          onChange={e => handleEventDateUpdate('eventMonth', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                        >
                          {[
                            'January',
                            'February',
                            'March',
                            'April',
                            'May',
                            'June',
                            'July',
                            'August',
                            'September',
                            'October',
                            'November',
                            'December',
                          ].map(m => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Calendar month</p>
                      </div>

                      {/* 3. Event Year */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                          Year <span className="text-indigo-600">*</span>
                        </label>
                        <select
                          value={localWebsite.eventYear || 2027}
                          onChange={e => handleEventDateUpdate('eventYear', parseInt(e.target.value, 10))}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                        >
                          {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map(y => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Target year</p>
                      </div>

                      {/* 4. Event Time (Optional) */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                          Time <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 09:00 AM"
                          value={localWebsite.eventTime || ''}
                          onChange={e => handleEventDateUpdate('eventTime', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Empty automatically defaults to <strong>12:00 AM</strong>
                        </p>
                      </div>
                    </div>

                    {/* Quick Time Presets */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 mr-1">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleEventDateUpdate('eventTime', '09:00 AM')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 transition-colors cursor-pointer"
                      >
                        09:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEventDateUpdate('eventTime', '10:00 AM')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 transition-colors cursor-pointer"
                      >
                        10:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEventDateUpdate('eventTime', '12:00 PM')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 transition-colors cursor-pointer"
                      >
                        12:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEventDateUpdate('eventTime', '')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 transition-colors cursor-pointer"
                      >
                        Clear (Use 12:00 AM)
                      </button>
                    </div>

                    {/* Quick Example Scenarios */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Current Event Date Configuration
                        </span>
                        <span className="text-xs text-indigo-700 font-mono font-bold">
                          {localWebsite.eventMonth} {localWebsite.eventDay || 27}, {localWebsite.eventYear || 2027}
                          {localWebsite.eventTime ? ` at ${localWebsite.eventTime}` : ' (Defaults to 12:00 AM)'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = {
                              ...localWebsite,
                              eventDay: 15,
                              eventMonth: 'February',
                              eventYear: 2027,
                              eventTime: '09:00 AM',
                              eventDate: 'February 15, 2027',
                            };
                            setLocalWebsite(updated);
                            onUpdateWebsiteSettings(updated);
                            showSaveSuccess('Applied Example: 15 February 2027 09:00 AM');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Load Example (Feb 15, 2027 · 09:00 AM)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = {
                              ...localWebsite,
                              eventDay: 27,
                              eventMonth: 'November',
                              eventYear: 2027,
                              eventTime: '10:00 AM – 11:30 PM',
                              eventDate: 'November 27, 2027',
                            };
                            setLocalWebsite(updated);
                            onUpdateWebsiteSettings(updated);
                            showSaveSuccess('Reset to Default Event Date (Nov 27, 2027)');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
                        >
                          Default (Nov 27, 2027)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Hero Countdown Preview Box in Admin */}
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                          Live Hero Section Countdown Preview
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Synchronized with Hero Section in real-time
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                      <EventCountdown
                        day={localWebsite.eventDay}
                        month={localWebsite.eventMonth}
                        year={localWebsite.eventYear}
                        time={localWebsite.eventTime}
                        fallbackDateStr={localWebsite.eventDate}
                        eventName={localWebsite.eventName}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION 3: CONTENT MANAGEMENT (Super Admin) */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'content' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-slate-900">
                        Content Management
                      </h3>
                      <p className="text-xs text-slate-500">
                        Manage website titles, descriptions, venue, date, fees, and footer copy.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveWebsite}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveWebsite} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Event Title
                        </label>
                        <input
                          type="text"
                          value={localWebsite.eventName}
                          onChange={e => setLocalWebsite({ ...localWebsite, eventName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Venue Location
                        </label>
                        <input
                          type="text"
                          value={localWebsite.venue}
                          onChange={e => setLocalWebsite({ ...localWebsite, venue: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold uppercase text-slate-700">
                            Event Date
                          </label>
                          <button
                            type="button"
                            onClick={() => setActiveTab('event_settings')}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                          >
                            Configure in Event Settings →
                          </button>
                        </div>
                        <input
                          type="text"
                          value={localWebsite.eventDate}
                          onChange={e => {
                            const val = e.target.value;
                            setLocalWebsite(prev => ({ ...prev, eventDate: val }));
                            onUpdateWebsiteSettings({ ...localWebsite, eventDate: val });
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Event Time
                        </label>
                        <input
                          type="text"
                          value={localWebsite.eventTime}
                          onChange={e => setLocalWebsite({ ...localWebsite, eventTime: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Registration Fee
                        </label>
                        <input
                          type="text"
                          value={localWebsite.registrationFee}
                          onChange={e => setLocalWebsite({ ...localWebsite, registrationFee: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Registration Deadline
                        </label>
                        <input
                          type="text"
                          value={localWebsite.lastRegDate}
                          onChange={e => setLocalWebsite({ ...localWebsite, lastRegDate: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Event Description / Subtitle
                      </label>
                      <textarea
                        rows={3}
                        value={localWebsite.eventDescription}
                        onChange={e => setLocalWebsite({ ...localWebsite, eventDescription: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Top Announcement Banner Text
                      </label>
                      <input
                        type="text"
                        value={localWebsite.bannerText}
                        onChange={e => setLocalWebsite({ ...localWebsite, bannerText: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="bannerActive"
                        checked={localWebsite.bannerActive}
                        onChange={e => setLocalWebsite({ ...localWebsite, bannerActive: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <label htmlFor="bannerActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Display Announcement Banner across website
                      </label>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Website Settings</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION 4: WEBSITE BUILDER (Super Admin) */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'builder' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-slate-900">
                        Website Builder & Graphic Assets
                      </h3>
                      <p className="text-xs text-slate-500">
                        Customize logo, hero banner, wallpapers, custom jersey previews, and card assets.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveBranding}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Builder Settings</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveBranding} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Website Logo */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                        <span className="font-bold text-xs text-slate-800 block">Website Brand Logo</span>
                        <input
                          type="text"
                          placeholder="Logo image URL..."
                          value={localBranding.websiteLogo}
                          onChange={e => setLocalBranding({ ...localBranding, websiteLogo: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                        />
                        <label className="inline-flex px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Logo File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload('websiteLogo', e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>

                      {/* Favicon Control */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                        <span className="font-bold text-xs text-slate-800 block">Website Favicon</span>
                        <input
                          type="text"
                          placeholder="Favicon image URL or icon..."
                          value={localBranding.favicon}
                          onChange={e => setLocalBranding({ ...localBranding, favicon: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                        />
                        <label className="inline-flex px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Favicon</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload('favicon', e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>

                      {/* Hero Banner */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                        <span className="font-bold text-xs text-slate-800 block">Hero Banner Image</span>
                        <input
                          type="text"
                          placeholder="Hero Banner URL..."
                          value={localBranding.heroBanner}
                          onChange={e => setLocalBranding({ ...localBranding, heroBanner: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                        />
                        <label className="inline-flex px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Banner</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload('heroBanner', e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>

                      {/* Jersey Front & Back */}
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                        <span className="font-bold text-xs text-slate-800 block">Custom Jersey Front Graphic</span>
                        <input
                          type="text"
                          placeholder="Front Graphic URL..."
                          value={localBranding.jerseyFrontImage}
                          onChange={e => setLocalBranding({ ...localBranding, jerseyFrontImage: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                        />
                        <label className="inline-flex px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Jersey Front</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload('jerseyFrontImage', e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                        <span className="font-bold text-xs text-slate-800 block">Custom Jersey Back Graphic</span>
                        <input
                          type="text"
                          placeholder="Back Graphic URL..."
                          value={localBranding.jerseyBackImage}
                          onChange={e => setLocalBranding({ ...localBranding, jerseyBackImage: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                        />
                        <label className="inline-flex px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Upload Jersey Back</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleFileUpload('jerseyBackImage', e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Builder Changes</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION 5: EVENT INFORMATION CARDS (Super Admin) */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'cards' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-slate-900">
                        Event Information Cards ({localCards.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cards displayed prominently on the public homepage. Add, reorder, hide, or edit.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCard({
                          id: `card-${Date.now()}`,
                          icon: 'calendar',
                          title: '',
                          description: '',
                          subDetail: '',
                          customColor: 'indigo',
                          order: localCards.length + 1,
                          visible: true,
                        });
                        setIsAddingCard(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Card</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {localCards.map((card, idx) => (
                      <div
                        key={card.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          card.visible
                            ? 'bg-white border-slate-200 shadow-sm'
                            : 'bg-slate-50 border-dashed border-slate-300 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                            {renderCardIcon(card.icon, 'w-5 h-5')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{card.title}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                #{card.order}
                              </span>
                              {!card.visible && (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 font-medium">{card.description}</div>
                            {card.subDetail && (
                              <div className="text-[11px] text-slate-400">{card.subDetail}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleMoveCard(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCard(idx, 'down')}
                            disabled={idx === localCards.length - 1}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleCardVisibility(card.id)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            title={card.visible ? 'Hide from public' : 'Show on public'}
                          >
                            {card.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-indigo-600" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCard(card);
                              setIsAddingCard(false);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-indigo-600 cursor-pointer"
                            title="Edit Card"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                            title="Delete Card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION: JERSEY SHOWCASE MANAGER (Super Admin) */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'jersey_showcase' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-200">
                          <Shirt className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-extrabold text-slate-900">
                            Jersey Showcase Manager
                          </h3>
                          <p className="text-xs text-slate-500">
                            Control showcase visibility, homepage section order, badge text, tag, front & back graphics, and multiple jersey carousel.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddJersey}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Jersey</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveJerseyShowcase()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save & Apply</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. Global Visibility & Section Reordering Card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Show Jersey Showcase</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              localJerseyShowcase.enabled
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {localJerseyShowcase.enabled ? 'ON (Visible)' : 'OFF (Hidden)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Toggle visibility of the Jersey Showcase section on the public homepage.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleShowcaseEnabled}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          localJerseyShowcase.enabled
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        {localJerseyShowcase.enabled ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Visible on Homepage</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4" />
                            <span>Hidden from Homepage</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Section Order Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Reorder Position on Homepage
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Move Jersey Showcase above or below Event Cards in the page hierarchy:
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetSectionOrder('showcase_first')}
                            disabled={localJerseyShowcase.sectionOrder === 'showcase_first'}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                            title="Move Jersey Showcase Above Event Cards"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetSectionOrder('cards_first')}
                            disabled={localJerseyShowcase.sectionOrder === 'cards_first'}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer"
                            title="Move Jersey Showcase Below Event Cards"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {/* Option 1: Showcase First */}
                        <div
                          onClick={() => handleSetSectionOrder('showcase_first')}
                          className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                            localJerseyShowcase.sectionOrder === 'showcase_first'
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              Position A (Showcase First)
                            </span>
                            {localJerseyShowcase.sectionOrder === 'showcase_first' && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                Active Order
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono">
                            <span className="font-semibold text-slate-800">Hero</span>
                            <span>↓</span>
                            <span className="font-bold text-indigo-600 bg-indigo-100/70 px-1 rounded">Jersey Showcase</span>
                            <span>↓</span>
                            <span>Event Cards</span>
                            <span>↓</span>
                            <span>Register CTA</span>
                            <span>↓</span>
                            <span>Footer</span>
                          </div>
                        </div>

                        {/* Option 2: Cards First */}
                        <div
                          onClick={() => handleSetSectionOrder('cards_first')}
                          className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                            localJerseyShowcase.sectionOrder === 'cards_first'
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              Position B (Cards First)
                            </span>
                            {localJerseyShowcase.sectionOrder === 'cards_first' && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                Active Order
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono">
                            <span className="font-semibold text-slate-800">Hero</span>
                            <span>↓</span>
                            <span>Event Cards</span>
                            <span>↓</span>
                            <span className="font-bold text-indigo-600 bg-indigo-100/70 px-1 rounded">Jersey Showcase</span>
                            <span>↓</span>
                            <span>Register CTA</span>
                            <span>↓</span>
                            <span>Footer</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Multiple Jersey List / Carousel Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <span>Showcase Jerseys</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 font-mono font-bold">
                            {localJerseyShowcase.jerseys.length} {localJerseyShowcase.jerseys.length === 1 ? 'Kit' : 'Kits (Carousel Mode)'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          {localJerseyShowcase.jerseys.length > 1
                            ? 'Multiple jerseys configured: automatically displays as an interactive slider / carousel on the frontend!'
                            : 'Single jersey configured: shows as signature kit showcase.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddJersey}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Another Jersey</span>
                      </button>
                    </div>

                    {/* Jerseys List */}
                    <div className="space-y-5">
                      {localJerseyShowcase.jerseys.map((jersey, idx) => (
                        <div
                          key={jersey.id || idx}
                          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4"
                        >
                          {/* Item Top Bar */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={jersey.name}
                                onChange={e => handleUpdateJersey(idx, { name: e.target.value })}
                                placeholder="Jersey Title / Name..."
                                className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none px-1 py-0.5"
                              />
                            </div>

                            {/* Reorder and Delete Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleMoveJersey(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveJersey(idx, 'down')}
                                disabled={idx === localJerseyShowcase.jerseys.length - 1}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteJersey(idx)}
                                disabled={localJerseyShowcase.jerseys.length <= 1}
                                className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 disabled:opacity-30 cursor-pointer"
                                title="Delete Jersey"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Editable Fields Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Badge Text */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Badge Text (Top Left)
                              </label>
                              <input
                                type="text"
                                value={jersey.badgeText}
                                onChange={e => handleUpdateJersey(idx, { badgeText: e.target.value })}
                                placeholder="e.g. Signature Batch Edition"
                                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                              />
                              {/* Quick Presets */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                {[
                                  'Signature Batch Edition',
                                  'Official Rag Day Jersey',
                                  'Premium Edition',
                                  'Batch 2027 Collection',
                                ].map(preset => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handleUpdateJersey(idx, { badgeText: preset })}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 cursor-pointer transition-colors"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Right Side Tag */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Right Side Tag
                              </label>
                              <input
                                type="text"
                                value={jersey.tagText}
                                onChange={e => handleUpdateJersey(idx, { tagText: e.target.value })}
                                placeholder="e.g. RD27"
                                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                              />
                              {/* Quick Presets */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                {['RD27', 'RD28', 'Batch 2027', 'Official Edition'].map(preset => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handleUpdateJersey(idx, { tagText: preset })}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 cursor-pointer transition-colors"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Subtitle & Title */}
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Bottom Caption Subtitle
                              </label>
                              <input
                                type="text"
                                value={jersey.subtitle}
                                onChange={e => handleUpdateJersey(idx, { subtitle: e.target.value })}
                                placeholder="e.g. Custom Squad Kit"
                                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Bottom Caption Main Title
                              </label>
                              <input
                                type="text"
                                value={jersey.title}
                                onChange={e => handleUpdateJersey(idx, { title: e.target.value })}
                                placeholder="e.g. Back Name & Number Print Included"
                                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                              />
                            </div>
                          </div>

                          {/* Front & Back Images Upload Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Front Jersey Upload */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <Shirt className="w-3.5 h-3.5 text-indigo-600" />
                                  Front Jersey Image
                                </span>
                                {jersey.frontImage && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateJersey(idx, { frontImage: '' })}
                                    className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                {jersey.frontImage ? (
                                  <img
                                    src={jersey.frontImage}
                                    alt="Front View"
                                    className="w-16 h-16 rounded-lg object-cover border border-slate-300 bg-white"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400">
                                    <Shirt className="w-6 h-6" />
                                  </div>
                                )}

                                <div className="flex-1 space-y-1.5">
                                  <label className="inline-flex px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer items-center gap-1.5 shadow-2xs">
                                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Upload Front (JPG, PNG, WEBP)</span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      onChange={e => handleJerseyImageUpload(idx, 'front', e.target.files?.[0] || null)}
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Or paste front image URL..."
                                    value={jersey.frontImage}
                                    onChange={e => handleUpdateJersey(idx, { frontImage: e.target.value })}
                                    className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-white border border-slate-200 outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Back Jersey Upload */}
                            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <Shirt className="w-3.5 h-3.5 text-indigo-600" />
                                  Back Jersey Image
                                </span>
                                {jersey.backImage && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateJersey(idx, { backImage: '' })}
                                    className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                {jersey.backImage ? (
                                  <img
                                    src={jersey.backImage}
                                    alt="Back View"
                                    className="w-16 h-16 rounded-lg object-cover border border-slate-300 bg-white"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400">
                                    <Shirt className="w-6 h-6" />
                                  </div>
                                )}

                                <div className="flex-1 space-y-1.5">
                                  <label className="inline-flex px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer items-center gap-1.5 shadow-2xs">
                                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Upload Back (JPG, PNG, WEBP)</span>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      onChange={e => handleJerseyImageUpload(idx, 'back', e.target.files?.[0] || null)}
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Or paste back image URL..."
                                    value={jersey.backImage}
                                    onChange={e => handleUpdateJersey(idx, { backImage: e.target.value })}
                                    className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-white border border-slate-200 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Floating Badges */}
                          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Bottom Badge 1
                              </label>
                              <input
                                type="text"
                                value={jersey.badge1}
                                onChange={e => handleUpdateJersey(idx, { badge1: e.target.value })}
                                placeholder="e.g. Custom Fit"
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Badge 1 Sub-text
                              </label>
                              <input
                                type="text"
                                value={jersey.badge1Sub}
                                onChange={e => handleUpdateJersey(idx, { badge1Sub: e.target.value })}
                                placeholder="e.g. Sizes S to 4XL"
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Top Right Badge 2
                              </label>
                              <input
                                type="text"
                                value={jersey.badge2}
                                onChange={e => handleUpdateJersey(idx, { badge2: e.target.value })}
                                placeholder="e.g. 100% Cotton & Mesh"
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {currentRole === 'super_admin' && activeTab === 'pdf' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-slate-900">
                        PDF Settings & Document Configuration
                      </h3>
                      <p className="text-xs text-slate-500">
                        Manage official logo, header texts, watermark, signatures, and approval statements.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePdf}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save PDF Settings</span>
                    </button>
                  </div>

                  {/* REQUIREMENT 9 & 2: OFFICIAL PDF LOGO MANAGEMENT CARD */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-display text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          <span>Official PDF Document Logo</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          This logo appears on top of all generated registration PDFs and individual invitation passes.
                        </p>
                      </div>
                      {localPdf.pdfLogo && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Active in PDFs
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                      {/* Logo Preview Window */}
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
                        {localPdf.pdfLogo ? (
                          <img
                            src={localPdf.pdfLogo}
                            alt="PDF Logo Preview"
                            className="max-w-full max-h-full object-contain cursor-pointer"
                            onClick={() => setShowLogoPreviewModal(true)}
                          />
                        ) : (
                          <div className="text-center text-slate-400">
                            <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                            <span className="text-[10px] block font-semibold">No Logo</span>
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="space-y-2 flex-1 text-center sm:text-left">
                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <button
                            type="button"
                            onClick={() => settingsLogoFileInputRef.current?.click()}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{localPdf.pdfLogo ? 'Replace PDF Logo' : 'Upload PDF Logo'}</span>
                          </button>

                          {localPdf.pdfLogo && (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowLogoPreviewModal(true)}
                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleRemovePdfLogo}
                                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Logo</span>
                              </button>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Recommended format: Transparent PNG or crisp JPEG (square or horizontal ratio, up to 2MB).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PDF Structure Settings Form */}
                  <form onSubmit={handleSavePdf} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          PDF Header Title
                        </label>
                        <input
                          type="text"
                          value={localPdf.pdfHeader}
                          onChange={e => setLocalPdf({ ...localPdf, pdfHeader: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          PDF Sub-Header
                        </label>
                        <input
                          type="text"
                          value={localPdf.pdfSubHeader}
                          onChange={e => setLocalPdf({ ...localPdf, pdfSubHeader: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Watermark Stamp Text
                        </label>
                        <input
                          type="text"
                          value={localPdf.watermarkLogo}
                          onChange={e => setLocalPdf({ ...localPdf, watermarkLogo: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Watermark Opacity (0.01 to 0.40)
                        </label>
                        <input
                          type="number"
                          step={0.01}
                          min={0.01}
                          max={0.4}
                          value={localPdf.watermarkOpacity}
                          onChange={e =>
                            setLocalPdf({
                              ...localPdf,
                              watermarkOpacity: parseFloat(e.target.value) || 0.08,
                            })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          PDF Footer Text
                        </label>
                        <input
                          type="text"
                          value={localPdf.footerText}
                          onChange={e => setLocalPdf({ ...localPdf, footerText: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Signature Area Designation
                        </label>
                        <input
                          type="text"
                          value={localPdf.signatureArea}
                          onChange={e => setLocalPdf({ ...localPdf, signatureArea: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Signature Subtitle
                        </label>
                        <input
                          type="text"
                          value={localPdf.signatureTitle}
                          onChange={e => setLocalPdf({ ...localPdf, signatureTitle: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Official Approval Text
                      </label>
                      <textarea
                        rows={2}
                        value={localPdf.approvalText}
                        onChange={e => setLocalPdf({ ...localPdf, approvalText: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Custom Document Notes (Printed on Passes & Ledger)
                      </label>
                      <textarea
                        rows={2}
                        value={localPdf.customNotes}
                        onChange={e => setLocalPdf({ ...localPdf, customNotes: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save PDF Configuration</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION 7: PAYMENT SETTINGS (Admin Controlled) */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'payment' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  {/* Top Bar Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Admin Controlled Payment System</span>
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Payment & Gateway Settings
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Configure registration fee amount, currency, and gender-based bKash & Nagad accounts.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSavePayment()}
                      className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Payment Settings</span>
                    </button>
                  </div>

                  {/* 1. REGISTRATION FEE CONFIGURATION */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-indigo-600" />
                          <span>Registration Fee Amount</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Admin can change the amount anytime. The website automatically updates the amount in real-time.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Live Fee:</span>
                        <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono font-black text-xs">
                          {localPayment.registrationFee} {localPayment.currency}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Registration Fee Amount *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={localPayment.registrationFee}
                            onChange={e =>
                              setLocalPayment({
                                ...localPayment,
                                registrationFee: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-full px-4 py-3 rounded-2xl text-sm font-black bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                            placeholder="e.g. 500"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            {localPayment.currency}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Currency Code *
                        </label>
                        <input
                          type="text"
                          value={localPayment.currency}
                          onChange={e =>
                            setLocalPayment({
                              ...localPayment,
                              currency: e.target.value.toUpperCase(),
                            })
                          }
                          className="w-full px-4 py-3 rounded-2xl text-sm font-black bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 uppercase"
                          placeholder="BDT"
                        />
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Quick Fee Presets (Click to apply):
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {[300, 500, 700, 1000, 1500].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() =>
                              setLocalPayment({
                                ...localPayment,
                                registrationFee: amt,
                              })
                            }
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              localPayment.registrationFee === amt
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-600/30'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {amt} {localPayment.currency}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info badge */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>Automatic Synchronization:</strong> Whenever you change this fee (e.g. 500 BDT, 300 BDT, 700 BDT), the Hero banner badges, Event Information quick cards, Registration payment breakdown, and Admin revenue projections automatically display the updated amount!
                      </p>
                    </div>
                  </div>

                  {/* 2. PAYMENT METHODS MASTER SWITCHES */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                    <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <ToggleRight className="w-5 h-5 text-indigo-600" />
                      <span>Payment Method Activation</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* bKash Switch */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#E2136E]/10 flex items-center justify-center border border-[#E2136E]/20 p-2">
                            <BkashLogo className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">bKash Personal / Send Money</div>
                            <div className="text-[11px] text-slate-500">
                              {localPayment.bkashEnabled ? 'Active in checkout' : 'Disabled'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setLocalPayment({
                              ...localPayment,
                              bkashEnabled: !localPayment.bkashEnabled,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            localPayment.bkashEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              localPayment.bkashEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Nagad Switch */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F7931E]/10 flex items-center justify-center border border-[#F7931E]/20 p-2">
                            <NagadLogo className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Nagad Personal / Send Money</div>
                            <div className="text-[11px] text-slate-500">
                              {localPayment.nagadEnabled ? 'Active in checkout' : 'Disabled'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setLocalPayment({
                              ...localPayment,
                              nagadEnabled: !localPayment.nagadEnabled,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            localPayment.nagadEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              localPayment.nagadEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Instructions Field */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        General Payment Note (Shown to students)
                      </label>
                      <input
                        type="text"
                        value={localPayment.paymentInstructions}
                        onChange={e =>
                          setLocalPayment({
                            ...localPayment,
                            paymentInstructions: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600"
                        placeholder="Please Send Money exact amount and save the Transaction ID (TrxID)."
                      />
                    </div>
                  </div>

                  {/* 3. GENDER-BASED PAYMENT NUMBERS (MALE vs FEMALE) */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-indigo-600" />
                          <span>Gender-Based Payment Accounts</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Configure separate or identical payment account numbers for Male and Female students.
                        </p>
                      </div>

                      {/* Quick Sync Tools */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLocalPayment({
                              ...localPayment,
                              femaleBkashNumber: localPayment.maleBkashNumber,
                              femaleNagadNumber: localPayment.maleNagadNumber,
                            });
                            showSaveSuccess('Copied Male accounts to Female!');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors"
                          title="Copy Male bKash & Nagad numbers into Female settings"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Male → Female</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLocalPayment({
                              ...localPayment,
                              maleBkashNumber: localPayment.femaleBkashNumber,
                              maleNagadNumber: localPayment.femaleNagadNumber,
                            });
                            showSaveSuccess('Copied Female accounts to Male!');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors"
                          title="Copy Female bKash & Nagad numbers into Male settings"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-pink-600" />
                          <span>Female → Male</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* CARD A: MALE PAYMENT SETTINGS (Deep Navy + Cyan Theme) */}
                      <div className="p-6 rounded-3xl bg-[#0a1526] border-2 border-cyan-500/40 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                        {/* Glow accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Male Payment Settings
                            </span>
                            <span className="text-[11px] text-cyan-400/80 font-bold">
                              Deep Navy / Cyan Styling
                            </span>
                          </div>

                          <div>
                            <h5 className="font-display text-lg font-black text-white">
                              Male Payment Numbers
                            </h5>
                            <p className="text-xs text-slate-300 mt-1">
                              When Gender = Male is selected, only these payment numbers appear in the registration card.
                            </p>
                          </div>

                          <div className="space-y-3.5 pt-2">
                            {/* Male bKash */}
                            <div>
                              <label className="block text-xs font-extrabold uppercase tracking-wider text-cyan-300 mb-1.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#E2136E]" />
                                <span>Male Bkash Number:</span>
                              </label>
                              <input
                                type="text"
                                value={localPayment.maleBkashNumber}
                                onChange={e =>
                                  setLocalPayment({
                                    ...localPayment,
                                    maleBkashNumber: e.target.value,
                                  })
                                }
                                placeholder="01XXXXXXXXX"
                                className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold bg-[#0f2138] border border-cyan-500/40 text-cyan-200 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                              />
                            </div>

                            {/* Male Nagad */}
                            <div>
                              <label className="block text-xs font-extrabold uppercase tracking-wider text-cyan-300 mb-1.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#F7931E]" />
                                <span>Male Nagad Number:</span>
                              </label>
                              <input
                                type="text"
                                value={localPayment.maleNagadNumber}
                                onChange={e =>
                                  setLocalPayment({
                                    ...localPayment,
                                    maleNagadNumber: e.target.value,
                                  })
                                }
                                placeholder="01XXXXXXXXX"
                                className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold bg-[#0f2138] border border-cyan-500/40 text-cyan-200 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10 mt-5 pt-3 border-t border-cyan-500/20 text-[11px] text-cyan-300/80 flex items-center justify-between">
                          <span>Theme: Deep Navy + Cyan</span>
                          <span className="font-mono font-bold">{localPayment.registrationFee} {localPayment.currency}</span>
                        </div>
                      </div>

                      {/* CARD B: FEMALE PAYMENT SETTINGS (Soft Pink + Rose Theme) */}
                      <div className="p-6 rounded-3xl bg-[#FFF5F7] border-2 border-pink-400/40 text-slate-900 shadow-xl relative overflow-hidden flex flex-col justify-between">
                        {/* Glow accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-400/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-pink-100 text-pink-700 border border-pink-300">
                              Female Payment Settings
                            </span>
                            <span className="text-[11px] text-pink-600 font-bold">
                              Soft Pink / Rose Styling
                            </span>
                          </div>

                          <div>
                            <h5 className="font-display text-lg font-black text-slate-900">
                              Female Payment Numbers
                            </h5>
                            <p className="text-xs text-slate-600 mt-1">
                              When Gender = Female is selected, only these payment numbers appear in the registration card.
                            </p>
                          </div>

                          <div className="space-y-3.5 pt-2">
                            {/* Female bKash */}
                            <div>
                              <label className="block text-xs font-extrabold uppercase tracking-wider text-pink-800 mb-1.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#E2136E]" />
                                <span>Female Bkash Number:</span>
                              </label>
                              <input
                                type="text"
                                value={localPayment.femaleBkashNumber}
                                onChange={e =>
                                  setLocalPayment({
                                    ...localPayment,
                                    femaleBkashNumber: e.target.value,
                                  })
                                }
                                placeholder="01XXXXXXXXX"
                                className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold bg-white border border-pink-300 text-pink-900 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-400/20"
                              />
                            </div>

                            {/* Female Nagad */}
                            <div>
                              <label className="block text-xs font-extrabold uppercase tracking-wider text-pink-800 mb-1.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#F7931E]" />
                                <span>Female Nagad Number:</span>
                              </label>
                              <input
                                type="text"
                                value={localPayment.femaleNagadNumber}
                                onChange={e =>
                                  setLocalPayment({
                                    ...localPayment,
                                    femaleNagadNumber: e.target.value,
                                  })
                                }
                                placeholder="01XXXXXXXXX"
                                className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold bg-white border border-pink-300 text-pink-900 outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-400/20"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10 mt-5 pt-3 border-t border-pink-200 text-[11px] text-pink-700 flex items-center justify-between">
                          <span>Theme: Soft Pink + Rose</span>
                          <span className="font-mono font-bold">{localPayment.registrationFee} {localPayment.currency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Flexibility Requirement Explanatory Box */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-950">
                        <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Flexibility Requirement Guaranteed:</span>
                      </div>
                      <p className="leading-relaxed">
                        The system seamlessly supports <strong>Same Numbers</strong> (e.g. Male Bkash = 01711111111 and Female Bkash = 01711111111) OR <strong>Different Numbers</strong> (e.g. Male Bkash = 01711111111 and Female Bkash = 01822222222). The same rule applies for Nagad. The public main website layout does not change—only the registration payment card dynamically applies the appropriate color theme and numbers based on the student's chosen gender.
                      </p>
                    </div>
                  </div>

                  {/* 4. LIVE INTERACTIVE SIMULATOR (Preview what student sees) */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                          <Eye className="w-5 h-5 text-indigo-600" />
                          <span>Student View Simulator (Live Preview)</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Toggle between Male and Female to preview how students see the registration payment card.
                        </p>
                      </div>

                      {/* Toggle Simulator Gender */}
                      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setPreviewStudentGender('male')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            previewStudentGender === 'male'
                              ? 'bg-[#0a1526] text-cyan-300 shadow-md'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Preview Male
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewStudentGender('female')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            previewStudentGender === 'female'
                              ? 'bg-pink-600 text-white shadow-md'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Preview Female
                        </button>
                      </div>
                    </div>

                    {/* SIMULATED CARD */}
                    <div
                      className={`p-5 sm:p-6 rounded-3xl border-2 transition-all ${
                        previewStudentGender === 'male'
                          ? 'bg-[#0a1526] border-cyan-500/40 text-white shadow-xl'
                          : 'bg-[#FFF5F7] border-pink-400/40 text-slate-900 shadow-xl'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-current/10">
                        <div className="flex items-center gap-2">
                          <CreditCard
                            className={`w-4 h-4 ${
                              previewStudentGender === 'male' ? 'text-cyan-400' : 'text-pink-600'
                            }`}
                          />
                          <span className="text-xs font-extrabold uppercase tracking-wider">
                            Payment Method & Verification
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono ${
                            previewStudentGender === 'male'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-pink-100 text-pink-700 border border-pink-300'
                          }`}
                        >
                          Fee: {localPayment.registrationFee} {localPayment.currency}
                        </span>
                      </div>

                      {/* Display Numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {/* Bkash Box */}
                        {localPayment.bkashEnabled && (
                          <div
                            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                              previewStudentGender === 'male'
                                ? 'bg-[#0f2138] border-cyan-500/30'
                                : 'bg-white border-pink-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 rounded bg-[#E2136E] text-white text-[10px] font-black tracking-wide">
                                bKash
                              </span>
                              <div>
                                <span className="text-[10px] uppercase font-bold opacity-75 block">
                                  bKash Number
                                </span>
                                <span
                                  className={`text-xs sm:text-sm font-mono font-bold ${
                                    previewStudentGender === 'male' ? 'text-cyan-200' : 'text-pink-950'
                                  }`}
                                >
                                  {previewStudentGender === 'male'
                                    ? localPayment.maleBkashNumber || 'Not set'
                                    : localPayment.femaleBkashNumber || 'Not set'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const num =
                                  previewStudentGender === 'male'
                                    ? localPayment.maleBkashNumber
                                    : localPayment.femaleBkashNumber;
                                navigator.clipboard.writeText(num);
                                setCopiedPreviewNumber('bkash');
                                setTimeout(() => setCopiedPreviewNumber(null), 1500);
                              }}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                                previewStudentGender === 'male'
                                  ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                                  : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                              }`}
                            >
                              {copiedPreviewNumber === 'bkash' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span className="text-[10px]">
                                {copiedPreviewNumber === 'bkash' ? 'Copied' : 'Copy'}
                              </span>
                            </button>
                          </div>
                        )}

                        {/* Nagad Box */}
                        {localPayment.nagadEnabled && (
                          <div
                            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                              previewStudentGender === 'male'
                                ? 'bg-[#0f2138] border-cyan-500/30'
                                : 'bg-white border-pink-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 rounded bg-[#F7931E] text-white text-[10px] font-black tracking-wide">
                                Nagad
                              </span>
                              <div>
                                <span className="text-[10px] uppercase font-bold opacity-75 block">
                                  Nagad Number
                                </span>
                                <span
                                  className={`text-xs sm:text-sm font-mono font-bold ${
                                    previewStudentGender === 'male' ? 'text-cyan-200' : 'text-pink-950'
                                  }`}
                                >
                                  {previewStudentGender === 'male'
                                    ? localPayment.maleNagadNumber || 'Not set'
                                    : localPayment.femaleNagadNumber || 'Not set'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const num =
                                  previewStudentGender === 'male'
                                    ? localPayment.maleNagadNumber
                                    : localPayment.femaleNagadNumber;
                                navigator.clipboard.writeText(num);
                                setCopiedPreviewNumber('nagad');
                                setTimeout(() => setCopiedPreviewNumber(null), 1500);
                              }}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                                previewStudentGender === 'male'
                                  ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                                  : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                              }`}
                            >
                              {copiedPreviewNumber === 'nagad' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span className="text-[10px]">
                                {copiedPreviewNumber === 'nagad' ? 'Copied' : 'Copy'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-current/10 text-[11px] opacity-80 flex items-center justify-between">
                        <span>{localPayment.paymentInstructions}</span>
                        <span className="font-bold">
                          {previewStudentGender === 'male' ? 'Showing Male Accounts' : 'Showing Female Accounts'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button Bottom */}
                  <div className="flex justify-end pt-2 pb-6">
                    <button
                      type="button"
                      onClick={() => handleSavePayment()}
                      className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save & Apply Payment Settings</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION 8: CLOUD STORAGE & ADMIN FILES (Super Admin) */}
              {/* Requirements: Logo, Banner, Jersey, Certificates, Resume, Cards */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'uploads' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-indigo-600" />
                        <span>Supabase Storage & Document Manager</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Upload and manage certificates, student resumes, jersey artwork, banners, and logos stored permanently in Supabase.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        Bucket: uploads
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                        {adminFiles.length} Total Files
                      </span>
                    </div>
                  </div>

                  {/* Upload Form Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-display text-sm font-bold text-slate-900">
                        Upload New File to Supabase Storage
                      </h4>
                    </div>

                    <form onSubmit={handleAdminFileUploadSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                            File Category <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={uploadCategory}
                            onChange={e => setUploadCategory(e.target.value as AdminFileCategory)}
                            className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                          >
                            <option value="certificate">Certificate (Award / Event)</option>
                            <option value="resume">Resume / CV Document</option>
                            <option value="logo">Brand Logo / Favicon</option>
                            <option value="banner">Banner / Poster Graphic</option>
                            <option value="jersey">Jersey Graphic / Mockup</option>
                            <option value="invitation">Invitation Card Pass</option>
                            <option value="project">Project / Milestone Asset</option>
                            <option value="skill">Skill / Talent Asset</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                            Title / Document Label <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Official Convener Certificate 2027"
                            value={uploadTitle}
                            onChange={e => setUploadTitle(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                            Short Note / Description
                          </label>
                          <input
                            type="text"
                            placeholder="Optional notes or details..."
                            value={uploadDescription}
                            onChange={e => setUploadDescription(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* File Selector */}
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                        <input
                          type="file"
                          id="adminFileUploadInput"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0] || null;
                            setUploadFile(f);
                            if (f && !uploadTitle) {
                              setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                            }
                          }}
                        />
                        <label
                          htmlFor="adminFileUploadInput"
                          className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                              Click to choose file
                            </span>
                            <span className="text-xs text-slate-500"> or drag and drop here</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Supports Images (PNG, JPG, WEBP, SVG), PDFs, DOCX, ZIP up to 50MB
                          </p>
                        </label>

                        {uploadFile && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-bold">{uploadFile.name}</span>
                            <span className="text-indigo-600 text-[10px]">
                              ({(uploadFile.size / 1024).toFixed(1)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={() => setUploadFile(null)}
                              className="text-slate-400 hover:text-rose-600 ml-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!uploadFile || isUploadingAdminFile}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isUploadingAdminFile ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Uploading to Supabase...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>Upload to Supabase Storage</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                      { key: 'all', label: 'All Files' },
                      { key: 'certificate', label: 'Certificates' },
                      { key: 'resume', label: 'Resumes' },
                      { key: 'logo', label: 'Logos' },
                      { key: 'banner', label: 'Banners' },
                      { key: 'jersey', label: 'Jerseys' },
                      { key: 'invitation', label: 'Invitations' },
                      { key: 'project', label: 'Projects' },
                      { key: 'skill', label: 'Skills' },
                    ].map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFileCategoryFilter(f.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          fileCategoryFilter === f.key
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Files Grid */}
                  {adminFiles.filter(
                    f => fileCategoryFilter === 'all' || f.category === fileCategoryFilter
                  ).length === 0 ? (
                    <div className="text-center py-12 rounded-3xl bg-white border border-slate-200 p-8">
                      <Cloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-700">No files in this category</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Upload certificates, resume documents, jersey graphics, or logos using the form above.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {adminFiles
                        .filter(f => fileCategoryFilter === 'all' || f.category === fileCategoryFilter)
                        .map(file => {
                          const isImage =
                            file.fileUrl.startsWith('data:image') ||
                            /\.(png|jpe?g|webp|gif|svg)$/i.test(file.fileUrl) ||
                            file.fileType?.startsWith('image/');

                          return (
                            <div
                              key={file.id}
                              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {file.category}
                                  </span>
                                  {file.fileSize && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {file.fileSize}
                                    </span>
                                  )}
                                </div>

                                {/* Preview Thumbnail */}
                                <div className="h-32 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative group">
                                  {isImage ? (
                                    <img
                                      src={file.fileUrl}
                                      alt={file.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-3 text-center">
                                      <FileText className="w-8 h-8 text-indigo-500" />
                                      <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]">
                                        {file.fileName || file.title}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h5 className="font-display text-xs font-bold text-slate-900 truncate">
                                    {file.title}
                                  </h5>
                                  {file.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                      {file.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(file.fileUrl);
                                    showSaveSuccess('Public file URL copied to clipboard!');
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy URL</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={file.fileName || file.title}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                    title="Open / Download"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAdminFile(file.id)}
                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete from Supabase"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* SECTION 9: SUPABASE DATABASE & LIVE HEALTH (Super Admin) */}
              {/* ======================================================== */}
              {currentRole === 'super_admin' && activeTab === 'database' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-600" />
                        <span>Supabase Database & Cloud Storage Manager</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Primary storage connection, table schemas, live health checks, and Row-Level Security (RLS).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefreshHealth}
                      disabled={isCheckingHealth}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
                      <span>{isCheckingHealth ? 'Checking...' : 'Refresh Status'}</span>
                    </button>
                  </div>

                  {/* Supabase Connection Details Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h4 className="font-display text-sm font-bold text-slate-900">
                          Connected to Supabase Project
                        </h4>
                      </div>

                      <a
                        href="https://supabase.com/dashboard/project/rqjlrbteaqjpgwkeomro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200"
                      >
                        <span>Open Supabase Dashboard</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Project URL
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-800 truncate mr-2">
                            {SUPABASE_URL}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(SUPABASE_URL);
                              showSaveSuccess('Supabase URL copied!');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Project ID
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-800">
                            rqjlrbteaqjpgwkeomro
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('rqjlrbteaqjpgwkeomro');
                              showSaveSuccess('Project ID copied!');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 sm:col-span-2 lg:col-span-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Publishable Key
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-800 truncate mr-2">
                            sb_publishable_BcoEce...
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('sb_publishable_BcoEceXY8X9BxifFSMRjoA_neWVF9wb');
                              showSaveSuccess('Publishable key copied!');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tables & Storage Health Grid */}
                  <div className="space-y-3">
                    <h4 className="font-display text-sm font-bold text-slate-900 flex items-center justify-between">
                      <span>Database Tables & Storage Bucket Health</span>
                      <span className="text-xs font-normal text-slate-500">
                        Total Registrations in Session: {invitations.length}
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        {
                          name: 'registrations',
                          label: 'Student Registrations',
                          desc: 'Sequential Serials & Unique RD27-xxx Numbers',
                          online: healthStatus?.registrationsTable ?? true,
                          count: `${invitations.length} Records`,
                        },
                        {
                          name: 'event_settings',
                          label: 'Event & Countdown Settings',
                          desc: 'Event Date, Time, Venue, Live Countdown',
                          online: healthStatus?.eventSettingsTable ?? true,
                          count: 'Synchronized',
                        },
                        {
                          name: 'branding_settings',
                          label: 'Branding & Graphics',
                          desc: 'Logos, Favicon, Hero Banner, Jersey Art',
                          online: healthStatus?.brandingSettingsTable ?? true,
                          count: 'Synchronized',
                        },
                        {
                          name: 'payment_settings',
                          label: 'Payment Configuration',
                          desc: 'bKash, Nagad Numbers & Fee Amounts',
                          online: healthStatus?.paymentSettingsTable ?? true,
                          count: `${localPayment.registrationFee} ${localPayment.currency}`,
                        },
                        {
                          name: 'pdf_settings',
                          label: 'PDF & Ledger Settings',
                          desc: 'Watermarks, Official Stamps & Pass Templates',
                          online: healthStatus?.pdfSettingsTable ?? true,
                          count: 'Synchronized',
                        },
                        {
                          name: 'event_cards',
                          label: 'Event Information Cards',
                          desc: 'Interactive Homepage Cards & Display Orders',
                          online: healthStatus?.eventCardsTable ?? true,
                          count: `${localCards.length} Cards`,
                        },
                        {
                          name: 'jersey_showcase',
                          label: 'Jersey Showcase Kits',
                          desc: 'Custom Batch Jerseys, Carousel & Reordering',
                          online: healthStatus?.jerseyShowcaseTable ?? true,
                          count: `${localJerseyShowcase.jerseys.length} Kits`,
                        },
                        {
                          name: 'admin_files',
                          label: 'Admin Files & Documents',
                          desc: 'Certificates, Resumes, Logos & Badges',
                          online: healthStatus?.adminFilesTable ?? true,
                          count: `${adminFiles.length} Uploads`,
                        },
                        {
                          name: 'storage: uploads',
                          label: 'Supabase Storage Bucket',
                          desc: 'Public Bucket for Student Photos & Media Assets',
                          online: healthStatus?.storageBucket ?? true,
                          count: 'Public CDN Active',
                        },
                      ].map(item => (
                        <div
                          key={item.name}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {item.name}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.online
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.online ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              {item.online ? 'Ready / Active' : 'Pending SQL'}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{item.label}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-indigo-600 font-semibold">
                            {item.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SQL Schema Script Setup Section */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-indigo-600" />
                          <span>Supabase Database Schema Setup (1-Click SQL)</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Run this SQL once in your Supabase Dashboard to automatically create all tables, indexes, RLS policies, and storage buckets.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(COMPLETE_SUPABASE_SCHEMA_SQL);
                            setCopiedSql(true);
                            showSaveSuccess('Complete SQL schema copied to clipboard!');
                            setTimeout(() => setCopiedSql(false), 3000);
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSql ? 'Copied SQL!' : 'Copy Complete SQL'}</span>
                        </button>

                        <a
                          href="https://supabase.com/dashboard/project/rqjlrbteaqjpgwkeomro/sql"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                        >
                          <span>Open Supabase SQL Editor</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Step-by-step instructions */}
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>How to run in Supabase (Takes less than 15 seconds):</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-700 text-xs ml-1">
                        <li>Click <strong>Copy Complete SQL</strong> above.</li>
                        <li>Click <strong>Open Supabase SQL Editor</strong> to open your project dashboard.</li>
                        <li>Click <strong>New query</strong>, paste the copied SQL script, and click <strong>Run</strong>.</li>
                        <li>Return here and click <strong>Refresh Status</strong> — all status badges will turn green!</li>
                      </ol>
                    </div>

                    {/* SQL Code Box */}
                    <div className="relative rounded-2xl bg-slate-950 text-slate-300 font-mono text-xs p-4 overflow-x-auto max-h-72 border border-slate-800">
                      <pre className="leading-relaxed whitespace-pre font-mono text-[11px]">
                        {COMPLETE_SUPABASE_SCHEMA_SQL}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: PDF LOGO PREVIEW MODAL */}
      {/* ======================================================== */}
      {showLogoPreviewModal && localPdf.pdfLogo && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Official PDF Logo Preview
              </h3>
              <button
                onClick={() => setShowLogoPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
              <img
                src={localPdf.pdfLogo}
                alt="Full Official PDF Logo"
                className="max-h-48 max-w-full object-contain"
              />
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              This logo will be automatically rendered on the top header of all generated PDF Ledgers and Invitation Passes.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLogoPreviewModal(false);
                  headerLogoFileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemovePdfLogo();
                  setShowLogoPreviewModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs hover:bg-rose-100 transition-colors"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setShowLogoPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REJECT REGISTRATION REASON MODAL */}
      {/* ======================================================== */}
      {rejectingRegNo && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-2xl border border-slate-200 text-left space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="font-display text-base font-extrabold text-slate-900">
                  Reject Registration
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Enter reason for rejecting <strong className="text-rose-600 font-mono">{rejectingRegNo}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Reject Reason
              </label>
              <input
                type="text"
                placeholder="Payment verification failed"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-rose-500 focus:bg-white"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Payment verification failed',
                  'Invalid Transaction ID',
                  'Incorrect fee amount',
                  'Unmatched sender number',
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-medium transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingRegNo(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalReason = rejectionReason.trim() || 'Payment verification failed';
                  onUpdateStatus(rejectingRegNo, 'rejected', finalReason);
                  setRejectingRegNo(null);
                  showSaveSuccess(`Registration ${rejectingRegNo} rejected. Delete button is now enabled.`);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md transition-colors cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2.5: DELETE REGISTRATION CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {deletingRegNo && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-2xl border border-slate-200 text-left space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <h3 className="font-display text-base font-extrabold text-slate-900">
                  Delete Registration
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete registration <strong className="text-rose-600 font-mono">{deletingRegNo}</strong>? This removes the student completely from the admin list.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingRegNo(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD / EDIT EVENT CARD MODAL */}
      {/* ======================================================== */}
      {editingCard && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-display text-base font-bold text-slate-900">
                {isAddingCard ? 'Add Event Information Card' : 'Edit Event Card'}
              </h3>
              <button
                onClick={() => setEditingCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Card Title
              </label>
              <input
                type="text"
                value={editingCard.title}
                onChange={e => setEditingCard({ ...editingCard, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Main Value / Description
              </label>
              <input
                type="text"
                value={editingCard.description}
                onChange={e => setEditingCard({ ...editingCard, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Sub-detail (Optional)
              </label>
              <input
                type="text"
                value={editingCard.subDetail || ''}
                onChange={e => setEditingCard({ ...editingCard, subDetail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Icon
                </label>
                <select
                  value={editingCard.icon}
                  onChange={e => setEditingCard({ ...editingCard, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                >
                  <option value="calendar">Calendar</option>
                  <option value="map-pin">Map Pin / Venue</option>
                  <option value="credit-card">Credit Card / Fee</option>
                  <option value="clock">Clock / Time</option>
                  <option value="sparkles">Sparkles</option>
                  <option value="award">Award / Trophy</option>
                  <option value="shirt">Shirt / Jersey</option>
                  <option value="users">Users / Students</option>
                  <option value="music">Music / Concert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Color Theme
                </label>
                <select
                  value={editingCard.customColor}
                  onChange={e => setEditingCard({ ...editingCard, customColor: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                >
                  <option value="indigo">Indigo / Primary</option>
                  <option value="cyan">Cyan / Neon</option>
                  <option value="emerald">Emerald / Green</option>
                  <option value="amber">Amber / Orange</option>
                  <option value="rose">Rose / Pink</option>
                  <option value="purple">Purple</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="cardVisible"
                checked={editingCard.visible}
                onChange={e => setEditingCard({ ...editingCard, visible: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="cardVisible" className="text-xs font-bold text-slate-700 cursor-pointer">
                Visible on Homepage
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveCardModal(editingCard)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Save Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: EDIT REGISTRATION DETAILS MODAL */}
      {/* ======================================================== */}
      {editingRegistration && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto animate-scaleIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-display text-base font-extrabold text-slate-900">
                    Edit Registration Details
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {editingRegistration.registrationNo}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update student details, jersey choices, or payment verification directly in Supabase.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingRegistration(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveEditedRegistration();
              }}
              className="space-y-4"
            >
              {/* 1. Student Personal Information */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Student Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.name}
                      onChange={e =>
                        setEditingRegistration({ ...editingRegistration, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Gender
                    </label>
                    <select
                      value={editingRegistration.gender}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          gender: e.target.value as 'male' | 'female',
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.roll}
                      onChange={e =>
                        setEditingRegistration({ ...editingRegistration, roll: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.id}
                      onChange={e =>
                        setEditingRegistration({ ...editingRegistration, id: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Group
                    </label>
                    <select
                      value={editingRegistration.group}
                      onChange={e =>
                        setEditingRegistration({ ...editingRegistration, group: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    >
                      <option value="Science">Science</option>
                      <option value="Business Studies">Business Studies</option>
                      <option value="Humanities">Humanities</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Section
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.section}
                      onChange={e =>
                        setEditingRegistration({ ...editingRegistration, section: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.contactNumber || ''}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          contactNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Jersey Specifications */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Jersey Specifications
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Jersey Name
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.jerseyName}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          jerseyName: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Jersey Number
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.jerseyNumber}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          jerseyNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Jersey Size
                    </label>
                    <select
                      value={editingRegistration.jerseySize}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          jerseySize: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    >
                      {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map(sz => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Payment Verification */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3. Payment Verification
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Sender Phone Number
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.senderNumber || ''}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          senderNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Payment Time
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.paymentTime || ''}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          paymentTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Transaction ID (TrxID)
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.transactionId || ''}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          transactionId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Status
                    </label>
                    <select
                      value={editingRegistration.status}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          status: e.target.value as InvitationStatus,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-indigo-600 focus:bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {editingRegistration.status === 'rejected' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-rose-600 mb-1">
                        Rejection Reason
                      </label>
                      <input
                        type="text"
                        value={editingRegistration.rejectionReason || ''}
                        onChange={e =>
                          setEditingRegistration({
                            ...editingRegistration,
                            rejectionReason: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl text-xs bg-rose-50/50 border border-rose-200 text-slate-900 outline-none focus:border-rose-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Pass Zone & Gate */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  4. Gate & Seat Allocation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Seat Zone
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.seatZone || ''}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          seatZone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Gate Entry
                    </label>
                    <input
                      type="text"
                      value={editingRegistration.gate || ''}
                      onChange={e =>
                        setEditingRegistration({
                          ...editingRegistration,
                          gate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRegistration(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Update in Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
