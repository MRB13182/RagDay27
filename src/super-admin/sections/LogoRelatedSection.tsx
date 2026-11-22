import React, { useRef, useState } from 'react';
import { Image as ImageIcon, LoaderCircle, Upload } from 'lucide-react';
import { getWebsiteIdentityConfig } from '../../lib/superAdminConfig';
import { saveEditableSuperAdminImage } from '../../lib/superAdminTextSettings';
import type { SuperAdminFeedback } from '../types';
import { SectionHeader, panelClass } from '../components/SuperAdminUI';

const PATH_LOGO = '01. website-identity/Pic/logo.png';
const PATH_FAVICON = '01. website-identity/Pic/favicon.png';

interface LogoRelatedSectionProps {
  syncVersion: number;
  onFeedback: (feedback: SuperAdminFeedback) => void;
}

export const LogoRelatedSection: React.FC<LogoRelatedSectionProps> = ({
  onFeedback,
}) => {
  const [uploadingTarget, setUploadingTarget] = useState<'logo' | 'favicon' | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const identity = getWebsiteIdentityConfig();

  const handleUpload = async (target: 'logo' | 'favicon', file: File | undefined) => {
    if (!file) return;
    setUploadingTarget(target);
    try {
      const storageKey = target === 'logo' ? PATH_LOGO : PATH_FAVICON;
      await saveEditableSuperAdminImage(storageKey, file);
      onFeedback({
        type: 'success',
        text: `${target === 'logo' ? 'Website Logo' : 'Website Favicon'} updated and synced across all devices.`,
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to update ${target}.`,
      });
    } finally {
      setUploadingTarget(null);
      if (target === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
      if (target === 'favicon' && faviconInputRef.current) faviconInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Logo Related"
        subtitle="Preview and replace the official Website Logo and Favicon. Updates are stored in Supabase Storage and synced to every visitor."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Website Logo */}
        <article className={`${panelClass} flex flex-col justify-between gap-5`}>
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Website Logo</h3>
              <p className="mt-1 text-xs text-[#8993A1]">
                Shown in the navigation header, footer, and invitation PDF cards.
              </p>
            </div>

            <div className="grid h-48 place-items-center rounded-xl border border-[#C9D0D9]/14 bg-[#070A10] p-6">
              {identity.websiteLogo ? (
                <img
                  src={identity.websiteLogo}
                  alt="Current Website Logo"
                  className="max-h-36 max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#626B79]">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">No logo configured</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#C9D0D9]/12 pt-4">
            <span className="text-xs text-[#8993A1]">PNG, SVG or WebP · Max 10 MB</span>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => void handleUpload('logo', e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={uploadingTarget !== null}
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8BEAFF] px-4 py-2 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {uploadingTarget === 'logo' ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Replace Logo</span>
                </>
              )}
            </button>
          </div>
        </article>

        {/* Website Favicon */}
        <article className={`${panelClass} flex flex-col justify-between gap-5`}>
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#F5F7FA]">Website Favicon</h3>
              <p className="mt-1 text-xs text-[#8993A1]">
                Browser tab icon displayed alongside the site title. Square PNG/ICO recommended.
              </p>
            </div>

            <div className="grid h-48 place-items-center rounded-xl border border-[#C9D0D9]/14 bg-[#070A10] p-6">
              {identity.favicon ? (
                <img
                  src={identity.favicon}
                  alt="Current Website Favicon"
                  className="h-24 w-24 rounded-xl object-contain border border-[#C9D0D9]/15 bg-[#0D121D] p-2"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#626B79]">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">No favicon configured</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#C9D0D9]/12 pt-4">
            <span className="text-xs text-[#8993A1]">Square PNG or ICO · Max 10 MB</span>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => void handleUpload('favicon', e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={uploadingTarget !== null}
              onClick={() => faviconInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#8BEAFF]/40 bg-[#8BEAFF]/12 px-4 py-2 text-xs font-bold text-[#8BEAFF] hover:bg-[#8BEAFF]/20 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {uploadingTarget === 'favicon' ? (
                <>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Replace Favicon</span>
                </>
              )}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};
