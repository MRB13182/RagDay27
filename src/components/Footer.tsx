import React from 'react';
import { Lock } from 'lucide-react';
import { WebsiteSettings, BrandingSettings } from '../types';

interface FooterProps {
  onOpenAdmin: () => void;
  websiteSettings: WebsiteSettings;
  brandingSettings: BrandingSettings;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAdmin,
  brandingSettings,
}) => {
  return (
    <footer className="w-full mt-auto py-5 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs font-medium text-slate-500">
        {/* Left: © 2027 RD27 */}
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          {brandingSettings.footerLogo && (
            <img
              src={brandingSettings.footerLogo}
              alt="Footer Logo"
              className="w-5 h-5 rounded object-contain"
            />
          )}
          <span>© 2027 RD27</span>
        </div>

        {/* Center: All Rights Reserved. */}
        <div className="text-center font-medium text-slate-500">
          <span>All Rights Reserved.</span>
        </div>

        {/* Right: Glassmorphism Admin Icon */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onOpenAdmin}
            aria-label="Admin Portal"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-900/5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(91,95,239,0.15)] backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95"
            title="Admin Login & Committee Access"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
