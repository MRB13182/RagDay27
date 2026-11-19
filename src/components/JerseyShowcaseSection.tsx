import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Shirt, CheckCircle2, Maximize2, Sparkles } from 'lucide-react';
import { JerseyDesignCard, JerseyShowcaseSettings } from '../types';
import { JerseyShowcaseModal } from './JerseyShowcaseModal';
import jerseyStageBg from '../assets/images/jersey_stage_bg_1795068445588.jpg';

interface JerseyShowcaseSectionProps {
  cards?: JerseyDesignCard[];
  settings?: JerseyShowcaseSettings;
  onRegisterClick?: () => void;
  className?: string;
}

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const footerVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

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
            description: 'Premium squad jersey with custom Batch 27 print.',
            image: '',
            imageFilename: 'jersey-one.png',
          },
        ];

  const isSingleFeatured = displayCards.length === 1;
  const gridClasses = isSingleFeatured
    ? 'max-w-5xl mx-auto'
    : displayCards.length === 2
    ? 'grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 sm:gap-8'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-6 sm:gap-8';

  return (
    <motion.section
      id="jersey-showcase"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: '-40px' }}
      variants={sectionVariants}
      className={`py-14 sm:py-20 relative overflow-hidden bg-[#08090D] ${className}`}
    >
      {/* Cylindrical Spotlight Exhibition Depth */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={jerseyStageBg}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-24"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #08090D 0%, rgba(8,9,13,0.72) 50%, #08090D 100%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={headerVariants} className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-[#8BEAFF] mb-3">
            <Shirt className="w-3.5 h-3.5" />
            <span>Official Batch 2027 Artifact</span>
          </div>

          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight chrome-text">
            Batch 2027 Jersey Showcase
          </h2>

          <p className="font-editorial italic text-xl sm:text-2xl text-[#F5F7FA] mt-2">
            Not Just a Jersey. It&apos;s Our Identity.
          </p>

          <p className="text-xs sm:text-sm text-[#C9D0D9]/80 mt-3 max-w-xl mx-auto leading-relaxed">
            Every registered member receives the authentic squad kit with custom printed name &amp; number. Click any design to inspect full 4K artwork.
          </p>
        </motion.div>

        <motion.div variants={sectionVariants} className={gridClasses}>
          {displayCards.map((card) => (
            <motion.div
              key={card.id}
              variants={cardVariants}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPreviewCard(card)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedPreviewCard(card);
                }
              }}
              className={`relative rounded-2xl p-4 sm:p-6 museum-frame bg-gradient-to-b from-[#151B23]/90 to-[#10141B]/95 transition-all duration-300 hover:border-[#8BEAFF]/55 hover:shadow-[0_28px_70px_-14px_rgba(0,0,0,0.92),0_0_36px_-8px_rgba(139,234,255,0.22)] hover:-translate-y-1 flex flex-col ${
                isSingleFeatured ? 'lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center' : ''
              } overflow-hidden group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8BEAFF]`}
              title="Click to preview full high-resolution jersey artwork"
              aria-label={`Preview ${card.title}`}
            >
              {/* Spotlight Pedestal Showcase Viewport */}
              <div
                className={`relative z-10 w-full overflow-hidden rounded-xl bg-[#090C12] border border-[#C9D0D9]/18 ${
                  isSingleFeatured ? 'lg:col-span-7' : ''
                }`}
              >
                {/* Vertical Glass Cylinder Top & Bottom Light Rings */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 top-2 h-4 rounded-full border border-[#C9D0D9]/25 bg-[radial-gradient(ellipse_at_center,rgba(139,234,255,0.18),transparent_70%)] z-10"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 bottom-2 h-5 rounded-full border border-[#8BEAFF]/35 bg-[radial-gradient(ellipse_at_center,rgba(139,234,255,0.22),transparent_72%)] z-10"
                />

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
                  <div className="flex flex-col items-center justify-center text-[#626B79] p-8 text-center min-h-[240px]">
                    <Shirt className="w-12 h-12 mb-2 text-[#C9D0D9]/60" />
                    <span className="text-xs font-semibold text-[#C9D0D9]">Image unavailable</span>
                    {card.imageFilename && (
                      <span className="text-[10px] text-[#626B79] font-mono mt-1">
                        ({card.imageFilename})
                      </span>
                    )}
                  </div>
                )}

                {/* Hover Expand Trigger */}
                <div className="absolute bottom-3 right-3 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-20">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08090D]/90 backdrop-blur-md text-[#F5F7FA] text-xs font-bold border border-[#8BEAFF]/45 shadow-lg">
                    <Maximize2 className="w-3.5 h-3.5 text-[#8BEAFF]" />
                    <span>Expand Artwork</span>
                  </span>
                </div>
              </div>

              <div
                className={`relative z-10 pt-5 ${
                  isSingleFeatured ? 'lg:col-span-5 lg:pt-0 lg:px-2' : ''
                } space-y-4 flex-1 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#8BEAFF] inline-flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      4K Stage View
                    </span>
                    <span className="font-display italic font-black text-sm tracking-tight text-[#C9D0D9]">
                      NIC 27
                    </span>
                  </div>

                  <h3 className="font-display text-lg sm:text-2xl font-extrabold text-[#F5F7FA] tracking-tight group-hover:text-[#8BEAFF] transition-colors">
                    {card.title}
                  </h3>

                  {isSingleFeatured && (
                    <p className="font-editorial italic text-xl text-[#F5F7FA]/95 mt-2">
                      Not Just a Jersey. It&apos;s Our Identity.
                    </p>
                  )}

                  <div className="w-16 h-[2px] bg-gradient-to-r from-[#8BEAFF] to-transparent my-3 shadow-[0_0_12px_rgba(139,234,255,0.5)]" />

                  <p className="text-xs sm:text-sm text-[#C9D0D9]/85 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Front / Back / Sleeve / Crest Interactive Triggers */}
                <div className="pt-3.5 border-t border-[#C9D0D9]/15 flex flex-wrap items-center gap-2">
                  {(['Front', 'Back', 'Sleeve', 'Crest'] as const).map((viewName) => (
                    <button
                      key={viewName}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPreviewCard(card);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0B0E13] border border-[#C9D0D9]/22 hover:border-[#8BEAFF]/60 text-[11px] font-mono font-bold uppercase tracking-wider text-[#C9D0D9] hover:text-[#8BEAFF] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {viewName}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {onRegisterClick && (
          <motion.div variants={footerVariants} className="mt-9 text-center">
            <button
              type="button"
              onClick={onRegisterClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#8BEAFF]/45 bg-[#10141B]/95 hover:bg-[#151B23] text-xs font-bold uppercase tracking-[0.12em] text-[#8BEAFF] hover:text-[#F5F7FA] transition-all cursor-pointer"
            >
              <span>Customize Your Name &amp; Size on Registration</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>

      {selectedPreviewCard && (
        <JerseyShowcaseModal
          isOpen={Boolean(selectedPreviewCard)}
          onClose={() => setSelectedPreviewCard(null)}
          imageSrc={selectedPreviewCard.image}
          title={selectedPreviewCard.title}
          description={selectedPreviewCard.description}
        />
      )}
    </motion.section>
  );
};
