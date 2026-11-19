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
} from 'lucide-react';
import { BaseCard } from './ui';

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
}) => {
  const visibleCards = cards
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  const isOneColumn = layout === 'one-column';

  return (
    <motion.section
      id="events"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: '-40px' }}
      variants={sectionVariants}
      className="py-12 sm:py-16 relative overflow-hidden bg-[#08090D]"
    >
      {visibleCards.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            id="event-details"
            variants={sectionVariants}
            className={
              isOneColumn
                ? 'max-w-2xl mx-auto grid grid-cols-1 gap-4 sm:gap-5'
                : 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5'
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
                        <span className="rd-card__index">{displayIndex}</span>
                      </div>

                      <h3 className="rd-card__label mb-1.5">{card.title}</h3>

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
        </div>
      )}
    </motion.section>
  );
};
