// utils/dateTime.ts
type InputDate = string | number | Date | null | undefined;

// --- Normalizer: makes iOS/Safari-friendly ISO and preserves UTC when provided ---
function normalize(input: InputDate): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  let s = String(input).trim();
  if (!s) return null;

  // If it's purely a date: 2025-11-10
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    // Treat as UTC midnight so IST shows same calendar date
    s = `${s}T00:00:00.000Z`;
  }
  // If it's date + time with a space and no timezone: 2025-11-10 14:20 or 2025-11-10 14:20:00
  else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  // If it’s date + T + time but no zone (e.g. 2025-11-10T14:20:00)
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(s)) {
    s = s + 'Z';
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function hasFormatToParts(): boolean {
  try {
    const f = new Intl.DateTimeFormat('en-GB', { hour: '2-digit' } as any);
    return typeof (f as any).formatToParts === 'function';
  } catch {
    return false;
  }
}

function fmtParts(d: Date, timeZone = 'Asia/Kolkata') {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const parts = fmt.formatToParts(d);
  const pick = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === t)?.value ?? '';
  return {
    day: pick('day'),
    month: pick('month'),
    year: pick('year'),
    hour: pick('hour'),
    minute: pick('minute'),
    meridiem: (pick('dayPeriod') || '').toUpperCase(),
  };
}

// Fallback if formatToParts is missing (rare in modern RN/Hermes, but safe)
function manualFormat(d: Date, timeZone = 'Asia/Kolkata') {
  // Convert to that timezone by formatting, then re-parsing numbers.
  // This uses Intl but not formatToParts.
  const dateStr = d.toLocaleString('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Examples:
  // dateStr => "10 Nov 2025"
  // timeStr => "08:20 pm" or "08:20 PM" depending on platform
  const mer = timeStr.slice(-2).toUpperCase();
  const hm = timeStr.slice(0, -2).trim(); // "08:20"
  return {
    dateStr,
    timeStr: `${hm} ${mer}`,
  };
}

/** 10 Nov 2025 */
export function formatDate(input: InputDate, timeZone = 'Asia/Kolkata'): string {
  const d = normalize(input);
  if (!d) return '-';
  if (hasFormatToParts()) {
    const { day, month, year } = fmtParts(d, timeZone);
    return `${day} ${month} ${year}`;
  } else {
    return manualFormat(d, timeZone).dateStr;
  }
}

/** 08:20 PM */
export function formatTime(input: InputDate, timeZone = 'Asia/Kolkata'): string {
  const d = normalize(input);
  if (!d) return '-';
  if (hasFormatToParts()) {
    const { hour, minute, meridiem } = fmtParts(d, timeZone);
    return `${hour}:${minute} ${meridiem}`;
  } else {
    return manualFormat(d, timeZone).timeStr;
  }
}

/** 10 Nov 2025 08:20 PM */
export function formatDateTime(input: InputDate, timeZone = 'Asia/Kolkata'): string {
  console.log(input, "to be stringify")
  const d = normalize(input);
  if (!d) return '-';
  if (hasFormatToParts()) {
    const { day, month, year, hour, minute, meridiem } = fmtParts(d, timeZone);
    return `${day} ${month} ${year} ${hour}:${minute} ${meridiem}`;
  } else {
    const m = manualFormat(d, timeZone);
    return `${m.dateStr} ${m.timeStr}`;
  }
}
