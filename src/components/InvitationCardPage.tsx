import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { generateInvitationCardPDF } from '../utils/pdfGenerator';
import { getPublicInvitation } from '../services';

interface InvitationCardPageProps {
  invitations: InvitationRecord[];
  initialSearchRegNo?: string;
  onNavigateToRegister: (record?: InvitationRecord) => void;
  pdfSettings: PdfSettings;
  websiteSettings: WebsiteSettings;
}

export const InvitationCardPage: React.FC<InvitationCardPageProps> = ({
  invitations,
  initialSearchRegNo = '',
  onNavigateToRegister,
  pdfSettings,
  websiteSettings,
}) => {
  const [searchRegNo, setSearchRegNo] = useState(initialSearchRegNo);
  const [studentName, setStudentName] = useState('');
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchedRecord, setMatchedRecord] = useState<InvitationRecord | null>(null);
  const [downloadToast, setDownloadToast] = useState(false);

  useEffect(() => {
    if (initialSearchRegNo) {
      setSearchRegNo(initialSearchRegNo);
      const match = invitations.find(r => r.registration_no?.trim().toUpperCase() === initialSearchRegNo.trim().toUpperCase());
      if (match?.full_name && !studentName) {
        setStudentName(match.full_name);
      }
      handleSearchWith(initialSearchRegNo);
    }
  }, [initialSearchRegNo, invitations]);

  const handleSearchWith = async (regNoVal: string) => {
    const cleanedReg = regNoVal.trim().toUpperCase();
    const cleanedName = studentName.trim();
    setSearched(true);
    setSearchError(null);

    if (!cleanedReg && !cleanedName) {
      setMatchedRecord(null);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Check if record exists in invitations state (populated from DB create_registration)
      const matchInState = invitations.find(r =>
        (cleanedReg && r.registration_no?.trim().toUpperCase() === cleanedReg) ||
        (cleanedName && !cleanedReg && r.full_name?.trim().toLowerCase() === cleanedName.toLowerCase())
      );

      const effectiveName = cleanedName || matchInState?.full_name || '';
      const effectiveReg = cleanedReg || matchInState?.registration_no || '';

      if (effectiveReg && effectiveName) {
        const result = await getPublicInvitation(effectiveReg, effectiveName);
        if (result.success && result.data) {
          setMatchedRecord(matchInState ? { ...matchInState, ...result.data } : result.data);
          return;
        }
      }

      if (matchInState) {
        setMatchedRecord(matchInState);
        return;
      }

      setMatchedRecord(null);
      setSearchError('No registration found. Please check your Registration Number and Student Name.');
    } catch (error: any) {
      const matchInState = invitations.find(r => cleanedReg && r.registration_no?.trim().toUpperCase() === cleanedReg);
      if (matchInState) {
        setMatchedRecord(matchInState);
        return;
      }
      setMatchedRecord(null);
      setSearchError(error?.message || 'Unable to verify registration.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!matchedRecord || matchedRecord.status !== 'approved') return;
    generateInvitationCardPDF(matchedRecord, pdfSettings, websiteSettings);
    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3500);
  };

  return (
    <div className="py-8 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-slate-200 shadow-sm backdrop-blur-md mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#5B5FEF]" />
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            Official Gate Pass Portal
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Verify & Download Invitation Card
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Enter your student name or registered <strong>Registration Number</strong> to review committee authorization, seat allocation, and download your entry ticket.
        </p>
      </div>

      {/* Search Layout (Form) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_20px_45px_-15px_rgba(91,95,239,0.08)] mb-8">
        <form onSubmit={e => { e.preventDefault(); void handleSearchWith(searchRegNo); }} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Student Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name..."
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              autoComplete="name"
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Registration Number
            </label>
            <input
              type="text"
              placeholder="Enter registration no..."
              value={searchRegNo}
              onChange={e => setSearchRegNo(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white font-bold text-sm shadow-md shadow-[#5B5FEF]/25 hover:shadow-lg hover:shadow-[#5B5FEF]/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEARCH RESULT STATES */}
      {searched && (
        <div className="transition-all duration-300">
          {/* STATE 1: Not Found */}
          {!matchedRecord && (
            <div className="p-8 rounded-3xl bg-white/75 backdrop-blur-lg border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                No Record Found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                We could not find any registration matching "{searchRegNo}". Please verify your registration number or submit a fresh registration form.
              </p>
              <button
                onClick={() => onNavigateToRegister()}
                className="px-5 py-2.5 rounded-xl bg-[#5B5FEF] text-white text-xs font-bold shadow hover:bg-[#4d51d4] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Go to Registration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STATE 2: PENDING APPROVAL */}
          {matchedRecord && matchedRecord.status === 'pending' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/90 backdrop-blur-xl border-2 border-amber-300 shadow-[0_15px_35px_-10px_rgba(245,158,11,0.15)] text-left">
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

                <div className="px-4 py-2 rounded-xl bg-amber-200/80 text-amber-900 text-xs font-bold tracking-wider font-mono">
                  {matchedRecord.registration_no}
                </div>
              </div>

              <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="text-slate-500 font-semibold uppercase block">Applicant</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">{matchedRecord.full_name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="text-slate-500 font-semibold uppercase block">Roll & Student ID</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    Roll {matchedRecord.class_roll} · {matchedRecord.id}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="text-slate-500 font-semibold uppercase block">Custom Jersey Order</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {matchedRecord.jersey_back_name} #{matchedRecord.jersey_number} ({matchedRecord.jersey_size})
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <strong>Verification in Progress:</strong> Your payment and student records are currently pending authorization by the Rag Day 27 Admin committee. Once approved, your invitation card preview and downloadable PDF pass will appear here automatically.
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: REJECTED BY ADMIN */}
          {matchedRecord && matchedRecord.status === 'rejected' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-rose-50/90 backdrop-blur-xl border-2 border-rose-300 shadow-[0_15px_35px_-10px_rgba(244,63,94,0.15)] text-left">
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

                <div className="px-4 py-2 rounded-xl bg-rose-200/80 text-rose-900 text-xs font-bold tracking-wider font-mono">
                  {matchedRecord.registration_no}
                </div>
              </div>

              {/* Reason */}
              <div className="py-5">
                <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {matchedRecord.reject_reason || 'Invalid Transaction ID or Payment Not Received.'}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    The transaction reference could not be validated with the accounts desk. Please review your mobile banking SMS and register again with the genuine transaction ID.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-rose-800">
                  Questions? Inquire directly with the Committee Admin.
                </span>
                <button
                  onClick={() => onNavigateToRegister(matchedRecord)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Register Again</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: APPROVED -> SHOW INVITATION CARD PREVIEW & DOWNLOAD PDF */}
          {matchedRecord && matchedRecord.status === 'approved' && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="p-5 sm:p-6 rounded-3xl bg-emerald-50/90 backdrop-blur-xl border-2 border-emerald-300 shadow-[0_15px_35px_-10px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Toast */}
              {downloadToast && (
                <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center shadow-lg animate-fadeIn">
                  ✓ Official PDF Invitation Card downloaded successfully!
                </div>
              )}

              {/* INVITATION CARD PREVIEW */}
              <div className="invitation-card-shell w-full">
                <div className="invitation-card relative w-full overflow-hidden">
                  <div className="invitation-orb invitation-orb-left" />
                  <div className="invitation-orb invitation-orb-right" />
                  <div className="invitation-academic-cap cap-left">◆</div>
                  <div className="invitation-academic-cap cap-top-right">◆</div>

                  <div className="invitation-brand">
                    <div className="invitation-logo-wrap">
                      {pdfSettings.pdfLogo ? <img src={pdfSettings.pdfLogo} alt="National Ideal College" /> : <div className="invitation-logo-fallback">27</div>}
                    </div>
                    <div>
                      <div className="invitation-college-name">National Ideal College</div>
                      <div className="invitation-event-name">Rag Day of NIC 27</div>
                    </div>
                  </div>

                  <div className="invitation-divider">
                    <span />
                    <b>◆</b>
                    <span />
                  </div>

                  <div className="invitation-info-panel">
                    {[
                      ['person','Name:',matchedRecord.full_name],
                      ['building','Section:',matchedRecord.academic_section || '—'],
                      ['cap','Roll:',matchedRecord.class_roll || '—'],
                      ['stack','Group:',matchedRecord.academic_group || '—'],
                      ['id','Registration No:',matchedRecord.registration_no],
                    ].map(([icon,label,value]) => (
                      <div className="invitation-info-row" key={String(label)}>
                        <span className="invitation-icon-glass" aria-hidden="true">{icon === 'person' ? '●' : icon === 'building' ? '▥' : icon === 'cap' ? '◆' : icon === 'stack' ? '▤' : '▣'}</span>
                        <span className="invitation-label">{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="invitation-photo-frame">
                    {matchedRecord.student_photo ? (
                      <img src={matchedRecord.student_photo} alt={matchedRecord.full_name} />
                    ) : (
                      <div className="invitation-photo-fallback">{matchedRecord.full_name.charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="invitation-signature">{matchedRecord.full_name}</div>

                  <div className="invitation-event-row">
                    <div><span className="invitation-bottom-icon">▦</span><b>Event Date:</b> 15 December 2027</div>
                    <div><span className="invitation-bottom-icon">●</span><b>Venue:</b> National Ideal College Campus</div>
                  </div>

                  <div className="invitation-footer-line">
                    <span />
                    <em>Official Entry Pass</em>
                    <span />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
