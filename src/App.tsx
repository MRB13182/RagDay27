import React, { Suspense, useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MemoryArchiveStrip } from './components/MemoryArchiveStrip';
import { EventInformationSection } from './components/EventInformationSection';
import { Footer } from './components/Footer';
import { JerseyShowcaseSection } from './components/JerseyShowcaseSection';
import { ImportantNoticeModal } from './components/ImportantNoticeModal';
import { ContactInformationSection } from './components/ContactInformationSection';
import { SectionErrorBoundary } from './components/ErrorBoundary';
import { lazyWithRetry, safeReplaceHistory, safeScrollToTop } from './lib/browserUtils';
import { parseSafeDate } from './lib/dateUtils';
import { loadRemoteSuperAdminSettings } from './lib/superAdminTextSettings';

const RegistrationForm = lazyWithRetry(() =>
  import('./components/RegistrationForm').then(m => ({ default: m.RegistrationForm }))
);
const InvitationCardPage = lazyWithRetry(() =>
  import('./components/InvitationCardPage').then(m => ({ default: m.InvitationCardPage }))
);
const GallerySection = lazyWithRetry(() =>
  import('./components/GallerySection').then(m => ({ default: m.GallerySection }))
);
const AdminPortal = lazyWithRetry(() =>
  import('./components/AdminPortal').then(m => ({ default: m.AdminPortal }))
);
import {
  websiteIdentityConfig,
  eventSettingsConfig,
  registrationSettingsConfig,
  countdownSettingsConfig,
  importantNoticeConfig,
  getJerseyShowcaseCards,
} from './config/eventConfig';
import type {
  InvitationRecord,
  InvitationStatus,
  EventCard,
  WebsiteSettings,
  BrandingSettings,
  PdfSettings,
  PaymentSettings,
  JerseyShowcaseSettings,
  GenderType,
} from './types';
import {
  approveRegistration,
  rejectRegistration,
  deleteRegistration,
} from './services/admin';

import { ArrowRight, Bell, CheckCircle2, AlertCircle, Info, X, ShieldAlert, Ticket } from 'lucide-react';

const ViewLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading view...' }) => (
  <div className="min-h-[50vh] flex items-center justify-center px-4 py-16" role="status" aria-live="polite">
    <div className="flex items-center gap-3 rounded-xl border border-[#C9D0D9]/20 bg-[#10141B]/95 px-5 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <span className="h-4 w-4 rounded-full border-2 border-[#8BEAFF] border-t-transparent animate-spin" />
      <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#F5F7FA]">{label}</span>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'invitation' | 'gallery'>('home');
  const [activeSection, setActiveSection] = useState<'home' | 'our-story' | 'events' | 'batch'>('home');
  const [invitationSearchTarget, setInvitationSearchTarget] = useState<string>('');
  const [invitationStudentNameTarget, setInvitationStudentNameTarget] = useState<string>('');
  const [reRegisterRecord, setReRegisterRecord] = useState<InvitationRecord | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const hasDismissedPopupRef = React.useRef(false);
  const [isNoticePopupOpen, setIsNoticePopupOpen] = useState<boolean>(() => {
    try {
      return importantNoticeConfig.popupEnabled;
    } catch {
      return false;
    }
  });
  const [isRegClosedPopupOpen, setIsRegClosedPopupOpen] = useState<boolean>(false);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  

  const handleOpenRegistration = () => {
    if (!registrationSettingsConfig.registrationOpen) {
      setIsRegClosedPopupOpen(true);
      return;
    }
    setReRegisterRecord(null);
    setActiveTab('register');
    safeScrollToTop();
  };

  const scrollToHomeSection = (sectionId: string) => {
    const mapSection: Record<string, 'home' | 'our-story' | 'events' | 'batch'> = {
      'our-story': 'our-story',
      events: 'events',
      'event-details': 'events',
      'batch-identity': 'batch',
      'jersey-showcase': 'batch',
    };
    setActiveSection(mapSection[sectionId] || 'home');
    setActiveTab('home');
    window.setTimeout(() => {
      try {
        const target = document.getElementById(sectionId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch {
        safeScrollToTop();
      }
    }, 60);
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const [, setConfigVersion] = useState(0);

  useEffect(() => {
    const handleConfigUpdate = (event?: Event) => {
      setConfigVersion(v => v + 1);
      try {
        const customDetail = (event as CustomEvent<{ source?: string }> | undefined)?.detail;
        if (customDetail?.source === 'remote-sync' && !hasDismissedPopupRef.current) {
          setIsNoticePopupOpen(importantNoticeConfig.popupEnabled);
        }
        if (websiteIdentityConfig.websiteName) {
          document.title = websiteIdentityConfig.websiteName;
        }
        if (websiteIdentityConfig.favicon) {
          const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          if (link) link.href = websiteIdentityConfig.favicon;
        }
      } catch {
        // Ignore document metadata update errors in restricted frames.
      }
    };
    window.addEventListener('superadmin-config-updated', handleConfigUpdate);
    window.addEventListener('storage', handleConfigUpdate);
    void loadRemoteSuperAdminSettings();
    return () => {
      window.removeEventListener('superadmin-config-updated', handleConfigUpdate);
      window.removeEventListener('storage', handleConfigUpdate);
    };
  }, []);

  // Clean up one-time reload query params once the app mounts cleanly
  useEffect(() => {
    try {
      window.sessionStorage?.removeItem('rd27_chunk_reloaded');
      window.sessionStorage?.removeItem('rd27_preload_reloaded');
    } catch {
      // Ignore storage access failures.
    }
    try {
      if (window.location.search.includes('rd27_reload=') || window.location.search.includes('rd27_chunk_retry=')) {
        const params = new URLSearchParams(window.location.search);
        params.delete('rd27_reload');
        params.delete('rd27_chunk_retry');
        const cleanQuery = params.toString() ? `?${params.toString()}` : '';
        safeReplaceHistory(window.location.pathname + cleanQuery + window.location.hash);
      }
    } catch {
      // Ignore URL parsing errors.
    }
  }, []);

  // Guard against direct URL/hash navigation attempts to bypass admin authentication
  useEffect(() => {
    const handleAdminUrlProtection = () => {
      try {
        const hash = (window.location.hash || '').toLowerCase();
        const search = (window.location.search || '').toLowerCase();
        const path = (window.location.pathname || '').toLowerCase();
        const hasAdminAttempt = hash.includes('admin') || search.includes('admin') || path.includes('/admin');

        if (hasAdminAttempt) {
          // Clean URL without page reload
          if (hash.includes('admin')) {
            safeReplaceHistory(window.location.pathname + window.location.search);
          }
          if (search.includes('admin')) {
            const params = new URLSearchParams(window.location.search);
            params.delete('admin');
            params.delete('panel');
            const cleanQuery = params.toString() ? `?${params.toString()}` : '';
            safeReplaceHistory(window.location.pathname + cleanQuery);
          }
          // Direct URL access opens strictly the login screen, never granting panel access
          setIsAdminOpen(true);
        }
      } catch {
        // Ignore URL guard errors on restricted WebViews.
      }
    };

    handleAdminUrlProtection();
    window.addEventListener('hashchange', handleAdminUrlProtection);
    window.addEventListener('popstate', handleAdminUrlProtection);
    return () => {
      window.removeEventListener('hashchange', handleAdminUrlProtection);
      window.removeEventListener('popstate', handleAdminUrlProtection);
    };
  }, []);

  useEffect(() => {
    try {
      if (websiteIdentityConfig.websiteName) {
        document.title = websiteIdentityConfig.websiteName;
      }
    } catch {
      // Ignore document title errors.
    }
  }, []);

  useEffect(() => {
    try {
      if (websiteIdentityConfig.favicon) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0]?.appendChild(link);
        }
        link.href = websiteIdentityConfig.favicon;
      }
    } catch {
      // Ignore favicon DOM update errors.
    }
  }, []);

  const eventDateObj = parseSafeDate(countdownSettingsConfig.eventDate);
  const websiteSettings: WebsiteSettings = {
    eventName: eventSettingsConfig.eventName || websiteIdentityConfig.websiteName,
    eventDescription: eventSettingsConfig.eventDescription,
    eventDate: !eventDateObj
      ? countdownSettingsConfig.eventDate
      : eventDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    eventTime: !eventDateObj
      ? '10:00 AM – 11:30 PM'
      : eventDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    eventDay: !eventDateObj ? 27 : eventDateObj.getDate(),
    eventMonth: !eventDateObj
      ? 'November'
      : eventDateObj.toLocaleDateString('en-US', { month: 'long' }),
    eventYear: !eventDateObj ? 2027 : eventDateObj.getFullYear(),
    venue: eventSettingsConfig.venue,
    registrationFee: registrationSettingsConfig.registrationFee,
    lastRegDate: countdownSettingsConfig.registrationDeadline,
    footerText: websiteIdentityConfig.footerText,
    copyrightText: websiteIdentityConfig.footerText,
    bannerText: importantNoticeConfig.noticeContent,
    bannerActive: importantNoticeConfig.noticeEnabled,
    countdownEnabled: countdownSettingsConfig.countdownEnabled,
    targetEventIso: countdownSettingsConfig.eventDate,
  };

  const brandingSettings: BrandingSettings = {
    websiteLogo: websiteIdentityConfig.websiteLogo,
    favicon: websiteIdentityConfig.favicon,
    heroBanner: '',
    heroBackground: registrationSettingsConfig.jerseyPreviewBackground,
    jerseyFrontImage: registrationSettingsConfig.maleJerseyDesign,
    jerseyBackImage: registrationSettingsConfig.maleJerseyDesign,
    invitationCardBackground: '',
    footerLogo: websiteIdentityConfig.websiteLogo,
  };

  const numericFee =
    parseInt(registrationSettingsConfig.registrationFee.replace(/\D/g, ''), 10) || 500;

  const paymentSettings: PaymentSettings = {
    registrationFee: numericFee,
    currency: 'BDT',
    bkashEnabled: true,
    nagadEnabled: true,
    maleBkashNumber: registrationSettingsConfig.maleBkashNumber,
    maleNagadNumber: registrationSettingsConfig.maleNagadNumber,
    groupPaymentNumbers: registrationSettingsConfig.groupPaymentNumbers,
    instructions: eventSettingsConfig.importantInstructions,
    paymentInstructions: eventSettingsConfig.importantInstructions,
  };

  const pdfSettings: PdfSettings = {
    pdfLogo: websiteIdentityConfig.websiteLogo,
    pdfHeader: 'RAG DAY 27 - OFFICIAL REGISTRATION',
    pdfSubHeader: 'Batch 27 Executive Committee',
    watermarkLogo: 'RD27 OFFICIAL',
    watermarkOpacity: 0.08,
    footerText: websiteIdentityConfig.footerText,
    signatureArea: registrationSettingsConfig.maleInvitationSignature,
    signatureTitle: registrationSettingsConfig.maleInvitationSignature,
    approvalText: 'Approved by Committee',
    invitationCardTitle: 'RAG DAY 27 - OFFICIAL INVITATION PASS',
    customNotes: eventSettingsConfig.importantInstructions,
  };

  const eventCards: EventCard[] = eventSettingsConfig.eventCardsContent.map(c => ({
    id: c.id,
    icon: c.icon,
    title: c.title,
    description: c.description,
    subDetail: c.subDetail,
    customColor: c.customColor,
    order: c.order,
    visible: c.visible,
  }));

  const jerseyShowcaseSettings: JerseyShowcaseSettings = {
    enabled: true,
    sectionOrder: 'showcase_first',
    designCards: getJerseyShowcaseCards(),
    jerseys: [
      {
        id: 'jersey-batch27',
        name: 'Batch 2027 Squad Jersey',
        badgeText: 'Official Rag Day Jersey',
        tagText: 'RD27',
        frontImage: registrationSettingsConfig.maleJerseyDesign || '',
        backImage: registrationSettingsConfig.maleJerseyDesign || '',
        subtitle: 'Custom Squad Kit',
        title: 'Back Name & Number Print Included',
        badge1: 'Custom Fit',
        badge1Sub: 'Sizes S to 4XL',
        badge2: '100% Breathable Mesh',
      },
    ],
  };

  const handleSuccessSubmit = async (newRecord: InvitationRecord) => {
    setInvitations(prev => {
      const index = prev.findIndex(item => item.registration_no === newRecord.registration_no);
      if (index === -1) return [newRecord, ...prev];
      const next = [...prev];
      next[index] = { ...next[index], ...newRecord };
      return next;
    });
    showToast('Registration successfully submitted!', 'success');
  };

  const handleGoToInvitation = (regNo: string, studentName?: string) => {
    setInvitationSearchTarget(regNo);
    setInvitationStudentNameTarget(studentName || '');
    setActiveTab('invitation');
    safeScrollToTop();
  };

  const handleUpdateRegistrationStatus = async (
    registrationNo: string,
    newStatus: InvitationStatus,
    reason?: string
  ): Promise<InvitationRecord> => {
    if (!registrationNo.trim()) {
      showToast('Registration number is required.', 'error');
      throw new Error('Registration number is required.');
    }
    if (newStatus === 'rejected' && !reason?.trim()) {
      showToast('A rejection reason is strictly required.', 'error');
      throw new Error('A rejection reason is strictly required.');
    }

    try {
      const result = newStatus === 'approved'
        ? await approveRegistration(registrationNo)
        : await rejectRegistration(registrationNo, reason!.trim());

      if (!result.success || !result.data) {
        const errorMsg = result.errorMessage || `Unable to update registration ${registrationNo}.`;
        showToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }

      const confirmed = result.data;
      setInvitations(prev => {
        const index = prev.findIndex(r => r.registration_no === confirmed.registration_no);
        if (index === -1) return [confirmed, ...prev];
        const next = [...prev];
        next[index] = { ...next[index], ...confirmed };
        return next;
      });

      showToast(
        newStatus === 'approved'
          ? `Registration ${confirmed.registration_no} approved!`
          : `Registration ${confirmed.registration_no} rejected.`,
        'success'
      );
      return confirmed;
    } catch (error: any) {
      showToast(error?.message || `Unable to update registration ${registrationNo}.`, 'error');
      throw error;
    }
  };

  const handleDeleteRegistration = async (registrationNo: string) => {
    if (!registrationNo.trim()) {
      showToast('Registration number is required.', 'error');
      return;
    }

    try {
      const result = await deleteRegistration(registrationNo);
      if (!result.success) {
        const errorMsg = result.errorMessage || `Unable to delete registration ${registrationNo}.`;
        showToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }

      setInvitations(prev => prev.filter(r => r.registration_no !== registrationNo));
      showToast(`Registration ${registrationNo} removed from the admin web list.`, 'success');
    } catch (error: any) {
      showToast(error?.message || `Unable to remove registration ${registrationNo}.`, 'error');
      throw error;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08090D] text-[#F5F7FA] selection:bg-[#8BEAFF] selection:text-[#08090D] relative isolate public-glass-page overflow-x-clip">
      {/* Subtle obsidian architectural atmosphere */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden public-glass-atmosphere" />
      <div aria-hidden="true" className="fixed -top-52 left-1/4 w-[680px] h-[560px] rounded-full public-glass-orb public-glass-orb-ice pointer-events-none -z-10" />
      <div aria-hidden="true" className="fixed top-[22%] -right-56 w-[620px] h-[620px] rounded-full public-glass-orb public-glass-orb-silver pointer-events-none -z-10" />
      <div aria-hidden="true" className="fixed -bottom-64 -left-32 w-[560px] h-[560px] rounded-full public-glass-orb public-glass-orb-steel pointer-events-none -z-10" />
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 public-glass-sheen" />

      {toast && (
        <aside
          aria-label="Notification"
          className="fixed top-20 right-4 sm:right-6 z-[100] max-w-sm sm:max-w-md animate-slideDown glass-toast rounded-xl p-4 flex items-center gap-3"
        >
          {toast.type === 'success' && (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center shrink-0 border border-rose-400/30">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="w-8 h-8 rounded-lg bg-[#8BEAFF]/15 text-[#8BEAFF] flex items-center justify-center shrink-0 border border-[#8BEAFF]/30">
              <Info className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 text-xs sm:text-sm font-semibold text-[#F5F7FA] leading-snug">{toast.message}</div>
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="p-1.5 rounded-lg text-[#C9D0D9]/70 hover:text-[#F5F7FA] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      <SectionErrorBoundary mode="silent" sectionName="Important Notice">
        <ImportantNoticeModal
          isOpen={isNoticePopupOpen}
          onClose={() => {
            hasDismissedPopupRef.current = true;
            setIsNoticePopupOpen(false);
          }}
          items={importantNoticeConfig.popupNotices.items}
          intervalSeconds={importantNoticeConfig.popupNotices.intervalSeconds}
          title={importantNoticeConfig.popupTitle || 'Important Notice'}
          message={importantNoticeConfig.popupMessage}
          buttonText={importantNoticeConfig.closeButtonText || 'I Understand'}
        />
      </SectionErrorBoundary>

      {isRegClosedPopupOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#08090D]/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-modal rounded-2xl p-6 sm:p-8 space-y-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-amber-500/15 text-amber-300 grid place-items-center mx-auto border border-amber-400/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="font-display text-2xl font-extrabold text-[#F5F7FA]">Registration Closed</h3>
            <p className="text-xs sm:text-sm text-[#C9D0D9] leading-relaxed font-medium">
              Registration is currently closed. Please contact the organizers manually.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRegClosedPopupOpen(false)}
                className="w-full py-3.5 rounded-xl glass-button-primary font-bold text-xs uppercase tracking-wider cursor-pointer transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        activeSection={activeSection}
        onNavigate={(tab, sectionId) => {
          if (tab === 'register') {
            handleOpenRegistration();
            return;
          }
          if (tab === 'home' && sectionId) {
            scrollToHomeSection(sectionId);
            return;
          }
          if (tab === 'home') {
            setActiveSection('home');
          }
          setActiveTab(tab);
          safeScrollToTop();
        }}
        websiteLogo={brandingSettings.websiteLogo}
        eventName={websiteSettings.eventName}
        onOpenNotice={importantNoticeConfig.popupEnabled ? () => setIsNoticePopupOpen(true) : undefined}
        themeGender={undefined}
      />

      <div className="pt-[4.25rem] sm:pt-[4.75rem] flex-1 flex flex-col">
        {importantNoticeConfig.noticeEnabled && importantNoticeConfig.headerNotices.notices.length > 0 && (() => {
          const headerItems = importantNoticeConfig.headerNotices.notices;
          const unitNotices = headerItems.length === 1
            ? [headerItems[0], headerItems[0], headerItems[0]]
            : headerItems;
          const totalChars = unitNotices.reduce((sum, item) => sum + item.text.length, 0);
          const durationSec = Math.max(18, Math.min(48, Math.round(totalChars * 0.24)));

          return (
            <aside
              aria-label="Announcement Ticker"
              onClick={() => {
                if (importantNoticeConfig.popupEnabled) setIsNoticePopupOpen(true);
              }}
              className={`w-full overflow-hidden border-y border-[#8BEAFF]/25 bg-[rgba(10,15,24,0.88)] backdrop-blur-md text-[#F5F7FA] py-2 flex items-center select-none ${
                importantNoticeConfig.popupEnabled ? 'cursor-pointer hover:border-[#8BEAFF]/55' : ''
              }`}
              title={importantNoticeConfig.popupEnabled ? 'Click to open notice slideshow' : undefined}
            >
              <div className="shrink-0 pl-3 sm:pl-5 pr-2.5 sm:pr-3 border-r border-[#8BEAFF]/25 flex items-center gap-1.5 z-10 bg-[rgba(10,15,24,0.96)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8BEAFF] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8BEAFF]" />
                </span>
                <Bell className="w-3.5 h-3.5 text-[#8BEAFF] shrink-0" />
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.18em] text-[#8BEAFF]">
                  Notice
                </span>
              </div>

              <div
                className="rd27-ticker-viewport flex-1"
                style={{ '--rd27-ticker-duration': `${durationSec}s` } as React.CSSProperties}
              >
                <div className="rd27-ticker-track">
                  {[0, 1].map((copyIdx) => (
                    <div key={copyIdx} className="rd27-ticker-group" aria-hidden={copyIdx === 1}>
                      {unitNotices.map((notice, itemIdx) => (
                        <React.Fragment key={`${copyIdx}-${notice.id}-${itemIdx}`}>
                          <span className="px-4 sm:px-6 text-xs sm:text-[13px] font-semibold text-[#E6ECF3] tracking-wide">
                            {notice.text}
                          </span>
                          <span className="text-[#8BEAFF] text-xs font-bold opacity-80" aria-hidden="true">
                            ◆
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          );
        })()}

        <main className="flex-1">
          {activeTab === 'home' && (
            <div className="animate-fadeIn">
              <SectionErrorBoundary sectionName="Event Overview">
                <HeroSection
                  onRegisterClick={handleOpenRegistration}
                  onInvitationClick={() => {
                    setActiveTab('invitation');
                    safeScrollToTop();
                  }}
                  onExploreBatchClick={() => scrollToHomeSection('batch-identity')}
                  websiteSettings={websiteSettings}
                  brandingSettings={brandingSettings}
                  jerseySettings={jerseyShowcaseSettings}
                />
              </SectionErrorBoundary>

              <SectionErrorBoundary mode="silent" sectionName="Memory Archive">
                <MemoryArchiveStrip
                  onOpenGallery={() => {
                    setActiveTab('gallery');
                    safeScrollToTop();
                  }}
                />
              </SectionErrorBoundary>

              {jerseyShowcaseSettings.sectionOrder === 'showcase_first' ? (
                <>
                  {jerseyShowcaseSettings.enabled && (
                    <SectionErrorBoundary sectionName="Jersey Showcase">
                      <JerseyShowcaseSection
                        cards={getJerseyShowcaseCards()}
                        settings={jerseyShowcaseSettings}
                        onRegisterClick={handleOpenRegistration}
                      />
                    </SectionErrorBoundary>
                  )}
                  <SectionErrorBoundary sectionName="Event Information">
                    <EventInformationSection
                      cards={eventCards}
                      layout={eventSettingsConfig.eventCardLayout}
                      onOpenGallery={() => {
                        setActiveTab('gallery');
                        safeScrollToTop();
                      }}
                      onOpenNotice={importantNoticeConfig.popupEnabled ? () => setIsNoticePopupOpen(true) : undefined}
                      onScrollToSection={scrollToHomeSection}
                    />
                  </SectionErrorBoundary>
                </>
              ) : (
                <>
                  <SectionErrorBoundary sectionName="Event Information">
                    <EventInformationSection
                      cards={eventCards}
                      layout={eventSettingsConfig.eventCardLayout}
                      onOpenGallery={() => {
                        setActiveTab('gallery');
                        safeScrollToTop();
                      }}
                      onOpenNotice={importantNoticeConfig.popupEnabled ? () => setIsNoticePopupOpen(true) : undefined}
                      onScrollToSection={scrollToHomeSection}
                    />
                  </SectionErrorBoundary>
                  {jerseyShowcaseSettings.enabled && (
                    <SectionErrorBoundary sectionName="Jersey Showcase">
                      <JerseyShowcaseSection
                        cards={getJerseyShowcaseCards()}
                        settings={jerseyShowcaseSettings}
                        onRegisterClick={handleOpenRegistration}
                      />
                    </SectionErrorBoundary>
                  )}
                </>
              )}

              {/* For More Information Section */}
              <SectionErrorBoundary mode="silent" sectionName="Contact Information">
                <ContactInformationSection />
              </SectionErrorBoundary>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="animate-fadeIn min-h-[calc(100vh-4.5rem)]">
              <SectionErrorBoundary sectionName="Gallery" onReset={() => setActiveTab('home')}>
                <Suspense fallback={<ViewLoadingFallback label="Loading gallery..." />}>
                  <GallerySection />
                </Suspense>
              </SectionErrorBoundary>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="animate-fadeIn min-h-[calc(100vh-4.5rem)] registration-page-shell">
              <SectionErrorBoundary sectionName="Registration Form" onReset={() => setActiveTab('home')}>
                <Suspense fallback={<ViewLoadingFallback label="Loading registration form..." />}>
                  <RegistrationForm
                    onSuccessSubmit={handleSuccessSubmit}
                    onGoToInvitation={handleGoToInvitation}
                    paymentSettings={paymentSettings}
                    existingRegistrations={invitations}
                    initialRecord={reRegisterRecord}
                    registrationDeadline={countdownSettingsConfig.registrationDeadline}
                    onResetReRegister={() => setReRegisterRecord(null)}
                  />
                </Suspense>
              </SectionErrorBoundary>
            </div>
          )}

          {activeTab === 'invitation' && (
            <div className="animate-fadeIn">
              <SectionErrorBoundary sectionName="Invitation Card Portal" onReset={() => setActiveTab('home')}>
                <Suspense fallback={<ViewLoadingFallback label="Loading invitation card portal..." />}>
                  <InvitationCardPage
                    invitations={invitations}
                    initialSearchRegNo={invitationSearchTarget}
                    initialSearchStudentName={invitationStudentNameTarget}
                    onNavigateToRegister={(record?: InvitationRecord) => {
                      if (record?.status === 'rejected') {
                        setReRegisterRecord(record);
                      } else {
                        // Pending/approved records must not enter rejected recovery mode.
                        setReRegisterRecord(null);
                      }
                      setActiveTab('register');
                      safeScrollToTop();
                    }}
                    pdfSettings={pdfSettings}
                    websiteSettings={websiteSettings}
                  />
                </Suspense>
              </SectionErrorBoundary>
            </div>
          )}
        </main>
      </div>

      <SectionErrorBoundary mode="silent" sectionName="Footer">
        <Footer
          onOpenAdmin={() => setIsAdminOpen(true)}
          websiteSettings={websiteSettings}
          brandingSettings={brandingSettings}
          themeGender={undefined}
        />
      </SectionErrorBoundary>

      {isAdminOpen && (
        <SectionErrorBoundary sectionName="Admin Portal" onReset={() => setIsAdminOpen(false)}>
          <Suspense fallback={<ViewLoadingFallback label="Loading admin portal..." />}>
            <AdminPortal
              isOpen={isAdminOpen}
              onClose={() => setIsAdminOpen(false)}
              invitations={invitations}
              onUpdateStatus={handleUpdateRegistrationStatus}
              onDeleteRegistration={handleDeleteRegistration}
              pdfSettings={pdfSettings}
              websiteSettings={websiteSettings}
            />
          </Suspense>
        </SectionErrorBoundary>
      )}
    </div>
  );
}
