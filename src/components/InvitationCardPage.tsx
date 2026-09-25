import React, { useState, useEffect } from 'react';
import { InvitationRecord, PdfSettings, WebsiteSettings } from '../types';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Sparkles,
  QrCode,
  Calendar,
  MapPin,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { generateInvitationCardPDF } from '../utils/pdfGenerator';
import badgeImage from '../assets/images/rd27_invitation_badge_1790159004807.jpg';

interface InvitationCardPageProps {
  invitations: InvitationRecord[];
  initialSearchRegNo?: string;
  onNavigateToRegister: () => void;
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
  const [searchName, setSearchName] = useState('');
  const [searchRegNo, setSearchRegNo] = useState(initialSearchRegNo);
  const [searched, setSearched] = useState(false);
  const [matchedRecord, setMatchedRecord] = useState<InvitationRecord | null>(null);
  const [downloadToast, setDownloadToast] = useState(false);

  useEffect(() => {
    if (initialSearchRegNo) {
      setSearchRegNo(initialSearchRegNo);
      handleSearchWith(initialSearchRegNo, '');
    }
  }, [initialSearchRegNo]);

  const handleSearchWith = (regNoVal: string, nameVal: string) => {
    const cleanedReg = regNoVal.trim().toUpperCase();
    const cleanedName = nameVal.trim().toLowerCase();

    setSearched(true);

    if (!cleanedReg && !cleanedName) {
      setMatchedRecord(null);
      return;
    }

    const found = invitations.find(item => {
      const matchReg = cleanedReg ? item.registrationNo.toUpperCase() === cleanedReg : true;
      const matchName = cleanedName
        ? item.name.toLowerCase().includes(cleanedName)
        : true;
      return matchReg && matchName;
    });

    setMatchedRecord(found || null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchWith(searchRegNo, searchName);
  };

  const handlePresetSelect = (regNo: string, name: string) => {
    setSearchRegNo(regNo);
    setSearchName(name);
    handleSearchWith(regNo, name);
  };

  const handleDownloadPDF = () => {
    if (!matchedRecord) return;
    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3500);

    generateInvitationCardPDF(matchedRecord, pdfSettings, websiteSettings);
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

      {/* Instant Demo Presets Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#5B5FEF]" />
          <span>Quick Demo Test Cases:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handlePresetSelect('RD27-001', 'John Doe')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <CheckCircle2 className="w-3 h-3" /> Approved: RD27-001
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('RD27-101', 'Sohan Chowdhury')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Clock className="w-3 h-3" /> Pending: RD27-101
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('RD27-999', 'Tanvir Ahmed')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <XCircle className="w-3 h-3" /> Rejected: RD27-999
          </button>
        </div>
      </div>

      {/* Search Layout (Form) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_20px_45px_-15px_rgba(91,95,239,0.08)] mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Student Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none transition-all"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Registration Number <span className="text-slate-400 font-normal">(e.g. RD27-001)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. RD27-001"
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
                We could not find any registration matching "{searchRegNo || searchName}". Please verify your registration number or submit a fresh registration form.
              </p>
              <button
                onClick={onNavigateToRegister}
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
                  {matchedRecord.registrationNo}
                </div>
              </div>

              <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="text-slate-500 font-semibold uppercase block">Applicant</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">{matchedRecord.name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="text-slate-500 font-semibold uppercase block">Roll & Student ID</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    Roll {matchedRecord.roll} · {matchedRecord.id}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/80 border border-amber-200">
                  <span className="text-slate-500 font-semibold uppercase block">Custom Jersey Order</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {matchedRecord.jerseyName} #{matchedRecord.jerseyNumber} ({matchedRecord.jerseySize})
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
                  {matchedRecord.registrationNo}
                </div>
              </div>

              {/* Reason */}
              <div className="py-5">
                <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {matchedRecord.rejectionReason || 'Invalid Transaction ID or Payment Not Received.'}
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
                  onClick={onNavigateToRegister}
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
              <div className="print-invitation-card relative w-full rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(15,23,42,0.4)] border border-slate-800 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
                {/* Holographic accent stripe */}
                <div className="h-2 w-full bg-gradient-to-r from-[#5B5FEF] via-[#00D4FF] to-[#EC4899]" />

                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left Pass Section */}
                  <div className="md:col-span-8 flex flex-col justify-between space-y-6">
                    {/* Brand Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#5B5FEF] to-[#00D4FF] p-[1.5px] flex items-center justify-center">
                          <div className="w-full h-full bg-[#0F172A] rounded-[9px] flex items-center justify-center font-display font-black text-sm text-white">
                            27
                          </div>
                        </div>
                        <div>
                          <div className="font-display text-lg font-black tracking-wider text-white">
                            {pdfSettings.invitationCardTitle || `${websiteSettings.eventName} · OFFICIAL PASS`}
                          </div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-[#00D4FF]">
                            Annual Grand Farewell Extravaganza
                          </div>
                        </div>
                      </div>

                      <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </div>
                    </div>

                    {/* Student Identity */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                      {matchedRecord.photoUrl ? (
                        <img
                          src={matchedRecord.photoUrl}
                          alt={matchedRecord.name}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-white/20 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#5B5FEF] to-[#7A6CFF] flex items-center justify-center text-xl font-bold font-display shadow-md">
                          {matchedRecord.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-xl font-extrabold text-white tracking-wide">
                          {matchedRecord.name}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[11px]">
                            Roll: {matchedRecord.roll}
                          </span>
                          <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[11px]">
                            ID: {matchedRecord.id}
                          </span>
                          <span className="text-[#00D4FF] font-medium">
                            {matchedRecord.group} (Sec {matchedRecord.section})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Jersey Back
                        </span>
                        <span className="font-display font-bold text-white tracking-wide">
                          {matchedRecord.jerseyName}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Squad # & Size
                        </span>
                        <span className="font-mono font-bold text-[#00D4FF]">
                          #{matchedRecord.jerseyNumber} · {matchedRecord.jerseySize}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Seating Zone
                        </span>
                        <span className="font-medium text-white truncate block">
                          {matchedRecord.seatZone || 'Zone A - Amphitheatre'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Entry Gate
                        </span>
                        <span className="font-medium text-emerald-400 truncate block">
                          {matchedRecord.gate || 'Gate 02 (North)'}
                        </span>
                      </div>
                    </div>

                    {/* Event Timestamp and Location */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2 border-t border-white/10">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#5B5FEF]" /> {websiteSettings.eventDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#00D4FF]" /> {websiteSettings.venue}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Authorized
                      </span>
                    </div>
                  </div>

                  {/* Right Stub Section (Perforated ticket stub style) */}
                  <div className="md:col-span-4 relative flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-dashed border-slate-700 text-center">
                    <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                      Scan At Checkpoint
                    </div>

                    {/* QR Code graphic */}
                    <div className="p-3 rounded-2xl bg-white text-slate-950 shadow-xl mb-3 flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-slate-900" />
                    </div>

                    <div className="font-mono text-xs font-bold text-[#00D4FF] tracking-wider mb-1">
                      {matchedRecord.registrationNo}
                    </div>

                    <div className="text-[10px] text-slate-400 leading-tight">
                      Strictly non-transferable.
                      <br />
                      Valid for 1 Entry Only.
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="mt-4 w-full py-2.5 px-3 rounded-xl bg-[#5B5FEF] hover:bg-[#4d51d4] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
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
