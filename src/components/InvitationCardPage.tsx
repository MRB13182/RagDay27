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
import { toPng, toJpeg } from 'html-to-image';
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
  invitations = [],
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
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg'>('png');
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
        const fetched = result.data;
        const localMatch = invitations.find(
          item =>
            item.registration_no?.trim().toUpperCase() === cleanedReg &&
            item.full_name?.trim().toLowerCase() === cleanedName.toLowerCase()
        );
        const mergedRecord: InvitationRecord = localMatch
          ? {
              ...fetched,
              class_roll: fetched.class_roll?.trim() || localMatch.class_roll?.trim() || '',
              student_id: fetched.student_id?.trim() || localMatch.student_id?.trim() || '',
              academic_group: fetched.academic_group?.trim() || localMatch.academic_group?.trim() || '',
              academic_section: fetched.academic_section?.trim() || localMatch.academic_section?.trim() || '',
            }
          : fetched;
        setMatchedRecord(mergedRecord);
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


  const handleDownloadPass = async (format: 'png' | 'jpg' = downloadFormat) => {
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

      let dataUrl: string;
      if (format === 'jpg') {
        dataUrl = await toJpeg(targetElement, {
          quality: 0.98,
          pixelRatio: 1, // Exact 1920x819 master resolution
          cacheBust: true,
          skipFonts: true,
          backgroundColor: '#FFFFFF',
        });
      } else {
        dataUrl = await toPng(targetElement, {
          pixelRatio: 1, // Exact 1920x819 master resolution
          cacheBust: true,
          skipFonts: true,
        });
      }

      const cleanReg = (matchedRecord.registration_no || 'RD27').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanReg}_Pass.${format === 'jpg' ? 'jpg' : 'png'}`;

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
          let fallbackDataUrl: string;
          if (format === 'jpg') {
            fallbackDataUrl = await toJpeg(fallbackTarget, {
              quality: 0.98,
              pixelRatio: 2,
              cacheBust: true,
              skipFonts: true,
              backgroundColor: '#FFFFFF',
            });
          } else {
            fallbackDataUrl = await toPng(fallbackTarget, {
              pixelRatio: 2,
              cacheBust: true,
              skipFonts: true,
            });
          }

          const cleanReg = (matchedRecord.registration_no || 'RD27').replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${cleanReg}_Pass.${format === 'jpg' ? 'jpg' : 'png'}`;

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
      setDownloadError(`Unable to generate ${format.toUpperCase()} pass image. Please try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="public-glass-page relative isolate py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0C1018]/90 border border-[#C9D0D9]/20 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#8BEAFF]" />
          <span className="text-[11px] font-mono font-bold text-[#C9D0D9] tracking-[0.2em] uppercase">
            Official Entry Pass
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F5F7FA] tracking-tight leading-tight">
          Verify & Download <br />
          <span className="chrome-text">
            Invitation Card
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-[#94A0B2] mt-2.5 max-w-lg mx-auto font-medium leading-relaxed">
          Enter your Registration Number and Student Name to verify committee authorization and access your digital pass. Both fields are required for security verification.
        </p>
      </div>

      {/* Search Form Card */}
      <div className="p-5 sm:p-7 rounded-3xl museum-frame bg-[#0C1018]/92 border border-[#C9D0D9]/18 shadow-[0_24px_70px_rgba(0,0,0,0.6)] mb-8">
        <form
          onSubmit={e => {
            e.preventDefault();
            void handleSearchWith(searchRegNo, searchStudentName);
          }}
          className="space-y-4"
        >
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#C9D0D9] mb-1.5">
                Registration Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#8BEAFF]">
                  <Hash className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. RD27-01"
                  value={searchRegNo}
                  onChange={e => setSearchRegNo(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-mono font-bold bg-[#080B12]/95 border border-[#C9D0D9]/18 text-[#F5F7FA] placeholder-[#626B79] focus:border-[#8BEAFF] focus:ring-2 focus:ring-[#8BEAFF]/25 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#C9D0D9] mb-1.5">
                Student Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#8BEAFF]">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Enter student full name..."
                  value={searchStudentName}
                  onChange={e => setSearchStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm font-medium bg-[#080B12]/95 border border-[#C9D0D9]/18 text-[#F5F7FA] placeholder-[#626B79] focus:border-[#8BEAFF] focus:ring-2 focus:ring-[#8BEAFF]/25 outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3.5 px-7 rounded-xl bg-gradient-to-r from-[#8BEAFF] to-[#B7F2FF] text-[#08090D] font-extrabold text-sm shadow-[0_12px_28px_rgba(139,234,255,0.22)] hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
            <div className="p-8 rounded-3xl glass-card text-center">
              <div className="w-12 h-12 rounded-full bg-[#121824] border border-[#C9D0D9]/20 text-[#8BEAFF] mx-auto flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#F5F7FA]">
                No Record Found
              </h3>
              <p className="text-xs text-[#94A0B2] max-w-md mx-auto mt-1 mb-4">
                {searchError || `We could not find any registration matching "${searchRegNo}". Please verify your registration number.`}
              </p>
              <button
                onClick={() => onNavigateToRegister()}
                className="px-5 py-2.5 rounded-xl glass-button-primary text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Go to Registration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STATE 2: PENDING APPROVAL */}
          {matchedRecord && matchedRecord.status === 'pending' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-amber-950/35 backdrop-blur-2xl border border-amber-400/35 shadow-[0_24px_60px_rgba(0,0,0,0.55)] text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-amber-400/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                    <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">
                      Application Status
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-[#F5F7FA]">
                      Status: Pending Approval
                    </h3>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#090C13]/95 text-amber-300 text-xs font-bold tracking-wider font-mono border border-amber-400/35 tabular-nums">
                  {matchedRecord.registration_no}
                </div>
              </div>

              <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#090C13]/95 border border-[#C9D0D9]/15">
                  <span className="text-[#8B95A5] font-semibold uppercase block text-[10px] tracking-wider">Applicant</span>
                  <span className="text-sm font-bold text-[#F5F7FA] mt-0.5 block">{matchedRecord.full_name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#090C13]/95 border border-[#C9D0D9]/15">
                  <span className="text-[#8B95A5] font-semibold uppercase block text-[10px] tracking-wider">Roll & Student ID</span>
                  <div className="text-sm font-bold text-[#F5F7FA] mt-0.5 space-y-0.5 tabular-nums">
                    <div>Roll: {matchedRecord.class_roll?.trim() || '—'}</div>
                    <div>Student ID: {matchedRecord.student_id?.trim() || '—'}</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#090C13]/95 border border-[#C9D0D9]/15">
                  <span className="text-[#8B95A5] font-semibold uppercase block text-[10px] tracking-wider">Academic Details</span>
                  <div className="text-sm font-bold text-[#F5F7FA] mt-0.5 space-y-0.5">
                    <div>Group: {matchedRecord.academic_group?.trim() || '—'}</div>
                    <div>Section: {matchedRecord.academic_section?.trim() || '—'}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#090C13]/90 border border-amber-400/25 text-xs text-amber-100 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Verification in Progress:</strong> Your payment and student records are currently pending authorization by the Rag Day 27 Admin committee. Once approved, your invitation card and official entry pass download will appear here automatically.
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: REJECTED BY ADMIN */}
          {matchedRecord && matchedRecord.status === 'rejected' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-rose-950/40 backdrop-blur-2xl border border-rose-400/35 shadow-[0_24px_60px_rgba(0,0,0,0.55)] text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-rose-400/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-300">
                      Application Status
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-[#F5F7FA]">
                      Status: Rejected By Admin
                    </h3>
                  </div>
                </div>

                <div className="px-4 py-2 rounded-xl bg-[#090C13]/95 text-rose-300 text-xs font-bold tracking-wider font-mono border border-rose-400/35 tabular-nums">
                  {matchedRecord.registration_no}
                </div>
              </div>

              {/* Reason: show ONLY the reject_reason stored in the database */}
              <div className="py-5">
                <div className="p-4 rounded-2xl bg-[#090C13]/95 border border-rose-500/30">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm font-extrabold text-rose-100 whitespace-pre-wrap">
                    {matchedRecord.reject_reason || 'No specific reason provided.'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-rose-200/80">
                  Questions? Inquire directly with the Committee Admin.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryStudentId('');
                    setRecoveryError(null);
                    setShowRecoveryDialog(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-500 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
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
              <div className="p-6 sm:p-7 rounded-3xl museum-frame bg-[#0C1018]/92 border border-[#C9D0D9]/18 text-left">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#C9D0D9]/12">
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8B95A5]">
                      Registration Information
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-black text-[#F5F7FA]">
                      {matchedRecord.full_name}
                    </h3>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#8BEAFF] text-[#08090D] text-xs font-mono font-black tracking-wider tabular-nums">
                    {matchedRecord.registration_no}
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-[#090C13]/95 border border-[#C9D0D9]/15">
                    <div className="flex items-center gap-1.5 text-[#8B95A5] font-bold uppercase text-[10px]">
                      <Lock className="w-3 h-3 text-[#8BEAFF]" />
                      <span>Class Roll</span>
                    </div>
                    <span className="text-[#F5F7FA] font-black text-base sm:text-lg mt-1 block tabular-nums">{matchedRecord.class_roll || '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#090C13]/95 border border-[#C9D0D9]/15">
                    <div className="flex items-center gap-1.5 text-[#8B95A5] font-bold uppercase text-[10px]">
                      <IdCard className="w-3 h-3 text-[#8BEAFF]" />
                      <span>Student ID</span>
                    </div>
                    <span className="text-[#F5F7FA] font-black text-base sm:text-lg mt-1 block tabular-nums">{matchedRecord.student_id || matchedRecord.id || '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#090C13]/95 border border-[#C9D0D9]/15">
                    <div className="flex items-center gap-1.5 text-[#8B95A5] font-bold uppercase text-[10px]">
                      <GraduationCap className="w-3 h-3 text-[#8BEAFF]" />
                      <span>Academic Group</span>
                    </div>
                    <span className="text-[#F5F7FA] font-black text-base sm:text-lg mt-1 block">{matchedRecord.academic_group?.trim() || '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#090C13]/95 border border-[#C9D0D9]/15">
                    <div className="flex items-center gap-1.5 text-[#8B95A5] font-bold uppercase text-[10px]">
                      <Building2 className="w-3 h-3 text-[#8BEAFF]" />
                      <span>Section</span>
                    </div>
                    <span className="text-[#F5F7FA] font-black text-base sm:text-lg mt-1 block">{matchedRecord.academic_section?.trim() || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Status: Approved Header with the single [ Download Pass ] button */}
              <div className="p-5 sm:p-6 rounded-3xl bg-emerald-950/35 backdrop-blur-2xl border border-emerald-400/35 shadow-[0_24px_60px_rgba(0,0,0,0.55)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                      Application Status
                    </span>
                    <h3 className="font-display text-2xl font-extrabold text-[#F5F7FA]">
                      Status: Approved
                    </h3>
                  </div>
                </div>

                {/* Download Pass Controls with PNG and JPG options */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="inline-flex items-center p-1 rounded-xl bg-[#090C13] border border-[#C9D0D9]/20 self-center">
                    <button
                      type="button"
                      onClick={() => setDownloadFormat('png')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        downloadFormat === 'png'
                          ? 'bg-[#8BEAFF] text-[#08090D]'
                          : 'text-[#94A0B2] hover:text-[#F5F7FA]'
                      }`}
                    >
                      PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => setDownloadFormat('jpg')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        downloadFormat === 'jpg'
                          ? 'bg-[#8BEAFF] text-[#08090D]'
                          : 'text-[#94A0B2] hover:text-[#F5F7FA]'
                      }`}
                    >
                      JPG
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadPass(downloadFormat)}
                    disabled={isDownloading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#8BEAFF] to-[#B7F2FF] hover:brightness-105 text-[#08090D] font-extrabold text-sm shadow-[0_12px_28px_rgba(139,234,255,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isDownloading ? 'Generating Pass…' : `Download Pass (${downloadFormat.toUpperCase()})`}</span>
                  </button>
                </div>
              </div>

              {/* Institution Card */}
              <div className="p-5 sm:p-6 rounded-3xl museum-frame bg-[#0C1018]/92 border border-[#C9D0D9]/18 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#080B12] p-2 border border-[#C9D0D9]/20 flex items-center justify-center">
                  {pdfSettings?.pdfLogo ? (
                    <img src={pdfSettings.pdfLogo} alt="NIC Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-extrabold text-[#8BEAFF] text-xs">NIC</span>
                  )}
                </div>
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-[#F5F7FA]">
                    National Ideal College
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-[#94A0B2] mt-0.5">
                    Rag Day of NIC 27
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#090C13] border border-[#C9D0D9]/20 text-[10px] font-mono font-extrabold text-[#C9D0D9] uppercase tracking-widest">
                  BATCH 2027
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#090C13] border border-[#8BEAFF]/25 text-[10px] font-extrabold text-[#F5F7FA] uppercase tracking-wider font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8BEAFF]" />
                    NIC 2027 · OFFICIAL PASS
                  </span>
                </div>
              </div>

              {/* Toast Feedback */}
              {downloadToast && (
                <div className="p-3.5 rounded-2xl bg-emerald-500 text-[#08090D] text-xs font-extrabold text-center shadow-lg animate-fadeIn flex items-center justify-center gap-2">
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
              <div className="w-full rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.65)] ring-1 ring-[#C9D0D9]/20" ref={displayCardRef}>
                <InvitationCard
                  record={matchedRecord}
                  websiteSettings={websiteSettings}
                  pdfSettings={pdfSettings}
                />
              </div>

              {/* Off-screen fixed 1920px landscape card matching exact master design aspect ratio */}
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  left: '-9999px',
                  top: 0,
                  width: '1920px',
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
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[#08090D]/82 backdrop-blur-lg p-4 animate-fadeIn">
          <form
            className="w-full max-w-md rounded-3xl glass-modal p-6 sm:p-7 shadow-[0_32px_90px_rgba(0,0,0,0.75)] border border-rose-400/35 space-y-4 text-[#F5F7FA]"
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
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-rose-300 bg-rose-500/15 px-2.5 py-1 rounded-md border border-rose-400/30">
                Data Recovery
              </span>
              <h3 className="text-xl font-display font-extrabold text-[#F5F7FA] mt-2">Recover Registration</h3>
              <p className="mt-1 text-xs text-[#94A0B2] leading-relaxed">Enter the Student ID from your original registration to verify your record and restore its saved details.</p>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wide text-[#C9D0D9]">
              Original Student ID
              <input
                autoComplete="off"
                inputMode="numeric"
                value={recoveryStudentId}
                onChange={e => setRecoveryStudentId(e.target.value.replace(/\D/g, ''))}
                className="mt-1.5 w-full rounded-xl glass-input px-4 py-3 text-sm text-[#F5F7FA] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/25"
                placeholder="Enter your original Student ID"
                required
                disabled={isRecoveringRejected}
              />
            </label>
            {recoveryError && <p className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs font-bold text-rose-200" role="alert">{recoveryError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowRecoveryDialog(false)} className="flex-1 rounded-xl glass-button px-4 py-3 text-xs font-bold text-[#C9D0D9] cursor-pointer" disabled={isRecoveringRejected}>Cancel</button>
              <button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:brightness-110 text-white px-4 py-3 text-xs font-bold disabled:opacity-60 cursor-pointer" disabled={isRecoveringRejected || !recoveryStudentId.trim()}>{isRecoveringRejected ? 'Verifying...' : 'Verify & Continue'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
