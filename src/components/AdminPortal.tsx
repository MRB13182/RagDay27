import React, { useEffect, useMemo, useState } from 'react';
import type { InvitationRecord, InvitationStatus, AdminProfile, PdfSettings, WebsiteSettings } from '../types';
import { getCurrentAdminProfile, signInAdmin, signOutAdmin } from '../lib/supabase';
import { generateRegistrationListPDF, generateInvitationCardPDF } from '../utils/pdfGenerator';
import {
  websiteIdentityConfig,
  eventSettingsConfig,
  registrationSettingsConfig,
  countdownSettingsConfig,
  importantNoticeConfig,
} from '../lib/superAdminConfig';
import {
  X, Lock, LogIn, LogOut, Search, Check, XCircle,
  Trash2, Download, Eye, EyeOff, FileText, CheckCircle2,
  AlertTriangle, CreditCard, ShieldCheck, QrCode, Sliders,
  FolderTree, Calendar, Clock, Bell, UserCheck, AlertCircle
} from 'lucide-react';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: InvitationRecord[];
  onUpdateStatus: (registration_no: string, newStatus: InvitationStatus, reason?: string) => Promise<void>;
  onDeleteRegistration?: (registrationNo: string) => Promise<void>;
  onEditRegistration?: (registration_no: string, updates: Partial<InvitationRecord>) => Promise<void>;
}

type Tab = 'registrations';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  invitations,
  onUpdateStatus,
  onDeleteRegistration,
}) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<'registrations'>('registrations');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus>('all');
    const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deletingRegNo, setDeletingRegNo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoginError('');
    void getCurrentAdminProfile().then(setAdmin).catch(() => setAdmin(null));
  }, []);

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
          r.registration_no,
          r.full_name,
          r.class_roll,
          r.id,
          r.academic_group,
          r.academic_section,
          r.jersey_back_name,
          r.jersey_number,
          r.sender_mobile_no,
          r.transaction_id,
        ].some(v => String(v || '').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [admin?.role, invitations, statusFilter, query]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const profile = await signInAdmin(username, password);
      setAdmin(profile);
      setUsername('');
      setPassword('');
    } catch (e: any) {
      setLoginError(e?.message || 'Invalid administrator credentials.');
    }
  };

  const logout = async () => {
    await signOutAdmin();
    setAdmin(null);
  };

  const handleApprove = async (regNo: string) => {
    await onUpdateStatus(regNo, 'approved');
  };

  const openRejectModal = (regNo: string) => {
    setRejecting(regNo);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    const cleanReason = rejectReason.trim();
    if (!cleanReason) {
      showToast('Rejection reason is strictly required.');
      return;
    }
    await onUpdateStatus(rejecting, 'rejected', cleanReason);
    setRejecting(null);
    setRejectReason('');
  };

  const confirmDelete = async () => {
    if (onDeleteRegistration && deletingRegNo) {
      await onDeleteRegistration(deletingRegNo);
      showToast(`Registration ${deletingRegNo} hidden from website.`);
      setDeletingRegNo(null);
    }
  };

  // Derive PDF configuration from Super Admin code configs
  const derivedPdfSettings: PdfSettings = {
    pdfLogo: websiteIdentityConfig.websiteLogo || '',
    pdfHeader: websiteIdentityConfig.websiteName,
    pdfSubHeader: eventSettingsConfig.eventName,
    watermarkLogo: 'RD27 OFFICIAL',
    watermarkOpacity: 0.08,
    footerText: websiteIdentityConfig.footerText,
    signatureArea:
      admin?.role === 'male_admin'
        ? registrationSettingsConfig.maleInvitationSignature
        : admin?.role === 'female_admin'
        ? registrationSettingsConfig.femaleInvitationSignature
        : `${registrationSettingsConfig.maleInvitationSignature} / ${registrationSettingsConfig.femaleInvitationSignature}`,
    signatureTitle: 'Authorized Rag Day 2027 Committee',
    approvalText: 'Approved by Committee',
    invitationCardTitle: 'RAG DAY 27 - OFFICIAL INVITATION PASS',
    customNotes: eventSettingsConfig.importantInstructions,
  };

  const derivedWebsiteSettings: WebsiteSettings = {
    eventName: websiteIdentityConfig.websiteName,
    eventDescription: eventSettingsConfig.eventDescription,
    eventDate: countdownSettingsConfig.eventDate,
    eventTime: '10:00:00',
    venue: 'Central Amphitheatre',
    registrationFee: registrationSettingsConfig.registrationFee,
    lastRegDate: countdownSettingsConfig.registrationDeadline,
    footerText: websiteIdentityConfig.footerText,
    copyrightText: websiteIdentityConfig.footerText,
    bannerText: importantNoticeConfig.noticeContent,
    bannerActive: importantNoticeConfig.noticeEnabled,
  };

  const downloadLedgerPDF = () => {
    generateRegistrationListPDF(
      scopedRows,
      derivedPdfSettings,
      derivedWebsiteSettings,
      admin?.role === 'male_admin'
        ? 'male_admin'
        : admin?.role === 'female_admin' ? 'female_admin' : 'male_admin'
    );
  };

  const roleTitle = admin?.role === 'male_admin'
    ? 'Male Admin (Boys Wing)'
    : 'Female Admin (Girls Wing)';

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
        /* ADMIN LOGIN PAGE (Clean Passcode Input Only)                     */
        /* ================================================================ */
        <div className="min-h-full grid place-items-center p-4">
          <form
            onSubmit={login}
            className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl space-y-5 border border-slate-100"
          >
            <button
              type="button"
              onClick={onClose}
              className="float-right p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pt-2 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">Admin Sign In</h2>
              <p className="mt-1 text-xs text-slate-500">
                Sign in with your Supabase Auth administrator credentials.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Username
              </label>
              <div className="relative">
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  type="text"
                  placeholder="nicboy.27 or nic27.girl"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 pl-4 pr-11 py-3 text-sm font-mono focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => undefined}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Username"
                >
                  <span />
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
                className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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
                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ' +
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

            
          </nav>

          {/* Tab Content Container */}
          <div className="p-4 sm:p-6">
            {/* ============================================================== */}
            {/* 1. REGISTRATIONS TAB (Super Admin, Male Admin, Female Admin)   */}
            {/* ============================================================== */}
            {tab === 'registrations' && (
              <section className="space-y-4 animate-fadeIn">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by student name, roll, reg no, ID, jersey..."
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100 outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Filter */}
                    <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
                      {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                            statusFilter === s ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'hover:text-slate-900'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Download Ledger Button */}
                    <button
                      onClick={downloadLedgerPDF}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {scopedRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
                    <p className="text-sm font-semibold text-slate-500">No registrations found matching criteria.</p>
                  </div>
                ) : (
                  /* Registration Cards List */
                  <div className="grid gap-4">
                    {scopedRows.map(card => {
                      const isRejected = card.status === 'rejected';
                      const isApproved = card.status === 'approved';
                      const isPending = card.status === 'pending';

                      return (
                        <article
                          key={card.dbId || card.registration_no}
                          className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                        >
                          {/* Card Top Row */}
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold text-slate-900">{card.full_name}</h3>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    card.gender === 'male'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : 'bg-pink-50 text-pink-700 border border-pink-200'
                                  }`}
                                >
                                  {card.gender}
                                </span>
                              </div>
                              <div className="font-mono text-xs font-extrabold text-indigo-600 mt-0.5">
                                {card.registration_no}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approved</span>
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Pending</span>
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rejected</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Complete Registration Information Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Roll:</span>
                              <div className="font-semibold text-slate-800">{card.class_roll || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Student ID:</span>
                              <div className="font-semibold text-slate-800">{card.student_id || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Group:</span>
                              <div className="font-semibold text-slate-800">{card.academic_group || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Section:</span>
                              <div className="font-semibold text-slate-800">{card.academic_section || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Jersey Name:</span>
                              <div className="font-bold text-slate-900 uppercase font-mono">{card.jersey_back_name || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Jersey Number:</span>
                              <div className="font-extrabold text-indigo-600 font-mono">{card.jersey_number || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Jersey Size:</span>
                              <div className="font-semibold text-slate-800">{card.jersey_size || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Sender Number:</span>
                              <div className="font-mono text-slate-800">{card.sender_mobile_no || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Payment Time:</span>
                              <div className="text-slate-800">{card.payment_time || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Transaction ID:</span>
                              <div className="font-mono text-slate-800 font-bold">{card.transaction_id || '–'}</div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Registration Date:</span>
                              <div className="text-slate-600">
                                {card.created_at ? new Date(card.created_at).toLocaleDateString() : '–'}
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Fee Amount:</span>
                              <div className="font-bold text-slate-800">{500} BDT</div>
                            </div>
                          </div>

                          {/* Rejection Notice Banner */}
                          {isRejected && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-rose-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Rejected by Admin</span>
                              </div>
                              <p className="text-rose-600 font-medium pl-5">
                                Reason: {card.reject_reason || 'No specific reason provided.'}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => {
                                  generateInvitationCardPDF(card, derivedPdfSettings, derivedWebsiteSettings);
                                  showToast(`Downloading pass for ${card.full_name}...`);
                                }}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Download Pass</span>
                              </button>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                              {!isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(card.registration_no)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-200 transition-all cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  type="button"
                                  onClick={() => openRejectModal(card.registration_no)}
                                  className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeletingRegNo(card.registration_no)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Delete Registration"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================== */}
            {/* 2. SUPER ADMIN CODE CONFIGURATION OVERVIEW (Super Admin Only)  */}
            {/* ============================================================== */}
            {tab === 'registrations' && false && (
              <section className="space-y-6 animate-fadeIn pb-12">
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
                      <FolderTree className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Super Admin Code-Based Configuration
                      </h2>
                      <p className="text-xs text-slate-500">
                        All website settings are stored directly in source code configuration files under <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-bold">super-admin/</code>.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                    <strong>Developer / Super Admin Notice:</strong> Content is code-driven. To update titles, fees, payment numbers, countdown dates, or notice messages, edit the corresponding configuration file directly in the codebase. Changes take effect instantly upon save with no database migrations required.
                  </div>
                </div>

                {/* 5 Exact Folders Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Folder 1: Website Identity */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black grid place-items-center">
                          1
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">Website Identity</h3>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">super-admin/01. website-identity/</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div><span className="font-bold text-slate-500">Website Name:</span> <span className="font-semibold text-slate-900">{websiteIdentityConfig.websiteName}</span></div>
                      <div><span className="font-bold text-slate-500">Website Subtitle:</span> <span className="text-slate-700">{websiteIdentityConfig.websiteSubtitle}</span></div>
                      <div><span className="font-bold text-slate-500">Footer Text:</span> <span className="text-slate-700">{websiteIdentityConfig.footerText}</span></div>
                      <div><span className="font-bold text-slate-500">Website Logo:</span> <span className="text-slate-700">{websiteIdentityConfig.websiteLogo || 'None (Default text badge)'}</span></div>
                      <div><span className="font-bold text-slate-500">Favicon:</span> <span className="text-slate-700">{websiteIdentityConfig.favicon || 'Default browser icon'}</span></div>
                    </div>
                  </div>

                  {/* Folder 2: Event Settings */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black grid place-items-center">
                          2
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">Event Settings</h3>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">super-admin/02. event-settings/</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div><span className="font-bold text-slate-500">Event Name:</span> <span className="font-semibold text-slate-900">{eventSettingsConfig.eventName}</span></div>
                      <div><span className="font-bold text-slate-500">Event Description:</span> <span className="text-slate-700">{eventSettingsConfig.eventDescription}</span></div>
                      <div><span className="font-bold text-slate-500">Welcome Message:</span> <span className="text-slate-700">{eventSettingsConfig.welcomeMessage}</span></div>
                      <div><span className="font-bold text-slate-500">Card Layout:</span> <span className="font-mono font-semibold text-indigo-600">{eventSettingsConfig.eventCardLayout}</span></div>
                      <div><span className="font-bold text-slate-500">Cards Content:</span> <span className="font-semibold text-slate-700">{eventSettingsConfig.eventCardsContent.length} Event Cards Configured</span></div>
                    </div>
                  </div>

                  {/* Folder 3: Registration Settings */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black grid place-items-center">
                          3
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">Registration Settings</h3>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">super-admin/03. registration-settings/</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-bold text-slate-500">Registration Status:</span>{' '}
                        <span className={`font-bold ${registrationSettingsConfig.registrationOpen ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {registrationSettingsConfig.registrationOpen ? 'OPEN (Accepting entries)' : 'CLOSED'}
                        </span>
                      </div>
                      <div><span className="font-bold text-slate-500">Registration Fee:</span> <span className="font-semibold text-slate-900">{registrationSettingsConfig.registrationFee}</span></div>
                      <div><span className="font-bold text-slate-500">Male Payment Number:</span> <span className="font-mono font-semibold text-slate-800">{registrationSettingsConfig.malePaymentNumber}</span></div>
                      <div><span className="font-bold text-slate-500">Female Payment Number:</span> <span className="font-mono font-semibold text-slate-800">{registrationSettingsConfig.femalePaymentNumber}</span></div>
                      <div><span className="font-bold text-slate-500">Male Signature:</span> <span className="text-slate-700">{registrationSettingsConfig.maleInvitationSignature}</span></div>
                      <div><span className="font-bold text-slate-500">Female Signature:</span> <span className="text-slate-700">{registrationSettingsConfig.femaleInvitationSignature}</span></div>
                    </div>
                  </div>

                  {/* Folder 4: Countdown Settings */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black grid place-items-center">
                          4
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">Countdown Settings</h3>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">super-admin/04. countdown-settings/</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-bold text-slate-500">Countdown Timer:</span>{' '}
                        <span className={`font-bold ${countdownSettingsConfig.countdownEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {countdownSettingsConfig.countdownEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <div><span className="font-bold text-slate-500">Event Date:</span> <span className="font-mono font-semibold text-slate-800">{countdownSettingsConfig.eventDate}</span></div>
                      <div><span className="font-bold text-slate-500">Registration Deadline:</span> <span className="font-mono font-semibold text-slate-800">{countdownSettingsConfig.registrationDeadline}</span></div>
                    </div>
                  </div>

                  {/* Folder 5: Important Notice */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black grid place-items-center">
                          5
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900">Important Notice</h3>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">super-admin/05. important-notice/</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1.5">
                        <div>
                          <span className="font-bold text-slate-500">Notice Banner:</span>{' '}
                          <span className={`font-bold ${importantNoticeConfig.noticeEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {importantNoticeConfig.noticeEnabled ? 'ACTIVE (Visible at top of page)' : 'DISABLED'}
                          </span>
                        </div>
                        <div><span className="font-bold text-slate-500">Notice Content:</span> <span className="text-slate-700">{importantNoticeConfig.noticeContent}</span></div>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="font-bold text-slate-500">Popup Modal:</span>{' '}
                          <span className={`font-bold ${importantNoticeConfig.popupEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {importantNoticeConfig.popupEnabled ? 'ACTIVE (Shows on visit)' : 'DISABLED'}
                          </span>
                        </div>
                        <div><span className="font-bold text-slate-500">Popup Title:</span> <span className="font-semibold text-slate-900">{importantNoticeConfig.popupTitle}</span></div>
                        <div><span className="font-bold text-slate-500">Popup Message:</span> <span className="text-slate-700">{importantNoticeConfig.popupMessage}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* REJECTION REASON MODAL (Requirement: Reason strictly required)   */}
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
                onClick={() => void confirmDelete()}
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
