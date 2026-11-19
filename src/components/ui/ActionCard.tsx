import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BaseCard } from './BaseCard';

interface ActionCardProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  index?: string;
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'elevated' | 'featured';
}

export const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  index,
  onClick,
  className = '',
  variant = 'default',
}) => (
  <button type="button" onClick={onClick} className={`rd-action-card-button ${className}`}>
    <BaseCard as="div" variant={variant} padding="default" interactive className="rd-action-card">
      <span className="rd-card__icon rd-card__icon--ice" aria-hidden="true">{icon}</span>
      <span className="rd-action-card__body">
        {index && <span className="rd-card__index">{index}</span>}
        <span className="rd-action-card__title">{title}</span>
        {description && <span className="rd-card__support">{description}</span>}
      </span>
      <ArrowUpRight className="rd-action-card__arrow" aria-hidden="true" />
    </BaseCard>
  </button>
);
