/**
 * Cross-browser date parsing and formatting helpers.
 *
 * WebKit / iOS Safari returns Invalid Date for non-zero-padded ISO strings
 * such as "2026-12-2T10:00:00" or space-separated timestamps. Normalize before parsing.
 */

export function parseSafeDate(
  input: string | number | Date | null | undefined
): Date | null {
  if (input === null || input === undefined) return null;

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : new Date(input.getTime());
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  const isoLike = raw.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?)?$/i
  );

  if (isoLike) {
    const year = Number(isoLike[1]);
    const month = Number(isoLike[2]);
    const day = Number(isoLike[3]);
    const hour = isoLike[4] !== undefined ? Number(isoLike[4]) : 0;
    const minute = isoLike[5] !== undefined ? Number(isoLike[5]) : 0;
    const second = isoLike[6] !== undefined ? Number(isoLike[6]) : 0;
    const msStr = isoLike[7];
    const tz = isoLike[8];

    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
      return null;
    }

    if (tz) {
      const normalizedTz =
        tz.toUpperCase() === 'Z'
          ? 'Z'
          : tz.includes(':')
          ? tz
          : `${tz.slice(0, 3)}:${tz.slice(3)}`;
      const msPart = msStr ? `.${msStr.slice(0, 3).padEnd(3, '0')}` : '';
      const isoNormalized = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}${msPart}${normalizedTz}`;
      const parsedTz = new Date(isoNormalized);
      return isNaN(parsedTz.getTime()) ? null : parsedTz;
    }

    const localDate = new Date(year, month - 1, day, hour, minute, second);
    return isNaN(localDate.getTime()) ? null : localDate;
  }

  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function getSafeTimestamp(
  input: string | number | Date | null | undefined,
  fallback = 0
): number {
  const parsed = parseSafeDate(input);
  return parsed ? parsed.getTime() : fallback;
}

export function safeFormatDateTime(
  input: string | number | Date | null | undefined,
  fallback = '—'
): string {
  const parsed = parseSafeDate(input);
  if (!parsed) return fallback;
  try {
    return parsed.toLocaleString();
  } catch {
    return parsed.toISOString();
  }
}
