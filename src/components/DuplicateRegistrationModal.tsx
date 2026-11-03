import React from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { InvitationRecord } from '../types';

export type NormalizedStatus = 'approved' | 'pending' | 'rejected';

export function normalizeRegistrationStatus(status?: string | null): NormalizedStatus {
  if (!status) return 'pending';
  const clean = String(status).trim().toLowerCase();
  if (clean === 'approved' || clean === 'accept' || clean === 'accepted') return 'approved';
  if (clean === 'rejected' || clean === 'reject' || clean === 'declined') return 'rejected';
  return 'pending';
}

export interface DuplicateRegistrationModalProps {
  isOpen: boolean;
  record: InvitationRecord | null;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onReRegister: (record: InvitationRecord) => void;
}

export const DuplicateRegistrationModal: React.FC<DuplicateRegistrationModalProps> = ({
  isOpen,
  record,
  isLoading = false,
  error = null,
  onClose,
  onReRegister,
}) => {
  if (!isOpen) return null;

  const normalizedStatus: NormalizedStatus = normalizeRegistrationStatus(record?.status);

  // Status-dependent configuration matching reference specifications with frosted glass treatment
  const statusConfig = {
    approved: {
      statusBoxBg: 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.25)]',
      statusTextColor: 'text-emerald-700',
      statusKeyword: 'APPROVED.',
      iconBg: 'bg-emerald-500/15 text-emerald-600 border border-emerald-400/30',
      actionLabel: 'OK',
      actionBtnClass: 'glass-button-primary bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30',
    },
    pending: {
      statusBoxBg: 'bg-amber-500/10 border-amber-500/40 shadow-[0_8px_20px_-6px_rgba(245,158,11,0.25)]',
      statusTextColor: 'text-amber-800',
      statusKeyword: 'PENDING.',
      iconBg: 'bg-amber-500/15 text-amber-600 border border-amber-400/30',
      actionLabel: 'OK',
      actionBtnClass: 'glass-button-primary bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white',
    },
    rejected: {
      statusBoxBg: 'bg-rose-500/10 border-rose-500/45 shadow-[0_8px_20px_-6px_rgba(239,68,68,0.25)]',
      statusTextColor: 'text-rose-700',
      statusKeyword: 'REJECTED.',
      iconBg: 'bg-rose-500/15 text-rose-600 border border-rose-400/30',
      actionLabel: 'Re Register',
      actionBtnClass: 'glass-button-primary bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30',
    },
  }[normalizedStatus];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 
        Modal card container:
        - Frosted glass container with specular top bevel and rounded geometry
        - Refined glowing border that retains critical red awareness while blending seamlessly into the glass design system
      */}
      <div className="w-full max-w-[360px] sm:max-w-[390px] rounded-[30px] sm:rounded-[34px] p-6 sm:p-7 glass-modal border border-rose-400/50 shadow-[0_30px_80px_-15px_rgba(239,68,68,0.3),0_15px_40px_-10px_rgba(15,23,42,0.25),inset_0_1.5px_2px_rgba(255,255,255,1)] text-slate-900 space-y-5 relative transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-[#5B5FEF] animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Verifying registration record…</p>
          </div>
        ) : error || !record ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 mx-auto flex items-center justify-center border border-rose-300/40 shadow-xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Registration Check</h3>
              <p className="text-xs text-slate-600 mt-1">
                {error || 'Unable to retrieve registration details. Please try again.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl glass-button text-slate-800 font-bold text-sm transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Shield Status Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm backdrop-blur-md ${statusConfig.iconBg}`}
                >
                  {normalizedStatus === 'approved' && (
                    <svg
                      className="w-7 h-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  )}
                  {normalizedStatus === 'pending' && (
                    <svg
                      className="w-7 h-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <circle cx="12" cy="12" r="3.2" />
                      <polyline points="12 10.5 12 12 13.5 12" />
                    </svg>
                  )}
                  {normalizedStatus === 'rejected' && (
                    <svg
                      className="w-7 h-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
                      <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
                    </svg>
                  )}
                </div>

                {/* Title in Header */}
                <div className="min-w-0">
                  <h3
                    id="duplicate-modal-title"
                    className="font-display text-lg sm:text-xl font-black text-slate-900 leading-tight tracking-tight"
                  >
                    Duplicate<br />Registration
                  </h3>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors -mr-1 -mt-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Message Box with Glass Layering */}
            <div
              className={`w-full py-3.5 sm:py-4 px-3 rounded-2xl border backdrop-blur-md text-center ${statusConfig.statusBoxBg}`}
            >
              <p
                className={`text-base sm:text-lg font-black leading-snug tracking-tight ${statusConfig.statusTextColor}`}
              >
                Your Registration was<br />
                <span>{statusConfig.statusKeyword}</span>
              </p>
            </div>

            {/* Dynamically Loaded Student Details on Frosted Glass Backing */}
            <div className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-2xs space-y-1.5 text-sm sm:text-[14.5px] text-slate-800">
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-slate-900">Name</span>
                <span className="font-bold text-slate-900">:</span>
                <span className="font-semibold text-slate-700 truncate">{record.full_name || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-slate-900">ID</span>
                <span className="font-bold text-slate-900">:</span>
                <span className="font-semibold text-slate-700 font-mono">{record.student_id || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-slate-900">Roll</span>
                <span className="font-bold text-slate-900">:</span>
                <span className="font-semibold text-slate-700 font-mono">{record.class_roll || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-slate-900">Group</span>
                <span className="font-bold text-slate-900">:</span>
                <span className="font-semibold text-slate-700">{record.academic_group || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-slate-900">Section</span>
                <span className="font-bold text-slate-900">:</span>
                <span className="font-semibold text-slate-700">{record.academic_section || 'N/A'}</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-1">
              {normalizedStatus === 'rejected' ? (
                <button
                  type="button"
                  onClick={() => onReRegister(record)}
                  className={`w-full py-3.5 sm:py-4 rounded-2xl font-bold text-base shadow-md transition-all active:scale-[0.99] cursor-pointer ${statusConfig.actionBtnClass}`}
                >
                  {statusConfig.actionLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full py-3.5 sm:py-4 rounded-2xl font-bold text-base shadow-md transition-all active:scale-[0.99] cursor-pointer ${statusConfig.actionBtnClass}`}
                >
                  {statusConfig.actionLabel}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
