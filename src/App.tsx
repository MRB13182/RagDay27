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
  INITIAL_INVITATIONS,
  DEFAULT_EVENT_CARDS,
  DEFAULT_WEBSITE_SETTINGS,
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_PDF_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_JERSEY_SHOWCASE_SETTINGS,
} from './data/mockData';
import {
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
  supabase,
  fetchRegistrationsFromSupabase,
  fetchEventSettingsFromSupabase,
  saveEventSettingsToSupabase,
  fetchBrandingSettingsFromSupabase,
  saveBrandingSettingsToSupabase,
  fetchPaymentSettingsFromSupabase,
  savePaymentSettingsToSupabase,
  fetchPdfSettingsFromSupabase,
  savePdfSettingsToSupabase,
  fetchEventCardsFromSupabase,
  saveEventCardsToSupabase,
  fetchJerseyShowcaseFromSupabase,
  saveJerseyShowcaseToSupabase,
  updateRegistrationStatusInSupabase,
  deleteRegistrationFromSupabase,
  updateRegistrationDetailsInSupabase,
} from './lib/supabase';
import { ArrowRight, Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'invitation'>('home');
  const [invitations, setInvitations] = useState<InvitationRecord[]>(INITIAL_INVITATIONS);
  const [invitationSearchTarget, setInvitationSearchTarget] = useState<string>('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Dynamic Admin Controlled Settings
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>(DEFAULT_PDF_SETTINGS);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [eventCards, setEventCards] = useState<EventCard[]>(DEFAULT_EVENT_CARDS);
  const [jerseyShowcaseSettings, setJerseyShowcaseSettings] = useState<JerseyShowcaseSettings>(
    DEFAULT_JERSEY_SHOWCASE_SETTINGS
  );

  // Database Action Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // ============================================================================
  // 1. FETCH ALL DATA DIRECTLY FROM SUPABASE ON INITIAL MOUNT
  // ============================================================================
  useEffect(() => {
    let isMounted = true;

    async function loadDataFromSupabase() {
      try {
        const [
          regResult,
          eventRes,
          brandRes,
          payRes,
          pdfRes,
          cardsRes,
          showcaseRes,
        ] = await Promise.all([
          fetchRegistrationsFromSupabase(),
          fetchEventSettingsFromSupabase(),
          fetchBrandingSettingsFromSupabase(),
          fetchPaymentSettingsFromSupabase(),
          fetchPdfSettingsFromSupabase(),
          fetchEventCardsFromSupabase(),
          fetchJerseyShowcaseFromSupabase(),
        ]);

        if (!isMounted) return;

        if (regResult && Array.isArray(regResult.data)) {
          setInvitations(regResult.data);
        }
        if (eventRes) setWebsiteSettings(eventRes);
        if (brandRes) setBrandingSettings(brandRes);
        if (payRes) setPaymentSettings(payRes);
        if (pdfRes) setPdfSettings(pdfRes);
        if (cardsRes && cardsRes.length > 0) setEventCards(cardsRes);
        if (showcaseRes) setJerseyShowcaseSettings(showcaseRes);
      } catch (err) {
        console.warn('Initial Supabase fetch warning:', err);
      }
    }

    loadDataFromSupabase();

    // ==========================================================================
    // 2. REAL-TIME SUBSCRIPTION TO SUPABASE DATABASE CHANGES
    // ==========================================================================
    const channel = supabase
      .channel('public:realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, async () => {
        const res = await fetchRegistrationsFromSupabase();
        if (res && res.data) setInvitations(res.data);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'website_settings' }, async () => {
        const res = await fetchEventSettingsFromSupabase();
        if (res) setWebsiteSettings(res);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branding_settings' }, async () => {
        const res = await fetchBrandingSettingsFromSupabase();
        if (res) setBrandingSettings(res);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_settings' }, async () => {
        const res = await fetchPaymentSettingsFromSupabase();
        if (res) setPaymentSettings(res);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdf_settings' }, async () => {
        const res = await fetchPdfSettingsFromSupabase();
        if (res) setPdfSettings(res);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_cards' }, async () => {
        const res = await fetchEventCardsFromSupabase();
        if (res) setEventCards(res);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jersey_showcase' }, async () => {
        const res = await fetchJerseyShowcaseFromSupabase();
        if (res) setJerseyShowcaseSettings(res);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync document title with Admin Controlled Website Name
  useEffect(() => {
    if (websiteSettings.eventName) {
      document.title = websiteSettings.eventName;
    }
  }, [websiteSettings.eventName]);

  // Sync document favicon with Admin Controlled Favicon
  useEffect(() => {
    if (brandingSettings.favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = brandingSettings.favicon;
    }
  }, [brandingSettings.favicon]);

  // ============================================================================
  // 3. ADMIN SETTINGS SUPABASE PERSISTENCE HANDLERS
  // ============================================================================

  const handleUpdateWebsiteSettings = async (newSettings: WebsiteSettings) => {
    const res = await saveEventSettingsToSupabase(newSettings);
    if (!res.success) {
      showToast(res.error || 'Event settings update failed.', 'error');
      return;
    }
    const fresh = await fetchEventSettingsFromSupabase();
    if (fresh) setWebsiteSettings(fresh);
    showToast('Event settings saved to Supabase database!', 'success');
  };

  const handleUpdateBrandingSettings = async (newSettings: BrandingSettings) => {
    const res = await saveBrandingSettingsToSupabase(newSettings);
    if (!res.success) {
      showToast(res.error || 'Branding update failed.', 'error');
      return;
    }
    const fresh = await fetchBrandingSettingsFromSupabase();
    if (fresh) setBrandingSettings(fresh);
    showToast('Visual branding assets saved to Supabase database!', 'success');
  };

  const handleUpdatePaymentSettings = async (newPaymentSettings: PaymentSettings) => {
    const res = await savePaymentSettingsToSupabase(newPaymentSettings);
    if (!res.success) {
      showToast(res.error || 'Payment settings update failed.', 'error');
      return;
    }
    const fresh = await fetchPaymentSettingsFromSupabase();
    if (fresh) setPaymentSettings(fresh);
    const formattedFee = `${newPaymentSettings.registrationFee} ${newPaymentSettings.currency}`;
    const updatedWebsite = { ...websiteSettings, registrationFee: formattedFee };
    const feeRes = await saveEventSettingsToSupabase(updatedWebsite);
    if (feeRes.success) {
      const freshWebsite = await fetchEventSettingsFromSupabase();
      if (freshWebsite) setWebsiteSettings(freshWebsite);
    }
    showToast('Payment settings saved to Supabase database!', 'success');
  };

  const handleUpdatePdfSettings = async (newSettings: PdfSettings) => {
    const res = await savePdfSettingsToSupabase(newSettings);
    if (!res.success) {
      showToast(res.error || 'PDF settings update failed.', 'error');
      return;
    }
    const fresh = await fetchPdfSettingsFromSupabase();
    if (fresh) setPdfSettings(fresh);
    showToast('PDF Ledger settings saved to Supabase database!', 'success');
  };

  const handleUpdateEventCards = async (cards: EventCard[]) => {
    const res = await saveEventCardsToSupabase(cards);
    if (!res.success) {
      showToast(res.error || 'Event card update failed.', 'error');
      return;
    }
    const fresh = await fetchEventCardsFromSupabase();
    if (fresh) setEventCards(fresh);
    showToast('Event cards saved to Supabase database!', 'success');
  };

  const handleUpdateJerseyShowcase = async (newSettings: JerseyShowcaseSettings) => {
    const res = await saveJerseyShowcaseToSupabase(newSettings);
    if (!res.success) {
      showToast(res.error || 'Jersey showcase update failed.', 'error');
      return;
    }
    const fresh = await fetchJerseyShowcaseFromSupabase();
    if (fresh) setJerseyShowcaseSettings(fresh);
    showToast('Jersey Showcase settings saved to Supabase database!', 'success');
  };

  // ============================================================================
  // 4. REGISTRATION SUPABASE PERSISTENCE HANDLERS
  // ============================================================================

  const handleSuccessSubmit = (newRecord: InvitationRecord) => {
    setInvitations(prev => [newRecord, ...prev.filter(x => x.registrationNo !== newRecord.registrationNo)]);
    showToast(`Registration ${newRecord.registrationNo} successfully stored in Supabase!`, 'success');
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
    const res = await updateRegistrationStatusInSupabase(registrationNo, newStatus, reason);
    if (!res.success) {
      showToast(res.error || 'Registration status update failed.', 'error');
      return;
    }

    setInvitations(prev =>
      prev.map(item =>
        item.registrationNo === registrationNo
          ? {
              ...item,
              ...(res.data || {}),
              status: newStatus,
              rejectionReason: reason || item.rejectionReason,
            }
          : item
      )
    );

    showToast(
      newStatus === 'approved'
        ? `Registration ${registrationNo} approved in Supabase.`
        : `Registration ${registrationNo} rejected in Supabase.`,
      'success'
    );
  };

  const handleDeleteRegistration = async (registrationNo: string) => {
    const res = await deleteRegistrationFromSupabase(registrationNo);
    if (res.success) {
      setInvitations(prev => prev.filter(item => item.registrationNo !== registrationNo));
      showToast(`Registration ${registrationNo} permanently deleted from Supabase. Registration numbers are never reused.`, 'success');
    } else {
      showToast(res.error || 'Delete failed.', 'error');
    }
  };

  const handleEditRegistration = async (
    registrationNo: string,
    updates: Partial<InvitationRecord>
  ) => {
    const res = await updateRegistrationDetailsInSupabase(registrationNo, updates);
    if (!res.success) {
      showToast(res.error || 'Registration update failed.', 'error');
      return;
    }
    setInvitations(prev =>
      prev.map(item =>
        item.registrationNo === registrationNo ? { ...item, ...(res.data || updates) } : item
      )
    );
    showToast(`Registration ${registrationNo} updated in Supabase database.`, 'success');
  };


  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#111827] selection:bg-[#5B5FEF] selection:text-white relative">
      {/* Floating Database Notification Toast */}
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* 1. Sticky/Fixed Navbar */}
      <Navbar
        activeTab={activeTab}
        onNavigate={tab => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        websiteLogo={brandingSettings.websiteLogo}
        eventName={websiteSettings.eventName}
      />

      {/* Main Content Area */}
      <div className="pt-16 sm:pt-18 flex-1 flex flex-col">
        {/* Optional Announcement Banner */}
        {websiteSettings.bannerActive && websiteSettings.bannerText && (
          <aside
            aria-label="Announcement"
            className="w-full bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{websiteSettings.bannerText}</span>
          </aside>
        )}

        <main className="flex-1">
          {/* ======================================================== */}
          {/* HOMEPAGE STRUCTURE (Super Admin Controlled Reordering) */}
          {/* ======================================================== */}
          {activeTab === 'home' && (
            <div className="animate-fadeIn">
              {/* 1. Hero Section */}
              <HeroSection
                onRegisterClick={() => {
                  setActiveTab('register');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onInvitationClick={() => {
                  setActiveTab('invitation');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                websiteSettings={websiteSettings}
                brandingSettings={brandingSettings}
                jerseySettings={jerseyShowcaseSettings}
              />

              {/* Dynamic Section Ordering between Jersey Showcase & Event Cards */}
              {jerseyShowcaseSettings.sectionOrder === 'showcase_first' ? (
                <>
                  {/* Option A: Hero -> Jersey Showcase -> Event Cards */}
                  {jerseyShowcaseSettings.enabled && (
                    <JerseyShowcaseSection
                      settings={jerseyShowcaseSettings}
                      onRegisterClick={() => {
                        setActiveTab('register');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}
                  <EventInformationSection cards={eventCards} />
                </>
              ) : (
                <>
                  {/* Option B: Hero -> Event Cards -> Jersey Showcase */}
                  <EventInformationSection cards={eventCards} />
                  {jerseyShowcaseSettings.enabled && (
                    <JerseyShowcaseSection
                      settings={jerseyShowcaseSettings}
                      onRegisterClick={() => {
                        setActiveTab('register');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}
                </>
              )}

              {/* 3. Register Now Button Section */}
              <section className="py-8 sm:py-12 text-center">
                <div className="max-w-md mx-auto px-4">
                  <button
                    onClick={() => {
                      setActiveTab('register');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#5B5FEF] text-white font-extrabold text-base shadow-xl shadow-[#5B5FEF]/30 hover:shadow-2xl hover:shadow-[#5B5FEF]/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-200 cursor-pointer group"
                  >
                    <span>Register Now</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <p className="text-xs text-slate-500 mt-2.5">
                    Registration closes on {websiteSettings.lastRegDate} · Limited batch custom print slots
                  </p>
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
                onNavigateToRegister={() => {
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
      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        invitations={invitations}
        onUpdateStatus={handleUpdateRegistrationStatus}
        onDeleteRegistration={handleDeleteRegistration}
        onEditRegistration={handleEditRegistration}
        websiteSettings={websiteSettings}
        onUpdateWebsiteSettings={handleUpdateWebsiteSettings}
        brandingSettings={brandingSettings}
        onUpdateBrandingSettings={handleUpdateBrandingSettings}
        pdfSettings={pdfSettings}
        onUpdatePdfSettings={handleUpdatePdfSettings}
        paymentSettings={paymentSettings}
        onUpdatePaymentSettings={handleUpdatePaymentSettings}
        eventCards={eventCards}
        onUpdateEventCards={handleUpdateEventCards}
        jerseyShowcaseSettings={jerseyShowcaseSettings}
        onUpdateJerseyShowcase={handleUpdateJerseyShowcase}
      />
    </div>
  );
}
