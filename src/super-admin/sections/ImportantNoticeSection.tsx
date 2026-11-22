import React, { useEffect, useState } from 'react';
import { Bell, Eye, EyeOff, MessageSquareText, Plus, Radio, Save, Trash2 } from 'lucide-react';
import { saveEditableSuperAdminBatch, saveEditableSuperAdminText } from '../../lib/superAdminTextSettings';
import {
  parseHeaderNoticeConfig,
  parsePopupNoticeConfig,
  type HeaderNoticeConfig,
  type PopupNoticeConfig,
} from '../../lib/superAdminConfig';
import type { ConfirmModalState, SuperAdminFeedback } from '../types';
import {
  OrderControls,
  SectionHeader,
  ToggleButton,
  inputClass,
  panelClass,
  textareaClass,
} from '../components/SuperAdminUI';

const PATH_HEADER_NOTICE = '05. important-notice/Text/Notice Board.txt';
const PATH_POPUP_NOTICE = '05. important-notice/Text/Popup Notice.txt';
const PATH_NOTICE_ENABLE = '05. important-notice/Text/Enable Disable.txt';

interface ImportantNoticeSectionProps {
  syncVersion: number;
  onFeedback: (feedback: SuperAdminFeedback) => void;
  onRequestConfirm: (modal: ConfirmModalState) => void;
}

export const ImportantNoticeSection: React.FC<ImportantNoticeSectionProps> = ({
  syncVersion,
  onFeedback,
  onRequestConfirm,
}) => {
  // Independent Section A: Header Notice Ticker
  const [headerConfig, setHeaderConfig] = useState<HeaderNoticeConfig>({
    enabled: true,
    notices: [],
  });
  const [newHeaderText, setNewHeaderText] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  // Independent Section B: Popup Notice Slideshow
  const [popupConfig, setPopupConfig] = useState<PopupNoticeConfig>({
    enabled: false,
    intervalSeconds: 4,
    items: [],
  });
  const [savingPopup, setSavingPopup] = useState(false);

  useEffect(() => {
    setHeaderConfig(parseHeaderNoticeConfig());
    setPopupConfig(parsePopupNoticeConfig());
  }, [syncVersion]);

  // --------------------------------------------------------------------------
  // Section A Handlers — Header Notice
  // --------------------------------------------------------------------------
  const handleAddHeaderNotice = () => {
    const clean = newHeaderText.trim();
    if (!clean) {
      onFeedback({ type: 'error', text: 'Enter a notice text before adding to Header Notices.' });
      return;
    }
    setHeaderConfig(prev => ({
      ...prev,
      notices: [
        ...prev.notices,
        { id: `header-${Date.now()}`, text: clean, enabled: true },
      ],
    }));
    setNewHeaderText('');
  };

  const handleMoveHeaderNotice = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= headerConfig.notices.length) return;
    setHeaderConfig(prev => {
      const nextList = [...prev.notices];
      [nextList[index], nextList[nextIdx]] = [nextList[nextIdx], nextList[index]];
      return { ...prev, notices: nextList };
    });
  };

  const handleDeleteHeaderNotice = (id: string, text: string) => {
    onRequestConfirm({
      title: 'Delete Header Notice',
      description: `Remove "${text.slice(0, 70)}${text.length > 70 ? '…' : ''}" from the header notice list?`,
      confirmLabel: 'Remove Notice',
      onConfirm: () => {
        setHeaderConfig(prev => ({
          ...prev,
          notices: prev.notices.filter(item => item.id !== id),
        }));
      },
    });
  };

  const buildCleanedHeaderConfig = (source: HeaderNoticeConfig): HeaderNoticeConfig => ({
    enabled: Boolean(source.enabled),
    notices: source.notices
      .map((item, idx) => ({
        id: item.id || `header-${idx + 1}`,
        text: item.text.trim(),
        enabled: item.enabled !== false,
      }))
      .filter(item => item.text.length > 0),
  });

  const persistHeaderNotices = async (
    nextConfig: HeaderNoticeConfig,
    successMessage = 'Header notices saved independently to database.'
  ) => {
    const cleaned = buildCleanedHeaderConfig(nextConfig);
    const previous = headerConfig;
    setHeaderConfig(cleaned);
    setSavingHeader(true);
    try {
      await saveEditableSuperAdminText(PATH_HEADER_NOTICE, JSON.stringify(cleaned));
      onFeedback({ type: 'success', text: successMessage });
    } catch (err) {
      setHeaderConfig(previous);
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save Header Notices.',
      });
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSaveHeaderNotices = () =>
    persistHeaderNotices(headerConfig, 'Header notices saved independently to database.');

  const handleToggleHeaderEnabled = () => {
    const nextEnabled = !headerConfig.enabled;
    void persistHeaderNotices(
      { ...headerConfig, enabled: nextEnabled },
      nextEnabled
        ? 'Notice Board enabled and synced to database.'
        : 'Notice Board disabled and hidden on public website.'
    );
  };

  // --------------------------------------------------------------------------
  // Section B Handlers — Popup Notice
  // --------------------------------------------------------------------------
  const handleAddPopupSlide = () => {
    setPopupConfig(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `popup-${Date.now()}`,
          title: 'Important Announcement',
          message: '',
          enabled: true,
        },
      ],
    }));
  };

  const handleMovePopupSlide = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= popupConfig.items.length) return;
    setPopupConfig(prev => {
      const nextList = [...prev.items];
      [nextList[index], nextList[nextIdx]] = [nextList[nextIdx], nextList[index]];
      return { ...prev, items: nextList };
    });
  };

  const handleDeletePopupSlide = (id: string, title: string) => {
    onRequestConfirm({
      title: 'Delete Popup Notice Slide',
      description: `Remove popup slide "${title || 'Untitled Notice'}"?`,
      confirmLabel: 'Remove Slide',
      onConfirm: () => {
        setPopupConfig(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== id),
        }));
      },
    });
  };

  const buildCleanedPopupConfig = (source: PopupNoticeConfig): PopupNoticeConfig => ({
    enabled: Boolean(source.enabled),
    intervalSeconds: Math.min(60, Math.max(1, Math.round(Number(source.intervalSeconds) || 4))),
    items: source.items
      .map((item, idx) => ({
        id: item.id || `popup-${idx + 1}`,
        title: item.title.trim(),
        message: item.message.trim(),
        enabled: item.enabled !== false,
      }))
      .filter(item => item.title.length > 0 || item.message.length > 0),
  });

  const persistPopupNotices = async (
    nextConfig: PopupNoticeConfig,
    successMessage = 'Popup notice slideshow saved independently to database.'
  ) => {
    const cleaned = buildCleanedPopupConfig(nextConfig);
    const previous = popupConfig;
    setPopupConfig(cleaned);
    setSavingPopup(true);
    try {
      await saveEditableSuperAdminBatch([
        { path: PATH_POPUP_NOTICE, content: JSON.stringify(cleaned) },
        { path: PATH_NOTICE_ENABLE, content: cleaned.enabled ? 'enable' : 'disable' },
      ]);
      onFeedback({ type: 'success', text: successMessage });
    } catch (err) {
      setPopupConfig(previous);
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save Popup Notices.',
      });
    } finally {
      setSavingPopup(false);
    }
  };

  const handleSavePopupNotices = () =>
    persistPopupNotices(popupConfig, 'Popup notice slideshow saved independently to database.');

  const handleTogglePopupEnabled = () => {
    const nextEnabled = !popupConfig.enabled;
    void persistPopupNotices(
      { ...popupConfig, enabled: nextEnabled },
      nextEnabled
        ? 'Popup Notice enabled and synced to database.'
        : 'Popup Notice disabled and hidden on public website.'
    );
  };

  const activeHeaderTicker = headerConfig.notices.filter(
    n => n.enabled !== false && n.text.trim().length > 0
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Important Notice"
        subtitle="Header Notice and Popup Notice are managed independently with separate visibility, ordering, and save actions."
      />

      {/* ==================================================================== */}
      {/* SECTION A: HEADER NOTICE (TOP SCROLLING TICKER)                      */}
      {/* ==================================================================== */}
      <section aria-labelledby="sa-header-notice-heading" className={`${panelClass} space-y-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9D0D9]/12 pb-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#8BEAFF]/30 bg-[#8BEAFF]/10 text-[#8BEAFF]">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 id="sa-header-notice-heading" className="text-base font-bold text-[#F5F7FA]">
                A. Header Notice (Top Ticker Bar)
              </h3>
              <p className="text-xs text-[#8993A1]">
                Controls only the scrolling announcement strip beneath the public top navbar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleButton
              enabled={headerConfig.enabled}
              disabled={savingHeader}
              onToggle={handleToggleHeaderEnabled}
              enabledLabel="Header Bar Enabled"
              disabledLabel="Header Bar Disabled"
              ariaLabel="Toggle Header Notice Bar"
            />
            <button
              type="button"
              onClick={() => void handleSaveHeaderNotices()}
              disabled={savingHeader}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8BEAFF] px-4 py-2 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingHeader ? 'Saving…' : 'Save Header Notices'}</span>
            </button>
          </div>
        </div>

        {/* Live Ticker Preview */}
        <div className="rounded-xl border border-[#C9D0D9]/14 bg-[#080B12] px-4 py-2.5 flex items-center gap-3 overflow-hidden">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#8BEAFF] shrink-0">
            <Bell className="h-3.5 w-3.5" />
            Preview
          </span>
          <span className="h-4 w-px bg-[#C9D0D9]/18 shrink-0" />
          <div className="min-w-0 flex-1 truncate text-xs text-[#E6ECF3]">
            {!headerConfig.enabled
              ? 'Header ticker is currently disabled.'
              : activeHeaderTicker.length === 0
              ? 'No enabled notices in header ticker.'
              : activeHeaderTicker.map(n => n.text).join('  ◆  ')}
          </div>
        </div>

        {/* Add Notice Input */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newHeaderText}
            onChange={e => setNewHeaderText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddHeaderNotice();
              }
            }}
            placeholder="Write a new header announcement…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleAddHeaderNotice}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#8BEAFF]/40 bg-[#8BEAFF]/12 px-4 py-2.5 text-xs font-bold text-[#8BEAFF] hover:bg-[#8BEAFF]/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Notice</span>
          </button>
        </div>

        {/* Notice Items List */}
        {headerConfig.notices.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#8993A1]">
            No header notices added yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {headerConfig.notices.map((notice, index) => {
              const isItemEnabled = notice.enabled !== false;
              return (
                <div
                  key={notice.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-3 transition-colors ${
                    isItemEnabled
                      ? 'border-[#C9D0D9]/16 bg-[#090D16]'
                      : 'border-[#C9D0D9]/10 bg-[#080B12] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-[#8993A1] tabular-nums">
                    <span>#{index + 1}</span>
                  </div>

                  <input
                    type="text"
                    value={notice.text}
                    onChange={e =>
                      setHeaderConfig(prev => ({
                        ...prev,
                        notices: prev.notices.map(item =>
                          item.id === notice.id ? { ...item, text: e.target.value } : item
                        ),
                      }))
                    }
                    className={`${inputClass} py-2 text-xs`}
                    placeholder="Notice message"
                  />

                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    <OrderControls
                      index={index}
                      total={headerConfig.notices.length}
                      onMoveUp={() => handleMoveHeaderNotice(index, -1)}
                      onMoveDown={() => handleMoveHeaderNotice(index, 1)}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderConfig(prev => ({
                          ...prev,
                          notices: prev.notices.map(item =>
                            item.id === notice.id
                              ? { ...item, enabled: item.enabled === false }
                              : item
                          ),
                        }))
                      }
                      title={isItemEnabled ? 'Disable this notice' : 'Enable this notice'}
                      aria-label={isItemEnabled ? 'Disable this notice' : 'Enable this notice'}
                      className={`rounded-lg border p-2 transition-colors cursor-pointer ${
                        isItemEnabled
                          ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300'
                          : 'border-[#C9D0D9]/18 bg-[#121826] text-[#94A0B2]'
                      }`}
                    >
                      {isItemEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHeaderNotice(notice.id, notice.text)}
                      title="Delete notice"
                      aria-label="Delete notice"
                      className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ==================================================================== */}
      {/* SECTION B: POPUP NOTICE (SLIDESHOW MODAL)                            */}
      {/* ==================================================================== */}
      <section aria-labelledby="sa-popup-notice-heading" className={`${panelClass} space-y-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9D0D9]/12 pb-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#8BEAFF]/30 bg-[#8BEAFF]/10 text-[#8BEAFF]">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <h3 id="sa-popup-notice-heading" className="text-base font-bold text-[#F5F7FA]">
                B. Popup Notice (Modal Slideshow)
              </h3>
              <p className="text-xs text-[#8993A1]">
                Controls only the important notice popup slideshow shown to visitors.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleButton
              enabled={popupConfig.enabled}
              disabled={savingPopup}
              onToggle={handleTogglePopupEnabled}
              enabledLabel="Popup Enabled"
              disabledLabel="Popup Disabled"
              ariaLabel="Toggle Popup Notice Modal"
            />
            <button
              type="button"
              onClick={() => void handleSavePopupNotices()}
              disabled={savingPopup}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8BEAFF] px-4 py-2 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingPopup ? 'Saving…' : 'Save Popup Notices'}</span>
            </button>
          </div>
        </div>

        {/* Slideshow Interval & Add Slide */}
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#C9D0D9]/12 bg-[#090D16] p-4">
          <div className="w-full sm:w-56">
            <label className="block text-xs font-semibold text-[#C9D0D9] mb-1.5">
              Slide Auto-Advance (Seconds)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={popupConfig.intervalSeconds}
              onChange={e =>
                setPopupConfig(prev => ({
                  ...prev,
                  intervalSeconds: Math.min(60, Math.max(1, Number(e.target.value) || 3)),
                }))
              }
              className={`${inputClass} py-2 font-mono tabular-nums`}
            />
          </div>

          <button
            type="button"
            onClick={handleAddPopupSlide}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#8BEAFF]/40 bg-[#8BEAFF]/12 px-4 py-2.5 text-xs font-bold text-[#8BEAFF] hover:bg-[#8BEAFF]/20 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Popup Slide</span>
          </button>
        </div>

        {popupConfig.items.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#8993A1]">
            No popup notice slides configured yet. Click "Add Popup Slide" to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {popupConfig.items.map((slide, index) => (
              <div
                key={slide.id}
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  slide.enabled
                    ? 'border-[#C9D0D9]/16 bg-[#090D16]'
                    : 'border-[#C9D0D9]/10 bg-[#080B12] opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C9D0D9]/10 pb-2.5">
                  <div className="flex items-center gap-2 text-xs text-[#8993A1] tabular-nums">
                    <span className="font-mono font-bold text-[#8BEAFF]">Slide #{index + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{slide.enabled ? 'Active in slideshow' : 'Hidden'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <OrderControls
                      index={index}
                      total={popupConfig.items.length}
                      onMoveUp={() => handleMovePopupSlide(index, -1)}
                      onMoveDown={() => handleMovePopupSlide(index, 1)}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPopupConfig(prev => ({
                          ...prev,
                          items: prev.items.map(item =>
                            item.id === slide.id ? { ...item, enabled: !item.enabled } : item
                          ),
                        }))
                      }
                      title={slide.enabled ? 'Disable slide' : 'Enable slide'}
                      aria-label={slide.enabled ? 'Disable slide' : 'Enable slide'}
                      className={`rounded-lg border p-2 transition-colors cursor-pointer ${
                        slide.enabled
                          ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300'
                          : 'border-[#C9D0D9]/18 bg-[#121826] text-[#94A0B2]'
                      }`}
                    >
                      {slide.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePopupSlide(slide.id, slide.title)}
                      title="Delete slide"
                      aria-label="Delete slide"
                      className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#94A0B2] mb-1">
                      Notice Title
                    </label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={e =>
                        setPopupConfig(prev => ({
                          ...prev,
                          items: prev.items.map(item =>
                            item.id === slide.id ? { ...item, title: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="Important Notice"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#94A0B2] mb-1">
                      Notice Message
                    </label>
                    <textarea
                      rows={3}
                      value={slide.message}
                      onChange={e =>
                        setPopupConfig(prev => ({
                          ...prev,
                          items: prev.items.map(item =>
                            item.id === slide.id ? { ...item, message: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="Write announcement details shown inside the popup slideshow…"
                      className={textareaClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
