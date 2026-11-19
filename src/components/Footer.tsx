import React from 'react';
import { Lock } from 'lucide-react';
import { WebsiteSettings, BrandingSettings, GenderType } from '../types';

interface FooterProps {
  onOpenAdmin: () => void;
  websiteSettings: WebsiteSettings;
  brandingSettings: BrandingSettings;
  themeGender?: GenderType;
}

function sanitizeFooterHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAdmin,
  websiteSettings,
  brandingSettings,
}) => {
  const footerContent =
    websiteSettings?.footerText ||
    '© 2027 Rag Day 27 Committee. All Rights Reserved. • Crafted with ❤️ by MD. Moshiur Rahman for NIC 27';

  return (
    <footer className="w-full mt-auto px-3 sm:px-6 lg:px-8 pb-5 pt-4">
      <div className="max-w-7xl mx-auto min-w-0 rounded-2xl glass-surface px-4 sm:px-7 py-5 sm:py-7">
        {/* Upper Footer Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-5 lg:gap-6 text-center lg:text-left">
          {/* Upper Identity */}
          <div className="lg:col-span-4 min-w-0 flex items-center justify-center lg:justify-start gap-3">
            {brandingSettings?.footerLogo && (
              <div className="w-9 h-9 rounded-lg border border-[#C9D0D9]/24 bg-[#0B0E13]/85 p-1.5 shrink-0 flex items-center justify-center shadow-[inset_0_1px_0_rgba(245,247,250,0.10)]">
                <img
                  src={brandingSettings.footerLogo}
                  alt="NIC Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0 max-w-full text-left">
              <div className="font-display text-xs sm:text-sm font-extrabold uppercase tracking-[0.10em] sm:tracking-[0.14em] text-[#F5F7FA] leading-snug break-words [overflow-wrap:anywhere]">
                National Ideal College
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.26em] text-[#8BEAFF] mt-0.5">
                Ragday 27
              </div>
            </div>
          </div>

          {/* Main Statement */}
          <div className="lg:col-span-4 min-w-0 text-center border-y lg:border-y-0 lg:border-x border-[#C9D0D9]/18 py-3.5 lg:py-1 px-3 sm:px-4">
            <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.22em] text-[#C9D0D9]/95 leading-relaxed">
              We leave the classroom.
              <br />
              We keep the memories.
            </p>
          </div>

          {/* Brand Statement */}
          <div className="lg:col-span-4 min-w-0 flex items-center justify-center lg:justify-end">
            <span className="relative inline-block max-w-full text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[#F5F7FA] pb-1.5 text-center lg:text-right leading-relaxed break-words [overflow-wrap:anywhere]">
              NIC 27 — Forever Connected.
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8BEAFF] via-[#8BEAFF]/70 to-transparent shadow-[0_0_10px_rgba(139,234,255,0.5)]"
              />
            </span>
          </div>
        </div>

        {/* Lower Copyright & Credit Row with Inline Minimal Admin Lock Icon */}
        <div className="mt-5 pt-4 border-t border-[#C9D0D9]/14 flex min-w-0 items-center justify-center text-center">
          <p className="max-w-full min-w-0 text-[10px] sm:text-xs text-[#C9D0D9]/85 font-medium leading-relaxed break-words [overflow-wrap:anywhere]">
            <span
              className="[&_a]:text-[#8BEAFF] [&_a]:font-semibold [&_a:hover]:underline [&_.footer-divider]:mx-1.5 [&_.footer-divider]:text-[#8993A1]"
              dangerouslySetInnerHTML={{ __html: sanitizeFooterHtml(footerContent) }}
            />
            <button
              type="button"
              onClick={onOpenAdmin}
              aria-label="Admin Panel Access"
              title="Admin Login & Committee Access"
              className="inline-flex w-5 h-5 items-center justify-center align-middle ml-1 shrink-0 p-0 text-[#C9D0D9]/85 hover:text-[#8BEAFF] bg-transparent border-0 rounded transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8BEAFF]"
            >
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
};
