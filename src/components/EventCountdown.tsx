import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { parseSafeDate } from '../lib/dateUtils';

interface EventCountdownProps {
  day?: number | string;
  month?: string | number;
  year?: number | string;
  time?: string;
  fallbackDateStr?: string;
  eventName?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isStarted: boolean;
  targetDate: Date | null;
}

const MONTH_MAP: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

/**
 * Robust target date calculation from Super Admin settings.
 */
export function calculateTargetDate(
  day?: number | string,
  month?: string | number,
  year?: number | string,
  time?: string,
  fallbackDateStr?: string
): Date {
  const currentYear = new Date().getFullYear();

  let parsedYear = year ? Number(year) : currentYear;
  if (isNaN(parsedYear) || parsedYear < 2000) parsedYear = currentYear;

  let parsedMonthIndex = 10; // Default November
  if (month !== undefined && month !== null && String(month).trim() !== '') {
    const monthStr = String(month).trim().toLowerCase();
    if (MONTH_MAP[monthStr] !== undefined) {
      parsedMonthIndex = MONTH_MAP[monthStr];
    } else {
      const numMonth = parseInt(monthStr, 10);
      if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) {
        parsedMonthIndex = numMonth - 1;
      }
    }
  }

  let parsedDay = day ? Number(day) : 27;
  if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) parsedDay = 27;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (time && time.trim()) {
    const trimmedTime = time.trim();
    const match = trimmedTime.match(/(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const s = match[3] ? parseInt(match[3], 10) : 0;
      const meridiem = match[4] ? match[4].toLowerCase() : null;

      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;

      hours = Math.min(Math.max(h, 0), 23);
      minutes = Math.min(Math.max(m, 0), 59);
      seconds = Math.min(Math.max(s, 0), 59);
    }
  }

  const target = new Date(parsedYear, parsedMonthIndex, parsedDay, hours, minutes, seconds);

  if (isNaN(target.getTime()) && fallbackDateStr) {
    const fallbackParsed = parseSafeDate(fallbackDateStr);
    if (fallbackParsed) {
      return fallbackParsed;
    }
  }

  return target;
}

export const EventCountdown: React.FC<EventCountdownProps> = ({
  day,
  month,
  year,
  time,
  fallbackDateStr,
  eventName = 'Rag Day 27',
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => {
    const target = calculateTargetDate(day, month, year, time, fallbackDateStr);
    const now = new Date().getTime();
    const diff = target.getTime() - now;

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isStarted: true,
        targetDate: target,
      };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isStarted: false,
      targetDate: target,
    };
  });

  useEffect(() => {
    const updateCountdown = () => {
      const target = calculateTargetDate(day, month, year, time, fallbackDateStr);
      const now = new Date().getTime();
      const diff = target.getTime() - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isStarted: true,
          targetDate: target,
        });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isStarted: false,
        targetDate: target,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [day, month, year, time, fallbackDateStr]);

  const cleanEventTitle = eventName.split('(')[0].trim() || 'RAG DAY 27';

  if (timeLeft.isStarted) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fadeIn">
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 museum-frame border border-[#8BEAFF]/40 text-center">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.26em] text-[#8BEAFF]">
            <Sparkles className="w-4 h-4 text-[#8BEAFF]" />
            <span>Celebration Live Now</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight chrome-text mt-2.5">
            {cleanEventTitle.toUpperCase()} IS LIVE
          </h2>
          <p className="text-xs sm:text-sm text-[#C9D0D9] mt-2 font-medium max-w-md mx-auto">
            The grand celebration has officially begun. Welcome Batch 2027 students and faculty.
          </p>
        </div>
      </div>
    );
  }

  const units = [
    { label: 'DAYS', value: timeLeft.days < 10 ? `0${timeLeft.days}` : String(timeLeft.days) },
    { label: 'HOURS', value: String(timeLeft.hours).padStart(2, '0') },
    { label: 'MINUTES', value: String(timeLeft.minutes).padStart(2, '0') },
    { label: 'SECONDS', value: String(timeLeft.seconds).padStart(2, '0') },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Architectural Header Divider */}
      <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <div className="h-px flex-1 max-w-[160px] bg-gradient-to-r from-transparent via-[#C9D0D9]/35 to-[#8BEAFF]/55" />
        <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.32em] text-[#C9D0D9] whitespace-nowrap">
          The Digital Time Capsule
        </span>
        <div className="h-px flex-1 max-w-[160px] bg-gradient-to-l from-transparent via-[#C9D0D9]/35 to-[#8BEAFF]/55" />
      </div>

      {/* 4 Orbital Metallic Capsule Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 items-center justify-items-center">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="group relative w-full max-w-[164px] aspect-[1.28/1] flex items-center justify-center"
          >
            {/* Outer Orbital Silver Ring */}
            <svg
              viewBox="0 0 180 124"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            >
              <defs>
                <linearGradient id={`orbit-${unit.label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5F7FA" stopOpacity="0.72" />
                  <stop offset="50%" stopColor="#8BEAFF" stopOpacity="0.90" />
                  <stop offset="100%" stopColor="#626B79" stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <ellipse
                cx="90"
                cy="62"
                rx="84"
                ry="44"
                transform="rotate(-14 90 62)"
                fill="none"
                stroke={`url(#orbit-${unit.label})`}
                strokeWidth="1.25"
                className="opacity-75 group-hover:opacity-100 transition-opacity duration-300"
              />
              <ellipse
                cx="90"
                cy="62"
                rx="84"
                ry="44"
                transform="rotate(14 90 62)"
                fill="none"
                stroke="rgba(201,208,217,0.38)"
                strokeWidth="0.95"
              />
            </svg>

            {/* Core Metallic Sphere Face */}
            <div className="relative z-10 w-[76%] h-[78%] rounded-full orbital-ring-card flex flex-col items-center justify-center px-3 py-2 text-center transition-transform duration-300 group-hover:scale-[1.03]">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#F5F7FA] tracking-tight tabular-nums leading-none">
                {unit.value}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-[#8993A1] group-hover:text-[#C9D0D9] mt-1.5 leading-none transition-colors">
                {unit.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
