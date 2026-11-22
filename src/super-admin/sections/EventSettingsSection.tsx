import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import {
  EDITABLE_SUPER_ADMIN_TEXT_FILES,
  getSavedSuperAdminText,
  saveEditableSuperAdminBatch,
} from '../../lib/superAdminTextSettings';
import { parseEventCardsContent, parseJerseyDesignContent } from '../../lib/superAdminConfig';
import type { ConfirmModalState, EventCardDraft, SuperAdminFeedback } from '../types';
import {
  OrderControls,
  SectionHeader,
  ToggleButton,
  inputClass,
  panelClass,
  textareaClass,
} from '../components/SuperAdminUI';

const PATH_EVENT_NAME = '02. event-settings/Text/Event name.txt';
const PATH_EVENT_DATE = '02. event-settings/Text/Event date.txt';
const PATH_COUNTDOWN_DATE = '02. event-settings/Text/Event countdown.txt';
const PATH_COUNTDOWN_TOGGLE = '02. event-settings/Text/Countdown enable disable.txt';
const PATH_VENUE = '02. event-settings/Text/Venue.txt';
const PATH_JERSEY_TEXT = '02. event-settings/Text/Jersey design.txt';
const PATH_EVENT_CARDS = '02. event-settings/Text/Event card.txt';

const defaultFor = (path: string) =>
  EDITABLE_SUPER_ADMIN_TEXT_FILES.find(item => item.path === path)?.defaultValue ?? '';

function toLocalDateTimeInput(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function serializeEventCards(cards: EventCardDraft[]): string {
  return cards
    .filter(card => card.title.trim())
    .map(card => {
      const lines = [
        `Title: ${card.title.trim()}`,
        `Description: ${card.description.trim()}`,
      ];
      if (!card.visible) {
        lines.push('Visible: false');
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

function serializeJerseyDesign(title: string, description: string, imageFilename: string): string {
  return [
    `Title: ${title.trim() || 'Official Rag Day Jersey'}`,
    `Description: ${description.trim() || 'Custom Squad Kit with Personalized Back Name & Number Print Included'}`,
    `Image: ${imageFilename.trim() || 'jersey-design.png'}`,
  ].join('\n');
}

interface EventSettingsSectionProps {
  syncVersion: number;
  onFeedback: (feedback: SuperAdminFeedback) => void;
  onRequestConfirm: (modal: ConfirmModalState) => void;
}

export const EventSettingsSection: React.FC<EventSettingsSectionProps> = ({
  syncVersion,
  onFeedback,
  onRequestConfirm,
}) => {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [countdownEnabled, setCountdownEnabled] = useState(true);
  const [venue, setVenue] = useState('');
  const [jerseyTitle, setJerseyTitle] = useState('');
  const [jerseyDescription, setJerseyDescription] = useState('');
  const [jerseyImageFilename, setJerseyImageFilename] = useState('jersey-design.png');

  const [cards, setCards] = useState<EventCardDraft[]>([]);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [savingCore, setSavingCore] = useState(false);
  const [savingCards, setSavingCards] = useState(false);

  const hydrate = () => {
    setEventName(getSavedSuperAdminText(PATH_EVENT_NAME, defaultFor(PATH_EVENT_NAME)));

    const countdownRaw = getSavedSuperAdminText(
      PATH_COUNTDOWN_DATE,
      getSavedSuperAdminText(
        '04. countdown-settings/Text/Countdown of Event.txt',
        getSavedSuperAdminText(PATH_EVENT_DATE, defaultFor(PATH_COUNTDOWN_DATE))
      )
    );
    setEventDate(toLocalDateTimeInput(countdownRaw) || countdownRaw);

    const toggleRaw = getSavedSuperAdminText(
      PATH_COUNTDOWN_TOGGLE,
      getSavedSuperAdminText('04. countdown-settings/Text/Enable Disable.txt', defaultFor(PATH_COUNTDOWN_TOGGLE))
    );
    setCountdownEnabled(!/^(disable|disabled)$/i.test(toggleRaw.trim()));

    setVenue(getSavedSuperAdminText(PATH_VENUE, defaultFor(PATH_VENUE)));

    const jerseyRaw = getSavedSuperAdminText(PATH_JERSEY_TEXT, defaultFor(PATH_JERSEY_TEXT));
    const parsedJersey = parseJerseyDesignContent(jerseyRaw)[0];
    setJerseyTitle(parsedJersey?.title || 'Official Rag Day Jersey');
    setJerseyDescription(parsedJersey?.description || '');
    setJerseyImageFilename(parsedJersey?.imageFilename || 'jersey-design.png');

    const cardRaw = getSavedSuperAdminText(PATH_EVENT_CARDS, defaultFor(PATH_EVENT_CARDS));
    const parsedCards = parseEventCardsContent(cardRaw);
    setCards(
      parsedCards.map((c, idx) => ({
        id: c.id || `card-${idx + 1}`,
        title: c.title,
        description: c.description,
        visible: c.visible !== false,
      }))
    );
  };

  useEffect(() => {
    hydrate();
  }, [syncVersion]);

  const handleSaveCoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      onFeedback({ type: 'error', text: 'Event Name is required.' });
      return;
    }

    const formattedDate =
      eventDate.trim().length === 16 ? `${eventDate.trim()}:00` : eventDate.trim();

    setSavingCore(true);
    try {
      await saveEditableSuperAdminBatch([
        { path: PATH_EVENT_NAME, content: eventName.trim() },
        { path: PATH_EVENT_DATE, content: formattedDate },
        { path: PATH_COUNTDOWN_DATE, content: formattedDate },
        { path: PATH_COUNTDOWN_TOGGLE, content: countdownEnabled ? 'enable' : 'disable' },
        { path: PATH_VENUE, content: venue.trim() },
        {
          path: PATH_JERSEY_TEXT,
          content: serializeJerseyDesign(jerseyTitle, jerseyDescription, jerseyImageFilename),
        },
      ]);
      onFeedback({
        type: 'success',
        text: 'Event settings & countdown configuration saved to database.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save Event Settings.',
      });
    } finally {
      setSavingCore(false);
    }
  };

  const handleAddCard = () => {
    const newId = `card-${Date.now()}`;
    setCards(prev => [
      ...prev,
      {
        id: newId,
        title: 'New Event Highlight',
        description: 'Enter highlight details shown on the public event board.',
        visible: true,
      },
    ]);
    setEditingCardId(newId);
  };

  const handleMoveCard = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= cards.length) return;
    setCards(prev => {
      const copy = [...prev];
      [copy[index], copy[nextIdx]] = [copy[nextIdx], copy[index]];
      return copy;
    });
  };

  const handleDeleteCard = (card: EventCardDraft) => {
    onRequestConfirm({
      title: 'Delete Event Card',
      description: `Remove "${card.title || 'this card'}" from the event information list? Save cards afterwards to publish the change.`,
      confirmLabel: 'Remove Card',
      onConfirm: () => {
        setCards(prev => prev.filter(c => c.id !== card.id));
        if (editingCardId === card.id) setEditingCardId(null);
      },
    });
  };

  const handleSaveCards = async () => {
    if (cards.some(c => !c.title.trim())) {
      onFeedback({ type: 'error', text: 'Every event card must have a title.' });
      return;
    }

    setSavingCards(true);
    try {
      await saveEditableSuperAdminBatch([
        { path: PATH_EVENT_CARDS, content: serializeEventCards(cards) },
      ]);
      setEditingCardId(null);
      onFeedback({
        type: 'success',
        text: 'Event information cards saved and synced to the public homepage.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save event cards.',
      });
    } finally {
      setSavingCards(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Event Settings"
        subtitle="Manage the event title, date & countdown timer, venue, jersey showcase text, and event highlight cards."
      />

      {/* Core Event, Countdown & Jersey Showcase Form */}
      <form onSubmit={handleSaveCoreSettings} className={`${panelClass} space-y-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9D0D9]/12 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#F5F7FA]">General Event & Countdown</h3>
            <p className="text-xs text-[#8993A1]">
              Event date automatically updates the hero countdown timer.
            </p>
          </div>
          <ToggleButton
            enabled={countdownEnabled}
            onToggle={() => setCountdownEnabled(v => !v)}
            enabledLabel="Countdown Visible"
            disabledLabel="Countdown Hidden"
            ariaLabel="Toggle event countdown timer"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="RAG DAY of NIC 27"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
              Event Date & Countdown Target
            </label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="Central Amphitheatre"
              className={inputClass}
            />
          </div>
        </div>

        <div className="border-t border-[#C9D0D9]/12 pt-5 space-y-4">
          <h4 className="text-sm font-bold text-[#F5F7FA]">Jersey Showcase Copy</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
                Showcase Title
              </label>
              <input
                type="text"
                value={jerseyTitle}
                onChange={e => setJerseyTitle(e.target.value)}
                placeholder="Official Rag Day Jersey"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#C9D0D9] mb-2">
                Showcase Description
              </label>
              <input
                type="text"
                value={jerseyDescription}
                onChange={e => setJerseyDescription(e.target.value)}
                placeholder="Custom Squad Kit with Personalized Back Name & Number Print Included"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#C9D0D9]/12 pt-4">
          <button
            type="submit"
            disabled={savingCore}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8BEAFF] px-5 py-2.5 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingCore ? 'Saving…' : 'Save Event Settings'}</span>
          </button>
        </div>
      </form>

      {/* Event Info Cards CRUD */}
      <div className={`${panelClass} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C9D0D9]/12 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#F5F7FA]">Event Information Cards</h3>
            <p className="text-xs text-[#8993A1]">
              Add, edit, show/hide, or reorder cards displayed on the public event section.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddCard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9D0D9]/22 bg-[#141B29] px-3.5 py-2 text-xs font-semibold text-[#F5F7FA] hover:border-[#8BEAFF]/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 text-[#8BEAFF]" />
              <span>Add Card</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCards()}
              disabled={savingCards}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#8BEAFF] px-4 py-2 text-xs font-bold text-[#08090D] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingCards ? 'Saving…' : 'Save Cards'}</span>
            </button>
          </div>
        </div>

        {cards.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8993A1]">
            No event information cards configured yet. Click "Add Card" to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {cards.map((card, index) => {
              const isEditing = editingCardId === card.id;
              return (
                <div
                  key={card.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    card.visible
                      ? 'border-[#C9D0D9]/16 bg-[#0A0E17]'
                      : 'border-[#C9D0D9]/10 bg-[#090C13]/60 opacity-65'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={card.title}
                            onChange={e =>
                              setCards(prev =>
                                prev.map(item =>
                                  item.id === card.id ? { ...item, title: e.target.value } : item
                                )
                              )
                            }
                            placeholder="Card title"
                            className={inputClass}
                          />
                          <textarea
                            rows={2}
                            value={card.description}
                            onChange={e =>
                              setCards(prev =>
                                prev.map(item =>
                                  item.id === card.id
                                    ? { ...item, description: e.target.value }
                                    : item
                                )
                              )
                            }
                            placeholder="Card description"
                            className={textareaClass}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-xs text-[#8993A1] tabular-nums">
                            <span>#{index + 1}</span>
                            <span aria-hidden="true">·</span>
                            <span>{card.visible ? 'Visible on homepage' : 'Hidden'}</span>
                          </div>
                          <h4 className="text-sm font-bold text-[#F5F7FA]">{card.title}</h4>
                          <p className="text-xs text-[#94A0B2] leading-relaxed">
                            {card.description || 'No description'}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <OrderControls
                        index={index}
                        total={cards.length}
                        onMoveUp={() => handleMoveCard(index, -1)}
                        onMoveDown={() => handleMoveCard(index, 1)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCards(prev =>
                            prev.map(item =>
                              item.id === card.id ? { ...item, visible: !item.visible } : item
                            )
                          )
                        }
                        title={card.visible ? 'Hide card' : 'Show card'}
                        aria-label={card.visible ? 'Hide card' : 'Show card'}
                        className="rounded-lg border border-[#C9D0D9]/18 bg-[#121826] p-2 text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-[#8BEAFF] transition-colors cursor-pointer"
                      >
                        {card.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCardId(isEditing ? null : card.id)}
                        title={isEditing ? 'Done editing' : 'Edit card'}
                        aria-label={isEditing ? 'Done editing' : 'Edit card'}
                        className="rounded-lg border border-[#C9D0D9]/18 bg-[#121826] px-2.5 py-2 text-xs font-semibold text-[#C9D0D9] hover:border-[#8BEAFF]/45 hover:text-[#8BEAFF] transition-colors cursor-pointer"
                      >
                        {isEditing ? 'Done' : <Pencil className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card)}
                        title="Delete card"
                        aria-label="Delete card"
                        className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
