import React, { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import {
  EDITABLE_SUPER_ADMIN_TEXT_FILES,
  getSavedSuperAdminText,
  saveEditableSuperAdminBatch,
  saveEditableSuperAdminText,
} from '../../lib/superAdminTextSettings';
import { parseMaleSectionSettings, type SectionCategory } from '../../lib/superAdminConfig';
import type { ConfirmModalState, GroupPaymentDraft, SuperAdminFeedback } from '../types';
import { OrderControls, SectionHeader, ToggleButton, inputClass, panelClass } from '../components/SuperAdminUI';

const PATH_REG_TOGGLE = '03. reg-settings/Text/Enable Disable.txt';
const PATH_LAST_REG_DATE = '03. reg-settings/Text/Last registration date countdown.txt';
const PATH_SECTION_SETTINGS = '03. reg-settings/Text/Section settings.txt';

const GROUP_PAYMENT_FILES = [
  { name: 'Science', path: '03. reg-settings/Text/Payment number SC.txt' },
  { name: 'Business Studies', path: '03. reg-settings/Text/Payment number BS.txt' },
  { name: 'Humanities', path: '03. reg-settings/Text/Payment number HU.txt' },
];

const defaultFor = (path: string) =>
  EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.path === path)?.defaultValue ?? '';

function toLocalDateTimeInput(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function parseGroupPayment(raw: string): { bkash: string; nagad: string } {
  const result = { bkash: '', nagad: '' };
  raw.split(/\r?\n/).forEach(line => {
    const match = line.trim().match(/^(bkash|nagad)\s*:\s*(.*)$/i);
    if (match) {
      result[match[1].toLowerCase() as 'bkash' | 'nagad'] = match[2].trim();
    }
  });
  return result;
}

interface RegistrationSettingsSectionProps {
  syncVersion: number;
  onFeedback: (feedback: SuperAdminFeedback) => void;
  onRequestConfirm: (modal: ConfirmModalState) => void;
}

export const RegistrationSettingsSection: React.FC<RegistrationSettingsSectionProps> = ({
  syncVersion,
  onFeedback,
  onRequestConfirm,
}) => {
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [closingDeadline, setClosingDeadline] = useState('');
  const [groups, setGroups] = useState<GroupPaymentDraft[]>([]);
  const [savingMain, setSavingMain] = useState(false);

  // Male-only Categories & Sections Box Manager
  const [categories, setCategories] = useState<SectionCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newSectionInputs, setNewSectionInputs] = useState<Record<string, string>>({});
  const [editingSection, setEditingSection] = useState<{
    catId: string;
    index: number;
    value: string;
  } | null>(null);
  const [savingSections, setSavingSections] = useState(false);

  const hydrate = () => {
    const toggleRaw = getSavedSuperAdminText(PATH_REG_TOGGLE, defaultFor(PATH_REG_TOGGLE));
    setRegistrationEnabled(!/^(disable|disabled|close|closed|manual_disable|force_disable)$/i.test(toggleRaw.trim()));

    const deadlineRaw = getSavedSuperAdminText(PATH_LAST_REG_DATE, defaultFor(PATH_LAST_REG_DATE));
    setClosingDeadline(toLocalDateTimeInput(deadlineRaw) || deadlineRaw);

    setGroups(
      GROUP_PAYMENT_FILES.map(g => ({
        ...g,
        ...parseGroupPayment(getSavedSuperAdminText(g.path, defaultFor(g.path))),
      }))
    );

    setCategories(parseMaleSectionSettings().categories);
  };

  useEffect(() => {
    hydrate();
  }, [syncVersion]);

  const handleSaveMain = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedDeadline =
      closingDeadline.trim().length === 16
        ? `${closingDeadline.trim()}:00`
        : closingDeadline.trim();

    setSavingMain(true);
    try {
      await saveEditableSuperAdminBatch([
        { path: PATH_REG_TOGGLE, content: registrationEnabled ? 'enable' : 'disable' },
        { path: PATH_LAST_REG_DATE, content: formattedDeadline },
        ...groups.map(group => ({
          path: group.path,
          content: `Bkash: ${group.bkash.trim()}\nNagad: ${group.nagad.trim()}`,
        })),
      ]);
      onFeedback({
        type: 'success',
        text: 'Registration controls, closing date, and group payment numbers saved.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save registration settings.',
      });
    } finally {
      setSavingMain(false);
    }
  };

  const persistCategories = async (nextCategories: SectionCategory[], successMessage: string) => {
    setSavingSections(true);
    try {
      await saveEditableSuperAdminText(
        PATH_SECTION_SETTINGS,
        JSON.stringify({ categories: nextCategories })
      );
      setCategories(nextCategories);
      onFeedback({ type: 'success', text: successMessage });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save male section settings.',
      });
    } finally {
      setSavingSections(false);
    }
  };

  const handleAddCategory = () => {
    const clean = newCategoryName.trim();
    if (!clean) {
      onFeedback({ type: 'error', text: 'Enter a category name before adding.' });
      return;
    }
    if (categories.some(cat => cat.name.trim().toLowerCase() === clean.toLowerCase())) {
      onFeedback({ type: 'error', text: `Category "${clean}" already exists.` });
      return;
    }
    const next = [
      ...categories,
      {
        id: `cat-${Date.now()}-${clean.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: clean,
        sections: [],
      },
    ];
    setNewCategoryName('');
    void persistCategories(next, `Category "${clean}" added.`);
  };

  const handleMoveCategory = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= categories.length) return;
    const copy = [...categories];
    [copy[index], copy[nextIdx]] = [copy[nextIdx], copy[index]];
    void persistCategories(copy, 'Category order updated.');
  };

  const handleSaveCategoryName = (catId: string) => {
    const clean = editingCatName.trim();
    if (!clean) {
      onFeedback({ type: 'error', text: 'Category name cannot be empty.' });
      return;
    }
    if (
      categories.some(
        cat => cat.id !== catId && cat.name.trim().toLowerCase() === clean.toLowerCase()
      )
    ) {
      onFeedback({ type: 'error', text: `Category "${clean}" already exists.` });
      return;
    }
    const next = categories.map(cat => (cat.id === catId ? { ...cat, name: clean } : cat));
    setEditingCatId(null);
    setEditingCatName('');
    void persistCategories(next, `Category renamed to "${clean}".`);
  };

  const handleDeleteCategory = (cat: SectionCategory) => {
    onRequestConfirm({
      title: 'Delete Category',
      description: `Remove category "${cat.name}" and its ${cat.sections.length} section(s) from the registration form?`,
      confirmLabel: 'Delete Category',
      onConfirm: async () => {
        const next = categories.filter(c => c.id !== cat.id);
        await persistCategories(next, `Category "${cat.name}" removed.`);
      },
    });
  };

  const handleAddSection = (catId: string) => {
    const raw = (newSectionInputs[catId] || '').trim();
    if (!raw) {
      onFeedback({ type: 'error', text: 'Enter a section code before adding.' });
      return;
    }
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    if (cat.sections.some(s => s.toLowerCase() === raw.toLowerCase())) {
      onFeedback({ type: 'error', text: `Section "${raw}" already exists in ${cat.name}.` });
      return;
    }
    const next = categories.map(c =>
      c.id === catId ? { ...c, sections: [...c.sections, raw] } : c
    );
    setNewSectionInputs(prev => ({ ...prev, [catId]: '' }));
    void persistCategories(next, `Section "${raw}" added to ${cat.name}.`);
  };

  const handleSaveSectionEdit = () => {
    if (!editingSection) return;
    const clean = editingSection.value.trim();
    if (!clean) {
      onFeedback({ type: 'error', text: 'Section name cannot be empty.' });
      return;
    }
    const cat = categories.find(c => c.id === editingSection.catId);
    if (!cat) return;
    if (
      cat.sections.some(
        (s, idx) => idx !== editingSection.index && s.toLowerCase() === clean.toLowerCase()
      )
    ) {
      onFeedback({ type: 'error', text: `Section "${clean}" already exists in ${cat.name}.` });
      return;
    }
    const next = categories.map(c =>
      c.id === editingSection.catId
        ? {
            ...c,
            sections: c.sections.map((s, idx) => (idx === editingSection.index ? clean : s)),
          }
        : c
    );
    setEditingSection(null);
    void persistCategories(next, `Section updated to "${clean}".`);
  };

  const handleMoveSection = (catId: string, idx: number, direction: -1 | 1) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= cat.sections.length) return;
    const copy = [...cat.sections];
    [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
    const next = categories.map(c => (c.id === catId ? { ...c, sections: copy } : c));
    void persistCategories(next, 'Section order updated.');
  };

  const handleDeleteSection = (catId: string, catName: string, sectionName: string) => {
    onRequestConfirm({
      title: 'Delete Section',
      description: `Remove section "${sectionName}" from ${catName}?`,
      confirmLabel: 'Remove Section',
      onConfirm: async () => {
        const next = categories.map(c =>
          c.id === catId
            ? { ...c, sections: c.sections.filter(s => s !== sectionName) }
            : c
        );
        await persistCategories(next, `Section "${sectionName}" removed from ${catName}.`);
      },
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Registration Settings"
        subtitle="Control registration availability, closing deadline, male-only academic sections, and group payment numbers."
      />

      {/* Availability, Deadline & Group Payment Numbers */}
      <form onSubmit={handleSaveMain} className={`${panelClass} space-y-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9D0D9]/12 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#F5F7FA]">Portal Status & Closing Date</h3>
            <p className="text-xs text-[#8993A1]">
              When disabled or past the closing deadline, new submissions are blocked automatically.
            </p>
          </div>
          <ToggleButton
            enabled={registrationEnabled}
            onToggle={() => setRegistrationEnabled(v => !v)}
            enabledLabel="Registration Enabled"
            disabledLabel="Registration Disabled"
            ariaLabel="Toggle registration availability"
          />
        </div>

        <div className="max-w-md">
          <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
            Last Registration Closing Date & Time
          </label>
          <input
            type="datetime-local"
            value={closingDeadline}
            onChange={e => setClosingDeadline(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="border-t border-[#C9D0D9]/12 pt-5 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-[#F5F7FA]">Group-wise Payment Numbers</h4>
            <p className="text-xs text-[#8993A1]">
              Students see the bKash and Nagad account numbers corresponding to their academic group.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {groups.map(group => (
              <div
                key={group.path}
                className="rounded-xl border border-[#C9D0D9]/14 bg-[#090D16] p-4 space-y-3"
              >
                <div className="text-sm font-bold text-[#F5F7FA]">{group.name}</div>
                <div>
                  <label className="block text-xs font-medium text-[#94A0B2] mb-1">
                    bKash Number
                  </label>
                  <input
                    type="text"
                    value={group.bkash}
                    onChange={e =>
                      setGroups(prev =>
                        prev.map(item =>
                          item.path === group.path ? { ...item, bkash: e.target.value } : item
                        )
                      )
                    }
                    placeholder="017XX-XXXXXX"
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A0B2] mb-1">
                    Nagad Number
                  </label>
                  <input
                    type="text"
                    value={group.nagad}
                    onChange={e =>
                      setGroups(prev =>
                        prev.map(item =>
                          item.path === group.path ? { ...item, nagad: e.target.value } : item
                        )
                      )
                    }
                    placeholder="017XX-XXXXXX"
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-[#C9D0D9]/12 pt-4">
          <button
            type="submit"
            disabled={savingMain}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8BEAFF] px-5 py-2.5 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingMain ? 'Saving…' : 'Save Registration & Payment Settings'}</span>
          </button>
        </div>
      </form>

      {/* Male-only Section & Category Box Manager */}
      <div className={`${panelClass} space-y-5`}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#C9D0D9]/12 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#F5F7FA]">Male Sections & Categories</h3>
            <p className="text-xs text-[#8993A1]">
              Configure active male groups and section boxes shown in the registration form.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="New category (e.g. Science)"
              className={`${inputClass} sm:w-56`}
            />
            <button
              type="button"
              disabled={savingSections}
              onClick={handleAddCategory}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8BEAFF] px-4 py-2.5 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8993A1]">
            No categories configured. Add a category above to begin.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((cat, catIdx) => {
              const isRenamingCat = editingCatId === cat.id;
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-[#C9D0D9]/16 bg-[#090D16] p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-[#C9D0D9]/10 pb-3">
                      {isRenamingCat ? (
                        <div className="flex flex-1 items-center gap-1.5">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className={`${inputClass} py-1.5 text-xs`}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCategoryName(cat.id)}
                            aria-label="Save category name"
                            className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(null);
                              setEditingCatName('');
                            }}
                            aria-label="Cancel rename"
                            className="rounded-lg bg-[#141B29] p-2 text-[#94A0B2] hover:text-white cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#F5F7FA] truncate">{cat.name}</h4>
                          <p className="text-xs text-[#8993A1] tabular-nums">
                            {cat.sections.length} section{cat.sections.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      )}

                      {!isRenamingCat && (
                        <div className="flex items-center gap-1 shrink-0">
                          <OrderControls
                            index={catIdx}
                            total={categories.length}
                            disabled={savingSections}
                            onMoveUp={() => handleMoveCategory(catIdx, -1)}
                            onMoveDown={() => handleMoveCategory(catIdx, 1)}
                          />
                          <button
                            type="button"
                            disabled={savingSections}
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatName(cat.name);
                            }}
                            aria-label={`Rename ${cat.name}`}
                            className="rounded-lg border border-[#C9D0D9]/18 bg-[#121826] p-2 text-[#C9D0D9] hover:text-[#8BEAFF] cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={savingSections}
                            onClick={() => handleDeleteCategory(cat)}
                            aria-label={`Delete ${cat.name}`}
                            className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {cat.sections.length === 0 ? (
                      <p className="py-3 text-xs text-[#626B79]">
                        No sections inside {cat.name} yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {cat.sections.map((sec, secIdx) => {
                          const isEditingSec =
                            editingSection?.catId === cat.id && editingSection.index === secIdx;
                          return (
                            <div
                              key={`${cat.id}-${sec}-${secIdx}`}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[#C9D0D9]/12 bg-[#0E1422] px-3 py-2"
                            >
                              {isEditingSec ? (
                                <div className="flex flex-1 items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingSection.value}
                                    onChange={e =>
                                      setEditingSection({ ...editingSection, value: e.target.value })
                                    }
                                    className={`${inputClass} py-1.5 text-xs`}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveSectionEdit}
                                    aria-label="Save section"
                                    className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300 cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSection(null)}
                                    aria-label="Cancel section edit"
                                    className="rounded-lg bg-[#141B29] p-1.5 text-[#94A0B2] cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-xs font-semibold text-[#F5F7FA]">
                                    {sec}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <OrderControls
                                      index={secIdx}
                                      total={cat.sections.length}
                                      disabled={savingSections}
                                      onMoveUp={() => handleMoveSection(cat.id, secIdx, -1)}
                                      onMoveDown={() => handleMoveSection(cat.id, secIdx, 1)}
                                    />
                                    <button
                                      type="button"
                                      disabled={savingSections}
                                      onClick={() =>
                                        setEditingSection({ catId: cat.id, index: secIdx, value: sec })
                                      }
                                      aria-label={`Edit section ${sec}`}
                                      className="rounded-lg border border-[#C9D0D9]/15 bg-[#121826] p-1.5 text-[#C9D0D9] hover:text-[#8BEAFF] cursor-pointer"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={savingSections}
                                      onClick={() => handleDeleteSection(cat.id, cat.name, sec)}
                                      aria-label={`Delete section ${sec}`}
                                      className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-[#C9D0D9]/10 pt-3">
                    <input
                      type="text"
                      value={newSectionInputs[cat.id] || ''}
                      onChange={e =>
                        setNewSectionInputs(prev => ({ ...prev, [cat.id]: e.target.value }))
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSection(cat.id);
                        }
                      }}
                      placeholder={`Add section to ${cat.name} (e.g. ScB4)`}
                      className={`${inputClass} py-2 text-xs`}
                    />
                    <button
                      type="button"
                      disabled={savingSections}
                      onClick={() => handleAddSection(cat.id)}
                      className="rounded-xl border border-[#8BEAFF]/35 bg-[#8BEAFF]/12 px-3 py-2 text-xs font-bold text-[#8BEAFF] hover:bg-[#8BEAFF]/20 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
