import React, { useEffect, useMemo, useState } from 'react';
import type { InvitationRecord, InvitationStatus, AdminProfile, PdfSettings, WebsiteSettings } from '../types';
import { signInAdmin, signOutAdmin, getCurrentAdmin, getStoredAdminPasscode } from '../lib/supabase';
import { getRegistrationList } from '../services/admin';
import { resolveStudentPhotoUrl } from '../services/storage';
import { calculateRegistrationOpenState, setManualRegistrationOverride } from '../lib/superAdminConfig';
import { generateRegistrationListPDF, generateInvitationCardPDF, sortRegistrationsForAdmin } from '../utils/pdfGenerator';
import { getRegistrationEditMetadata, setRegistrationIndividualEditLock, setServerRegistrationOpenStatus } from '../services/registrationEditing';
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
        <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-400 grid place-items-center font-bold text-xs select-none">
          No Photo
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 grid place-items-center font-bold text-[10px] select-none">
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
        className="w-16 h-16 rounded-2xl object-cover border border-slate-300 shadow-sm"
      />
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={name}
      onError={() => setLoadError(true)}
      className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs"
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
  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus | 'updated'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & In-flight actions
  const [rejectingRecord, setRejectingRecord] = useState<InvitationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [approvingRegNo, setApprovingRegNo] = useState<string | null>(null);
  const [hidingRegNo, setHidingRegNo] = useState<string | null>(null);
  const [lockingRegNo, setLockingRegNo] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editMetadata, setEditMetadata] = useState<any[]>([]);
  const [isLoadingEditMetadata, setIsLoadingEditMetadata] = useState(false);

  // Expanded details drawer/modal
  const [selectedRecord, setSelectedRecord] = useState<InvitationRecord | null>(null);

  // Registration Auto / Manual state
  const [regState, setRegState] = useState(calculateRegistrationOpenState);

  const handleToggleRegistrationOpen = async () => {
    const currentPasscode = getStoredAdminPasscode() || passcode;
    if (regState.isOpen) {
      const confirmDisable = window.confirm("Manually DISABLE registration? Students will not be able to register until re-enabled.");
      if (!confirmDisable) return;
      setManualRegistrationOverride('disable');
      setRegState(calculateRegistrationOpenState());
      if (currentPasscode) {
        void setServerRegistrationOpenStatus(currentPasscode, false);
      }
      setActionMessage({ text: 'Registration manually DISABLED by admin.', type: 'success' });
    } else {
      const confirmEnable = window.confirm("Manually ENABLE registration? Students will be able to register immediately.");
      if (!confirmEnable) return;
      setManualRegistrationOverride('enable');
      setRegState(calculateRegistrationOpenState());
      if (currentPasscode) {
        void setServerRegistrationOpenStatus(currentPasscode, true);
      }
      setActionMessage({ text: 'Registration manually ENABLED by admin.', type: 'success' });
    }
  };

  const handleToggleLock = async (regNo: string, currentLocked: boolean) => {
    const currentPasscode = getStoredAdminPasscode() || passcode;
    if (!currentPasscode) {
      setActionMessage({ text: 'Admin authentication required to change lock status.', type: 'error' });
      return;
    }
    setLockingRegNo(regNo);
    try {
      const newLocked = !currentLocked;
      const res = await setRegistrationIndividualEditLock(currentPasscode, regNo, newLocked);
      if (res.success) {
        setAdminRegistrations(prev =>
          prev.map(r => r.registration_no === regNo ? { ...r, edit_locked: newLocked } : r)
        );
        setEditMetadata(prev =>
          prev.map(m => m.registration_no === regNo ? { ...m, edit_locked: newLocked } : m)
        );
        setActionMessage({
          text: `Registration ${regNo} editing is now ${newLocked ? 'LOCKED' : 'UNLOCKED'}.`,
          type: 'success',
        });
      } else {
        setActionMessage({ text: res.errorMessage || 'Unable to update lock status.', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: e?.message || 'Unable to update lock status.', type: 'error' });
    } finally {
      setLockingRegNo(null);
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
    }
  }, [isOpen]);

  // Fetch registrations from database whenever admin logs in
  const loadAdminRegistrations = async () => {
    setIsLoadingRegistrations(true);
    setRegistrationLoadError('');
    try {
      const [result, metadata] = await Promise.all([
        getRegistrationList(),
        getStoredAdminPasscode()
          ? getRegistrationEditMetadata(getStoredAdminPasscode() || '')
          : Promise.resolve([]),
      ]);
      if (result.success) {
        const maleRecords = result.data.filter(record => record.gender === 'male');
        setAdminRegistrations(sortRegistrationsForAdmin(maleRecords));
        setEditMetadata(metadata);
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
      if (profile.role !== 'male_admin') {
        await signOutAdmin();
        setLoginError('Only Male Admin access is enabled for this website.');
        return;
      }
      setAdmin(profile);
      setIsLoadingEditMetadata(true);
      void getRegistrationEditMetadata(getStoredAdminPasscode() || '').then(setEditMetadata).catch((e:any)=>setActionMessage({text:e?.message||'Unable to load edit metadata.',type:'error'})).finally(()=>setIsLoadingEditMetadata(false));
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
      if (statusFilter === 'updated' ? !((editMetadata.find(item => item.registration_no === r.registration_no)?.edit_count || 0) > 0) : statusFilter !== 'all' && r.status !== statusFilter) {
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
  }, [adminRegistrations, statusFilter, searchTerm, editMetadata]);

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
        prev.map(r =>
          r.registration_no === regNo
            ? (updatedRecord
                ? { ...r, ...updatedRecord }
                : { ...r, status: 'approved', reject_reason: undefined, approved_at: new Date().toISOString() })
            : r
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
        prev.map(r =>
          r.registration_no === regNo
            ? (updatedRecord
                ? { ...r, ...updatedRecord }
                : { ...r, status: 'rejected', reject_reason: cleanReason, rejected_at: new Date().toISOString() })
            : r
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
      <div className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-md glass-modal rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.4),inset_0_1.5px_2px_white] p-6 sm:p-8 relative border border-white/95 animate-scaleUp">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-300/40 text-[#5B5FEF] grid place-items-center shadow-xs backdrop-blur-md">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Admin Access</h2>
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
                placeholder="Enter Male Admin passcode"
                className="w-full px-4 py-3.5 rounded-xl glass-input text-sm font-mono font-medium focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none transition-all placeholder:text-slate-400"
                autoFocus
                required
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-300/50 text-rose-700 text-xs font-semibold flex items-center gap-2 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !passcode.trim()}
              className="w-full py-3.5 rounded-xl glass-button-primary font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

          <div className="mt-6 pt-5 border-t border-slate-200/60 text-center">
            <span className="text-[11px] text-slate-500 font-medium">
              Admin access is restricted to the Boys Wing.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATED MALE ADMIN PANEL
  // --------------------------------------------------------------------------
  const isMaleAdmin = true;
  const roleBadgeColor = 'bg-blue-500/15 text-blue-700 border-blue-300/40';
  const panelTitle = 'Male Admin Panel';
  const genderSubtext = 'Boys Wing Registrations';

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="w-full max-w-7xl h-[95vh] rounded-3xl glass-modal shadow-[0_30px_75px_-20px_rgba(0,0,0,0.35),inset_0_1.5px_2px_white] border border-white/95 flex flex-col overflow-hidden animate-scaleUp">

        {/* 1. ADMIN HEADER */}
        <header className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200/80 glass-modal-header flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl grid place-items-center font-black text-base sm:text-lg border shrink-0 backdrop-blur-md ${roleBadgeColor}`}>
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
            {/* Registration Auto/Manual Status & Toggle */}
            <button
              onClick={handleToggleRegistrationOpen}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border backdrop-blur-md ${
                regState.isOpen
                  ? 'bg-emerald-500/15 text-emerald-800 border-emerald-300/50 hover:bg-rose-500/15 hover:text-rose-800 hover:border-rose-300/50'
                  : 'bg-rose-500/15 text-rose-800 border-rose-300/50 hover:bg-emerald-500/15 hover:text-emerald-800 hover:border-emerald-300/50'
              }`}
              title={`Click to ${regState.isOpen ? 'manually DISABLE' : 'manually ENABLE'} registration. (Mode: ${regState.isAuto ? 'Automatic Schedule' : 'Manual Override'})`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${regState.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="hidden lg:inline">
                Reg: {regState.isOpen ? 'Open' : 'Closed'} ({regState.isAuto ? 'Auto' : 'Manual'})
              </span>
              <span className="lg:hidden">
                Reg: {regState.isOpen ? 'Open' : 'Closed'}
              </span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={adminRegistrations.length === 0}
              className="p-2 sm:px-3 sm:py-2 rounded-xl glass-button text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              title="Download registration ledger as PDF"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Export PDF</span>
            </button>

            <button
              onClick={loadAdminRegistrations}
              disabled={isLoadingRegistrations}
              className="p-2 sm:px-3 sm:py-2 rounded-xl glass-button text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh registrations from database"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRegistrations ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 rounded-xl glass-button text-slate-700 hover:bg-rose-500/15 hover:text-rose-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-white/80"
              title="Sign out of admin session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors ml-0.5 cursor-pointer"
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

        {/* 2. REGISTRATION STATISTICS & SUMMARY - Frosted Glass Row */}
        <section className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200/80 bg-white/40 backdrop-blur-md overflow-x-auto shrink-0">
          <div className="grid grid-cols-4 min-w-[320px] gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl glass-card border border-slate-200/90 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block leading-tight truncate">
                Total Male
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 leading-tight">{stats.total}</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-500/10 backdrop-blur-md border border-amber-300/60 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block leading-tight truncate">
                Pending Review
              </span>
              <div className="text-base sm:text-lg font-black text-amber-800 mt-0.5 leading-tight">{stats.pending}</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 backdrop-blur-md border border-emerald-300/60 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block leading-tight truncate">
                Approved
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-800 mt-0.5 leading-tight">{stats.approved}</div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-rose-500/10 backdrop-blur-md border border-rose-300/60 shadow-2xs">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block leading-tight truncate">
                Rejected
              </span>
              <div className="text-base sm:text-lg font-black text-rose-800 mt-0.5 leading-tight">{stats.rejected}</div>
            </div>
          </div>
        </section>

        {/* 3. CONTROLS: STATUS FILTERS & SEARCH */}
        <div className="px-5 py-3 border-b border-slate-200/80 bg-white/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl glass-surface-subtle">
            {(['all', 'pending', 'approved', 'rejected', 'updated'] as const).map(tab => {
              const active = statusFilter === tab;
              const count = tab === 'all' ? stats.total : tab === 'updated' ? editMetadata.filter(row => Number(row.edit_count) > 0 && adminRegistrations.some(r => r.registration_no === row.registration_no)).length : stats[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'glass-tab-active text-[#4338CA] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span>{tab === 'updated' ? 'Update' : tab}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${active ? 'bg-white/25 text-white' : 'bg-white/65 backdrop-blur-md border border-white/80 text-slate-700'}`}>
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
              className="w-full pl-8 pr-3 py-2 rounded-xl glass-input text-xs text-slate-900 placeholder-slate-400 focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 4. REGISTRATION TABLE / LIST */}
        <div className="flex-1 overflow-auto bg-slate-50/20 backdrop-blur-xs">
          {isLoadingRegistrations ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold">Loading {panelTitle} records from Supabase…</span>
            </div>
          ) : registrationLoadError ? (
            <div className="p-8 text-center max-w-md mx-auto my-12 glass-card rounded-3xl border border-rose-300 shadow-sm">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">Database Connection Issue</h3>
              <p className="text-xs text-rose-600 mt-1">{registrationLoadError}</p>
              <button
                onClick={loadAdminRegistrations}
                className="mt-4 px-4 py-2 rounded-xl glass-button-primary text-white text-xs font-bold cursor-pointer"
              >
                Retry Query
              </button>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <User className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-semibold">No {statusFilter === 'updated' ? 'updated' : statusFilter !== 'all' ? statusFilter : ''} registrations found.</span>
              {searchTerm && <span className="text-[11px] text-slate-400">Try clearing your search query.</span>}
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full text-left text-xs divide-y divide-slate-200/80">
                <thead className="bg-white/60 text-slate-700 font-bold sticky top-0 z-10 backdrop-blur-xl border-b border-white/80">
                  {statusFilter === 'updated' ? (
                    <tr>
                      <th className="px-3.5 py-3 whitespace-nowrap">SL</th>
                      <th className="px-3 py-3 whitespace-nowrap">Photo</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Reg No</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Student Name</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Edits Used</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Last Edited</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Lock Status</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-3.5 py-3 whitespace-nowrap">SL</th>
                      <th className="px-3 py-3 whitespace-nowrap">Photo</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Reg No</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Student Name</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Roll / Section</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">College ID</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Jersey</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Payment</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Status</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-white/55 bg-white/20 backdrop-blur-md">
                  {filteredRegistrations.map(r => {
                    const isApproved = r.status === 'approved';
                    const isRejected = r.status === 'rejected';
                    const isPending = r.status === 'pending';
                    const meta = editMetadata.find(item => item.registration_no === r.registration_no);
                    const editCount = r.edit_count ?? meta?.edit_count ?? 0;
                    const isLocked = Boolean(r.edit_locked ?? meta?.edit_locked);
                    const lastEdited = r.last_edited_at || meta?.last_edited_at;

                    return (
                      <tr
                        key={r.registration_no}
                        className="hover:bg-white/45 transition-colors cursor-pointer group"
                        onClick={() => setSelectedRecord(r)}
                      >
                        {/* SL No */}
                        <td className="px-3.5 py-3 font-mono text-slate-500 font-bold">
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

                        {statusFilter === 'updated' ? (
                          <>
                            {/* Edits Used */}
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs font-mono">
                                {editCount}/5 edits
                              </span>
                            </td>

                            {/* Last Edited Date/Time */}
                            <td className="px-3.5 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {lastEdited ? new Date(lastEdited).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>

                            {/* Individual Lock Status Toggle */}
                            <td className="px-3.5 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleToggleLock(r.registration_no, isLocked)}
                                disabled={lockingRegNo === r.registration_no}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  isLocked
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-2xs'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                                }`}
                                title={isLocked ? 'Click to unlock editing for this student' : 'Click to lock editing for this student'}
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>{lockingRegNo === r.registration_no ? 'Updating…' : isLocked ? 'Locked' : 'Unlocked'}</span>
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}

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
                                <p className="text-[10px] text-rose-600 font-medium max-w-36 truncate mt-0.5" title={r.reject_reason}>
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
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                  : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/25 hover:text-emerald-800 border border-emerald-300/50 backdrop-blur-md shadow-2xs'
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
                                  : 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/25 hover:text-rose-800 border border-rose-300/50 backdrop-blur-md shadow-2xs'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>

                            {/* Hide / Delete Button (Web-only soft delete) */}
                            <button
                              onClick={() => handleHide(r.registration_no)}
                              disabled={hidingRegNo === r.registration_no}
                              title="Delete from Web View (Kept in Database)"
                              className="p-2 rounded-xl glass-button text-slate-600 hover:bg-rose-500/15 hover:text-rose-700 transition-all cursor-pointer"
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

        {/* 5. FOOTER STATUS BAR: Frosted Glass */}
        <footer className="px-5 py-2.5 border-t border-slate-200/80 bg-white/60 backdrop-blur-md text-[11px] text-slate-500 shrink-0">
          <div>
            Showing <strong className="text-slate-800">{filteredRegistrations.length}</strong> of <strong className="text-slate-800">{adminRegistrations.length}</strong> male registrations
          </div>
        </footer>

      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: REJECT REGISTRATION WITH REASON (Frosted Glass) */}
      {/* ---------------------------------------------------------------------- */}
      {rejectingRecord && (
        <div className="fixed inset-0 z-[320] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg glass-modal rounded-3xl shadow-[0_30px_70px_-15px_rgba(244,63,94,0.3),inset_0_1.5px_2px_white] p-6 border border-rose-300/60 animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 grid place-items-center border border-rose-300/40 shadow-xs backdrop-blur-md">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-black text-slate-900">Reject Registration</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {rejectingRecord.registration_no} · {rejectingRecord.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setRejectingRecord(null); setRejectReason(''); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer transition-colors"
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
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-sans leading-relaxed outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200/50 transition-all placeholder:text-slate-400"
                autoFocus
                required
              />

              {/* Compact, clickable keyword chips */}
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Common Rejection Reasons (Click to insert):
                  </span>
                  {rejectReason && (
                    <button
                      type="button"
                      onClick={() => setRejectReason('')}
                      className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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
                        className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all cursor-pointer backdrop-blur-md ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-400/60 text-rose-800 font-bold shadow-2xs'
                            : 'glass-button text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                This reason will be recorded in Supabase and shown to the student on the official gate pass lookup page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => { setRejectingRecord(null); setRejectReason(''); }}
                className="px-4 py-2.5 rounded-xl glass-button text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject || !rejectReason.trim()}
                className="px-5 py-2.5 rounded-xl glass-button-primary bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white text-xs font-bold transition-all shadow-md shadow-rose-300 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
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
      {/* DRAWER: DETAILED REGISTRATION VIEW (Frosted Glass) */}
      {/* ---------------------------------------------------------------------- */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[310] bg-slate-950/50 backdrop-blur-md flex items-center justify-end p-2 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-lg h-full max-h-[92vh] glass-modal rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.35),inset_0_1.5px_2px_white] border border-white/95 flex flex-col overflow-hidden animate-slideLeft">
            
            <header className="px-5 py-4 border-b border-slate-200/80 glass-modal-header flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Registration Details</span>
                <div className="font-mono text-base font-black text-indigo-600">{selectedRecord.registration_no}</div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-auto p-5 space-y-5 text-xs">
              {/* Photo & Identity Banner */}
              <div className="flex items-center gap-4 p-4 rounded-2xl glass-card border border-slate-200/80">
                <AdminStudentPhoto
                  photo={selectedRecord.student_photo}
                  name={selectedRecord.full_name}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">{selectedRecord.full_name}</h4>
                  <p className="text-slate-500 font-mono mt-0.5">SL: #{selectedRecord.sl_no} · ID: {selectedRecord.student_id}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border ${
                      selectedRecord.status === 'approved' ? 'bg-emerald-500/15 text-emerald-800 border-emerald-300/40' :
                      selectedRecord.status === 'rejected' ? 'bg-rose-500/15 text-rose-800 border-rose-300/40' :
                      'bg-amber-500/15 text-amber-800 border-amber-300/40'
                    }`}>
                      Status: {selectedRecord.status.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold glass-pill text-slate-700 uppercase">
                      {selectedRecord.gender}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <section className="space-y-2">
                <h5 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Academic Profile</h5>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Class Roll</span>
                    <strong className="text-slate-800 font-mono text-xs">{selectedRecord.class_roll}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">College ID</span>
                    <strong className="text-slate-800 font-mono text-xs">{selectedRecord.student_id}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Academic Group</span>
                    <strong className="text-slate-800 text-xs">{selectedRecord.academic_group}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Section</span>
                    <strong className="text-slate-800 text-xs">{selectedRecord.academic_section}</strong>
                  </div>
                </div>
              </section>

              {/* Jersey Customization */}
              <section className="space-y-2">
                <h5 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Jersey Customization</h5>
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 backdrop-blur-md border border-indigo-200/60 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-500 block uppercase font-bold">Back Print</span>
                    <div className="text-sm font-black text-indigo-950 flex items-center gap-2">
                      <span className="font-mono text-base text-[#5B5FEF]">#{selectedRecord.jersey_number}</span>
                      <span>{selectedRecord.jersey_back_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-500 block uppercase font-bold">Selected Size</span>
                    <div className="text-base font-black text-indigo-950 font-mono">{selectedRecord.jersey_size}</div>
                  </div>
                </div>
              </section>

              {/* Payment Verification */}
              <section className="space-y-2">
                <h5 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">Payment Audit</h5>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70 flex items-center justify-between">
                    <span className="text-slate-500">Method:</span>
                    <strong className="capitalize font-black text-slate-800">{selectedRecord.send_method}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70 flex items-center justify-between">
                    <span className="text-slate-500">Sender Mobile No:</span>
                    <strong className="font-mono text-slate-800">{selectedRecord.sender_mobile_no}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70 flex items-center justify-between">
                    <span className="text-slate-500">Payment Time:</span>
                    <strong className="font-mono text-slate-800">{selectedRecord.payment_time}</strong>
                  </div>
                  <div className="p-3 rounded-xl glass-card border border-slate-200/70 flex items-center justify-between">
                    <span className="text-slate-500">Transaction ID:</span>
                    <strong className="font-mono text-indigo-600 font-black">{selectedRecord.transaction_id || 'Not Provided'}</strong>
                  </div>
                </div>
              </section>

              {/* Rejection / Approval Audit Records */}
              {selectedRecord.reject_reason && (
                <section className="p-3.5 rounded-2xl bg-rose-500/10 backdrop-blur-md border border-rose-300/50">
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
                <section className="p-3 rounded-xl bg-emerald-500/10 backdrop-blur-md border border-emerald-300/50 text-emerald-800 text-[11px]">
                  <strong>Approved at:</strong> {new Date(selectedRecord.approved_at).toLocaleString()}
                </section>
              )}

              {/* Invitation Card Generator (Direct download for approved) */}
              {selectedRecord.status === 'approved' && (
                <div className="pt-2">
                  <button
                    onClick={() => generateInvitationCardPDF(selectedRecord, pdfSettings, websiteSettings)}
                    className="w-full py-3 rounded-xl glass-button-primary font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Invitation Pass (PDF)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Actions: Frosted Glass Footer */}
            <footer className="p-4 border-t border-slate-200/80 glass-modal-header flex items-center justify-between gap-2">
              <button
                onClick={() => handleHide(selectedRecord.registration_no)}
                className="px-3.5 py-2.5 rounded-xl glass-button hover:text-rose-700 text-slate-600 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove From Web</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedRecord.status !== 'rejected' && (
                  <button
                    onClick={() => openRejectModal(selectedRecord)}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-300/60 text-xs font-bold transition-all cursor-pointer backdrop-blur-md"
                  >
                    Reject
                  </button>
                )}
                {selectedRecord.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(selectedRecord.registration_no)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
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
