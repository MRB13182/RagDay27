import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, CalendarDays, Check, ChevronRight, CreditCard, Globe2,
  LayoutDashboard, LogOut, Menu, Plus, Save, ShieldCheck, SlidersHorizontal,
  Trash2, Pencil, X, Clock3, Layers, AlertTriangle, Radio, MessageSquareText
} from 'lucide-react';
import {
  EDITABLE_SUPER_ADMIN_TEXT_FILES,
  getSavedSuperAdminText,
  loadRemoteSuperAdminSettings,
  saveEditableSuperAdminText,
} from '../lib/superAdminTextSettings';
import {
  parseHeaderNoticeConfig,
  parseMaleSectionSettings,
  parsePopupNoticeConfig,
  type HeaderNoticeConfig,
  type PopupNoticeConfig,
  type SectionCategory,
} from '../lib/superAdminConfig';

type Props = { onLogout: () => void };
type Setting = { id: string; category: string; label: string; path: string; defaultValue: string };
type EventCardItem = { id: string; title: string; description: string; visible: boolean };
type GroupPayment = { name: string; path: string; bkash: string; nagad: string };

type ConfirmDeleteState = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
} | null;

const sections = [
  { id: 'overview', title: 'Dashboard', icon: LayoutDashboard },
  { id: '01. Website Identity', title: 'Website Identity', icon: Globe2 },
  { id: '02. Event Settings', title: 'Event Settings', icon: CalendarDays },
  { id: '03. Registration Settings', title: 'Registration Settings', icon: SlidersHorizontal },
  { id: '04. Countdown Settings', title: 'Countdown Settings', icon: Clock3 },
  { id: '05. Important Notice', title: 'Important Notice', icon: Bell },
];

const EVENT_CARD_PATH = '02. event-settings/Text/Event card.txt';
const SECTION_SETTINGS_PATH = '03. reg-settings/Text/Section settings.txt';
const HEADER_NOTICE_PATH = '05. important-notice/Text/Notice Board.txt';
const POPUP_NOTICE_PATH = '05. important-notice/Text/Popup Notice.txt';
const NOTICE_ENABLE_PATH = '05. important-notice/Text/Enable Disable.txt';

const GROUP_FILES = [
  { name: 'Science', path: '03. reg-settings/Text/Payment number SC.txt' },
  { name: 'Business Studies', path: '03. reg-settings/Text/Payment number BS.txt' },
  { name: 'Humanities', path: '03. reg-settings/Text/Payment number HU.txt' },
];

const read = (path: string, fallback: string) => getSavedSuperAdminText(path, fallback);

const toDateValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const longSetting = (setting: Setting) => /footer|header|description|card|jersey|notice|section/i.test(setting.id + ' ' + setting.label);
const inputClass = 'w-full rounded-xl border border-white/10 bg-[#13263A] px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10';
const panelClass = 'rounded-2xl border border-white/10 bg-[#0B1A2B] p-5';

function parseCards(raw: string): EventCardItem[] {
  const cards: EventCardItem[] = [];
  let title = '';
  let description: string[] = [];
  const push = () => {
    if (title.trim()) cards.push({ id: 'card-' + cards.length + '-' + title, title: title.trim(), description: description.join(' ').trim(), visible: true });
    title = '';
    description = [];
  };
  raw.split(/\r?\n/).forEach(line => {
    const clean = line.trim();
    if (!clean) return;
    const t = clean.match(/^title\s*:\s*(.*)$/i);
    const d = clean.match(/^description\s*:\s*(.*)$/i);
    if (t) { push(); title = t[1]; }
    else if (d && title) description.push(d[1]);
    else if (title) description.push(clean);
  });
  push();
  return cards;
}

function serializeCards(cards: EventCardItem[]) {
  return cards.filter(card => card.title.trim()).map(card => 'Title: ' + card.title.trim() + '\nDescription: ' + card.description.trim()).join('\n\n');
}

function parsePayment(raw: string) {
  const values = { bkash: '', nagad: '' };
  raw.split(/\r?\n/).forEach(line => {
    const match = line.trim().match(/^(bkash|nagad)\s*:\s*(.*)$/i);
    if (match) values[match[1].toLowerCase() as 'bkash' | 'nagad'] = match[2].trim();
  });
  return values;
}

export const SuperAdminDashboard: React.FC<Props> = ({ onLogout }) => {
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [eventCards, setEventCards] = useState<EventCardItem[]>([]);
  const [groups, setGroups] = useState<GroupPayment[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>(null);

  // Male-only box-based Section Management state
  const [categories, setCategories] = useState<SectionCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSectionInputs, setNewSectionInputs] = useState<Record<string, string>>({});
  const [editingSection, setEditingSection] = useState<{ catId: string; oldName: string; value: string } | null>(null);

  // Separate Header Notice Ticker state
  const [headerNoticeConfig, setHeaderNoticeConfig] = useState<HeaderNoticeConfig>({ enabled: true, notices: [] });
  const [newHeaderNoticeText, setNewHeaderNoticeText] = useState('');

  // Separate Popup Notice Slideshow state
  const [popupNoticeConfig, setPopupNoticeConfig] = useState<PopupNoticeConfig>({ enabled: false, intervalSeconds: 3, items: [] });

  const hydrateFromConfig = () => {
    const next: Record<string, string> = {};
    EDITABLE_SUPER_ADMIN_TEXT_FILES.forEach(item => {
      next[item.path] = read(item.path, item.defaultValue);
    });
    setValues(next);

    const cardSetting = EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.id === 'event-card');
    const cardRaw = read(EVENT_CARD_PATH, cardSetting?.defaultValue ?? '');
    setEventCards(parseCards(cardRaw));

    setGroups(GROUP_FILES.map(group => ({
      ...group,
      ...parsePayment(read(group.path, EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.path === group.path)?.defaultValue ?? '')),
    })));

    setCategories(parseMaleSectionSettings().categories);
    setHeaderNoticeConfig(parseHeaderNoticeConfig());
    setPopupNoticeConfig(parsePopupNoticeConfig());
  };

  useEffect(() => {
    hydrateFromConfig();
    void loadRemoteSuperAdminSettings().then(synced => {
      if (synced) hydrateFromConfig();
    });
  }, []);

  const filtered = useMemo(
    () =>
      EDITABLE_SUPER_ADMIN_TEXT_FILES.filter(
        item =>
          item.category === active &&
          item.id !== 'jersey-design-image' &&
          item.id !== 'event-card' &&
          item.id !== 'section-settings' &&
          item.id !== 'notice-board' &&
          item.id !== 'popup-notice' &&
          item.id !== 'notice-enable-disable' &&
          !item.id.startsWith('payment-number-')
      ),
    [active]
  );

  const configSections = sections.length - 1;
  const totalMaleSections = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.sections.length, 0),
    [categories]
  );

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await Promise.all(filtered.map(item => saveEditableSuperAdminText(item.path, values[item.path] ?? item.defaultValue)));
      showMessage('Settings saved successfully.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveEventCards = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveEditableSuperAdminText(EVENT_CARD_PATH, serializeCards(eventCards));
      showMessage('Event cards saved. Homepage cards will use these settings.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save event cards.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePaymentsAndControls = async () => {
    setSaving(true);
    setMessage('');
    try {
      await Promise.all([
        ...groups.map(group => saveEditableSuperAdminText(group.path, 'Bkash: ' + group.bkash.trim() + '\nNagad: ' + group.nagad.trim())),
        ...filtered.map(item => saveEditableSuperAdminText(item.path, values[item.path] ?? item.defaultValue)),
      ]);
      showMessage('Registration payment channels and controls saved successfully.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save registration settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Male Section Management Handlers
  const persistSectionCategories = async (nextCategories: SectionCategory[], successMsg: string) => {
    setSaving(true);
    setMessage('');
    try {
      await saveEditableSuperAdminText(SECTION_SETTINGS_PATH, JSON.stringify({ categories: nextCategories }));
      showMessage(successMsg);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save male section settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showMessage('Enter a category name before adding.', 'error');
      return;
    }
    if (categories.some(cat => cat.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showMessage(`Category "${trimmed}" already exists.`, 'error');
      return;
    }
    const newCat: SectionCategory = {
      id: `cat-${Date.now()}-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: trimmed,
      sections: [],
    };
    setCategories(prev => [...prev, newCat]);
    setNewCategoryName('');
    showMessage(`Category "${trimmed}" added. Press Save Section Settings to publish.`);
  };

  const handleAddSectionToCategory = (catId: string) => {
    const rawVal = (newSectionInputs[catId] || '').trim();
    if (!rawVal) {
      showMessage('Enter a section ID (e.g. ScB4) before adding.', 'error');
      return;
    }
    const duplicate = categories.some(cat =>
      cat.sections.some(sec => sec.trim().toLowerCase() === rawVal.toLowerCase())
    );
    if (duplicate) {
      showMessage(`Section ID "${rawVal}" already exists.`, 'error');
      return;
    }
    setCategories(prev =>
      prev.map(cat => (cat.id === catId ? { ...cat, sections: [...cat.sections, rawVal] } : cat))
    );
    setNewSectionInputs(prev => ({ ...prev, [catId]: '' }));
    showMessage(`Section "${rawVal}" added. Press Save Section Settings to publish.`);
  };

  const handleSaveEditedSection = () => {
    if (!editingSection) return;
    const trimmed = editingSection.value.trim();
    if (!trimmed) {
      showMessage('Section ID cannot be empty.', 'error');
      return;
    }
    const duplicate = categories.some(cat =>
      cat.sections.some(
        sec =>
          sec.trim().toLowerCase() === trimmed.toLowerCase() &&
          !(cat.id === editingSection.catId && sec === editingSection.oldName)
      )
    );
    if (duplicate) {
      showMessage(`Section ID "${trimmed}" already exists.`, 'error');
      return;
    }
    setCategories(prev =>
      prev.map(cat =>
        cat.id === editingSection.catId
          ? { ...cat, sections: cat.sections.map(sec => (sec === editingSection.oldName ? trimmed : sec)) }
          : cat
      )
    );
    setEditingSection(null);
    showMessage(`Section updated to "${trimmed}". Press Save Section Settings to publish.`);
  };

  // Header Notice Ticker Handlers
  const handleAddHeaderNotice = () => {
    const clean = newHeaderNoticeText.trim();
    if (!clean) {
      showMessage('Enter header announcement text before adding.', 'error');
      return;
    }
    setHeaderNoticeConfig(prev => ({
      ...prev,
      notices: [...prev.notices, { id: `header-${Date.now()}`, text: clean }],
    }));
    setNewHeaderNoticeText('');
    showMessage('Header notice added. Press Save Header Notices to publish.');
  };

  const saveHeaderNotices = async () => {
    setSaving(true);
    setMessage('');
    try {
      const cleaned: HeaderNoticeConfig = {
        enabled: headerNoticeConfig.enabled,
        notices: headerNoticeConfig.notices
          .map(item => ({ ...item, text: item.text.trim() }))
          .filter(item => item.text.length > 0),
      };
      setHeaderNoticeConfig(cleaned);
      await saveEditableSuperAdminText(HEADER_NOTICE_PATH, JSON.stringify(cleaned));
      showMessage('Header ticker notices saved successfully.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save header notices.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Popup Notice Slideshow Handlers
  const handleAddPopupItem = () => {
    setPopupNoticeConfig(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `popup-${Date.now()}`,
          title: 'Important Notice',
          message: '',
          enabled: true,
        },
      ],
    }));
    showMessage('Popup news slide added. Enter content and press Save Popup Notices.');
  };

  const savePopupNotices = async () => {
    setSaving(true);
    setMessage('');
    try {
      const safeInterval = Number.isFinite(popupNoticeConfig.intervalSeconds)
        ? Math.min(60, Math.max(1, Math.round(popupNoticeConfig.intervalSeconds)))
        : 3;
      const cleaned: PopupNoticeConfig = {
        enabled: popupNoticeConfig.enabled,
        intervalSeconds: safeInterval,
        items: popupNoticeConfig.items
          .map(item => ({
            ...item,
            title: item.title.trim(),
            message: item.message.trim(),
          }))
          .filter(item => item.title.length > 0 || item.message.length > 0),
      };
      setPopupNoticeConfig(cleaned);
      await Promise.all([
        saveEditableSuperAdminText(POPUP_NOTICE_PATH, JSON.stringify(cleaned)),
        saveEditableSuperAdminText(NOTICE_ENABLE_PATH, cleaned.enabled ? 'enable' : 'disable'),
      ]);
      showMessage('Popup slideshow notices saved successfully.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save popup notices.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (setting: Setting) => setValues(previous => ({
    ...previous,
    [setting.path]: (previous[setting.path] || '').trim().toLowerCase() === 'enable' ? 'disable' : 'enable',
  }));
  const isToggle = (setting: Setting) => /enable-disable|enable \/ disable/i.test(setting.id + ' ' + setting.label);

  const renderSetting = (setting: Setting) => {
    const value = values[setting.path] ?? setting.defaultValue;
    const toggleSetting = isToggle(setting);
    const dateSetting = /date|countdown/i.test(setting.id + ' ' + setting.label) && !longSetting(setting);
    return (
      <div key={setting.path} className="rounded-2xl border border-white/10 bg-[#0C1A2B]/80 p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor={'setting-' + setting.id} className="text-sm font-bold text-slate-100">{setting.label.replace(/\s*\([^)]*\)/g, '')}</label>
          {toggleSetting && <button type="button" role="switch" aria-checked={value.toLowerCase() === 'enable'} onClick={() => toggle(setting)} className={'relative h-6 w-11 rounded-full transition cursor-pointer ' + (value.toLowerCase() === 'enable' ? 'bg-cyan-500' : 'bg-slate-600')}><span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition ' + (value.toLowerCase() === 'enable' ? 'left-6' : 'left-1')} /></button>}
        </div>
        <p className="mb-3 text-xs text-slate-400">{toggleSetting ? 'Enable or disable this website feature.' : 'Edit this setting. Changes are saved to database and live portal.'}</p>
        {toggleSetting
          ? <div className="text-xs text-slate-300">{value.toLowerCase() === 'enable' ? 'Enabled' : 'Disabled'}</div>
          : dateSetting
            ? <input id={'setting-' + setting.id} type="datetime-local" value={toDateValue(value)} onChange={event => setValues(previous => ({ ...previous, [setting.path]: event.target.value ? new Date(event.target.value).toISOString() : '' }))} className={inputClass} />
            : <textarea id={'setting-' + setting.id} rows={longSetting(setting) ? 5 : 2} value={value} onChange={event => setValues(previous => ({ ...previous, [setting.path]: event.target.value }))} className={inputClass + ' resize-y leading-6'} />}
      </div>
    );
  };

  const navigation = (
    <nav className="space-y-1">
      {sections.map(section => {
        const Icon = section.icon;
        return (
          <button
            key={section.id}
            onClick={() => { setActive(section.id); setMobileOpen(false); setMessage(''); }}
            className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition cursor-pointer ' + (active === section.id ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-white')}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{section.title}</span>
            {active === section.id && <ChevronRight className="h-4 w-4 shrink-0" />}
          </button>
        );
      })}
    </nav>
  );

  const activeTitle = sections.find(section => section.id === active)?.title ?? 'Dashboard';

  return (
    <div className="fixed inset-0 z-[310] flex bg-[#050B14] text-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#081525] p-4 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"><ShieldCheck /></div>
          <div>
            <div className="font-black">RAG DAY 27</div>
            <div className="text-[10px] tracking-[.2em] text-cyan-300">SUPER ADMIN</div>
          </div>
        </div>
        {navigation}
        <div className="mt-auto rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs text-slate-400">
          Configuration console<br />
          <span className="text-cyan-200">Super Admin session</span>
        </div>
      </aside>

      {mobileOpen && (
        <div className="absolute inset-0 z-20 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-72 bg-[#081525] p-4" onClick={event => event.stopPropagation()}>
            <div className="mb-6 flex justify-between font-bold">
              RAG DAY 27
              <button onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
            </div>
            {navigation}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#071321]/90 px-4 py-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
            <div>
              <h1 className="text-lg font-black sm:text-xl">{activeTitle}</h1>
              <p className="text-xs text-slate-400">Manage event content, registration sections, countdown and notices.</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-rose-400/40 hover:text-rose-200 cursor-pointer">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-7">
          {active === 'overview' && (
            <>
              <section className="rounded-3xl border border-cyan-400/25 bg-gradient-to-r from-[#0B2946] to-[#10233A] p-6">
                <p className="text-xs font-bold tracking-[.2em] text-cyan-300">WELCOME, SUPER ADMIN</p>
                <h2 className="mt-2 text-2xl font-black">Rag Day 27 Control Center</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">Manage website identity, event cards, male registration sections, payment channels, countdown and notices from one place.</p>
              </section>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Configuration Sections" value={String(configSections)} icon={<SlidersHorizontal />} />
                <Metric label="Event Cards" value={String(eventCards.length)} icon={<LayoutDashboard />} />
                <Metric label="Male Sections" value={String(totalMaleSections)} icon={<Layers />} />
                <Metric label="Payment Groups" value={String(groups.length)} icon={<CreditCard />} />
              </section>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sections.filter(section => section.id !== 'overview').map(section => {
                  const Icon = section.icon;
                  return (
                    <button key={section.id} onClick={() => setActive(section.id)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B1A2B] p-5 text-left hover:border-cyan-400/40 cursor-pointer">
                      <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300"><Icon /></span>
                      <span className="font-bold">{section.title}</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
                    </button>
                  );
                })}
              </section>
            </>
          )}

          {active === '02. Event Settings' && (
            <>
              <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-[#073353] to-[#0B2440] p-5">
                <h2 className="text-xl font-black">Event Settings</h2>
                <p className="mt-1 text-sm text-slate-300">Update event details and manage the feature cards displayed on the website.</p>
              </section>
              <section className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">Basic Event Information</h3>
                    <p className="text-xs text-slate-400">Edit the current event name, date, venue and jersey text.</p>
                  </div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">{filtered.map(renderSetting)}</div>
                <div className="mt-5 flex justify-end">
                  <button onClick={() => void saveSettings()} disabled={saving || !filtered.length} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50 cursor-pointer">
                    <Save className="h-4 w-4" /> Save Event Information
                  </button>
                </div>
              </section>
              <section className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">Event Cards</h3>
                    <p className="text-xs text-slate-400">Add, edit, show/hide or remove homepage feature cards.</p>
                  </div>
                  <button onClick={() => { const id = 'new-' + Date.now(); setEventCards(previous => [...previous, { id, title: '', description: '', visible: true }]); setEditingCard(id); }} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-[#03111D] hover:bg-cyan-300 cursor-pointer">
                    <Plus className="h-4 w-4" /> Add New Card
                  </button>
                </div>
                {eventCards.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">No event cards yet. Press Add New Card to create one.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {eventCards.map((card, index) => (
                      <article key={card.id} className="rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-[#10283C] to-[#0B1726] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200">CARD {index + 1}</span>
                          <span className={'text-[10px] font-bold ' + (card.visible ? 'text-emerald-300' : 'text-slate-500')}>{card.visible ? 'VISIBLE' : 'HIDDEN'}</span>
                        </div>
                        <h4 className="font-black">{card.title || 'Untitled card'}</h4>
                        <p className="mt-2 min-h-14 text-xs leading-5 text-slate-400">{card.description || 'Add a short description for this card.'}</p>
                        <div className="mt-4 flex gap-2">
                          <button onClick={() => setEditingCard(card.id)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-cyan-400/30 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-400/10 cursor-pointer">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => setEventCards(previous => previous.map(item => item.id === card.id ? { ...item, visible: !item.visible } : item))} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold cursor-pointer">
                            {card.visible ? 'Hide' : 'Show'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete({
                              title: 'Remove Event Card',
                              description: `Delete event card "${card.title || 'Untitled'}"?`,
                              confirmLabel: 'Remove Card',
                              onConfirm: () => setEventCards(previous => previous.filter(item => item.id !== card.id)),
                            })}
                            aria-label="Remove event card"
                            className="rounded-lg border border-rose-400/30 px-3 py-2 text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <div className="mt-5 flex justify-end">
                  <button onClick={() => void saveEventCards()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50 cursor-pointer">
                    <Save className="h-4 w-4" /> Save Event Cards
                  </button>
                </div>
              </section>
              {editingCard && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-lg rounded-3xl border border-cyan-400/30 bg-[#0B1A2B] p-6 shadow-2xl">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-lg font-black">{eventCards.find(card => card.id === editingCard)?.title ? 'Edit Event Card' : 'Add Event Card'}</h3>
                      <button onClick={() => setEditingCard(null)} aria-label="Close card editor" className="cursor-pointer"><X /></button>
                    </div>
                    {(() => {
                      const card = eventCards.find(item => item.id === editingCard);
                      if (!card) return null;
                      return (
                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-slate-300">
                            Card Title
                            <input className={inputClass + ' mt-2'} value={card.title} maxLength={80} onChange={event => setEventCards(previous => previous.map(item => item.id === card.id ? { ...item, title: event.target.value } : item))} placeholder="e.g. Jersey" />
                          </label>
                          <label className="block text-xs font-bold text-slate-300">
                            Card Description
                            <textarea className={inputClass + ' mt-2'} rows={4} maxLength={360} value={card.description} onChange={event => setEventCards(previous => previous.map(item => item.id === card.id ? { ...item, description: event.target.value } : item))} placeholder="Write a short description..." />
                          </label>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setEventCards(previous => previous.filter(item => item.id !== card.id)); setEditingCard(null); }} className="rounded-xl border border-rose-400/30 px-4 py-2.5 text-sm font-bold text-rose-300 cursor-pointer">Remove</button>
                            <button onClick={() => { if (!card.title.trim()) { showMessage('Card title is required.', 'error'); return; } setEditingCard(null); showMessage('Card updated. Press Save Event Cards to publish it.'); }} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-[#03111D] cursor-pointer"><Check className="mr-1 inline h-4 w-4" /> Done</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}

          {active === '03. Registration Settings' && (
            <>
              <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-[#073353] to-[#0B2440] p-5">
                <h2 className="text-xl font-black">Registration, Sections & Payment Settings</h2>
                <p className="mt-1 text-sm text-slate-300">Manage male academic categories/sections, group payment channels, and registration access controls.</p>
              </section>

              {/* Box-Based Male-Only Section Management */}
              <section className={panelClass}>
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-cyan-300" />
                      <h3 className="text-lg font-black">Male Sections & Categories</h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Add, edit, or remove academic categories and section tags (strictly Male-Only). Changes sync straight to the registration form.
                    </p>
                  </div>
                  <div className="flex w-full sm:w-auto gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                      placeholder="New category (e.g. Special)"
                      className="min-w-0 flex-1 sm:w-52 rounded-xl border border-white/15 bg-[#13263A] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/70"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2.5 text-xs sm:text-sm font-black text-[#03111D] hover:bg-cyan-300 shrink-0 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Add Category
                    </button>
                  </div>
                </div>

                {categories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#091524] p-8 text-center">
                    <p className="text-sm text-slate-300 font-semibold">No male categories configured yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Use the input above to create a category like Science, Business Studies, or Humanities.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex flex-col rounded-2xl border border-cyan-400/20 bg-[#081524] p-4">
                        <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                          <div className="min-w-0">
                            <h4 className="font-black text-base text-white truncate">{cat.name}</h4>
                            <span className="text-[11px] font-mono text-cyan-300/80">{cat.sections.length} male section{cat.sections.length === 1 ? '' : 's'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete({
                              title: `Remove "${cat.name}" Category`,
                              description: `Delete category "${cat.name}" and all ${cat.sections.length} section(s) inside it?`,
                              confirmLabel: 'Remove Category',
                              onConfirm: () => {
                                setCategories(prev => prev.filter(c => c.id !== cat.id));
                                showMessage(`Category "${cat.name}" removed. Press Save Section Settings to publish.`);
                              },
                            })}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 shrink-0 cursor-pointer"
                            title="Remove Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>

                        {/* Section Box/Tag Grid */}
                        <div className="flex-1 mb-4">
                          {cat.sections.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-white/10 py-4 text-center text-xs text-slate-400">
                              No sections in {cat.name}. Add one below.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {cat.sections.map(sec => {
                                const isEditing = editingSection?.catId === cat.id && editingSection.oldName === sec;
                                if (isEditing) {
                                  return (
                                    <div key={sec} className="flex items-center gap-1 rounded-xl border border-cyan-400 bg-[#12263C] px-2 py-1">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={editingSection.value}
                                        onChange={e => setEditingSection(prev => (prev ? { ...prev, value: e.target.value } : null))}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') { e.preventDefault(); handleSaveEditedSection(); }
                                          if (e.key === 'Escape') setEditingSection(null);
                                        }}
                                        className="w-20 bg-transparent text-xs font-mono font-bold text-white outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleSaveEditedSection}
                                        className="rounded p-1 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                                        aria-label="Save section ID"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSection(null)}
                                        className="rounded p-1 text-slate-400 hover:bg-white/10 cursor-pointer"
                                        aria-label="Cancel editing section ID"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={sec}
                                    className="group inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-[#10253A] px-2.5 py-1.5 text-xs font-mono font-bold text-cyan-100 shadow-sm hover:border-cyan-400/60"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setEditingSection({ catId: cat.id, oldName: sec, value: sec })}
                                      className="flex items-center gap-1.5 hover:text-cyan-300 cursor-pointer"
                                      title="Click to edit section ID"
                                    >
                                      <span>{sec}</span>
                                      <Pencil className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDelete({
                                        title: `Remove Section "${sec}"`,
                                        description: `Remove section "${sec}" from ${cat.name}?`,
                                        confirmLabel: 'Remove Section',
                                        onConfirm: () => {
                                          setCategories(prev =>
                                            prev.map(c =>
                                              c.id === cat.id
                                                ? { ...c, sections: c.sections.filter(s => s !== sec) }
                                                : c
                                            )
                                          );
                                          showMessage(`Section "${sec}" removed. Press Save Section Settings to publish.`);
                                        },
                                      })}
                                      className="rounded p-0.5 text-rose-300/75 hover:bg-rose-500/20 hover:text-rose-200 cursor-pointer"
                                      aria-label={`Remove section ${sec}`}
                                      title="Remove section"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Add Section Inline Input */}
                        <div className="flex gap-2 pt-2 border-t border-white/10">
                          <input
                            type="text"
                            value={newSectionInputs[cat.id] || ''}
                            onChange={e => setNewSectionInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSectionToCategory(cat.id); } }}
                            placeholder="Add section ID (e.g. ScB4)"
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#13263A] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/70"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSectionToCategory(cat.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 shrink-0 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void persistSectionCategories(categories, 'Male sections saved and synced to the registration portal.')}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-4 w-4" /> Save Section Settings
                  </button>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-3">
                {groups.map((group, index) => (
                  <div key={group.path} className="rounded-2xl border border-cyan-400/20 bg-[#0B1A2B] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-black">{group.name}</h3>
                        <p className="text-xs text-slate-400">Academic group payment numbers</p>
                      </div>
                      <CreditCard className="h-5 w-5 text-cyan-300" />
                    </div>
                    <label className="mb-4 block text-xs font-bold text-pink-200">
                      bKash Number
                      <input className={inputClass + ' mt-2 border-pink-400/25'} inputMode="tel" value={group.bkash} onChange={event => setGroups(previous => previous.map((item, i) => i === index ? { ...item, bkash: event.target.value } : item))} placeholder="01XXXXXXXXX" />
                    </label>
                    <label className="block text-xs font-bold text-orange-200">
                      Nagad Number
                      <input className={inputClass + ' mt-2 border-orange-400/25'} inputMode="tel" value={group.nagad} onChange={event => setGroups(previous => previous.map((item, i) => i === index ? { ...item, nagad: event.target.value } : item))} placeholder="01XXXXXXXXX" />
                    </label>
                  </div>
                ))}
              </section>

              <section className={panelClass}>
                <h3 className="mb-4 text-lg font-black">Registration Controls</h3>
                <div className="grid gap-4 xl:grid-cols-2">{filtered.map(renderSetting)}</div>
                <div className="mt-5 flex justify-end">
                  <button onClick={() => void savePaymentsAndControls()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50 cursor-pointer">
                    <Save className="h-4 w-4" /> Save Payment & Controls
                  </button>
                </div>
              </section>
            </>
          )}

          {active === '05. Important Notice' && (
            <>
              <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-[#073353] to-[#0B2440] p-5">
                <h2 className="text-xl font-black">Important Notice Management</h2>
                <p className="mt-1 text-sm text-slate-300">Header scrolling ticker notices and popup slideshow announcements are managed independently below.</p>
              </section>

              {/* Section A: Animated Header Notice Ticker */}
              <section className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><Radio className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-lg font-black">Header Announcement Ticker</h3>
                      <p className="text-xs text-slate-400">
                        Continuous right-to-left TV-news scrolling ticker below the navbar. Automatically hides when 0 notices exist.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300">
                      {headerNoticeConfig.enabled ? 'Ticker Enabled' : 'Ticker Disabled'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={headerNoticeConfig.enabled}
                      onClick={() => setHeaderNoticeConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={'relative h-6 w-11 rounded-full transition cursor-pointer ' + (headerNoticeConfig.enabled ? 'bg-cyan-500' : 'bg-slate-600')}
                    >
                      <span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition ' + (headerNoticeConfig.enabled ? 'left-6' : 'left-1')} />
                    </button>
                  </div>
                </div>

                {/* Add Header Notice Bar */}
                <div className="mb-4 flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={newHeaderNoticeText}
                    onChange={e => setNewHeaderNoticeText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddHeaderNotice(); } }}
                    placeholder="Type a new header ticker announcement..."
                    className={inputClass + ' flex-1'}
                  />
                  <button
                    type="button"
                    onClick={handleAddHeaderNotice}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-3 text-xs sm:text-sm font-black text-[#03111D] hover:bg-cyan-300 shrink-0 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add Notice
                  </button>
                </div>

                {/* Existing Header Notices */}
                {headerNoticeConfig.notices.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 bg-[#081524] p-6 text-center text-xs sm:text-sm text-slate-400">
                    No header notices configured. The announcement ticker bar will stay hidden on the website.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {headerNoticeConfig.notices.map((notice, idx) => (
                      <div key={notice.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-white/10 bg-[#081524] p-3">
                        <span className="inline-flex items-center justify-center rounded-lg bg-cyan-400/10 px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-300 shrink-0 self-start sm:self-center">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={notice.text}
                          onChange={e => setHeaderNoticeConfig(prev => ({
                            ...prev,
                            notices: prev.notices.map(n => (n.id === notice.id ? { ...n, text: e.target.value } : n)),
                          }))}
                          placeholder="Enter announcement text..."
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#13263A] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70"
                        />
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({
                            title: 'Delete Header Notice',
                            description: `Delete header notice #${idx + 1}?`,
                            confirmLabel: 'Delete Notice',
                            onConfirm: () => {
                              setHeaderNoticeConfig(prev => ({
                                ...prev,
                                notices: prev.notices.filter(n => n.id !== notice.id),
                              }));
                            },
                          })}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void saveHeaderNotices()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-4 w-4" /> Save Header Notices
                  </button>
                </div>
              </section>

              {/* Section B: Popup News Automatic Slideshow */}
              <section className={panelClass}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><MessageSquareText className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-lg font-black">Popup News Slideshow</h3>
                      <p className="text-xs text-slate-400">
                        Automatic popup carousel on site visit. Shows 1 news item at a time and cycles automatically when 2+ active items exist.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <span>Interval (sec):</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={popupNoticeConfig.intervalSeconds}
                        onChange={e => {
                          const parsed = parseInt(e.target.value, 10);
                          setPopupNoticeConfig(prev => ({
                            ...prev,
                            intervalSeconds: Number.isNaN(parsed) ? 3 : Math.min(60, Math.max(1, parsed)),
                          }));
                        }}
                        className="w-16 rounded-lg border border-white/15 bg-[#13263A] px-2.5 py-1.5 text-center font-mono text-sm text-white outline-none focus:border-cyan-400"
                      />
                    </label>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-300">
                        {popupNoticeConfig.enabled ? 'Popup Enabled' : 'Popup Disabled'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={popupNoticeConfig.enabled}
                        onClick={() => setPopupNoticeConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={'relative h-6 w-11 rounded-full transition cursor-pointer ' + (popupNoticeConfig.enabled ? 'bg-cyan-500' : 'bg-slate-600')}
                      >
                        <span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition ' + (popupNoticeConfig.enabled ? 'left-6' : 'left-1')} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Active slides: <strong className="text-cyan-200">{popupNoticeConfig.items.filter(i => i.enabled !== false && (i.title.trim() || i.message.trim())).length}</strong> / {popupNoticeConfig.items.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPopupItem}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs sm:text-sm font-black text-[#03111D] hover:bg-cyan-300 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add News Item
                  </button>
                </div>

                {popupNoticeConfig.items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 bg-[#081524] p-6 text-center text-xs sm:text-sm text-slate-400">
                    No popup news items created. Press Add News Item to add a slideshow announcement.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {popupNoticeConfig.items.map((item, idx) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-[#081524] p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-[11px] font-mono font-bold text-cyan-300">
                              SLIDE #{idx + 1}
                            </span>
                            <span className={'text-[11px] font-bold ' + (item.enabled !== false ? 'text-emerald-300' : 'text-slate-500')}>
                              {item.enabled !== false ? 'ACTIVE' : 'DISABLED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPopupNoticeConfig(prev => ({
                                ...prev,
                                items: prev.items.map(slide => (slide.id === item.id ? { ...slide, enabled: slide.enabled === false } : slide)),
                              }))}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 cursor-pointer"
                            >
                              {item.enabled !== false ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({
                                title: `Delete Popup Slide #${idx + 1}`,
                                description: `Remove "${item.title || 'Untitled Notice'}" from popup slideshow?`,
                                confirmLabel: 'Delete Slide',
                                onConfirm: () => {
                                  setPopupNoticeConfig(prev => ({
                                    ...prev,
                                    items: prev.items.filter(slide => slide.id !== item.id),
                                  }));
                                },
                              })}
                              className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 inline mr-1" /> Delete
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => setPopupNoticeConfig(prev => ({
                              ...prev,
                              items: prev.items.map(slide => (slide.id === item.id ? { ...slide, title: e.target.value } : slide)),
                            }))}
                            placeholder="Slide Headline (e.g. Important Announcement)"
                            className={inputClass}
                          />
                          <textarea
                            rows={3}
                            value={item.message}
                            onChange={e => setPopupNoticeConfig(prev => ({
                              ...prev,
                              items: prev.items.map(slide => (slide.id === item.id ? { ...slide, message: e.target.value } : slide)),
                            }))}
                            placeholder="Write popup notice message..."
                            className={inputClass + ' resize-y leading-6'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void savePopupNotices()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-4 w-4" /> Save Popup Notices
                  </button>
                </div>
              </section>
            </>
          )}

          {active !== 'overview' && active !== '02. Event Settings' && active !== '03. Registration Settings' && active !== '05. Important Notice' && (
            <section className={panelClass}>
              <div className="mb-5">
                <h2 className="text-lg font-black">{activeTitle}</h2>
                <p className="mt-1 text-sm text-slate-400">Edit the current configuration values.</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">{filtered.map(renderSetting)}</div>
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button onClick={() => { const next = { ...values }; filtered.forEach(item => { next[item.path] = read(item.path, item.defaultValue); }); setValues(next); showMessage('Unsaved changes discarded.'); }} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-300 cursor-pointer">
                  Cancel
                </button>
                <button onClick={() => void saveSettings()} disabled={saving || !filtered.length} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50 cursor-pointer">
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              </div>
            </section>
          )}

          {message && (
            <p role="status" className={'rounded-xl p-3 text-sm ' + (messageType === 'success' ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border border-rose-400/20 bg-rose-500/10 text-rose-200')}>
              {message}
            </p>
          )}
          <footer className="border-t border-white/10 pt-4 text-xs text-slate-500">Rag Day 27 · Super Admin · Live website configuration</footer>
        </div>
      </main>

      {/* In-App Delete Confirmation Modal (avoids window.confirm inside iframes) */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[450] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-400/35 bg-[#0B1A2B] p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-500/15 p-2.5 text-rose-300 border border-rose-400/30 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">{confirmDelete.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-300">{confirmDelete.description}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDelete.onConfirm();
                  setConfirmDelete(null);
                }}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-400 cursor-pointer"
              >
                {confirmDelete.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0B1A2B] p-5">
    <div className="mb-4 inline-flex rounded-xl bg-cyan-400/10 p-3 text-cyan-300">{icon}</div>
    <p className="text-xs text-slate-400">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);
