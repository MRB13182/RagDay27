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
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-6">
            {websiteSettings.eventDescription}
          </p>

          {/* Quick Meta Badges */}
          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-xl border border-white/90 text-xs font-semibold text-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_1px_white]">
              <span className="w-2 h-2 rounded-full bg-[#5B5FEF]" />
              {websiteSettings.eventDate}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/80 backdrop-blur-xl border border-white/90 text-xs font-semibold text-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.03),inset_0_1px_1px_white]">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
              {websiteSettings.venue}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5B5FEF]/10 backdrop-blur-xl border border-[#5B5FEF]/20 text-xs font-bold text-[#5B5FEF] shadow-xs">
              Fee: {websiteSettings.registrationFee}
            </span>
          </div>

          {/* Dynamic Event Countdown Timer (Configured by Super Admin) */}
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
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2">
            <button
              onClick={onRegisterClick}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#5B5FEF] via-[#7A6CFF] to-[#5B5FEF] text-white font-semibold text-sm sm:text-base shadow-lg shadow-[#5B5FEF]/30 hover:shadow-xl hover:shadow-[#5B5FEF]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <span>Register Now</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={onInvitationClick}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/80 backdrop-blur-xl text-slate-700 hover:text-slate-900 font-semibold text-sm sm:text-base border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_1px_white] hover:bg-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-[#5B5FEF]" />
              <span>Check Invitation Card</span>
            </button>
          </div>

          {/* Official jersey design preview */}
          {jerseySettings?.enabled && jerseySettings.designCards?.length > 0 && (
            <div className="w-full mt-7 sm:mt-9">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#5B5FEF]">Official Merchandise</p>
                  <h2 className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900">Rag Day Jersey Design</h2>
                </div>
                <span className="shrink-0 rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-[10px] sm:text-xs font-bold text-indigo-700 shadow-sm">NIC 27</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jerseySettings.designCards.slice(0, 2).map((design, index) => (
                  <div
                    key={design.id}
                    className="overflow-hidden rounded-2xl border border-white/90 bg-white/80 shadow-[0_14px_35px_rgba(91,95,239,0.10)] backdrop-blur-xl"
                  >
                    <div className="relative aspect-[5/4] bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-3 sm:p-4">
                      <img
                        src={design.image || '/src/assets/images/jersey-one.png'}
                        alt={design.title || 'Rag Day jersey design'}
                        loading="lazy"
                        className="h-full w-full object-contain"
                        onError={event => {
                          const image = event.currentTarget;
                          if (!image.dataset.fallbackApplied) {
                            image.dataset.fallbackApplied = 'true';
                            image.src = '/src/assets/images/jersey-one.png';
                          }
                        }}
                      />
                      <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
                        {index === 0 ? 'Official Design' : 'Design Preview'}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <h3 className="font-extrabold text-sm text-slate-900">{design.title || 'Official Rag Day Jersey'}</h3>
                      {design.description && <p className="mt-1 text-xs leading-relaxed text-slate-600">{design.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Inclusions Note */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-md border border-white/80 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Custom Printed Jersey
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-md border border-white/80 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Grand Gala Feast
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-md border border-white/80 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5B5FEF]" /> Gate Entry Pass
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
