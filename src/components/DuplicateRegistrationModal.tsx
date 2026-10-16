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

  // Status-dependent configuration matching reference specifications
  const statusConfig = {
    approved: {
      statusBoxBg: 'bg-[#EAFBF3]',
      statusTextColor: 'text-[#059669]',
      statusKeyword: 'APPROVED.',
      iconBg: 'bg-[#EAFBF3] text-[#10B981] border border-emerald-100',
      actionLabel: 'OK',
      actionBtnClass: 'bg-[#00875A] hover:bg-[#00734D] text-white',
    },
    pending: {
      statusBoxBg: 'bg-[#FEF8E7]',
      statusTextColor: 'text-[#B45309]',
      statusKeyword: 'PENDING.',
      iconBg: 'bg-[#FEF8E7] text-[#D97706] border border-amber-100',
      actionLabel: 'OK',
      actionBtnClass: 'bg-[#00875A] hover:bg-[#00734D] text-white',
    },
    rejected: {
      statusBoxBg: 'bg-[#FEECEC]',
      statusTextColor: 'text-[#DC2626]',
      statusKeyword: 'REJECTED.',
      iconBg: 'bg-[#FEECEC] text-[#EF4444] border border-rose-100',
      actionLabel: 'Re Register',
      actionBtnClass: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white',
    },
  }[normalizedStatus];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 
        Modal card container:
        - White modal background with rounded corners
        - Red outer border and red glow around the modal for all three registration statuses
      */}
      <div className="w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.55),0_20px_50px_rgba(0,0,0,0.3)] text-slate-900 space-y-5 relative transition-all">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Verifying registration record…</p>
          </div>
        ) : error || !record ? (
          <div className="py-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
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
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all"
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
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${statusConfig.iconBg}`}
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

                {/* Title ONLY in this header - Registration Number completely removed */}
                <div className="min-w-0">
                  <h3
                    id="duplicate-modal-title"
                    className="text-lg sm:text-xl font-black text-[#0B1F3A] leading-tight tracking-tight"
                  >
                    Duplicate<br />Registration
                  </h3>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors -mr-1 -mt-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 
              Status Message Box:
              - Light status-dependent background
              - Status-dependent text color
              - Red border matching reference image
            */}
            <div
              className={`w-full py-3.5 sm:py-4 px-3 rounded-2xl border-2 border-red-500 text-center ${statusConfig.statusBoxBg}`}
            >
              <p
                className={`text-base sm:text-lg font-black leading-snug tracking-tight ${statusConfig.statusTextColor}`}
              >
                Your Registration was<br />
                <span>{statusConfig.statusKeyword}</span>
              </p>
            </div>

            {/* 
              Dynamically Loaded Student Details:
              Five fields: Name, ID, Roll, Group, Section
              Fetched directly from the existing database record
            */}
            <div className="space-y-1.5 text-sm sm:text-[15px] text-slate-800 py-1">
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-[#0B1F3A]">Name</span>
                <span className="font-bold text-[#0B1F3A]">:</span>
                <span className="font-medium text-slate-700 truncate">{record.full_name || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-[#0B1F3A]">ID</span>
                <span className="font-bold text-[#0B1F3A]">:</span>
                <span className="font-medium text-slate-700">{record.student_id || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-[#0B1F3A]">Roll</span>
                <span className="font-bold text-[#0B1F3A]">:</span>
                <span className="font-medium text-slate-700">{record.class_roll || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-[#0B1F3A]">Group</span>
                <span className="font-bold text-[#0B1F3A]">:</span>
                <span className="font-medium text-slate-700">{record.academic_group || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-[68px_16px_1fr] items-center">
                <span className="font-bold text-[#0B1F3A]">Section</span>
                <span className="font-bold text-[#0B1F3A]">:</span>
                <span className="font-medium text-slate-700">{record.academic_section || 'N/A'}</span>
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
