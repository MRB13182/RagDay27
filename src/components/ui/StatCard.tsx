import React from 'react';
import { BaseCard } from './BaseCard';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  supportingText?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  supportingText,
  icon,
  className = '',
}) => (
  <BaseCard as="article" variant="elevated" padding="default" className={`rd-stat-card ${className}`}>
    <div className="rd-stat-card__top">
      <span className="rd-card__label">{label}</span>
      {icon && <span className="rd-stat-card__icon" aria-hidden="true">{icon}</span>}
    </div>
    <div className="rd-stat-card__value">{value}</div>
    {supportingText && <div className="rd-card__support">{supportingText}</div>}
  </BaseCard>
);
