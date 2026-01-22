// utils/dateTime.ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// Time constants
export const SLOT_START = 6 * 60; // 06:00
export const SLOT_END = 22 * 60; // 22:00;

export type Interval = [number, number];

type InputDate = string | number | Date | null | undefined;
export function calculateAgeFromDOB(dob?: string, ageString?: string): string {
  // First try to calculate from DOB
  if (dob) {
    try {
      const birthDate = new Date(dob);
      const today = new Date();

      // Check if DOB is valid
      if (isNaN(birthDate.getTime())) {
        throw new Error('Invalid DOB');
      }

      // Calculate difference in milliseconds
      const diffTime = Math.abs(today.getTime() - birthDate.getTime());
      const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Less than 1 month → show days
      if (totalDays < 30) {
        return `${totalDays} day${totalDays !== 1 ? "s" : ""}`;
      }

      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();

      if (today.getDate() < birthDate.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      // If years exist → SHOW ONLY YEARS
      if (years > 0) {
        return `${years} year${years !== 1 ? "s" : ""}`;
      }

      // Only months
      if (months > 0) {
        return `${months} month${months !== 1 ? "s" : ""}`;
      }

      return "—";
    } catch (error) {
      // Fall through to age string if DOB calculation fails
    }
  }

  // DOB missing or invalid → fallback to age string (years only)
  if (ageString) {
    try {
      const ageNum = parseInt(ageString, 10);
      if (!isNaN(ageNum) && ageNum > 0) {
        return `${ageNum} year${ageNum !== 1 ? "s" : ""}`;
      }
    } catch (error) {
      // Continue to default
    }
  }

  return "—";
}
export const formatMissedFromTimeline = (
  timeline?: number | null
): string => {
  if (!timeline) return "—";

  // Handle seconds vs milliseconds
  const ts = timeline < 1e12 ? timeline * 1000 : timeline;

  const d = dayjs(ts);
  if (!d.isValid()) return "—";

  return d.format("DD MMM YYYY");
};
/* ---------- DayJS Helpers ---------- */
export const buildMonthGrid = (anchor: dayjs.Dayjs) => {
  const startOfMonth = anchor.startOf("month");
  const gridStart = startOfMonth.startOf("week"); // Sunday
  return Array.from({ length: 42 }, (_, i) => gridStart.add(i, "day"));
};

export const asLocalWallClock = (iso: string | Date) => {
  if (iso instanceof Date) return iso;
  if (/Z$/i.test(iso)) {
    const u = dayjs.utc(iso);
    return new Date(
      u.year(),
      u.month(),
      u.date(),
      u.hour(),
      u.minute(),
      u.second(),
      u.millisecond()
    );
  }
  return new Date(iso);
};


export const sameDay = (a: Date | string, d: dayjs.Dayjs) => dayjs(a).isSame(d, "day");

export const toMinutes = (hhmm: string) => {
  if (!hhmm) return 0;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  return h * 60 + m;
};

export const toHHMM = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}`;
};

export const clampToDay = (
  start: Date | string,
  end: Date | string,
  d: dayjs.Dayjs
): Interval | null => {
  const s = dayjs(start);
  const e = dayjs(end);
  if (!s.isSame(d, "day") && !e.isSame(d, "day")) {
    if (d.isAfter(s, "day") && d.isBefore(e, "day")) return [0, 24 * 60];
    return null;
  }
  const dayStart = d.startOf("day");
  const from = Math.max(0, s.diff(dayStart, "minute"));
  const to = Math.min(24 * 60, e.diff(dayStart, "minute"));
  if (to <= 0 || from >= 24 * 60) return null;
  return [Math.max(from, 0), Math.max(to, 0)];
};

export const overlaps = (a: Interval, b: Interval) => a[0] < b[1] && b[0] < a[1];

export const isPastDate = (d: dayjs.Dayjs) =>
  d.isBefore(dayjs().startOf("day"), "day");

// Helper to check if a time is in the past for the selected date
export const isPastTime = (selectedDate: dayjs.Dayjs | null, time: string): boolean => {
  if (!selectedDate || !time) return false;
  
  const now = dayjs();
  const today = dayjs().startOf('day');
  
  // If selected date is today
  if (selectedDate.isSame(today, 'day')) {
    const [hours, minutes] = time.split(':').map(Number);
    const selectedTime = today.add(hours, 'hour').add(minutes, 'minute');
    return selectedTime.isBefore(now);
  }
  
  // If selected date is before today
  return selectedDate.isBefore(today, 'day');
};

// Get minimum selectable time for "From Time"
export const getMinFromTime = (selectedDate: dayjs.Dayjs | null): string => {
  if (!selectedDate) return "06:00";
  
  const now = dayjs();
  const today = dayjs().startOf('day');
  
  // If selected date is today
  if (selectedDate.isSame(today, 'day')) {
    const currentMinutes = now.hour() * 60 + now.minute();
    
    // Round up to next 15-minute interval
    const roundedMinutes = Math.ceil(currentMinutes / 15) * 15;
    
    // Ensure it's within slot times
    const clampedMinutes = Math.max(SLOT_START, Math.min(SLOT_END, roundedMinutes));
    
    // Add 15 minutes buffer for realistic scheduling
    const bufferMinutes = clampedMinutes + 15;
    
    if (bufferMinutes >= SLOT_END) return toHHMM(SLOT_END - 30); // Last possible slot
    
    return toHHMM(bufferMinutes);
  }
  
  // For future dates, start from 06:00
  return "06:00";
};

// Generate hours based on min/max constraints for time picker
export const generateHours = (minTime?: string, maxTime?: string) => {
  const minHour = minTime ? Number(minTime.split(":")[0]) : 0;
  const maxHour = maxTime ? Number(maxTime.split(":")[0]) : 23;
  
  return Array.from({ length: 24 }, (_, i) => i)
    .filter(hour => hour >= minHour && hour <= maxHour);
};

// Generate minutes based on constraints for selected hour
export const generateMinutes = (selectedHour: number, minTime?: string, maxTime?: string) => {
  let allMinutes = Array.from({ length: 60 }, (_, i) => i);
  
  // If this is the min hour, filter minutes
  if (minTime && selectedHour === Number(minTime.split(":")[0])) {
    const minMinute = Number(minTime.split(":")[1]);
    allMinutes = allMinutes.filter(minute => minute >= minMinute);
  }
  
  // If this is the max hour, filter minutes
  if (maxTime && selectedHour === Number(maxTime.split(":")[0])) {
    const maxMinute = Number(maxTime.split(":")[1]);
    allMinutes = allMinutes.filter(minute => minute <= maxMinute);
  }
  
  return allMinutes;
};

/* ---------- Formatting Helpers ---------- */
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
/** Convert 12h time (02:30 PM) to 24h time (14:30) */
export function convertTo24Hour(time12: string): string {
  if (!time12) return '';
  
  const [time, period] = time12?.split(' ') ?? ['', ''];
  const [hours, minutes] = time?.split(':') ?? ['00', '00'];
  
  let hour = parseInt(hours ?? '0');
  const minute = minutes ?? '00';
  
  if (period?.toUpperCase() === 'PM' && hour < 12) {
    hour += 12;
  } else if (period?.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}
// utils/dateTime.ts - Add this function
export const getCurrentFormattedTime = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  // Return in format that matches your API
  return `${hours}:${minutes}:${seconds}`;

};

/**
 * Format date string to readable format
 * Handles: "2025-12-10 06:35:11.000000", "2025-12-10T06:35:11.000Z", etc.
 * Returns: "Dec 10, 2025 06:35 AM"
 */
export const formatDateTimeTL = (dateString?: string | null): string => {
  if (!dateString) return "-";
  
  try {
    let dateToParse = dateString;
    
    // Handle format: "2025-12-10 06:35:11.000000"
    if (dateString.includes(" ") && !dateString.includes("T")) {
      // Remove microseconds and convert to ISO format
      dateToParse = dateString.split(".")[0].replace(" ", "T") + "Z";
    }
    
    const date = new Date(dateToParse);
    
    if (isNaN(date.getTime())) return "-";
    
    // Format: "Dec 10, 2025 06:35 AM"
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return "-";
  }
};

// utils/duration.ts

export const formatDurationParameter = (param: string = "", duration: string = ""): string => {
  if (!param) return "";
  
  const paramLower = param.toLowerCase().trim();
  const durationNum = parseInt(duration, 10);
  
  // Handle singular/plural based on duration value
  if (paramLower === "days" || paramLower === "day") {
    return durationNum === 1 ? "day" : "days";
  }
  if (paramLower === "years" || paramLower === "year") {
    return durationNum === 1 ? "year" : "years";
  }
  if (paramLower === "months" || paramLower === "month") {
    return durationNum === 1 ? "month" : "months";
  }
  if (paramLower === "weeks" || paramLower === "week") {
    return durationNum === 1 ? "week" : "weeks";
  }
  if (paramLower === "hours" || paramLower === "hour") {
    return durationNum === 1 ? "hour" : "hours";
  }
  if (paramLower === "minutes" || paramLower === "minute") {
    return durationNum === 1 ? "minute" : "minutes";
  }
  if (paramLower === "seconds" || paramLower === "second") {
    return durationNum === 1 ? "second" : "seconds";
  }
  
  // Return as is if not matched
  return paramLower;
};

// Build UTC ISO from local HH:MM (IST wall-clock)
export const createTimeISO = (hhmm: string, baseDate = new Date()): string => {
  if (!hhmm) return "";

  const [h, m] = hhmm.split(":").map(Number);

  // Create local wall-clock time
  const local = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    h,
    m,
    0,
    0
  );

  // Convert once to UTC ISO
  return local.toISOString();
};
