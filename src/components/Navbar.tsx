import React, { useState } from 'react';
import { Ticket, UserCheck, Menu, X, Bell } from 'lucide-react';

interface NavbarProps {
  activeTab: 'home' | 'register' | 'invitation';
  onNavigate: (tab: 'home' | 'register' | 'invitation') => void;
  websiteLogo?: string;
  eventName?: string;
  onOpenNotice?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onNavigate,
  websiteLogo,
  eventName = 'RD27 Rag Day 2027',
  onOpenNotice,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'home' | 'register' | 'invitation') => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/80 backdrop-blur-2xl border-b border-white/70 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-200">
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
            <span className="font-display text-xs sm:text-base font-extrabold tracking-tight text-slate-900 leading-tight group-hover:text-[#5B5FEF] transition-colors truncate max-w-[120px] xs:max-w-[190px] sm:max-w-xs md:max-w-none">
              {eventName}
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Batch 2027 Portal
            </span>
          </div>
        </button>

        {/* Center: Desktop Nav Items with Frosted Glass Navigation Pill */}
        <nav className="hidden md:flex items-center justify-center gap-1.5 p-1 rounded-2xl bg-slate-100/60 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9)] absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-white text-[#5B5FEF] font-bold shadow-xs border border-white/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('invitation')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'invitation'
                ? 'bg-white text-[#5B5FEF] font-bold shadow-xs border border-white/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Invitation Card Download</span>
          </button>

          <button
            onClick={() => handleNavClick('register')}
            className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-[#5B5FEF] text-white shadow-md shadow-[#5B5FEF]/30 ring-2 ring-[#5B5FEF]/30'
                : 'bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] hover:from-[#4d51d4] hover:to-[#6858f2] text-white shadow-sm shadow-[#5B5FEF]/25 hover:shadow-md'
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
              className="px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white/95 text-[#4F46E5] border border-violet-200/70 shadow-xs backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Important Notice"
            >
              <Bell className="w-3.5 h-3.5 text-[#4F46E5]" />
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
              className="p-1.5 text-[#4F46E5] bg-white/80 hover:bg-white border border-violet-200/60 rounded-lg shadow-xs backdrop-blur-md transition-colors cursor-pointer"
              title="Important Notice"
              aria-label="Important Notice"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => handleNavClick('register')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent hover:border-slate-200/60 focus:outline-none cursor-pointer transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/70 bg-white/90 backdrop-blur-2xl px-4 py-4 space-y-2 shadow-xl animate-fadeIn">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'home'
                ? 'bg-[#5B5FEF]/10 text-[#5B5FEF]'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('invitation')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-colors ${
              activeTab === 'invitation'
                ? 'bg-[#5B5FEF]/10 text-[#5B5FEF]'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <span>Invitation Card Download</span>
            <Ticket className="w-4 h-4 text-[#5B5FEF]" />
          </button>

          <button
            onClick={() => handleNavClick('register')}
            className="w-full text-center px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#5B5FEF] to-[#7A6CFF] text-white shadow-md flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Register Now</span>
          </button>
        </div>
      )}
    </header>
  );
};
