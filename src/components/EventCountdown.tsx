import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { parseSafeDate } from '../lib/dateUtils';

interface EventCountdownProps {
  targetIso?: string;
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

function resolveTargetDate(
  targetIso?: string,
  day?: number | string,
  month?: string | number,
  year?: number | string,
  time?: string,
  fallbackDateStr?: string
): Date {
  if (targetIso && targetIso.trim()) {
    const parsed = parseSafeDate(targetIso);
    if (parsed && !Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return calculateTargetDate(day, month, year, time, fallbackDateStr);
}

function computeTimeLeft(targetTimestamp: number): TimeLeft {
  const diff = targetTimestamp - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isStarted: true,
    };
  }

  return {
    days: Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
    hours: Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
    minutes: Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))),
    seconds: Math.max(0, Math.floor((diff % (1000 * 60)) / 1000)),
    isStarted: false,
  };
}

export const EventCountdown: React.FC<EventCountdownProps> = ({
  targetIso,
  day,
  month,
  year,
  time,
  fallbackDateStr,
}) => {
  const targetTimestamp = useMemo(
    () => resolveTargetDate(targetIso, day, month, year, time, fallbackDateStr).getTime(),
    [targetIso, day, month, year, time, fallbackDateStr]
  );

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(targetTimestamp));

  useEffect(() => {
    const initial = computeTimeLeft(targetTimestamp);
    setTimeLeft(initial);
    if (initial.isStarted) {
      return;
    }

    const interval = window.setInterval(() => {
      const next = computeTimeLeft(targetTimestamp);
      setTimeLeft(next);
      if (next.isStarted) {
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [targetTimestamp]);

  const units = [
    { label: 'DAYS', value: String(timeLeft.days).padStart(2, '0') },
    { label: 'HOURS', value: String(timeLeft.hours).padStart(2, '0') },
    { label: 'MINUTES', value: String(timeLeft.minutes).padStart(2, '0') },
    { label: 'SECONDS', value: String(timeLeft.seconds).padStart(2, '0') },
  ];

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-[#8BEAFF]/30 bg-[rgba(10,14,22,0.78)] backdrop-blur-xl p-4 sm:p-5 shadow-[0_18px_46px_rgba(0,0,0,0.52),0_0_28px_-10px_rgba(139,234,255,0.22)]">
      {/* Subtle Header */}
      <div className="flex items-center justify-center gap-3 mb-3.5 sm:mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9D0D9]/30 to-[#8BEAFF]/55" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.26em] text-[#8BEAFF] whitespace-nowrap">
          The Digital Time Capsule
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9D0D9]/30 to-[#8BEAFF]/55" />
      </div>

      {timeLeft.isStarted ? (
        <div className="py-3 sm:py-4 text-center animate-fadeIn">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.24em] text-[#8BEAFF]">
            <Sparkles className="w-3.5 h-3.5 text-[#8BEAFF]" />
            <span>THE EVENT HAS STARTED!</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight chrome-text mt-1.5">
            RAG DAY 27 IS NOW LIVE!
          </h2>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {units.map((unit) => (
            <div
              key={unit.label}
              className="group relative rounded-xl border border-[#8BEAFF]/25 bg-[linear-gradient(155deg,rgba(16,24,36,0.92),rgba(8,11,17,0.95))] px-3 py-3 sm:py-3.5 text-center shadow-[0_10px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(245,247,250,0.08)] hover:border-[#8BEAFF]/55 transition-colors"
            >
              <div className="font-mono text-2xl sm:text-[1.75rem] font-extrabold text-[#F5F7FA] tracking-tight tabular-nums leading-none drop-shadow-[0_0_12px_rgba(139,234,255,0.28)]">
                {unit.value}
              </div>
              <div className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#8BEAFF]/80 group-hover:text-[#8BEAFF] mt-1.5 leading-none transition-colors">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
