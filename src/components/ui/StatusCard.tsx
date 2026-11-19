import React from 'react';
import { BaseCard } from './BaseCard';

interface StatusCardProps {
  label: string;
  status: React.ReactNode;
  supportingText?: React.ReactNode;
  tone?: 'success' | 'pending' | 'neutral';
  className?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({ label, status, supportingText, tone = 'neutral', className = '' }) => (
  <BaseCard as="article" variant="default" padding="default" className={`rd-status-card rd-status-card--${tone} ${className}`}>
    <span className="rd-card__label">{label}</span>
    <div className="rd-status-card__value"><span className="rd-status-card__dot" aria-hidden="true" />{status}</div>
    {supportingText && <div className="rd-card__support">{supportingText}</div>}
  </BaseCard>
);
