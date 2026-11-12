import React, { useState } from 'react';
import { InvitationRecord, WebsiteSettings, PdfSettings } from '../types';
import { resolveStudentPhotoUrl } from '../services/storage';
import masterPassTemplate from '../assets/images/nic_rag_day_master_pass.png';
import { Check } from 'lucide-react';

interface InvitationCardProps {
  record: InvitationRecord;
  websiteSettings: WebsiteSettings;
  pdfSettings?: PdfSettings;
  collegeLogo?: string;
  isExport?: boolean;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  record,
  websiteSettings,
  isExport = false,
}) => {
  const [photoError, setPhotoError] = useState(false);
  const resolvedPhotoUrl = resolveStudentPhotoUrl(record.student_photo);

  const studentName = record.full_name || '';
  const roll = record.class_roll || '—';
  const studentId = record.student_id || record.id || record.class_roll || '—';
  const section = record.academic_section || '—';
  const regNo = record.registration_no || 'RD27-001';

  // Extract serial for "RD27 - [serial]"
  const serialNumber = regNo.replace(/^RD27[-_\s]*/i, '') || regNo;

  // Normalized group display: Science, Business Studies, or Humanities
  const rawGroup = (record.academic_group || '').trim();
  let displayGroup = rawGroup || '—';
  const groupLower = rawGroup.toLowerCase();
  if (groupLower.includes('sci')) {
    displayGroup = 'Science';
  } else if (groupLower.includes('bus') || groupLower.includes('com')) {
    displayGroup = 'Business Studies';
  } else if (groupLower.includes('hum') || groupLower.includes('art')) {
    displayGroup = 'Humanities';
  }

  const isApproved = record.status === 'approved';

  return (
    <div
      className={
        isExport
          ? 'w-[1920px]'
          : 'w-full max-w-5xl mx-auto overflow-x-auto pb-2 select-none'
      }
    >
      {/* 
        MASTER REGISTRATION PASS CONTAINER
        Aspect Ratio: 1920 x 819 (2.344:1)
        Pixel-perfect replication of NIC Rag Day 2027 Registration Token
      */}
      <div
        id={isExport ? 'invitation-card-export-area' : 'invitation-card-render-area'}
        className="relative shadow-2xl overflow-hidden mx-auto"
        style={{
          width: isExport ? '1920px' : '100%',
          minWidth: isExport ? '1920px' : '720px',
          maxWidth: isExport ? '1920px' : undefined,
          aspectRatio: '1920 / 819',
          containerType: 'inline-size',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#0A2568',
        }}
      >
        {/* 1. MASTER HIGH-RESOLUTION TEMPLATE BACKGROUND */}
        <img
          src={masterPassTemplate}
          alt="National Ideal College Rag Day 2027 Registration Token"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
        />

        {/* Corrected college identity sub-blocks for Left and Right sections */}
        {/* Left Section College Sub-Block: KHILGAON, DHAKA / ESTD. 2001 */}
        <div
          className="absolute z-[2] flex flex-col items-start justify-center text-[#0A2568] pointer-events-none select-none pl-[0.1%]"
          style={{
            left: '8.33%',
            top: '18.1%',
            width: '9.3%',
            height: '6.5%',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <span className="font-bold tracking-[0.08em] uppercase text-[#0A2568] leading-tight" style={{ fontSize: 'clamp(4.5px, 0.62cqw, 12px)' }}>
            KHILGAON, DHAKA
          </span>
          <span className="font-bold tracking-[0.14em] uppercase text-[#0A2568] leading-tight mt-[2px]" style={{ fontSize: 'clamp(4.5px, 0.62cqw, 12px)' }}>
            ESTD. 2001
          </span>
        </div>

        {/* Right Section College Sub-Block: KHILGAON, DHAKA / ESTD. 2001 */}
        <div
          className="absolute z-[2] flex flex-col items-start justify-center text-[#0A2568] pointer-events-none select-none pl-[0.1%]"
          style={{
            left: '39.75%',
            top: '22.8%',
            width: '9.3%',
            height: '6.5%',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <span className="font-bold tracking-[0.08em] uppercase text-[#0A2568] leading-tight" style={{ fontSize: 'clamp(4.5px, 0.62cqw, 12px)' }}>
            KHILGAON, DHAKA
          </span>
          <span className="font-bold tracking-[0.14em] uppercase text-[#0A2568] leading-tight mt-[2px]" style={{ fontSize: 'clamp(4.5px, 0.62cqw, 12px)' }}>
            ESTD. 2001
          </span>
        </div>

        {/* 2. DYNAMIC OVERLAYS LAYER (RELATIVE Z-10) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* ======================================================= */}
          {/* LEFT SECTION OVERLAYS: PHOTO BOX & SIGNATURE NAME       */}
          {/* ======================================================= */}

          {/* Photo Box Viewport */}
          {/* Exact pixel bounds: x:140-396 (13.33%), y:328-591 (32.11%) */}
          <div
            className="absolute overflow-hidden flex items-center justify-center rounded-[14px]"
            style={{
              left: '7.29%',
              top: '40.05%',
              width: '13.33%',
              height: '32.11%',
            }}
          >
            {resolvedPhotoUrl && !photoError && (
              <img
                src={resolvedPhotoUrl}
                alt={studentName}
                crossOrigin="anonymous"
                onError={() => setPhotoError(true)}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Participant's Name (Signature Style) on the horizontal signature line */}
          {record.full_name && (
            <div
              className="absolute flex items-center justify-center px-2 pointer-events-none"
              style={{
                left: '4.8%',
                top: '74.5%',
                width: '25.5%',
                height: '5.2%',
              }}
            >
              <span
                className="text-[#0A2568] font-bold truncate leading-none text-center"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: 'clamp(14px, 1.7cqw, 32px)',
                }}
              >
                {record.full_name}
              </span>
            </div>
          )}

          {/* ======================================================= */}
          {/* RIGHT SECTION: REGISTRATION NO. IN ORIGINAL ROUNDED BOX */}
          {/* ======================================================= */}

          {/* Registration No. inside the original rounded rectangular box */}
          <div
            className="absolute flex items-center justify-start pl-[2.8%] pr-[2%]"
            style={{
              left: '73.85%',
              top: '7.32%',
              width: '23.54%',
              height: '9.89%',
            }}
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="font-extrabold text-[#0A2568] uppercase tracking-wide whitespace-nowrap"
                style={{
                  fontSize: 'clamp(11px, 1.3cqw, 25px)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Registration No. :
              </span>
              <span
                className="font-mono font-black text-[#0A2568] tracking-wider truncate"
                style={{
                  fontSize: 'clamp(12px, 1.45cqw, 28px)',
                }}
              >
                {record.registration_no || regNo}
              </span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 5 DATA FIELD BOXES (Name, Roll, ID, Section, Group)     */}
          {/* Left: 41.41% (x:795), Width: 27.86% (w:535)             */}
          {/* ======================================================= */}

          {/* Row 1: Name */}
          <div
            className="absolute flex items-center pl-[2%] pr-[3%]"
            style={{
              left: '41.41%',
              top: '42.12%',
              width: '27.86%',
              height: '5.25%',
            }}
          >
            <span
              className="font-bold text-[#0A2568] truncate leading-none"
              style={{
                fontSize: 'clamp(11px, 1.25cqw, 24px)',
              }}
            >
              {studentName}
            </span>
          </div>

          {/* Row 2: Roll */}
          <div
            className="absolute flex items-center pl-[2%] pr-[3%]"
            style={{
              left: '41.41%',
              top: '49.82%',
              width: '27.86%',
              height: '5.25%',
            }}
          >
            <span
              className="font-bold font-mono text-[#0A2568] truncate leading-none"
              style={{
                fontSize: 'clamp(11px, 1.25cqw, 24px)',
              }}
            >
              {roll}
            </span>
          </div>

          {/* Row 3: ID */}
          <div
            className="absolute flex items-center pl-[2%] pr-[3%]"
            style={{
              left: '41.41%',
              top: '57.99%',
              width: '27.86%',
              height: '5.13%',
            }}
          >
            <span
              className="font-bold font-mono text-[#0A2568] truncate leading-none"
              style={{
                fontSize: 'clamp(11px, 1.25cqw, 24px)',
              }}
            >
              {studentId}
            </span>
          </div>

          {/* Row 4: Section */}
          <div
            className="absolute flex items-center pl-[2%] pr-[3%]"
            style={{
              left: '41.41%',
              top: '65.81%',
              width: '27.86%',
              height: '4.88%',
            }}
          >
            <span
              className="font-bold text-[#0A2568] truncate leading-none"
              style={{
                fontSize: 'clamp(11px, 1.25cqw, 24px)',
              }}
            >
              {section}
            </span>
          </div>

          {/* Row 5: Group */}
          <div
            className="absolute flex items-center pl-[2%] pr-[3%]"
            style={{
              left: '41.41%',
              top: '73.99%',
              width: '27.86%',
              height: '4.88%',
            }}
          >
            <span
              className="font-bold text-[#0A2568] truncate leading-none"
              style={{
                fontSize: 'clamp(11px, 1.25cqw, 24px)',
              }}
            >
              {displayGroup}
            </span>
          </div>

          {/* ALL OK Checkbox (checked when application is approved) */}
          {/* Exact pixel bounds: x:1768-1822, y:540-594 */}
          {isApproved && (
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                left: '92.15%',
                top: '66.18%',
                width: '2.7%',
                height: '6.3%',
              }}
            >
              <Check className="w-full h-full text-[#0A2568] stroke-[3] translate-x-[2%] translate-y-[-1%]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
