import React from 'react';
import { motion, type Variants } from 'framer-motion';
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
  Gift,
  Image as ImageIcon,
} from 'lucide-react';
import batchPedestalImg from '../assets/images/batch_pedestal_27_1795068445518.jpg';
import { ActionCard, BaseCard, FeatureCard } from './ui';

interface EventInformationSectionProps {
  cards: EventCard[];
  layout?: 'two-column' | 'one-column' | string;
  onOpenGallery?: () => void;
  onOpenNotice?: () => void;
  onScrollToSection?: (sectionId: string) => void;
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

const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const EventInformationSection: React.FC<EventInformationSectionProps> = ({
  cards,
  layout = 'two-column',
  onOpenGallery,
  onOpenNotice,
  onScrollToSection,
}) => {
  const visibleCards = cards
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  const isOneColumn = layout === 'one-column';

  const experienceModules = [
    {
      num: '01',
      label: 'Event Schedule',
      icon: <Calendar className="w-5 h-5" />,
      onClick: () => onScrollToSection?.('event-details'),
    },
    {
      num: '02',
      label: 'Memory Gallery',
      icon: <ImageIcon className="w-5 h-5" />,
      onClick: () => (onOpenGallery ? onOpenGallery() : onScrollToSection?.('our-story')),
    },
    {
      num: '03',
      label: 'Our Batch',
      icon: <Users className="w-5 h-5" />,
      onClick: () => onScrollToSection?.('batch-identity'),
    },
    {
      num: '04',
      label: 'Jersey Reveal',
      icon: <Shirt className="w-5 h-5" />,
      onClick: () => onScrollToSection?.('jersey-showcase'),
    },
    {
      num: '05',
      label: 'Surprise Events',
      icon: <Gift className="w-5 h-5" />,
      onClick: () => (onOpenNotice ? onOpenNotice() : onScrollToSection?.('contact-info')),
    },
  ];

  return (
    <motion.section
      id="events"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: '-40px' }}
      variants={sectionVariants}
      className="py-12 sm:py-16 relative overflow-hidden bg-[#08090D]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Five Interactive Glass-Metallic "EVENT EXPERIENCE" Modules (01..05) */}
        <div>
          <motion.div variants={headerVariants} className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <div className="flex items-center justify-center gap-4 mb-2.5">
              <div className="h-px w-12 sm:w-28 bg-gradient-to-r from-transparent to-[#C9D0D9]/45" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.34em] text-[#C9D0D9] whitespace-nowrap">
                Event Experience
              </span>
              <div className="h-px w-12 sm:w-28 bg-gradient-to-l from-transparent to-[#C9D0D9]/45" />
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight chrome-text">
              Curated Chapters of Batch 27
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-5xl mx-auto">
            {experienceModules.map((mod) => (
              <ActionCard
                key={mod.num}
                index={mod.num}
                icon={mod.icon}
                title={mod.label}
                onClick={mod.onClick}
                className={mod.num === '05' ? 'col-span-2 sm:col-span-1' : ''}
              />
            ))}
          </div>
        </div>

        {/* Batch Identity Pedestal + Dynamic Super Admin Event Information Details */}
        <div
          id="batch-identity"
          className={isOneColumn ? 'max-w-2xl mx-auto space-y-6' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch'}
        >
          {/* Batch 27 Sculptural Monolith Pedestal */}
          {!isOneColumn && (
            <motion.div variants={cardVariants} className="lg:col-span-4">
              <FeatureCard
                eyebrow="NIC 27 BATCH"
                title="NATIONAL IDEAL COLLEGE"
                description="Official digital credential and commemorative details for all HSC Batch 2027 participants."
                className="museum-frame !p-0 rounded-2xl overflow-hidden flex flex-col justify-between h-full"
                media={
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#08090D]">
                    <img
                      src={batchPedestalImg}
                      alt="NIC 27 Batch Sculptural Emblem"
                      loading="lazy"
                      className="w-full h-full object-cover object-center opacity-92"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#0C1119] via-transparent to-transparent"
                    />
                  </div>
                }
              />
            </motion.div>
          )}

          {/* Dynamic Super Admin Event Details Cards Grid */}
          {visibleCards.length > 0 && (
            <motion.div
              id="event-details"
              variants={sectionVariants}
              className={
                isOneColumn
                  ? 'grid grid-cols-1 gap-4 sm:gap-5'
                  : 'lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5'
              }
            >
              {visibleCards.map((card, idx) => {
                const displayIndex = String(card.order || idx + 1).padStart(2, '0');
                return (
                  <motion.div key={card.id} variants={cardVariants} className="h-full"> 
                  <BaseCard variant={idx === 0 ? 'elevated' : 'default'} padding="spacious" className="h-full flex flex-col justify-between group">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-6 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#8BEAFF]/75 to-transparent opacity-65 group-hover:opacity-100 shadow-[0_0_14px_rgba(139,234,255,0.5)] transition-opacity"
                    />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="rd-card__icon rd-card__icon--ice" aria-hidden="true">
                          {renderCardIcon(card.icon, 'w-5 h-5')}
                        </div>
                        <span className="rd-card__index">
                          {displayIndex}
                        </span>
                      </div>

                      <h3 className="rd-card__label mb-1.5">
                        {card.title}
                      </h3>

                      <div className="font-display text-lg sm:text-xl font-extrabold text-[#F5F7FA] tracking-tight leading-snug break-words">
                        {card.description}
                      </div>
                    </div>

                    {card.subDetail && (
                      <div className="relative z-10 mt-5 pt-3.5 border-t border-[#C9D0D9]/14 flex items-center text-xs text-[#C9D0D9]/80 font-normal break-words">
                        <span>{card.subDetail}</span>
                      </div>
                    )}
                  </BaseCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
};
