import React, { useEffect, useMemo, useState } from 'react';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import type { InvitationRecord, InvitationStatus, AdminProfile, PdfSettings, WebsiteSettings } from '../types';
import { signInAdmin, signOutAdmin, getCurrentAdmin } from '../lib/supabase';
import { getRegistrationList } from '../services/admin';
import { resolveStudentPhotoUrl } from '../services/storage';
import { calculateRegistrationOpenState, setManualRegistrationOverride } from '../lib/superAdminConfig';
import { safeFormatDateTime } from '../lib/dateUtils';
import {
  generateRegistrationListPDF,
  generateInvitationCardPDF,
  sortRegistrationsForAdmin,
  type RegistrationGroupFilter,
} from '../utils/pdfGenerator';
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
  onUpdateStatus: (registration_no: string, newStatus: InvitationStatus, reason?: string) => Promise<InvitationRecord | void>;
  onDeleteRegistration?: (registration_no: string) => Promise<void>;
  pdfSettings?: PdfSettings;
  websiteSettings?: WebsiteSettings;
}

const AdminStudentPhoto: React.FC<{
  photo?: string | null;
  name: string;
  size?: 'sm' | 'lg';
}> = ({ photo, name, size = 'sm' }) => {
  const [loadError, setLoadError] = useState(false);
  const resolvedUrl = resolveStudentPhotoUrl(photo);

  useEffect(() => {
    setLoadError(false);
  }, [resolvedUrl]);

  if (!resolvedUrl || loadError) {
    if (size === 'lg') {
      return (
        <div className="w-16 h-16 rounded-2xl bg-[#111622] border border-[#C9D0D9]/20 text-[#8B95A5] grid place-items-center font-bold text-xs select-none">
          No Photo
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-[#111622] border border-[#C9D0D9]/18 text-[#8B95A5] grid place-items-center font-bold text-[10px] select-none">
        N/A
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        onError={() => setLoadError(true)}
        className="w-16 h-16 rounded-2xl object-cover border border-[#8BEAFF]/35 shadow-sm bg-[#08090D]"
      />
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={name}
      onError={() => setLoadError(true)}
      className="w-9 h-9 rounded-xl object-cover border border-[#C9D0D9]/25 shadow-2xs bg-[#08090D]"
      loading="lazy"
    />
  );
};

const REJECTION_KEYWORD_CHIPS: { label: string; text: string }[] = [
  { label: 'Full Name', text: 'Full Name is invalid or does not match college records.' },
  { label: 'Class Roll', text: 'Class Roll is incorrect or not found.' },
  { label: 'Student ID', text: 'Student ID does not match official college records.' },
  { label: 'Contact Mobile Number', text: 'Contact Mobile Number is invalid or unreachable.' },
  { label: 'Academic Group', text: 'Academic Group selection is incorrect.' },
  { label: 'Academic Section', text: 'Academic Section selection is incorrect.' },
  { label: 'Student Photo', text: 'Student Photo is invalid, blurry, or missing.' },
  { label: 'Send Method', text: 'Send Method (bKash/Nagad) does not match transaction proof.' },
  { label: 'Sender Mobile Number', text: 'Sender Mobile Number does not match payment statement.' },
  { label: 'Payment Time', text: 'Payment Time does not match transaction timestamp.' },
  { label: 'Transaction ID', text: 'Transaction ID is invalid, incomplete, or already used.' },
  { label: 'Incomplete Payment', text: 'Incomplete Payment: Sent amount does not match required fee.' },
  { label: 'Invalid Student Information', text: 'Invalid Student Information: Please verify name, roll, and student ID.' },
  { label: 'Incorrect Payment Information', text: 'Incorrect Payment Information: Please verify payment method, number, and transaction ID.' },
];

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  invitations: _propInvitations,
  onUpdateStatus,
  onDeleteRegistration,
  pdfSettings = {
    pdfHeader: 'RAG DAY 27 - OFFICIAL REGISTRATION',
    pdfSubHeader: 'Batch 27 Executive Committee',
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
  const [showPasscode, setShowPasscode] = useState(false);
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(false);
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
  const [exportingGroup, setExportingGroup] = useState<RegistrationGroupFilter | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Expanded details drawer/modal
  const [selectedRecord, setSelectedRecord] = useState<InvitationRecord | null>(null);

  // Registration Auto / Manual state
  const [regState, setRegState] = useState(calculateRegistrationOpenState);

  const handleToggleRegistrationOpen = () => {
    if (regState.isOpen) {
      const confirmDisable = window.confirm("Manually DISABLE registration? Students will not be able to register until re-enabled.");
      if (!confirmDisable) return;
      setManualRegistrationOverride('disable');
      setRegState(calculateRegistrationOpenState());
      setActionMessage({ text: 'Registration manually DISABLED by admin.', type: 'success' });
    } else {
      const confirmEnable = window.confirm("Manually ENABLE registration? Students will be able to register immediately.");
      if (!confirmEnable) return;
      setManualRegistrationOverride('enable');
      setRegState(calculateRegistrationOpenState());
      setActionMessage({ text: 'Registration manually ENABLED by admin.', type: 'success' });
    }
  };

  // Ensure login screen is ALWAYS shown when opening the admin portal
  useEffect(() => {
    if (isOpen) {
      setAdmin(null);
      setPasscode('');
      setLoginError('');
      setAdminRegistrations([]);
      setSelectedRecord(null);
      setRejectingRecord(null);
      setExportingGroup(null);
    }
  }, [isOpen]);

  // Fetch registrations from database whenever admin logs in
  const loadAdminRegistrations = async () => {
    setIsLoadingRegistrations(true);
    setRegistrationLoadError('');
    try {
      const result = await getRegistrationList();
      if (result.success) {
        const maleRecords = result.data.filter(record => record.gender === 'male');
        setAdminRegistrations(sortRegistrationsForAdmin(maleRecords));
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
      // Simple frontend passcode gate, matching the existing Male Admin login flow.
      // This is intentionally client-side and is not secure authentication.
      const configuredSuperPasscode = 'admin.nic27';
      if (passcode === configuredSuperPasscode) {
        setSuperAdminUnlocked(true);
        setPasscode('');
        return;
      }
      const profile = await signInAdmin(passcode);
      if (profile.role !== 'male_admin') {
        await signOutAdmin();
        setLoginError('Only Male Admin access is enabled for this website.');
        return;
      }
      setAdmin(profile);
      setPasscode('');
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid Admin Passcode');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Secure close handler (ensures credentials and sensitive data are wiped)
  const handleClose = async () => {
    await signOutAdmin();
    setAdmin(null);
    setAdminRegistrations([]);
    setRegistrationLoadError('');
    setPasscode('');
    setLoginError('');
    setSelectedRecord(null);
    setRejectingRecord(null);
    onClose();
  };

  // Logout handler
  const handleLogout = async () => {
    await signOutAdmin();
    setAdmin(null);
    setAdminRegistrations([]);
    setRegistrationLoadError('');
    setPasscode('');
    setLoginError('');
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
      const updatedRecord = await onUpdateStatus(regNo, 'approved');
      // Update local state ONLY after successful database operation using the returned DB record
      setAdminRegistrations(prev =>
        sortRegistrationsForAdmin(
          prev.map(r =>
            r.registration_no === regNo
              ? (updatedRecord
                  ? { ...r, ...updatedRecord }
                  : { ...r, status: 'approved', reject_reason: undefined, approved_at: new Date().toISOString() })
              : r
          )
        )
      );
      if (selectedRecord?.registration_no === regNo) {
        setSelectedRecord(prev =>
          prev
            ? (updatedRecord
                ? { ...prev, ...updatedRecord }
                : { ...prev, status: 'approved', reject_reason: undefined })
            : null
        );
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

  // Insert keyword rejection chip
  const handleInsertRejectionChip = (chipText: string) => {
    setRejectReason(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return chipText;
      if (trimmed.includes(chipText)) return prev;
      return `${trimmed}\n${chipText}`;
    });
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
      const updatedRecord = await onUpdateStatus(regNo, 'rejected', cleanReason);
      // Update local state ONLY after successful database operation using the returned DB record
      setAdminRegistrations(prev =>
        sortRegistrationsForAdmin(
          prev.map(r =>
            r.registration_no === regNo
              ? (updatedRecord
                  ? { ...r, ...updatedRecord }
                  : { ...r, status: 'rejected', reject_reason: cleanReason, rejected_at: new Date().toISOString() })
              : r
          )
        )
      );
      if (selectedRecord?.registration_no === regNo) {
        setSelectedRecord(prev =>
          prev
            ? (updatedRecord
                ? { ...prev, ...updatedRecord }
                : { ...prev, status: 'rejected', reject_reason: cleanReason })
            : null
        );
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
  const handleExportPDF = async () => {
    if (!admin?.role) return;
    setActionMessage(null);
    try {
      await generateRegistrationListPDF(adminRegistrations, pdfSettings, websiteSettings, admin.role);
    } catch (err: any) {
      setActionMessage({ text: err?.message || 'Unable to generate PDF ledger.', type: 'error' });
    }
  };

  // Export group-specific approved male registrations to PDF
  const handleExportGroupPDF = async (group: RegistrationGroupFilter) => {
    if (!admin?.role || exportingGroup) return;
    setActionMessage(null);
    setExportingGroup(group);
    try {
      await generateRegistrationListPDF(adminRegistrations, pdfSettings, websiteSettings, admin.role, group);
      setActionMessage({ text: `${group} approved registrations PDF downloaded.`, type: 'success' });
    } catch (err: any) {
      setActionMessage({
        text: err?.message || `No approved registrations found for ${group}.`,
        type: 'error',
      });
    } finally {
      setExportingGroup(null);
    }
  };

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // LOGIN SCREEN (If not authenticated)
  // --------------------------------------------------------------------------
  if (superAdminUnlocked) {
    return <SuperAdminDashboard onLogout={async () => { setSuperAdminUnlocked(false); setPasscode(''); setLoginError(''); }} />;
  }

  if (!admin) {
    return (
      <div className="fixed inset-0 z-[300] bg-[#050B14]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-md rounded-3xl border border-cyan-400/25 bg-[#0B1727] p-6 sm:p-8 shadow-[0_32px_90px_rgba(0,0,0,0.8)] relative text-white">
          <button onClick={handleClose} className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close admin access"><X className="h-5 w-5"/></button>
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"><Lock className="h-7 w-7"/></div>
            <p className="text-[10px] font-black tracking-[.28em] text-cyan-300">RAG DAY 27</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">ADMIN ACCESS</h2>
            <p className="mt-2 text-xs text-slate-400">Enter your admin passcode to continue.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Passcode
              <div className="mt-2 flex overflow-hidden rounded-xl border border-white/10 bg-[#13263A] focus-within:border-cyan-400/60">
                <input type={showPasscode?'text':'password'} value={passcode} onChange={e=>setPasscode(e.target.value)} placeholder="Enter passcode" className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-white outline-none" autoFocus required />
                <button type="button" onClick={()=>setShowPasscode(v=>!v)} className="px-4 text-slate-400 hover:text-cyan-200" aria-label={showPasscode?'Hide passcode':'Show passcode'}>{showPasscode?'Hide':'Show'}</button>
              </div>
            </label>
            {loginError&&<div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-200"><AlertCircle className="mr-2 inline h-4 w-4"/>{loginError}</div>}
            <button type="submit" disabled={isLoggingIn||!passcode.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-sm font-black text-white disabled:opacity-50">
              {isLoggingIn?<><RefreshCw className="h-4 w-4 animate-spin"/>Verifying…</>:<><LogIn className="h-4 w-4"/>Sign In</>}
            </button>
          </form>
          <p className="mt-6 border-t border-white/10 pt-4 text-center text-[10px] text-slate-500">Separate admin access · Rag Day 27</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATED MALE ADMIN PANEL
  // --------------------------------------------------------------------------
  const isMaleAdmin = true;
  const panelTitle = 'Male Admin Panel';
  const genderLabel = isMaleAdmin ? 'Male' : 'Female';
  const genderSubtext = 'Boys Wing';

  return (
    <div className="fixed inset-0 z-[300] bg-[#08090D]/82 backdrop-blur-lg flex items-center justify-center p-1.5 sm:p-4 md:p-6 animate-fadeIn">
      <div className="w-full max-w-7xl h-[95vh] rounded-3xl glass-modal shadow-[0_32px_90px_rgba(0,0,0,0.78)] border border-[#C9D0D9]/20 text-[#F5F7FA] flex flex-col overflow-hidden animate-scaleUp">

        {/* 1. ADMIN HEADER */}
        <header className="px-3 py-2.5 sm:px-5 sm:py-3.5 border-b border-[#C9D0D9]/15 glass-modal-header flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 shrink-0">
          {/* Left: [ Male Icon + Male ] + optional desktop wing subtitle */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 sm:shrink">
            <div
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 sm:pl-2 sm:pr-3 py-1 sm:py-1.5 rounded-full bg-[#8BEAFF]/12 border border-[#8BEAFF]/35 text-[#F5F7FA] shrink-0 whitespace-nowrap"
              title={`${panelTitle} (${admin.role})`}
            >
              <span
                aria-hidden="true"
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#8BEAFF]/20 text-[#8BEAFF] grid place-items-center text-xs sm:text-sm font-black shrink-0"
              >
                {isMaleAdmin ? '♂' : '♀'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#F5F7FA] leading-none">
                {genderLabel}
              </span>
            </div>

            <div className="hidden xl:flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#F5F7FA] leading-tight truncate">
                {panelTitle}
              </span>
              <span className="text-[11px] text-[#94A0B2] leading-tight truncate">
                {admin.full_name} · {genderSubtext}
              </span>
            </div>
          </div>

          {/* Right: [ ● Reg: Open ] [ Document ] [ Refresh ] [ Exit ] [ Close ] */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Registration Auto/Manual Status & Toggle */}
            <button
              type="button"
              onClick={handleToggleRegistrationOpen}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border whitespace-nowrap shrink-0 ${
                regState.isOpen
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-400/35 hover:bg-rose-950/60 hover:text-rose-200 hover:border-rose-400/40'
                  : 'bg-rose-950/60 text-rose-300 border-rose-400/35 hover:bg-emerald-950/60 hover:text-emerald-200 hover:border-emerald-400/40'
              }`}
              title={`Click to ${regState.isOpen ? 'manually DISABLE' : 'manually ENABLE'} registration. (Mode: ${regState.isAuto ? 'Automatic Schedule' : 'Manual Override'})`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${regState.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className="hidden lg:inline">
                Reg: {regState.isOpen ? 'Open' : 'Closed'} ({regState.isAuto ? 'Auto' : 'Manual'})
              </span>
              <span className="lg:hidden">
                Reg: {regState.isOpen ? 'Open' : 'Closed'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={adminRegistrations.length === 0}
              className="w-8 h-8 sm:w-9 sm:h-9 lg:w-auto lg:px-3 rounded-full glass-button text-[#C9D0D9] text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0 whitespace-nowrap"
              title="Download registration ledger as PDF"
              aria-label="Download registration ledger as PDF"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8BEAFF] shrink-0" />
              <span className="hidden lg:inline">Export PDF</span>
            </button>

            <button
              type="button"
              onClick={loadAdminRegistrations}
              disabled={isLoadingRegistrations}
              className="w-8 h-8 sm:w-9 sm:h-9 lg:w-auto lg:px-3 rounded-full glass-button text-[#C9D0D9] text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
              title="Refresh registrations from database"
              aria-label="Refresh registrations from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLoadingRegistrations ? 'animate-spin text-[#8BEAFF]' : 'text-[#C9D0D9]'}`} />
              <span className="hidden lg:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-8 h-8 sm:w-9 sm:h-9 lg:w-auto lg:px-3 rounded-full glass-button text-[#C9D0D9] hover:bg-rose-950/60 hover:text-rose-200 hover:border-rose-400/40 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              title="Sign out of admin session"
              aria-label="Sign out of admin session"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden lg:inline">Logout</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-[#8B95A5] hover:text-[#F5F7FA] hover:bg-white/10 transition-colors grid place-items-center cursor-pointer shrink-0"
              title="Close Admin Panel"
              aria-label="Close Admin Panel"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Action toast/banner */}
        {actionMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-200 border-emerald-400/30'
                : 'bg-rose-950/60 text-rose-200 border-rose-400/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span>{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-xs font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <div className="px-3.5 sm:px-5 py-2.5 border-b border-[#C9D0D9]/15 bg-[#090C13]/95 flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto shrink-0">
          <span
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold bg-[#8BEAFF] text-[#08090D] shadow-2xs whitespace-nowrap shrink-0 select-none"
          >
            Registrations
          </span>

          {(
            [
              { code: 'SC', group: 'Science' as RegistrationGroupFilter },
              { code: 'BS', group: 'Business Studies' as RegistrationGroupFilter },
              { code: 'HU', group: 'Humanities' as RegistrationGroupFilter },
            ]
          ).map(({ code, group }) => {
            const isBusy = exportingGroup === group;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleExportGroupPDF(group)}
                disabled={exportingGroup !== null}
                title={`Download approved ${group} registrations PDF`}
                aria-label={`Download approved ${group} registrations PDF`}
                className="px-2.5 sm:px-3.5 py-2 rounded-xl border border-[#C9D0D9]/20 bg-[#101521] hover:bg-[#161D2C] hover:border-[#8BEAFF]/50 active:scale-[0.98] text-[#F5F7FA] text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isBusy ? (
                  <RefreshCw className="w-3.5 h-3.5 text-[#8BEAFF] animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#8BEAFF]" />
                )}
                <span>{code}</span>
              </button>
            );
          })}
        </div>

        {/* 2. REGISTRATION STATISTICS & SUMMARY */}
        <section className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-[#C9D0D9]/15 bg-[#0A0E16]/90 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 tabular-nums">
            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-[#0F1521] border border-[#C9D0D9]/18">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A0B2] block leading-tight">
                Total Male
              </span>
              <div className="text-base sm:text-lg font-black text-[#F5F7FA] mt-0.5 leading-tight">{stats.total}</div>
            </div>
            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-amber-950/35 border border-amber-400/30">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block leading-tight">
                Pending Review
              </span>
              <div className="text-base sm:text-lg font-black text-amber-200 mt-0.5 leading-tight">{stats.pending}</div>
            </div>
            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-emerald-950/35 border border-emerald-400/30">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 block leading-tight">
                Approved
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-200 mt-0.5 leading-tight">{stats.approved}</div>
            </div>
            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-rose-950/35 border border-rose-400/30">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 block leading-tight">
                Rejected
              </span>
              <div className="text-base sm:text-lg font-black text-rose-200 mt-0.5 leading-tight">{stats.rejected}</div>
            </div>
          </div>
        </section>

        {/* 3. CONTROLS: STATUS FILTERS & SEARCH */}
        <div className="px-5 py-3 border-b border-[#C9D0D9]/15 bg-[#0B0F18] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl glass-surface-subtle">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => {
              const active = statusFilter === tab;
              const count = tab === 'all' ? stats.total : stats[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'glass-tab-active text-[#F5F7FA]'
                      : 'text-[#94A0B2] hover:text-[#F5F7FA] hover:bg-white/5'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${active ? 'bg-[#8BEAFF] text-[#08090D]' : 'bg-[#08090D]/80 border border-[#C9D0D9]/18 text-[#C9D0D9]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-56 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A5]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search reg no, name, roll, txn…"
              className="w-full pl-8 pr-8 py-2 rounded-xl glass-input text-xs outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B95A5] hover:text-[#F5F7FA] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4. REGISTRATION TABLE / LIST */}
        <div className="flex-1 overflow-auto bg-[#080A10]">
          {isLoadingRegistrations ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#94A0B2]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#8BEAFF]" />
              <span className="text-xs font-semibold">Loading {panelTitle} records from Supabase…</span>
            </div>
          ) : registrationLoadError ? (
            <div className="p-8 text-center max-w-md mx-auto my-12 glass-card rounded-3xl border border-rose-500/40">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#F5F7FA]">Database Connection Issue</h3>
              <p className="text-xs text-rose-300 mt-1">{registrationLoadError}</p>
              <button
                onClick={loadAdminRegistrations}
                className="mt-4 px-4 py-2 rounded-xl glass-button-primary text-xs font-bold cursor-pointer"
              >
                Retry Query
              </button>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#8B95A5]">
              <User className="w-8 h-8 text-[#626B79]" />
              <span className="text-xs font-semibold">No {statusFilter !== 'all' ? statusFilter : ''} registrations found.</span>
              {searchTerm && <span className="text-[11px] text-[#626B79]">Try clearing your search query.</span>}
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full text-left text-xs divide-y divide-[#C9D0D9]/12">
                <thead className="bg-[#0F1420] text-[#C9D0D9] font-bold sticky top-0 z-10 border-b border-[#C9D0D9]/18">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">SL</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Photo</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Reg No</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Student Name</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Roll / Section</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">College ID</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Jersey</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Payment</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Status</th>
                    <th className="px-3.5 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9D0D9]/10 bg-[#0A0E16]/95">
                  {filteredRegistrations.map(r => {
                    const isApproved = r.status === 'approved';
                    const isRejected = r.status === 'rejected';
                    const isPending = r.status === 'pending';

                    return (
                      <tr
                        key={r.registration_no}
                        className="hover:bg-[#131926] transition-colors cursor-pointer group"
                        onClick={() => setSelectedRecord(r)}
                      >
                        {/* SL No */}
                        <td className="px-3.5 py-3 font-mono text-[#8B95A5] font-bold tabular-nums">
                          {r.sl_no ?? '—'}
                        </td>

                        {/* Student Photo */}
                        <td className="px-3 py-2.5">
                          <AdminStudentPhoto
                            photo={r.student_photo}
                            name={r.full_name}
                            size="sm"
                          />
                        </td>

                        {/* Registration Number */}
                        <td className="px-3.5 py-3 font-mono font-black text-[#8BEAFF] text-xs whitespace-nowrap tabular-nums">
                          {r.registration_no}
                        </td>

                        {/* Student Name & Contact */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-[#F5F7FA] group-hover:text-[#8BEAFF] transition-colors">
                            {r.full_name}
                          </div>
                          <div className="text-[11px] text-[#8B95A5] font-mono tabular-nums">
                            {r.contact_mobile_number || '—'}
                          </div>
                        </td>

                        {/* Roll, Group & Section */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-bold text-[#F5F7FA] tabular-nums">Roll: {r.class_roll}</div>
                          <div className="text-[11px] text-[#8B95A5]">
                            {r.academic_group} · <span className="font-bold text-[#C9D0D9]">{r.academic_section}</span>
                          </div>
                        </td>

                        {/* Student ID */}
                        <td className="px-3 py-3 font-mono text-[#C9D0D9] whitespace-nowrap tabular-nums">
                          {r.student_id}
                        </td>

                        {/* Jersey Info */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-extrabold text-[#F5F7FA] flex items-center gap-1.5">
                            <span className="font-mono text-[#8BEAFF]">#{r.jersey_number}</span>
                            <span>{r.jersey_back_name}</span>
                          </div>
                          <div className="text-[11px] text-[#8B95A5]">
                            Size: <strong className="text-[#C9D0D9]">{r.jersey_size}</strong>
                          </div>
                        </td>

                        {/* Payment Info */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-bold text-[#F5F7FA] capitalize flex items-center gap-1">
                            <span className={r.send_method === 'bkash' ? 'text-[#8BEAFF] font-black' : 'text-[#C9D0D9] font-black'}>
                              {r.send_method}
                            </span>
                            <span className="text-[11px] text-[#8B95A5]">({r.payment_time})</span>
                          </div>
                          <div className="text-[11px] font-mono text-[#94A0B2] tabular-nums">
                            {r.sender_mobile_no}
                          </div>
                          {r.transaction_id && (
                            <div className="text-[10px] font-mono text-[#8BEAFF] truncate max-w-28" title={r.transaction_id}>
                              Txn: {r.transaction_id}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold glass-status glass-status-approved">
                              <CheckCircle2 className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold glass-status glass-status-rejected">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                              {r.reject_reason && (
                                <p className="text-[10px] text-rose-300 font-medium max-w-36 truncate mt-0.5" title={r.reject_reason}>
                                  {r.reject_reason}
                                </p>
                              )}
                            </div>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold glass-status glass-status-pending">
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
                                  ? 'bg-[#121722] text-[#626B79] cursor-not-allowed opacity-50'
                                  : 'bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-400/35'
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
                                  ? 'bg-[#121722] text-[#626B79] cursor-not-allowed opacity-50'
                                  : 'bg-rose-500/12 text-rose-300 hover:bg-rose-500/25 border border-rose-400/35'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>

                            {/* Hide / Delete Button (Web-only soft delete) */}
                            <button
                              onClick={() => handleHide(r.registration_no)}
                              disabled={hidingRegNo === r.registration_no}
                              title="Delete from Web View (Kept in Database)"
                              className="p-2 rounded-xl glass-button text-[#94A0B2] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-400/35 transition-all cursor-pointer"
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
        <footer className="px-5 py-2.5 border-t border-[#C9D0D9]/15 bg-[#0B0F17] text-[11px] text-[#94A0B2] shrink-0">
          <div>
            Showing <strong className="text-[#F5F7FA]">{filteredRegistrations.length}</strong> of <strong className="text-[#F5F7FA]">{adminRegistrations.length}</strong> male registrations
          </div>
        </footer>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: REJECT REGISTRATION WITH REASON */}
      {/* ---------------------------------------------------------------------- */}
      {rejectingRecord && (
        <div className="fixed inset-0 z-[320] bg-[#08090D]/82 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg glass-modal rounded-3xl shadow-[0_32px_90px_rgba(0,0,0,0.78)] p-6 border border-rose-400/35 text-[#F5F7FA] animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-300 grid place-items-center border border-rose-400/35">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-black text-[#F5F7FA]">Reject Registration</h3>
                  <p className="text-xs text-[#94A0B2] font-mono">
                    {rejectingRecord.registration_no} · {rejectingRecord.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setRejectingRecord(null); setRejectReason(''); }}
                className="p-1.5 rounded-xl text-[#8B95A5] hover:text-[#F5F7FA] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#C9D0D9] mb-1.5">
                Rejection Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="State clearly why this registration is rejected (e.g. Transaction ID mismatch, incomplete payment, invalid student ID)..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-sans leading-relaxed outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/25 transition-all"
                autoFocus
                required
              />

              {/* Compact, clickable keyword chips */}
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B95A5]">
                    Common Rejection Reasons (Click to insert):
                  </span>
                  {rejectReason && (
                    <button
                      type="button"
                      onClick={() => setRejectReason('')}
                      className="text-[10px] font-semibold text-[#8B95A5] hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 py-0.5">
                  {REJECTION_KEYWORD_CHIPS.map(chip => {
                    const isSelected = rejectReason.includes(chip.text) || rejectReason.includes(chip.label);
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleInsertRejectionChip(chip.text)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-400/50 text-rose-200 font-bold'
                            : 'glass-button text-[#C9D0D9] hover:text-[#F5F7FA]'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-[#8B95A5] mt-2">
                This reason will be recorded in Supabase and shown to the student on the official gate pass lookup page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#C9D0D9]/15">
              <button
                type="button"
                onClick={() => { setRejectingRecord(null); setRejectReason(''); }}
                className="px-4 py-2.5 rounded-xl glass-button text-[#C9D0D9] text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject || !rejectReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:brightness-110 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-[310] bg-[#08090D]/75 backdrop-blur-lg flex items-center justify-end p-2 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-lg h-full max-h-[92vh] glass-modal rounded-3xl shadow-[0_32px_90px_rgba(0,0,0,0.8)] border border-[#C9D0D9]/20 text-[#F5F7FA] flex flex-col overflow-hidden animate-slideLeft">
            
            <header className="px-5 py-4 border-b border-[#C9D0D9]/15 glass-modal-header flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-[#8B95A5] block">Registration Details</span>
                <div className="font-mono text-base font-black text-[#8BEAFF] tabular-nums">{selectedRecord.registration_no}</div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl text-[#8B95A5] hover:text-[#F5F7FA] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-auto p-5 space-y-5 text-xs">
              {/* Photo & Identity Banner */}
              <div className="flex items-center gap-4 p-4 rounded-2xl glass-card">
                <AdminStudentPhoto
                  photo={selectedRecord.student_photo}
                  name={selectedRecord.full_name}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-[#F5F7FA] truncate">{selectedRecord.full_name}</h4>
                  <p className="text-[#94A0B2] font-mono mt-0.5 tabular-nums">SL: #{selectedRecord.sl_no} · ID: {selectedRecord.student_id}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedRecord.status === 'approved' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-400/35' :
                      selectedRecord.status === 'rejected' ? 'bg-rose-950/60 text-rose-300 border-rose-400/35' :
                      'bg-amber-950/60 text-amber-300 border-amber-400/35'
                    }`}>
                      Status: {selectedRecord.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold glass-pill text-[#C9D0D9] uppercase">
                      {selectedRecord.gender}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <section className="space-y-2">
                <h5 className="font-extrabold uppercase text-[10px] tracking-wider text-[#8B95A5]">Academic Profile</h5>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl glass-card">
                    <span className="text-[10px] text-[#8B95A5] block font-bold uppercase">Class Roll</span>
                    <strong className="text-[#F5F7FA] font-mono text-xs tabular-nums">{selectedRecord.class_roll}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card">
                    <span className="text-[10px] text-[#8B95A5] block font-bold uppercase">College ID</span>
                    <strong className="text-[#F5F7FA] font-mono text-xs tabular-nums">{selectedRecord.student_id}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card">
                    <span className="text-[10px] text-[#8B95A5] block font-bold uppercase">Academic Group</span>
                    <strong className="text-[#F5F7FA] text-xs">{selectedRecord.academic_group}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card">
                    <span className="text-[10px] text-[#8B95A5] block font-bold uppercase">Section</span>
                    <strong className="text-[#F5F7FA] text-xs">{selectedRecord.academic_section}</strong>
                  </div>
                </div>
              </section>

              {/* Jersey Customization */}
              <section className="space-y-2">
                <h5 className="font-extrabold uppercase text-[10px] tracking-wider text-[#8B95A5]">Jersey Customization</h5>
                <div className="p-3.5 rounded-2xl bg-[#090C13] border border-[#8BEAFF]/25 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#8BEAFF] block uppercase font-bold">Back Print</span>
                    <div className="text-sm font-black text-[#F5F7FA] flex items-center gap-2">
                      <span className="font-mono text-base text-[#8BEAFF]">#{selectedRecord.jersey_number}</span>
                      <span>{selectedRecord.jersey_back_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8BEAFF] block uppercase font-bold">Selected Size</span>
                    <div className="text-base font-black text-[#F5F7FA] font-mono">{selectedRecord.jersey_size}</div>
                  </div>
                </div>
              </section>

              {/* Payment Verification */}
              <section className="space-y-2">
                <h5 className="font-extrabold uppercase text-[10px] tracking-wider text-[#8B95A5]">Payment Audit</h5>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl glass-card flex items-center justify-between">
                    <span className="text-[#94A0B2]">Method:</span>
                    <strong className="capitalize font-black text-[#F5F7FA]">{selectedRecord.send_method}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card flex items-center justify-between">
                    <span className="text-[#94A0B2]">Sender Mobile No:</span>
                    <strong className="font-mono text-[#F5F7FA] tabular-nums">{selectedRecord.sender_mobile_no}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card flex items-center justify-between">
                    <span className="text-[#94A0B2]">Payment Time:</span>
                    <strong className="font-mono text-[#F5F7FA] tabular-nums">{selectedRecord.payment_time}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card flex items-center justify-between">
                    <span className="text-[#94A0B2]">Transaction ID:</span>
                    <strong className="font-mono text-[#8BEAFF] font-black">{selectedRecord.transaction_id || 'Not Provided'}</strong>
                  </div>
                </div>
              </section>

              {/* Rejection / Approval Audit Records */}
              {selectedRecord.reject_reason && (
                <section className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-400/35">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block mb-1">
                    Recorded Rejection Reason
                  </span>
                  <p className="text-rose-100 font-medium leading-relaxed">{selectedRecord.reject_reason}</p>
                  {selectedRecord.rejected_at && (
                    <span className="text-[10px] text-rose-300 font-mono block mt-1">
                      Recorded at: {safeFormatDateTime(selectedRecord.rejected_at)}
                    </span>
                  )}
                </section>
              )}

              {selectedRecord.approved_at && (
                <section className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-400/35 text-emerald-200 text-[11px]">
                  <strong>Approved at:</strong> {safeFormatDateTime(selectedRecord.approved_at)}
                </section>
              )}

              {/* Invitation Card Generator (Direct download for approved) */}
              {selectedRecord.status === 'approved' && (
                <div className="pt-2">
                  <button
                    onClick={() => generateInvitationCardPDF(selectedRecord, pdfSettings, websiteSettings)}
                    className="w-full py-3 rounded-xl glass-button-primary font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Invitation Pass (PDF)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <footer className="p-4 border-t border-[#C9D0D9]/15 glass-modal-header flex items-center justify-between gap-2">
              <button
                onClick={() => handleHide(selectedRecord.registration_no)}
                className="px-3.5 py-2.5 rounded-xl glass-button hover:text-rose-300 text-[#94A0B2] text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove From Web</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedRecord.status !== 'rejected' && (
                  <button
                    onClick={() => openRejectModal(selectedRecord)}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 hover:text-white text-rose-300 border border-rose-400/40 text-xs font-bold transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                )}
                {selectedRecord.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(selectedRecord.registration_no)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-105 text-[#08090D] text-xs font-extrabold transition-all inline-flex items-center gap-1.5 cursor-pointer"
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
