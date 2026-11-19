import React, { useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface ImportantNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonText?: string;
}

export const ImportantNoticeModal: React.FC<ImportantNoticeModalProps> = ({
  isOpen,
  onClose,
  title = 'Important Notice',
  message,
  buttonText = 'I Understand',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = message ? message.trim() : '';
  const charCount = trimmed.length;
  const isLong = charCount > 320;
  const isMedium = charCount > 130 && charCount <= 320;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-[#08090D]/80 backdrop-blur-md animate-fadeIn transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="important-notice-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[calc(100%-1rem)] max-w-[440px] max-h-[85vh] flex flex-col glass-modal rounded-2xl p-6 sm:p-7 relative transition-transform duration-200 animate-scaleUp">
        <div className="flex items-center justify-between pb-3.5 shrink-0 border-b border-[#C9D0D9]/15">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#8BEAFF]/15 flex items-center justify-center shrink-0 border border-[#8BEAFF]/35 text-[#8BEAFF]">
              <Bell className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#8BEAFF] block">
                Announcement
              </span>
              <h3
                id="important-notice-title"
                className="text-lg sm:text-xl font-display font-extrabold text-[#F5F7FA] tracking-tight leading-tight"
              >
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 text-[#C9D0D9]/70 hover:text-[#F5F7FA] hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Close notice"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 custom-notice-scrollbar py-4">
          <div
            className={`text-[#C9D0D9] leading-relaxed break-words whitespace-pre-line ${
              isLong
                ? 'text-[13.5px] leading-[1.68]'
                : isMedium
                ? 'text-[14.5px] leading-relaxed'
                : 'text-[15.5px] leading-relaxed'
            }`}
          >
            {trimmed}
          </div>
        </div>

        <div className="shrink-0 pt-4 border-t border-[#C9D0D9]/12 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-xl glass-button-primary font-extrabold text-xs sm:text-sm uppercase tracking-[0.12em] cursor-pointer select-none"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};
