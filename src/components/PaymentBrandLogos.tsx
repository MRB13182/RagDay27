import React from 'react';

interface LogoProps {
  className?: string;
}

/**
 * Uses the original bKash logo image uploaded to the repository root.
 * Keep the shared component API so all existing payment cards update together.
 */
export const BkashLogo: React.FC<LogoProps> = ({ className = 'w-6 h-6' }) => (
  <img
    src="https://raw.githubusercontent.com/MRB13182/RagDay27/main/bkash.png"
    alt="bKash"
    loading="eager"
    decoding="async"
    className={`${className} shrink-0 block object-contain`}
  />
);

/**
 * Uses the original Nagad logo image uploaded to the repository root.
 * Keep the shared component API so all existing payment cards update together.
 */
export const NagadLogo: React.FC<LogoProps> = ({ className = 'w-6 h-6' }) => (
  <img
    src="https://raw.githubusercontent.com/MRB13182/RagDay27/main/nagad.png"
    alt="Nagad"
    loading="eager"
    decoding="async"
    className={`${className} shrink-0 block object-contain`}
  />
);
