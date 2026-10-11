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
import { getPublicInvitation } from '../services';
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
    <div className="py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/95 shadow-[0_20px_45px_-15px_rgba(91,95,239,0.08),inset_0_1.5px_1px_white] mb-8">
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
                className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold bg-slate-50/80 backdrop-blur-md border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
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
                className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-50/80 backdrop-blur-md border border-slate-200/90 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSearching}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] text-white font-bold text-sm shadow-md shadow-[#6D28D9]/25 hover:shadow-lg hover:shadow-[#6D28D9]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{isSearching ? 'Verifying with Database…' : 'Verify & Search'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEARCH RESULT STATES */}
      {searched && (
        <div className="transition-all duration-300">
          {/* STATE 1: Not Found */}
          {!matchedRecord && (
            <div className="p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.05),inset_0_1.5px_1px_white] text-center">
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
                className="px-5 py-2.5 rounded-xl bg-[#6D28D9] text-white text-xs font-bold shadow hover:bg-[#5B21B6] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Go to Registration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STATE 2: PENDING APPROVAL */}
          {matchedRecord && matchedRecord.status === 'pending' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/85 backdrop-blur-xl border-2 border-amber-300/90 shadow-[0_15px_35px_-10px_rgba(245,158,11,0.15),inset_0_1.5px_2px_white] text-left">
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

                <div className="px-4 py-2 rounded-xl bg-amber-200/80 text-amber-900 text-xs font-bold tracking-wider font-mono shadow-xs border border-amber-300/50">
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

              <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <strong>Verification in Progress:</strong> Your payment and student records are currently pending authorization by the Rag Day 27 Admin committee. Once approved, your invitation card and official entry pass download will appear here automatically.
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: REJECTED BY ADMIN */}
          {matchedRecord && matchedRecord.status === 'rejected' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-rose-50/85 backdrop-blur-xl border-2 border-rose-300/90 shadow-[0_15px_35px_-10px_rgba(244,63,94,0.15),inset_0_1.5px_2px_white] text-left">
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

                <div className="px-4 py-2 rounded-xl bg-rose-200/80 text-rose-900 text-xs font-bold tracking-wider font-mono shadow-xs border border-rose-300/50">
                  {matchedRecord.registration_no}
                </div>
              </div>

              {/* Reason: show ONLY the reject_reason stored in the database */}
              <div className="py-5">
                <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-rose-200 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 whitespace-pre-wrap">
                    {matchedRecord.reject_reason || 'No specific reason provided.'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-rose-800">
                  Questions? Inquire directly with the Committee Admin.
                </span>
                <button
                  onClick={() => onNavigateToRegister(matchedRecord)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Register Again</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: APPROVED -> STUDENT DETAILS -> STATUS: APPROVED -> [ Download Pass ] */}
          {matchedRecord && matchedRecord.status === 'approved' && (
            <div className="space-y-6">
              {/* Student Details / Registration Information */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_15px_35px_-10px_rgba(91,95,239,0.08),inset_0_1.5px_1px_white] text-left">
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
                  <div className="p-3 rounded-xl bg-slate-50/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Class Roll</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.class_roll || '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Student ID</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.student_id || matchedRecord.id || '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Academic Group</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.academic_group || '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 backdrop-blur-md border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Section</span>
                    <span className="text-slate-900 font-extrabold text-sm mt-0.5 block">{matchedRecord.academic_section || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Status: Approved Header with the single [ Download Pass ] button */}
              <div className="p-5 sm:p-6 rounded-3xl bg-emerald-50/85 backdrop-blur-xl border-2 border-emerald-300/90 shadow-[0_15px_35px_-10px_rgba(16,185,129,0.15),inset_0_1.5px_2px_white] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] hover:from-[#5B21B6] hover:to-[#7C3AED] text-white font-extrabold text-sm shadow-lg shadow-[#7C3AED]/25 hover:shadow-xl hover:shadow-[#7C3AED]/35 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
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
                  <span>✓ Pass downloaded successfully as high-resolution PNG!</span>
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
    </div>
  );
};
