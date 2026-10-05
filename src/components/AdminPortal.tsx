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
  getSavedSuperAdminText,
  getSuperAdminImageUrl,
} from '../lib/superAdminTextSettings';
import eventJerseyPic from '../super-admin/02. event-settings/Pic/jersey.png';

import {
  X, Lock, LogIn, LogOut, Search, Check, XCircle,
  Trash2, Download, Eye, EyeOff, FileText, CheckCircle2,
  AlertTriangle, CreditCard, ShieldCheck, QrCode, Sliders,
  FolderTree, Calendar, Clock, Bell, UserCheck, AlertCircle,
  Upload, ImageIcon, ExternalLink, RefreshCw
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [superAdminValues, setSuperAdminValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      EDITABLE_SUPER_ADMIN_TEXT_FILES.map(file => [
        file.id,
        getSavedSuperAdminText(file.path, file.defaultValue),
      ])
    )
  );
  const [superAdminSaving, setSuperAdminSaving] = useState<string | null>(null);
  const [superAdminMessage, setSuperAdminMessage] = useState('');
  const [superAdminImagePath, setSuperAdminImagePath] = useState('02. event-settings/Pic/jersey.png');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [imageReloadKey, setImageReloadKey] = useState(0);

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
      setSuperAdminMessage(`✓ ${file.label} saved successfully and updated live.`);
    } catch (error: any) {
      setSuperAdminMessage(error?.message || 'Unable to save Super Admin configuration.');
    } finally {
      setSuperAdminSaving(null);
    }
  };

  const handleResetSuperAdminText = (fileId: string) => {
    const file = EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.id === fileId);
    if (!file) return;
    setSuperAdminValues(prev => ({ ...prev, [fileId]: file.defaultValue }));
    void saveEditableSuperAdminText(file.path, file.defaultValue);
    setSuperAdminMessage(`Reset ${file.label} to default content.`);
  };

  const handleFileSelectionForImage = (file: File) => {
    setPendingImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPendingImagePreview(objectUrl);
  };

  const handleSuperAdminImageUpload = async () => {
    if (!pendingImageFile) return;
    setSuperAdminSaving('__image__');
    setSuperAdminMessage('');
    try {
      await saveEditableSuperAdminImage(superAdminImagePath, pendingImageFile);
      setSuperAdminMessage(`✓ Replaced and saved ${superAdminImagePath} successfully.`);
      setPendingImageFile(null);
      if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
      setPendingImagePreview(null);
      setImageReloadKey(k => k + 1);
    } catch (error: any) {
      setSuperAdminMessage(error?.message || 'Unable to upload Super Admin image.');
    } finally {
      setSuperAdminSaving(null);
    }
  };

  const currentDisplayImage = useMemo(() => {
    if (superAdminImagePath === '02. event-settings/Pic/jersey.png') {
      return getSuperAdminImageUrl('02. event-settings/Pic/jersey.png', eventJerseyPic);
    }
    return getSuperAdminImageUrl(superAdminImagePath, eventJerseyPic);
  }, [superAdminImagePath, imageReloadKey]);

  const filteredTextFiles = useMemo(() => {
    if (selectedCategory === 'all') return EDITABLE_SUPER_ADMIN_TEXT_FILES;
    if (selectedCategory === 'images') return [];
    return EDITABLE_SUPER_ADMIN_TEXT_FILES.filter(f => f.category === selectedCategory);
  }, [selectedCategory]);

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
          {(admin.role as string) === 'super_admin' && (
            <button onClick={() => setActiveTab('super-admin')} className={`px-3 py-2 rounded-xl text-xs font-bold ${activeTab === 'super-admin' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Super Admin</button>
          )}
        </div>

        {activeTab === 'super-admin' && (admin.role as string) === 'super_admin' && (
          <div className="flex-1 overflow-auto p-5 space-y-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Super Admin Configuration Suite:</strong> Edit official <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.txt</code> settings files and replace event graphics including <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">jersey.png</code>. All changes immediately sync live with the application.
              </div>
            </div>

            {superAdminMessage && (
              <div className="rounded-xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold flex items-center justify-between shadow-lg">
                <span>{superAdminMessage}</span>
                <button onClick={() => setSuperAdminMessage('')} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
              </div>
            )}

            {/* Category Navigation */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
              {[
                { id: 'all', label: 'All Files (16)' },
                { id: '01. Website Identity', label: '01. Website Identity (3)' },
                { id: '02. Event Settings', label: '02. Event Settings (4)' },
                { id: '03. Registration Settings', label: '03. Registration Settings (4)' },
                { id: '04. Countdown Settings', label: '04. Countdown Settings (2)' },
                { id: '05. Important Notice', label: '05. Important Notice (3)' },
                { id: 'images', label: '🖼️ Event Jersey & Images' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Event Settings Image Management (Prominent when images, all, or 02. Event Settings selected) */}
            {(selectedCategory === 'all' || selectedCategory === 'images' || selectedCategory === '02. Event Settings') && (
              <section className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-md">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Event Settings Image & Graphics Manager
                      </h3>
                      <p className="text-xs text-slate-500">
                        Target: <span className="font-mono font-bold text-indigo-600">jersey.png</span> (stored as actual image file, supporting upload, replacement, preview & retrieval)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={superAdminImagePath}
                      onChange={e => {
                        setSuperAdminImagePath(e.target.value);
                        setPendingImageFile(null);
                        if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
                        setPendingImagePreview(null);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"
                    >
                      <option value="02. event-settings/Pic/jersey.png">02. event-settings/Pic/jersey.png (Event Jersey)</option>
                      <option value="03. reg-settings/Pic/back jersey preview.png">03. reg-settings/Pic/back jersey preview.png</option>
                      <option value="01. website-identity/Pic/logo.png">01. website-identity/Pic/logo.png</option>
                      <option value="01. website-identity/Pic/favicon.png">01. website-identity/Pic/favicon.png</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Current Active Image Preview & Retrieval */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-inner">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Active Image Preview
                    </div>
                    <div className="w-44 h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 flex items-center justify-center p-2 relative group">
                      <img
                        key={currentDisplayImage}
                        src={currentDisplayImage}
                        alt="Super Admin Graphic"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href={currentDisplayImage}
                        download={superAdminImagePath.split('/').pop() || 'image.png'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Retrieve / Download
                      </a>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 break-all">
                      {superAdminImagePath}
                    </span>
                  </div>

                  {/* Upload & Replacement Controls */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="rounded-2xl border-2 border-dashed border-slate-300 p-5 bg-white/70 hover:bg-white transition-colors">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                        Upload & Replace Image File
                      </label>
                      <p className="text-xs text-slate-500 mb-4">
                        Select an image file (PNG, JPG, or WebP) to replace the current item. The replacement will update the filesystem mapping and reflect across the portal.
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          id="super-admin-image-input"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelectionForImage(file);
                          }}
                          className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                        />
                      </div>

                      {pendingImagePreview && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-center p-1 overflow-hidden shrink-0">
                            <img src={pendingImagePreview} alt="Replacement Preview" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{pendingImageFile?.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {pendingImageFile ? (pendingImageFile.size / 1024).toFixed(1) + ' KB' : ''} · Ready to save as <span className="font-bold text-indigo-600">{superAdminImagePath.split('/').pop()}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={superAdminSaving === '__image__'}
                            onClick={() => void handleSuperAdminImageUpload()}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50 inline-flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            {superAdminSaving === '__image__' ? 'Replacing…' : 'Confirm Replacement'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Editable .txt Files Grid */}
            {filteredTextFiles.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredTextFiles.map(file => (
                  <section key={file.id} className="rounded-2xl border border-slate-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="text-sm font-black text-slate-900">{file.label}</label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {file.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mb-3 font-mono break-all flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>src/super-admin/{file.path}</span>
                      </div>
                      <textarea
                        rows={Math.max(3, Math.min(10, (superAdminValues[file.id] ?? file.defaultValue).split('\n').length + 1))}
                        value={superAdminValues[file.id] ?? file.defaultValue}
                        onChange={e => setSuperAdminValues(prev => ({ ...prev, [file.id]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 px-3.5 py-3 text-xs font-mono resize-y leading-relaxed outline-none transition-colors"
                      />
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleResetSuperAdminText(file.id)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 underline"
                      >
                        Reset to default
                      </button>
                      <button
                        type="button"
                        disabled={superAdminSaving === file.id}
                        onClick={() => void handleSaveSuperAdminText(file.id)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {superAdminSaving === file.id ? 'Saving…' : 'Save .txt'}
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

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
