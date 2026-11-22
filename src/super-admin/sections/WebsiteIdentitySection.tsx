import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import {
  EDITABLE_SUPER_ADMIN_TEXT_FILES,
  getSavedSuperAdminText,
  saveEditableSuperAdminBatch,
} from '../../lib/superAdminTextSettings';
import type { SuperAdminFeedback } from '../types';
import { SectionHeader, inputClass, panelClass, textareaClass } from '../components/SuperAdminUI';

const PATH_WEB_NAME = '01. website-identity/Text/web name.txt';
const PATH_WEB_HEADER = '01. website-identity/Text/web header.txt';
const PATH_WEB_FOOTER = '01. website-identity/Text/web footer.txt';

const defaultFor = (path: string) =>
  EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.path === path)?.defaultValue ?? '';

interface WebsiteIdentitySectionProps {
  syncVersion: number;
  onFeedback: (feedback: SuperAdminFeedback) => void;
}

export const WebsiteIdentitySection: React.FC<WebsiteIdentitySectionProps> = ({
  syncVersion,
  onFeedback,
}) => {
  const [websiteTitle, setWebsiteTitle] = useState('');
  const [headerSubtitle, setHeaderSubtitle] = useState('');
  const [footerContent, setFooterContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadValues = () => {
    setWebsiteTitle(getSavedSuperAdminText(PATH_WEB_NAME, defaultFor(PATH_WEB_NAME)));
    setHeaderSubtitle(getSavedSuperAdminText(PATH_WEB_HEADER, defaultFor(PATH_WEB_HEADER)));
    setFooterContent(getSavedSuperAdminText(PATH_WEB_FOOTER, defaultFor(PATH_WEB_FOOTER)));
  };

  useEffect(() => {
    loadValues();
  }, [syncVersion]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteTitle.trim()) {
      onFeedback({ type: 'error', text: 'Website title cannot be empty.' });
      return;
    }

    setSaving(true);
    try {
      await saveEditableSuperAdminBatch([
        { path: PATH_WEB_NAME, content: websiteTitle.trim() },
        { path: PATH_WEB_HEADER, content: headerSubtitle.trim() },
        { path: PATH_WEB_FOOTER, content: footerContent.trim() },
      ]);
      onFeedback({
        type: 'success',
        text: 'Website Identity saved to database and synced for all visitors.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save Website Identity.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <SectionHeader
        title="Website Identity"
        subtitle="Manage the public portal title, hero tagline subtitle, and footer text."
        actions={
          <>
            <button
              type="button"
              onClick={loadValues}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-[#C9D0D9]/20 bg-[#121826] px-4 py-2 text-xs font-semibold text-[#C9D0D9] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Discard Changes</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8BEAFF] px-4 py-2 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving…' : 'Save Identity'}</span>
            </button>
          </>
        }
      />

      <div className={`${panelClass} space-y-5`}>
        <div>
          <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
            Website Title
          </label>
          <input
            type="text"
            value={websiteTitle}
            onChange={e => setWebsiteTitle(e.target.value)}
            placeholder="NIC 27"
            className={inputClass}
            required
          />
          <p className="mt-1.5 text-xs text-[#8993A1]">
            Shown in the browser tab title and portal metadata.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
            Header Tagline / Subtitle
          </label>
          <input
            type="text"
            value={headerSubtitle}
            onChange={e => setHeaderSubtitle(e.target.value)}
            placeholder="Annual Grand Farewell & Batch 27 Celebration"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-[#8993A1]">
            Displayed beneath the main hero heading on the public homepage.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
            Footer Content
          </label>
          <textarea
            rows={4}
            value={footerContent}
            onChange={e => setFooterContent(e.target.value)}
            placeholder="© 2027 Rag Day 27 Committee. All Rights Reserved."
            className={textareaClass}
          />
          <p className="mt-1.5 text-xs text-[#8993A1]">
            Displayed at the bottom of every public page across the portal.
          </p>
        </div>
      </div>
    </form>
  );
};
