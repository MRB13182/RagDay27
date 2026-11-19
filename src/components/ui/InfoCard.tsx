import React from 'react';
import { BaseCard, type BaseCardProps } from './BaseCard';

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  supportingText?: React.ReactNode;
  accent?: 'ice' | 'silver';
  className?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  label,
  value,
  supportingText,
  accent = 'ice',
  className = '',
}) => (
  <BaseCard
    as="article"
    variant="default"
    padding="compact"
    className={`rd-info-card ${className}`}
  >
    <span className={`rd-card__icon rd-card__icon--${accent}`} aria-hidden="true">
      {icon}
    </span>
    <div className="rd-info-card__content">
      <span className="rd-card__label">{label}</span>
      <div className="rd-info-card__value">{value}</div>
      {supportingText && <div className="rd-card__support">{supportingText}</div>}
    </div>
  </BaseCard>
);
