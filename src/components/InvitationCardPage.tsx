import React, { useState, useEffect, useRef } from 'react';
import { InvitationRecord, PdfSettings, WebsiteSettings, JerseySize } from '../types';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Building2,
  GraduationCap,
  IdCard,
  Hash,
  User,
  Lock,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getPublicInvitation, getRejectedRegistrationForResubmission } from '../services';
import { InvitationCard } from './InvitationCard';
import { verifyRegistrationForEdit, saveRegistrationEdit, getEditPolicy } from '../services/registrationEditing';
import { JerseyGraphic } from './JerseyGraphic';
import { Pencil, Save, X } from 'lucide-react';
import { uploadStudentPhoto, resolveStudentPhotoUrl } from '../services/storage';

type EditForm = {
  full_name: string; class_roll: string; student_id: string; contact_mobile_number: string;
  academic_group: string; academic_section: string; student_photo: string | null;
  send_method: 'bkash' | 'nagad'; sender_mobile_no: string; payment_time: string;
  transaction_id: string; jersey_back_name: string; jersey_number: string; jersey_size: JerseySize;
};
const editSizes: JerseySize[] = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];


interface InvitationCardPageProps {
  invitations: InvitationRecord[];
  initialSearchRegNo?: string;
  initialSearchStudentName?: string;
  onNavigateToRegister: (record?: InvitationRecord) => void;
  pdfSettings: PdfSettings;
  websiteSettings: WebsiteSettings;
  registrationOpen: boolean;
}

export const InvitationCardPage: React.FC<InvitationCardPageProps> = ({
  initialSearchRegNo = '',
  initialSearchStudentName = '',
  onNavigateToRegister,
  pdfSettings,
  websiteSettings,
  registrationOpen,
}) => {
  const [searchRegNo, setSearchRegNo] = useState(initialSearchRegNo);
  const [searchStudentName, setSearchStudentName] = useState(initialSearchStudentName);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchedRecord, setMatchedRecord] = useState<InvitationRecord | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadToast, setDownloadToast] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isRecoveringRejected, setIsRecoveringRejected] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryStudentId, setRecoveryStudentId] = useState('');
  const [editState, setEditState] = useState<any>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPolicy, setEditPolicy] = useState<{deadline:string;can_edit:boolean}|null>(null);

  useEffect(() => {
    let active = true;
    if (!matchedRecord || matchedRecord.status === 'rejected') {
      setEditPolicy(null);
      return;
    }
    getEditPolicy()
      .then(policy => { if (active) setEditPolicy(policy); })
      .catch(() => { if (active) setEditPolicy(null); });
    return () => { active = false; };
  }, [matchedRecord?.registration_no, matchedRecord?.updated_at, matchedRecord?.status]);

  const exportCardRef = useRef<HTMLDivElement>(null);
  const displayCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSearchRegNo) {
      setSearchRegNo(initialSearchRegNo);
    }
    if (initialSearchStudentName) {
      setSearchStudentName(initialSearchStudentName);
    }
    if (initialSearchRegNo && initialSearchStudentName) {
      void handleSearchWith(initialSearchRegNo, initialSearchStudentName);
    }
  }, [initialSearchRegNo, initialSearchStudentName]);

  const handleSearchWith = async (regNoVal: string, studentNameVal: string) => {
    const cleanedReg = regNoVal.trim().toUpperCase();
    const cleanedName = studentNameVal.trim();
    setSearched(true);
    setSearchError(null);
    setDownloadError(null);

    if (!cleanedReg) {
      setMatchedRecord(null);
      setSearchError('Registration Number is required.');
      return;
    }

    if (!cleanedName) {
      setMatchedRecord(null);
      setSearchError('Student Name is required.');
      return;
    }

    setIsSearching(true);
    try {
      const result = await getPublicInvitation(cleanedReg, cleanedName);
      if (result.success && result.data) {
        setMatchedRecord(result.data);
        return;
      }

      setMatchedRecord(null);
      setSearchError(result.errorMessage || 'No registration found matching both Registration Number and Student Name.');
    } catch (error: any) {
      setMatchedRecord(null);
      setSearchError(error?.message || 'Unable to verify registration.');
    } finally {
      setIsSearching(false);
    }
  };


  const handleStartEdit = async () => {
    if (!matchedRecord || !registrationOpen) return;
    setEditError(null); setEditMessage(null); setEditLoading(true);
    try {
      const policy = await getEditPolicy();
      setEditPolicy(policy);
      if (!registrationOpen) { setEditError('Registration is closed. Editing is unavailable.'); return; }
      if (!policy.can_edit) { setEditError('The editing deadline has passed.'); return; }
      const verified = await verifyRegistrationForEdit(matchedRecord.registration_no, searchStudentName);
      if (!verified.success || !verified.data) throw new Error(verified.errorMessage || 'Unable to verify registration for editing.');
      setEditState(verified.data);
      const r = verified.data.record;
      setEditForm({
        full_name: r.full_name || '', class_roll: r.class_roll || '', student_id: r.student_id || '',
        contact_mobile_number: r.contact_mobile_number || '', academic_group: r.academic_group || '',
        academic_section: r.academic_section || '', student_photo: r.student_photo || null,
        send_method: r.send_method || 'bkash', sender_mobile_no: r.sender_mobile_no || '',
        payment_time: r.payment_time || '', transaction_id: r.transaction_id || '',
        jersey_back_name: r.jersey_back_name || '', jersey_number: r.jersey_number || '',
        jersey_size: (r.jersey_size as JerseySize) || 'L'
      });
      setEditOpen(true);
    } catch (e: any) { setEditError(e?.message || 'Unable to start editing.'); }
    finally { setEditLoading(false); }
  };

  const handleSelectEditPhoto = async (file?: File) => {
    if (!file || !matchedRecord || !editForm) return;
    setEditPhotoError(null);
    if (!file.type.startsWith('image/')) {
      setEditPhotoError('Please select an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setEditPhotoError('Photo size must be 3 MB or less.');
      return;
    }
    setEditPhotoUploading(true);
    try {
      const uploaded = await uploadStudentPhoto(file, matchedRecord.class_roll || matchedRecord.student_id);
      if (!uploaded.success || !uploaded.storagePath) throw new Error(uploaded.errorMessage || 'Student photo upload failed.');
      setEditForm(prev => prev ? { ...prev, student_photo: uploaded.storagePath } : prev);
    } catch (error: any) {
      setEditPhotoError(error?.message || 'Student photo upload failed.');
    } finally {
      setEditPhotoUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!matchedRecord || !editForm) return;
    setEditError(null); setEditMessage(null);
    const jerseyNo = String(editForm.jersey_number || '').trim();
    if (!/^\d{1,3}$/.test(jerseyNo)) { setEditError('Jersey Number must contain 1–3 digits (e.g. 7 or 007).'); return; }
    if (!editForm.full_name.trim() || !editForm.class_roll.trim() || !editForm.student_id.trim()) { setEditError('Complete all required personal information fields.'); return; }
    const contactMobile = editForm.contact_mobile_number.trim();
    const senderMobile = editForm.sender_mobile_no.trim();
    if (!/^\d{11}$/.test(contactMobile) || !/^\d{11}$/.test(senderMobile)) { setEditError('Both mobile numbers must contain exactly 11 digits.'); return; }
    setEditSaving(true);
    try {
      const saved = await saveRegistrationEdit({
        ...editForm,
        jersey_number: jerseyNo,
      });
      if (!saved.success || !saved.data) throw new Error(saved.errorMessage || 'Unable to save changes.');
      // Database response is authoritative; refresh card state and latest edit metadata.
      setMatchedRecord(saved.data);
      setSearchStudentName(saved.data.full_name);
      setEditOpen(false); setEditState(null); setEditForm(null);
      setEditMessage('Your registration was updated successfully. Latest information is now shown below.');
    } catch (e: any) { setEditError(e?.message || 'Unable to save changes.'); }
    finally { setEditSaving(false); }
  };

  /**
   * Direct high-resolution PNG export directly from the invitation card component.
   * Preserves exact colors, typography, glassmorphism, gradients, and landscape ratio.
   */
  const handleDownloadPass = async () => {
    if (!matchedRecord || matchedRecord.status !== 'approved') return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      // Prioritize the fixed 1024px landscape render element for pristine pass proportions on any device
      const targetElement = exportCardRef.current || displayCardRef.current;
      if (!targetElement) {
        throw new Error('Invitation card element not found in DOM.');
      }

      // Wait for fonts to finish loading in document
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }

      // Small pause to guarantee font rendering and layout paint
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await toPng(targetElement, {
        pixelRatio: 2, // High resolution (2048px width)
        cacheBust: true,
        skipFonts: true, // Avoid SecurityError accessing cross-origin Google Fonts stylesheets
      });

      const cleanReg = (matchedRecord.registration_no || 'RD27').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanReg}_Pass.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadToast(true);
      setTimeout(() => setDownloadToast(false), 4000);
    } catch (err: any) {
      console.warn('Primary export attempt encountered an issue, trying display fallback:', err);
      try {
        const fallbackTarget = displayCardRef.current || exportCardRef.current;
        if (fallbackTarget) {
          const fallbackDataUrl = await toPng(fallbackTarget, {
            pixelRatio: 2,
            cacheBust: true,
            skipFonts: true,
          });

          const cleanReg = (matchedRecord.registration_no || 'RD27').replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${cleanReg}_Pass.png`;

          const link = document.createElement('a');
          link.download = filename;
          link.href = fallbackDataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setDownloadToast(true);
          setTimeout(() => setDownloadToast(false), 4000);
          return;
        }
      } catch (fallbackErr: any) {
        console.error('Fallback export error:', fallbackErr);
      }
      setDownloadError('Unable to generate PNG pass image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderEditSection = () => {
    if (!matchedRecord || matchedRecord.status === 'rejected') return null;

    if (!registrationOpen) {
      return (
        <div role="status" className="rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md p-4 text-xs font-semibold text-slate-600 text-center shadow-xs">
          Registration is closed. Editing is unavailable.
        </div>
      );
    }

    if (matchedRecord.edit_locked) {
      return (
        <div role="status" className="rounded-2xl border border-amber-200/90 bg-amber-50/90 backdrop-blur-md p-4 text-xs font-semibold text-amber-800 text-center shadow-xs">
          Your registration has been locked by an administrator and cannot be edited.
        </div>
      );
    }

    if ((matchedRecord.edit_count || 0) >= 5) {
      return (
        <div role="status" className="rounded-2xl border border-amber-200/90 bg-amber-50/90 backdrop-blur-md p-4 text-xs font-semibold text-amber-800 text-center shadow-xs">
          You have reached the maximum limit of 5 edits. No further changes can be made.
        </div>
      );
    }

    if (editPolicy && !editPolicy.can_edit) {
      return (
        <div role="status" className="rounded-2xl border border-amber-200/90 bg-amber-50/90 backdrop-blur-md p-4 text-xs font-semibold text-amber-800 text-center shadow-xs">
          Registration editing deadline has passed. Editing is now closed.
        </div>
      );
    }

    return (
      <div className="space-y-4 pt-2">
        {editMessage && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-fadeIn">
            {editMessage}
          </div>
        )}
        {editError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 animate-fadeIn">
            {editError}
          </div>
        )}

        {!editOpen ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl glass-card border border-indigo-200/80 shadow-xs">
            <div className="text-xs text-slate-600">
              <strong className="block text-slate-900 text-sm font-bold">Need to correct your registration?</strong>
              <span>
                {editState
                  ? `${editState.edit_count}/5 successful edits used`
                  : `${matchedRecord.edit_count || 0}/5 edits used. You can update your details without admin approval.`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleStartEdit}
              disabled={editLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>{editLoading ? 'Verifying…' : 'Edit Registration'}</span>
            </button>
          </div>
        ) : editForm ? (
          <section className="rounded-3xl border border-indigo-200 bg-white/95 p-5 sm:p-6 shadow-xl space-y-5 animate-fadeIn">
            <header className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Self-Service Update</span>
                <h3 className="text-lg font-black text-slate-900">Edit Registration Details</h3>
                <p className="text-xs text-slate-500">
                  {editState?.edit_count ?? (matchedRecord.edit_count || 0)}/5 successful edits used
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditOpen(false); setEditError(null); }}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close edit form"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-2xl bg-slate-50/80 p-4 space-y-2 border border-slate-200/70">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-700 mb-2">Current Information</h4>
                {([
                  ['Full Name', matchedRecord.full_name],
                  ['Class Roll', matchedRecord.class_roll],
                  ['Student ID', matchedRecord.student_id],
                  ['Contact Mobile', matchedRecord.contact_mobile_number],
                  ['Academic Group', matchedRecord.academic_group],
                  ['Section', matchedRecord.academic_section],
                  ['Payment Method', matchedRecord.send_method],
                  ['Payment Sender', matchedRecord.sender_mobile_no],
                  ['Payment Time', matchedRecord.payment_time],
                  ['Transaction ID', matchedRecord.transaction_id],
                  ['Jersey Name', matchedRecord.jersey_back_name],
                  ['Jersey Number', `#${matchedRecord.jersey_number}`],
                  ['Jersey Size', matchedRecord.jersey_size],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-slate-200/60 py-1.5 text-xs">
                    <span className="text-slate-500">{k}</span>
                    <strong className="text-slate-800 text-right">{v || '—'}</strong>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {([
                  ['full_name', 'Full Name'],
                  ['class_roll', 'Class Roll'],
                  ['student_id', 'Student ID'],
                  ['contact_mobile_number', 'Contact Mobile Number (11 Digits)'],
                  ['academic_group', 'Academic Group'],
                  ['academic_section', 'Section'],
                  ['sender_mobile_no', 'Payment Sender Mobile (11 Digits)'],
                  ['payment_time', 'Payment Time'],
                  ['transaction_id', 'Transaction ID'],
                  ['jersey_back_name', 'Jersey Back Name (Max 14 Chars)'],
                  ['jersey_number', 'Jersey Number (1–3 Digits, e.g. 7 or 007)'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block text-xs font-bold text-slate-700">
                    {label}
                    <input
                      value={(editForm as any)[key] || ''}
                      maxLength={key === 'jersey_number' ? 3 : key === 'jersey_back_name' ? 14 : 120}
                      inputMode={key === 'jersey_number' || key.includes('mobile') ? 'numeric' : undefined}
                      onChange={e => setEditForm(prev => prev ? ({
                        ...prev,
                        [key]: key === 'jersey_back_name' ? e.target.value.toUpperCase() : e.target.value
                      }) : prev)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </label>
                ))}

                <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                  <div className="text-xs font-bold text-slate-700">
                    Student Photo <span className="font-normal text-slate-400">(optional)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {editForm.student_photo ? (
                      <img
                        src={resolveStudentPhotoUrl(editForm.student_photo) || ''}
                        alt="Student photo preview"
                        className="h-16 w-16 rounded-xl border border-slate-200 object-cover shadow-2xs"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-slate-200 text-[10px] text-slate-400 font-bold flex items-center justify-center">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={editPhotoUploading || editSaving}
                        onChange={e => { void handleSelectEditPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }}
                        className="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-indigo-700 cursor-pointer"
                      />
                      {editForm.student_photo && (
                        <button
                          type="button"
                          onClick={() => setEditForm(p => p ? ({ ...p, student_photo: null }) : p)}
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                  {editPhotoUploading && <p className="text-[11px] text-indigo-600 font-medium">Uploading photo…</p>}
                  {editPhotoError && <p role="alert" className="text-[11px] font-semibold text-rose-600">{editPhotoError}</p>}
                </div>

                <label className="block text-xs font-bold text-slate-700">
                  Payment Send Method
                  <select
                    value={editForm.send_method}
                    onChange={e => setEditForm(p => p ? ({ ...p, send_method: e.target.value as any }) : p)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-indigo-400"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                  </select>
                </label>

                <div className="block text-xs font-bold text-slate-700">
                  Jersey Size
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editSizes.map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setEditForm(p => p ? ({ ...p, jersey_size: sz }) : p)}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                          editForm.jersey_size === sz
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50/80 border border-indigo-100 p-4 flex flex-col sm:flex-row items-center gap-4">
              <JerseyGraphic name={editForm.jersey_back_name} number={editForm.jersey_number} gender={matchedRecord.gender} className="w-40 h-44 shrink-0" />
              <div className="text-xs text-indigo-900">
                <strong className="block text-sm font-extrabold text-indigo-950">Live Squad Kit Preview</strong>
                <p className="mt-0.5 text-indigo-700">
                  Name: <span className="font-bold">{editForm.jersey_back_name || '—'}</span> · Number: <span className="font-mono font-bold">#{editForm.jersey_number || '—'}</span> · Size: <span className="font-bold">{editForm.jersey_size}</span>
                </p>
                <p className="mt-1 text-[11px] text-indigo-600">
                  Leading zeros are preserved on your official entry pass (e.g. 007).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setEditOpen(false); setEditForm(null); }}
                className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving || editPhotoUploading}
                onClick={handleSaveEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editSaving ? 'Saving Changes…' : 'Save Changes'}</span>
              </button>
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  return (
    <div className="public-glass-page relative isolate py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 rounded-[2rem] overflow-hidden">
      {/* Header matching Reference Image 2 Screen 10 */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-[0_4px_16px_rgba(113,56,245,0.06),inset_0_1px_1px_white] backdrop-blur-xl mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7138F5]" />
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Official Entry Pass
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#10143C] tracking-tight leading-tight">
          Verify & Download <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7138F5] via-[#5224D8] to-[#11C8F4]">
            Invitation Card
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 max-w-lg mx-auto font-medium leading-relaxed">
          Enter your Registration Number and Student Name to verify committee authorization and access your digital pass. Both fields are required for security verification.
        </p>
      </div>

      {/* Search Layout (Form) matching Screen 10 */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/95 shadow-[0_15px_35px_-10px_rgba(113,56,245,0.08),inset_0_1.5px_1px_white] mb-8">
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSearchWith(searchRegNo, searchStudentName);
          }}
          className="space-y-4"
        >
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Registration Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. RD27-01"
                  value={searchRegNo}
                  onChange={e => setSearchRegNo(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-mono font-bold bg-white/90 border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:border-[#7138F5] focus:ring-2 focus:ring-[#7138F5]/20 outline-none transition-all shadow-2xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Student Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Enter student full name..."
                  value={searchStudentName}
                  onChange={e => setSearchStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-medium bg-white/90 border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:border-[#7138F5] focus:ring-2 focus:ring-[#7138F5]/20 outline-none transition-all shadow-2xs"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3.5 px-7 rounded-xl bg-gradient-to-r from-[#7138F5] via-[#5224D8] to-[#11C8F4] text-white font-extrabold text-sm shadow-[0_12px_28px_-6px_rgba(113,56,245,0.36),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_16px_36px_-6px_rgba(113,56,245,0.48)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{isSearching ? 'Verifying...' : 'Verify & Search'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEARCH RESULT STATES */}
      {searched && (
        <div className="transition-all duration-300">
          {/* STATE 1: Not Found */}
          {!matchedRecord && (
            <div className="p-8 rounded-3xl glass-card shadow-[0_15px_35px_-10px_rgba(0,0,0,0.05),inset_0_1.5px_1px_white] text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                No Record Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                {searchError || `We could not find any registration matching "${searchRegNo}". Please verify your registration number.`}
              </p>
              <button
                onClick={() => onNavigateToRegister()}
                className="px-5 py-2.5 rounded-xl glass-button-primary text-white text-xs font-bold shadow hover:brightness-105 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Go to Registration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STATE 2: PENDING APPROVAL */}
          {matchedRecord && matchedRecord.status === 'pending' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-amber-500/10 backdrop-blur-2xl border-2 border-amber-300/90 shadow-[0_15px_35px_-10px_rgba(245,158,11,0.15),inset_0_1.5px_2px_white] text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-amber-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                    <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      Application Status
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-amber-950">
                      Status: Pending Approval
                    </h3>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-xl bg-amber-500/15 backdrop-blur-md text-amber-900 text-xs font-bold tracking-wider font-mono shadow-xs border border-amber-300/50">
                  {matchedRecord.registration_no}
                </div>
              </div>

              <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/85 backdrop-blur-md border border-amber-200/90 shadow-2xs">
                  <span className="text-slate-500 font-semibold uppercase block text-[10px] tracking-wider">Applicant</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">{matchedRecord.full_name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/85 backdrop-blur-md border border-amber-200/90 shadow-2xs">
                  <span className="text-slate-500 font-semibold uppercase block text-[10px] tracking-wider">Roll & Student ID</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 space-y-0.5">
                    <div>Roll: {matchedRecord.class_roll || '—'}</div>
                    <div>Student ID: {matchedRecord.student_id || '—'}</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/85 backdrop-blur-md border border-amber-200/90 shadow-2xs">
                  <span className="text-slate-500 font-semibold uppercase block text-[10px] tracking-wider">Academic Details</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 space-y-0.5">
                    <div>Group: {matchedRecord.academic_group || '—'}</div>
                    <div>Section: {matchedRecord.academic_section || '—'}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 backdrop-blur-xl border border-amber-300/60 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <strong>Verification in Progress:</strong> Your payment and student records are currently pending authorization by the Rag Day 27 Admin committee. Once approved, your invitation card and official entry pass download will appear here automatically.
                </div>
              </div>
              {/* SINGLE EDIT REGISTRATION SECTION */}
              {renderEditSection()}

            </div>
          )}

          {/* STATE 3: REJECTED BY ADMIN */}
          {matchedRecord && matchedRecord.status === 'rejected' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-rose-500/10 backdrop-blur-2xl border-2 border-rose-300/90 shadow-[0_15px_35px_-10px_rgba(244,63,94,0.15),inset_0_1.5px_2px_white] text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-rose-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                      Application Status
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-rose-950">
                      Status: Rejected By Admin
                    </h3>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-xl bg-rose-500/15 backdrop-blur-md text-rose-900 text-xs font-bold tracking-wider font-mono shadow-xs border border-rose-300/50">
                  {matchedRecord.registration_no}
                </div>
              </div>

              {/* Reason: show ONLY the reject_reason stored in the database */}
              <div className="py-5">
                <div className="p-4 rounded-2xl bg-rose-500/5 backdrop-blur-xl border border-rose-200/70 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm font-extrabold text-rose-700 whitespace-pre-wrap">
                    {matchedRecord.reject_reason || 'No specific reason provided.'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-rose-800">
                  Questions? Inquire directly with the Committee Admin.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryStudentId('');
                    setRecoveryError(null);
                    setShowRecoveryDialog(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  disabled={isRecoveringRejected}
                >
                  <span>{isRecoveringRejected ? 'Verifying...' : 'Re-Submit Registration'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: APPROVED -> STUDENT DETAILS -> STATUS: APPROVED -> [ Download Pass ] */}
          {matchedRecord && matchedRecord.status === 'approved' && (
            <div className="space-y-6">
              {/* Student Details / Registration Information */}
              <div className="p-6 sm:p-7 rounded-3xl glass-card shadow-[0_15px_35px_-10px_rgba(91,95,239,0.08),inset_0_1.5px_1px_white] text-left">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Registration Information
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-black text-[#10143C]">
                      {matchedRecord.full_name}
                    </h3>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#7138F5] text-white text-xs font-mono font-bold tracking-wider shadow-sm">
                    {matchedRecord.registration_no}
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                      <Lock className="w-3 h-3 text-[#7138F5]" />
                      <span>Class Roll</span>
                    </div>
                    <span className="text-[#10143C] font-black text-base sm:text-lg mt-1 block">{matchedRecord.class_roll || '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                      <IdCard className="w-3 h-3 text-[#7138F5]" />
                      <span>Student ID</span>
                    </div>
                    <span className="text-[#10143C] font-black text-base sm:text-lg mt-1 block">{matchedRecord.student_id || matchedRecord.id || '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                      <GraduationCap className="w-3 h-3 text-[#7138F5]" />
                      <span>Academic Group</span>
                    </div>
                    <span className="text-[#10143C] font-black text-base sm:text-lg mt-1 block">{matchedRecord.academic_group || '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                      <Building2 className="w-3 h-3 text-[#7138F5]" />
                      <span>Section</span>
                    </div>
                    <span className="text-[#10143C] font-black text-base sm:text-lg mt-1 block">{matchedRecord.academic_section || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Status: Approved Header with the single [ Download Pass ] button */}
              <div className="p-5 sm:p-6 rounded-3xl bg-emerald-500/10 backdrop-blur-2xl border-2 border-emerald-300/90 shadow-[0_15px_35px_-10px_rgba(16,185,129,0.15),inset_0_1.5px_2px_white] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Application Status
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-emerald-950">
                      Status: Approved
                    </h3>
                  </div>
                </div>

                {/* THE ONLY BUTTON */}
                <button
                  type="button"
                  onClick={handleDownloadPass}
                  disabled={isDownloading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#7138F5] via-[#5224D8] to-[#11C8F4] hover:brightness-105 text-white font-extrabold text-sm shadow-[0_12px_28px_-6px_rgba(113,56,245,0.36),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_16px_36px_-6px_rgba(113,56,245,0.48)] transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isDownloading ? 'Generating Pass…' : 'Download Pass'}</span>
                </button>
              </div>

              {/* Institution Card matching Reference Image 2 Screen 11 */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/95 shadow-[0_15px_35px_-10px_rgba(113,56,245,0.08),inset_0_1.5px_1px_white] flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7138F5]/15 to-[#11C8F4]/15 p-2 border border-white/95 flex items-center justify-center shadow-xs">
                  {pdfSettings?.pdfLogo ? (
                    <img src={pdfSettings.pdfLogo} alt="NIC Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-extrabold text-[#7138F5] text-xs">NIC</span>
                  )}
                </div>
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-[#10143C]">
                    National Ideal College
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
                    Rag Day of NIC 27
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">
                  BATCH 2027
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 text-[10px] font-extrabold text-[#10143C] uppercase tracking-wider shadow-2xs font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#7138F5]" />
                    NIC 2027 · OFFICIAL PASS
                  </span>
                </div>
              </div>

              {/* Toast Feedback */}
              {downloadToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold text-center shadow-lg animate-fadeIn flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ Pass downloaded successfully</span>
                </div>
              )}

              {/* Error Feedback */}
              {downloadError && (
                <div className="p-3.5 rounded-2xl bg-rose-600 text-white text-xs font-bold text-center shadow-lg animate-fadeIn">
                  {downloadError}
                </div>
              )}

              {/* DISPLAYED INVITATION PASS */}
              <div className="w-full" ref={displayCardRef}>
                <InvitationCard
                  record={matchedRecord}
                  websiteSettings={websiteSettings}
                  pdfSettings={pdfSettings}
                />
              </div>

              {/* SINGLE EDIT REGISTRATION SECTION (BELOW INVITATION CARD) */}
              {renderEditSection()}

              {/* Off-screen fixed 1024px landscape card used for generating pristine high-res PNG pass */}
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  left: '-9999px',
                  top: 0,
                  width: '1024px',
                  pointerEvents: 'none',
                  zIndex: -9999,
                }}
              >
                <div ref={exportCardRef}>
                  <InvitationCard
                    record={matchedRecord}
                    websiteSettings={websiteSettings}
                    pdfSettings={pdfSettings}
                    isExport={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showRecoveryDialog && matchedRecord?.status === 'rejected' && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4 animate-fadeIn">
          <form
            className="w-full max-w-md rounded-3xl glass-modal p-6 sm:p-7 shadow-[0_30px_80px_-15px_rgba(244,63,94,0.3),inset_0_1.5px_2px_white] border border-rose-300/60 space-y-4"
            onSubmit={async e => {
              e.preventDefault();
              setRecoveryError(null);
              setIsRecoveringRejected(true);
              try {
                const result = await getRejectedRegistrationForResubmission(
                  matchedRecord.registration_no,
                  searchStudentName,
                  recoveryStudentId
                );
                if (!result.success || !result.data) {
                  setRecoveryError(result.errorMessage || 'Unable to verify the rejected registration.');
                  return;
                }
                onNavigateToRegister(result.data);
                setShowRecoveryDialog(false);
              } catch (error: any) {
                setRecoveryError(error?.message || 'Unable to verify the rejected registration.');
              } finally {
                setIsRecoveringRejected(false);
              }
            }}
          >
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-300/40">
                Data Recovery
              </span>
              <h3 className="text-xl font-display font-extrabold text-slate-900 mt-2">Recover Registration</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">Enter the Student ID from your original registration to verify your record and restore its saved details.</p>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
              Original Student ID
              <input
                autoComplete="off"
                inputMode="numeric"
                value={recoveryStudentId}
                onChange={e => setRecoveryStudentId(e.target.value.replace(/\D/g, ''))}
                className="mt-1.5 w-full rounded-xl glass-input px-4 py-3 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50"
                placeholder="Enter your original Student ID"
                required
                disabled={isRecoveringRejected}
              />
            </label>
            {recoveryError && <p className="rounded-xl border border-rose-200/80 bg-rose-500/10 backdrop-blur-md p-3 text-xs font-bold text-rose-700" role="alert">{recoveryError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowRecoveryDialog(false)} className="flex-1 rounded-xl glass-button px-4 py-3 text-xs font-bold text-slate-700 cursor-pointer" disabled={isRecoveringRejected}>Cancel</button>
              <button type="submit" className="flex-1 rounded-xl glass-button-primary bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white px-4 py-3 text-xs font-bold disabled:opacity-60 cursor-pointer" disabled={isRecoveringRejected || !recoveryStudentId.trim()}>{isRecoveringRejected ? 'Verifying...' : 'Verify & Continue'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
