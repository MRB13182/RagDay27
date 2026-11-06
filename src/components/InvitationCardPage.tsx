import React, { useState, useEffect, useRef } from 'react';
import { InvitationRecord, PdfSettings, WebsiteSettings } from '../types';
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
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getPublicInvitation, getRejectedRegistrationForResubmission } from '../services';
import { InvitationCard } from './InvitationCard';
import { verifyRegistrationForEdit, saveRegistrationEdit, getEditPolicy } from '../services/registrationEditing';
import { JerseyGraphic } from './JerseyGraphic';
import { Pencil, Save, X, Lock } from 'lucide-react';
import { uploadStudentPhoto, resolveStudentPhotoUrl } from '../services/storage';

type EditForm = {
  full_name: string; class_roll: string; student_id: string; contact_mobile_number: string;
  academic_group: string; academic_section: string; student_photo: string | null;
  send_method: 'bkash' | 'nagad'; sender_mobile_no: string; payment_time: string;
  transaction_id: string; jersey_back_name: string; jersey_number: string; jersey_size: string;
};
const editSizes = ['S','M','L','XL','2XL','3XL','4XL'];


interface InvitationCardPageProps {
  invitations: InvitationRecord[];
  initialSearchRegNo?: string;
  initialSearchStudentName?: string;
  onNavigateToRegister: (record?: InvitationRecord) => void;
  pdfSettings: PdfSettings;
  websiteSettings: WebsiteSettings;
}

export const InvitationCardPage: React.FC<InvitationCardPageProps> = ({
  initialSearchRegNo = '',
  initialSearchStudentName = '',
  onNavigateToRegister,
  pdfSettings,
  websiteSettings,
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


  const canAttemptEdit = matchedRecord && matchedRecord.status !== 'rejected';
  const handleStartEdit = async () => {
    if (!matchedRecord) return;
    setEditError(null); setEditMessage(null); setEditLoading(true);
    try {
      const policy = await getEditPolicy();
      setEditPolicy(policy);
      if (!policy.can_edit) { setEditError('The editing deadline has passed.'); return; }
      const verified = await verifyRegistrationForEdit(matchedRecord.registration_no, searchStudentName);
      if (!verified.success || !verified.data) throw new Error(verified.errorMessage || 'Unable to verify registration for editing.');
      setEditState(verified.data);
      const r = verified.data.record;
      setEditForm({
        full_name:r.full_name || '', class_roll:r.class_roll || '', student_id:r.student_id || '',
        contact_mobile_number:r.contact_mobile_number || '', academic_group:r.academic_group || '',
        academic_section:r.academic_section || '', student_photo:r.student_photo || null,
        send_method:r.send_method || 'bkash', sender_mobile_no:r.sender_mobile_no || '',
        payment_time:r.payment_time || '', transaction_id:r.transaction_id || '',
        jersey_back_name:r.jersey_back_name || '', jersey_number:r.jersey_number || '',
        jersey_size:r.jersey_size || 'L'
      });
      setEditOpen(true);
    } catch (e:any) { setEditError(e?.message || 'Unable to start editing.'); }
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
    if (!/^\\d{1,3}$/.test(editForm.jersey_number)) { setEditError('Jersey Number must contain 1–3 digits.'); return; }
    if (!editForm.full_name.trim() || !editForm.class_roll.trim() || !editForm.student_id.trim()) { setEditError('Complete all required personal information fields.'); return; }
    if (!/^\\d{11}$/.test(editForm.contact_mobile_number) || !/^\\d{11}$/.test(editForm.sender_mobile_no)) { setEditError('Both mobile numbers must contain exactly 11 digits.'); return; }
    setEditSaving(true);
    try {
      const saved = await saveRegistrationEdit(editForm as any);
      if (!saved.success || !saved.data) throw new Error(saved.errorMessage || 'Unable to save changes.');
      // Database response is authoritative; refresh card state and latest edit metadata.
      setMatchedRecord(saved.data);
      setSearchStudentName(saved.data.full_name);
      setEditOpen(false); setEditState(null); setEditForm(null);
      setEditMessage('Your registration was updated successfully. Latest information is now shown below.');
    } catch (e:any) { setEditError(e?.message || 'Unable to save changes.'); }
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

  return (
    <div className="public-glass-page relative isolate py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 rounded-[2rem] overflow-hidden">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-[0_4px_16px_rgba(109,40,217,0.06),inset_0_1px_1px_white] backdrop-blur-xl mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Official Gate Pass Portal
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Verify & Download Invitation Card
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Enter your <strong>Registration Number</strong> and <strong>Student Name</strong> to verify committee authorization and access your digital pass. Both fields are required for security verification.
        </p>
      </div>

      {/* Search Layout (Form) */}
      <div className="p-6 sm:p-8 rounded-3xl public-glass-surface mb-8">
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSearchWith(searchRegNo, searchStudentName);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Registration Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. RD27-01"
                value={searchRegNo}
                onChange={e => setSearchRegNo(e.target.value.toUpperCase())}
                className="w-full px-4 py-3.5 rounded-xl text-sm font-mono font-bold glass-input text-slate-900 placeholder-slate-400 focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none transition-all"
                required
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Student Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter student full name..."
                value={searchStudentName}
                onChange={e => setSearchStudentName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-sm font-medium glass-input text-slate-900 placeholder-slate-400 focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSearching}
              className="py-3.5 px-7 rounded-xl bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#00D4FF] text-white font-bold text-sm shadow-[0_12px_28px_-6px_rgba(91,95,239,0.32),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_16px_36px_-6px_rgba(91,95,239,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
              {canAttemptEdit && !editOpen && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-slate-200/80">
                  <div className="text-xs text-slate-600">
                    <strong className="block text-slate-900">Need to correct your registration?</strong>
                    <span>{editState ? `${editState.edit_count}/5 successful edits used` : 'Verify your details to make a permitted update.'}</span>
                  </div>
                  <button type="button" onClick={handleStartEdit} disabled={editLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">
                    <Pencil className="w-4 h-4"/>{editLoading ? 'Verifying…' : 'Edit Registration'}
                  </button>
                </div>
              )}
              {editMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{editMessage}</div>}
              {editError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{editError}</div>}
              {editOpen && editForm && (
                <section className="rounded-3xl border border-indigo-200 bg-white/95 p-5 sm:p-6 shadow-lg space-y-5">
                  <header className="flex items-center justify-between gap-3">
                    <div><span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Registration Correction</span><h3 className="text-lg font-black text-slate-900">Edit your information</h3><p className="text-xs text-slate-500">{editState?.edit_count ?? 0}/5 successful edits used</p></div>
                    <button type="button" onClick={()=>{setEditOpen(false);setEditError(null);}} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close edit form"><X className="w-5 h-5"/></button>
                  </header>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="rounded-2xl bg-slate-50 p-4 space-y-2"><h4 className="text-xs font-extrabold text-slate-700">Current Information</h4>
                      {Object.entries({Name:matchedRecord.full_name,Roll:matchedRecord.class_roll,StudentID:matchedRecord.student_id,Mobile:matchedRecord.contact_mobile_number,Group:matchedRecord.academic_group,Section:matchedRecord.academic_section,JerseyName:matchedRecord.jersey_back_name,JerseyNumber:matchedRecord.jersey_number,JerseySize:matchedRecord.jersey_size}).map(([k,v])=><div key={k} className="flex justify-between gap-2 border-b border-slate-200 py-1.5 text-xs"><span className="text-slate-500">{k}</span><strong className="text-slate-800 text-right">{v || '—'}</strong></div>)}
                    </div>
                    <div className="space-y-3">
                      {([
                        ['full_name','Full Name'],['class_roll','Class Roll'],['student_id','Student ID'],['contact_mobile_number','Contact Mobile Number'],
                        ['academic_group','Academic Group'],['academic_section','Section'],['sender_mobile_no','Payment Sender Mobile'],['payment_time','Payment Time'],['transaction_id','Transaction ID'],['jersey_back_name','Jersey Back Name'],['jersey_number','Jersey Number']
                      ] as const).map(([key,label])=><label key={key} className="block text-xs font-bold text-slate-700">{label}<input value={(editForm as any)[key] || ''} maxLength={key==='jersey_number'?3:key==='jersey_back_name'?14:120} inputMode={key==='jersey_number'||key.includes('mobile')?'numeric':undefined} onChange={e=>setEditForm(prev=>prev?({...prev,[key]:key==='jersey_back_name'?e.target.value.toUpperCase():e.target.value}):prev)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400"/></label>)}
                      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="text-xs font-bold text-slate-700">Student Photo <span className="font-normal text-slate-400">(optional)</span></div>
                        <div className="flex items-center gap-3">
                          {editForm.student_photo ? (
                            <img src={resolveStudentPhotoUrl(editForm.student_photo) || ''} alt="Student photo preview" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
                          ) : (
                            <div className="h-16 w-16 rounded-xl bg-slate-100 text-[10px] text-slate-400 flex items-center justify-center">No Photo</div>
                          )}
                          <div className="flex-1 space-y-2">
                            <input type="file" accept="image/*" disabled={editPhotoUploading || editSaving} onChange={e=>{void handleSelectEditPhoto(e.target.files?.[0]);e.currentTarget.value='';}} className="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-indigo-700" />
                            {editForm.student_photo && <button type="button" onClick={()=>setEditForm(p=>p?({...p,student_photo:null}):p)} className="text-[11px] font-bold text-rose-600">Remove photo</button>}
                          </div>
                        </div>
                        {editPhotoUploading && <p className="text-[11px] text-indigo-600">Uploading photo…</p>}
                        {editPhotoError && <p role="alert" className="text-[11px] font-semibold text-rose-600">{editPhotoError}</p>}
                      </div>
                      <label className="block text-xs font-bold text-slate-700">Send Method<select value={editForm.send_method} onChange={e=>setEditForm(p=>p?({...p,send_method:e.target.value as any}):p)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="bkash">bKash</option><option value="nagad">Nagad</option></select></label>
                      <label className="block text-xs font-bold text-slate-700">Jersey Size<div className="mt-2 flex flex-wrap gap-2">{editSizes.map(sz=><button key={sz} type="button" onClick={()=>setEditForm(p=>p?({...p,jersey_size:sz}):p)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${editForm.jersey_size===sz?'border-indigo-600 bg-indigo-600 text-white':'border-slate-200 text-slate-700'}`}>{sz}</button>)}</div></label>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-indigo-50 p-4 flex flex-col sm:flex-row items-center gap-4"><JerseyGraphic name={editForm.jersey_back_name} number={editForm.jersey_number} gender={matchedRecord.gender} className="w-40 h-44"/><div className="text-xs text-indigo-900"><strong>Live Jersey Preview</strong><p>{editForm.jersey_back_name} · #{editForm.jersey_number} · Size {editForm.jersey_size}</p></div></div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2"><button type="button" onClick={()=>{setEditOpen(false);setEditForm(null);}} className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-bold text-slate-700">Cancel</button><button type="button" disabled={editSaving || editPhotoUploading} onClick={handleSaveEdit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-60"><Save className="w-4 h-4"/>{editSaving?'Saving…':'Save Changes'}</button></div>
                </section>
              )}

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
                    <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900">
                      {matchedRecord.full_name}
                    </h3>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-violet-100/80 border border-violet-200/80 text-[#6D28D9] text-xs font-mono font-bold tracking-wider shadow-2xs">
                    {matchedRecord.registration_no}
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl glass-surface-subtle">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Class Roll</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.class_roll || '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl glass-surface-subtle">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Student ID</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.student_id || matchedRecord.id || '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl glass-surface-subtle">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Academic Group</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.academic_group || '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl glass-surface-subtle">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Section</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.academic_section || '—'}</span>
                  </div>
                </div>
              </div>

              {canAttemptEdit && !editOpen && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-slate-200/80">
                  <div className="text-xs text-slate-600">
                    <strong className="block text-slate-900">Need to correct your registration?</strong>
                    <span>{editState ? `${editState.edit_count}/5 successful edits used` : 'Verify your details to make a permitted update.'}</span>
                  </div>
                  <button type="button" onClick={handleStartEdit} disabled={editLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">
                    <Pencil className="w-4 h-4"/>{editLoading ? 'Verifying…' : 'Edit Registration'}
                  </button>
                </div>
              )}
              {editMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{editMessage}</div>}
              {editError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{editError}</div>}
              {editOpen && editForm && (
                <section className="rounded-3xl border border-indigo-200 bg-white/95 p-5 sm:p-6 shadow-lg space-y-5">
                  <header className="flex items-center justify-between gap-3">
                    <div><span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Registration Correction</span><h3 className="text-lg font-black text-slate-900">Edit your information</h3><p className="text-xs text-slate-500">{editState?.edit_count ?? 0}/5 successful edits used</p></div>
                    <button type="button" onClick={()=>{setEditOpen(false);setEditError(null);}} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close edit form"><X className="w-5 h-5"/></button>
                  </header>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="rounded-2xl bg-slate-50 p-4 space-y-2"><h4 className="text-xs font-extrabold text-slate-700">Current Information</h4>
                      {Object.entries({Name:matchedRecord.full_name,Roll:matchedRecord.class_roll,StudentID:matchedRecord.student_id,Mobile:matchedRecord.contact_mobile_number,Group:matchedRecord.academic_group,Section:matchedRecord.academic_section,JerseyName:matchedRecord.jersey_back_name,JerseyNumber:matchedRecord.jersey_number,JerseySize:matchedRecord.jersey_size}).map(([k,v])=><div key={k} className="flex justify-between gap-2 border-b border-slate-200 py-1.5 text-xs"><span className="text-slate-500">{k}</span><strong className="text-slate-800 text-right">{v || '—'}</strong></div>)}
                    </div>
                    <div className="space-y-3">
                      {([
                        ['full_name','Full Name'],['class_roll','Class Roll'],['student_id','Student ID'],['contact_mobile_number','Contact Mobile Number'],
                        ['academic_group','Academic Group'],['academic_section','Section'],['sender_mobile_no','Payment Sender Mobile'],['payment_time','Payment Time'],['transaction_id','Transaction ID'],['jersey_back_name','Jersey Back Name'],['jersey_number','Jersey Number']
                      ] as const).map(([key,label])=><label key={key} className="block text-xs font-bold text-slate-700">{label}<input value={(editForm as any)[key] || ''} maxLength={key==='jersey_number'?3:key==='jersey_back_name'?14:120} inputMode={key==='jersey_number'||key.includes('mobile')?'numeric':undefined} onChange={e=>setEditForm(prev=>prev?({...prev,[key]:key==='jersey_back_name'?e.target.value.toUpperCase():e.target.value}):prev)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400"/></label>)}
                      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="text-xs font-bold text-slate-700">Student Photo <span className="font-normal text-slate-400">(optional)</span></div>
                        <div className="flex items-center gap-3">
                          {editForm.student_photo ? (
                            <img src={resolveStudentPhotoUrl(editForm.student_photo) || ''} alt="Student photo preview" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
                          ) : (
                            <div className="h-16 w-16 rounded-xl bg-slate-100 text-[10px] text-slate-400 flex items-center justify-center">No Photo</div>
                          )}
                          <div className="flex-1 space-y-2">
                            <input type="file" accept="image/*" disabled={editPhotoUploading || editSaving} onChange={e=>{void handleSelectEditPhoto(e.target.files?.[0]);e.currentTarget.value='';}} className="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-indigo-700" />
                            {editForm.student_photo && <button type="button" onClick={()=>setEditForm(p=>p?({...p,student_photo:null}):p)} className="text-[11px] font-bold text-rose-600">Remove photo</button>}
                          </div>
                        </div>
                        {editPhotoUploading && <p className="text-[11px] text-indigo-600">Uploading photo…</p>}
                        {editPhotoError && <p role="alert" className="text-[11px] font-semibold text-rose-600">{editPhotoError}</p>}
                      </div>
                      <label className="block text-xs font-bold text-slate-700">Send Method<select value={editForm.send_method} onChange={e=>setEditForm(p=>p?({...p,send_method:e.target.value as any}):p)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="bkash">bKash</option><option value="nagad">Nagad</option></select></label>
                      <label className="block text-xs font-bold text-slate-700">Jersey Size<div className="mt-2 flex flex-wrap gap-2">{editSizes.map(sz=><button key={sz} type="button" onClick={()=>setEditForm(p=>p?({...p,jersey_size:sz}):p)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${editForm.jersey_size===sz?'border-indigo-600 bg-indigo-600 text-white':'border-slate-200 text-slate-700'}`}>{sz}</button>)}</div></label>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-indigo-50 p-4 flex flex-col sm:flex-row items-center gap-4"><JerseyGraphic name={editForm.jersey_back_name} number={editForm.jersey_number} gender={matchedRecord.gender} className="w-40 h-44"/><div className="text-xs text-indigo-900"><strong>Live Jersey Preview</strong><p>{editForm.jersey_back_name} · #{editForm.jersey_number} · Size {editForm.jersey_size}</p></div></div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2"><button type="button" onClick={()=>{setEditOpen(false);setEditForm(null);}} className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-bold text-slate-700">Cancel</button><button type="button" disabled={editSaving || editPhotoUploading} onClick={handleSaveEdit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-60"><Save className="w-4 h-4"/>{editSaving?'Saving…':'Save Changes'}</button></div>
                </section>
              )}

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
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#00D4FF] hover:brightness-105 text-white font-extrabold text-sm shadow-[0_12px_28px_-6px_rgba(91,95,239,0.36),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_16px_36px_-6px_rgba(91,95,239,0.48)] transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isDownloading ? 'Generating Pass…' : 'Download Pass'}</span>
                </button>
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
