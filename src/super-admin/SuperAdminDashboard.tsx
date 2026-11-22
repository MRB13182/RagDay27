import React, { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Globe2,
  Image as ImageIcon,
  Images,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { signOutSuperAdmin } from '../lib/supabase';
import { loadRemoteSuperAdminSettings } from '../lib/superAdminTextSettings';
import type {
  ConfirmModalState,
  SuperAdminFeedback,
  SuperAdminSectionId,
} from './types';
import { ConfirmActionModal, FeedbackBanner } from './components/SuperAdminUI';
import { WebsiteIdentitySection } from './sections/WebsiteIdentitySection';
import { EventSettingsSection } from './sections/EventSettingsSection';
import { RegistrationSettingsSection } from './sections/RegistrationSettingsSection';
import { ImportantNoticeSection } from './sections/ImportantNoticeSection';
import { LogoRelatedSection } from './sections/LogoRelatedSection';
import { GallerySection } from './sections/GallerySection';

interface SuperAdminDashboardProps {
  onLogout: () => void;
}

const NAV_ITEMS: Array<{
  id: SuperAdminSectionId;
  label: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { id: 'website-identity', label: 'Website Identity', Icon: Globe2 },
  { id: 'event-settings', label: 'Event Settings', Icon: CalendarDays },
  { id: 'registration-settings', label: 'Registration Settings', Icon: SlidersHorizontal },
  { id: 'important-notice', label: 'Important Notice', Icon: Bell },
  { id: 'logo-related', label: 'Logo Related', Icon: ImageIcon },
  { id: 'gallery', label: 'Gallery', Icon: Images },
];

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState<SuperAdminSectionId>('website-identity');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<SuperAdminFeedback | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const syncFromDatabase = async () => {
    setSyncing(true);
    try {
      await loadRemoteSuperAdminSettings();
      setSyncVersion(v => v + 1);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void syncFromDatabase();
  }, []);

  const handleSelectSection = (id: SuperAdminSectionId) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    setFeedback(null);
  };

  const handleSignOut = async () => {
    await signOutSuperAdmin();
    onLogout();
  };

  const handleRunConfirm = async () => {
    if (!confirmModal) return;
    setConfirmBusy(true);
    try {
      await confirmModal.onConfirm();
    } finally {
      setConfirmBusy(false);
      setConfirmModal(null);
    }
  };

  const activeNav = NAV_ITEMS.find(item => item.id === activeSection) || NAV_ITEMS[0];

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#090D16] border-r border-[#C9D0D9]/14">
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-[#C9D0D9]/14 px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#8BEAFF]/35 bg-[#8BEAFF]/12 text-[#8BEAFF]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-bold tracking-tight text-[#F5F7FA] truncate">
                Super Admin
              </div>
              <div className="text-xs text-[#8993A1] truncate">NIC 27 Console</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-lg p-1.5 text-[#94A0B2] hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Super Admin Sections" className="p-3 space-y-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectSection(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#8BEAFF]/14 text-[#8BEAFF] border border-[#8BEAFF]/35 font-semibold'
                    : 'text-[#C9D0D9] hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#C9D0D9]/14 p-3 space-y-2">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="w-full flex items-center gap-2.5 rounded-xl border border-[#C9D0D9]/16 bg-[#111725] px-3.5 py-2.5 text-xs font-semibold text-[#C9D0D9] hover:border-rose-400/40 hover:bg-rose-950/45 hover:text-rose-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[310] flex bg-[#060910] text-[#F5F7FA]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-full">{SidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[330] flex lg:hidden bg-[#04060B]/80 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside className="w-64 max-w-[82vw] h-full" onClick={e => e.stopPropagation()}>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-[#C9D0D9]/14 bg-[#090D16] px-4 py-3 sm:px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-xl border border-[#C9D0D9]/18 bg-[#121826] p-2 text-[#C9D0D9] hover:text-white cursor-pointer shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#94A0B2] min-w-0">
              <span className="hidden sm:inline whitespace-nowrap">Super Admin</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-[#F5F7FA] truncate">{activeNav.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void syncFromDatabase()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#C9D0D9]/18 bg-[#121826] px-3.5 py-2 text-xs font-semibold text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-white disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-[#8BEAFF]' : ''}`} />
              <span className="hidden sm:inline">Sync Database</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9D0D9]/18 bg-[#121826] px-3.5 py-2 text-xs font-semibold text-[#C9D0D9] hover:border-rose-400/40 hover:text-rose-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

            {activeSection === 'website-identity' && (
              <WebsiteIdentitySection syncVersion={syncVersion} onFeedback={setFeedback} />
            )}
            {activeSection === 'event-settings' && (
              <EventSettingsSection
                syncVersion={syncVersion}
                onFeedback={setFeedback}
                onRequestConfirm={setConfirmModal}
              />
            )}
            {activeSection === 'registration-settings' && (
              <RegistrationSettingsSection
                syncVersion={syncVersion}
                onFeedback={setFeedback}
                onRequestConfirm={setConfirmModal}
              />
            )}
            {activeSection === 'important-notice' && (
              <ImportantNoticeSection
                syncVersion={syncVersion}
                onFeedback={setFeedback}
                onRequestConfirm={setConfirmModal}
              />
            )}
            {activeSection === 'logo-related' && (
              <LogoRelatedSection syncVersion={syncVersion} onFeedback={setFeedback} />
            )}
            {activeSection === 'gallery' && (
              <GallerySection
                onFeedback={setFeedback}
                onRequestConfirm={setConfirmModal}
              />
            )}
          </div>
        </main>
      </div>

      <ConfirmActionModal
        modal={
          confirmModal
            ? { ...confirmModal, onConfirm: handleRunConfirm }
            : null
        }
        busy={confirmBusy}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
};
