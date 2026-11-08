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
  themeGender,
}) => {
  const footerContent = websiteSettings?.footerText || '© 2027 Rag Day 27 Committee. All Rights Reserved.';

  const isFemaleTheme = themeGender === 'female';
  const isMaleTheme = themeGender === 'male' || themeGender === 'choose_one';

  const footerClass = isFemaleTheme
    ? 'w-full mt-auto py-6 px-4 sm:px-6 lg:px-8 border-t border-[#4A195E]/70 bg-[#15051B]/95 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.4)] text-pink-200/60'
    : isMaleTheme
    ? 'w-full mt-auto py-6 px-4 sm:px-6 lg:px-8 border-t border-[#1E3A5F]/70 bg-[#070F1E]/95 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.4)] text-slate-400'
    : 'w-full mt-auto py-6 px-4 sm:px-6 lg:px-8 border-t border-white/85 bg-white/80 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(15,23,42,0.03),inset_0_1px_1.5px_white] text-slate-500';

  return (
    <footer className={footerClass}>
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-3 text-xs font-medium text-slate-500 py-2">
        {/* Branding Logo (if available) */}
        {brandingSettings?.footerLogo && (
          <div className="flex items-center justify-center">
            <img
              src={brandingSettings.footerLogo}
              alt="Footer Logo"
              className="w-6 h-6 rounded object-contain"
            />
          </div>
        )}

        {/* Dynamic Single Source of Truth Footer Text */}
        <div
          className={`text-center font-medium leading-relaxed max-w-xl mx-auto [&_.footer-divider]:mx-1.5 ${
            isFemaleTheme
              ? 'text-pink-200/80 [&_a]:text-pink-400 [&_a]:font-semibold [&_a:hover]:underline [&_.footer-divider]:text-pink-400/40'
              : isMaleTheme
              ? 'text-slate-300/80 [&_a]:text-[#38BDF8] [&_a]:font-semibold [&_a:hover]:underline [&_.footer-divider]:text-slate-500'
              : 'text-slate-600 [&_a]:text-[#7138F5] [&_a]:font-semibold [&_a:hover]:underline [&_.footer-divider]:text-slate-400'
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizeFooterHtml(footerContent) }}
        />

        {/* Centered Glassmorphism Admin Lock Button matching Reference Screen 04 & 12 */}
        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={onOpenAdmin}
            aria-label="Admin Portal"
            className={`w-9 h-9 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 ${
              isFemaleTheme
                ? 'bg-[#240A2F]/90 hover:bg-[#381149] text-pink-300 hover:text-white border border-[#4A195E]/80 shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                : isMaleTheme
                ? 'bg-[#0E1A30]/90 hover:bg-[#162847] text-slate-300 hover:text-cyan-300 border border-[#1E3A5F]/80 shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                : 'bg-white/80 hover:bg-white text-slate-500 hover:text-[#7138F5] border border-white/95 shadow-[0_4px_12px_rgba(15,23,42,0.05),inset_0_1px_1px_white]'
            }`}
            title="Admin Login & Committee Access"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
