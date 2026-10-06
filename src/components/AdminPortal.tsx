import React, { useEffect, useMemo, useState } from 'react';
import type { InvitationRecord, InvitationStatus, AdminProfile, PdfSettings, WebsiteSettings } from '../types';
import { signInAdmin, signOutAdmin, getCurrentAdmin } from '../lib/supabase';
import { getRegistrationList } from '../services/admin';
import { generateRegistrationListPDF, generateInvitationCardPDF } from '../utils/pdfGenerator';
import {
  X, Lock, LogIn, LogOut, Check, XCircle,
  Trash2, Download, Search, RefreshCw, AlertCircle,
  CheckCircle2, Clock, Shirt, CreditCard, User,
  FileSpreadsheet
} from 'lucide-react';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations: InvitationRecord[];
  onUpdateStatus: (registration_no: string, newStatus: InvitationStatus, reason?: string) => Promise<void>;
  onDeleteRegistration?: (registration_no: string) => Promise<void>;
  pdfSettings?: PdfSettings;
  websiteSettings?: WebsiteSettings;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  invitations: _propInvitations,
  onUpdateStatus,
  onDeleteRegistration,
  pdfSettings = {
    pdfHeader: 'RAG DAY 27 (RD27) - OFFICIAL REGISTRATION LEDGER',
    pdfSubHeader: 'Batch 27 Executive Committee Ledger',
    watermarkLogo: 'RD27 OFFICIAL',
    watermarkOpacity: 0.08,
    footerText: 'Official Rag Day 27 Portal',
    signatureArea: 'Authorized Committee Signatures',
    signatureTitle: 'Convener & Finance Committee',
    approvalText: 'Verified & Approved',
    invitationCardTitle: 'Official Gate Pass',
    customNotes: 'Batch 27 Pass',
  },
  websiteSettings = {
    eventName: 'RAG DAY of NIC 27',
    eventDescription: 'Official Rag Day Celebration',
    eventDate: 'November 27, 2027',
    eventTime: '10:00 AM',
    venue: 'Central Amphitheatre',
    registrationFee: '500 BDT',
    lastRegDate: 'November 01, 2027',
    footerText: 'Rag Day 27 Committee',
    copyrightText: 'Rag Day 27',
    bannerText: '',
    bannerActive: false,
  },
}) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [adminRegistrations, setAdminRegistrations] = useState<InvitationRecord[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [registrationLoadError, setRegistrationLoadError] = useState('');

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & In-flight actions
  const [rejectingRecord, setRejectingRecord] = useState<InvitationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [approvingRegNo, setApprovingRegNo] = useState<string | null>(null);
  const [hidingRegNo, setHidingRegNo] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Expanded details drawer/modal
  const [selectedRecord, setSelectedRecord] = useState<InvitationRecord | null>(null);

  // Restore active session on mount
  useEffect(() => {
    setLoginError('');
    void (async () => {
      try {
        const profile = await getCurrentAdmin();
        if (profile) {
          setAdmin(profile);
        }
      } catch {
        setAdmin(null);
      }
    })();
  }, []);

  // Fetch registrations from database whenever admin logs in
  const loadAdminRegistrations = async () => {
    setIsLoadingRegistrations(true);
    setRegistrationLoadError('');
    try {
      const result = await getRegistrationList();
      if (result.success) {
        setAdminRegistrations(result.data);
      } else {
        setRegistrationLoadError(result.errorMessage || 'Unable to load registrations from database.');
        setAdminRegistrations([]);
      }
    } catch (error: any) {
      setRegistrationLoadError(error?.message || 'Unable to load registrations from database.');
      setAdminRegistrations([]);
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    if (admin?.role) {
      void loadAdminRegistrations();
    } else {
      setAdminRegistrations([]);
      setRegistrationLoadError('');
    }
  }, [admin?.role]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const profile = await signInAdmin(passcode);
      setAdmin(profile);
      setPasscode('');
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid Admin Passcode');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await signOutAdmin();
    setAdmin(null);
    setAdminRegistrations([]);
    setRegistrationLoadError('');
    setPasscode('');
    setSelectedRecord(null);
    setRejectingRecord(null);
  };

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return adminRegistrations.filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      // Search query (Reg No, Full Name, Student ID, Roll, Contact No, Txn ID, Jersey Name)
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesReg = r.registration_no?.toLowerCase().includes(query);
        const matchesName = r.full_name?.toLowerCase().includes(query);
        const matchesId = r.student_id?.toLowerCase().includes(query);
        const matchesRoll = r.class_roll?.toLowerCase().includes(query);
        const matchesMobile = r.contact_mobile_number?.includes(query) || r.sender_mobile_no?.includes(query);
        const matchesTxn = r.transaction_id?.toLowerCase().includes(query);
        const matchesJersey = r.jersey_back_name?.toLowerCase().includes(query);
        return Boolean(matchesReg || matchesName || matchesId || matchesRoll || matchesMobile || matchesTxn || matchesJersey);
      }
      return true;
    });
  }, [adminRegistrations, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = adminRegistrations.length;
    const pending = adminRegistrations.filter(r => r.status === 'pending').length;
    const approved = adminRegistrations.filter(r => r.status === 'approved').length;
    const rejected = adminRegistrations.filter(r => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [adminRegistrations]);

  // Approve action
  const handleApprove = async (regNo: string) => {
    setApprovingRegNo(regNo);
    setActionMessage(null);
    try {
      await onUpdateStatus(regNo, 'approved');
      // Update local state immediately with approved status
      setAdminRegistrations(prev =>
        prev.map(r =>
          r.registration_no === regNo
            ? { ...r, status: 'approved', reject_reason: undefined, approved_at: new Date().toISOString() }
            : r
        )
      );
      if (selectedRecord?.registration_no === regNo) {
        setSelectedRecord(prev => prev ? { ...prev, status: 'approved', reject_reason: undefined } : null);
      }
      setActionMessage({ text: `Registration ${regNo} approved successfully!`, type: 'success' });
    } catch (err: any) {
      setActionMessage({ text: err?.message || `Unable to approve ${regNo}`, type: 'error' });
    } finally {
      setApprovingRegNo(null);
    }
  };

  // Open reject modal
  const openRejectModal = (record: InvitationRecord) => {
    setRejectingRecord(record);
    setRejectReason(record.reject_reason || '');
  };

  // Confirm rejection
  const handleConfirmReject = async () => {
    if (!rejectingRecord) return;
    const cleanReason = rejectReason.trim();
    if (!cleanReason) {
      setActionMessage({ text: 'Rejection reason is strictly required.', type: 'error' });
      return;
    }
    const regNo = rejectingRecord.registration_no;
    setIsSubmittingReject(true);
    setActionMessage(null);
    try {
      await onUpdateStatus(regNo, 'rejected', cleanReason);
      setAdminRegistrations(prev =>
        prev.map(r =>
          r.registration_no === regNo
            ? { ...r, status: 'rejected', reject_reason: cleanReason, rejected_at: new Date().toISOString() }
            : r
        )
      );
      if (selectedRecord?.registration_no === regNo) {
        setSelectedRecord(prev => prev ? { ...prev, status: 'rejected', reject_reason: cleanReason } : null);
      }
      setRejectingRecord(null);
      setRejectReason('');
      setActionMessage({ text: `Registration ${regNo} rejected with reason recorded.`, type: 'success' });
    } catch (err: any) {
      setActionMessage({ text: err?.message || `Unable to reject ${regNo}`, type: 'error' });
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Hide / Delete action (Web-only soft delete)
  const handleHide = async (regNo: string) => {
    if (!onDeleteRegistration) return;
    const confirmed = window.confirm(`Are you sure you want to remove ${regNo} from the web view? This record will remain safely stored in the database.`);
    if (!confirmed) return;

    setHidingRegNo(regNo);
    setActionMessage(null);
    try {
      await onDeleteRegistration(regNo);
      // Remove from current admin view immediately as designed
      setAdminRegistrations(prev => prev.filter(r => r.registration_no !== regNo));
      if (selectedRecord?.registration_no === regNo) {
        setSelectedRecord(null);
      }
      setActionMessage({ text: `Registration ${regNo} removed from view. (Database record preserved)`, type: 'success' });
    } catch (err: any) {
      setActionMessage({ text: err?.message || `Unable to remove ${regNo}`, type: 'error' });
    } finally {
      setHidingRegNo(null);
    }
  };

  // Export ledger to PDF
  const handleExportPDF = () => {
    if (!admin?.role) return;
    try {
      generateRegistrationListPDF(adminRegistrations, pdfSettings, websiteSettings, admin.role);
    } catch (err: any) {
      alert(err?.message || 'Unable to generate PDF ledger.');
    }
  };

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // LOGIN SCREEN (If not authenticated)
  // --------------------------------------------------------------------------
  if (!admin) {
    return (
      <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative border border-slate-100 animate-scaleUp">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Admin Access</h2>
              <p className="text-xs text-slate-500 mt-0.5">Enter committee passcode to unlock your admin panel.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Enter Male or Female Admin passcode"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono font-medium focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
                autoFocus
                required
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !passcode.trim()}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-indigo-600 active:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Passcode…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Database-backed role resolution: <strong className="text-slate-600">Male Admin</strong> or <strong className="text-slate-600">Female Admin</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATED ADMIN PANEL (Shared structure for Male & Female Admin)
  // --------------------------------------------------------------------------
  const isMaleAdmin = admin.role === 'male_admin';
  const roleBadgeColor = isMaleAdmin
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-pink-50 text-pink-700 border-pink-200';
  const panelTitle = isMaleAdmin ? 'Male Admin Panel' : 'Female Admin Panel';
  const genderSubtext = isMaleAdmin ? 'Boys Wing Registrations' : 'Girls Wing Registrations';

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-7xl h-[95vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp">

        {/* 1. ADMIN HEADER */}
        <header className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl grid place-items-center font-black text-base sm:text-lg border shrink-0 ${roleBadgeColor}`}>
              {isMaleAdmin ? '♂' : '♀'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-sans text-slate-900 tracking-tight leading-tight truncate">
                  {panelTitle}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${roleBadgeColor}`}>
                  {admin.role}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate leading-tight mt-0.5">
                Logged in as <strong className="text-slate-700">{admin.full_name}</strong> · {genderSubtext}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExportPDF}
              disabled={adminRegistrations.length === 0}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              title="Download registration ledger as PDF"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Export PDF</span>
            </button>

            <button
              onClick={loadAdminRegistrations}
              disabled={isLoadingRegistrations}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh registrations from database"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRegistrations ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Sign out of admin session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-0.5"
              title="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Action toast/banner */}
        {actionMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* 2. REGISTRATION STATISTICS & SUMMARY - Compact Single Row */}
        <section className="px-4 py-2 sm:px-5 sm:py-2.5 border-b border-slate-200 bg-slate-50/70 overflow-x-auto shrink-0">
          <div className="grid grid-cols-4 min-w-[320px] gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-tight truncate">
                Total {isMaleAdmin ? 'Male' : 'Female'}
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 leading-tight">{stats.total}</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block leading-tight truncate">
                Pending Review
              </span>
              <div className="text-base sm:text-lg font-black text-amber-700 mt-0.5 leading-tight">{stats.pending}</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-emerald-200/80 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block leading-tight truncate">
                Approved
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 leading-tight">{stats.approved}</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-rose-200/80 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block leading-tight truncate">
                Rejected
              </span>
              <div className="text-base sm:text-lg font-black text-rose-700 mt-0.5 leading-tight">{stats.rejected}</div>
            </div>
          </div>
        </section>

        {/* 3. CONTROLS: STATUS FILTERS & SEARCH */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => {
              const active = statusFilter === tab;
              const count = tab === 'all' ? stats.total : stats[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-56 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search reg no, name, roll, txn…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-indigo-600 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4. REGISTRATION TABLE / LIST */}
        <div className="flex-1 overflow-auto bg-slate-50/30">
          {isLoadingRegistrations ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold">Loading {panelTitle} records from Supabase…</span>
            </div>
          ) : registrationLoadError ? (
            <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-sm">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">Database Connection Issue</h3>
              <p className="text-xs text-rose-600 mt-1">{registrationLoadError}</p>
              <button
                onClick={loadAdminRegistrations}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Retry Query
              </button>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <User className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-semibold">No {statusFilter !== 'all' ? statusFilter : ''} registrations found.</span>
              {searchTerm && <span className="text-[11px] text-slate-400">Try clearing your search query.</span>}
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">SL</th>
                    <th className="px-3 py-3 whitespace-nowrap">Photo</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Reg No</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Student Name</th>
                    <th className="px-3 py-3 whitespace-nowrap">Roll / Section</th>
                    <th className="px-3 py-3 whitespace-nowrap">College ID</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Jersey</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Payment</th>
                    <th className="px-3 py-3 whitespace-nowrap">Status</th>
                    <th className="px-3.5 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredRegistrations.map(r => {
                    const isApproved = r.status === 'approved';
                    const isRejected = r.status === 'rejected';
                    const isPending = r.status === 'pending';

                    return (
                      <tr
                        key={r.registration_no}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => setSelectedRecord(r)}
                      >
                        {/* SL No */}
                        <td className="px-3.5 py-3 font-mono text-slate-500 font-bold">
                          {r.sl_no ?? '—'}
                        </td>

                        {/* Student Photo */}
                        <td className="px-3 py-2.5">
                          {r.student_photo ? (
                            <img
                              src={r.student_photo}
                              alt={r.full_name}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 grid place-items-center font-bold text-[10px]">
                              N/A
                            </div>
                          )}
                        </td>

                        {/* Registration Number */}
                        <td className="px-3.5 py-3 font-mono font-black text-indigo-600 text-xs whitespace-nowrap">
                          {r.registration_no}
                        </td>

                        {/* Student Name & Contact */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {r.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {r.contact_mobile_number || '—'}
                          </div>
                        </td>

                        {/* Roll, Group & Section */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">Roll: {r.class_roll}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.academic_group} · <span className="font-bold text-slate-700">{r.academic_section}</span>
                          </div>
                        </td>

                        {/* Student ID */}
                        <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {r.student_id}
                        </td>

                        {/* Jersey Info */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <span className="font-mono text-indigo-600">#{r.jersey_number}</span>
                            <span>{r.jersey_back_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Size: <strong className="text-slate-700">{r.jersey_size}</strong>
                          </div>
                        </td>

                        {/* Payment Info */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800 capitalize flex items-center gap-1">
                            <span className={r.send_method === 'bkash' ? 'text-pink-600 font-black' : 'text-orange-600 font-black'}>
                              {r.send_method}
                            </span>
                            <span className="text-[11px] text-slate-400">({r.payment_time})</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {r.sender_mobile_no}
                          </div>
                          {r.transaction_id && (
                            <div className="text-[10px] font-mono text-indigo-600 truncate max-w-28" title={r.transaction_id}>
                              Txn: {r.transaction_id}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                              {r.reject_reason && (
                                <p className="text-[10px] text-rose-600 font-medium max-w-36 truncate mt-0.5" title={r.reject_reason}>
                                  {r.reject_reason}
                                </p>
                              )}
                            </div>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Row Actions */}
                        <td className="px-3.5 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Approve Button */}
                            <button
                              onClick={() => handleApprove(r.registration_no)}
                              disabled={isApproved || approvingRegNo === r.registration_no}
                              title="Approve Registration"
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                isApproved
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 shadow-2xs'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            {/* Reject Button */}
                            <button
                              onClick={() => openRejectModal(r)}
                              disabled={isRejected}
                              title="Reject Registration (Reason Required)"
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                isRejected
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 shadow-2xs'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>

                            {/* Hide / Delete Button (Web-only soft delete) */}
                            <button
                              onClick={() => handleHide(r.registration_no)}
                              disabled={hidingRegNo === r.registration_no}
                              title="Delete from Web View (Kept in Database)"
                              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-all cursor-pointer border border-slate-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5. FOOTER STATUS BAR */}
        <footer className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 shrink-0">
          <div>
            Showing <strong className="text-slate-800">{filteredRegistrations.length}</strong> of <strong className="text-slate-800">{adminRegistrations.length}</strong> {isMaleAdmin ? 'male' : 'female'} registrations
          </div>
        </footer>

      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: REJECT REGISTRATION WITH REASON (Required) */}
      {/* ---------------------------------------------------------------------- */}
      {rejectingRecord && (
        <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Reject Registration</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {rejectingRecord.registration_no} · {rejectingRecord.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setRejectingRecord(null); setRejectReason(''); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Rejection Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="State clearly why this registration is rejected (e.g. Transaction ID mismatch, incomplete payment, invalid student ID)..."
                rows={4}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-xs font-sans leading-relaxed outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-slate-400"
                autoFocus
                required
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                This reason will be recorded in Supabase and shown to the student on the official gate pass lookup page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setRejectingRecord(null); setRejectReason(''); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject || !rejectReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-200 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                {isSubmittingReject ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording in DB…</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DRAWER: DETAILED REGISTRATION VIEW */}
      {/* ---------------------------------------------------------------------- */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[310] bg-black/50 backdrop-blur-xs flex items-center justify-end p-2 sm:p-4">
          <div className="w-full max-w-lg h-full max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-slideLeft">
            
            <header className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Registration Details</span>
                <div className="font-mono text-base font-black text-indigo-600">{selectedRecord.registration_no}</div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-auto p-5 space-y-5 text-xs">
              {/* Photo & Identity Banner */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {selectedRecord.student_photo ? (
                  <img
                    src={selectedRecord.student_photo}
                    alt={selectedRecord.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-300 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-400 grid place-items-center font-bold text-xs">
                    No Photo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">{selectedRecord.full_name}</h4>
                  <p className="text-slate-500 font-mono mt-0.5">SL: #{selectedRecord.sl_no} · ID: {selectedRecord.student_id}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedRecord.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      selectedRecord.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      Status: {selectedRecord.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                      {selectedRecord.gender}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <section className="space-y-2">
                <h5 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Academic Profile</h5>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Class Roll</span>
                    <strong className="text-slate-800 font-mono">{selectedRecord.class_roll}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">College ID</span>
                    <strong className="text-slate-800 font-mono">{selectedRecord.student_id}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Academic Group</span>
                    <strong className="text-slate-800">{selectedRecord.academic_group}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Section</span>
                    <strong className="text-slate-800">{selectedRecord.academic_section}</strong>
                  </div>
                </div>
              </section>

              {/* Jersey Customization */}
              <section className="space-y-2">
                <h5 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Jersey Customization</h5>
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-400 block uppercase font-bold">Back Print</span>
                    <div className="text-sm font-black text-indigo-900 flex items-center gap-2">
                      <span className="font-mono text-base">#{selectedRecord.jersey_number}</span>
                      <span>{selectedRecord.jersey_back_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-400 block uppercase font-bold">Selected Size</span>
                    <div className="text-base font-black text-indigo-900 font-mono">{selectedRecord.jersey_size}</div>
                  </div>
                </div>
              </section>

              {/* Payment Verification */}
              <section className="space-y-2">
                <h5 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Payment Audit</h5>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Method:</span>
                    <strong className="capitalize font-black text-slate-800">{selectedRecord.send_method}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Sender Mobile No:</span>
                    <strong className="font-mono text-slate-800">{selectedRecord.sender_mobile_no}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Payment Time:</span>
                    <strong className="font-mono text-slate-800">{selectedRecord.payment_time}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">Transaction ID:</span>
                    <strong className="font-mono text-indigo-600">{selectedRecord.transaction_id || 'Not Provided'}</strong>
                  </div>
                </div>
              </section>

              {/* Rejection / Approval Audit Records */}
              {selectedRecord.reject_reason && (
                <section className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                    Recorded Rejection Reason
                  </span>
                  <p className="text-rose-900 font-medium leading-relaxed">{selectedRecord.reject_reason}</p>
                  {selectedRecord.rejected_at && (
                    <span className="text-[10px] text-rose-500 font-mono block mt-1">
                      Recorded at: {new Date(selectedRecord.rejected_at).toLocaleString()}
                    </span>
                  )}
                </section>
              )}

              {selectedRecord.approved_at && (
                <section className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                  <strong>Approved at:</strong> {new Date(selectedRecord.approved_at).toLocaleString()}
                </section>
              )}

              {/* Invitation Card Generator (Direct download for approved) */}
              {selectedRecord.status === 'approved' && (
                <div className="pt-2">
                  <button
                    onClick={() => generateInvitationCardPDF(selectedRecord, pdfSettings, websiteSettings)}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Invitation Pass (PDF)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <footer className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                onClick={() => handleHide(selectedRecord.registration_no)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove From Web</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedRecord.status !== 'rejected' && (
                  <button
                    onClick={() => openRejectModal(selectedRecord)}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-bold transition-all"
                  >
                    Reject
                  </button>
                )}
                {selectedRecord.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(selectedRecord.registration_no)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}
              </div>
            </footer>

          </div>
        </div>
      )}

    </div>
  );
};
