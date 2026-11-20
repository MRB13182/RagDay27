import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, CalendarDays, Check, ChevronRight, CreditCard, Globe2,
  LayoutDashboard, LogOut, Menu, Plus, Save, ShieldCheck, SlidersHorizontal,
  Trash2, Pencil, X, Clock3, FileText
} from 'lucide-react';
import { EDITABLE_SUPER_ADMIN_TEXT_FILES, saveEditableSuperAdminText } from '../lib/superAdminTextSettings';
import { getGalleryMedia } from '../services/gallery';

type Props = { onLogout: () => void };
type Setting = { id: string; category: string; label: string; path: string; defaultValue: string };
type EventCardItem = { id: string; title: string; description: string; visible: boolean };
type GroupPayment = { name: string; path: string; bkash: string; nagad: string };

const sections = [
  { id: 'overview', title: 'Dashboard', icon: LayoutDashboard },
  { id: '01. Website Identity', title: 'Website Identity', icon: Globe2 },
  { id: '02. Event Settings', title: 'Event Settings', icon: CalendarDays },
  { id: '03. Registration Settings', title: 'Registration Settings', icon: SlidersHorizontal },
  { id: '04. Countdown Settings', title: 'Countdown Settings', icon: Clock3 },
  { id: '05. Important Notice', title: 'Important Notice', icon: Bell },
  { id: '06. Logo Related', title: 'Logo Related', icon: FileText },
  { id: 'gallery', title: 'Gallery Management', icon: Activity },
];

const EVENT_CARD_PATH = '02. event-settings/Text/Event card.txt';
const GROUP_FILES = [
  { name: 'Science', path: '03. reg-settings/Text/Payment number SC.txt' },
  { name: 'Business Studies', path: '03. reg-settings/Text/Payment number BS.txt' },
  { name: 'Humanities', path: '03. reg-settings/Text/Payment number HU.txt' },
];

const read = (path: string, fallback: string) => {
  try { return localStorage.getItem('super_admin_' + path) ?? fallback; } catch { return fallback; }
};
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
  const [galleryCount, setGalleryCount] = useState(0);
  const [editingCard, setEditingCard] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    EDITABLE_SUPER_ADMIN_TEXT_FILES.filter(item => item.id !== 'jersey-design-image').forEach(item => { next[item.path] = read(item.path, item.defaultValue); });
    setValues(next);

    const cardSetting = EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.id === 'event-card');
    const cardRaw = read(EVENT_CARD_PATH, cardSetting?.defaultValue ?? '');
    setEventCards(parseCards(cardRaw));

    setGroups(GROUP_FILES.map(group => ({
      ...group,
      ...parsePayment(read(group.path, EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.path === group.path)?.defaultValue ?? '')),
    })));
    void getGalleryMedia(true).then(items => setGalleryCount(items.length)).catch(() => setGalleryCount(0));
  }, []);

  const filtered = useMemo(() => EDITABLE_SUPER_ADMIN_TEXT_FILES.filter(item => item.category === active && item.id !== 'jersey-design-image' && item.id !== 'event-card' && !item.id.startsWith('payment-number-')), [active]);
  const configSections = sections.length - 2;

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
    } finally { setSaving(false); }
  };

  const saveEventCards = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveEditableSuperAdminText(EVENT_CARD_PATH, serializeCards(eventCards));
      showMessage('Event cards saved. Homepage cards will use these settings.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save event cards.', 'error');
    } finally { setSaving(false); }
  };

  const savePayments = async () => {
    setSaving(true);
    setMessage('');
    try {
      await Promise.all(groups.map(group => saveEditableSuperAdminText(group.path, 'Bkash: ' + group.bkash.trim() + '\nNagad: ' + group.nagad.trim())));
      showMessage('bKash and Nagad payment numbers saved.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save payment numbers.', 'error');
    } finally { setSaving(false); }
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
          {toggleSetting && <button type="button" role="switch" aria-checked={value.toLowerCase() === 'enable'} onClick={() => toggle(setting)} className={'relative h-6 w-11 rounded-full transition ' + (value.toLowerCase() === 'enable' ? 'bg-cyan-500' : 'bg-slate-600')}><span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition ' + (value.toLowerCase() === 'enable' ? 'left-6' : 'left-1')} /></button>}
        </div>
        <p className="mb-3 text-xs text-slate-400">{toggleSetting ? 'Enable or disable this website feature.' : 'Edit this setting. Changes are saved using the current project settings mechanism.'}</p>
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
        return <button key={section.id} onClick={() => { setActive(section.id); setMobileOpen(false); setMessage(''); }} className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ' + (active === section.id ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
          <Icon className="h-4 w-4" /><span className="flex-1">{section.title}</span>{active === section.id && <ChevronRight className="h-4 w-4" />}
        </button>;
      })}
    </nav>
  );

  const activeTitle = sections.find(section => section.id === active)?.title ?? 'Dashboard';

  return (
    <div className="fixed inset-0 z-[310] flex bg-[#050B14] text-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#081525] p-4 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2"><div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"><ShieldCheck /></div><div><div className="font-black">RAG DAY 27</div><div className="text-[10px] tracking-[.2em] text-cyan-300">SUPER ADMIN</div></div></div>
        {navigation}
        <div className="mt-auto rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs text-slate-400">Configuration console<br /><span className="text-cyan-200">Super Admin session</span></div>
      </aside>

      {mobileOpen && <div className="absolute inset-0 z-20 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)}><aside className="h-full w-72 bg-[#081525] p-4" onClick={event => event.stopPropagation()}><div className="mb-6 flex justify-between font-bold">RAG DAY 27 <button onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button></div>{navigation}</aside></div>}

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#071321]/90 px-4 py-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3"><button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button><div><h1 className="text-lg font-black sm:text-xl">{activeTitle}</h1><p className="text-xs text-slate-400">Manage event content, payment details and website settings.</p></div></div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-rose-400/40 hover:text-rose-200"><LogOut className="h-4 w-4" /> Logout</button>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-7">
          {active === 'overview' && <>
            <section className="rounded-3xl border border-cyan-400/25 bg-gradient-to-r from-[#0B2946] to-[#10233A] p-6"><p className="text-xs font-bold tracking-[.2em] text-cyan-300">WELCOME, SUPER ADMIN</p><h2 className="mt-2 text-2xl font-black">Rag Day 27 Control Center</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Manage website identity, event cards, registration, payment channels, countdown and notices from one place.</p></section>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Configuration Sections" value={String(configSections)} icon={<SlidersHorizontal />} /><Metric label="Event Cards" value={String(eventCards.length)} icon={<LayoutDashboard />} /><Metric label="Gallery Media" value={String(galleryCount)} icon={<Activity />} /><Metric label="Payment Groups" value={String(groups.length)} icon={<CreditCard />} /></section>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sections.filter(section => section.id !== 'overview').map(section => { const Icon = section.icon; return <button key={section.id} onClick={() => setActive(section.id)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B1A2B] p-5 text-left hover:border-cyan-400/40"><span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300"><Icon /></span><span className="font-bold">{section.title}</span><ChevronRight className="ml-auto h-4 w-4 text-slate-500" /></button>; })}</section>
          </>}

          {active === '02. Event Settings' && <>
            <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-[#073353] to-[#0B2440] p-5"><h2 className="text-xl font-black">Event Settings</h2><p className="mt-1 text-sm text-slate-300">Update event details and manage the feature cards displayed on the website.</p></section>
            <section className={panelClass}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Basic Event Information</h3><p className="text-xs text-slate-400">Edit the current event name, date, venue and jersey text.</p></div></div><div className="grid gap-4 xl:grid-cols-2">{filtered.map(renderSetting)}</div><div className="mt-5 flex justify-end"><button onClick={() => void saveSettings()} disabled={saving || !filtered.length} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50"><Save className="h-4 w-4" /> Save Event Information</button></div></section>
            <section className={panelClass}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Event Cards</h3><p className="text-xs text-slate-400">Add, edit, show/hide or remove homepage feature cards.</p></div><button onClick={() => { const id = 'new-' + Date.now(); setEventCards(previous => [...previous, { id, title: '', description: '', visible: true }]); setEditingCard(id); }} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-[#03111D] hover:bg-cyan-300"><Plus className="h-4 w-4" /> Add New Card</button></div>
              {eventCards.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">No event cards yet. Press Add New Card to create one.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{eventCards.map((card, index) => <article key={card.id} className="rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-[#10283C] to-[#0B1726] p-4"><div className="mb-3 flex items-center justify-between"><span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-200">CARD {index + 1}</span><span className={'text-[10px] font-bold ' + (card.visible ? 'text-emerald-300' : 'text-slate-500')}>{card.visible ? 'VISIBLE' : 'HIDDEN'}</span></div><h4 className="font-black">{card.title || 'Untitled card'}</h4><p className="mt-2 min-h-14 text-xs leading-5 text-slate-400">{card.description || 'Add a short description for this card.'}</p><div className="mt-4 flex gap-2"><button onClick={() => setEditingCard(card.id)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-cyan-400/30 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-400/10"><Pencil className="h-3.5 w-3.5" /> Edit</button><button onClick={() => setEventCards(previous => previous.map(item => item.id === card.id ? { ...item, visible: !item.visible } : item))} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold">{card.visible ? 'Hide' : 'Show'}</button><button onClick={() => { if (window.confirm('Remove this event card?')) setEventCards(previous => previous.filter(item => item.id !== card.id)); }} aria-label="Remove event card" className="rounded-lg border border-rose-400/30 px-3 py-2 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
              <div className="mt-5 flex justify-end"><button onClick={() => void saveEventCards()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50"><Save className="h-4 w-4" /> Save Event Cards</button></div>
            </section>
            {editingCard && <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-cyan-400/30 bg-[#0B1A2B] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-black">{eventCards.find(card => card.id === editingCard)?.title ? 'Edit Event Card' : 'Add Event Card'}</h3><button onClick={() => setEditingCard(null)} aria-label="Close card editor"><X /></button></div>{(() => { const card = eventCards.find(item => item.id === editingCard); if (!card) return null; return <div className="space-y-4"><label className="block text-xs font-bold text-slate-300">Card Title<input className={inputClass + ' mt-2'} value={card.title} maxLength={80} onChange={event => setEventCards(previous => previous.map(item => item.id === card.id ? { ...item, title: event.target.value } : item))} placeholder="e.g. Jersey" /></label><label className="block text-xs font-bold text-slate-300">Card Description<textarea className={inputClass + ' mt-2'} rows={4} maxLength={360} value={card.description} onChange={event => setEventCards(previous => previous.map(item => item.id === card.id ? { ...item, description: event.target.value } : item))} placeholder="Write a short description..." /></label><div className="flex justify-end gap-2"><button onClick={() => { setEventCards(previous => previous.filter(item => item.id !== card.id)); setEditingCard(null); }} className="rounded-xl border border-rose-400/30 px-4 py-2.5 text-sm font-bold text-rose-300">Remove</button><button onClick={() => { if (!card.title.trim()) { showMessage('Card title is required.', 'error'); return; } setEditingCard(null); showMessage('Card updated. Press Save Event Cards to publish it.'); }} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-[#03111D]"><Check className="mr-1 inline h-4 w-4" /> Done</button></div></div>; })()}</div></div>}
          </>}

          {active === '03. Registration Settings' && <>
            <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-[#073353] to-[#0B2440] p-5"><h2 className="text-xl font-black">Registration & Payment Settings</h2><p className="mt-1 text-sm text-slate-300">Maintain separate payment channels for each academic group.</p></section>
            <section className="grid gap-4 xl:grid-cols-3">{groups.map((group, index) => <div key={group.path} className="rounded-2xl border border-cyan-400/20 bg-[#0B1A2B] p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-black">{group.name}</h3><p className="text-xs text-slate-400">Academic group payment numbers</p></div><CreditCard className="h-5 w-5 text-cyan-300" /></div><label className="mb-4 block text-xs font-bold text-pink-200">bKash Number<input className={inputClass + ' mt-2 border-pink-400/25'} inputMode="tel" value={group.bkash} onChange={event => setGroups(previous => previous.map((item, i) => i === index ? { ...item, bkash: event.target.value } : item))} placeholder="01XXXXXXXXX" /></label><label className="block text-xs font-bold text-orange-200">Nagad Number<input className={inputClass + ' mt-2 border-orange-400/25'} inputMode="tel" value={group.nagad} onChange={event => setGroups(previous => previous.map((item, i) => i === index ? { ...item, nagad: event.target.value } : item))} placeholder="01XXXXXXXXX" /></label></div>)}</section>
            <section className={panelClass}><h3 className="mb-4 text-lg font-black">Registration Controls</h3><div className="grid gap-4 xl:grid-cols-2">{filtered.map(renderSetting)}</div><div className="mt-5 flex justify-end"><button onClick={() => void savePayments()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50"><Save className="h-4 w-4" /> Save Payment Numbers</button></div></section>
          </>}

          {active === 'gallery' && <section className={panelClass}><h2 className="text-lg font-bold">Gallery Management</h2><p className="mt-2 text-sm leading-6 text-slate-400">Gallery media uses the existing browser IndexedDB manager. This dashboard displays its count only; it does not add image upload, edit or replacement controls.</p><p className="mt-3 text-sm text-cyan-200">Current local media items: {galleryCount}</p></section>}

          {active !== 'overview' && active !== '02. Event Settings' && active !== '03. Registration Settings' && active !== 'gallery' && <section className={panelClass}><div className="mb-5"><h2 className="text-lg font-black">{activeTitle}</h2><p className="mt-1 text-sm text-slate-400">Edit the current configuration values.</p></div><div className="grid gap-4 xl:grid-cols-2">{filtered.map(renderSetting)}</div><div className="mt-6 flex flex-wrap items-center justify-end gap-3"><button onClick={() => { const next = { ...values }; filtered.forEach(item => { next[item.path] = read(item.path, item.defaultValue); }); setValues(next); showMessage('Unsaved changes discarded.'); }} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-300">Cancel</button><button onClick={() => void saveSettings()} disabled={saving || !filtered.length} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black disabled:opacity-50"><Save className="h-4 w-4" /> Save Changes</button></div></section>}

          {message && <p role="status" className={'rounded-xl p-3 text-sm ' + (messageType === 'success' ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border border-rose-400/20 bg-rose-500/10 text-rose-200')}>{message}</p>}
          <footer className="border-t border-white/10 pt-4 text-xs text-slate-500">Rag Day 27 · Super Admin · Live website configuration</footer>
        </div>
      </main>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0B1A2B] p-5"><div className="mb-4 inline-flex rounded-xl bg-cyan-400/10 p-3 text-cyan-300">{icon}</div><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>
);
