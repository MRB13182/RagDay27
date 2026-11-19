import React from 'react';
import { BaseCard } from './BaseCard';

interface FeatureCardProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  media?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  eyebrow,
  title,
  description,
  media,
  action,
  className = '',
}) => (
  <BaseCard
    as="article"
    variant="featured"
    padding="spacious"
    className={`rd-feature-card ${className}`}
  >
    {media && <div className="rd-feature-card__media">{media}</div>}
    {eyebrow && <div className="rd-card__eyebrow">{eyebrow}</div>}
    <h3 className="rd-feature-card__title">{title}</h3>
    {description && <p className="rd-feature-card__description">{description}</p>}
    {action && <div className="rd-feature-card__action">{action}</div>}
  </BaseCard>
);
