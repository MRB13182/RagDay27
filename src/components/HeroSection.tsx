import React from 'react';
import { ArrowRight, Ticket } from 'lucide-react';
import { WebsiteSettings, BrandingSettings, JerseyShowcaseSettings } from '../types';
import { EventCountdown } from './EventCountdown';

interface HeroSectionProps {
  onRegisterClick: () => void;
  onInvitationClick: () => void;
  onExploreBatchClick?: () => void;
  websiteSettings: WebsiteSettings;
  brandingSettings: BrandingSettings;
  jerseySettings?: JerseyShowcaseSettings;
}

const REFERENCE_CAMPUS_SCENE = '/assets/aistudio/file_00000000f018821194c55f34f60c8caa_8ca85e77.png';

export const HeroSection: React.FC<HeroSectionProps> = ({
  onRegisterClick,
  onInvitationClick,
  onExploreBatchClick,
  websiteSettings,
  brandingSettings,
}) => {
  return (
    <section
      id="hero-stage"
      className="relative pt-6 sm:pt-10 pb-14 sm:pb-20 overflow-hidden bg-[#08090D]"
    >
      {/* Prominent National Ideal College Building Architectural Backdrop */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Desktop & Tablet Wide Architectural Positioning (Center-Right prominently framing National Ideal College) */}
        <div
          className="absolute inset-y-0 right-0 w-full lg:w-[68%] opacity-80 sm:opacity-90"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 18%, rgba(0,0,0,0.95) 42%, black 100%), linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, black 22%, black 70%, transparent 100%)',
            WebkitMaskComposite: 'source-in',
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 18%, rgba(0,0,0,0.95) 42%, black 100%), linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, black 22%, black 70%, transparent 100%)',
            maskComposite: 'intersect',
          }}
        >
          <svg
            viewBox="1084 94 580 250"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className="w-full h-full object-cover"
          >
            <image
              href={REFERENCE_CAMPUS_SCENE}
              width="1672"
              height="941"
            />
          </svg>
        </div>

        {/* Soft Ice-Blue Architectural Portal Illumination Behind Center Monument */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 46% 52% at 62% 38%, rgba(139, 234, 255, 0.14) 0%, rgba(139, 234, 255, 0.04) 48%, transparent 74%)',
          }}
        />

        {brandingSettings.heroBackground && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-screen"
            style={{ backgroundImage: `url(${brandingSettings.heroBackground})` }}
          />
        )}

        {/* Measured Contrast Scrim — Dark Behind Editorial Text Only, Leaving College Architecture Crisp & Recognizable */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0.78) 34%, rgba(8,9,13,0.38) 62%, rgba(8,9,13,0.22) 100%), linear-gradient(180deg, rgba(8,9,13,0.52) 0%, rgba(8,9,13,0.10) 38%, rgba(8,9,13,0.72) 78%, #08090D 100%)',
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

            {/* Unboxed Architectural Metadata Strip */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs font-mono text-[#C9D0D9] border-y border-[#C9D0D9]/20 py-2.5 mb-7 w-full max-w-xl tabular-nums bg-[rgba(12,17,25,0.42)] backdrop-blur-sm px-3 rounded-lg">
              <span className="text-[#F5F7FA] font-semibold">{websiteSettings.eventDate}</span>
              <span aria-hidden="true" className="text-[#626B79]">·</span>
              <span>{websiteSettings.venue}</span>
              <span aria-hidden="true" className="text-[#626B79]">·</span>
              <span className="text-[#8BEAFF] font-bold">Fee: {websiteSettings.registrationFee}</span>
            </div>

            {/* Hero Action Buttons — Matches Reference CTA Hierarchy while preserving Pass Check */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg glass-button-primary font-extrabold text-xs sm:text-sm uppercase tracking-[0.12em] flex items-center justify-center gap-2.5 group cursor-pointer whitespace-nowrap"
              >
                <span>Enter The Experience</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={onExploreBatchClick || onInvitationClick}
                className="w-full sm:w-auto px-5 py-3.5 rounded-lg glass-button font-bold text-xs sm:text-sm uppercase tracking-[0.12em] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Explore Our Batch</span>
              </button>
            </div>

            {/* Immediate Pass Verification & Download Access */}
            <button
              type="button"
              onClick={onInvitationClick}
              className="mt-4 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-[#C9D0D9] hover:text-[#8BEAFF] transition-colors cursor-pointer group"
            >
              <Ticket className="w-3.5 h-3.5 text-[#8BEAFF]" />
              <span>Check &amp; Download Invitation Card</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-[#8BEAFF]" />
            </button>
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

        {/* Dynamic Event Countdown ("THE DIGITAL TIME CAPSULE") */}
        {websiteSettings.countdownEnabled !== false && (
          <div className="pt-2 sm:pt-4 border-t border-[#C9D0D9]/18">
            <div className="pt-8 sm:pt-10">
              <EventCountdown
                day={websiteSettings.eventDay}
                month={websiteSettings.eventMonth}
                year={websiteSettings.eventYear}
                time={websiteSettings.eventTime}
                fallbackDateStr={websiteSettings.eventDate}
                eventName={websiteSettings.eventName}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
