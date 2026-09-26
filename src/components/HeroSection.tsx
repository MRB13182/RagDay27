import React, { useState } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Ticket } from 'lucide-react';
import { WebsiteSettings, BrandingSettings, JerseyShowcaseSettings } from '../types';
import heroJerseyImg from '../assets/images/white_hero_jersey_1790359567080.jpg';
import { EventCountdown } from './EventCountdown';

interface HeroSectionProps {
  onRegisterClick: () => void;
  onInvitationClick: () => void;
  websiteSettings: WebsiteSettings;
  brandingSettings: BrandingSettings;
  jerseySettings?: JerseyShowcaseSettings;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onRegisterClick,
  onInvitationClick,
  websiteSettings,
  brandingSettings,
  jerseySettings,
}) => {
  const [heroViewMode, setHeroViewMode] = useState<'front' | 'back'>('back');

  const activeJersey = jerseySettings?.jerseys?.[0];
  const isShowcaseEnabled = jerseySettings ? jerseySettings.enabled : true;

  const currentHeroImage =
    heroViewMode === 'front'
      ? activeJersey?.frontImage || activeJersey?.backImage || brandingSettings.heroBanner || heroJerseyImg
      : activeJersey?.backImage || activeJersey?.frontImage || brandingSettings.heroBanner || heroJerseyImg;
  return (
    <section className="relative pt-6 pb-8 overflow-hidden">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#5B5FEF]/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-24 right-10 w-96 h-96 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {brandingSettings.heroBackground && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none -z-10"
          style={{ backgroundImage: `url(${brandingSettings.heroBackground})` }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Event Details & CTAs */}
          <div className={`${isShowcaseEnabled ? 'lg:col-span-7' : 'lg:col-span-12 max-w-4xl'} flex flex-col items-start text-left`}>
            {/* Event Logo & Category Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 shadow-sm backdrop-blur-md mb-5">
              {brandingSettings.websiteLogo ? (
                <img
                  src={brandingSettings.websiteLogo}
                  alt="Logo"
                  className="w-5 h-5 rounded-md object-contain"
                />
              ) : (
                <div className="w-5 h-5 rounded-md bg-[#5B5FEF] flex items-center justify-center text-white text-[10px] font-bold">
                  27
                </div>
              )}
              <span className="text-xs font-semibold text-slate-800 tracking-wide">
                Annual Grand Farewell · Rag Day 2027
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
            </div>

            {/* Event Name - Configured from Admin */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-4">
              {websiteSettings.eventName.includes('(') ? (
                <>
                  {websiteSettings.eventName.split('(')[0]}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#00D4FF]">
                    ({websiteSettings.eventName.split('(')[1]}
                  </span>
                </>
              ) : (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#00D4FF]">
                  {websiteSettings.eventName}
                </span>
              )}
            </h1>

            {/* Event Description - Configured from Admin */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-6">
              {websiteSettings.eventDescription}
            </p>

            {/* Quick Meta Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#5B5FEF]" />
                {websiteSettings.eventDate}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
                {websiteSettings.venue}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B5FEF]/10 border border-[#5B5FEF]/20 text-xs font-bold text-[#5B5FEF] shadow-sm">
                Fee: {websiteSettings.registrationFee}
              </span>
            </div>

            {/* Dynamic Event Countdown Timer (Configured by Super Admin) */}
            <EventCountdown
              day={websiteSettings.eventDay}
              month={websiteSettings.eventMonth}
              year={websiteSettings.eventYear}
              time={websiteSettings.eventTime}
              fallbackDateStr={websiteSettings.eventDate}
              eventName={websiteSettings.eventName}
            />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#5B5FEF] text-white font-semibold text-sm sm:text-base shadow-lg shadow-[#5B5FEF]/30 hover:shadow-xl hover:shadow-[#5B5FEF]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={onInvitationClick}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-slate-700 font-semibold text-sm sm:text-base border border-slate-200/90 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Ticket className="w-4 h-4 text-[#5B5FEF]" />
                <span>Check Invitation Card</span>
              </button>
            </div>

            {/* Quick Inclusions Note */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Custom Printed Jersey
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Grand Gala Feast
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5B5FEF]" /> Gate Entry Pass
              </span>
            </div>
          </div>

          {/* Right Column: Hero Visual Jersey Mockup (Only rendered when showcase enabled) */}
          {isShowcaseEnabled && (
            <div className="lg:col-span-5 relative flex items-center justify-center">
              {/* Outer Glow Disc */}
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-tr from-[#5B5FEF]/20 via-[#7A6CFF]/20 to-[#00D4FF]/20 rounded-full blur-2xl pointer-events-none" />

              {/* Main Jersey Card Container */}
              <div className="relative w-full max-w-md rounded-3xl p-4 bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_20px_50px_rgba(91,95,239,0.15)] transition-all duration-300 hover:shadow-[0_25px_60px_rgba(91,95,239,0.22)]">
                {/* Top Glass Ribbon */}
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/60 border border-slate-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-800">
                      {activeJersey?.badgeText || 'Signature Batch Edition'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Front / Back Toggle if both images exist */}
                    {activeJersey?.frontImage && activeJersey?.backImage && (
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setHeroViewMode('front')}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            heroViewMode === 'front' ? 'bg-white text-[#5B5FEF] shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          F
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeroViewMode('back')}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            heroViewMode === 'back' ? 'bg-white text-[#5B5FEF] shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          B
                        </button>
                      </div>
                    )}
                    <span className="text-[11px] font-mono font-bold text-[#5B5FEF] bg-[#5B5FEF]/10 px-2.5 py-0.5 rounded-full">
                      {activeJersey?.tagText || 'RD27'}
                    </span>
                  </div>
                </div>

                {/* Jersey Photo Showcase */}
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center shadow-inner group">
                  <img
                    src={currentHeroImage}
                    alt={activeJersey?.name || 'RD27 Official Jersey Mockup'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                    <div className="text-white">
                      <p className="text-[11px] font-medium text-slate-300">
                        {activeJersey?.subtitle || 'Custom Squad Kit'}
                      </p>
                      <p className="text-sm font-bold tracking-wide">
                        {activeJersey?.title || 'Back Name & Number Print Included'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating Card Overlays */}
                <div className="hidden sm:flex absolute -bottom-3 -left-2 sm:-left-4 p-2.5 sm:p-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-lg items-center gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#5B5FEF] to-[#7A6CFF] text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {activeJersey?.badge1 || 'Custom Fit'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {activeJersey?.badge1Sub || 'Sizes S to 4XL'}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex absolute -top-3 -right-2 sm:-right-4 p-2.5 sm:p-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-lg items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00D4FF]" />
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {activeJersey?.badge2 || '100% Cotton & Mesh'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
