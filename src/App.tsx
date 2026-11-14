import React, { Suspense, useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EventInformationSection } from './components/EventInformationSection';
import { Footer } from './components/Footer';
import { JerseyShowcaseSection } from './components/JerseyShowcaseSection';
import { ImportantNoticeModal } from './components/ImportantNoticeModal';
import { ContactInformationSection } from './components/ContactInformationSection';
import { SectionErrorBoundary } from './components/ErrorBoundary';
import { lazyWithRetry, safeReplaceHistory, safeScrollToTop } from './lib/browserUtils';
import { parseSafeDate } from './lib/dateUtils';

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
  logoRelatedConfig,
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
    <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/80 px-5 py-3.5 shadow-sm backdrop-blur-xl">
      <span className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      <span className="text-xs sm:text-sm font-bold text-slate-700">{label}</span>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'invitation' | 'gallery'>('home');
  const [invitationSearchTarget, setInvitationSearchTarget] = useState<string>('');
  const [invitationStudentNameTarget, setInvitationStudentNameTarget] = useState<string>('');
  const [reRegisterRecord, setReRegisterRecord] = useState<InvitationRecord | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const [, setConfigVersion] = useState(0);

  useEffect(() => {
    const handleConfigUpdate = () => {
      setConfigVersion(v => v + 1);
      try {
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
    return () => window.removeEventListener('superadmin-config-updated', handleConfigUpdate);
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
    femaleBkashNumber: registrationSettingsConfig.maleBkashNumber,
    femaleNagadNumber: registrationSettingsConfig.femaleNagadNumber,
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
    <div className="min-h-screen flex flex-col bg-[#FBFAFF] text-[#111827] selection:bg-[#5B5FEF] selection:text-white relative isolate public-glass-page">
      {/* Public pages use a bright lavender-white glass atmosphere. RegistrationForm keeps its original dark glass theme. */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden public-glass-atmosphere" />
      <div aria-hidden="true" className="fixed -top-52 -left-44 w-[620px] h-[620px] rounded-full public-glass-orb public-glass-orb-lavender pointer-events-none -z-10" />
      <div aria-hidden="true" className="fixed top-[18%] -right-56 w-[680px] h-[680px] rounded-full public-glass-orb public-glass-orb-blue pointer-events-none -z-10" />
      <div aria-hidden="true" className="fixed top-[58%] -left-48 w-[560px] h-[560px] rounded-full public-glass-orb public-glass-orb-pink pointer-events-none -z-10" />
      <div aria-hidden="true" className="fixed -bottom-64 right-[8%] w-[620px] h-[620px] rounded-full public-glass-orb public-glass-orb-mixed pointer-events-none -z-10" />
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 public-glass-sheen" />

      {toast && (
        <aside
          aria-label="Notification"
          className="fixed top-20 right-4 sm:right-6 z-[100] max-w-sm sm:max-w-md animate-slideDown glass-toast rounded-2xl p-4 flex items-center gap-3"
        >
          {toast.type === 'success' && (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-2xs">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-2xs">
              <Info className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 text-xs sm:text-sm font-bold text-slate-900 leading-snug">{toast.message}</div>
          <button
            onClick={() => setToast(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      <SectionErrorBoundary mode="silent" sectionName="Important Notice">
        <ImportantNoticeModal
          isOpen={isNoticePopupOpen}
          onClose={() => setIsNoticePopupOpen(false)}
          title={importantNoticeConfig.popupTitle || 'Important Notice'}
          message={importantNoticeConfig.popupMessage}
          buttonText={importantNoticeConfig.closeButtonText || 'I Understand'}
        />
      </SectionErrorBoundary>

      {isRegClosedPopupOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 sm:p-8 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 grid place-items-center mx-auto shadow-2xs border border-amber-500/25">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="font-display text-2xl font-black text-slate-900">Registration Closed</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">Registration is currently closed. Please contact the organizers manually.</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRegClosedPopupOpen(false)}
                className="w-full py-3.5 rounded-2xl glass-button-primary font-bold text-xs shadow-md cursor-pointer transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        onNavigate={tab => {
          if (tab === 'register') {
            handleOpenRegistration();
            return;
          }
          setActiveTab(tab);
          safeScrollToTop();
        }}
        websiteLogo={brandingSettings.websiteLogo}
        eventName={websiteSettings.eventName}
        onOpenNotice={importantNoticeConfig.popupEnabled ? () => setIsNoticePopupOpen(true) : undefined}
        themeGender={undefined}
      />

      <div className="pt-16 sm:pt-18 flex-1 flex flex-col">
        {importantNoticeConfig.noticeEnabled && importantNoticeConfig.noticeContent && (
          <aside
            aria-label="Announcement"
            onClick={() => setIsNoticePopupOpen(true)}
            className="w-full bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-105 transition-all select-none"
            title="Click to view full Important Notice"
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{importantNoticeConfig.noticeContent}</span>
            <span className="hidden sm:inline text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold ml-1">View Details</span>
          </aside>
        )}

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
                  websiteSettings={websiteSettings}
                  brandingSettings={brandingSettings}
                  jerseySettings={jerseyShowcaseSettings}
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
                    <EventInformationSection cards={eventCards} layout={eventSettingsConfig.eventCardLayout} />
                  </SectionErrorBoundary>
                </>
              ) : (
                <>
                  <SectionErrorBoundary sectionName="Event Information">
                    <EventInformationSection cards={eventCards} layout={eventSettingsConfig.eventCardLayout} />
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
