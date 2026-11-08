import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Ticket } from 'lucide-react';
import { WebsiteSettings, BrandingSettings, JerseyShowcaseSettings } from '../types';
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
  return (
    <section className="relative pt-8 pb-12 overflow-hidden">
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
        <div className="max-w-4xl mx-auto flex flex-col items-start text-left">
          {/* Event Logo & Category Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-[0_4px_16px_rgba(91,95,239,0.06),inset_0_1px_1px_rgba(255,255,255,1)] backdrop-blur-xl mb-5">
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

          {/* Event Name - Formatted strictly matching Screen 01 reference */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#10143C] leading-[1.08] mb-4">
            RAG DAY of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#11C8F4] via-[#00D4FF] to-[#7138F5]">
              NIC 27
            </span>
          </h1>

          {/* Event Description */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-6 font-medium">
            {websiteSettings.eventDescription || 'Celebrate our journey together with us.'}
          </p>

          {/* Quick Meta Badges matching Reference Image 1 */}
          <div className="flex flex-col gap-2.5 mb-6">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/85 border border-white/95 shadow-[0_4px_16px_rgba(15,23,42,0.04),inset_0_1px_1px_white] text-xs font-semibold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-[#7138F5] shadow-xs" />
                {websiteSettings.eventDate}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/85 border border-white/95 shadow-[0_4px_16px_rgba(15,23,42,0.04),inset_0_1px_1px_white] text-xs font-semibold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-[#11C8F4] shadow-xs" />
                {websiteSettings.venue}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7138F5]/10 border border-[#7138F5]/30 text-xs font-bold text-[#7138F5] shadow-2xs">
                Fee: {websiteSettings.registrationFee}
              </span>
            </div>
          </div>

          {/* Dynamic Event Countdown Timer */}
          {websiteSettings.countdownEnabled !== false && (
            <EventCountdown
              day={websiteSettings.eventDay}
              month={websiteSettings.eventMonth}
              year={websiteSettings.eventYear}
              time={websiteSettings.eventTime}
              fallbackDateStr={websiteSettings.eventDate}
              eventName={websiteSettings.eventName}
            />
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-1">
            <button
              onClick={onRegisterClick}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#7138F5] via-[#5224D8] to-[#11C8F4] text-white font-extrabold text-sm sm:text-base shadow-[0_14px_36px_-6px_rgba(113,56,245,0.4),inset_0_1.5px_1.5px_rgba(255,255,255,0.4)] hover:shadow-[0_20px_45px_-6px_rgba(113,56,245,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <span>Register Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={onInvitationClick}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/85 hover:bg-white text-slate-800 hover:text-slate-950 font-extrabold text-sm sm:text-base border border-white/95 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.06),inset_0_1.5px_1px_white] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-[#7138F5]" />
              <span>Check Invitation Card</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
