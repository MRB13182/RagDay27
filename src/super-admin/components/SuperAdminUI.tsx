import React from 'react';
import { AlertCircle, CheckCircle2, ArrowUp, ArrowDown, X, AlertTriangle } from 'lucide-react';
import type { ConfirmModalState, SuperAdminFeedback } from '../types';

export const inputClass =
  'w-full rounded-xl border border-[#C9D0D9]/18 bg-[#090D16] px-3.5 py-2.5 text-sm text-[#F5F7FA] placeholder-[#626B79] outline-none transition focus:border-[#8BEAFF] focus:ring-2 focus:ring-[#8BEAFF]/15';

export const textareaClass = `${inputClass} resize-y leading-relaxed`;

export const panelClass =
  'rounded-2xl border border-[#C9D0D9]/14 bg-[#0D121D] p-5 sm:p-6';

export const SectionHeader: React.FC<{
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <header className="flex flex-col gap-4 border-b border-[#C9D0D9]/14 pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#F5F7FA]">
        {title}
      </h2>
      <p className="mt-1 text-xs sm:text-sm text-[#94A0B2] leading-relaxed max-w-2xl">
        {subtitle}
      </p>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </header>
);

export const FeedbackBanner: React.FC<{
  feedback: SuperAdminFeedback | null;
  onDismiss: () => void;
}> = ({ feedback, onDismiss }) => {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium ${
        isSuccess
          ? 'border-emerald-400/35 bg-emerald-950/50 text-emerald-100'
          : 'border-rose-400/35 bg-rose-950/55 text-rose-100'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
        )}
        <span className="break-words">{feedback.text}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="rounded-lg p-1.5 text-[#C9D0D9]/70 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToggleButton: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  enabledLabel?: string;
  disabledLabel?: string;
  ariaLabel?: string;
}> = ({
  enabled,
  onToggle,
  enabledLabel = 'Enabled',
  disabledLabel = 'Disabled',
  ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={ariaLabel}
    onClick={onToggle}
    className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      enabled
        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
        : 'border-[#C9D0D9]/20 bg-[#141B29] text-[#94A0B2] hover:bg-[#1A2334] hover:text-[#F5F7FA]'
    }`}
  >
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        enabled ? 'bg-emerald-400' : 'bg-[#626B79]'
      }`}
    />
    <span>{enabled ? enabledLabel : disabledLabel}</span>
  </button>
);

export const OrderControls: React.FC<{
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
}> = ({ index, total, onMoveUp, onMoveDown, disabled }) => (
  <div className="inline-flex items-center gap-1 shrink-0">
    <button
      type="button"
      onClick={onMoveUp}
      disabled={disabled || index === 0}
      aria-label="Move up"
      title="Move up"
      className="rounded-lg border border-[#C9D0D9]/18 bg-[#121826] p-2 text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-[#8BEAFF] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      <ArrowUp className="h-3.5 w-3.5" />
    </button>
    <button
      type="button"
      onClick={onMoveDown}
      disabled={disabled || index >= total - 1}
      aria-label="Move down"
      title="Move down"
      className="rounded-lg border border-[#C9D0D9]/18 bg-[#121826] p-2 text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-[#8BEAFF] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      <ArrowDown className="h-3.5 w-3.5" />
    </button>
  </div>
);

export const ConfirmActionModal: React.FC<{
  modal: ConfirmModalState | null;
  busy?: boolean;
  onCancel: () => void;
}> = ({ modal, busy, onCancel }) => {
  if (!modal) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sa-confirm-title"
      className="fixed inset-0 z-[400] flex items-center justify-center bg-[#06080D]/80 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#C9D0D9]/22 bg-[#0D1320] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.75)]">
        <div className="flex items-start gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
              modal.danger !== false
                ? 'border-rose-400/35 bg-rose-500/15 text-rose-300'
                : 'border-[#8BEAFF]/35 bg-[#8BEAFF]/15 text-[#8BEAFF]'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="sa-confirm-title" className="text-base font-bold text-[#F5F7FA]">
              {modal.title}
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[#94A0B2] leading-relaxed">
              {modal.description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-[#C9D0D9]/12 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-[#C9D0D9]/20 bg-[#141B29] px-4 py-2 text-xs font-semibold text-[#C9D0D9] hover:bg-[#1B2436] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void modal.onConfirm()}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 ${
              modal.danger !== false
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-[#8BEAFF] text-[#08090D] hover:brightness-110'
            }`}
          >
            {busy ? 'Processing…' : modal.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
