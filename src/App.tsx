import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EventInformationSection } from './components/EventInformationSection';
import { RegistrationForm } from './components/RegistrationForm';
import { InvitationCardPage } from './components/InvitationCardPage';
import { Footer } from './components/Footer';
import { AdminPortal } from './components/AdminPortal';
import { JerseyShowcaseSection } from './components/JerseyShowcaseSection';
import {
  websiteIdentityConfig,
  eventSettingsConfig,
  registrationSettingsConfig,
  countdownSettingsConfig,
  importantNoticeConfig,
} from './lib/superAdminConfig';
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
  getRegistrationList,
  approveRegistration,
  rejectRegistration,
  deleteRegistration,
  updateRegistrationDetails,
} from './services';
import { supabase } from './lib/supabase';
import { ArrowRight, Bell, CheckCircle2, AlertCircle, Info, X, ShieldAlert, Ticket } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'invitation'>('home');
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [invitationSearchTarget, setInvitationSearchTarget] = useState<string>('');
  const [reRegisterRecord, setReRegisterRecord] = useState<InvitationRecord | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNoticePopupOpen, setIsNoticePopupOpen] = useState<boolean>(importantNoticeConfig.popupEnabled);
  const [isRegClosedPopupOpen, setIsRegClosedPopupOpen] = useState<boolean>(false);

  const handleOpenRegistration = () => {
    if (!registrationSettingsConfig.registrationOpen) {
      setIsRegClosedPopupOpen(true);
      return;
    }
    setReRegisterRecord(null);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Database Action Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Helper to load registrations from Supabase
  const loadRegistrations = async () => {
    try {
      const regResult = await getRegistrationList();
      if (regResult.success) {
        setInvitations(regResult.data);
      }
    } catch (err) {
      console.warn('Initial registrations fetch notice:', err);
    }
  };

  // ============================================================================
  // 1. INITIAL LOAD & REAL-TIME REGISTRATIONS SUBSCRIPTION
  // ============================================================================
  useEffect(() => {
    loadRegistrations();

    const channel = supabase
      .channel('public:realtime_registrations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, async () => {
        const res = await getRegistrationList();
        if (res.success) setInvitations(res.data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync document title with Super Admin Website Identity
  useEffect(() => {
    if (websiteIdentityConfig.websiteName) {
      document.title = websiteIdentityConfig.websiteName;
    }
  }, []);

  // Sync document favicon with Super Admin Website Identity
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

  // ============================================================================
  // 2. CODE-BASED SUPER ADMIN SETTINGS DERIVATION
  // ============================================================================

  const eventDateObj = new Date(countdownSettingsConfig.eventDate);
  const websiteSettings: WebsiteSettings = {
    eventName: websiteIdentityConfig.websiteName,
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
    venue: 'Central Amphitheatre',
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
    maleBkashNumber: registrationSettingsConfig.malePaymentNumber,
    maleNagadNumber: registrationSettingsConfig.malePaymentNumber,
    femaleBkashNumber: registrationSettingsConfig.femalePaymentNumber,
    femaleNagadNumber: registrationSettingsConfig.femalePaymentNumber,
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
    sectionOrder:
      eventSettingsConfig.eventCardLayout === 'cards_first' ? 'cards_first' : 'showcase_first',
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

  // ============================================================================
  // 3. REGISTRATION HANDLERS
  // ============================================================================

  const handleSuccessSubmit = async (newRecord: InvitationRecord) => {
    const listRes = await getRegistrationList();
    if (listRes.success) {
      setInvitations(listRes.data);
    } else {
      setInvitations(prev => [newRecord, ...prev.filter(x => x.registrationNo !== newRecord.registrationNo)]);
    }
    showToast(`Registration successfully submitted!`, 'success');
  };

  const handleGoToInvitation = (regNo: string) => {
    setInvitationSearchTarget(regNo);
    setActiveTab('invitation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateRegistrationStatus = async (
    registrationNo: string,
    newStatus: InvitationStatus,
    reason?: string
  ) => {
    const target = invitations.find(item => item.registrationNo === registrationNo);
    const regId = target?.dbId || registrationNo;

    if (newStatus === 'approved') {
      const res = await approveRegistration(regId);
      if (res.success) {
        showToast(`Registration ${registrationNo} approved!`, 'success');
        const fresh = await getRegistrationList();
        if (fresh.success) setInvitations(fresh.data);
      } else {
        showToast(res.errorMessage || `Failed to approve registration ${registrationNo}`, 'error');
      }
    } else if (newStatus === 'rejected') {
      if (!reason?.trim()) {
        showToast('A rejection reason is strictly required.', 'error');
        return;
      }
      const res = await rejectRegistration(regId, reason.trim());
      if (res.success) {
        showToast(`Registration ${registrationNo} rejected.`, 'success');
        const fresh = await getRegistrationList();
        if (fresh.success) setInvitations(fresh.data);
      } else {
        showToast(res.errorMessage || `Failed to reject registration ${registrationNo}`, 'error');
      }
    }
  };

  const handleDeleteRegistration = async (registrationNo: string) => {
    const target = invitations.find(item => item.registrationNo === registrationNo);
    const regId = target?.dbId || registrationNo;

    const res = await deleteRegistration(regId);
    if (res.success) {
      showToast(`Registration ${registrationNo} deleted.`, 'success');
      const fresh = await getRegistrationList();
      if (fresh.success) setInvitations(fresh.data);
    } else {
      showToast(res.errorMessage || `Failed to delete registration ${registrationNo}`, 'error');
    }
  };

  const handleEditRegistration = async (
    registrationNo: string,
    updates: Partial<InvitationRecord>
  ) => {
    const target = invitations.find(item => item.registrationNo === registrationNo);
    const regId = target?.dbId || registrationNo;

    const res = await updateRegistrationDetails(regId, updates);
    if (res.success) {
      showToast(`Registration ${registrationNo} updated!`, 'success');
      const fresh = await getRegistrationList();
      if (fresh.success) setInvitations(fresh.data);
    } else {
      showToast(res.errorMessage || `Failed to update registration ${registrationNo}`, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#111827] selection:bg-[#5B5FEF] selection:text-white relative">
      {/* Floating Action Toast Notification */}
      {toast && (
        <aside
          aria-label="Notification"
          className="fixed top-20 right-4 sm:right-6 z-[100] max-w-sm sm:max-w-md animate-slideDown shadow-2xl rounded-2xl p-4 border flex items-center gap-3 backdrop-blur-xl bg-white/95 text-slate-900 border-slate-200"
        >
          {toast.type === 'success' && (
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
            {toast.message}
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Important Notice Modal Popup (Controlled by Super Admin - 5. Important Notice) */}
      {isNoticePopupOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-4">
            <button
              onClick={() => setIsNoticePopupOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">{importantNoticeConfig.popupTitle}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                {importantNoticeConfig.popupMessage}
              </p>
            </div>
            <button
              onClick={() => setIsNoticePopupOpen(false)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              {importantNoticeConfig.closeButtonText || 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Registration Closed Modal Popup (Controlled by Super Admin - 03. registration-settings) */}
      {isRegClosedPopupOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 text-slate-900 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Registration Closed</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Registration is currently closed. Please contact the organizers manually.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRegClosedPopupOpen(false)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Sticky/Fixed Navbar */}
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
      />

      {/* Main Content Area */}
      <div className="pt-16 sm:pt-18 flex-1 flex flex-col">
        {/* Important Notice Announcement Banner (Controlled by Super Admin - 5. Important Notice) */}
        {importantNoticeConfig.noticeEnabled && importantNoticeConfig.noticeContent && (
          <aside
            aria-label="Announcement"
            className="w-full bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{importantNoticeConfig.noticeContent}</span>
          </aside>
        )}

        <main className="flex-1">
          {/* ======================================================== */}
          {/* HOMEPAGE STRUCTURE */}
          {/* ======================================================== */}
          {activeTab === 'home' && (
            <div className="animate-fadeIn">
              {/* 1. Hero Section */}
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

              {/* Dynamic Section Ordering based on Super Admin Event Settings */}
              {jerseyShowcaseSettings.sectionOrder === 'showcase_first' ? (
                <>
                  {jerseyShowcaseSettings.enabled && (
                    <JerseyShowcaseSection
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
                      settings={jerseyShowcaseSettings}
                      onRegisterClick={handleOpenRegistration}
                    />
                  )}
                </>
              )}

              {/* 3. Register Now Action Section */}
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

          {/* ======================================================== */}
          {/* REGISTRATION PAGE */}
          {/* ======================================================== */}
          {activeTab === 'register' && (
            <div className="animate-fadeIn">
              <RegistrationForm
                onSuccessSubmit={handleSuccessSubmit}
                onGoToInvitation={handleGoToInvitation}
                paymentSettings={paymentSettings}
                existingRegistrations={invitations}
                initialRecord={reRegisterRecord}
                registrationOpen={registrationSettingsConfig.registrationOpen}
                onResetReRegister={() => setReRegisterRecord(null)}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* INVITATION CARD VERIFICATION & DOWNLOAD PAGE */}
          {/* ======================================================== */}
          {activeTab === 'invitation' && (
            <div className="animate-fadeIn">
              <InvitationCardPage
                invitations={invitations}
                initialSearchRegNo={invitationSearchTarget}
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

      {/* 4. Footer with Admin Access */}
      <Footer
        onOpenAdmin={() => setIsAdminOpen(true)}
        websiteSettings={websiteSettings}
        brandingSettings={brandingSettings}
      />

      {/* Admin Portal Modal (Super Admin, Male Admin, Female Admin) */}
      {isAdminOpen && (
        <AdminPortal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          invitations={invitations}
          onUpdateStatus={handleUpdateRegistrationStatus}
          onDeleteRegistration={handleDeleteRegistration}
          onEditRegistration={handleEditRegistration}
        />
      )}
    </div>
  );
}
