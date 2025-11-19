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
  // If it's date + T + time but no zone (e.g. 2025-11-10T14:20:00)
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

/** Convert 24h time (14:30) to 12h time (02:30 PM) */
export function convertTo12Hour(time24: string): string {
  if (!time24) return '';
  
  const [hours, minutes] = time24?.split(':') ?? ['00', '00'];
  const hour = parseInt(hours ?? '0');
  const minute = minutes ?? '00';
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12.toString().padStart(2, '0')}:${minute} ${period}`;
}

/** Format date to YYYY-MM-DD for input fields */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse date from YYYY-MM-DD string */
export function parseDateFromInput(dateString: string): Date | null {
  return normalize(dateString);
}

/** Validate time format HH:MM */
export function isValidTime(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/** Validate date format YYYY-MM-DD */
export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/** Get current date in YYYY-MM-DD format */
export function getCurrentDateFormatted(): string {
  return formatDateForInput(new Date());
}

/** Add days to a date */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Compare two dates (ignoring time) */
export function areDatesEqual(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  // Add previous month's days
  const firstDayOfWeek = firstDay.getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevMonthLastDay - i));
  }

  // Add current month's days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add next month's days to complete the grid
  const totalCells = 42;
  const nextMonthDays = totalCells - days.length;
  for (let i = 1; i <= nextMonthDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const isToday = (dateString: string): boolean => {
  return dateString === getTodayDateString();
};

export const getCurrentTime = (): string => {
  return new Date().toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};