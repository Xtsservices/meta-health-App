// src/utils/age.ts
export type AgeUnit = "days" | "months" | "years";

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYMD(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(dt.getTime()) ? null : dt;
}



// assume: type AgeUnit = "days" | "months" | "years";

function parseDOBFlexible(dobISO: string): Date | null {
  if (!dobISO) return null;

  // Try to grab just YYYY-MM-DD from start of string
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dobISO);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }

  // Fallback: let JS parse it
  const d = new Date(dobISO);
  if (!isNaN(d.getTime())) return d;

  return null;
}

export function formatageFromDOB(
  dobISO: string,
  today = new Date()
): string {
  // try existing parseYMD first
  let dob = parseYMD ? parseYMD(dobISO) : null;
  if (!dob) dob = parseDOBFlexible(dobISO);

  if (!dob) return "-";

  // normalize both dates to midnight
  const start = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const ms = end.getTime() - start.getTime();
  const days = Math.max(0, Math.floor(ms / 86400000));

  // --- CASE 1: 0–31 days ---
  if (days <= 31) {
    const unit = days === 1 ? "day" : "days";
    return `${days} ${unit}`;
  }

  // --- CASE 2: Months (up to 12) ---
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months <= 12) {
    const m = months === 0 ? 1 : months;
    const unit = m === 1 ? "month" : "months";
    return `${m} ${unit}`;
  }

  // --- CASE 3: Years ---
  const years = Math.floor(months / 12);
  const unit = years === 1 ? "year" : "years";
  return `${years} ${unit}`;
}



/** Age from DOB on a given "today" (defaults to now) */
/** Age from DOB on a given "today" (defaults to now) */
export function ageFromDOB(dobISO: string, today = new Date()): { n: number; unit: AgeUnit } {
  const dob = parseYMD(dobISO);
  if (!dob) return { n: 0, unit: "years" };

  // normalize both dates to midnight
  const start = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const ms = end.getTime() - start.getTime();
  const days = Math.max(0, Math.floor(ms / 86400000));

  // --- CASE 1: 0–31 days -> days ---
  if (days <= 31) {
    return { n: days, unit: "days" };
  }

  // --- CASE 2: 1–12 months -> months ---
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months <= 12) {
    const m = months === 0 ? 1 : months; // 0 months -> treat as 1 month
    return { n: m, unit: "months" };
  }

  // --- CASE 3: > 12 months -> years ---
  const years = Math.floor(months / 12);
  return { n: Math.max(0, years), unit: "years" };
}


/** DOB from an age (value+unit) on a given "today" (defaults to now) */
export function dobFromAge(nRaw: number, unit: AgeUnit, today = new Date()): string {
  const n = Number.isFinite(nRaw) ? Math.max(0, Math.floor(nRaw)) : 0;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (unit === "days") {
    base.setDate(base.getDate() - n);
    return ymd(base);
  }
  if (unit === "months") {
    const y = base.getFullYear();
    const m = base.getMonth() - n;
    const d = base.getDate();
    const dt = new Date(y, m, d);
    return ymd(dt);
  }
  // years
  const dt = new Date(base.getFullYear() - n, base.getMonth(), base.getDate());
  return ymd(dt);
}

/**
 * Validate age + unit against a patient category.
 * Returns { ok: true } when the age is acceptable, otherwise { ok: false, msg: string }.
 */
export function validateAgeAndUnit(
  category: "neonate" | "child" | "adult",
  n: number,
  unit: AgeUnit
): { ok: boolean; msg?: string } {
  // ---- NEONATE -------------------------------------------------
  if (category === "neonate") {
    if (unit !== "days") return { ok: false, msg: "Neonate age must be in days" };
    if (n < 0 || n > 28) return { ok: false, msg: "Neonate age should be 0–28 days" };
    return { ok: true };
  }

  // ---- CHILD ---------------------------------------------------
  if (category === "child") {
    // Convert everything to days for the ">28 days" rule
    const days = unit === "days" ? n : unit === "months" ? n * 30 : n * 365;
    if (days <= 28) return { ok: false, msg: "Child age must be > 28 days" };

    // Upper bound: < 18 years
    const years = unit === "years" ? n : unit === "months" ? n / 12 : n / 365;
    if (years >= 18) return { ok: false, msg: "Child age must be < 18 years" };

    return { ok: true };
  }

  // ---- ADULT ---------------------------------------------------
  if (unit !== "years") return { ok: false, msg: "Adult age must be in years" };
  if (n < 18) return { ok: false, msg: "Adult age must be ≥ 18 years" };
  return { ok: true };
}

/** Legacy wrapper – kept for backward compatibility */
export function checkAgeRuleWithCategory(
  category: "neonate" | "child" | "adult",
  n: number,
  unit: AgeUnit
): { ok: boolean; msg?: string } {
  return validateAgeAndUnit(category, n, unit);
}

// src/utils/age.ts

// Helper function to check if age already has a unit
export const hasAgeUnit = (ageStr: any): boolean => {
  if (!ageStr) return false;
  const str = String(ageStr).toLowerCase();
  return str.includes('year') || str.includes('month') || str.includes('day') || 
         str.includes('y') || str.includes('m') || str.includes('d');
};

// Helper function to normalize age units (convert D/d to days, M/m to months, Y/y to years)
export const normalizeAgeUnit = (ageStr: string): string => {
  const str = ageStr.trim().toLowerCase();
  
  // Handle patterns like "12D", "12d", "12 days"
  if (str.includes('d')) {
    const numMatch = str.match(/(\d+)\s*d/);
    if (numMatch) {
      const days = parseInt(numMatch[1]);
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    }
  }
  
  // Handle patterns like "12M", "12m", "12 months"
  if (str.includes('m')) {
    const numMatch = str.match(/(\d+)\s*m/);
    if (numMatch) {
      const months = parseInt(numMatch[1]);
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
  }
  
  // Handle patterns like "12Y", "12y", "12 years"
  if (str.includes('y')) {
    const numMatch = str.match(/(\d+)\s*y/);
    if (numMatch) {
      const years = parseInt(numMatch[1]);
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
  }
  
  // If it already contains full words like "days", "months", "years", return as is
  if (str.includes('day') || str.includes('month') || str.includes('year')) {
    return ageStr; // Return original
  }
  
  return ageStr; // Return as is if no recognizable pattern
};

// For PatientProfileOPD style (full words: 12 years, 3 months, 15 days)
export const formatAgeDisplay = (ageInput: any, dob?: string): string => {
  // If age is already formatted with unit, normalize it
  if (hasAgeUnit(ageInput)) {
    return normalizeAgeUnit(String(ageInput));
  }
  
  // If age is provided as a number (assuming months)
  if (ageInput !== undefined && ageInput !== null && ageInput !== "") {
    const ageNum = typeof ageInput === 'string' ? parseInt(ageInput) : ageInput;
    
    if (!isNaN(ageNum)) {
      // Check if it's exact years (divisible by 12)
      if (ageNum % 12 === 0) {
        const years = ageNum / 12;
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      } else {
        // Not exact years - show as total months only
        return `${ageNum} ${ageNum === 1 ? 'month' : 'months'}`;
      }
    }
  }
  
  // Fallback: calculate from DOB
  if (dob) {
    return ageFromDOB(dob);
  }
  
  return "";
};

// For OpdPreviousPatients style (compact: 12y, 3m, 15d)
export const formatAgeCompact = (ageInput: any, dob?: string): string => {
  // If age already has unit, normalize to compact format
  if (hasAgeUnit(ageInput)) {
    const normalized = normalizeAgeUnit(String(ageInput));
    const normalizedLower = normalized.toLowerCase();
    
    // Convert to compact format
    if (normalizedLower.includes('year')) {
      const numMatch = normalized.match(/(\d+)/);
      if (numMatch) return `${numMatch[1]}y`;
    }
    if (normalizedLower.includes('month')) {
      const numMatch = normalized.match(/(\d+)/);
      if (numMatch) return `${numMatch[1]}m`;
    }
    if (normalizedLower.includes('day')) {
      const numMatch = normalized.match(/(\d+)/);
      if (numMatch) return `${numMatch[1]}d`;
    }
    
    // If already in D/M/Y format, keep as is
    if (/^\d+[dmy]$/i.test(String(ageInput))) {
      return String(ageInput).toLowerCase();
    }
  }
  
  // If age is provided as a number (in months)
  if (ageInput !== undefined && ageInput !== null && ageInput !== "") {
    const ageNum = typeof ageInput === 'string' ? parseInt(ageInput) : ageInput;
    
    if (!isNaN(ageNum)) {
      if (ageNum % 12 === 0) {
        const years = ageNum / 12;
        return `${years}y`;
      } else {
        return `${ageNum}m`;
      }
    }
  }
  
  // Fallback: calculate from DOB
  if (dob) {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "—";
    
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    
    if (years >= 2) return `${years}y`;
    
    let months = years * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months--;
    
    if (months <= 0) {
      const days = Math.max(
        0,
        Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      );
      return `${days}d`;
    }
    
    return `${months}m`;
  }
  
  return "—";
};

// Keep your existing ageFromDOB function (make sure it's exported)
export const ageFromDOBList = (dob: string): string => {
  // Your existing ageFromDOB implementation
  // Example:
  const birthDate = new Date(dob);
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  
  if (days < 0) {
    months--;
    // Get days in previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years > 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  } else if (months > 0) {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  } else {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
};
