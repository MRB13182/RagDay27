import React from 'react';
import { GenderType } from '../types';

interface JerseyGraphicProps {
  view?: 'front' | 'back';
  name: string;
  number: string;
  size?: string;
  gender: GenderType;
  className?: string;
}

export const JerseyGraphic: React.FC<JerseyGraphicProps> = ({
  name,
  number,
  gender,
  className = '',
}) => {
  const isFemale = gender === 'female';
  const isMale = gender === 'male' || gender === 'choose_one';

  const displayName = (name && name.trim() ? name.trim() : isFemale ? 'LILY' : 'HUNTER')
    .toUpperCase()
    .slice(0, 14);
  const displayNumber = (number && number.trim() ? number.trim() : '27').slice(0, 2);

  // Dynamic font sizing for long names
  const nameFontSize =
    displayName.length <= 6 ? 28 : displayName.length <= 9 ? 24 : displayName.length <= 11 ? 21 : 18;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 460 510"
        className="w-full h-full max-h-[380px] drop-shadow-2xl transition-all duration-500 ease-out"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* ======================================================== */}
          {/* MALE THEME SHADERS & GRADIENTS */}
          {/* ======================================================== */}
          <linearGradient id="male-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#08142c" />
            <stop offset="35%" stopColor="#0f295e" />
            <stop offset="70%" stopColor="#0a1b3d" />
            <stop offset="100%" stopColor="#050d1e" />
          </linearGradient>

          <linearGradient id="male-sleeve-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0a1936" />
          </linearGradient>

          <linearGradient id="male-sleeve-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0a1936" />
          </linearGradient>

          <linearGradient id="male-shard-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="60%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          <linearGradient id="male-shard-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* 3D Metallic Number for Male */}
          <linearGradient id="male-num-metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f0f5fa" />
            <stop offset="65%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* ======================================================== */}
          {/* FEMALE THEME SHADERS & GRADIENTS */}
          {/* ======================================================== */}
          <linearGradient id="female-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#fff5f8" />
            <stop offset="75%" stopColor="#ffe4ee" />
            <stop offset="100%" stopColor="#fbcfe8" />
          </linearGradient>

          <linearGradient id="female-sleeve-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fce7f3" />
          </linearGradient>

          <linearGradient id="female-sleeve-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fce7f3" />
          </linearGradient>

          <linearGradient id="female-wave-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#db2777" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>

          <linearGradient id="female-wave-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="60%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>

          {/* 3D Metallic Number for Female */}
          <linearGradient id="female-num-metal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9d174d" />
            <stop offset="40%" stopColor="#831843" />
            <stop offset="70%" stopColor="#701a75" />
            <stop offset="100%" stopColor="#500724" />
          </linearGradient>

          {/* Filter for Drop Shadows */}
          <filter id="shadow-3d" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Ambient Floor Glow */}
        <ellipse
          cx="230"
          cy="485"
          rx="150"
          ry="16"
          fill={isFemale ? 'rgba(244,63,94,0.35)' : 'rgba(56,189,248,0.32)'}
          opacity="0.8"
        />

        {/* ======================================================== */}
        {/* SLEEVES (UNDER MAIN TORSO) */}
        {/* ======================================================== */}

        {/* Left Sleeve */}
        <g>
          <path
            d="M 140 65 L 35 155 L 85 210 L 145 150 Z"
            fill={isFemale ? 'url(#female-sleeve-left)' : 'url(#male-sleeve-left)'}
            stroke={isFemale ? 'rgba(244,114,182,0.3)' : 'rgba(56,189,248,0.3)'}
            strokeWidth="1.5"
          />
          {/* Left Cuff Band */}
          <path
            d="M 35 155 L 85 210 L 76 218 L 26 163 Z"
            fill={isFemale ? '#db2777' : '#00e5ff'}
          />
          <path
            d="M 45 145 L 95 200"
            stroke={isFemale ? '#f472b6' : '#2563eb'}
            strokeWidth="3.5"
            opacity="0.9"
          />
          {/* Winged Sleeve Crest */}
          <g transform="translate(62, 172) scale(0.65)">
            <path
              d="M -10 -4 L 0 8 L 10 -4 L 4 -2 L 0 2 L -4 -2 Z"
              fill={isFemale ? '#9d174d' : '#ffffff'}
            />
          </g>
        </g>

        {/* Right Sleeve */}
        <g>
          <path
            d="M 320 65 L 425 155 L 375 210 L 315 150 Z"
            fill={isFemale ? 'url(#female-sleeve-right)' : 'url(#male-sleeve-right)'}
            stroke={isFemale ? 'rgba(244,114,182,0.3)' : 'rgba(56,189,248,0.3)'}
            strokeWidth="1.5"
          />
          {/* Right Cuff Band */}
          <path
            d="M 425 155 L 375 210 L 384 218 L 434 163 Z"
            fill={isFemale ? '#db2777' : '#00e5ff'}
          />
          <path
            d="M 415 145 L 365 200"
            stroke={isFemale ? '#f472b6' : '#2563eb'}
            strokeWidth="3.5"
            opacity="0.9"
          />
          {/* Winged Sleeve Crest */}
          <g transform="translate(398, 172) scale(0.65)">
            <path
              d="M -10 -4 L 0 8 L 10 -4 L 4 -2 L 0 2 L -4 -2 Z"
              fill={isFemale ? '#9d174d' : '#ffffff'}
            />
          </g>
        </g>

        {/* ======================================================== */}
        {/* MAIN BODY TORSO */}
        {/* ======================================================== */}
        <path
          d="M 140 65 Q 230 85 320 65 L 345 440 Q 230 460 115 440 L 140 65 Z"
          fill={isFemale ? 'url(#female-body-grad)' : 'url(#male-body-grad)'}
          stroke={isFemale ? 'rgba(244,114,182,0.45)' : 'rgba(56,189,248,0.4)'}
          strokeWidth="2"
        />

        {/* Raglan Shoulder Seams */}
        <path
          d="M 175 67 L 140 148"
          stroke={isFemale ? 'rgba(219,39,119,0.35)' : 'rgba(56,189,248,0.35)'}
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <path
          d="M 285 67 L 320 148"
          stroke={isFemale ? 'rgba(219,39,119,0.35)' : 'rgba(56,189,248,0.35)'}
          strokeWidth="2"
          strokeDasharray="4 2"
        />

        {/* ======================================================== */}
        {/* THEME SPECIFIC ARTWORK / GRAPHICS */}
        {/* ======================================================== */}
        {isMale ? (
          /* MALE: CYBER ATHLETIC VELOCITY SHARDS & MESH */
          <g>
            {/* Shoulder Dark Texture Mesh */}
            <path
              d="M 155 75 Q 230 90 305 75 L 312 110 Q 230 125 148 110 Z"
              fill="rgba(0,229,255,0.06)"
              stroke="rgba(0,229,255,0.2)"
              strokeWidth="1"
            />

            {/* Left Dynamic Velocity Shards */}
            <path
              d="M 125 240 L 160 330 L 138 380 L 118 310 Z"
              fill="url(#male-shard-cyan)"
              opacity="0.9"
            />
            <path
              d="M 145 280 L 180 370 L 165 410 L 135 340 Z"
              fill="url(#male-shard-blue)"
              opacity="0.85"
            />
            <path
              d="M 120 370 L 155 435 L 140 442 L 116 395 Z"
              fill="#00f0ff"
              opacity="0.75"
            />

            {/* Right Dynamic Velocity Shards */}
            <path
              d="M 335 240 L 300 330 L 322 380 L 342 310 Z"
              fill="url(#male-shard-cyan)"
              opacity="0.9"
            />
            <path
              d="M 315 280 L 280 370 L 295 410 L 325 340 Z"
              fill="url(#male-shard-blue)"
              opacity="0.85"
            />
            <path
              d="M 340 370 L 305 435 L 320 442 L 344 395 Z"
              fill="#00f0ff"
              opacity="0.75"
            />

            {/* Center Bottom Energy Swoosh */}
            <path
              d="M 175 430 L 230 380 L 285 430 L 265 448 L 230 415 L 195 448 Z"
              fill="url(#male-shard-cyan)"
              opacity="0.85"
            />

            {/* Athletic Speed Accent Lines */}
            <path d="M 132 150 L 120 430" stroke="#00f0ff" strokeWidth="2.5" opacity="0.6" />
            <path d="M 328 150 L 340 430" stroke="#00f0ff" strokeWidth="2.5" opacity="0.6" />
          </g>
        ) : (
          /* FEMALE: ELEGANT FLORAL SAKURA & WAVE SWOOSHES */
          <g>
            {/* Left Flowing Waves */}
            <path
              d="M 122 210 Q 155 280 135 370 Q 125 410 116 438 L 138 443 Q 155 400 160 340 Q 165 270 138 215 Z"
              fill="url(#female-wave-pink)"
              opacity="0.92"
            />
            <path
              d="M 135 260 Q 185 330 165 420 L 180 435 Q 200 350 155 270 Z"
              fill="url(#female-wave-light)"
              opacity="0.85"
            />

            {/* Right Flowing Waves */}
            <path
              d="M 338 210 Q 305 280 325 370 Q 335 410 344 438 L 322 443 Q 305 400 300 340 Q 295 270 322 215 Z"
              fill="url(#female-wave-pink)"
              opacity="0.92"
            />
            <path
              d="M 325 260 Q 275 330 295 420 L 280 435 Q 260 350 305 270 Z"
              fill="url(#female-wave-light)"
              opacity="0.85"
            />

            {/* Stylized Sakura Blossom Petals on Left */}
            <g transform="translate(160, 365) scale(0.9)">
              <circle cx="0" cy="0" r="4.5" fill="#f43f5e" />
              <ellipse cx="0" cy="-9" rx="4" ry="7" fill="#f472b6" opacity="0.95" />
              <ellipse cx="8.5" cy="-2.8" rx="4" ry="7" transform="rotate(72 8.5 -2.8)" fill="#f472b6" opacity="0.95" />
              <ellipse cx="5.3" cy="7.3" rx="4" ry="7" transform="rotate(144 5.3 7.3)" fill="#f472b6" opacity="0.95" />
              <ellipse cx="-5.3" cy="7.3" rx="4" ry="7" transform="rotate(216 -5.3 7.3)" fill="#f472b6" opacity="0.95" />
              <ellipse cx="-8.5" cy="-2.8" rx="4" ry="7" transform="rotate(288 -8.5 -2.8)" fill="#f472b6" opacity="0.95" />
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            </g>

            {/* Smaller Sakura Petal */}
            <g transform="translate(180, 400) scale(0.65) rotate(25)">
              <circle cx="0" cy="0" r="4.5" fill="#f43f5e" />
              <ellipse cx="0" cy="-9" rx="4" ry="7" fill="#fbcfe8" />
              <ellipse cx="8.5" cy="-2.8" rx="4" ry="7" transform="rotate(72 8.5 -2.8)" fill="#fbcfe8" />
              <ellipse cx="5.3" cy="7.3" rx="4" ry="7" transform="rotate(144 5.3 7.3)" fill="#fbcfe8" />
              <ellipse cx="-5.3" cy="7.3" rx="4" ry="7" transform="rotate(216 -5.3 7.3)" fill="#fbcfe8" />
              <ellipse cx="-8.5" cy="-2.8" rx="4" ry="7" transform="rotate(288 -8.5 -2.8)" fill="#fbcfe8" />
            </g>

            {/* Stylized Sakura Blossom Petals on Right */}
            <g transform="translate(300, 365) scale(0.9) rotate(-15)">
              <circle cx="0" cy="0" r="4.5" fill="#f43f5e" />
              <ellipse cx="0" cy="-9" rx="4" ry="7" fill="#f472b6" opacity="0.95" />
              <ellipse cx="8.5" cy="-2.8" rx="4" ry="7" transform="rotate(72 8.5 -2.8)" fill="#f472b6" opacity="0.95" />
              <ellipse cx="5.3" cy="7.3" rx="4" ry="7" transform="rotate(144 5.3 7.3)" fill="#f472b6" opacity="0.95" />
              <ellipse cx="-5.3" cy="7.3" rx="4" ry="7" transform="rotate(216 -5.3 7.3)" fill="#f472b6" opacity="0.95" />
              <ellipse cx="-8.5" cy="-2.8" rx="4" ry="7" transform="rotate(288 -8.5 -2.8)" fill="#f472b6" opacity="0.95" />
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            </g>

            {/* Bottom Waist Trim */}
            <path
              d="M 115 435 Q 230 455 345 435 L 345 444 Q 230 464 115 444 Z"
              fill="#db2777"
            />
          </g>
        )}

        {/* ======================================================== */}
        {/* ATHLETIC COLLAR (HIGH BACK ARCH) */}
        {/* ======================================================== */}
        <g>
          {/* Main Collar Arch */}
          <path
            d="M 172 66 Q 230 79 288 66"
            stroke={isFemale ? '#db2777' : '#00e5ff'}
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          {/* Inner Collar Stripe */}
          <path
            d="M 180 66 Q 230 77 280 66"
            stroke={isFemale ? '#ffffff' : '#0a1938'}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* ======================================================== */}
        {/* NAPE CREST & MOTTO */}
        {/* ======================================================== */}
        <g transform="translate(230, 95)">
          {/* Crown / Wings Shield */}
          <path
            d="M -14 -6 L -8 -11 L 0 -8 L 8 -11 L 14 -6 L 10 5 L 0 11 L -10 5 Z"
            fill={isFemale ? '#db2777' : '#00e5ff'}
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontSize="8"
            fontWeight="900"
            fill={isFemale ? '#ffffff' : '#0a1938'}
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            27
          </text>
        </g>

        {/* ======================================================== */}
        {/* JERSEY NAME (PROMINENT UPPER BACK) */}
        {/* ======================================================== */}
        <g transform="translate(230, 155)">
          {/* Glow / Shadow Behind Name */}
          <text
            x="0"
            y="0"
            textAnchor="middle"
            fontSize={nameFontSize}
            fontWeight="900"
            letterSpacing="3.5"
            fill={isFemale ? 'rgba(131,24,67,0.3)' : 'rgba(0,0,0,0.8)'}
            stroke={isFemale ? 'rgba(255,255,255,0.8)' : '#000000'}
            strokeWidth={isFemale ? '4' : '3'}
            style={{
              fontFamily: "'Syne', 'Impact', sans-serif",
              textTransform: 'uppercase',
            }}
          >
            {displayName}
          </text>
          {/* Main Name Text */}
          <text
            x="0"
            y="0"
            textAnchor="middle"
            fontSize={nameFontSize}
            fontWeight="900"
            letterSpacing="3.5"
            fill={isFemale ? '#831843' : '#ffffff'}
            style={{
              fontFamily: "'Syne', 'Impact', sans-serif",
              textTransform: 'uppercase',
              filter: isFemale
                ? 'drop-shadow(0 2px 4px rgba(131,24,67,0.3))'
                : 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))',
            }}
          >
            {displayName}
          </text>
        </g>

        {/* ======================================================== */}
        {/* JERSEY NUMBER (LARGE CENTER 3D ATHLETIC BLOCK) */}
        {/* ======================================================== */}
        <g transform="translate(230, 290)">
          {/* 1. Deep 3D Drop Shadow */}
          <text
            x="0"
            y="26"
            textAnchor="middle"
            fontSize="148"
            fontWeight="900"
            letterSpacing="1"
            fill={isFemale ? 'rgba(80,7,36,0.35)' : 'rgba(0,0,0,0.75)'}
            stroke={isFemale ? '#ffffff' : '#030712'}
            strokeWidth="12"
            strokeLinejoin="round"
            style={{
              fontFamily: "'Syne', 'Impact', sans-serif",
            }}
          >
            {displayNumber}
          </text>

          {/* 2. Outer Outline & Bevel Edge */}
          <text
            x="0"
            y="22"
            textAnchor="middle"
            fontSize="148"
            fontWeight="900"
            letterSpacing="1"
            fill={isFemale ? '#ffffff' : '#040d1f'}
            stroke={isFemale ? '#db2777' : '#00f0ff'}
            strokeWidth="6"
            strokeLinejoin="round"
            style={{
              fontFamily: "'Syne', 'Impact', sans-serif",
            }}
          >
            {displayNumber}
          </text>

          {/* 3. Metallic 3D Fill Layer */}
          <text
            x="0"
            y="22"
            textAnchor="middle"
            fontSize="148"
            fontWeight="900"
            letterSpacing="1"
            fill={isFemale ? 'url(#female-num-metal)' : 'url(#male-num-metal)'}
            stroke={isFemale ? '#ffffff' : '#06132b'}
            strokeWidth="2.5"
            style={{
              fontFamily: "'Syne', 'Impact', sans-serif",
            }}
          >
            {displayNumber}
          </text>
        </g>

        {/* Bottom Hem Accent */}
        <path
          d="M 115 435 Q 230 455 345 435 L 345 442 Q 230 462 115 442 Z"
          fill={isFemale ? '#be185d' : '#00e5ff'}
          opacity="0.9"
        />
      </svg>
    </div>
  );
};
