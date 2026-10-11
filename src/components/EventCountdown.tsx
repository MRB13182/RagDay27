import React, { useState, useEffect } from 'react';
import { Sparkles, Radio } from 'lucide-react';

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
 * Supports:
 * - Day (1-31)
 * - Month (e.g. 'February' or 2)
 * - Year (e.g. 2027)
 * - Time (e.g. '09:00 AM' or empty, defaulting to 12:00 AM)
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

  // Time parsing - default to 12:00 AM if empty
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (time && time.trim()) {
    const trimmedTime = time.trim();
    // Match e.g. "09:00 AM", "9:30pm", "10:00 AM – 11:30 PM", "14:30"
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

  // Fallback check if date is invalid
  if (isNaN(target.getTime()) && fallbackDateStr) {
    const fallbackParsed = new Date(fallbackDateStr);
    if (!isNaN(fallbackParsed.getTime())) {
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

      // When countdown reaches zero or is in the past:
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

    // Calculate immediately when props change
    updateCountdown();

    // Recalculate every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [day, month, year, time, fallbackDateStr]);

  // Clean event title extraction (without parentheses)
  const cleanEventTitle = eventName.split('(')[0].trim() || 'RAG DAY 27';

  // 1. EVENT STARTED / LIVE STATE
  if (timeLeft.isStarted) {
    return (
      <div className="w-full max-w-lg mb-8 animate-fadeIn">
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-emerald-500/10 via-[#5B5FEF]/10 to-[#00D4FF]/10 backdrop-blur-xl border border-emerald-500/30 shadow-[0_12px_35px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300/60 shadow-sm">
              EVENT STARTED
            </span>
          </div>

          <div className="mt-3">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span>{cleanEventTitle.toUpperCase()} IS LIVE</span>
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
              The grand celebration has officially begun! Welcome Batch 2027 students and faculty.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. LIVE COUNTDOWN DISPLAY
  return (
    <div className="w-full max-w-lg mb-8">
      {/* Countdown Label with glowing beacon */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="inline-flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5B5FEF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#5B5FEF]"></span>
          </span>
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Event Countdown
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          <Radio className="w-3 h-3 text-[#5B5FEF] animate-pulse" />
          Live Countdown
        </span>
      </div>

      {/* 4 Glassmorphism Cards: Days, Hours, Minutes, Seconds */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3.5">
        {/* Days */}
        <div className="group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_10px_28px_-6px_rgba(91,95,239,0.08),inset_0_1.5px_1.5px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(91,95,239,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(91,95,239,0.18),inset_0_1.5px_2px_white] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="relative font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {timeLeft.days < 10 ? `0${timeLeft.days}` : timeLeft.days}
          </div>
          <div className="relative text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
            Days
          </div>
        </div>

        {/* Hours */}
        <div className="group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_10px_28px_-6px_rgba(91,95,239,0.08),inset_0_1.5px_1.5px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(91,95,239,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(91,95,239,0.18),inset_0_1.5px_2px_white] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="relative font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="relative text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
            Hours
          </div>
        </div>

        {/* Minutes */}
        <div className="group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_10px_28px_-6px_rgba(91,95,239,0.08),inset_0_1.5px_1.5px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(91,95,239,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(91,95,239,0.18),inset_0_1.5px_2px_white] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="relative font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="relative text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
            Minutes
          </div>
        </div>

        {/* Seconds */}
        <div className="group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-[0_10px_28px_-6px_rgba(91,95,239,0.08),inset_0_1.5px_1.5px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(91,95,239,0.03)] hover:shadow-[0_16px_36px_-6px_rgba(91,95,239,0.18),inset_0_1.5px_2px_white] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="relative font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#5B5FEF] tracking-tight tabular-nums">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="relative text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#5B5FEF] mt-1">
            Seconds
          </div>
        </div>
      </div>
    </div>
  );
};
