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
  DEFAULT_EVENT_CARDS,
  DEFAULT_WEBSITE_SETTINGS,
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_PDF_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_JERSEY_SHOWCASE_SETTINGS,
} from './data/mockData';
import type {
  InvitationRecord,
  InvitationStatus,
  EventCard,
  WebsiteSettings,
  BrandingSettings,
  PdfSettings,
  PaymentSettings,
  JerseyShowcaseSettings,
  SiteContentRow,
} from './types';
import {
  fetchSiteContent,
  saveSiteContent,
  extractWebsiteSettings,
  extractBrandingSettings,
  extractPaymentSettings,
  extractPdfSettings,
  extractEventCards,
  extractJerseyShowcase,
  getRegistrationList,
  approveRegistration,
  rejectRegistration,
  deleteRegistration,
  updateRegistrationDetails,
  saveWebsiteSettings,
  saveBrandingSettings,
  savePaymentSettings,
  savePdfSettings,
  saveEventCards,
  saveJerseyShowcase,
} from './services';
import { supabase } from './lib/supabase';
import { ArrowRight, Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'invitation'>('home');
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [invitationSearchTarget, setInvitationSearchTarget] = useState<string>('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Canonical Site Content from public.site_content
  const [siteContent, setSiteContent] = useState<SiteContentRow | null>(null);

  // Derived Admin Controlled Settings
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
    }, 4500);
  };

  // Helper to load all canonical data from Supabase
  const loadAllData = async () => {
    try {
      const content = await fetchSiteContent();
      if (content) {
        setSiteContent(content);
        setWebsiteSettings(extractWebsiteSettings(content));
        setBrandingSettings(extractBrandingSettings(content));
        setPaymentSettings(extractPaymentSettings(content));
        setPdfSettings(extractPdfSettings(content));
        setEventCards(extractEventCards(content));
        setJerseyShowcaseSettings(extractJerseyShowcase(content));
      }

      const regResult = await getRegistrationList();
      if (regResult.success) {
        setInvitations(regResult.data);
      }
    } catch (err) {
      console.warn('Initial Supabase fetch notice:', err);
    }
  };

  // ============================================================================
  // 1. FETCH ALL DATA DIRECTLY FROM SUPABASE ON INITIAL MOUNT
  // ============================================================================
  useEffect(() => {
    loadAllData();

    // ==========================================================================
    // 2. REAL-TIME SUBSCRIPTION TO SUPABASE DATABASE CHANGES
    // ==========================================================================
    const channel = supabase
      .channel('public:realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, async () => {
        const res = await getRegistrationList();
        if (res.success) setInvitations(res.data);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content' }, async () => {
        const fresh = await fetchSiteContent();
        if (fresh) {
          setSiteContent(fresh);
          setWebsiteSettings(extractWebsiteSettings(fresh));
          setBrandingSettings(extractBrandingSettings(fresh));
          setPaymentSettings(extractPaymentSettings(fresh));
          setPdfSettings(extractPdfSettings(fresh));
          setEventCards(extractEventCards(fresh));
          setJerseyShowcaseSettings(extractJerseyShowcase(fresh));
        }
      })
      .subscribe();

    return () => {
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
  // 3. ADMIN SITE CONTENT SUPABASE PERSISTENCE HANDLERS
  // ============================================================================

  const handleSaveSiteContent = async (newContent: SiteContentRow) => {
    const res = await saveSiteContent(newContent);
    if (res.success && res.data) {
      setSiteContent(res.data);
      setWebsiteSettings(extractWebsiteSettings(res.data));
      setBrandingSettings(extractBrandingSettings(res.data));
      setPaymentSettings(extractPaymentSettings(res.data));
      setPdfSettings(extractPdfSettings(res.data));
      setEventCards(extractEventCards(res.data));
      setJerseyShowcaseSettings(extractJerseyShowcase(res.data));
      showToast('Site content saved to Supabase database!', 'success');
    } else {
      showToast(res.errorMessage || 'Failed to save site content.', 'error');
    }
  };

  const handleUpdateWebsiteSettings = async (newSettings: WebsiteSettings) => {
    const res = await saveWebsiteSettings(newSettings);
    if (res.success && res.data) {
      setWebsiteSettings(res.data);
      showToast('Website and event settings saved to database!', 'success');
    } else {
      showToast(res.errorMessage || 'Failed to save website settings.', 'error');
    }
  };

  const handleUpdateBrandingSettings = async (newSettings: BrandingSettings) => {
    const res = await saveBrandingSettings(newSettings, websiteSettings.eventName);
    if (res.success && res.data) {
      setBrandingSettings(res.data);
      showToast('Visual branding assets saved to database!', 'success');
    } else {
      showToast(res.errorMessage || 'Failed to save branding assets.', 'error');
    }
  };

  const handleUpdatePaymentSettings = async (newPaymentSettings: PaymentSettings) => {
    const res = await savePaymentSettings(newPaymentSettings);
    if (res.success && res.data) {
      setPaymentSettings(res.data);
      showToast('Payment settings saved to database!', 'success');
    } else {
      showToast(res.errorMessage || 'Failed to save payment settings.', 'error');
    }
  };

  const handleUpdatePdfSettings = async (newSettings: PdfSettings) => {
    const res = await savePdfSettings(newSettings);
    if (res.success && res.data) {
      setPdfSettings(res.data);
      showToast('PDF Ledger settings saved to database!', 'success');
    } else {
      showToast(res.errorMessage || 'Failed to save PDF settings.', 'error');
    }
  };

  const handleUpdateEventCards = async (cards: EventCard[]) => {
    const res = await saveEventCards(cards);
    if (res.success && res.data) {
      setEventCards(res.data);
      showToast('Event cards saved to database!', 'success');
    } else {
      showToast(res.errorMessage || 'Failed to save event cards.', 'error');
    }
  };

  const handleUpdateJerseyShowcase = async (newSettings: JerseyShowcaseSettings) => {
    const res = await saveJerseyShowcase(newSettings);
    if (res.success && res.data) {
      setJerseyShowcaseSettings(res.data);
      showToast('Jersey Showcase settings saved to database!', 'success');
    } else {
      showToast(res.errorMessage || 'Failed to save jersey showcase settings.', 'error');
    }
  };

  // ============================================================================
  // 4. REGISTRATION SUPABASE PERSISTENCE HANDLERS
  // ============================================================================

  const handleSuccessSubmit = async (newRecord: InvitationRecord) => {
    // Refetch database list after successful registration
    const listRes = await getRegistrationList();
    if (listRes.success) {
      setInvitations(listRes.data);
    } else {
      setInvitations(prev => [newRecord, ...prev.filter(x => x.registrationNo !== newRecord.registrationNo)]);
    }
    showToast(`Registration successfully stored in Supabase!`, 'success');
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
        showToast(`Registration ${registrationNo} approved in Supabase!`, 'success');
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
        showToast(`Registration ${registrationNo} rejected in Supabase.`, 'success');
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
      showToast(`Registration ${registrationNo} deleted from Supabase.`, 'success');
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
      showToast(`Registration ${registrationNo} updated in Supabase database!`, 'success');
      const fresh = await getRegistrationList();
      if (fresh.success) setInvitations(fresh.data);
    } else {
      showToast(res.errorMessage || `Failed to update registration ${registrationNo}`, 'error');
    }
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
      {isAdminOpen && (
        <AdminPortal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          invitations={invitations}
          onUpdateStatus={handleUpdateRegistrationStatus}
          onDeleteRegistration={handleDeleteRegistration}
          onEditRegistration={handleEditRegistration}
          siteContent={siteContent}
          onSaveSiteContent={handleSaveSiteContent}
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
      )}
    </div>
  );
}
