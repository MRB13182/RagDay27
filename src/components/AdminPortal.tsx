import React, { useEffect, useMemo, useState } from 'react';
import type { InvitationRecord, InvitationStatus, AdminProfile, PdfSettings, WebsiteSettings } from '../types';
import { signInAdmin, signOutAdmin, getCurrentAdmin } from '../lib/supabase';
import { getRegistrationList } from '../services/admin';
import { generateRegistrationListPDF, generateInvitationCardPDF } from '../utils/pdfGenerator';
import {
  websiteIdentityConfig,
  eventSettingsConfig,
  registrationSettingsConfig,
  countdownSettingsConfig,
  importantNoticeConfig,
} from '../lib/superAdminConfig';
import {
  EDITABLE_SUPER_ADMIN_TEXT_FILES,
  saveEditableSuperAdminText,
  saveEditableSuperAdminImage,
} from '../lib/superAdminTextSettings';

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
  onDeleteRegistration?: (registration_no: string) => Promise<void>;
}

type Tab = 'registrations' | 'super-admin';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  invitations,
  onUpdateStatus,
  onDeleteRegistration,
}) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus>('all');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deletingRegNo, setDeletingRegNo] = useState<string | null>(null);
  const [adminRegistrations, setAdminRegistrations] = useState<InvitationRecord[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [registrationLoadError, setRegistrationLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('registrations');
  const [superAdminValues, setSuperAdminValues] = useState<Record<string, string>>(
    Object.fromEntries(EDITABLE_SUPER_ADMIN_TEXT_FILES.map(file => [file.id, file.defaultValue]))
  );
  const [superAdminSaving, setSuperAdminSaving] = useState<string | null>(null);
  const [superAdminMessage, setSuperAdminMessage] = useState('');
  const [superAdminImagePath, setSuperAdminImagePath] = useState('02. event-settings/Pic/jersey.png');

  useEffect(() => {
    setLoginError('');
    void (async () => {
      try {
        const profile = await getCurrentAdmin();
        if (profile) setAdmin(profile);
      } catch {
        setAdmin(null);
      }
    })();
  }, []);

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
    if (!admin?.role) {
      setAdminRegistrations([]);
      setRegistrationLoadError('');
      return;
    }
    void loadAdminRegistrations();
  }, [admin?.role]);

  const scopedRows = useMemo(() => {
    let rows = adminRegistrations;
    if (admin?.role === 'male_admin') {
      rows = rows.filter(r => String(r.gender || '').toLowerCase() === 'male');
    } else if (admin?.role === 'female_admin') {
      rows = rows.filter(r => String(r.gender || '').toLowerCase() === 'female');
    }

    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.status === statusFilter);
    }

    return rows;
  }, [admin?.role, adminRegistrations, statusFilter]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const profile = await signInAdmin(passcode);
      setAdmin(profile);
      setPasscode('');
    } catch (e: any) {
      setLoginError(e?.message || 'Invalid Admin Passcode');
    }
  };

  const logout = async () => {
    await signOutAdmin();
    setAdmin(null);
    setAdminRegistrations([]);
    setRegistrationLoadError('');
    setPasscode('');
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
    const regNo = rejecting;
    await onUpdateStatus(regNo, 'rejected', rejectReason);
    setRejecting(null);
    setRejectReason('');
  };


  const handleSaveSuperAdminText = async (fileId: string) => {
    const file = EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.id === fileId);
    if (!file) return;
    setSuperAdminSaving(fileId);
    setSuperAdminMessage('');
    try {
      await saveEditableSuperAdminText(file.path, superAdminValues[fileId] ?? '');
      setSuperAdminMessage(`${file.label} saved successfully.`);
    } catch (error: any) {
      setSuperAdminMessage(error?.message || 'Unable to save Super Admin configuration.');
    } finally {
      setSuperAdminSaving(null);
    }
  };

  const handleSuperAdminImageUpload = async (file: File) => {
    setSuperAdminSaving('__image__');
    setSuperAdminMessage('');
    try {
      await saveEditableSuperAdminImage(superAdminImagePath, file);
      setSuperAdminMessage('Super Admin image uploaded successfully.');
    } catch (error: any) {
      setSuperAdminMessage(error?.message || 'Unable to upload Super Admin image.');
    } finally {
      setSuperAdminSaving(null);
    }
  };

  const handleDelete = async (regNo: string) => {
    if (!onDeleteRegistration) return;
    setDeletingRegNo(regNo);
    try {
      await onDeleteRegistration(regNo);
    } finally {
      setDeletingRegNo(null);
    }
  };

  if (!isOpen) return null;

  if (!admin) {
    return (
      <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative">
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Admin Access</h2>
              <p className="text-xs text-slate-500">Enter the admin passcode to continue.</p>
            </div>
          </div>
          <form onSubmit={login} className="space-y-4">
            <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200" placeholder="Admin passcode" />
            {loginError && <p className="text-xs text-rose-600 font-semibold">{loginError}</p>}
            <button type="submit" className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold">
              <span className="inline-flex items-center gap-2"><LogIn className="w-4 h-4" />Sign In</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-7xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/60 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-black text-slate-900">Admin Portal</h2>
            <p className="text-xs text-slate-500">{admin.full_name} · {admin.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAdminRegistrations} className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Refresh</button>
            <button onClick={logout} className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold inline-flex items-center gap-2"><LogOut className="w-4 h-4" />Logout</button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <button onClick={() => setActiveTab('registrations')} className={`px-3 py-2 rounded-xl text-xs font-bold ${activeTab === 'registrations' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Registrations</button>
          <button onClick={() => setActiveTab('super-admin')} className={`px-3 py-2 rounded-xl text-xs font-bold ${activeTab === 'super-admin' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Super Admin</button>
        </div>

        {activeTab === 'registrations' && (
          <>
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold ${statusFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto">
              {isLoadingRegistrations ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading registrations…</div>
              ) : registrationLoadError ? (
                <div className="p-8 text-center text-sm text-rose-600">{registrationLoadError}</div>
              ) : scopedRows.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No registrations found.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left">SL</th>
                      <th className="px-3 py-3 text-left">Photo</th>
                      <th className="px-3 py-3 text-left">Reg No</th>
                      <th className="px-3 py-3 text-left">Name</th>
                      <th className="px-3 py-3 text-left">Gender</th>
                      <th className="px-3 py-3 text-left">Roll</th>
                      <th className="px-3 py-3 text-left">Section</th>
                      <th className="px-3 py-3 text-left">Payment</th>
                      <th className="px-3 py-3 text-left">Payment No</th>
                      <th className="px-3 py-3 text-left">Time</th>
                      <th className="px-3 py-3 text-left">Txn</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedRows.map(r => (
                      <tr key={r.registration_no} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-mono">{r.sl_no}</td>
                        <td className="px-3 py-3">{r.student_photo ? <img src={r.student_photo} alt="" className="w-9 h-9 rounded-lg object-cover" /> : '—'}</td>
                        <td className="px-3 py-3 font-mono font-bold">{r.registration_no}</td>
                        <td className="px-3 py-3 font-semibold">{r.full_name}</td>
                        <td className="px-3 py-3">{r.gender}</td>
                        <td className="px-3 py-3">{r.class_roll}</td>
                        <td className="px-3 py-3">{r.academic_section}</td>
                        <td className="px-3 py-3">{r.send_method}</td>
                        <td className="px-3 py-3">{r.sender_mobile_no}</td>
                        <td className="px-3 py-3">{r.payment_time}</td>
                        <td className="px-3 py-3">{r.transaction_id || '—'}</td>
                        <td className="px-3 py-3 font-bold">{r.status}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleApprove(r.registration_no)} disabled={r.status === 'approved'} title="Approve" className="p-2 rounded-lg bg-emerald-50 text-emerald-700 disabled:opacity-40">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => openRejectModal(r.registration_no)} disabled={r.status === 'rejected'} title="Reject" className="p-2 rounded-lg bg-rose-50 text-rose-700 disabled:opacity-40">
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(r.registration_no)} disabled={deletingRegNo === r.registration_no} title="Remove from web" className="p-2 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {rejecting && (
          <div className="fixed inset-0 z-[320] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
              <h3 className="text-lg font-black mb-2">Reject Registration</h3>
              <p className="text-xs text-slate-500 mb-4">Registration No: <span className="font-mono font-bold">{rejecting}</span></p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full min-h-32 px-4 py-3 rounded-xl border border-slate-200" placeholder="Enter rejection reason" />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setRejecting(null); setRejectReason(''); }} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button onClick={confirmReject} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
