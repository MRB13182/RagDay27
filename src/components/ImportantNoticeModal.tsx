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

  // Dynamic typography sizing based on content length
  const isLong = charCount > 320;
  const isMedium = charCount > 130 && charCount <= 320;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-[#0B091A]/55 backdrop-blur-md animate-fadeIn transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="important-notice-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Frosted Glass Card with Large Rounded Corners (26px) */}
      <div
        className="w-[calc(100%-1rem)] max-w-[420px] sm:max-w-[450px] max-h-[85vh] sm:max-h-[480px] flex flex-col bg-white/90 backdrop-blur-2xl rounded-[26px] sm:rounded-[28px] p-6 sm:p-7 shadow-[0_30px_70px_-12px_rgba(20,15,50,0.35),inset_0_1.5px_2px_rgba(255,255,255,1)] border border-white/90 relative transition-transform duration-200"
      >
        {/* Fixed Header: Bell Icon, Italic Title, and Close Button */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 shrink-0 relative">
          <div className="flex items-center gap-3 sm:gap-3.5">
            {/* Soft Violet Squircle Icon Badge */}
            <div className="w-12 h-12 rounded-[18px] bg-[#EEEDFD] flex items-center justify-center shrink-0 border border-violet-100/70 shadow-xs">
              <Bell className="w-[22px] h-[22px] text-[#4F46E5] stroke-[2.2]" />
            </div>

            {/* Title: Medium Weight (500), Italic, Dark Navy/Violet, Not ALL CAPS */}
            <h3
              id="important-notice-title"
              className="text-xl sm:text-[22px] font-medium italic text-[#1C194D] tracking-tight select-none leading-tight"
            >
              {title}
            </h3>
          </div>

          {/* Minimal Close Icon Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-full transition-colors cursor-pointer"
            aria-label="Close notice"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        {/* Content Area: Dynamic, Auto-wrap, Only Scrollable Section */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 custom-notice-scrollbar py-2">
          <div
            className={`text-slate-700 leading-relaxed break-words whitespace-pre-line ${
              isLong
                ? 'text-[13.5px] leading-[1.65]'
                : isMedium
                ? 'text-[14.5px] leading-relaxed'
                : 'text-[15.5px] leading-relaxed'
            }`}
          >
            {trimmed}
          </div>
        </div>

        {/* Fixed Full-Width Button: Violet Gradient, Soft Glow, Sticky Bottom */}
        <div className="shrink-0 pt-4 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#5B48F6] to-[#6366F1] text-white font-semibold text-sm sm:text-[15px] shadow-[0_8px_25px_-4px_rgba(79,70,229,0.5)] hover:shadow-[0_12px_30px_-4px_rgba(79,70,229,0.65)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};
