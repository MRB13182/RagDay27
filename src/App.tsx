import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EventInformationSection } from './components/EventInformationSection';
import { RegistrationForm } from './components/RegistrationForm';
import { InvitationCardPage } from './components/InvitationCardPage';
import { Footer } from './components/Footer';
import { AdminPortal } from './components/AdminPortal';
import {
  INITIAL_INVITATIONS,
  DEFAULT_EVENT_CARDS,
  DEFAULT_WEBSITE_SETTINGS,
  DEFAULT_BRANDING_SETTINGS,
  DEFAULT_PDF_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
} from './data/mockData';
import {
  InvitationRecord,
  InvitationStatus,
  EventCard,
  WebsiteSettings,
  BrandingSettings,
  PdfSettings,
  PaymentSettings,
} from './types';
import { ArrowRight, Bell } from 'lucide-react';

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

  // Handler to update payment settings and keep website fee displays synchronized
  const handleUpdatePaymentSettings = (newPaymentSettings: PaymentSettings) => {
    setPaymentSettings(newPaymentSettings);
    const formattedFee = `${newPaymentSettings.registrationFee} ${newPaymentSettings.currency}`;
    setWebsiteSettings(prev => ({
      ...prev,
      registrationFee: formattedFee,
    }));
    setEventCards(prev =>
      prev.map(c =>
        c.id === 'card-3' || c.title.toLowerCase().includes('fee')
          ? { ...c, description: formattedFee }
          : c
      )
    );
  };

  const handleSuccessSubmit = (newRecord: InvitationRecord) => {
    setInvitations(prev => [newRecord, ...prev]);
  };

  const handleGoToInvitation = (regNo: string) => {
    setInvitationSearchTarget(regNo);
    setActiveTab('invitation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateRegistrationStatus = (
    registrationNo: string,
    newStatus: InvitationStatus,
    reason?: string
  ) => {
    setInvitations(prev =>
      prev.map(item =>
        item.registrationNo === registrationNo
          ? {
              ...item,
              status: newStatus,
              rejectionReason: reason || item.rejectionReason,
              seatZone:
                newStatus === 'approved'
                  ? item.seatZone || 'Zone A - Amphitheatre Front Row'
                  : item.seatZone,
              gate:
                newStatus === 'approved'
                  ? item.gate || 'Gate 02 (North Pavilion)'
                  : item.gate,
            }
          : item
      )
    );
  };

  const handleDeleteRegistration = (registrationNo: string) => {
    setInvitations(prev => prev.filter(item => item.registrationNo !== registrationNo));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#111827] selection:bg-[#5B5FEF] selection:text-white">
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
          {/* HOMEPAGE STRUCTURE: */}
          {/* Navbar -> Hero -> Event Information Cards -> Register Button -> Footer */}
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
              />

              {/* 2. Event Information Cards (Admin Controlled) */}
              <EventInformationSection cards={eventCards} />

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
        websiteSettings={websiteSettings}
        onUpdateWebsiteSettings={setWebsiteSettings}
        brandingSettings={brandingSettings}
        onUpdateBrandingSettings={setBrandingSettings}
        pdfSettings={pdfSettings}
        onUpdatePdfSettings={setPdfSettings}
        paymentSettings={paymentSettings}
        onUpdatePaymentSettings={handleUpdatePaymentSettings}
        eventCards={eventCards}
        onUpdateEventCards={setEventCards}
      />
    </div>
  );
}
