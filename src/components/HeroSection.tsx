import React from 'react';
import { CalendarDays, MapPin, CreditCard } from 'lucide-react';
import { WebsiteSettings, BrandingSettings, JerseyShowcaseSettings } from '../types';
import { EventCountdown } from './EventCountdown';
import nicBuildingImg from '../../nic.png';
import { InfoCard } from './ui';

interface HeroSectionProps {
  onRegisterClick?: () => void;
  onInvitationClick?: () => void;
  onExploreBatchClick?: () => void;
  websiteSettings: WebsiteSettings;
  brandingSettings: BrandingSettings;
  jerseySettings?: JerseyShowcaseSettings;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  websiteSettings,
  brandingSettings,
}) => {
  return (
    <section
      id="hero-stage"
      className="relative pt-6 sm:pt-10 pb-14 sm:pb-20 overflow-hidden bg-[#08090D]"
    >
      {/* Main Background Illustration: Authentic National Ideal College Building (nic.png) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Responsive Building Frame: Centered on Mobile/Tablet, Elegantly Anchored Right on Desktop */}
        <div
          className="absolute inset-x-0 top-2 bottom-20 mx-auto w-[94%] max-w-[420px] sm:max-w-[520px] lg:inset-x-auto lg:left-auto lg:right-4 xl:right-10 lg:top-4 lg:bottom-16 lg:w-[48%] lg:max-w-[640px] flex items-center justify-center lg:justify-end"
          style={{
            WebkitMaskImage:
              'radial-gradient(ellipse 78% 76% at 50% 50%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0) 96%)',
            maskImage:
              'radial-gradient(ellipse 78% 76% at 50% 50%, rgba(0,0,0,1) 42%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0) 96%)',
          }}
        >
          <img
            src={nicBuildingImg}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="w-full h-full object-contain object-center lg:object-right opacity-[0.20] sm:opacity-[0.22] brightness-105 contrast-105 select-none"
          />
        </div>

        {/* Soft Blue Ambient Gradient Wash */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 62% 58% at 50% 42%, rgba(139, 234, 255, 0.12) 0%, rgba(28, 86, 138, 0.16) 46%, transparent 78%)',
          }}
        />

        {brandingSettings.heroBackground && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-screen"
            style={{ backgroundImage: `url(${brandingSettings.heroBackground})` }}
          />
        )}

        {/* Desktop Directional Scrim Behind Left Editorial Typography Only */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,9,13,0.90) 0%, rgba(8,9,13,0.68) 38%, rgba(8,9,13,0.10) 70%, rgba(8,9,13,0.28) 100%)',
          }}
        />

        {/* Subtle Top/Bottom Edge Seamless Blend Across All Breakpoints */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(8,9,13,0.62) 0%, rgba(8,9,13,0.18) 26%, rgba(8,9,13,0.22) 72%, #08090D 100%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Asymmetric Museum Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center pt-4 sm:pt-8 pb-10 sm:pb-12">
          {/* Left Editorial Column */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Supporting Institutional Text */}
            <div className="space-y-1 mb-5">
              <div className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-[0.28em] text-[#C9D0D9]">
                National Ideal College
              </div>
              <div className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.24em] text-[#8BEAFF]">
                Ragday Celebration — Batch 2027.
              </div>
            </div>

            {/* Museum Editorial Headline */}
            <div className="mb-5">
              <p className="font-editorial italic text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.08] text-[#F5F7FA] drop-shadow-[0_6px_20px_rgba(0,0,0,0.85)]">
                THE LAST CHAPTER.
                <br />
                THE FOREVER MEMORIES.
              </p>
              <div className="w-28 h-[2px] bg-gradient-to-r from-[#8BEAFF] via-[#8BEAFF]/65 to-transparent mt-4 shadow-[0_0_16px_rgba(139,234,255,0.65)]" />
            </div>

            {/* Dynamic Event Title & Description */}
            <h1 className="sr-only">{websiteSettings.eventName || 'RAG DAY of NIC 27'}</h1>
            <p className="text-sm sm:text-base text-[#C9D0D9] leading-relaxed max-w-xl mb-5 font-normal">
              {websiteSettings.eventDescription || 'Celebrate our final chapter at National Ideal College — built in memory, cast in silver.'}
            </p>

            {/* Three independent event information glass cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-5 w-full max-w-2xl">
              <InfoCard
                icon={<CalendarDays className="w-4 h-4" />}
                label="Date"
                value={websiteSettings.eventDate}
                accent="ice"
              />
              <InfoCard
                icon={<MapPin className="w-4 h-4" />}
                label="Venue"
                value={websiteSettings.venue}
                accent="silver"
              />
              <InfoCard
                icon={<CreditCard className="w-4 h-4" />}
                label="Fee"
                value={websiteSettings.registrationFee}
                accent="ice"
              />
            </div>

            {/* Single Dynamic Event Countdown positioned in place of removed CTA buttons */}
            {websiteSettings.countdownEnabled !== false && (
              <div className="w-full max-w-2xl">
                <EventCountdown
                  targetIso={websiteSettings.targetEventIso}
                  day={websiteSettings.eventDay}
                  month={websiteSettings.eventMonth}
                  year={websiteSettings.eventYear}
                  time={websiteSettings.eventTime}
                  fallbackDateStr={websiteSettings.eventDate}
                  eventName={websiteSettings.eventName}
                />
              </div>
            )}

          </div>

          {/* Right/Center Sculptural Liquid-Chrome RAGDAY 27 Portal Monument */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center text-center relative py-6 sm:py-8">
            <div
              aria-hidden="true"
              className="relative flex flex-col items-center justify-center"
            >
              {/* Concentric Obsidian-Glass Architectural Portal Rings */}
              <div className="absolute -inset-8 sm:-inset-14 rounded-full border border-[#8BEAFF]/25 bg-[radial-gradient(circle_at_center,rgba(139,234,255,0.16)_0%,rgba(12,17,25,0.48)_54%,transparent_75%)] pointer-events-none" />
              <div className="absolute -inset-3 sm:-inset-6 rounded-full border border-[#C9D0D9]/24 pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center px-6 py-4">
                {brandingSettings.websiteLogo && (
                  <div className="mb-3 w-11 h-11 rounded-full border border-[#8BEAFF]/40 bg-[rgba(12,17,25,0.72)] p-1.5 backdrop-blur-md shadow-[0_0_24px_rgba(139,234,255,0.24)]">
                    <img
                      src={brandingSettings.websiteLogo}
                      alt="NIC Crest"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <span className="font-display text-3xl sm:text-5xl lg:text-[3.6rem] font-extrabold uppercase tracking-[0.14em] chrome-text leading-none select-none">
                  RAGDAY
                </span>
                <span
                  className="font-display text-[6.75rem] sm:text-[9.25rem] lg:text-[11rem] font-extrabold leading-[0.82] tracking-tighter chrome-text select-none -mt-1 sm:-mt-2"
                >
                  27
                </span>

                {/* Reflective Obsidian Portal Plinth Ring */}
                <div className="mt-4 w-52 sm:w-72 h-[2px] bg-gradient-to-r from-transparent via-[#8BEAFF]/80 to-transparent shadow-[0_0_18px_rgba(139,234,255,0.7)]" />
                <span className="mt-3 text-[10px] sm:text-xs font-mono uppercase tracking-[0.34em] text-[#8BEAFF]">
                  {websiteSettings.eventName || 'RAG DAY of NIC 27'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
