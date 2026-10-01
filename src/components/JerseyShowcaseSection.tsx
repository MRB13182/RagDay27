import React from 'react';
import { Shirt, CheckCircle2 } from 'lucide-react';
import { JerseyDesignCard, JerseyShowcaseSettings } from '../types';

interface JerseyShowcaseSectionProps {
  cards?: JerseyDesignCard[];
  settings?: JerseyShowcaseSettings;
  onRegisterClick?: () => void;
  className?: string;
}

export const JerseyShowcaseSection: React.FC<JerseyShowcaseSectionProps> = ({
  cards,
  settings,
  onRegisterClick,
  className = '',
}) => {
  // Determine effective cards from props or settings
  const sourceCards: JerseyDesignCard[] =
    (cards && cards.length > 0)
      ? cards
      : (settings?.designCards && settings.designCards.length > 0)
      ? settings.designCards
      : [];

  // Default fallback if no card blocks are configured
  const displayCards: JerseyDesignCard[] =
    sourceCards.length > 0
      ? sourceCards
      : [
          {
            id: 'jersey-design-card-default',
            title: 'Official Rag Day Jersey',
            description: 'Premium white jersey with custom Batch 27 print.',
            image: '',
            imageFilename: 'jersey-one.png',
          },
        ];

  // Dynamic grid column layout based on card count
  const gridClasses =
    displayCards.length === 1
      ? 'max-w-xl mx-auto'
      : displayCards.length === 2
      ? 'grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 sm:gap-8'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-6 sm:gap-8';

  return (
    <section className={`py-10 sm:py-16 relative overflow-hidden ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#5B5FEF]/10 via-[#00D4FF]/10 to-[#7A6CFF]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-md mb-3">
            <Shirt className="w-3.5 h-3.5 text-[#5B5FEF]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Official Merchandise
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Batch 2027 Jersey Showcase
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Every registered member receives the authentic high-performance squad kit with personalized print.
          </p>
        </div>

        {/* Dynamic Jersey Design Cards Grid (1 card, 2 cards, 3 cards, unlimited) */}
        <div className={gridClasses}>
          {displayCards.map((card) => (
            <div
              key={card.id}
              className="relative rounded-3xl p-4 sm:p-5 bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(91,95,239,0.12)] transition-all duration-300 hover:shadow-[0_25px_60px_rgba(91,95,239,0.18)] hover:-translate-y-1 flex flex-col justify-between"
            >
              {/* Top: Large Image Area */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center shadow-inner group">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[200px]">
                    <Shirt className="w-12 h-12 mb-2 text-slate-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-400">Image unavailable</span>
                    {card.imageFilename && (
                      <span className="text-[10px] text-slate-500 font-mono mt-1">
                        ({card.imageFilename})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom: Title & Description */}
              <div className="pt-4 space-y-1.5 px-1">
                <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Register CTA under showcase */}
        {onRegisterClick && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onRegisterClick}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#5B5FEF] hover:text-[#4a4ed4] hover:underline cursor-pointer"
            >
              <span>Customize your name & size on registration</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
