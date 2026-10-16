import React, { useState } from 'react';
import { InvitationRecord, WebsiteSettings, PdfSettings } from '../types';
import { resolveStudentPhotoUrl } from '../services/storage';
import {
  Sparkles,
  ShieldCheck,
  Download,
  Calendar,
  MapPin,
  User,
  Building2,
  GraduationCap,
  BookOpen,
  QrCode,
  CheckCircle2,
} from 'lucide-react';

interface InvitationCardProps {
  record: InvitationRecord;
  websiteSettings: WebsiteSettings;
  pdfSettings?: PdfSettings;
  collegeLogo?: string;
  isExport?: boolean;
}

/**
 * 3D Glassmorphic Icon Badge Component
 * Renders an Apple-inspired frosted glass tile with specular reflection,
 * layered gradient depth, and soft violet highlight.
 */
interface GlassIconProps {
  kind: 'user' | 'section' | 'roll' | 'group' | 'regno' | 'calendar' | 'venue';
}

const GlassIcon: React.FC<GlassIconProps> = ({ kind }) => {
  const renderIcon = () => {
    switch (kind) {
      case 'user':
        return <User className="w-4 h-4 text-[#0B1F3A] stroke-[2.2] drop-shadow-[0_1px_2px_rgba(11,31,58,0.25)]" />;
      case 'section':
        return <Building2 className="w-4 h-4 text-[#0B1F3A] stroke-[2.2] drop-shadow-[0_1px_2px_rgba(11,31,58,0.25)]" />;
      case 'roll':
        return <GraduationCap className="w-4 h-4 text-[#0B1F3A] stroke-[2.2] drop-shadow-[0_1px_2px_rgba(11,31,58,0.25)]" />;
      case 'group':
        return <BookOpen className="w-4 h-4 text-[#0B1F3A] stroke-[2.2] drop-shadow-[0_1px_2px_rgba(11,31,58,0.25)]" />;
      case 'regno':
        return <QrCode className="w-4 h-4 text-[#0B1F3A] stroke-[2.2] drop-shadow-[0_1px_2px_rgba(11,31,58,0.25)]" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-[#0B1F3A] stroke-[2.2] drop-shadow-[0_1px_2px_rgba(11,31,58,0.25)]" />;
      case 'venue':
        return <MapPin className="w-4 h-4 text-[#0B1F3A] stroke-[2.2] drop-shadow-[0_1px_2px_rgba(11,31,58,0.25)]" />;
    }
  };

  return (
    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-[0_4px_12px_rgba(11,31,58,0.08),inset_0_1.5px_1px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(192,192,192,0.35)] bg-gradient-to-b from-white/95 via-[#F8FAFC]/90 to-[#E2E8F0]/95 border border-[#C0C0C0]/60">
      {/* Specular gloss highlight on upper hemisphere */}
      <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/90 to-transparent pointer-events-none rounded-t-xl" />
      {/* Subtle internal radial glow */}
      <div className="absolute inset-0 bg-radial from-[#C0C0C0]/25 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10 flex items-center justify-center">
        {renderIcon()}
      </div>
    </div>
  );
};

export const InvitationCard: React.FC<InvitationCardProps> = ({
  record,
  websiteSettings,
  pdfSettings,
  collegeLogo,
  isExport = false,
}) => {
  const [photoError, setPhotoError] = useState(false);
  const resolvedPhotoUrl = resolveStudentPhotoUrl(record.student_photo);
  const safeCollegeName = 'National Ideal College';
  const safeEventBranding = 'Rag Day of NIC 27';
  const safeEventDate = websiteSettings.eventDate || '15 December 2027';
  const safeVenue = websiteSettings.venue || 'National Ideal College Campus';

  const studentName = record.full_name || 'Student Name';
  const section = record.academic_section || '—';
  const roll = record.class_roll || '—';
  const group = record.academic_group || '—';
  const regNo = record.registration_no || 'RD27-001';
  const effectiveLogo = collegeLogo || pdfSettings?.pdfLogo;

  return (
    <div className={isExport ? 'w-[1024px]' : 'w-full max-w-4xl mx-auto'}>
      {/* LUXURY GLASSMORPHISM CARD MASTER CONTAINER */}
      <div
        id={isExport ? 'invitation-card-export-area' : 'invitation-card-render-area'}
        className={`relative w-full overflow-hidden rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-white/95 via-[#F8FAFC]/90 to-[#EDF2F7]/85 backdrop-blur-2xl border-2 border-white/95 shadow-[0_30px_70px_-15px_rgba(11,31,58,0.18),0_0_0_1px_rgba(192,192,192,0.5),inset_0_1.5px_2px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(11,31,58,0.05)] select-none ${
          isExport ? 'p-9' : 'p-5 sm:p-8 lg:p-9'
        }`}
        style={{
          width: isExport ? '1024px' : undefined,
          minWidth: isExport ? '1024px' : undefined,
          maxWidth: isExport ? '1024px' : undefined,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* ========================================================= */}
        {/* BACKGROUND: Abstract Glass Blobs & Navy/Silver Gradients */}
        {/* ========================================================= */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-[#0B1F3A]/10 to-[#C0C0C0]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-[#0B1F3A]/12 via-[#C0C0C0]/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-radial from-[#C0C0C0]/20 to-transparent blur-2xl pointer-events-none" />

        {/* Floating Translucent Depth Rings (safely positioned behind non-text background areas) */}
        <div className="hidden sm:block absolute top-28 right-8 w-24 h-24 rounded-full border border-[#C0C0C0]/20 pointer-events-none z-0" />
        <div className="hidden sm:block absolute top-36 right-16 w-16 h-16 rounded-full border border-[#0B1F3A]/10 pointer-events-none z-0" />
        <div className="absolute bottom-12 left-10 w-36 h-36 rounded-full border border-[#C0C0C0]/20 pointer-events-none z-0" />

        {/* ========================================================= */}
        {/* 1. TOP HEADER & ACADEMIC BRANDING */}
        {/* ========================================================= */}
        <div className={`relative z-10 flex ${isExport ? 'flex-row items-center' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-4 mb-5 sm:mb-6`}>
          {/* Left: College Logo & Academic Headings */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 max-w-full sm:max-w-[70%]">
            {/* College Logo */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/90 backdrop-blur-md p-2 border-2 border-white/95 shadow-[0_8px_20px_-4px_rgba(11,31,58,0.12),inset_0_1px_2px_white] flex items-center justify-center shrink-0">
              {effectiveLogo ? (
                <img
                  src={effectiveLogo}
                  alt={safeCollegeName}
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(11,31,58,0.15)]"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#0B1F3A] to-[#1E3A5F] flex items-center justify-center text-white font-black text-xl shadow-xs">
                  NIC
                </div>
              )}
            </div>

            {/* College & Event Headings */}
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-[30px] font-black tracking-tight text-[#0B1F3A] leading-tight">
                {safeCollegeName}
              </h2>
              <div className="mt-1 sm:mt-1.5">
                <span className="block font-extrabold text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-[#0B1F3A] via-[#1A365D] to-[#0B1F3A] bg-clip-text text-transparent leading-snug">
                  {safeEventBranding}
                </span>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F1F5F9]/90 border border-[#C0C0C0] text-[10px] font-extrabold uppercase tracking-widest text-[#0B1F3A] shadow-xs">
                  BATCH 2027
                </span>
              </div>
            </div>
          </div>

          {/* Right: Security Watermark / Official Pass Badge */}
          <div className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#C0C0C0]/75 shadow-xs ${isExport ? 'self-center' : 'self-start sm:self-center'}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B1F3A]" />
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-[#0B1F3A]/90 font-mono whitespace-nowrap">
              NIC 2027 · OFFICIAL PASS
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PREMIUM DECORATIVE DIVIDER LINE */}
        {/* ========================================================= */}
        <div className="relative z-10 my-5 flex items-center justify-center">
          <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#C0C0C0] to-[#0B1F3A]" />
          <div className="mx-3 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white/95 border border-[#C0C0C0] shadow-xs flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#0B1F3A]" />
            </div>
          </div>
          <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-[#C0C0C0] to-[#0B1F3A]" />
        </div>

        {/* ========================================================= */}
        {/* 3. MAIN BODY: STUDENT INFO (LEFT) & PHOTO FRAME (RIGHT) */}
        {/* ========================================================= */}
        <div className={`relative z-10 ${isExport ? 'grid grid-cols-12' : 'grid grid-cols-1 md:grid-cols-12'} gap-6 sm:gap-8 items-center py-2`}>
          {/* STUDENT INFORMATION SECTION (LEFT - 7 COLS) */}
          <div className={`${isExport ? 'col-span-7' : 'md:col-span-7'} space-y-2.5 sm:space-y-3`}>
            {/* Row 1: Full Name */}
            <div className="group flex items-center gap-3.5 p-2 sm:p-2.5 rounded-2xl bg-white/70 hover:bg-white/90 backdrop-blur-md border border-[#C0C0C0]/50 shadow-[0_2px_8px_rgba(11,31,58,0.04)] transition-all">
              <GlassIcon kind="user" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Student Name
                </span>
                <span className="block font-black text-[#0B1F3A] text-sm sm:text-base leading-tight truncate">
                  {studentName}
                </span>
              </div>
            </div>

            {/* Row 2: Section */}
            <div className="group flex items-center gap-3.5 p-2 sm:p-2.5 rounded-2xl bg-white/70 hover:bg-white/90 backdrop-blur-md border border-[#C0C0C0]/50 shadow-[0_2px_8px_rgba(11,31,58,0.04)] transition-all">
              <GlassIcon kind="section" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Section
                </span>
                <span className="block font-black text-[#0B1F3A] text-sm sm:text-base leading-tight truncate">
                  {section}
                </span>
              </div>
            </div>

            {/* Row 3: Class Roll */}
            <div className="group flex items-center gap-3.5 p-2 sm:p-2.5 rounded-2xl bg-white/70 hover:bg-white/90 backdrop-blur-md border border-[#C0C0C0]/50 shadow-[0_2px_8px_rgba(11,31,58,0.04)] transition-all">
              <GlassIcon kind="roll" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Class Roll
                </span>
                <span className="block font-black text-[#0B1F3A] text-sm sm:text-base leading-tight truncate">
                  {roll}
                </span>
              </div>
            </div>

            {/* Row 4: Academic Group */}
            <div className="group flex items-center gap-3.5 p-2 sm:p-2.5 rounded-2xl bg-white/70 hover:bg-white/90 backdrop-blur-md border border-[#C0C0C0]/50 shadow-[0_2px_8px_rgba(11,31,58,0.04)] transition-all">
              <GlassIcon kind="group" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Academic Group
                </span>
                <span className="block font-black text-[#0B1F3A] text-sm sm:text-base leading-tight truncate">
                  {group}
                </span>
              </div>
            </div>

            {/* Row 5: Registration Number */}
            <div className="group flex items-center gap-3.5 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-white/90 to-[#F1F5F9]/90 backdrop-blur-md border border-[#C0C0C0] shadow-[0_4px_12px_rgba(11,31,58,0.06)] transition-all">
              <GlassIcon kind="regno" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Registration Number
                </span>
                <span className="block font-mono font-black text-[#0B1F3A] text-sm sm:text-base tracking-wide leading-tight truncate">
                  {regNo}
                </span>
              </div>
            </div>
          </div>

          {/* LARGE PHOTO FRAME ON RIGHT SIDE WITH GLASS BORDER (5 COLS) */}
          <div className={`${isExport ? 'col-span-5' : 'md:col-span-5'} flex flex-col items-center justify-center`}>
            <div className="relative w-44 sm:w-52">
              {/* Outer Frosted Glass Border Casing */}
              <div className="p-2.5 sm:p-3 rounded-[28px] bg-white/85 backdrop-blur-xl border-2 border-white shadow-[0_20px_40px_-10px_rgba(11,31,58,0.18),0_0_0_1px_rgba(192,192,192,0.5)] relative group">
                {/* Photo Viewport */}
                <div className="aspect-[3/4] w-full rounded-[20px] overflow-hidden bg-gradient-to-br from-[#E2E8F0] via-[#F1F5F9] to-[#CBD5E1] relative shadow-inner">
                  {resolvedPhotoUrl && !photoError ? (
                    <img
                      src={resolvedPhotoUrl}
                      alt={studentName}
                      crossOrigin="anonymous"
                      onError={() => setPhotoError(true)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#0B1F3A]">
                      <div className="w-16 h-16 rounded-full bg-white/90 border border-[#C0C0C0] shadow-md flex items-center justify-center text-2xl font-black text-[#0B1F3A] mb-2">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B1F3A]/75">
                        Official Pass Photo
                      </span>
                    </div>
                  )}

                  {/* Specular Diagonal Glass Gloss Over Photo */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none" />

                  {/* Minimal Transparent Verification Label */}
                  <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
                    <span
                      className="text-white text-[9.5px] font-bold font-mono tracking-wider uppercase select-none"
                      style={{
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.75)',
                      }}
                    >
                      VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Signature under photo frame */}
              <div className="mt-3 text-center">
                <div className="w-28 h-px bg-gradient-to-r from-transparent via-[#C0C0C0] to-transparent mx-auto mb-1" />
                <div
                  className="text-xl sm:text-2xl text-[#0B1F3A] font-bold tracking-wide text-center leading-none truncate px-1 py-1"
                  style={{
                    fontFamily: "'Caveat', cursive",
                  }}
                >
                  {studentName}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#0B1F3A]/60 text-center">
                  Authorized Student Signature
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. EVENT INFORMATION SECTION AT BOTTOM */}
        {/* ========================================================= */}
        <div className="relative z-10 mt-6 pt-5 border-t border-[#C0C0C0]/50">
          <div className={`grid ${isExport ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3 sm:gap-4`}>
            {/* Event Date */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-[#C0C0C0]/50 shadow-xs">
              <GlassIcon kind="calendar" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Event Date
                </span>
                <span className="block font-black text-[#0B1F3A] text-sm sm:text-base leading-tight truncate">
                  {safeEventDate}
                </span>
              </div>
            </div>

            {/* Event Venue */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-[#C0C0C0]/50 shadow-xs">
              <GlassIcon kind="venue" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Venue
                </span>
                <span className="block font-black text-[#0B1F3A] text-sm sm:text-base leading-tight truncate">
                  {safeVenue}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. OFFICIAL ENTRY PASS BADGE AT CENTER BOTTOM */}
        {/* ========================================================= */}
        <div className="relative z-10 mt-6 flex items-center justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C0C0C0] to-[#0B1F3A]" />
          <div className="mx-3 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-[#C0C0C0] shadow-[0_6px_20px_rgba(11,31,58,0.12)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
            <span className="text-[11px] sm:text-xs font-black tracking-[0.22em] uppercase text-[#0B1F3A]">
              OFFICIAL ENTRY PASS
            </span>
            <span className="text-[10px] font-bold text-[#C0C0C0]">·</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              RD27 BATCH
            </span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C0C0C0] to-[#0B1F3A]" />
        </div>
      </div>
    </div>
  );
};

