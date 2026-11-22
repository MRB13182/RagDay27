import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PopupNoticeItem } from '../lib/superAdminConfig';

interface ImportantNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: PopupNoticeItem[];
  intervalSeconds?: number;
  title?: string;
  message?: string;
  buttonText?: string;
}

export const ImportantNoticeModal: React.FC<ImportantNoticeModalProps> = ({
  isOpen,
  onClose,
  items,
  intervalSeconds = 3,
  title = 'Important Notice',
  message = '',
  buttonText = 'I Understand',
}) => {
  const activeItems = useMemo<PopupNoticeItem[]>(() => {
    if (Array.isArray(items)) {
      return items.filter(
        item => item && item.enabled !== false && (item.title.trim().length > 0 || item.message.trim().length > 0)
      );
    }
    const trimmedMsg = message.trim();
    if (!trimmedMsg) return [];
    return [{ id: 'single-notice', title: title || 'Important Notice', message: trimmedMsg, enabled: true }];
  }, [items, message, title]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const safeIntervalMs = Math.max(1, Math.min(60, Math.round(intervalSeconds || 3))) * 1000;
  const hasMultiple = activeItems.length > 1;
  const safeIndex = activeItems.length > 0 ? currentIndex % activeItems.length : 0;

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen, activeItems.length]);

  useEffect(() => {
    if (!isOpen || !hasMultiple || isPaused) return;
    const timer = window.setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeItems.length);
    }, safeIntervalMs);
    return () => window.clearInterval(timer);
  }, [isOpen, hasMultiple, isPaused, activeItems.length, safeIntervalMs]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (hasMultiple && e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev + 1) % activeItems.length);
      } else if (hasMultiple && e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev - 1 + activeItems.length) % activeItems.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasMultiple, activeItems.length, onClose]);

  if (!isOpen || activeItems.length === 0) return null;

  const currentItem = activeItems[safeIndex];
  const displayTitle = currentItem.title.trim() || 'Important Notice';
  const trimmed = currentItem.message.trim();
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
      <div
        className="w-[calc(100%-1rem)] max-w-[460px] max-h-[85vh] flex flex-col glass-modal rounded-2xl p-6 sm:p-7 relative transition-transform duration-200 animate-scaleUp"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-center justify-between pb-3.5 shrink-0 border-b border-[#C9D0D9]/15 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#8BEAFF]/15 flex items-center justify-center shrink-0 border border-[#8BEAFF]/35 text-[#8BEAFF]">
              <Bell className="w-5 h-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#8BEAFF] block">
                  Announcement
                </span>
                {hasMultiple && (
                  <span className="text-[10px] font-mono font-bold text-[#C9D0D9]/80 px-1.5 py-0.5 rounded bg-white/5 border border-[#C9D0D9]/20 tabular-nums">
                    {safeIndex + 1} / {activeItems.length}
                  </span>
                )}
              </div>
              <h3
                key={`title-${currentItem.id}`}
                id="important-notice-title"
                className="text-lg sm:text-xl font-display font-extrabold text-[#F5F7FA] tracking-tight leading-tight truncate animate-fadeIn"
              >
                {displayTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 text-[#C9D0D9]/70 hover:text-[#F5F7FA] hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close notice"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 custom-notice-scrollbar py-4">
          <div
            key={`body-${currentItem.id}`}
            className={`text-[#C9D0D9] leading-relaxed break-words whitespace-pre-line animate-fadeIn ${
              isLong
                ? 'text-[13.5px] leading-[1.68]'
                : isMedium
                ? 'text-[14.5px] leading-relaxed'
                : 'text-[15.5px] leading-relaxed'
            }`}
          >
            {trimmed || displayTitle}
          </div>
        </div>

        {hasMultiple && (
          <div className="shrink-0 flex items-center justify-between gap-3 pt-3 pb-3 border-t border-[#C9D0D9]/10">
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => (prev - 1 + activeItems.length) % activeItems.length)}
              className="p-1.5 rounded-lg border border-[#C9D0D9]/20 text-[#C9D0D9] hover:text-[#8BEAFF] hover:border-[#8BEAFF]/40 transition-colors cursor-pointer"
              aria-label="Previous notice"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {activeItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`View notice ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === safeIndex
                      ? 'w-6 bg-[#8BEAFF] shadow-[0_0_8px_rgba(139,234,255,0.65)]'
                      : 'w-2 bg-[#C9D0D9]/30 hover:bg-[#C9D0D9]/60'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentIndex(prev => (prev + 1) % activeItems.length)}
              className="p-1.5 rounded-lg border border-[#C9D0D9]/20 text-[#C9D0D9] hover:text-[#8BEAFF] hover:border-[#8BEAFF]/40 transition-colors cursor-pointer"
              aria-label="Next notice"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="shrink-0 pt-3 border-t border-[#C9D0D9]/12 mt-auto">
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
