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
    ? 'w-full mt-auto py-5 px-4 sm:px-6 lg:px-8 border-t border-[#4A195E]/70 bg-[#15051B]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.4)] text-pink-200/60'
    : isMaleTheme
    ? 'w-full mt-auto py-5 px-4 sm:px-6 lg:px-8 border-t border-[#1E3A5F]/70 bg-[#070F1E]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.4)] text-slate-400'
    : 'w-full mt-auto py-5 px-4 sm:px-6 lg:px-8 border-t border-white/80 bg-white/75 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)] text-slate-500';

  return (
    <footer className={footerClass}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs font-medium text-slate-500">
        {/* Left: Branding Logo (if available) */}
        <div className="flex items-center gap-2">
          {brandingSettings?.footerLogo && (
            <img
              src={brandingSettings.footerLogo}
              alt="Footer Logo"
              className="w-5 h-5 rounded object-contain"
            />
          )}
        </div>

        {/* Center: Dynamic Single Source of Truth Footer Text from footer-text.txt */}
        <div
          className={`flex-1 text-center font-medium leading-relaxed [&_.footer-divider]:mx-1.5 ${
            isFemaleTheme
              ? 'text-pink-200/80 [&_a]:text-pink-400 [&_a]:font-semibold [&_a:hover]:underline [&_.footer-divider]:text-pink-400/40'
              : isMaleTheme
              ? 'text-slate-300/80 [&_a]:text-[#38BDF8] [&_a]:font-semibold [&_a:hover]:underline [&_.footer-divider]:text-slate-500'
              : 'text-slate-600 [&_a]:text-[#5B5FEF] [&_a]:font-semibold [&_a:hover]:underline [&_.footer-divider]:text-slate-400'
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizeFooterHtml(footerContent) }}
        />

        {/* Right: Glassmorphism Admin Icon */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onOpenAdmin}
            aria-label="Admin Portal"
            className={`w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 ${
              isFemaleTheme
                ? 'bg-[#240A2F]/90 hover:bg-[#381149] text-pink-300 hover:text-white border border-[#4A195E]/80 shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                : isMaleTheme
                ? 'bg-[#0E1A30]/90 hover:bg-[#162847] text-slate-300 hover:text-cyan-300 border border-[#1E3A5F]/80 shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                : 'bg-white/70 hover:bg-white text-slate-500 hover:text-indigo-600 border border-white/90 hover:border-indigo-200 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_white] hover:shadow-[0_4px_14px_rgba(91,95,239,0.18)]'
            }`}
            title="Admin Login & Committee Access"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
