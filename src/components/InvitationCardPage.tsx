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
