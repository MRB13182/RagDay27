import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'featured';
export type CardPadding = 'compact' | 'default' | 'spacious';
export type BaseCardElement = 'div' | 'article' | 'section';

export interface BaseCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  className?: string;
  as?: BaseCardElement;
  id?: string;
  ariaLabel?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'rd-card--default',
  elevated: 'rd-card--elevated',
  featured: 'rd-card--featured',
};

const paddingClasses: Record<CardPadding, string> = {
  compact: 'rd-card--compact',
  default: 'rd-card--padding-default',
  spacious: 'rd-card--spacious',
};

export const BaseCard: React.FC<BaseCardProps> = ({
  children,
  variant = 'default',
  padding = 'default',
  interactive = false,
  className = '',
  as: Element = 'div',
  id,
  ariaLabel,
}) => (
  <Element
    id={id}
    aria-label={ariaLabel}
    className={[
      'rd-card',
      variantClasses[variant],
      paddingClasses[padding],
      interactive ? 'rd-card--interactive' : '',
      className,
    ].filter(Boolean).join(' ')}
  >
    {children}
  </Element>
);
