import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EventInformationSection } from './components/EventInformationSection';
import { RegistrationForm } from './components/RegistrationForm';
import { InvitationCardPage } from './components/InvitationCardPage';
import { Footer } from './components/Footer';
import { AdminPortal } from './components/AdminPortal';
import { JerseyShowcaseSection } from './components/JerseyShowcaseSection';
import { ImportantNoticeModal } from './components/ImportantNoticeModal';
import {
  websiteIdentityConfig,
  eventSettingsConfig,
  registrationSettingsConfig,
  countdownSettingsConfig,
  importantNoticeConfig,
  logoRelatedConfig,
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
} from './types';
import {
  approveRegistration,
  rejectRegistration,
  deleteRegistration,
} from './services';

import { ArrowRight, Bell, CheckCircle2, AlertCircle, Info, X, ShieldAlert, Ticket } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'invitation'>('home');
  const [invitationSearchTarget, setInvitationSearchTarget] = useState<string>('');
  const [invitationStudentNameTarget, setInvitationStudentNameTarget] = useState<string>('');
  const [reRegisterRecord, setReRegisterRecord] = useState<InvitationRecord | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNoticePopupOpen, setIsNoticePopupOpen] = useState<boolean>(importantNoticeConfig.popupEnabled);
  const [isRegClosedPopupOpen, setIsRegClosedPopupOpen] = useState<boolean>(false);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);

  const handleOpenRegistration = () => {
    if (!registrationSettingsConfig.registrationOpen) {
      setIsRegClosedPopupOpen(true);
      return;
    }
    setReRegisterRecord(null);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      if (websiteIdentityConfig.websiteName) {
        document.title = websiteIdentityConfig.websiteName;
      }
      if (websiteIdentityConfig.favicon) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) link.href = websiteIdentityConfig.favicon;
      }
    };
    window.addEventListener('superadmin-config-updated', handleConfigUpdate);
    return () => window.removeEventListener('superadmin-config-updated', handleConfigUpdate);
  }, []);

  useEffect(() => {
    if (websiteIdentityConfig.websiteName) {
      document.title = websiteIdentityConfig.websiteName;
    }
  }, []);

  useEffect(() => {
    if (websiteIdentityConfig.favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = websiteIdentityConfig.favicon;
    }
  }, []);

  const eventDateObj = new Date(countdownSettingsConfig.eventDate);
  const websiteSettings: WebsiteSettings = {
    eventName: eventSettingsConfig.eventName || websiteIdentityConfig.websiteName,
    eventDescription: eventSettingsConfig.eventDescription,
    eventDate: isNaN(eventDateObj.getTime())
      ? countdownSettingsConfig.eventDate
      : eventDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    eventTime: isNaN(eventDateObj.getTime())
      ? '10:00 AM – 11:30 PM'
      : eventDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    eventDay: isNaN(eventDateObj.getTime()) ? 27 : eventDateObj.getDate(),
    eventMonth: isNaN(eventDateObj.getTime())
      ? 'November'
      : eventDateObj.toLocaleDateString('en-US', { month: 'long' }),
    eventYear: isNaN(eventDateObj.getTime()) ? 2027 : eventDateObj.getFullYear(),
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
    jerseyBackImage: registrationSettingsConfig.femaleJerseyDesign,
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
    femaleBkashNumber: registrationSettingsConfig.femaleBkashNumber,
    femaleNagadNumber: registrationSettingsConfig.femaleNagadNumber,
    instructions: eventSettingsConfig.importantInstructions,
    paymentInstructions: eventSettingsConfig.importantInstructions,
  };

  const pdfSettings: PdfSettings = {
    pdfLogo: websiteIdentityConfig.websiteLogo,
    pdfHeader: websiteIdentityConfig.websiteName,
    pdfSubHeader: eventSettingsConfig.eventName,
    watermarkLogo: 'RD27 OFFICIAL',
    watermarkOpacity: 0.08,
    footerText: websiteIdentityConfig.footerText,
    signatureArea: registrationSettingsConfig.maleInvitationSignature,
    signatureTitle: registrationSettingsConfig.femaleInvitationSignature,
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
    designCards: logoRelatedConfig.jerseyDesignCards,
    jerseys: [
      {
        id: 'jersey-batch27',
        name: 'Batch 2027 Squad Jersey',
        badgeText: 'Official Rag Day Jersey',
        tagText: 'RD27',
        frontImage: registrationSettingsConfig.maleJerseyDesign || '',
        backImage: registrationSettingsConfig.femaleJerseyDesign || '',
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#111827] selection:bg-[#5B5FEF] selection:text-white relative">
      {/* Background Soft Glow Orbs for Subtle Glass Reflection Depth */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-[#5B5FEF]/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {toast && (
        <aside
          aria-label="Notification"
          className="fixed top-20 right-4 sm:right-6 z-[100] max-w-sm sm:max-w-md animate-slideDown shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15),inset_0_1.5px_2px_white] rounded-2xl p-4 border flex items-center gap-3 backdrop-blur-2xl bg-white/90 text-slate-900 border-white/95"
        >
          {toast.type === 'success' && (
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs border border-indigo-100">
              <Info className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 text-xs sm:text-sm font-semibold text-slate-800 leading-snug">{toast.message}</div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      <ImportantNoticeModal
        isOpen={isNoticePopupOpen}
        onClose={() => setIsNoticePopupOpen(false)}
        title={importantNoticeConfig.popupTitle || 'Important Notice'}
        message={importantNoticeConfig.popupMessage}
        buttonText={importantNoticeConfig.closeButtonText || 'I Understand'}
      />

      {isRegClosedPopupOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),inset_0_1.5px_2px_white] border border-white/95 text-slate-900 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto shadow-2xs border border-amber-100">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Registration Closed</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Registration is currently closed. Please contact the organizers manually.</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRegClosedPopupOpen(false)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
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
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        websiteLogo={brandingSettings.websiteLogo}
        eventName={websiteSettings.eventName}
        onOpenNotice={importantNoticeConfig.popupEnabled ? () => setIsNoticePopupOpen(true) : undefined}
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
              <HeroSection
                onRegisterClick={handleOpenRegistration}
                onInvitationClick={() => {
                  setActiveTab('invitation');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                websiteSettings={websiteSettings}
                brandingSettings={brandingSettings}
                jerseySettings={jerseyShowcaseSettings}
              />

              {jerseyShowcaseSettings.sectionOrder === 'showcase_first' ? (
                <>
                  {jerseyShowcaseSettings.enabled && (
                    <JerseyShowcaseSection
                      cards={logoRelatedConfig.jerseyDesignCards}
                      settings={jerseyShowcaseSettings}
                      onRegisterClick={handleOpenRegistration}
                    />
                  )}
                  <EventInformationSection cards={eventCards} layout={eventSettingsConfig.eventCardLayout} />
                </>
              ) : (
                <>
                  <EventInformationSection cards={eventCards} layout={eventSettingsConfig.eventCardLayout} />
                  {jerseyShowcaseSettings.enabled && (
                    <JerseyShowcaseSection
                      cards={logoRelatedConfig.jerseyDesignCards}
                      settings={jerseyShowcaseSettings}
                      onRegisterClick={handleOpenRegistration}
                    />
                  )}
                </>
              )}

              <section className="py-8 sm:py-12 text-center">
                <div className="max-w-md mx-auto px-4">
                  {registrationSettingsConfig.registrationOpen ? (
                    <>
                      <button
                        onClick={handleOpenRegistration}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#5B5FEF] text-white font-extrabold text-base shadow-xl shadow-[#5B5FEF]/30 hover:shadow-2xl hover:shadow-[#5B5FEF]/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer group"
                      >
                        <span>Register Now</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                      <p className="text-xs text-slate-500 mt-2.5">
                        Registration deadline: {countdownSettingsConfig.registrationDeadline} · Fee: {registrationSettingsConfig.registrationFee}
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsRegClosedPopupOpen(true)}
                      className="w-full sm:w-auto p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      Registration is currently closed. Please contact the organizers manually.
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="animate-fadeIn">
              <RegistrationForm
                onSuccessSubmit={handleSuccessSubmit}
                onGoToInvitation={handleGoToInvitation}
                paymentSettings={paymentSettings}
                existingRegistrations={invitations}
                initialRecord={reRegisterRecord}
                registrationOpen={registrationSettingsConfig.registrationOpen}
                registrationDeadline={countdownSettingsConfig.registrationDeadline}
                onResetReRegister={() => setReRegisterRecord(null)}
              />
            </div>
          )}

          {activeTab === 'invitation' && (
            <div className="animate-fadeIn">
              <InvitationCardPage
                invitations={invitations}
                initialSearchRegNo={invitationSearchTarget}
                initialSearchStudentName={invitationStudentNameTarget}
                onNavigateToRegister={(record?: InvitationRecord) => {
                  if (record) {
                    setReRegisterRecord(record);
                  } else {
                    setReRegisterRecord(null);
                  }
                  setActiveTab('register');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                pdfSettings={pdfSettings}
                websiteSettings={websiteSettings}
              />
            </div>
          )}
        </main>
      </div>

      <Footer
        onOpenAdmin={() => setIsAdminOpen(true)}
        websiteSettings={websiteSettings}
        brandingSettings={brandingSettings}
      />

      {isAdminOpen && (
        <AdminPortal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          invitations={invitations}
          onUpdateStatus={handleUpdateRegistrationStatus}
          onDeleteRegistration={handleDeleteRegistration}
        />
      )}
    </div>
  );
}
