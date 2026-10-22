import React, { useState } from 'react';
import { Ticket, UserCheck, Menu, X, Bell } from 'lucide-react';
import { GenderType } from '../types';

interface NavbarProps {
  activeTab: 'home' | 'register' | 'invitation';
  onNavigate: (tab: 'home' | 'register' | 'invitation') => void;
  websiteLogo?: string;
  eventName?: string;
  onOpenNotice?: () => void;
  themeGender?: GenderType;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onNavigate,
  websiteLogo,
  eventName = 'RD27 Rag Day 2027',
  onOpenNotice,
  themeGender: _themeGender,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'home' | 'register' | 'invitation') => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  // Global navigation always keeps the standard white/purple brand theme.
  const isMaleTheme = false;
  const isFemaleTheme = false;

  const headerBgClass = isFemaleTheme
    ? 'bg-[#15051B]/90 backdrop-blur-2xl border-b border-[#4A195E]/70 shadow-[0_4px_30px_rgba(0,0,0,0.4)] text-white'
    : isMaleTheme
    ? 'bg-[#070F1E]/90 backdrop-blur-2xl border-b border-[#1E3A5F]/70 shadow-[0_4px_30px_rgba(0,0,0,0.4)] text-white'
    : 'bg-white/80 backdrop-blur-2xl border-b border-white/70 shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-slate-900';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${headerBgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between relative">
        {/* Left: Logo: RD27 Rag Day 2027 */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none group transition-transform hover:scale-[1.01] cursor-pointer z-10"
        >
          {websiteLogo ? (
            <img
              src={websiteLogo}
              alt="Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs border border-white/90 bg-white/70 backdrop-blur-md p-0.5"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#5B5FEF] via-[#7A6CFF] to-[#00D4FF] p-[1.5px] shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0F172A] rounded-[10px] flex items-center justify-center">
                <span className="font-display font-extrabold text-white text-xs sm:text-sm tracking-wider">
                  RD<span className="text-[#00D4FF]">27</span>
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className={`font-display text-xs sm:text-base font-extrabold tracking-tight leading-tight transition-colors truncate max-w-[120px] xs:max-w-[190px] sm:max-w-xs md:max-w-none ${
              isFemaleTheme ? 'text-white group-hover:text-[#EC4899]' : isMaleTheme ? 'text-white group-hover:text-[#38BDF8]' : 'text-slate-900 group-hover:text-[#5B5FEF]'
            }`}>
              {eventName}
            </span>
            <span className={`text-[10px] font-medium tracking-wide flex items-center gap-1 ${
              isFemaleTheme ? 'text-pink-300/70' : isMaleTheme ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Batch 2027 Portal
            </span>
          </div>
        </button>

        {/* Center: Desktop Nav Items with Frosted Glass Navigation Pill */}
        <nav className={`hidden md:flex items-center justify-center gap-1.5 p-1 rounded-2xl backdrop-blur-md absolute left-1/2 -translate-x-1/2 transition-colors ${
          isFemaleTheme
            ? 'bg-[#240A30]/85 border border-[#4A195E]/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1)]'
            : isMaleTheme
            ? 'bg-[#0B1A35]/85 border border-[#1E3A5F]/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1)]'
            : 'bg-slate-100/60 border border-white/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9)]'
        }`}>
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'home'
                ? isFemaleTheme
                  ? 'bg-white text-[#EC4899] font-bold shadow-xs'
                  : isMaleTheme
                  ? 'bg-white text-[#0284C7] font-bold shadow-xs'
                  : 'bg-white text-[#5B5FEF] font-bold shadow-xs border border-white/90'
                : isFemaleTheme
                ? 'text-pink-200/80 hover:text-white hover:bg-white/10'
                : isMaleTheme
                ? 'text-slate-300 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('invitation')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'invitation'
                ? isFemaleTheme
                  ? 'bg-white text-[#EC4899] font-bold shadow-xs'
                  : isMaleTheme
                  ? 'bg-white text-[#0284C7] font-bold shadow-xs'
                  : 'bg-white text-[#5B5FEF] font-bold shadow-xs border border-white/90'
                : isFemaleTheme
                ? 'text-pink-200/80 hover:text-white hover:bg-white/10'
                : isMaleTheme
                ? 'text-slate-300 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Invitation Card Download</span>
          </button>

          <button
            onClick={() => handleNavClick('register')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              isFemaleTheme
                ? 'bg-gradient-to-r from-[#D91B74] to-[#EC4899] text-white shadow-md shadow-pink-500/30'
                : isMaleTheme
                ? 'bg-gradient-to-r from-[#0070F3] to-[#00D2FF] text-white shadow-md shadow-cyan-500/30'
                : activeTab === 'register'
                ? 'bg-[#5B5FEF] text-white shadow-md shadow-[#5B5FEF]/30 ring-2 ring-[#5B5FEF]/30'
                : 'bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white shadow-sm'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Register Now</span>
          </button>
        </nav>

        {/* Desktop Right Notice Trigger */}
        {onOpenNotice && (
          <div className="hidden md:flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={onOpenNotice}
              className={`px-3 py-1.5 rounded-xl border shadow-xs backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                isFemaleTheme
                  ? 'bg-[#240A30]/80 hover:bg-[#240A30] text-pink-300 border-[#4A195E]'
                  : isMaleTheme
                  ? 'bg-[#0B1A35]/80 hover:bg-[#0B1A35] text-sky-300 border-[#1E3A5F]'
                  : 'bg-white/70 hover:bg-white/95 text-[#4F46E5] border-violet-200/70'
              }`}
              title="Important Notice"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Notice</span>
            </button>
          </div>
        )}

        {/* Mobile Right Controls */}
        <div className="flex items-center gap-1.5 md:hidden">
          {onOpenNotice && (
            <button
              type="button"
              onClick={onOpenNotice}
              className={`p-1.5 border rounded-lg shadow-xs backdrop-blur-md transition-colors cursor-pointer ${
                isFemaleTheme
                  ? 'text-pink-300 bg-[#240A30]/80 border-[#4A195E]'
                  : isMaleTheme
                  ? 'text-sky-300 bg-[#0B1A35]/80 border-[#1E3A5F]'
                  : 'text-[#4F46E5] bg-white/80 border-violet-200/60'
              }`}
              title="Important Notice"
              aria-label="Important Notice"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => handleNavClick('register')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer ${
              isFemaleTheme
                ? 'bg-gradient-to-r from-[#D91B74] to-[#EC4899] text-white shadow-pink-500/25'
                : isMaleTheme
                ? 'bg-gradient-to-r from-[#0070F3] to-[#00D2FF] text-white shadow-cyan-500/25'
                : 'bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            className={`p-2 rounded-lg border border-transparent focus:outline-none cursor-pointer transition-colors ${
              isFemaleTheme
                ? 'text-pink-200 hover:text-white hover:bg-white/10'
                : isMaleTheme
                ? 'text-slate-300 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t px-4 py-4 space-y-2 shadow-xl animate-fadeIn ${
          isFemaleTheme
            ? 'border-[#4A195E]/80 bg-[#15051B]/95 backdrop-blur-2xl text-white'
            : isMaleTheme
            ? 'border-[#1E3A5F]/80 bg-[#070F1E]/95 backdrop-blur-2xl text-white'
            : 'border-white/70 bg-white/90 backdrop-blur-2xl text-slate-900'
        }`}>
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'home'
                ? isFemaleTheme ? 'bg-pink-500/20 text-[#EC4899]' : isMaleTheme ? 'bg-sky-500/20 text-[#38BDF8]' : 'bg-[#5B5FEF]/10 text-[#5B5FEF]'
                : isFemaleTheme ? 'text-pink-100 hover:bg-white/10' : isMaleTheme ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('invitation')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-colors ${
              activeTab === 'invitation'
                ? isFemaleTheme ? 'bg-pink-500/20 text-[#EC4899]' : isMaleTheme ? 'bg-sky-500/20 text-[#38BDF8]' : 'bg-[#5B5FEF]/10 text-[#5B5FEF]'
                : isFemaleTheme ? 'text-pink-100 hover:bg-white/10' : isMaleTheme ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <span>Invitation Card Download</span>
            <Ticket className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleNavClick('register')}
            className={`w-full text-center px-4 py-3 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 ${
              isFemaleTheme
                ? 'bg-gradient-to-r from-[#D91B74] to-[#EC4899] text-white shadow-pink-500/30'
                : isMaleTheme
                ? 'bg-gradient-to-r from-[#0070F3] to-[#00D2FF] text-white shadow-cyan-500/30'
                : 'bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Register Now</span>
          </button>
        </div>
      )}
    </header>
  );
};
