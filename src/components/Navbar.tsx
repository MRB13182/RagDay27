import React, { useState } from 'react';
import { Ticket, UserPlus, Menu, X } from 'lucide-react';
import { GenderType } from '../types';

interface NavbarProps {
  activeTab: 'home' | 'register' | 'invitation' | 'gallery';
  activeSection?: 'home' | 'our-story' | 'events' | 'batch';
  onNavigate: (tab: 'home' | 'register' | 'invitation' | 'gallery', sectionId?: string) => void;
  websiteLogo?: string;
  eventName?: string;
  themeGender?: GenderType;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  activeSection = 'home',
  onNavigate,
  websiteLogo,
  eventName = 'RAG DAY of NIC 27',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavClick = (tab: 'home' | 'register' | 'invitation' | 'gallery', sectionId?: string) => {
    onNavigate(tab, sectionId);
    setMenuOpen(false);
  };

  const primaryTitle = /rag\s*day.*nic\s*27/i.test(eventName) ? 'RAGDAY 27' : eventName;

  const centerItems: {
    key: string;
    label: string;
    tab: 'home' | 'gallery';
    isActive: boolean;
  }[] = [
    {
      key: 'home',
      label: 'Home',
      tab: 'home',
      isActive: activeTab === 'home' && activeSection === 'home',
    },
    {
      key: 'gallery',
      label: 'Gallery',
      tab: 'gallery',
      isActive: activeTab === 'gallery',
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full px-2 sm:px-6 lg:px-8 pt-2 sm:pt-3">
      <div className="max-w-7xl mx-auto rounded-2xl glass-navbar px-2.5 sm:px-5 lg:px-6 h-[3.6rem] sm:h-[4.25rem] flex items-center justify-between gap-2 sm:gap-4 relative">
        {/* Left: Institutional Brand Lockup — Never Truncated */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-1.5 sm:gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8BEAFF] rounded-xl group cursor-pointer z-10 shrink-0"
        >
          {websiteLogo ? (
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-[#C9D0D9]/25 bg-[#0C1119]/85 p-1 shrink-0 flex items-center justify-center shadow-[inset_0_1px_0_rgba(245,247,250,0.12)]">
              <img
                src={websiteLogo}
                alt="National Ideal College Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-[#8BEAFF]/40 bg-[#0C1119]/85 flex items-center justify-center shrink-0">
              <span className="font-display font-extrabold text-[#F5F7FA] text-[10px] sm:text-xs tracking-wider">
                NIC<span className="text-[#8BEAFF]">27</span>
              </span>
            </div>
          )}

          <div className="flex flex-col shrink-0">
            <span className="font-display text-[10.5px] sm:text-sm lg:text-[15px] font-extrabold tracking-[0.08em] sm:tracking-[0.14em] uppercase text-[#F5F7FA] group-hover:text-[#8BEAFF] transition-colors whitespace-nowrap leading-none">
              {primaryTitle}
            </span>
            <span className="text-[7.5px] sm:text-[10px] font-semibold tracking-[0.05em] sm:tracking-[0.18em] uppercase text-[#C9D0D9]/85 group-hover:text-[#F5F7FA] transition-colors whitespace-nowrap leading-none mt-1">
              National Ideal College
            </span>
          </div>
        </button>

        {/* Center: Clean Editorial Desktop Navigation */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center justify-center gap-2 xl:gap-5"
        >
          {centerItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavClick(item.tab, item.sectionId)}
              aria-current={item.isActive ? 'page' : undefined}
              className={`relative py-2 px-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:text-[#8BEAFF] ${
                item.isActive
                  ? 'text-[#F5F7FA]'
                  : 'text-[#C9D0D9]/80 hover:text-[#F5F7FA]'
              }`}
            >
              <span>{item.label}</span>
              {item.isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 left-1.5 right-1.5 h-[2px] bg-[#8BEAFF] shadow-[0_0_12px_#8BEAFF]"
                />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNavClick('invitation')}
            aria-current={activeTab === 'invitation' ? 'page' : undefined}
            className={`relative py-2 px-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:text-[#8BEAFF] ${
              activeTab === 'invitation'
                ? 'text-[#F5F7FA]'
                : 'text-[#C9D0D9]/80 hover:text-[#F5F7FA]'
            }`}
          >
            <span>Invitation Card Download</span>
            {activeTab === 'invitation' && (
              <span aria-hidden="true" className="absolute bottom-0.5 left-1.5 right-1.5 h-[2px] bg-[#8BEAFF] shadow-[0_0_12px_#8BEAFF]" />
            )}
          </button>
        </nav>

        {/* Right Controls: Register Button + Hamburger Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
          <button
            type="button"
            onClick={() => handleNavClick('register')}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.08em] sm:tracking-[0.14em] rounded-full glass-button-primary flex items-center gap-1 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Register</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full border border-[#C9D0D9]/24 bg-[rgba(12,17,25,0.68)] hover:border-[#8BEAFF]/55 text-[#F5F7FA] hover:text-[#8BEAFF] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8BEAFF] cursor-pointer transition-colors shrink-0 shadow-[inset_0_1px_0_rgba(245,247,250,0.1)]"
          >
            {menuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Obsidian Glass Navigation & Portal Drawer */}
      {menuOpen && (
        <div className="mt-2 max-w-7xl mx-auto lg:flex lg:justify-end">
          <div className="w-full lg:w-[26rem] rounded-2xl glass-modal p-3.5 sm:p-4 space-y-1.5 animate-fadeIn">
            {centerItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item.tab)}
                aria-current={item.isActive ? 'page' : undefined}
                className={`w-full min-w-0 text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-[0.14em] transition-colors cursor-pointer ${
                  item.isActive
                    ? 'bg-[#8BEAFF]/15 text-[#8BEAFF] border border-[#8BEAFF]/35'
                    : 'text-[#C9D0D9] hover:bg-white/5 hover:text-[#F5F7FA]'
                }`}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleNavClick('invitation')}
              aria-current={activeTab === 'invitation' ? 'page' : undefined}
              className={`w-full min-w-0 text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-[0.12em] flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                activeTab === 'invitation'
                  ? 'bg-[#8BEAFF]/15 text-[#8BEAFF] border border-[#8BEAFF]/35'
                  : 'text-[#C9D0D9] hover:bg-white/5 hover:text-[#F5F7FA]'
              }`}
            >
              <span className="min-w-0">Invitation Card Download</span>
              <Ticket className="w-4 h-4 shrink-0 text-[#8BEAFF]" />
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('register')}
              className="w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-[0.14em] glass-button-primary flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
