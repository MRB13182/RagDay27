import React, { useState } from 'react';
import { Shirt, CheckCircle2, Maximize2, Sparkles } from 'lucide-react';
import { JerseyDesignCard, JerseyShowcaseSettings } from '../types';
import { JerseyShowcaseModal } from './JerseyShowcaseModal';

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
  const [selectedPreviewCard, setSelectedPreviewCard] = useState<JerseyDesignCard | null>(null);

  const sourceCards: JerseyDesignCard[] =
    ((cards && cards.length > 0) ? cards : (settings?.designCards || []))
      .filter(card => !/female|girls|women|lily/i.test(`${card.id} ${card.title} ${card.description} ${card.imageFilename || ''}`));

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

  const gridClasses =
    displayCards.length === 1
      ? 'max-w-2xl mx-auto'
      : displayCards.length === 2
      ? 'grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 sm:gap-8'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-6 sm:gap-8';

  return (
    <section className={`py-10 sm:py-16 relative overflow-hidden ${className}`}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#5B5FEF]/10 via-[#00D4FF]/10 to-[#7A6CFF]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white/90 shadow-[0_4px_16px_rgba(91,95,239,0.06),inset_0_1px_1px_white] backdrop-blur-xl mb-3">
            <Shirt className="w-3.5 h-3.5 text-[#5B5FEF]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Official Merchandise
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Batch 2027 Jersey Showcase
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Every registered member receives the authentic high-performance squad kit with personalized print. Click on any design to open the full interactive lightbox view.
          </p>
        </div>

        <div className={gridClasses}>
          {displayCards.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPreviewCard(card)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedPreviewCard(card);
                }
              }}
              className="relative rounded-3xl p-4 sm:p-5 bg-white/85 backdrop-blur-2xl border border-white/95 shadow-[0_20px_50px_rgba(91,95,239,0.1),inset_0_1.5px_1px_white] transition-all duration-300 hover:shadow-[0_25px_60px_rgba(91,95,239,0.22),inset_0_2px_1.5px_white] hover:-translate-y-1.5 flex flex-col overflow-hidden group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#5B5FEF]/40"
              title="Click to preview full high-resolution jersey artwork"
              aria-label={`Preview ${card.title}`}
            >
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-3xl" />

              {/* Keep the image at its intrinsic ratio; do not force a 4:3 box or crop it. */}
              <div className="relative z-10 w-full overflow-hidden rounded-2xl bg-slate-950/5 group-hover:bg-slate-950/10 transition-colors">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    loading="lazy"
                    decoding="async"
                    className="block w-full h-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ aspectRatio: 'auto' }}
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

                {/* Hover Reveal Badge */}
                <div className="absolute bottom-3 right-3 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 transform sm:translate-y-1 sm:group-hover:translate-y-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-lg">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Expand Artwork</span>
                  </span>
                </div>
              </div>

              {/* Keep the card copy in normal document flow, fully visible below the image. */}
              <div className="relative z-10 pt-4 space-y-1.5 px-1 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900 tracking-tight group-hover:text-[#5B5FEF] transition-colors">
                      {card.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5B5FEF] shrink-0">
                      <Sparkles className="w-3 h-3 text-cyan-500" />
                      4K View
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                    {card.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Front · Back · Sleeve · Crest</span>
                  <span className="text-[#5B5FEF] group-hover:underline">Tap to Zoom & Pan →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {onRegisterClick && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onRegisterClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-white/80 shadow-2xs hover:bg-white/90 text-xs font-bold text-[#5B5FEF] hover:text-[#4a4ed4] transition-all cursor-pointer"
            >
              <span>Customize your name & size on registration</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Jersey Showcase Lightbox Modal */}
      {selectedPreviewCard && (
        <JerseyShowcaseModal
          isOpen={Boolean(selectedPreviewCard)}
          onClose={() => setSelectedPreviewCard(null)}
          imageSrc={selectedPreviewCard.image}
          title={selectedPreviewCard.title}
          description={selectedPreviewCard.description}
        />
      )}
    </section>
  );
};
