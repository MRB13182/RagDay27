import React from 'react';
import { EventCard } from '../types';
import {
  Calendar,
  MapPin,
  CreditCard,
  Clock,
  Sparkles,
  Award,
  Shirt,
  Users,
  Music,
  Info,
} from 'lucide-react';

interface EventInformationSectionProps {
  cards: EventCard[];
  layout?: 'two-column' | 'one-column' | string;
}

export const renderCardIcon = (iconName: string, className = 'w-5 h-5') => {
  switch (iconName.toLowerCase()) {
    case 'calendar':
      return <Calendar className={className} />;
    case 'map-pin':
    case 'location':
      return <MapPin className={className} />;
    case 'credit-card':
    case 'fee':
    case 'payment':
      return <CreditCard className={className} />;
    case 'clock':
    case 'time':
    case 'deadline':
      return <Clock className={className} />;
    case 'sparkles':
    case 'magic':
      return <Sparkles className={className} />;
    case 'award':
    case 'trophy':
      return <Award className={className} />;
    case 'shirt':
    case 'jersey':
      return <Shirt className={className} />;
    case 'users':
    case 'students':
      return <Users className={className} />;
    case 'music':
    case 'concert':
      return <Music className={className} />;
    default:
      return <Info className={className} />;
  }
};

const getColorConfig = (color: string) => {
  switch (color.toLowerCase()) {
    case 'cyan':
      return {
        cardBorder: 'border-cyan-200/90 hover:border-cyan-400',
        badgeBg: 'bg-cyan-500/10 text-cyan-700',
        accentText: 'text-cyan-600',
        glow: 'hover:shadow-[0_15px_30px_-10px_rgba(6,182,212,0.18)]',
      };
    case 'emerald':
      return {
        cardBorder: 'border-emerald-200/90 hover:border-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-700',
        accentText: 'text-emerald-600',
        glow: 'hover:shadow-[0_15px_30px_-10px_rgba(16,185,129,0.18)]',
      };
    case 'amber':
      return {
        cardBorder: 'border-amber-200/90 hover:border-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-700',
        accentText: 'text-amber-600',
        glow: 'hover:shadow-[0_15px_30px_-10px_rgba(245,158,11,0.18)]',
      };
    case 'rose':
      return {
        cardBorder: 'border-rose-200/90 hover:border-rose-400',
        badgeBg: 'bg-rose-500/10 text-rose-700',
        accentText: 'text-rose-600',
        glow: 'hover:shadow-[0_15px_30px_-10px_rgba(244,63,94,0.18)]',
      };
    case 'purple':
      return {
        cardBorder: 'border-purple-200/90 hover:border-purple-400',
        badgeBg: 'bg-purple-500/10 text-purple-700',
        accentText: 'text-purple-600',
        glow: 'hover:shadow-[0_15px_30px_-10px_rgba(168,85,247,0.18)]',
      };
    case 'blue':
      return {
        cardBorder: 'border-blue-200/90 hover:border-blue-400',
        badgeBg: 'bg-blue-500/10 text-blue-700',
        accentText: 'text-blue-600',
        glow: 'hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.18)]',
      };
    case 'indigo':
    default:
      return {
        cardBorder: 'border-[#5B5FEF]/25 hover:border-[#5B5FEF]/60',
        badgeBg: 'bg-[#5B5FEF]/10 text-[#5B5FEF]',
        accentText: 'text-[#5B5FEF]',
        glow: 'hover:shadow-[0_15px_30px_-10px_rgba(91,95,239,0.2)]',
      };
  }
};

export const EventInformationSection: React.FC<EventInformationSectionProps> = ({
  cards,
  layout = 'two-column',
}) => {
  const visibleCards = cards
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleCards.length === 0) return null;

  const isOneColumn = layout === 'one-column';

  return (
    <section className="py-6 sm:py-8 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200 shadow-sm backdrop-blur-sm mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5B5FEF]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Essential Schedule & Key Details
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Event Information
          </h2>
        </div>

        {/* Dynamic Cards Grid according to Super Admin event-card-layout */}
        <div
          className={
            isOneColumn
              ? 'grid grid-cols-1 max-w-2xl mx-auto gap-4 sm:gap-6'
              : 'grid grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto gap-4 sm:gap-6'
          }
        >
          {visibleCards.map((card) => {
            const colors = getColorConfig(card.customColor);
            return (
              <div
                key={card.id}
                className={`relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/75 backdrop-blur-xl border ${colors.cardBorder} shadow-sm transition-all duration-300 hover:-translate-y-1 ${colors.glow} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl ${colors.badgeBg} flex items-center justify-center shadow-inner`}>
                      {renderCardIcon(card.icon, 'w-5 h-5')}
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      #{card.order}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {card.title}
                  </h3>

                  <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {card.description}
                  </div>
                </div>

                {card.subDetail && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-slate-500 font-medium">
                    <span>{card.subDetail}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
