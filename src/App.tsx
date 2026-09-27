import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { EventInformationSection } from './components/EventInformationSection';
import { RegistrationForm } from './components/RegistrationForm';
import { InvitationCardPage } from './components/InvitationCardPage';
import { Footer } from './components/Footer';
import { AdminPortal } from './components/AdminPortal';
import { JerseyShowcaseSection } from './components/JerseyShowcaseSection';
import { INITIAL_INVITATIONS, DEFAULT_EVENT_CARDS, DEFAULT_WEBSITE_SETTINGS, DEFAULT_BRANDING_SETTINGS, DEFAULT_PDF_SETTINGS, DEFAULT_PAYMENT_SETTINGS, DEFAULT_JERSEY_SHOWCASE_SETTINGS } from './data/mockData';
import { InvitationRecord, InvitationStatus, SiteContentRow, WebsiteSettings, BrandingSettings, PdfSettings, PaymentSettings, EventCard, JerseyShowcaseSettings } from './types';
import { supabase, fetchSiteContentFromSupabase, fetchRegistrationsFromSupabase, mapSiteContent, saveSiteContentToSupabase, updateRegistrationStatusInSupabase, deleteRegistrationFromSupabase, updateRegistrationDetailsInSupabase } from './lib/supabase';
import { ArrowRight, Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home'|'register'|'invitation'>('home');
  const [invitations, setInvitations] = useState<InvitationRecord[]>(INITIAL_INVITATIONS);
  const [invitationSearchTarget, setInvitationSearchTarget] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContentRow | null>(null);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>(DEFAULT_PDF_SETTINGS);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [eventCards, setEventCards] = useState<EventCard[]>(DEFAULT_EVENT_CARDS);
  const [jerseyShowcaseSettings, setJerseyShowcaseSettings] = useState<JerseyShowcaseSettings>(DEFAULT_JERSEY_SHOWCASE_SETTINGS);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'|'info'}|null>(null);

  const showToast = (message:string,type:'success'|'error'|'info'='success') => {
    setToast({message,type});
    window.setTimeout(()=>setToast(prev=>prev?.message===message?null:prev),4000);
  };

  const applySiteContent = (row: SiteContentRow) => {
    const mapped = mapSiteContent(row);
    setSiteContent(row);
    setWebsiteSettings(mapped.website);
    setBrandingSettings(mapped.branding);
    setPaymentSettings(mapped.payment);
    setPdfSettings(mapped.pdf);
    setEventCards(mapped.cards);
    setJerseyShowcaseSettings(mapped.jerseyShowcase);
    document.title = mapped.website.eventName;
    if (mapped.branding.favicon) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (!link) { link = document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
      link.href = mapped.branding.favicon;
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [site, regs] = await Promise.all([fetchSiteContentFromSupabase(), fetchRegistrationsFromSupabase()]);
        if (!mounted) return;
        if (site) applySiteContent(site);
        if (regs.data) setInvitations(regs.data);
      } catch (error) {
        console.warn('Initial Supabase load failed:', error);
        showToast('Supabase data could not be loaded; showing safe local defaults.', 'info');
      }
    };
    void load();

    const channel = supabase
      .channel('ragday27-core')
      .on('postgres_changes',{event:'*',schema:'public',table:'site_content'}, async () => {
        try { const row = await fetchSiteContentFromSupabase(); if (row && mounted) applySiteContent(row); } catch(e) { console.error(e); }
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'registrations'}, async () => {
        try { const rows = await fetchRegistrationsFromSupabase(); if (mounted) setInvitations(rows.data); } catch(e) { console.error(e); }
      })
      .subscribe();

    return () => { mounted=false; void supabase.removeChannel(channel); };
  }, []);

  const handleSiteContentSave = async (next: SiteContentRow) => {
    try {
      const saved = await saveSiteContentToSupabase(next);
      applySiteContent(saved);
      showToast('Website content saved to Supabase.', 'success');
    } catch (error:any) {
      showToast(error?.message || 'Could not save website content.', 'error');
      throw error;
    }
  };

  const handleSuccessSubmit = (record: InvitationRecord) => {
    setInvitations(prev => [record, ...prev.filter(item => item.registrationNo !== record.registrationNo)]);
    showToast('Registration ' + record.registrationNo + ' successfully stored.', 'success');
  };

  const handleUpdateRegistrationStatus = async (registrationNo:string,status:InvitationStatus,reason?:string) => {
    try {
      await updateRegistrationStatusInSupabase(registrationNo,status,reason);
      const refreshed = await fetchRegistrationsFromSupabase();
      setInvitations(refreshed.data);
      showToast('Registration ' + registrationNo + ' updated.', 'success');
    } catch(error:any) {
      showToast(error?.message || 'Registration update failed.', 'error');
      throw error;
    }
  };

  const handleDeleteRegistration = async (registrationNo:string) => {
    try {
      await deleteRegistrationFromSupabase(registrationNo);
      const refreshed = await fetchRegistrationsFromSupabase();
      setInvitations(refreshed.data);
      showToast('Rejected registration ' + registrationNo + ' deleted. Its number remains consumed by the sequence.', 'success');
    } catch(error:any) {
      showToast(error?.message || 'Registration deletion failed.', 'error');
      throw error;
    }
  };

  const handleEditRegistration = async (registrationNo:string, updates:Partial<InvitationRecord>) => {
    try {
      await updateRegistrationDetailsInSupabase(registrationNo,updates);
      const refreshed = await fetchRegistrationsFromSupabase();
      setInvitations(refreshed.data);
      showToast('Registration ' + registrationNo + ' updated.', 'success');
    } catch(error:any) {
      showToast(error?.message || 'Registration edit failed.', 'error');
      throw error;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#111827] selection:bg-[#5B5FEF] selection:text-white relative">
      {toast && <aside aria-label="Notification" className="fixed top-20 right-4 z-[100] max-w-sm animate-slideDown shadow-2xl rounded-2xl p-4 border flex items-center gap-3 backdrop-blur-xl bg-white/95 text-slate-900 border-slate-200">
        {toast.type==='success' && <CheckCircle2 className="w-5 h-5 text-emerald-600"/>}
        {toast.type==='error' && <AlertCircle className="w-5 h-5 text-rose-600"/>}
        {toast.type==='info' && <Info className="w-5 h-5 text-indigo-600"/>}
        <div className="flex-1 text-xs sm:text-sm font-semibold">{toast.message}</div>
        <button onClick={()=>setToast(null)} aria-label="Close notification"><X className="w-4 h-4"/></button>
      </aside>}

      <Navbar activeTab={activeTab} onNavigate={tab=>{setActiveTab(tab);window.scrollTo({top:0,behavior:'smooth'});}} websiteLogo={brandingSettings.websiteLogo} eventName={websiteSettings.eventName}/>

      <div className="pt-16 sm:pt-18 flex-1 flex flex-col">
        {websiteSettings.bannerActive && websiteSettings.bannerText && <aside aria-label="Announcement" className="w-full bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center justify-center gap-2"><Bell className="w-3.5 h-3.5"/><span className="truncate">{websiteSettings.bannerText}</span></aside>}

        <main className="flex-1">
          {activeTab==='home' && <div className="animate-fadeIn">
            <HeroSection
              onRegisterClick={()=>{setActiveTab('register');window.scrollTo({top:0,behavior:'smooth'});}}
              onInvitationClick={()=>{setActiveTab('invitation');window.scrollTo({top:0,behavior:'smooth'});}}
              websiteSettings={websiteSettings}
              brandingSettings={brandingSettings}
              jerseySettings={jerseyShowcaseSettings}
            />
            {jerseyShowcaseSettings.sectionOrder==='showcase_first' ? <>
              {jerseyShowcaseSettings.enabled && <JerseyShowcaseSection settings={jerseyShowcaseSettings} onRegisterClick={()=>setActiveTab('register')}/>}
              <EventInformationSection cards={eventCards}/>
            </> : <>
              <EventInformationSection cards={eventCards}/>
              {jerseyShowcaseSettings.enabled && <JerseyShowcaseSection settings={jerseyShowcaseSettings} onRegisterClick={()=>setActiveTab('register')}/>}
            </>}
            <section className="py-8 sm:py-12 text-center"><div className="max-w-md mx-auto px-4"><button onClick={()=>setActiveTab('register')} className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#5B5FEF] text-white font-extrabold text-base shadow-xl shadow-[#5B5FEF]/30"><span>Register Now</span><ArrowRight className="w-4 h-4"/></button><p className="text-xs text-slate-500 mt-2.5">Registration closes on {websiteSettings.lastRegDate || 'the published deadline'}</p></div></section>
          </div>}

          {activeTab==='register' && <RegistrationForm onSuccessSubmit={handleSuccessSubmit} onGoToInvitation={(regNo)=>{setInvitationSearchTarget(regNo);setActiveTab('invitation');}} paymentSettings={paymentSettings} sections={siteContent?.sections || []}/>}
          {activeTab==='invitation' && <InvitationCardPage invitations={invitations} initialSearchRegNo={invitationSearchTarget} onNavigateToRegister={()=>setActiveTab('register')} pdfSettings={pdfSettings} websiteSettings={websiteSettings}/>}
        </main>
      </div>

      <Footer onOpenAdmin={()=>setIsAdminOpen(true)} websiteSettings={websiteSettings} brandingSettings={brandingSettings}/>

      <AdminPortal
        isOpen={isAdminOpen}
        onClose={()=>setIsAdminOpen(false)}
        invitations={invitations}
        onUpdateStatus={handleUpdateRegistrationStatus}
        onDeleteRegistration={handleDeleteRegistration}
        onEditRegistration={handleEditRegistration}
        websiteSettings={websiteSettings}
        onUpdateWebsiteSettings={async()=>{}}
        brandingSettings={brandingSettings}
        onUpdateBrandingSettings={async()=>{}}
        pdfSettings={pdfSettings}
        onUpdatePdfSettings={async()=>{}}
        paymentSettings={paymentSettings}
        onUpdatePaymentSettings={async()=>{}}
        eventCards={eventCards}
        onUpdateEventCards={async()=>{}}
        jerseyShowcaseSettings={jerseyShowcaseSettings}
        onUpdateJerseyShowcase={async()=>{}}
        siteContent={siteContent}
        onSaveSiteContent={handleSiteContentSave}
      />
    </div>
  );
}
