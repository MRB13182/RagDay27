import React from 'react';

interface LogoProps {
  className?: string;
}

/**
 * Official bKash Origami Bird Logo
 * Recreated with exact polygonal facets and white fold separation creases
 * matching the user's uploaded images (1).png (facing right)
 */
export const BkashLogo: React.FC<LogoProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className={`${className} shrink-0 block`}
      aria-label="bKash"
    >
      <g stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        {/* Top Wing Main Facet */}
        <polygon points="97,48 37,42 60,73 83,98" fill="#E2136E" />
        {/* Top Wing Lower Fold */}
        <polygon points="37,42 36,51 60,73" fill="#B30D52" />
        {/* Upper Body / Wing Inner Facet */}
        <polygon points="97,48 138,105 83,98" fill="#F0267F" />
        {/* Head / Neck Facet */}
        <polygon points="124,81 151,77 140,86 138,105" fill="#D40F63" />
        {/* Beak */}
        <polygon points="140,86 163,88 147,105" fill="#E2136E" />
        {/* Lower Belly Facet */}
        <polygon points="83,98 138,105 98,131" fill="#E2136E" />
        {/* Tail Polygon */}
        <polygon points="83,98 98,131 64,158" fill="#96002A" />
      </g>
    </svg>
  );
};

/**
 * Official Nagad Swirl Logo
 * Recreated with exact circular swirl and 3 overlapping flame petals
 * matching the user's uploaded images.png
 */
export const NagadLogo: React.FC<LogoProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className={`${className} shrink-0 block`}
      aria-label="Nagad"
    >
      <defs>
        <linearGradient id="nagad-orange-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="50%" stopColor="#FF5000" />
          <stop offset="100%" stopColor="#E62500" />
        </linearGradient>
        <linearGradient id="nagad-petal1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFA000" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="nagad-petal2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF5722" />
          <stop offset="100%" stopColor="#F4511E" />
        </linearGradient>
        <linearGradient id="nagad-petal3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E51C24" />
          <stop offset="100%" stopColor="#C62828" />
        </linearGradient>
      </defs>

      {/* Main Swirling Loop */}
      <path
        d="M 52 108 C 52 144 78 174 114 174 C 150 174 172 146 172 120 C 172 90 144 76 128 76 C 146 88 152 104 152 120 C 152 138 136 156 114 156 C 88 156 70 134 70 108 C 70 82 86 64 106 58 C 92 64 80 76 72 90 C 58 96 52 102 52 108 Z"
        fill="url(#nagad-orange-grad)"
      />

      {/* Inner Swirl Arc */}
      <path
        d="M 64 96 C 54 112 58 136 74 152 C 90 168 114 174 136 164 C 158 154 172 134 172 110 C 168 128 152 144 132 148 C 112 152 92 144 80 130 C 68 116 66 102 70 90 Z"
        fill="url(#nagad-orange-grad)"
        opacity="0.95"
      />

      {/* Three Top-Right Dynamic Flame Petals (matching images.png) */}
      {/* Petal 1: Inner yellow-orange */}
      <path
        d="M 60 108 C 56 86 70 54 94 30 C 102 36 108 46 106 60 C 94 68 76 86 60 108 Z"
        fill="url(#nagad-petal1)"
      />

      {/* Petal 2: Middle bright orange */}
      <path
        d="M 76 90 C 80 62 104 36 142 26 C 148 38 148 52 140 64 C 120 74 94 82 76 90 Z"
        fill="url(#nagad-petal2)"
      />

      {/* Petal 3: Outermost crimson ribbon */}
      <path
        d="M 94 76 C 112 56 146 44 184 52 C 174 72 158 84 136 90 C 118 88 104 82 94 76 Z"
        fill="url(#nagad-petal3)"
      />
    </svg>
  );
};
